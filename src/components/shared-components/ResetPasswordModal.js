import React, { useState } from 'react';
import { Modal, Form, Input, Button, Alert, Typography, Space } from 'antd';
import { MailOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { auth } from 'auth/FirebaseAuth';
import { sendPasswordResetEmail } from 'firebase/auth';
import { motion } from 'framer-motion';

const { Title, Text } = Typography;

/**
 * Reset Password Modal Component
 * Allows users to reset their password using Firebase sendPasswordResetEmail
 */
const ResetPasswordModal = ({ visible, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [form] = Form.useForm();

  // Handle password reset
  const handleResetPassword = async (values) => {
    setLoading(true);
    setError(null);
    
    try {
      await sendPasswordResetEmail(auth, values.email);
      setSuccess(true);
      
      // Auto close modal after 3 seconds of success
      setTimeout(() => {
        handleModalClose();
      }, 3000);
      
    } catch (err) {
      console.error('Password reset error:', err);
      
      // Handle different Firebase error codes
      let errorMessage = 'An error occurred while sending reset email';
      
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle modal close
  const handleModalClose = () => {
    form.resetFields();
    setSuccess(false);
    setError(null);
    setLoading(false);
    onCancel();
  };

  return (
    <Modal
      title={null}
      open={visible}
      onCancel={handleModalClose}
      footer={null}
      width={500}
      destroyOnClose
      centered
      bodyStyle={{ padding: '32px 24px' }}
    >
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {success ? (
            <CheckCircleOutlined 
              style={{ 
                fontSize: '64px', 
                color: '#52c41a',
                marginBottom: '16px'
              }} 
            />
          ) : (
            <MailOutlined 
              style={{ 
                fontSize: '64px', 
                color: '#1890ff',
                marginBottom: '16px'
              }} 
            />
          )}
        </motion.div>
        
        <Title level={3} style={{ margin: '0 0 8px 0' }}>
          {success ? 'Email Sent!' : 'Reset Your Password'}
        </Title>
        
        <Text type="secondary">
          {success 
            ? 'Check your email for password reset instructions'
            : 'Enter your email address and we\'ll send you a link to reset your password'
          }
        </Text>
      </div>

      {success ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ textAlign: 'center' }}
        >
          <Alert
            type="success"
            showIcon
            message="Password reset email sent successfully!"
            description="Please check your email inbox and spam folder for the reset link."
            style={{ marginBottom: '24px' }}
          />
          
          <Text type="secondary" style={{ fontSize: '14px' }}>
            This modal will close automatically in a few seconds...
          </Text>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {error && (
            <Alert
              type="error"
              showIcon
              message="Reset Failed"
              description={error}
              style={{ marginBottom: '24px' }}
            />
          )}

          <Form
            form={form}
            layout="vertical"
            onFinish={handleResetPassword}
            size="large"
          >
            <Form.Item
              name="email"
              label="Email Address"
              rules={[
                {
                  required: true,
                  message: 'Please enter your email address'
                },
                {
                  type: 'email',
                  message: 'Please enter a valid email address'
                }
              ]}
            >
              <Input
                prefix={<MailOutlined className="text-primary" />}
                placeholder="Enter your email address"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: '16px' }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                size="large"
                style={{
                  height: '48px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                {loading ? 'Sending Reset Email...' : 'Send Reset Email'}
              </Button>
            </Form.Item>

            <Form.Item style={{ margin: 0, textAlign: 'center' }}>
              <Button
                type="text"
                onClick={handleModalClose}
                disabled={loading}
                style={{ color: '#8c8c8c' }}
              >
                Cancel
              </Button>
            </Form.Item>
          </Form>
        </motion.div>
      )}
    </Modal>
  );
};

export default ResetPasswordModal;
