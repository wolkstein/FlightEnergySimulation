import React, { useState } from 'react';
import { Upload, Button, message, Space, Typography, Modal, Table } from 'antd';
import { UploadOutlined, FileTextOutlined, InfoCircleOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { Waypoint } from '../types/simulation';
import MissionImportService from '../services/missionImport';

const { Title, Text } = Typography;

interface MissionImportComponentProps {
  onWaypointsImported: (waypoints: Waypoint[]) => void;
  visible: boolean;
  onClose: () => void;
}

const MissionImportComponent: React.FC<MissionImportComponentProps> = ({
  onWaypointsImported,
  visible,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [previewWaypoints, setPreviewWaypoints] = useState<Waypoint[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const columns = [
    {
      title: '#',
      dataIndex: 'index',
      key: 'index',
      width: 50,
      render: (_: any, __: Waypoint, index: number) => index + 1,
    },
    {
      title: 'Latitude',
      dataIndex: 'latitude',
      key: 'latitude',
      render: (lat: number) => lat.toFixed(6),
    },
    {
      title: 'Longitude',
      dataIndex: 'longitude',
      key: 'longitude',
      render: (lon: number) => lon.toFixed(6),
    },
    {
      title: 'Altitude (m)',
      dataIndex: 'altitude',
      key: 'altitude',
      render: (alt: number) => alt.toFixed(1),
    },
    {
      title: 'Speed (m/s)',
      dataIndex: 'speed',
      key: 'speed',
      render: (speed?: number) => speed?.toFixed(1) || 'Default',
    },
    {
      title: 'Hover Time (s)',
      dataIndex: 'hover_time',
      key: 'hover_time',
      render: (time?: number) => time?.toFixed(1) || '0',
    },
  ];

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    try {
      const waypoints = await MissionImportService.importMissionFile(file);
      
      if (waypoints.length === 0) {
        message.warning('No valid waypoints found in the file');
        return false;
      }

      setPreviewWaypoints(waypoints);
      setShowPreview(true);
      message.success(`Successfully imported ${waypoints.length} waypoints`);
      
    } catch (error) {
      console.error('Import error:', error);
      message.error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
    
    return false; // Prevent automatic upload
  };

  const handleConfirmImport = () => {
    onWaypointsImported(previewWaypoints);
    setShowPreview(false);
    setPreviewWaypoints([]);
    onClose();
    message.success('Waypoints imported successfully!');
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setPreviewWaypoints([]);
  };

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.plan,.waypoints,.mission,.txt',
    beforeUpload: handleFileUpload,
    showUploadList: false,
  };

  return (
    <>
      <Modal
        title="Import Mission File"
        open={visible}
        onCancel={onClose}
        footer={null}
        width={700}
      >
        <div style={{ padding: '20px 0' }}>
          <Title level={4}>
            <FileTextOutlined /> Import Waypoints from Mission Files
          </Title>
          
          <div style={{ marginBottom: 20 }}>
            <Text>
              <InfoCircleOutlined style={{ color: '#1890ff', marginRight: 8 }} />
              Supported formats:
            </Text>
            <ul style={{ marginTop: 8, marginLeft: 20 }}>
              <li><strong>.plan</strong> - QGroundControl mission files</li>
              <li><strong>.waypoints, .mission</strong> - MissionPlanner waypoint files</li>
            </ul>
          </div>

          <Upload {...uploadProps}>
            <Button 
              icon={<UploadOutlined />} 
              loading={loading}
              size="large"
              type="primary"
            >
              Select Mission File
            </Button>
          </Upload>

          {loading && (
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">Processing file...</Text>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        title={`Preview Imported Waypoints (${previewWaypoints.length})`}
        open={showPreview}
        onCancel={handleCancelPreview}
        footer={[
          <Button key="cancel" onClick={handleCancelPreview}>
            Cancel
          </Button>,
          <Button key="import" type="primary" onClick={handleConfirmImport}>
            Import Waypoints
          </Button>,
        ]}
        width={900}
      >
        <Table
          columns={columns}
          dataSource={previewWaypoints}
          pagination={false}
          scroll={{ y: 400 }}
          size="small"
          rowKey={(_, index) => index || 0}
        />
      </Modal>
    </>
  );
};

export default MissionImportComponent;
