import React, { useState } from 'react';
import { Card, Button, Input, Row, Col, message } from 'antd';

const ElevationDemo: React.FC = () => {
  const [elevationData, setElevationData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testWaypoints = [
    { latitude: 51.99, longitude: 8.522, altitude: 100 },
    { latitude: 52.05, longitude: 8.650, altitude: 120 }
  ];

  const fetchElevationProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/elevation/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          waypoints: testWaypoints,
          interpolation_distance: 50.0
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setElevationData(data);
      message.success('Höhenprofil erfolgreich geladen!');
    } catch (error) {
      console.error('Error:', error);
      message.error('Fehler beim Laden der Höhendaten');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card title="🏔️ Höhenprofil Demo" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={12}>
            <h3>Test Waypoints:</h3>
            <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
              {JSON.stringify(testWaypoints, null, 2)}
            </pre>
            
            <Button 
              type="primary" 
              onClick={fetchElevationProfile}
              loading={loading}
              size="large"
              style={{ marginTop: 16 }}
            >
              Höhenprofil laden
            </Button>
          </Col>
          
          <Col span={12}>
            {elevationData && (
              <div>
                <h3>✅ API Response:</h3>
                <div style={{ background: '#f0f9f0', padding: '10px', borderRadius: '4px', fontSize: '12px' }}>
                  <p><strong>Punkte:</strong> {elevationData.profile.points.length}</p>
                  <p><strong>Distanz:</strong> {elevationData.profile.points[elevationData.profile.points.length-1]?.distance_km?.toFixed(2)} km</p>
                  <p><strong>Terrain:</strong> {Math.min(...elevationData.profile.points.map((p: any) => p.terrain_elevation)).toFixed(1)} - {Math.max(...elevationData.profile.points.map((p: any) => p.terrain_elevation)).toFixed(1)} m</p>
                  <p><strong>Kollisionen:</strong> {elevationData.collisions.length}</p>
                </div>
              </div>
            )}
          </Col>
        </Row>

        {elevationData && (
          <Card title="📊 Höhendaten Vorschau" style={{ marginTop: 24 }}>
            <div style={{ maxHeight: '300px', overflow: 'auto' }}>
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafafa' }}>
                    <th style={{ border: '1px solid #ddd', padding: '4px' }}>Distanz (km)</th>
                    <th style={{ border: '1px solid #ddd', padding: '4px' }}>Terrain (m)</th>
                    <th style={{ border: '1px solid #ddd', padding: '4px' }}>Flughöhe (m)</th>
                    <th style={{ border: '1px solid #ddd', padding: '4px' }}>Abstand (m)</th>
                  </tr>
                </thead>
                <tbody>
                  {elevationData.profile.points.slice(0, 20).map((point: any, index: number) => (
                    <tr key={index}>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{point.distance_km.toFixed(2)}</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{point.terrain_elevation.toFixed(1)}</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{point.waypoint_altitude.toFixed(1)}</td>
                      <td style={{ 
                        border: '1px solid #ddd', 
                        padding: '4px',
                        color: point.clearance < 30 ? '#ff4d4f' : '#52c41a'
                      }}>
                        {point.clearance.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {elevationData.profile.points.length > 20 && (
                <p style={{ textAlign: 'center', marginTop: '10px', color: '#666' }}>
                  ... und {elevationData.profile.points.length - 20} weitere Punkte
                </p>
              )}
            </div>
          </Card>
        )}
      </Card>
    </div>
  );
};

export default ElevationDemo;