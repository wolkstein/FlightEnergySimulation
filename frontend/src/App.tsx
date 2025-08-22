/*
Flight Energy Simulation - React Frontend Application
Copyright (C) 2025 wolkstein

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
*/

import React, { useState } from 'react';
import { Layout, Menu, Typography, message } from 'antd';
import {
  HomeOutlined,
  CalculatorOutlined,
  HistoryOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import SimulationForm from './components/SimulationForm';
import ResultsDisplay from './components/ResultsDisplay';
import SessionHistory from './components/SessionHistory';
import { SimulationResult, VehicleConfig, Waypoint } from './types/simulation';
import './App.css';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

type MenuKey = 'simulation' | 'results' | 'history' | 'settings';

const App: React.FC = () => {
  const [selectedMenu, setSelectedMenu] = useState<MenuKey>('simulation');
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);

  // State-Persistierung auf App-Level für das gesamte Formular
  const [persistentVehicleConfig, setPersistentVehicleConfig] = useState<VehicleConfig | null>(null);
  const [persistentWaypoints, setPersistentWaypoints] = useState<Waypoint[]>([
    { latitude: 48.1351, longitude: 11.5820, altitude: 50 }, // München
    { latitude: 48.1451, longitude: 11.5920, altitude: 100 },
  ]);

  const handleSimulationComplete = (result: SimulationResult) => {
    setSimulationResult(result);
    setSelectedMenu('results');
    message.success('Simulation erfolgreich abgeschlossen!');
  };

  const handleSimulationError = (error: string) => {
    message.error(`Simulation fehlgeschlagen: ${error}`);
  };

  const renderContent = () => {
    switch (selectedMenu) {
      case 'simulation':
        return (
          <SimulationForm
            onSimulationComplete={handleSimulationComplete}
            onSimulationError={handleSimulationError}
            loading={loading}
            setLoading={setLoading}
            persistentVehicleConfig={persistentVehicleConfig}
            setPersistentVehicleConfig={setPersistentVehicleConfig}
            persistentWaypoints={persistentWaypoints}
            setPersistentWaypoints={setPersistentWaypoints}
          />
        );
      case 'results':
        return simulationResult ? (
          <ResultsDisplay result={simulationResult} />
        ) : (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Typography.Text type="secondary">
              Keine Simulationsergebnisse verfügbar. Bitte führen Sie zuerst eine Simulation durch.
            </Typography.Text>
          </div>
        );
      case 'history':
        return <SessionHistory />;
      case 'settings':
        return (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Typography.Text type="secondary">
              Einstellungen werden in einer zukünftigen Version verfügbar sein.
            </Typography.Text>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={200} theme="light">
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <Title level={4}>Flight Energy</Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedMenu]}
          onSelect={({ key }) => setSelectedMenu(key as MenuKey)}
          items={[
            {
              key: 'simulation',
              icon: <CalculatorOutlined />,
              label: 'Simulation',
            },
            {
              key: 'results',
              icon: <HomeOutlined />,
              label: 'Ergebnisse',
            },
            {
              key: 'history',
              icon: <HistoryOutlined />,
              label: 'Verlauf',
            },
            {
              key: 'settings',
              icon: <SettingOutlined />,
              label: 'Einstellungen',
            },
          ]}
        />
      </Sider>
      
      <Layout>
        <Header style={{ background: '#fff', padding: '0 20px' }}>
          <Title level={2} style={{ margin: '16px 0' }}>
            {selectedMenu === 'simulation' && 'Energieverbrauch Simulation'}
            {selectedMenu === 'results' && 'Simulationsergebnisse'}
            {selectedMenu === 'history' && 'Simulation Verlauf'}
            {selectedMenu === 'settings' && 'Einstellungen'}
          </Title>
        </Header>
        
        <Content style={{ margin: '24px 16px 0', overflow: 'initial' }}>
          <div style={{ padding: 24, background: '#fff', minHeight: 360 }}>
            {renderContent()}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;
