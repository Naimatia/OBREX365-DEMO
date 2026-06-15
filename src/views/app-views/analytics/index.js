// pages/LeadsPerformanceAnalytics.js — Upgraded: charts, UI, date filter, bug fixes
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Table, Tag, Space, Button, Input, Modal,
  message, Typography, Row, Col, Avatar, Badge,
  Timeline, Empty, Progress, Drawer, Divider, Select,
  Skeleton, Grid, DatePicker, Tooltip,
} from 'antd';
import {
  UserOutlined, EyeOutlined, ClockCircleOutlined,
  CloseCircleOutlined, WarningOutlined, TrophyOutlined,
  ReloadOutlined, SearchOutlined, TeamOutlined, HistoryOutlined,
  MailOutlined, PhoneOutlined, FilterOutlined, UnlockOutlined,
  PlusOutlined, FileTextOutlined, TagOutlined,
  RiseOutlined, FallOutlined, DashboardOutlined,
  AppstoreOutlined, BellOutlined, PieChartOutlined,
  HeatMapOutlined, DownloadOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import isBetween from 'dayjs/plugin/isBetween';
import * as XLSX from 'xlsx';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer,
} from 'recharts';

import UserService from 'services/firebase/UserService';
import LeadsService from 'services/LeadsService';
import LeadHistoryService from 'services/firebase/LeadHistoryService';
import { UserRoles } from 'models/UserModel';
import { LeadStatus } from 'models/LeadModel';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from 'configs/FirebaseConfig';

dayjs.extend(relativeTime);
dayjs.extend(isBetween);

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const { RangePicker } = DatePicker;

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  blue:    '#1d6fa8',
  green:   '#16a34a',
  red:     '#dc2626',
  yellow:  '#ca8a04',
  purple:  '#7c3aed',
  gray:    '#6b7280',
  orange:  '#ea580c',
  excellent: '#16a34a',
  good:      '#ca8a04',
  average:   '#ea580c',
  poor:      '#dc2626',
};

const STATUS_CONFIG = {
  [LeadStatus.PENDING]:       { color: C.blue,   text: 'Pending',       icon: <ClockCircleOutlined /> },
  [LeadStatus.GAIN]:          { color: C.green,  text: 'Won',           icon: <TrophyOutlined /> },
  [LeadStatus.LOSS]:          { color: C.red,    text: 'Lost',          icon: <CloseCircleOutlined /> },
  [LeadStatus.NO_RESPONSE]:   { color: C.gray,   text: 'No Response',   icon: <BellOutlined /> },
  [LeadStatus.NOT_INTERESTED]:{ color: C.yellow, text: 'Not Interested',icon: <CloseCircleOutlined /> },
  [LeadStatus.JUNK_LEAD]:     { color: C.purple, text: 'Junk',          icon: <WarningOutlined /> },
};

