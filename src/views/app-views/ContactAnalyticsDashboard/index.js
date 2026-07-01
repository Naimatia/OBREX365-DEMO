// pages/ContactAnalyticsDashboard/index.js
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
  AudioOutlined, VideoCameraOutlined, FileDoneOutlined,
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
import ContactService from 'services/firebase/ContactService';
import ContactHistoryService from 'services/firebase/ContactHistoryService';
import { ContactStatus, ContactStatusLabels, ContactStatusColors } from 'models/ContactModel';
import { LeadInterestLevel } from 'models/LeadModel';
import { UserRoles } from 'models/UserModel';
import sellerActivityService from 'services/firebase/SellerActivityService';

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
  [ContactStatus.NO_RESPONSE]: '#8c8c8c',
  [ContactStatus.JUNK_LEAD]: '#595959',
  [ContactStatus.PROPOSAL]: '#13c2c2',
};

const STATUS_ICONS = {
  [ContactStatus.ACTIVE]: <CheckCircleOutlined />,
  [ContactStatus.HOT]: <HeartOutlined />,
  [ContactStatus.COLD]: <StarOutlined />,
  [ContactStatus.PENDING]: <ClockCircleOutlined />,
  [ContactStatus.CONTACTED]: <PhoneOutlined />,
  [ContactStatus.INTERESTED]: <StarOutlined />,
  [ContactStatus.NOT_INTERESTED]: <CloseCircleOutlined />,
  [ContactStatus.CONVERTED]: <TrophyOutlined />,
  [ContactStatus.DEAL]: <DollarOutlined />,
  [ContactStatus.LOSS]: <DeleteOutlined />,
  [ContactStatus.NO_RESPONSE]: <ClockCircleOutlined />,
  [ContactStatus.JUNK_LEAD]: <DeleteOutlined />,
  [ContactStatus.PROPOSAL]: <FileDoneOutlined />,
};

const STATUS_LABELS = ContactStatusLabels;

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

const getContactDate = (contact) => {
  const d = contact.createdAt?.toDate?.() || contact.CreationDate?.toDate?.() || contact.CreationDate || contact.createdAt;
  return d ? dayjs(d) : null;
};

const getAssignedDate = (contact) => {
  const d = contact.assignedAt?.toDate?.() || contact.assignedAt || contact.AffectingDate?.toDate?.() || contact.AffectingDate;
  return d ? dayjs(d) : null;
};

