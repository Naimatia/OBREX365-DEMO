import React, { useEffect } from 'react';
import { Button, Row, Col, Card, Typography } from 'antd';
import { WarningOutlined, RocketOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { APP_PREFIX_PATH } from 'configs/AppConfig';
import { motion } from 'framer-motion';
import { UserRoles } from 'models/UserModel'; // Import your roles enum

const { Title, Text } = Typography;

// Define all sales team roles (same as in auth slice)
const SALES_TEAM_ROLES = [
  UserRoles.SELLER,
  UserRoles.SALES_EXECUTIVE,
  UserRoles.AGENT,
  UserRoles.TEAM_LEADER,
  UserRoles.SALES_MANAGER,
  UserRoles.OFF_PLAN_SALES,
  UserRoles.READY_TO_MOVE_SALES,
];

/**
 * Access Denied / Smart Redirect Page
 * - Auto-redirects all sales team roles to seller dashboard
 * - Shows welcome message during redirect for sales users
 * - Shows proper access denied message for non-allowed users
 */
const AccessDenied = () => {
  const navigate = useNavigate();
  const user = useSelector(state => state.auth.user);

  // Normalize role (handle both 'Role' and 'role' keys)
  const userRole = (user?.Role || user?.role || '').trim();
  const userName = `${user?.firstname || ''} ${user?.lastname || ''}`.trim() || 'User';

  // Auto-redirect logic for sales team
  useEffect(() => {
    if (SALES_TEAM_ROLES.includes(userRole)) {
      console.log(`AccessDenied - Detected sales role (${userRole}) → redirecting to seller dashboard`);

      const timer = setTimeout(() => {
        navigate(`${APP_PREFIX_PATH}/seller/dashboard`, { replace: true });
      }, 2500); // 2.5 seconds to show welcome message

      return () => clearTimeout(timer);
    }
  }, [userRole, navigate]);

  // === Sales Team Welcome Screen ===
  if (SALES_TEAM_ROLES.includes(userRole)) {
    return (
      <div className="container mx-auto px-4 h-full flex items-center justify-center">
        <Row justify="center" style={{ width: '100%' }}>
          <Col xs={24} sm={24} md={18} lg={12} xl={10}>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Card
                className="shadow-2xl border-0"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '20px',
                  overflow: 'hidden',
                }}
                bodyStyle={{ padding: '60px 40px' }}
              >
                <div className="text-center text-white">
                  <motion.div
                    animate={{ rotate: [0, 12, -12, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <RocketOutlined style={{ fontSize: 90, marginBottom: 32 }} />
                  </motion.div>

                  <Title level={1} style={{ color: 'white', marginBottom: 16 }}>
                    Welcome back, {userName}! 🚀
                  </Title>

                  <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: '18px', display: 'block', marginBottom: 40 }}>
                    You're being redirected to your <strong>Seller Dashboard</strong>...
                  </Text>

                  {/* Progress bar animation */}
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2.5, ease: 'easeInOut' }}
                    style={{
                      height: '6px',
                      background: 'rgba(255,255,255,0.25)',
                      borderRadius: '3px',
                      overflow: 'hidden',
                      marginBottom: 32,
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: '100%',
                        background: 'white',
                        borderRadius: '3px',
                      }}
                    />
                  </motion.div>

                  <Button
                    type="default"
                    size="large"
                    onClick={() => navigate(`${APP_PREFIX_PATH}/seller/dashboard`, { replace: true })}
                    style={{
                      background: 'rgba(255,255,255,0.15)',
                      border: '1px solid rgba(255,255,255,0.4)',
                      color: 'white',
                      borderRadius: '10px',
                      fontWeight: 600,
                      height: '48px',
                      padding: '0 32px',
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

  // === Regular Access Denied for non-sales / unauthorized users ===
  return (
    <div className="container mx-auto px-4 h-full flex items-center justify-center">
      <Row justify="center">
        <Col xs={24} sm={20} md={14} lg={10} xl={8}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="shadow-xl border-0" style={{ borderRadius: '16px' }}>
              <div className="text-center py-10 px-6">
                <WarningOutlined style={{ fontSize: 80, color: '#ff4d4f', marginBottom: 24 }} />

                <Title level={2} className="mb-4">
                  Access Denied
                </Title>

                <Text type="secondary" className="text-lg block mb-8">
                  Sorry, you don't have permission to access this page.
                  <br />
                  Your current role: <strong>{userRole || 'Unknown'}</strong>
                </Text>

                <Button
                  type="primary"
                  size="large"
                  onClick={() => navigate(`${APP_PREFIX_PATH}/dashboards/default`)}
                  className="mt-4"
                >
                  Back to Main Dashboard
                </Button>
              </div>
            </Card>
          </motion.div>
        </Col>
      </Row>
    </div>
  );
};

export default AccessDenied;