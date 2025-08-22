import React, { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, InputNumber, Typography, Alert, Space } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Dot } from 'recharts';
import { VehicleConfig, VehicleType } from '../types/simulation';

const { Text, Title: AntTitle } = Typography;

interface SweetSpotAnalysisProps {
  vehicleConfig: VehicleConfig | null;
  vehicleType: VehicleType;
}

interface SweetSpotCalculation {
  speed: number; // m/s
  inducedPower: number; // W
  profilePower: number; // W
  totalPower: number; // W
  powerPerKg: number; // W/kg
  isSweetSpot?: boolean; // Flag for sweet spot highlighting
}

const SweetSpotAnalysis: React.FC<SweetSpotAnalysisProps> = ({
  vehicleConfig,
  vehicleType,
}) => {
  // Physics constants
  const AIR_DENSITY = 1.225; // kg/m³ at sea level
  const GRAVITY = 9.81; // m/s²
  
  // Additional parameters for analysis
  const [airDensity, setAirDensity] = useState(1.225);
  const [altitude, setAltitude] = useState(0); // m above sea level
  const [temperature, setTemperature] = useState(15); // °C

  // Calculate air density based on altitude and temperature
  useEffect(() => {
    // Simplified atmospheric model
    const tempKelvin = temperature + 273.15;
    const standardTemp = 288.15; // K
    const standardDensity = 1.225; // kg/m³
    
    // Temperature and altitude correction
    const densityTemp = standardDensity * (tempKelvin / standardTemp);
    const densityAlt = densityTemp * Math.pow((1 - 0.0065 * altitude / standardTemp), 4.2561);
    
    setAirDensity(Math.max(0.5, densityAlt)); // Minimum density for safety
  }, [altitude, temperature]);

  // Glauert formula calculations with sweet spot detection
  const calculateSweetSpotData = useMemo((): SweetSpotCalculation[] => {
    if (!vehicleConfig || vehicleType !== 'multirotor') {
      return [];
    }

    const results: SweetSpotCalculation[] = [];
    
    // Get number of rotors
    const getRotorCount = () => {
      const baseCount = vehicleConfig.frame_type === 'tri' ? 3 :
                       vehicleConfig.frame_type === 'quad' ? 4 :
                       vehicleConfig.frame_type === 'hexa' ? 6 : 8;
      return vehicleConfig.motor_config === 'coaxial' ? baseCount * 2 : baseCount;
    };

    const rotorCount = getRotorCount();
    const rotorRadius = vehicleConfig.rotor_diameter / 2;
    const diskArea = Math.PI * Math.pow(rotorRadius, 2); // m² per rotor
    const totalWeight = vehicleConfig.mass * GRAVITY; // N
    const thrustPerRotor = totalWeight / rotorCount; // N per rotor

    // Hover power calculation (Glauert formula)
    const hoverInducedVelocity = Math.sqrt(thrustPerRotor / (2 * airDensity * diskArea));
    const hoverInducedPowerPerRotor = thrustPerRotor * hoverInducedVelocity; // W per rotor

    // Coaxial efficiency penalty (10-15% loss)
    const coaxialEfficiency = vehicleConfig.motor_config === 'coaxial' ? 0.87 : 1.0;
    
    // Speed range for analysis (0 to 30 m/s)
    for (let speed = 0; speed <= 30; speed += 0.5) {
      // Forward flight induced velocity (Glauert formula)
      const forwardInducedVelocity = hoverInducedVelocity / 
        Math.sqrt(Math.pow(speed, 2) + Math.pow(hoverInducedVelocity, 2));
      
      // Induced power in forward flight
      const forwardInducedPowerPerRotor = thrustPerRotor * forwardInducedVelocity;
      const totalInducedPower = forwardInducedPowerPerRotor * rotorCount * (1 / coaxialEfficiency);

      // Profile power (drag-related, increases with speed³)
      const profileDragCoeff = 0.012; // Typical for helicopter rotors
      const meanChordLength = rotorRadius * 0.1; // Simplified assumption
      const tipSpeed = 200; // m/s typical rotor tip speed
      const solidityRatio = 0.1; // Typical for multirotor
      
      const profilePowerPerRotor = (profileDragCoeff * airDensity * diskArea * 
        Math.pow(tipSpeed, 3) * solidityRatio) / 8;
      const totalProfilePower = profilePowerPerRotor * rotorCount;

      // Additional power for forward flight (parasitic drag)
      const parasiticDragCoeff = vehicleConfig.drag_coefficient || 0.03;
      const frontalArea = Math.pow(vehicleConfig.rotor_diameter, 2) * Math.PI / 4; // Simplified
      const parasiticPower = speed > 0 ? 
        (0.5 * airDensity * parasiticDragCoeff * frontalArea * Math.pow(speed, 3)) : 0;

      // Total power
      const totalPower = totalInducedPower + totalProfilePower + parasiticPower;
      const powerPerKg = totalPower / vehicleConfig.mass;

      results.push({
        speed,
        inducedPower: totalInducedPower,
        profilePower: totalProfilePower + parasiticPower,
        totalPower,
        powerPerKg,
      });
    }

    // Find sweet spot and mark it
    if (results.length > 0) {
      const minPowerPoint = results.reduce((min, current) => 
        current.totalPower < min.totalPower ? current : min
      );
      
      // Mark sweet spot entries
      results.forEach(point => {
        point.isSweetSpot = Math.abs(point.speed - minPowerPoint.speed) < 0.25;
      });
    }

    return results;
  }, [vehicleConfig, vehicleType, airDensity]);

  // Find sweet spot (minimum power point)
  const sweetSpot = useMemo(() => {
    if (calculateSweetSpotData.length === 0) return null;
    
    const minPowerPoint = calculateSweetSpotData.find(d => d.isSweetSpot);
    return minPowerPoint || null;
  }, [calculateSweetSpotData]);

  if (!vehicleConfig || vehicleType !== 'multirotor') {
    return (
      <Card title="Sweet Spot Analyse">
        <Alert
          message="Nur für Multirotor verfügbar"
          description="Die Sweet Spot Analyse basiert auf der Glauert-Formel und ist nur für Multirotor-Konfigurationen verfügbar."
          type="info"
          showIcon
        />
      </Card>
    );
  }

  return (
    <Card title="Sweet Spot Analyse - Minimum Power Speed">
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        
        {/* Environmental Parameters */}
        <Card size="small" title="Umgebungsbedingungen">
          <Row gutter={16}>
            <Col span={8}>
              <Text>Höhe über NN:</Text>
              <br />
              <InputNumber
                style={{ width: '100%' }}
                value={altitude}
                onChange={(value) => setAltitude(value || 0)}
                min={0}
                max={4000}
                step={100}
                addonAfter="m"
              />
            </Col>
            <Col span={8}>
              <Text>Temperatur:</Text>
              <br />
              <InputNumber
                style={{ width: '100%' }}
                value={temperature}
                onChange={(value) => setTemperature(value || 15)}
                min={-20}
                max={50}
                step={5}
                addonAfter="°C"
              />
            </Col>
            <Col span={8}>
              <Text>Luftdichte:</Text>
              <br />
              <Text code>{airDensity.toFixed(3)} kg/m³</Text>
            </Col>
          </Row>
        </Card>

        {/* Sweet Spot Results */}
        {sweetSpot && (
          <Alert
            message={`Sweet Spot gefunden: ${sweetSpot.speed} m/s`}
            description={
              <div>
                <Text>
                  <strong>Optimale Reisegeschwindigkeit:</strong> {sweetSpot.speed} m/s ({(sweetSpot.speed * 3.6).toFixed(1)} km/h)
                  <br />
                  <strong>Minimale Leistung:</strong> {sweetSpot.totalPower.toFixed(0)} W ({sweetSpot.powerPerKg.toFixed(1)} W/kg)
                  <br />
                  <strong>Effizienzgewinn:</strong> {vehicleConfig.hover_power ? 
                    ((vehicleConfig.hover_power - sweetSpot.totalPower) / vehicleConfig.hover_power * 100).toFixed(1) : '?'
                  }% gegenüber Hover
                </Text>
              </div>
            }
            type="success"
            showIcon
          />
        )}

        {/* Power vs Speed Chart */}
        <div className="chart-container-large">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={calculateSweetSpotData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="speed" 
                label={{ value: 'Geschwindigkeit (m/s)', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                label={{ value: 'Leistung (W)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `${Math.round(value)} W`,
                  name === 'totalPower' ? 'Gesamtleistung' :
                  name === 'inducedPower' ? 'Induzierte Leistung' :
                  name === 'profilePower' ? 'Profil + Parasitäre Leistung' : name
                ]}
                labelFormatter={(speed: number) => `Geschwindigkeit: ${speed} m/s (${(speed * 3.6).toFixed(1)} km/h)`}
              />
              <Legend />
              
              <Line 
                type="monotone" 
                dataKey="totalPower" 
                stroke="#2563eb" 
                strokeWidth={3}
                name="Gesamtleistung"
                dot={(props: any) => {
                  if (props.payload && props.payload.isSweetSpot) {
                    return <Dot {...props} fill="red" stroke="red" strokeWidth={2} r={6} />;
                  }
                  return <Dot {...props} fill="transparent" stroke="transparent" r={0} />;
                }}
              />
              
              <Line 
                type="monotone" 
                dataKey="inducedPower" 
                stroke="#dc2626" 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Induzierte Leistung"
                dot={false}
              />
              
              <Line 
                type="monotone" 
                dataKey="profilePower" 
                stroke="#059669" 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Profil + Parasitäre Leistung"
                dot={false}
              />
              
              {sweetSpot && (
                <ReferenceLine 
                  x={sweetSpot.speed} 
                  stroke="red" 
                  strokeDasharray="2 2"
                  label={{ value: `Sweet Spot: ${sweetSpot.speed} m/s`, position: 'top' }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Technical Details */}
        <Card size="small" title="Berechnungsgrundlage">
          <Row gutter={16}>
            <Col span={12}>
              <Text strong>Fahrzeugparameter:</Text>
              <br />
              <Text>• MTOW: {vehicleConfig.mass} kg</Text>
              <br />
              <Text>• Rotoranzahl: {
                vehicleConfig.frame_type === 'tri' ? 3 :
                vehicleConfig.frame_type === 'quad' ? 4 :
                vehicleConfig.frame_type === 'hexa' ? 6 : 8
              } {vehicleConfig.motor_config === 'coaxial' ? '× 2 (Coaxial)' : ''}</Text>
              <br />
              <Text>• Rotordurchmesser: {vehicleConfig.rotor_diameter} m</Text>
              <br />
              <Text>• Schub je Rotor: {((vehicleConfig.mass * GRAVITY) / (
                (vehicleConfig.frame_type === 'tri' ? 3 :
                 vehicleConfig.frame_type === 'quad' ? 4 :
                 vehicleConfig.frame_type === 'hexa' ? 6 : 8) * 
                (vehicleConfig.motor_config === 'coaxial' ? 2 : 1)
              )).toFixed(1)} N</Text>
            </Col>
            <Col span={12}>
              <Text strong>Glauert-Formel:</Text>
              <br />
              <Text code>v_i,hover = √(T/(2·ρ·A))</Text>
              <br />
              <Text code>v_i,forward = v_i,hover / √(V² + v_i,hover²)</Text>
              <br />
              <Text code>P_induced = T · v_i</Text>
              <br />
              <br />
              <Text type="secondary">
                {vehicleConfig.motor_config === 'coaxial' && 
                  'Coaxial-Effizienz: 87% (13% Verlust durch Rotor-Interferenz)'
                }
              </Text>
            </Col>
          </Row>
        </Card>

      </Space>
    </Card>
  );
};

export default SweetSpotAnalysis;