const getLastActivityDate = (contact) => {
  const d = contact.lastActivity?.toDate?.() || contact.lastActivity;
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
            {trend >= 0 ? <RiseOutlined /> : <FallOutlined />} {Math.abs(trend).toFixed(0)}% vs prior period
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
const ContactAnalyticsDashboard = () => {
  const user = useSelector((state) => state.auth.user);
  const companyId = user?.company_id;
  const userRole = user?.Role;
  const sellerId = user?.id;

  const isAdmin = [UserRoles.CEO, UserRoles.SUPER_ADMIN, UserRoles.MANAGER, UserRoles.ADMIN].includes(userRole);

  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [contactHistory, setContactHistory] = useState({});
  const [historyLoading, setHistoryLoading] = useState(false);

  const [periodPreset, setPeriodPreset] = useState('This Month');
  const [customRange, setCustomRange] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null);
  const [historyDrawerVisible, setHistoryDrawerVisible] = useState(false);
  const [selectedContactForHistory, setSelectedContactForHistory] = useState(null);
  const [selectedSellerForComparison, setSelectedSellerForComparison] = useState(null);

  // ── Fetch data ──────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      // Fetch all contacts for the company
      const contactsSnap = await getDocs(query(collection(db, 'contacts'), where('company_id', '==', companyId)));
      let contactsData = contactsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        _createdAt: d.data().createdAt?.toDate?.() || d.data().CreationDate?.toDate?.() || null,
        _updatedAt: d.data().updatedAt?.toDate?.() || d.data().LastUpdateDate?.toDate?.() || null,
        _lastActivity: d.data().lastActivity?.toDate?.() || null,
      }));

      // If not admin, filter to show only contacts the seller has access to
      if (!isAdmin) {
        contactsData = contactsData.filter(c => 
          c.seller_id === sellerId || c.createdBy === sellerId
        );
      }

      setContacts(contactsData);

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

      // Fetch history for recent contacts
      await fetchContactHistory(contactsData.slice(0, 20));
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      message.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [companyId, isAdmin, sellerId]);

  const fetchContactHistory = async (recentContacts) => {
    setHistoryLoading(true);
    try {
      const historyMap = {};
      for (const contact of recentContacts) {
        try {
          const history = await ContactHistoryService.getHistoryByContact(contact.id, { limit: 50 });
          historyMap[contact.id] = history;
        } catch (err) {
          console.warn(`Failed to fetch history for contact ${contact.id}:`, err);
          historyMap[contact.id] = [];
        }
      }
      setContactHistory(historyMap);
    } catch (err) {
      console.error('Error fetching contact history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Period filtering ────────────────────────────────────────────────
  const range = useMemo(() => getPeriodRange(periodPreset, customRange), [periodPreset, customRange]);

  const periodContacts = useMemo(() => {
    if (!range) return contacts;
    const [start, end] = range;
    return contacts.filter((c) => {
      const d = getContactDate(c);
      return d && d.isBetween(start, end, 'day', '[]');
    });
  }, [contacts, range]);

  // Previous period for comparison
  const previousPeriodContacts = useMemo(() => {
    if (!range) return [];
    const [start, end] = range;
    const lengthDays = end.diff(start, 'day') + 1;
    const priorStart = start.subtract(lengthDays, 'day');
    const priorEnd = start.subtract(1, 'day').endOf('day');
    return contacts.filter((c) => {
      const d = getContactDate(c);
      return d && d.isBetween(priorStart, priorEnd, 'day', '[]');
    });
  }, [contacts, range]);

  const trendFor = (currentCount, key) => {
    const priorCount = key
      ? previousPeriodContacts.filter((c) => (c.status || ContactStatus.ACTIVE) === key).length
      : previousPeriodContacts.length;
    if (!priorCount) return currentCount > 0 ? 100 : null;
    return ((currentCount - priorCount) / priorCount) * 100;
  };

  // ── KPI aggregates ──────────────────────────────────────────────────
  const statusCounts = useMemo(() => {
    const counts = {};
    Object.values(ContactStatus).forEach((s) => { counts[s] = 0; });
    periodContacts.forEach((c) => {
      const s = c.status || ContactStatus.ACTIVE;
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [periodContacts]);

  const totalCount = periodContacts.length;
  const dealCount = periodContacts.filter(c => 
    c.status === ContactStatus.DEAL || c.status === ContactStatus.PROPOSAL || c.dealId
  ).length;
  const convertedFromLeadCount = periodContacts.filter(c => c.leadId || c.convertedFromLeadId).length;
  const dealRate = totalCount ? (dealCount / totalCount) * 100 : 0;

  // Interaction stats
  const interactionStats = useMemo(() => {
    const stats = {
      totalCalls: 0,
      totalWhatsApp: 0,
      totalEmails: 0,
      totalNotes: 0,
      contactedRecently: 0,
    };

    periodContacts.forEach(c => {
      const history = contactHistory[c.id] || [];
      stats.totalCalls += history.filter(h => h.type === 'call').length;
      stats.totalWhatsApp += history.filter(h => h.type === 'whatsapp').length;
      stats.totalEmails += history.filter(h => h.type === 'email').length;
      stats.totalNotes += history.filter(h => h.type === 'note' || h.type === 'note_added').length;
      
      // Check if contacted in last 7 days
      const lastActivity = getLastActivityDate(c);
      if (lastActivity && lastActivity.isAfter(dayjs().subtract(7, 'day'))) {
        stats.contactedRecently++;
      }
    });

    return stats;
  }, [periodContacts, contactHistory]);

  // ── Trend chart data ────────────────────────────────────────────────
  const trendData = useMemo(() => {
    if (!periodContacts.length) return [];
    let granularity = 'day';
    if (periodPreset === 'Today') granularity = 'hour';
    else if (periodPreset === 'This Year' || periodPreset === 'All Time') granularity = 'month';

    const buckets = new Map();
    periodContacts.forEach((c) => {
      const d = getContactDate(c);
      if (!d) return;
      const key = fmtDateKey(d, granularity);
      if (!buckets.has(key)) buckets.set(key, { name: key, total: 0, deals: 0, contacted: 0, sortKey: d.valueOf() });
      const bucket = buckets.get(key);
      bucket.total += 1;
      if (c.status === ContactStatus.DEAL || c.status === ContactStatus.PROPOSAL || c.dealId) bucket.deals += 1;
      if (c.status === ContactStatus.CONTACTED || c.status === ContactStatus.INTERESTED) bucket.contacted += 1;
    });
    return Array.from(buckets.values()).sort((a, b) => a.sortKey - b.sortKey);
  }, [periodContacts, periodPreset]);

  // ── Status distribution ──────────────────────────────────────────────
  const statusPieData = useMemo(() => (
    Object.entries(statusCounts)
      .filter(([, v]) => v > 0)
      .map(([status, value]) => ({ name: STATUS_LABELS[status] || status, status, value }))
  ), [statusCounts]);

  // ── Source breakdown ────────────────────────────────────────────────
  const sourceData = useMemo(() => {
    const counts = {};
    periodContacts.forEach((c) => {
      const src = c.source || c.RedirectedFrom || 'Other';
      counts[src] = (counts[src] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [periodContacts]);

  // ── Conversion funnel ────────────────────────────────────────────────
  const funnelData = useMemo(() => {
    const total = periodContacts.length;
    const contacted = periodContacts.filter((c) =>
      [ContactStatus.CONTACTED, ContactStatus.INTERESTED, ContactStatus.DEAL, ContactStatus.PROPOSAL, ContactStatus.CONVERTED].includes(c.status)
    ).length;
    const interested = periodContacts.filter((c) =>
      [ContactStatus.INTERESTED, ContactStatus.DEAL, ContactStatus.PROPOSAL].includes(c.status)
    ).length;
    const deals = periodContacts.filter((c) =>
      c.status === ContactStatus.DEAL || c.status === ContactStatus.PROPOSAL || c.dealId
    ).length;
    return [
      { name: 'Total Contacts', value: total, fill: '#1677ff' },
      { name: 'Contacted', value: contacted, fill: '#2f54eb' },
      { name: 'Interested', value: interested, fill: '#13c2c2' },
      { name: 'Deals', value: deals, fill: '#fa8c16' },
    ];
  }, [periodContacts]);

  // ── Seller performance ──────────────────────────────────────────────
  const sellerPerf = useMemo(() => {
    return sellers.map((seller) => {
      const assigned = periodContacts.filter((c) => c.seller_id === seller.id);
      const created = periodContacts.filter((c) => c.createdBy === seller.id);
      const dealt = assigned.filter((c) => c.status === ContactStatus.DEAL || c.status === ContactStatus.PROPOSAL || c.dealId);
      const contacted = assigned.filter((c) => c.status && c.status !== ContactStatus.ACTIVE && c.status !== ContactStatus.PENDING);
      const notInterested = assigned.filter((c) =>
        [ContactStatus.NOT_INTERESTED, ContactStatus.LOSS, ContactStatus.JUNK_LEAD].includes(c.status)
      );

      // Response time: assignedAt -> lastActivity
      const responseTimes = assigned
        .map((c) => {
          const assignedAt = getAssignedDate(c);
          const lastActivity = getLastActivityDate(c);
          if (!assignedAt || !lastActivity) return null;
          const hrs = lastActivity.diff(assignedAt, 'hour', true);
          return hrs >= 0 ? hrs : null;
        })
        .filter((v) => v !== null);
      const avgResponseHrs = responseTimes.length
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : null;

      // Time to deal: createdAt -> deal status
      const dealTimes = assigned
        .filter((c) => c.status === ContactStatus.DEAL || c.dealId)
        .map((c) => {
          const created = getContactDate(c);
          const dealDate = c.dealCreatedAt?.toDate?.() || c.dealCreatedAt;
          if (!created || !dealDate) return null;
          const days = dayjs(dealDate).diff(created, 'day', true);
          return days >= 0 ? days : null;
        })
        .filter((v) => v !== null);
      const avgDealDays = dealTimes.length
        ? dealTimes.reduce((a, b) => a + b, 0) / dealTimes.length
        : null;

      return {
        id: seller.id,
        name: seller.name,
        email: seller.email,
        phone: seller.phone,
        assignedCount: assigned.length,
        createdCount: created.length,
        contactedCount: contacted.length,
        dealCount: dealt.length,
        notInterestedCount: notInterested.length,
        contactRate: assigned.length ? (contacted.length / assigned.length) * 100 : 0,
        dealRate: assigned.length ? (dealt.length / assigned.length) * 100 : 0,
        avgResponseHrs,
        avgDealDays,
      };
    })
    .filter((s) => s.assignedCount > 0 || s.createdCount > 0)
    .sort((a, b) => b.dealCount - a.dealCount || b.assignedCount - a.assignedCount);
  }, [sellers, periodContacts]);

  // ── Month-over-month comparison ──────────────────────────────────────
  const monthOverMonth = useMemo(() => {
    const months = [];
    const now = dayjs();
    for (let i = 5; i >= 0; i--) {
      const month = now.subtract(i, 'month');
      const start = month.startOf('month');
      const end = month.endOf('month');
      const monthContacts = contacts.filter((c) => {
        const d = getContactDate(c);
        return d && d.isBetween(start, end, 'day', '[]');
      });
      const monthDeals = monthContacts.filter((c) => c.status === ContactStatus.DEAL || c.status === ContactStatus.PROPOSAL || c.dealId).length;
      months.push({
        month: month.format('MMM YYYY'),
        total: monthContacts.length,
        deals: monthDeals,
        rate: monthContacts.length ? (monthDeals / monthContacts.length) * 100 : 0,
      });
    }
    return months;
  }, [contacts]);

  // ── Activity timeline for selected contact ─────────────────────────
  const selectedContactHistory = useMemo(() => {
    if (!selectedContactForHistory) return [];
    return contactHistory[selectedContactForHistory.id] || [];
  }, [selectedContactForHistory, contactHistory]);

  // ── Filtered table ───────────────────────────────────────────────────
  const filteredTableContacts = useMemo(() => {
    if (!activeFilter) return periodContacts;
    const { type, value } = activeFilter;
    if (type === 'status') return periodContacts.filter((c) => (c.status || ContactStatus.ACTIVE) === value);
    if (type === 'source') return periodContacts.filter((c) => (c.source || c.RedirectedFrom || 'Other') === value);
    if (type === 'seller') return periodContacts.filter((c) => c.seller_id === value);
    if (type === 'all') return periodContacts;
    return periodContacts;
  }, [periodContacts, activeFilter]);

  const toggleFilter = (type, value, label) => {
    setActiveFilter((prev) => (prev && prev.type === type && prev.value === value ? null : { type, value, label }));
  };

  const showContactHistory = (contact) => {
    setSelectedContactForHistory(contact);
    setHistoryDrawerVisible(true);
    if (!contactHistory[contact.id] || contactHistory[contact.id].length < 20) {
      fetchContactHistory([contact]);
    }
  };

  const kpis = [
    { key: 'all', title: 'Total Contacts', value: totalCount, icon: <TeamOutlined />, color: '#1677ff', trend: trendFor(totalCount) },
    { key: ContactStatus.ACTIVE, title: 'Active', value: statusCounts[ContactStatus.ACTIVE], icon: STATUS_ICONS[ContactStatus.ACTIVE], color: STATUS_COLORS[ContactStatus.ACTIVE], trend: trendFor(statusCounts[ContactStatus.ACTIVE], ContactStatus.ACTIVE) },
    { key: ContactStatus.HOT, title: 'Hot', value: statusCounts[ContactStatus.HOT], icon: STATUS_ICONS[ContactStatus.HOT], color: STATUS_COLORS[ContactStatus.HOT], trend: trendFor(statusCounts[ContactStatus.HOT], ContactStatus.HOT) },
    { key: ContactStatus.PENDING, title: 'Pending', value: statusCounts[ContactStatus.PENDING], icon: STATUS_ICONS[ContactStatus.PENDING], color: STATUS_COLORS[ContactStatus.PENDING], trend: trendFor(statusCounts[ContactStatus.PENDING], ContactStatus.PENDING) },
    { key: ContactStatus.DEAL, title: 'Deals', value: statusCounts[ContactStatus.DEAL], icon: STATUS_ICONS[ContactStatus.DEAL], color: STATUS_COLORS[ContactStatus.DEAL], suffix: `${dealRate.toFixed(0)}% rate`, trend: trendFor(statusCounts[ContactStatus.DEAL], ContactStatus.DEAL) },
    { key: ContactStatus.LOSS, title: 'Loss', value: statusCounts[ContactStatus.LOSS], icon: STATUS_ICONS[ContactStatus.LOSS], color: STATUS_COLORS[ContactStatus.LOSS], trend: trendFor(statusCounts[ContactStatus.LOSS], ContactStatus.LOSS) },
  ];

  // ── Contact table columns ───────────────────────────────────────────
  const contactColumns = [
    {
      title: 'Contact', dataIndex: 'name', key: 'name', width: 200,
      render: (text, r) => (
        <Space>
          <Avatar size={28} style={{ background: STATUS_COLORS[r.status] || '#1677ff', fontSize: 12 }}>
            {(text || 'U')[0]?.toUpperCase()}
          </Avatar>
          <div>
            <Text strong style={{ fontSize: 13 }}>{text || 'Unknown'}</Text>
            <div><Text type="secondary" style={{ fontSize: 11 }}>{r.email || r.phoneNumber || '—'}</Text></div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 130,
      render: (s) => <Tag color={STATUS_COLORS[s] || 'default'} style={{ borderRadius: 12 }}>{STATUS_LABELS[s] || s || 'Active'}</Tag>,
    },
    {
      title: 'Source', dataIndex: 'source', key: 'source', width: 110,
      render: (s) => s || <Text type="secondary">—</Text>,
    },
    {
      title: 'Assigned To', dataIndex: 'seller_id', key: 'seller_id', width: 150,
      render: (id) => sellers.find((s) => s.id === id)?.name || <Text type="secondary">Unassigned</Text>,
    },
    {
      title: 'Created', key: 'created', width: 130,
      render: (_, r) => { const d = getContactDate(r); return d ? d.format('DD MMM YYYY') : '—'; },
    },
    {
      title: 'History', key: 'history', width: 80,
      render: (_, r) => (
        <Tooltip title="View contact history">
          <Button
            type="text"
            size="small"
            icon={<HistoryOutlined />}
            onClick={(e) => { e.stopPropagation(); showContactHistory(r); }}
          />
        </Tooltip>
      ),
    },
  ];

  // ── History drawer content ──────────────────────────────────────────
  const HistoryDrawerContent = ({ contact, history }) => {
    if (!contact) return <Empty description="No contact selected" />;

    const calls = history.filter(h => h.type === 'call');
    const whatsapps = history.filter(h => h.type === 'whatsapp');
    const emails = history.filter(h => h.type === 'email');
    const notes = history.filter(h => h.type === 'note' || h.type === 'note_added');
    const statusChanges = history.filter(h => h.type === 'status');

    return (
      <div>
        <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Name">{contact.name || 'Unknown'}</Descriptions.Item>
          <Descriptions.Item label="Email">{contact.email || '—'}</Descriptions.Item>
          <Descriptions.Item label="Phone">{contact.phoneNumber || '—'}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={STATUS_COLORS[contact.status] || 'default'}>
              {STATUS_LABELS[contact.status] || contact.status || 'Active'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Assigned To">
            {sellers.find(s => s.id === contact.seller_id)?.name || 'Unassigned'}
          </Descriptions.Item>
          <Descriptions.Item label="Created">
            {getContactDate(contact)?.format('DD MMM YYYY HH:mm') || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Last Activity">
            {getLastActivityDate(contact)?.fromNow() || 'Never'}
          </Descriptions.Item>
        </Descriptions>

        <Tabs defaultActiveKey="timeline">
          <TabPane tab={<span><ClockCircleOutlined /> Timeline</span>} key="timeline">
            {history.length > 0 ? (
              <Timeline mode="left">
                {history.slice(0, 30).map((item, idx) => (
                  <Timeline.Item
                    key={idx}
                    color={item.type === 'status' ? '#1677ff' : 
                           item.type === 'call' ? '#52c41a' :
                           item.type === 'whatsapp' ? '#25D366' :
                           item.type === 'email' ? '#1677ff' :
                           item.type === 'note' ? '#faad14' : '#8c8c8c'}
                    label={item.createdAt ? dayjs(item.createdAt).format('DD MMM HH:mm') : '—'}
                  >
                    <Card size="small" style={{ borderRadius: 8 }}>
                      <Space>
                        {item.type === 'call' && <PhoneOutlined style={{ color: '#52c41a' }} />}
                        {item.type === 'whatsapp' && <WhatsAppOutlined style={{ color: '#25D366' }} />}
                        {item.type === 'email' && <MailOutlined style={{ color: '#1677ff' }} />}
                        {item.type === 'note' && <FileTextOutlined style={{ color: '#faad14' }} />}
                        {item.type === 'status' && <UserSwitchOutlined style={{ color: '#1677ff' }} />}
                        <Text strong>{item.type || 'Activity'}</Text>
                      </Space>
                      {item.message && <div style={{ marginTop: 4 }}><Text>{item.message}</Text></div>}
                      {item.metadata && Object.keys(item.metadata).length > 0 && (
                        <div style={{ marginTop: 4 }}>
                          {Object.entries(item.metadata).map(([k, v]) => (
                            v && <Text key={k} type="secondary" style={{ fontSize: 11, display: 'block' }}>
                              <strong>{k}:</strong> {typeof v === 'string' ? v : JSON.stringify(v)}
                            </Text>
                          ))}
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
              <Empty description="No history found for this contact" />
            )}
          </TabPane>

          <TabPane tab={<span><PhoneOutlined /> Calls ({calls.length})</span>} key="calls">
            <List
              dataSource={calls}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<PhoneOutlined style={{ color: '#52c41a' }} />}
                    title={item.message || 'Call logged'}
                    description={
                      <Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {item.createdAt ? dayjs(item.createdAt).format('DD MMM YYYY HH:mm') : '—'}
                        </Text>
                        {item.metadata?.duration && (
                          <Tag color="blue">{item.metadata.duration} min</Tag>
                        )}
                        {item.metadata?.outcome && (
                          <Tag color={item.metadata.outcome === 'answered' ? 'green' : 'orange'}>
                            {item.metadata.outcome}
                          </Tag>
                        )}
                      </Space>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: 'No calls logged' }}
            />
          </TabPane>

          <TabPane tab={<span><WhatsAppOutlined /> WhatsApp ({whatsapps.length})</span>} key="whatsapp">
            <List
              dataSource={whatsapps}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<WhatsAppOutlined style={{ color: '#25D366' }} />}
                    title={item.message || 'WhatsApp message'}
                    description={
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {item.createdAt ? dayjs(item.createdAt).format('DD MMM YYYY HH:mm') : '—'}
                      </Text>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: 'No WhatsApp messages' }}
            />
          </TabPane>

          <TabPane tab={<span><MailOutlined /> Emails ({emails.length})</span>} key="emails">
            <List
              dataSource={emails}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<MailOutlined style={{ color: '#1677ff' }} />}
                    title={item.metadata?.subject || 'Email sent'}
                    description={
                      <div>
                        <Text>{item.message}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {item.createdAt ? dayjs(item.createdAt).format('DD MMM YYYY HH:mm') : '—'}
                        </Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: 'No emails sent' }}
            />
          </TabPane>

          <TabPane tab={<span><FileTextOutlined /> Notes ({notes.length})</span>} key="notes">
            <List
              dataSource={notes}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<FileTextOutlined style={{ color: '#faad14' }} />}
                    title={item.sellerId ? sellers.find(s => s.id === item.sellerId)?.name || 'Unknown' : 'Unknown'}
                    description={
                      <div>
                        <Text>{item.message || item.note || '—'}</Text>
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

          <TabPane tab={<span><UserSwitchOutlined /> Status Changes ({statusChanges.length})</span>} key="status">
            <List
              dataSource={statusChanges}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<UserSwitchOutlined style={{ color: '#1677ff' }} />}
                    title={item.metadata?.newStatus || item.newStatus || 'Status changed'}
                    description={
                      <Space>
                        <Tag>{item.metadata?.oldStatus || item.oldStatus || '—'}</Tag>
                        <ArrowRightOutlined style={{ fontSize: 11 }} />
                        <Tag color="green">{item.metadata?.newStatus || item.newStatus || '—'}</Tag>
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
                  <Title level={3} style={{ margin: 0, fontWeight: 600 }}>📊 Contact Analytics</Title>
                  <Text type="secondary">Contact performance, interaction tracking, and deal conversion insights</Text>
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
                    trend={k.trend}
                    active={k.key === 'all' ? activeFilter?.type === 'all' : activeFilter?.type === 'status' && activeFilter.value === k.key}
                    onClick={() => (k.key === 'all' ? toggleFilter('all', 'all', 'All Contacts') : toggleFilter('status', k.key, STATUS_LABELS[k.key] || k.key))}
                  />
                </Col>
              ))}
            </Row>
          </Col>

          {/* TREND CHART */}
          <Col xs={24} lg={16}>
            <ChartCard
              title="Contacts Over Time"
              extra={
                <Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>Total vs Deals</Text>
                  <Tooltip title="Shows contact creation and deal conversion trends over the selected period">
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
                      <linearGradient id="dealGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fa8c16" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#fa8c16" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <RTooltip />
                    <Legend />
                    <Area type="monotone" dataKey="total" name="New Contacts" stroke="#1677ff" fill="url(#totalGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="deals" name="Deals" stroke="#fa8c16" fill="url(#dealGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="contacted" name="Contacted" stroke="#2f54eb" fill="rgba(47, 84, 235, 0.1)" strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <Empty description="No contacts in this period" style={{ marginTop: 60 }} />}
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
            <ChartCard title="Contact Source" height={260}>
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
                      fill="#722ed1"
                      onClick={(d) => toggleFilter('source', d.name, d.name)}
                      cursor="pointer"
                    >
                      {sourceData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill="#722ed1"
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
            <ChartCard title="Conversion Funnel" height={260}>
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

          {/* INTERACTION STATS */}
          <Col xs={24} lg={8}>
            <Card
              bordered={false}
              style={{ borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: '100%' }}
              title={<span style={{ fontWeight: 600, fontSize: 14 }}><PhoneOutlined style={{ color: '#52c41a', marginRight: 6 }} />Interaction Overview</span>}
            >
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic
                    title="Total Interactions"
                    value={interactionStats.totalCalls + interactionStats.totalWhatsApp + interactionStats.totalEmails + interactionStats.totalNotes}
                    prefix={<PhoneOutlined style={{ color: '#52c41a' }} />}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Contacted Recently"
                    value={interactionStats.contactedRecently}
                    suffix={`/ ${totalCount}`}
                    prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                  />
                </Col>
              </Row>
              <Divider style={{ margin: '12px 0' }} />
              <Row gutter={[16, 8]}>
                <Col span={6}>
                  <div style={{ textAlign: 'center' }}>
                    <PhoneOutlined style={{ color: '#52c41a', fontSize: 18 }} />
                    <div><Text strong>{interactionStats.totalCalls}</Text></div>
                    <Text type="secondary" style={{ fontSize: 11 }}>Calls</Text>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ textAlign: 'center' }}>
                    <WhatsAppOutlined style={{ color: '#25D366', fontSize: 18 }} />
                    <div><Text strong>{interactionStats.totalWhatsApp}</Text></div>
                    <Text type="secondary" style={{ fontSize: 11 }}>WhatsApp</Text>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ textAlign: 'center' }}>
                    <MailOutlined style={{ color: '#1677ff', fontSize: 18 }} />
                    <div><Text strong>{interactionStats.totalEmails}</Text></div>
                    <Text type="secondary" style={{ fontSize: 11 }}>Emails</Text>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ textAlign: 'center' }}>
                    <FileTextOutlined style={{ color: '#faad14', fontSize: 18 }} />
                    <div><Text strong>{interactionStats.totalNotes}</Text></div>
                    <Text type="secondary" style={{ fontSize: 11 }}>Notes</Text>
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
                    <Bar yAxisId="left" dataKey="total" name="Total Contacts" fill="#1677ff" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="deals" name="Deals" fill="#fa8c16" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="rate" name="Deal Rate %" stroke="#52c41a" strokeWidth={2} dot={{ r: 4 }} />
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
              title={<span style={{ fontWeight: 600, fontSize: 14 }}><ThunderboltOutlined style={{ color: '#faad14', marginRight: 6 }} />Seller Performance & Interaction Tracking</span>}
              extra={
                <Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>Click a row to filter contacts below</Text>
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
                    title: 'Seller', dataIndex: 'name', key: 'name', fixed: 'left', width: 180,
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
                    title: 'Contacted', dataIndex: 'contactedCount', key: 'contactedCount', width: 120,
                    render: (v, r) => (
                      <Space direction="vertical" size={0} style={{ width: '100%' }}>
                        <Text style={{ fontSize: 12 }}><PhoneOutlined style={{ marginRight: 4, color: '#52c41a' }} />{v} / {r.assignedCount}</Text>
                        <Progress percent={Math.round(r.contactRate)} size="small" strokeColor="#52c41a" showInfo={false} />
                      </Space>
                    ),
                    sorter: (a, b) => a.contactRate - b.contactRate,
                  },
                  {
                    title: 'Deals', dataIndex: 'dealCount', key: 'dealCount', width: 110,
                    render: (v) => <Tag color="#fa8c16" style={{ borderRadius: 10 }}>{v}</Tag>,
                    sorter: (a, b) => a.dealCount - b.dealCount,
                    defaultSortOrder: 'descend',
                  },
                  {
                    title: 'Deal Rate', dataIndex: 'dealRate', key: 'dealRate', width: 160,
                    render: (v) => (
                      <Space>
                        <Progress
                          percent={Math.round(v)}
                          size="small"
                          strokeColor={v >= 30 ? '#52c41a' : v >= 10 ? '#faad14' : '#f5222d'}
                          style={{ width: 90 }}
                        />
                        <Text style={{ fontSize: 12 }}>{v.toFixed(0)}%</Text>
                      </Space>
                    ),
                    sorter: (a, b) => a.dealRate - b.dealRate,
                  },
                  {
                    title: 'Avg Response', dataIndex: 'avgResponseHrs', key: 'avgResponseHrs', width: 130,
                    render: (v) => v === null || v === undefined
                      ? <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
                      : <Text style={{ fontSize: 12 }}>{v < 1 ? `${Math.round(v * 60)}m` : `${v.toFixed(1)}h`}</Text>,
                    sorter: (a, b) => (a.avgResponseHrs ?? 9999) - (b.avgResponseHrs ?? 9999),
                  },
                  {
                    title: 'Avg Deal Time', dataIndex: 'avgDealDays', key: 'avgDealDays', width: 130,
                    render: (v) => v === null || v === undefined
                      ? <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
                      : <Text style={{ fontSize: 12 }}>{v.toFixed(1)} days</Text>,
                    sorter: (a, b) => (a.avgDealDays ?? 9999) - (b.avgDealDays ?? 9999),
                  },
                  {
                    title: 'Loss', dataIndex: 'notInterestedCount', key: 'notInterestedCount', width: 90,
                    render: (v) => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text>,
                  },
                ]}
                locale={{ emptyText: <Empty description="No seller activity in this period" /> }}
              />
            </Card>
          </Col>

          {/* FILTERED CONTACTS TABLE */}
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
                    {activeFilter && activeFilter.type !== 'all' ? `Contacts · ${activeLabel}` : 'All Contacts (Period)'}
                  </Title>
                  <Badge count={filteredTableContacts.length} showZero style={{ backgroundColor: '#1677ff' }} />
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
                dataSource={filteredTableContacts}
                columns={contactColumns}
                rowKey="id"
                size="middle"
                scroll={{ x: 1000 }}
                pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'] }}
                onRow={(record) => ({
                  onClick: () => showContactHistory(record),
                  style: { cursor: 'pointer' },
                })}
              />
            </Card>
          </Col>
        </Row>
      </Spin>

      {/* CONTACT HISTORY DRAWER */}
      <Drawer
        title={
          <Space>
            <HistoryOutlined />
            <span>Contact History</span>
            {selectedContactForHistory && (
              <Tag color="blue">{selectedContactForHistory.name || 'Unknown'}</Tag>
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
            onClick={() => selectedContactForHistory && fetchContactHistory([selectedContactForHistory])}
          >
            Refresh
          </Button>
        }
      >
        {historyLoading && !selectedContactHistory.length ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Spin tip="Loading history..." />
          </div>
        ) : (
          <HistoryDrawerContent contact={selectedContactForHistory} history={selectedContactHistory} />
        )}
      </Drawer>
    </div>
  );
};

export default ContactAnalyticsDashboard;