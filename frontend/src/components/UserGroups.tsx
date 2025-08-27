import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Card, 
  Form, 
  Input, 
  List, 
  message, 
  Modal, 
  Space, 
  Typography,
  Tooltip,
  Avatar
} from 'antd';
import { 
  TeamOutlined, 
  PlusOutlined, 
  UserAddOutlined,
  LogoutOutlined,
  CrownOutlined
} from '@ant-design/icons';
import { apiService } from '../services/api';

const { Title, Text } = Typography;

interface Group {
  id: number;
  name: string;
  description?: string;
  owner_id: number;
  owner_username: string;
  member_count: number;
  created_at: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

interface UserGroupsProps {
  user: User | null;
  token: string | null;
}

const UserGroups: React.FC<UserGroupsProps> = ({ user, token }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [createForm] = Form.useForm();
  const [joinForm] = Form.useForm();

  useEffect(() => {
    if (token && user) {
      fetchGroups();
    }
  }, [token, user]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const data = await apiService.getGroups();
      setGroups(data);
    } catch (error: any) {
      message.error(error.response?.data?.detail || error.message || 'Failed to fetch groups');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (values: { name: string; description?: string }) => {
    try {
      await apiService.createGroup(values);
      message.success('Group created successfully!');
      setCreateModalVisible(false);
      createForm.resetFields();
      fetchGroups();
    } catch (error: any) {
      message.error(error.response?.data?.detail || error.message || 'Failed to create group');
    }
  };

  const handleJoinGroup = async (values: { group_name: string }) => {
    try {
      await apiService.joinGroup(values.group_name);
      message.success('Successfully joined group!');
      setJoinModalVisible(false);
      joinForm.resetFields();
      fetchGroups();
    } catch (error: any) {
      message.error(error.response?.data?.detail || error.message || 'Failed to join group');
    }
  };

  const handleLeaveGroup = async (groupId: number, groupName: string) => {
    Modal.confirm({
      title: 'Leave Group',
      content: `Are you sure you want to leave "${groupName}"?`,
      okText: 'Leave',
      okType: 'danger',
      onOk: async () => {
        try {
          await apiService.leaveGroup(groupId);
          message.success('Successfully left group!');
          fetchGroups();
        } catch (error: any) {
          message.error(error.response?.data?.detail || error.message || 'Failed to leave group');
        }
      },
    });
  };

  if (!user || !token) {
    return null;
  }

  return (
    <Card 
      title={
        <Space>
          <TeamOutlined />
          <span>My Groups</span>
        </Space>
      }
      extra={
        <Space>
          <Tooltip title="Create Group">
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              Create
            </Button>
          </Tooltip>
          <Tooltip title="Join Group">
            <Button 
              icon={<UserAddOutlined />}
              onClick={() => setJoinModalVisible(true)}
            >
              Join
            </Button>
          </Tooltip>
        </Space>
      }
      className="user-groups-card"
    >
      <List
        loading={loading}
        dataSource={groups}
        locale={{ emptyText: 'No groups yet. Create or join a group to share sessions!' }}
        renderItem={(group) => (
          <List.Item
            actions={[
              group.owner_id === user.id ? (
                <Tooltip title="You are the owner">
                  <CrownOutlined style={{ color: '#faad14' }} />
                </Tooltip>
              ) : (
                <Tooltip title="Leave Group">
                  <Button
                    type="text"
                    danger
                    icon={<LogoutOutlined />}
                    onClick={() => handleLeaveGroup(group.id, group.name)}
                  />
                </Tooltip>
              ),
            ]}
          >
            <List.Item.Meta
              avatar={<Avatar icon={<TeamOutlined />} />}
              title={
                <Space>
                  <span>{group.name}</span>
                  {group.owner_id === user.id && <CrownOutlined style={{ color: '#faad14' }} />}
                </Space>
              }
              description={
                <Space direction="vertical" size="small">
                  {group.description && <Text>{group.description}</Text>}
                  <Text type="secondary">
                    Owner: {group.owner_username} • Members: {group.member_count}
                  </Text>
                </Space>
              }
            />
          </List.Item>
        )}
      />

      {/* Create Group Modal */}
      <Modal
        title="Create New Group"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={createForm}
          onFinish={handleCreateGroup}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="Group Name"
            rules={[
              { required: true, message: 'Please enter group name!' },
              { min: 3, message: 'Group name must be at least 3 characters' },
            ]}
          >
            <Input placeholder="Enter group name" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="Description (optional)"
          >
            <Input.TextArea 
              placeholder="Describe your group"
              rows={3}
            />
          </Form.Item>
          
          <Form.Item>
            <Space className="full-width" style={{ justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setCreateModalVisible(false);
                createForm.resetFields();
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Create Group
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Join Group Modal */}
      <Modal
        title="Join Existing Group"
        open={joinModalVisible}
        onCancel={() => {
          setJoinModalVisible(false);
          joinForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={joinForm}
          onFinish={handleJoinGroup}
          layout="vertical"
        >
          <Form.Item
            name="group_name"
            label="Group Name"
            rules={[{ required: true, message: 'Please enter group name!' }]}
          >
            <Input placeholder="Enter the exact group name" />
          </Form.Item>
          
          <Form.Item>
            <Space className="full-width" style={{ justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setJoinModalVisible(false);
                joinForm.resetFields();
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Join Group
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default UserGroups;
