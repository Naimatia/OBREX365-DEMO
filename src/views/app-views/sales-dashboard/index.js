// pages/SellerPerformanceDashboard.js - Seller Meeting & Contact Tracking Dashboard
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Table, Tag, Space, Button, Input, Modal,
  message, Typography, Row, Col, Avatar, Badge,
  Timeline, Empty, Progress, Drawer, Divider, Select,
  Skeleton, Grid, DatePicker, Tooltip, Form, TimePicker,
  Rate, Calendar, List, Statistic, Tabs, Radio,
  InputNumber
} from 'antd';
import {
  UserOutlined, EyeOutlined, ClockCircleOutlined,
  CloseCircleOutlined, WarningOutlined, TrophyOutlined,
  ReloadOutlined, SearchOutlined, TeamOutlined, HistoryOutlined,
  MailOutlined, PhoneOutlined, FilterOutlined,
  PlusOutlined, FileTextOutlined, RiseOutlined, FallOutlined,
  DashboardOutlined, AppstoreOutlined, BellOutlined,
  PieChartOutlined, HeatMapOutlined, DownloadOutlined,
  StarOutlined, CrownOutlined, FireOutlined, CalendarOutlined,
  VideoCameraOutlined, ShopOutlined, CoffeeOutlined,
  CheckCircleOutlined, WhatsAppOutlined, LinkedinOutlined,
  EnvironmentOutlined, DollarOutlined, PercentageOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import * as XLSX from 'xlsx';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, RadialBarChart, RadialBar,
  Area, AreaChart, ComposedChart
} from 'recharts';

import UserService from 'services/firebase/UserService';
import { UserRoles } from 'models/UserModel';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, Timestamp } from 'firebase/firestore';
import { db } from 'configs/FirebaseConfig';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

// ─── Color Palette ───────────────────────────────────────────────────────────
const COLORS = {
  primary: '#1d6fa8',
  success: '#16a34a',
  warning: '#ca8a04',
  error: '#dc2626',
  purple: '#7c3aed',
  cyan: '#06b6d4',
  pink: '#ec4899',
  orange: '#ea580c',
  indigo: '#4f46e5',
  gray: '#6b7280',
  lightGray: '#f3f4f6',
  white: '#ffffff',
  dark: '#111827',
  // Meeting types
  meeting: '#3b82f6',
  call: '#10b981',
  siteVisit: '#f59e0b',
  followUp: '#8b5cf6',
  negotiation: '#ef4444'
};

// ─── Meeting Types ───────────────────────────────────────────────────────────
const MEETING_TYPES = [
  { value: 'initial', label: 'Initial Meeting', icon: <CoffeeOutlined />, color: COLORS.primary },
  { value: 'site_visit', label: 'Site Visit', icon: <EnvironmentOutlined />, color: COLORS.orange },
  { value: 'negotiation', label: 'Negotiation', icon: <DollarOutlined />, color: COLORS.error },
  { value: 'closing', label: 'Closing', icon: <CheckCircleOutlined />, color: COLORS.success },
  { value: 'follow_up', label: 'Follow-up', icon: <BellOutlined />, color: COLORS.purple },
  { value: 'virtual', label: 'Virtual Tour', icon: <VideoCameraOutlined />, color: COLORS.cyan },
];

const CONTACT_METHODS = [
  { value: 'call', label: 'Phone Call', icon: <PhoneOutlined />, color: COLORS.success },
  { value: 'whatsapp', label: 'WhatsApp', icon: <WhatsAppOutlined />, color: '#25D366' },
  { value: 'email', label: 'Email', icon: <MailOutlined />, color: COLORS.primary },
  { value: 'linkedin', label: 'LinkedIn', icon: <LinkedinOutlined />, color: '#0077B5' },
  { value: 'in_person', label: 'In Person', icon: <UserOutlined />, color: COLORS.purple },
];

