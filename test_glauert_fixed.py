#!/usr/bin/env python3
"""
Test script for validating Glauert momentum theory implementation
Run this to check if our Sweet Spot Analysis formulas are correct
"""

import math

def test_glauert_formula():
    print("=== GLAUERT MOMENTUM THEORY VALIDATION ===\n")
    
    # Test both motor configurations
    for motor_config in ['single', 'coaxial']:
        print(f"TESTING {motor_config.upper()} CONFIGURATION")
        print("=" * 50)
        
        # Test parameters - typical 25kg hexacopter (wie im Frontend)
        mass = 25.0  # kg
        rotor_diameter = 0.45  # m (18 inch props)
        base_rotor_count = 6
        air_density = 1.225  # kg/m³
        gravity = 9.81  # m/s²
        
        # For coaxial: same number of rotor positions, but each has 2 rotors stacked
        # The physics should be calculated per rotor position, not per individual rotor
        rotor_count = base_rotor_count  # Same number of rotor positions for both configs
        
        print(f"Test Configuration:")
        print(f"- Mass: {mass} kg")
        print(f"- Rotor diameter: {rotor_diameter} m")
        print(f"- Base rotor count: {base_rotor_count} (frame: hexa)")
        print(f"- Rotor positions: {rotor_count} ({motor_config})")
        if motor_config == 'coaxial':
            print(f"- Total rotors: {rotor_count * 2} (2 per position)")
        else:
            print(f"- Total rotors: {rotor_count}")
        print(f"- Motor config: {motor_config}")
        print(f"- Air density: {air_density} kg/m³")
        print()
        
        # Calculate basic parameters
        rotor_radius = rotor_diameter / 2
        disk_area = math.pi * rotor_radius**2  # m² per rotor
        total_weight = mass * gravity  # N
        thrust_per_rotor = total_weight / rotor_count  # N per rotor
        
        # Apply coaxial efficiency penalty - coaxial rotors are less efficient due to rotor wash interaction
        # This penalty increases the power requirement (decreases efficiency)
        coaxial_efficiency = 0.85 if motor_config == 'coaxial' else 1.0  # 15% penalty for coaxial
        
        print(f"Calculated Parameters:")
        print(f"- Disk area per rotor: {disk_area:.4f} m²")
        print(f"- Total weight: {total_weight:.1f} N")
        print(f"- Thrust per rotor: {thrust_per_rotor:.1f} N")
        if motor_config == 'coaxial':
            print(f"- Coaxial efficiency penalty: {coaxial_efficiency:.1%} (power increased by {(1/coaxial_efficiency - 1)*100:.1f}%)")
        print()
        
        # Hover calculation (Glauert ideal)
        hover_induced_velocity = math.sqrt(thrust_per_rotor / (2 * air_density * disk_area))
        hover_induced_power_per_rotor = thrust_per_rotor * hover_induced_velocity
        # For coaxial: power penalty applied here (not rotor count multiplication)
        total_hover_power_ideal = (hover_induced_power_per_rotor * rotor_count) / coaxial_efficiency
        
        # Apply system efficiency losses for realistic electrical power consumption
        motor_efficiency = 0.85      # Brushless motor efficiency
        propeller_efficiency = 0.70  # Höhere Propeller-Effizienz für schwere Multirotor
        esc_efficiency = 0.95        # ESC efficiency
        system_efficiency = motor_efficiency * propeller_efficiency * esc_efficiency  # ~56.4%
        
        total_hover_power = total_hover_power_ideal / system_efficiency  # Electrical power needed
        
        print(f"HOVER (v=0 m/s):")
        print(f"- Induced velocity: {hover_induced_velocity:.2f} m/s")
        print(f"- Power per rotor (ideal): {hover_induced_power_per_rotor:.1f} W")
        print(f"- Total hover power (ideal): {total_hover_power_ideal:.1f} W ({total_hover_power_ideal/mass:.1f} W/kg)")
        print(f"- System efficiency: {system_efficiency:.1%}")
        print(f"- Total hover power (electrical): {total_hover_power:.1f} W ({total_hover_power/mass:.1f} W/kg)")
        print()
        
        # Test various forward speeds
        test_speeds = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 20]
        
        print("FORWARD FLIGHT ANALYSIS:")
        print("Speed   μ      Pi_ratio  Induced_P  Profile_P  Parasitic_P  Total_P   W/kg   Efficiency")
        print("(m/s)          Pi/Pi0    (W)        (W)        (W)          (W)       (W/kg)  vs Hover")
        print("-" * 95)
        
        min_power = float('inf')
        min_speed = 0
        
        for speed in test_speeds:
            if speed == 0:
                # Hover case
                induced_power = total_hover_power
                profile_power = 0
                parasitic_power = 0
                total_power = induced_power
                mu = 0
                pi_ratio = 1.0
            else:
                # Forward flight
                mu = speed / hover_induced_velocity
                
                # Glauert momentum theory: Pi/Pi0 = sqrt(1 + μ²) - μ
                pi_ratio = math.sqrt(1 + mu**2) - mu
                induced_power_ideal = total_hover_power_ideal * pi_ratio
                induced_power = induced_power_ideal / system_efficiency  # Convert to electrical power
                
                # Profile power (corrected - much more realistic)
                # Profile power should increase significantly with speed
                tip_speed = math.sqrt(thrust_per_rotor / (air_density * disk_area)) * 8  # Higher tip speed
                profile_drag_coeff = 0.015  # Höherer Drag für stärkere Profile Power
                solidity_ratio = 0.08  # Höhere Solidity
                
                # Profile power increases with forward speed (additional drag on advancing blade)
                speed_factor = 1 + (speed / 10)**1.8  # Stärkerer Anstieg für früheren Sweet Spot
                
                profile_power_per_rotor = (profile_drag_coeff * air_density * disk_area * 
                                         tip_speed**3 * solidity_ratio * speed_factor) / 8
                profile_power_ideal = (profile_power_per_rotor * rotor_count) / coaxial_efficiency
                profile_power = profile_power_ideal / system_efficiency  # Convert to electrical power
                
                # Parasitic drag power (vehicle body drag) - TEST with higher drag
                parasitic_drag_coeff = 0.15  # Reduzierter Parasitic Drag 
                frontal_area = mass * 0.012  # Smaller frontal area: 0.012 m²/kg
                parasitic_power = 0.5 * air_density * parasitic_drag_coeff * frontal_area * speed**3
                
                total_power = induced_power + profile_power + parasitic_power
            
            power_per_kg = total_power / mass
            efficiency_vs_hover = (total_hover_power - total_power) / total_hover_power * 100
            
            if total_power < min_power:
                min_power = total_power
                min_speed = speed
            
            print(f"{speed:5.1f}  {mu:6.2f}  {pi_ratio:8.3f}  {induced_power:9.0f}  {profile_power:9.0f}  "
                  f"{parasitic_power:11.0f}  {total_power:7.0f}  {power_per_kg:6.1f}  {efficiency_vs_hover:8.1f}%")
        
        print("-" * 95)
        print(f"\nSWEET SPOT ANALYSIS:")
        print(f"- Minimum power: {min_power:.0f} W at {min_speed} m/s")
        print(f"- Sweet spot efficiency: {min_power/mass:.1f} W/kg")
        print(f"- Efficiency gain vs hover: {(total_hover_power - min_power)/total_hover_power * 100:.1f}%")
        print()
        
        print("VALIDATION CHECKS:")
        print(f"✓ Hover power realistic? {total_hover_power:.0f}W = {total_hover_power/mass:.1f} W/kg (should be 140-180 W/kg)")
        print(f"✓ Sweet spot speed realistic? {min_speed} m/s (should be 3-8 m/s for multirotors)")
        print(f"✓ Sweet spot power realistic? {min_power/mass:.1f} W/kg (should be 15-25% less than hover)")
        
        if 140 <= total_hover_power/mass <= 180:
            print("✅ Hover W/kg is realistic")
        else:
            print("❌ Hover W/kg is unrealistic")
        
        if 3 <= min_speed <= 8:
            print("✅ Sweet spot speed is realistic")
        else:
            print("❌ Sweet spot speed is unrealistic")
        
        efficiency_gain = (total_hover_power - min_power)/total_hover_power * 100
        if 15 <= efficiency_gain <= 25:
            print("✅ Efficiency gain is realistic")
        else:
            print("❌ Efficiency gain is unrealistic")
        
        print("\n" + "="*50 + "\n")  # Separation between configurations

if __name__ == "__main__":
    test_glauert_formula()
