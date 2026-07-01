// pages/GeneralDashboard/index.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Row, Col, Card, Typography, Space, Button, DatePicker, Segmented,
  Table, Tag, Avatar, Tooltip, Empty, Spin, Statistic, Progress, Badge,
  Divider, Tabs, Drawer, Descriptions, Alert, message,
} from 'antd';
import {
  DashboardOutlined, ReloadOutlined, RiseOutlined, FallOutlined,
  TeamOutlined, UserAddOutlined, DollarOutlined, TrophyOutlined,
  ClockCircleOutlined, ThunderboltOutlined, FilterOutlined,
  HistoryOutlined, CalendarOutlined, ExportOutlined,
  InfoCircleOutlined, PercentageOutlined, EyeOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ArrowUpOutlined,
  ArrowDownOutlined, TrendingUpOutlined, TrendingDownOutlined,
  PieChartOutlined, BarChartOutlined, LineChartOutlined,
  UserOutlined, MailOutlined, PhoneOutlined,
} from '@ant-design/icons';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  Legend, ComposedChart,
} from 'recharts';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import relativeTime from 'dayjs/plugin/relativeTime';

import { db, collection, getDocs, query, where } from 'configs/FirebaseConfig';
import { LeadStatus, LeadStatusLabels } from 'models/LeadModel';
import { ContactStatus, ContactStatusLabels } from 'models/ContactModel';
import { DealStatus, DealStatusLabels } from 'models/DealModel';
import { UserRoles } from 'models/UserModel';

dayjs.extend(isBetween);
dayjs.extend(quarterOfYear);
dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// ─────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────
const PERIOD_PRESETS = ['Today', 'This Week', 'This Month', 'Last Month', 'This Quarter', 'Last Quarter', 'This Year', 'All Time', 'Custom'];

// Colors for charts
const COLORS = {
  leads: '#1677ff',
  contacts: '#52c41a',
  deals: '#faad14',
  won: '#52c41a',
  lost: '#ff4d4f',
  conversion: '#722ed1',
};

const STATUS_COLORS = {
  // Lead statuses
  [LeadStatus.NEW]: '#1677ff',
  [LeadStatus.CONTACTED]: '#2f54eb',
  [LeadStatus.INTERESTED]: '#13c2c2',
  [LeadStatus.NOT_INTERESTED]: '#fa541c',
  [LeadStatus.CONVERTED]: '#52c41a',
  [LeadStatus.JUNK_LEAD]: '#8c8c8c',
  // Contact statuses
  [ContactStatus.ACTIVE]: '#52c41a',
  [ContactStatus.HOT]: '#f5222d',
  [ContactStatus.COLD]: '#1890ff',
  [ContactStatus.PENDING]: '#faad14',
  [ContactStatus.CONTACTED]: '#2f54eb',
  [ContactStatus.INTERESTED]: '#13c2c2',
  [ContactStatus.NOT_INTERESTED]: '#fa541c',
  [ContactStatus.CONVERTED]: '#722ed1',
  [ContactStatus.DEAL]: '#fa8c16',
  [ContactStatus.LOSS]: '#ff4d4f',
  // Deal statuses
  [DealStatus.OPENED]: '#1890ff',
  [DealStatus.PROPOSAL]: '#722ed1',
  [DealStatus.WON]: '#faad14',
  [DealStatus.LOST]: '#ff4d4f',
  [DealStatus.GAIN]: '#52c41a',
  [DealStatus.LOSS]: '#ff4d4f',
};

// ─────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────
const getPeriodRange = (preset, custom) => {
  const now = dayjs();
  switch (preset) {
    case 'Today': return [now.startOf('day'), now.endOf('day')];
    case 'This Week': return [now.startOf('week'), now.endOf('week')];
    case 'This Month': return [now.startOf('month'), now.endOf('month')];
    case 'Last Month': return [now.subtract(1, 'month').startOf('month'), now.subtract(1, 'month').endOf('month')];
    case 'This Quarter': return [now.startOf('quarter'), now.endOf('quarter')];
    case 'Last Quarter': return [now.subtract(1, 'quarter').startOf('quarter'), now.subtract(1, 'quarter').endOf('quarter')];
    case 'This Year': return [now.startOf('year'), now.endOf('year')];
    case 'Custom': return custom && custom.length === 2 ? custom : [now.startOf('month'), now.endOf('month')];
    case 'All Time':
    default: return null;
  }
};

const getEntityDate = (entity, type) => {
  let d;
  if (type === 'lead') {
    d = entity.createdAt?.toDate?.() || entity.CreationDate?.toDate?.() || entity.CreationDate || entity.createdAt;
  } else if (type === 'contact') {
    d = entity.createdAt?.toDate?.() || entity.CreationDate?.toDate?.() || entity.CreationDate || entity.createdAt;
  } else if (type === 'deal') {
    d = entity.CreationDate?.toDate?.() || entity.CreationDate || entity.createdAt?.toDate?.() || entity.createdAt;
  }
  return d ? dayjs(d) : null;
};

