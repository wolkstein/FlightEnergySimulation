#!/usr/bin/env python3
"""
Elevation Service - Minimal implementation for terrain height data
Copyright (C) 2025 wolkstein
"""

import math
from typing import List, Dict, Any
import json


class ElevationService:
    """Minimaler Elevation Service für Terrain-Höhendaten"""
    
    def __init__(self, opentopo_server: str = "192.168.71.250:5000", dataset: str = "eudem25m"):
        self.server = opentopo_server
        self.dataset = dataset
    
    def calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Haversine Distanz zwischen zwei Punkten in Metern"""
        R = 6371000  # Earth radius in meters
        
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)
        
        a = (math.sin(delta_lat/2) * math.sin(delta_lat/2) + 
             math.cos(lat1_rad) * math.cos(lat2_rad) * 
             math.sin(delta_lon/2) * math.sin(delta_lon/2))
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return R * c
    
    def interpolate_points(self, lat1: float, lon1: float, lat2: float, lon2: float, 
                          distance_m: float = 50.0) -> List[Dict[str, float]]:
        """Interpoliere Punkte zwischen zwei Koordinaten"""
        total_distance = self.calculate_distance(lat1, lon1, lat2, lon2)
        
        if total_distance < distance_m:
            return [
                {"lat": lat1, "lon": lon1, "distance_km": 0.0},
                {"lat": lat2, "lon": lon2, "distance_km": total_distance / 1000.0}
            ]
        
        num_points = int(total_distance / distance_m)
        points = []
        
        for i in range(num_points + 1):
            ratio = i / num_points if num_points > 0 else 0
            
            # Linear interpolation (einfach, aber funktional)
            lat = lat1 + (lat2 - lat1) * ratio
            lon = lon1 + (lon2 - lon1) * ratio
            distance_km = (total_distance * ratio) / 1000.0
            
            points.append({
                "lat": lat,
                "lon": lon, 
                "distance_km": distance_km
            })
        
        return points
    
    def get_mock_elevation(self, lat: float, lon: float) -> float:
        """Mock elevation data - später durch echte OpenTopo API ersetzen"""
        # Einfache Sinus-Funktion für realistische Höhensimulation
        # Basierend auf Koordinaten für vorhersagbare Ergebnisse
        elevation = 100 + 50 * math.sin(lat * 10) + 30 * math.cos(lon * 15)
        return max(0, elevation)  # Keine negativen Höhen
    
    async def generate_elevation_profile(self, waypoints: List[Dict[str, Any]], 
                                       interpolation_distance: float = 50.0) -> Dict[str, Any]:
        """Generiere Höhenprofil für eine Route"""
        
        if len(waypoints) < 2:
            raise ValueError("Mindestens 2 Waypoints erforderlich")
        
        profile_points = []
        cumulative_distance = 0.0
        
        # Für jedes Segment zwischen Waypoints
        for i in range(len(waypoints) - 1):
            wp1 = waypoints[i] 
            wp2 = waypoints[i + 1]
            
            # Punkte zwischen Waypoints interpolieren
            segment_points = self.interpolate_points(
                wp1['latitude'], wp1['longitude'],
                wp2['latitude'], wp2['longitude'],
                interpolation_distance
            )
            
            # Erste Punkt überspringen wenn nicht das erste Segment (Duplikat vermeiden)
            start_idx = 1 if i > 0 else 0
            
            for point in segment_points[start_idx:]:
                # Mock elevation data (später echte API)
                terrain_elevation = self.get_mock_elevation(point['lat'], point['lon'])
                
                # Waypoint altitude interpolieren
                segment_progress = point['distance_km'] / (self.calculate_distance(
                    wp1['latitude'], wp1['longitude'], 
                    wp2['latitude'], wp2['longitude']
                ) / 1000.0) if self.calculate_distance(
                    wp1['latitude'], wp1['longitude'], 
                    wp2['latitude'], wp2['longitude']
                ) > 0 else 0
                
                waypoint_altitude = wp1['altitude'] + (wp2['altitude'] - wp1['altitude']) * segment_progress
                
                profile_points.append({
                    "distance_km": cumulative_distance + point['distance_km'],
                    "lat": point['lat'],
                    "lon": point['lon'], 
                    "terrain_elevation": terrain_elevation,
                    "waypoint_altitude": waypoint_altitude,
                    "clearance": waypoint_altitude - terrain_elevation
                })
            
            # Cumulative distance für nächstes Segment
            if segment_points:
                cumulative_distance += segment_points[-1]['distance_km']
        
        # Kollisionsanalyse
        collisions = []
        safety_margin = 30.0  # Meter
        
        for point in profile_points:
            if point['clearance'] < safety_margin:
                collisions.append({
                    "distance_km": point['distance_km'],
                    "terrain_elevation": point['terrain_elevation'],
                    "waypoint_altitude": point['waypoint_altitude'], 
                    "clearance": point['clearance'],
                    "safety_margin": safety_margin
                })
        
        return {
            "profile": {
                "points": profile_points,
                "total_distance_km": cumulative_distance,
                "collision_count": len(collisions)
            },
            "collisions": collisions,
            "settings": {
                "interpolation_distance_m": interpolation_distance,
                "safety_margin_m": safety_margin,
                "server": self.server,
                "dataset": self.dataset
            }
        }


# Global instance
elevation_service = ElevationService()