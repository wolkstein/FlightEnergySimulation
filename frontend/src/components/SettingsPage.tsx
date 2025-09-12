import React, { useEffect, useState } from 'react';
import { Card, Input, InputNumber, Row, Col, Alert, Typography, message } from 'antd';
import { ElevationSettings } from '../types/simulation';
import { settingsApi } from '../services/api';

const { Title, Text } = Typography;

interface SettingsPageProps {
  elevationSettings: ElevationSettings;
  onElevationSettingsChange: (settings: ElevationSettings) => void;
  isLoggedIn: boolean;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ 
  elevationSettings, 
  onElevationSettingsChange,
  isLoggedIn
}) => {
  const [loading, setLoading] = useState(false);
  
  // Load settings from backend when component mounts
  useEffect(() => {
    if (isLoggedIn) {
      loadUserSettings();
    }
  }, [isLoggedIn]);
  
  const loadUserSettings = async () => {
    try {
      setLoading(true);
      const settings = await settingsApi.getElevationSettings();
      onElevationSettingsChange(settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      message.error('Fehler beim Laden der Einstellungen');
    } finally {
      setLoading(false);
    }
  };
  
  const updateSetting = async (field: keyof ElevationSettings, value: any) => {
    if (!isLoggedIn) {
      // Offline mode - nur lokaler State
      onElevationSettingsChange({
        ...elevationSettings,
        [field]: value
      });
      return;
    }
    
    try {
      const updatedSettings = await settingsApi.updateElevationSettings({
        [field]: value
      });
      onElevationSettingsChange(updatedSettings);
      message.success('Einstellungen gespeichert');
    } catch (error) {
      console.error('Failed to update settings:', error);
      message.error('Fehler beim Speichern der Einstellungen');
    }
  };
  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>⚙️ Einstellungen</Title>
      
      <Card 
        title="🏔️ Höhenprofil-Einstellungen" 
        loading={loading}
        extra={
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {isLoggedIn ? '💾 Auto-Save aktiviert' : '⚠️ Nur Session-persistent'}
          </Text>
        }
        style={{ marginBottom: 24 }}
      >
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Text strong>OpenTopo Server URL:</Text>
            <Input 
              placeholder="z.B. 192.168.71.250:5000"
              value={elevationSettings.opentopo_server}
              onChange={(e) => updateSetting('opentopo_server', e.target.value)}
              style={{ marginTop: 4 }}
              disabled={loading}
            />
            <div style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Server für präzise Terrain-Höhendaten (opentopodata.org)
              </Text>
            </div>
          </Col>
          
          <Col span={12}>
            <Text strong>Dataset:</Text>
            <Input 
              placeholder="eudem25m"
              value={elevationSettings.dataset}
              onChange={(e) => updateSetting('dataset', e.target.value)}
              style={{ marginTop: 4 }}
            />
            <div style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                EU-DEM 25m Auflösung für Europa
              </Text>
            </div>
          </Col>
          
          <Col span={12}>
            <Text strong>Sicherheitsabstand:</Text>
            <InputNumber 
              placeholder="30"
              value={elevationSettings.safety_margin_m}
              onChange={(value) => updateSetting('safety_margin_m', value || 30)}
              min={10}
              max={200}
              suffix="m AGL"
              style={{ width: '100%', marginTop: 4 }}
            />
            <div style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Mindestabstand zwischen Flughöhe und Terrain
              </Text>
            </div>
          </Col>
        </Row>
      </Card>
      
      <Card title="🔧 Weitere Einstellungen" style={{ marginBottom: 24 }}>
        <Alert
          message="Zukünftige Features"
          description="Weitere Anwendungseinstellungen werden in kommenden Versionen verfügbar sein."
          type="info"
          showIcon
        />
      </Card>
    </div>
  );
};

export default SettingsPage;