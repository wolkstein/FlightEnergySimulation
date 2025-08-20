import math
from typing import List, Dict, Any
from models.vehicles import VehicleType, VehicleConfig
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
        # Barometrische Formel (vereinfacht)
        return self.AIR_DENSITY * math.exp(-altitude / 8400)
    
    def calculate_quadcopter_power(self, config: VehicleConfig, speed: float, 
                                 climb_rate: float, air_density: float, wind_data: WindData = None) -> float:
        """Berechnet die benötigte Leistung für einen Quadcopter"""
        # Schwebelleistung (Hover Power)
        hover_power = config.hover_power or self.estimate_hover_power(config, air_density)
        
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
        """Berechnet die benötigte Leistung für ein VTOL"""
        # Unterscheidung zwischen Hover- und Cruise-Modus
        if speed < 5.0:  # Hover-Modus
            return self.calculate_quadcopter_power(config, speed, climb_rate, air_density, wind_data)
        else:  # Cruise-Modus
            cruise_power = config.cruise_power or (config.max_power * 0.4)
            
            # Zusätzliche Leistung für Steigflug
            climb_power = 0
            if climb_rate > 0:
                climb_power = (config.mass * self.GRAVITY * climb_rate) / config.motor_efficiency
            
            # Windeinfluss
            wind_power = 0
            if wind_data:
                effective_speed = math.sqrt((speed + wind_data.wind_vector_x)**2 + wind_data.wind_vector_y**2)
                wind_factor = effective_speed / speed if speed > 0 else 1.0
                wind_power = cruise_power * (wind_factor - 1.0) * 0.5
            
            total_power = cruise_power + climb_power + wind_power
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
    
    def estimate_hover_power(self, config: VehicleConfig, air_density: float) -> float:
        """Schätzt die Schwebelleistung basierend auf der Rotorentheorie"""
        if config.hover_power:
            return config.hover_power
        
        # Momentum Theory für Hovering
        thrust = config.mass * self.GRAVITY
        rotor_area = math.pi * (config.rotor_diameter / 2)**2
        rotor_count = config.rotor_count or 4
        
        # Ideale Schwebelleistung pro Rotor
        thrust_per_rotor = thrust / rotor_count
        ideal_power_per_rotor = thrust_per_rotor * math.sqrt(thrust_per_rotor / (2 * air_density * rotor_area))
        
        # Berücksichtigung von Effizienzverlusten
        total_ideal_power = ideal_power_per_rotor * rotor_count
        realistic_power = total_ideal_power / (config.motor_efficiency * config.propeller_efficiency)
        
        return realistic_power
    
    def calculate_energy(self, vehicle_type: VehicleType, vehicle_config: VehicleConfig,
                        waypoints: List[Waypoint], wind_data: List[WindData]) -> SimulationResult:
        """Hauptmethode zur Energieberechnung"""
        
        if len(waypoints) < 2:
            raise ValueError("Mindestens 2 Waypoints erforderlich")
        
        flight_segments = []
        total_energy = 0.0
        total_distance = 0.0
        total_time = 0.0
        
        for i in range(len(waypoints) - 1):
            wp_start = waypoints[i]
            wp_end = waypoints[i + 1]
            wind = wind_data[i] if i < len(wind_data) else None
            
            # Segmentdistanz berechnen
            distance = self.calculate_distance(wp_start, wp_end)
            
            # Durchschnittsgeschwindigkeit bestimmen
            target_speed = wp_end.speed or vehicle_config.max_speed * 0.7
            target_speed = min(target_speed, vehicle_config.max_speed)
            
            # Steigrate berechnen
            altitude_diff = wp_end.altitude - wp_start.altitude
            horizontal_distance = self.calculate_distance(
                Waypoint(latitude=wp_start.latitude, longitude=wp_start.longitude, altitude=wp_start.altitude),
                Waypoint(latitude=wp_end.latitude, longitude=wp_end.longitude, altitude=wp_start.altitude)
            )
            climb_rate = 0
            if horizontal_distance > 0:
                flight_time = distance / target_speed
                climb_rate = altitude_diff / flight_time if flight_time > 0 else 0
                climb_rate = max(min(climb_rate, vehicle_config.max_climb_rate), -vehicle_config.max_climb_rate)
            
            # Luftdichte für durchschnittliche Höhe
            avg_altitude = (wp_start.altitude + wp_end.altitude) / 2
            air_density = self.calculate_air_density(avg_altitude)
            
            # Leistung berechnen je nach Fahrzeugtyp
            if vehicle_type == VehicleType.QUADCOPTER:
                power = self.calculate_quadcopter_power(vehicle_config, target_speed, climb_rate, air_density, wind)
            elif vehicle_type == VehicleType.VTOL:
                power = self.calculate_vtol_power(vehicle_config, target_speed, climb_rate, air_density, wind)
            elif vehicle_type == VehicleType.PLANE:
                power = self.calculate_plane_power(vehicle_config, target_speed, climb_rate, air_density, wind)
            else:
                raise ValueError(f"Unbekannter Fahrzeugtyp: {vehicle_type}")
            
            # Flugzeit und Energie für das Segment
            segment_time = distance / target_speed if target_speed > 0 else 0
            segment_energy = (power * segment_time) / 3600  # Wh
            
            # Hover-Zeit hinzufügen
            if wp_end.hover_time and wp_end.hover_time > 0:
                hover_power = self.estimate_hover_power(vehicle_config, air_density)
                hover_energy = (hover_power * wp_end.hover_time) / 3600
                segment_energy += hover_energy
                segment_time += wp_end.hover_time
            
            # Wind-Einfluss für Reporting
            wind_influence = {
                "headwind_ms": wind.wind_vector_x if wind else 0,
                "crosswind_ms": wind.wind_vector_y if wind else 0,
                "updraft_ms": wind.wind_vector_z if wind else 0,
                "total_wind_speed": wind.wind_speed_ms if wind else 0
            }
            
            # Segment erstellen
            segment = FlightSegment(
                segment_id=i + 1,
                start_waypoint=wp_start,
                end_waypoint=wp_end,
                distance_m=distance,
                duration_s=segment_time,
                energy_wh=segment_energy,
                average_speed_ms=target_speed,
                average_power_w=power,
                wind_influence=wind_influence
            )
            
            flight_segments.append(segment)
            total_energy += segment_energy
            total_distance += distance
            total_time += segment_time
        
        # Batteriekapazität berechnen
        battery_capacity_wh = (vehicle_config.battery_capacity / 1000) * vehicle_config.battery_voltage
        battery_usage_percent = (total_energy / battery_capacity_wh) * 100
        
        # Zusammenfassung erstellen
        summary = {
            "average_speed_ms": total_distance / total_time if total_time > 0 else 0,
            "average_power_w": (total_energy * 3600) / total_time if total_time > 0 else 0,
            "energy_per_km": (total_energy / (total_distance / 1000)) if total_distance > 0 else 0,
            "flight_time_minutes": total_time / 60,
            "remaining_battery_percent": max(0, 100 - battery_usage_percent),
            "max_range_estimate_km": (battery_capacity_wh / (total_energy / (total_distance / 1000))) if total_energy > 0 and total_distance > 0 else 0
        }
        
        return SimulationResult(
            total_energy_wh=round(total_energy, 2),
            total_distance_m=round(total_distance, 2),
            total_time_s=round(total_time, 2),
            battery_usage_percent=round(battery_usage_percent, 2),
            flight_segments=flight_segments,
            vehicle_type=vehicle_type,
            summary=summary
        )
