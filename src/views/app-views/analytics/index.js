// pages/LeadsPerformanceAnalytics.js — Updated with new statuses and deal conversion tracking
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
  HeatMapOutlined, DownloadOutlined, DollarOutlined,
  CheckCircleOutlined, StarOutlined, LinkOutlined
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
import LeadService from 'services/firebase/LeadService';
import ContactService from 'services/firebase/ContactService';
import DealService from 'services/firebase/DealService';
import LeadHistoryService from 'services/firebase/LeadHistoryService';
import { UserRoles } from 'models/UserModel';
import { LeadStatus, LeadStatusColors, LeadStatusLabels } from 'models/LeadModel';
import { DealStatus, DealStatusLabels, DealStatusColors } from 'models/DealModel';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from 'configs/FirebaseConfig';

dayjs.extend(relativeTime);
dayjs.extend(isBetween);

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const { RangePicker } = DatePicker;

// ─── New Status Configuration ─────────────────────────────────────────────────
const STATUS_CONFIG = {
  [LeadStatus.NEW]: { color: '#1890ff', text: 'New', icon: <StarOutlined /> },
  [LeadStatus.CONTACTED]: { color: '#fa8c16', text: 'Contacted', icon: <PhoneOutlined /> },
  [LeadStatus.QUALIFIED]: { color: '#52c41a', text: 'Qualified', icon: <CheckCircleOutlined /> },
  [LeadStatus.PROPOSAL]: { color: '#722ed1', text: 'Proposal', icon: <FileTextOutlined /> },
  [LeadStatus.CONVERTED]: { color: '#13c2c2', text: 'Converted', icon: <LinkOutlined /> },
  [LeadStatus.WON]: { color: '#faad14', text: 'Won', icon: <TrophyOutlined /> },
  [LeadStatus.LOST]: { color: '#ff4d4f', text: 'Lost', icon: <CloseCircleOutlined /> },
  [LeadStatus.NOT_INTERESTED]: { color: '#d9d9d9', text: 'Not Interested', icon: <CloseCircleOutlined /> },
  [LeadStatus.JUNK_LEAD]: { color: '#8c8c8c', text: 'Junk', icon: <WarningOutlined /> },
  [LeadStatus.CLOSED]: { color: '#52c41a', text: 'Closed', icon: <CheckCircleOutlined /> },
};

const STATUS_LIST = [
  { value: 'all', label: 'All', color: '#1890ff', icon: <AppstoreOutlined /> },
  { value: LeadStatus.NEW, label: 'New', color: '#1890ff', icon: <StarOutlined /> },
  { value: LeadStatus.CONTACTED, label: 'Contacted', color: '#fa8c16', icon: <PhoneOutlined /> },
  { value: LeadStatus.QUALIFIED, label: 'Qualified', color: '#52c41a', icon: <CheckCircleOutlined /> },
  { value: LeadStatus.PROPOSAL, label: 'Proposal', color: '#722ed1', icon: <FileTextOutlined /> },
  { value: LeadStatus.CONVERTED, label: 'Converted', color: '#13c2c2', icon: <LinkOutlined /> },
  { value: LeadStatus.WON, label: 'Won', color: '#faad14', icon: <TrophyOutlined /> },
  { value: LeadStatus.LOST, label: 'Lost', color: '#ff4d4f', icon: <CloseCircleOutlined /> },
  { value: LeadStatus.CLOSED, label: 'Closed', color: '#52c41a', icon: <CheckCircleOutlined /> },
];

