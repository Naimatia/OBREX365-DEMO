// pages/SellersPage.js
// ─── Enhanced with Lead History + 20k-scale Analytics ─────────────────────────
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Card, Table, Tag, Space, Button, Input, Select, Modal,
  message, Tooltip, Popconfirm, Typography, Progress, Row, Col,
  Statistic, Drawer, DatePicker, Tabs, List, Avatar, Divider, Badge,
  Spin, Empty, Timeline, Segmented, Alert, Skeleton
} from 'antd';
import {
  UserAddOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  EyeOutlined, PhoneOutlined, MailOutlined, TrophyOutlined,
  CalendarOutlined, LineChartOutlined, SwapOutlined, RiseOutlined,
  FallOutlined, FireOutlined, ThunderboltOutlined, TeamOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined,
  DollarOutlined, FunnelPlotOutlined, BarChartOutlined,
  HistoryOutlined, MessageOutlined, WhatsAppOutlined, PhoneFilled,
  TagOutlined, FilterOutlined, ReloadOutlined, DownloadOutlined,
  InfoCircleOutlined, BulbOutlined, WarningOutlined, RocketOutlined,
  StarOutlined, TrophyFilled, CrownOutlined, ThunderboltFilled
} from '@ant-design/icons';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, ScatterChart, Scatter,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { useSelector } from 'react-redux';
import UserService from 'services/firebase/UserService';
import ContactsService from 'services/ContactsService';
import DealsService from 'services/DealsService';
import LeadsService from 'services/LeadsService';
import InvoicesService from 'services/InvoicesService';
import MeetingService from 'services/MeetingService';
import LeadHistoryService from 'services/firebase/LeadHistoryService';
import { UserRoles } from 'models/UserModel';
import { DealStatus } from 'models/DealModel';
import dayjs from 'dayjs';
import AddUserForm from './AddUserForm';
import EditUserForm from './EditUserForm';
import BulkLeadTransferModal from '../../components/BulkLeadTransfer/BulkLeadTransferModal';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

// ─── Color System ─────────────────────────────────────────────────────────────
const C = {
  green:  '#00c48c', red:    '#ff4757', blue:   '#2563eb',
  purple: '#7c3aed', orange: '#f97316', cyan:   '#06b6d4',
  gold:   '#f59e0b', pink:   '#ec4899', lime:   '#84cc16',
  indigo: '#6366f1', teal:   '#14b8a6', rose:   '#f43f5e',
  slate:  '#64748b', dark:   '#0f172a',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const pct  = (n, t) => t > 0 ? Math.round((n / t) * 100) : 0;
const fmt  = (n) => Number(n || 0).toLocaleString('en-AE');
const fmtK = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n || 0);
const deltaIcon = (v) => v >= 0
  ? <RiseOutlined style={{ color: C.green, fontSize: 11 }} />
  : <FallOutlined style={{ color: C.red, fontSize: 11 }} />;

// ─── History type config ──────────────────────────────────────────────────────
const HISTORY_TYPE_CONFIG = {
  whatsapp: { color: '#25D366', icon: <WhatsAppOutlined />, label: 'WhatsApp' },
  email:    { color: C.blue,    icon: <MailOutlined />,     label: 'Email' },
  call:     { color: C.purple,  icon: <PhoneFilled />,      label: 'Call' },
  status:   { color: C.cyan,    icon: <TagOutlined />,      label: 'Status' },
  note:     { color: C.slate,   icon: <MessageOutlined />,  label: 'Note' },
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, sub, color = C.blue, suffix = '', extra, trend, badge }) => (
  <Card
    size="small"
    style={{
      borderRadius: 14,
      border: `1px solid ${color}28`,
      background: `linear-gradient(145deg, #fff 55%, ${color}0d 100%)`,
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
    }}
    bodyStyle={{ padding: '14px 16px' }}
  >
    {badge && (
      <div style={{
        position: 'absolute', top: 8, right: 10,
        background: badge.color, color: '#fff',
        borderRadius: 20, padding: '1px 8px', fontSize: 10, fontWeight: 700
      }}>{badge.text}</div>
    )}
    <div style={{ position: 'absolute', right: -10, bottom: -10, fontSize: 52, opacity: 0.05, color }}>
      {icon}
    </div>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <div style={{
        width: 42, height: 42, borderRadius: 10, flexShrink: 0,
        background: `${color}18`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 20, color
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text type="secondary" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600 }}>
          {label}
        </Text>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</span>
          {suffix && <span style={{ fontSize: 12, color: '#aaa' }}>{suffix}</span>}
          {trend !== undefined && (
            <span style={{ fontSize: 11, marginLeft: 2 }}>{deltaIcon(trend)} {Math.abs(trend)}%</span>
          )}
        </div>
        {sub && <Text type="secondary" style={{ fontSize: 11 }}>{sub}</Text>}
        {extra && <div style={{ marginTop: 4 }}>{extra}</div>}
      </div>
    </div>
  </Card>
);

// ─── Section header ───────────────────────────────────────────────────────────
const SectionTitle = ({ icon, title, color = C.blue, action }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 3, height: 18, borderRadius: 2, background: color }} />
      <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>{icon} {title}</span>
    </div>
    {action}
  </div>
);

// ─── Chart Tooltip ────────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(15,23,42,0.92)', border: 'none',
      borderRadius: 10, padding: '8px 14px', backdropFilter: 'blur(10px)'
    }}>
      {label && <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 12, color: '#e2e8f0' }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 12, color: p.color || '#94a3b8' }}>
          {p.name}: <b style={{ color: '#f8fafc' }}>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</b>
        </div>
      ))}
    </div>
  );
};

// ─── AI Insight Card ──────────────────────────────────────────────────────────
const InsightCard = ({ insights }) => {
  if (!insights?.length) return null;
  return (
    <Card
      size="small"
      style={{
        marginBottom: 16, background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
        border: 'none', borderRadius: 14
      }}
      bodyStyle={{ padding: '14px 18px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <BulbOutlined style={{ color: '#fde68a', fontSize: 18 }} />
        <Text style={{ color: '#fde68a', fontWeight: 700, fontSize: 13 }}>AI Insights & Recommendations</Text>
      </div>
      {insights.map((ins, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 7,
          padding: '6px 10px', background: 'rgba(255,255,255,0.07)',
          borderRadius: 8, borderLeft: `3px solid ${ins.color || '#818cf8'}`
        }}>
          <span style={{ fontSize: 14 }}>{ins.icon}</span>
          <Text style={{ color: '#e0e7ff', fontSize: 12 }}>{ins.text}</Text>
        </div>
      ))}
    </Card>
  );
};

