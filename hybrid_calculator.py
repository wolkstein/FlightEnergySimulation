#!/usr/bin/env python3
"""
Hybrid Power Calculator - Combines Backend (Hover) + Glauert (Forward Flight)
Based on real flight data validation from log files.
"""

import sys
sys.path.insert(0, '/app')
import math
from services.glauert_analyzer import GlauertAnalyzer
from models.vehicles import VehicleConfig

class HybridPowerCalculator:
    """
    Hybrid approach: Backend for hover (0-2 m/s), Glauert for forward flight (2+ m/s)
    """
    
    def __init__(self):
        self.glauert_analyzer = GlauertAnalyzer()
        self.transition_speed = 2.0  # m/s - Übergang von Backend zu Glauert
        self.blend_range = 1.0  # m/s - Sanfte Übergangszone
    
    def calculate_backend_hover_power(self, config: VehicleConfig, speed: float) -> float:
        """
        Backend Sweet Spot Logic - nur für niedrige Geschwindigkeiten (0-2 m/s)
        """
        mass = float(config.mass)
        sweet_spot_min = max(2.0, mass * 0.3)
        sweet_spot_max = max(4.0, mass * 0.5) 
        sweet_spot_center = (sweet_spot_min + sweet_spot_max) / 2
        
        if speed == 0:
            efficiency_factor = 1.0
        elif speed <= sweet_spot_min:
            efficiency_factor = 1.0 - (speed / sweet_spot_min) * 0.25
        elif speed <= sweet_spot_max:
            normalized_pos = (speed - sweet_spot_center) / (sweet_spot_max - sweet_spot_center)
            efficiency_gain = 0.35 * (1 - normalized_pos**2)
            efficiency_factor = 0.75 - efficiency_gain
        else:
            excess_speed = speed - sweet_spot_max
            penalty = min(0.4, excess_speed * 0.03)
            efficiency_factor = 0.75 + penalty
        
        return config.hover_power * efficiency_factor
    
    def calculate_glauert_forward_power(self, config: VehicleConfig, speed: float) -> float:
        """
        Glauert formula - für höhere Geschwindigkeiten (2+ m/s)
        """
        result = self.glauert_analyzer.calculate_glauert_power(config, speed)
        return result.get('electrical_power', config.hover_power)
    
    def calculate_hybrid_power(self, config: VehicleConfig, speed: float) -> dict:
        """
        Hybrid calculation with smooth transition between methods
        """
        backend_power = self.calculate_backend_hover_power(config, speed)
        glauert_power = self.calculate_glauert_forward_power(config, speed)
        
        if speed <= self.transition_speed - self.blend_range/2:
            # Pure Backend (Hover Zone)
            final_power = backend_power
            method = "Backend"
            blend_ratio = 1.0
            
        elif speed >= self.transition_speed + self.blend_range/2:
            # Pure Glauert (Forward Flight Zone) 
            final_power = glauert_power
            method = "Glauert"
            blend_ratio = 0.0
            
        else:
            # Smooth Transition Zone
            transition_progress = (speed - (self.transition_speed - self.blend_range/2)) / self.blend_range
            blend_ratio = 1.0 - transition_progress  # 1.0 = Backend, 0.0 = Glauert
            
            final_power = backend_power * blend_ratio + glauert_power * (1 - blend_ratio)
            method = f"Blend({blend_ratio:.1f})"
        
        return {
            'final_power': final_power,
            'backend_power': backend_power,
            'glauert_power': glauert_power,
            'method': method,
            'blend_ratio': blend_ratio,
            'speed': speed
        }

def test_hybrid_calculator():
    """Test the hybrid calculator with the 10kg hexacopter"""
    
    # 10kg Hexacopter Configuration
    config = VehicleConfig(
        vehicle_type="multirotor",
        mass=10.0,
        max_power=4000,
        hover_power=2160,  # Real measured value from logs
        cruise_power=1500,
        cruise_speed=12.0,
        max_speed=20.0,
        max_climb_rate=8.0,
        max_descent_speed=5.0,
        horizontal_acceleration=3.0,
        vertical_acceleration=2.0,
        battery_capacity=24000,
        battery_voltage=22.2,
        drag_coefficient=0.04,
        rotor_diameter=0.44,
        frame_type="hexa",
        motor_config="single",
        motor_efficiency=0.85,
        propeller_efficiency=0.78,
        transmission_efficiency=0.95
    )
    
    calculator = HybridPowerCalculator()
    
    print("=== HYBRID POWER CALCULATOR TEST ===")
    print(f"Masse: {config.mass}kg, Hover Power: {config.hover_power}W")
    print(f"Transition Speed: {calculator.transition_speed}m/s ± {calculator.blend_range/2}m/s")
    print()
    
    print("Speed (m/s) | Hybrid (W) | Method    | Backend (W) | Glauert (W) | Blend")
    print("-" * 75)
    
    speeds = [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 5.0, 8.0, 12.0, 15.0, 20.0]
    
    total_energy_hybrid = 0
    total_energy_backend = 0
    total_energy_glauert = 0
    
    for speed in speeds:
        result = calculator.calculate_hybrid_power(config, speed)
        
        print(f"{speed:10.1f} | {result['final_power']:8.1f} | {result['method']:9s} | "
              f"{result['backend_power']:9.1f} | {result['glauert_power']:9.1f} | {result['blend_ratio']:4.1f}")
        
        # Energy accumulation for range analysis
        total_energy_hybrid += result['final_power'] * 60  # Wh per hour at this speed
        total_energy_backend += result['backend_power'] * 60
        total_energy_glauert += result['glauert_power'] * 60
    
    print()
    
    # Range comparison at cruise speed
    cruise_result = calculator.calculate_hybrid_power(config, 12.0)
    battery_energy_wh = (config.battery_capacity / 1000) * config.battery_voltage * 0.85
    
    hybrid_flight_time = battery_energy_wh / (cruise_result['final_power'] / 1000) * 60  # minutes
    hybrid_range = (hybrid_flight_time / 60) * 12.0 * 3.6  # km
    
    print("=== RANGE ANALYSIS @ 12m/s CRUISE ===")
    print(f"Hybrid Power: {cruise_result['final_power']:.1f}W ({cruise_result['method']})")
    print(f"Flight Time: {hybrid_flight_time:.1f}min")
    print(f"Range: {hybrid_range:.1f}km")
    print()
    
    # Sweet Spot Analysis
    print("=== SWEET SPOT ANALYSIS ===")
    sweet_spot_power = float('inf')
    sweet_spot_speed = 0
    
    for speed in range(1, 21):
        result = calculator.calculate_hybrid_power(config, speed)
        if result['final_power'] < sweet_spot_power:
            sweet_spot_power = result['final_power']
            sweet_spot_speed = speed
    
    sweet_spot_result = calculator.calculate_hybrid_power(config, sweet_spot_speed)
    print(f"Hybrid Sweet Spot: {sweet_spot_speed}m/s @ {sweet_spot_power:.1f}W ({sweet_spot_result['method']})")
    
    return calculator

if __name__ == "__main__":
    test_hybrid_calculator()
