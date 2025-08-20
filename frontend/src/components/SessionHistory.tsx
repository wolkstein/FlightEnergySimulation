import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Typography, message, Modal } from 'antd';
import { EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import { SimulationSession } from '../types/simulation';
import { apiService } from '../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const SessionHistory: React.FC = () => {
  const [sessions, setSessions] = useState<SimulationSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SimulationSession | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await apiService.getAllSessions();
      setSessions(data);
    } catch (error) {
      message.error('Fehler beim Laden der Sessions');
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const showSessionDetails = (session: SimulationSession) => {
    setSelectedSession(session);
    setDetailModalVisible(true);
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Fahrzeugtyp',
      dataIndex: 'vehicle_type',
      key: 'vehicle_type',
      render: (type: string) => type || 'Nicht verfügbar',
    },
    {
      title: 'Energie (Wh)',
      dataIndex: 'total_energy_wh',
      key: 'total_energy_wh',
      render: (value: number) => value ? value.toFixed(2) : 'N/A',
    },
    {
      title: 'Distanz (km)',
      dataIndex: 'total_distance_m',
      key: 'total_distance_m',
      render: (value: number) => value ? (value / 1000).toFixed(2) : 'N/A',
    },
    {
      title: 'Erstellt',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm'),
    },
    {
      title: 'Aktionen',
      key: 'actions',
      render: (_: any, record: SimulationSession) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => showSessionDetails(record)}
          >
            Details
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <Card
        title="Simulation Verlauf"
        extra={
          <Button onClick={loadSessions} loading={loading}>
            Aktualisieren
          </Button>
        }
      >
        <Table
          dataSource={sessions}
          columns={columns}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} von ${total} Sessions`,
          }}
        />
      </Card>

      <Modal
        title="Session Details"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Schließen
          </Button>,
        ]}
        width={800}
      >
        {selectedSession && (
          <div>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text strong>Name: </Text>
                <Text>{selectedSession.name}</Text>
              </div>
              
              <div>
                <Text strong>Beschreibung: </Text>
                <Text>{selectedSession.description || 'Keine Beschreibung'}</Text>
              </div>
              
              <div>
                <Text strong>Fahrzeugtyp: </Text>
                <Text>{selectedSession.vehicle_type || 'Nicht verfügbar'}</Text>
              </div>
              
              <div>
                <Text strong>Erstellt: </Text>
                <Text>{dayjs(selectedSession.created_at).format('DD.MM.YYYY HH:mm:ss')}</Text>
              </div>
              
              {selectedSession.total_energy_wh && (
                <div>
                  <Text strong>Gesamtenergie: </Text>
                  <Text>{selectedSession.total_energy_wh.toFixed(2)} Wh</Text>
                </div>
              )}
              
              {selectedSession.total_distance_m && (
                <div>
                  <Text strong>Gesamtdistanz: </Text>
                  <Text>{(selectedSession.total_distance_m / 1000).toFixed(2)} km</Text>
                </div>
              )}
              
              {selectedSession.total_time_s && (
                <div>
                  <Text strong>Gesamtzeit: </Text>
                  <Text>{(selectedSession.total_time_s / 60).toFixed(1)} Minuten</Text>
                </div>
              )}
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SessionHistory;
