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
        c = 2 * math.asin(math.sqrt(max(0, a)))  # Sicherstellung, dass a nicht negativ ist
        horizontal_distance = 6371000 * c  # Erdradius in Metern
        
        # 3D-Distanz mit Höhenunterschied
        vertical_distance = alt2 - alt1
        distance_3d = math.sqrt(horizontal_distance**2 + vertical_distance**2)
        
        return distance_3d
    
    def calculate_air_density(self, altitude: float) -> float:
        """Berechnet die Luftdichte in Abhängigkeit der Höhe"""
        # Sichere Eingabe
        altitude = max(0, float(altitude)) if altitude is not None else 0
        
        # Barometrische Höhenformel (vereinfacht)
        # Temperaturabnahme: 6.5°C pro 1000m
        temperature_sea_level = 288.15  # Kelvin (15°C)
        temperature = temperature_sea_level - 0.0065 * altitude
        
        # Sicherstellen, dass die Temperatur positiv bleibt (minimum 200K = -73°C)
        temperature = max(200.0, temperature)
        
        # Druckabnahme - jetzt sicher vor negativen Temperaturen
        pressure_ratio = max(0.01, (temperature / temperature_sea_level) ** 5.255)  # Minimum Luftdichte
        air_density = self.AIR_DENSITY * pressure_ratio
        
        return max(0.01, air_density)  # Minimum Luftdichte garantieren

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
        try:
            # Schwebelleistung mit dynamischer Hover-Motor-Berechnung
            hover_motors_count = self._calculate_hover_motors_count(config)
            hover_power = config.hover_power or self.estimate_hover_power(config, air_density, hover_motors_count)
            
            # Sicherheitsprüfungen
            speed = max(0, float(speed))
            air_density = max(0.1, float(air_density))
            climb_rate = float(climb_rate)
            
            # Zusätzliche Leistung für Horizontalflug
            drag_coefficient = max(0.001, float(config.drag_coefficient or 0.03))
            wing_area = max(0.01, float(config.wing_area or 0.5))  # Mindestfläche
            motor_efficiency = max(0.1, float(config.motor_efficiency or 0.85))
            propeller_efficiency = max(0.1, float(config.propeller_efficiency or 0.75))
            
            drag_force = 0.5 * air_density * drag_coefficient * wing_area * speed**2
            horizontal_power = drag_force * speed / (motor_efficiency * propeller_efficiency)
            
            # Zusätzliche Leistung für Steigflug
            climb_power = 0
            if climb_rate > 0:
                climb_power = (float(config.mass) * self.GRAVITY * climb_rate) / motor_efficiency
            
            # Windeinfluss
            wind_power = 0
            if wind_data:
                # Vereinfachte Windwiderstandsberechnung
                wind_x = float(wind_data.wind_vector_x) if wind_data.wind_vector_x is not None else 0
                wind_y = float(wind_data.wind_vector_y) if wind_data.wind_vector_y is not None else 0
                
                effective_speed_squared = (speed + wind_x)**2 + wind_y**2
                if effective_speed_squared >= 0:
                    effective_speed = math.sqrt(effective_speed_squared)
                    wind_drag = 0.5 * air_density * drag_coefficient * wing_area * abs(effective_speed - speed)**2
                    wind_power = abs(wind_drag * speed) / (motor_efficiency * propeller_efficiency)
            
            # Alle Leistungen zu reellen Zahlen konvertieren
            hover_power = float(abs(hover_power))
            horizontal_power = float(abs(horizontal_power))
            climb_power = float(abs(climb_power))
            wind_power = float(abs(wind_power))
            
            total_power = hover_power + horizontal_power + climb_power + wind_power
            max_power = float(config.max_power)
            
            return min(total_power, max_power)
            
        except Exception as e:
            print(f"ERROR in calculate_multirotor_power: {e}")
            # Fallback: Basis-Leistungsschätzung
            return float(config.mass) * 20.0  # ~20W pro kg als Fallback
    
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
            return float(config.hover_power)
        
        try:
            # Momentum Theory für Hovering
            thrust = float(config.mass) * self.GRAVITY
            
            # Verwende hover_motors_count falls angegeben, sonst berechne dynamisch
            if hover_motors_count is None:
                hover_motors_count = self._calculate_hover_motors_count(config)
            
            # Thrust pro Motor
            thrust_per_motor = thrust / max(1, hover_motors_count)
            
            # Sicherheitsprüfungen für Konfigurationswerte
            rotor_diameter = max(0.1, float(config.rotor_diameter or 0.3))  # Mindestens 10cm
            air_density = max(0.1, float(air_density))  # Minimum Luftdichte
            
            rotor_area = math.pi * (rotor_diameter / 2)**2
            
            # Ideale Schwebelleistung pro Motor (Momentum Theory)
            # Sicherheitsprüfung um negative Werte oder Division durch 0 zu vermeiden
            denominator = 2 * air_density * rotor_area
            if denominator <= 0:
                # Fallback-Berechnung
                return float(config.mass) * self.GRAVITY * 15.0  # ~15W pro kg als Fallback
                
            sqrt_arg = thrust_per_motor / denominator
            if sqrt_arg < 0:
                sqrt_arg = 0
                
            ideal_power_per_motor = thrust_per_motor * math.sqrt(sqrt_arg)
            
            # Figure of Merit (FM) berücksichtigen - typisch 0.6-0.8 für gute Rotoren
            figure_of_merit = 0.7
            actual_power_per_motor = ideal_power_per_motor / figure_of_merit
            
            # Gesamte Schwebelleistung
            total_hover_power = actual_power_per_motor * hover_motors_count
            
            # Sicherstellen dass das Ergebnis eine reelle Zahl ist
            result = float(abs(total_hover_power))
            return result
            
        except Exception as e:
            print(f"ERROR in estimate_hover_power: {e}")
            # Fallback-Berechnung: ~15W pro kg
            return float(config.mass) * 15.0
    
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
            
            # Wind-Daten für dieses Segment
            current_wind = wind_data[min(i, len(wind_data) - 1)] if wind_data else None
            
            # Unterschiedliche Berechnung je nach Fahrzeugtyp
            if config.vehicle_type == VehicleType.MULTIROTOR:
                # Neue copter-spezifische Interpolation
                interpolation_result = self.calculate_copter_interpolated_segments(
                    config, wp1, wp2, current_wind
                )
                
                # Hauptsegment mit Gesamtwerten erstellen
                segment = FlightSegment(
                    segment_id=i,
                    start_waypoint=waypoints[i],
                    end_waypoint=waypoints[i + 1],
                    distance_m=interpolation_result['total_distance'],
                    duration_s=interpolation_result['total_time'],
                    energy_wh=interpolation_result['total_energy'],
                    average_speed_ms=interpolation_result['total_distance'] / interpolation_result['total_time'] if interpolation_result['total_time'] > 0 else 0,
                    average_power_w=interpolation_result['total_energy'] * 3600 / interpolation_result['total_time'] if interpolation_result['total_time'] > 0 else 0,
                    wind_influence=self._calculate_wind_components_relative_to_flight(wp1, wp2, current_wind) if current_wind else {
                        "speed_ms": 0,
                        "direction_deg": 0,
                        "headwind_ms": 0,
                        "crosswind_ms": 0,
                        "influence_factor": 1.0
                    }
                )
                
                total_energy += interpolation_result['total_energy']
                total_time += interpolation_result['total_time'] 
                total_distance += interpolation_result['total_distance']
                segments.append(segment)
                
            else:
                # Traditionelle Berechnung für VTOL und Plane
                distance = self.calculate_distance(wp1, wp2)
                avg_altitude = (wp1.altitude + wp2.altitude) / 2
                air_density = self.calculate_air_density(avg_altitude)
                
                # Geschwindigkeit und Steigrate
                speed = config.cruise_speed if distance > 100 else config.cruise_speed * 0.7
                climb_rate = (wp2.altitude - wp1.altitude) / (distance / speed) if distance > 0 else 0
                
                # Leistungsberechnung je nach Fahrzeugtyp
                if config.vehicle_type == VehicleType.VTOL:
                    power = self.calculate_vtol_power(config, speed, climb_rate, air_density, current_wind)
                elif config.vehicle_type == VehicleType.PLANE:
                    power = self.calculate_plane_power(config, speed, climb_rate, air_density, current_wind)
                else:
                    raise ValueError(f"Unbekannter Fahrzeugtyp: {config.vehicle_type}")
                
                # Zeit und Energieberechnung
                flight_time = distance / speed if speed > 0 else 0
                energy = (power * flight_time) / 3600  # Wh
                
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
                    wind_influence=self._calculate_wind_components_relative_to_flight(wp1, wp2, current_wind) if current_wind else {
                        "speed_ms": 0,
                        "direction_deg": 0,
                        "headwind_ms": 0,
                        "crosswind_ms": 0,
                        "influence_factor": 1.0
                    }
                )
                
                total_energy += energy
                total_time += flight_time
                total_distance += distance
                segments.append(segment)
        
        # Batteriekapazität prüfen
        battery_capacity_wh = (config.battery_capacity * config.battery_voltage) / 1000  # mAh * V / 1000 = Wh
        battery_usage_percent = (total_energy / battery_capacity_wh) * 100
        
        return SimulationResult(
            total_energy_wh=total_energy,
            total_distance_m=total_distance,
            total_time_s=total_time,
            battery_usage_percent=battery_usage_percent,
            flight_segments=segments,
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
    
    def calculate_copter_interpolated_segments(self, config: VehicleConfig, start_wp: Waypoint, 
                                             end_wp: Waypoint, wind_data: WindData = None) -> Dict:
        """
        Vereinfachte Copter Interpolation mit linearer Flugbahn
        Geschwindigkeit wird durch langsamste Achse (horizontal/vertikal) begrenzt
        """
        try:
            print(f"DEBUG: Starting copter interpolation from ({start_wp.latitude}, {start_wp.longitude}, {start_wp.altitude}) to ({end_wp.latitude}, {end_wp.longitude}, {end_wp.altitude})")
            
            # Horizontale Distanz berechnen
            lat1, lon1 = math.radians(float(start_wp.latitude)), math.radians(float(start_wp.longitude))
            lat2, lon2 = math.radians(float(end_wp.latitude)), math.radians(float(end_wp.longitude))
            
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            
            a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
            a = max(0, float(a))  # Sicherheit gegen negative Werte
            c = 2 * math.asin(math.sqrt(a))
            horizontal_distance = 6371000 * c  # Erdradius in Metern
            
            print(f"DEBUG: Horizontal distance: {horizontal_distance}")
            
            # Vertikale Distanz
            vertical_distance = float(end_wp.altitude) - float(start_wp.altitude)
            total_3d_distance = math.sqrt(horizontal_distance**2 + vertical_distance**2)
            
            print(f"DEBUG: Vertical distance: {vertical_distance}, Total 3D distance: {total_3d_distance}")
            
            # Maximalgeschwindigkeiten ermitteln - alle zu float konvertieren
            max_horizontal_speed = min(float(config.cruise_speed), float(config.max_speed))
            
            # Für vertikale Geschwindigkeit: Steigen oder Sinken?
            if vertical_distance > 0:
                max_vertical_speed = float(config.max_climb_rate)  # Steigen
            else:
                max_vertical_speed = float(config.max_descent_speed)  # Sinken
            
            print(f"DEBUG: Max horizontal speed: {max_horizontal_speed}, Max vertical speed: {max_vertical_speed}")
            
            # Zeit berechnen, die für jede Achse benötigt wird
            time_horizontal = horizontal_distance / max_horizontal_speed if horizontal_distance > 0 and max_horizontal_speed > 0 else 0
            time_vertical = abs(vertical_distance) / max_vertical_speed if abs(vertical_distance) > 0 and max_vertical_speed > 0 else 0
            
            print(f"DEBUG: Time horizontal: {time_horizontal}, Time vertical: {time_vertical}")
            
            # Die langsamste Achse bestimmt die Gesamtzeit
            flight_time = max(float(time_horizontal), float(time_vertical))
            
            print(f"DEBUG: Flight time: {flight_time}")
            
            # Wenn keine Bewegung nötig ist
            if flight_time == 0:
                return {
                    'segments': [],
                    'total_time': 0,
                    'total_energy': 0,
                    'total_distance': 0
                }
            
            # Tatsächliche Geschwindigkeiten basierend auf der begrenzenden Achse
            actual_horizontal_speed = horizontal_distance / flight_time if flight_time > 0 else 0
            actual_vertical_speed = abs(vertical_distance) / flight_time if flight_time > 0 else 0
            
            # Steigrate berechnen (positiv für Steigen, negativ für Sinken)
            climb_rate = vertical_distance / flight_time if flight_time > 0 else 0
            
            print(f"DEBUG: Actual horizontal speed: {actual_horizontal_speed}, Climb rate: {climb_rate}")
            
            # Durchschnittliche Höhe für Luftdichte
            avg_altitude = (float(start_wp.altitude) + float(end_wp.altitude)) / 2
            air_density = self.calculate_air_density(avg_altitude)
            
            print(f"DEBUG: Average altitude: {avg_altitude}, Air density: {air_density}")
            
            # Leistungsberechnung für den gesamten Flug
            print(f"DEBUG: About to call calculate_multirotor_power with speed={actual_horizontal_speed}, climb_rate={climb_rate}, air_density={air_density}, wind_data={wind_data}")
            power = self.calculate_multirotor_power(config, actual_horizontal_speed, climb_rate, air_density, wind_data)
            print(f"DEBUG: Power calculated: {power}, type: {type(power)}")
            
            # Sicherheitscheck für power
            if isinstance(power, complex):
                print(f"ERROR: Power is complex number: {power}")
                power = float(abs(power))
                
            energy = (float(power) * float(flight_time)) / 3600  # Wh
            print(f"DEBUG: Energy calculated: {energy}")
            
            return {
                'segments': [{
                    'type': 'linear_flight',
                    'horizontal_speed': float(actual_horizontal_speed),
                    'vertical_speed': float(actual_vertical_speed),
                    'climb_rate': float(climb_rate),
                    'power': float(power),
                    'energy': float(energy),
                    'duration': float(flight_time),
                    'distance': float(total_3d_distance),
                    'limiting_axis': 'vertical' if time_vertical > time_horizontal else 'horizontal'
                }],
                'total_time': float(flight_time),
                'total_energy': float(energy),
                'total_distance': float(total_3d_distance)
            }
            
        except Exception as e:
            print(f"ERROR in calculate_copter_interpolated_segments: {e}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            # Fallback
            return {
                'segments': [],
                'total_time': 60.0,  # 1 minute fallback
                'total_energy': float(config.mass) * 20.0 / 60,  # Simple energy estimate
                'total_distance': 100.0  # 100m fallback
            }
    
    def _calculate_wind_components_relative_to_flight(self, start_wp: Waypoint, end_wp: Waypoint, wind_data: WindData) -> Dict[str, float]:
        """Berechnet Gegen- und Seitenwindkomponenten relativ zur Flugrichtung
        
        Args:
            start_wp: Start-Waypoint
            end_wp: Ziel-Waypoint  
            wind_data: Windvektor-Daten
            
        Returns:
            Dict mit wind_influence Komponenten
        """
        try:
            print(f"DEBUG: _calculate_wind_components_relative_to_flight called")
            print(f"DEBUG: Start WP: {start_wp.latitude}, {start_wp.longitude}")
            print(f"DEBUG: End WP: {end_wp.latitude}, {end_wp.longitude}")
            print(f"DEBUG: Wind data: speed={wind_data.wind_speed_ms}, dir={wind_data.wind_direction_deg}")
            print(f"DEBUG: Wind vectors: x={wind_data.wind_vector_x}, y={wind_data.wind_vector_y}")
            
            # Flugrichtung berechnen (Bearing von start zu end)
            lat1, lon1 = math.radians(start_wp.latitude), math.radians(start_wp.longitude)
            lat2, lon2 = math.radians(end_wp.latitude), math.radians(end_wp.longitude)
            
            dlon = lon2 - lon1
            
            # Flugrichtung in Grad (0° = Norden, 90° = Osten)
            flight_bearing_rad = math.atan2(
                math.sin(dlon) * math.cos(lat2),
                math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
            )
            
            flight_bearing_deg = (math.degrees(flight_bearing_rad) + 360) % 360
            print(f"DEBUG: Flight bearing: {flight_bearing_deg}°")
            
            # Windrichtung und -vektoren
            wind_speed = wind_data.wind_speed_ms
            wind_direction_deg = wind_data.wind_direction_deg
            wind_vector_x = wind_data.wind_vector_x  # Ost-West
            wind_vector_y = wind_data.wind_vector_y  # Nord-Süd
            
            # Windvektor relativ zur Flugrichtung projizieren
            # Flugrichtung als Einheitsvektor
            flight_direction_x = math.sin(math.radians(flight_bearing_deg))  # Ost-West Komponente der Flugrichtung
            flight_direction_y = math.cos(math.radians(flight_bearing_deg))  # Nord-Süd Komponente der Flugrichtung
            
            print(f"DEBUG: Flight direction vector: x={flight_direction_x}, y={flight_direction_y}")
            
            # Gegenwind: Windvektor projiziert auf Flugrichtung (negativ = Gegenwind)
            headwind_ms = -(wind_vector_x * flight_direction_x + wind_vector_y * flight_direction_y)
            
            # Seitenwind: Windvektor senkrecht zur Flugrichtung
            # Senkrechte Richtung: (-flight_direction_y, flight_direction_x) 
            crosswind_ms = wind_vector_x * (-flight_direction_y) + wind_vector_y * flight_direction_x
            
            print(f"DEBUG: Calculated headwind: {headwind_ms}, crosswind: {crosswind_ms}")
            
            return {
                "speed_ms": wind_speed,
                "direction_deg": wind_direction_deg,
                "headwind_ms": round(headwind_ms, 2),
                "crosswind_ms": round(crosswind_ms, 2),
                "influence_factor": 1.0,
                "flight_bearing_deg": round(flight_bearing_deg, 1)  # Debug info
            }
            
        except Exception as e:
            print(f"ERROR in _calculate_wind_components_relative_to_flight: {e}")
            # Fallback zu alten Werten
            return {
                "speed_ms": wind_data.wind_speed_ms,
                "direction_deg": wind_data.wind_direction_deg,
                "headwind_ms": 0,
                "crosswind_ms": 0,
                "influence_factor": 1.0
            }
