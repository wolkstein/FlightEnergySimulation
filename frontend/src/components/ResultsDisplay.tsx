import React, { useState } from 'react';
import { Card, Row, Col, Typography, Progress, Statistic, Table, Space, Switch, Button } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ReferenceLine } from 'recharts';
import { SimulationResult } from '../types/simulation';

const { Title, Text } = Typography;

interface ResultsDisplayProps {
  result: SimulationResult;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result }) => {
  // Toggle für X-Achse: Zeit vs. Distanz (Hook muss VOR jedem return stehen)
  const [showTimeAxis, setShowTimeAxis] = useState(true);

  // Null-Check für result
  if (!result || !result.flight_segments) {
    return (
      <div className="container-centered">
        <Card>
          <Text>Keine Simulationsdaten verfügbar.</Text>
        </Card>
      </div>
    );
  }
  
  // Daten für neue Timeline-Charts vorbereiten
  const prepareTimelineData = () => {
    if (!result.flight_segments || result.flight_segments.length === 0) {
      return [];
    }

    let cumulativeTime = 0;
    let cumulativeDistance = 0;
    let cumulativeEnergy = 0;
    
    // Erstelle Datenpunkte für Start und Ende jedes Segments
    const dataPoints: any[] = [];
    
    result.flight_segments.forEach((segment, index) => {
      const startTime = cumulativeTime;
      const startDistance = cumulativeDistance;
      
      const segmentDuration = segment.duration_s || 0;
      const segmentDistance = segment.distance_m || 0;
      const segmentEnergy = segment.energy_wh || 0;
      
      // Airspeed berechnen: Ground Speed - Headwind Component
      const groundSpeed = segment.average_speed_ms || 0;
      const headwindComponent = segment.wind_influence?.headwind_ms || 0;
      const airspeed = Math.max(0.1, groundSpeed - headwindComponent);
      
      // Höhen aus Waypoints
      const startAlt = segment.start_waypoint?.altitude || 0;
      const endAlt = segment.end_waypoint?.altitude || 0;
      const altitudeDiff = endAlt - startAlt;
      const verticalSpeed = segmentDuration > 0 ? altitudeDiff / segmentDuration : 0;
      
      // Start-Punkt des Segments
      dataPoints.push({
        // X-Achse Werte
        time_minutes: Number((startTime / 60).toFixed(2)),
        distance_km: Number((startDistance / 1000).toFixed(3)),
        
        // Geschwindigkeiten
        ground_speed_ms: Number(groundSpeed.toFixed(1)),
        airspeed_ms: Number(airspeed.toFixed(1)),
        vertical_speed_ms: Number(verticalSpeed.toFixed(1)),
        
        // Höhe - echte Waypoint-Höhe
        altitude_m: startAlt,
        
        // Wind
        headwind_ms: Number((-headwindComponent).toFixed(1)), // Vorzeichen umkehren für intuitive Anzeige
        crosswind_ms: Number((segment.wind_influence?.crosswind_ms || 0).toFixed(1)),
        total_wind_ms: Number((segment.wind_influence?.total_wind_speed || 0).toFixed(1)),
        
        // Energie & Leistung
        power_w: Number((segment.average_power_w || 0).toFixed(0)),
        energy_wh: Number(segmentEnergy.toFixed(2)),
        
        // Batterieentladung
        cumulative_energy_wh: Number(cumulativeEnergy.toFixed(2)),
        battery_remaining_wh: Number(Math.max(0, (result.total_energy_wh / result.battery_usage_percent * 100) - cumulativeEnergy).toFixed(2)),
        battery_remaining_percent: Number((100 - (cumulativeEnergy / (result.total_energy_wh / result.battery_usage_percent * 100)) * 100).toFixed(1)),
        
        // Segment Info für Tooltips
        segment_id: segment.segment_id || index + 1,
        segment_duration_s: segmentDuration,
        segment_distance_m: segmentDistance,
      });
      
      // End-Punkt des Segments (nur wenn nicht der letzte Segment)
      cumulativeTime += segmentDuration;
      cumulativeDistance += segmentDistance;
      cumulativeEnergy += segmentEnergy;
      
      // End-Punkt hinzufügen
      dataPoints.push({
        // X-Achse Werte
        time_minutes: Number((cumulativeTime / 60).toFixed(2)),
        distance_km: Number((cumulativeDistance / 1000).toFixed(3)),
        
        // Geschwindigkeiten (gleich wie am Start des Segments)
        ground_speed_ms: Number(groundSpeed.toFixed(1)),
        airspeed_ms: Number(airspeed.toFixed(1)),
        vertical_speed_ms: Number(verticalSpeed.toFixed(1)),
        
        // Höhe - echte End-Waypoint-Höhe
        altitude_m: endAlt,
        
        // Wind (gleich wie am Start des Segments)
        headwind_ms: Number((-headwindComponent).toFixed(1)),
        crosswind_ms: Number((segment.wind_influence?.crosswind_ms || 0).toFixed(1)),
        total_wind_ms: Number((segment.wind_influence?.total_wind_speed || 0).toFixed(1)),
        
        // Energie & Leistung (kumulativ)
        power_w: Number((segment.average_power_w || 0).toFixed(0)),
        energy_wh: Number(segmentEnergy.toFixed(2)),
        
        // Batterieentladung
        cumulative_energy_wh: Number(cumulativeEnergy.toFixed(2)),
        battery_remaining_wh: Number(Math.max(0, (result.total_energy_wh / result.battery_usage_percent * 100) - cumulativeEnergy).toFixed(2)),
        battery_remaining_percent: Number((100 - (cumulativeEnergy / (result.total_energy_wh / result.battery_usage_percent * 100)) * 100).toFixed(1)),
        
        // Segment Info für Tooltips
        segment_id: segment.segment_id || index + 1,
        segment_duration_s: segmentDuration,
        segment_distance_m: segmentDistance,
      });
    });
    
    return dataPoints;
  };
  
  const timelineData = prepareTimelineData();

  // Erweiterte Tabellendaten für Segmente
  const segmentColumns = [
    {
      title: 'Segment',
      dataIndex: 'segment_id',
      key: 'segment_id',
    },
    {
      title: 'Distanz (m)',
      dataIndex: 'distance_m',
      key: 'distance_m',
      render: (value: number) => value.toFixed(0),
    },
    {
      title: 'Dauer (s)',
      dataIndex: 'duration_s',
      key: 'duration_s',
      render: (value: number) => value.toFixed(1),
    },
    {
      title: 'Höhe Start/Ende (m)',
      key: 'altitude',
      render: (_: any, record: any) => (
        <Text>
          {(record.start_waypoint?.altitude || 0)}m → {(record.end_waypoint?.altitude || 0)}m
        </Text>
      ),
    },
    {
      title: 'Ground Speed (m/s)',
      dataIndex: 'average_speed_ms',
      key: 'ground_speed',
      render: (value: number) => value.toFixed(1),
    },
    {
      title: 'Airspeed (m/s)',
      key: 'airspeed',
      render: (_: any, record: any) => {
        const groundSpeed = record.average_speed_ms || 0;
        const headwind = record.wind_influence?.headwind_ms || 0;
        const airspeed = Math.max(0.1, groundSpeed - headwind);
        return <Text>{airspeed.toFixed(1)}</Text>;
      },
    },
    {
      title: 'Energie (Wh)',
      dataIndex: 'energy_wh',
      key: 'energy_wh',
      render: (value: number) => value.toFixed(2),
    },
    {
      title: 'Ø Leistung (W)',
      dataIndex: 'average_power_w',
      key: 'average_power_w',
      render: (value: number) => value.toFixed(0),
    },
    {
      title: 'Wind (m/s)',
      key: 'wind',
      render: (_: any, record: any) => (
        <Space direction="vertical" size="small">
          <Text style={{ fontSize: '12px' }}>
            Gegen: {(-(record.wind_influence?.headwind_ms || 0)).toFixed(1)}
          </Text>
          <Text style={{ fontSize: '12px' }}>
            Quer: {(record.wind_influence?.crosswind_ms || 0).toFixed(1)}
          </Text>
          <Text style={{ fontSize: '12px' }}>
            Total: {(record.wind_influence?.total_wind_speed || 0).toFixed(1)}
          </Text>
        </Space>
      ),
    },
  ];

  // Custom Tooltip für Charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      const labelValue = typeof label === 'number' ? label.toFixed(1) : label;
      return (
        <div style={{ 
          background: 'white', 
          padding: '12px', 
          border: '1px solid #ccc', 
          borderRadius: '4px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)' 
        }}>
          <p style={{ fontWeight: 'bold', margin: '0 0 8px 0' }}>
            {showTimeAxis ? `Zeit: ${labelValue} min` : `Distanz: ${labelValue} km`}
          </p>
          <p style={{ margin: '0 0 4px 0' }}>Segment: {data?.segment_id}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color, margin: '2px 0' }}>
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const batteryColor = result.battery_usage_percent > 80 ? '#ff4d4f' : 
                      result.battery_usage_percent > 60 ? '#faad14' : '#52c41a';

  return (
    <div className="simulation-container">
      {/* Übersicht */}
      <Card title="Simulationsergebnisse - Übersicht" style={{ marginBottom: 24 }}>
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Gesamtenergie"
                value={result.total_energy_wh}
                suffix="Wh"
                precision={2}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Gesamtdistanz"
                value={result.total_distance_m / 1000}
                suffix="km"
                precision={2}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Flugzeit"
                value={result.summary.flight_time_minutes}
                suffix="min"
                precision={1}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Ø Geschwindigkeit"
                value={result.summary.average_speed_ms * 3.6}
                suffix="km/h"
                precision={1}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Batteriestatus */}
      <Card title="Batteriestatus" style={{ marginBottom: 24 }}>
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} lg={12}>
            <div className="text-center">
              <Progress
                type="circle"
                percent={result.battery_usage_percent}
                size={150}
                strokeColor={batteryColor}
                format={percent => `${percent?.toFixed(1)}%`}
              />
              <div className="section-spacing">
                <Text strong>Batterienverbrauch</Text>
              </div>
            </div>
          </Col>
          <Col xs={24} lg={12}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Statistic
                title="Verbleibende Kapazität"
                value={result.summary.remaining_battery_percent}
                suffix="%"
                precision={1}
              />
              <Statistic
                title="Geschätzte Reichweite"
                value={result.summary.max_range_estimate_km}
                suffix="km"
                precision={1}
              />
              <Statistic
                title="Energieverbrauch pro km"
                value={result.summary.energy_per_km}
                suffix="Wh/km"
                precision={1}
              />
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Chart-Achsen Umschalter */}
      <Card title="Flugverlauf-Visualisierung" style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <Space size="large">
            <Text>X-Achse: </Text>
            <Switch
              checked={showTimeAxis}
              onChange={setShowTimeAxis}
              checkedChildren="Zeit (min)"
              unCheckedChildren="Distanz (km)"
            />
          </Space>
        </div>
      </Card>

      {/* Flugprofil: Geschwindigkeit & Höhe */}
      <Card title="Flugprofil: Geschwindigkeiten & Höhe" style={{ marginBottom: 24 }}>
        <div className="chart-container-large">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={showTimeAxis ? "time_minutes" : "distance_km"}
                label={{ 
                  value: showTimeAxis ? 'Zeit (min)' : 'Distanz (km)', 
                  position: 'insideBottom', 
                  offset: -5 
                }}
              />
              <YAxis yAxisId="speed" orientation="left" label={{ value: 'Geschwindigkeit (m/s)', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="altitude" orientation="right" label={{ value: 'Höhe (m)', angle: 90, position: 'insideRight' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {/* Geschwindigkeitslinien */}
              <Line 
                yAxisId="speed"
                type="monotone" 
                dataKey="ground_speed_ms" 
                stroke="#1890ff" 
                strokeWidth={2}
                name="Ground Speed (m/s)"
              />
              <Line 
                yAxisId="speed"
                type="monotone" 
                dataKey="airspeed_ms" 
                stroke="#52c41a" 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Airspeed (m/s)"
              />
              
              {/* Höhenlinie */}
              <Line 
                yAxisId="altitude"
                type="monotone" 
                dataKey="altitude_m" 
                stroke="#8c8c8c" 
                strokeWidth={2}
                name="Höhe (m)"
                dot={{ r: 4 }}
              />
              
              {/* Referenzlinie für durchschnittliche Ground Speed */}
              <ReferenceLine 
                yAxisId="speed" 
                y={result.summary.average_speed_ms} 
                stroke="#87ceeb" 
                strokeWidth={2}
                strokeDasharray="8 4" 
                label={{ value: `Ø Ground Speed: ${result.summary.average_speed_ms.toFixed(1)} m/s`, position: "left" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Wind-Impact & Leistung */}
      <Card title="Wind-Einfluss & Energieverbrauch" style={{ marginBottom: 24 }}>
        <div className="chart-container-large">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={showTimeAxis ? "time_minutes" : "distance_km"}
                label={{ 
                  value: showTimeAxis ? 'Zeit (min)' : 'Distanz (km)', 
                  position: 'insideBottom', 
                  offset: -5 
                }}
              />
              <YAxis yAxisId="power" orientation="left" label={{ value: 'Leistung (W)', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="wind" orientation="right" label={{ value: 'Wind (m/s)', angle: 90, position: 'insideRight' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {/* Leistung */}
              <Line 
                yAxisId="power"
                type="monotone" 
                dataKey="power_w" 
                stroke="#ff4d4f" 
                strokeWidth={3}
                name="Leistung (W)"
              />
              
              {/* Wind-Komponenten */}
              <Line 
                yAxisId="wind"
                type="monotone" 
                dataKey="headwind_ms" 
                stroke="#faad14" 
                strokeWidth={2}
                name="Gegenwind (m/s)"
              />
              <Line 
                yAxisId="wind"
                type="monotone" 
                dataKey="crosswind_ms" 
                stroke="#722ed1" 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Seitenwind (m/s)"
              />
              
              {/* Referenzlinie bei 0 für Wind */}
              <ReferenceLine yAxisId="wind" y={0} stroke="#666" strokeDasharray="2 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Batterieentladung über Zeit/Distanz */}
      <Card title="Batterieentladung" style={{ marginBottom: 24 }}>
        <div className="chart-container-large">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={showTimeAxis ? "time_minutes" : "distance_km"}
                label={{ 
                  value: showTimeAxis ? 'Zeit (min)' : 'Distanz (km)', 
                  position: 'insideBottom', 
                  offset: -5 
                }}
              />
              <YAxis yAxisId="energy" orientation="left" label={{ value: 'Verbleibende Energie (Wh)', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="battery" orientation="right" label={{ value: 'Batterielevel (%)', angle: 90, position: 'insideRight' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {/* Verbleibende Batterieenergie in Wh */}
              <Line 
                yAxisId="energy"
                type="monotone" 
                dataKey="battery_remaining_wh" 
                stroke="#e74c3c" 
                strokeWidth={3}
                name="Verbleibende Energie (Wh)"
              />
              
              {/* Verbleibende Batteriekapazität */}
              <Line 
                yAxisId="battery"
                type="monotone" 
                dataKey="battery_remaining_percent" 
                stroke="#27ae60" 
                strokeWidth={3}
                strokeDasharray="5 5"
                name="Batterielevel (%)"
              />
              
              {/* Referenzlinien für kritische Batterielevel */}
              <ReferenceLine yAxisId="battery" y={20} stroke="#e74c3c" strokeDasharray="3 3" label="Kritisch (20%)" />
              <ReferenceLine yAxisId="battery" y={10} stroke="#c0392b" strokeDasharray="2 2" label="Reserve (10%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Detailtabelle */}
      <Card title="Segmentdetails">
        <Table
          dataSource={result.flight_segments}
          columns={segmentColumns}
          pagination={false}
          scroll={{ x: 800 }}
          size="small"
          rowKey="segment_id"
        />
      </Card>
    </div>
  );
};

export default ResultsDisplay;
