import React, { useState, useEffect, Dispatch, SetStateAction } from 'react';
import {
  Form,
  Select,
  Card,
  Row,
  Col,
  Button,
  InputNumber,
  Switch,
  Divider,
  Typography,
  message,
  Space,
  Tabs,
  Input,
} from 'antd';
import { PlusOutlined, DeleteOutlined, PlayCircleOutlined, ImportOutlined, CalculatorOutlined, SettingOutlined, DownloadOutlined } from '@ant-design/icons';
import WaypointMap from './WaypointMap';
import ElevationProfileChart from './ElevationProfileChart';
import VehicleConfigForm from './VehicleConfigForm';
import MissionImportComponent from './MissionImportComponent';
import SweetSpotAnalysis from './SweetSpotAnalysis';
import { VehicleInfo, VehicleType, VehicleConfig, Waypoint, SimulationRequest, SimulationResult, ElevationSettings } from '../types/simulation';
import { apiService } from '../services/api';

const { Title, Text } = Typography;
const { Option } = Select;

interface SimulationFormProps {
  onSimulationComplete: (result: SimulationResult) => void;
  onSimulationError: (error: string) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  persistentVehicleConfig: VehicleConfig | null;
  setPersistentVehicleConfig: (config: VehicleConfig | null) => void;
  persistentWaypoints: Waypoint[];
  setPersistentWaypoints: (waypoints: Waypoint[]) => void;
  // Elevation Settings als Props für State-Persistierung (simulation-specific)
  persistentElevationSettings: ElevationSettings;
  setPersistentElevationSettings: Dispatch<SetStateAction<ElevationSettings>>;
  // Wind-Settings als Props für State-Persistierung
  persistentWindSettings: {
    windConsideration: boolean;
    showWindVectors: boolean;
    manualWindEnabled: boolean;
    manualWindSpeed: number;
    manualWindDirection: number;
    missionStartTime: string;
    flightDuration: number;
  };
  setPersistentWindSettings: Dispatch<SetStateAction<{
    windConsideration: boolean;
    showWindVectors: boolean;
    manualWindEnabled: boolean;
    manualWindSpeed: number;
    manualWindDirection: number;
    missionStartTime: string;
    flightDuration: number;
  }>>;
}

