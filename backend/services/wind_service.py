import httpx
import math
from typing import Dict, Any, Optional, List
from models.waypoint import WindData
from datetime import datetime, timezone, timedelta
import os
import asyncio

class WindService:
    def __init__(self):
        self.api_key = os.getenv("WINDFINDER_API_KEY")
        self.base_url = "https://api.windfinder.com/v2"
        self.fallback_enabled = True
        
    async def get_wind_data(self, latitude: float, longitude: float, altitude: float, 
                          forecast_time: Optional[datetime] = None) -> WindData:
        """Winddaten von Windfinder API abrufen oder Fallback verwenden
        
        Args:
            latitude: Breitengrad
            longitude: Längengrad  
            altitude: Höhe in Metern
            forecast_time: Zeitpunkt für Vorhersage (UTC), None = aktuell
        """
        
        if not self.api_key or self.api_key == "your_windfinder_api_key_here":
            return self._generate_fallback_wind_data(latitude, longitude, altitude, forecast_time)
        
        try:
            async with httpx.AsyncClient() as client:
                params = {
                    "key": self.api_key,
                    "lat": latitude,
                    "lon": longitude,
                    "format": "json"
                }
                
                # Zeitparameter hinzufügen wenn spezifiziert
                if forecast_time:
                    params["time"] = forecast_time.strftime("%Y-%m-%d %H:%M:%S")
                
                response = await client.get(
                    f"{self.base_url}/forecast",
                    params=params,
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return self._parse_windfinder_response(data, latitude, longitude, altitude)
                else:
                    print(f"Windfinder API Error: {response.status_code}")
                    return self._generate_fallback_wind_data(latitude, longitude, altitude, forecast_time)
                    
        except Exception as e:
            print(f"Fehler beim Abrufen der Winddaten: {e}")
            return self._generate_fallback_wind_data(latitude, longitude, altitude, forecast_time)
    
    def _parse_windfinder_response(self, data: Dict[Any, Any], lat: float, lon: float, alt: float) -> WindData:
        """Parst die Antwort der Windfinder API"""
        try:
            # Beispiel-Parsing (echte API-Struktur kann abweichen)
            wind_speed_ms = data.get("wind", {}).get("speed", 5.0)
            wind_direction_deg = data.get("wind", {}).get("direction", 180.0)
            
            # Windvektor berechnen
            wind_rad = math.radians(wind_direction_deg)
            wind_vector_x = wind_speed_ms * math.sin(wind_rad)  # Ost-West
            wind_vector_y = wind_speed_ms * math.cos(wind_rad)  # Nord-Süd
            wind_vector_z = 0.0  # Vertikaler Wind (meist gering)
            
            return WindData(
                latitude=lat,
                longitude=lon,
                altitude=alt,
                wind_speed_ms=wind_speed_ms,
                wind_direction_deg=wind_direction_deg,
                wind_vector_x=wind_vector_x,
                wind_vector_y=wind_vector_y,
                wind_vector_z=wind_vector_z,
                timestamp=data.get("timestamp")
            )
        except Exception as e:
            print(f"Fehler beim Parsen der Winddaten: {e}")
            return self._generate_fallback_wind_data(lat, lon, alt)
    
    def _generate_fallback_wind_data(self, latitude: float, longitude: float, altitude: float, 
                                   forecast_time: Optional[datetime] = None) -> WindData:
        """Generiert realistische Fallback-Winddaten basierend auf Position, Höhe und Zeit"""
        
        # Zeit verwenden - entweder forecast_time oder aktuelle Zeit
        target_time = forecast_time if forecast_time else datetime.now(timezone.utc)
        
        # Basis-Windgeschwindigkeit abhängig von der Höhe
        base_wind_speed = min(3.0 + (altitude / 100.0) * 2.0, 15.0)  # Steigt mit der Höhe
        
        # Regionale Variation basierend auf Breitengrad
        lat_factor = abs(latitude) / 90.0
        regional_wind = base_wind_speed * (0.7 + lat_factor * 0.6)
        
        # Saisonale/zeitliche Variation 
        hour = target_time.hour
        day_of_year = target_time.timetuple().tm_yday
        
        # Tageszyklusfaktor
        daily_factor = 0.8 + 0.4 * math.sin((hour - 6) * math.pi / 12)  # Stärker am Tag
        
        # Saisonaler Faktor (stärkere Winde im Winter)
        seasonal_factor = 1.0 + 0.3 * math.cos((day_of_year - 80) * 2 * math.pi / 365)
        
        wind_speed_ms = regional_wind * daily_factor * seasonal_factor
        
        # Windrichtung basierend auf geografischer Lage und Jahreszeit
        if latitude > 30:  # Nördliche Breiten - oft Westwind
            base_direction = 270  # West
        elif latitude < -30:  # Südliche Breiten - oft Ostwind  
            base_direction = 90   # Ost
        else:  # Äquatoriale Regionen - Trade Winds
            base_direction = 60 if longitude > 0 else 120
        
        # Saisonale Windrichtungsverschiebung
        seasonal_shift = 30 * math.sin((day_of_year - 80) * 2 * math.pi / 365)
        
        # Deterministische aber realistische Variation
        import random
        random.seed(int(latitude * 1000 + longitude * 1000 + target_time.timestamp() // 3600))
        wind_direction_deg = (base_direction + seasonal_shift + random.randint(-45, 45)) % 360
        
        # Windvektor berechnen
        wind_rad = math.radians(wind_direction_deg)
        wind_vector_x = wind_speed_ms * math.sin(wind_rad)
        wind_vector_y = wind_speed_ms * math.cos(wind_rad)
        
        # Vertikaler Wind (thermische Effekte abhängig von Tageszeit)
        thermal_factor = max(0, math.sin((hour - 6) * math.pi / 12)) if 6 <= hour <= 18 else 0
        wind_vector_z = thermal_factor * random.uniform(-0.5, 1.5)
        
        return WindData(
            latitude=latitude,
            longitude=longitude,
            altitude=altitude,
            wind_speed_ms=round(wind_speed_ms, 2),
            wind_direction_deg=wind_direction_deg,
            wind_vector_x=round(wind_vector_x, 2),
            wind_vector_y=round(wind_vector_y, 2),
            wind_vector_z=round(wind_vector_z, 2),
            timestamp=target_time.isoformat()
        )
    
    async def get_wind_forecast(self, latitude: float, longitude: float, 
                               altitude: float, hours_ahead: int = 1) -> WindData:
        """Windvorhersage für zukünftige Zeiten"""
        forecast_time = datetime.now(timezone.utc) + timedelta(hours=hours_ahead)
        return await self.get_wind_data(latitude, longitude, altitude, forecast_time)
    
    async def get_wind_vectors_for_route(self, waypoints: List[Dict[str, float]], 
                                        mission_start_time: Optional[datetime] = None,
                                        flight_duration_estimate: float = 1.0) -> List[WindData]:
        """Windvektoren für eine gesamte Route abrufen
        
        Args:
            waypoints: Liste von Wegpunkten mit lat, lon, alt
            mission_start_time: Geplante Startzeit (UTC), None = jetzt
            flight_duration_estimate: Geschätzte Flugdauer in Stunden
            
        Returns:
            Liste von WindData für jeden Wegpunkt
        """
        wind_vectors = []
        start_time = mission_start_time if mission_start_time else datetime.now(timezone.utc)
        
        # Zeitpunkte für jeden Wegpunkt berechnen
        time_per_waypoint = flight_duration_estimate / len(waypoints) if waypoints else 0
        
        for i, wp in enumerate(waypoints):
            # Zeitpunkt für diesen Wegpunkt
            waypoint_time = start_time + timedelta(hours=i * time_per_waypoint)
            
            # Winddaten für diesen Punkt und Zeitpunkt abrufen
            wind_data = await self.get_wind_data(
                latitude=wp['lat'], 
                longitude=wp['lon'], 
                altitude=wp['alt'],
                forecast_time=waypoint_time
            )
            
            wind_vectors.append(wind_data)
            
        return wind_vectors
    
    def create_manual_wind_data(self, latitude: float, longitude: float, altitude: float,
                               wind_speed_ms: float, wind_direction_deg: float) -> WindData:
        """Erstellt manuelle WindData für Feldtests
        
        Args:
            latitude: Breitengrad
            longitude: Längengrad  
            altitude: Höhe in Metern
            wind_speed_ms: Manuelle Windgeschwindigkeit in m/s
            wind_direction_deg: Manuelle Windrichtung in Grad (0-359)
            
        Returns:
            WindData mit manuellen Windwerten
        """
        # Windvektor aus Geschwindigkeit und Richtung berechnen
        wind_rad = math.radians(wind_direction_deg)
        wind_vector_x = wind_speed_ms * math.sin(wind_rad)  # Ost-West Komponente
        wind_vector_y = wind_speed_ms * math.cos(wind_rad)  # Nord-Süd Komponente
        wind_vector_z = 0.0  # Vertikalwind meist vernachlässigbar für Feldtests
        
        return WindData(
            latitude=latitude,
            longitude=longitude,
            altitude=altitude,
            wind_speed_ms=round(wind_speed_ms, 2),
            wind_direction_deg=wind_direction_deg,
            wind_vector_x=round(wind_vector_x, 2),
            wind_vector_y=round(wind_vector_y, 2),
            wind_vector_z=wind_vector_z,
            timestamp=datetime.now(timezone.utc).isoformat()
        )
    
    async def get_wind_vectors_for_route_with_manual_override(self, waypoints: List[Dict[str, float]],
                                                            manual_wind_speed_ms: float,
                                                            manual_wind_direction_deg: float) -> List[WindData]:
        """Windvektoren für eine Route mit manueller Wind-Override
        
        Args:
            waypoints: Liste von Wegpunkten mit lat, lon, alt
            manual_wind_speed_ms: Manuelle Windgeschwindigkeit
            manual_wind_direction_deg: Manuelle Windrichtung
            
        Returns:
            Liste von WindData mit manuellen Windwerten für alle Wegpunkte
        """
        wind_vectors = []
        
        for wp in waypoints:
            wind_data = self.create_manual_wind_data(
                latitude=wp['lat'],
                longitude=wp['lon'],
                altitude=wp['alt'],
                wind_speed_ms=manual_wind_speed_ms,
                wind_direction_deg=manual_wind_direction_deg
            )
            wind_vectors.append(wind_data)
            
        return wind_vectors
