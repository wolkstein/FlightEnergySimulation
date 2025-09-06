import React, { useState } from 'react';
import { Upload, Button, message, Space, Typography, Modal, Table, Alert } from 'antd';
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
  const [importError, setImportError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');

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
    setImportError(null);
    setFileName(file.name);
    
    try {
      // File size check (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File too large. Maximum size is 10MB.');
      }

      const waypoints = await MissionImportService.importMissionFile(file);
      
      if (waypoints.length === 0) {
        setImportError('No valid waypoints found in the file. Please check the file format.');
        return false;
      }

      if (waypoints.length > 1000) {
        setImportError('Too many waypoints. Maximum supported is 1000 waypoints.');
        return false;
      }

      setPreviewWaypoints(waypoints);
      setShowPreview(true);
      message.success(`Successfully imported ${waypoints.length} waypoints from ${file.name}`);
      
    } catch (error) {
      console.error('Import error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setImportError(errorMessage);
      message.error(`Import failed: ${errorMessage}`);
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
        <div className="content-padding">
          <Title level={4}>
            <FileTextOutlined /> Import Waypoints from Mission Files
          </Title>
          
          {/* Enhanced file format info */}
          <div className="section-margin-bottom">
            <Text>
              <InfoCircleOutlined style={{ color: '#1890ff', marginRight: 8 }} />
              Supported formats and file size limit (max 10MB):
            </Text>
            <ul style={{ marginTop: 8, marginLeft: 20 }}>
              <li><strong>.plan</strong> - QGroundControl mission files (JSON format)</li>
              <li><strong>.waypoints, .mission</strong> - MissionPlanner waypoint files (tab-separated)</li>
              <li><strong>Limits:</strong> Maximum 1000 waypoints per mission</li>
            </ul>
          </div>

          {/* Error display */}
          {importError && (
            <Alert
              message="Import Error"
              description={importError}
              type="error"
              showIcon
              closable
              onClose={() => setImportError(null)}
              style={{ marginBottom: 16 }}
            />
          )}

          <Upload {...uploadProps}>
            <Button 
              icon={<UploadOutlined />} 
              loading={loading}
              size="large"
              type="primary"
            >
              {loading ? `Processing ${fileName}...` : 'Select Mission File'}
            </Button>
          </Upload>

          {loading && (
            <div className="section-spacing">
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