const SimulationForm: React.FC<SimulationFormProps> = ({
  onSimulationComplete,
  onSimulationError,
  loading,
  setLoading,
  persistentVehicleConfig,
  setPersistentVehicleConfig,
  persistentWaypoints,
  setPersistentWaypoints,
  persistentElevationSettings,
  setPersistentElevationSettings,
  persistentWindSettings,
  setPersistentWindSettings,
}) => {
  const [form] = Form.useForm();
  const [vehicleTypes, setVehicleTypes] = useState<VehicleInfo[]>([]);
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType>('multirotor');
  
  // Verwende die persistenten Werte aus den Props statt lokaler State
  const vehicleConfig = persistentVehicleConfig;
  const waypoints = persistentWaypoints;
  
  // Wind-Settings aus persistenten Props verwenden statt lokaler State
  const windConsideration = persistentWindSettings.windConsideration;
  const showWindVectors = persistentWindSettings.showWindVectors;
  const manualWindEnabled = persistentWindSettings.manualWindEnabled;
  const manualWindSpeed = persistentWindSettings.manualWindSpeed;
  const manualWindDirection = persistentWindSettings.manualWindDirection;
  const missionStartTime = persistentWindSettings.missionStartTime;
  const flightDuration = persistentWindSettings.flightDuration;
  
  // Elevation Settings aus persistenten Props verwenden (simulation-specific)
  const elevationSettings = persistentElevationSettings;
  
  // Helper-Funktionen für Wind-Settings Updates mit funktionalem State-Update
  const updateWindSetting = (key: keyof typeof persistentWindSettings, value: any) => {
    console.log(`DEBUG: Updating ${String(key)} to ${value}`); // Debug-Log
    // Verwende funktionales Update um sicherzustellen, dass wir den aktuellsten State bekommen
    setPersistentWindSettings(currentSettings => {
      console.log(`DEBUG: Current settings for ${String(key)}:`, currentSettings[key], '-> New value:', value);
      const newSettings = { ...currentSettings };
      (newSettings as any)[key] = value;
      console.log(`DEBUG: New settings:`, newSettings);
      return newSettings;
    });
  };
  
  // Helper-Funktion für Elevation Settings Updates (wie updateWindSetting)
  const updateElevationSetting = (key: keyof ElevationSettings, value: any) => {
    console.log(`DEBUG: Updating elevation ${String(key)} to ${value}`);
    setPersistentElevationSettings(currentSettings => {
      console.log(`DEBUG: Current elevation settings for ${String(key)}:`, currentSettings[key], '-> New value:', value);
      const newSettings = { ...currentSettings };
      (newSettings as any)[key] = value;
      console.log(`DEBUG: New elevation settings:`, newSettings);
      return newSettings;
    });
  };
  
  // Lokale UI States (nicht persistent)
  const [showMissionImport, setShowMissionImport] = useState(false);
  
  // Tab management
  const [activeTab, setActiveTab] = useState<string>('vehicle-config');
  
  // State-Persistierung: Verhindern dass Konfiguration bei Re-Renders zurückgesetzt wird
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    loadVehicleTypes();
  }, []);

  useEffect(() => {
    // Nur beim ersten Laden die Default-Parameter setzen, nicht bei späteren Re-Renders
    if (vehicleTypes.length > 0 && !isInitialized) {
      const selectedVehicle = vehicleTypes.find(v => v.type === selectedVehicleType);
      if (selectedVehicle && !vehicleConfig) {
        setPersistentVehicleConfig(selectedVehicle.default_params);
        form.setFieldsValue({
          vehicle_type: selectedVehicleType,
          ...selectedVehicle.default_params,
        });
        setIsInitialized(true);
      }
    }
  }, [selectedVehicleType, vehicleTypes, form, isInitialized, vehicleConfig, setPersistentVehicleConfig]);

  const loadVehicleTypes = async () => {
    try {
      const vehicles = await apiService.getVehicleTypes();
      setVehicleTypes(vehicles);
      // Entfernt: Automatisches setzen der default_params - das macht jetzt der useEffect
    } catch (error) {
      message.error('Fehler beim Laden der Fahrzeugtypen');
      console.error('Error loading vehicle types:', error);
    }
  };

  const handleVehicleTypeChange = (vehicleType: VehicleType) => {
    // Nur wenn explizit ein anderer Fahrzeugtyp gewählt wird, die Config ändern
    if (vehicleType !== selectedVehicleType) {
      setSelectedVehicleType(vehicleType);
      
      // Default-Parameter nur setzen, wenn explizit gewechselt wird
      const selectedVehicle = vehicleTypes.find(v => v.type === vehicleType);
      if (selectedVehicle) {
        setPersistentVehicleConfig(selectedVehicle.default_params);
        form.setFieldsValue({
          vehicle_type: vehicleType,
          ...selectedVehicle.default_params,
        });
      }
    }
  };

  const handleVehicleConfigChange = (config: VehicleConfig) => {
    setPersistentVehicleConfig(config);
  };

  const handleWaypointsChange = (newWaypoints: Waypoint[]) => {
    setPersistentWaypoints(newWaypoints);
  };

  const handleMissionImport = (importedWaypoints: Waypoint[]) => {
    setPersistentWaypoints(importedWaypoints);
    setShowMissionImport(false);
    message.success(`${importedWaypoints.length} Wegpunkte importiert`);
  };  const handleShowMissionImport = () => {
    setShowMissionImport(true);
  };

  const handleCloseMissionImport = () => {
    setShowMissionImport(false);
  };

  const addWaypoint = () => {
    const lastWaypoint = waypoints[waypoints.length - 1];
    const newWaypoint: Waypoint = {
      latitude: lastWaypoint ? lastWaypoint.latitude + 0.001 : 48.1351,
      longitude: lastWaypoint ? lastWaypoint.longitude + 0.001 : 11.5820,
      altitude: lastWaypoint ? lastWaypoint.altitude : 50,
    };
    setPersistentWaypoints([...waypoints, newWaypoint]);
  };

  const removeWaypoint = (index: number) => {
    // Entfernung der Mindest-Wegpunkt-Beschränkung - erlaubt jetzt 0 Wegpunkte
    const newWaypoints = waypoints.filter((_, i) => i !== index);
    setPersistentWaypoints(newWaypoints);
  };

  const updateWaypoint = (index: number, field: keyof Waypoint, value: number) => {
    const newWaypoints = [...waypoints];
    newWaypoints[index] = { ...newWaypoints[index], [field]: value };
    setPersistentWaypoints(newWaypoints);
  };

  // KML Export Funktion von ElevationProfileChart übernehmen
  const exportKML = () => {
    if (waypoints.length < 2) return;
    
    // Vereinfachter KML Export für Waypoints
    const kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Flugroute Waypoints</name>
    <description>Geplante Flugroute mit ${waypoints.length} Wegpunkten</description>
    ${waypoints.map((wp, i) => `
    <Placemark>
      <name>Wegpunkt ${i + 1}</name>
      <description>Lat: ${wp.latitude.toFixed(6)}°, Lon: ${wp.longitude.toFixed(6)}°, Alt: ${wp.altitude}m</description>
      <Point>
        <coordinates>${wp.longitude},${wp.latitude},${wp.altitude}</coordinates>
      </Point>
    </Placemark>`).join('')}
  </Document>
</kml>`;

    const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flugroute_waypoints_${new Date().toISOString().slice(0, 16)}.kml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const runSimulation = async () => {
    if (!vehicleConfig) {
      message.error('Fahrzeugkonfiguration fehlt');
      return;
    }

    if (waypoints.length < 2) {
      message.error('Mindestens 2 Waypoints sind erforderlich');
      return;
    }

    setLoading(true);

    try {
      const request: SimulationRequest = {
        vehicle_config: persistentVehicleConfig,
        waypoints: persistentWaypoints,
        wind_settings: {
          wind_consideration: persistentWindSettings.windConsideration,
          manual_wind_enabled: persistentWindSettings.manualWindEnabled,
          manual_wind_speed_ms: persistentWindSettings.manualWindSpeed,
          manual_wind_direction_deg: persistentWindSettings.manualWindDirection,
        },
        elevation_settings: persistentElevationSettings,
      };      const result = await apiService.runSimulation(request);
      onSimulationComplete(result);
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Unbekannter Fehler';
      onSimulationError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="simulation-container">
      <Card title="Flugenergiesimulation" className="simulation-form">
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <Title level={4}>Fahrzeugkonfiguration & Analyse</Title>
            
            <Tabs 
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                {
                  key: 'vehicle-config',
                  label: (
                    <span>
                      <SettingOutlined />
                      Konfiguration
                    </span>
                  ),
                  children: (
                    <>
                      <Form form={form} layout="vertical">
                        <Form.Item label="Fahrzeugtyp" name="vehicle_type">
                          <Select
                            value={selectedVehicleType}
                            onChange={handleVehicleTypeChange}
                            size="large"
                          >
                            {vehicleTypes.map((vehicle) => (
                              <Option key={vehicle.type} value={vehicle.type}>
                                {vehicle.name} - {vehicle.description}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Form>

                      {vehicleConfig && (
                        <VehicleConfigForm
                          config={vehicleConfig}
                          vehicleType={selectedVehicleType}
                          onChange={handleVehicleConfigChange}
                        />
                      )}
                    </>
                  ),
                },
                {
                  key: 'sweet-spot',
                  label: (
                    <span>
                      <CalculatorOutlined />
                      Sweet Spot
                    </span>
                  ),
                  children: (
                    <SweetSpotAnalysis
                      vehicleConfig={vehicleConfig}
                      vehicleType={selectedVehicleType}
                    />
                  ),
                },
              ]}
            />

            <Divider />

            <Space direction="vertical" size="middle" className="space-full-width">
              <Space>
                <Text>Windberücksichtigung:</Text>
                <Switch
                  checked={windConsideration}
                  onChange={(checked) => updateWindSetting('windConsideration', checked)}
                  checkedChildren="Ein"
                  unCheckedChildren="Aus"
                />
              </Space>
              
              {windConsideration && (
                <>
                  <Space>
                    <Text>Windvektoren anzeigen:</Text>
                    <Switch
                      checked={showWindVectors}
                      onChange={(checked) => updateWindSetting('showWindVectors', checked)}
                      checkedChildren="Ein"
                      unCheckedChildren="Aus"
                    />
                  </Space>

                  <Space>
                    <Text>Manueller Wind (Feldtests):</Text>
                    <Switch
                      checked={manualWindEnabled}
                      onChange={(checked) => {
                        updateWindSetting('manualWindEnabled', checked);
                        if (checked) {
                          updateWindSetting('showWindVectors', true); // Automatisch Windvektoren anzeigen bei manuellem Wind
                        }
                      }}
                      checkedChildren="Ein"
                      unCheckedChildren="Aus"
                    />
                  </Space>

                  {manualWindEnabled && (
                    <Row gutter={16}>
                      <Col span={12}>
                        <Text>Windgeschwindigkeit:</Text>
                        <br />
                        <InputNumber
                          className="full-width"
                          min={0}
                          max={50}
                          step={0.5}
                          value={manualWindSpeed}
                          onChange={(value) => updateWindSetting('manualWindSpeed', value || 0)}
                          addonAfter="m/s"
                          placeholder="z.B. 5.0"
                        />
                      </Col>
                      <Col span={12}>
                        <Text>Windrichtung:</Text>
                        <br />
                        <InputNumber
                          className="full-width"
                          min={0}
                          max={359}
                          step={15}
                          value={manualWindDirection}
                          onChange={(value) => updateWindSetting('manualWindDirection', value || 0)}
                          addonAfter="°"
                          placeholder="270° = West"
                        />
                      </Col>
                    </Row>
                  )}

                  {!manualWindEnabled && (
                    <Row gutter={16}>
                      <Col span={12}>
                        <Text>Missionsstart:</Text>
                        <br />
                        <InputNumber
                          className="full-width"
                          placeholder="Stunden von jetzt"
                          min={0}
                          max={168} // 1 Woche
                          value={missionStartTime ? parseFloat(missionStartTime) : 0}
                          onChange={(value) => updateWindSetting('missionStartTime', value?.toString() || '0')}
                          addonAfter="h"
                        />
                      </Col>
                      <Col span={12}>
                        <Text>Flugdauer (Schätzung):</Text>
                        <br />
                        <InputNumber
                          className="full-width"
                          min={0.1}
                          max={24}
                          step={0.1}
                          value={flightDuration}
                          onChange={(value) => updateWindSetting('flightDuration', value || 1.0)}
                          addonAfter="h"
                        />
                      </Col>
                    </Row>
                  )}
                </>
              )}
            </Space>
            
            <Divider />
            
            <Space direction="vertical" size="middle" className="space-full-width">
              <Text strong>🏔️ Höhenprofil-Einstellungen</Text>
              
              <Space>
                <Text>OpenTopo Server:</Text>
                <Input 
                  placeholder="z.B. 192.168.71.250:5000"
                  value={elevationSettings.opentopo_server}
                  onChange={(e) => updateElevationSetting('opentopo_server', e.target.value)}
                  style={{ width: 200 }}
                />
              </Space>
              
              <Row gutter={16}>
                <Col span={8}>
                  <Text>Dataset:</Text>
                  <br />
                  <Input 
                    placeholder="eudem25m"
                    value={elevationSettings.dataset}
                    onChange={(e) => updateElevationSetting('dataset', e.target.value)}
                    style={{ width: '100%' }}
                  />
                </Col>
                <Col span={8}>
                  <Text>Sicherheitsabstand:</Text>
                  <br />
                  <InputNumber 
                    placeholder="30"
                    value={elevationSettings.safety_margin_m}
                    onChange={(value) => updateElevationSetting('safety_margin_m', value || elevationSettings.safety_margin_m)}
                    min={10}
                    max={200}
                    suffix="m AGL"
                    style={{ width: '100%' }}
                  />
                </Col>
                <Col span={8}>
                  <Text>Interpolation:</Text>
                  <br />
                  <InputNumber 
                    placeholder="50"
                    value={elevationSettings.interpolation_distance_m}
                    onChange={(value) => updateElevationSetting('interpolation_distance_m', value || elevationSettings.interpolation_distance_m)}
                    min={10}
                    max={500}
                    suffix="m"
                    style={{ width: '100%' }}
                  />
                </Col>
              </Row>
            </Space>
          </Col>

          <Col xs={24} lg={12}>
            <Title level={4}>Wegpunktplanung</Title>
            
            <WaypointMap
              waypoints={waypoints}
              onChange={handleWaypointsChange}
              showWindVectors={showWindVectors && windConsideration}
              missionStartTime={missionStartTime ? new Date(Date.now() + parseFloat(missionStartTime) * 3600000).toISOString() : undefined}
              flightDuration={flightDuration}
              manualWindEnabled={manualWindEnabled}
              manualWindSpeed={manualWindSpeed}
              manualWindDirection={manualWindDirection}
            />

            {/* Höhenprofil direkt unter der Karte */}
            <ElevationProfileChart 
              waypoints={waypoints} 
              elevationSettings={elevationSettings}
            />

            <div className="section-spacing">
              <Space className="space-margin-bottom">
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={addWaypoint}
                >
                  Wegpunkt hinzufügen
                </Button>
                <Button
                  type="default"
                  icon={<ImportOutlined />}
                  onClick={handleShowMissionImport}
                >
                  Mission importieren
                </Button>
              </Space>

              <div className="waypoint-list">
                {waypoints.map((waypoint, index) => (
                  <Card
                    key={index}
                    size="small"
                    title={`Wegpunkt ${index + 1}`}
                    extra={
                      // Entfernung der Bedingung - Delete-Button ist immer verfügbar
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => removeWaypoint(index)}
                      />
                    }
                    className="card-margin-bottom"
                  >
                    <Row gutter={8}>
                      <Col span={8}>
                        <Text strong>Lat:</Text>
                        <br />
                        <InputNumber
                          size="small"
                          value={waypoint.latitude}
                          onChange={(value) => updateWaypoint(index, 'latitude', value || 0)}
                          precision={6}
                          step={0.001}
                          className="full-width"
                        />
                      </Col>
                      <Col span={8}>
                        <Text strong>Lng:</Text>
                        <br />
                        <InputNumber
                          size="small"
                          value={waypoint.longitude}
                          onChange={(value) => updateWaypoint(index, 'longitude', value || 0)}
                          precision={6}
                          step={0.001}
                          className="full-width"
                        />
                      </Col>
                      <Col span={8}>
                        <Text strong>Alt (m):</Text>
                        <br />
                        <InputNumber
                          size="small"
                          value={waypoint.altitude}
                          onChange={(value) => updateWaypoint(index, 'altitude', value || 0)}
                          min={0}
                          max={1000}
                          className="full-width"
                        />
                      </Col>
                    </Row>
                  </Card>
                ))}
              </div>
            </div>
          </Col>
        </Row>

        <Divider />

        <div className="text-center">
          <Space>
            <Button
              type="primary"
              size="large"
              icon={<PlayCircleOutlined />}
              onClick={runSimulation}
              loading={loading}
              disabled={!vehicleConfig || waypoints.length < 2}
            >
              {loading ? 'Simulation läuft...' : 'Simulation starten'}
            </Button>
            
            <Button
              icon={<DownloadOutlined />}
              onClick={exportKML}
              disabled={waypoints.length < 2}
              size="large"
              title="KML für Google Earth/Maps exportieren"
            >
              KML Export
            </Button>
          </Space>
          
          {waypoints.length < 2 && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Mindestens 2 Wegpunkte erforderlich für Simulation
              </Text>
            </div>
          )}
        </div>
      </Card>

      <MissionImportComponent
        visible={showMissionImport}
        onClose={handleCloseMissionImport}
        onWaypointsImported={handleMissionImport}
      />
    </div>
  );
};

export default SimulationForm;
