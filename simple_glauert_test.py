#!/usr/bin/env python3
"""
Simple Glauert test for Docker container
"""

print("🚁 Starting Glauert Analysis Test...")

try:
    print("1. Testing basic imports...")
    import math
    print("   ✅ Math imported")
    
    import sys
    print(f"   ✅ Python version: {sys.version}")
    
    print("2. Testing model imports...")
    from models.vehicles import VehicleConfig, FrameType, MotorConfiguration
    print("   ✅ Vehicle models imported")
    
    print("3. Testing Glauert analyzer import...")
    from services.glauert_analyzer import GlauertAnalyzer
    print("   ✅ GlauertAnalyzer imported")
    
    print("4. Creating analyzer instance...")
    analyzer = GlauertAnalyzer()
    print("   ✅ Analyzer created")
    
    print("5. Creating test configuration...")
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
    print("   ✅ Config created")
    
    print("6. Testing Glauert calculation...")
    result = analyzer.calculate_glauert_power(config, 10.0)
    print(f"   ✅ Glauert result: {result.get('electrical_power', 'N/A')}W")
    
    print("7. Testing backend efficiency factor...")
    eff_factor = analyzer.calculate_current_backend_efficiency_factor(10.0, config)
    current_power = config.hover_power * eff_factor
    print(f"   ✅ Backend result: {current_power}W")
    
    print("\n🎯 QUICK COMPARISON:")
    print(f"   Current Backend: {current_power:.0f}W")
    print(f"   Glauert Formula: {result.get('electrical_power', 0):.0f}W")
    
    diff = result.get('electrical_power', 0) - current_power
    print(f"   Difference: {diff:+.0f}W ({diff/current_power*100:+.1f}%)")
    
    print("\n✅ Phase 1 Analysis successful!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
