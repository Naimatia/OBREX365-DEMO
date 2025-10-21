// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Space,
  Progress,
  Timeline,
  Alert,
  Button,
  Badge,
  Avatar,
  List,
  Tag,
  Tooltip,
  Spin,
  message,
  notification
} from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  PhoneOutlined,
  DollarOutlined,
  FileTextOutlined,
  HomeOutlined,
  TrophyOutlined,
  CalendarOutlined,
  RocketOutlined,
  FireOutlined,
  ThunderboltOutlined,
  StarOutlined,
  CrownOutlined,
  BellOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  EyeOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import moment from 'moment';

// Import services
import LeadsService from 'services/LeadsService';
import DealsService from 'services/DealsService';
import ContactsService from 'services/ContactsService';
import InvoicesService from 'services/InvoicesService';
import PropertiesService from 'services/PropertiesService';

const { Title, Text } = Typography;

/**
 * Comprehensive Seller Dashboard
 * Displays metrics, targets, alerts and recent activity
 */
const SellerDashboardPage = () => {
  const user = useSelector(state => state.auth.user);
  const navigate = useNavigate();
  const userId = user?.id;
  const companyId = user?.company_id;
  const userName = `${user?.firstname || ''} ${user?.lastname || ''}`.trim();

  // State for all data
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    leads: [],
    deals: [],
    contacts: [],
    invoices: [],
    properties: []
  });

  // Monthly targets (these could be configurable)
  const monthlyTargets = {
    leads: 50,
    deals: 10,
    contacts: 30,
    revenue: 100000 // AED
  };

  // Fetch all dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!userId || !companyId) {
      console.log('Missing user data:', { userId, companyId });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching dashboard data for seller:', userId);

      // Fetch all data in parallel
      const [leads, deals, allContacts, invoices, properties] = await Promise.all([
        LeadsService.getSellerLeads(companyId, userId),
        DealsService.getSellerDeals(userId),
        ContactsService.getCompanyContacts(companyId),
        InvoicesService.getSellerInvoices(userId),
        PropertiesService.getCompanyProperties(companyId)
      ]);

      // Filter contacts by seller
      const contacts = allContacts.filter(contact => contact.seller_id === userId);

      setDashboardData({
        leads,
        deals,
        contacts,
        invoices,
        properties
      });

      console.log('Dashboard data fetched successfully');
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      message.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [userId, companyId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Calculate monthly statistics
  const calculateMonthlyStats = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const filterByMonth = (items, dateField) => {
      return items.filter(item => {
        const itemDate = new Date(item[dateField]);
        return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
      });
    };

    const monthlyLeads = filterByMonth(dashboardData.leads, 'CreationDate');
    const monthlyDeals = filterByMonth(dashboardData.deals, 'CreationDate');
    const monthlyContacts = filterByMonth(dashboardData.contacts, 'CreationDate');
    const monthlyInvoices = filterByMonth(dashboardData.invoices, 'CreationDate');

    const revenue = monthlyDeals
      .filter(deal => deal.Status === 'Gain')
      .reduce((sum, deal) => sum + (deal.Amount || 0), 0);

    const paidInvoices = monthlyInvoices
      .filter(invoice => invoice.Status === 'Paid')
      .reduce((sum, invoice) => sum + (invoice.amount || 0), 0);

    return {
      leads: {
        current: monthlyLeads.length,
        target: monthlyTargets.leads,
        percentage: Math.round((monthlyLeads.length / monthlyTargets.leads) * 100)
      },
      deals: {
        current: monthlyDeals.length,
        target: monthlyTargets.deals,
        percentage: Math.round((monthlyDeals.length / monthlyTargets.deals) * 100)
      },
      contacts: {
        current: monthlyContacts.length,
        target: monthlyTargets.contacts,
        percentage: Math.round((monthlyContacts.length / monthlyTargets.contacts) * 100)
      },
      revenue: {
        current: revenue + paidInvoices,
        target: monthlyTargets.revenue,
        percentage: Math.round(((revenue + paidInvoices) / monthlyTargets.revenue) * 100)
      }
    };
  };

  // Get upcoming invoice alerts
  const getUpcomingInvoiceAlerts = () => {
    const now = moment();
    const upcoming = dashboardData.invoices
      .filter(invoice => {
        if (invoice.Status !== 'Pending' || !invoice.DateLimit) return false;
        const dueDate = moment(invoice.DateLimit);
        const daysUntilDue = dueDate.diff(now, 'days');
        return daysUntilDue >= 0 && daysUntilDue <= 7; // Next 7 days
      })
      .sort((a, b) => moment(a.DateLimit).diff(moment(b.DateLimit)))
      .slice(0, 5);

    return upcoming;
  };

  // Get recent activity
  const getRecentActivity = () => {
    const activities = [];

    // Recent leads
    dashboardData.leads.slice(0, 3).forEach(lead => {
      activities.push({
        id: `lead-${lead.id}`,
        type: 'lead',
        title: `New lead: ${lead.FirstName} ${lead.LastName}`,
        description: `Interest level: ${lead.InterestLevel}`,
        time: lead.CreationDate,
        icon: <UserOutlined />,
        color: '#1890ff'
      });
    });

    // Recent deals
    dashboardData.deals.slice(0, 3).forEach(deal => {
      activities.push({
        id: `deal-${deal.id}`,
        type: 'deal',
        title: `Deal updated: ${formatCurrency(deal.Amount)}`,
        description: `Status: ${deal.Status}`,
        time: deal.LastUpdate,
        icon: <DollarOutlined />,
        color: deal.Status === 'Gain' ? '#52c41a' : deal.Status === 'Loss' ? '#ff4d4f' : '#faad14'
      });
    });

    // Recent invoices
    dashboardData.invoices.slice(0, 3).forEach(invoice => {
      activities.push({
        id: `invoice-${invoice.id}`,
        type: 'invoice',
        title: `Invoice: ${invoice.Title}`,
        description: `${formatCurrency(invoice.amount)} - ${invoice.Status}`,
        time: invoice.CreationDate,
        icon: <FileTextOutlined />,
        color: '#722ed1'
      });
    });

    return activities
      .sort((a, b) => moment(b.time).diff(moment(a.time)))
      .slice(0, 8);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Navigation functions
  const navigateToSection = (section) => {
    navigate(`/app/seller/${section}`);
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh',
        flexDirection: 'column'
      }}>
        <Spin size="large" />
        <Text style={{ marginTop: '16px', color: '#8c8c8c' }}>Loading dashboard...</Text>
      </div>
    );
  }

  const monthlyStats = calculateMonthlyStats();
  const upcomingInvoices = getUpcomingInvoiceAlerts();
  const recentActivity = getRecentActivity();

  return (
    <div style={{ padding: '24px', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card 
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '16px',
            marginBottom: '24px',
            overflow: 'hidden'
          }}
          bodyStyle={{ padding: '32px' }}
        >
          <Row align="middle">
            <Col flex="auto">
              <Space size="large">
                <Avatar 
                  size={64} 
                  icon={<DashboardOutlined />}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    fontSize: '28px'
                  }}
                />
                <div>
                  <Title level={2} style={{ color: 'white', margin: 0 }}>
                    Welcome back, {userName}! 👋
                  </Title>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px' }}>
                    Here's your performance overview for {moment().format('MMMM YYYY')}
                  </Text>
                </div>
              </Space>
            </Col>
            <Col>
              <Button 
                type="primary"
                size="large"
                icon={<RocketOutlined />}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: 'white'
                }}
                onClick={() => navigateToSection('leads')}
              >
                Quick Actions
              </Button>
            </Col>
          </Row>
        </Card>
      </motion.div>

      {/* Upcoming Invoices Alerts */}
      {upcomingInvoices.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Alert
            message={`${upcomingInvoices.length} Invoice${upcomingInvoices.length > 1 ? 's' : ''} Due Soon`}
            description={
              <div>
                <Text>You have invoices due within the next 7 days:</Text>
                <div style={{ marginTop: '8px' }}>
                  {upcomingInvoices.map((invoice, index) => (
                    <Tag key={invoice.id} color="orange" style={{ margin: '2px' }}>
                      {invoice.Title} - {formatCurrency(invoice.amount)} (Due: {moment(invoice.DateLimit).format('MMM DD')})
                    </Tag>
                  ))}
                </div>
              </div>
            }
            type="warning"
            icon={<BellOutlined />}
            style={{ marginBottom: '24px', borderRadius: '12px' }}
            action={
              <Button 
                size="small" 
                type="text"
                onClick={() => navigateToSection('invoices')}
              >
                View All
              </Button>
            }
          />
        </motion.div>
      )}

      {/* Key Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} lg={6}>
            <Card 
              hoverable
              style={{ borderRadius: '12px', cursor: 'pointer' }}
              onClick={() => navigateToSection('leads')}
            >
              <Statistic
                title="Leads This Month"
                value={monthlyStats.leads.current}
                suffix={`/ ${monthlyStats.leads.target}`}
                prefix={<UserOutlined style={{ color: '#1890ff' }} />}
                valueStyle={{ color: '#1890ff' }}
              />
              <Progress 
                percent={monthlyStats.leads.percentage} 
                strokeColor="#1890ff"
                size="small"
                style={{ marginTop: '8px' }}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <Card 
              hoverable
              style={{ borderRadius: '12px', cursor: 'pointer' }}
              onClick={() => navigateToSection('deals')}
            >
              <Statistic
                title="Deals This Month"
                value={monthlyStats.deals.current}
                suffix={`/ ${monthlyStats.deals.target}`}
                prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a' }}
              />
              <Progress 
                percent={monthlyStats.deals.percentage} 
                strokeColor="#52c41a"
                size="small"
                style={{ marginTop: '8px' }}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <Card 
              hoverable
              style={{ borderRadius: '12px', cursor: 'pointer' }}
              onClick={() => navigateToSection('contacts')}
            >
              <Statistic
                title="Contacts This Month"
                value={monthlyStats.contacts.current}
                suffix={`/ ${monthlyStats.contacts.target}`}
                prefix={<PhoneOutlined style={{ color: '#faad14' }} />}
                valueStyle={{ color: '#faad14' }}
              />
              <Progress 
                percent={monthlyStats.contacts.percentage} 
                strokeColor="#faad14"
                size="small"
                style={{ marginTop: '8px' }}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <Card 
              hoverable
              style={{ borderRadius: '12px', cursor: 'pointer' }}
              onClick={() => navigateToSection('invoices')}
            >
              <Statistic
                title="Revenue This Month"
                value={formatCurrency(monthlyStats.revenue.current)}
                prefix={<TrophyOutlined style={{ color: '#722ed1' }} />}
                valueStyle={{ color: '#722ed1' }}
              />
              <Progress 
                percent={monthlyStats.revenue.percentage} 
                strokeColor="#722ed1"
                size="small"
                style={{ marginTop: '8px' }}
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>Target: {formatCurrency(monthlyStats.revenue.target)}</Text>
            </Card>
          </Col>
        </Row>
      </motion.div>

      <Row gutter={[16, 16]}>
        {/* Performance Overview */}
        <Col xs={24} lg={12}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card 
              title={
                <Space>
                  <FireOutlined style={{ color: '#ff4d4f' }} />
                  <span>Performance Overview</span>
                </Space>
              }
              style={{ borderRadius: '12px', height: '400px' }}
              extra={
                <Badge 
                  status={monthlyStats.revenue.percentage >= 80 ? 'success' : 'processing'} 
                  text={monthlyStats.revenue.percentage >= 80 ? 'On Track' : 'Needs Attention'}
                />
              }
            >
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <Text strong>Leads Progress</Text>
                    <Text>{monthlyStats.leads.percentage}%</Text>
                  </div>
                  <Progress 
                    percent={monthlyStats.leads.percentage}
                    strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
                    size="large"
                  />
                </div>
                
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <Text strong>Deals Progress</Text>
                    <Text>{monthlyStats.deals.percentage}%</Text>
                  </div>
                  <Progress 
                    percent={monthlyStats.deals.percentage}
                    strokeColor={{ '0%': '#52c41a', '100%': '#95de64' }}
                    size="large"
                  />
                </div>
                
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <Text strong>Contacts Progress</Text>
                    <Text>{monthlyStats.contacts.percentage}%</Text>
                  </div>
                  <Progress 
                    percent={monthlyStats.contacts.percentage}
                    strokeColor={{ '0%': '#faad14', '100%': '#ffec3d' }}
                    size="large"
                  />
                </div>
                
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <Text strong>Revenue Progress</Text>
                    <Text>{monthlyStats.revenue.percentage}%</Text>
                  </div>
                  <Progress 
                    percent={monthlyStats.revenue.percentage}
                    strokeColor={{ '0%': '#722ed1', '100%': '#b37feb' }}
                    size="large"
                  />
                </div>
              </Space>
            </Card>
          </motion.div>
        </Col>

        {/* Recent Activity */}
        <Col xs={24} lg={12}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card 
              title={
                <Space>
                  <ClockCircleOutlined style={{ color: '#1890ff' }} />
                  <span>Recent Activity</span>
                </Space>
              }
              style={{ borderRadius: '12px', height: '400px' }}
              bodyStyle={{ padding: '16px 0' }}
            >
              <List
                size="small"
                dataSource={recentActivity}
                renderItem={(activity) => (
                  <List.Item style={{ padding: '8px 24px', borderBottom: '1px solid #f0f0f0' }}>
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          size={32}
                          style={{ backgroundColor: activity.color }}
                          icon={activity.icon}
                        />
                      }
                      title={
                        <Text strong style={{ fontSize: '13px' }}>
                          {activity.title}
                        </Text>
                      }
                      description={
                        <Space direction="vertical" size={2}>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {activity.description}
                          </Text>
                          <Text type="secondary" style={{ fontSize: '11px' }}>
                            {moment(activity.time).fromNow()}
                          </Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        style={{ marginTop: '24px' }}
      >
        <Card 
          title={
            <Space>
              <RocketOutlined style={{ color: '#52c41a' }} />
              <span>Quick Actions</span>
            </Space>
          }
          style={{ borderRadius: '12px' }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={6}>
              <Button 
                type="primary" 
                size="large"
                block
                icon={<PlusOutlined />}
                onClick={() => navigateToSection('leads')}
                style={{ borderRadius: '8px', height: '60px' }}
              >
                Add Lead
              </Button>
            </Col>
            <Col xs={12} sm={6}>
              <Button 
                type="primary" 
                size="large"
                block
                icon={<DollarOutlined />}
                onClick={() => navigateToSection('deals')}
                style={{ borderRadius: '8px', height: '60px', backgroundColor: '#52c41a' }}
              >
                Add Deal
              </Button>
            </Col>
            <Col xs={12} sm={6}>
              <Button 
                type="primary" 
                size="large"
                block
                icon={<PhoneOutlined />}
                onClick={() => navigateToSection('contacts')}
                style={{ borderRadius: '8px', height: '60px', backgroundColor: '#faad14' }}
              >
                Add Contact
              </Button>
            </Col>
            <Col xs={12} sm={6}>
              <Button 
                type="primary" 
                size="large"
                block
                icon={<FileTextOutlined />}
                onClick={() => navigateToSection('invoices')}
                style={{ borderRadius: '8px', height: '60px', backgroundColor: '#722ed1' }}
              >
                Create Invoice
              </Button>
            </Col>
          </Row>
        </Card>
      </motion.div>
    </div>
  );
};

export default SellerDashboardPage;