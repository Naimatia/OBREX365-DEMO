// pages/SellerPerformanceAnalytics.js - Complete with Lead Type Filter Cards
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Tag, Space, Button, Input, Modal,
  message, Tooltip, Typography, Row, Col,
  Statistic, Avatar, Badge, Timeline, Empty, Progress,
  Drawer, Divider, Select, Radio, Alert,
  Skeleton, ConfigProvider, Grid, Tabs
} from 'antd';
import {
  UserOutlined, EyeOutlined, ClockCircleOutlined, CheckCircleOutlined,
  CloseCircleOutlined, WarningOutlined, TrophyOutlined,
  ReloadOutlined, SearchOutlined, TeamOutlined, HistoryOutlined,
  MailOutlined, PhoneOutlined, DollarOutlined,
  FilterOutlined, UnlockOutlined, PlusOutlined,
  FileTextOutlined, TagOutlined, RiseOutlined, FallOutlined,
  DashboardOutlined, CrownOutlined, RocketOutlined,
  PercentageOutlined, HourglassOutlined, StarOutlined,
  CalendarOutlined, AppstoreOutlined, BellOutlined,
  PieChartOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import * as XLSX from 'xlsx';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer
} from 'recharts';

import UserService from 'services/firebase/UserService';
import LeadsService from 'services/LeadsService';
import LeadHistoryService from 'services/firebase/LeadHistoryService';
import { UserRoles } from 'models/UserModel';
import { LeadStatus, LeadInterestLevel } from 'models/LeadModel';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from 'configs/FirebaseConfig';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const { Option } = Select;

// ─── Color Palette ───────────────────────────────────────────────────────────
const COLORS = {
  primary: '#1890ff',
  success: '#52c41a',
  warning: '#faad14',
  error: '#ff4d4f',
  purple: '#722ed1',
  cyan: '#13c2c2',
  pink: '#eb2f96',
  orange: '#fa8c16',
  geekblue: '#2f54eb',
  gold: '#fadb14',
  gray: '#8c8c8c',
  lightGray: '#f5f5f5',
  dark: '#0f2044',
};

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  [LeadStatus.PENDING]: { color: COLORS.primary, text: 'Pending', icon: <ClockCircleOutlined />, tagClass: 'tag-pending' },
  [LeadStatus.GAIN]: { color: COLORS.success, text: 'Gain', icon: <TrophyOutlined />, tagClass: 'tag-gain' },
  [LeadStatus.LOSS]: { color: COLORS.error, text: 'Loss', icon: <CloseCircleOutlined />, tagClass: 'tag-loss' },
  [LeadStatus.NO_RESPONSE]: { color: COLORS.gray, text: 'No Response', icon: <BellOutlined />, tagClass: 'tag-noresponse' },
  [LeadStatus.NOT_INTERESTED]: { color: COLORS.warning, text: 'Not Interested', icon: <CloseCircleOutlined />, tagClass: 'tag-notinterested' },
  [LeadStatus.JUNK_LEAD]: { color: COLORS.purple, text: 'Junk', icon: <WarningOutlined />, tagClass: 'tag-junk' },
};

const ALL_STATUSES = [
  { value: 'all', label: 'All', color: COLORS.primary, icon: <AppstoreOutlined /> },
  { value: LeadStatus.PENDING, label: 'Pending', color: COLORS.primary, icon: <ClockCircleOutlined /> },
  { value: LeadStatus.GAIN, label: 'Gain', color: COLORS.success, icon: <TrophyOutlined /> },
  { value: LeadStatus.LOSS, label: 'Loss', color: COLORS.error, icon: <CloseCircleOutlined /> },
  { value: LeadStatus.NO_RESPONSE, label: 'No Response', color: COLORS.gray, icon: <BellOutlined /> },
  { value: LeadStatus.NOT_INTERESTED, label: 'Not Interested', color: COLORS.warning, icon: <CloseCircleOutlined /> },
  { value: LeadStatus.JUNK_LEAD, label: 'Junk', color: COLORS.purple, icon: <WarningOutlined /> },
];

