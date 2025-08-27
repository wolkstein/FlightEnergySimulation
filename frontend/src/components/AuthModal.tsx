import React, { useState } from 'react';
import { Button, Form, Input, message, Modal, Tabs, TabsProps } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { apiService } from '../services/api';
import { hashPassword, validatePassword } from '../utils/passwordHash';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onAuthSuccess: (token: string, user: any) => void;
}

interface LoginForm {
  username: string;
  password: string;
}

interface RegisterForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const AuthModal: React.FC<AuthModalProps> = ({ visible, onClose, onAuthSuccess }) => {
  const [loginForm] = Form.useForm<LoginForm>();
  const [registerForm] = Form.useForm<RegisterForm>();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');

  const handleLogin = async (values: LoginForm) => {
    setLoading(true);
    try {
      // Hash the password before sending (client-side hashing for security)
      const hashedPassword = hashPassword(values.password, values.username);
      
      const data = await apiService.login({
        username: values.username,
        password: hashedPassword
      });
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      message.success('Login successful!');
      onAuthSuccess(data.access_token, data.user);
      onClose();
    } catch (error: any) {
      message.error(error.response?.data?.detail || error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values: RegisterForm) => {
    if (values.password !== values.confirmPassword) {
      message.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      // Hash the password before sending
      const hashedPassword = hashPassword(values.password, values.username);
      
      await apiService.register({
        username: values.username,
        email: values.email,
        password: hashedPassword,
      });

      message.success('Registration successful! Please log in.');
      setActiveTab('login');
      registerForm.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.detail || error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const loginTab = (
    <Form
      form={loginForm}
      name="login"
      onFinish={handleLogin}
      layout="vertical"
      size="large"
    >
      <Form.Item
        name="username"
        rules={[{ required: true, message: 'Please input your username!' }]}
      >
        <Input
          prefix={<UserOutlined />}
          placeholder="Username"
        />
      </Form.Item>
      
      <Form.Item
        name="password"
        rules={[{ required: true, message: 'Please input your password!' }]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="Password"
        />
      </Form.Item>
      
      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          className="full-width"
        >
          Login
        </Button>
      </Form.Item>
    </Form>
  );

  const registerTab = (
    <Form
      form={registerForm}
      name="register"
      onFinish={handleRegister}
      layout="vertical"
      size="large"
    >
      <Form.Item
        name="username"
        rules={[
          { required: true, message: 'Please input your username!' },
          { min: 3, message: 'Username must be at least 3 characters' },
        ]}
      >
        <Input
          prefix={<UserOutlined />}
          placeholder="Username"
        />
      </Form.Item>
      
      <Form.Item
        name="email"
        rules={[
          { required: true, message: 'Please input your email!' },
          { type: 'email', message: 'Please enter a valid email!' },
        ]}
      >
        <Input
          prefix={<MailOutlined />}
          placeholder="Email"
        />
      </Form.Item>
      
      <Form.Item
        name="password"
        rules={[
          { required: true, message: 'Please input your password!' },
          { min: 6, message: 'Password must be at least 6 characters' },
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="Password"
        />
      </Form.Item>
      
      <Form.Item
        name="confirmPassword"
        rules={[{ required: true, message: 'Please confirm your password!' }]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="Confirm Password"
        />
      </Form.Item>
      
      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          className="full-width"
        >
          Register
        </Button>
      </Form.Item>
    </Form>
  );

  const tabItems: TabsProps['items'] = [
    {
      key: 'login',
      label: 'Login',
      children: loginTab,
    },
    {
      key: 'register',
      label: 'Register',
      children: registerTab,
    },
  ];

  return (
    <Modal
      title="Authentication"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={400}
      destroyOnClose
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        centered
      />
    </Modal>
  );
};

export default AuthModal;