// ─── Virtual Lead History Table (handles 20k+ efficiently) ───────────────────
const LeadHistoryTable = ({ history, loading, onLoadMore, hasMore, totalCount }) => {
  const [typeFilter, setTypeFilter] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let h = history;
    if (typeFilter) h = h.filter(x => x.type === typeFilter);
    if (search) {
      const q = search.toLowerCase();
      h = h.filter(x =>
        (x.createdBy?.name || '').toLowerCase().includes(q) ||
        (x.message || '').toLowerCase().includes(q) ||
        (x.leadName || '').toLowerCase().includes(q)
      );
    }
    return h;
  }, [history, typeFilter, search]);

  const cols = [
    {
      title: 'Type', dataIndex: 'type', width: 110,
      render: t => {
        const cfg = HISTORY_TYPE_CONFIG[t] || { color: C.slate, label: t };
        return <Tag color={cfg.color} style={{ fontWeight: 600, fontSize: 11 }}>{cfg.label}</Tag>;
      }
    },
    {
      title: 'Lead', dataIndex: 'leadName', width: 150,
      render: n => <Text strong style={{ fontSize: 12 }}>{n || '—'}</Text>
    },
    {
      title: 'Action By', dataIndex: 'createdBy', width: 140,
      render: cb => (
        <Space size={4}>
          <Avatar size={22} style={{ background: C.blue, fontSize: 10 }}>
            {(cb?.name || '?')[0].toUpperCase()}
          </Avatar>
          <Text style={{ fontSize: 12 }}>{cb?.name || '—'}</Text>
        </Space>
      )
    },
    {
      title: 'Details', dataIndex: 'message',
      render: (msg, r) => {
        if (r.type === 'call') return (
          <Text style={{ fontSize: 12 }}>
            <PhoneFilled /> {r.duration}min –{' '}
            <Tag color={r.outcome === 'answered' ? 'green' : 'red'} style={{ fontSize: 10 }}>{r.outcome}</Tag>
          </Text>
        );
        if (r.type === 'status') return (
          <Text style={{ fontSize: 12 }}>→ <Tag color="blue" style={{ fontSize: 10 }}>{(msg || '').split('to ')[1]}</Tag></Text>
        );
        return <Text style={{ fontSize: 12 }} ellipsis={{ tooltip: msg }}>{msg || '—'}</Text>;
      }
    },
    {
      title: 'Time', dataIndex: 'createdAt', width: 130,
      render: t => <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(t).format('DD MMM, HH:mm')}</Text>,
      sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
      defaultSortOrder: 'descend'
    },
  ];

  return (
    <div>
      <Row gutter={8} style={{ marginBottom: 12 }}>
        <Col flex="auto">
          <Input
            size="small"
            placeholder="Search by lead, agent, message…"
            prefix={<SearchOutlined style={{ color: '#bbb' }} />}
            value={search}
            onChange={e => setSearch(e.target.value)}
            allowClear
          />
        </Col>
        <Col>
          <Select
            size="small"
            placeholder="Filter type"
            value={typeFilter}
            onChange={setTypeFilter}
            allowClear
            style={{ width: 130 }}
          >
            {Object.entries(HISTORY_TYPE_CONFIG).map(([k, v]) => (
              <Option key={k} value={k}>{v.label}</Option>
            ))}
          </Select>
        </Col>
      </Row>

      {totalCount > 0 && (
        <Alert
          message={
            <span>
              Showing <b>{filtered.length.toLocaleString()}</b> of{' '}
              <b>{totalCount.toLocaleString()}</b> total history entries
              {filtered.length < totalCount && typeFilter === null && search === '' && ' (paginated for performance)'}
            </span>
          }
          type="info" showIcon
          style={{ marginBottom: 10, borderRadius: 8, fontSize: 12 }}
        />
      )}

      <Table
        dataSource={filtered}
        columns={cols}
        rowKey={(r, i) => r.id || i}
        loading={loading}
        size="small"
        pagination={{ pageSize: 50, showSizeChanger: true, pageSizeOptions: ['25', '50', '100', '200'], showTotal: t => `${t.toLocaleString()} entries` }}
        scroll={{ y: 340 }}
        rowClassName={(_, i) => i % 2 === 0 ? '' : 'ant-table-row-alt'}
      />

      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <Button size="small" onClick={onLoadMore} icon={<DownloadOutlined />}>
            Load More History
          </Button>
        </div>
      )}
    </div>
  );
};

