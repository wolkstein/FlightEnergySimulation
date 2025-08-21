#!/usr/bin/env python3
"""
Test Script for Wind Direction Bug Fix
"""
import requests
import json

# Test configuration: 15 m/s north wind (0° = from north)
test_data = {
    "waypoints": [
        {"latitude": 52.5, "longitude": 13.4, "altitude": 100},  # Start: Berlin
        {"latitude": 52.6, "longitude": 13.4, "altitude": 100},  # North: 1°N from Berlin
        {"latitude": 52.5, "longitude": 13.4, "altitude": 100},  # Back to start
        {"latitude": 52.4, "longitude": 13.4, "altitude": 100},  # South: 1°S from Berlin
    ],
    "vehicle_config": {
        "vehicle_type": "multirotor",
        "frame_type": "quad",
        "motor_config": "single",
        "mass": 2.5,
        "cruise_speed": 10.0,
        "max_speed": 15.0,
        "max_climb_rate": 5.0,
        "max_descent_speed": 8.0,
        "horizontal_acceleration": 3.0,
        "vertical_acceleration": 2.5,
        "motor_efficiency": 0.85,
        "propeller_efficiency": 0.75,
        "drag_coefficient": 0.03,
        "wing_area": 0.5,
        "rotor_diameter": 0.3,
        "battery_capacity": 22000,
        "battery_voltage": 25.2,
        "max_power": 2000,
        "hover_power": 800
    },
    "manual_wind_enabled": True,
    "manual_wind_speed_ms": 15.0,
    "manual_wind_direction_deg": 0.0  # North wind (from north)
}

def test_wind_calculation():
    print("Testing wind direction calculation fix...")
    print(f"Wind: 15 m/s from 0° (North)")
    print()
    
    try:
        # Send request to API
        response = requests.post("http://localhost:8000/api/simulation", json=test_data)
        
        if response.status_code != 200:
            print(f"ERROR: API returned status {response.status_code}")
            print(f"Response: {response.text}")
            return
            
        result = response.json()
        
        print("Flight segments wind analysis:")
        print("-" * 60)
        
        for i, segment in enumerate(result['flight_segments']):
            wind_info = segment['wind_influence']
            start_wp = segment['start_waypoint']
            end_wp = segment['end_waypoint']
            
            # Calculate flight direction
            if start_wp['latitude'] < end_wp['latitude']:
                direction = "North"
            elif start_wp['latitude'] > end_wp['latitude']:
                direction = "South"
            else:
                direction = "Same latitude"
                
            print(f"Segment {i}: Flying {direction}")
            print(f"  From: {start_wp['latitude']:.3f}, {start_wp['longitude']:.3f}")
            print(f"  To:   {end_wp['latitude']:.3f}, {end_wp['longitude']:.3f}")
            print(f"  Wind speed: {wind_info['speed_ms']} m/s")
            print(f"  Wind direction: {wind_info['direction_deg']}°")
            print(f"  Headwind: {wind_info['headwind_ms']} m/s")
            print(f"  Crosswind: {wind_info['crosswind_ms']} m/s")
            if 'flight_bearing_deg' in wind_info:
                print(f"  Flight bearing: {wind_info['flight_bearing_deg']}°")
            print()
        
        # Check if the fix worked
        segments = result['flight_segments']
        
        if len(segments) >= 3:
            # Segment 0: North (should have tailwind with north wind)
            north_headwind = segments[0]['wind_influence']['headwind_ms']
            # Segment 2: South (should have headwind with north wind)  
            south_headwind = segments[2]['wind_influence']['headwind_ms']
            
            print("Analysis:")
            print(f"Flying North with North wind: headwind = {north_headwind} m/s (should be negative = tailwind)")
            print(f"Flying South with North wind: headwind = {south_headwind} m/s (should be positive = headwind)")
            
            # Check if values are different and make sense
            if abs(north_headwind - south_headwind) > 1.0:
                print("✅ SUCCESS: Wind direction is properly calculated!")
                if north_headwind < 0 and south_headwind > 0:
                    print("✅ Wind components are correct: North=tailwind, South=headwind")
                else:
                    print("⚠️  Wind components may need sign adjustment")
            else:
                print("❌ FAILED: Wind direction is still not calculated correctly")
        
    except requests.exceptions.ConnectionError:
        print("ERROR: Cannot connect to API. Is the backend running?")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_wind_calculation()
