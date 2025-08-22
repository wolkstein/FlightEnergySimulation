import React from 'react';
import { Form, InputNumber, Row, Col, Typography, Tooltip, Button, Select } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { VehicleConfig, VehicleType, FrameType, MotorConfiguration, VTOLConfiguration } from '../types/simulation';

const { Text } = Typography;
const { Option } = Select;

interface VehicleConfigFormProps {
  config: VehicleConfig;
  vehicleType: VehicleType;
  onChange: (config: VehicleConfig) => void;
}

const VehicleConfigForm: React.FC<VehicleConfigFormProps> = ({
  config,
  vehicleType,
  onChange,
}) => {
  const [form] = Form.useForm();

  const handleFieldChange = (field: keyof VehicleConfig, value: number | string) => {
    const newConfig = { ...config, [field]: value };
    onChange(newConfig);
  };

  // Info-Tooltips für verschiedene Parameter
  const infoTooltips = {
    mass: "Gesamtmasse des Fahrzeugs inkl. Batterie und Nutzlast. Typisch: Multirotor 1-30kg, VTOL 2-30kg, Plane 1-30kg",
    max_power: "Maximale elektrische Leistung aller Motoren zusammen. Typisch: Multirotor 500-40000W, VTOL 800-40000W, Plane 300-8000W",
    hover_power: "Leistung zum Schweben (nur für Multirotor/VTOL). Typisch: 25-55% der Maximaleistung",
    cruise_power: "Leistung im Reiseflug (für VTOL/Plane). Typisch: 20-40% der Maximaleistung",
    forward_thrust_power: "Leistung des Vortriebsmotors (nur für VTOL). Separat von Hover-Motoren. Typisch: 300-6000W",
    cruise_speed: "Normale Reisegeschwindigkeit für optimalen Energieverbrauch. Typisch: Multirotor 8-17m/s, VTOL 12-33m/s, Plane 15-35m/s",
    max_speed: "Maximale Fluggeschwindigkeit. Typisch: Multirotor 10-25m/s, VTOL 15-40m/s, Plane 20-50m/s",
    max_climb_rate: "Maximale Steiggeschwindigkeit. Typisch: 2-10m/s je nach Fahrzeugtyp und Leistung",
    max_descent_speed: "Maximale Sinkgeschwindigkeit (kontrolliert). Typisch: 2-8m/s, meist etwas geringer als Steigrate",
    horizontal_acceleration: "Horizontale Beschleunigung/Verzögerung. Typisch: Multirotor 2-8m/s², VTOL 1-5m/s², Plane 1-4m/s²",
    vertical_acceleration: "Vertikale Beschleunigung beim Steigen/Sinken. Typisch: 1-5m/s² je nach Leistungsüberschuss",
    stall_speed: "Mindestfluggeschwindigkeit (nur für Plane). Geschwindigkeit unter der das Flugzeug abschmiert. Typisch: 8-20m/s",
    battery_capacity: "Batteriekapazität in mAh. Typisch: 5000-80000mAh je nach Fahrzeugklasse",
    battery_voltage: "Nennspannung der Batterie. Typisch: 11.1V (3S), 14.8V (4S), 22.2V (6S), 44.4V (12S)",
    drag_coefficient: "Widerstandsbeiwert (cD-Wert). Typisch: Multirotor 0.02-0.05, VTOL 0.03-0.08, Plane 0.02-0.04",
    wing_area: "Flügelfläche in m². Typisch: VTOL 0.3-3m², Plane 0.2-3m²",
    rotor_diameter: "Durchmesser eines Rotors in Metern. Typisch: 0.2-0.8m je nach Fahrzeuggröße",
    frame_type: "Anzahl der Arme: Tri (3), Quad (4), Hexa (6), Octo (8). Bestimmt Motoranzahl und Redundanz",
    motor_config: "Single: Ein Motor pro Arm. Coaxial: Zwei gegenläufige Motoren pro Arm für mehr Schub",
    vtol_config: "VTOL Konfiguration: Quad-Plane (feste Hover-Motoren + Vortrieb), Tilt-Rotor (Motoren kippen)",
    motor_efficiency: "Wirkungsgrad der Motoren (0-1). Typisch: 0.80-0.90 für bürstenlose Motoren",
    propeller_efficiency: "Wirkungsgrad der Propeller (0-1). Typisch: 0.70-0.85 je nach Design und Drehzahl",
    transmission_efficiency: "Wirkungsgrad der Kraftübertragung (0-1). Typisch: 0.90-0.98 für Direktantrieb"
  };

  // Hilfsfunktion für Label mit Info-Button
  const createInfoLabel = (text: string, infoKey: keyof typeof infoTooltips) => (
    <div className="flex-center">
      <Tooltip 
        title={infoTooltips[infoKey]} 
        placement="topLeft" 
        overlayStyle={{ maxWidth: '300px' }}
      >
        <Button 
          type="text" 
          icon={<InfoCircleOutlined />} 
          size="small" 
          style={{ 
            padding: '0', 
            minWidth: 'auto', 
            height: 'auto',
            color: '#1890ff',
            fontSize: '14px'
          }}
        />
      </Tooltip>
      <span>{text}</span>
    </div>
  );

  return (
    <Form form={form} layout="vertical" className="vehicle-config-form">
      <Row gutter={[16, 0]}>
        <Col xs={24} sm={12}>
          <Form.Item label={createInfoLabel("Masse (kg)", "mass")}>
            <InputNumber
              value={config.mass}
              onChange={(value) => handleFieldChange('mass', value || 0)}
              min={0.1}
              max={50}
              step={0.1}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>

        <Col xs={24} sm={12}>
          <Form.Item label={createInfoLabel("Max. Leistung (W)", "max_power")}>
            <InputNumber
              value={config.max_power}
              onChange={(value) => handleFieldChange('max_power', value || 0)}
              min={100}
              max={40000}
              step={50}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>

        {(vehicleType === 'multirotor' || vehicleType === 'vtol') && (
          <Col xs={24} sm={12}>
            <Form.Item label={createInfoLabel("Schwebelleistung (W)", "hover_power")}>
              <InputNumber
                value={config.hover_power}
                onChange={(value) => handleFieldChange('hover_power', value || 0)}
                min={50}
                max={10000}
                step={25}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        )}

        {(vehicleType === 'vtol' || vehicleType === 'plane') && (
          <Col xs={24} sm={12}>
            <Form.Item label={createInfoLabel("Reiseleistung (W)", "cruise_power")}>
              <InputNumber
                value={config.cruise_power}
                onChange={(value) => handleFieldChange('cruise_power', value || 0)}
                min={50}
                max={10000}
                step={25}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        )}

        {vehicleType === 'vtol' && (
          <Col xs={24} sm={12}>
            <Form.Item label={createInfoLabel("Vortriebsleistung (W)", "forward_thrust_power")}>
              <InputNumber
                value={config.forward_thrust_power}
                onChange={(value) => handleFieldChange('forward_thrust_power', value || 0)}
                min={100}
                max={10000}
                step={25}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        )}

        <Col xs={24} sm={12}>
          <Form.Item label={createInfoLabel("Reisegeschwindigkeit (m/s)", "cruise_speed")}>
            <InputNumber
              value={config.cruise_speed}
              onChange={(value) => handleFieldChange('cruise_speed', value || 0)}
              min={3}
              max={60}
              step={1}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>

        <Col xs={24} sm={12}>
          <Form.Item label={createInfoLabel("Max. Geschwindigkeit (m/s)", "max_speed")}>
            <InputNumber
              value={config.max_speed}
              onChange={(value) => handleFieldChange('max_speed', value || 0)}
              min={5}
              max={100}
              step={1}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>

        <Col xs={24} sm={12}>
          <Form.Item label={createInfoLabel("Max. Steigrate (m/s)", "max_climb_rate")}>
            <InputNumber
              value={config.max_climb_rate}
              onChange={(value) => handleFieldChange('max_climb_rate', value || 0)}
              min={1}
              max={40}
              step={0.5}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>

        <Col xs={24} sm={12}>
          <Form.Item label={createInfoLabel("Max. Sinkrate (m/s)", "max_descent_speed")}>
            <InputNumber
              value={config.max_descent_speed}
              onChange={(value) => handleFieldChange('max_descent_speed', value || 0)}
              min={1}
              max={15}
              step={0.5}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>

        <Col xs={24} sm={12}>
          <Form.Item label={createInfoLabel("Horizontale Beschleunigung (m/s²)", "horizontal_acceleration")}>
            <InputNumber
              value={config.horizontal_acceleration}
              onChange={(value) => handleFieldChange('horizontal_acceleration', value || 0)}
              min={0.5}
              max={12}
              step={0.5}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>

        <Col xs={24} sm={12}>
          <Form.Item label={createInfoLabel("Vertikale Beschleunigung (m/s²)", "vertical_acceleration")}>
            <InputNumber
              value={config.vertical_acceleration}
              onChange={(value) => handleFieldChange('vertical_acceleration', value || 0)}
              min={0.5}
              max={10}
              step={0.5}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>

        <Col xs={24} sm={12}>
          <Form.Item label={createInfoLabel("Batteriekapazität (mAh)", "battery_capacity")}>
            <InputNumber
              value={config.battery_capacity}
              onChange={(value) => handleFieldChange('battery_capacity', value || 0)}
              min={1000}
              max={500000}
              step={100}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>

        <Col xs={24} sm={12}>
          <Form.Item label={createInfoLabel("Batteriespannung (V)", "battery_voltage")}>
            <InputNumber
              value={config.battery_voltage}
              onChange={(value) => handleFieldChange('battery_voltage', value || 0)}
              min={12}
              max={150}
              step={0.1}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>

        {vehicleType === 'plane' && (
          <Col xs={24} sm={12}>
            <Form.Item label={createInfoLabel("Überziehgeschwindigkeit (m/s)", "stall_speed")}>
              <InputNumber
                value={config.stall_speed}
                onChange={(value) => handleFieldChange('stall_speed', value || 0)}
                min={8}
                max={35}
                step={0.5}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        )}

        <Col xs={24} sm={12}>
          <Form.Item label={createInfoLabel("Widerstandsbeiwert", "drag_coefficient")}>
            <InputNumber
              value={config.drag_coefficient}
              onChange={(value) => handleFieldChange('drag_coefficient', value || 0)}
              min={0.01}
              max={1.0}
              step={0.001}
              precision={3}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>

        {(vehicleType === 'plane' || vehicleType === 'vtol') && (
          <Col xs={24} sm={12}>
            <Form.Item label={createInfoLabel("Flügelfläche (m²)", "wing_area")}>
              <InputNumber
                value={config.wing_area}
                onChange={(value) => handleFieldChange('wing_area', value || 0)}
                min={0.1}
                max={2}
                step={0.1}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        )}

        {(vehicleType === 'multirotor' || vehicleType === 'vtol') && (
          <>
            <Col xs={24} sm={12}>
              <Form.Item label={createInfoLabel("Rotordurchmesser (m)", "rotor_diameter")}>
                <InputNumber
                  value={config.rotor_diameter}
                  onChange={(value) => handleFieldChange('rotor_diameter', value || 0)}
                  min={0.1}
                  max={1}
                  step={0.01}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            {(vehicleType === 'multirotor' || vehicleType === 'vtol') && (
              <>
                <Col xs={24} sm={12}>
                  <Form.Item label={createInfoLabel("Frame-Typ", "frame_type")}>
                    <Select
                      value={config.frame_type}
                      onChange={(value) => handleFieldChange('frame_type', value)}
                      style={{ width: '100%' }}
                    >
                      <Option value="tri">Tri-Copter (3 Arme)</Option>
                      <Option value="quad">Quad-Copter (4 Arme)</Option>
                      <Option value="hexa">Hexa-Copter (6 Arme)</Option>
                      <Option value="octo">Octo-Copter (8 Arme)</Option>
                    </Select>
                  </Form.Item>
                </Col>
                
                <Col xs={24} sm={12}>
                  <Form.Item label={createInfoLabel("Motor-Konfiguration", "motor_config")}>
                    <Select
                      value={config.motor_config}
                      onChange={(value) => handleFieldChange('motor_config', value)}
                      style={{ width: '100%' }}
                    >
                      <Option value="single">Single (1 Motor/Arm)</Option>
                      <Option value="coaxial">Coaxial (2 Motoren/Arm)</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </>
            )}
            
            {vehicleType === 'vtol' && (
              <Col xs={24} sm={12}>
                <Form.Item label={createInfoLabel("VTOL-Konfiguration", "vtol_config")}>
                  <Select
                    value={config.vtol_config}
                    onChange={(value) => handleFieldChange('vtol_config', value)}
                    style={{ width: '100%' }}
                  >
                    <Option value="quad_plane">Quad-Plane (Hover + Forward)</Option>
                    <Option value="tilt_rotor">Tilt-Rotor (Motoren kippen)</Option>
                    <Option value="tilt_wing">Tilt-Wing (Flügel kippen)</Option>
                    <Option value="tail_sitter">Tail-Sitter (Heck-Starter)</Option>
                  </Select>
                </Form.Item>
              </Col>
            )}
          </>
        )}
      </Row>
    </Form>
  );
};

export default VehicleConfigForm;
