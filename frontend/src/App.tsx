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

import React, { useState, useEffect } from 'react';
import { Layout, Menu, Typography, message } from 'antd';
import {
  HomeOutlined,
  CalculatorOutlined,
  HistoryOutlined,
  SettingOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
} from '@ant-design/icons';
import SimulationForm from './components/SimulationForm';
import ResultsDisplay from './components/ResultsDisplay';
import SessionHistory from './components/SessionHistory';
import { SimulationResult, VehicleConfig, Waypoint } from './types/simulation';
import './App.css';
import './mobile-override.css'; // Load mobile override CSS last

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

type MenuKey = 'simulation' | 'results' | 'history' | 'settings';

const App: React.FC = () => {
  const [selectedMenu, setSelectedMenu] = useState<MenuKey>('simulation');
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Responsive Sidebar State
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // State-Persistierung auf App-Level für das gesamte Formular
  const [persistentVehicleConfig, setPersistentVehicleConfig] = useState<VehicleConfig | null>(null);
  const [persistentWaypoints, setPersistentWaypoints] = useState<Waypoint[]>([
    { latitude: 48.1351, longitude: 11.5820, altitude: 50 }, // München
    { latitude: 48.1451, longitude: 11.5920, altitude: 100 },
  ]);

  // Responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSimulationComplete = (result: SimulationResult) => {
    setSimulationResult(result);
    setSelectedMenu('results');
    message.success('Simulation erfolgreich abgeschlossen!');
  };

  const handleSimulationError = (error: string) => {
    message.error(`Simulation fehlgeschlagen: ${error}`);
  };

  const handleRestoreSession = (vehicleConfig: VehicleConfig, waypoints: Waypoint[], windSettings: any) => {
    // Persistent State aktualisieren
    setPersistentVehicleConfig(vehicleConfig);
    setPersistentWaypoints(waypoints);
    
    // TODO: Wind-Einstellungen auch persistieren
    // Diese könnten in einen weiteren State oder in den VehicleConfig integriert werden
    
    // Zum Simulations-Tab wechseln
    setSelectedMenu('simulation');
    
    message.success('Session erfolgreich wiederhergestellt!');
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
          <div className="content-centered">
            <Typography.Text type="secondary">
              Keine Simulationsergebnisse verfügbar. Bitte führen Sie zuerst eine Simulation durch.
            </Typography.Text>
          </div>
        );
      case 'history':
        return <SessionHistory onRestoreSession={handleRestoreSession} />;
      case 'settings':
        return (
          <div className="content-centered">
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
      <Sider 
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        collapsedWidth={isMobile ? 0 : 80}
        width={200} 
        theme="light"
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <div className={collapsed ? 'sidebar-header-collapsed' : 'sidebar-header'}>
          {!collapsed && <Title level={4} style={{ margin: 0 }}>Flight Energy</Title>}
          {collapsed && !isMobile && <Title level={5} style={{ margin: 0 }}>FE</Title>}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedMenu]}
          onSelect={({ key }) => {
            setSelectedMenu(key as MenuKey);
            if (isMobile) {
              setCollapsed(true);
            }
          }}
          inlineCollapsed={collapsed}
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
      
      <Layout style={{ marginLeft: isMobile && collapsed ? 0 : (collapsed ? 80 : 200), transition: 'margin-left 0.2s' }}>
        <Header style={{ 
          background: '#fff', 
          padding: isMobile ? '0 8px' : '0 16px', // Less padding on mobile
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #f0f0f0',
          height: '48px' // Smaller header on mobile
        }}>
          {isMobile && (
            <div 
              style={{ 
                fontSize: '18px', 
                cursor: 'pointer', 
                marginRight: '20px' 
              }}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </div>
          )}
          <Title level={isMobile ? 3 : 2} style={{ margin: '16px 0', flex: 1 }}>
            {selectedMenu === 'simulation' && 'Energieverbrauch Simulation'}
            {selectedMenu === 'results' && 'Simulationsergebnisse'}
            {selectedMenu === 'history' && 'Simulation Verlauf'}
            {selectedMenu === 'settings' && 'Einstellungen'}
          </Title>
        </Header>
        
        <Content style={{ 
          margin: 0, // Remove all margins
          padding: 0, // Remove all padding
          overflow: 'initial' 
        }}>
          <div className="content-main">
            {renderContent()}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;
