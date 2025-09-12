import React from 'react';
import { Card } from 'antd';

const ElevationTestPage: React.FC = () => {
  // Test waypoints
  const testWaypoints = [
    { latitude: 51.99, longitude: 8.522, altitude: 100 },
    { latitude: 52.05, longitude: 8.650, altitude: 120 }
  ];

  const testSettings = {
    enabled: true,
    interpolation_distance_m: 50,
    safety_margin_m: 30,
    opentopo_server: "192.168.71.250:5000",
    dataset: "eudem25m"
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card title="🏔️ Höhenprofil Test">
        <div style={{ marginBottom: '16px' }}>
          <h3>Test Waypoints:</h3>
          <pre>{JSON.stringify(testWaypoints, null, 2)}</pre>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <h3>Backend API Test:</h3>
          <button 
            onClick={async () => {
              try {
                const response = await fetch('/api/elevation/profile', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    waypoints: testWaypoints,
                    interpolation_distance: 50.0
                  })
                });
                const data = await response.json();
                console.log('Elevation Data:', data);
                alert('API funktioniert! Siehe Console für Details.');
              } catch (error) {
                console.error('API Error:', error);
                alert('API Fehler: ' + error);
              }
            }}
          >
            API Testen
          </button>
        </div>

        <div>
          <p><strong>Nächster Schritt:</strong> ElevationProfileChart Component integrieren</p>
          <p>Das Backend liefert bereits perfekte Daten!</p>
        </div>
      </Card>
    </div>
  );
};

export default ElevationTestPage;