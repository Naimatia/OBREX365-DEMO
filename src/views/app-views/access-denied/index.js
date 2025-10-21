import React, { useEffect } from 'react';
import { Button, Row, Col, Card, Typography } from 'antd';
import { WarningOutlined, RocketOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { APP_PREFIX_PATH } from 'configs/AppConfig';
import { motion } from 'framer-motion';

const { Title, Text } = Typography;

/**
 * Access Page - Smart redirection based on user role
 * Shows welcome message for sellers, error for others
 */
const AccessDenied = () => {
  const navigate = useNavigate();
  const user = useSelector(state => state.auth.user);
  const userRole = user?.Role || user?.role || '';
  const userName = `${user?.firstname || ''} ${user?.lastname || ''}`.trim();
  
  // Auto-redirect sellers to their dashboard
  useEffect(() => {
    if (userRole === 'Seller') {
      const timer = setTimeout(() => {
        console.log('🚀 AccessDenied - Auto-redirecting seller to dashboard');
        navigate(`${APP_PREFIX_PATH}/seller/dashboard`);
      }, 3000); // 3 second delay to show welcome message
      
      return () => clearTimeout(timer);
    }
  }, [userRole, navigate]);

  // Seller Welcome Screen
  if (userRole === 'Seller') {
    return (
      <div className="container mx-auto px-4 h-full">
        <Row justify="center" align="middle" style={{ minHeight: '80vh' }}>
          <Col xs={24} sm={24} md={16} lg={12}>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
            >
              <Card 
                className="shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '16px'
                }}
                bodyStyle={{ padding: '48px 32px' }}
              >
                <div className="text-center">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                  >
                    <RocketOutlined style={{ fontSize: 80, color: 'white', marginBottom: 24 }} />
                  </motion.div>
                  
                  <Title level={1} style={{ color: 'white', marginBottom: 16 }}>
                    Welcome, {userName}! 🎉
                  </Title>
                  
                  <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: '18px', display: 'block', marginBottom: 32 }}>
                    You're starting your journey with OBREX365! 
                    <br />
                    Redirecting you to your seller dashboard...
                  </Text>
                  
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 3 }}
                    style={{
                      height: '4px',
                      background: 'rgba(255,255,255,0.3)',
                      borderRadius: '2px',
                      marginBottom: '24px',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{
                      height: '100%',
                      background: 'white',
                      borderRadius: '2px'
                    }} />
                  </motion.div>
                  
                  <Button 
                    type="primary"
                    size="large"
                    onClick={() => navigate(`${APP_PREFIX_PATH}/seller/dashboard`)}
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      color: 'white',
                      borderRadius: '8px',
                      fontWeight: 'bold'
                    }}
                  >
                    Go to Dashboard Now →
                  </Button>
                </div>
              </Card>
            </motion.div>
          </Col>
        </Row>
      </div>
    );
  }

  // Regular Access Denied for other roles
  return (
    <div className="container mx-auto px-4 h-full">
      <Row justify="center" align="middle" style={{ minHeight: '80vh' }}>
        <Col xs={24} sm={24} md={12} lg={8}>
          <Card className="shadow-lg">
            <div className="text-center">
              <WarningOutlined style={{ fontSize: 60, color: '#ff4d4f', marginBottom: 24 }} />
              <h1 className="font-weight-bold mb-4">Access Denied</h1>
              <p className="mb-4">
                Sorry, you don't have permission to access this page.
                Your current role is <strong>{userRole}</strong>.
              </p>
              <Button 
                type="primary" 
                onClick={() => navigate(`${APP_PREFIX_PATH}/dashboards/default`)}
              >
                Back to Dashboard
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AccessDenied;
