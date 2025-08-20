import React from 'react';
import { Form, InputNumber, Row, Col, Typography, Tooltip, Button } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { VehicleConfig, VehicleType } from '../types/simulation';

const { Text } = Typography;

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

  const handleFieldChange = (field: keyof VehicleConfig, value: number) => {
    const newConfig = { ...config, [field]: value };
    onChange(newConfig);
  };

  // Info-Tooltips für verschiedene Parameter
  const infoTooltips = {
    mass: "Gesamtmasse des Fahrzeugs inkl. Batterie und Nutzlast. Typisch: Quadcopter 1-5kg, VTOL 2-10kg, Plane 1-8kg",
    max_power: "Maximale elektrische Leistung aller Motoren zusammen. Typisch: Quadcopter 500-2000W, VTOL 800-3000W, Plane 300-1500W",
    hover_power: "Leistung zum Schweben (nur für Quadcopter/VTOL). Typisch: 50-70% der Maximaleistung",
    cruise_power: "Leistung im Reiseflug (für VTOL/Plane). Typisch: 20-40% der Maximaleistung",
    max_speed: "Maximale Fluggeschwindigkeit. Typisch: Quadcopter 10-25m/s, VTOL 15-40m/s, Plane 20-50m/s",
    max_climb_rate: "Maximale Steiggeschwindigkeit. Typisch: 2-10m/s je nach Fahrzeugtyp und Leistung",
    stall_speed: "Mindestfluggeschwindigkeit (nur für Plane). Geschwindigkeit unter der das Flugzeug abschmiert. Typisch: 8-20m/s",
    battery_capacity: "Batteriekapazität in mAh. Typisch: 5000-22000mAh je nach Fahrzeugklasse",
    battery_voltage: "Nennspannung der Batterie. Typisch: 11.1V (3S), 14.8V (4S), 22.2V (6S), 44.4V (12S)",
    drag_coefficient: "Widerstandsbeiwert (cD-Wert). Typisch: Quadcopter 0.02-0.05, VTOL 0.03-0.08, Plane 0.02-0.04",
    wing_area: "Flügelfläche in m². Typisch: VTOL 0.3-1.2m², Plane 0.2-0.8m²",
    rotor_diameter: "Durchmesser eines Rotors in Metern. Typisch: 0.2-0.6m je nach Fahrzeuggröße",
    rotor_count: "Anzahl der Rotoren. Typisch: Quadcopter 4, Hexacopter 6, Octocopter 8",
    motor_efficiency: "Wirkungsgrad der Motoren (0-1). Typisch: 0.80-0.90 für bürstenlose Motoren",
    propeller_efficiency: "Wirkungsgrad der Propeller (0-1). Typisch: 0.70-0.85 je nach Design und Drehzahl",
    transmission_efficiency: "Wirkungsgrad der Kraftübertragung (0-1). Typisch: 0.90-0.98 für Direktantrieb"
  };

  // Hilfsfunktion für Label mit Info-Button
  const createInfoLabel = (text: string, infoKey: keyof typeof infoTooltips) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              max={5000}
              step={50}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>

        {(vehicleType === 'quadcopter' || vehicleType === 'vtol') && (
          <Col xs={24} sm={12}>
            <Form.Item label={createInfoLabel("Schwebelleistung (W)", "hover_power")}>
              <InputNumber
                value={config.hover_power}
                onChange={(value) => handleFieldChange('hover_power', value || 0)}
                min={50}
                max={2000}
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
                max={1500}
                step={25}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        )}

        <Col xs={24} sm={12}>
          <Form.Item label={createInfoLabel("Max. Geschwindigkeit (m/s)", "max_speed")}>
            <InputNumber
              value={config.max_speed}
              onChange={(value) => handleFieldChange('max_speed', value || 0)}
              min={5}
              max={50}
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
              max={20}
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
              max={50000}
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
              max={50}
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
                max={25}
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
              max={0.1}
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

        {(vehicleType === 'quadcopter' || vehicleType === 'vtol') && (
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
            {vehicleType === 'quadcopter' && (
              <Col xs={24} sm={12}>
                <Form.Item label={createInfoLabel("Anzahl Rotoren", "rotor_count")}>
                  <InputNumber
                    value={config.rotor_count}
                    onChange={(value) => handleFieldChange('rotor_count', value || 0)}
                    min={3}
                    max={8}
                    step={1}
                    style={{ width: '100%' }}
                  />
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
