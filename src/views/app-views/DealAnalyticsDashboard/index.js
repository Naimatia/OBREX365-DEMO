// pages/DealAnalyticsDashboard/index.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Row, Col, Card, Typography, Space, Button, Select, DatePicker, Radio,
  Table, Tag, Avatar, Tooltip, Empty, Spin, Statistic, Segmented, Progress, Badge,
  Timeline, Divider, Collapse, List, Tabs, Drawer, Descriptions, Alert,
  Modal, Form, Input, message,
} from 'antd';
import {
  TeamOutlined, UserAddOutlined, PhoneOutlined, StarOutlined, CheckCircleOutlined,
  CloseCircleOutlined, DeleteOutlined, ReloadOutlined, RiseOutlined, FallOutlined,
  EyeOutlined, ThunderboltOutlined, TrophyOutlined, ClockCircleOutlined, FilterOutlined,
  FacebookOutlined, GlobalOutlined, InstagramOutlined, GoogleOutlined, LinkOutlined,
  HistoryOutlined, CalendarOutlined, UserSwitchOutlined, BarChartOutlined,
  LineChartOutlined, PieChartOutlined, FileTextOutlined, ExportOutlined,
  ArrowLeftOutlined, ArrowRightOutlined, InfoCircleOutlined, DollarOutlined,
  ShoppingOutlined, HeartOutlined, MailOutlined, WhatsAppOutlined,
  AudioOutlined, VideoCameraOutlined, FileDoneOutlined, RiseOutlined as RiseIcon,
  FallOutlined as FallIcon, WalletOutlined, PercentageOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  Legend, FunnelChart, Funnel, LabelList, ComposedChart, Scatter,
} from 'recharts';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import relativeTime from 'dayjs/plugin/relativeTime';

import { db, collection, getDocs, query, where, orderBy, limit, doc, getDoc } from 'configs/FirebaseConfig';
import dealService from 'services/firebase/DealService';
import { DealStatus, DealStatusLabels, DealStatusColors, DealSourceEnum, DealPriority } from 'models/DealModel';
import { UserRoles } from 'models/UserModel';
import sellerActivityService, { ActivityTypes, EntityTypes } from 'services/firebase/SellerActivityService';

dayjs.extend(isBetween);
dayjs.extend(quarterOfYear);
dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { TabPane } = Tabs;
const { TextArea } = Input;

// ─────────────────────────────────────────────────────────────────────────
// Constants / palette
// ─────────────────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  [DealStatus.OPENED]: '#1890ff',
  [DealStatus.PROPOSAL]: '#722ed1',
  [DealStatus.WON]: '#faad14',
  [DealStatus.LOST]: '#ff4d4f',
  [DealStatus.GAIN]: '#52c41a',
  [DealStatus.LOSS]: '#ff4d4f',
};

const STATUS_ICONS = {
  [DealStatus.OPENED]: <ClockCircleOutlined />,
  [DealStatus.PROPOSAL]: <FileDoneOutlined />,
  [DealStatus.WON]: <TrophyOutlined />,
  [DealStatus.LOST]: <CloseCircleOutlined />,
  [DealStatus.GAIN]: <CheckCircleOutlined />,
  [DealStatus.LOSS]: <DeleteOutlined />,
};

const STATUS_LABELS = DealStatusLabels;

const SOURCE_ICONS = {
  [DealSourceEnum.LEADS]: <TeamOutlined />,
  [DealSourceEnum.CONTACTS]: <UserAddOutlined />,
  [DealSourceEnum.FACEBOOK]: <FacebookOutlined />,
  [DealSourceEnum.INSTAGRAM]: <InstagramOutlined />,
  [DealSourceEnum.WEBSITE]: <GlobalOutlined />,
  [DealSourceEnum.LINKEDIN]: <LinkOutlined />,
  [DealSourceEnum.TIKTOK]: <span>🎵</span>,
  [DealSourceEnum.FREELANCE]: <UserOutlined />,
};

const SOURCE_COLORS = {
  [DealSourceEnum.LEADS]: '#1890ff',
  [DealSourceEnum.CONTACTS]: '#52c41a',
  [DealSourceEnum.FACEBOOK]: '#1877F2',
  [DealSourceEnum.INSTAGRAM]: '#E4405F',
  [DealSourceEnum.WEBSITE]: '#13c2c2',
  [DealSourceEnum.LINKEDIN]: '#0A66C2',
  [DealSourceEnum.TIKTOK]: '#ff0050',
  [DealSourceEnum.FREELANCE]: '#fa8c16',
};

const salesRoles = [
  UserRoles.SELLER, UserRoles.SALES_EXECUTIVE, UserRoles.AGENT,
  UserRoles.TEAM_LEADER, UserRoles.SALES_MANAGER,
  UserRoles.OFF_PLAN_SALES, UserRoles.READY_TO_MOVE_SALES,
];

const PERIOD_PRESETS = ['Today', 'This Week', 'This Month', 'Last Month', 'This Quarter', 'This Year', 'All Time', 'Custom'];

