#!/usr/bin/env python3
"""
Glauert Analysis Tool - Compare current vs. Glauert-based calculations
Copyright (C) 2025 wolkstein

Safe analysis without modifying existing simulation.
"""

import math
from typing import Dict, List, Tuple, Any
from models.vehicles import VehicleConfig, FrameType, MotorConfiguration
from models.waypoint import Waypoint, WindData

class GlauertAnalyzer:
    """
    Analyze difference between current Sweet Spot calculation and Glauert formula.
    Does NOT modify existing simulation - only compares results.
    """
    
    def __init__(self):
        self.GRAVITY = 9.81  # m/s²
        self.AIR_DENSITY = 1.225  # kg/m³ auf Meereshöhe
    
    def calculate_air_density(self, altitude: float) -> float:
        """Calculate air density based on altitude (ISA model)"""
        try:
            # Standard atmosphere model
            if altitude < 0:
                altitude = 0
            elif altitude > 11000:  # Above troposphere
                altitude = 11000
            
            temp_sea_level = 288.15  # K
            temp_gradient = -0.0065  # K/m
            pressure_sea_level = 101325  # Pa
            gas_constant = 287  # J/(kg*K)
            
            temperature = temp_sea_level + temp_gradient * altitude
            pressure = pressure_sea_level * (temperature / temp_sea_level) ** (-self.GRAVITY / (gas_constant * temp_gradient))
            
            air_density = pressure / (gas_constant * temperature)
            return max(0.1, air_density)  # Minimum safety value
        except:
            return 1.225  # Fallback to sea level
    
    def get_rotor_count(self, config: VehicleConfig) -> int:
        """Calculate total rotor count based on frame type and motor configuration"""
        frame_motor_count = {
            FrameType.TRI: 3,
            FrameType.QUAD: 4, 
            FrameType.HEXA: 6,
            FrameType.OCTO: 8
        }
        
        base_count = frame_motor_count.get(config.frame_type, 4)  # Default: Quad
        
        # Coaxial doubles the motor count
        if config.motor_config == MotorConfiguration.COAXIAL:
            return base_count * 2
        
        return base_count
    
    def calculate_glauert_power(self, config: VehicleConfig, speed: float, 
                               climb_rate: float = 0, air_density: float = None) -> Dict[str, float]:
        """
        Calculate multirotor power using accurate Glauert formula.
        Returns detailed breakdown for analysis.
        """
        if air_density is None:
            air_density = self.AIR_DENSITY
        
        try:
            # Basic parameters
            mass = float(config.mass)
            rotor_diameter = float(config.rotor_diameter or 0.3)
            rotor_count = self.get_rotor_count(config)
            
            # Physics calculations
            rotor_radius = rotor_diameter / 2
            disk_area = math.pi * rotor_radius**2  # m² per rotor
            total_weight = mass * self.GRAVITY  # N
            thrust_per_rotor = total_weight / rotor_count  # N per rotor
            
            # Glauert formula for hover
            hover_induced_velocity = math.sqrt(thrust_per_rotor / (2 * air_density * disk_area))
            
            # Forward flight induced velocity (Glauert)
            if speed > 0.1:
                forward_induced_velocity = hover_induced_velocity / math.sqrt(speed**2 + hover_induced_velocity**2)
            else:
                forward_induced_velocity = hover_induced_velocity
            
            # Induced power (ideal)
            induced_power_per_rotor = thrust_per_rotor * forward_induced_velocity
            total_induced_power = induced_power_per_rotor * rotor_count
            
            # Coaxial efficiency penalty (10-15% loss due to rotor interaction)
            coaxial_efficiency = 0.87 if config.motor_config == MotorConfiguration.COAXIAL else 1.0
            total_induced_power /= coaxial_efficiency
            
            # Profile power (drag-related, increases with speed³)
            profile_drag_coeff = 0.012  # Typical for helicopter rotors
            tip_speed = 200  # m/s typical rotor tip speed
            solidity_ratio = 0.1  # Typical for multirotor
            
            profile_power_per_rotor = (profile_drag_coeff * air_density * disk_area * 
                                     (tip_speed**3) * solidity_ratio) / 8
            total_profile_power = profile_power_per_rotor * rotor_count
            
            # Parasitic power for forward flight
            parasitic_drag_coeff = float(config.drag_coefficient or 0.03)
            frontal_area = rotor_diameter**2 * math.pi / 4  # Simplified frontal area
            parasitic_power = 0.5 * air_density * parasitic_drag_coeff * frontal_area * (speed**3) if speed > 0 else 0
            
            # Climb power
            climb_power = 0
            if climb_rate > 0:
                climb_power = (mass * self.GRAVITY * climb_rate) / (config.motor_efficiency or 0.85)
            
            # Motor and propeller efficiency losses
            motor_efficiency = config.motor_efficiency or 0.85
            propeller_efficiency = config.propeller_efficiency or 0.75
            total_efficiency = motor_efficiency * propeller_efficiency
            
            # Total mechanical power
            mechanical_power = total_induced_power + total_profile_power + parasitic_power + climb_power
            
            # Total electrical power
            electrical_power = mechanical_power / total_efficiency
            
            return {
                'induced_power': total_induced_power,
                'profile_power': total_profile_power,
                'parasitic_power': parasitic_power,
                'climb_power': climb_power,
                'mechanical_power': mechanical_power,
                'electrical_power': electrical_power,
                'hover_induced_velocity': hover_induced_velocity,
                'forward_induced_velocity': forward_induced_velocity,
                'thrust_per_rotor': thrust_per_rotor,
                'rotor_count': rotor_count,
                'coaxial_efficiency': coaxial_efficiency,
                'power_per_kg': electrical_power / mass
            }
            
        except Exception as e:
            print(f"ERROR in calculate_glauert_power: {e}")
            return {'electrical_power': mass * 20.0, 'error': str(e)}  # Fallback
    
    def calculate_current_backend_efficiency_factor(self, config: VehicleConfig, speed: float) -> float:
        """
        Replicate the current backend Sweet Spot calculation for comparison.
        This is the existing _calculate_speed_efficiency_factor logic.
        """
        try:
            mass = float(config.mass)
            
            # Sweet Spot speeds (current backend logic)
            sweet_spot_min = max(2.0, mass * 0.3)  # ~3-5 m/s for 10-15kg copter
            sweet_spot_max = max(4.0, mass * 0.5)  # ~5-8 m/s for 10-15kg copter
            sweet_spot_center = (sweet_spot_min + sweet_spot_max) / 2
            
            if speed == 0:
                return 1.0  # Hover: 100% power
            elif speed <= sweet_spot_min:
                # Slow forward flight: slight improvement
                return 1.0 - (speed / sweet_spot_min) * 0.25
            elif speed <= sweet_spot_max:
                # Sweet Spot: maximum efficiency (60-75% of hover power)
                normalized_pos = (speed - sweet_spot_center) / (sweet_spot_max - sweet_spot_center)
                efficiency_gain = 0.35 * (1 - normalized_pos**2)  # Max 35% savings
                return 0.75 - efficiency_gain
            else:
                # Fast flight: efficiency decreases due to high angle of attack
                excess_speed = speed - sweet_spot_max
                penalty = min(0.4, excess_speed * 0.03)  # Max 40% penalty
                return 0.75 + penalty
                
        except Exception as e:
            print(f"ERROR in calculate_current_backend_efficiency_factor: {e}")
            return 1.0
    
    def compare_methods(self, config: VehicleConfig, speed_range: List[float] = None, 
                       altitude: float = 0) -> Dict[str, Any]:
        """
        Compare current backend vs. Glauert method across speed range.
        Returns detailed analysis without modifying existing simulation.
        """
        if speed_range is None:
            speed_range = list(range(0, 31, 1))  # 0-30 m/s
        
        air_density = self.calculate_air_density(altitude)
        base_hover_power = config.hover_power or (config.mass * 15.0)  # Fallback estimation
        
        results = {
            'config_summary': {
                'mass': config.mass,
                'rotor_diameter': config.rotor_diameter,
                'frame_type': config.frame_type.value if config.frame_type else 'quad',
                'motor_config': config.motor_config.value if config.motor_config else 'single',
                'hover_power': base_hover_power
            },
            'comparison_data': [],
            'sweet_spots': {
                'current_backend': None,
                'glauert': None
            },
            'range_analysis': {
                'current_backend_range': 0,
                'glauert_range': 0,
                'difference_percent': 0
            }
        }
        
        current_powers = []
        glauert_powers = []
        
        for speed in speed_range:
            # Current backend method
            efficiency_factor = self.calculate_current_backend_efficiency_factor(config, speed)
            current_power = base_hover_power * efficiency_factor
            
            # Glauert method
            glauert_result = self.calculate_glauert_power(config, speed, air_density=air_density)
            glauert_power = glauert_result.get('electrical_power', current_power)
            
            current_powers.append(current_power)
            glauert_powers.append(glauert_power)
            
            results['comparison_data'].append({
                'speed': speed,
                'current_backend_power': current_power,
                'glauert_power': glauert_power,
                'difference_watts': glauert_power - current_power,
                'difference_percent': ((glauert_power - current_power) / current_power * 100) if current_power > 0 else 0,
                'current_power_per_kg': current_power / config.mass,
                'glauert_power_per_kg': glauert_power / config.mass,
                'glauert_details': glauert_result
            })
        
        # Find sweet spots (minimum power points)
        if current_powers:
            min_current_idx = current_powers.index(min(current_powers))
            results['sweet_spots']['current_backend'] = {
                'speed': speed_range[min_current_idx],
                'power': current_powers[min_current_idx],
                'power_per_kg': current_powers[min_current_idx] / config.mass
            }
        
        if glauert_powers:
            min_glauert_idx = glauert_powers.index(min(glauert_powers))
            results['sweet_spots']['glauert'] = {
                'speed': speed_range[min_glauert_idx],
                'power': glauert_powers[min_glauert_idx],
                'power_per_kg': glauert_powers[min_glauert_idx] / config.mass
            }
        
        # Range analysis (assuming 22Ah battery at 25.2V = 554Wh)
        battery_energy_wh = (config.battery_capacity * config.battery_voltage) / 1000  # Wh
        usable_energy = battery_energy_wh * 0.8  # 80% usable capacity
        
        # Estimate range at cruise speed (assume 12 m/s typical cruise)
        cruise_idx = 12 if 12 in speed_range else len(speed_range)//2
        if cruise_idx < len(current_powers):
            current_cruise_power = current_powers[cruise_idx]
            glauert_cruise_power = glauert_powers[cruise_idx]
            
            current_flight_time = usable_energy / current_cruise_power  # hours
            glauert_flight_time = usable_energy / glauert_cruise_power  # hours
            
            cruise_speed = speed_range[cruise_idx]
            results['range_analysis']['current_backend_range'] = current_flight_time * cruise_speed * 3.6  # km
            results['range_analysis']['glauert_range'] = glauert_flight_time * cruise_speed * 3.6  # km
            results['range_analysis']['difference_percent'] = (
                (results['range_analysis']['glauert_range'] - results['range_analysis']['current_backend_range']) 
                / results['range_analysis']['current_backend_range'] * 100
            )
        
        return results
    
    def generate_analysis_report(self, config: VehicleConfig, altitude: float = 0) -> str:
        """Generate a human-readable analysis report"""
        analysis = self.compare_methods(config, altitude=altitude)
        
        report = f"""
=== GLAUERT vs. CURRENT BACKEND ANALYSIS ===

🚁 Vehicle Configuration:
- Mass: {analysis['config_summary']['mass']} kg
- Rotor Diameter: {analysis['config_summary']['rotor_diameter']} m
- Frame: {analysis['config_summary']['frame_type'].upper()}
- Motor Config: {analysis['config_summary']['motor_config'].upper()}
- Hover Power: {analysis['config_summary']['hover_power']} W

🎯 Sweet Spot Comparison:
Current Backend: {analysis['sweet_spots']['current_backend']['speed']} m/s @ {analysis['sweet_spots']['current_backend']['power']:.0f}W ({analysis['sweet_spots']['current_backend']['power_per_kg']:.1f} W/kg)
Glauert Formula: {analysis['sweet_spots']['glauert']['speed']} m/s @ {analysis['sweet_spots']['glauert']['power']:.0f}W ({analysis['sweet_spots']['glauert']['power_per_kg']:.1f} W/kg)

📏 Range Estimation (@ 12 m/s):
Current Backend: {analysis['range_analysis']['current_backend_range']:.1f} km
Glauert Formula: {analysis['range_analysis']['glauert_range']:.1f} km
Difference: {analysis['range_analysis']['difference_percent']:.1f}%

⚠️  Impact Analysis:
"""
        
        if analysis['range_analysis']['difference_percent'] > 10:
            report += f"❌ Current backend may OVERESTIMATE range by {abs(analysis['range_analysis']['difference_percent']):.1f}%\n"
            report += "   → This matches your observation of overestimated ranges!\n"
        elif analysis['range_analysis']['difference_percent'] < -10:
            report += f"📉 Glauert suggests {abs(analysis['range_analysis']['difference_percent']):.1f}% shorter range\n"
            report += "   → More conservative, potentially more realistic\n"
        else:
            report += "✅ Both methods show similar range predictions\n"
        
        # Power comparison at different speeds
        report += "\n📊 Power Comparison at Key Speeds:\n"
        key_speeds = [0, 5, 10, 15, 20]
        for data in analysis['comparison_data']:
            if data['speed'] in key_speeds:
                report += f"   {data['speed']:2d} m/s: Current {data['current_backend_power']:4.0f}W vs Glauert {data['glauert_power']:4.0f}W ({data['difference_percent']:+.1f}%)\n"
        
        return report


def main():
    """Test the analyzer with a typical configuration"""
    # Example configuration (15kg Hexacopter)
    from models.vehicles import VehicleConfig, FrameType, MotorConfiguration
    
    test_config = VehicleConfig(
        mass=15.0,
        rotor_diameter=0.4,
        frame_type=FrameType.HEXA,
        motor_config=MotorConfiguration.SINGLE,
        hover_power=2400,
        battery_capacity=22000,
        battery_voltage=25.2,
        motor_efficiency=0.85,
        propeller_efficiency=0.75,
        drag_coefficient=0.035
    )
    
    analyzer = GlauertAnalyzer()
    report = analyzer.generate_analysis_report(test_config)
    print(report)


if __name__ == "__main__":
    main()
