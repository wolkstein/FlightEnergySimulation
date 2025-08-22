#!/usr/bin/env python3
"""
Test the Glauert Analyzer with real-world configurations
"""

import sys
import os

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from services.glauert_analyzer import GlauertAnalyzer
from models.vehicles import VehicleConfig, FrameType, MotorConfiguration

def test_typical_configurations():
    """Test analyzer with typical drone configurations"""
    
    analyzer = GlauertAnalyzer()
    
    # Configuration 1: Small Quadcopter (5kg)
    small_quad = VehicleConfig(
        mass=5.0,
        rotor_diameter=0.25,
        frame_type=FrameType.QUAD,
        motor_config=MotorConfiguration.SINGLE,
        hover_power=800,
        battery_capacity=10000,
        battery_voltage=22.2,
        motor_efficiency=0.85,
        propeller_efficiency=0.75,
        drag_coefficient=0.03
    )
    
    # Configuration 2: Large Hexacopter (15kg)
    large_hexa = VehicleConfig(
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
    
    # Configuration 3: Coaxial Octocopter (25kg)
    heavy_octo = VehicleConfig(
        mass=25.0,
        rotor_diameter=0.35,
        frame_type=FrameType.OCTO,
        motor_config=MotorConfiguration.COAXIAL,
        hover_power=4000,
        battery_capacity=44000,
        battery_voltage=44.4,
        motor_efficiency=0.88,
        propeller_efficiency=0.78,
        drag_coefficient=0.04
    )
    
    configurations = [
        ("Small Quadcopter (5kg)", small_quad),
        ("Large Hexacopter (15kg)", large_hexa),
        ("Heavy Coaxial Octo (25kg)", heavy_octo)
    ]
    
    for name, config in configurations:
        print(f"\n{'='*60}")
        print(f"TESTING: {name}")
        print(f"{'='*60}")
        
        report = analyzer.generate_analysis_report(config)
        print(report)
        
        print("\n" + "="*60 + "\n")

def test_speed_analysis():
    """Test detailed speed analysis for one configuration"""
    
    analyzer = GlauertAnalyzer()
    
    # Test with a realistic 15kg Hexacopter
    config = VehicleConfig(
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
    
    # Detailed analysis
    analysis = analyzer.compare_methods(config, speed_range=list(range(0, 21)))
    
    print("\n" + "="*80)
    print("DETAILED SPEED ANALYSIS - 15kg Hexacopter")
    print("="*80)
    print(f"{'Speed':>5} {'Current':>8} {'Glauert':>8} {'Diff %':>7} {'Current W/kg':>12} {'Glauert W/kg':>12}")
    print("-" * 80)
    
    for data in analysis['comparison_data']:
        print(f"{data['speed']:5.0f} {data['current_backend_power']:8.0f} {data['glauert_power']:8.0f} "
              f"{data['difference_percent']:7.1f} {data['current_power_per_kg']:12.1f} {data['glauert_power_per_kg']:12.1f}")
    
    # Find the problematic speeds where difference is largest
    max_diff = max(analysis['comparison_data'], key=lambda x: abs(x['difference_percent']))
    print(f"\nLargest difference at {max_diff['speed']} m/s: {max_diff['difference_percent']:.1f}%")
    
    return analysis

if __name__ == "__main__":
    print("🚁 GLAUERT ANALYZER TEST")
    print("=" * 80)
    
    # Test typical configurations
    test_typical_configurations()
    
    # Detailed speed analysis
    detailed_analysis = test_speed_analysis()
    
    print("\n🎯 SUMMARY:")
    print("-" * 40)
    
    range_diff = detailed_analysis['range_analysis']['difference_percent']
    if abs(range_diff) > 5:
        print(f"⚠️  Range difference: {range_diff:.1f}%")
        if range_diff < 0:
            print("   → Glauert predicts SHORTER range (more realistic?)")
        else:
            print("   → Glauert predicts LONGER range")
    else:
        print("✅ Range predictions are similar")
    
    print("\nAnalysis complete! Check results above for insights.")
