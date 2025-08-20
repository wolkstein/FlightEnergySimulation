import React, { useState, useEffect } from 'react';
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
} from 'antd';
import { PlusOutlined, DeleteOutlined, PlayCircleOutlined, ImportOutlined } from '@ant-design/icons';
import WaypointMap from './WaypointMap';
import VehicleConfigForm from './VehicleConfigForm';
import MissionImportComponent from './MissionImportComponent';
import { VehicleInfo, VehicleType, VehicleConfig, Waypoint, SimulationRequest, SimulationResult } from '../types/simulation';
import { apiService } from '../services/api';

const { Title, Text } = Typography;
const { Option } = Select;

interface SimulationFormProps {
  onSimulationComplete: (result: SimulationResult) => void;
  onSimulationError: (error: string) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const SimulationForm: React.FC<SimulationFormProps> = ({
  onSimulationComplete,
  onSimulationError,
  loading,
  setLoading,
}) => {
  const [form] = Form.useForm();
  const [vehicleTypes, setVehicleTypes] = useState<VehicleInfo[]>([]);
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType>('quadcopter');
  const [vehicleConfig, setVehicleConfig] = useState<VehicleConfig | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([
    { latitude: 48.1351, longitude: 11.5820, altitude: 50 }, // München
    { latitude: 48.1451, longitude: 11.5920, altitude: 100 },
  ]);
  const [windConsideration, setWindConsideration] = useState(true);
  const [showMissionImport, setShowMissionImport] = useState(false);
  const [showWindVectors, setShowWindVectors] = useState(false);
  const [missionStartTime, setMissionStartTime] = useState<string>('');
  const [flightDuration, setFlightDuration] = useState<number>(1.0);

  useEffect(() => {
    loadVehicleTypes();
  }, []);

  useEffect(() => {
    if (vehicleTypes.length > 0) {
      const selectedVehicle = vehicleTypes.find(v => v.type === selectedVehicleType);
      if (selectedVehicle) {
        setVehicleConfig(selectedVehicle.default_params);
        form.setFieldsValue({
          vehicle_type: selectedVehicleType,
          ...selectedVehicle.default_params,
        });
      }
    }
  }, [selectedVehicleType, vehicleTypes, form]);

  const loadVehicleTypes = async () => {
    try {
      const vehicles = await apiService.getVehicleTypes();
      setVehicleTypes(vehicles);
      if (vehicles.length > 0) {
        setVehicleConfig(vehicles[0].default_params);
      }
    } catch (error) {
      message.error('Fehler beim Laden der Fahrzeugtypen');
      console.error('Error loading vehicle types:', error);
    }
  };

  const handleVehicleTypeChange = (vehicleType: VehicleType) => {
    setSelectedVehicleType(vehicleType);
  };

  const handleVehicleConfigChange = (config: VehicleConfig) => {
    setVehicleConfig(config);
  };

  const handleWaypointsChange = (newWaypoints: Waypoint[]) => {
    setWaypoints(newWaypoints);
  };

  const handleWaypointsImported = (importedWaypoints: Waypoint[]) => {
    setWaypoints(importedWaypoints);
    message.success(`${importedWaypoints.length} Waypoints erfolgreich importiert`);
  };

  const handleShowMissionImport = () => {
    setShowMissionImport(true);
  };

  const handleCloseMissionImport = () => {
    setShowMissionImport(false);
  };

  const addWaypoint = () => {
    const lastWaypoint = waypoints[waypoints.length - 1];
    const newWaypoint: Waypoint = {
      latitude: lastWaypoint.latitude + 0.001,
      longitude: lastWaypoint.longitude + 0.001,
      altitude: lastWaypoint.altitude,
    };
    setWaypoints([...waypoints, newWaypoint]);
  };

  const removeWaypoint = (index: number) => {
    if (waypoints.length > 2) {
      const newWaypoints = waypoints.filter((_, i) => i !== index);
      setWaypoints(newWaypoints);
    } else {
      message.warning('Mindestens 2 Waypoints sind erforderlich');
    }
  };

  const updateWaypoint = (index: number, field: keyof Waypoint, value: number) => {
    const newWaypoints = [...waypoints];
    newWaypoints[index] = { ...newWaypoints[index], [field]: value };
    setWaypoints(newWaypoints);
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
        vehicle_type: selectedVehicleType,
        vehicle_config: vehicleConfig,
        waypoints,
        wind_consideration: windConsideration,
      };

      const result = await apiService.runSimulation(request);
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
            <Title level={4}>Fahrzeugkonfiguration</Title>
            
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

            <Divider />

            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Space>
                <Text>Windberücksichtigung:</Text>
                <Switch
                  checked={windConsideration}
                  onChange={setWindConsideration}
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
                      onChange={setShowWindVectors}
                      checkedChildren="Ein"
                      unCheckedChildren="Aus"
                    />
                  </Space>
                  
                  <Row gutter={16}>
                    <Col span={12}>
                      <Text>Missionsstart:</Text>
                      <br />
                      <InputNumber
                        style={{ width: '100%' }}
                        placeholder="Stunden von jetzt"
                        min={0}
                        max={168} // 1 Woche
                        value={missionStartTime ? parseFloat(missionStartTime) : 0}
                        onChange={(value) => setMissionStartTime(value?.toString() || '0')}
                        addonAfter="h"
                      />
                    </Col>
                    <Col span={12}>
                      <Text>Flugdauer (Schätzung):</Text>
                      <br />
                      <InputNumber
                        style={{ width: '100%' }}
                        min={0.1}
                        max={24}
                        step={0.1}
                        value={flightDuration}
                        onChange={(value) => setFlightDuration(value || 1.0)}
                        addonAfter="h"
                      />
                    </Col>
                  </Row>
                </>
              )}
            </Space>
          </Col>

          <Col xs={24} lg={12}>
            <Title level={4}>Wegpunktplanung</Title>
            
            <WaypointMap
              waypoints={waypoints}
              onChange={handleWaypointsChange}
              height="400px"
              showWindVectors={showWindVectors && windConsideration}
              missionStartTime={missionStartTime ? new Date(Date.now() + parseFloat(missionStartTime) * 3600000).toISOString() : undefined}
              flightDuration={flightDuration}
            />

            <div style={{ marginTop: 16 }}>
              <Space style={{ marginBottom: 16 }}>
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

              <div className="waypoint-list" style={{ maxHeight: 200, overflowY: 'auto' }}>
                {waypoints.map((waypoint, index) => (
                  <Card
                    key={index}
                    size="small"
                    title={`Wegpunkt ${index + 1}`}
                    extra={
                      waypoints.length > 2 && (
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => removeWaypoint(index)}
                        />
                      )
                    }
                    style={{ marginBottom: 8 }}
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
                          style={{ width: '100%' }}
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
                          style={{ width: '100%' }}
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
                          style={{ width: '100%' }}
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

        <div style={{ textAlign: 'center' }}>
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
        </div>
      </Card>

      <MissionImportComponent
        visible={showMissionImport}
        onClose={handleCloseMissionImport}
        onWaypointsImported={handleWaypointsImported}
      />
    </div>
  );
};

export default SimulationForm;