// ─── Chart Colors ─────────────────────────────────────────────────────────────
const CHART_COLORS = [
  COLORS.primary, COLORS.success, COLORS.error, COLORS.warning, COLORS.gray, COLORS.purple, COLORS.cyan
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatTime = (seconds) => {
  if (!seconds || seconds <= 0) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${(seconds / 86400).toFixed(1)}d`;
};

const getStatusConfig = (status) =>
  STATUS_CONFIG[status] || { color: COLORS.gray, text: status || 'Unknown', icon: <WarningOutlined /> };

// ─── Styles ───────────────────────────────────────────────────────────────────
const inlineStyles = `
  .spa-stat-card { position:relative; border-radius:14px!important; overflow:hidden; transition:transform .15s,box-shadow .15s; }
  .spa-stat-card:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(0,0,0,.10)!important; }
  .spa-stat-card::before { content:''; position:absolute; top:0; left:0; right:0; height:4px; }
  .spa-stat-card.blue::before { background:linear-gradient(90deg,#1890ff,#096dd9); }
  .spa-stat-card.cyan::before { background:linear-gradient(90deg,#13c2c2,#006d75); }
  .spa-stat-card.green::before { background:linear-gradient(90deg,#52c41a,#389e0d); }
  .spa-stat-card.purple::before { background:linear-gradient(90deg,#722ed1,#531dab); }

  .spa-status-card { background:#fafafa; border:2px solid #f0f0f0; border-radius:12px; padding:12px 8px; text-align:center; cursor:pointer; transition:all .18s; }
  .spa-status-card:hover { transform:translateY(-2px); box-shadow:0 4px 12px rgba(0,0,0,.08); }
  .spa-status-card.active { background:#fff; border-color:#1890ff; box-shadow:0 2px 8px rgba(24,144,255,.2); }
  .spa-status-card .sc-icon { font-size:20px; margin-bottom:6px; }
  .spa-status-card .sc-count { font-size:22px; font-weight:700; font-family:monospace; }
  .spa-status-card .sc-label { font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:.4px; margin-top:4px; }

  .spa-seller-card { background:#fafafa; border:1.5px solid #f0f0f0; border-radius:14px; padding:14px 16px; margin-bottom:10px; cursor:pointer; transition:all .15s; }
  .spa-seller-card:hover { border-color:#1890ff; transform:translateY(-2px); box-shadow:0 6px 18px rgba(24,144,255,.10); }
  .spa-seller-card.selected { border-color:#1890ff; background:#e6f7ff; }

  .spa-mini-stat { background:#fff; border:1px solid #f0f0f0; border-radius:10px; padding:8px 6px; text-align:center; }
  .spa-mini-stat .val { font-size:14px; font-weight:700; font-family:monospace; }
  .spa-mini-stat .lbl { font-size:9px; color:#8c8c8c; text-transform:uppercase; margin-top:2px; }

  .spa-lead-card { background:#fff; border:1px solid #f0f0f0; border-radius:12px; padding:12px 14px; margin-bottom:8px; transition:box-shadow .15s; cursor:pointer; }
  .spa-lead-card:hover { box-shadow:0 3px 10px rgba(0,0,0,.08); border-color:#1890ff; }

  .tag-pill { display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:600; padding:3px 10px; border-radius:20px; border:1px solid transparent; }
  .tag-pending { background:#e6f4ff; color:#0958d9; border-color:#91caff; }
  .tag-gain { background:#f6ffed; color:#237804; border-color:#b7eb8f; }
  .tag-loss { background:#fff2f0; color:#a8071a; border-color:#ffccc7; }
  .tag-noresponse { background:#f5f5f5; color:#434343; border-color:#d9d9d9; }
  .tag-notinterested { background:#fffbe6; color:#ad4e00; border-color:#ffe58f; }
  .tag-junk { background:#f9f0ff; color:#391085; border-color:#d3adf7; }

  .seller-table .ant-table-thead>tr>th { background:#f8f9fb; font-weight:600; border-bottom:2px solid #e8f0fe; }
  .seller-table .ant-table-tbody>tr:hover>td { background:#e6f4ff20; }
  .lead-table .ant-table-thead>tr>th { background:#f8f9fb; font-weight:600; }
`;

// ─── Stat Card Component ──────────────────────────────────────────────────────
const StatCard = ({ title, value, suffix, icon, colorKey, loading, onClick }) => (
  <Card className={`spa-stat-card ${colorKey}`} bodyStyle={{ padding: '20px' }} onClick={onClick}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>
          {title}
        </Text>
        <div style={{ fontSize: 30, fontWeight: 700, color: COLORS[colorKey === 'blue' ? 'primary' : colorKey === 'green' ? 'success' : colorKey === 'purple' ? 'purple' : 'cyan'], marginTop: 6, fontFamily: 'monospace' }}>
          {loading ? <Skeleton.Input active size="small" /> : value}
          {suffix && <span style={{ fontSize: 15, fontWeight: 400, color: COLORS.gray }}> {suffix}</span>}
        </div>
      </div>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: colorKey === 'blue' ? '#e6f4ff' : colorKey === 'cyan' ? '#e6fffb' : colorKey === 'green' ? '#f6ffed' : '#f9f0ff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        color: colorKey === 'blue' ? COLORS.primary : colorKey === 'cyan' ? COLORS.cyan : colorKey === 'green' ? COLORS.success : COLORS.purple,
      }}>
        {icon}
      </div>
    </div>
  </Card>
);

// ─── Status Filter Card Component ─────────────────────────────────────────────
const StatusFilterCard = ({ status, config, count, isActive, onClick }) => (
  <div
    className={`spa-status-card ${isActive ? 'active' : ''}`}
    style={{ borderColor: isActive ? config?.color : '#f0f0f0' }}
    onClick={() => onClick(status === 'all' ? 'all' : status)}
  >
    <div className="sc-icon" style={{ color: config?.color || COLORS.primary }}>
      {config?.icon || <AppstoreOutlined />}
    </div>
    <div className="sc-count" style={{ color: config?.color || COLORS.primary }}>
      {count}
    </div>
    <div className="sc-label" style={{ color: config?.color || COLORS.primary }}>
      {config?.text || (status === 'all' ? 'All' : status)}
    </div>
  </div>
);

// ─── Pie Chart Component ──────────────────────────────────────────────────────
const StatusPieChart = ({ statusCounts, totalLeads, onSliceClick }) => {
  const chartData = ALL_STATUSES.filter(s => s.value !== 'all').map(status => ({
    name: status.label,
    value: statusCounts[status.value] || 0,
    color: status.color,
    statusValue: status.value
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
          dataKey="value"
          label={({ name, percent }) => percent > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
          labelLine={{ stroke: COLORS.gray, strokeWidth: 1 }}
          onClick={(data) => onSliceClick(data.statusValue)}
          cursor="pointer"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} stroke={COLORS.white} strokeWidth={2} />
          ))}
        </Pie>
        <RechartsTooltip formatter={(value, name) => [`${value} leads`, name]} />
        <Legend verticalAlign="bottom" height={36} />
      </PieChart>
    </ResponsiveContainer>
  );
};

// ─── Seller Card Component ────────────────────────────────────────────────────
const SellerCard = ({ seller, rank, onClick, isSelected }) => {
  const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
  const avatarColors = ['#1890ff', '#722ed1', '#13c2c2', '#52c41a', '#fa8c16', '#eb2f96'];
  const avatarColor = avatarColors[(rank - 1) % avatarColors.length];
  const initials = seller.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className={`spa-seller-card ${isSelected ? 'selected' : ''}`} onClick={() => onClick(seller)}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, background: avatarColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 14, marginRight: 12, flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            {rankIcon && <span>{rankIcon}</span>}
            {seller.name}
          </div>
          <Text type="secondary" style={{ fontSize: 11 }}>{seller.role}</Text>
        </div>
        <Badge count={seller.totalAssigned} showZero color={avatarColor} />
      </div>

      <Row gutter={[8, 8]} style={{ marginBottom: 10 }}>
        <Col span={8}>
          <div className="spa-mini-stat">
            <div className="val" style={{ color: COLORS.primary }}>{seller.totalAssigned}</div>
            <div className="lbl">Assigned</div>
          </div>
        </Col>
        <Col span={8}>
          <div className="spa-mini-stat">
            <div className="val" style={{ color: COLORS.success }}>{seller.viewedCount}/{seller.totalAssigned}</div>
            <div className="lbl">Viewed</div>
          </div>
        </Col>
        <Col span={8}>
          <div className="spa-mini-stat">
            <div className="val" style={{ color: seller.avgResponse <= 7200 ? COLORS.success : COLORS.warning }}>
              {seller.avgResponse > 0 ? formatTime(seller.avgResponse) : '—'}
            </div>
            <div className="lbl">Avg Resp.</div>
          </div>
        </Col>
      </Row>

      <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 10, padding: '8px 10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <Text type="secondary" style={{ fontSize: 11 }}>View Rate</Text>
          <Text style={{ fontSize: 12, fontWeight: 600, color: COLORS.success }}>{seller.viewRate}%</Text>
        </div>
        <Progress percent={seller.viewRate} size="small" strokeColor={{ from: '#52c41a', to: '#73d13d' }} showInfo={false} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10 }}>
        {Object.entries(seller.statusCount || {}).filter(([_, count]) => count > 0).slice(0, 3).map(([status, count]) => {
          const cfg = getStatusConfig(status);
          return (
            <span key={status} className={`tag-pill ${STATUS_CONFIG[status]?.tagClass || ''}`}>
              {cfg.icon} {cfg.text}: {count}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ─── Lead Card Component ──────────────────────────────────────────────────────
const LeadCard = ({ lead, onViewHistory, leadType }) => {
  const config = getStatusConfig(lead.status);
  const isOwnLead = leadType === 'own';

  return (
    <div className="spa-lead-card" onClick={(e) => { e.stopPropagation(); onViewHistory(lead); }}>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          {lead.name || 'Unknown'}
          {isOwnLead && <span className="tag-pill tag-gain" style={{ fontSize: 10 }}>My Lead</span>}
        </div>
        <Text type="secondary" style={{ fontSize: 11 }}>{lead.email}</Text>
        {lead.phoneNumber && !isOwnLead && (
          <div style={{ fontSize: 11, color: COLORS.success, marginTop: 3 }}>
            <PhoneOutlined /> {lead.phoneNumber}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span className={`tag-pill ${config.tagClass || ''}`}>
          {config.icon} {config.text}
        </span>
        {!isOwnLead && (
          <Badge status={lead.isViewed ? 'success' : 'warning'} text={lead.isViewed ? 'Revealed' : 'Hidden'} />
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {!isOwnLead && lead.responseTime > 0 && (
          <Tag color={lead.responseTime <= 7200 ? 'success' : 'warning'} style={{ borderRadius: 12, fontSize: 11 }}>
            {formatTime(lead.responseTime)}
          </Tag>
        )}
        <Text type="secondary" style={{ fontSize: 11 }}>
          {lead.assignedAt || lead.CreationDate ? dayjs(lead.assignedAt || lead.CreationDate).format('MMM DD') : '—'}
        </Text>
        <Button size="small" icon={<HistoryOutlined />} onClick={(e) => { e.stopPropagation(); onViewHistory(lead); }} style={{ borderRadius: 20 }} />
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const SellerPerformanceAnalytics = () => {
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
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [leadTypeFilter, setLeadTypeFilter] = useState('assigned');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modal states
  const [filteredLeadsList, setFilteredLeadsList] = useState([]);
  const [showLeadsModal, setShowLeadsModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [leadTypeModalFilter, setLeadTypeModalFilter] = useState('all');
  const [currentModalStatus, setCurrentModalStatus] = useState('all');

  const user = useSelector(state => state.auth.user);
  const companyId = user?.company_id;
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  // Aggregate status counts across all sellers
  const globalStatusCounts = sellers.reduce((acc, s) => {
    Object.entries(s.statusCount || {}).forEach(([k, v]) => {
      acc[k] = (acc[k] || 0) + v;
    });
    return acc;
  }, {});

  const getLeadRevealEvent = async (leadId, sellerId) => {
    try {
      const history = await LeadHistoryService.getLeadHistory(leadId);
      const revealEvent = history.find(h =>
        (h.type === 'view' || h.type === 'reveal' || h.eventType === 'LEAD_VIEWED') &&
        (h.sellerId === sellerId || h.userId === sellerId || h.createdBy?.id === sellerId)
      );
      if (revealEvent) return revealEvent;
      const q = query(collection(db, 'leadHistory'), where('leadId', '==', leadId), where('userId', '==', sellerId));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        return { createdAt: data.timestamp || data.createdAt };
      }
      const leadDoc = await LeadsService.getLeadById(leadId);
      if (leadDoc?.revealedAt && leadDoc.revealedBy === sellerId) {
        return { createdAt: leadDoc.revealedAt };
      }
      return null;
    } catch (error) {
      console.error('Error getting reveal event:', error);
      return null;
    }
  };

  const fetchAllLeads = useCallback(async () => {
    if (!companyId) return;
    try {
      const allLeadsData = await LeadsService.getCompanyLeads(companyId);
      setAllLeads(allLeadsData);
    } catch (error) {
      console.error('Error fetching all leads:', error);
    }
  }, [companyId]);

  const fetchSellers = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const allUsers = await UserService.getUsersByCompanyId(companyId);
      const salesTeam = allUsers.filter(u =>
        [UserRoles.SELLER, UserRoles.SALES_EXECUTIVE, UserRoles.AGENT].includes(u.Role)
      );

      const sellersWithStats = await Promise.all(salesTeam.map(async (seller) => {
        const allLeads = await LeadsService.getSellerLeads(companyId, seller.id);
        const ownLeads = allLeads.filter(l => l.createdBy === seller.id);
        const assignedLeads = allLeads.filter(l => l.seller_id === seller.id && l.createdBy !== seller.id);
        let viewedCount = 0, totalResponseSeconds = 0, responseCount = 0;
        let statusCount = {};
        Object.keys(STATUS_CONFIG).forEach(s => statusCount[s] = 0);

        for (const lead of assignedLeads) {
          if (lead.status) statusCount[lead.status] = (statusCount[lead.status] || 0) + 1;
          const revealEvent = await getLeadRevealEvent(lead.id, seller.id);
          if (revealEvent) {
            viewedCount++;
            let assignedAt = lead.assignedAt?.toDate?.() || lead.assignedAt || lead.CreationDate?.toDate?.() || lead.CreationDate || null;
            const viewedAt = revealEvent.createdAt?.toDate?.() || revealEvent.createdAt || new Date();
            if (assignedAt) {
              const responseSeconds = (new Date(viewedAt) - new Date(assignedAt)) / 1000;
              if (responseSeconds > 0 && responseSeconds < 2592000) {
                totalResponseSeconds += responseSeconds;
                responseCount++;
              }
            }
          }
        }

        return {
          id: seller.id,
          name: `${seller.firstname || ''} ${seller.lastname || ''}`.trim() || seller.email,
          role: seller.Role,
          totalAssigned: assignedLeads.length,
          ownLeads: ownLeads.length,
          viewedCount,
          viewRate: assignedLeads.length > 0 ? Math.round((viewedCount / assignedLeads.length) * 100) : 0,
          avgResponse: responseCount > 0 ? Math.round(totalResponseSeconds / responseCount) : 0,
          statusCount,
        };
      }));

      setSellers(sellersWithStats.sort((a, b) => b.totalAssigned - a.totalAssigned));
    } catch (error) {
      console.error(error);
      message.error('Failed to load sellers');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchSellers();
    fetchAllLeads();
  }, [fetchSellers, fetchAllLeads]);

  // Helper functions for counts
  const getAssignedLeadsCount = () => {
    return allLeads.filter(l => l.seller_id && l.seller_id !== '' && l.seller_id !== 'unassigned').length;
  };

  const getOwnLeadsCount = () => {
    return allLeads.filter(l => l.createdBy && l.createdBy !== '').length;
  };

  const getUnassignedLeadsCount = () => {
    return allLeads.filter(l => 
      (!l.seller_id || l.seller_id === '' || l.seller_id === 'unassigned') && 
      (!l.createdBy || l.createdBy === '')
    ).length;
  };

  // Handle status filter click - show all leads with that status
  const handleStatusFilterClick = (status) => {
    setCurrentModalStatus(status);
    setLeadTypeModalFilter('all');
    
    let filtered = [];
    if (status === 'all') {
      filtered = allLeads;
      setModalTitle(`All Leads (${filtered.length})`);
    } else {
      filtered = allLeads.filter(lead => lead.status === status);
      const statusConfig = STATUS_CONFIG[status];
      setModalTitle(`${statusConfig?.text || status} Leads (${filtered.length})`);
    }
    setFilteredLeadsList(filtered);
    setShowLeadsModal(true);
  };

  // Handle lead type filter click in modal
  const handleModalTypeFilter = (type) => {
    setLeadTypeModalFilter(type);
    
    let filtered = [];
    
    if (type === 'assigned') {
      filtered = allLeads.filter(l => l.seller_id && l.seller_id !== '' && l.seller_id !== 'unassigned');
    } else if (type === 'own') {
      filtered = allLeads.filter(l => l.createdBy && l.createdBy !== '');
    } else if (type === 'unassigned') {
      filtered = allLeads.filter(l => 
        (!l.seller_id || l.seller_id === '' || l.seller_id === 'unassigned') && 
        (!l.createdBy || l.createdBy === '')
      );
    } else {
      filtered = allLeads;
    }
    
    // Apply status filter if needed
    if (currentModalStatus && currentModalStatus !== 'all') {
      filtered = filtered.filter(lead => lead.status === currentModalStatus);
    }
    
    setFilteredLeadsList(filtered);
    
    // Update modal title
    const typeLabel = type === 'assigned' ? 'Assigned' : type === 'own' ? 'Own' : type === 'unassigned' ? 'Unassigned' : 'All';
    const statusLabel = currentModalStatus !== 'all' ? STATUS_CONFIG[currentModalStatus]?.text || currentModalStatus : '';
    setModalTitle(`${typeLabel} ${statusLabel} Leads (${filtered.length})`);
  };

  const handleViewSeller = async (seller) => {
    setSelectedSeller(seller);
    setDrawerVisible(true);
    setLeadTypeFilter('assigned');
    setStatusFilter('all');

    try {
      const allLeadsData = await LeadsService.getSellerLeads(companyId, seller.id);
      const assignedLeads = allLeadsData.filter(l => l.seller_id === seller.id && l.createdBy !== seller.id);
      const ownLeads = allLeadsData.filter(l => l.createdBy === seller.id);

      const assignedWithInfo = await Promise.all(assignedLeads.map(async (lead) => {
        const revealEvent = await getLeadRevealEvent(lead.id, seller.id);
        let responseTime = null;
        const assignedAt = lead.assignedAt?.toDate?.() || lead.assignedAt || null;
        if (revealEvent && assignedAt) {
          const viewedAt = revealEvent.createdAt?.toDate?.() || revealEvent.createdAt || new Date();
          responseTime = (new Date(viewedAt) - new Date(assignedAt)) / 1000;
        }
        return { ...lead, responseTime: responseTime > 0 ? responseTime : null, isViewed: !!revealEvent, assignedAt };
      }));

      const ownWithInfo = ownLeads.map(lead => ({
        ...lead, isOwnLead: true, assignedAt: lead.CreationDate?.toDate?.() || lead.CreationDate
      }));

      setSellerLeads(assignedWithInfo);
      setSellerOwnLeads(ownWithInfo);
    } catch (error) {
      console.error(error);
      message.error('Failed to load leads');
    }
  };

  const handleViewLeadHistory = async (lead) => {
    setSelectedLead(lead);
    setHistoryModalVisible(true);
    try {
      let history = await LeadHistoryService.getLeadHistory(lead.id);
      const q = query(collection(db, 'leadHistory'), where('leadId', '==', lead.id));
      const snapshot = await getDocs(q);
      snapshot.forEach(doc => {
        history.push({ ...doc.data(), createdAt: doc.data().timestamp?.toDate?.() || doc.data().createdAt });
      });
      setLeadHistory(history.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (error) {
      message.error('Failed to load history');
      setLeadHistory([]);
    }
  };

  const getFilteredLeads = () => statusFilter === 'all' ? sellerLeads : sellerLeads.filter(l => l.status === statusFilter);
  const getFilteredOwnLeads = () => statusFilter === 'all' ? sellerOwnLeads : sellerOwnLeads.filter(l => l.status === statusFilter);

  const filteredSellers = sellers.filter(s => s.name.toLowerCase().includes(searchText.toLowerCase()));

  const totalAssigned = sellers.reduce((sum, s) => sum + s.totalAssigned, 0);
  const totalViewed = sellers.reduce((sum, s) => sum + s.viewedCount, 0);
  const overallViewRate = totalAssigned > 0 ? ((totalViewed / totalAssigned) * 100).toFixed(1) : '0.0';
  const totalLeads = allLeads.length;

  // Desktop seller table columns
  const columns = [
    { title: 'Rank', key: 'rank', width: 70, fixed: 'left', render: (_, __, i) => (
        <div style={{ textAlign: 'center', fontSize: 18 }}>
          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <Text style={{ fontWeight: 700 }}>{i + 1}</Text>}
        </div>
      )
    },
    { title: 'Seller', key: 'seller', width: 220, render: (_, r) => (
        <Space>
          <Avatar icon={<UserOutlined />} style={{ background: COLORS.primary }} />
          <div>
            <div style={{ fontWeight: 600 }}>{r.name}</div>
            <Text type="secondary" style={{ fontSize: 11 }}>{r.role}</Text>
          </div>
        </Space>
      )
    },
    { title: <span><UserOutlined /> Assigned</span>, dataIndex: 'totalAssigned', width: 100, sorter: (a, b) => a.totalAssigned - b.totalAssigned,
      render: v => <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.primary, fontFamily: 'monospace' }}>{v}</span>
    },
    { title: <span><PlusOutlined /> Own</span>, dataIndex: 'ownLeads', width: 90, sorter: (a, b) => a.ownLeads - b.ownLeads,
      render: v => <span style={{ fontSize: 16, fontWeight: 600, color: COLORS.success, fontFamily: 'monospace' }}>{v}</span>
    },
    { title: <span><EyeOutlined /> Viewed</span>, key: 'viewed', width: 160, render: (_, r) => (
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.success, fontFamily: 'monospace' }}>{r.viewedCount} / {r.totalAssigned}</div>
          <Progress percent={r.viewRate} size="small" strokeColor={{ from: '#52c41a', to: '#73d13d' }} showInfo={false} />
        </div>
      )
    },
    { title: <span><HourglassOutlined /> Avg Response</span>, key: 'response', width: 140, render: (_, r) => (
        <Tag color={r.avgResponse <= 7200 && r.avgResponse > 0 ? 'success' : r.avgResponse > 0 ? 'warning' : 'default'}
          style={{ fontSize: 13, padding: '4px 12px', borderRadius: 20 }}>
          {r.avgResponse > 0 ? formatTime(r.avgResponse) : '—'}
        </Tag>
      )
    },
    { title: 'Actions', key: 'actions', width: 100, fixed: 'right', render: (_, r) => (
        <Button type="primary" size="small" onClick={() => handleViewSeller(r)} icon={<EyeOutlined />} style={{ borderRadius: 20 }}>Details</Button>
      )
    }
  ];

  // Lead columns for modal
  const modalLeadColumns = [
    { title: 'Name', dataIndex: 'name', width: 200, render: (v, r) => <div><div style={{ fontWeight: 600 }}>{v || 'Unknown'}</div><Text type="secondary" style={{ fontSize: 11 }}>{r.email}</Text></div> },
    { title: 'Phone', dataIndex: 'phoneNumber', width: 120, render: v => v || '—' },
    { title: 'Region', dataIndex: 'region', width: 100, render: v => v || '—' },
    { title: 'Status', dataIndex: 'status', width: 120, render: v => {
        const cfg = getStatusConfig(v);
        return <span className={`tag-pill ${STATUS_CONFIG[v]?.tagClass || ''}`}>{cfg.text}</span>;
      }
    },
    { title: 'Interest', dataIndex: 'InterestLevel', width: 100, render: level => {
        const color = level === 'High' ? 'red' : level === 'Medium' ? 'orange' : 'blue';
        return <Tag color={color}>{level || '—'}</Tag>;
      }
    },
    { title: 'Seller', dataIndex: 'seller_id', width: 150, render: (v, r) => {
        const seller = sellers.find(s => s.id === v);
        return seller?.name || 'Unassigned';
      }
    },
    { title: 'Created', dataIndex: 'CreationDate', width: 110, render: date => date ? dayjs(date).format('DD MMM YYYY') : '—' },
    { title: 'Actions', key: 'history', width: 80, render: (_, r) => (
        <Button size="small" icon={<HistoryOutlined />} onClick={() => handleViewLeadHistory(r)} type="link">History</Button>
      )
    }
  ];

  const currentAssignedLeads = getFilteredLeads();
  const currentOwnLeads = getFilteredOwnLeads();
  const drawerStatusCounts = selectedSeller?.statusCount || {};
  const drawerTotalLeads = Object.values(drawerStatusCounts).reduce((a, b) => a + b, 0);

  // ─── Assigned lead columns ─────────────────────────────────────────────────
  const leadColumns = [
    {
      title: 'Lead', dataIndex: 'name', key: 'name', width: 220, fixed: 'left',
      render: (v, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{v || 'Unknown'}</div>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.email}</Text>
          {r.phoneNumber && <div style={{ fontSize: 11, color: COLORS.success }}><PhoneOutlined /> {r.phoneNumber}</div>}
        </div>
      )
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 140,
      render: v => <span className={`tag-pill ${STATUS_CONFIG[v]?.tagClass || ''}`}>{getStatusConfig(v).icon} {getStatusConfig(v).text}</span>,
      filters: ALL_STATUSES.filter(s => s.value !== 'all').map(s => ({ text: s.label, value: s.value })),
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Reveal Status', key: 'viewed', width: 130,
      render: (_, r) => r.isViewed
        ? <Badge status="success" text={<Text style={{ fontSize: 12 }}>Revealed</Text>} />
        : <Badge status="warning" text={<Text style={{ fontSize: 12 }}>Hidden</Text>} />
    },
    {
      title: 'Response Time', key: 'response', width: 130, sorter: (a, b) => (a.responseTime || 0) - (b.responseTime || 0),
      render: (_, r) => {
        if (!r.responseTime || r.responseTime <= 0) return '—';
        return (
          <Tag icon={r.responseTime <= 7200 ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
            color={r.responseTime <= 7200 ? 'success' : 'warning'} style={{ borderRadius: 16 }}>
            {formatTime(r.responseTime)}
          </Tag>
        );
      }
    },
    {
      title: 'Assigned Date', key: 'assigned', width: 130,
      sorter: (a, b) => (a.assignedAt ? new Date(a.assignedAt) : 0) - (b.assignedAt ? new Date(b.assignedAt) : 0),
      render: (_, r) => r.assignedAt
        ? <Tooltip title={dayjs(r.assignedAt).format('YYYY-MM-DD HH:mm:ss')}>{dayjs(r.assignedAt).format('MMM DD, YYYY')}</Tooltip>
        : '—'
    },
    {
      title: 'Actions', key: 'history', width: 100, fixed: 'right',
      render: (_, r) => <Button size="small" icon={<HistoryOutlined />} onClick={() => handleViewLeadHistory(r)} type="link">History</Button>
    }
  ];

  // ─── Own lead columns ──────────────────────────────────────────────────────
  const ownLeadColumns = [
    {
      title: 'Lead', dataIndex: 'name', key: 'name', width: 220, fixed: 'left',
      render: (v, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{v || 'Unknown'}</div>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.email}</Text>
        </div>
      )
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 140,
      render: v => <span className={`tag-pill ${STATUS_CONFIG[v]?.tagClass || ''}`}>{getStatusConfig(v).icon} {getStatusConfig(v).text}</span>,
      filters: ALL_STATUSES.filter(s => s.value !== 'all').map(s => ({ text: s.label, value: s.value })),
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Created Date', key: 'created', width: 130,
      render: (_, r) => r.CreationDate
        ? <Tooltip title={dayjs(r.CreationDate).format('YYYY-MM-DD HH:mm:ss')}>{dayjs(r.CreationDate).format('MMM DD, YYYY')}</Tooltip>
        : '—'
    },
    {
      title: 'Interest', dataIndex: 'InterestLevel', key: 'interest', width: 100,
      render: level => {
        const color = level === 'High' ? 'red' : level === 'Medium' ? 'orange' : 'blue';
        return <Tag color={color} style={{ borderRadius: 16 }}>{level || '—'}</Tag>;
      }
    },
    {
      title: 'Budget', dataIndex: 'Budget', key: 'budget', width: 140,
      render: budget => budget ? `AED ${Number(budget).toLocaleString()}` : '—'
    },
    {
      title: 'Actions', key: 'history', width: 100, fixed: 'right',
      render: (_, r) => <Button size="small" icon={<HistoryOutlined />} onClick={() => handleViewLeadHistory(r)} type="link">History</Button>
    }
  ];

  return (
    <div style={{ padding: isMobile ? 12 : 24, background: '#f0f2f5', minHeight: '100vh' }}>
      <style>{inlineStyles}</style>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f2044 0%, #1a3a6b 55%, #1e4d8c 100%)',
        borderRadius: 20, padding: isMobile ? '20px 18px' : '22px 32px',
        marginBottom: 20, color: '#fff', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: '#1890ff18' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -80, width: 280, height: 280, borderRadius: '50%', background: '#722ed118' }} />
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} md={16}>
            <Space size={16} align="center">
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: '#1890ff28', backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid #1890ff44',
              }}>
                <DashboardOutlined style={{ fontSize: 26, color: '#60b8ff' }} />
              </div>
              <div>
                <Title level={isMobile ? 4 : 2} style={{ margin: 0, color: '#fff', fontWeight: 700 }}>
                  Seller Performance Analytics
                </Title>
                <Text style={{ color: '#a8c8e8', fontSize: isMobile ? 12 : 14 }}>
                  Track assigned leads, reveal times & performance metrics
                </Text>
              </div>
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <Space direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Input
                placeholder="Search seller..."
                prefix={<SearchOutlined style={{ color: '#8ca8c8' }} />}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                style={{ width: isMobile ? '100%' : 200, borderRadius: 10, background: '#ffffff18', border: '1px solid #ffffff30', color: '#fff' }}
                allowClear size="large"
              />
              <Button icon={<ReloadOutlined />} onClick={() => { fetchSellers(); fetchAllLeads(); }} loading={loading}
                type="primary" size="large" style={{ borderRadius: 10 }}>
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Stat Cards */}
      <Row gutter={[14, 14]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}><StatCard title="Total Sellers" value={sellers.length} icon={<TeamOutlined />} colorKey="blue" loading={loading} /></Col>
        <Col xs={12} sm={6}><StatCard title="Assigned Leads" value={totalAssigned} icon={<UserOutlined />} colorKey="cyan" loading={loading} /></Col>
        <Col xs={12} sm={6}><StatCard title="Viewed / Revealed" value={totalViewed} suffix={`/ ${totalAssigned}`} icon={<EyeOutlined />} colorKey="green" loading={loading} /></Col>
        <Col xs={12} sm={6}><StatCard title="Overall View Rate" value={overallViewRate} suffix="%" icon={<PercentageOutlined />} colorKey="purple" loading={loading} /></Col>
      </Row>

      {/* Pie Chart Row */}
      <Card className="spa-stat-card blue" style={{ marginBottom: 20, borderRadius: 16 }}>
        <div style={{ padding: '0 0 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <Space>
            <PieChartOutlined style={{ fontSize: 20, color: COLORS.primary }} />
            <span style={{ fontWeight: 600, fontSize: 16 }}>Lead Status Distribution</span>
            <Tag color={COLORS.primary} style={{ borderRadius: 20 }}>{totalLeads} Total Leads</Tag>
          </Space>
        </div>
        <StatusPieChart statusCounts={globalStatusCounts} totalLeads={totalLeads} onSliceClick={handleStatusFilterClick} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 16 }}>
          {ALL_STATUSES.filter(s => s.value !== 'all').map(status => {
            const count = globalStatusCounts[status.value] || 0;
            const config = STATUS_CONFIG[status.value];
            if (!config) return null;
            return (
              <div key={status.value} style={{ textAlign: 'center', minWidth: 80, padding: 8, background: `${config.color}10`, borderRadius: 10, cursor: 'pointer' }} onClick={() => handleStatusFilterClick(status.value)}>
                <div style={{ fontSize: 20, fontWeight: 700, color: config.color }}>{count}</div>
                <div style={{ fontSize: 11, color: config.color }}>{config.text}</div>
                <Progress percent={totalLeads ? (count / totalLeads) * 100 : 0} size="small" strokeColor={config.color} showInfo={false} />
              </div>
            );
          })}
        </div>
      </Card>

      {/* Sellers List */}
      <Card
        title={<Space><TeamOutlined style={{ color: COLORS.primary }} /><span style={{ fontWeight: 600 }}>Sellers Performance</span><Tag color={COLORS.primary} style={{ borderRadius: 20 }}>{filteredSellers.length} sellers</Tag></Space>}
        style={{ borderRadius: 20, boxShadow: '0 2px 12px rgba(0,0,0,.06)', overflow: 'hidden' }}
        bodyStyle={{ padding: 0 }}
      >
        <div style={{ padding: isMobile ? 12 : 20 }}>
          {isMobile ? (
            loading ? <Skeleton active avatar paragraph={{ rows: 3 }} />
              : filteredSellers.length > 0 ? filteredSellers.map((seller, idx) => (
                  <SellerCard key={seller.id} seller={seller} rank={idx + 1} onClick={handleViewSeller} isSelected={selectedSeller?.id === seller.id} />
                )) : <Empty description="No sellers found" />
          ) : (
            <Table columns={columns} dataSource={filteredSellers} rowKey="id" loading={loading}
              pagination={{ pageSize: 10, showSizeChanger: true, showTotal: total => `Total ${total} sellers` }}
              scroll={{ x: 1300 }} className="seller-table" bordered={false}
              onRow={(record) => ({
                onClick: () => handleViewSeller(record),
                style: { cursor: 'pointer' }
              })}
            />
          )}
        </div>
      </Card>

      {/* Leads Modal - Shows when clicking on status filter */}
      <Modal
        title={<Space><PieChartOutlined style={{ color: COLORS.primary }} /><span>{modalTitle}</span></Space>}
        open={showLeadsModal}
        onCancel={() => setShowLeadsModal(false)}
        footer={null}
        width={1200}
        destroyOnClose
      >
        {/* Lead Type Filter Cards */}
        <div style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {/* Assigned Leads Card */}
          <div 
            className={`spa-status-card ${leadTypeModalFilter === 'assigned' ? 'active' : ''}`}
            style={{ 
              flex: 1, minWidth: 120, padding: '16px 12px',
              borderColor: leadTypeModalFilter === 'assigned' ? COLORS.primary : '#f0f0f0',
              cursor: 'pointer'
            }}
            onClick={() => handleModalTypeFilter('assigned')}
          >
            <div className="sc-icon" style={{ color: COLORS.primary, fontSize: 24 }}>
              <UserOutlined />
            </div>
            <div className="sc-count" style={{ color: COLORS.primary, fontSize: 24 }}>
              {getAssignedLeadsCount()}
            </div>
            <div className="sc-label" style={{ color: COLORS.primary }}>Assigned</div>
          </div>

          {/* Own Leads Card (Created by Seller) */}
          <div 
            className={`spa-status-card ${leadTypeModalFilter === 'own' ? 'active' : ''}`}
            style={{ 
              flex: 1, minWidth: 120, padding: '16px 12px',
              borderColor: leadTypeModalFilter === 'own' ? COLORS.success : '#f0f0f0',
              cursor: 'pointer'
            }}
            onClick={() => handleModalTypeFilter('own')}
          >
            <div className="sc-icon" style={{ color: COLORS.success, fontSize: 24 }}>
              <PlusOutlined />
            </div>
            <div className="sc-count" style={{ color: COLORS.success, fontSize: 24 }}>
              {getOwnLeadsCount()}
            </div>
            <div className="sc-label" style={{ color: COLORS.success }}>Own (Created)</div>
          </div>

          {/* Unassigned Leads Card */}
          <div 
            className={`spa-status-card ${leadTypeModalFilter === 'unassigned' ? 'active' : ''}`}
            style={{ 
              flex: 1, minWidth: 120, padding: '16px 12px',
              borderColor: leadTypeModalFilter === 'unassigned' ? COLORS.warning : '#f0f0f0',
              cursor: 'pointer'
            }}
            onClick={() => handleModalTypeFilter('unassigned')}
          >
            <div className="sc-icon" style={{ color: COLORS.warning, fontSize: 24 }}>
              <WarningOutlined />
            </div>
            <div className="sc-count" style={{ color: COLORS.warning, fontSize: 24 }}>
              {getUnassignedLeadsCount()}
            </div>
            <div className="sc-label" style={{ color: COLORS.warning }}>Unassigned</div>
          </div>

          {/* All Leads Card */}
          <div 
            className={`spa-status-card ${leadTypeModalFilter === 'all' ? 'active' : ''}`}
            style={{ 
              flex: 1, minWidth: 120, padding: '16px 12px',
              borderColor: leadTypeModalFilter === 'all' ? COLORS.purple : '#f0f0f0',
              cursor: 'pointer'
            }}
            onClick={() => handleModalTypeFilter('all')}
          >
            <div className="sc-icon" style={{ color: COLORS.purple, fontSize: 24 }}>
              <AppstoreOutlined />
            </div>
            <div className="sc-count" style={{ color: COLORS.purple, fontSize: 24 }}>
              {allLeads.length}
            </div>
            <div className="sc-label" style={{ color: COLORS.purple }}>All Leads</div>
          </div>
        </div>

        {/* Reset Filter Button */}
        {leadTypeModalFilter !== 'all' && (
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Button size="small" onClick={() => handleModalTypeFilter('all')} style={{ borderRadius: 20 }}>
              Clear Filter
            </Button>
          </div>
        )}

        <Table
          columns={modalLeadColumns}
          dataSource={filteredLeadsList}
          rowKey="id"
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: total => `Total ${total} leads` }}
          scroll={{ x: 1000 }}
        />
      </Modal>

      {/* Seller Detail Drawer */}
      <Drawer
        title={<Space><Avatar icon={<UserOutlined />} style={{ background: COLORS.primary }} /><span style={{ fontSize: 16, fontWeight: 600 }}>{selectedSeller?.name}</span><Tag color={COLORS.primary} style={{ borderRadius: 20 }}>{selectedSeller?.role}</Tag></Space>}
        open={drawerVisible} onClose={() => setDrawerVisible(false)} width={isMobile ? '100%' : 1200}
        placement="right" closable destroyOnClose className="spa-drawer" styles={{ body: { padding: 0 } }}
      >
        {/* Drawer Stats */}
        <Row gutter={[12, 12]} style={{ padding: '16px 20px', background: '#f8f9fb', borderBottom: '1px solid #f0f0f0' }}>
          {[
            { label: 'Assigned Leads', value: selectedSeller?.totalAssigned, colorKey: 'blue' },
            { label: 'Own Leads', value: selectedSeller?.ownLeads, colorKey: 'green' },
            { label: 'Viewed/Revealed', value: `${selectedSeller?.viewedCount}/${selectedSeller?.totalAssigned}`, colorKey: 'cyan' },
            { label: 'View Rate', value: `${selectedSeller?.viewRate}%`, colorKey: 'purple' },
          ].map(item => (
            <Col xs={12} md={6} key={item.label}>
              <StatCard title={item.label} value={item.value} colorKey={item.colorKey} loading={false} />
            </Col>
          ))}
        </Row>

        {/* Drawer Status Filter Cards */}
        <div style={{ padding: '12px 20px', background: '#f8f9fb', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            <StatusFilterCard
              status="all"
              config={{ color: COLORS.primary, text: 'All', icon: <AppstoreOutlined /> }}
              count={drawerTotalLeads}
              isActive={statusFilter === 'all'}
              onClick={() => setStatusFilter('all')}
            />
            {Object.entries(STATUS_CONFIG).map(([status, config]) => (
              <StatusFilterCard
                key={status}
                status={status}
                config={config}
                count={drawerStatusCounts[status] || 0}
                isActive={statusFilter === status}
                onClick={() => setStatusFilter(status)}
              />
            ))}
          </div>
        </div>

        {/* Lead Type Tabs */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: 8 }}>
          {[['assigned', 'Assigned Leads'], ['own', 'Created by Seller'], ['all', 'All Leads']].map(([val, label]) => (
            <Button key={val} type={leadTypeFilter === val ? 'primary' : 'default'} size="small" onClick={() => setLeadTypeFilter(val)} style={{ borderRadius: 20 }}>
              {label}
            </Button>
          ))}
        </div>

        <div style={{ padding: isMobile ? '12px' : '16px 20px' }}>
          {/* Assigned Leads */}
          {(leadTypeFilter === 'assigned' || leadTypeFilter === 'all') && sellerLeads.length > 0 && (
            <>
              <Divider orientation="left" style={{ margin: '0 0 12px' }}>
                <Space><UserOutlined style={{ color: COLORS.primary }} /><span style={{ fontWeight: 600 }}>Assigned Leads</span><Tag color={COLORS.primary} style={{ borderRadius: 20 }}>{currentAssignedLeads.length} / {sellerLeads.length}</Tag></Space>
              </Divider>
              {isMobile ? currentAssignedLeads.map(lead => <LeadCard key={lead.id} lead={lead} leadType="assigned" onViewHistory={handleViewLeadHistory} />)
                : <Table columns={leadColumns} dataSource={currentAssignedLeads} rowKey="id" pagination={{ pageSize: 10, showSizeChanger: true }} size="middle" scroll={{ x: 1000 }} className="lead-table" bordered={false} />}
              {currentAssignedLeads.length === 0 && <Empty description="No leads match the status filter" />}
            </>
          )}

          {/* Own Leads */}
          {(leadTypeFilter === 'own' || leadTypeFilter === 'all') && sellerOwnLeads.length > 0 && (
            <>
              <Divider orientation="left" style={{ margin: '16px 0 12px' }}>
                <Space><PlusOutlined style={{ color: COLORS.success }} /><span style={{ fontWeight: 600 }}>Leads Created by Seller</span><Tag color={COLORS.success} style={{ borderRadius: 20 }}>{currentOwnLeads.length} / {sellerOwnLeads.length}</Tag></Space>
              </Divider>
              {isMobile ? currentOwnLeads.map(lead => <LeadCard key={lead.id} lead={lead} leadType="own" onViewHistory={handleViewLeadHistory} />)
                : <Table columns={ownLeadColumns} dataSource={currentOwnLeads} rowKey="id" pagination={{ pageSize: 10, showSizeChanger: true }} size="middle" scroll={{ x: 1000 }} className="lead-table" bordered={false} />}
              {currentOwnLeads.length === 0 && <Empty description="No leads match the status filter" />}
            </>
          )}

          {sellerLeads.length === 0 && sellerOwnLeads.length === 0 && <Empty description="No leads found for this seller" />}
        </div>
      </Drawer>

      {/* Lead History Modal */}
      <Modal
        title={<Space><HistoryOutlined style={{ color: COLORS.primary }} /><span style={{ fontWeight: 600 }}>Lead History: {selectedLead?.name}</span></Space>}
        open={historyModalVisible} onCancel={() => { setHistoryModalVisible(false); setSelectedLead(null); setLeadHistory([]); }}
        footer={null} width={isMobile ? '90%' : 550} destroyOnClose
        styles={{ body: { maxHeight: '60vh', overflowY: 'auto', padding: 24 } }}
      >
        {leadHistory.length === 0 ? <Empty description="No history records found" />
          : <Timeline items={leadHistory.map((event, idx) => {
              let eventType = 'Activity', eventColor = COLORS.gray, eventIcon = <ClockCircleOutlined />;
              if (event.type === 'view' || event.eventType === 'LEAD_VIEWED' || event.type === 'reveal') {
                eventType = 'Lead Revealed / Viewed'; eventIcon = <UnlockOutlined />; eventColor = COLORS.success;
              } else if (event.type === 'assign') {
                eventType = 'Lead Assigned'; eventIcon = <UserOutlined />; eventColor = COLORS.primary;
              } else if (event.type === 'whatsapp') {
                eventType = 'WhatsApp Sent'; eventIcon = <MailOutlined />; eventColor = '#25D366';
              } else if (event.type === 'email') {
                eventType = 'Email Sent'; eventIcon = <MailOutlined />; eventColor = COLORS.primary;
              } else if (event.type === 'call') {
                eventType = 'Phone Call'; eventIcon = <PhoneOutlined />; eventColor = COLORS.purple;
              } else if (event.type === 'note') {
                eventType = 'Note Added'; eventIcon = <FileTextOutlined />; eventColor = COLORS.gray;
              } else if (event.type === 'status') {
                eventType = 'Status Changed'; eventIcon = <TagOutlined />; eventColor = COLORS.warning;
              }
              return {
                key: idx, color: eventColor, dot: eventIcon,
                children: (
                  <div>
                    <div style={{ fontWeight: 600 }}>{eventType}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(event.createdAt?.toDate?.() || event.createdAt || event.timestamp?.toDate?.()).format('YYYY-MM-DD HH:mm:ss')}
                    </Text>
                    {event.message && <div style={{ fontSize: 12, marginTop: 6, background: '#f8f9fb', padding: 8, borderRadius: 8 }}>{event.message}</div>}
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>By: {event.createdBy?.name || event.userId || event.sellerId || 'System'}</Text>
                  </div>
                )
              };
            })}
          />
        }
      </Modal>
    </div>
  );
};

export default SellerPerformanceAnalytics;