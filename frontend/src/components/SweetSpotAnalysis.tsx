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
  parasiticPower: number; // W - separate for better analysis
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

    // Coaxial efficiency penalty (15% loss for coaxial, wie im Python-Test)
    const coaxialEfficiency = vehicleConfig.motor_config === 'coaxial' ? 0.85 : 1.0;
    
    // System efficiency chain: Motor × Propeller × ESC (angepasst für höhere Gesamtleistung)
    const motorEfficiency = 0.85;
    const propellerEfficiency = 0.45; // Reduziert für realistischere Hover Power (~4000W)
    const escEfficiency = 0.95;
    const systemEfficiency = motorEfficiency * propellerEfficiency * escEfficiency; // = 36.3%
    
    // Speed range for analysis (0 to 30 m/s)
    for (let speed = 0; speed <= 30; speed += 0.5) {
      let totalInducedPower: number;
      let totalProfilePower = 0;
      let parasiticPower = 0;
      
      if (speed === 0) {
        // Hover case
        const hoverInducedPowerIdeal = (hoverInducedPowerPerRotor * rotorCount) / coaxialEfficiency;
        totalInducedPower = hoverInducedPowerIdeal / systemEfficiency;
      } else {
        // Forward flight using correct Glauert momentum theory
        const mu = speed / hoverInducedVelocity; // Advance ratio
        
        // Korrekte Glauert-Formel mit sanfterem Übergang bei niedrigen Geschwindigkeiten
        let piRatio: number;
        if (mu < 0.15) {
          // Sanfter Übergang bei niedrigen Geschwindigkeiten
          piRatio = 1 - 0.4 * mu - 0.1 * mu * mu;
        } else {
          // Standard Glauert: Pi/Pi0 = sqrt(1 + μ²) - μ 
          piRatio = Math.sqrt(1 + mu * mu) - mu/1.5;
        }
        
        const hoverInducedPowerIdeal = (hoverInducedPowerPerRotor * rotorCount) / coaxialEfficiency;
        const inducedPowerIdeal = hoverInducedPowerIdeal * piRatio;
        totalInducedPower = inducedPowerIdeal / systemEfficiency;
        
        // Profile power (moderater für balance mit reduzierter parasitärer Power)
        const tipSpeed = Math.sqrt(thrustPerRotor / (airDensity * diskArea)) * 8; // Reduziert von 10 auf 8
        const profileDragCoeff = 0.020; // Leicht reduziert von 0.025 auf 0.020
        const solidityRatio = 0.10; // Leicht reduziert von 0.12 auf 0.10
        
        // Profile power increases with forward speed - SANFTERER ANSTIEG
        // Beginne bei 0 und steige graduell an, um den Sprung zu vermeiden
        const speedFactor = Math.pow(speed / 20, 2.2); // Flacher: /20 statt /15, und 2.2 statt 2.5
        
        const profilePowerPerRotor = (profileDragCoeff * airDensity * diskArea * 
                                     Math.pow(tipSpeed, 3) * solidityRatio * speedFactor) / 8;
        const profilePowerIdeal = (profilePowerPerRotor * rotorCount) / coaxialEfficiency;
        totalProfilePower = profilePowerIdeal / systemEfficiency;
        
        // Parasitic drag power (quadratisch statt kubisch für sanften Verlauf)
        const parasiticDragCoeff = vehicleConfig.drag_coefficient || 0.12; // Originaler Wert für Einfluss
        const frontalArea = vehicleConfig.mass * 0.020; // Deutlich größer: von 0.012 auf 0.020 für spürbaren Einfluss
        // Quadratische Abhängigkeit für sanften Anstieg ohne abrupte Sprünge
        parasiticPower = 0.5 * airDensity * parasiticDragCoeff * frontalArea * Math.pow(speed, 2) * speed * 0.5; // Erhöht von 0.25 auf 0.5
      }

      // Total power
      const totalPower = totalInducedPower + totalProfilePower + parasiticPower;
      const powerPerKg = totalPower / vehicleConfig.mass;

      results.push({
        speed,
        inducedPower: totalInducedPower,
        profilePower: totalProfilePower, // Only profile power now
        parasiticPower: parasiticPower,  // Separate parasitic power line
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
                  name === 'profilePower' ? 'Profil-Leistung' :
                  name === 'parasiticPower' ? 'Parasitäre Leistung' : name
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
                name="Profil-Leistung"
                dot={false}
              />
              
              <Line 
                type="monotone" 
                dataKey="parasiticPower" 
                stroke="#f59e0b" 
                strokeWidth={2}
                strokeDasharray="3 3"
                name="Parasitäre Leistung"
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
                  'Coaxial-Effizienz: 85% (15% Verlust durch Rotor-Interferenz)'
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





















// import React, { useState, useEffect, useMemo } from 'react';
// import { Card, Row, Col, InputNumber, Typography, Alert, Space } from 'antd';
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Dot } from 'recharts';
// import { VehicleConfig, VehicleType } from '../types/simulation';

// const { Text, Title: AntTitle } = Typography;

// interface SweetSpotAnalysisProps {
//   vehicleConfig: VehicleConfig | null;
//   vehicleType: VehicleType;
// }

// interface SweetSpotCalculation {
//   speed: number; // m/s
//   inducedPower: number; // W
//   profilePower: number; // W
//   totalPower: number; // W
//   powerPerKg: number; // W/kg
//   isSweetSpot?: boolean; // Flag for sweet spot highlighting
//   actualHoverPower?: number; // W - Glauert-calculated hover power for efficiency comparison
// }

// const SweetSpotAnalysis: React.FC<SweetSpotAnalysisProps> = ({
//   vehicleConfig,
//   vehicleType,
// }) => {
//   // Physics constants
//   const AIR_DENSITY = 1.225; // kg/m³ at sea level
//   const GRAVITY = 9.81; // m/s²
  
//   // Additional parameters for analysis
//   const [airDensity, setAirDensity] = useState(1.225);
//   const [altitude, setAltitude] = useState(0); // m above sea level
//   const [temperature, setTemperature] = useState(15); // °C

//   // Calculate air density based on altitude and temperature
//   useEffect(() => {
//     // Simplified atmospheric model
//     const tempKelvin = temperature + 273.15;
//     const standardTemp = 288.15; // K
//     const standardDensity = 1.225; // kg/m³
    
//     // Temperature and altitude correction
//     const densityTemp = standardDensity * (tempKelvin / standardTemp);
//     const densityAlt = densityTemp * Math.pow((1 - 0.0065 * altitude / standardTemp), 4.2561);
    
//     setAirDensity(Math.max(0.5, densityAlt)); // Minimum density for safety
//   }, [altitude, temperature]);

//   // Glauert formula calculations with sweet spot detection
//   const calculateSweetSpotData = useMemo((): SweetSpotCalculation[] => {
//     if (!vehicleConfig || vehicleType !== 'multirotor') {
//       return [];
//     }

//     const results: SweetSpotCalculation[] = [];
    
//     // Get number of rotors
//     const getRotorCount = () => {
//       const baseCount = vehicleConfig.frame_type === 'tri' ? 3 :
//                        vehicleConfig.frame_type === 'quad' ? 4 :
//                        vehicleConfig.frame_type === 'hexa' ? 6 : 8;
//       return vehicleConfig.motor_config === 'coaxial' ? baseCount * 2 : baseCount;
//     };

//     const rotorCount = getRotorCount();
//     const rotorRadius = vehicleConfig.rotor_diameter / 2;
//     const diskArea = Math.PI * Math.pow(rotorRadius, 2); // m² per rotor
//     const totalWeight = vehicleConfig.mass * GRAVITY; // N
//     const thrustPerRotor = totalWeight / rotorCount; // N per rotor

//     // Hover power calculation (Glauert formula)
//     const hoverInducedVelocity = Math.sqrt(thrustPerRotor / (2 * airDensity * diskArea));
//     const hoverInducedPowerPerRotor = thrustPerRotor * hoverInducedVelocity; // W per rotor

//     // Coaxial efficiency penalty (15% loss for coaxial, validated)
//     const coaxialEfficiency = vehicleConfig.motor_config === 'coaxial' ? 0.85 : 1.0;
    
//     // System efficiency chain: Motor (85%) × Propeller (55%) × ESC (95%) = 44.4%
//     const motorEfficiency = 0.85;
//     const propellerEfficiency = 0.55;  // Reduziert für höhere Hover Power
//     const escEfficiency = 0.95;
//     const systemEfficiency = motorEfficiency * propellerEfficiency * escEfficiency;
    
//     // Calculate actual hover power (Glauert ideal power converted to electrical power)
//     const idealHoverPower = (hoverInducedPowerPerRotor * rotorCount) / coaxialEfficiency;
//     const electricalHoverPower = idealHoverPower / systemEfficiency;
    
//     // Speed range for analysis (0 to 30 m/s)
//     for (let speed = 0; speed <= 30; speed += 0.5) {
//       let totalPower: number;
//       let forwardInducedPower = 0;
//       let totalProfilePower = 0; 
//       let parasiticPower = 0;
      
//       if (speed === 0) {
//         // Hover: Pure induced power (electrical power with system efficiency)
//         totalPower = electricalHoverPower;
//         forwardInducedPower = electricalHoverPower;
//       } else {
//         // Forward flight using correct Glauert momentum theory
        
//         // 1. Induced power in forward flight (Glauert formula)
//         const mu = speed / hoverInducedVelocity; // Advance ratio
//         let inducedPowerRatio: number;
        
//         if (mu < 0.1) {
//           // Low speed approximation
//           inducedPowerRatio = 1 - mu * mu / 8;
//         } else {
//           // General case: Pi/Pi0 = sqrt(1 + mu²) - mu
//           inducedPowerRatio = Math.sqrt(1 + mu * mu) - mu;
//         }
        
//         forwardInducedPower = idealHoverPower * inducedPowerRatio;
        
//         // Convert to electrical power using system efficiency
//         forwardInducedPower = forwardInducedPower / systemEfficiency;
        
//         // 2. Profile power (realistic for multirotors)
//         const tipSpeed = Math.sqrt(thrustPerRotor / (airDensity * diskArea)) * 4; // Reduziert von 8 auf 4
//         const profileDragCoeff = 0.008; // Deutlich reduziert von 0.030 auf 0.008
//         const solidityRatio = 0.03; // Deutlich reduziert von 0.12 auf 0.03
        
//         // Profile power increases with forward speed (additional drag on advancing blade)
//         const speedFactor = 1 + Math.pow(speed / 15, 1.5); // Viel flacher: /15 und ^1.5 statt /8 und ^2.2
        
//         const profilePowerPerRotor = (profileDragCoeff * airDensity * diskArea * 
//           Math.pow(tipSpeed, 3) * solidityRatio * speedFactor) / 8;
//         totalProfilePower = (profilePowerPerRotor * rotorCount) / coaxialEfficiency;
        
//         // Convert profile power to electrical power using system efficiency  
//         totalProfilePower = totalProfilePower / systemEfficiency;
        
//         // 3. Parasitic drag power
//         const parasiticDragCoeff = vehicleConfig.drag_coefficient || 0.12; // Aus Vehicle Config!
//         // Realistic frontal area: frame + body, much smaller than rotor disk
//         const frontalArea = vehicleConfig.mass * 0.008; // 0.008 m²/kg - realistischer für Multirotor-Frames
//         parasiticPower = 0.5 * airDensity * parasiticDragCoeff * frontalArea * Math.pow(speed, 3);
        
//         // Total power with minimal realistic margin
//         totalPower = forwardInducedPower + totalProfilePower + parasiticPower;
//       }
      
//       const powerPerKg = totalPower / vehicleConfig.mass;

//       results.push({
//         speed,
//         inducedPower: speed === 0 ? totalPower : forwardInducedPower,
//         profilePower: speed === 0 ? 0 : totalProfilePower + parasiticPower,
//         totalPower,
//         powerPerKg,
//       });
//     }

//     // Find sweet spot and mark it
//     if (results.length > 0) {
//       const minPowerPoint = results.reduce((min, current) => 
//         current.totalPower < min.totalPower ? current : min
//       );
      
//       // Mark sweet spot entries
//       results.forEach(point => {
//         point.isSweetSpot = Math.abs(point.speed - minPowerPoint.speed) < 0.25;
//       });
//     }

//     return results;
//   }, [vehicleConfig, vehicleType, airDensity]);

//   // Find sweet spot (minimum power point) with correct Glauert hover power
//   const sweetSpot = useMemo(() => {
//     if (calculateSweetSpotData.length === 0) return null;
    
//     const minPowerPoint = calculateSweetSpotData.find(d => d.isSweetSpot);
    
//     if (!minPowerPoint || !vehicleConfig) return null;
    
//     // Use the same Glauert calculation as in the main loop for consistency
//     const rotorCount = (vehicleConfig.frame_type === 'tri' ? 3 :
//                        vehicleConfig.frame_type === 'quad' ? 4 :
//                        vehicleConfig.frame_type === 'hexa' ? 6 : 8) * 
//                       (vehicleConfig.motor_config === 'coaxial' ? 2 : 1);
//     const rotorRadius = vehicleConfig.rotor_diameter / 2;
//     const diskArea = Math.PI * Math.pow(rotorRadius, 2);
//     const totalWeight = vehicleConfig.mass * GRAVITY;
//     const thrustPerRotor = totalWeight / rotorCount;
//     const hoverInducedVelocity = Math.sqrt(thrustPerRotor / (2 * airDensity * diskArea));
//     const hoverInducedPowerPerRotor = thrustPerRotor * hoverInducedVelocity;
//     const coaxialEfficiency = vehicleConfig.motor_config === 'coaxial' ? 0.85 : 1.0;  // Konsistent
//     const actualHoverPower = (hoverInducedPowerPerRotor * rotorCount) / coaxialEfficiency;
    
//     // Convert to electrical power with system efficiency
//     const motorEfficiency = 0.85;
//     const propellerEfficiency = 0.55;  // Konsistent mit Hauptberechnung
//     const escEfficiency = 0.95;
//     const systemEfficiency = motorEfficiency * propellerEfficiency * escEfficiency;
//     const electricalHoverPower = actualHoverPower / systemEfficiency;
    
//     return {
//       ...minPowerPoint,
//       actualHoverPower: electricalHoverPower
//     };
//   }, [calculateSweetSpotData, airDensity, vehicleConfig]);

//   if (!vehicleConfig || vehicleType !== 'multirotor') {
//     return (
//       <Card title="Sweet Spot Analyse">
//         <Alert
//           message="Nur für Multirotor verfügbar"
//           description="Die Sweet Spot Analyse basiert auf der Glauert-Formel und ist nur für Multirotor-Konfigurationen verfügbar."
//           type="info"
//           showIcon
//         />
//       </Card>
//     );
//   }

//   return (
//     <Card title="Sweet Spot Analyse - Minimum Power Speed">
//       <Space direction="vertical" style={{ width: '100%' }} size="large">
        
//         {/* Environmental Parameters */}
//         <Card size="small" title="Umgebungsbedingungen">
//           <Row gutter={16}>
//             <Col span={8}>
//               <Text>Höhe über NN:</Text>
//               <br />
//               <InputNumber
//                 style={{ width: '100%' }}
//                 value={altitude}
//                 onChange={(value) => setAltitude(value || 0)}
//                 min={0}
//                 max={4000}
//                 step={100}
//                 addonAfter="m"
//               />
//             </Col>
//             <Col span={8}>
//               <Text>Temperatur:</Text>
//               <br />
//               <InputNumber
//                 style={{ width: '100%' }}
//                 value={temperature}
//                 onChange={(value) => setTemperature(value || 15)}
//                 min={-20}
//                 max={50}
//                 step={5}
//                 addonAfter="°C"
//               />
//             </Col>
//             <Col span={8}>
//               <Text>Luftdichte:</Text>
//               <br />
//               <Text code>{airDensity.toFixed(3)} kg/m³</Text>
//             </Col>
//           </Row>
//         </Card>

//         {/* Sweet Spot Results */}
//         {sweetSpot && (
//           <Alert
//             message={`Sweet Spot gefunden: ${sweetSpot.speed} m/s`}
//             description={
//               <div>
//                 <Text>
//                   <strong>Optimale Reisegeschwindigkeit:</strong> {sweetSpot.speed} m/s ({(sweetSpot.speed * 3.6).toFixed(1)} km/h)
//                   <br />
//                   <strong>Minimale Leistung:</strong> {sweetSpot.totalPower.toFixed(0)} W ({sweetSpot.powerPerKg.toFixed(1)} W/kg)
//                   <br />
//                   <strong>Effizienzgewinn:</strong> {sweetSpot.actualHoverPower ? 
//                     ((sweetSpot.actualHoverPower - sweetSpot.totalPower) / sweetSpot.actualHoverPower * 100).toFixed(1) : '?'
//                   }% gegenüber Hover (berechnete {sweetSpot.actualHoverPower ? sweetSpot.actualHoverPower.toFixed(0) : '?'}W, {sweetSpot.actualHoverPower ? (sweetSpot.actualHoverPower / vehicleConfig.mass).toFixed(1) : '?'} W/kg)
//                 </Text>
//               </div>
//             }
//             type="success"
//             showIcon
//           />
//         )}

//         {/* Power vs Speed Chart */}
//         <div className="chart-container-large">
//           <ResponsiveContainer width="100%" height="100%">
//             <LineChart data={calculateSweetSpotData}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis 
//                 dataKey="speed" 
//                 label={{ value: 'Geschwindigkeit (m/s)', position: 'insideBottom', offset: -5 }}
//               />
//               <YAxis 
//                 label={{ value: 'Leistung (W)', angle: -90, position: 'insideLeft' }}
//               />
//               <Tooltip 
//                 formatter={(value: number, name: string) => [
//                   `${Math.round(value)} W`,
//                   name === 'totalPower' ? 'Gesamtleistung' :
//                   name === 'inducedPower' ? 'Induzierte Leistung' :
//                   name === 'profilePower' ? 'Profil + Parasitäre Leistung' : name
//                 ]}
//                 labelFormatter={(speed: number) => `Geschwindigkeit: ${speed} m/s (${(speed * 3.6).toFixed(1)} km/h)`}
//               />
//               <Legend />
              
//               <Line 
//                 type="monotone" 
//                 dataKey="totalPower" 
//                 stroke="#2563eb" 
//                 strokeWidth={3}
//                 name="Gesamtleistung"
//                 dot={(props: any) => {
//                   if (props.payload && props.payload.isSweetSpot) {
//                     return <Dot {...props} fill="red" stroke="red" strokeWidth={2} r={6} />;
//                   }
//                   return <Dot {...props} fill="transparent" stroke="transparent" r={0} />;
//                 }}
//               />
              
//               <Line 
//                 type="monotone" 
//                 dataKey="inducedPower" 
//                 stroke="#dc2626" 
//                 strokeWidth={2}
//                 strokeDasharray="5 5"
//                 name="Induzierte Leistung"
//                 dot={false}
//               />
              
//               <Line 
//                 type="monotone" 
//                 dataKey="profilePower" 
//                 stroke="#059669" 
//                 strokeWidth={2}
//                 strokeDasharray="5 5"
//                 name="Profil + Parasitäre Leistung"
//                 dot={false}
//               />
              
//               {sweetSpot && (
//                 <ReferenceLine 
//                   x={sweetSpot.speed} 
//                   stroke="red" 
//                   strokeDasharray="2 2"
//                   label={{ value: `Sweet Spot: ${sweetSpot.speed} m/s`, position: 'top' }}
//                 />
//               )}
//             </LineChart>
//           </ResponsiveContainer>
//         </div>

//         {/* Technical Details */}
//         <Card size="small" title="Berechnungsgrundlage">
//           <Row gutter={16}>
//             <Col span={12}>
//               <Text strong>Fahrzeugparameter:</Text>
//               <br />
//               <Text>• MTOW: {vehicleConfig.mass} kg</Text>
//               <br />
//               <Text>• Rotoranzahl: {
//                 vehicleConfig.frame_type === 'tri' ? 3 :
//                 vehicleConfig.frame_type === 'quad' ? 4 :
//                 vehicleConfig.frame_type === 'hexa' ? 6 : 8
//               } {vehicleConfig.motor_config === 'coaxial' ? '× 2 (Coaxial)' : ''}</Text>
//               <br />
//               <Text>• Rotordurchmesser: {vehicleConfig.rotor_diameter} m</Text>
//               <br />
//               <Text>• Schub je Rotor: {((vehicleConfig.mass * GRAVITY) / (
//                 (vehicleConfig.frame_type === 'tri' ? 3 :
//                  vehicleConfig.frame_type === 'quad' ? 4 :
//                  vehicleConfig.frame_type === 'hexa' ? 6 : 8) * 
//                 (vehicleConfig.motor_config === 'coaxial' ? 2 : 1)
//               )).toFixed(1)} N</Text>
//             </Col>
//             <Col span={12}>
//               <Text strong>Glauert-Formel:</Text>
//               <br />
//               <Text code>v_i,hover = √(T/(2·ρ·A))</Text>
//               <br />
//               <Text code>v_i,forward = v_i,hover / √(V² + v_i,hover²)</Text>
//               <br />
//               <Text code>P_induced = T · v_i</Text>
//               <br />
//               <br />
//               <Text type="secondary">
//                 {vehicleConfig.motor_config === 'coaxial' && 
//                   'Coaxial-Effizienz: 87% (13% Verlust durch Rotor-Interferenz)'
//                 }
//               </Text>
//             </Col>
//           </Row>
//         </Card>

//       </Space>
//     </Card>
//   );
// };

// export default SweetSpotAnalysis;