// ─── CSS Styles ──────────────────────────────────────────────────────────────
const dashboardStyles = `
  .seller-dashboard { padding: 20px; max-width: 1600px; margin: 0 auto; }
  
  .stat-card {
    background: #ffffff;
    border-radius: 16px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid #e5e7eb;
    position: relative;
    overflow: hidden;
  }
  .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
  .stat-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; }
  .stat-card-blue::before { background: linear-gradient(90deg, #1d6fa8, #3b82f6); }
  .stat-card-green::before { background: linear-gradient(90deg, #16a34a, #22c55e); }
  .stat-card-yellow::before { background: linear-gradient(90deg, #ca8a04, #eab308); }
  .stat-card-purple::before { background: linear-gradient(90deg, #7c3aed, #8b5cf6); }

  .activity-card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    padding: 16px;
    margin-bottom: 12px;
    transition: all 0.15s;
    cursor: pointer;
  }
  .activity-card:hover { border-color: #1d6fa8; transform: translateX(2px); }

  .seller-rank-card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    padding: 14px;
    margin-bottom: 10px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .seller-rank-card:hover { border-color: #1d6fa8; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }

  .filter-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    padding: 12px 20px;
    margin-bottom: 20px;
  }

  .period-btn {
    padding: 5px 16px;
    border-radius: 20px;
    border: 1px solid #e5e7eb;
    background: transparent;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.15s;
  }
  .period-btn.active { background: #1d6fa8; border-color: #1d6fa8; color: #fff; }

  .meeting-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 500;
  }

  @media (max-width: 768px) {
    .seller-dashboard { padding: 12px; }
    .stat-card { padding: 14px; }
  }
`;

