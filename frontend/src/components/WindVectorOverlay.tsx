import React, { useEffect, useState } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';

interface WindVector {
  latitude: number;
  longitude: number;
  altitude: number;
  wind_speed_ms: number;
  wind_direction_deg: number;
  wind_vector_x: number;
  wind_vector_y: number;
  wind_vector_z: number;
  timestamp: string;
}

interface WindVectorOverlayProps {
  windVectors: WindVector[];
  visible: boolean;
}

const WindVectorOverlay: React.FC<WindVectorOverlayProps> = ({ 
  windVectors, 
  visible 
}) => {
  const map = useMap();
  const [windLayer, setWindLayer] = useState<L.LayerGroup | null>(null);

  useEffect(() => {
    // Alte Layer entfernen
    if (windLayer) {
      map.removeLayer(windLayer);
    }

    if (!visible || windVectors.length === 0) {
      setWindLayer(null);
      return;
    }

    // Neue Layer-Gruppe für Windvektoren erstellen
    const newWindLayer = L.layerGroup();

    windVectors.forEach((wind, index) => {
      // Skalierungsfaktor für Vektordarstellung
      const scale = 0.001; // Anpassbar je nach Kartenauflösung
      const vectorLength = wind.wind_speed_ms * scale;

      // Endpunkt des Vektors berechnen
      const windRadians = (wind.wind_direction_deg * Math.PI) / 180;
      const endLat = wind.latitude + vectorLength * Math.cos(windRadians);
      const endLng = wind.longitude + vectorLength * Math.sin(windRadians);

      // Farbe basierend auf Windgeschwindigkeit
      const getWindColor = (speed: number): string => {
        if (speed < 3) return '#4CAF50'; // Grün - schwacher Wind
        if (speed < 7) return '#FFC107'; // Gelb - mäßiger Wind  
        if (speed < 12) return '#FF9800'; // Orange - starker Wind
        return '#F44336'; // Rot - sehr starker Wind
      };

      const color = getWindColor(wind.wind_speed_ms);
      
      // Windvektor als Pfeil zeichnen
      const windArrow = L.polyline(
        [[wind.latitude, wind.longitude], [endLat, endLng]],
        {
          color: color,
          weight: 3,
          opacity: 0.8,
        }
      );

      // Pfeilspitze hinzufügen
      const arrowHead = L.circle([endLat, endLng], {
        color: color,
        fillColor: color,
        fillOpacity: 0.8,
        radius: 50, // Meter
        weight: 2,
      });

      // Popup mit Windinformationen
      const windInfo = L.popup().setContent(`
        <div>
          <h4>Wind Information</h4>
          <p><strong>Geschwindigkeit:</strong> ${wind.wind_speed_ms.toFixed(1)} m/s</p>
          <p><strong>Richtung:</strong> ${wind.wind_direction_deg.toFixed(0)}°</p>
          <p><strong>Position:</strong> ${wind.latitude.toFixed(4)}, ${wind.longitude.toFixed(4)}</p>
          <p><strong>Höhe:</strong> ${wind.altitude.toFixed(0)}m</p>
          <p><strong>Zeit:</strong> ${new Date(wind.timestamp).toLocaleString()}</p>
        </div>
      `);

      windArrow.bindPopup(windInfo);
      arrowHead.bindPopup(windInfo);

      // Zur Layer-Gruppe hinzufügen
      newWindLayer.addLayer(windArrow);
      newWindLayer.addLayer(arrowHead);
    });

    // Zur Karte hinzufügen
    newWindLayer.addTo(map);
    setWindLayer(newWindLayer);

    return () => {
      if (newWindLayer) {
        map.removeLayer(newWindLayer);
      }
    };
  }, [map, windVectors, visible]);

  return null; // Diese Komponente rendert nichts direkt
};

export default WindVectorOverlay;
