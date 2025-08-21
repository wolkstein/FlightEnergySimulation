from pydantic import BaseModel, model_validator
from typing import Optional, Dict, Any
from enum import Enum

class VehicleType(str, Enum):
    MULTIROTOR = "multirotor"  # Früher "quadcopter"
    VTOL = "vtol"
    PLANE = "plane"

class FrameType(str, Enum):
    TRI = "tri"         # 3 Arme
    QUAD = "quad"       # 4 Arme  
    HEXA = "hexa"       # 6 Arme
    OCTO = "octo"       # 8 Arme

class MotorConfiguration(str, Enum):
    SINGLE = "single"   # Ein Motor pro Arm
    COAXIAL = "coaxial" # Zwei Motoren coaxial pro Arm

class VTOLConfiguration(str, Enum):
    QUAD_PLANE = "quad_plane"       # 4 Hover + 1 Forward
    TILT_ROTOR = "tilt_rotor"       # Motoren kippen
    TILT_WING = "tilt_wing"         # Ganze Flügel kippen
    TAIL_SITTER = "tail_sitter"     # Startet/landet auf dem Heck

class VehicleConfig(BaseModel):
    # Typ des Fahrzeugs
    vehicle_type: VehicleType  # multirotor, vtol, plane
    
    # Basis Parameter
    mass: float  # kg
    max_power: float  # W
    hover_power: Optional[float] = None  # W (für Multirotor/VTOL)
    cruise_power: Optional[float] = None  # W (für VTOL/Plane)
    forward_thrust_power: Optional[float] = None  # W (für VTOL Vortriebsmotor)
    stall_speed: Optional[float] = None  # m/s (für Plane)
    cruise_speed: float  # m/s (normale Fluggeschwindigkeit)
    max_speed: float  # m/s
    max_climb_rate: float  # m/s
    max_descent_speed: float  # m/s (maximale Sinkgeschwindigkeit)
    horizontal_acceleration: float  # m/s² (horizontale Beschleunigung/Verzögerung)
    vertical_acceleration: float  # m/s² (vertikale Beschleunigung beim Steigen/Sinken)
    battery_capacity: float  # mAh
    battery_voltage: float  # V
    
    # Frame Konfiguration (für Multirotor/VTOL)
    frame_type: Optional[FrameType] = FrameType.QUAD
    motor_config: Optional[MotorConfiguration] = MotorConfiguration.SINGLE
    vtol_config: Optional[VTOLConfiguration] = None
    
    # Berechnete Motor-Parameter
    hover_motors_count: Optional[int] = None  # Wird automatisch berechnet
    total_motors_count: Optional[int] = None  # Inkl. Forward-Thrust bei VTOL
    
    # Aerodynamische Parameter
    drag_coefficient: Optional[float] = 0.03
    wing_area: Optional[float] = 0.5  # m² (für Plane/VTOL)
    rotor_diameter: Optional[float] = 0.3  # m (für Multirotor/VTOL)
    
    # Effizienz Parameter
    motor_efficiency: Optional[float] = 0.85
    propeller_efficiency: Optional[float] = 0.75
    transmission_efficiency: Optional[float] = 0.95

    @model_validator(mode='after')
    def calculate_motor_counts(self):
        """Berechne Motor-Anzahl basierend auf Frame und Configuration"""
        if self.frame_type and self.motor_config:
            # Basis Motor-Anzahl pro Frame
            base_motors = {
                FrameType.TRI: 3,
                FrameType.QUAD: 4, 
                FrameType.HEXA: 6,
                FrameType.OCTO: 8
            }
            
            self.hover_motors_count = base_motors.get(self.frame_type, 4)
            
            # Bei Coaxial doppelte Anzahl
            if self.motor_config == MotorConfiguration.COAXIAL:
                self.hover_motors_count *= 2
            
            self.total_motors_count = self.hover_motors_count
            
            # Bei VTOL zusätzlich Forward-Thrust Motor(en)
            if self.vtol_config:
                if self.vtol_config in [VTOLConfiguration.QUAD_PLANE]:
                    self.total_motors_count += 1  # Ein Vortriebsmotor
        
        return self
