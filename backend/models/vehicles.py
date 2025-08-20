from pydantic import BaseModel
from typing import Optional, Dict, Any
from enum import Enum

class VehicleType(str, Enum):
    QUADCOPTER = "quadcopter"
    VTOL = "vtol"
    PLANE = "plane"

class VehicleConfig(BaseModel):
    mass: float  # kg
    max_power: float  # W
    hover_power: Optional[float] = None  # W (für Quadcopter/VTOL)
    cruise_power: Optional[float] = None  # W (für VTOL/Plane)
    stall_speed: Optional[float] = None  # m/s (für Plane)
    max_speed: float  # m/s
    max_climb_rate: float  # m/s
    battery_capacity: float  # mAh
    battery_voltage: float  # V
    
    # Aerodynamische Parameter
    drag_coefficient: Optional[float] = 0.03
    wing_area: Optional[float] = 0.5  # m² (für Plane/VTOL)
    rotor_diameter: Optional[float] = 0.3  # m (für Quadcopter/VTOL)
    rotor_count: Optional[int] = 4  # Anzahl Rotoren (für Quadcopter)
    
    # Effizienz Parameter
    motor_efficiency: Optional[float] = 0.85
    propeller_efficiency: Optional[float] = 0.75
    transmission_efficiency: Optional[float] = 0.95
