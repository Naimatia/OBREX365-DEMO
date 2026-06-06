// pages/SellerPerformanceAnalytics.js - Complete with LeadMobileCard component
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Tag, Space, Button, Input, Modal,
  message, Tooltip, Typography, Row, Col,
  Statistic, Avatar, Badge, Timeline, Empty, Progress,
  Drawer, Divider, Select, Radio, Alert,
  Skeleton, ConfigProvider, Grid
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
  CalendarOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
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

// Professional Color Palette
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
  lime: '#a0d911',
  gold: '#fadb14',
  volcano: '#fa541c',
  dark: '#1a1a2e',
  gray: '#8c8c8c',
  lightGray: '#f5f5f5'
};

// Status Configuration with gradients
const STATUS_CONFIG = {
  [LeadStatus.PENDING]: { color: COLORS.primary, text: 'Pending', icon: <ClockCircleOutlined />, gradient: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)' },
  [LeadStatus.GAIN]: { color: COLORS.success, text: 'Gain', icon: <TrophyOutlined />, gradient: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)' },
  [LeadStatus.LOSS]: { color: COLORS.error, text: 'Loss', icon: <CloseCircleOutlined />, gradient: 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)' },
  [LeadStatus.NO_RESPONSE]: { color: COLORS.gray, text: 'No Response', icon: <WarningOutlined />, gradient: 'linear-gradient(135deg, #8c8c8c 0%, #595959 100%)' },
  [LeadStatus.NOT_INTERESTED]: { color: COLORS.warning, text: 'Not Interested', icon: <CloseCircleOutlined />, gradient: 'linear-gradient(135deg, #faad14 0%, #d48806 100%)' },
  [LeadStatus.JUNK_LEAD]: { color: COLORS.purple, text: 'Junk', icon: <WarningOutlined />, gradient: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)' },
};

const ALL_STATUSES = [
  { value: 'all', label: 'All Statuses', color: COLORS.primary },
  { value: LeadStatus.PENDING, label: 'Pending', color: COLORS.primary },
  { value: LeadStatus.GAIN, label: 'Gain', color: COLORS.success },
  { value: LeadStatus.LOSS, label: 'Loss', color: COLORS.error },
  { value: LeadStatus.NO_RESPONSE, label: 'No Response', color: COLORS.gray },
  { value: LeadStatus.NOT_INTERESTED, label: 'Not Interested', color: COLORS.warning },
  { value: LeadStatus.JUNK_LEAD, label: 'Junk', color: COLORS.purple },
];