// ─────────────────────────────────────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────────────────────────────────────
const getPeriodRange = (preset, custom) => {
  const now = dayjs();
  switch (preset) {
    case 'Today': return [now.startOf('day'), now.endOf('day')];
    case 'This Week': return [now.startOf('week'), now.endOf('week')];
    case 'This Month': return [now.startOf('month'), now.endOf('month')];
    case 'Last Month': return [now.subtract(1, 'month').startOf('month'), now.subtract(1, 'month').endOf('month')];
    case 'This Quarter': return [now.startOf('quarter'), now.endOf('quarter')];
    case 'This Year': return [now.startOf('year'), now.endOf('year')];
    case 'Custom': return custom && custom.length === 2 ? custom : [now.startOf('month'), now.endOf('month')];
    case 'All Time':
    default: return null;
  }
};

const getDealDate = (deal) => {
  const d = deal.CreationDate?.toDate?.() || deal.CreationDate || deal.createdAt?.toDate?.() || deal.createdAt;
  return d ? dayjs(d) : null;
};

const getLastUpdateDate = (deal) => {
  const d = deal.LastUpdateDate?.toDate?.() || deal.LastUpdateDate || deal.updatedAt?.toDate?.() || deal.updatedAt;
  return d ? dayjs(d) : null;
};

