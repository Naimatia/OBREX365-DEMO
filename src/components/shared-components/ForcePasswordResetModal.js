import React, { useState } from 'react';
import { Modal, Form, Input, Button, Alert, Typography } from 'antd';
import { LockOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

/**
 * Force Password Reset Modal
 * Shows when user must change their password before accessing the system
 */
const ForcePasswordResetModal = ({ 
  visible, 
  user, 
  loading = false, 
  error = null, 
  onPasswordReset 
}) => {
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleSubmit = async (values) => {
    setConfirmLoading(true);
    try {
      await onPasswordReset(values.newPassword);
      form.resetFields();
    } catch (error) {
      // Error handling is done by parent component
    } finally {
      setConfirmLoading(false);
    }
  };

  const validatePassword = (_, value) => {
    if (!value) {
      return Promise.reject(new Error('Please enter your new password'));
    }
    if (value.length < 8) {
      return Promise.reject(new Error('Password must be at least 8 characters long'));
    }
    if (!/(?=.*[a-z])/.test(value)) {
      return Promise.reject(new Error('Password must contain at least one lowercase letter'));
    }
    if (!/(?=.*[A-Z])/.test(value)) {
      return Promise.reject(new Error('Password must contain at least one uppercase letter'));
    }
    if (!/(?=.*\d)/.test(value)) {
      return Promise.reject(new Error('Password must contain at least one number'));
    }
    return Promise.resolve();
  };

  const validateConfirmPassword = (_, value) => {
    if (!value) {
      return Promise.reject(new Error('Please confirm your new password'));
    }
    const newPassword = form.getFieldValue('newPassword');
    if (value !== newPassword) {
      return Promise.reject(new Error('Passwords do not match'));
    }
    return Promise.resolve();
  };

  return (
    <Modal
      title={null}
      open={visible}
      closable={false}
      maskClosable={false}
      footer={null}
      width={500}
      centered
    >
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <ExclamationCircleOutlined 
          style={{ 
            fontSize: '48px', 
            color: '#faad14', 
            marginBottom: 16 
          }} 
        />
        <Title level={3} style={{ marginBottom: 8 }}>
          Password Reset Required
        </Title>
        <Text type="secondary">
          Hello {user?.firstname || 'User'}, you must reset your password before accessing the system
        </Text>
      </div>

      {error && (
        <Alert
          message="Password Reset Failed"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        requiredMark="optional"
      >
        <Form.Item
          name="email"
          label="Email"
          initialValue={user?.email}
        >
          <Input 
            disabled 
            value={user?.email}
            style={{ backgroundColor: '#f5f5f5' }}
          />
        </Form.Item>

        <Form.Item
          name="newPassword"
          label="New Password"
          rules={[{ validator: validatePassword }]}
        >
          <Input.Password 
            prefix={<LockOutlined />}
            placeholder="Enter your new password"
            autoComplete="new-password"
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="Confirm New Password"
          rules={[{ validator: validateConfirmPassword }]}
        >
          <Input.Password 
            prefix={<LockOutlined />}
            placeholder="Confirm your new password"
            autoComplete="new-password"
          />
        </Form.Item>

        <div style={{ marginTop: 32 }}>
          <Alert
            message="Password Requirements"
            description={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>At least 8 characters long</li>
                <li>Contains uppercase letter (A-Z)</li>
                <li>Contains lowercase letter (a-z)</li>
                <li>Contains at least one number (0-9)</li>
              </ul>
            }
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />
        </div>

        <Form.Item>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={confirmLoading || loading}
            block
            size="large"
            disabled={!user?.email}
          >
            {confirmLoading || loading ? 'Updating Password...' : 'Update Password'}
          </Button>
        </Form.Item>
      </Form>

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          After updating your password, you'll be automatically signed in
        </Text>
      </div>
    </Modal>
  );
};

export default ForcePasswordResetModal;