// ─── Deal Status Configuration ──────────────────────────────────────────────
const DEAL_STATUS_CONFIG = {
  [DealStatus.OPENED]: { color: '#1890ff', text: 'Opened', icon: <StarOutlined /> },
  [DealStatus.PROPOSAL]: { color: '#722ed1', text: 'Proposal', icon: <FileTextOutlined /> },
  [DealStatus.WON]: { color: '#faad14', text: 'Won', icon: <TrophyOutlined /> },
  [DealStatus.LOST]: { color: '#ff4d4f', text: 'Lost', icon: <CloseCircleOutlined /> },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatTime = (seconds) => {
  if (!seconds || seconds <= 0) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${(seconds / 86400).toFixed(1)}d`;
};

const perfColor = (rate) =>
  rate >= 70 ? '#16a34a' : rate >= 50 ? '#ca8a04' : rate >= 30 ? '#ea580c' : '#dc2626';

const perfBg = (rate) =>
  rate >= 70 ? '#f0fdf4' : rate >= 50 ? '#fefce8' : rate >= 30 ? '#fff7ed' : '#fef2f2';

// ─── Styles ──────────────────────────────────────────────────────────────────
const CSS = `
  .spa-root { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
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
  .kpi-blue::after { background: linear-gradient(90deg,#1890ff,#096dd9); }
  .kpi-green::after { background: linear-gradient(90deg,#52c41a,#389e0d); }
  .kpi-yellow::after { background: linear-gradient(90deg,#faad14,#d48806); }
  .kpi-purple::after { background: linear-gradient(90deg,#722ed1,#531dab); }
  .kpi-red::after { background: linear-gradient(90deg,#ff4d4f,#cf1322); }
  .kpi-orange::after { background: linear-gradient(90deg,#fa8c16,#d46b08); }
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
  .status-pill:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.09); }
  .status-pill.active { background: #fff; box-shadow: 0 2px 10px rgba(0,0,0,.1); }
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
    background: #1890ff;
    border-color: #1890ff;
    color: #fff;
  }
  .chart-card {
    border-radius: 16px !important;
    border: 1px solid #f0f0f0 !important;
    box-shadow: 0 2px 8px rgba(0,0,0,.05) !important;
  }
`;

// ─── Sub-components ──────────────────────────────────────────────────────────

const KpiCard = ({ title, value, icon, colorKey, loading, onClick, trend, trendVal }) => {
  const iconBg = { blue:'#eff6ff', green:'#f0fdf4', yellow:'#fefce8', purple:'#faf5ff', red:'#fef2f2', orange:'#fff7ed' };
  const iconClr = { blue:'#1890ff', green:'#52c41a', yellow:'#faad14', purple:'#722ed1', red:'#ff4d4f', orange:'#fa8c16' };
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
              <Tag color={trend === 'up' ? 'success' : 'error'} style={{ borderRadius:10, fontSize:10 }}>
                {trend === 'up' ? <RiseOutlined /> : <FallOutlined />} {trendVal}
              </Tag>
            </div>
          )}
        </div>
        <div style={{
          width:44, height:44, borderRadius:12, flexShrink:0,
          background: iconBg[colorKey] || '#f3f4f6',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:20, color: iconClr[colorKey] || '#6b7280',
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
    <div style={{ color: config?.color || '#1890ff', fontSize: 18 }}>{config?.icon || <AppstoreOutlined />}</div>
    <div style={{ color: config?.color || '#1890ff', fontSize: 20, fontWeight: 700, margin: '2px 0' }}>{count}</div>
    <div style={{ color: config?.color || '#1890ff', fontSize: 10, fontWeight: 600, lineHeight: 1.2 }}>
      {config?.text || (status === 'all' ? 'All' : status)}
    </div>
  </div>
);

// ─── Charts ──────────────────────────────────────────────────────────────────

const PipelineChart = ({ leads }) => {
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
        New: monthLeads.filter(l => l.status === LeadStatus.NEW).length,
        Contacted: monthLeads.filter(l => l.status === LeadStatus.CONTACTED).length,
        Qualified: monthLeads.filter(l => l.status === LeadStatus.QUALIFIED).length,
        Proposal: monthLeads.filter(l => l.status === LeadStatus.PROPOSAL).length,
        Won: monthLeads.filter(l => l.status === LeadStatus.WON || l.status === LeadStatus.CONVERTED).length,
        Lost: monthLeads.filter(l => l.status === LeadStatus.LOST).length,
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
        <Bar dataKey="New" stackId="a" fill="#1890ff" radius={[4,4,0,0]} />
        <Bar dataKey="Contacted" stackId="a" fill="#fa8c16" />
        <Bar dataKey="Qualified" stackId="a" fill="#52c41a" />
        <Bar dataKey="Proposal" stackId="a" fill="#722ed1" />
        <Bar dataKey="Won" stackId="a" fill="#faad14" />
        <Bar dataKey="Lost" stackId="a" fill="#ff4d4f" />
      </BarChart>
    </ResponsiveContainer>
  );
};

const ConversionFunnel = ({ leads }) => {
  const data = useMemo(() => {
    const total = leads.length;
    const contacted = leads.filter(l => l.status === LeadStatus.CONTACTED || l.status === LeadStatus.QUALIFIED || 
      l.status === LeadStatus.PROPOSAL || l.status === LeadStatus.WON || l.status === LeadStatus.CONVERTED).length;
    const qualified = leads.filter(l => l.status === LeadStatus.QUALIFIED || l.status === LeadStatus.PROPOSAL || 
      l.status === LeadStatus.WON || l.status === LeadStatus.CONVERTED).length;
    const proposal = leads.filter(l => l.status === LeadStatus.PROPOSAL || l.status === LeadStatus.WON || 
      l.status === LeadStatus.CONVERTED).length;
    const won = leads.filter(l => l.status === LeadStatus.WON || l.status === LeadStatus.CONVERTED).length;
    
    return [
      { stage: 'Total Leads', value: total, color: '#1890ff', pct: 100 },
      { stage: 'Contacted', value: contacted, color: '#fa8c16', pct: total ? Math.round((contacted/total)*100) : 0 },
      { stage: 'Qualified', value: qualified, color: '#52c41a', pct: total ? Math.round((qualified/total)*100) : 0 },
      { stage: 'Proposal', value: proposal, color: '#722ed1', pct: total ? Math.round((proposal/total)*100) : 0 },
      { stage: 'Won', value: won, color: '#faad14', pct: total ? Math.round((won/total)*100) : 0 },
    ];
  }, [leads]);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="stage" tick={{ fontSize: 11, fill: '#374151' }} axisLine={false} tickLine={false} width={90} />
        <RechartsTooltip
          formatter={(v, name, props) => [`${v} (${props.payload.pct}%)`, 'Leads']}
          contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,.12)', fontSize: 12 }}
        />
        <Bar dataKey="value" radius={[0,4,4,0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const LeadsPerformanceAnalytics = () => {
  const [sellers, setSellers] = useState([]);
  const [allLeads, setAllLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [sellerLeads, setSellerLeads] = useState([]);
  const [sellerOwnLeads, setSellerOwnLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [leadHistory, setLeadHistory] = useState([]);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [leadTypeFilter, setLeadTypeFilter] = useState('assigned');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentUserLeads, setCurrentUserLeads] = useState([]);
  const [currentUserStats, setCurrentUserStats] = useState(null);
  const [modalLeads, setModalLeads] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [period, setPeriod] = useState('month');
  const [customRange, setCustomRange] = useState(null);
  const [dealStats, setDealStats] = useState({ total: 0, opened: 0, proposal: 0, won: 0, lost: 0 });

  const user = useSelector(state => state.auth.user);
  const companyId = user?.company_id;
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  // ── Date range ─────────────────────────────────────────────────────────────
  const dateRange = useMemo(() => {
    if (period === 'custom' && customRange) return customRange;
    const end = dayjs();
    const start = period === 'month' ? dayjs().startOf('month')
                : period === 'quarter' ? dayjs().startOf('quarter')
                : dayjs().startOf('year');
    return [start, end];
  }, [period, customRange]);

  const filteredLeads = useMemo(() => {
    const [start, end] = dateRange;
    return allLeads.filter(l => {
      const d = l.CreationDate?.toDate?.() || l.CreationDate;
      if (!d) return true;
      return dayjs(d).isBetween(start, end, null, '[]');
    });
  }, [allLeads, dateRange]);

  // ── Fetch Data ─────────────────────────────────────────────────────────────
  const fetchAllLeads = useCallback(async () => {
    if (!companyId) return;
    try {
      const data = await LeadService.getLeadsByCompany(companyId);
      setAllLeads(data);
    } catch (e) { console.error(e); }
  }, [companyId]);

  const fetchDealsStats = useCallback(async () => {
    if (!companyId) return;
    try {
      const deals = await DealService.getDealsByCompany(companyId);
      setDealStats({
        total: deals.length,
        opened: deals.filter(d => d.Status === DealStatus.OPENED).length,
        proposal: deals.filter(d => d.Status === DealStatus.PROPOSAL).length,
        won: deals.filter(d => d.Status === DealStatus.WON).length,
        lost: deals.filter(d => d.Status === DealStatus.LOST).length,
      });
    } catch (e) { console.error(e); }
  }, [companyId]);

  const fetchSellers = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const allUsers = await UserService.getUsersByCompanyId(companyId);
      const salesTeam = allUsers.filter(u =>
        [UserRoles.SELLER, UserRoles.SALES_EXECUTIVE, UserRoles.AGENT].includes(u.Role)
      );

      const withStats = await Promise.all(salesTeam.map(async (seller) => {
        const leads = await LeadService.getLeadsBySeller(companyId, seller.id);
        const ownLeads = leads.filter(l => l.createdBy === seller.id);
        const assigned = leads.filter(l => l.seller_id === seller.id && l.createdBy !== seller.id);
        let viewedCount = 0, totalResp = 0, respCount = 0;
        const statusCount = Object.fromEntries(Object.keys(LeadStatus).map(k => [k, 0]));
        let gainCount = 0, lossCount = 0, convertedCount = 0;

        for (const lead of assigned) {
          if (lead.status) {
            statusCount[lead.status] = (statusCount[lead.status] || 0) + 1;
            if (lead.status === LeadStatus.WON || lead.status === LeadStatus.CONVERTED) gainCount++;
            if (lead.status === LeadStatus.LOST) lossCount++;
            if (lead.status === LeadStatus.CONVERTED || lead.convertedContactId) convertedCount++;
          }
          // Check if viewed
          const hasViewed = lead.lastViewedBy?.[seller.id] || lead.isRevealed;
          if (hasViewed) {
            viewedCount++;
            const assignedAt = lead.assignedAt?.toDate?.() || lead.assignedAt || lead.CreationDate?.toDate?.() || lead.CreationDate;
            const viewedAt = lead.lastViewedBy?.[seller.id]?.toDate?.() || lead.revealedAt?.toDate?.() || new Date();
            if (assignedAt) {
              const secs = (new Date(viewedAt) - new Date(assignedAt)) / 1000;
              if (secs > 0 && secs < 2592000) { totalResp += secs; respCount++; }
            }
          }
        }

        return {
          id: seller.id,
          name: `${seller.firstname || ''} ${seller.lastname || ''}`.trim() || seller.email,
          role: seller.Role,
          totalAssigned: assigned.length,
          ownLeads: ownLeads.length,
          viewedCount,
          viewRate: assigned.length > 0 ? Math.round((viewedCount / assigned.length) * 100) : 0,
          avgResponse: respCount > 0 ? Math.round(totalResp / respCount) : 0,
          statusCount,
          gainCount,
          lossCount,
          convertedCount,
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
    fetchDealsStats();
  }, [fetchSellers, fetchAllLeads, fetchDealsStats]);

  // ── Statistics ─────────────────────────────────────────────────────────────
  const globalStatusCounts = useMemo(() => {
    const counts = {};
    Object.keys(LeadStatus).forEach(k => counts[k] = 0);
    sellers.forEach(s => {
      Object.entries(s.statusCount || {}).forEach(([k, v]) => {
        counts[k] = (counts[k] || 0) + v;
      });
    });
    return counts;
  }, [sellers]);

  const totalAssigned = sellers.reduce((s, r) => s + r.totalAssigned, 0);
  const totalViewed = sellers.reduce((s, r) => s + r.viewedCount, 0);
  const overallViewRate = totalAssigned > 0 ? ((totalViewed / totalAssigned) * 100).toFixed(1) : '0.0';
  const totalGain = sellers.reduce((s, r) => s + (r.gainCount || 0), 0);
  const totalLoss = sellers.reduce((s, r) => s + (r.lossCount || 0), 0);
  const totalConverted = sellers.reduce((s, r) => s + (r.convertedCount || 0), 0);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleKpiClick = (type) => {
    const map = {
      assigned: [filteredLeads.filter(l => l.seller_id && l.seller_id !== ''), 'Assigned Leads'],
      own: [filteredLeads.filter(l => l.createdBy && l.createdBy !== ''), 'Own Leads'],
      unassigned: [filteredLeads.filter(l => (!l.seller_id || l.seller_id === '') && (!l.createdBy || l.createdBy === '')), 'Unassigned Leads'],
      won: [filteredLeads.filter(l => l.status === LeadStatus.WON || l.status === LeadStatus.CONVERTED), 'Won Leads'],
      lost: [filteredLeads.filter(l => l.status === LeadStatus.LOST), 'Lost Leads'],
      converted: [filteredLeads.filter(l => l.convertedContactId || l.status === LeadStatus.CONVERTED), 'Converted Leads'],
      all: [filteredLeads, 'All Leads'],
    };
    const [leads, title] = map[type] || map.all;
    openModal(leads, `${title} (${leads.length})`);
  };

  const handleStatusClick = (status) => {
    if (status === 'all') {
      openModal(allLeads, `All Leads (${allLeads.length})`);
    } else {
      const cfg = STATUS_CONFIG[status];
      const list = allLeads.filter(l => l.status === status);
      openModal(list, `${cfg?.text || status} Leads (${list.length})`);
    }
  };

  const openModal = (leads, title) => {
    setModalLeads(leads);
    setModalTitle(title);
    setModalVisible(true);
  };

  const handleViewSeller = async (seller) => {
    setSelectedSeller(seller);
    setDrawerVisible(true);
    setLeadTypeFilter('assigned');
    setStatusFilter('all');
    try {
      const all = await LeadService.getLeadsBySeller(companyId, seller.id);
      const assigned = all.filter(l => l.seller_id === seller.id && l.createdBy !== seller.id);
      const own = all.filter(l => l.createdBy === seller.id);
      setSellerLeads(assigned);
      setSellerOwnLeads(own);
    } catch (e) { console.error(e); message.error('Failed to load seller leads'); }
  };

  const handleViewHistory = async (lead) => {
    setSelectedLead(lead);
    setHistoryVisible(true);
    try {
      let hist = await LeadHistoryService.getLeadHistory(lead.id);
      setLeadHistory(hist.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch { message.error('Failed to load history'); setLeadHistory([]); }
  };

  const handleExport = () => {
    const rows = sellers.map((s, i) => ({
      Rank: i + 1,
      Name: s.name,
      Role: s.role,
      Assigned: s.totalAssigned,
      'Own Leads': s.ownLeads,
      Viewed: s.viewedCount,
      'View Rate (%)': s.viewRate,
      'Won': s.gainCount,
      'Lost': s.lossCount,
      'Converted': s.convertedCount,
      'Conversion (%)': s.conversionRate,
      'Avg Response': formatTime(s.avgResponse),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sellers');
    XLSX.writeFile(wb, `seller-performance-${dayjs().format('YYYY-MM-DD')}.xlsx`);
  };

  // ─── Table Columns ─────────────────────────────────────────────────────────
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
          <Avatar style={{ background: perfBg(r.viewRate), color: perfColor(r.viewRate), fontWeight:700 }}>
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
      render: v => <span style={{ fontWeight:700, color:'#1890ff', fontFamily:'monospace', fontSize:16 }}>{v}</span>,
    },
    {
      title: 'Own', dataIndex: 'ownLeads', width: 72,
      sorter: (a, b) => a.ownLeads - b.ownLeads,
      render: v => <span style={{ fontWeight:600, color:'#52c41a', fontFamily:'monospace' }}>{v}</span>,
    },
    {
      title: 'View rate', key: 'view', width: 170,
      sorter: (a, b) => a.viewRate - b.viewRate,
      render: (_, r) => (
        <div>
          <div style={{ fontSize:13, fontWeight:600, color: perfColor(r.viewRate), marginBottom:4 }}>
            {r.viewedCount}/{r.totalAssigned} &nbsp;
            <Tag style={{ borderRadius:10, fontSize:10, padding:'1px 8px', background: perfBg(r.viewRate), color: perfColor(r.viewRate), border:'none' }}>
              {r.viewRate}%
            </Tag>
          </div>
          <Progress percent={r.viewRate} size="small" strokeColor={perfColor(r.viewRate)} trailColor="#f3f4f6" showInfo={false} />
        </div>
      ),
    },
    {
      title: 'Won', dataIndex: 'gainCount', width: 70,
      sorter: (a, b) => a.gainCount - b.gainCount,
      render: v => <span style={{ fontWeight:600, color:'#faad14' }}>{v}</span>,
    },
    {
      title: 'Lost', dataIndex: 'lossCount', width: 70,
      sorter: (a, b) => a.lossCount - b.lossCount,
      render: v => <span style={{ fontWeight:600, color:'#ff4d4f' }}>{v}</span>,
    },
    {
      title: 'Converted', dataIndex: 'convertedCount', width: 80,
      sorter: (a, b) => a.convertedCount - b.convertedCount,
      render: v => <span style={{ fontWeight:600, color:'#722ed1' }}>{v}</span>,
    },
    {
      title: 'Avg response', key: 'response', width: 130,
      sorter: (a, b) => a.avgResponse - b.avgResponse,
      render: (_, r) => r.avgResponse > 0 ? (
        <Tag style={{ borderRadius:16, fontSize:12, padding:'3px 12px', border:'none', background: r.avgResponse<=7200 ? '#f0fdf4' : '#fefce8', color: r.avgResponse<=7200 ? '#52c41a' : '#faad14' }}>
          {formatTime(r.avgResponse)}
        </Tag>
      ) : <Text type="secondary">—</Text>,
    },
    {
      title: '', key: 'action', width: 90,
      render: (_, r) => (
        <Button type="primary" size="small" icon={<EyeOutlined />} onClick={e => { e.stopPropagation(); handleViewSeller(r); }} style={{ borderRadius:16 }}>
          Details
        </Button>
      ),
    },
  ];

  const modalColumns = [
    { title:'Name', dataIndex:'name', width:180, render:(v,r) => <div><div style={{fontWeight:600}}>{v||'Unknown'}</div><Text type="secondary" style={{fontSize:11}}>{r.email}</Text></div> },
    { title:'Phone', dataIndex:'phoneNumber', width:130, render:v=>v||'—' },
    { title:'Region', dataIndex:'region', width:100, render:v=>v||'—' },
    { title:'Status', dataIndex:'status', width:130, render:v=>{const c=STATUS_CONFIG[v];return c?<Tag style={{borderRadius:12,background:`${c.color}18`,color:c.color,border:'none'}}>{c.icon} {c.text}</Tag>:<Tag>{v}</Tag>;} },
    { title:'Seller', dataIndex:'seller_id', width:150, render:v=>{const s=sellers.find(s=>s.id===v);return s?.name||'Unassigned';} },
    { title:'Created', dataIndex:'CreationDate', width:110, render:d=>d?dayjs(d).format('DD MMM YYYY'):'—' },
    { title:'', key:'hist', width:80, render:(_,r)=><Button size="small" icon={<HistoryOutlined/>} onClick={()=>handleViewHistory(r)} type="link">History</Button> },
  ];

  return (
    <div className="spa-root" style={{ padding: isMobile ? 10 : 22, background:'#f5f6f8', minHeight:'100vh' }}>
      <style>{CSS}</style>

      {/* ── Header ── */}
      <div className="spa-header">
        <Row justify="space-between" align="middle" gutter={[12,12]}>
          <Col xs={24} md={16}>
            <Space size={14} align="center">
              <div style={{ width:48, height:48, borderRadius:12, background:'rgba(255,255,255,.12)', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid rgba(255,255,255,.2)' }}>
                <DashboardOutlined style={{ fontSize:24, color:'#93c5fd' }} />
              </div>
              <div>
                <Title level={isMobile?4:3} style={{ margin:0, color:'#fff', fontWeight:700, lineHeight:1.2 }}>
                  Lead Performance Analytics
                </Title>
              </div>
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <Space wrap style={{ justifyContent: isMobile ? 'flex-start' : 'flex-end', width:'100%' }}>
              <Input placeholder="Search seller..." prefix={<SearchOutlined style={{ color:'#64748b' }} />} value={searchText} onChange={e => setSearchText(e.target.value)} style={{ width:170, borderRadius:10, background:'rgba(255,255,255,.15)', border:'1px solid rgba(255,255,255,.25)' }} allowClear />
              <Tooltip title="Export to Excel"><Button icon={<DownloadOutlined />} onClick={handleExport} style={{ borderRadius:10, background:'rgba(255,255,255,.15)', border:'1px solid rgba(255,255,255,.25)', color:'#fff' }} /></Tooltip>
              <Button icon={<ReloadOutlined />} onClick={() => { fetchSellers(); fetchAllLeads(); fetchDealsStats(); }} loading={loading} type="primary" style={{ borderRadius:10 }}>Refresh</Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* ── Date range filter ── */}
      <div className="filter-bar">
        <FilterOutlined style={{ color:'#9ca3af', fontSize:14 }} />
        <Text style={{ fontSize:12, color:'#6b7280', fontWeight:600 }}>Period:</Text>
        {[['month','This month'],['quarter','This quarter'],['year','This year']].map(([k,l]) => (
          <button key={k} className={`period-btn ${period === k ? 'active' : ''}`} onClick={() => setPeriod(k)}>{l}</button>
        ))}
        <RangePicker size="small" style={{ borderRadius:8, fontSize:12 }} onChange={(dates) => { if (dates) { setCustomRange(dates); setPeriod('custom'); } else setPeriod('month'); }} placeholder={['Start date','End date']} />
        <div style={{ marginLeft:'auto', fontSize:12, color:'#9ca3af' }}>Showing <b style={{color:'#374151'}}>{filteredLeads.length}</b> of {allLeads.length} leads</div>
      </div>

      {/* ── KPI row ── */}
      <Row gutter={[12,12]} style={{ marginBottom:18 }}>
        {[
          { title:'Assigned Leads', value:filteredLeads.filter(l => l.seller_id && l.seller_id !== '').length, icon:<UserOutlined />, colorKey:'blue', type:'assigned' },
          { title:'Own Leads', value:filteredLeads.filter(l => l.createdBy && l.createdBy !== '').length, icon:<PlusOutlined />, colorKey:'green', type:'own' },
          { title:'Unassigned', value:filteredLeads.filter(l => (!l.seller_id || l.seller_id === '') && (!l.createdBy || l.createdBy === '')).length, icon:<WarningOutlined />, colorKey:'yellow', type:'unassigned' },
          { title:'Total Leads', value:filteredLeads.length, icon:<AppstoreOutlined />, colorKey:'purple', type:'all' },
          { title:'Converted', value:filteredLeads.filter(l => l.convertedContactId || l.status === LeadStatus.CONVERTED).length, icon:<LinkOutlined />, colorKey:'green', type:'converted' },
          { title:'Won', value:filteredLeads.filter(l => l.status === LeadStatus.WON || l.status === LeadStatus.CONVERTED).length, icon:<TrophyOutlined />, colorKey:'orange', type:'won' },
        ].map(k => (
          <Col xs={12} sm={4} key={k.title}>
            <KpiCard {...k} loading={loading} onClick={() => handleKpiClick(k.type)} />
          </Col>
        ))}
      </Row>

      {/* ── Status pills ── */}
      <Card className="chart-card" bodyStyle={{ padding:'16px 20px' }} style={{ marginBottom:18 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <Text style={{ fontSize:12, fontWeight:600, color:'#6b7280', marginRight:4 }}>Filter by status:</Text>
          {STATUS_LIST.map(s => {
            const count = s.value === 'all' ? allLeads.length : (globalStatusCounts[s.value] || 0);
            return <StatusPill key={s.value} status={s.value} config={{ color:s.color, text:s.label, icon:s.icon }} count={count} isActive={false} onClick={handleStatusClick} />;
          })}
        </div>
      </Card>

      {/* ── Charts: Pipeline + Status Donut ── */}
      <Row gutter={[12,12]} style={{ marginBottom:18 }}>
        <Col xs={24} md={8}>
          <Card className="chart-card" bodyStyle={{ padding:'18px 20px' }}>
            <div style={{ marginBottom:10 }}>
              <Text style={{ fontWeight:700, fontSize:14, color:'#111827' }}>Conversion Funnel</Text>
            </div>
            <ConversionFunnel leads={allLeads} />
          </Card>
        </Col>
        <Col xs={24} md={16}>
          <Card className="chart-card" bodyStyle={{ padding:'18px 20px' }}>
            <div style={{ marginBottom:14 }}>
              <Text style={{ fontWeight:700, fontSize:14, color:'#111827' }}>Monthly Lead Pipeline</Text>
              <Text type="secondary" style={{ fontSize:11, marginLeft:8 }}>Last 6 months</Text>
            </div>
            <PipelineChart leads={allLeads} />
          </Card>
        </Col>
      </Row>

      {/* ── Sellers table ── */}
      <Card
        title={
          <Space>
            <TeamOutlined style={{ color:'#1890ff' }} />
            <span style={{ fontWeight:700 }}>Sellers Leaderboard</span>
            <Tag style={{ borderRadius:20, background:'#eff6ff', color:'#1890ff', border:'none' }}>{sellers.length} sellers</Tag>
          </Space>
        }
        extra={<Button size="small" icon={<DownloadOutlined />} onClick={handleExport}>Export</Button>}
        style={{ borderRadius:18, boxShadow:'0 2px 10px rgba(0,0,0,.06)', overflow:'hidden' }}
        bodyStyle={{ padding: isMobile ? 10 : 16 }}
      >
        {isMobile ? (
          loading ? <Skeleton active avatar paragraph={{ rows:3 }} /> :
          sellers.map((s, i) => (
            <div key={s.id} className="seller-card" onClick={() => handleViewSeller(s)} style={{ background:'#fff', border:'1px solid #f0f0f0', borderRadius:14, padding:14, marginBottom:10, cursor:'pointer' }}>
              <div style={{ display:'flex', alignItems:'center', marginBottom:10 }}>
                <div style={{ width:38, height:38, borderRadius:10, background: perfBg(s.viewRate), color: perfColor(s.viewRate), display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, marginRight:10, fontSize:15 }}>{s.name.charAt(0).toUpperCase()}</div>
                <div style={{ flex:1 }}><div style={{ fontWeight:600 }}>{i===0?'🥇 ':i===1?'🥈 ':i===2?'🥉 ':''}{s.name}</div><Text type="secondary" style={{ fontSize:11 }}>{s.role}</Text></div>
                <Badge count={s.totalAssigned} showZero color={perfColor(s.viewRate)} />
              </div>
              <Progress percent={s.viewRate} size="small" strokeColor={perfColor(s.viewRate)} trailColor="#f3f4f6" showInfo={false} />
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
                <Text type="secondary" style={{ fontSize:11 }}>Viewed {s.viewedCount}/{s.totalAssigned}</Text>
                <Text type="secondary" style={{ fontSize:11 }}>Won {s.gainCount}</Text>
              </div>
            </div>
          ))
        ) : (
          <Table columns={columns} dataSource={sellers} rowKey="id" loading={loading} pagination={{ pageSize:10, showSizeChanger:true, showTotal:t=>`${t} sellers`, size:'small' }} scroll={{ x:1200 }} size="small" bordered={false} onRow={r => ({ onClick:()=>handleViewSeller(r), style:{ cursor:'pointer' } })} />
        )}
      </Card>

      {/* ── Modals ── */}
      <Modal title={<Space><PieChartOutlined style={{ color:'#1890ff' }} /><span style={{ fontWeight:700 }}>{modalTitle}</span></Space>} open={modalVisible} onCancel={() => setModalVisible(false)} footer={null} width={1100} destroyOnClose>
        <Table columns={modalColumns} dataSource={modalLeads} rowKey="id" size="small" pagination={{ pageSize:10, showSizeChanger:true, showTotal:t=>`${t} leads` }} scroll={{ x:900 }} />
      </Modal>

      {/* ── Seller drawer ── */}
      <Drawer title={<Space><Avatar style={{ background:'#1890ff' }}>{selectedSeller?.name?.charAt(0)}</Avatar><span style={{ fontWeight:700, fontSize:15 }}>{selectedSeller?.name}</span><Tag style={{ borderRadius:16, background:'#eff6ff', color:'#1890ff', border:'none' }}>{selectedSeller?.role}</Tag></Space>} open={drawerVisible} onClose={() => setDrawerVisible(false)} width={isMobile?'100%':1100} placement="right" destroyOnClose>
        {/* Stats row */}
        <Row gutter={[10,10]} style={{ padding:'14px 18px', background:'#f8f9fb', borderBottom:'1px solid #f0f0f0' }}>
          {[
            { label:'Assigned', value:selectedSeller?.totalAssigned, color:'#1890ff' },
            { label:'Own Leads', value:selectedSeller?.ownLeads, color:'#52c41a' },
            { label:'Viewed', value:`${selectedSeller?.viewedCount}/${selectedSeller?.totalAssigned}`, color:perfColor(selectedSeller?.viewRate||0) },
            { label:'View Rate', value:`${selectedSeller?.viewRate}%`, color:perfColor(selectedSeller?.viewRate||0) },
            { label:'Won', value:selectedSeller?.gainCount, color:'#faad14' },
            { label:'Converted', value:selectedSeller?.convertedCount, color:'#722ed1' },
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
          <StatusPill status="all" config={{ color:'#1890ff', text:'All', icon:<AppstoreOutlined /> }} count={selectedSeller ? Object.values(selectedSeller.statusCount||{}).reduce((a,b)=>a+b,0) : 0} isActive={statusFilter==='all'} onClick={() => setStatusFilter('all')} />
          {Object.entries(STATUS_CONFIG).map(([s, cfg]) => (
            <StatusPill key={s} status={s} config={cfg} count={selectedSeller?.statusCount?.[s]||0} isActive={statusFilter===s} onClick={() => setStatusFilter(s)} />
          ))}
        </div>

        {/* Lead type buttons */}
        <div style={{ padding:'10px 18px', borderBottom:'1px solid #f0f0f0', display:'flex', gap:8 }}>
          {[['assigned','Assigned'],['own','Created by seller'],['all','All']].map(([v,l]) => (
            <Button key={v} size="small" type={leadTypeFilter===v?'primary':'default'} style={{ borderRadius:16 }} onClick={() => setLeadTypeFilter(v)}>{l}</Button>
          ))}
        </div>

        <div style={{ padding: isMobile?10:'14px 18px' }}>
          {(leadTypeFilter==='assigned'||leadTypeFilter==='all') && sellerLeads.length > 0 && (
            <>
              <Divider orientation="left" style={{ margin:'0 0 10px', fontSize:13 }}><Space><UserOutlined style={{ color:'#1890ff' }} /><span style={{ fontWeight:600 }}>Assigned Leads</span><Tag style={{ borderRadius:16, background:'#eff6ff', color:'#1890ff', border:'none' }}>{sellerLeads.length}</Tag></Space></Divider>
              <Table size="small" dataSource={sellerLeads} rowKey="id" pagination={{ pageSize:10, size:'small' }} columns={[
                { title:'Lead', dataIndex:'name', render:(v,r)=><div><div style={{fontWeight:600}}>{v}</div><Text type="secondary" style={{fontSize:11}}>{r.email}</Text></div> },
                { title:'Status', dataIndex:'status', render:v=>{const c=STATUS_CONFIG[v];return c?<Tag style={{borderRadius:10,background:`${c.color}15`,color:c.color,border:'none',fontSize:11}}>{c.text}</Tag>:<Tag>{v}</Tag>;} },
                { title:'Converted', dataIndex:'convertedContactId', render:v=>v?<Badge status="success" text="Yes"/>:<Badge status="default" text="No"/> },
                { title:'', render:(_,r)=><Button size="small" icon={<HistoryOutlined/>} onClick={()=>handleViewHistory(r)}>History</Button> },
              ]} />
            </>
          )}

          {(leadTypeFilter==='own'||leadTypeFilter==='all') && sellerOwnLeads.length > 0 && (
            <>
              <Divider orientation="left" style={{ margin:'16px 0 10px', fontSize:13 }}><Space><PlusOutlined style={{ color:'#52c41a' }} /><span style={{ fontWeight:600 }}>Created by Seller</span><Tag style={{ borderRadius:16, background:'#f0fdf4', color:'#52c41a', border:'none' }}>{sellerOwnLeads.length}</Tag></Space></Divider>
              <Table size="small" dataSource={sellerOwnLeads} rowKey="id" pagination={{ pageSize:10, size:'small' }} columns={[
                { title:'Lead', dataIndex:'name', render:(v,r)=><div><div style={{fontWeight:600}}>{v}</div><Text type="secondary" style={{fontSize:11}}>{r.email}</Text></div> },
                { title:'Status', dataIndex:'status', render:v=>{const c=STATUS_CONFIG[v];return c?<Tag style={{borderRadius:10,background:`${c.color}15`,color:c.color,border:'none',fontSize:11}}>{c.text}</Tag>:<Tag>{v}</Tag>;} },
                { title:'Created', dataIndex:'CreationDate', render:d=>d?dayjs(d).format('DD MMM YYYY'):'—' },
                { title:'', render:(_,r)=><Button size="small" icon={<HistoryOutlined/>} onClick={()=>handleViewHistory(r)}>History</Button> },
              ]} />
            </>
          )}
        </div>
      </Drawer>

      {/* ── History modal ── */}
      <Modal title={<Space><HistoryOutlined style={{ color:'#1890ff' }} /><span style={{ fontWeight:700 }}>Lead History: {selectedLead?.name}</span></Space>} open={historyVisible} onCancel={() => { setHistoryVisible(false); setSelectedLead(null); setLeadHistory([]); }} footer={null} width={isMobile?'92%':520} destroyOnClose>
        {leadHistory.length === 0 ? <Empty description="No history found" /> : (
          <Timeline items={leadHistory.map((event, i) => {
            const typeMap = {
              view: { label:'Lead Revealed', color:'#52c41a', dot:<UnlockOutlined /> },
              reveal: { label:'Lead Revealed', color:'#52c41a', dot:<UnlockOutlined /> },
              LEAD_VIEWED: { label:'Lead Viewed', color:'#52c41a', dot:<EyeOutlined /> },
              assign: { label:'Lead Assigned', color:'#1890ff', dot:<UserOutlined /> },
              whatsapp: { label:'WhatsApp Sent', color:'#16a34a', dot:<MailOutlined /> },
              email: { label:'Email Sent', color:'#1890ff', dot:<MailOutlined /> },
              call: { label:'Phone Call', color:'#722ed1', dot:<PhoneOutlined /> },
              note: { label:'Note Added', color:'#6b7280', dot:<FileTextOutlined /> },
              status: { label:'Status Changed', color:'#faad14', dot:<TagOutlined /> },
            };
            const cfg = typeMap[event.type] || typeMap[event.eventType] || { label:'Activity', color:'#6b7280', dot:<ClockCircleOutlined /> };
            const ts = event.createdAt?.toDate?.() || event.createdAt || event.timestamp?.toDate?.();
            return { key: i, color: cfg.color, dot: cfg.dot, children: (
              <div>
                <div style={{ fontWeight:600, fontSize:13 }}>{cfg.label}</div>
                <Text type="secondary" style={{ fontSize:11 }}>{ts ? dayjs(ts).format('YYYY-MM-DD HH:mm:ss') : '—'}</Text>
                {event.message && <div style={{ fontSize:12, marginTop:6, background:'#f8f9fb', padding:'8px 10px', borderRadius:8, whiteSpace:'pre-wrap' }}>{event.message}</div>}
                {event.type === 'call' && <div style={{ fontSize:12, marginTop:4 }}><Tag color={event.outcome==='answered'?'success':'error'}>{event.outcome}</Tag>{event.duration && <span style={{ color:'#6b7280', marginLeft:6 }}>{event.duration}min</span>}</div>}
                <Text type="secondary" style={{ fontSize:11, display:'block', marginTop:4 }}>By: {event.createdBy?.name || event.userId || event.sellerId || 'System'}</Text>
              </div>
            ) };
          })} />
        )}
      </Modal>
    </div>
  );
};

export default LeadsPerformanceAnalytics;