const formatCurrency = (value) => {
  if (!value) return '0';
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(0);
};

const calculateTrend = (current, previous) => {
  if (!previous || previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
};

// ─────────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────────
const KpiCard = ({ title, value, icon, color, active, onClick, suffix, trend, subtitle, loading = false }) => (
  <Card
    hoverable
    onClick={onClick}
    bordered={false}
    loading={loading}
    style={{
      borderRadius: 14,
      cursor: 'pointer',
      boxShadow: active ? `0 0 0 2px ${color}, 0 6px 16px rgba(0,0,0,0.08)` : '0 2px 8px rgba(0,0,0,0.06)',
      transition: 'all .15s ease',
      background: active ? `${color}0d` : '#fff',
      height: '100%',
    }}
    bodyStyle={{ padding: '16px 18px' }}
  >
    <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
      <div style={{ flex: 1 }}>
        <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>
          {title}
        </Text>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
          <Title level={3} style={{ margin: 0, color, fontWeight: 700 }}>{value}</Title>
          {suffix && <Text type="secondary" style={{ fontSize: 12 }}>{suffix}</Text>}
        </div>
        {subtitle && <Text type="secondary" style={{ fontSize: 11 }}>{subtitle}</Text>}
        {trend !== undefined && trend !== null && (
          <Text style={{ fontSize: 11, color: trend >= 0 ? '#52c41a' : '#f5222d', fontWeight: 600 }}>
            {trend >= 0 ? <RiseOutlined /> : <FallOutlined />} {Math.abs(trend).toFixed(0)}% vs prior
          </Text>
        )}
      </div>
      <div style={{
        width: 42, height: 42, borderRadius: 12, background: `${color}1a`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontSize: 20, flexShrink: 0,
      }}>
        {icon}
      </div>
    </Space>
  </Card>
);

const ChartCard = ({ title, extra, children, height = 300, loading = false }) => (
  <Card
    bordered={false}
    loading={loading}
    style={{ borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: '100%' }}
    title={<span style={{ fontWeight: 600, fontSize: 14 }}>{title}</span>}
    extra={extra}
    bodyStyle={{ paddingTop: 12 }}
  >
    <div style={{ width: '100%', height }}>{children}</div>
  </Card>
);

// ─────────────────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────────────────
const GeneralDashboard = () => {
  const user = useSelector((state) => state.auth.user);
  const companyId = user?.company_id;
  const userRole = user?.Role;

  // Check if user is HR - HR should not see lead personal details
  const isHR = userRole === UserRoles.HR;

  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [sellers, setSellers] = useState([]);

  const [periodPreset, setPeriodPreset] = useState('This Month');
  const [customRange, setCustomRange] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);

  // ── Fetch all data ──────────────────────────────────────────────────────
  const fetchAllData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      // Fetch leads (HR can see leads but not personal details)
      const leadsSnap = await getDocs(query(collection(db, 'leads'), where('company_id', '==', companyId)));
      let leadsData = leadsSnap.docs.map((d) => ({ id: d.id, type: 'lead', ...d.data() }));
      
      // HR: Remove personal details from leads (email, phone, name)
      if (isHR) {
        leadsData = leadsData.map(lead => ({
          ...lead,
          // Mask personal details for HR
          name: lead.name ? '••••••••' : null,
          email: lead.email ? '••••••••@••••.com' : null,
          phoneNumber: lead.phoneNumber ? '••••••••' : null,
          phoneNumber2: lead.phoneNumber2 ? '••••••••' : null,
          phoneNumber3: lead.phoneNumber3 ? '••••••••' : null,
          // Keep non-personal fields
          status: lead.status,
          InterestLevel: lead.InterestLevel,
          RedirectedFrom: lead.RedirectedFrom,
          source: lead.source,
          seller_id: lead.seller_id,
          createdAt: lead.createdAt,
          CreationDate: lead.CreationDate,
          convertedContactId: lead.convertedContactId,
          isRevealed: lead.isRevealed,
          viewCount: lead.viewCount,
        }));
      }
      
      setLeads(leadsData);

      // Fetch contacts (HR can see all contact data)
      const contactsSnap = await getDocs(query(collection(db, 'contacts'), where('company_id', '==', companyId)));
      const contactsData = contactsSnap.docs.map((d) => ({ id: d.id, type: 'contact', ...d.data() }));
      setContacts(contactsData);

      // Fetch deals (HR can see all deal data)
      const dealsSnap = await getDocs(query(collection(db, 'deals'), where('company_id', '==', companyId)));
      const dealsData = dealsSnap.docs.map((d) => ({ id: d.id, type: 'deal', ...d.data() }));
      setDeals(dealsData);

      // Fetch sellers
      const usersSnap = await getDocs(query(collection(db, 'users'), where('company_id', '==', companyId)));
      const usersData = usersSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((u) => 
          [UserRoles.SELLER, UserRoles.SALES_EXECUTIVE, UserRoles.AGENT,
           UserRoles.TEAM_LEADER, UserRoles.SALES_MANAGER,
           UserRoles.OFF_PLAN_SALES, UserRoles.READY_TO_MOVE_SALES].includes(u.Role)
        )
        .map((u) => ({
          id: u.id,
          name: `${u.firstname || ''} ${u.lastname || ''}`.trim() || u.email || 'Unknown',
          email: u.email,
        }));
      setSellers(usersData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      message.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [companyId, isHR]);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  // ── Period filtering ────────────────────────────────────────────────
  const range = useMemo(() => getPeriodRange(periodPreset, customRange), [periodPreset, customRange]);

  const filteredData = useMemo(() => {
    if (!range) {
      return { leads, contacts, deals };
    }
    const [start, end] = range;
    return {
      leads: leads.filter((l) => {
        const d = getEntityDate(l, 'lead');
        return d && d.isBetween(start, end, 'day', '[]');
      }),
      contacts: contacts.filter((c) => {
        const d = getEntityDate(c, 'contact');
        return d && d.isBetween(start, end, 'day', '[]');
      }),
      deals: deals.filter((d) => {
        const dt = getEntityDate(d, 'deal');
        return dt && dt.isBetween(start, end, 'day', '[]');
      }),
    };
  }, [leads, contacts, deals, range]);

  // ── Previous period data ──────────────────────────────────────────────
  const previousData = useMemo(() => {
    if (!range) return { leads: [], contacts: [], deals: [] };
    const [start, end] = range;
    const lengthDays = end.diff(start, 'day') + 1;
    const priorStart = start.subtract(lengthDays, 'day');
    const priorEnd = start.subtract(1, 'day').endOf('day');
    
    return {
      leads: leads.filter((l) => {
        const d = getEntityDate(l, 'lead');
        return d && d.isBetween(priorStart, priorEnd, 'day', '[]');
      }),
      contacts: contacts.filter((c) => {
        const d = getEntityDate(c, 'contact');
        return d && d.isBetween(priorStart, priorEnd, 'day', '[]');
      }),
      deals: deals.filter((d) => {
        const dt = getEntityDate(d, 'deal');
        return dt && dt.isBetween(priorStart, priorEnd, 'day', '[]');
      }),
    };
  }, [leads, contacts, deals, range]);

  // ── Aggregated metrics ──────────────────────────────────────────────
  const metrics = useMemo(() => {
    const current = filteredData;
    const previous = previousData;

    const leadCount = current.leads.length;
    const prevLeadCount = previous.leads.length;
    const leadTrend = calculateTrend(leadCount, prevLeadCount);

    const contactCount = current.contacts.length;
    const prevContactCount = previous.contacts.length;
    const contactTrend = calculateTrend(contactCount, prevContactCount);

    const dealCount = current.deals.length;
    const prevDealCount = previous.deals.length;
    const dealTrend = calculateTrend(dealCount, prevDealCount);

    // Conversions
    const convertedLeads = current.leads.filter(l => 
      l.status === LeadStatus.CONVERTED || l.convertedContactId
    ).length;
    const leadConversionRate = leadCount > 0 ? (convertedLeads / leadCount) * 100 : 0;

    // Deals won
    const wonDeals = current.deals.filter(d => 
      d.Status === DealStatus.WON || d.Status === 'Won'
    ).length;
    const dealWinRate = dealCount > 0 ? (wonDeals / dealCount) * 100 : 0;

    // Deal values
    const totalDealValue = current.deals.reduce((sum, d) => sum + (Number(d.Amount) || 0), 0);
    const prevTotalDealValue = previous.deals.reduce((sum, d) => sum + (Number(d.Amount) || 0), 0);
    const valueTrend = calculateTrend(totalDealValue, prevTotalDealValue);

    // Won value
    const wonValue = current.deals
      .filter(d => d.Status === DealStatus.WON || d.Status === 'Won')
      .reduce((sum, d) => sum + (Number(d.Amount) || 0), 0);

    // Hot contacts
    const hotContacts = current.contacts.filter(c => 
      c.status === ContactStatus.HOT || c.InterestLevel === 'High'
    ).length;

    return {
      leadCount,
      leadTrend,
      contactCount,
      contactTrend,
      dealCount,
      dealTrend,
      convertedLeads,
      leadConversionRate,
      wonDeals,
      dealWinRate,
      totalDealValue,
      prevTotalDealValue,
      valueTrend,
      wonValue,
      hotContacts,
    };
  }, [filteredData, previousData]);

  // ── Time series data ────────────────────────────────────────────────
  const timeSeriesData = useMemo(() => {
    if (!range) return [];
    const [start, end] = range;
    const days = [];
    let current = start.clone();
    
    while (current.isBefore(end) || current.isSame(end, 'day')) {
      const key = current.format('DD MMM');
      const dayLeads = filteredData.leads.filter(l => {
        const d = getEntityDate(l, 'lead');
        return d && d.isSame(current, 'day');
      });
      const dayContacts = filteredData.contacts.filter(c => {
        const d = getEntityDate(c, 'contact');
        return d && d.isSame(current, 'day');
      });
      const dayDeals = filteredData.deals.filter(d => {
        const dt = getEntityDate(d, 'deal');
        return dt && dt.isSame(current, 'day');
      });
      const dayWon = dayDeals.filter(d => d.Status === DealStatus.WON || d.Status === 'Won').length;
      
      days.push({
        date: key,
        leads: dayLeads.length,
        contacts: dayContacts.length,
        deals: dayDeals.length,
        won: dayWon,
        timestamp: current.valueOf(),
      });
      current = current.add(1, 'day');
    }
    return days;
  }, [filteredData, range]);

  // ── Status distribution (combined) ──────────────────────────────────
  const combinedStatusData = useMemo(() => {
    const statusMap = {};
    
    // Lead statuses
    filteredData.leads.forEach(l => {
      const status = l.status || LeadStatus.NEW;
      const label = LeadStatusLabels[status] || status;
      if (!statusMap[label]) statusMap[label] = { label, count: 0, type: 'lead' };
      statusMap[label].count += 1;
    });
    
    // Contact statuses
    filteredData.contacts.forEach(c => {
      const status = c.status || ContactStatus.ACTIVE;
      const label = ContactStatusLabels[status] || status;
      if (!statusMap[label]) statusMap[label] = { label, count: 0, type: 'contact' };
      statusMap[label].count += 1;
    });
    
    // Deal statuses
    filteredData.deals.forEach(d => {
      const status = d.Status || DealStatus.OPENED;
      const label = DealStatusLabels[status] || status;
      if (!statusMap[label]) statusMap[label] = { label, count: 0, type: 'deal' };
      statusMap[label].count += 1;
    });
    
    return Object.values(statusMap).sort((a, b) => b.count - a.count);
  }, [filteredData]);

  // ── Source breakdown ────────────────────────────────────────────────
  const sourceData = useMemo(() => {
    const sources = {};
    filteredData.leads.forEach(l => {
      const src = l.RedirectedFrom || l.source || 'Other';
      sources[src] = (sources[src] || 0) + 1;
    });
    filteredData.contacts.forEach(c => {
      const src = c.source || c.RedirectedFrom || 'Other';
      sources[src] = (sources[src] || 0) + 1;
    });
    filteredData.deals.forEach(d => {
      const src = d.Source || 'Other';
      sources[src] = (sources[src] || 0) + 1;
    });
    return Object.entries(sources)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredData]);

  // ── Seller performance (aggregated) ──────────────────────────────────
  const sellerPerformance = useMemo(() => {
    return sellers.map(seller => {
      const sellerLeads = filteredData.leads.filter(l => l.seller_id === seller.id);
      const sellerContacts = filteredData.contacts.filter(c => c.seller_id === seller.id);
      const sellerDeals = filteredData.deals.filter(d => d.seller_id === seller.id);
      
      const won = sellerDeals.filter(d => d.Status === DealStatus.WON || d.Status === 'Won').length;
      const lost = sellerDeals.filter(d => d.Status === DealStatus.LOST || d.Status === 'Lost').length;
      
      return {
        ...seller,
        leads: sellerLeads.length,
        contacts: sellerContacts.length,
        deals: sellerDeals.length,
        won,
        lost,
        winRate: (won + lost) > 0 ? (won / (won + lost)) * 100 : 0,
        dealValue: sellerDeals.reduce((sum, d) => sum + (Number(d.Amount) || 0), 0),
      };
    })
    .filter(s => s.leads > 0 || s.contacts > 0 || s.deals > 0)
    .sort((a, b) => b.won - a.won || b.deals - a.deals);
  }, [sellers, filteredData]);

  // ── KPI Config ────────────────────────────────────────────────────────
  const kpis = [
    {
      key: 'leads',
      title: 'Total Leads',
      value: metrics.leadCount,
      icon: <TeamOutlined />,
      color: COLORS.leads,
      trend: metrics.leadTrend,
      subtitle: `${metrics.leadConversionRate.toFixed(0)}% converted`,
      onClick: () => setActiveFilter({ key: 'leads', label: 'Leads' }),
    },
    {
      key: 'contacts',
      title: 'Total Contacts',
      value: metrics.contactCount,
      icon: <UserAddOutlined />,
      color: COLORS.contacts,
      trend: metrics.contactTrend,
      subtitle: `${metrics.hotContacts} hot contacts`,
      onClick: () => setActiveFilter({ key: 'contacts', label: 'Contacts' }),
    },
    {
      key: 'deals',
      title: 'Total Deals',
      value: metrics.dealCount,
      icon: <DollarOutlined />,
      color: COLORS.deals,
      trend: metrics.dealTrend,
      subtitle: `${metrics.dealWinRate.toFixed(0)}% win rate`,
      onClick: () => setActiveFilter({ key: 'deals', label: 'Deals' }),
    },
    {
      key: 'value',
      title: 'Deal Value',
      value: `AED ${formatCurrency(metrics.totalDealValue)}`,
      icon: <TrophyOutlined />,
      color: '#52c41a',
      trend: metrics.valueTrend,
      subtitle: `${metrics.wonDeals} won · AED ${formatCurrency(metrics.wonValue)}`,
    },
  ];

  // ── Render entity details ──────────────────────────────────────────────
  const renderEntityDetails = () => {
    if (!selectedEntity) return <Empty description="Select an entity to view details" />;
    
    const { type } = selectedEntity;
    let details = [];
    
    if (type === 'lead') {
      // HR should not see personal details
      const isHRUser = isHR;
      details = [
        { label: 'Name', value: isHRUser ? '🔒 Restricted' : (selectedEntity.name || 'Unknown') },
        { label: 'Email', value: isHRUser ? '🔒 Restricted' : (selectedEntity.email || '—') },
        { label: 'Phone', value: isHRUser ? '🔒 Restricted' : (selectedEntity.phoneNumber || '—') },
        { label: 'Status', value: LeadStatusLabels[selectedEntity.status] || selectedEntity.status || 'New' },
        { label: 'Interest Level', value: selectedEntity.InterestLevel || '—' },
        { label: 'Source', value: selectedEntity.RedirectedFrom || selectedEntity.source || '—' },
        { label: 'Assigned To', value: sellers.find(s => s.id === selectedEntity.seller_id)?.name || 'Unassigned' },
        { label: 'Created', value: getEntityDate(selectedEntity, 'lead')?.format('DD MMM YYYY HH:mm') || '—' },
      ];
    } else if (type === 'contact') {
      details = [
        { label: 'Name', value: selectedEntity.name || 'Unknown' },
        { label: 'Email', value: selectedEntity.email || '—' },
        { label: 'Phone', value: selectedEntity.phoneNumber || '—' },
        { label: 'Status', value: ContactStatusLabels[selectedEntity.status] || selectedEntity.status || 'Active' },
        { label: 'Source', value: selectedEntity.source || selectedEntity.RedirectedFrom || '—' },
        { label: 'Assigned To', value: sellers.find(s => s.id === selectedEntity.seller_id)?.name || 'Unassigned' },
        { label: 'Created', value: getEntityDate(selectedEntity, 'contact')?.format('DD MMM YYYY HH:mm') || '—' },
      ];
    } else if (type === 'deal') {
      details = [
        { label: 'Contact', value: selectedEntity.contact_name || 'Unknown' },
        { label: 'Description', value: selectedEntity.Description || '—' },
        { label: 'Amount', value: `AED ${(Number(selectedEntity.Amount) || 0).toLocaleString()}` },
        { label: 'Status', value: DealStatusLabels[selectedEntity.Status] || selectedEntity.Status || 'Opened' },
        { label: 'Source', value: selectedEntity.Source || '—' },
        { label: 'Assigned To', value: sellers.find(s => s.id === selectedEntity.seller_id)?.name || 'Unassigned' },
        { label: 'Created', value: getEntityDate(selectedEntity, 'deal')?.format('DD MMM YYYY HH:mm') || '—' },
      ];
    }
    
    return (
      <Descriptions bordered column={1} size="small">
        {details.map((d, i) => (
          <Descriptions.Item key={i} label={d.label}>
            {d.label === 'Name' && isHR && d.value === '🔒 Restricted' ? (
              <Tooltip title="Personal details are restricted for HR users">
                <span style={{ color: '#faad14' }}>🔒 Restricted</span>
              </Tooltip>
            ) : d.label === 'Email' && isHR && d.value === '🔒 Restricted' ? (
              <Tooltip title="Personal details are restricted for HR users">
                <span style={{ color: '#faad14' }}>🔒 Restricted</span>
              </Tooltip>
            ) : d.label === 'Phone' && isHR && d.value === '🔒 Restricted' ? (
              <Tooltip title="Personal details are restricted for HR users">
                <span style={{ color: '#faad14' }}>🔒 Restricted</span>
              </Tooltip>
            ) : d.value}
          </Descriptions.Item>
        ))}
      </Descriptions>
    );
  };

  // ── Recent activity table columns with HR restrictions ──────────────
  const getRecentActivityColumns = () => {
    const baseColumns = [
      {
        title: 'Type',
        key: 'type',
        width: 100,
        render: (_, r) => (
          <Tag color={
            r.entityType === 'lead' ? COLORS.leads :
            r.entityType === 'contact' ? COLORS.contacts :
            COLORS.deals
          }>
            {r.entityType === 'lead' ? <TeamOutlined /> :
             r.entityType === 'contact' ? <UserAddOutlined /> :
             <DollarOutlined />}
            {' '}{r.entityType.toUpperCase()}
          </Tag>
        ),
      },
      {
        title: 'Name',
        key: 'name',
        width: 180,
        render: (_, r) => {
          // HR should not see lead names
          if (r.entityType === 'lead' && isHR) {
            return (
              <Tooltip title="Personal details are restricted for HR users">
                <span style={{ color: '#faad14' }}>
                  <UserOutlined /> 🔒 Restricted
                </span>
              </Tooltip>
            );
          }
          return <Text strong>{r.name || r.contact_name || 'Unknown'}</Text>;
        },
      },
      {
        title: 'Status',
        key: 'status',
        width: 130,
        render: (_, r) => {
          const status = r.status || r.Status || 'New';
          return <Tag color={STATUS_COLORS[status] || 'default'}>{status}</Tag>;
        },
      },
      {
        title: 'Assigned To',
        key: 'seller',
        width: 140,
        render: (_, r) => sellers.find(s => s.id === (r.seller_id))?.name || <Text type="secondary">Unassigned</Text>,
      },
      {
        title: 'Created',
        key: 'created',
        width: 130,
        render: (_, r) => getEntityDate(r, r.entityType)?.format('DD MMM YYYY') || '—',
      },
    ];

    // Add contact info column for non-HR users
    if (!isHR) {
      baseColumns.splice(2, 0, {
        title: 'Contact Info',
        key: 'contact',
        width: 180,
        render: (_, r) => {
          if (r.entityType === 'lead') {
            return (
              <Space>
                {r.email && <MailOutlined style={{ color: '#1677ff' }} />}
                {r.phoneNumber && <PhoneOutlined style={{ color: '#52c41a' }} />}
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {r.email || r.phoneNumber || '—'}
                </Text>
              </Space>
            );
          }
          return <Text type="secondary" style={{ fontSize: 11 }}>—</Text>;
        },
      });
    }

    return baseColumns;
  };

  if (!companyId) {
    return <Empty description="No company context found" style={{ marginTop: 80 }} />;
  }

  // ── HR restriction banner ─────────────────────────────────────────────
  const isHrRestricted = isHR;

  return (
    <div style={{ padding: '0 0 24px' }}>
      {/* HR Restriction Banner */}
      {isHrRestricted && (
        <Alert
          message="HR View Mode - Personal Data Restricted"
          description="Lead names, emails, and phone numbers are hidden for HR users to protect privacy."
          type="info"
          showIcon
          icon={<UserOutlined />}
          style={{ marginBottom: 16, borderRadius: 8 }}
        />
      )}
      
      <Spin spinning={loading}>
        <Row gutter={[24, 24]}>
          {/* HEADER */}
          <Col span={24}>
            <Card
              bordered={false}
              style={{ 
                borderRadius: 16, 
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)', 
                background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)' 
              }}
              bodyStyle={{ padding: '20px 24px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <Title level={3} style={{ margin: 0, fontWeight: 600 }}>
                    <DashboardOutlined style={{ color: '#1677ff', marginRight: 8 }} />
                    General Dashboard
                    {isHrRestricted && (
                      <Tag color="geekblue" style={{ marginLeft: 8 }}>HR View</Tag>
                    )}
                  </Title>
                  <Text type="secondary">Unified view of leads, contacts, and deals performance</Text>
                </div>
                <Space wrap size={10}>
                  <Segmented
                    options={PERIOD_PRESETS}
                    value={periodPreset}
                    onChange={(v) => { setPeriodPreset(v); setActiveFilter(null); }}
                  />
                  {periodPreset === 'Custom' && (
                    <RangePicker
                      value={customRange}
                      onChange={(dates) => setCustomRange(dates)}
                      format="DD/MM/YYYY"
                    />
                  )}
                  <Button icon={<ReloadOutlined />} onClick={fetchAllData} loading={loading}>Refresh</Button>
                </Space>
              </div>
            </Card>
          </Col>

          {/* KPI CARDS */}
          <Col span={24}>
            <Row gutter={[16, 16]}>
              {kpis.map((k) => (
                <Col xs={12} sm={6} key={k.key}>
                  <KpiCard
                    title={k.title}
                    value={k.value}
                    icon={k.icon}
                    color={k.color}
                    subtitle={k.subtitle}
                    trend={k.trend}
                    active={activeFilter?.key === k.key}
                    onClick={k.onClick}
                  />
                </Col>
              ))}
            </Row>
          </Col>

          {/* TIME SERIES CHART */}
          <Col span={24}>
            <ChartCard
              title="Activity Over Time"
              extra={
                <Space>
                  <Tag color={COLORS.leads}>Leads</Tag>
                  <Tag color={COLORS.contacts}>Contacts</Tag>
                  <Tag color={COLORS.deals}>Deals</Tag>
                  <Tag color="gold">Won</Tag>
                </Space>
              }
            >
              {timeSeriesData.length > 0 ? (
                <ResponsiveContainer>
                  <ComposedChart data={timeSeriesData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <RTooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="leads" name="Leads" fill={COLORS.leads} radius={[2, 2, 0, 0]} />
                    <Bar yAxisId="left" dataKey="contacts" name="Contacts" fill={COLORS.contacts} radius={[2, 2, 0, 0]} />
                    <Bar yAxisId="left" dataKey="deals" name="Deals" fill={COLORS.deals} radius={[2, 2, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="won" name="Won" stroke="gold" strokeWidth={2} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : <Empty description="No data in this period" style={{ marginTop: 60 }} />}
            </ChartCard>
          </Col>

          {/* STATUS DISTRIBUTION & SOURCE BREAKDOWN */}
          <Col xs={24} lg={12}>
            <ChartCard title="Status Distribution (All Entities)">
              {combinedStatusData.length > 0 ? (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={combinedStatusData}
                      dataKey="count"
                      nameKey="label"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={1}
                    >
                      {combinedStatusData.map((entry, index) => (
                        <Cell key={index} fill={Object.values(STATUS_COLORS)[index % Object.values(STATUS_COLORS).length]} />
                      ))}
                    </Pie>
                    <RTooltip />
                    <Legend wrapperStyle={{ fontSize: 11, maxHeight: 80, overflowY: 'auto' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <Empty description="No data" style={{ marginTop: 60 }} />}
            </ChartCard>
          </Col>

          <Col xs={24} lg={12}>
            <ChartCard title="Top Sources" height={300}>
              {sourceData.length > 0 ? (
                <ResponsiveContainer>
                  <BarChart data={sourceData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                    <RTooltip />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]} fill="#722ed1">
                      {sourceData.map((entry, index) => (
                        <Cell key={index} fill={['#1677ff', '#52c41a', '#faad14', '#722ed1', '#ff4d4f', '#13c2c2', '#fa541c'][index % 7]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <Empty description="No data" style={{ marginTop: 40 }} />}
            </ChartCard>
          </Col>

          {/* SELLER PERFORMANCE */}
          <Col span={24}>
            <Card
              bordered={false}
              style={{ borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
              title={<span style={{ fontWeight: 600, fontSize: 14 }}><ThunderboltOutlined style={{ color: '#faad14', marginRight: 6 }} />Seller Performance Summary</span>}
              bodyStyle={{ padding: 0 }}
            >
              <Table
                dataSource={sellerPerformance}
                rowKey="id"
                size="middle"
                pagination={false}
                scroll={{ x: 1000 }}
                columns={[
                  {
                    title: 'Seller',
                    dataIndex: 'name',
                    key: 'name',
                    fixed: 'left',
                    width: 160,
                    render: (text) => (
                      <Space>
                        <Avatar size={28} style={{ background: '#1677ff', fontSize: 12 }}>
                          {(text || 'U')[0]?.toUpperCase()}
                        </Avatar>
                        <Text strong style={{ fontSize: 13 }}>{text}</Text>
                      </Space>
                    ),
                  },
                  {
                    title: 'Leads',
                    dataIndex: 'leads',
                    key: 'leads',
                    width: 90,
                    render: (v) => <Tag color="blue">{v}</Tag>,
                    sorter: (a, b) => a.leads - b.leads,
                  },
                  {
                    title: 'Contacts',
                    dataIndex: 'contacts',
                    key: 'contacts',
                    width: 100,
                    render: (v) => <Tag color="green">{v}</Tag>,
                    sorter: (a, b) => a.contacts - b.contacts,
                  },
                  {
                    title: 'Deals',
                    dataIndex: 'deals',
                    key: 'deals',
                    width: 90,
                    render: (v) => <Tag color="gold">{v}</Tag>,
                    sorter: (a, b) => a.deals - b.deals,
                  },
                  {
                    title: 'Won',
                    dataIndex: 'won',
                    key: 'won',
                    width: 90,
                    render: (v) => <Tag color="green"><TrophyOutlined /> {v}</Tag>,
                    sorter: (a, b) => a.won - b.won,
                    defaultSortOrder: 'descend',
                  },
                  {
                    title: 'Lost',
                    dataIndex: 'lost',
                    key: 'lost',
                    width: 90,
                    render: (v) => <Tag color="red">{v}</Tag>,
                    sorter: (a, b) => a.lost - b.lost,
                  },
                  {
                    title: 'Win Rate',
                    dataIndex: 'winRate',
                    key: 'winRate',
                    width: 160,
                    render: (v) => (
                      <Space>
                        <Progress
                          percent={Math.round(v)}
                          size="small"
                          strokeColor={v >= 50 ? '#52c41a' : v >= 30 ? '#faad14' : '#f5222d'}
                          style={{ width: 90 }}
                        />
                        <Text style={{ fontSize: 12 }}>{v.toFixed(0)}%</Text>
                      </Space>
                    ),
                    sorter: (a, b) => a.winRate - b.winRate,
                  },
                  {
                    title: 'Deal Value',
                    dataIndex: 'dealValue',
                    key: 'dealValue',
                    width: 120,
                    render: (v) => <Text strong style={{ color: '#52c41a' }}>AED {formatCurrency(v)}</Text>,
                    sorter: (a, b) => a.dealValue - b.dealValue,
                  },
                ]}
                locale={{ emptyText: <Empty description="No seller activity in this period" /> }}
              />
            </Card>
          </Col>

          {/* RECENT ACTIVITY */}
          <Col span={24}>
            <Card
              bordered={false}
              style={{ borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
              title={<span style={{ fontWeight: 600, fontSize: 14 }}><ClockCircleOutlined style={{ color: '#1677ff', marginRight: 6 }} />Recent Activity</span>}
              extra={
                <Space>
                  {activeFilter && (
                    <Button size="small" onClick={() => setActiveFilter(null)}>Clear filter</Button>
                  )}
                  <Badge count={filteredData.leads.length + filteredData.contacts.length + filteredData.deals.length} />
                  {isHR && (
                    <Tooltip title="Personal details are hidden for HR users">
                      <Tag color="geekblue" style={{ fontSize: 10 }}>
                        <UserOutlined /> HR View
                      </Tag>
                    </Tooltip>
                  )}
                </Space>
              }
              bodyStyle={{ padding: 0 }}
            >
              {(() => {
                const allEntities = [
                  ...filteredData.leads.map(l => ({ ...l, entityType: 'lead' })),
                  ...filteredData.contacts.map(c => ({ ...c, entityType: 'contact' })),
                  ...filteredData.deals.map(d => ({ ...d, entityType: 'deal' })),
                ].sort((a, b) => {
                  const da = getEntityDate(a, a.entityType);
                  const db = getEntityDate(b, b.entityType);
                  return (db?.valueOf() || 0) - (da?.valueOf() || 0);
                }).slice(0, 20);

                if (allEntities.length === 0) {
                  return <Empty description="No activity in this period" style={{ padding: 40 }} />;
                }

                return (
                  <Table
                    dataSource={allEntities}
                    rowKey="id"
                    size="small"
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 900 }}
                    onRow={(record) => ({
                      onClick: () => {
                        setSelectedEntity(record);
                        setDetailDrawerVisible(true);
                      },
                      style: { cursor: 'pointer' },
                    })}
                    columns={getRecentActivityColumns()}
                  />
                );
              })()}
            </Card>
          </Col>
        </Row>
      </Spin>

      {/* DETAIL DRAWER */}
      <Drawer
        title={
          <Space>
            <InfoCircleOutlined />
            <span>Entity Details</span>
            {selectedEntity && (
              <Tag color={
                selectedEntity.type === 'lead' ? COLORS.leads :
                selectedEntity.type === 'contact' ? COLORS.contacts :
                COLORS.deals
              }>
                {selectedEntity.type?.toUpperCase()}
                {isHR && selectedEntity.type === 'lead' && (
                  <span style={{ marginLeft: 4 }}>🔒</span>
                )}
              </Tag>
            )}
          </Space>
        }
        placement="right"
        width={500}
        open={detailDrawerVisible}
        onClose={() => setDetailDrawerVisible(false)}
        extra={
          isHR && selectedEntity?.type === 'lead' ? (
            <Tooltip title="Personal details are restricted for HR users">
              <Tag color="geekblue">
                <UserOutlined /> HR View
              </Tag>
            </Tooltip>
          ) : null
        }
      >
        {renderEntityDetails()}
      </Drawer>
    </div>
  );
};

export default GeneralDashboard;