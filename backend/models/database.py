from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.sql import func
import os

# Database URL from environment variable
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./simulation.db")

# Create engine
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class
Base = declarative_base()

class SimulationSession(Base):
    __tablename__ = "simulation_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    vehicle_type = Column(String)
    total_energy_wh = Column(Float)
    total_distance_m = Column(Float)
    total_time_s = Column(Float)
    battery_usage_percent = Column(Float)
    
    # User ownership
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # nullable for backward compatibility
    
    # Erweiterte Daten als JSON
    vehicle_config = Column(JSON)  # VehicleConfig als JSON
    waypoints = Column(JSON)       # Waypoint-Liste als JSON
    wind_settings = Column(JSON)   # Wind-Einstellungen als JSON
    elevation_settings = Column(JSON)  # Elevation-Einstellungen als JSON (simulation-specific)
    simulation_result = Column(JSON)  # Vollständiges SimulationResult als JSON
    
    # Relation zu Flight Segments für detaillierte Abfrage
    flight_segments = relationship("FlightSegment", back_populates="session", cascade="all, delete-orphan")
    
    # User relationship
    owner = relationship("User", back_populates="owned_sessions")


class FlightSegment(Base):
    __tablename__ = "flight_segments"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("simulation_sessions.id"))
    segment_id = Column(Integer)
    
    # Waypoint Daten
    start_latitude = Column(Float)
    start_longitude = Column(Float) 
    start_altitude = Column(Float)
    end_latitude = Column(Float)
    end_longitude = Column(Float)
    end_altitude = Column(Float)
    
    # Segment Metriken
    distance_m = Column(Float)
    duration_s = Column(Float)
    energy_wh = Column(Float)
    average_speed_ms = Column(Float)
    average_power_w = Column(Float)
    
    # Wind Influence Daten
    headwind_ms = Column(Float)
    crosswind_ms = Column(Float)
    updraft_ms = Column(Float)
    total_wind_speed = Column(Float)
    
    session = relationship("SimulationSession", back_populates="flight_segments")
