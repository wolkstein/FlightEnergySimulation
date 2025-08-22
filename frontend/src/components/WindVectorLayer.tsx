import React, { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface WindVector {
  latitude: number;
  longitude: number;
  wind_speed_ms: number;
  wind_direction_deg: number;
  timestamp?: string;
}

export const WindVectorLayer: React.FC<{
  waypoints: Array<{latitude: number, longitude: number, altitude?: number}>;
  visible: boolean;
}> = ({ waypoints, visible }) => {
  const map = useMap();
  const [windVectors, setWindVectors] = useState<WindVector[]>([]);
  const [layer, setLayer] = useState<L.LayerGroup | null>(null);

  // Load wind data
  useEffect(() => {
    if (!visible || !waypoints.length) {
      setWindVectors([]);
      return;
    }

    const loadWindData = async () => {
      try {
        const response = await fetch('/api/wind/route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            waypoints: waypoints.map(wp => ({
              latitude: wp.latitude,
              longitude: wp.longitude,
              altitude: wp.altitude || 100
            })),
            mission_start_time: null,
            flight_duration: 1.0
          })
        });

        if (response.ok) {
          const data = await response.json();
          setWindVectors(data.wind_vectors || []);
        }
      } catch (error) {
        console.error('Wind data load error:', error);
      }
    };

    loadWindData();
  }, [waypoints, visible]);

  // Render wind vectors
  useEffect(() => {
    // Cleanup existing layer
    if (layer) {
      map.removeLayer(layer);
      setLayer(null);
    }

    if (!visible || !windVectors.length) return;

    const newLayer = L.layerGroup();

    windVectors.forEach((wind) => {
      const speedKmh = wind.wind_speed_ms * 3.6;
      const arrowLength = Math.min(speedKmh * 0.0008, 0.015);
      
      // Arrow points IN direction of wind (opposite of wind direction)
      const arrowDirection = (wind.wind_direction_deg + 180) % 360;
      const radians = (90 - arrowDirection) * (Math.PI / 180);

      const endLat = wind.latitude + (arrowLength * Math.sin(radians));
      const endLng = wind.longitude + (arrowLength * Math.cos(radians));

      // Color coding
      const color = speedKmh < 10 ? '#4CAF50' : 
                    speedKmh < 20 ? '#FFC107' : 
                    speedKmh < 30 ? '#FF5722' : '#B71C1C';

      // Wind vector line
      const line = L.polyline([
        [wind.latitude, wind.longitude],
        [endLat, endLng]
      ], {
        color,
        weight: 3,
        opacity: 0.9
      });

      // Arrow head
      const arrow = L.circleMarker([endLat, endLng], {
        color,
        fillColor: color,
        radius: 4,
        fillOpacity: 1,
        weight: 2
      });

      const popup = `
        <b>Windvektor</b><br>
        Geschwindigkeit: ${speedKmh.toFixed(1)} km/h<br>
        Richtung: ${wind.wind_direction_deg.toFixed(0)}°<br>
        Position: ${wind.latitude.toFixed(4)}, ${wind.longitude.toFixed(4)}
      `;

      line.bindPopup(popup);
      arrow.bindPopup(popup);

      newLayer.addLayer(line);
      newLayer.addLayer(arrow);
    });

    map.addLayer(newLayer);
    setLayer(newLayer);
  }, [map, windVectors, visible, layer]);

  return null;
};