const STATUS_LIST = [
  { value: 'all',                      label: 'All',          color: C.blue,   icon: <AppstoreOutlined /> },
  { value: LeadStatus.PENDING,         label: 'Pending',      color: C.blue,   icon: <ClockCircleOutlined /> },
  { value: LeadStatus.GAIN,            label: 'Won',          color: C.green,  icon: <TrophyOutlined /> },
  { value: LeadStatus.LOSS,            label: 'Lost',         color: C.red,    icon: <CloseCircleOutlined /> },
  { value: LeadStatus.NO_RESPONSE,     label: 'No Response',  color: C.gray,   icon: <BellOutlined /> },
  { value: LeadStatus.NOT_INTERESTED,  label: 'Not Interested',color:C.yellow, icon: <CloseCircleOutlined /> },
  { value: LeadStatus.JUNK_LEAD,       label: 'Junk',         color: C.purple, icon: <WarningOutlined /> },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatTime = (seconds) => {
  if (!seconds || seconds <= 0) return '—';
  if (seconds < 60)    return `${Math.round(seconds)}s`;
  if (seconds < 3600)  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${(seconds / 86400).toFixed(1)}d`;
};

const perfColor = (rate) =>
  rate >= 70 ? C.excellent : rate >= 50 ? C.good : rate >= 30 ? C.average : C.poor;

const perfBg = (rate) =>
  rate >= 70 ? '#f0fdf4' : rate >= 50 ? '#fefce8' : rate >= 30 ? '#fff7ed' : '#fef2f2';

// ─── Inline styles ────────────────────────────────────────────────────────────
const CSS = `
  .spa-root { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

  /* KPI cards */
  .kpi-card {
    border-radius: 14px !important;
    overflow: hidden;
    cursor: pointer;
    transition: transform .18s, box-shadow .18s;
    border: none !important;
  }
  .kpi-card:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(0,0,0,.12) !important; }
  .kpi-card::after {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 3px;
  }
  .kpi-blue::after   { background: linear-gradient(90deg,#1d6fa8,#2563eb); }
  .kpi-green::after  { background: linear-gradient(90deg,#16a34a,#15803d); }
  .kpi-yellow::after { background: linear-gradient(90deg,#ca8a04,#d97706); }
  .kpi-purple::after { background: linear-gradient(90deg,#7c3aed,#6d28d9); }
  .kpi-red::after    { background: linear-gradient(90deg,#dc2626,#b91c1c); }
  .kpi-orange::after { background: linear-gradient(90deg,#ea580c,#c2410c); }

  /* Status pills */
  .status-pill {
    background: #f8f9fb;
    border: 1.5px solid #e8eaed;
    border-radius: 12px;
    padding: 10px 8px;
    text-align: center;
    cursor: pointer;
    transition: all .16s;
    min-width: 76px;
  }
  .status-pill:hover  { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.09); }
  .status-pill.active { background: #fff; box-shadow: 0 2px 10px rgba(0,0,0,.1); }

  /* Seller cards (mobile) */
  .seller-card {
    background: #fff;
    border: 1.5px solid #f0f0f0;
    border-radius: 14px;
    padding: 14px;
    margin-bottom: 10px;
    cursor: pointer;
    transition: all .15s;
  }
  .seller-card:hover  { border-color: #1d6fa8; box-shadow: 0 6px 18px rgba(29,111,168,.12); }
  .seller-card.active { border-color: #1d6fa8; background: #eff6ff; }

  /* Lead card */
  .lead-card {
    background: #fff;
    border: 1px solid #f0f0f0;
    border-radius: 12px;
    padding: 12px 14px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: box-shadow .15s;
  }
  .lead-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.09); border-color: #1d6fa8; }

  /* Chart card */
  .chart-card {
    border-radius: 16px !important;
    border: 1px solid #f0f0f0 !important;
    box-shadow: 0 2px 8px rgba(0,0,0,.05) !important;
  }

  /* Tag pill */
  .tag-pill {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 11px; font-weight: 600;
    padding: 3px 10px; border-radius: 20px;
  }

  /* Header gradient */
  .spa-header {
    background: linear-gradient(135deg,#0c1f44 0%,#164070 60%,#1a5296 100%);
    border-radius: 18px;
    padding: 22px 28px;
    margin-bottom: 20px;
    color: #fff;
    position: relative;
    overflow: hidden;
  }
  .spa-header::before {
    content:''; position:absolute; top:-70px; right:-70px;
    width:220px; height:220px; border-radius:50%;
    background: rgba(29,111,168,.18);
  }
  .spa-header::after {
    content:''; position:absolute; bottom:-80px; left:-60px;
    width:260px; height:260px; border-radius:50%;
    background: rgba(124,58,237,.14);
  }

  /* Date range filter bar */
  .filter-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    background: #fff;
    border: 1px solid #f0f0f0;
    border-radius: 14px;
    padding: 12px 18px;
    margin-bottom: 20px;
    box-shadow: 0 2px 8px rgba(0,0,0,.04);
  }
  .period-btn {
    padding: 5px 16px;
    border-radius: 20px;
    border: 1.5px solid #e5e7eb;
    background: transparent;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    color: #6b7280;
    transition: all .15s;
  }
  .period-btn.active {
    background: #1d6fa8;
    border-color: #1d6fa8;
    color: #fff;
  }

  /* My performance card */
  .my-perf-card {
    background: linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);
    border-radius: 18px !important;
    border: none !important;
    margin-bottom: 20px;
  }
  .my-perf-stat { text-align:center; cursor:pointer; padding: 8px; border-radius: 10px; transition: background .15s; }
  .my-perf-stat:hover { background: rgba(255,255,255,.12); }
`;

// ─── Sub-components ───────────────────────────────────────────────────────────

const KpiCard = ({ title, value, icon, colorKey, loading, onClick, trend, trendVal }) => {
  const iconBg  = { blue:'#eff6ff', green:'#f0fdf4', yellow:'#fefce8', purple:'#faf5ff', red:'#fef2f2', orange:'#fff7ed' };
  const iconClr = { blue:C.blue,   green:C.green,   yellow:C.yellow,  purple:C.purple,  red:C.red,   orange:C.orange };
  return (
    <Card
      className={`kpi-card kpi-${colorKey}`}
      bodyStyle={{ padding: '18px 20px', position: 'relative' }}
      onClick={onClick}
      style={{ background: '#fff', position: 'relative' }}
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div style={{ flex:1, minWidth:0 }}>
          <Text style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.6px', color:'#9ca3af' }}>
            {title}
          </Text>
          <div style={{ fontSize:30, fontWeight:700, marginTop:6, fontFamily:'monospace', color:'#111827' }}>
            {loading ? <Skeleton.Input active size="small" style={{ width:60 }} /> : value}
          </div>
          {trend && (
            <div style={{ marginTop:6 }}>
              <Tag
                color={trend === 'up' ? 'success' : 'error'}
                style={{ borderRadius:10, fontSize:10 }}
              >
                {trend === 'up' ? <RiseOutlined /> : <FallOutlined />} {trendVal}
              </Tag>
            </div>
          )}
        </div>
        <div style={{
          width:44, height:44, borderRadius:12, flexShrink:0,
          background: iconBg[colorKey] || '#f3f4f6',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:20, color: iconClr[colorKey] || C.gray,
        }}>
          {icon}
        </div>
      </div>
    </Card>
  );
};

const StatusPill = ({ status, config, count, isActive, onClick }) => (
  <div
    className={`status-pill ${isActive ? 'active' : ''}`}
    style={{ borderColor: isActive ? config?.color : '#e8eaed' }}
    onClick={() => onClick(status)}
  >
    <div style={{ color: config?.color || C.blue, fontSize: 18 }}>{config?.icon || <AppstoreOutlined />}</div>
    <div style={{ color: config?.color || C.blue, fontSize: 20, fontWeight: 700, margin: '2px 0' }}>{count}</div>
    <div style={{ color: config?.color || C.blue, fontSize: 10, fontWeight: 600, lineHeight: 1.2 }}>
      {config?.text || (status === 'all' ? 'All' : status)}
    </div>
  </div>
);

// Monthly pipeline bar chart
const PipelineChart = ({ leads, dateRange }) => {
  const data = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const m = dayjs().subtract(i, 'month');
      const label = m.format('MMM');
      const monthLeads = leads.filter(l => {
        const d = l.CreationDate?.toDate?.() || l.CreationDate;
        return d && dayjs(d).format('YYYY-MM') === m.format('YYYY-MM');
      });
      months.push({
        month: label,
        Assigned: monthLeads.filter(l => l.seller_id && l.seller_id !== 'unassigned').length,
        Won:      monthLeads.filter(l => l.status === LeadStatus.GAIN).length,
        Lost:     monthLeads.filter(l => l.status === LeadStatus.LOSS).length,
      });
    }
    return months;
  }, [leads]);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} barCategoryGap="30%" barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <RechartsTooltip
          contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,.12)', fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        <Bar dataKey="Assigned" fill="#bfdbfe" radius={[4,4,0,0]} />
        <Bar dataKey="Won"      fill="#bbf7d0" radius={[4,4,0,0]} />
        <Bar dataKey="Lost"     fill="#fecaca" radius={[4,4,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

// View rate horizontal bar chart
const ViewRateChart = ({ sellers }) => {
  const data = [...sellers]
    .sort((a, b) => b.viewRate - a.viewRate)
    .slice(0, 8)
    .map(s => ({
      name: s.name.split(' ')[0],
      rate: s.viewRate,
      fill: perfColor(s.viewRate),
    }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * 36 + 40, 200)}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis type="number" domain={[0,100]} tick={{ fontSize:11, fill:'#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
        <YAxis type="category" dataKey="name" tick={{ fontSize:11, fill:'#374151' }} axisLine={false} tickLine={false} width={64} />
        <RechartsTooltip
          formatter={v => [`${v}%`, 'View rate']}
          contentStyle={{ borderRadius:10, border:'none', boxShadow:'0 4px 16px rgba(0,0,0,.12)', fontSize:12 }}
        />
        <Bar dataKey="rate" radius={[0,4,4,0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

// Avg response time chart
const ResponseChart = ({ sellers }) => {
  const data = [...sellers]
    .filter(s => s.avgResponse > 0)
    .sort((a, b) => a.avgResponse - b.avgResponse)
    .slice(0, 8)
    .map(s => ({
      name: s.name.split(' ')[0],
      hours: parseFloat((s.avgResponse / 3600).toFixed(1)),
    }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barCategoryGap="40%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize:11, fill:'#9ca3af' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize:11, fill:'#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v=>`${v}h`} />
        <RechartsTooltip
          formatter={v => [`${v}h`, 'Avg response']}
          contentStyle={{ borderRadius:10, border:'none', boxShadow:'0 4px 16px rgba(0,0,0,.12)', fontSize:12 }}
        />
        <Bar dataKey="hours" fill="#bfdbfe" radius={[4,4,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

// Conversion trend line chart
const TrendChart = ({ leads }) => {
  const data = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const m = dayjs().subtract(i, 'month');
      const monthLeads = leads.filter(l => {
        const d = l.CreationDate?.toDate?.() || l.CreationDate;
        return d && dayjs(d).format('YYYY-MM') === m.format('YYYY-MM');
      });
      const total = monthLeads.length;
      const won   = monthLeads.filter(l => l.status === LeadStatus.GAIN).length;
      months.push({
        month: m.format('MMM'),
        rate: total > 0 ? Math.round((won / total) * 100) : 0,
      });
    }
    return months;
  }, [leads]);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize:11, fill:'#9ca3af' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize:11, fill:'#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`} domain={[0,100]} />
        <RechartsTooltip
          formatter={v => [`${v}%`, 'Conversion']}
          contentStyle={{ borderRadius:10, border:'none', boxShadow:'0 4px 16px rgba(0,0,0,.12)', fontSize:12 }}
        />
        <Line
          type="monotone" dataKey="rate" stroke={C.green}
          strokeWidth={2.5} dot={{ fill:C.green, r:4 }} activeDot={{ r:6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

// Status donut
const StatusDonut = ({ counts }) => {
  const data = STATUS_LIST
    .filter(s => s.value !== 'all' && (counts[s.value] || 0) > 0)
    .map(s => ({ name: s.label, value: counts[s.value] || 0, color: s.color }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data} cx="50%" cy="50%"
          innerRadius={55} outerRadius={85}
          paddingAngle={2} dataKey="value"
          label={({ percent }) => percent > 0.05 ? `${(percent*100).toFixed(0)}%` : ''}
          labelLine={false}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} stroke="#fff" strokeWidth={2} />
          ))}
        </Pie>
        <RechartsTooltip
          contentStyle={{ borderRadius:10, border:'none', boxShadow:'0 4px 16px rgba(0,0,0,.12)', fontSize:12 }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
};

// Performance distribution donut (by seller view rate tier)
const PerfDonut = ({ sellers }) => {
  const tiers = [
    { name:'Excellent ≥70%', value: sellers.filter(s=>s.viewRate>=70).length,  color:C.excellent },
    { name:'Good 50–69%',    value: sellers.filter(s=>s.viewRate>=50&&s.viewRate<70).length, color:C.good },
    { name:'Average 30–49%', value: sellers.filter(s=>s.viewRate>=30&&s.viewRate<50).length, color:C.average },
    { name:'Poor <30%',      value: sellers.filter(s=>s.viewRate<30).length,   color:C.poor },
  ].filter(t => t.value > 0);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={tiers} cx="50%" cy="50%"
          innerRadius={50} outerRadius={80}
          paddingAngle={2} dataKey="value"
          label={({ percent }) => percent > 0.05 ? `${(percent*100).toFixed(0)}%` : ''}
          labelLine={false}
        >
          {tiers.map((t, i) => <Cell key={i} fill={t.color} stroke="#fff" strokeWidth={2} />)}
        </Pie>
        <RechartsTooltip contentStyle={{ borderRadius:10, border:'none', boxShadow:'0 4px 16px rgba(0,0,0,.12)', fontSize:12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const LeadsPerformanceAnalytics = () => {
  const [sellers, setSellers]                   = useState([]);
  const [allLeads, setAllLeads]                 = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [searchText, setSearchText]             = useState('');
  const [selectedSeller, setSelectedSeller]     = useState(null);
  const [drawerVisible, setDrawerVisible]       = useState(false);
  const [sellerLeads, setSellerLeads]           = useState([]);
  const [sellerOwnLeads, setSellerOwnLeads]     = useState([]);
  const [selectedLead, setSelectedLead]         = useState(null);
  const [leadHistory, setLeadHistory]           = useState([]);
  const [historyVisible, setHistoryVisible]     = useState(false);
  const [leadTypeFilter, setLeadTypeFilter]     = useState('assigned');
  const [statusFilter, setStatusFilter]         = useState('all');
  const [currentUserLeads, setCurrentUserLeads] = useState([]);
  const [currentUserStats, setCurrentUserStats] = useState(null);

  // Modal
  const [modalLeads, setModalLeads]   = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle]   = useState('');

  // Date range filter
  const [period, setPeriod]           = useState('month');   // 'month'|'quarter'|'year'|'custom'
  const [customRange, setCustomRange] = useState(null);      // [dayjs, dayjs] | null

  const user      = useSelector(state => state.auth.user);
  const companyId = user?.company_id;
  const screens   = useBreakpoint();
  const isMobile  = !screens.md;

  // ── Date range bounds ──────────────────────────────────────────────────────
  const dateRange = useMemo(() => {
    if (period === 'custom' && customRange) return customRange;
    const end   = dayjs();
    const start = period === 'month'   ? dayjs().startOf('month')
                : period === 'quarter' ? dayjs().startOf('quarter')
                :                        dayjs().startOf('year');
    return [start, end];
  }, [period, customRange]);

  // Filter leads by date range
  const filteredLeads = useMemo(() => {
    const [start, end] = dateRange;
    return allLeads.filter(l => {
      const d = l.CreationDate?.toDate?.() || l.CreationDate;
      if (!d) return true;
      return dayjs(d).isBetween(start, end, null, '[]');
    });
  }, [allLeads, dateRange]);

  // Filter sellers by date range (re-compute stats on filtered leads)
  const filteredSellers = useMemo(() => {
    if (!allLeads.length) return sellers;
    const [start, end] = dateRange;
    return sellers.map(s => {
      const sLeads = filteredLeads.filter(l =>
        l.seller_id === s.id || l.createdBy === s.id
      );
      const assigned = sLeads.filter(l => l.seller_id === s.id && l.createdBy !== s.id);
      const gain  = assigned.filter(l => l.status === LeadStatus.GAIN).length;
      const loss  = assigned.filter(l => l.status === LeadStatus.LOSS).length;
      return {
        ...s,
        // keep original stats but re-derive counts from filtered leads
        _filteredAssigned: assigned.length,
        _filteredGain: gain,
        _filteredLoss: loss,
        _conversionRate: assigned.length > 0 ? Math.round((gain / assigned.length) * 100) : 0,
      };
    }).filter(s => s.name.toLowerCase().includes(searchText.toLowerCase()));
  }, [sellers, filteredLeads, searchText, dateRange]);

  // ── Global counts ──────────────────────────────────────────────────────────
  const globalStatusCounts = useMemo(() =>
    sellers.reduce((acc, s) => {
      Object.entries(s.statusCount || {}).forEach(([k, v]) => {
        acc[k] = (acc[k] || 0) + v;
      });
      return acc;
    }, {}),
  [sellers]);

  const totalAssigned = sellers.reduce((s, r) => s + r.totalAssigned, 0);
  const totalViewed   = sellers.reduce((s, r) => s + r.viewedCount,   0);
  const overallViewRate = totalAssigned > 0
    ? ((totalViewed / totalAssigned) * 100).toFixed(1)
    : '0.0';
  const totalGain = sellers.reduce((s, r) => s + (r.gainCount || 0), 0);
  const totalLoss = sellers.reduce((s, r) => s + (r.lossCount || 0), 0);

  const assignedCount   = filteredLeads.filter(l => l.seller_id && l.seller_id !== '' && l.seller_id !== 'unassigned').length;
  const ownCount        = filteredLeads.filter(l => l.createdBy && l.createdBy !== '').length;
  const unassignedCount = filteredLeads.filter(l =>
    (!l.seller_id || l.seller_id === '' || l.seller_id === 'unassigned') &&
    (!l.createdBy || l.createdBy === '')
  ).length;

  // ── Lead reveal event ──────────────────────────────────────────────────────
  const getLeadRevealEvent = async (leadId, sellerId) => {
    try {
      const history = await LeadHistoryService.getLeadHistory(leadId);
      const found = history.find(h =>
        (h.type === 'view' || h.type === 'reveal' || h.eventType === 'LEAD_VIEWED') &&
        (h.sellerId === sellerId || h.userId === sellerId || h.createdBy?.id === sellerId)
      );
      if (found) return found;
      const q = query(
        collection(db, 'leadHistory'),
        where('leadId', '==', leadId),
        where('userId', '==', sellerId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0].data();
        return { createdAt: d.timestamp || d.createdAt };
      }
      const leadDoc = await LeadsService.getLeadById(leadId);
      if (leadDoc?.revealedAt && leadDoc.revealedBy === sellerId) {
        return { createdAt: leadDoc.revealedAt };
      }
      return null;
    } catch { return null; }
  };

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAllLeads = useCallback(async () => {
    if (!companyId) return;
    try {
      const data = await LeadsService.getCompanyLeads(companyId);
      setAllLeads(data);
    } catch (e) { console.error(e); }
  }, [companyId]);

  const fetchCurrentUserLeads = useCallback(async () => {
    if (!companyId || !user?.uid) return;
    try {
      const userLeads    = await LeadsService.getSellerLeads(companyId, user.uid);
      const assignedLeads = userLeads.filter(l => l.seller_id === user.uid && l.createdBy !== user.uid);
      const ownLeads      = userLeads.filter(l => l.createdBy === user.uid);

      let totalResponseSeconds = 0, responseCount = 0;
      const assignedWithInfo = await Promise.all(assignedLeads.map(async (lead) => {
        const rev = await getLeadRevealEvent(lead.id, user.uid);
        let responseTime = null;
        const assignedAt = lead.assignedAt?.toDate?.() || lead.assignedAt || null;
        if (rev && assignedAt) {
          const viewedAt = rev.createdAt?.toDate?.() || rev.createdAt || new Date();
          responseTime = (new Date(viewedAt) - new Date(assignedAt)) / 1000;
        }
        if (responseTime > 0) { totalResponseSeconds += responseTime; responseCount++; }
        return { ...lead, responseTime: responseTime > 0 ? responseTime : null, isViewed: !!rev, assignedAt };
      }));

      const all = [...assignedWithInfo, ...ownLeads];
      setCurrentUserLeads(all);
      const viewedCount = assignedWithInfo.filter(l => l.isViewed).length;
      setCurrentUserStats({
        totalAssigned: assignedLeads.length,
        totalOwn:      ownLeads.length,
        viewedCount,
        viewRate: assignedLeads.length > 0 ? (viewedCount / assignedLeads.length) * 100 : 0,
        avgResponse: responseCount > 0 ? totalResponseSeconds / responseCount : 0,
        gainCount: all.filter(l => l.status === LeadStatus.GAIN).length,
        lossCount: all.filter(l => l.status === LeadStatus.LOSS).length,
      });
    } catch (e) { console.error(e); }
  }, [companyId, user?.uid]);

  const fetchSellers = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const allUsers  = await UserService.getUsersByCompanyId(companyId);
      const salesTeam = allUsers.filter(u =>
        [UserRoles.SELLER, UserRoles.SALES_EXECUTIVE, UserRoles.AGENT].includes(u.Role)
      );

      const withStats = await Promise.all(salesTeam.map(async (seller) => {
        const leads       = await LeadsService.getSellerLeads(companyId, seller.id);
        const ownLeads    = leads.filter(l => l.createdBy === seller.id);
        const assigned    = leads.filter(l => l.seller_id === seller.id && l.createdBy !== seller.id);
        let viewedCount = 0, totalResp = 0, respCount = 0;
        const statusCount = Object.fromEntries(Object.keys(STATUS_CONFIG).map(k => [k, 0]));
        let gainCount = 0, lossCount = 0;

        for (const lead of assigned) {
          if (lead.status) {
            statusCount[lead.status] = (statusCount[lead.status] || 0) + 1;
            if (lead.status === LeadStatus.GAIN) gainCount++;
            if (lead.status === LeadStatus.LOSS) lossCount++;
          }
          const rev = await getLeadRevealEvent(lead.id, seller.id);
          if (rev) {
            viewedCount++;
            const assignedAt = lead.assignedAt?.toDate?.() || lead.assignedAt ||
              lead.CreationDate?.toDate?.() || lead.CreationDate || null;
            const viewedAt = rev.createdAt?.toDate?.() || rev.createdAt || new Date();
            if (assignedAt) {
              const secs = (new Date(viewedAt) - new Date(assignedAt)) / 1000;
              if (secs > 0 && secs < 2592000) { totalResp += secs; respCount++; }
            }
          }
        }

        return {
          id:            seller.id,
          name:          `${seller.firstname || ''} ${seller.lastname || ''}`.trim() || seller.email,
          role:          seller.Role,
          totalAssigned: assigned.length,
          ownLeads:      ownLeads.length,
          viewedCount,
          viewRate:      assigned.length > 0 ? Math.round((viewedCount / assigned.length) * 100) : 0,
          avgResponse:   respCount > 0 ? Math.round(totalResp / respCount) : 0,
          statusCount,
          gainCount,
          lossCount,
          conversionRate: assigned.length > 0 ? Math.round((gainCount / assigned.length) * 100) : 0,
        };
      }));

      setSellers(withStats.sort((a, b) => b.totalAssigned - a.totalAssigned));
    } catch (e) {
      console.error(e);
      message.error('Failed to load sellers');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchSellers();
    fetchAllLeads();
    fetchCurrentUserLeads();
  }, [fetchSellers, fetchAllLeads, fetchCurrentUserLeads]);

  // ── Modals ─────────────────────────────────────────────────────────────────
  const openModal = (leads, title) => {
    setModalLeads(leads);
    setModalTitle(title);
    setModalVisible(true);
  };

  const handleKpiClick = (type) => {
    const map = {
      assigned:   [filteredLeads.filter(l => l.seller_id && l.seller_id !== '' && l.seller_id !== 'unassigned'), 'Assigned Leads'],
      own:        [filteredLeads.filter(l => l.createdBy && l.createdBy !== ''), 'Own Leads'],
      unassigned: [filteredLeads.filter(l => (!l.seller_id || l.seller_id === '' || l.seller_id === 'unassigned') && (!l.createdBy || l.createdBy === '')), 'Unassigned Leads'],
      gain:       [filteredLeads.filter(l => l.status === LeadStatus.GAIN), 'Won Leads'],
      loss:       [filteredLeads.filter(l => l.status === LeadStatus.LOSS), 'Lost Leads'],
      all:        [filteredLeads, 'All Leads'],
    };
    const [leads, title] = map[type] || map.all;
    openModal(leads, `${title} (${leads.length})`);
  };

  const handleStatusClick = (status) => {
    if (status === 'all') {
      openModal(allLeads, `All Leads (${allLeads.length})`);
    } else {
      const cfg  = STATUS_CONFIG[status];
      const list = allLeads.filter(l => l.status === status);
      openModal(list, `${cfg?.text || status} Leads (${list.length})`);
    }
  };

  const handleUserStatClick = (type) => {
    const map = {
      assigned: currentUserLeads.filter(l => l.seller_id === user?.uid && l.createdBy !== user?.uid),
      own:      currentUserLeads.filter(l => l.createdBy === user?.uid),
      gain:     currentUserLeads.filter(l => l.status === LeadStatus.GAIN),
      loss:     currentUserLeads.filter(l => l.status === LeadStatus.LOSS),
    };
    const leads = map[type] || currentUserLeads;
    openModal(leads, `My ${type.charAt(0).toUpperCase() + type.slice(1)} Leads (${leads.length})`);
  };

  // ── Seller drawer ──────────────────────────────────────────────────────────
  const handleViewSeller = async (seller) => {
    setSelectedSeller(seller);
    setDrawerVisible(true);
    setLeadTypeFilter('assigned');
    setStatusFilter('all');
    try {
      const all      = await LeadsService.getSellerLeads(companyId, seller.id);
      const assigned = all.filter(l => l.seller_id === seller.id && l.createdBy !== seller.id);
      const own      = all.filter(l => l.createdBy === seller.id);

      const assignedWithInfo = await Promise.all(assigned.map(async (lead) => {
        const rev = await getLeadRevealEvent(lead.id, seller.id);
        const assignedAt = lead.assignedAt?.toDate?.() || lead.assignedAt || null;
        let responseTime = null;
        if (rev && assignedAt) {
          const viewedAt = rev.createdAt?.toDate?.() || rev.createdAt || new Date();
          responseTime = (new Date(viewedAt) - new Date(assignedAt)) / 1000;
        }
        return { ...lead, responseTime: responseTime > 0 ? responseTime : null, isViewed: !!rev, assignedAt };
      }));

      setSellerLeads(assignedWithInfo);
      setSellerOwnLeads(own.map(l => ({ ...l, isOwnLead: true })));
    } catch (e) { console.error(e); message.error('Failed to load seller leads'); }
  };

  // ── Lead history ──────────────────────────────────────────────────────────
  const handleViewHistory = async (lead) => {
    setSelectedLead(lead);
    setHistoryVisible(true);
    try {
      let hist = await LeadHistoryService.getLeadHistory(lead.id);
      const snap = await getDocs(query(collection(db, 'leadHistory'), where('leadId', '==', lead.id)));
      snap.forEach(doc => {
        const d = doc.data();
        hist.push({ ...d, createdAt: d.timestamp?.toDate?.() || d.createdAt });
      });
      // deduplicate by createdAt+type
      const seen = new Set();
      hist = hist.filter(h => {
        const key = `${h.type}-${h.createdAt}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setLeadHistory(hist.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch {
      message.error('Failed to load history');
      setLeadHistory([]);
    }
  };

  // ── Export to Excel ────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = filteredSellers.map((s, i) => ({
      Rank:             i + 1,
      Name:             s.name,
      Role:             s.role,
      Assigned:         s.totalAssigned,
      'Own Leads':      s.ownLeads,
      Viewed:           s.viewedCount,
      'View Rate (%)':  s.viewRate,
      'Won':            s.gainCount,
      'Lost':           s.lossCount,
      'Conversion (%)': s.conversionRate,
      'Avg Response':   formatTime(s.avgResponse),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sellers');
    XLSX.writeFile(wb, `seller-performance-${dayjs().format('YYYY-MM-DD')}.xlsx`);
  };

  // ── Drawer lead filtering ──────────────────────────────────────────────────
  const drawerAssigned = statusFilter === 'all'
    ? sellerLeads
    : sellerLeads.filter(l => l.status === statusFilter);
  const drawerOwn = statusFilter === 'all'
    ? sellerOwnLeads
    : sellerOwnLeads.filter(l => l.status === statusFilter);

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns = [
    {
      title: '#', key: 'rank', width: 56,
      render: (_, __, i) => (
        <div style={{ textAlign:'center', fontSize:16 }}>
          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <Text type="secondary">{i+1}</Text>}
        </div>
      ),
    },
    {
      title: 'Seller', key: 'seller', width: 210,
      render: (_, r) => (
        <Space>
          <Avatar
            style={{ background: perfBg(r.viewRate), color: perfColor(r.viewRate), fontWeight:700 }}
          >
            {r.name.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight:600, fontSize:13 }}>{r.name}</div>
            <Text type="secondary" style={{ fontSize:11 }}>{r.role}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Assigned', dataIndex: 'totalAssigned', width: 90,
      sorter: (a, b) => a.totalAssigned - b.totalAssigned,
      render: v => <span style={{ fontWeight:700, color:C.blue, fontFamily:'monospace', fontSize:16 }}>{v}</span>,
    },
    {
      title: 'Own', dataIndex: 'ownLeads', width: 72,
      sorter: (a, b) => a.ownLeads - b.ownLeads,
      render: v => <span style={{ fontWeight:600, color:C.green, fontFamily:'monospace' }}>{v}</span>,
    },
    {
      title: 'View rate', key: 'view', width: 170,
      sorter: (a, b) => a.viewRate - b.viewRate,
      render: (_, r) => (
        <div>
          <div style={{ fontSize:13, fontWeight:600, color: perfColor(r.viewRate), marginBottom:4 }}>
            {r.viewedCount}/{r.totalAssigned} &nbsp;
            <Tag
              style={{ borderRadius:10, fontSize:10, padding:'1px 8px',
                background: perfBg(r.viewRate), color: perfColor(r.viewRate), border:'none' }}
            >
              {r.viewRate}%
            </Tag>
          </div>
          <Progress
            percent={r.viewRate} size="small"
            strokeColor={perfColor(r.viewRate)} trailColor="#f3f4f6"
            showInfo={false}
          />
        </div>
      ),
    },
    {
      title: 'Conversion', dataIndex: 'conversionRate', width: 100,
      sorter: (a, b) => a.conversionRate - b.conversionRate,
      render: v => (
        <Tag
          style={{ borderRadius:12, fontSize:11, padding:'2px 10px', border:'none',
            background: v>=50 ? '#f0fdf4' : v>=30 ? '#fefce8' : '#fef2f2',
            color: v>=50 ? C.green : v>=30 ? C.yellow : C.red }}
        >
          {v}%
        </Tag>
      ),
    },
    {
      title: 'Avg response', key: 'response', width: 130,
      sorter: (a, b) => a.avgResponse - b.avgResponse,
      render: (_, r) => r.avgResponse > 0 ? (
        <Tag
          style={{ borderRadius:16, fontSize:12, padding:'3px 12px', border:'none',
            background: r.avgResponse<=7200 ? '#f0fdf4' : '#fefce8',
            color: r.avgResponse<=7200 ? C.green : C.yellow }}
        >
          {formatTime(r.avgResponse)}
        </Tag>
      ) : <Text type="secondary">—</Text>,
    },
    {
      title: '', key: 'action', width: 90,
      render: (_, r) => (
        <Button
          type="primary" size="small"
          icon={<EyeOutlined />}
          onClick={e => { e.stopPropagation(); handleViewSeller(r); }}
          style={{ borderRadius:16 }}
        >
          Details
        </Button>
      ),
    },
  ];

  const modalColumns = [
    { title:'Name',    dataIndex:'name',        width:180, render:(v,r) => <div><div style={{fontWeight:600}}>{v||'Unknown'}</div><Text type="secondary" style={{fontSize:11}}>{r.email}</Text></div> },
    { title:'Phone',   dataIndex:'phoneNumber', width:130, render:v=>v||'—' },
    { title:'Region',  dataIndex:'region',      width:100, render:v=>v||'—' },
    { title:'Status',  dataIndex:'status',      width:130, render:v=>{const c=STATUS_CONFIG[v];return c?<Tag style={{borderRadius:12,background:`${c.color}18`,color:c.color,border:'none'}}>{c.icon} {c.text}</Tag>:<Tag>{v}</Tag>;} },
    { title:'Seller',  dataIndex:'seller_id',   width:150, render:v=>{const s=sellers.find(s=>s.id===v);return s?.name||'Unassigned';} },
    { title:'Created', dataIndex:'CreationDate',width:110, render:d=>d?dayjs(d).format('DD MMM YYYY'):'—' },
    { title:'',        key:'hist',              width:80,  render:(_,r)=><Button size="small" icon={<HistoryOutlined/>} onClick={()=>handleViewHistory(r)} type="link">History</Button> },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="spa-root" style={{ padding: isMobile ? 10 : 22, background:'#f5f6f8', minHeight:'100vh' }}>
      <style>{CSS}</style>

      {/* ── Header ── */}
      <div className="spa-header">
        <Row justify="space-between" align="middle" gutter={[12,12]}>
          <Col xs={24} md={16}>
            <Space size={14} align="center">
              <div style={{
                width:48, height:48, borderRadius:12,
                background:'rgba(255,255,255,.12)',
                display:'flex', alignItems:'center', justifyContent:'center',
                border:'1px solid rgba(255,255,255,.2)',
              }}>
                <DashboardOutlined style={{ fontSize:24, color:'#93c5fd' }} />
              </div>
              <div>
                <Title level={isMobile?4:3} style={{ margin:0, color:'#fff', fontWeight:700, lineHeight:1.2 }}>
                  Lead tracking · View rates · Response times
                </Title>
               
              </div>
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <Space wrap style={{ justifyContent: isMobile ? 'flex-start' : 'flex-end', width:'100%' }}>
              <Input
                placeholder="Search seller..."
                prefix={<SearchOutlined style={{ color:'#64748b' }} />}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                style={{ width:170, borderRadius:10, background:'rgba(255,255,255,.15)', border:'1px solid rgba(255,255,255,.25)' }}
                allowClear
              />
              <Tooltip title="Export to Excel">
                <Button icon={<DownloadOutlined />} onClick={handleExport}
                  style={{ borderRadius:10, background:'rgba(255,255,255,.15)', border:'1px solid rgba(255,255,255,.25)', color:'#fff' }}
                />
              </Tooltip>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => { fetchSellers(); fetchAllLeads(); fetchCurrentUserLeads(); }}
                loading={loading} type="primary" style={{ borderRadius:10 }}
              >
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* ── Date range filter bar ── */}
      <div className="filter-bar">
        <FilterOutlined style={{ color:'#9ca3af', fontSize:14 }} />
        <Text style={{ fontSize:12, color:'#6b7280', fontWeight:600 }}>Period:</Text>
        {[['month','This month'],['quarter','This quarter'],['year','This year']].map(([k,l]) => (
          <button
            key={k}
            className={`period-btn ${period === k ? 'active' : ''}`}
            onClick={() => setPeriod(k)}
          >{l}</button>
        ))}
        <RangePicker
          size="small"
          style={{ borderRadius:8, fontSize:12 }}
          onChange={(dates) => {
            if (dates) { setCustomRange(dates); setPeriod('custom'); }
            else setPeriod('month');
          }}
          placeholder={['Start date','End date']}
        />
        {period !== 'month' && (
          <Tag
            color="blue"
            closable
            onClose={() => { setPeriod('month'); setCustomRange(null); }}
            style={{ borderRadius:10, fontSize:11 }}
          >
            {period === 'custom' && customRange
              ? `${customRange[0].format('DD MMM')} – ${customRange[1].format('DD MMM')}`
              : period === 'quarter' ? 'This quarter' : 'This year'}
          </Tag>
        )}
        <div style={{ marginLeft:'auto', fontSize:12, color:'#9ca3af' }}>
          Showing <b style={{color:'#374151'}}>{filteredLeads.length}</b> of {allLeads.length} leads
        </div>
      </div>

      {/* ── My Performance ── */}
      {currentUserStats && currentUserStats.totalAssigned > 0 && (
        <Card className="my-perf-card" bodyStyle={{ padding:'20px 24px' }}>
          <Row gutter={[16,12]} align="middle">
            <Col xs={24} md={5}>
              <Space direction="vertical" align="center" style={{ width:'100%', textAlign:'center' }}>
                <Avatar size={56} icon={<UserOutlined />}
                  style={{ background:'rgba(255,255,255,.2)', border:'2px solid rgba(255,255,255,.4)' }}
                />
                <Text style={{ color:'#fff', fontWeight:700, fontSize:14 }}>My Performance</Text>
                <Text style={{ color:'rgba(255,255,255,.7)', fontSize:12 }}>
                  {user?.firstname} {user?.lastname}
                </Text>
              </Space>
            </Col>
            {[
              { label:'Assigned',  val: currentUserStats.totalAssigned, color:'#e0f2fe', type:'assigned' },
              { label:'Own',       val: currentUserStats.totalOwn,      color:'#d1fae5', type:'own' },
              { label:'Won',       val: currentUserStats.gainCount,     color:'#bbf7d0', type:'gain' },
              { label:'Lost',      val: currentUserStats.lossCount,     color:'#fecaca', type:'loss' },
            ].map(item => (
              <Col xs={6} md={3} key={item.label}>
                <div className="my-perf-stat" onClick={() => handleUserStatClick(item.type)}>
                  <div style={{ fontSize:26, fontWeight:700, color:'#fff' }}>{item.val}</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,.7)' }}>{item.label}</div>
                </div>
              </Col>
            ))}
            <Col xs={24} md={7}>
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <Text style={{ color:'rgba(255,255,255,.8)', fontSize:12 }}>View rate</Text>
                  <Text style={{ color:'#fff', fontWeight:700 }}>{currentUserStats.viewRate.toFixed(1)}%</Text>
                </div>
                <Progress
                  percent={currentUserStats.viewRate}
                  strokeColor={{ from:'#34d399', to:'#059669' }}
                  trailColor="rgba(255,255,255,.2)"
                  showInfo={false}
                />
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:8 }}>
                  <Text style={{ color:'rgba(255,255,255,.7)', fontSize:11 }}>Avg response</Text>
                  <Text style={{ color:'#fff', fontWeight:600, fontSize:12 }}>
                    {formatTime(currentUserStats.avgResponse)}
                  </Text>
                </div>
              </div>
            </Col>
          </Row>
        </Card>
      )}

      {/* ── KPI row ── */}
      <Row gutter={[12,12]} style={{ marginBottom:18 }}>
        {[
          { title:'Assigned Leads', value:assignedCount,   icon:<UserOutlined />,     colorKey:'blue',   type:'assigned' },
          { title:'Own Leads',      value:ownCount,        icon:<PlusOutlined />,     colorKey:'green',  type:'own' },
          { title:'Unassigned',     value:unassignedCount, icon:<WarningOutlined />,  colorKey:'yellow', type:'unassigned' },
          { title:'Total Leads',    value:filteredLeads.length, icon:<AppstoreOutlined />, colorKey:'purple', type:'all' },
        ].map(k => (
          <Col xs={12} sm={6} key={k.title}>
            <KpiCard {...k} loading={loading} onClick={() => handleKpiClick(k.type)} />
          </Col>
        ))}
      </Row>

      {/* ── Performance metrics row ── */}
      <Row gutter={[12,12]} style={{ marginBottom:18 }}>
        {[
          { label:'Lost Leads',        value:totalLoss,              bg:'linear-gradient(135deg,#dc2626,#b91c1c)', icon:<CloseCircleOutlined />, type:'loss' },
          { label:'Won Leads',         value:totalGain,              bg:'linear-gradient(135deg,#16a34a,#15803d)', icon:<TrophyOutlined />,       type:'gain' },
          { label:'Overall View Rate', value:`${overallViewRate}%`,  bg:'linear-gradient(135deg,#ca8a04,#b45309)', icon:<EyeOutlined />,          type:null  },
          { label:'Active Sellers',    value:sellers.length,         bg:'linear-gradient(135deg,#7c3aed,#6d28d9)', icon:<TeamOutlined />,         type:null  },
        ].map(m => (
          <Col xs={12} md={6} key={m.label}>
            <div
              style={{ background:m.bg, borderRadius:14, padding:'14px 16px', color:'#fff', cursor:m.type?'pointer':'default' }}
              onClick={() => m.type && handleKpiClick(m.type)}
            >
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:26, fontWeight:700, lineHeight:1 }}>{m.value}</div>
                  <div style={{ fontSize:11, opacity:.85, marginTop:4 }}>{m.label}</div>
                </div>
                <div style={{ fontSize:28, opacity:.7 }}>{m.icon}</div>
              </div>
            </div>
          </Col>
        ))}
      </Row>

      {/* ── Status pills ── */}
      <Card className="chart-card" bodyStyle={{ padding:'16px 20px' }} style={{ marginBottom:18 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <Text style={{ fontSize:12, fontWeight:600, color:'#6b7280', marginRight:4 }}>
            Filter by status:
          </Text>
          {STATUS_LIST.map(s => {
            const count = s.value === 'all'
              ? allLeads.length
              : (globalStatusCounts[s.value] || 0);
            return (
              <StatusPill
                key={s.value}
                status={s.value}
                config={{ color:s.color, text:s.label, icon:s.icon }}
                count={count}
                isActive={false}
                onClick={handleStatusClick}
              />
            );
          })}
        </div>
      </Card>

      {/* ── Charts row 1: Pipeline + Status donut ── */}
      <Row gutter={[12,12]} style={{ marginBottom:18 }}>
        <Col xs={24} md={14}>
          <Card className="chart-card" bodyStyle={{ padding:'18px 20px' }}>
            <div style={{ marginBottom:14 }}>
              <Text style={{ fontWeight:700, fontSize:14, color:'#111827' }}>Monthly Lead Pipeline</Text>
              <Text type="secondary" style={{ fontSize:11, marginLeft:8 }}>Last 6 months</Text>
            </div>
            <PipelineChart leads={allLeads} dateRange={dateRange} />
          </Card>
        </Col>
        <Col xs={24} md={10}>
          <Card className="chart-card" bodyStyle={{ padding:'18px 20px' }}>
            <div style={{ marginBottom:10 }}>
              <Text style={{ fontWeight:700, fontSize:14, color:'#111827' }}>
                <PieChartOutlined style={{ color:C.blue, marginRight:6 }} />
                Status Distribution
              </Text>
            </div>
            <StatusDonut counts={globalStatusCounts} />
            {/* Clickable count pills below donut */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:10, justifyContent:'center' }}>
              {STATUS_LIST.filter(s=>s.value!=='all').map(s => {
                const count = globalStatusCounts[s.value] || 0;
                if (!count) return null;
                return (
                  <div
                    key={s.value}
                    onClick={() => handleStatusClick(s.value)}
                    style={{ background:`${s.color}14`, borderRadius:8, padding:'4px 10px', cursor:'pointer', textAlign:'center', minWidth:64 }}
                  >
                    <div style={{ fontWeight:700, color:s.color, fontSize:16 }}>{count}</div>
                    <div style={{ fontSize:10, color:s.color }}>{s.label}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>
      </Row>

      {/* ── Charts row 2: View rate + Response time ── */}
      <Row gutter={[12,12]} style={{ marginBottom:18 }}>
        <Col xs={24} md={12}>
          <Card className="chart-card" bodyStyle={{ padding:'18px 20px' }}>
            <div style={{ marginBottom:12 }}>
              <Text style={{ fontWeight:700, fontSize:14, color:'#111827' }}>View Rate by Seller</Text>
              <div style={{ display:'flex', gap:12, marginTop:6, fontSize:11, color:'#9ca3af' }}>
                <span><span style={{ color:C.excellent }}>●</span> ≥70% excellent</span>
                <span><span style={{ color:C.good }}>●</span> 50–69% good</span>
                <span><span style={{ color:C.poor }}>●</span> &lt;50% low</span>
              </div>
            </div>
            <ViewRateChart sellers={filteredSellers} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card className="chart-card" bodyStyle={{ padding:'18px 20px' }}>
            <div style={{ marginBottom:12 }}>
              <Text style={{ fontWeight:700, fontSize:14, color:'#111827' }}>Avg Response Time (h)</Text>
              <Text type="secondary" style={{ fontSize:11, marginLeft:8 }}>Sorted fastest → slowest</Text>
            </div>
            <ResponseChart sellers={filteredSellers} />
          </Card>
        </Col>
      </Row>

      {/* ── Charts row 3: Conversion trend + Perf donut ── */}
      <Row gutter={[12,12]} style={{ marginBottom:18 }}>
        <Col xs={24} md={14}>
          <Card className="chart-card" bodyStyle={{ padding:'18px 20px' }}>
            <div style={{ marginBottom:12 }}>
              <Text style={{ fontWeight:700, fontSize:14, color:'#111827' }}>Conversion Rate Trend</Text>
              <Text type="secondary" style={{ fontSize:11, marginLeft:8 }}>Last 6 months</Text>
            </div>
            <TrendChart leads={allLeads} />
          </Card>
        </Col>
        <Col xs={24} md={10}>
          <Card className="chart-card" bodyStyle={{ padding:'18px 20px' }}>
            <div style={{ marginBottom:10 }}>
              <Text style={{ fontWeight:700, fontSize:14, color:'#111827' }}>
                <HeatMapOutlined style={{ color:C.orange, marginRight:6 }} />
                Seller Performance Tiers
              </Text>
            </div>
            <PerfDonut sellers={sellers} />
            <Row gutter={[8,8]} style={{ marginTop:12 }}>
              {[
                { label:'Excellent', color:C.excellent, count:sellers.filter(s=>s.viewRate>=70).length },
                { label:'Good',      color:C.good,      count:sellers.filter(s=>s.viewRate>=50&&s.viewRate<70).length },
                { label:'Average',   color:C.average,   count:sellers.filter(s=>s.viewRate>=30&&s.viewRate<50).length },
                { label:'Poor',      color:C.poor,      count:sellers.filter(s=>s.viewRate<30).length },
              ].map(t => (
                <Col span={6} key={t.label} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:20, fontWeight:700, color:t.color }}>{t.count}</div>
                  <Text type="secondary" style={{ fontSize:10 }}>{t.label}</Text>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>

      {/* ── Sellers table ── */}
      <Card
        title={
          <Space>
            <TeamOutlined style={{ color:C.blue }} />
            <span style={{ fontWeight:700 }}>Sellers Leaderboard</span>
            <Tag style={{ borderRadius:20, background:'#eff6ff', color:C.blue, border:'none' }}>
              {filteredSellers.length} sellers
            </Tag>
          </Space>
        }
        extra={
          <Button size="small" icon={<DownloadOutlined />} onClick={handleExport}>
            Export
          </Button>
        }
        style={{ borderRadius:18, boxShadow:'0 2px 10px rgba(0,0,0,.06)', overflow:'hidden' }}
        bodyStyle={{ padding: isMobile ? 10 : 16 }}
      >
        {isMobile ? (
          loading
            ? <Skeleton active avatar paragraph={{ rows:3 }} />
            : filteredSellers.length > 0
              ? filteredSellers.map((s, i) => (
                  <div
                    key={s.id}
                    className={`seller-card ${selectedSeller?.id===s.id?'active':''}`}
                    onClick={() => handleViewSeller(s)}
                  >
                    <div style={{ display:'flex', alignItems:'center', marginBottom:10 }}>
                      <div style={{
                        width:38, height:38, borderRadius:10,
                        background: perfBg(s.viewRate),
                        color: perfColor(s.viewRate),
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontWeight:700, marginRight:10, fontSize:15,
                      }}>
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600 }}>
                          {i===0?'🥇 ':i===1?'🥈 ':i===2?'🥉 ':''}{s.name}
                        </div>
                        <Text type="secondary" style={{ fontSize:11 }}>{s.role}</Text>
                      </div>
                      <Badge count={s.totalAssigned} showZero color={perfColor(s.viewRate)} />
                    </div>
                    <Progress percent={s.viewRate} size="small" strokeColor={perfColor(s.viewRate)} trailColor="#f3f4f6" showInfo={false} />
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
                      <Text type="secondary" style={{ fontSize:11 }}>Viewed {s.viewedCount}/{s.totalAssigned}</Text>
                      <Text type="secondary" style={{ fontSize:11 }}>Conv {s.conversionRate}%</Text>
                    </div>
                  </div>
                ))
              : <Empty description="No sellers found" />
        ) : (
          <Table
            columns={columns}
            dataSource={filteredSellers}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize:10, showSizeChanger:true, showTotal:t=>`${t} sellers`, size:'small' }}
            scroll={{ x:1100 }}
            size="small"
            bordered={false}
            onRow={r => ({ onClick:()=>handleViewSeller(r), style:{ cursor:'pointer' } })}
          />
        )}
      </Card>

      {/* ── Leads modal ── */}
      <Modal
        title={<Space><PieChartOutlined style={{ color:C.blue }} /><span style={{ fontWeight:700 }}>{modalTitle}</span></Space>}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={1100}
        destroyOnClose
      >
        <Table
          columns={modalColumns}
          dataSource={modalLeads}
          rowKey="id"
          size="small"
          pagination={{ pageSize:10, showSizeChanger:true, showTotal:t=>`${t} leads` }}
          scroll={{ x:900 }}
        />
      </Modal>

      {/* ── Seller detail drawer ── */}
      <Drawer
        title={
          <Space>
            <Avatar style={{ background:C.blue }}>{selectedSeller?.name?.charAt(0)}</Avatar>
            <span style={{ fontWeight:700, fontSize:15 }}>{selectedSeller?.name}</span>
            <Tag style={{ borderRadius:16, background:'#eff6ff', color:C.blue, border:'none' }}>
              {selectedSeller?.role}
            </Tag>
          </Space>
        }
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width={isMobile?'100%':1100}
        placement="right"
        destroyOnClose
      >
        {/* Stats row */}
        <Row gutter={[10,10]} style={{ padding:'14px 18px', background:'#f8f9fb', borderBottom:'1px solid #f0f0f0' }}>
          {[
            { label:'Assigned',    value:selectedSeller?.totalAssigned,               color:C.blue },
            { label:'Own Leads',   value:selectedSeller?.ownLeads,                    color:C.green },
            { label:'Viewed',      value:`${selectedSeller?.viewedCount}/${selectedSeller?.totalAssigned}`, color:perfColor(selectedSeller?.viewRate||0) },
            { label:'View Rate',   value:`${selectedSeller?.viewRate}%`,              color:perfColor(selectedSeller?.viewRate||0) },
            { label:'Conversion',  value:`${selectedSeller?.conversionRate}%`,        color:selectedSeller?.conversionRate>=50?C.green:selectedSeller?.conversionRate>=30?C.yellow:C.red },
            { label:'Avg Response',value:formatTime(selectedSeller?.avgResponse),     color:C.blue },
          ].map(item => (
            <Col xs={12} md={4} key={item.label}>
              <div style={{ background:'#fff', borderRadius:12, padding:'10px 14px', textAlign:'center', border:'1px solid #f0f0f0' }}>
                <div style={{ fontSize:20, fontWeight:700, color:item.color, fontFamily:'monospace' }}>{item.value}</div>
                <Text type="secondary" style={{ fontSize:10 }}>{item.label}</Text>
              </div>
            </Col>
          ))}
        </Row>

        {/* Status pills in drawer */}
        <div style={{ padding:'12px 18px', background:'#f8f9fb', borderBottom:'1px solid #f0f0f0', display:'flex', gap:8, flexWrap:'wrap' }}>
          <StatusPill
            status="all"
            config={{ color:C.blue, text:'All', icon:<AppstoreOutlined /> }}
            count={selectedSeller ? Object.values(selectedSeller.statusCount||{}).reduce((a,b)=>a+b,0) : 0}
            isActive={statusFilter==='all'}
            onClick={() => setStatusFilter('all')}
          />
          {Object.entries(STATUS_CONFIG).map(([s, cfg]) => (
            <StatusPill
              key={s} status={s} config={cfg}
              count={selectedSeller?.statusCount?.[s]||0}
              isActive={statusFilter===s}
              onClick={() => setStatusFilter(s)}
            />
          ))}
        </div>

        {/* Lead type buttons */}
        <div style={{ padding:'10px 18px', borderBottom:'1px solid #f0f0f0', display:'flex', gap:8 }}>
          {[['assigned','Assigned'],['own','Created by seller'],['all','All']].map(([v,l]) => (
            <Button
              key={v} size="small"
              type={leadTypeFilter===v?'primary':'default'}
              style={{ borderRadius:16 }}
              onClick={() => setLeadTypeFilter(v)}
            >{l}</Button>
          ))}
        </div>

        <div style={{ padding: isMobile?10:'14px 18px' }}>
          {/* Assigned leads */}
          {(leadTypeFilter==='assigned'||leadTypeFilter==='all') && sellerLeads.length > 0 && (
            <>
              <Divider orientation="left" style={{ margin:'0 0 10px', fontSize:13 }}>
                <Space>
                  <UserOutlined style={{ color:C.blue }} />
                  <span style={{ fontWeight:600 }}>Assigned Leads</span>
                  <Tag style={{ borderRadius:16, background:'#eff6ff', color:C.blue, border:'none' }}>
                    {drawerAssigned.length} / {sellerLeads.length}
                  </Tag>
                </Space>
              </Divider>
              <Table
                size="small"
                dataSource={drawerAssigned}
                rowKey="id"
                pagination={{ pageSize:10, size:'small' }}
                columns={[
                  { title:'Lead',     dataIndex:'name',        render:(v,r)=><div><div style={{fontWeight:600}}>{v}</div><Text type="secondary" style={{fontSize:11}}>{r.email}</Text></div> },
                  { title:'Status',   dataIndex:'status',      render:v=>{const c=STATUS_CONFIG[v];return c?<Tag style={{borderRadius:10,background:`${c.color}15`,color:c.color,border:'none',fontSize:11}}>{c.text}</Tag>:<Tag>{v}</Tag>;} },
                  { title:'Revealed', dataIndex:'isViewed',    render:v=>v?<Badge status="success" text="Yes"/>:<Badge status="warning" text="No"/> },
                  { title:'Response', dataIndex:'responseTime',render:v=>v?formatTime(v):'—' },
                  { title:'',         render:(_,r)=><Button size="small" icon={<HistoryOutlined/>} onClick={()=>handleViewHistory(r)}>History</Button> },
                ]}
              />
            </>
          )}

          {/* Own leads */}
          {(leadTypeFilter==='own'||leadTypeFilter==='all') && sellerOwnLeads.length > 0 && (
            <>
              <Divider orientation="left" style={{ margin:'16px 0 10px', fontSize:13 }}>
                <Space>
                  <PlusOutlined style={{ color:C.green }} />
                  <span style={{ fontWeight:600 }}>Created by Seller</span>
                  <Tag style={{ borderRadius:16, background:'#f0fdf4', color:C.green, border:'none' }}>
                    {drawerOwn.length} / {sellerOwnLeads.length}
                  </Tag>
                </Space>
              </Divider>
              <Table
                size="small"
                dataSource={drawerOwn}
                rowKey="id"
                pagination={{ pageSize:10, size:'small' }}
                columns={[
                  { title:'Lead',    dataIndex:'name',       render:(v,r)=><div><div style={{fontWeight:600}}>{v}</div><Text type="secondary" style={{fontSize:11}}>{r.email}</Text></div> },
                  { title:'Status',  dataIndex:'status',     render:v=>{const c=STATUS_CONFIG[v];return c?<Tag style={{borderRadius:10,background:`${c.color}15`,color:c.color,border:'none',fontSize:11}}>{c.text}</Tag>:<Tag>{v}</Tag>;} },
                  { title:'Created', dataIndex:'CreationDate',render:d=>d?dayjs(d).format('DD MMM YYYY'):'—' },
                  { title:'',        render:(_,r)=><Button size="small" icon={<HistoryOutlined/>} onClick={()=>handleViewHistory(r)}>History</Button> },
                ]}
              />
            </>
          )}
        </div>
      </Drawer>

      {/* ── Lead history modal ── */}
      <Modal
        title={
          <Space>
            <HistoryOutlined style={{ color:C.blue }} />
            <span style={{ fontWeight:700 }}>Lead History: {selectedLead?.name}</span>
          </Space>
        }
        open={historyVisible}
        onCancel={() => { setHistoryVisible(false); setSelectedLead(null); setLeadHistory([]); }}
        footer={null}
        width={isMobile?'92%':520}
        destroyOnClose
      >
        {leadHistory.length === 0
          ? <Empty description="No history found" />
          : (
            <Timeline
              items={leadHistory.map((event, i) => {
                const typeMap = {
                  view:    { label:'Lead Revealed',   color:C.green,  dot:<UnlockOutlined /> },
                  reveal:  { label:'Lead Revealed',   color:C.green,  dot:<UnlockOutlined /> },
                  LEAD_VIEWED:{ label:'Lead Viewed',  color:C.green,  dot:<EyeOutlined /> },
                  assign:  { label:'Lead Assigned',   color:C.blue,   dot:<UserOutlined /> },
                  whatsapp:{ label:'WhatsApp Sent',   color:'#16a34a',dot:<MailOutlined /> },
                  email:   { label:'Email Sent',      color:C.blue,   dot:<MailOutlined /> },
                  call:    { label:'Phone Call',      color:C.purple, dot:<PhoneOutlined /> },
                  note:    { label:'Note Added',      color:C.gray,   dot:<FileTextOutlined /> },
                  status:  { label:'Status Changed',  color:C.yellow, dot:<TagOutlined /> },
                };
                const cfg = typeMap[event.type] || typeMap[event.eventType] || { label:'Activity', color:C.gray, dot:<ClockCircleOutlined /> };
                const ts  = event.createdAt?.toDate?.() || event.createdAt || event.timestamp?.toDate?.();
                return {
                  key: i, color: cfg.color, dot: cfg.dot,
                  children: (
                    <div>
                      <div style={{ fontWeight:600, fontSize:13 }}>{cfg.label}</div>
                      <Text type="secondary" style={{ fontSize:11 }}>
                        {ts ? dayjs(ts).format('YYYY-MM-DD HH:mm:ss') : '—'}
                      </Text>
                      {event.message && (
                        <div style={{ fontSize:12, marginTop:6, background:'#f8f9fb', padding:'8px 10px', borderRadius:8, whiteSpace:'pre-wrap' }}>
                          {event.message}
                        </div>
                      )}
                      {event.type === 'call' && (
                        <div style={{ fontSize:12, marginTop:4 }}>
                          <Tag color={event.outcome==='answered'?'success':'error'}>{event.outcome}</Tag>
                          {event.duration && <span style={{ color:'#6b7280', marginLeft:6 }}>{event.duration}min</span>}
                        </div>
                      )}
                      <Text type="secondary" style={{ fontSize:11, display:'block', marginTop:4 }}>
                        By: {event.createdBy?.name || event.userId || event.sellerId || 'System'}
                      </Text>
                    </div>
                  ),
                };
              })}
            />
          )
        }
      </Modal>
    </div>
  );
};

export default LeadsPerformanceAnalytics;