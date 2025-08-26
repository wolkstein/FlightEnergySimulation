import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Typography, message, Modal, Input, Popconfirm } from 'antd';
import { EyeOutlined, DeleteOutlined, EditOutlined, RedoOutlined } from '@ant-design/icons';
import { SimulationSession, RestoreSessionData, VehicleConfig, Waypoint } from '../types/simulation';
import { apiService } from '../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface SessionHistoryProps {
  onRestoreSession?: (vehicleConfig: VehicleConfig, waypoints: Waypoint[], windSettings: any) => void;
}

const SessionHistory: React.FC<SessionHistoryProps> = ({ onRestoreSession }) => {
  const [sessions, setSessions] = useState<SimulationSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SimulationSession | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [newSessionName, setNewSessionName] = useState('');
  const [restoreLoading, setRestoreLoading] = useState<number | null>(null);

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

  const handleRestoreSession = async (sessionId: number) => {
    if (!onRestoreSession) {
      message.warning('Session-Wiederherstellung ist in diesem Kontext nicht verfügbar');
      return;
    }

    setRestoreLoading(sessionId);
    try {
      const restoredData: RestoreSessionData = await apiService.restoreSession(sessionId);
      
      // Daten an Parent-Komponente übergeben
      onRestoreSession(
        restoredData.vehicle_config,
        restoredData.waypoints,
        restoredData.wind_settings
      );

      message.success(`Session "${restoredData.session_info.name}" erfolgreich wiederhergestellt`);
    } catch (error) {
      console.error('Error restoring session:', error);
      message.error('Fehler beim Wiederherstellen der Session');
    } finally {
      setRestoreLoading(null);
    }
  };

  const handleUpdateSessionName = async (sessionId: number) => {
    if (!newSessionName.trim()) {
      message.error('Session-Name darf nicht leer sein');
      return;
    }

    try {
      await apiService.updateSessionName(sessionId, newSessionName.trim());
      message.success('Session-Name erfolgreich aktualisiert');
      setEditingSessionId(null);
      setNewSessionName('');
      loadSessions(); // Reload sessions
    } catch (error) {
      console.error('Error updating session name:', error);
      message.error('Fehler beim Aktualisieren des Session-Namens');
    }
  };

  const handleDeleteSession = async (sessionId: number) => {
    try {
      await apiService.deleteSession(sessionId);
      message.success('Session erfolgreich gelöscht');
      loadSessions(); // Reload sessions
    } catch (error) {
      console.error('Error deleting session:', error);
      message.error('Fehler beim Löschen der Session');
    }
  };

  const startEditingName = (session: SimulationSession) => {
    setEditingSessionId(session.id);
    setNewSessionName(session.name);
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: SimulationSession) => (
        editingSessionId === record.id ? (
          <Space>
            <Input
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              onPressEnter={() => handleUpdateSessionName(record.id)}
              style={{ width: 200 }}
            />
            <Button
              size="small"
              type="primary"
              onClick={() => handleUpdateSessionName(record.id)}
            >
              Speichern
            </Button>
            <Button
              size="small"
              onClick={() => setEditingSessionId(null)}
            >
              Abbrechen
            </Button>
          </Space>
        ) : (
          <Space>
            <Text>{name}</Text>
            <Button
              size="small"
              type="link"
              icon={<EditOutlined />}
              onClick={() => startEditingName(record)}
            />
          </Space>
        )
      ),
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
      title: 'Batterie (%)',
      dataIndex: 'battery_usage_percent',
      key: 'battery_usage_percent',
      render: (value: number) => value ? `${value.toFixed(1)}%` : 'N/A',
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
          {onRestoreSession && (
            <Button
              type="primary"
              icon={<RedoOutlined />}
              onClick={() => handleRestoreSession(record.id)}
              loading={restoreLoading === record.id}
              title="Session wiederherstellen"
            >
              Wiederherstellen
            </Button>
          )}
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => showSessionDetails(record)}
            title="Details anzeigen"
          >
            Details
          </Button>
          <Popconfirm
            title="Session löschen"
            description="Sind Sie sicher, dass Sie diese Session löschen möchten?"
            onConfirm={() => handleDeleteSession(record.id)}
            okText="Ja, löschen"
            cancelText="Abbrechen"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              title="Session löschen"
            >
              Löschen
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="container-centered">
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
