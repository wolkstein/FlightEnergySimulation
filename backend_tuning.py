#!/usr/bin/env python3
"""
Backend Tuning Test: Adjust Sweet Spot parameters to match real flight data
"""

import sys
sys.path.insert(0, '/app')

from services.glauert_analyzer import GlauertAnalyzer
from models.vehicles import VehicleConfig

def calculate_tuned_backend_power(config, speed, efficiency_multiplier=1.0, max_efficiency_gain=0.35):
    """
    Tuned Backend Sweet Spot calculation with adjustable parameters
    
    Args:
        efficiency_multiplier: Multiplier for overall efficiency curve (0.5-1.5)
        max_efficiency_gain: Maximum efficiency gain (0.1-0.35, default 0.35 = 35%)
    """
    mass = float(config.mass)
    sweet_spot_min = max(2.0, mass * 0.3)  # ~3m/s for 10kg
    sweet_spot_max = max(4.0, mass * 0.5)  # ~5m/s for 10kg
    sweet_spot_center = (sweet_spot_min + sweet_spot_max) / 2
    
    if speed == 0:
        efficiency_factor = 1.0
    elif speed <= sweet_spot_min:
        # Slow forward flight: slight improvement
        base_improvement = (speed / sweet_spot_min) * 0.25
        efficiency_factor = 1.0 - (base_improvement * efficiency_multiplier)
    elif speed <= sweet_spot_max:
        # Sweet Spot: maximum efficiency - TUNABLE HERE
        normalized_pos = (speed - sweet_spot_center) / (sweet_spot_max - sweet_spot_center)
        efficiency_gain = (max_efficiency_gain * efficiency_multiplier) * (1 - normalized_pos**2)
        efficiency_factor = 0.75 - efficiency_gain
    else:
        # Fast flight: efficiency decreases due to high angle of attack
        excess_speed = speed - sweet_spot_max
        penalty = min(0.4, excess_speed * 0.03)
        efficiency_factor = 0.75 + penalty
    
    return config.hover_power * efficiency_factor, efficiency_factor

def test_backend_tuning():
    """Test different tuning parameters for Backend Sweet Spot"""
    
    # 10kg Hexacopter Configuration
    config = VehicleConfig(
        vehicle_type="multirotor",
        mass=10.0,
        max_power=4000,
        hover_power=2160,  # Real measured value
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
    
    # Test different tuning parameters
    tuning_configs = [
        {"name": "Original", "efficiency_multiplier": 1.0, "max_efficiency_gain": 0.35},
        {"name": "Conservative", "efficiency_multiplier": 0.7, "max_efficiency_gain": 0.25},  
        {"name": "Mild", "efficiency_multiplier": 0.8, "max_efficiency_gain": 0.20},
        {"name": "Realistic", "efficiency_multiplier": 0.6, "max_efficiency_gain": 0.15},
        {"name": "Ultra-Mild", "efficiency_multiplier": 0.5, "max_efficiency_gain": 0.12},
        {"name": "Gentle", "efficiency_multiplier": 0.45, "max_efficiency_gain": 0.10},
    ]
    
    speeds = [0, 2, 3, 4, 5, 6, 8, 10, 12, 15, 18, 20]
    
    print("=== BACKEND TUNING ANALYSIS ===")
    print(f"Base Hover Power: {config.hover_power}W")
    print()
    
    # Header
    header = "Speed(m/s)"
    for tuning in tuning_configs:
        header += f" | {tuning['name']:>10s}"
    print(header)
    print("-" * (len(header) + 20))
    
    # Data rows
    for speed in speeds:
        row = f"{speed:8.0f} "
        powers = []
        
        for tuning in tuning_configs:
            power, efficiency = calculate_tuned_backend_power(
                config, speed, 
                tuning["efficiency_multiplier"], 
                tuning["max_efficiency_gain"]
            )
            powers.append(power)
            row += f" | {power:7.0f}W "
        
        print(row)
        
        # Show efficiency factors for key speeds
        if speed in [0, 5, 12]:
            efficiency_row = f"      eff"
            for i, tuning in enumerate(tuning_configs):
                _, efficiency = calculate_tuned_backend_power(
                    config, speed, 
                    tuning["efficiency_multiplier"], 
                    tuning["max_efficiency_gain"]
                )
                efficiency_row += f" | {efficiency:7.2f}  "
            print(efficiency_row)
    
    print()
    
    # Sweet Spot Analysis
    print("=== SWEET SPOT ANALYSIS ===")
    for tuning in tuning_configs:
        min_power = float('inf')
        sweet_spot_speed = 0
        
        for speed in range(1, 16):
            power, _ = calculate_tuned_backend_power(
                config, speed, 
                tuning["efficiency_multiplier"], 
                tuning["max_efficiency_gain"]
            )
            if power < min_power:
                min_power = power
                sweet_spot_speed = speed
        
        print(f"{tuning['name']:>12s}: {sweet_spot_speed}m/s @ {min_power:.0f}W "
              f"({(min_power/config.hover_power)*100:.0f}% of hover)")
    
    print()
    
    # Glauert Comparison - Test the gentler settings
    print("=== COMPARISON WITH GLAUERT AT KEY SPEEDS ===")
    analyzer = GlauertAnalyzer()
    
    comparison_speeds = [4, 5, 8, 10, 15]
    print("Speed | Ultra-Mild Backend | Gentle Backend | Glauert | Ultra vs Glauert | Gentle vs Glauert")
    print("-" * 95)
    
    for speed in comparison_speeds:
        ultra_mild_power, _ = calculate_tuned_backend_power(
            config, speed, 0.5, 0.12  # "Ultra-Mild" tuning
        )
        
        gentle_power, _ = calculate_tuned_backend_power(
            config, speed, 0.45, 0.10  # "Gentle" tuning  
        )
        
        glauert_result = analyzer.calculate_glauert_power(config, speed)
        glauert_power = glauert_result.get('electrical_power', 0)
        
        ultra_diff = glauert_power - ultra_mild_power
        ultra_pct = (ultra_diff / ultra_mild_power) * 100
        
        gentle_diff = glauert_power - gentle_power
        gentle_pct = (gentle_diff / gentle_power) * 100
        
        print(f"{speed:4d}m/s | {ultra_mild_power:15.0f}W | {gentle_power:12.0f}W | {glauert_power:6.0f}W | "
              f"{ultra_diff:+6.0f}W ({ultra_pct:+5.1f}%) | {gentle_diff:+6.0f}W ({gentle_pct:+5.1f}%)")

if __name__ == "__main__":
    test_backend_tuning()
