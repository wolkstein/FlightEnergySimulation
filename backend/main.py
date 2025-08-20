from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from typing import List, Optional
import os
from dotenv import load_dotenv

from models.database import engine, SessionLocal, Base
from models.vehicles import VehicleType, VehicleConfig
from models.simulation import SimulationRequest, SimulationResult
from models.waypoint import Waypoint, WaypointPlan
from services.energy_calculator import EnergyCalculator
from services.wind_service import WindService
from services.session_service import SessionService

# Load environment variables
load_dotenv()

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Flight Energy Simulation API",
    description="API für die Simulation des Energieverbrauchs von Flugzeugen",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency für Datenbankverbindung
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Services
energy_calculator = EnergyCalculator()
wind_service = WindService()
session_service = SessionService()

@app.get("/")
async def root():
    return {"message": "Flight Energy Simulation API", "version": "1.0.0"}

@app.get("/api/vehicles", response_model=List[dict])
async def get_vehicles():
    """Verfügbare Fahrzeugtypen abrufen"""
    return [
        {
            "type": "quadcopter",
            "name": "Quadcopter",
            "description": "Multirotor mit 4 Rotoren",
            "default_params": {
                "mass": 2.5,  # kg
                "max_power": 1000,  # W
                "hover_power": 400,  # W
                "max_speed": 15,  # m/s
                "max_climb_rate": 5,  # m/s
                "battery_capacity": 5000,  # mAh
                "battery_voltage": 22.2,  # V
            }
        },
        {
            "type": "vtol",
            "name": "VTOL",
            "description": "Vertical Take-Off and Landing",
            "default_params": {
                "mass": 5.0,  # kg
                "max_power": 2000,  # W
                "hover_power": 800,  # W
                "cruise_power": 600,  # W
                "max_speed": 25,  # m/s
                "max_climb_rate": 8,  # m/s
                "battery_capacity": 10000,  # mAh
                "battery_voltage": 44.4,  # V
            }
        },
        {
            "type": "plane",
            "name": "Fixed Wing",
            "description": "Starrflügelflugzeug",
            "default_params": {
                "mass": 3.0,  # kg
                "max_power": 800,  # W
                "cruise_power": 300,  # W
                "stall_speed": 12,  # m/s
                "max_speed": 30,  # m/s
                "max_climb_rate": 10,  # m/s
                "battery_capacity": 8000,  # mAh
                "battery_voltage": 22.2,  # V
            }
        }
    ]

@app.post("/api/simulation", response_model=SimulationResult)
async def run_simulation(request: SimulationRequest, db=Depends(get_db)):
    """Energiesimulation durchführen"""
    try:
        # Wind data für alle Waypoints abrufen
        wind_data = []
        for waypoint in request.waypoints:
            wind = await wind_service.get_wind_data(
                waypoint.latitude, waypoint.longitude, waypoint.altitude
            )
            wind_data.append(wind)
        
        # Energieberechnung durchführen
        result = energy_calculator.calculate_energy(
            vehicle_type=request.vehicle_type,
            vehicle_config=request.vehicle_config,
            waypoints=request.waypoints,
            wind_data=wind_data
        )
        
        # Session speichern
        session = session_service.create_session(
            db=db,
            simulation_request=request,
            simulation_result=result
        )
        
        result.session_id = session.id
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/wind/{lat}/{lon}/{alt}")
async def get_wind_data(lat: float, lon: float, alt: float, hours_ahead: int = 0):
    """Winddaten für eine Position abrufen"""
    try:
        if hours_ahead > 0:
            wind_data = await wind_service.get_wind_forecast(lat, lon, alt, hours_ahead)
        else:
            wind_data = await wind_service.get_wind_data(lat, lon, alt)
        return wind_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/wind/route")
async def get_wind_vectors_for_route(request: dict):
    """Windvektoren für eine gesamte Route abrufen"""
    try:
        waypoints = request.get('waypoints', [])
        mission_start_time = request.get('mission_start_time')  # ISO format string
        flight_duration = request.get('flight_duration', 1.0)  # hours
        
        # Parse start time if provided
        start_time = None
        if mission_start_time:
            from datetime import datetime
            start_time = datetime.fromisoformat(mission_start_time.replace('Z', '+00:00'))
        
        # Convert waypoints to expected format
        wp_list = []
        for wp in waypoints:
            wp_list.append({
                'lat': wp.get('latitude', 0.0),
                'lon': wp.get('longitude', 0.0), 
                'alt': wp.get('altitude', 100.0)
            })
        
        wind_vectors = await wind_service.get_wind_vectors_for_route(
            waypoints=wp_list,
            mission_start_time=start_time,
            flight_duration_estimate=flight_duration
        )
        
        return {"wind_vectors": wind_vectors}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sessions")
async def create_session(name: str, description: Optional[str] = None, db=Depends(get_db)):
    """Neue Session erstellen"""
    session = session_service.create_empty_session(
        db=db, name=name, description=description
    )
    return {"session_id": session.id, "name": session.name}

@app.get("/api/sessions")
async def get_sessions(db=Depends(get_db)):
    """Alle Sessions abrufen"""
    sessions = session_service.get_all_sessions(db)
    return sessions

@app.get("/api/sessions/{session_id}")
async def get_session(session_id: int, db=Depends(get_db)):
    """Spezifische Session abrufen"""
    session = session_service.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
