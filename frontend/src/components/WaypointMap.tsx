import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Waypoint } from '../types/simulation';
import { SimpleWindVector } from './SimpleWindVector';
import 'leaflet/dist/leaflet.css';

// WindVector Backend-Format
interface WindVector {
  latitude: number;
  longitude: number;
  wind_speed_ms: number;
  wind_direction_deg: number;
  timestamp?: string;
}

// Fix für Leaflet-Icons in React - verwende CDN-Icons
const DefaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface WaypointMapProps {
  waypoints: Waypoint[];
  onWaypointAdd?: (waypoint: Waypoint) => void;
  onWaypointRemove?: (index: number) => void;
  onWaypointUpdate?: (index: number, waypoint: Waypoint) => void;
  onChange?: (waypoints: Waypoint[]) => void; // For compatibility with SimulationForm
  height?: string;
  showWindVectors?: boolean;
  missionStartTime?: string;
  flightDuration?: number;
  // Manual Wind Parameters
  manualWindEnabled?: boolean;
  manualWindSpeed?: number;
  manualWindDirection?: number;
}

// WindVector Layer Komponente
const WindVectorLayer: React.FC<{
  waypoints: Waypoint[];
  showWindVectors: boolean;
  missionStartTime?: string;
  flightDuration?: number;
  // Manual Wind Parameters
  manualWindEnabled?: boolean;
  manualWindSpeed?: number;
  manualWindDirection?: number;
}> = ({ waypoints, showWindVectors, missionStartTime, flightDuration, manualWindEnabled, manualWindSpeed, manualWindDirection }) => {
  const [windVectors, setWindVectors] = useState<WindVector[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!showWindVectors || waypoints.length === 0) {
      setWindVectors([]);
      return;
    }

    const loadWindData = async () => {
      setLoading(true);
      try {
        // Manueller Wind - erstelle Wind-Vektoren für jeden Waypoint
        if (manualWindEnabled && manualWindSpeed !== undefined && manualWindDirection !== undefined) {
          console.log('Using manual wind:', { manualWindSpeed, manualWindDirection });
          const manualWindVectors: WindVector[] = waypoints.map(waypoint => ({
            latitude: waypoint.latitude,
            longitude: waypoint.longitude,
            wind_speed_ms: manualWindSpeed,
            wind_direction_deg: manualWindDirection,
            timestamp: new Date().toISOString()
          }));
          setWindVectors(manualWindVectors);
          setLoading(false);
          return;
        }

        // Fallback auf API-Wind-Daten
        const response = await fetch('/api/wind/route', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            waypoints: waypoints.map(wp => ({
              latitude: wp.latitude,
              longitude: wp.longitude,
              altitude: wp.altitude || 100
            })),
            mission_start_time: missionStartTime || null,
            flight_duration: flightDuration || 1.0,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Wind data loaded:', data.wind_vectors?.length || 0, 'vectors');
          console.log('Sample wind vector:', data.wind_vectors?.[0]);
          console.log('showWindVectors state:', showWindVectors);
          setWindVectors(data.wind_vectors || []);
        } else {
          console.error('Failed to load wind vectors:', response.status, await response.text());
          setWindVectors([]);
        }
      } catch (error) {
        console.error('Error loading wind vectors:', error);
        setWindVectors([]);
      } finally {
        setLoading(false);
      }
    };

    loadWindData();
  }, [waypoints, showWindVectors, missionStartTime, flightDuration, manualWindEnabled, manualWindSpeed, manualWindDirection]);

  return (
    <SimpleWindVector 
      windVectors={windVectors} 
      visible={showWindVectors && !loading}
    />
  );
};

// MapClickHandler Komponente für das Hinzufügen neuer Waypoints
const MapClickHandler: React.FC<{
  onWaypointAdd?: (waypoint: Waypoint) => void;
  onChange?: (waypoints: Waypoint[]) => void;
  waypoints: Waypoint[];
}> = ({ onWaypointAdd, onChange, waypoints }) => {
  const map = useMap();

  React.useEffect(() => {
    if (!map) return;
    
    console.log('Setting up map click handler');
    
    const handleMapClick = (event: L.LeafletMouseEvent) => {
      console.log('Direct map click detected at:', event.latlng);
      
      const newWaypoint: Waypoint = {
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
        altitude: 100,
        speed: 10
      };
      
      console.log('Creating waypoint:', newWaypoint);
      console.log('Available callbacks - onWaypointAdd:', !!onWaypointAdd, 'onChange:', !!onChange);
      
      if (onWaypointAdd) {
        console.log('Calling onWaypointAdd');
        onWaypointAdd(newWaypoint);
      }
      
      if (onChange) {
        const newWaypoints = [...waypoints, newWaypoint];
        console.log('Calling onChange with', newWaypoints.length, 'waypoints');
        onChange(newWaypoints);
      }
    };

    map.on('click', handleMapClick);
    
    return () => {
      console.log('Removing map click handler');
      map.off('click', handleMapClick);
    };
  }, [map, onWaypointAdd, onChange, waypoints]);

  return null;
};

