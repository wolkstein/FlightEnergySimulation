export interface Waypoint {
  latitude: number;
  longitude: number;
  altitude: number;
  speed?: number;
  action?: string;
  hover_time?: number;
}

export interface WindData {
  latitude: number;
  longitude: number;
  altitude: number;
  wind_speed_ms: number;
  wind_direction_deg: number;
  wind_vector_x: number;
  wind_vector_y: number;
  wind_vector_z: number;
  timestamp?: string;
}

export interface VehicleConfig {
  vehicle_type: VehicleType;  // Art des Fahrzeugs
  mass: number;
  max_power: number;
  hover_power?: number;
  cruise_power?: number;
  forward_thrust_power?: number;  // Neu: VTOL Vortriebsmotor
  stall_speed?: number;
  cruise_speed: number;  // Normale Fluggeschwindigkeit
  max_speed: number;
  max_climb_rate: number;
  max_descent_speed: number;  // Maximale Sinkgeschwindigkeit
  horizontal_acceleration: number;  // Horizontale Beschleunigung/Verzögerung (m/s²)
  vertical_acceleration: number;  // Vertikale Beschleunigung beim Steigen/Sinken (m/s²)
  battery_capacity: number;
  battery_voltage: number;
  
  // Frame Konfiguration
  frame_type?: FrameType;
  motor_config?: MotorConfiguration;
  vtol_config?: VTOLConfiguration;
  
  // Berechnete Werte
  hover_motors_count?: number;
  total_motors_count?: number;
  
  // Aerodynamik
  drag_coefficient?: number;
  wing_area?: number;
  rotor_diameter?: number;
  motor_efficiency?: number;
  propeller_efficiency?: number;
  transmission_efficiency?: number;
}

export type VehicleType = 'multirotor' | 'vtol' | 'plane';

export type FrameType = 'tri' | 'quad' | 'hexa' | 'octo';

export type MotorConfiguration = 'single' | 'coaxial';

export type VTOLConfiguration = 'quad_plane' | 'tilt_rotor' | 'tilt_wing' | 'tail_sitter';

export interface VehicleInfo {
  type: VehicleType;
  name: string;
  description: string;
  default_params: VehicleConfig;
}

export interface SimulationRequest {
  vehicle_type: VehicleType;
  vehicle_config: VehicleConfig;
  waypoints: Waypoint[];
  wind_consideration: boolean;
}

export interface FlightSegment {
  segment_id: number;
  start_waypoint: Waypoint;
  end_waypoint: Waypoint;
  distance_m: number;
  duration_s: number;
  energy_wh: number;
  average_speed_ms: number;
  average_power_w: number;
  wind_influence: {
    headwind_ms: number;
    crosswind_ms: number;
    updraft_ms: number;
    total_wind_speed: number;
  };
}

export interface SimulationResult {
  session_id?: number;
  total_energy_wh: number;
  total_distance_m: number;
  total_time_s: number;
  battery_usage_percent: number;
  flight_segments: FlightSegment[];
  vehicle_type: VehicleType;
  summary: {
    average_speed_ms: number;
    average_power_w: number;
    energy_per_km: number;
    flight_time_minutes: number;
    remaining_battery_percent: number;
    max_range_estimate_km: number;
  };
}

export interface SimulationSession {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  vehicle_type?: VehicleType;
  total_energy_wh?: number;
  total_distance_m?: number;
  total_time_s?: number;
  simulation_data?: string;
}
