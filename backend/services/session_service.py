from sqlalchemy.orm import Session
from models.database import SimulationSession
from models.simulation import SimulationRequest, SimulationResult
import json
from datetime import datetime
from typing import List, Optional

class SessionService:
    
    def create_session(self, db: Session, simulation_request: SimulationRequest, 
                      simulation_result: SimulationResult) -> SimulationSession:
        """Erstellt eine neue Session mit Simulationsdaten"""
        
        # Simulation Request und Result als JSON serialisieren
        simulation_data = {
            "request": simulation_request.model_dump(),
            "result": simulation_result.model_dump(),
            "created_at": datetime.now().isoformat()
        }
        
        # Session in Datenbank speichern
        db_session = SimulationSession(
            name=f"Simulation {simulation_request.vehicle_config.vehicle_type} {datetime.now().strftime('%Y%m%d_%H%M%S')}",
            description=f"Energiesimulation für {simulation_request.vehicle_config.vehicle_type} mit {len(simulation_request.waypoints)} Waypoints",
            vehicle_type=simulation_request.vehicle_config.vehicle_type,
            total_energy_wh=simulation_result.total_energy_wh,
            total_distance_m=simulation_result.total_distance_m,
            total_time_s=simulation_result.total_time_s,
            simulation_data=json.dumps(simulation_data)
        )
        
        db.add(db_session)
        db.commit()
        db.refresh(db_session)
        
        return db_session
    
    def create_empty_session(self, db: Session, name: str, description: Optional[str] = None) -> SimulationSession:
        """Erstellt eine leere Session"""
        
        db_session = SimulationSession(
            name=name,
            description=description or "Leere Session",
            simulation_data=json.dumps({"created_at": datetime.now().isoformat()})
        )
        
        db.add(db_session)
        db.commit()
        db.refresh(db_session)
        
        return db_session
    
    def get_session(self, db: Session, session_id: int) -> Optional[SimulationSession]:
        """Ruft eine spezifische Session ab"""
        return db.query(SimulationSession).filter(SimulationSession.id == session_id).first()
    
    def get_all_sessions(self, db: Session, skip: int = 0, limit: int = 100) -> List[SimulationSession]:
        """Ruft alle Sessions ab"""
        return db.query(SimulationSession).offset(skip).limit(limit).all()
    
    def update_session(self, db: Session, session_id: int, name: Optional[str] = None, 
                      description: Optional[str] = None) -> Optional[SimulationSession]:
        """Aktualisiert eine Session"""
        db_session = db.query(SimulationSession).filter(SimulationSession.id == session_id).first()
        
        if db_session:
            if name:
                db_session.name = name
            if description:
                db_session.description = description
            
            db.commit()
            db.refresh(db_session)
        
        return db_session
    
    def delete_session(self, db: Session, session_id: int) -> bool:
        """Löscht eine Session"""
        db_session = db.query(SimulationSession).filter(SimulationSession.id == session_id).first()
        
        if db_session:
            db.delete(db_session)
            db.commit()
            return True
        
        return False
    
    def get_sessions_by_vehicle_type(self, db: Session, vehicle_type: str) -> List[SimulationSession]:
        """Ruft Sessions für einen bestimmten Fahrzeugtyp ab"""
        return db.query(SimulationSession).filter(SimulationSession.vehicle_type == vehicle_type).all()
    
    def get_session_statistics(self, db: Session) -> dict:
        """Ruft Statistiken über alle Sessions ab"""
        total_sessions = db.query(SimulationSession).count()
        
        # Gruppierung nach Fahrzeugtyp
        vehicle_stats = {}
        for vehicle_type in ["quadcopter", "vtol", "plane"]:
            count = db.query(SimulationSession).filter(SimulationSession.vehicle_type == vehicle_type).count()
            vehicle_stats[vehicle_type] = count
        
        # Durchschnittswerte
        avg_energy = db.query(SimulationSession).filter(SimulationSession.total_energy_wh.isnot(None)).with_entities(
            db.query(SimulationSession.total_energy_wh).label('avg_energy')
        ).first()
        
        avg_distance = db.query(SimulationSession).filter(SimulationSession.total_distance_m.isnot(None)).with_entities(
            db.query(SimulationSession.total_distance_m).label('avg_distance')
        ).first()
        
        return {
            "total_sessions": total_sessions,
            "vehicle_type_distribution": vehicle_stats,
            "average_energy_wh": avg_energy,
            "average_distance_m": avg_distance
        }