const fmtDateKey = (d, granularity) => {
  if (granularity === 'hour') return d.format('HH:00');
  if (granularity === 'day') return d.format('DD MMM');
  if (granularity === 'week') return `Wk ${d.week ? d.week() : d.format('WW')}`;
  return d.format('MMM YYYY');
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
            {trend >= 0 ? <RiseIcon /> : <FallIcon />} {Math.abs(trend).toFixed(0)}% vs prior period
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
const DealAnalyticsDashboard = () => {
  const user = useSelector((state) => state.auth.user);
  const companyId = user?.company_id;
  const userRole = user?.Role;
  const sellerId = user?.id;

  const isAdmin = [UserRoles.CEO, UserRoles.SUPER_ADMIN, UserRoles.MANAGER, UserRoles.ADMIN].includes(userRole);

  const [loading, setLoading] = useState(false);
  const [deals, setDeals] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [dealHistory, setDealHistory] = useState({});
  const [historyLoading, setHistoryLoading] = useState(false);

  const [periodPreset, setPeriodPreset] = useState('This Month');
  const [customRange, setCustomRange] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null);
  const [historyDrawerVisible, setHistoryDrawerVisible] = useState(false);
  const [selectedDealForHistory, setSelectedDealForHistory] = useState(null);
  const [selectedSellerForComparison, setSelectedSellerForComparison] = useState(null);

  // ── Fetch data ──────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      // Fetch all deals for the company
      const dealsSnap = await getDocs(query(collection(db, 'deals'), where('company_id', '==', companyId)));
      let dealsData = dealsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        _createdAt: d.data().CreationDate?.toDate?.() || d.data().createdAt?.toDate?.() || null,
        _updatedAt: d.data().LastUpdateDate?.toDate?.() || d.data().updatedAt?.toDate?.() || null,
      }));

      // If not admin, filter to show only deals the seller has access to
      if (!isAdmin) {
        dealsData = dealsData.filter(d => d.seller_id === sellerId || d.createdBy === sellerId);
      }

      setDeals(dealsData);

      // Fetch sellers
      const usersSnap = await getDocs(query(collection(db, 'users'), where('company_id', '==', companyId)));
      const usersData = usersSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((u) => salesRoles.includes(u.Role))
        .map((u) => ({
          id: u.id,
          name: `${u.firstname || ''} ${u.lastname || ''}`.trim() || u.email || 'Unknown',
          email: u.email,
          phone: u.phoneNumber || u.phone,
          role: u.Role,
        }));
      setSellers(usersData);

      // Fetch history for recent deals
      await fetchDealHistory(dealsData.slice(0, 20));
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      message.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [companyId, isAdmin, sellerId]);

  const fetchDealHistory = async (recentDeals) => {
    setHistoryLoading(true);
    try {
      const historyMap = {};
      for (const deal of recentDeals) {
        try {
          // Use sellerActivityService to get history for this deal
          const history = await sellerActivityService.getEntityHistory('deal', deal.id);
          historyMap[deal.id] = history || [];
        } catch (err) {
          console.warn(`Failed to fetch history for deal ${deal.id}:`, err);
          historyMap[deal.id] = [];
        }
      }
      setDealHistory(historyMap);
    } catch (err) {
      console.error('Error fetching deal history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Period filtering ────────────────────────────────────────────────
  const range = useMemo(() => getPeriodRange(periodPreset, customRange), [periodPreset, customRange]);

  const periodDeals = useMemo(() => {
    if (!range) return deals;
    const [start, end] = range;
    return deals.filter((d) => {
      const dt = getDealDate(d);
      return dt && dt.isBetween(start, end, 'day', '[]');
    });
  }, [deals, range]);

  // Previous period for comparison
  const previousPeriodDeals = useMemo(() => {
    if (!range) return [];
    const [start, end] = range;
    const lengthDays = end.diff(start, 'day') + 1;
    const priorStart = start.subtract(lengthDays, 'day');
    const priorEnd = start.subtract(1, 'day').endOf('day');
    return deals.filter((d) => {
      const dt = getDealDate(d);
      return dt && dt.isBetween(priorStart, priorEnd, 'day', '[]');
    });
  }, [deals, range]);

  const trendFor = (currentCount, key) => {
    const priorCount = key
      ? previousPeriodDeals.filter((d) => (d.Status || DealStatus.OPENED) === key).length
      : previousPeriodDeals.length;
    if (!priorCount) return currentCount > 0 ? 100 : null;
    return ((currentCount - priorCount) / priorCount) * 100;
  };

  // ── KPI aggregates ──────────────────────────────────────────────────
  const statusCounts = useMemo(() => {
    const counts = {};
    Object.values(DealStatus).forEach((s) => { counts[s] = 0; });
    periodDeals.forEach((d) => {
      const s = d.Status || DealStatus.OPENED;
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [periodDeals]);

  const totalCount = periodDeals.length;
  const wonCount = periodDeals.filter(d => d.Status === DealStatus.WON || d.Status === 'Won').length;
  const lostCount = periodDeals.filter(d => d.Status === DealStatus.LOST || d.Status === 'Lost').length;
  const proposalCount = periodDeals.filter(d => d.Status === DealStatus.PROPOSAL || d.Status === 'Proposal').length;
  const openedCount = periodDeals.filter(d => d.Status === DealStatus.OPENED || d.Status === 'Opened').length;
  
  // Win rate
  const winRate = (wonCount + lostCount) > 0 ? (wonCount / (wonCount + lostCount)) * 100 : 0;
  
  // Total value
  const totalValue = periodDeals.reduce((sum, d) => sum + (Number(d.Amount) || 0), 0);
  const avgDealValue = totalCount > 0 ? totalValue / totalCount : 0;
  
  // Won value
  const wonValue = periodDeals
    .filter(d => d.Status === DealStatus.WON || d.Status === 'Won')
    .reduce((sum, d) => sum + (Number(d.Amount) || 0), 0);

  // ── Trend chart data ────────────────────────────────────────────────
  const trendData = useMemo(() => {
    if (!periodDeals.length) return [];
    let granularity = 'day';
    if (periodPreset === 'Today') granularity = 'hour';
    else if (periodPreset === 'This Year' || periodPreset === 'All Time') granularity = 'month';

    const buckets = new Map();
    periodDeals.forEach((d) => {
      const dt = getDealDate(d);
      if (!dt) return;
      const key = fmtDateKey(dt, granularity);
      if (!buckets.has(key)) buckets.set(key, { name: key, total: 0, won: 0, proposal: 0, lost: 0, sortKey: dt.valueOf() });
      const bucket = buckets.get(key);
      bucket.total += 1;
      if (d.Status === DealStatus.WON || d.Status === 'Won') bucket.won += 1;
      if (d.Status === DealStatus.PROPOSAL || d.Status === 'Proposal') bucket.proposal += 1;
      if (d.Status === DealStatus.LOST || d.Status === 'Lost') bucket.lost += 1;
    });
    return Array.from(buckets.values()).sort((a, b) => a.sortKey - b.sortKey);
  }, [periodDeals, periodPreset]);

  // ── Status distribution ──────────────────────────────────────────────
  const statusPieData = useMemo(() => (
    Object.entries(statusCounts)
      .filter(([, v]) => v > 0)
      .map(([status, value]) => ({ name: STATUS_LABELS[status] || status, status, value }))
  ), [statusCounts]);

  // ── Source breakdown ────────────────────────────────────────────────
  const sourceData = useMemo(() => {
    const counts = {};
    periodDeals.forEach((d) => {
      const src = d.Source || 'Other';
      counts[src] = (counts[src] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value, color: SOURCE_COLORS[name] || '#8c8c8c' }))
      .sort((a, b) => b.value - a.value);
  }, [periodDeals]);

  // ── Conversion funnel ────────────────────────────────────────────────
  const funnelData = useMemo(() => {
    const total = periodDeals.length;
    const opened = periodDeals.filter(d => d.Status === DealStatus.OPENED || d.Status === 'Opened').length;
    const proposal = periodDeals.filter(d => d.Status === DealStatus.PROPOSAL || d.Status === 'Proposal').length;
    const won = periodDeals.filter(d => d.Status === DealStatus.WON || d.Status === 'Won').length;
    return [
      { name: 'Total Deals', value: total, fill: '#1677ff' },
      { name: 'Opened', value: opened, fill: '#2f54eb' },
      { name: 'Proposal', value: proposal, fill: '#722ed1' },
      { name: 'Won', value: won, fill: '#faad14' },
    ];
  }, [periodDeals]);

  // ── Seller performance ──────────────────────────────────────────────
  const sellerPerf = useMemo(() => {
    return sellers.map((seller) => {
      const assigned = periodDeals.filter((d) => d.seller_id === seller.id);
      const created = periodDeals.filter((d) => d.createdBy === seller.id);
      const won = assigned.filter((d) => d.Status === DealStatus.WON || d.Status === 'Won');
      const lost = assigned.filter((d) => d.Status === DealStatus.LOST || d.Status === 'Lost');
      const proposal = assigned.filter((d) => d.Status === DealStatus.PROPOSAL || d.Status === 'Proposal');
      const opened = assigned.filter((d) => d.Status === DealStatus.OPENED || d.Status === 'Opened');
      
      const totalValue = assigned.reduce((sum, d) => sum + (Number(d.Amount) || 0), 0);
      const wonValue = won.reduce((sum, d) => sum + (Number(d.Amount) || 0), 0);
      
      const conversionRate = (won.length + lost.length) > 0 ? (won.length / (won.length + lost.length)) * 100 : 0;

      return {
        id: seller.id,
        name: seller.name,
        email: seller.email,
        phone: seller.phone,
        assignedCount: assigned.length,
        createdCount: created.length,
        openedCount: opened.length,
        proposalCount: proposal.length,
        wonCount: won.length,
        lostCount: lost.length,
        totalValue: totalValue,
        wonValue: wonValue,
        conversionRate: conversionRate,
        avgDealValue: assigned.length > 0 ? totalValue / assigned.length : 0,
      };
    })
    .filter((s) => s.assignedCount > 0 || s.createdCount > 0)
    .sort((a, b) => b.wonCount - a.wonCount || b.assignedCount - a.assignedCount);
  }, [sellers, periodDeals]);

  // ── Month-over-month comparison ──────────────────────────────────────
  const monthOverMonth = useMemo(() => {
    const months = [];
    const now = dayjs();
    for (let i = 5; i >= 0; i--) {
      const month = now.subtract(i, 'month');
      const start = month.startOf('month');
      const end = month.endOf('month');
      const monthDeals = deals.filter((d) => {
        const dt = getDealDate(d);
        return dt && dt.isBetween(start, end, 'day', '[]');
      });
      const monthWon = monthDeals.filter(d => d.Status === DealStatus.WON || d.Status === 'Won').length;
      const monthValue = monthDeals.reduce((sum, d) => sum + (Number(d.Amount) || 0), 0);
      months.push({
        month: month.format('MMM YYYY'),
        total: monthDeals.length,
        won: monthWon,
        value: monthValue,
        rate: monthDeals.length > 0 ? (monthWon / monthDeals.length) * 100 : 0,
      });
    }
    return months;
  }, [deals]);

  // ── Filtered table ───────────────────────────────────────────────────
  const filteredTableDeals = useMemo(() => {
    if (!activeFilter) return periodDeals;
    const { type, value } = activeFilter;
    if (type === 'status') return periodDeals.filter((d) => (d.Status || DealStatus.OPENED) === value);
    if (type === 'source') return periodDeals.filter((d) => (d.Source || 'Other') === value);
    if (type === 'seller') return periodDeals.filter((d) => d.seller_id === value);
    if (type === 'all') return periodDeals;
    return periodDeals;
  }, [periodDeals, activeFilter]);

  const toggleFilter = (type, value, label) => {
    setActiveFilter((prev) => (prev && prev.type === type && prev.value === value ? null : { type, value, label }));
  };

  const showDealHistory = (deal) => {
    setSelectedDealForHistory(deal);
    setHistoryDrawerVisible(true);
    if (!dealHistory[deal.id] || dealHistory[deal.id].length < 20) {
      fetchDealHistory([deal]);
    }
  };

  const kpis = [
    { key: 'all', title: 'Total Deals', value: totalCount, icon: <TeamOutlined />, color: '#1677ff', trend: trendFor(totalCount) },
    { key: DealStatus.OPENED, title: 'Opened', value: statusCounts[DealStatus.OPENED], icon: STATUS_ICONS[DealStatus.OPENED], color: STATUS_COLORS[DealStatus.OPENED], trend: trendFor(statusCounts[DealStatus.OPENED], DealStatus.OPENED) },
    { key: DealStatus.PROPOSAL, title: 'Proposal', value: statusCounts[DealStatus.PROPOSAL], icon: STATUS_ICONS[DealStatus.PROPOSAL], color: STATUS_COLORS[DealStatus.PROPOSAL], trend: trendFor(statusCounts[DealStatus.PROPOSAL], DealStatus.PROPOSAL) },
    { key: DealStatus.WON, title: 'Won', value: statusCounts[DealStatus.WON], icon: STATUS_ICONS[DealStatus.WON], color: STATUS_COLORS[DealStatus.WON], suffix: `${winRate.toFixed(0)}% rate`, trend: trendFor(statusCounts[DealStatus.WON], DealStatus.WON) },
    { key: DealStatus.LOST, title: 'Lost', value: statusCounts[DealStatus.LOST], icon: STATUS_ICONS[DealStatus.LOST], color: STATUS_COLORS[DealStatus.LOST], trend: trendFor(statusCounts[DealStatus.LOST], DealStatus.LOST) },
    { key: 'value', title: 'Total Value', value: `AED ${(totalValue / 1000).toFixed(1)}K`, icon: <DollarOutlined />, color: '#52c41a', subtitle: `${totalCount} deals, avg ${avgDealValue.toFixed(0)}` },
  ];

  // ── Deal table columns ──────────────────────────────────────────────
  const dealColumns = [
    {
      title: 'Contact', dataIndex: 'contact_name', key: 'contact_name', width: 180,
      render: (text, r) => (
        <Space>
          <Avatar size={28} style={{ background: '#1890ff', fontSize: 12 }}>
            {(text || 'U')[0]?.toUpperCase()}
          </Avatar>
          <div>
            <Text strong style={{ fontSize: 13 }}>{text || 'Unknown'}</Text>
            <div><Text type="secondary" style={{ fontSize: 11 }}>{r.contact_email || r.contact_phone || '—'}</Text></div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Description', dataIndex: 'Description', key: 'description', width: 150,
      render: (text) => <Tooltip title={text}><Text>{text || '—'}</Text></Tooltip>,
    },
    {
      title: 'Amount', dataIndex: 'Amount', key: 'amount', width: 120,
      render: (amount) => (
        <Text strong style={{ color: '#52c41a' }}>
          <DollarOutlined /> AED {Number(amount || 0).toLocaleString()}
        </Text>
      ),
      sorter: (a, b) => (a.Amount || 0) - (b.Amount || 0),
    },
    {
      title: 'Status', dataIndex: 'Status', key: 'status', width: 120,
      render: (s) => <Tag color={STATUS_COLORS[s] || 'default'} style={{ borderRadius: 12 }}>{STATUS_LABELS[s] || s || 'Opened'}</Tag>,
    },
    {
      title: 'Source', dataIndex: 'Source', key: 'source', width: 110,
      render: (s) => {
        const icon = SOURCE_ICONS[s];
        return <Space>{icon} <Text>{s || 'Other'}</Text></Space>;
      },
    },
    {
      title: 'Seller', dataIndex: 'seller_id', key: 'seller_id', width: 140,
      render: (id) => sellers.find((s) => s.id === id)?.name || <Text type="secondary">Unassigned</Text>,
    },
    {
      title: 'Created', key: 'created', width: 120,
      render: (_, r) => { const d = getDealDate(r); return d ? d.format('DD MMM YYYY') : '—'; },
    },
    {
      title: 'History', key: 'history', width: 80,
      render: (_, r) => (
        <Tooltip title="View deal history">
          <Button
            type="text"
            size="small"
            icon={<HistoryOutlined />}
            onClick={(e) => { e.stopPropagation(); showDealHistory(r); }}
          />
        </Tooltip>
      ),
    },
  ];

  // ── History drawer content ──────────────────────────────────────────
  const HistoryDrawerContent = ({ deal, history }) => {
    if (!deal) return <Empty description="No deal selected" />;

    const statusChanges = history.filter(h => h.activityType === ActivityTypes?.DEAL_STATUS_CHANGED || h.type === 'status_change');
    const views = history.filter(h => h.activityType === ActivityTypes?.DEAL_VIEWED || h.type === 'view');
    const notes = history.filter(h => h.activityType === ActivityTypes?.DEAL_NOTE_ADDED || h.type === 'note');

    return (
      <div>
        <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Contact">{deal.contact_name || 'Unknown'}</Descriptions.Item>
          <Descriptions.Item label="Description">{deal.Description || '—'}</Descriptions.Item>
          <Descriptions.Item label="Amount">
            <Text strong style={{ color: '#52c41a' }}>
              <DollarOutlined /> AED {Number(deal.Amount || 0).toLocaleString()}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={STATUS_COLORS[deal.Status] || 'default'}>{STATUS_LABELS[deal.Status] || deal.Status || 'Opened'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Source">
            <Space>{SOURCE_ICONS[deal.Source]} {deal.Source || 'Other'}</Space>
          </Descriptions.Item>
          <Descriptions.Item label="Seller">
            {sellers.find(s => s.id === deal.seller_id)?.name || 'Unassigned'}
          </Descriptions.Item>
          <Descriptions.Item label="Created">
            {getDealDate(deal)?.format('DD MMM YYYY HH:mm') || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Last Updated">
            {getLastUpdateDate(deal)?.fromNow() || 'Never'}
          </Descriptions.Item>
        </Descriptions>

        <Tabs defaultActiveKey="timeline">
          <TabPane tab={<span><ClockCircleOutlined /> Timeline</span>} key="timeline">
            {history.length > 0 ? (
              <Timeline mode="left">
                {history.slice(0, 30).map((item, idx) => (
                  <Timeline.Item
                    key={idx}
                    color={item.activityType === 'deal_status_changed' ? '#1677ff' : 
                           item.activityType === 'deal_viewed' ? '#52c41a' :
                           item.activityType === 'deal_note_added' ? '#faad14' : '#8c8c8c'}
                    label={item.createdAt ? dayjs(item.createdAt).format('DD MMM HH:mm') : '—'}
                  >
                    <Card size="small" style={{ borderRadius: 8 }}>
                      <Space>
                        {item.activityType === 'deal_status_changed' && <UserSwitchOutlined style={{ color: '#1677ff' }} />}
                        {item.activityType === 'deal_viewed' && <EyeOutlined style={{ color: '#52c41a' }} />}
                        {item.activityType === 'deal_note_added' && <FileTextOutlined style={{ color: '#faad14' }} />}
                        <Text strong>{item.activityType || item.type || 'Activity'}</Text>
                      </Space>
                      {item.details && Object.keys(item.details).length > 0 && (
                        <div style={{ marginTop: 4 }}>
                          {Object.entries(item.details).map(([k, v]) => (
                            v && <Text key={k} type="secondary" style={{ fontSize: 11, display: 'block' }}>
                              <strong>{k}:</strong> {typeof v === 'string' ? v : JSON.stringify(v)}
                            </Text>
                          ))}
                        </div>
                      )}
                      {item.note && (
                        <div style={{ marginTop: 4, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                          <Text style={{ fontSize: 12 }}>{item.note}</Text>
                        </div>
                      )}
                      {item.sellerId && (
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                          <UserOutlined /> {sellers.find(s => s.id === item.sellerId)?.name || 'Unknown'}
                        </Text>
                      )}
                    </Card>
                  </Timeline.Item>
                ))}
              </Timeline>
            ) : (
              <Empty description="No history found for this deal" />
            )}
          </TabPane>

          <TabPane tab={<span><UserSwitchOutlined /> Status Changes ({statusChanges.length})</span>} key="status">
            <List
              dataSource={statusChanges}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<UserSwitchOutlined style={{ color: '#1677ff' }} />}
                    title={item.details?.newStatus || item.newStatus || 'Status changed'}
                    description={
                      <Space>
                        <Tag>{item.details?.oldStatus || item.oldStatus || '—'}</Tag>
                        <ArrowRightOutlined style={{ fontSize: 11 }} />
                        <Tag color="green">{item.details?.newStatus || item.newStatus || '—'}</Tag>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {item.createdAt ? dayjs(item.createdAt).format('DD MMM YYYY HH:mm') : '—'}
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: 'No status changes' }}
            />
          </TabPane>

          <TabPane tab={<span><EyeOutlined /> Views ({views.length})</span>} key="views">
            <List
              dataSource={views}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<EyeOutlined style={{ color: '#52c41a' }} />}
                    title={item.sellerId ? sellers.find(s => s.id === item.sellerId)?.name || 'Unknown seller' : 'Unknown'}
                    description={item.createdAt ? dayjs(item.createdAt).format('DD MMM YYYY HH:mm') : '—'}
                  />
                </List.Item>
              )}
              locale={{ emptyText: 'No view history' }}
            />
          </TabPane>

          <TabPane tab={<span><FileTextOutlined /> Notes ({notes.length})</span>} key="notes">
            <List
              dataSource={notes}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<FileTextOutlined style={{ color: '#faad14' }} />}
                    title={item.sellerId ? sellers.find(s => s.id === item.sellerId)?.name || 'Unknown seller' : 'Unknown'}
                    description={
                      <div>
                        <Text>{item.note || item.details?.note || '—'}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {item.createdAt ? dayjs(item.createdAt).format('DD MMM YYYY HH:mm') : '—'}
                        </Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: 'No notes' }}
            />
          </TabPane>
        </Tabs>
      </div>
    );
  };

  const activeLabel = activeFilter?.label || 
    (activeFilter?.type === 'status' ? (STATUS_LABELS[activeFilter.value] || activeFilter.value) : activeFilter?.value);

  if (!companyId) {
    return <Empty description="No company context found" style={{ marginTop: 80 }} />;
  }

  return (
    <div style={{ padding: '0 0 24px' }}>
      <Spin spinning={loading}>
        <Row gutter={[24, 24]}>
          {/* HEADER */}
          <Col span={24}>
            <Card
              bordered={false}
              style={{ borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', background: 'linear-gradient(145deg, #ffffff 0%, #fafafa 100%)' }}
              bodyStyle={{ padding: '20px 24px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <Title level={3} style={{ margin: 0, fontWeight: 600 }}>💼 Deals Analytics</Title>
                  <Text type="secondary">Deal performance, win rates, revenue tracking, and seller insights</Text>
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
                  <Button icon={<ReloadOutlined />} onClick={fetchAll} loading={loading}>Refresh</Button>
                </Space>
              </div>
            </Card>
          </Col>

          {/* KPI CARDS */}
          <Col span={24}>
            <Row gutter={[16, 16]}>
              {kpis.map((k) => (
                <Col xs={12} sm={8} md={8} lg={4} key={k.key}>
                  <KpiCard
                    title={k.title}
                    value={k.value}
                    icon={k.icon}
                    color={k.color}
                    suffix={k.suffix}
                    subtitle={k.subtitle}
                    trend={k.trend}
                    active={k.key === 'all' ? activeFilter?.type === 'all' : 
                           k.key === 'value' ? activeFilter?.type === 'value' :
                           activeFilter?.type === 'status' && activeFilter.value === k.key}
                    onClick={() => {
                      if (k.key === 'all') toggleFilter('all', 'all', 'All Deals');
                      else if (k.key === 'value') toggleFilter('value', 'value', 'All Deals');
                      else toggleFilter('status', k.key, STATUS_LABELS[k.key] || k.key);
                    }}
                  />
                </Col>
              ))}
            </Row>
          </Col>

          {/* TREND CHART */}
          <Col xs={24} lg={16}>
            <ChartCard
              title="Deals Over Time"
              extra={
                <Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>Total vs Won</Text>
                  <Tooltip title="Shows deal creation and won trends over the selected period">
                    <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                  </Tooltip>
                </Space>
              }
            >
              {trendData.length ? (
                <ResponsiveContainer>
                  <AreaChart data={trendData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1677ff" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#1677ff" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="wonGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#faad14" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#faad14" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <RTooltip />
                    <Legend />
                    <Area type="monotone" dataKey="total" name="Total Deals" stroke="#1677ff" fill="url(#totalGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="won" name="Won" stroke="#faad14" fill="url(#wonGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="proposal" name="Proposal" stroke="#722ed1" fill="rgba(114, 46, 209, 0.1)" strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <Empty description="No deals in this period" style={{ marginTop: 60 }} />}
            </ChartCard>
          </Col>

          {/* STATUS PIE */}
          <Col xs={24} lg={8}>
            <ChartCard title="Status Distribution">
              {statusPieData.length ? (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                      onClick={(d) => toggleFilter('status', d.status, d.name)}
                      cursor="pointer"
                    >
                      {statusPieData.map((entry) => (
                        <Cell
                          key={entry.status}
                          fill={STATUS_COLORS[entry.status] || '#ccc'}
                          opacity={activeFilter?.type === 'status' && activeFilter.value !== entry.status ? 0.35 : 1}
                        />
                      ))}
                    </Pie>
                    <RTooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <Empty description="No data" style={{ marginTop: 60 }} />}
            </ChartCard>
          </Col>

          {/* SOURCE BREAKDOWN */}
          <Col xs={24} lg={8}>
            <ChartCard title="Deal Source" height={260}>
              {sourceData.length ? (
                <ResponsiveContainer>
                  <BarChart data={sourceData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                    <RTooltip />
                    <Bar
                      dataKey="value"
                      radius={[0, 8, 8, 0]}
                      onClick={(d) => toggleFilter('source', d.name, d.name)}
                      cursor="pointer"
                    >
                      {sourceData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={entry.color || '#722ed1'}
                          opacity={activeFilter?.type === 'source' && activeFilter.value !== entry.name ? 0.35 : 1}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <Empty description="No data" style={{ marginTop: 40 }} />}
            </ChartCard>
          </Col>

          {/* CONVERSION FUNNEL */}
          <Col xs={24} lg={8}>
            <ChartCard title="Deal Funnel" height={260}>
              {funnelData[0]?.value ? (
                <ResponsiveContainer>
                  <FunnelChart>
                    <RTooltip />
                    <Funnel dataKey="value" data={funnelData} isAnimationActive>
                      <LabelList position="right" fill="#333" stroke="none" dataKey="name" fontSize={11} />
                      {funnelData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              ) : <Empty description="No data" style={{ marginTop: 40 }} />}
            </ChartCard>
          </Col>

          {/* WIN RATE & VALUE */}
          <Col xs={24} lg={8}>
            <Card
              bordered={false}
              style={{ borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: '100%' }}
              title={<span style={{ fontWeight: 600, fontSize: 14 }}><TrophyOutlined style={{ color: '#faad14', marginRight: 6 }} />Win Rate & Revenue</span>}
            >
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic
                    title="Win Rate"
                    value={winRate.toFixed(1)}
                    suffix="%"
                    valueStyle={{ color: winRate >= 50 ? '#52c41a' : winRate >= 30 ? '#faad14' : '#ff4d4f' }}
                    prefix={<PercentageOutlined />}
                  />
                  <div style={{ marginTop: 8 }}>
                    <Progress
                      percent={Math.round(winRate)}
                      strokeColor={winRate >= 50 ? '#52c41a' : winRate >= 30 ? '#faad14' : '#ff4d4f'}
                      size="small"
                    />
                  </div>
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Won Value"
                    value={`AED ${(wonValue / 1000).toFixed(1)}K`}
                    prefix={<DollarOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
              </Row>
              <Divider style={{ margin: '12px 0' }} />
              <Row gutter={[16, 8]}>
                <Col span={8}>
                  <div style={{ textAlign: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>Won</Text>
                    <div><Text strong style={{ color: '#52c41a' }}>{wonCount}</Text></div>
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ textAlign: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>Lost</Text>
                    <div><Text strong style={{ color: '#ff4d4f' }}>{lostCount}</Text></div>
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ textAlign: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>Proposal</Text>
                    <div><Text strong style={{ color: '#722ed1' }}>{proposalCount}</Text></div>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* MONTH OVER MONTH */}
          <Col span={24}>
            <Card
              bordered={false}
              style={{ borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
              title={<span style={{ fontWeight: 600, fontSize: 14 }}><CalendarOutlined style={{ color: '#1677ff', marginRight: 6 }} />Month-over-Month Comparison</span>}
            >
              <div style={{ height: 220 }}>
                <ResponsiveContainer>
                  <ComposedChart data={monthOverMonth}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} domain={[0, 100]} />
                    <RTooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="total" name="Total Deals" fill="#1677ff" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="won" name="Won" fill="#faad14" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="rate" name="Win Rate %" stroke="#52c41a" strokeWidth={2} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>

          {/* SELLER PERFORMANCE */}
          <Col span={24}>
            <Card
              bordered={false}
              style={{ borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
              title={<span style={{ fontWeight: 600, fontSize: 14 }}><ThunderboltOutlined style={{ color: '#faad14', marginRight: 6 }} />Seller Performance</span>}
              extra={
                <Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>Click a row to filter deals below</Text>
                  {selectedSellerForComparison && (
                    <Button size="small" onClick={() => setSelectedSellerForComparison(null)}>Clear</Button>
                  )}
                </Space>
              }
              bodyStyle={{ padding: 0 }}
            >
              <Table
                dataSource={sellerPerf}
                rowKey="id"
                size="middle"
                pagination={false}
                scroll={{ x: 1200 }}
                onRow={(record) => ({
                  onClick: () => {
                    toggleFilter('seller', record.id, record.name);
                    setSelectedSellerForComparison(record.id);
                  },
                  style: {
                    cursor: 'pointer',
                    background: activeFilter?.type === 'seller' && activeFilter.value === record.id ? '#e6f7ff' : undefined,
                  },
                })}
                columns={[
                  {
                    title: 'Seller', dataIndex: 'name', key: 'name', fixed: 'left', width: 160,
                    render: (text) => (
                      <Space>
                        <Avatar size={28} style={{ background: '#1677ff', fontSize: 12 }}>{(text || 'U')[0]?.toUpperCase()}</Avatar>
                        <Text strong style={{ fontSize: 13 }}>{text}</Text>
                      </Space>
                    ),
                  },
                  { title: 'Assigned', dataIndex: 'assignedCount', key: 'assignedCount', width: 90, sorter: (a, b) => a.assignedCount - b.assignedCount },
                  { title: 'Created', dataIndex: 'createdCount', key: 'createdCount', width: 90, sorter: (a, b) => a.createdCount - b.createdCount },
                  {
                    title: 'Opened', dataIndex: 'openedCount', key: 'openedCount', width: 90,
                    render: (v) => <Tag color="blue">{v}</Tag>,
                    sorter: (a, b) => a.openedCount - b.openedCount,
                  },
                  {
                    title: 'Proposal', dataIndex: 'proposalCount', key: 'proposalCount', width: 100,
                    render: (v) => <Tag color="purple">{v}</Tag>,
                    sorter: (a, b) => a.proposalCount - b.proposalCount,
                  },
                  {
                    title: 'Won', dataIndex: 'wonCount', key: 'wonCount', width: 90,
                    render: (v) => <Tag color="gold"><TrophyOutlined /> {v}</Tag>,
                    sorter: (a, b) => a.wonCount - b.wonCount,
                    defaultSortOrder: 'descend',
                  },
                  {
                    title: 'Lost', dataIndex: 'lostCount', key: 'lostCount', width: 90,
                    render: (v) => <Tag color="red">{v}</Tag>,
                    sorter: (a, b) => a.lostCount - b.lostCount,
                  },
                  {
                    title: 'Conversion Rate', dataIndex: 'conversionRate', key: 'conversionRate', width: 160,
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
                    sorter: (a, b) => a.conversionRate - b.conversionRate,
                  },
                  {
                    title: 'Avg Deal Value', dataIndex: 'avgDealValue', key: 'avgDealValue', width: 130,
                    render: (v) => <Text strong style={{ color: '#52c41a' }}>AED {v.toFixed(0)}</Text>,
                    sorter: (a, b) => a.avgDealValue - b.avgDealValue,
                  },
                  {
                    title: 'Won Value', dataIndex: 'wonValue', key: 'wonValue', width: 130,
                    render: (v) => <Text strong style={{ color: '#faad14' }}>AED {(v / 1000).toFixed(1)}K</Text>,
                    sorter: (a, b) => a.wonValue - b.wonValue,
                  },
                ]}
                locale={{ emptyText: <Empty description="No seller activity in this period" /> }}
              />
            </Card>
          </Col>

          {/* FILTERED DEALS TABLE */}
          <Col span={24}>
            <Card
              bordered={false}
              style={{ borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
              bodyStyle={{ padding: 0 }}
            >
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <Space>
                  <FilterOutlined style={{ color: '#1677ff' }} />
                  <Title level={5} style={{ margin: 0 }}>
                    {activeFilter && activeFilter.type !== 'all' ? `Deals · ${activeLabel}` : 'All Deals (Period)'}
                  </Title>
                  <Badge count={filteredTableDeals.length} showZero style={{ backgroundColor: '#1677ff' }} />
                </Space>
                <Space>
                  {activeFilter && (
                    <Button size="small" onClick={() => setActiveFilter(null)}>Clear filter</Button>
                  )}
                  <Tooltip title="Export to CSV">
                    <Button size="small" icon={<ExportOutlined />}>Export</Button>
                  </Tooltip>
                </Space>
              </div>
              <Table
                dataSource={filteredTableDeals}
                columns={dealColumns}
                rowKey="id"
                size="middle"
                scroll={{ x: 1100 }}
                pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'] }}
                onRow={(record) => ({
                  onClick: () => showDealHistory(record),
                  style: { cursor: 'pointer' },
                })}
              />
            </Card>
          </Col>
        </Row>
      </Spin>

      {/* DEAL HISTORY DRAWER */}
      <Drawer
        title={
          <Space>
            <HistoryOutlined />
            <span>Deal History</span>
            {selectedDealForHistory && (
              <Tag color="blue">{selectedDealForHistory.contact_name || 'Unknown'}</Tag>
            )}
          </Space>
        }
        placement="right"
        width={600}
        open={historyDrawerVisible}
        onClose={() => setHistoryDrawerVisible(false)}
        extra={
          <Button
            size="small"
            icon={<ReloadOutlined spin={historyLoading} />}
            onClick={() => selectedDealForHistory && fetchDealHistory([selectedDealForHistory])}
          >
            Refresh
          </Button>
        }
      >
        {historyLoading && !selectedDealForHistory ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Spin tip="Loading history..." />
          </div>
        ) : (
          <HistoryDrawerContent deal={selectedDealForHistory} history={dealHistory[selectedDealForHistory?.id] || []} />
        )}
      </Drawer>
    </div>
  );
};

export default DealAnalyticsDashboard;