// ─── Helper Functions ────────────────────────────────────────────────────────
const formatDuration = (minutes) => {
  if (!minutes) return '—';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const getMeetingTypeConfig = (type) => {
  return MEETING_TYPES.find(t => t.value === type) || MEETING_TYPES[0];
};

const getContactMethodConfig = (method) => {
  return CONTACT_METHODS.find(m => m.value === method) || CONTACT_METHODS[0];
};

const getPerformanceLevel = (meetingCount, target = 20) => {
  const rate = (meetingCount / target) * 100;
  if (rate >= 100) return { level: 'excellent', color: COLORS.excellent, icon: <CrownOutlined />, label: 'Elite' };
  if (rate >= 75) return { level: 'good', color: COLORS.good, icon: <StarOutlined />, label: 'Pro' };
  if (rate >= 50) return { level: 'average', color: COLORS.average, icon: <FireOutlined />, label: 'Rising' };
  return { level: 'poor', color: COLORS.poor, icon: <WarningOutlined />, label: 'Needs Work' };
};

// ─── Main Component ──────────────────────────────────────────────────────────
const SellerPerformanceDashboard = () => {
  const [sellers, setSellers] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [meetingModalVisible, setMeetingModalVisible] = useState(false);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [period, setPeriod] = useState('month');
  const [currentSort, setCurrentSort] = useState('meetings');
  const [activeTab, setActiveTab] = useState('overview');
  const [meetingForm] = Form.useForm();
  const [contactForm] = Form.useForm();

  const user = useSelector(state => state.auth.user);
  const companyId = user?.company_id;
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  // ─── Fetch Data ────────────────────────────────────────────────────────────
  const fetchSellers = useCallback(async () => {
    if (!companyId) return;
    try {
      const allUsers = await UserService.getUsersByCompanyId(companyId);
      const salesTeam = allUsers.filter(u =>
        [UserRoles.SELLER, UserRoles.SALES_EXECUTIVE, UserRoles.AGENT].includes(u.Role)
      );
      setSellers(salesTeam.map(s => ({
        id: s.id,
        name: `${s.firstname || ''} ${s.lastname || ''}`.trim() || s.email,
        initials: (s.firstname?.[0] || '').toUpperCase() + (s.lastname?.[0] || '').toUpperCase(),
        role: s.Role,
        email: s.email,
        phone: s.phoneNumber || s.phone,
        avatar: s.avatar
      })));
    } catch (error) {
      console.error(error);
      message.error('Failed to load sellers');
    }
  }, [companyId]);

  const fetchMeetings = useCallback(async () => {
    if (!companyId) return;
    try {
      const q = query(
        collection(db, 'sellerMeetings'),
        where('companyId', '==', companyId),
        orderBy('scheduledAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const meetingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        scheduledAt: doc.data().scheduledAt?.toDate?.() || doc.data().scheduledAt
      }));
      setMeetings(meetingsData);
    } catch (error) {
      console.error('Error fetching meetings:', error);
    }
  }, [companyId]);

  const fetchContacts = useCallback(async () => {
    if (!companyId) return;
    try {
      const q = query(
        collection(db, 'sellerContacts'),
        where('companyId', '==', companyId),
        orderBy('contactedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const contactsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        contactedAt: doc.data().contactedAt?.toDate?.() || doc.data().contactedAt
      }));
      setContacts(contactsData);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  }, [companyId]);

  useEffect(() => {
    fetchSellers();
    fetchMeetings();
    fetchContacts();
    setLoading(false);
  }, [fetchSellers, fetchMeetings, fetchContacts]);

  // ─── Aggregated Stats ──────────────────────────────────────────────────────
  const sellerStats = useMemo(() => {
    const dateFilter = (date) => {
      if (!date) return false;
      const d = dayjs(date);
      if (period === 'month') return d.isSame(dayjs(), 'month');
      if (period === 'quarter') return d.isSame(dayjs(), 'quarter');
      if (period === 'year') return d.isSame(dayjs(), 'year');
      return true;
    };

    return sellers.map(seller => {
      const sellerMeetings = meetings.filter(m => m.sellerId === seller.id && dateFilter(m.scheduledAt));
      const sellerContacts = contacts.filter(c => c.sellerId === seller.id && dateFilter(c.contactedAt));
      
      const meetingsByType = sellerMeetings.reduce((acc, m) => {
        acc[m.type] = (acc[m.type] || 0) + 1;
        return acc;
      }, {});
      
      const totalDuration = sellerMeetings.reduce((sum, m) => sum + (m.duration || 0), 0);
      const completedMeetings = sellerMeetings.filter(m => m.status === 'completed').length;
      const conversionRate = completedMeetings > 0 ? (sellerMeetings.filter(m => m.result === 'won').length / completedMeetings) * 100 : 0;
      
      return {
        ...seller,
        totalMeetings: sellerMeetings.length,
        totalContacts: sellerContacts.length,
        meetingsByType,
        avgDuration: sellerMeetings.length > 0 ? totalDuration / sellerMeetings.length : 0,
        completedMeetings,
        conversionRate: Math.round(conversionRate),
        contactsByMethod: sellerContacts.reduce((acc, c) => {
          acc[c.method] = (acc[c.method] || 0) + 1;
          return acc;
        }, {}),
        lastActivity: [...sellerMeetings, ...sellerContacts].sort((a, b) => 
          new Date(b.scheduledAt || b.contactedAt) - new Date(a.scheduledAt || a.contactedAt)
        )[0]?.scheduledAt || sellerContacts[0]?.contactedAt
      };
    });
  }, [sellers, meetings, contacts, period]);

  // ─── Global Stats ──────────────────────────────────────────────────────────
  const globalStats = useMemo(() => {
    const totalMeetings = sellerStats.reduce((sum, s) => sum + s.totalMeetings, 0);
    const totalContacts = sellerStats.reduce((sum, s) => sum + s.totalContacts, 0);
    const avgConversion = sellerStats.reduce((sum, s) => sum + s.conversionRate, 0) / sellerStats.length || 0;
    const topPerformer = [...sellerStats].sort((a, b) => b.totalMeetings - a.totalMeetings)[0];
    
    const meetingsByType = sellerStats.reduce((acc, s) => {
      Object.entries(s.meetingsByType).forEach(([type, count]) => {
        acc[type] = (acc[type] || 0) + count;
      });
      return acc;
    }, {});
    
    return { totalMeetings, totalContacts, avgConversion, topPerformer, meetingsByType };
  }, [sellerStats]);

  // ─── Chart Data ────────────────────────────────────────────────────────────
  const meetingsTrendData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const m = dayjs().subtract(i, 'month');
      const monthMeetings = meetings.filter(mtg => {
        const d = mtg.scheduledAt;
        return d && dayjs(d).format('YYYY-MM') === m.format('YYYY-MM');
      });
      months.push({
        month: m.format('MMM'),
        meetings: monthMeetings.length,
        completed: monthMeetings.filter(m => m.status === 'completed').length,
        won: monthMeetings.filter(m => m.result === 'won').length
      });
    }
    return months;
  }, [meetings]);

  const meetingsByTypeData = useMemo(() => {
    return Object.entries(globalStats.meetingsByType).map(([type, count]) => ({
      name: MEETING_TYPES.find(t => t.value === type)?.label || type,
      value: count,
      color: MEETING_TYPES.find(t => t.value === type)?.color || COLORS.gray
    }));
  }, [globalStats.meetingsByType]);

  const sellerRankingData = useMemo(() => {
    return [...sellerStats]
      .sort((a, b) => {
        if (currentSort === 'meetings') return b.totalMeetings - a.totalMeetings;
        if (currentSort === 'contacts') return b.totalContacts - a.totalContacts;
        if (currentSort === 'conversion') return b.conversionRate - a.conversionRate;
        return b.totalMeetings - a.totalMeetings;
      })
      .filter(s => s.name.toLowerCase().includes(searchText.toLowerCase()));
  }, [sellerStats, currentSort, searchText]);

  // ─── Event Handlers ────────────────────────────────────────────────────────
  const handleAddMeeting = async (values) => {
    try {
      const meetingData = {
        ...values,
        companyId,
        sellerId: selectedSeller?.id || user?.uid,
        sellerName: selectedSeller?.name || `${user?.firstname} ${user?.lastname}`,
        scheduledAt: Timestamp.fromDate(values.scheduledAt.toDate()),
        createdAt: Timestamp.now(),
        status: 'scheduled'
      };
      await addDoc(collection(db, 'sellerMeetings'), meetingData);
      message.success('Meeting scheduled successfully');
      setMeetingModalVisible(false);
      meetingForm.resetFields();
      fetchMeetings();
    } catch (error) {
      message.error('Failed to schedule meeting');
    }
  };

  const handleAddContact = async (values) => {
    try {
      const contactData = {
        ...values,
        companyId,
        sellerId: selectedSeller?.id || user?.uid,
        sellerName: selectedSeller?.name || `${user?.firstname} ${user?.lastname}`,
        contactedAt: Timestamp.fromDate(values.contactedAt.toDate()),
        createdAt: Timestamp.now()
      };
      await addDoc(collection(db, 'sellerContacts'), contactData);
      message.success('Contact logged successfully');
      setContactModalVisible(false);
      contactForm.resetFields();
      fetchContacts();
    } catch (error) {
      message.error('Failed to log contact');
    }
  };

  const handleViewSeller = (seller) => {
    setSelectedSeller(seller);
    setDrawerVisible(true);
  };

  // ─── Table Columns ─────────────────────────────────────────────────────────
  const columns = [
    {
      title: '#', key: 'rank', width: 60,
      render: (_, __, i) => (
        <div style={{ textAlign: 'center', fontSize: 18 }}>
          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <Text type="secondary">{i + 1}</Text>}
        </div>
      ),
    },
    {
      title: 'Seller', key: 'seller', width: 220,
      render: (_, r) => (
        <Space>
          <Avatar style={{ background: getPerformanceLevel(r.totalMeetings).color, fontWeight: 700 }}>
            {r.initials}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>{r.name}</div>
            <Text type="secondary" style={{ fontSize: 11 }}>{r.role}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Meetings', dataIndex: 'totalMeetings', width: 100, sorter: true,
      render: v => <span style={{ fontWeight: 700, color: COLORS.primary, fontSize: 16 }}>{v}</span>,
    },
    {
      title: 'Contacts', dataIndex: 'totalContacts', width: 100, sorter: true,
      render: v => <span style={{ fontWeight: 600, color: COLORS.success }}>{v}</span>,
    },
    {
      title: 'Conversion', dataIndex: 'conversionRate', width: 110, sorter: true,
      render: v => (
        <Tag color={v >= 50 ? 'success' : v >= 30 ? 'warning' : 'error'} style={{ borderRadius: 12 }}>
          {v}%
        </Tag>
      ),
    },
    {
      title: 'Last Activity', key: 'lastActivity', width: 140,
      render: (_, r) => r.lastActivity ? dayjs(r.lastActivity).fromNow() : '—',
    },
    {
      title: '', key: 'action', width: 90,
      render: (_, r) => (
        <Button type="primary" size="small" icon={<EyeOutlined />} onClick={() => handleViewSeller(r)} style={{ borderRadius: 16 }}>
          Details
        </Button>
      ),
    },
  ];

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="seller-dashboard">
      <style>{dashboardStyles}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <Title level={3} style={{ margin: 0, fontWeight: 700 }}>Seller Performance Dashboard</Title>
            <Text type="secondary">Track meetings, contacts, and seller activity metrics</Text>
          </div>
          <Space>
            <Input
              placeholder="Search sellers..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 200, borderRadius: 10 }}
              allowClear
            />
            <Button icon={<ReloadOutlined />} onClick={() => { fetchMeetings(); fetchContacts(); }} loading={loading}>
              Refresh
            </Button>
          </Space>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <FilterOutlined style={{ color: '#6b7280' }} />
        <Text style={{ fontSize: 12, fontWeight: 600 }}>Period:</Text>
        {[
          ['month', 'This Month'],
          ['quarter', 'This Quarter'],
          ['year', 'This Year']
        ].map(([k, l]) => (
          <button key={k} className={`period-btn ${period === k ? 'active' : ''}`} onClick={() => setPeriod(k)}>
            {l}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#6b7280' }}>
          {globalStats.totalMeetings} meetings · {globalStats.totalContacts} contacts
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        style={{ marginBottom: 20 }}
        items={[
          { key: 'overview', label: <span><DashboardOutlined /> Overview</span> },
          { key: 'sellers', label: <span><TeamOutlined /> Seller Rankings</span> },
          { key: 'calendar', label: <span><CalendarOutlined /> Calendar View</span> },
        ]}
      />

      {activeTab === 'overview' && (
        <>
          {/* KPI Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={6}>
              <div className="stat-card stat-card-blue">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Total Meetings</Text>
                    <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.primary }}>{globalStats.totalMeetings}</div>
                  </div>
                  <CalendarOutlined style={{ fontSize: 28, color: COLORS.primary, opacity: 0.6 }} />
                </div>
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div className="stat-card stat-card-green">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Total Contacts</Text>
                    <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.success }}>{globalStats.totalContacts}</div>
                  </div>
                  <PhoneOutlined style={{ fontSize: 28, color: COLORS.success, opacity: 0.6 }} />
                </div>
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div className="stat-card stat-card-yellow">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Conversion Rate</Text>
                    <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.warning }}>{Math.round(globalStats.avgConversion)}%</div>
                  </div>
                  <PercentageOutlined style={{ fontSize: 28, color: COLORS.warning, opacity: 0.6 }} />
                </div>
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div className="stat-card stat-card-purple">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Active Sellers</Text>
                    <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.purple }}>{sellers.length}</div>
                  </div>
                  <TeamOutlined style={{ fontSize: 28, color: COLORS.purple, opacity: 0.6 }} />
                </div>
              </div>
            </Col>
          </Row>

          {/* Charts Row */}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={14}>
              <Card title="Meeting Activity Trend" style={{ borderRadius: 16 }}>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={meetingsTrendData}>
                    <defs>
                      <linearGradient id="meetingsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip contentStyle={{ borderRadius: 10 }} />
                    <Area type="monotone" dataKey="meetings" stroke={COLORS.primary} fill="url(#meetingsGradient)" strokeWidth={2} />
                    <Line type="monotone" dataKey="completed" stroke={COLORS.success} strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="won" stroke={COLORS.warning} strokeWidth={2} dot={{ r: 4 }} />
                    <Legend />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card title="Meetings by Type" style={{ borderRadius: 16 }}>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={meetingsByTypeData}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {meetingsByTypeData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="#fff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: 10 }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>

          {/* Quick Actions */}
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={12}>
              <Card style={{ borderRadius: 16, background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.indigo})`, color: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, opacity: 0.9 }}>Schedule Meeting</div>
                    <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>Book a new meeting</div>
                  </div>
                  <Button 
                    type="primary" 
                    size="large" 
                    icon={<PlusOutlined />} 
                    onClick={() => setMeetingModalVisible(true)}
                    style={{ background: 'rgba(255,255,255,0.2)', border: 'none' }}
                  >
                    Schedule
                  </Button>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12}>
              <Card style={{ borderRadius: 16, background: `linear-gradient(135deg, ${COLORS.success}, ${COLORS.cyan})`, color: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, opacity: 0.9 }}>Log Contact</div>
                    <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>Record client interaction</div>
                  </div>
                  <Button 
                    type="primary" 
                    size="large" 
                    icon={<PhoneOutlined />} 
                    onClick={() => setContactModalVisible(true)}
                    style={{ background: 'rgba(255,255,255,0.2)', border: 'none' }}
                  >
                    Log Contact
                  </Button>
                </div>
              </Card>
            </Col>
          </Row>
        </>
      )}

      {activeTab === 'sellers' && (
        <Card style={{ borderRadius: 16, overflow: 'hidden' }} bodyStyle={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <Space>
              <TeamOutlined style={{ color: COLORS.primary }} />
              <span style={{ fontWeight: 700 }}>Seller Leaderboard</span>
              <Tag style={{ borderRadius: 20 }}>{sellerRankingData.length} sellers</Tag>
            </Space>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className={`period-btn ${currentSort === 'meetings' ? 'active' : ''}`} onClick={() => setCurrentSort('meetings')}>By Meetings</button>
              <button className={`period-btn ${currentSort === 'contacts' ? 'active' : ''}`} onClick={() => setCurrentSort('contacts')}>By Contacts</button>
              <button className={`period-btn ${currentSort === 'conversion' ? 'active' : ''}`} onClick={() => setCurrentSort('conversion')}>By Conversion</button>
            </div>
          </div>
          {isMobile ? (
            <div style={{ padding: 16 }}>
              {sellerRankingData.map((seller, idx) => {
                const perf = getPerformanceLevel(seller.totalMeetings);
                return (
                  <div key={seller.id} className="seller-rank-card" onClick={() => handleViewSeller(seller)}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ fontSize: 24, width: 40 }}>{medals[idx] || idx + 1}</div>
                      <Avatar size={44} style={{ background: perf.color, color: '#fff', fontWeight: 700 }}>{seller.initials}</Avatar>
                      <div style={{ flex: 1, marginLeft: 12 }}>
                        <div style={{ fontWeight: 600 }}>{seller.name}</div>
                        <Text type="secondary" style={{ fontSize: 11 }}>{seller.role}</Text>
                      </div>
                    </div>
                    <Row gutter={8}>
                      <Col span={8}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.primary }}>{seller.totalMeetings}</div>
                          <Text type="secondary" style={{ fontSize: 10 }}>Meetings</Text>
                        </div>
                      </Col>
                      <Col span={8}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.success }}>{seller.totalContacts}</div>
                          <Text type="secondary" style={{ fontSize: 10 }}>Contacts</Text>
                        </div>
                      </Col>
                      <Col span={8}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.warning }}>{seller.conversionRate}%</div>
                          <Text type="secondary" style={{ fontSize: 10 }}>Conversion</Text>
                        </div>
                      </Col>
                    </Row>
                    <Progress percent={(seller.totalMeetings / 30) * 100} size="small" strokeColor={perf.color} style={{ marginTop: 12 }} />
                  </div>
                );
              })}
            </div>
          ) : (
            <Table
              columns={columns}
              dataSource={sellerRankingData}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10, showSizeChanger: true }}
              scroll={{ x: 900 }}
              onRow={r => ({ onClick: () => handleViewSeller(r), style: { cursor: 'pointer' } })}
            />
          )}
        </Card>
      )}

      {activeTab === 'calendar' && (
        <Card style={{ borderRadius: 16 }}>
          <Calendar
            cellRender={(date) => {
              const dayMeetings = meetings.filter(m => 
                m.scheduledAt && dayjs(m.scheduledAt).isSame(date, 'day')
              );
              return (
                <div style={{ minHeight: 80 }}>
                  {dayMeetings.map(meeting => {
                    const type = getMeetingTypeConfig(meeting.type);
                    return (
                      <div key={meeting.id} className="meeting-badge" style={{ background: `${type.color}15`, marginBottom: 4 }}>
                        <span style={{ color: type.color }}>{type.icon}</span>
                        <span style={{ fontSize: 11 }}>{meeting.clientName}</span>
                      </div>
                    );
                  })}
                </div>
              );
            }}
          />
        </Card>
      )}

      {/* Seller Detail Drawer */}
      <Drawer
        title={
          <Space>
            <Avatar size={40} style={{ background: getPerformanceLevel(selectedSeller?.totalMeetings || 0).color }}>
              {selectedSeller?.initials}
            </Avatar>
            <div>
              <div style={{ fontWeight: 700 }}>{selectedSeller?.name}</div>
              <Text type="secondary" style={{ fontSize: 12 }}>{selectedSeller?.role}</Text>
            </div>
          </Space>
        }
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width={isMobile ? '100%' : 600}
        placement="right"
      >
        {selectedSeller && (
          <div>
            {/* Stats */}
            <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
              <Col span={8}>
                <div style={{ background: '#f8f9fa', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.primary }}>{selectedSeller.totalMeetings}</div>
                  <Text type="secondary" style={{ fontSize: 11 }}>Total Meetings</Text>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ background: '#f8f9fa', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.success }}>{selectedSeller.totalContacts}</div>
                  <Text type="secondary" style={{ fontSize: 11 }}>Total Contacts</Text>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ background: '#f8f9fa', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.warning }}>{selectedSeller.conversionRate}%</div>
                  <Text type="secondary" style={{ fontSize: 11 }}>Conversion</Text>
                </div>
              </Col>
            </Row>

            {/* Meetings by Type */}
            <Card title="Meetings by Type" size="small" style={{ marginBottom: 16 }}>
              <Row gutter={[8, 8]}>
                {Object.entries(selectedSeller.meetingsByType || {}).map(([type, count]) => {
                  const config = getMeetingTypeConfig(type);
                  return (
                    <Col span={12} key={type}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space>
                          <span style={{ color: config.color }}>{config.icon}</span>
                          <Text style={{ fontSize: 12 }}>{config.label}</Text>
                        </Space>
                        <Text strong>{count}</Text>
                      </div>
                    </Col>
                  );
                })}
              </Row>
            </Card>

            {/* Recent Meetings */}
            <Card title="Recent Meetings" size="small" style={{ marginBottom: 16 }}>
              {meetings.filter(m => m.sellerId === selectedSeller.id).slice(0, 5).map(meeting => {
                const type = getMeetingTypeConfig(meeting.type);
                return (
                  <div key={meeting.id} className="activity-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Space>
                        <span style={{ color: type.color }}>{type.icon}</span>
                        <Text strong>{type.label}</Text>
                      </Space>
                      <Tag color={meeting.result === 'won' ? 'success' : meeting.result === 'lost' ? 'error' : 'default'}>
                        {meeting.result || 'Scheduled'}
                      </Tag>
                    </div>
                    <div><strong>Client:</strong> {meeting.clientName}</div>
                    <div><strong>Date:</strong> {dayjs(meeting.scheduledAt).format('DD MMM YYYY, hh:mm A')}</div>
                    {meeting.notes && <div><Text type="secondary" style={{ fontSize: 12 }}>{meeting.notes}</Text></div>}
                  </div>
                );
              })}
              {meetings.filter(m => m.sellerId === selectedSeller.id).length === 0 && (
                <Empty description="No meetings recorded" />
              )}
            </Card>

            {/* Recent Contacts */}
            <Card title="Recent Contacts" size="small">
              {contacts.filter(c => c.sellerId === selectedSeller.id).slice(0, 5).map(contact => {
                const method = getContactMethodConfig(contact.method);
                return (
                  <div key={contact.id} className="activity-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Space>
                        <span style={{ color: method.color }}>{method.icon}</span>
                        <Text strong>{method.label}</Text>
                      </Space>
                      <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(contact.contactedAt).fromNow()}</Text>
                    </div>
                    <div><strong>Client:</strong> {contact.clientName}</div>
                    {contact.notes && <div><Text type="secondary" style={{ fontSize: 12 }}>{contact.notes}</Text></div>}
                  </div>
                );
              })}
              {contacts.filter(c => c.sellerId === selectedSeller.id).length === 0 && (
                <Empty description="No contacts recorded" />
              )}
            </Card>
          </div>
        )}
      </Drawer>

      {/* Schedule Meeting Modal */}
      <Modal
        title="Schedule Meeting"
        open={meetingModalVisible}
        onCancel={() => { setMeetingModalVisible(false); meetingForm.resetFields(); }}
        onOk={() => meetingForm.submit()}
        width={500}
      >
        <Form form={meetingForm} onFinish={handleAddMeeting} layout="vertical">
          <Form.Item name="clientName" label="Client Name" rules={[{ required: true }]}>
            <Input placeholder="Enter client name" />
          </Form.Item>
          <Form.Item name="type" label="Meeting Type" rules={[{ required: true }]} initialValue="initial">
            <Select>
              {MEETING_TYPES.map(t => (
                <Select.Option key={t.value} value={t.value}>
                  <Space>{t.icon} {t.label}</Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="scheduledAt" label="Date & Time" rules={[{ required: true }]}>
            <DatePicker showTime format="DD MMM YYYY, hh:mm A" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="duration" label="Duration (minutes)">
            <InputNumber min={15} step={15} style={{ width: '100%' }} placeholder="e.g., 30" />
          </Form.Item>
          <Form.Item name="location" label="Location">
            <Input placeholder="Office, Zoom link, Property address..." />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <TextArea rows={3} placeholder="Add meeting notes or agenda..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Log Contact Modal */}
      <Modal
        title="Log Contact"
        open={contactModalVisible}
        onCancel={() => { setContactModalVisible(false); contactForm.resetFields(); }}
        onOk={() => contactForm.submit()}
        width={500}
      >
        <Form form={contactForm} onFinish={handleAddContact} layout="vertical">
          <Form.Item name="clientName" label="Client Name" rules={[{ required: true }]}>
            <Input placeholder="Enter client name" />
          </Form.Item>
          <Form.Item name="method" label="Contact Method" rules={[{ required: true }]} initialValue="call">
            <Select>
              {CONTACT_METHODS.map(m => (
                <Select.Option key={m.value} value={m.value}>
                  <Space>{m.icon} {m.label}</Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="contactedAt" label="Date & Time" rules={[{ required: true }]}>
            <DatePicker showTime format="DD MMM YYYY, hh:mm A" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="purpose" label="Purpose">
            <Input placeholder="Initial contact, follow-up, negotiation..." />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <TextArea rows={3} placeholder="Summary of conversation..." />
          </Form.Item>
          <Form.Item name="nextAction" label="Next Action">
            <Input placeholder="Schedule follow-up, send proposal..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SellerPerformanceDashboard;