// ─── History Analytics Charts ─────────────────────────────────────────────────
const HistoryAnalyticsPanel = ({ history, analyticsData }) => {
  const typeCounts = useMemo(() => {
    const counts = {};
    history.forEach(h => { counts[h.type] = (counts[h.type] || 0) + 1; });
    return Object.entries(counts).map(([type, count]) => ({
      name: HISTORY_TYPE_CONFIG[type]?.label || type,
      value: count,
      fill: HISTORY_TYPE_CONFIG[type]?.color || C.slate
    }));
  }, [history]);

  const dailyActivity = useMemo(() => {
    const daily = {};
    history.forEach(h => {
      const day = dayjs(h.createdAt).format('MMM DD');
      daily[day] = (daily[day] || 0) + 1;
    });
    return Object.entries(daily)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-30);
  }, [history]);

  const hourlyActivity = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, count: 0 }));
    history.forEach(h => {
      const hr = dayjs(h.createdAt).hour();
      hours[hr].count++;
    });
    return hours;
  }, [history]);

  if (!history.length) return <Empty description="No history data" style={{ padding: 40 }} />;

  return (
    <Row gutter={[14, 14]}>
      {/* Activity type distribution */}
      <Col xs={24} md={8}>
        <Card size="small" style={{ borderRadius: 12 }}>
          <SectionTitle icon="📊" title="Activity Breakdown" color={C.purple} />
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={typeCounts} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                dataKey="value" nameKey="name" paddingAngle={3}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}>
                {typeCounts.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <RTooltip content={<ChartTip />} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </Col>

      {/* Daily trend */}
      <Col xs={24} md={16}>
        <Card size="small" style={{ borderRadius: 12 }}>
          <SectionTitle icon="📈" title="Daily Activity (Last 30 days)" color={C.blue} />
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dailyActivity} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.blue} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.blue} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} />
              <RTooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="count" name="Activities"
                stroke={C.blue} fill="url(#actGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </Col>

      {/* Hourly heatmap */}
      <Col xs={24}>
        <Card size="small" style={{ borderRadius: 12 }}>
          <SectionTitle icon="⏰" title="Activity by Hour (Engagement Pattern)" color={C.orange} />
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={hourlyActivity} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={1} />
              <YAxis tick={{ fontSize: 10 }} />
              <RTooltip content={<ChartTip />} />
              <Bar dataKey="count" name="Activities" radius={[3, 3, 0, 0]}>
                {hourlyActivity.map((e, i) => (
                  <Cell key={i} fill={e.count > 10 ? C.orange : e.count > 5 ? C.gold : `${C.gold}55`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ textAlign: 'center', marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              Peak hours reveal when your team is most active — great for scheduling training or follow-ups
            </Text>
          </div>
        </Card>
      </Col>
    </Row>
  );
};

// ─── Leads Scale Analytics (handles 20k+) ────────────────────────────────────
const LeadsScaleAnalytics = ({ leads, history }) => {
  // Bucket leads by budget ranges
  const budgetBuckets = useMemo(() => {
    const buckets = { '<500k': 0, '500k–1M': 0, '1M–2M': 0, '2M–5M': 0, '>5M': 0 };
    leads.forEach(l => {
      const b = Number(l.Budget) || 0;
      if (b < 500000) buckets['<500k']++;
      else if (b < 1000000) buckets['500k–1M']++;
      else if (b < 2000000) buckets['1M–2M']++;
      else if (b < 5000000) buckets['2M–5M']++;
      else buckets['>5M']++;
    });
    return Object.entries(buckets).map(([name, value]) => ({ name, value, fill: C.blue }));
  }, [leads]);

  // Leads by interest + contacted status
  const contactMatrix = useMemo(() => {
    const m = { HIGH: { contacted: 0, not: 0 }, MEDIUM: { contacted: 0, not: 0 }, LOW: { contacted: 0, not: 0 } };
    leads.forEach(l => {
      const lvl = (l.InterestLevel || 'LOW').toUpperCase();
      const k = ['HIGH', 'HOT'].includes(lvl) ? 'HIGH' : ['MEDIUM', 'WARM'].includes(lvl) ? 'MEDIUM' : 'LOW';
      if (l.contacted) m[k].contacted++;
      else m[k].not++;
    });
    return [
      { name: 'Hot Leads',  contacted: m.HIGH.contacted, uncontacted: m.HIGH.not,  fill: C.red    },
      { name: 'Warm Leads', contacted: m.MEDIUM.contacted, uncontacted: m.MEDIUM.not, fill: C.orange },
      { name: 'Cold Leads', contacted: m.LOW.contacted,  uncontacted: m.LOW.not,   fill: C.blue   },
    ];
  }, [leads]);

  // Region distribution
  const regionData = useMemo(() => {
    const counts = {};
    leads.forEach(l => { const r = l.region || 'Unknown'; counts[r] = (counts[r] || 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value], i) => ({
        name, value,
        fill: [C.blue, C.cyan, C.purple, C.green, C.orange, C.pink, C.teal, C.indigo][i % 8]
      }));
  }, [leads]);

  // Source platform distribution
  const platformData = useMemo(() => {
    const counts = {};
    leads.forEach(l => {
      const p = l.RedirectedFrom || l.meta_platform || 'Unknown';
      counts[p] = (counts[p] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value], i) => ({
      name, value,
      fill: [C.blue, '#E1306C', C.green, C.orange][i % 4]
    }));
  }, [leads]);

  // Contact rate KPIs
  const totalLeads = leads.length;
  const contactedLeads = leads.filter(l => l.contacted).length;
  const hotLeads = leads.filter(l => ['HIGH', 'HOT'].includes((l.InterestLevel || '').toUpperCase())).length;
  const contactRate = pct(contactedLeads, totalLeads);
  const hotContactRate = pct(
    leads.filter(l => ['HIGH', 'HOT'].includes((l.InterestLevel || '').toUpperCase()) && l.contacted).length,
    hotLeads
  );

  // Uncontacted hot leads — critical alert
  const uncontactedHot = leads.filter(
    l => ['HIGH', 'HOT'].includes((l.InterestLevel || '').toUpperCase()) && !l.contacted
  ).length;

  return (
    <div>
      {/* Scale summary */}
      <Row gutter={[10, 10]} style={{ marginBottom: 14 }}>
        <Col xs={12} sm={6}>
          <KpiCard icon={<ThunderboltFilled />} label="Total Leads" value={fmtK(totalLeads)}
            color={C.blue} sub="All time assigned" />
        </Col>
        <Col xs={12} sm={6}>
          <KpiCard icon={<CheckCircleOutlined />} label="Contacted" value={fmtK(contactedLeads)}
            color={C.green} sub={`${contactRate}% contact rate`}
            extra={<Progress percent={contactRate} size="small" strokeColor={C.green} showInfo={false} />} />
        </Col>
        <Col xs={12} sm={6}>
          <KpiCard icon={<FireOutlined />} label="Hot Leads" value={fmtK(hotLeads)}
            color={C.red} sub={`${hotContactRate}% contacted`}
            extra={<Progress percent={hotContactRate} size="small" strokeColor={C.red} showInfo={false} />}
            badge={uncontactedHot > 0 ? { text: `${uncontactedHot} uncontacted!`, color: C.red } : null} />
        </Col>
        <Col xs={12} sm={6}>
          <KpiCard icon={<WarningOutlined />} label="Not Contacted" value={fmtK(totalLeads - contactedLeads)}
            color={C.orange} sub="Needs attention"
            extra={<Progress percent={100 - contactRate} size="small" strokeColor={C.orange} showInfo={false} />} />
        </Col>
      </Row>

      {/* Uncontacted hot leads alert */}
      {uncontactedHot > 0 && (
        <Alert
          message={
            <span>
              <b>🔥 {uncontactedHot} hot leads have never been contacted!</b>
              {' '}These are high-priority leads losing value every day. Assign and action immediately.
            </span>
          }
          type="error" showIcon
          style={{ marginBottom: 14, borderRadius: 10 }}
        />
      )}

      <Row gutter={[14, 14]}>
        {/* Budget distribution */}
        <Col xs={24} md={12}>
          <Card size="small" style={{ borderRadius: 12 }}>
            <SectionTitle icon="💰" title="Budget Distribution" color={C.gold} />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={budgetBuckets} margin={{ top: 4, right: 8, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtK} />
                <RTooltip content={<ChartTip />} />
                <Bar dataKey="value" name="Leads" radius={[6, 6, 0, 0]} fill={C.blue}>
                  {budgetBuckets.map((_, i) => (
                    <Cell key={i} fill={[C.blue, C.cyan, C.purple, C.gold, C.orange][i % 5]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Contact matrix */}
        <Col xs={24} md={12}>
          <Card size="small" style={{ borderRadius: 12 }}>
            <SectionTitle icon="📞" title="Contact Rate by Interest" color={C.green} />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={contactMatrix} margin={{ top: 4, right: 8, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtK} />
                <RTooltip content={<ChartTip />} />
                <Bar dataKey="contacted" name="Contacted" stackId="a" radius={[0, 0, 0, 0]} fill={C.green} />
                <Bar dataKey="uncontacted" name="Not Contacted" stackId="a" radius={[6, 6, 0, 0]} fill={`${C.red}88`} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Region distribution */}
        <Col xs={24} md={12}>
          <Card size="small" style={{ borderRadius: 12 }}>
            <SectionTitle icon="🗺️" title="Leads by Region (Top 8)" color={C.teal} />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart layout="vertical" data={regionData} margin={{ top: 4, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={fmtK} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={70} />
                <RTooltip content={<ChartTip />} />
                <Bar dataKey="value" name="Leads" radius={[0, 6, 6, 0]}>
                  {regionData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Source platform */}
        <Col xs={24} md={12}>
          <Card size="small" style={{ borderRadius: 12 }}>
            <SectionTitle icon="📱" title="Lead Sources" color={C.indigo} />
            {platformData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={platformData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                    dataKey="value" nameKey="name" paddingAngle={4}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}>
                    {platformData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <RTooltip content={<ChartTip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <Empty description="No source data" style={{ padding: 40 }} />}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
const SellersPage = () => {
  const reduxUser  = useSelector(s => s.auth.user);
  const companyId  = reduxUser?.company_id || '';
  const userRole   = reduxUser?.Role || '';

  // ── Core state ──────────────────────────────────────────────────────────────
  const [loading,           setLoading]           = useState(true);
  const [users,             setUsers]             = useState([]);
  const [filteredUsers,     setFilteredUsers]     = useState([]);
  const [searchText,        setSearchText]        = useState('');
  const [roleFilter,        setRoleFilter]        = useState(undefined);
  const [isAddModalVisible,   setIsAddModalVisible]  = useState(false);
  const [isEditModalVisible,  setIsEditModalVisible] = useState(false);
  const [currentUser,       setCurrentUser]       = useState(null);
  const [sellerProgress,    setSellerProgress]    = useState({});

  // ── Analytics state ──────────────────────────────────────────────────────────
  const [selectedSeller,    setSelectedSeller]    = useState(null);
  const [analyticsVisible,  setAnalyticsVisible]  = useState(false);
  const [analyticsLoading,  setAnalyticsLoading]  = useState(false);
  const [analyticsData,     setAnalyticsData]     = useState(null);
  const [analyticsTab,      setAnalyticsTab]      = useState('overview');
  const [dateRange,         setDateRange]         = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [selectedMonth,     setSelectedMonth]     = useState(dayjs());

  // ── History state ─────────────────────────────────────────────────────────
  const [allHistory,        setAllHistory]        = useState([]);
  const [historyLoading,    setHistoryLoading]    = useState(false);
  const [historyHasMore,    setHistoryHasMore]    = useState(false);
  const [historyTotalCount, setHistoryTotalCount] = useState(0);
  const historyPageSize = 500; // Load 500 at a time for performance

  // ── Transfer state ───────────────────────────────────────────────────────────
  const [transferModalVisible,  setTransferModalVisible]  = useState(false);
  const [transferFromSeller,    setTransferFromSeller]    = useState(false);

  const salesRoles = [
    UserRoles.SELLER, UserRoles.SALES_EXECUTIVE, UserRoles.AGENT,
    UserRoles.TEAM_LEADER, UserRoles.SALES_MANAGER,
    UserRoles.OFF_PLAN_SALES, UserRoles.READY_TO_MOVE_SALES
  ];
  const canManageUsers = [UserRoles.CEO, UserRoles.HR].includes(userRole);

  // ── Fetch team ──────────────────────────────────────────────────────────────
 const fetchUsers = async () => {
  setLoading(true);
  try {
    let list = companyId ? await UserService.getUsersByCompanyId(companyId) : [];
    list = list.filter(u => u.id !== reduxUser?.id && u.id); // ensure id exists

    const withLeads = await Promise.all(list.map(async u => {
      if (!u.id || !companyId) {
        return { ...u, totalLeads: 0, contactedLeads: 0, _leads: [] };
      }

      try {
        const allLeads = await LeadsService.getSellerLeadsByDateRange(companyId, u.id);
        const contactedPromises = allLeads.slice(0, 200).map(lead => 
          LeadHistoryService.hasSellerContactedLead(lead.id, u.id)
        );
        const contactedResults = await Promise.all(contactedPromises);
        const contacted = contactedResults.filter(Boolean).length;

        return { 
          ...u, 
          totalLeads: allLeads.length, 
          contactedLeads: contacted, 
          _leads: allLeads 
        };
      } catch (err) {
        console.warn(`Failed to load leads for seller ${u.id}:`, err);
        return { ...u, totalLeads: 0, contactedLeads: 0, _leads: [] };
      }
    }));

    setUsers(withLeads);
    setFilteredUsers(withLeads);
    await fetchAllSellersProgress(withLeads);
  } catch (err) {
    console.error(err);
    message.error('Failed to load team members');
  } finally { 
    setLoading(false); 
  }
};

  const calculateSellerProgress = async (sellerId) => {
    try {
      const s = dayjs().startOf('month').toDate(), e = dayjs().endOf('month').toDate();
      const contacts = await ContactsService.getSellerContactsByDateRange(sellerId, s, e);
      const total     = contacts.length;
      const contacted = contacts.filter(c => c.status === 'Contacted').length;
      const deal      = contacts.filter(c => c.status === 'Deal').length;
      return { total, contacted, deal, progressPercentage: pct(contacted + deal, total) };
    } catch { return { total: 0, contacted: 0, deal: 0, progressPercentage: 0 }; }
  };

  const fetchAllSellersProgress = async (list) => {
    const sellers = list.filter(u => salesRoles.includes(u.Role || u.role));
    const entries = await Promise.all(sellers.map(async s => [s.id, await calculateSellerProgress(s.id)]));
    setSellerProgress(Object.fromEntries(entries));
  };

  // ── Load lead history for a seller (paginated, 20k-safe) ──────────────────
const loadSellerHistory = useCallback(async (sellerId, append = false) => {
  if (!sellerId) return;

  setHistoryLoading(true);
  try {
    const result = await LeadHistoryService.getSellerAllHistory(sellerId, {
      pageSize: historyPageSize,                    // ← changed from 'limit'
      startAfter: append ? allHistory[allHistory.length - 1]?.createdAt : null,
      companyId: companyId                          // ← Good to pass
    });

    const enriched = (result.items || []).map(h => ({
      ...h,
      leadName: h.leadName || 'Unknown Lead'
    }));

    setAllHistory(prev => append ? [...prev, ...enriched] : enriched);
    setHistoryTotalCount(result.total || enriched.length);
    setHistoryHasMore(result.hasMore || false);

    console.log(`✅ Loaded ${enriched.length} history items for seller`);
  } catch (err) {
    console.error('History load error:', err);
    if (!append) setAllHistory([]);
  } finally {
    setHistoryLoading(false);
  }
}, [allHistory, historyPageSize, companyId]);

  // ── Compute AI insights from analytics ───────────────────────────────────
  const computeInsights = (d) => {
    const insights = [];
    if (!d) return insights;

    if (d.leads.total > 0) {
      const uncontactedHot = d.rawData?.leads?.filter(
        l => ['HIGH', 'HOT'].includes((l.InterestLevel || '').toUpperCase()) && !l.contacted
      ).length || 0;
      if (uncontactedHot > 0) {
        insights.push({
          icon: '🔥', color: C.red,
          text: `${uncontactedHot} hot leads have never been contacted — high-value opportunity being lost!`
        });
      }
    }

    if (d.deals.winRate < 20) {
      insights.push({
        icon: '📉', color: C.orange,
        text: `Win rate is ${d.deals.winRate}% — below the 20% benchmark. Review qualification criteria and follow-up cadence.`
      });
    } else if (d.deals.winRate > 50) {
      insights.push({
        icon: '🏆', color: C.green,
        text: `Excellent ${d.deals.winRate}% win rate! This seller is a top performer — consider them for mentoring.`
      });
    }

    if (d.meetings.completionRate < 50 && d.meetings.total > 0) {
      insights.push({
        icon: '📅', color: C.purple,
        text: `Only ${d.meetings.completionRate}% of meetings completed. High cancellation suggests scheduling or qualification issues.`
      });
    }

    if (d.contacts.successRate > 60) {
      insights.push({
        icon: '⚡', color: C.cyan,
        text: `${d.contacts.successRate}% contact success rate is strong. Document this seller's approach for team training.`
      });
    }

    if (d.invoices.overdue > 0) {
      insights.push({
        icon: '⚠️', color: C.gold,
        text: `${d.invoices.overdue} overdue invoice${d.invoices.overdue > 1 ? 's' : ''} — AED collection at risk. Prioritize follow-up.`
      });
    }

    const activityHours = allHistory.length > 0 ?
      allHistory.reduce((acc, h) => { acc[dayjs(h.createdAt).hour()]++; return acc; }, {}) : {};
    const peakHour = Object.entries(activityHours).sort((a, b) => b[1] - a[1])[0];
    if (peakHour) {
      insights.push({
        icon: '⏰', color: C.teal,
        text: `Peak activity at ${peakHour[0]}:00 — schedule important lead follow-ups around this time for best response rates.`
      });
    }

    return insights;
  };

  // ── Full analytics fetch ──────────────────────────────────────────────────
  const fetchSellerAnalytics = async (sellerId, startDate, endDate) => {
    setAnalyticsLoading(true);
    try {
      const [contacts, deals, leads, invoices, meetings] = await Promise.all([
        ContactsService.getSellerContactsByDateRange(sellerId, startDate, endDate),
        DealsService.getSellerDealsByDateRange(sellerId, startDate, endDate),
        LeadsService.getSellerLeadsByDateRange(companyId, sellerId),
        InvoicesService.getSellerInvoicesByDateRange(sellerId, startDate, endDate),
        MeetingService.fetchMeetings(companyId).then(all =>
          all.filter(m =>
            (m.creator_id === sellerId || m.assignedTo === sellerId || m.Users?.includes(sellerId)) &&
            dayjs(m.DateTime).isAfter(dayjs(startDate)) &&
            dayjs(m.DateTime).isBefore(dayjs(endDate))
          )
        ).catch(() => [])
      ]);

      // contacts stats
      const cStats = {
        total:     contacts.length,
        pending:   contacts.filter(c => c.status === 'Pending').length,
        contacted: contacts.filter(c => c.status === 'Contacted').length,
        deal:      contacts.filter(c => c.status === 'Deal').length,
        loss:      contacts.filter(c => c.status === 'Loss').length,
      };
      cStats.successRate = pct(cStats.contacted + cStats.deal, cStats.total);

      // deals stats
      const dStats = {
        total:      deals.length,
        opened:     deals.filter(d => d.Status === DealStatus.OPENED).length,
        gain:       deals.filter(d => d.Status === DealStatus.GAIN).length,
        loss:       deals.filter(d => d.Status === DealStatus.LOSS).length,
        totalValue: deals.reduce((s, d) => s + (Number(d.Amount) || 0), 0),
        gainValue:  deals.filter(d => d.Status === DealStatus.GAIN).reduce((s, d) => s + (Number(d.Amount) || 0), 0),
      };
      dStats.winRate = pct(dStats.gain, dStats.total);
      dStats.avgDeal = dStats.total > 0 ? Math.round(dStats.totalValue / dStats.total) : 0;

      // leads stats
      const lvl = l => (l.InterestLevel || '').toUpperCase();
      const lStats = {
        total:     leads.length,
        hot:       leads.filter(l => ['HIGH', 'HOT'].includes(lvl(l))).length,
        warm:      leads.filter(l => ['MEDIUM', 'WARM'].includes(lvl(l))).length,
        cold:      leads.filter(l => ['LOW', 'COLD'].includes(lvl(l))).length,
        contacted: leads.filter(l => l.contacted).length,
      };
      lStats.hotRate = pct(lStats.hot, lStats.total);
      lStats.contactRate = pct(lStats.contacted, lStats.total);

      // meetings stats
      const mStats = {
        total:     meetings.length,
        completed: meetings.filter(m => m.Status === 'Completed').length,
        pending:   meetings.filter(m => m.Status === 'Pending').length,
        cancelled: meetings.filter(m => m.Status === 'Cancelled').length,
        online:    meetings.filter(m => m.Type?.toLowerCase() === 'online').length,
        onSite:    meetings.filter(m => m.Type?.toLowerCase() === 'onsite').length,
      };
      mStats.completionRate = pct(mStats.completed, mStats.total);

      // invoices stats
      const iStats = {
        total:      invoices.length,
        paid:       invoices.filter(i => i.status === 'Paid').length,
        pending:    invoices.filter(i => i.status === 'Pending').length,
        overdue:    invoices.filter(i => i.status === 'Missed' || (i.DateLimit && dayjs(i.DateLimit).isBefore(dayjs()))).length,
        totalValue: invoices.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0),
        paidValue:  invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + (parseFloat(i.amount) || 0), 0),
      };
      iStats.payRate = pct(iStats.paid, iStats.total);

      // funnel
      const funnelData = [
        { name: 'Leads',     value: lStats.total,       fill: C.blue   },
        { name: 'Contacted', value: lStats.contacted,   fill: C.cyan   },
        { name: 'Meetings',  value: mStats.completed,   fill: C.purple },
        { name: 'Deals',     value: dStats.total,       fill: C.orange },
        { name: 'Won',       value: dStats.gain,        fill: C.green  },
      ];

      const contactsBarData = [
        { name: 'Pending',   value: cStats.pending,   fill: C.gold  },
        { name: 'Contacted', value: cStats.contacted, fill: C.cyan  },
        { name: 'Deal',      value: cStats.deal,      fill: C.green },
        { name: 'Loss',      value: cStats.loss,      fill: C.red   },
      ];

      const dealsPieData = [
        { name: 'Open', value: dStats.opened, fill: C.orange },
        { name: 'Won',  value: dStats.gain,   fill: C.green  },
        { name: 'Lost', value: dStats.loss,   fill: C.red    },
      ].filter(d => d.value > 0);

      const leadsPieData = [
        { name: 'Hot',  value: lStats.hot,  fill: C.red    },
        { name: 'Warm', value: lStats.warm, fill: C.orange },
        { name: 'Cold', value: lStats.cold, fill: C.blue   },
      ].filter(d => d.value > 0);

      const meetingsPieData = [
        { name: 'Completed', value: mStats.completed, fill: C.green  },
        { name: 'Pending',   value: mStats.pending,   fill: C.blue   },
        { name: 'Cancelled', value: mStats.cancelled, fill: C.red    },
      ].filter(d => d.value > 0);

      const radialData = [
        { name: 'Contacts', value: cStats.successRate,    fill: C.cyan   },
        { name: 'Deals',    value: dStats.winRate,        fill: C.green  },
        { name: 'Meetings', value: mStats.completionRate, fill: C.purple },
        { name: 'Invoices', value: iStats.payRate,        fill: C.gold   },
      ];

      const overallScore = Math.round(
        (cStats.successRate * 0.25) + (dStats.winRate * 0.35) +
        (mStats.completionRate * 0.20) + (iStats.payRate * 0.20)
      );

      setAnalyticsData({
        contacts: cStats, deals: dStats, leads: lStats,
        meetings: mStats, invoices: iStats,
        funnelData, contactsBarData, dealsPieData, leadsPieData,
        meetingsPieData, radialData, overallScore,
        rawData: { contacts, deals, leads, invoices, meetings },
        dateRange: { startDate, endDate }
      });
    } catch (err) {
      console.error(err);
      message.error('Failed to load analytics');
    } finally { setAnalyticsLoading(false); }
  };

  // ── Event handlers ──────────────────────────────────────────────────────────
  const handleSellerClick = async (seller) => {
    setSelectedSeller(seller);
    setAnalyticsVisible(true);
    setAnalyticsTab('overview');
    setAllHistory([]);
    // Load analytics + history in parallel
    await Promise.all([
      fetchSellerAnalytics(seller.id, dateRange[0].toDate(), dateRange[1].toDate()),
      loadSellerHistory(seller.id)
    ]);
  };

  const handleDateRangeChange = async (dates) => {
    if (dates?.length === 2 && selectedSeller) {
      setDateRange(dates);
      await fetchSellerAnalytics(selectedSeller.id, dates[0].toDate(), dates[1].toDate());
    }
  };

  const handleMonthChange = async (month) => {
    if (month && selectedSeller) {
      setSelectedMonth(month);
      const s = month.startOf('month'), e = month.endOf('month');
      setDateRange([s, e]);
      await fetchSellerAnalytics(selectedSeller.id, s.toDate(), e.toDate());
    }
  };

  const handleAddUser = async (values) => {
    try {
      setLoading(true);
      let ip = '0.0.0.0';
      try { const r = await fetch('https://api.ipify.org?format=json'); ip = (await r.json()).ip; } catch {}
      await UserService.createSellerDirectly({
        ...values, company_id: companyId,
        CreationDate: new Date(), LastLogin: new Date(),
        Notification: false, forcePasswordReset: true, isBanned: false,
        isVerified: false, ipAddress: ip, password: 'Welcome123!'
      });
      message.success(`${values.firstname} ${values.lastname} added.`);
      setIsAddModalVisible(false);
      fetchUsers();
    } catch (err) { message.error(`Failed: ${err.message}`); }
    finally { setLoading(false); }
  };

  const handleUpdateUser = async (values) => {
    try {
      setLoading(true);
      await UserService.updateUserProfile(currentUser.id, {
        firstname: values.firstname, lastname: values.lastname,
        phoneNumber: values.phoneNumber, phoneNumber2: values.phoneNumber2,
        phoneNumber3: values.phoneNumber3, country: values.country, Role: values.role
      });
      message.success('Updated.');
      setIsEditModalVisible(false);
      fetchUsers();
    } catch (err) { message.error(`Failed: ${err.message}`); }
    finally { setLoading(false); }
  };

  const handleDeleteUser = async (id) => {
    try {
      setLoading(true);
      await UserService.deleteUser(id);
      message.success('Deleted.');
      fetchUsers();
    } catch (err) { message.error(`Failed: ${err.message}`); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (companyId) fetchUsers(); }, [companyId]);

  useEffect(() => {
    let r = [...users];
    if (searchText) {
      const q = searchText.toLowerCase();
      r = r.filter(u =>
        u.firstname?.toLowerCase().includes(q) ||
        u.lastname?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    }
    if (roleFilter) r = r.filter(u => u.Role === roleFilter);
    setFilteredUsers(r);
  }, [searchText, roleFilter, users]);

  // ── AI Insights ────────────────────────────────────────────────────────────
  const insights = useMemo(() => computeInsights(analyticsData), [analyticsData, allHistory]);

  // ── Role colors & table columns ─────────────────────────────────────────────
  const roleColor = {
    [UserRoles.CEO]: 'gold', [UserRoles.HR]: 'geekblue',
    [UserRoles.SELLER]: 'green', [UserRoles.SALES_EXECUTIVE]: 'blue',
    [UserRoles.AGENT]: 'purple', [UserRoles.TEAM_LEADER]: 'orange',
    [UserRoles.SALES_MANAGER]: 'magenta', [UserRoles.OFF_PLAN_SALES]: '#2db7f5',
    [UserRoles.READY_TO_MOVE_SALES]: '#87d068'
  };

  const columns = [
    {
      title: 'Name', key: 'name',
      sorter: (a, b) => `${a.firstname}${a.lastname}`.localeCompare(`${b.firstname}${b.lastname}`),
      render: (_, r) => (
        <Space>
          <Avatar style={{ backgroundColor: C.blue, fontSize: 13 }}>
            {(r.firstname?.[0] || '?').toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>{r.firstname} {r.lastname}</div>
            <Text type="secondary" style={{ fontSize: 11 }}>{r.email}</Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Role', dataIndex: 'Role', key: 'role',
      render: role => <Tag color={roleColor[role] || 'default'}>{role}</Tag>
    },
    {
      title: 'Phone', key: 'phone',
      render: (_, r) => [r.phoneNumber, r.phoneNumber2, r.phoneNumber3]
        .filter(Boolean).map((p, i) => <div key={i} style={{ fontSize: 12 }}>{p}</div>) || '—'
    },
    {
      title: 'Leads', key: 'leads', width: 180,
      sorter: (a, b) => (a.totalLeads || 0) - (b.totalLeads || 0),
      render: (_, r) => {
        if (!salesRoles.includes(r.Role)) return null;
        const prog = sellerProgress[r.id];
        const rate = pct(r.contactedLeads, r.totalLeads);
        return (
          <div>
            <Space size={6}>
              <Tooltip title={`${r.totalLeads} total leads assigned`}>
                <Tag color="blue" style={{ fontWeight: 700, fontSize: 13 }}>{fmtK(r.totalLeads || 0)}</Tag>
              </Tooltip>
              <Tooltip title={`${r.contactedLeads} contacted`}>
                <Tag color="green" style={{ fontWeight: 700, fontSize: 13 }}>{r.contactedLeads || 0}</Tag>
              </Tooltip>
              <Tooltip title={`${100 - rate}% never contacted`}>
                <Tag color={rate < 30 ? 'red' : 'orange'} style={{ fontSize: 11 }}>{100 - rate}% untouched</Tag>
              </Tooltip>
            </Space>
            {prog && (
              <Progress
                percent={prog.progressPercentage} size="small"
                strokeColor={prog.progressPercentage >= 70 ? C.green : prog.progressPercentage >= 40 ? C.gold : C.red}
                style={{ marginTop: 4 }}
              />
            )}
          </div>
        );
      }
    },
    {
      title: 'Status', key: 'status',
      render: (_, r) =>
        r.isBanned ? <Tag color="red">Banned</Tag>
        : r.forcePasswordReset ? <Tag color="orange">Reset Required</Tag>
        : <Tag color="green" icon={<CheckCircleOutlined />}>Active</Tag>
    },
    {
      title: 'Joined', dataIndex: 'CreationDate', key: 'created',
      render: d => d ? dayjs(d.toDate ? d.toDate() : d).format('YYYY-MM-DD') : '—',
      sorter: (a, b) => {
        const da = a.CreationDate?.toDate ? a.CreationDate.toDate() : new Date(a.CreationDate || 0);
        const db = b.CreationDate?.toDate ? b.CreationDate.toDate() : new Date(b.CreationDate || 0);
        return da - db;
      }
    }
  ];

  if (canManageUsers) columns.push({
    title: 'Actions', key: 'actions', width: 180,
    render: (_, r) => (
      <Space size={4} wrap>
        {salesRoles.includes(r.Role) && <>
          <Tooltip title="Full Analytics & History">
            <Button type="primary" icon={<EyeOutlined />} size="small" onClick={() => handleSellerClick(r)}>
              Analyze
            </Button>
          </Tooltip>
          <Tooltip title="Transfer Leads">
            <Button icon={<SwapOutlined />} size="small"
              style={{ color: C.orange, borderColor: C.orange }}
              onClick={() => { setTransferFromSeller(r); setTransferModalVisible(true); }} />
          </Tooltip>
        </>}
        <Tooltip title="Edit">
          <Button icon={<EditOutlined />} size="small"
            onClick={() => { setCurrentUser(r); setIsEditModalVisible(true); }} />
        </Tooltip>
        <Popconfirm title="Delete this user?" onConfirm={() => handleDeleteUser(r.id)} okText="Yes" cancelText="No">
          <Button danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      </Space>
    )
  });

  // ── Analytics Drawer rendering ────────────────────────────────────────────
  const renderAnalyticsDrawer = () => {
    const d = analyticsData;
    const scoreColor = d ? (d.overallScore >= 70 ? C.green : d.overallScore >= 45 ? C.gold : C.red) : C.slate;

    return (
      <div>
        {/* Date filters */}
        <Card size="small" style={{ marginBottom: 16, background: '#f8faff', borderColor: '#e0e7ff', borderRadius: 12 }}>
          <Row gutter={12} align="middle">
            <Col xs={24} sm={8}>
              <Text style={{ color: C.blue, fontSize: 11, fontWeight: 700 }}><CalendarOutlined /> Quick Month</Text>
              <DatePicker picker="month" value={selectedMonth} onChange={handleMonthChange}
                format="MMMM YYYY" style={{ width: '100%', marginTop: 4 }} size="small" />
            </Col>
            <Col xs={24} sm={16}>
              <Text style={{ color: C.purple, fontSize: 11, fontWeight: 700 }}><LineChartOutlined /> Custom Range</Text>
              <RangePicker
                value={dateRange?.length === 2 ? dateRange : null}
                onChange={handleDateRangeChange} format="YYYY-MM-DD"
                style={{ width: '100%', marginTop: 4 }} size="small" />
            </Col>
          </Row>
        </Card>

        {/* Tabs */}
        <Tabs
          activeKey={analyticsTab}
          onChange={setAnalyticsTab}
          type="card"
          size="small"
          style={{ marginBottom: 0 }}
        >
          {/* ── OVERVIEW TAB ── */}
          <TabPane tab={<span>📊 Overview</span>} key="overview">
            {analyticsLoading ? (
              <Skeleton active paragraph={{ rows: 10 }} />
            ) : !d ? (
              <Empty description="No data loaded" style={{ padding: 60 }} />
            ) : (
              <div>
                <InsightCard insights={insights} />

                {/* Score card */}
                <Card size="small" style={{ marginBottom: 16, background: `linear-gradient(135deg, ${scoreColor}08, #fff)`, borderColor: `${scoreColor}33`, borderRadius: 12 }}>
                  <Row align="middle" gutter={16}>
                    <Col xs={24} sm={7} style={{ textAlign: 'center' }}>
                      <Progress type="dashboard" percent={d.overallScore} width={100}
                        strokeColor={{ '0%': scoreColor, '100%': scoreColor + 'bb' }}
                        format={p => <span style={{ fontSize: 20, fontWeight: 800, color: scoreColor }}>{p}</span>} />
                      <div style={{ fontWeight: 700, fontSize: 12, marginTop: 4, color: '#333' }}>
                        Performance Score
                      </div>
                    </Col>
                    <Col xs={24} sm={17}>
                      <Row gutter={[8, 6]}>
                        {d.radialData.map(r => (
                          <Col span={12} key={r.name}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                              <Text style={{ fontSize: 11 }}>{r.name}</Text>
                              <Text strong style={{ fontSize: 11, color: r.fill }}>{r.value}%</Text>
                            </div>
                            <Progress percent={r.value} size="small" strokeColor={r.fill} showInfo={false} />
                          </Col>
                        ))}
                      </Row>
                    </Col>
                  </Row>
                </Card>

                {/* KPI Grid */}
                <Row gutter={[10, 10]} style={{ marginBottom: 16 }}>
                  {[
                    { icon: <PhoneOutlined />, label: 'Contacts', value: d.contacts.total, sub: `${d.contacts.successRate}% success`, color: C.cyan, pct: d.contacts.successRate },
                    { icon: <FunnelPlotOutlined />, label: 'Deals Won', value: d.deals.gain, sub: `${d.deals.winRate}% win rate`, color: C.green, pct: d.deals.winRate },
                    { icon: <FireOutlined />, label: 'Hot Leads', value: d.leads.hot, sub: `${d.leads.hotRate}% of leads`, color: C.red, pct: d.leads.hotRate },
                    { icon: <CalendarOutlined />, label: 'Meetings', value: d.meetings.completed, sub: `${d.meetings.completionRate}% done`, color: C.purple, pct: d.meetings.completionRate },
                    { icon: <DollarOutlined />, label: 'Revenue (AED)', value: fmt(d.deals.gainValue), sub: `Avg: AED ${fmt(d.deals.avgDeal)}`, color: C.gold },
                    { icon: <ThunderboltOutlined />, label: 'All Leads', value: fmtK(d.leads.total), sub: `${d.leads.contactRate || 0}% contacted`, color: C.blue },
                    { icon: <CheckCircleOutlined />, label: 'Invoices Paid', value: d.invoices.paid, sub: `AED ${fmt(d.invoices.paidValue)}`, color: C.lime, pct: d.invoices.payRate },
                    { icon: <ClockCircleOutlined />, label: 'Meetings Pending', value: d.meetings.pending, sub: `${d.meetings.cancelled} cancelled`, color: C.orange },
                  ].map((k, i) => (
                    <Col xs={12} sm={12} md={6} key={i}>
                      <KpiCard {...k}
                        extra={k.pct !== undefined ? <Progress percent={k.pct} size="small" strokeColor={k.color} showInfo={false} /> : null} />
                    </Col>
                  ))}
                </Row>

                {/* Sales Funnel */}
                <Card size="small" style={{ marginBottom: 16, borderRadius: 12 }}>
                  <SectionTitle icon="🔻" title="Sales Funnel" color={C.purple} />
                  <Row justify="center">
                    {d.funnelData.map((f, i) => {
                      const maxVal = d.funnelData[0]?.value || 1;
                      const w = Math.max(28, Math.round((f.value / maxVal) * 100));
                      const conv = i > 0 && d.funnelData[i - 1].value > 0
                        ? pct(f.value, d.funnelData[i - 1].value) : null;
                      return (
                        <div key={f.name} style={{ textAlign: 'center', width: '100%' }}>
                          {conv !== null && (
                            <div style={{ fontSize: 11, color: '#aaa', marginBottom: 2 }}>
                              ↓ <b style={{ color: conv > 50 ? C.green : conv > 20 ? C.gold : C.red }}>{conv}%</b> conversion
                            </div>
                          )}
                          <div style={{
                            margin: '0 auto 4px', height: 34, width: `${w}%`,
                            background: `linear-gradient(90deg, ${f.fill}cc, ${f.fill})`,
                            borderRadius: 8, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12,
                            transition: 'width .4s', minWidth: 90, boxShadow: `0 2px 8px ${f.fill}44`
                          }}>
                            {f.name} · {fmtK(f.value)}
                          </div>
                        </div>
                      );
                    })}
                  </Row>
                </Card>

                {/* Charts row */}
                <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                  <Col xs={24} md={12}>
                    <Card size="small" style={{ borderRadius: 12 }}>
                      <SectionTitle icon="📞" title="Contacts by Status" color={C.cyan} />
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={d.contactsBarData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <RTooltip content={<ChartTip />} />
                          <Bar dataKey="value" name="Count" radius={[6, 6, 0, 0]}>
                            {d.contactsBarData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  </Col>
                  <Col xs={24} md={12}>
                    <Card size="small" style={{ borderRadius: 12 }}>
                      <SectionTitle icon="🤝" title="Deals" color={C.green} />
                      {d.dealsPieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={180}>
                          <PieChart>
                            <Pie data={d.dealsPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                              dataKey="value" nameKey="name" paddingAngle={3}
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              labelLine={false}>
                              {d.dealsPieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                            </Pie>
                            <RTooltip content={<ChartTip />} />
                            <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : <Empty description="No deals" style={{ padding: 30 }} />}
                    </Card>
                  </Col>
                  <Col xs={24} md={12}>
                    <Card size="small" style={{ borderRadius: 12 }}>
                      <SectionTitle icon="🎯" title="Leads by Interest" color={C.orange} />
                      {d.leadsPieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={180}>
                          <PieChart>
                            <Pie data={d.leadsPieData} cx="50%" cy="50%" outerRadius={70}
                              dataKey="value" nameKey="name" paddingAngle={3}
                              label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                              labelLine={false}>
                              {d.leadsPieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                            </Pie>
                            <RTooltip content={<ChartTip />} />
                            <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : <Empty description="No leads data" style={{ padding: 30 }} />}
                    </Card>
                  </Col>
                  <Col xs={24} md={12}>
                    <Card size="small" style={{ borderRadius: 12 }}>
                      <SectionTitle icon="📅" title="Meetings by Status" color={C.purple} />
                      {d.meetingsPieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={180}>
                          <PieChart>
                            <Pie data={d.meetingsPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                              dataKey="value" nameKey="name" paddingAngle={3}
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              labelLine={false}>
                              {d.meetingsPieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                            </Pie>
                            <RTooltip content={<ChartTip />} />
                            <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : <Empty description="No meetings" style={{ padding: 30 }} />}
                    </Card>
                  </Col>
                </Row>
              </div>
            )}
          </TabPane>

          {/* ── LEADS 20K TAB ── */}
          <TabPane tab={<span>🎯 Leads Scale</span>} key="leads_scale">
            {analyticsLoading ? <Skeleton active paragraph={{ rows: 10 }} /> : !d ? (
              <Empty description="Load analytics first" style={{ padding: 60 }} />
            ) : (
              <LeadsScaleAnalytics
                leads={d.rawData.leads || []}
                history={allHistory}
              />
            )}
          </TabPane>

          {/* ── HISTORY TAB ── */}
          <TabPane
            tab={
              <span>
                📋 History
                {allHistory.length > 0 && (
                  <Badge count={allHistory.length > 999 ? `${fmtK(allHistory.length)}+` : allHistory.length}
                    style={{ marginLeft: 6, background: C.blue, fontSize: 10 }} />
                )}
              </span>
            }
            key="history"
          >
            <LeadHistoryTable
              history={allHistory}
              loading={historyLoading}
              onLoadMore={() => loadSellerHistory(selectedSeller?.id, true)}
              hasMore={historyHasMore}
              totalCount={historyTotalCount || allHistory.length}
            />
          </TabPane>

          {/* ── HISTORY ANALYTICS TAB ── */}
          <TabPane tab={<span>📈 Activity Analytics</span>} key="history_analytics">
            {historyLoading ? <Skeleton active paragraph={{ rows: 8 }} /> : (
              <HistoryAnalyticsPanel
                history={allHistory}
                analyticsData={analyticsData}
              />
            )}
          </TabPane>

          {/* ── RAW DATA TAB ── */}
          <TabPane tab={<span>🗂️ Raw Data</span>} key="raw">
            {!d ? <Empty description="Load analytics first" style={{ padding: 60 }} /> : (
              <Tabs type="line" size="small">
                <TabPane tab={`Contacts (${d.contacts.total})`} key="c">
                  <Table size="small" scroll={{ y: 300 }}
                    dataSource={d.rawData.contacts.slice(0, 200)}
                    pagination={{ pageSize: 50, showSizeChanger: false }}
                    rowKey={(r, i) => r.id || i}
                    columns={[
                      { title: 'Name', dataIndex: 'name', render: v => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                      { title: 'Email', dataIndex: 'email', render: v => <Text style={{ fontSize: 11 }}>{v}</Text> },
                      { title: 'Phone', dataIndex: 'phoneNumber', render: v => <Text style={{ fontSize: 11 }}>{v}</Text> },
                      { title: 'Status', dataIndex: 'status', render: s => <Tag color={s === 'Deal' ? 'green' : s === 'Loss' ? 'red' : s === 'Contacted' ? 'cyan' : 'gold'} style={{ fontSize: 10 }}>{s}</Tag> }
                    ]}
                  />
                </TabPane>
                <TabPane tab={`Deals (${d.deals.total})`} key="d">
                  <Table size="small" scroll={{ y: 300 }}
                    dataSource={d.rawData.deals.slice(0, 200)}
                    pagination={{ pageSize: 50, showSizeChanger: false }}
                    rowKey={(r, i) => r.id || i}
                    columns={[
                      { title: 'Description', dataIndex: 'Description', render: v => <Text ellipsis style={{ fontSize: 12, maxWidth: 200 }}>{v}</Text> },
                      { title: 'Amount', dataIndex: 'Amount', render: v => <Text strong style={{ fontSize: 12 }}>AED {fmt(v)}</Text> },
                      { title: 'Status', dataIndex: 'Status', render: s => <Tag color={s === DealStatus.GAIN ? 'green' : s === DealStatus.LOSS ? 'red' : 'orange'} style={{ fontSize: 10 }}>{s}</Tag> },
                      { title: 'Date', dataIndex: 'CreationDate', render: d => <Text style={{ fontSize: 11 }}>{dayjs(d).format('DD MMM YY')}</Text> }
                    ]}
                  />
                </TabPane>
                <TabPane tab={`Leads (${d.leads.total})`} key="l">
                  <Table size="small" scroll={{ y: 300 }}
                    dataSource={d.rawData.leads.slice(0, 500)}
                    pagination={{ pageSize: 50, showSizeChanger: true, pageSizeOptions: ['50', '100', '200'], showTotal: t => `${t.toLocaleString()} / ${d.rawData.leads.length.toLocaleString()}` }}
                    rowKey={(r, i) => r.id || i}
                    columns={[
                      { title: 'Name', dataIndex: 'name', render: v => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                      { title: 'Budget', dataIndex: 'Budget', render: v => <Text style={{ fontSize: 11 }}>AED {fmt(v)}</Text>, sorter: (a, b) => (a.Budget || 0) - (b.Budget || 0) },
                      { title: 'Interest', dataIndex: 'InterestLevel', render: v => { const c = ['HIGH','HOT'].includes((v||'').toUpperCase()) ? 'red' : ['MEDIUM','WARM'].includes((v||'').toUpperCase()) ? 'orange' : 'blue'; return <Tag color={c} style={{ fontSize: 10 }}>{v || '—'}</Tag>; } },
                      { title: 'Region', dataIndex: 'region', render: v => <Text style={{ fontSize: 11 }}>{v || '—'}</Text> },
                      { title: 'Contacted', dataIndex: 'contacted', render: v => v ? <CheckCircleOutlined style={{ color: C.green }} /> : <CloseCircleOutlined style={{ color: C.red }} /> }
                    ]}
                  />
                </TabPane>
              </Tabs>
            )}
          </TabPane>
        </Tabs>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 16 }}>
      <Card style={{ borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Title level={3} style={{ margin: 0 }}>
            <TeamOutlined style={{ marginRight: 10, color: C.blue }} />Team Management
          </Title>
          {canManageUsers && (
            <Space>
              <Button icon={<ReloadOutlined />} onClick={fetchUsers} loading={loading} size="small">
                Refresh
              </Button>
              <Button type="primary" icon={<UserAddOutlined />} onClick={() => setIsAddModalVisible(true)}>
                Add Member
              </Button>
            </Space>
          )}
        </div>

        {/* Summary stats strip */}
        <Row gutter={[10, 10]} style={{ marginBottom: 16 }}>
          {[
            { label: 'Total Members', value: users.length, color: C.blue },
            { label: 'Sellers', value: users.filter(u => salesRoles.includes(u.Role)).length, color: C.green },
            { label: 'Total Leads Assigned', value: fmtK(users.reduce((s, u) => s + (u.totalLeads || 0), 0)), color: C.orange },
            { label: 'Leads Contacted', value: fmtK(users.reduce((s, u) => s + (u.contactedLeads || 0), 0)), color: C.cyan },
          ].map((s, i) => (
            <Col xs={12} sm={6} key={i}>
              <div style={{ padding: '10px 14px', background: `${s.color}10`, borderRadius: 10, border: `1px solid ${s.color}22`, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                <Text type="secondary" style={{ fontSize: 11 }}>{s.label}</Text>
              </div>
            </Col>
          ))}
        </Row>

        <Row gutter={12} style={{ marginBottom: 14 }}>
          <Col xs={24} sm={14}>
            <Input placeholder="Search name or email…" prefix={<SearchOutlined />}
              value={searchText} onChange={e => setSearchText(e.target.value)}
              allowClear style={{ width: '100%', borderRadius: 8 }} />
          </Col>
          <Col xs={24} sm={10}>
            <Select placeholder="Filter by role" style={{ width: '100%', borderRadius: 8 }}
              value={roleFilter} onChange={setRoleFilter} allowClear>
              <Option value={UserRoles.HR}>HR</Option>
              <Option value={UserRoles.SELLER}>Sales Representative</Option>
              <Option value={UserRoles.SALES_EXECUTIVE}>Sales Executive</Option>
              <Option value={UserRoles.AGENT}>Agent</Option>
              <Option value={UserRoles.TEAM_LEADER}>Team Leader</Option>
              <Option value={UserRoles.SALES_MANAGER}>Sales Manager</Option>
              <Option value={UserRoles.OFF_PLAN_SALES}>Off-plan Sales</Option>
              <Option value={UserRoles.READY_TO_MOVE_SALES}>Ready to Move Sales</Option>
            </Select>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey="id"
          loading={loading}
          pagination={{ defaultPageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'] }}
          scroll={{ x: 900 }}
          size="middle"
          rowClassName={(_, i) => i % 2 !== 0 ? 'ant-table-row-striped' : ''}
        />
      </Card>

      {/* Add / Edit Modals */}
      <Modal title="Add Team Member" open={isAddModalVisible}
        onCancel={() => setIsAddModalVisible(false)} footer={null} destroyOnClose>
        <AddUserForm onFinish={handleAddUser} onCancel={() => setIsAddModalVisible(false)} />
      </Modal>
      <Modal title="Edit Team Member" open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)} footer={null} destroyOnClose>
        {currentUser && (
          <EditUserForm initialValues={currentUser}
            onFinish={handleUpdateUser} onCancel={() => setIsEditModalVisible(false)} />
        )}
      </Modal>

      {/* Analytics Drawer */}
      <Drawer
        title={
          <div style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4f46e5 100%)',
            margin: '-16px -24px 0', padding: '18px 24px', color: '#fff',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Avatar size={52} style={{ background: 'rgba(255,255,255,0.15)', fontSize: 22, border: '2px solid rgba(255,255,255,0.3)' }}>
                  {selectedSeller ? selectedSeller.firstname[0].toUpperCase() : <TrophyOutlined />}
                </Avatar>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}>
                    {selectedSeller ? `${selectedSeller.firstname} ${selectedSeller.lastname}` : 'Analytics'}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    {selectedSeller?.Role} · Performance Dashboard
                  </div>
                  {analyticsData && (
                    <Space size={6} style={{ marginTop: 4 }}>
                      <Progress
                        percent={analyticsData.overallScore} size="small" style={{ width: 120 }}
                        strokeColor="rgba(255,255,255,0.9)" trailColor="rgba(255,255,255,0.15)"
                        format={p => <span style={{ color: '#fff', fontSize: 11 }}>{p} score</span>}
                      />
                      {analyticsData.overallScore >= 70 && <CrownOutlined style={{ color: '#fde68a' }} />}
                    </Space>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'right', opacity: 0.8 }}>
                <div style={{ fontSize: 11 }}>
                  <ThunderboltOutlined /> {selectedSeller?.totalLeads ? fmtK(selectedSeller.totalLeads) : '—'} leads
                </div>
                <div style={{ fontSize: 11, marginTop: 2 }}>
                  <HistoryOutlined /> {fmtK(allHistory.length)} history entries
                </div>
              </div>
            </div>
          </div>
        }
        width={960}
        open={analyticsVisible}
        onClose={() => {
          setAnalyticsVisible(false);
          setSelectedSeller(null);
          setAnalyticsData(null);
          setAllHistory([]);
        }}
        destroyOnClose
        bodyStyle={{ paddingTop: 16, background: '#fafbff' }}
      >
        {renderAnalyticsDrawer()}
      </Drawer>

      {/* Transfer modal */}
      <BulkLeadTransferModal
        visible={transferModalVisible}
        onCancel={() => { setTransferModalVisible(false); setTransferFromSeller(null); }}
        fromSeller={transferFromSeller}
        sellers={users}
        companyId={companyId}
        onSuccess={() => { message.success('Leads transferred. Refreshing…'); fetchUsers(); }}
      />
    </div>
  );
};

export default SellersPage;