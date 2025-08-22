import React from 'react';
import { Card, Row, Col, Typography, Progress, Statistic, Table, Space } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { SimulationResult } from '../types/simulation';

const { Title, Text } = Typography;

interface ResultsDisplayProps {
  result: SimulationResult;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result }) => {
  // Daten für Energy Chart vorbereiten
  const energyChartData = result.flight_segments.map((segment, index) => ({
    segment: `Segment ${segment.segment_id}`,
    energy_wh: segment.energy_wh,
    power_w: segment.average_power_w,
    distance_m: segment.distance_m,
  }));

  // Tabellendaten für Segmente
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
      title: 'Energie (Wh)',
      dataIndex: 'energy_wh',
      key: 'energy_wh',
      render: (value: number) => value.toFixed(2),
    },
    {
      title: 'Ø Geschwindigkeit (m/s)',
      dataIndex: 'average_speed_ms',
      key: 'average_speed_ms',
      render: (value: number) => value.toFixed(1),
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
            Gegenwind: {record.wind_influence.headwind_ms.toFixed(1)}
          </Text>
          <Text style={{ fontSize: '12px' }}>
            Seitenwind: {record.wind_influence.crosswind_ms.toFixed(1)}
          </Text>
        </Space>
      ),
    },
  ];

  const batteryColor = result.battery_usage_percent > 80 ? '#ff4d4f' : 
                      result.battery_usage_percent > 60 ? '#faad14' : '#52c41a';

  return (
    <div className="container-centered">
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

      {/* Energiediagramm */}
      <Card title="Energieverbrauch pro Segment" style={{ marginBottom: 24 }}>
        <div className="chart-container-medium">
          <ResponsiveContainer width="100%" height="100%">
          <BarChart data={energyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="segment" />
            <YAxis yAxisId="left" orientation="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="energy_wh" fill="#1890ff" name="Energie (Wh)" />
            <Bar yAxisId="right" dataKey="power_w" fill="#52c41a" name="Ø Leistung (W)" />
          </BarChart>
        </ResponsiveContainer>
        </div>
      </Card>

      {/* Leistungsdiagramm */}
      <Card title="Leistung über Distanz" style={{ marginBottom: 24 }}>
        <div className="chart-container-medium">
          <ResponsiveContainer width="100%" height="100%">
          <LineChart data={energyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="segment" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="power_w" stroke="#8884d8" strokeWidth={2} name="Leistung (W)" />
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
