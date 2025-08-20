import React from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface WindVector {
  latitude: number;
  longitude: number;
  wind_speed_ms: number;
  wind_direction_deg: number;
  timestamp?: string;
}

interface SimpleWindVectorProps {
  windVectors: WindVector[];
  visible: boolean;
}

export const SimpleWindVector: React.FC<SimpleWindVectorProps> = ({ 
  windVectors, 
  visible 
}) => {
  const map = useMap();
  const layerRef = React.useRef<L.LayerGroup | null>(null);

  React.useEffect(() => {
    if (!map) {
      console.log('No map available');
      return;
    }

    console.log('SimpleWindVector effect:', { 
      visible, 
      windVectorsLength: windVectors.length,
      windVectors: windVectors.slice(0, 2) // Show first 2 vectors
    });

    // Cleanup existing layer
    if (layerRef.current) {
      console.log('Removing existing wind layer');
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    if (!visible || !windVectors.length) {
      console.log('Not showing vectors - visible:', visible, 'length:', windVectors.length);
      return;
    }

    console.log('Creating wind vector layer with', windVectors.length, 'vectors');
    const layer = L.layerGroup();

    windVectors.forEach((wind, index) => {
      console.log(`Processing wind vector ${index + 1}:`, wind);
      
      const speedKmh = wind.wind_speed_ms * 3.6; // Convert m/s to km/h
      const arrowLength = Math.max(speedKmh * 0.0005, 0.001); // Kleinere Windvektoren
      
      // Convert wind direction to arrow direction (wind comes FROM direction)
      const arrowDirection = (wind.wind_direction_deg + 180) % 360;
      const radians = (90 - arrowDirection) * (Math.PI / 180);

      const endLat = wind.latitude + (arrowLength * Math.sin(radians));
      const endLng = wind.longitude + (arrowLength * Math.cos(radians));

      // Color based on wind speed
      const color = speedKmh < 10 ? '#4CAF50' : 
                    speedKmh < 20 ? '#FFC107' : 
                    speedKmh < 30 ? '#FF5722' : '#B71C1C';

      console.log(`Wind ${index + 1}: ${speedKmh.toFixed(1)} km/h, color: ${color}, arrow length: ${arrowLength}`);

      // Wind vector line (dünner)
      const line = L.polyline([
        [wind.latitude, wind.longitude], 
        [endLat, endLng]
      ], { 
        color, 
        weight: 3,
        opacity: 1.0
      });

      // Arrow head (kleiner)
      const arrowHead = L.circleMarker([endLat, endLng], {
        color,
        fillColor: color,
        radius: 4,
        fillOpacity: 1.0,
        weight: 2
      });

      // Base point marker (kleiner)
      const basePoint = L.circleMarker([wind.latitude, wind.longitude], {
        color: '#333',
        fillColor: color,
        radius: 2,
        fillOpacity: 0.8,
        weight: 1
      });

      // Popup with wind data
      const popup = `
        <strong>Wind Vector ${index + 1}</strong><br>
        Geschwindigkeit: ${speedKmh.toFixed(1)} km/h<br>
        Richtung: ${wind.wind_direction_deg.toFixed(0)}°<br>
        Position: ${wind.latitude.toFixed(4)}, ${wind.longitude.toFixed(4)}<br>
        ${wind.timestamp ? `Zeit: ${new Date(wind.timestamp).toLocaleTimeString()}` : ''}
      `;

      line.bindPopup(popup);
      arrowHead.bindPopup(popup);
      basePoint.bindPopup(popup);

      layer.addLayer(line);
      layer.addLayer(arrowHead);
      layer.addLayer(basePoint);
    });

    console.log('Adding wind layer to map with', layer.getLayers().length, 'elements');
    map.addLayer(layer);
    layerRef.current = layer;

    // Force map update
    setTimeout(() => {
      if (map && map.getContainer()) {
        try {
          map.invalidateSize();
          console.log('Map invalidated for wind vectors');
        } catch (error) {
          console.log('Map invalidation failed:', error);
        }
      }
    }, 100);

    return () => {
      if (layerRef.current && map.hasLayer(layerRef.current)) {
        console.log('Cleaning up wind layer');
        map.removeLayer(layerRef.current);
      }
    };
  }, [map, windVectors, visible]);

  return null;
};
