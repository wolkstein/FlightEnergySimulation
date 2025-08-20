from pydantic import BaseModel
from typing import List, Optional

class Waypoint(BaseModel):
    latitude: float  # WGS84
    longitude: float  # WGS84
    altitude: float  # m über Meeresspiegel
    speed: Optional[float] = None  # m/s - gewünschte Geschwindigkeit
    action: Optional[str] = "waypoint"  # waypoint, takeoff, landing, hover
    hover_time: Optional[float] = 0  # Sekunden zum Hovern
    
class WaypointPlan(BaseModel):
    name: str
    description: Optional[str] = None
    waypoints: List[Waypoint]
    
class WindData(BaseModel):
    latitude: float
    longitude: float
    altitude: float
    wind_speed_ms: float
    wind_direction_deg: float  # 0-360 Grad, 0 = Nord
    wind_vector_x: float  # Ost-West Komponente (m/s)
    wind_vector_y: float  # Nord-Süd Komponente (m/s)
    wind_vector_z: float  # Vertikal Komponente (m/s)
    timestamp: Optional[str] = None
