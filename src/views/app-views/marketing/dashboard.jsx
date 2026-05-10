// @ts-nocheck
import React from 'react';
import {
  Card, Row, Col, Statistic, Typography, Button, Space, Avatar
} from 'antd';
import {
  DashboardOutlined, PlusOutlined, CalendarOutlined,
  FacebookOutlined, InstagramOutlined, UserOutlined,
  TeamOutlined, TrophyOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const MarketingDashboard = () => {
  const user = useSelector((state) => state.auth.user);
  const navigate = useNavigate();

  const userName = `${user?.firstname || ''} ${user?.lastname || ''}`.trim() || "Manager";

  return (
    <div style={{ padding: "32px", maxWidth: 1300, margin: "0 auto" }}>
      
      {/* Welcome Header */}
      <Card 
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          borderRadius: '16px',
          marginBottom: '32px',
          color: 'white'
        }}
        bodyStyle={{ padding: '40px 32px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Avatar 
            size={80} 
            icon={<DashboardOutlined style={{ fontSize: 40 }} />} 
            style={{ background: 'rgba(255,255,255,0.2)' }}
          />
          <div>
            <Title level={2} style={{ color: 'white', margin: 0 }}>
              Welcome back, {userName}! 👋
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: '17px' }}>
              Marketing & Social Media Dashboard • OBREX365
            </Text>
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable>
            <Statistic
              title="Total Campaigns"
              value={12}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable>
            <Statistic
              title="Scheduled Posts"
              value={8}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable>
            <Statistic
              title="Posted This Month"
              value={24}
              prefix={<FacebookOutlined style={{ color: '#1877f2' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable>
            <Statistic
              title="Active Followers"
              value="18.4k"
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Actions */}
      <Card title="Quick Access" style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Button 
              type="primary" 
              size="large" 
              icon={<PlusOutlined />} 
              block
              onClick={() => navigate('/app/social/Post-Scheduler')}
              style={{ height: 70, fontSize: 16 }}
            >
              Schedule New Post
            </Button>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Button 
              size="large" 
              icon={<FacebookOutlined />} 
              block
              onClick={() => navigate('/app/social/facebook')}
              style={{ height: 70, fontSize: 16 }}
            >
              Facebook Manager
            </Button>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Button 
              size="large" 
              icon={<InstagramOutlined />} 
              block
              onClick={() => navigate('/app/social/instagram')}
              style={{ height: 70, fontSize: 16 }}
            >
              Instagram Manager
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Overview Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="Recent Activity" style={{ height: '100%' }}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                <Text strong>Post about "New Off-plan Project" scheduled</Text>
                <br />
                <Text type="secondary">Tomorrow at 10:00 AM • Facebook + Instagram</Text>
              </div>
              <div style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                <Text strong>Instagram Story posted successfully</Text>
                <br />
                <Text type="secondary">2 hours ago</Text>
              </div>
              <div style={{ padding: '12px 0' }}>
                <Text strong>Campaign "Summer Offers" reached 5.2K reach</Text>
                <br />
                <Text type="secondary">Yesterday</Text>
              </div>
            </Space>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="Marketing Tips" style={{ height: '100%' }}>
            <ul style={{ paddingLeft: 20 }}>
              <li style={{ marginBottom: 12 }}>
                Best time to post on Instagram is <strong>9:00 AM - 11:00 AM</strong>
              </li>
              <li style={{ marginBottom: 12 }}>
                Use carousels — they get 3x more engagement
              </li>
              <li style={{ marginBottom: 12 }}>
                Always add location tag for UAE properties
              </li>
              <li>
                Post consistently 4-5 times per week for better reach
              </li>
            </ul>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default MarketingDashboard;