const formatTime = (seconds) => {
  if (!seconds || seconds === 0 || seconds < 0) return '—';
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${(seconds / 86400).toFixed(1)}d`;
};

const getStatusConfig = (status) => {
  return STATUS_CONFIG[status] || { color: COLORS.gray, text: status || 'Unknown', icon: <WarningOutlined /> };
};

// Gradient Statistic Card Component
const GradientStatCard = ({ title, value, suffix, icon, color, gradient, trend, trendValue, loading }) => (
  <Card 
    style={{ 
      borderRadius: 16, 
      background: gradient || `linear-gradient(135deg, ${color}20 0%, ${color}05 100%)`,
      border: `1px solid ${color}30`,
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      overflow: 'hidden'
    }}
    hoverable
    bodyStyle={{ padding: '20px' }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <Text type="secondary" style={{ fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {title}
        </Text>
        <div style={{ fontSize: 32, fontWeight: 700, color: color, marginTop: 8, fontFamily: 'monospace' }}>
          {loading ? <Skeleton.Input active size="small" /> : value}
          {suffix && <span style={{ fontSize: 16, fontWeight: 400, color: COLORS.gray }}> {suffix}</span>}
        </div>
        {trend && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            {trend === 'up' ? <RiseOutlined style={{ color: COLORS.success }} /> : <FallOutlined style={{ color: COLORS.error }} />}
            <Text style={{ color: trend === 'up' ? COLORS.success : COLORS.error, fontSize: 12 }}>
              {trendValue}% from last period
            </Text>
          </div>
        )}
      </div>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {icon}
      </div>
    </div>
  </Card>
);

// Seller Mobile Card Component (Enhanced)
const SellerMobileCard = ({ seller, onViewDetails, rank }) => {
  const viewRate = seller.viewRate || 0;
  const statusEntries = Object.entries(seller.statusCount || {}).filter(([_, count]) => count > 0);
  const rankColor = rank === 1 ? COLORS.gold : rank === 2 ? COLORS.gray : rank === 3 ? COLORS.orange : COLORS.primary;
  
  return (
    <Card 
      style={{ marginBottom: 12, borderRadius: 16, border: `1px solid ${rankColor}30` }}
      bodyStyle={{ padding: 16 }}
      onClick={() => onViewDetails(seller)}
      hoverable
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <Avatar 
          icon={<UserOutlined />} 
          style={{ backgroundColor: rankColor, marginRight: 12 }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            {seller.name}
            {rank === 1 && <CrownOutlined style={{ color: COLORS.gold, fontSize: 16 }} />}
            {rank === 2 && <TrophyOutlined style={{ color: COLORS.gray, fontSize: 14 }} />}
            {rank === 3 && <StarOutlined style={{ color: COLORS.orange, fontSize: 14 }} />}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>{seller.role}</Text>
        </div>
        <Badge count={seller.totalAssigned} showZero color={rankColor} />
      </div>
      
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text type="secondary">View Rate</Text>
          <Text strong style={{ color: COLORS.success }}>{viewRate}%</Text>
        </div>
        <Progress percent={viewRate} size="small" strokeColor={COLORS.success} showInfo={false} />
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <Text type="secondary" style={{ fontSize: 11 }}>Viewed</Text>
          <div style={{ fontWeight: 600, color: COLORS.success }}>{seller.viewedCount}/{seller.totalAssigned}</div>
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <Text type="secondary" style={{ fontSize: 11 }}>Response</Text>
          <div style={{ fontWeight: 600, color: seller.avgResponse <= 7200 ? COLORS.success : COLORS.warning }}>
            {seller.viewedCount > 0 && seller.avgResponse > 0 ? formatTime(seller.avgResponse) : '—'}
          </div>
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <Text type="secondary" style={{ fontSize: 11 }}>Own Leads</Text>
          <div style={{ fontWeight: 600, color: COLORS.primary }}>{seller.ownLeads}</div>
        </div>
      </div>
      
      {statusEntries.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
          {statusEntries.map(([status, count]) => {
            const config = getStatusConfig(status);
            return (
              <Tag key={status} color={config.color} style={{ fontSize: 10, margin: 0, borderRadius: 12 }}>
                {config.text}: {count}
              </Tag>
            );
          })}
        </div>
      )}
    </Card>
  );
};

// Lead Mobile Card Component (FIXED - Added missing component)
const LeadMobileCard = ({ lead, onViewHistory, leadType }) => {
  const config = getStatusConfig(lead.status);
  const isOwnLead = leadType === 'own';
  
  return (
    <Card 
      style={{ marginBottom: 12, borderRadius: 16, background: isOwnLead ? '#f6ffed' : '#fff' }}
      bodyStyle={{ padding: 16 }}
      hoverable
    >
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          {lead.name || 'Unknown'}
          {isOwnLead && (
            <Tag color="green" style={{ marginLeft: 8, fontSize: 10, borderRadius: 12 }}>My Lead</Tag>
          )}
        </div>
        <Text type="secondary" style={{ fontSize: 12 }}>{lead.email}</Text>
        {lead.phoneNumber && !isOwnLead && (
          <div style={{ fontSize: 12, color: COLORS.success, marginTop: 4 }}>
            <PhoneOutlined /> {lead.phoneNumber}
          </div>
        )}
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Tag color={config.color} icon={config.icon} style={{ borderRadius: 16, padding: '2px 12px' }}>
          {config.text}
        </Tag>
        {!isOwnLead && (
          <Badge 
            status={lead.isViewed ? "success" : "warning"} 
            text={lead.isViewed ? "Viewed / Revealed" : "Not Viewed"}
          />
        )}
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        {!isOwnLead && (
          <div>
            <Text type="secondary" style={{ fontSize: 11 }}>Response Time</Text>
            <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>
              {lead.responseTime && lead.responseTime > 0 ? (
                <Tag color={lead.responseTime <= 7200 ? 'success' : 'warning'} style={{ borderRadius: 12 }}>
                  {formatTime(lead.responseTime)}
                </Tag>
              ) : '—'}
            </div>
          </div>
        )}
        <div>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {isOwnLead ? 'Created' : 'Assigned'}
          </Text>
          <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>
            {lead.assignedAt || lead.CreationDate ? 
              dayjs(lead.assignedAt || lead.CreationDate).format('MMM DD') : '—'}
          </div>
        </div>
        <Button 
          size="small" 
          icon={<HistoryOutlined />} 
          onClick={(e) => {
            e.stopPropagation();
            onViewHistory(lead);
          }}
          style={{ borderRadius: 20 }}
        >
          History
        </Button>
      </div>
    </Card>
  );
};

const SellerPerformanceAnalytics = () => {
  const [sellers, setSellers] = useState([]);
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
  
  const user = useSelector(state => state.auth.user);
  const companyId = user?.company_id;
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const getLeadRevealEvent = async (leadId, sellerId) => {
    try {
      const history = await LeadHistoryService.getLeadHistory(leadId);
      const revealEvent = history.find(h => 
        (h.type === 'view' || h.type === 'reveal' || h.eventType === 'LEAD_VIEWED') && 
        (h.sellerId === sellerId || h.userId === sellerId || h.createdBy?.id === sellerId)
      );
      if (revealEvent) return revealEvent;
      
      const q = query(
        collection(db, 'leadHistory'),
        where('leadId', '==', leadId),
        where('userId', '==', sellerId)
      );
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
        
        let viewedCount = 0;
        let totalResponseSeconds = 0;
        let responseCount = 0;
        
        let statusCount = {};
        Object.keys(STATUS_CONFIG).forEach(s => statusCount[s] = 0);
        
        for (const lead of assignedLeads) {
          if (lead.status) statusCount[lead.status] = (statusCount[lead.status] || 0) + 1;
          
          const revealEvent = await getLeadRevealEvent(lead.id, seller.id);
          
          if (revealEvent) {
            viewedCount++;
            
            let assignedAt = null;
            if (lead.assignedAt) {
              assignedAt = lead.assignedAt?.toDate?.() || lead.assignedAt;
            } else if (lead.CreationDate) {
              assignedAt = lead.CreationDate?.toDate?.() || lead.CreationDate;
            }
            
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
        
        const avgResponse = responseCount > 0 ? Math.round(totalResponseSeconds / responseCount) : 0;
        const viewRate = assignedLeads.length > 0 ? Math.round((viewedCount / assignedLeads.length) * 100) : 0;
        
        return {
          id: seller.id,
          name: `${seller.firstname || ''} ${seller.lastname || ''}`.trim() || seller.email,
          role: seller.Role,
          totalAssigned: assignedLeads.length,
          ownLeads: ownLeads.length,
          viewedCount,
          unviewedCount: assignedLeads.length - viewedCount,
          viewRate,
          avgResponse,
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
  }, [fetchSellers]);

  const handleViewSeller = async (seller) => {
    setSelectedSeller(seller);
    setDrawerVisible(true);
    setLeadTypeFilter('assigned');
    setStatusFilter('all');
    
    try {
      const allLeads = await LeadsService.getSellerLeads(companyId, seller.id);
      
      const assignedLeads = allLeads.filter(l => l.seller_id === seller.id && l.createdBy !== seller.id);
      const ownLeads = allLeads.filter(l => l.createdBy === seller.id);
      
      const assignedWithInfo = await Promise.all(assignedLeads.map(async (lead) => {
        const revealEvent = await getLeadRevealEvent(lead.id, seller.id);
        
        let responseTime = null;
        let viewedAt = null;
        let assignedAt = lead.assignedAt?.toDate?.() || lead.assignedAt || null;
        
        if (revealEvent && assignedAt) {
          viewedAt = revealEvent.createdAt?.toDate?.() || revealEvent.createdAt || new Date();
          responseTime = (new Date(viewedAt) - new Date(assignedAt)) / 1000;
        }
        
        return {
          ...lead,
          viewedAt,
          responseTime: responseTime > 0 ? responseTime : null,
          isViewed: !!revealEvent,
          assignedAt,
        };
      }));
      
      const ownWithInfo = ownLeads.map(lead => ({
        ...lead,
        isOwnLead: true,
        assignedAt: lead.CreationDate?.toDate?.() || lead.CreationDate,
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
      console.error('Error loading history:', error);
      message.error('Failed to load history');
      setLeadHistory([]);
    }
  };

  const getFilteredLeads = () => {
    let leads = [...sellerLeads];
    if (statusFilter !== 'all') {
      leads = leads.filter(lead => lead.status === statusFilter);
    }
    return leads;
  };
  
  const getFilteredOwnLeads = () => {
    let leads = [...sellerOwnLeads];
    if (statusFilter !== 'all') {
      leads = leads.filter(lead => lead.status === statusFilter);
    }
    return leads;
  };

  const filteredSellers = sellers.filter(s => 
    s.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const totalAssigned = sellers.reduce((sum, s) => sum + s.totalAssigned, 0);
  const totalViewed = sellers.reduce((sum, s) => sum + s.viewedCount, 0);
  const totalOwnLeads = sellers.reduce((sum, s) => sum + s.ownLeads, 0);
  const overallViewRate = totalAssigned > 0 ? (totalViewed / totalAssigned) * 100 : 0;

  // Desktop columns for sellers
  const columns = [
    {
      title: 'Rank',
      key: 'rank',
      width: 70,
      fixed: 'left',
      render: (_, __, index) => (
        <div style={{ textAlign: 'center' }}>
          {index === 0 ? <CrownOutlined style={{ color: COLORS.gold, fontSize: 20 }} /> :
           index === 1 ? <TrophyOutlined style={{ color: COLORS.gray, fontSize: 18 }} /> :
           index === 2 ? <StarOutlined style={{ color: COLORS.orange, fontSize: 18 }} /> :
           <Text style={{ fontSize: 16, fontWeight: 600 }}>{index + 1}</Text>}
        </div>
      )
    },
    {
      title: 'Seller',
      key: 'seller',
      width: 220,
      render: (_, r) => (
        <Space>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: COLORS.primary }} />
          <div>
            <div style={{ fontWeight: 600 }}>{r.name}</div>
            <Text type="secondary" style={{ fontSize: 11 }}>{r.role}</Text>
          </div>
        </Space>
      )
    },
    {
      title: <span><UserOutlined /> Assigned</span>,
      dataIndex: 'totalAssigned',
      key: 'totalAssigned',
      width: 100,
      sorter: (a, b) => a.totalAssigned - b.totalAssigned,
      render: (v) => <span style={{ fontSize: 18, fontWeight: 600, color: COLORS.primary }}>{v}</span>
    },
    {
      title: <span><PlusOutlined /> Own</span>,
      dataIndex: 'ownLeads',
      key: 'ownLeads',
      width: 100,
      sorter: (a, b) => a.ownLeads - b.ownLeads,
      render: (v) => <span style={{ fontSize: 16, fontWeight: 500, color: COLORS.success }}>{v}</span>
    },
    {
      title: <span><EyeOutlined /> Viewed</span>,
      key: 'viewed',
      width: 160,
      render: (_, r) => (
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.success }}>
            {r.viewedCount} / {r.totalAssigned}
          </div>
          <Progress 
            percent={r.viewRate} 
            size="small" 
            strokeColor={COLORS.success}
            trailColor={`${COLORS.success}20`}
            showInfo={false}
          />
        </div>
      )
    },
    {
      title: <span><HourglassOutlined /> Avg Response</span>,
      key: 'response',
      width: 140,
      render: (_, r) => (
        <Tooltip title={r.viewedCount > 0 && r.avgResponse > 0 ? `Time from assignment to reveal` : 'No responses recorded'}>
          <Tag 
            icon={r.avgResponse <= 7200 ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
            color={r.avgResponse <= 7200 && r.avgResponse > 0 ? 'success' : r.avgResponse > 0 ? 'warning' : 'default'}
            style={{ fontSize: 14, padding: '4px 12px', borderRadius: 20 }}
          >
            {r.viewedCount > 0 && r.avgResponse > 0 ? formatTime(r.avgResponse) : '—'}
          </Tag>
        </Tooltip>
      )
    },
    {
      title: <span><TagOutlined /> Status</span>,
      key: 'status',
      width: 240,
      render: (_, r) => (
        <Space size={4} wrap>
          {Object.entries(r.statusCount || {}).map(([status, count]) => {
            if (count === 0) return null;
            const config = getStatusConfig(status);
            return (
              <Tooltip key={status} title={`${config.text}: ${count} leads`}>
                <Tag color={config.color} style={{ fontSize: 11, borderRadius: 12, cursor: 'pointer' }}>
                  {config.text} ({count})
                </Tag>
              </Tooltip>
            );
          })}
        </Space>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, r) => (
        <Button 
          type="primary" 
          size="small" 
          onClick={() => handleViewSeller(r)}
          icon={<EyeOutlined />}
          style={{ borderRadius: 20 }}
        >
          Details
        </Button>
      )
    }
  ];

  // Desktop lead columns for assigned leads
  const leadColumns = [
    {
      title: 'Lead Information',
      dataIndex: 'name',
      key: 'name',
      width: 240,
      fixed: 'left',
      render: (v, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{v || 'Unknown'}</div>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.email}</Text>
          {r.phoneNumber && <div style={{ fontSize: 11, color: COLORS.success }}><PhoneOutlined /> {r.phoneNumber}</div>}
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (v) => {
        const config = getStatusConfig(v);
        return (
          <Tag color={config.color} icon={config.icon} style={{ borderRadius: 16, padding: '2px 12px' }}>
            {config.text}
          </Tag>
        );
      },
      filters: ALL_STATUSES.filter(s => s.value !== 'all').map(s => ({ text: s.label, value: s.value })),
      onFilter: (value, record) => record.status === value,
    },
    {
      title: <span><EyeOutlined /> View Status</span>,
      key: 'viewed',
      width: 120,
      render: (_, r) => r.isViewed ? (
        <Badge status="success" text="Revealed" style={{ fontSize: 12 }} />
      ) : (
        <Badge status="warning" text="Hidden" style={{ fontSize: 12 }} />
      )
    },
    {
      title: <span><RocketOutlined /> Response Time</span>,
      key: 'response',
      width: 130,
      sorter: (a, b) => (a.responseTime || 0) - (b.responseTime || 0),
      render: (_, r) => {
        if (!r.responseTime || r.responseTime <= 0) return '—';
        const isFast = r.responseTime <= 7200;
        return (
          <Tag 
            icon={isFast ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
            color={isFast ? 'success' : 'warning'}
            style={{ borderRadius: 16 }}
          >
            {formatTime(r.responseTime)}
          </Tag>
        );
      }
    },
    {
      title: <span><CalendarOutlined /> Assigned Date</span>,
      key: 'assigned',
      width: 130,
      sorter: (a, b) => {
        const dateA = a.assignedAt ? new Date(a.assignedAt).getTime() : 0;
        const dateB = b.assignedAt ? new Date(b.assignedAt).getTime() : 0;
        return dateA - dateB;
      },
      render: (_, r) => r.assignedAt ? (
        <Tooltip title={dayjs(r.assignedAt).format('YYYY-MM-DD HH:mm:ss')}>
          {dayjs(r.assignedAt).format('MMM DD, YYYY')}
        </Tooltip>
      ) : '—'
    },
    {
      title: 'Actions',
      key: 'history',
      width: 100,
      fixed: 'right',
      render: (_, r) => (
        <Button 
          size="small" 
          icon={<HistoryOutlined />} 
          onClick={() => handleViewLeadHistory(r)}
          type="link"
        >
          History
        </Button>
      )
    }
  ];

  // Desktop columns for own leads
  const ownLeadColumns = [
    {
      title: 'Lead Information',
      dataIndex: 'name',
      key: 'name',
      width: 240,
      fixed: 'left',
      render: (v, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{v || 'Unknown'}</div>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.email}</Text>
          {r.phoneNumber && <div style={{ fontSize: 11 }}><PhoneOutlined /> {r.phoneNumber}</div>}
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (v) => {
        const config = getStatusConfig(v);
        return (
          <Tag color={config.color} icon={config.icon} style={{ borderRadius: 16, padding: '2px 12px' }}>
            {config.text}
          </Tag>
        );
      },
      filters: ALL_STATUSES.filter(s => s.value !== 'all').map(s => ({ text: s.label, value: s.value })),
      onFilter: (value, record) => record.status === value,
    },
    {
      title: <span><CalendarOutlined /> Created Date</span>,
      key: 'created',
      width: 130,
      sorter: (a, b) => {
        const dateA = a.CreationDate ? new Date(a.CreationDate).getTime() : 0;
        const dateB = b.CreationDate ? new Date(b.CreationDate).getTime() : 0;
        return dateA - dateB;
      },
      render: (_, r) => r.CreationDate ? (
        <Tooltip title={dayjs(r.CreationDate).format('YYYY-MM-DD HH:mm:ss')}>
          {dayjs(r.CreationDate).format('MMM DD, YYYY')}
        </Tooltip>
      ) : '—'
    },
    {
      title: <span><StarOutlined /> Interest</span>,
      dataIndex: 'InterestLevel',
      key: 'interest',
      width: 100,
      render: (level) => {
        const color = level === 'High' ? 'red' : level === 'Medium' ? 'orange' : 'blue';
        return <Tag color={color} style={{ borderRadius: 16 }}>{level || '—'}</Tag>;
      }
    },
    {
      title: <span><DollarOutlined /> Budget</span>,
      dataIndex: 'Budget',
      key: 'budget',
      width: 140,
      render: (budget) => budget ? `AED ${Number(budget).toLocaleString()}` : '—'
    },
    {
      title: 'Actions',
      key: 'history',
      width: 100,
      fixed: 'right',
      render: (_, r) => (
        <Button 
          size="small" 
          icon={<HistoryOutlined />} 
          onClick={() => handleViewLeadHistory(r)}
          type="link"
        >
          History
        </Button>
      )
    }
  ];

  const currentAssignedLeads = getFilteredLeads();
  const currentOwnLeads = getFilteredOwnLeads();

  return (
    <div style={{ padding: isMobile ? 12 : 24, background: COLORS.lightGray, minHeight: '100vh' }}>
      
      {/* Header with Gradient */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        borderRadius: 24,
        padding: isMobile ? 20 : '24px 32px',
        marginBottom: 24,
        color: '#fff',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: `${COLORS.primary}20` }} />
        <div style={{ position: 'absolute', bottom: -80, left: -80, width: 300, height: 300, borderRadius: '50%', background: `${COLORS.purple}20` }} />
        
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} md={16}>
            <Space size={16} align="center">
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: `${COLORS.primary}30`, backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${COLORS.primary}50`
              }}>
                <DashboardOutlined style={{ fontSize: 28, color: COLORS.primary }} />
              </div>
              <div>
                <Title level={isMobile ? 4 : 2} style={{ margin: 0, color: '#fff', fontWeight: 700 }}>
                  Seller Performance Analytics
                </Title>
                <Text style={{ color: '#a0c0e0', fontSize: isMobile ? 13 : 16 }}>
                  Track assigned leads, reveal times, and performance metrics
                </Text>
              </div>
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <Space direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Input
                placeholder="Search seller..."
                prefix={<SearchOutlined style={{ color: COLORS.gray }} />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: isMobile ? '100%' : 220, borderRadius: 12 }}
                allowClear
                size="large"
              />
              <Button 
                icon={<ReloadOutlined />} 
                onClick={fetchSellers} 
                loading={loading}
                style={{ borderRadius: 12, background: COLORS.primary, border: 'none' }}
                type="primary"
                size="large"
              >
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Stats Summary with Gradient Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <GradientStatCard
            title="Total Sellers"
            value={sellers.length}
            icon={<TeamOutlined style={{ fontSize: 24, color: COLORS.primary }} />}
            color={COLORS.primary}
            gradient="linear-gradient(135deg, #1890ff10 0%, #1890ff05 100%)"
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={6}>
          <GradientStatCard
            title="Assigned Leads"
            value={totalAssigned}
            icon={<UserOutlined style={{ fontSize: 24, color: COLORS.cyan }} />}
            color={COLORS.cyan}
            gradient="linear-gradient(135deg, #13c2c210 0%, #13c2c205 100%)"
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={6}>
          <GradientStatCard
            title="Viewed / Revealed"
            value={`${totalViewed}`}
            suffix={`/ ${totalAssigned}`}
            icon={<EyeOutlined style={{ fontSize: 24, color: COLORS.success }} />}
            color={COLORS.success}
            gradient="linear-gradient(135deg, #52c41a10 0%, #52c41a05 100%)"
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={6}>
          <GradientStatCard
            title="Overall View Rate"
            value={overallViewRate.toFixed(1)}
            suffix="%"
            icon={<PercentageOutlined style={{ fontSize: 24, color: COLORS.purple }} />}
            color={COLORS.purple}
            gradient="linear-gradient(135deg, #722ed110 0%, #722ed105 100%)"
            loading={loading}
          />
        </Col>
      </Row>

      {/* Sellers List */}
      <Card 
        title={
          <Space>
            <TeamOutlined style={{ color: COLORS.primary }} />
            <span style={{ fontWeight: 600 }}>Sellers Performance</span>
            <Tag color={COLORS.primary} style={{ borderRadius: 20 }}>{filteredSellers.length} sellers</Tag>
          </Space>
        }
        style={{ borderRadius: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
        bodyStyle={{ padding: isMobile ? 12 : 24 }}
      >
        {isMobile ? (
          <div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Skeleton active avatar paragraph={{ rows: 3 }} />
              </div>
            ) : (
              filteredSellers.map((seller, idx) => (
                <SellerMobileCard 
                  key={seller.id} 
                  seller={seller} 
                  onViewDetails={handleViewSeller}
                  rank={idx + 1}
                />
              ))
            )}
            {!loading && filteredSellers.length === 0 && (
              <Empty description="No sellers found" />
            )}
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={filteredSellers}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} sellers` }}
            scroll={{ x: 1300 }}
            bordered={false}
            className="seller-table"
          />
        )}
      </Card>

      {/* Seller Details Drawer */}
      <Drawer
        title={
          <Space>
            <Avatar icon={<UserOutlined />} style={{ backgroundColor: COLORS.primary }} />
            <span style={{ fontSize: 18, fontWeight: 600 }}>{selectedSeller?.name}</span>
            <Tag color={COLORS.primary} style={{ borderRadius: 20 }}>{selectedSeller?.role}</Tag>
          </Space>
        }
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width={isMobile ? '100%' : 1200}
        placement="right"
        closable
        destroyOnClose
        styles={{ body: { padding: isMobile ? 16 : 24 } }}
      >
        {/* Seller Stats Grid */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} md={6}>
            <Card size="small" style={{ borderRadius: 16, background: `${COLORS.primary}10`, border: `1px solid ${COLORS.primary}20` }}>
              <Statistic 
                title={<span style={{ color: COLORS.primary }}>Assigned Leads</span>}
                value={selectedSeller?.totalAssigned}
                valueStyle={{ color: COLORS.primary, fontSize: 24, fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ borderRadius: 16, background: `${COLORS.success}10`, border: `1px solid ${COLORS.success}20` }}>
              <Statistic 
                title={<span style={{ color: COLORS.success }}>Own Leads</span>}
                value={selectedSeller?.ownLeads}
                valueStyle={{ color: COLORS.success, fontSize: 24, fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ borderRadius: 16, background: `${COLORS.cyan}10`, border: `1px solid ${COLORS.cyan}20` }}>
              <Statistic 
                title={<span style={{ color: COLORS.cyan }}>Viewed / Revealed</span>}
                value={`${selectedSeller?.viewedCount} / ${selectedSeller?.totalAssigned}`}
                valueStyle={{ color: COLORS.cyan, fontSize: 20, fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ borderRadius: 16, background: `${COLORS.purple}10`, border: `1px solid ${COLORS.purple}20` }}>
              <Statistic 
                title={<span style={{ color: COLORS.purple }}>View Rate</span>}
                value={selectedSeller?.viewRate}
                suffix="%"
                valueStyle={{ color: COLORS.purple, fontSize: 24, fontWeight: 700 }}
              />
              <Progress percent={selectedSeller?.viewRate} size="small" strokeColor={COLORS.purple} showInfo={false} />
            </Card>
          </Col>
        </Row>

        {/* Filters Section */}
        <div style={{ marginBottom: 24, padding: 16, background: COLORS.lightGray, borderRadius: 16 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>Lead Type:</Text>
              <Radio.Group 
                value={leadTypeFilter} 
                onChange={(e) => setLeadTypeFilter(e.target.value)}
                buttonStyle="solid"
              >
                <Radio.Button value="assigned">
                  <UserOutlined /> Assigned
                </Radio.Button>
                <Radio.Button value="own">
                  <PlusOutlined /> Created by Seller
                </Radio.Button>
                <Radio.Button value="all">
                  <TeamOutlined /> All Leads
                </Radio.Button>
              </Radio.Group>
            </Col>
            <Col xs={24} md={12}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>Status Filter:</Text>
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: '100%' }}
                allowClear={false}
              >
                {ALL_STATUSES.map(status => (
                  <Option key={status.value} value={status.value}>
                    <Tag color={status.color} style={{ borderRadius: 12 }}>{status.label}</Tag>
                  </Option>
                ))}
              </Select>
            </Col>
          </Row>
        </div>

        {/* Assigned Leads Section */}
        {(leadTypeFilter === 'assigned' || leadTypeFilter === 'all') && sellerLeads.length > 0 && (
          <>
            <Divider orientation="left">
              <Space>
                <UserOutlined style={{ color: COLORS.primary }} />
                <span style={{ fontWeight: 600 }}>Assigned Leads</span>
                <Tag color={COLORS.primary} style={{ borderRadius: 20 }}>{currentAssignedLeads.length} / {sellerLeads.length}</Tag>
              </Space>
            </Divider>
            
            {isMobile ? (
              <div>
                {currentAssignedLeads.map(lead => (
                  <LeadMobileCard 
                    key={lead.id} 
                    lead={lead} 
                    leadType="assigned"
                    onViewHistory={handleViewLeadHistory}
                  />
                ))}
                {currentAssignedLeads.length === 0 && (
                  <Empty description="No assigned leads match the status filter" />
                )}
              </div>
            ) : (
              <Table
                columns={leadColumns}
                dataSource={currentAssignedLeads}
                rowKey="id"
                pagination={{ pageSize: 10, showSizeChanger: true }}
                size="middle"
                scroll={{ x: 1000 }}
                bordered={false}
                className="lead-table"
              />
            )}
          </>
        )}

        {/* Own Leads Section */}
        {(leadTypeFilter === 'own' || leadTypeFilter === 'all') && sellerOwnLeads.length > 0 && (
          <>
            <Divider orientation="left">
              <Space>
                <PlusOutlined style={{ color: COLORS.success }} />
                <span style={{ fontWeight: 600 }}>Leads Created by Seller</span>
                <Tag color={COLORS.success} style={{ borderRadius: 20 }}>{currentOwnLeads.length} / {sellerOwnLeads.length}</Tag>
              </Space>
            </Divider>
            
            {isMobile ? (
              <div>
                {currentOwnLeads.map(lead => (
                  <LeadMobileCard 
                    key={lead.id} 
                    lead={lead} 
                    leadType="own"
                    onViewHistory={handleViewLeadHistory}
                  />
                ))}
                {currentOwnLeads.length === 0 && (
                  <Empty description="No own leads match the status filter" />
                )}
              </div>
            ) : (
              <Table
                columns={ownLeadColumns}
                dataSource={currentOwnLeads}
                rowKey="id"
                pagination={{ pageSize: 10, showSizeChanger: true }}
                size="middle"
                scroll={{ x: 1000 }}
                bordered={false}
                className="lead-table"
              />
            )}
          </>
        )}

        {sellerLeads.length === 0 && sellerOwnLeads.length === 0 && (
          <Empty description="No leads found for this seller" />
        )}
      </Drawer>

      {/* Lead History Modal */}
      <Modal
        title={
          <Space>
            <HistoryOutlined style={{ color: COLORS.primary }} />
            <span style={{ fontWeight: 600 }}>Lead History: {selectedLead?.name}</span>
          </Space>
        }
        open={historyModalVisible}
        onCancel={() => {
          setHistoryModalVisible(false);
          setSelectedLead(null);
          setLeadHistory([]);
        }}
        footer={null}
        width={isMobile ? '90%' : 550}
        destroyOnClose
        styles={{ body: { maxHeight: '60vh', overflowY: 'auto', padding: 24 } }}
      >
        {leadHistory.length === 0 ? (
          <Empty description="No history records found" />
        ) : (
          <Timeline
            items={leadHistory.map((event, idx) => {
              let eventType = 'Activity';
              let eventIcon = <ClockCircleOutlined />;
              let eventColor = COLORS.gray;
              
              if (event.type === 'view' || event.eventType === 'LEAD_VIEWED' || event.type === 'reveal') {
                eventType = 'Lead Revealed / Viewed';
                eventIcon = <UnlockOutlined />;
                eventColor = COLORS.success;
              } else if (event.type === 'assign') {
                eventType = 'Lead Assigned';
                eventIcon = <UserOutlined />;
                eventColor = COLORS.primary;
              } else if (event.type === 'whatsapp') {
                eventType = 'WhatsApp Message Sent';
                eventIcon = <MailOutlined />;
                eventColor = '#25D366';
              } else if (event.type === 'email') {
                eventType = 'Email Sent';
                eventIcon = <MailOutlined />;
                eventColor = COLORS.primary;
              } else if (event.type === 'call') {
                eventType = 'Phone Call';
                eventIcon = <PhoneOutlined />;
                eventColor = COLORS.purple;
              } else if (event.type === 'note') {
                eventType = 'Note Added';
                eventIcon = <FileTextOutlined />;
                eventColor = COLORS.gray;
              } else if (event.type === 'status') {
                eventType = 'Status Changed';
                eventIcon = <TagOutlined />;
                eventColor = COLORS.warning;
              }
              
              return {
                key: idx,
                color: eventColor,
                dot: eventIcon,
                children: (
                  <div>
                    <div style={{ fontWeight: 600 }}>{eventType}</div>
                    <div style={{ fontSize: 12, color: COLORS.gray }}>
                      {dayjs(event.createdAt?.toDate?.() || event.createdAt || event.timestamp?.toDate?.()).format('YYYY-MM-DD HH:mm:ss')}
                    </div>
                    {event.message && (
                      <div style={{ fontSize: 12, marginTop: 8, background: COLORS.lightGray, padding: 8, borderRadius: 8 }}>
                        {event.message}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: COLORS.gray, marginTop: 4 }}>
                      By: {event.createdBy?.name || event.userId || event.sellerId || 'System'}
                    </div>
                  </div>
                )
              };
            })}
          />
        )}
      </Modal>

      <style>{`
        .seller-table .ant-table-thead > tr > th {
          background: ${COLORS.lightGray};
          font-weight: 600;
          border-bottom: 2px solid ${COLORS.primary}20;
        }
        .seller-table .ant-table-tbody > tr:hover > td {
          background: ${COLORS.primary}05;
        }
        .lead-table .ant-table-thead > tr > th {
          background: ${COLORS.lightGray};
          font-weight: 600;
        }
        .lead-table .ant-table-tbody > tr:hover > td {
          background: ${COLORS.primary}05;
        }
      `}</style>
    </div>
  );
};

export default SellerPerformanceAnalytics;