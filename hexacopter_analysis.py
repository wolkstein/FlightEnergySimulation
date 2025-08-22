#!/usr/bin/env python3
"""
Hexacopter Analysis: 10kg, 2160W, 6 Motors, 44cm Rotors
"""

import sys
sys.path.insert(0, '/app')

from services.glauert_analyzer import GlauertAnalyzer
from models.vehicles import VehicleConfig

print("=== Glauert vs Backend Analyse: 10kg Hexacopter ===")

# 10kg Hexacopter Konfiguration (korrigiert von 11kg)
config = VehicleConfig(
    vehicle_type="multirotor",
    mass=10.0,
    max_power=4000,
    hover_power=2160,
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

print(f"Masse: {config.mass}kg")
print(f"Hover Power: {config.hover_power}W")
print(f"Frame: {config.frame_type} (6 Motoren)")
print(f"Rotor Ø: {config.rotor_diameter}m")
print(f"Batterie: {config.battery_capacity}mAh @ {config.battery_voltage}V")
print()

analyzer = GlauertAnalyzer()

# Verwende die compare_methods Funktion statt direkter Aufrufe
print("=== Vollständiger Vergleich ===")
results = analyzer.compare_methods(config, speed_range=list(range(0, 21, 1)))

print("\n=== Zusammenfassung ===")
print(f"Sweet Spot Backend: {results['sweet_spots']['current_backend']['speed']}m/s @ {results['sweet_spots']['current_backend']['power']:.0f}W")
print(f"Sweet Spot Glauert: {results['sweet_spots']['glauert']['speed']}m/s @ {results['sweet_spots']['glauert']['power']:.0f}W")
print(f"Range Backend: {results['range_analysis']['current_backend_range']:.1f}km")
print(f"Range Glauert: {results['range_analysis']['glauert_range']:.1f}km")
print(f"Range Differenz: {results['range_analysis']['difference_percent']:+.1f}%")

# Detaillierte Analyse mit Geschwindigkeiten aus compare_methods
print("\n=== Detailanalyse Geschwindigkeiten 0-20 m/s ===")
print("Speed (m/s) | Glauert (W) | Backend (W) | Difference | Ratio")  
print("-" * 65)

# Nutze die bereits berechneten Daten aus compare_methods
speed_range = list(range(0, 21, 1))
air_density = analyzer.calculate_air_density(0)
base_hover_power = config.hover_power

for speed in [0.1, 2, 5, 8, 10, 12, 15, 18, 20]:  # 0.0 -> 0.1 für Hover-Test
    # Glauert Power direkt berechnen
    glauert_result = analyzer.calculate_glauert_power(config, speed, air_density=air_density)
    glauert_power = glauert_result.get('electrical_power', 0)
    
    # Backend Power über Sweet Spot Logic (ohne direkte Methoden-Aufrufe)
    mass = float(config.mass)
    sweet_spot_min = max(2.0, mass * 0.3)
    sweet_spot_max = max(4.0, mass * 0.5) 
    sweet_spot_center = (sweet_spot_min + sweet_spot_max) / 2
    
    if speed <= 0.1:  # Quasi-Hover für sehr langsame Geschwindigkeit
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
    
    backend_power = config.hover_power * efficiency_factor
    
    diff = glauert_power - backend_power
    ratio = (glauert_power / backend_power - 1) * 100 if backend_power > 0 else 0
    
    speed_label = "Hover" if speed <= 0.1 else f"{speed:.1f}"
    print(f"{speed_label:>10} | {glauert_power:9.1f} | {backend_power:9.1f} | {diff:+8.1f} | {ratio:+5.1f}%")

print()

# Zusätzliche Hover-Analyse (Test mit 0.1 m/s statt 0.0)
print("=== Hover-Analyse (0.1 m/s statt 0.0 m/s) ===")
glauert_hover_result = analyzer.calculate_glauert_power(config, 0.1)  # 0.0 -> 0.1
glauert_hover = glauert_hover_result.get('electrical_power', 0)
backend_hover = config.hover_power

hover_diff = glauert_hover - backend_hover
hover_ratio = (glauert_hover / backend_hover - 1) * 100

battery_energy_wh = (config.battery_capacity / 1000) * config.battery_voltage * 0.85

print(f"Glauert Hover Power (0.1 m/s): {glauert_hover:.1f}W")
print(f"Backend Hover Power: {backend_hover:.1f}W")
print(f"Differenz: {hover_diff:+.1f}W ({hover_ratio:+.1f}%)")

# Vergleich: 0.0 vs 0.1 m/s bei Glauert
print("\n=== Vergleich 0.0 vs 0.1 m/s bei Glauert ===")
glauert_0_0 = analyzer.calculate_glauert_power(config, 0.0).get('electrical_power', 0)
glauert_0_1 = analyzer.calculate_glauert_power(config, 0.1).get('electrical_power', 0)

print(f"Glauert bei 0.0 m/s: {glauert_0_0:.1f}W")
print(f"Glauert bei 0.1 m/s: {glauert_0_1:.1f}W")
print(f"Unterschied: {(glauert_0_1 - glauert_0_0):+.1f}W ({((glauert_0_1/glauert_0_0-1)*100):+.1f}%)")

# Hover Flugzeit
glauert_hover_time = battery_energy_wh / (glauert_hover / 1000) * 60
backend_hover_time = battery_energy_wh / (backend_hover / 1000) * 60

print(f"Glauert Hover Zeit: {glauert_hover_time:.1f}min")
print(f"Backend Hover Zeit: {backend_hover_time:.1f}min")
print(f"Hover Zeit Differenz: {((glauert_hover_time/backend_hover_time-1)*100):+.1f}%")