const WaypointMap: React.FC<WaypointMapProps> = ({
  waypoints,
  onWaypointAdd,
  onWaypointRemove,
  onWaypointUpdate,
  onChange,
  height = '600px',
  showWindVectors = false,
  missionStartTime,
  flightDuration,
  manualWindEnabled,
  manualWindSpeed,
  manualWindDirection
}) => {
  const mapRef = useRef<any>(null);

  // Berechne Kartenzentrum
  const center: [number, number] = waypoints.length > 0
    ? [
        waypoints.reduce((sum, wp) => sum + wp.latitude, 0) / waypoints.length,
        waypoints.reduce((sum, wp) => sum + wp.longitude, 0) / waypoints.length
      ]
    : [49.4875, 8.466]; // Default: Mannheim

  // Aktualisiere Karte wenn sich Waypoints ändern
  React.useEffect(() => {
    if (mapRef.current && waypoints.length > 0) {
      const map = mapRef.current;
      
      // Berechne Bounding Box für alle Waypoints
      const lats = waypoints.map(wp => wp.latitude);
      const lngs = waypoints.map(wp => wp.longitude);
      
      const bounds = [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)]
      ] as [[number, number], [number, number]];
      
      // Zentriere und zoome auf alle Waypoints
      map.fitBounds(bounds, { padding: [20, 20] });
      
      console.log('Map updated with new waypoints:', waypoints.length);
    }
  }, [waypoints]);

  // Berechne Route zwischen Waypoints
  const routeCoordinates: [number, number][] = waypoints.map(wp => [wp.latitude, wp.longitude]);

  return (
    <div style={{ height, width: '100%' }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Map Click Handler for adding waypoints */}
        <MapClickHandler 
          onWaypointAdd={onWaypointAdd}
          onChange={onChange}
          waypoints={waypoints}
        />
        
        {/* Route zwischen Waypoints */}
        {routeCoordinates.length > 1 && (
          <Polyline 
            positions={routeCoordinates} 
            color="blue" 
            weight={3}
            opacity={0.7}
          />
        )}

        {/* Waypoint Marker */}
        {waypoints.map((waypoint, index) => (
          <CircleMarker
            key={index}
            center={[waypoint.latitude, waypoint.longitude]}
            radius={8}
            pathOptions={{
              fillColor: '#3388ff',
              fillOpacity: 0.8,
              color: '#ffffff',
              weight: 2,
              opacity: 1
            }}
            eventHandlers={{
              click: (event) => {
                console.log(`Waypoint ${index + 1} clicked`);
              }
            }}
          >
            <Popup>
              <div>
                <strong>Waypoint {index + 1}</strong><br />
                Lat: {waypoint.latitude.toFixed(6)}<br />
                Lon: {waypoint.longitude.toFixed(6)}<br />
                Alt: {waypoint.altitude || 100}m<br />
                {onWaypointRemove && (
                  <button 
                    onClick={() => onWaypointRemove(index)}
                    style={{ marginTop: '8px', padding: '4px 8px', cursor: 'pointer' }}
                  >
                    Entfernen
                  </button>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
        
        {/* Wind Vectors */}
        <WindVectorLayer 
          waypoints={waypoints}
          showWindVectors={showWindVectors}
          missionStartTime={missionStartTime}
          flightDuration={flightDuration}
          manualWindEnabled={manualWindEnabled}
          manualWindSpeed={manualWindSpeed}
          manualWindDirection={manualWindDirection}
        />
      </MapContainer>
      
      {showWindVectors && waypoints.length === 0 && (
        <div style={{ 
          position: 'absolute', 
          top: '10px', 
          left: '10px', 
          background: 'rgba(255,255,255,0.9)',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          Waypoints hinzufügen um Windvektoren zu sehen
        </div>
      )}
      
      {/* Debug Info */}
      <div style={{ 
        position: 'absolute', 
        top: '10px', 
        right: '10px', 
        background: 'rgba(255,255,255,0.9)',
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: 1000
      }}>
        Waypoints: {waypoints.length}<br/>
        Klick auf Karte zum Hinzufügen
      </div>
    </div>
  );
};

export default WaypointMap;
