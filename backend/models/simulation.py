from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from models.vehicles import VehicleType, VehicleConfig
from models.waypoint import Waypoint

class SimulationRequest(BaseModel):
    vehicle_config: VehicleConfig
    waypoints: List[Waypoint]
    weather_conditions: List[Dict] = []
    wind_consideration: bool = True
    
    @property
    def vehicle_type(self) -> VehicleType:
        """Property für vehicle_type - leitet auf vehicle_config.vehicle_type weiter"""
        return self.vehicle_config.vehicle_type
    
class FlightSegment(BaseModel):
    segment_id: int
    start_waypoint: Waypoint
    end_waypoint: Waypoint
    distance_m: float
    duration_s: float
    energy_wh: float
    average_speed_ms: float
    average_power_w: float
    wind_influence: Dict[str, float]
    
class SimulationResult(BaseModel):
    session_id: Optional[int] = None
    total_energy_wh: float
    total_distance_m: float
    total_time_s: float
    battery_usage_percent: float
    flight_segments: List[FlightSegment]
    summary: Dict[str, Any]
    
    class Config:
        from_attributes = True
