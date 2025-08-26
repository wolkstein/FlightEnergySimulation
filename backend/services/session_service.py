from sqlalchemy.orm import Session
from models.database import SimulationSession, FlightSegment
from models.simulation import SimulationRequest, SimulationResult
import json
from datetime import datetime
from typing import List, Optional, Dict, Any

class SessionService:
    
    def create_session(self, db: Session, simulation_request: SimulationRequest, 
                      simulation_result: SimulationResult, 
                      session_name: Optional[str] = None) -> SimulationSession:
        """Erstellt eine neue Session mit vollständigen Simulationsdaten"""
        
        # Automatischen Namen generieren wenn keiner gegeben
        if not session_name:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            session_name = f"Simulation {simulation_request.vehicle_config.vehicle_type} {timestamp}"
        
        # Wind-Einstellungen extrahieren
        wind_settings = {
            "wind_consideration": simulation_request.wind_consideration,
            "manual_wind_enabled": simulation_request.manual_wind_enabled,
            "manual_wind_speed_ms": simulation_request.manual_wind_speed_ms,
            "manual_wind_direction_deg": simulation_request.manual_wind_direction_deg
        }
        
        # Session in Datenbank speichern
        db_session = SimulationSession(
            name=session_name,
            description=f"Energiesimulation für {simulation_request.vehicle_config.vehicle_type} mit {len(simulation_request.waypoints)} Waypoints",
            vehicle_type=simulation_request.vehicle_config.vehicle_type,
            total_energy_wh=simulation_result.total_energy_wh,
            total_distance_m=simulation_result.total_distance_m,
            total_time_s=simulation_result.total_time_s,
            battery_usage_percent=simulation_result.battery_usage_percent,
            vehicle_config=simulation_request.vehicle_config.model_dump(),
            waypoints=[wp.model_dump() for wp in simulation_request.waypoints],
            wind_settings=wind_settings,
            simulation_result=simulation_result.model_dump()
        )
        
        db.add(db_session)
        db.flush()  # Flush to get the ID
        
        # Flight Segments separat speichern für bessere Abfragbarkeit
        for segment in simulation_result.flight_segments:
            # Wind influence kann als dict kommen, sicher darauf zugreifen
            wind_influence = segment.wind_influence
            if isinstance(wind_influence, dict):
                headwind_ms = wind_influence.get('headwind_ms', 0.0)
                crosswind_ms = wind_influence.get('crosswind_ms', 0.0)
                updraft_ms = wind_influence.get('updraft_ms', 0.0)
                total_wind_speed = wind_influence.get('total_wind_speed', 0.0)
            else:
                # Falls es ein Objekt ist
                headwind_ms = getattr(wind_influence, 'headwind_ms', 0.0)
                crosswind_ms = getattr(wind_influence, 'crosswind_ms', 0.0)
                updraft_ms = getattr(wind_influence, 'updraft_ms', 0.0)
                total_wind_speed = getattr(wind_influence, 'total_wind_speed', 0.0)
            
            db_segment = FlightSegment(
                session_id=db_session.id,
                segment_id=segment.segment_id,
                start_latitude=segment.start_waypoint.latitude,
                start_longitude=segment.start_waypoint.longitude,
                start_altitude=segment.start_waypoint.altitude,
                end_latitude=segment.end_waypoint.latitude,
                end_longitude=segment.end_waypoint.longitude,
                end_altitude=segment.end_waypoint.altitude,
                distance_m=segment.distance_m,
                duration_s=segment.duration_s,
                energy_wh=segment.energy_wh,
                average_speed_ms=segment.average_speed_ms,
                average_power_w=segment.average_power_w,
                headwind_ms=headwind_ms,
                crosswind_ms=crosswind_ms,
                updraft_ms=updraft_ms,
                total_wind_speed=total_wind_speed
            )
            db.add(db_segment)
        
        db.commit()
        db.refresh(db_session)
        
        return db_session
    
    def get_session(self, db: Session, session_id: int) -> Optional[SimulationSession]:
        """Lädt eine Session mit allen Daten"""
        return db.query(SimulationSession).filter(SimulationSession.id == session_id).first()
    
    def get_session_with_segments(self, db: Session, session_id: int) -> Optional[SimulationSession]:
        """Lädt eine Session mit allen Flight Segments"""
        return db.query(SimulationSession).filter(SimulationSession.id == session_id).first()
    
    def restore_simulation_data(self, db: Session, session_id: int) -> Dict[str, Any]:
        """Stellt alle Daten einer Session wieder her für die Wiederverwendung"""
        session = self.get_session(db, session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        # Daten aus JSON wiederherstellen
        restored_data = {
            "vehicle_config": session.vehicle_config,
            "waypoints": session.waypoints,
            "wind_settings": session.wind_settings,
            "simulation_result": session.simulation_result,
            "session_info": {
                "id": session.id,
                "name": session.name,
                "description": session.description,
                "created_at": session.created_at.isoformat(),
                "vehicle_type": session.vehicle_type
            }
        }
        
        return restored_data
    
    def get_all_sessions(self, db: Session, limit: int = 100) -> List[SimulationSession]:
        """Lädt alle Sessions (ohne detaillierte Daten)"""
        return db.query(SimulationSession).order_by(SimulationSession.created_at.desc()).limit(limit).all()
    
    def update_session_name(self, db: Session, session_id: int, new_name: str) -> bool:
        """Aktualisiert den Namen einer Session"""
        session = db.query(SimulationSession).filter(SimulationSession.id == session_id).first()
        if session:
            session.name = new_name
            db.commit()
            return True
        return False
    
    def delete_session(self, db: Session, session_id: int) -> bool:
        """Löscht eine Session und alle zugehörigen Daten"""
        session = db.query(SimulationSession).filter(SimulationSession.id == session_id).first()
        if session:
            db.delete(session)
            db.commit()
            return True
        return False
