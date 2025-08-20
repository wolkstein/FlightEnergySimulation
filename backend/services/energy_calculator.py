#!/usr/bin/env python3
"""
Flight Energy Simulation - Energy Calculation Engine
Copyright (C) 2025 wolkstein

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
"""

import math
from typing import List, Dict, Any
from models.vehicles import VehicleType, VehicleConfig, FrameType, MotorConfiguration
from models.waypoint import Waypoint, WindData
from models.simulation import SimulationResult, FlightSegment
import numpy as np

class EnergyCalculator:
    def __init__(self):
        self.AIR_DENSITY = 1.225  # kg/m³ auf Meereshöhe
        self.GRAVITY = 9.81  # m/s²
        
    def calculate_distance(self, wp1: Waypoint, wp2: Waypoint) -> float:
        """Berechnet die 3D-Distanz zwischen zwei Waypoints in Metern"""
        # Haversine Formel für horizontale Distanz
        lat1, lon1, alt1 = math.radians(wp1.latitude), math.radians(wp1.longitude), wp1.altitude
        lat2, lon2, alt2 = math.radians(wp2.latitude), math.radians(wp2.longitude), wp2.altitude
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        horizontal_distance = 6371000 * c  # Erdradius in Metern
        
        # 3D-Distanz mit Höhenunterschied
        vertical_distance = alt2 - alt1
        distance_3d = math.sqrt(horizontal_distance**2 + vertical_distance**2)
        
        return distance_3d
    
    def calculate_air_density(self, altitude: float) -> float:
        """Berechnet die Luftdichte in Abhängigkeit der Höhe"""
        # Barometrische Höhenformel (vereinfacht)
        # Temperaturabnahme: 6.5°C pro 1000m
        temperature_sea_level = 288.15  # Kelvin (15°C)
        temperature = temperature_sea_level - 0.0065 * altitude
        
        # Druckabnahme
        pressure_ratio = (temperature / temperature_sea_level) ** 5.255
        air_density = self.AIR_DENSITY * pressure_ratio
        
        return air_density

    def _calculate_hover_motors_count(self, config: VehicleConfig) -> int:
        """Berechnet die Anzahl der Hover-Motoren basierend auf Frame-Type und Motor-Konfiguration"""
        frame_motor_count = {
            FrameType.TRI: 3,
            FrameType.QUAD: 4, 
            FrameType.HEXA: 6,
            FrameType.OCTO: 8
        }
        
        base_count = frame_motor_count.get(config.frame_type, 4)  # Default: Quad
        
        # Coaxial-Konfiguration verdoppelt die Motoranzahl
        if config.motor_config == MotorConfiguration.COAXIAL:
            return base_count * 2
        
        return base_count

    def calculate_multirotor_power(self, config: VehicleConfig, speed: float, 
                                   climb_rate: float, air_density: float, wind_data: WindData = None) -> float:
        """Berechnet die benötigte Leistung für einen Multirotor (Tri/Quad/Hexa/Octo)"""
        # Schwebelleistung mit dynamischer Hover-Motor-Berechnung
        hover_motors_count = self._calculate_hover_motors_count(config)
        hover_power = config.hover_power or self.estimate_hover_power(config, air_density, hover_motors_count)
        
        # Zusätzliche Leistung für Horizontalflug
        drag_force = 0.5 * air_density * config.drag_coefficient * config.wing_area * speed**2
        horizontal_power = drag_force * speed / (config.motor_efficiency * config.propeller_efficiency)
        
        # Zusätzliche Leistung für Steigflug
        climb_power = 0
        if climb_rate > 0:
            climb_power = (config.mass * self.GRAVITY * climb_rate) / config.motor_efficiency
        
        # Windeinfluss
        wind_power = 0
        if wind_data:
            # Vereinfachte Windwiderstandsberechnung
            effective_speed = math.sqrt((speed + wind_data.wind_vector_x)**2 + wind_data.wind_vector_y**2)
            wind_drag = 0.5 * air_density * config.drag_coefficient * config.wing_area * (effective_speed - speed)**2
            wind_power = abs(wind_drag * speed) / (config.motor_efficiency * config.propeller_efficiency)
        
        total_power = hover_power + horizontal_power + climb_power + wind_power
        return min(total_power, config.max_power)
    
    def calculate_vtol_power(self, config: VehicleConfig, speed: float, 
                            climb_rate: float, air_density: float, wind_data: WindData = None) -> float:
        """Berechnet die benötigte Leistung für ein VTOL mit separatem Forward-Thrust"""
        # Unterscheidung zwischen Hover- und Cruise-Modus
        if speed < 5.0:  # Hover-Modus - nur Hover-Motoren
            return self.calculate_multirotor_power(config, speed, climb_rate, air_density, wind_data)
        else:  # Cruise-Modus - kombinierte Hover + Forward-Thrust
            # Hover-Motoren für Auftrieb (reduziert bei Forward-Flight)
            hover_power_factor = max(0.3, 1.0 - (speed / config.max_speed) * 0.7)  # 30-100% je nach Geschwindigkeit
            hover_motors_count = self._calculate_hover_motors_count(config)
            hover_power = self.estimate_hover_power(config, air_density, hover_motors_count) * hover_power_factor
            
            # Forward-Thrust Motor für Vortrieb (separater Parameter)
            forward_thrust_power = config.forward_thrust_power or (config.max_power * 0.3)
            
            # Zusätzliche Leistung für Steigflug
            climb_power = 0
            if climb_rate > 0:
                climb_power = (config.mass * self.GRAVITY * climb_rate) / config.motor_efficiency
            
            # Windeinfluss auf Forward-Thrust
            wind_power = 0
            if wind_data:
                effective_speed = math.sqrt((speed + wind_data.wind_vector_x)**2 + wind_data.wind_vector_y**2)
                wind_factor = effective_speed / speed if speed > 0 else 1.0
                wind_power = forward_thrust_power * (wind_factor - 1.0) * 0.5
            
            total_power = hover_power + forward_thrust_power + climb_power + wind_power
            return min(total_power, config.max_power)
    
    def calculate_plane_power(self, config: VehicleConfig, speed: float, 
                             climb_rate: float, air_density: float, wind_data: WindData = None) -> float:
        """Berechnet die benötigte Leistung für ein Starrflügelflugzeug"""
        # Grundleistung für Horizontalflug
        drag_coefficient = config.drag_coefficient
        wing_area = config.wing_area
        
        # Induced drag (Auftriebsinduzierter Widerstand)
        lift_force = config.mass * self.GRAVITY
        induced_drag_coeff = (lift_force / (0.5 * air_density * speed**2 * wing_area))**2 / (math.pi * 8)  # Vereinfacht
        
        total_drag_coeff = drag_coefficient + induced_drag_coeff
        drag_force = 0.5 * air_density * total_drag_coeff * wing_area * speed**2
        
        horizontal_power = (drag_force * speed) / (config.motor_efficiency * config.propeller_efficiency)
        
        # Zusätzliche Leistung für Steigflug
        climb_power = 0
        if climb_rate > 0:
            climb_power = (config.mass * self.GRAVITY * climb_rate) / config.motor_efficiency
        
        # Windeinfluss (vereinfacht)
        wind_power = 0
        if wind_data:
            # Gegenwind erhöht den Leistungsbedarf, Rückenwind verringert ihn
            headwind_component = wind_data.wind_vector_x * math.cos(0) + wind_data.wind_vector_y * math.sin(0)  # Vereinfacht
            wind_factor = 1.0 + (headwind_component / speed) * 0.3 if speed > 0 else 1.0
            wind_power = horizontal_power * (wind_factor - 1.0)
        
        total_power = horizontal_power + climb_power + wind_power
        return min(max(total_power, horizontal_power * 0.5), config.max_power)
    
    def estimate_hover_power(self, config: VehicleConfig, air_density: float, hover_motors_count: int = None) -> float:
        """Schätzt die Schwebelleistung basierend auf der Rotorentheorie"""
        if config.hover_power:
            return config.hover_power
        
        # Momentum Theory für Hovering
        thrust = config.mass * self.GRAVITY
        
        # Verwende hover_motors_count falls angegeben, sonst berechne dynamisch
        if hover_motors_count is None:
            hover_motors_count = self._calculate_hover_motors_count(config)
        
        # Thrust pro Motor
        thrust_per_motor = thrust / hover_motors_count
        
        rotor_area = math.pi * (config.rotor_diameter / 2)**2
        
        # Ideale Schwebelleistung pro Motor (Momentum Theory)
        ideal_power_per_motor = thrust_per_motor * math.sqrt(thrust_per_motor / (2 * air_density * rotor_area))
        
        # Figure of Merit (FM) berücksichtigen - typisch 0.6-0.8 für gute Rotoren
        figure_of_merit = 0.7
        actual_power_per_motor = ideal_power_per_motor / figure_of_merit
        
        # Gesamte Schwebelleistung
        total_hover_power = actual_power_per_motor * hover_motors_count
        
        return total_hover_power
    
    def calculate_energy_consumption(self, config: VehicleConfig, waypoints: List[Waypoint], 
                                   wind_data: List[WindData] = None) -> SimulationResult:
        """Hauptmethode zur Berechnung des Energieverbrauchs für eine komplette Mission"""
        if len(waypoints) < 2:
            raise ValueError("Mindestens 2 Waypoints erforderlich")
        
        segments = []
        total_energy = 0.0
        total_time = 0.0
        total_distance = 0.0
        
        for i in range(len(waypoints) - 1):
            wp1 = waypoints[i]
            wp2 = waypoints[i + 1]
            
            # Segment-spezifische Daten
            distance = self.calculate_distance(wp1, wp2)
            avg_altitude = (wp1.altitude + wp2.altitude) / 2
            air_density = self.calculate_air_density(avg_altitude)
            
            # Geschwindigkeit und Steigrate
            speed = config.cruise_speed if distance > 100 else config.cruise_speed * 0.7  # Reduzierte Geschwindigkeit für kurze Segmente
            climb_rate = (wp2.altitude - wp1.altitude) / (distance / speed) if distance > 0 else 0
            
            # Wind-Daten für dieses Segment
            current_wind = wind_data[min(i, len(wind_data) - 1)] if wind_data else None
            
            # Leistungsberechnung je nach Fahrzeugtyp
            if config.vehicle_type == VehicleType.MULTIROTOR:
                power = self.calculate_multirotor_power(config, speed, climb_rate, air_density, current_wind)
            elif config.vehicle_type == VehicleType.VTOL:
                power = self.calculate_vtol_power(config, speed, climb_rate, air_density, current_wind)
            elif config.vehicle_type == VehicleType.PLANE:
                power = self.calculate_plane_power(config, speed, climb_rate, air_density, current_wind)
            else:
                raise ValueError(f"Unbekannter Fahrzeugtyp: {config.vehicle_type}")
            
            # Zeit und Energieberechnung
            flight_time = distance / speed if speed > 0 else 0
            energy = (power * flight_time) / 3600  # Wh (Watt * Stunden)
            
            # Segment erstellen
            segment = FlightSegment(
                segment_id=i,
                start_waypoint=waypoints[i],
                end_waypoint=waypoints[i + 1],
                distance_m=distance,
                duration_s=flight_time,
                energy_wh=energy,
                average_speed_ms=speed,
                average_power_w=power,
                wind_influence={
                    "speed_ms": current_wind.wind_speed_ms if current_wind else 0,
                    "direction_deg": current_wind.wind_direction_deg if current_wind else 0,
                    "headwind_ms": current_wind.wind_vector_x if current_wind else 0,
                    "crosswind_ms": current_wind.wind_vector_y if current_wind else 0,
                    "influence_factor": 1.0
                }
            )
            segments.append(segment)
            
            # Akkumulieren
            total_energy += energy
            total_time += flight_time
            total_distance += distance
        
        # Batteriekapazität prüfen
        battery_capacity_wh = (config.battery_capacity * config.battery_voltage) / 1000  # mAh * V / 1000 = Wh
        battery_usage_percent = (total_energy / battery_capacity_wh) * 100
        
        return SimulationResult(
            total_energy_wh=total_energy,
            total_distance_m=total_distance,
            total_time_s=total_time,
            battery_usage_percent=battery_usage_percent,
            flight_segments=segments,
            vehicle_type=config.vehicle_type,
            summary={
                "battery_capacity_wh": battery_capacity_wh,
                "remaining_energy_wh": battery_capacity_wh - total_energy,
                "remaining_battery_percent": 100 - battery_usage_percent,
                "is_feasible": total_energy < battery_capacity_wh,
                "flight_time_minutes": total_time / 60,  # Sekunden zu Minuten
                "energy_per_km": total_energy / (total_distance / 1000) if total_distance > 0 else 0,
                "average_speed_ms": total_distance / total_time if total_time > 0 else 0,
                "max_range_estimate_km": (battery_capacity_wh / total_energy * (total_distance / 1000)) if total_energy > 0 else 0
            }
        )
