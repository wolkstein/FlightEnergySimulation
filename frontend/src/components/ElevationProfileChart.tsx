import React, { useState, useEffect } from 'react';
import { Card, Button, Progress, Alert, Typography, Space, Switch, InputNumber } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Brush } from 'recharts';
import { DownloadOutlined, ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons';
import { Waypoint, ElevationSettings } from '../types/simulation';

const { Text } = Typography;

interface ElevationProfileChartProps {
  waypoints: Waypoint[];
  elevationSettings?: ElevationSettings; // Uses the updated interface
}

interface ElevationPoint {
  distance_km: number;
  flight_altitude: number;
  terrain_elevation: number;
  clearance: number;
  waypoint_index: number;
  latitude: number;
  longitude: number;
}

const ElevationProfileChart: React.FC<ElevationProfileChartProps> = ({ waypoints, elevationSettings }) => {
    // User-Settings für OpenTopo Integration
  const openTopoServer = elevationSettings?.opentopo_server || '192.168.71.250:5000';
  const dataset = elevationSettings?.dataset || 'eudem25m';
  const safetyMargin = elevationSettings?.safety_margin_m || 30;

  // State für Chart-Funktionalität
  const [elevationData, setElevationData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [totalDistance, setTotalDistance] = useState(0);
  const [useAGL, setUseAGL] = useState(false); // AGL vs AMSL toggle
  const [startpointTerrainHeight, setStartpointTerrainHeight] = useState<number | null>(null);
  // REMOVED: interpolationResolution - use elevationSettings.interpolation_distance_m instead
  const [zoomDomain, setZoomDomain] = useState<{startIndex?: number, endIndex?: number} | null>(null);

  // Get interpolation resolution from settings
  const interpolationResolution = elevationSettings?.interpolation_distance_m || 50;

  // Haversine-Formel für Geo-Distanz-Berechnung
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Geodätische Interpolation zwischen zwei Punkten (Great Circle)
  const interpolateRoute = (start: Waypoint, end: Waypoint, resolution: number): Array<{lat: number, lon: number, alt: number, distance: number}> => {
    const startLat = start.latitude * Math.PI / 180;
    const startLon = start.longitude * Math.PI / 180;
    const endLat = end.latitude * Math.PI / 180;
    const endLon = end.longitude * Math.PI / 180;

    // Gesamtdistanz zwischen den Punkten
    const totalDistance = calculateDistance(start.latitude, start.longitude, end.latitude, end.longitude) * 1000; // in Metern
    
    if (totalDistance < resolution) {
      // Zu kurz für Interpolation
      return [];
    }

    const interpolatedPoints: Array<{lat: number, lon: number, alt: number, distance: number}> = [];
    const numPoints = Math.floor(totalDistance / resolution);

    for (let i = 1; i < numPoints; i++) {
      const fraction = i / numPoints;
      
      // Spherical Linear Interpolation (Slerp) für geodätisch korrekte Interpolation
      const A = Math.sin((1 - fraction) * totalDistance / 6371000) / Math.sin(totalDistance / 6371000);
      const B = Math.sin(fraction * totalDistance / 6371000) / Math.sin(totalDistance / 6371000);
      
      // Kartesische Koordinaten für präzise Interpolation
      const x = A * Math.cos(startLat) * Math.cos(startLon) + B * Math.cos(endLat) * Math.cos(endLon);
      const y = A * Math.cos(startLat) * Math.sin(startLon) + B * Math.cos(endLat) * Math.sin(endLon);
      const z = A * Math.sin(startLat) + B * Math.sin(endLat);
      
      // Zurück zu Lat/Lon
      const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * 180 / Math.PI;
      const lon = Math.atan2(y, x) * 180 / Math.PI;
      
      // Lineare Höhen-Interpolation
      const alt = start.altitude + (end.altitude - start.altitude) * fraction;
      
      interpolatedPoints.push({
        lat,
        lon,
        alt,
        distance: i * resolution
      });
    }

    return interpolatedPoints;
  };

  // Erweiterte Route mit Interpolation generieren
  const generateInterpolatedRoute = (waypoints: Waypoint[]): Array<{lat: number, lon: number, alt: number, distance: number, isWaypoint: boolean, waypointIndex?: number}> => {
    if (waypoints.length < 2) return [];

    const fullRoute: Array<{lat: number, lon: number, alt: number, distance: number, isWaypoint: boolean, waypointIndex?: number}> = [];
    let cumulativeDistance = 0;

    // Startpunkt hinzufügen
    fullRoute.push({
      lat: waypoints[0].latitude,
      lon: waypoints[0].longitude,
      alt: waypoints[0].altitude,
      distance: 0,
      isWaypoint: true,
      waypointIndex: 0
    });

    // Zwischen jedem Waypoint-Paar interpolieren
    for (let i = 1; i < waypoints.length; i++) {
      const start = waypoints[i - 1];
      const end = waypoints[i];
      
      // Interpolierte Punkte zwischen start und end
      const interpolated = interpolateRoute(start, end, interpolationResolution);
      
      // Interpolierte Punkte zur Route hinzufügen
      interpolated.forEach(point => {
        fullRoute.push({
          lat: point.lat,
          lon: point.lon,
          alt: point.alt,
          distance: cumulativeDistance + point.distance,
          isWaypoint: false
        });
      });
      
      // Distanz zum nächsten Waypoint
      const segmentDistance = calculateDistance(start.latitude, start.longitude, end.latitude, end.longitude) * 1000;
      cumulativeDistance += segmentDistance;
      
      // End-Waypoint hinzufügen
      fullRoute.push({
        lat: end.latitude,
        lon: end.longitude,
        alt: end.altitude,
        distance: cumulativeDistance,
        isWaypoint: true,
        waypointIndex: i
      });
    }

    return fullRoute;
  };

  // KML Export für Google Earth/Maps Validierung
  const exportInterpolatedRouteAsKML = () => {
    if (waypoints.length < 2) {
      return;
    }

    const interpolatedRoute = generateInterpolatedRoute(waypoints);
    
    const kmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Interpolierte Flugroute - Validierung</name>
    <description>Geodätisch interpolierte Route mit ${interpolationResolution}m Auflösung</description>
    
    <!-- Waypoint Style -->
    <Style id="waypointStyle">
      <IconStyle>
        <color>ff0000ff</color>
        <scale>1.2</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/pushpin/red-pushpin.png</href>
        </Icon>
      </IconStyle>
    </Style>
    
    <!-- Interpolation Style -->
    <Style id="interpolationStyle">
      <IconStyle>
        <color>ff00ff00</color>
        <scale>0.8</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/shapes/shaded_dot.png</href>
        </Icon>
      </IconStyle>
    </Style>
    
    <!-- Route Line Style -->
    <Style id="routeLineStyle">
      <LineStyle>
        <color>ff0000ff</color>
        <width>3</width>
      </LineStyle>
    </Style>`;

    // Waypoints als Placemarks
    let waypointPlacemarks = '';
    waypoints.forEach((waypoint, index) => {
      waypointPlacemarks += `
    <Placemark>
      <name>Waypoint ${index + 1}</name>
      <description>
        Lat: ${waypoint.latitude.toFixed(6)}°
        Lon: ${waypoint.longitude.toFixed(6)}°
        Alt: ${waypoint.altitude}m ${useAGL ? 'AGL' : 'AMSL'}
      </description>
      <styleUrl>#waypointStyle</styleUrl>
      <Point>
        <coordinates>${waypoint.longitude},${waypoint.latitude},${waypoint.altitude}</coordinates>
      </Point>
    </Placemark>`;
    });

    // Interpolierte Punkte als Placemarks
    let interpolationPlacemarks = '';
    interpolatedRoute.filter(point => !point.isWaypoint).forEach((point, index) => {
      interpolationPlacemarks += `
    <Placemark>
      <name>Interpoliert ${index + 1}</name>
      <description>
        Lat: ${point.lat.toFixed(6)}°
        Lon: ${point.lon.toFixed(6)}°
        Alt: ${point.alt.toFixed(1)}m
        Distanz: ${(point.distance / 1000).toFixed(2)}km
      </description>
      <styleUrl>#interpolationStyle</styleUrl>
      <Point>
        <coordinates>${point.lon},${point.lat},${point.alt}</coordinates>
      </Point>
    </Placemark>`;
    });

    // Route als LineString
    const routeCoordinates = interpolatedRoute
      .map(point => `${point.lon},${point.lat},${point.alt}`)
      .join(' ');

    const routeLine = `
    <Placemark>
      <name>Interpolierte Flugroute</name>
      <description>Geodätisch korrekte Great Circle Interpolation</description>
      <styleUrl>#routeLineStyle</styleUrl>
      <LineString>
        <extrude>1</extrude>
        <tessellate>1</tessellate>
        <altitudeMode>absolute</altitudeMode>
        <coordinates>${routeCoordinates}</coordinates>
      </LineString>
    </Placemark>`;

    const kmlFooter = `
  </Document>
</kml>`;

    const fullKML = kmlHeader + waypointPlacemarks + interpolationPlacemarks + routeLine + kmlFooter;

    // KML Download
    const blob = new Blob([fullKML], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flugroute_interpoliert_${interpolationResolution}m_${new Date().toISOString().slice(0, 16)}.kml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log(`📥 KML Export: ${interpolatedRoute.length} Punkte (${waypoints.length} Waypoints + ${interpolatedRoute.filter(p => !p.isWaypoint).length} interpoliert)`);
  };

  // Gesamtdistanz berechnen (auch ohne Terrain-Daten)
  const calculateTotalDistance = (waypoints: Waypoint[]): number => {
    if (waypoints.length < 2) return 0;
    
    let total = 0;
    for (let i = 1; i < waypoints.length; i++) {
      total += calculateDistance(
        waypoints[i-1].latitude,
        waypoints[i-1].longitude,
        waypoints[i].latitude,
        waypoints[i].longitude
      );
    }
    return total;
  };

  // Höhendaten von OpenTopo laden (mit Interpolation und AGL-Unterstützung)
  const loadElevationData = async () => {
    if (waypoints.length < 2) {
      setError('Mindestens 2 Wegpunkte erforderlich');
      return;
    }

    // Use elevationSettings directly or defaults
    const effectiveSettings = elevationSettings || {
      opentopo_server: '192.168.71.250:5000',
      dataset: 'eudem25m',
      safety_margin_m: 30,
      interpolation_distance_m: 50
    };

    setLoading(true);
    setError(null);
    setProgress(5);

    try {
      // Erweiterte Route mit Interpolation generieren
      const interpolatedRoute = generateInterpolatedRoute(waypoints);
      console.log(`🗺️ Interpolierte Route: ${interpolatedRoute.length} Punkte (alle ${interpolationResolution}m)`);
      
      setProgress(20);

      // Parallel alle Terrain-Höhen laden (Waypoints + interpolierte Punkte)
      const elevationPromises = interpolatedRoute.map(async (point, index) => {
        try {
          const response = await fetch(
            `http://${effectiveSettings.opentopo_server}/v1/${effectiveSettings.dataset}?locations=${point.lat},${point.lon}`
          );
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          const data = await response.json();
          return {
            index,
            terrain_elevation: data.results[0].elevation,
            point
          };
        } catch (error) {
          console.warn(`Terrain-Höhe für Punkt ${index} fehlgeschlagen:`, error);
          return {
            index,
            terrain_elevation: 0, // Fallback
            point
          };
        }
      });

      setProgress(70);
      const terrainResults = await Promise.all(elevationPromises);

      // Startpunkt-Terrain für AGL-Modus speichern
      const startpointTerrain = terrainResults.find(r => r.index === 0)?.terrain_elevation || 0;
      setStartpointTerrainHeight(startpointTerrain);

      // Elevation-Points aus interpolierter Route erstellen
      const elevationPoints: ElevationPoint[] = terrainResults.map(result => {
        const point = result.point;
        const terrainElevation = result.terrain_elevation;
        
        // AGL-Modus: Höhen relativ zum Startpunkt-Terrain (nur wenn explizit gewählt!)
        let adjustedAltitude = point.alt;
        if (useAGL && startpointTerrain > 0) {
          // Nur in AGL-Modus: Waypoint-Höhe + Startpunkt-Terrain = absolute Flughöhe
          adjustedAltitude = point.alt + startpointTerrain;
        }
        // AMSL-Modus: Waypoint-Höhen bleiben unverändert (RTK GNSS Standard)
        
        const clearance = adjustedAltitude - terrainElevation;

        return {
          distance_km: Number((point.distance / 1000).toFixed(3)),
          flight_altitude: adjustedAltitude,
          terrain_elevation: terrainElevation,
          clearance: clearance,
          safety_clearance_line: terrainElevation + effectiveSettings.safety_margin_m, // User-definierte Safety Clearance
          waypoint_index: point.waypointIndex || -1,
          latitude: point.lat,
          longitude: point.lon
        };
      });

      setProgress(100);
      setElevationData(elevationPoints);
      
      // Gesamtdistanz aus letztem Punkt
      const finalDistance = elevationPoints[elevationPoints.length - 1]?.distance_km || 0;
      setTotalDistance(finalDistance);

      console.log('✅ Interpoliertes Höhenprofil geladen:', elevationPoints.length, 'Punkte über', finalDistance.toFixed(2), 'km');
      if (useAGL) {
        console.log('🔧 AGL-Modus: Startpunkt-Terrain', startpointTerrain, 'm');
      }

    } catch (error: any) {
      console.error('❌ Fehler beim Laden der Höhendaten:', error);
      setError(`Fehler: ${error.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  // Gesamtdistanz und Flughöhen-Chart-Daten bei Waypoint-Änderung aktualisieren
  useEffect(() => {
    const distance = calculateTotalDistance(waypoints);
    setTotalDistance(distance);
    
    // Flight-Höhen Chart-Daten sofort berechnen (ohne Terrain)
    if (waypoints.length >= 2) {
      const flightData = calculateFlightProfile(waypoints);
      setElevationData(flightData);
    } else {
      setElevationData([]);
    }
  }, [waypoints]);

  // Flughöhen-Profil aus Waypoints berechnen (mit AGL/AMSL Unterstützung)
  const calculateFlightProfile = (waypoints: Waypoint[]): ElevationPoint[] => {
    if (waypoints.length < 2) return [];
    
    let cumulativeDistance = 0;
    const flightPoints: ElevationPoint[] = [];
    
    waypoints.forEach((waypoint, index) => {
      if (index > 0) {
        const distance = calculateDistance(
          waypoints[index-1].latitude,
          waypoints[index-1].longitude,
          waypoint.latitude,
          waypoint.longitude
        );
        cumulativeDistance += distance;
      }
      
      // AGL-Modus: Höhen relativ zum Startpunkt-Terrain
      let adjustedAltitude = waypoint.altitude;
      if (useAGL && startpointTerrainHeight !== null) {
        adjustedAltitude = waypoint.altitude + startpointTerrainHeight;
      }
      
      flightPoints.push({
        distance_km: Number(cumulativeDistance.toFixed(3)),
        flight_altitude: adjustedAltitude,
        terrain_elevation: 0, // Wird per Button nachgeladen
        clearance: adjustedAltitude, // Fallback bis Terrain geladen
        waypoint_index: index,
        latitude: waypoint.latitude,
        longitude: waypoint.longitude
      });
    });
    
    return flightPoints;
  };

  // Custom Tooltip für Charts (zeigt Waypoint vs Interpolation)
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      const labelValue = typeof label === 'number' ? label.toFixed(1) : label;
      const isWaypoint = data?.waypoint_index >= 0;
      
      return (
        <div style={{ 
          background: 'white', 
          padding: '12px', 
          border: '1px solid #ccc', 
          borderRadius: '4px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)' 
        }}>
          <p style={{ fontWeight: 'bold', margin: '0 0 8px 0' }}>
            {labelValue} km
          </p>
          {isWaypoint ? (
            <p style={{ margin: '0 0 4px 0', color: '#1890ff', fontWeight: 'bold' }}>
              📍 Wegpunkt {data.waypoint_index + 1}
            </p>
          ) : (
            <p style={{ margin: '0 0 4px 0', color: '#52c41a' }}>
              🔗 Interpoliert
            </p>
          )}
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color, margin: '2px 0' }}>
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
              {entry.dataKey === 'flight_altitude' || entry.dataKey === 'terrain_elevation' ? 'm' : ''}
            </p>
          ))}
          {data?.clearance !== undefined && (
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: data.clearance < 30 ? '#ff4d4f' : '#52c41a' }}>
              Clearance: {data.clearance.toFixed(1)}m
              {data.clearance < 30 && ' ⚠️'}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ marginBottom: 24 }}>
      {waypoints.length < 2 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
          Mindestens 2 Wegpunkte erforderlich für Höhenprofil-Analyse
        </div>
      ) : (
        <>
          {/* Chart direkt ohne Card-Wrapper */}
          {elevationData.length > 0 && (
            <div style={{ height: '400px', width: '100%', marginBottom: 16 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={elevationData} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  onMouseDown={(e) => {
                    // Zoom-Start bei Mouse-Down
                    if (e && e.activeLabel !== undefined) {
                      console.log('Zoom start at:', e.activeLabel);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  
                  {/* X-Axis mit Zoom-Domain */}
                  <XAxis 
                    type="number"
                    scale="linear"
                    dataKey="distance_km"
                    domain={zoomDomain ? 
                      [
                        elevationData[zoomDomain.startIndex || 0]?.distance_km || 'dataMin',
                        elevationData[zoomDomain.endIndex || elevationData.length - 1]?.distance_km || 'dataMax'
                      ] : 
                      ['dataMin', 'dataMax']
                    }
                    label={{ 
                      value: 'Distanz (km)', 
                      position: 'insideBottom', 
                      offset: -10 
                    }}
                  />
                  
                  <YAxis 
                    label={{ 
                      value: 'Höhe (m)', 
                      angle: -90, 
                      position: 'insideLeft' 
                    }}
                  />
                  
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  
                  {/* Brush für Zoom/Pan Navigation */}
                  <Brush 
                    dataKey="distance_km" 
                    height={30}
                    stroke="#8884d8"
                    onChange={(brushData) => {
                      if (brushData && brushData.startIndex !== undefined && brushData.endIndex !== undefined) {
                        setZoomDomain({
                          startIndex: brushData.startIndex,
                          endIndex: brushData.endIndex
                        });
                      }
                    }}
                  />
                  
                  {/* Terrain-Linie - nur wenn geladen */}
                  {elevationData[0].terrain_elevation > 0 && (
                    <Line 
                      type="monotone" 
                      dataKey="terrain_elevation" 
                      stroke="#8b4513" 
                      strokeWidth={3}
                      name="Terrain"
                      dot={{ r: 0 }}
                      fill="#8b4513"
                      fillOpacity={0.1}
                    />
                  )}
                  
                  {/* Safety Clearance - folgt dem Terrain */}
                  {elevationData[0].terrain_elevation > 0 && (
                    <Line 
                      type="monotone" 
                      dataKey="safety_clearance_line" 
                      stroke="#faad14" 
                      strokeWidth={2}
                      strokeDasharray="5 5" 
                      name={`${elevationSettings?.safety_margin_m || 30}m Safety Clearance`}
                      dot={false}
                    />
                  )}
                  
                  {/* Flughöhen-Linie - immer sichtbar */}
                  <Line 
                    type="monotone" 
                    dataKey="flight_altitude" 
                    stroke="#1890ff" 
                    strokeWidth={2}
                    name="Flughöhe"
                    dot={(props: any) => {
                      // Nur echte Waypoints bekommen Dots (waypoint_index >= 0)
                      const point = elevationData[props.index];
                      if (point && point.waypoint_index >= 0) {
                        return <circle 
                          cx={props.cx} 
                          cy={props.cy} 
                          r={4} 
                          fill="#1890ff" 
                          stroke="#ffffff" 
                          strokeWidth={2}
                        />;
                      }
                      return null; // Keine Dots für interpolierte Punkte
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Progress Bar */}
          {loading && progress > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Progress percent={progress} size="small" />
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <Alert 
              message={error} 
              type="error" 
              style={{ marginBottom: 16 }}
              closable 
              onClose={() => setError(null)}
            />
          )}

          {/* Einstellungen und Controls UNTER dem Chart */}
          <div style={{ backgroundColor: '#fafafa', padding: '16px', borderRadius: '6px', border: '1px solid #d9d9d9' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <Space wrap>
                  <Text strong style={{ whiteSpace: 'nowrap' }}>
                    📏 Strecke: {totalDistance.toFixed(2)}km
                  </Text>
                  <Text type="secondary" style={{ whiteSpace: 'nowrap' }}>
                    ({waypoints.length} WP)
                  </Text>
                  <Text type="secondary" style={{ whiteSpace: 'nowrap' }}>
                    Auflösung: {interpolationResolution}m
                  </Text>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Text style={{ whiteSpace: 'nowrap' }}>Modus:</Text>
                    <Switch
                      checked={useAGL}
                      onChange={(checked) => {
                        setUseAGL(checked);
                        // Chart sofort neu berechnen bei Modus-Wechsel
                        if (waypoints.length >= 2) {
                          const flightData = calculateFlightProfile(waypoints);
                          // Terrain-Daten beibehalten falls vorhanden, aber nur AGL-Conversion wenn explizit gewählt
                          if (elevationData.length > 0 && elevationData[0].terrain_elevation > 0) {
                            // Terrain-Daten neu laden für korrekte AGL/AMSL-Berechnung
                            loadElevationData();
                          } else {
                            setElevationData(flightData);
                          }
                        }
                      }}
                      checkedChildren="AGL"
                      unCheckedChildren="AMSL"
                    />
                  </div>
                </Space>
                <Space wrap>
                  {/* Zoom/Pan Controls */}
                  <Button 
                    icon={<ZoomOutOutlined />}
                    onClick={() => setZoomDomain(null)}
                    disabled={!zoomDomain}
                    size="small"
                    title="Zoom zurücksetzen"
                  >
                    Reset Zoom
                  </Button>
                  
                  {elevationData.length > 0 && elevationData[0].terrain_elevation === 0 && (
                    <Button type="primary" onClick={loadElevationData} loading={loading}>
                      🌐 Terrain-Höhen laden
                    </Button>
                  )}
                  {elevationData.length > 0 && elevationData[0].terrain_elevation > 0 && (
                    <Text type="success">✅ Mit Terrain-Daten</Text>
                  )}
                </Space>
              </div>
              
              {/* AGL Info */}
              {useAGL && (
                <div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    🔧 AGL-Modus: Höhen werden relativ zum Startpunkt-Terrain interpretiert
                    {startpointTerrainHeight !== null && (
                      <span> (Startpunkt: {startpointTerrainHeight.toFixed(1)}m AMSL)</span>
                    )}
                  </Text>
                </div>
              )}
              {!useAGL && (
                <div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    🌊 AMSL-Modus: Höhen werden als absolute Werte über Meeresspiegel verwendet (RTK GNSS Standard)
                  </Text>
                </div>
              )}

              {elevationData.length > 0 && elevationData[0].terrain_elevation > 0 && (
                <div>
                  <Text type="success">
                    ✅ {elevationData.length} Terrain-Punkte geladen • 
                    🏔️ {elevationData.filter(p => p.clearance < 30).length} Kollisions-Warnungen
                  </Text>
                  <Button 
                    size="small" 
                    onClick={() => {
                      // Terrain-Daten zurücksetzen, aber Flughöhen-Chart behalten
                      const flightData = calculateFlightProfile(waypoints);
                      setElevationData(flightData);
                    }}
                    style={{ marginLeft: 16 }}
                  >
                    🗑️ Terrain zurücksetzen
                  </Button>
                </div>
              )}
            </Space>
          </div>
        </>
      )}
    </div>
  );
};

export default ElevationProfileChart;

// ...existing elevation profile chart code...