// pages/dashboard/UnifiedPipelineDashboard/index.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Row, Col, Card, Typography, Spin, Alert, Button, Space, Tag,
  Divider, Select, DatePicker, message, Statistic, Progress,
  Modal, List, Avatar, Input, Drawer, Tabs,
  Empty, Skeleton, Tooltip, Badge, Grid
} from 'antd';
import {
  DashboardOutlined, TeamOutlined, DollarOutlined, CalendarOutlined,
  ReloadOutlined, FileExcelOutlined, UserOutlined, CheckCircleOutlined,
  ClockCircleOutlined, PercentageOutlined,
  WarningOutlined, TrophyOutlined, RiseOutlined,
  FallOutlined, FilterOutlined,
  ExportOutlined, AppstoreOutlined,
  UnorderedListOutlined, HeatMapOutlined, FireOutlined,
  StarOutlined, HeartOutlined, FrownOutlined,
  DeleteOutlined, EditOutlined, UserAddOutlined, SolutionOutlined,
  TagOutlined, EyeOutlined, PhoneOutlined, MailOutlined,
  GlobalOutlined, EnvironmentOutlined, BankOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
  ComposedChart, AreaChart, Area, Legend
} from 'recharts';

// Services
import LeadService from 'services/firebase/LeadService';
import ContactService from 'services/firebase/ContactService';
import dealService from 'services/firebase/DealService';
import UserService from 'services/firebase/UserService';

// Models
import { LeadStatus, LeadStatusLabels, LeadStatusColors } from 'models/LeadModel';
import { ContactStatus, ContactStatusLabels, ContactStatusColors } from 'models/ContactModel';
import { DealStatus, DealStatusLabels, DealStatusColors } from 'models/DealModel';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { useBreakpoint } = Grid;

// ===== Color Palette =====
const COLORS = {
  primary: '#4F46E5',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  purple: '#8B5CF6',
  cyan: '#06B6D4',
  pink: '#EC4899',
  orange: '#F97316',
  blue: '#3B82F6',
  indigo: '#6366F1',
  teal: '#14B8A6',
  rose: '#F43F5E',
  gray: '#6B7280',
  gold: '#F59E0B',
  lime: '#84CC16',
  sky: '#0EA5E9',
  violet: '#8B5CF6',
  emerald: '#10B981',
  red: '#EF4444',
  amber: '#F59E0B'
};

// ===== Chart Colors =====
const CHART_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#F97316', '#3B82F6', '#14B8A6'];

// ===== Status Configurations with normalized keys =====
const STATUS_CONFIGS = {
  leads: {
    labels: LeadStatusLabels,
    colors: LeadStatusColors,
    values: Object.values(LeadStatus)
  },
  contacts: {
    labels: ContactStatusLabels,
    colors: ContactStatusColors,
    values: Object.values(ContactStatus)
  },
  deals: {
    labels: DealStatusLabels,
    colors: DealStatusColors,
    values: Object.values(DealStatus)
  }
};

// ===== Status Icons =====
const STATUS_ICONS = {
  'Active': <CheckCircleOutlined />,
  'Hot': <FireOutlined />,
  'Cold': <FrownOutlined />,
  'New': <StarOutlined />,
  'Proposal': <FileTextOutlined />,
  'Deal': <DollarOutlined />,
  'Won': <TrophyOutlined />,
  'Lost': <WarningOutlined />,
  'Opened': <ClockCircleOutlined />,
  'Pending': <ClockCircleOutlined />,
  'Contacted': <PhoneOutlined />,
  'Interested': <HeartOutlined />,
  'Not Interested': <FrownOutlined />,
  'Not_Interested': <FrownOutlined />,
  'Converted': <CheckCircleOutlined />,
  'Junk Lead': <DeleteOutlined />,
  'Junk_Lead': <DeleteOutlined />,
  'Loss': <WarningOutlined />,
  'Gain': <TrophyOutlined />,
  'No Response': <ClockCircleOutlined />,
  'No_Response': <ClockCircleOutlined />
};

// ===== Main Dashboard Component =====
const UnifiedPipelineDashboard = () => {
  const user = useSelector(state => state.auth.user);
  const companyId = user?.company_id;
  const screens = useBreakpoint();

  // ===== State =====
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('month');
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('');
  const [drawerData, setDrawerData] = useState([]);
  const [drawerType, setDrawerType] = useState('');
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeTab, setActiveTab] = useState('leads');
  const [viewMode, setViewMode] = useState('chart');

  // ===== Format Helpers =====
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  const normalizeStatus = (status, type) => {
    if (!status) return null;
    
    const config = STATUS_CONFIGS[type];
    if (config && config.values.includes(status)) {
      return status;
    }
    
    const normalized = status.toString().trim();
    const found = config?.values.find(v => v.toLowerCase() === normalized.toLowerCase());
    if (found) return found;
    
    const specialCases = {
      'not_interested': 'Not Interested',
      'not interested': 'Not Interested',
      'junk_lead': 'Junk Lead',
      'junk lead': 'Junk Lead',
      'no_response': 'No Response',
      'no response': 'No Response',
      'gain': 'Gain',
      'loss': 'Loss'
    };
    
    return specialCases[normalized.toLowerCase()] || status;
  };

  const getStatusColor = (type, status) => {
    const normalized = normalizeStatus(status, type);
    const config = STATUS_CONFIGS[type];
    return config?.colors[normalized] || config?.colors[status] || COLORS.primary;
  };

  const getStatusLabel = (type, status) => {
    const normalized = normalizeStatus(status, type);
    const config = STATUS_CONFIGS[type];
    return config?.labels[normalized] || config?.labels[status] || status;
  };

  const getStatusIcon = (status) => {
    return STATUS_ICONS[status] || <TagOutlined />;
  };

  // ===== Load Data =====
  const loadDashboardData = useCallback(async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      const startDate = dateRange[0].startOf('day').toDate();
      const endDate = dateRange[1].endOf('day').toDate();
      
      const [allLeads, allContacts, allDeals, allUsers] = await Promise.all([
        LeadService.getLeadsByCompany(companyId).catch(() => []),
        ContactService.getContactsByCompany(companyId).catch(() => []),
        dealService.getDealsByCompany(companyId).catch(() => []),
        UserService.getUsersByCompanyId(companyId).catch(() => [])
      ]);

      const userMap = {};
      allUsers.forEach(u => {
        userMap[u.id] = {
          ...u,
          fullName: `${u.firstname || ''} ${u.lastname || ''}`.trim()
        };
      });

      const filterByDate = (items) => {
        return items.filter(item => {
          const date = item.CreationDate?.toDate?.() || item.CreationDate || item.createdAt?.toDate?.() || item.createdAt;
          return date && date >= startDate && date <= endDate;
        });
      };

      const filteredLeads = filterByDate(allLeads);
      const filteredContacts = filterByDate(allContacts);
      const filteredDeals = filterByDate(allDeals);

      const enrichWithSeller = (items, sellerIdField = 'seller_id') => {
        return items.map(item => {
          const sellerId = item[sellerIdField] || item.assignedTo?.id;
          const seller = sellerId ? userMap[sellerId] : null;
          return {
            ...item,
            sellerName: seller?.fullName || null,
            sellerEmail: seller?.email || null,
            sellerPhone: seller?.phoneNumber || seller?.phone || null,
          };
        });
      };

      const enrichedLeads = enrichWithSeller(filteredLeads);
      const enrichedContacts = enrichWithSeller(filteredContacts);
      const enrichedDeals = enrichWithSeller(filteredDeals, 'seller_id');

      // ===== Build Status Distributions =====
      const buildStatusDistribution = (items, statusField, type) => {
        const dist = {};
        const config = STATUS_CONFIGS[type];
        
        config.values.forEach(status => {
          dist[status] = 0;
        });
        
        items.forEach(item => {
          const rawStatus = item[statusField];
          const normalized = normalizeStatus(rawStatus, type);
          if (normalized && dist.hasOwnProperty(normalized)) {
            dist[normalized]++;
          } else if (normalized) {
            dist[normalized] = (dist[normalized] || 0) + 1;
          }
        });
        
        return dist;
      };

      const leadStats = {
        total: enrichedLeads.length,
        byStatus: buildStatusDistribution(enrichedLeads, 'status', 'leads'),
        byInterest: {
          High: enrichedLeads.filter(l => l.InterestLevel === 'High' || l.InterestLevel === 'high').length,
          Medium: enrichedLeads.filter(l => l.InterestLevel === 'Medium' || l.InterestLevel === 'medium').length,
          Low: enrichedLeads.filter(l => l.InterestLevel === 'Low' || l.InterestLevel === 'low').length,
        },
        converted: enrichedLeads.filter(l => l.convertedContactId || l.status === 'Converted' || l.status === 'converted').length,
        unassigned: enrichedLeads.filter(l => !l.seller_id).length,
        assigned: enrichedLeads.filter(l => l.seller_id).length,
      };

      const contactStats = {
        total: enrichedContacts.length,
        byStatus: buildStatusDistribution(enrichedContacts, 'status', 'contacts'),
        byType: {
          Client: enrichedContacts.filter(c => c.type === 'Client' || c.type === 'client').length,
          Prospect: enrichedContacts.filter(c => c.type === 'Prospect' || c.type === 'prospect').length,
          Partner: enrichedContacts.filter(c => c.type === 'Partner' || c.type === 'partner').length,
          Lead: enrichedContacts.filter(c => c.type === 'Lead' || c.type === 'lead').length,
          Vendor: enrichedContacts.filter(c => c.type === 'Vendor' || c.type === 'vendor').length,
        },
        unassigned: enrichedContacts.filter(c => !c.seller_id).length,
        assigned: enrichedContacts.filter(c => c.seller_id).length,
      };

       // FIX: Total Revenue should only count won deals
      const wonDeals = enrichedDeals.filter(d => 
        d.Status === 'Won' || d.Status === 'won' || d.Status === 'Gain' || d.Status === 'gain'
      );
      
      const dealStats = {
        total: enrichedDeals.length,
        byStatus: buildStatusDistribution(enrichedDeals, 'Status', 'deals'),
        totalValue: wonDeals.reduce((sum, d) => sum + (d.Amount || 0), 0), // Only won deals
        won: wonDeals.length,
        lost: enrichedDeals.filter(d => d.Status === 'Lost' || d.Status === 'lost' || d.Status === 'Loss' || d.Status === 'loss').length,
        opened: enrichedDeals.filter(d => d.Status === 'Opened' || d.Status === 'opened' || d.Status === 'Open' || d.Status === 'open').length,
      };

      // ===== Build Combined Data =====
      const combinedItems = [
        ...enrichedLeads.map(item => {
          const status = normalizeStatus(item.status, 'leads') || item.status || 'New';
          return {
            ...item,
            _type: 'lead',
            _status: status,
            _statusLabel: getStatusLabel('leads', status),
            _statusColor: getStatusColor('leads', status),
            _displayName: item.name || 'Unknown Lead',
            _subInfo: item.email || item.phoneNumber || 'No contact info',
            _extraInfo: `Region: ${item.region || 'N/A'}`,
          };
        }),
        ...enrichedContacts.map(item => {
          const status = normalizeStatus(item.status, 'contacts') || item.status || 'Active';
          return {
            ...item,
            _type: 'contact',
            _status: status,
            _statusLabel: getStatusLabel('contacts', status),
            _statusColor: getStatusColor('contacts', status),
            _displayName: item.name || 'Unknown Contact',
            _subInfo: item.email || item.phoneNumber || 'No contact info',
            _extraInfo: `Type: ${item.type || 'N/A'}`,
          };
        }),
        ...enrichedDeals.map(item => {
          const status = normalizeStatus(item.Status, 'deals') || item.Status || 'Opened';
          return {
            ...item,
            _type: 'deal',
            _status: status,
            _statusLabel: getStatusLabel('deals', status),
            _statusColor: getStatusColor('deals', status),
            _displayName: item.Description || item.contact_name || 'Untitled Deal',
            _subInfo: formatCurrency(item.Amount || 0),
            _extraInfo: `Contact: ${item.contact_name || 'N/A'}`,
          };
        })
      ];

      // ===== Build Stage Data for Charts =====
      const stageData = [
        { stage: 'New', Leads: leadStats.byStatus['New'] || 0, Contacts: contactStats.byStatus['New'] || 0, Deals: 0, icon: '⭐' },
        { stage: 'Contacted', Leads: leadStats.byStatus['Contacted'] || 0, Contacts: contactStats.byStatus['Contacted'] || 0, Deals: 0, icon: '📞' },
        { stage: 'Interested', Leads: leadStats.byStatus['Interested'] || 0, Contacts: contactStats.byStatus['Interested'] || 0, Deals: 0, icon: '❤️' },
        { stage: 'Proposal', Leads: leadStats.byStatus['Proposal'] || 0, Contacts: contactStats.byStatus['Proposal'] || 0, Deals: dealStats.byStatus['Proposal'] || 0, icon: '📄' },
        { stage: 'Deal', Leads: 0, Contacts: contactStats.byStatus['Deal'] || 0, Deals: dealStats.byStatus['Opened'] || 0, icon: '💰' },
        { stage: 'Won', Leads: leadStats.byStatus['Won'] || 0, Contacts: contactStats.byStatus['Won'] || 0, Deals: dealStats.byStatus['Won'] || 0, icon: '🏆' },
        { stage: 'Lost', Leads: leadStats.byStatus['Lost'] || 0, Contacts: contactStats.byStatus['Lost'] || 0, Deals: dealStats.byStatus['Lost'] || 0, icon: '❌' },
      ];

      setDashboardData({
        period: {
          start: dateRange[0].format('YYYY-MM-DD'),
          end: dateRange[1].format('YYYY-MM-DD'),
          days: dateRange[1].diff(dateRange[0], 'day') + 1
        },
        leads: { data: enrichedLeads, stats: leadStats },
        contacts: { data: enrichedContacts, stats: contactStats },
        deals: { data: enrichedDeals, stats: dealStats },
        combined: { items: combinedItems, total: combinedItems.length },
        stageData: stageData,
        summary: {
          totalLeads: enrichedLeads.length,
          totalContacts: enrichedContacts.length,
          totalDeals: enrichedDeals.length,
          totalRevenue: dealStats.totalValue,
          conversionRate: enrichedLeads.length > 0 ? (enrichedDeals.length / enrichedLeads.length) * 100 : 0,
          winRate: enrichedDeals.length > 0 ? (dealStats.won / enrichedDeals.length) * 100 : 0,
        }
      });

    } catch (error) {
      console.error('Error loading data:', error);
      message.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [companyId, dateRange]);

  useEffect(() => {
    if (companyId) {
      loadDashboardData();
    }
  }, [companyId, loadDashboardData]);

  // ===== Filter Handlers =====
  const handlePeriodChange = (value) => {
    setPeriod(value);
    const today = dayjs();
    const periods = {
      today: [today.startOf('day'), today.endOf('day')],
      week: [today.startOf('week'), today.endOf('week')],
      month: [today.startOf('month'), today.endOf('month')],
      quarter: [today.startOf('quarter'), today.endOf('quarter')],
      year: [today.startOf('year'), today.endOf('year')]
    };
    setDateRange(periods[value] || periods.month);
  };

  // ===== Open Drawer =====
  const openDrawer = (title, items, type) => {
    setDrawerTitle(title);
    setDrawerData(items);
    setDrawerType(type);
    setDrawerVisible(true);
  };

  // ===== Handle Chart Click =====
  const handleChartBarClick = (data, stage) => {
    if (!data || !data.payload) return;
    
    const { stage: stageName, Leads, Contacts, Deals } = data.payload;
    const entityMap = {
      'Leads': 'lead',
      'Contacts': 'contact',
      'Deals': 'deal'
    };
    
    // Get the entity type from the clicked bar
    const entityType = entityMap[stage] || 'lead';
    const count = data.payload[stage] || 0;
    
    if (count === 0) return;
    
    const items = dashboardData.combined.items.filter(item => {
      const statusMap = {
        'New': ['New'],
        'Contacted': ['Contacted'],
        'Interested': ['Interested'],
        'Proposal': ['Proposal'],
        'Deal': ['Deal', 'Opened'],
        'Won': ['Won', 'Gain'],
        'Lost': ['Lost', 'Loss']
      };
      const statuses = statusMap[stageName] || [];
      return item._type === entityType && statuses.includes(item._status);
    });
    
    openDrawer(`${stageName} - ${stage} (${items.length})`, items, entityType);
  };

  const handleStatusClick = (type, status) => {
    const items = dashboardData.combined.items.filter(
      item => item._type === type && item._status === status
    );
    const label = getStatusLabel(type, status);
    openDrawer(`${type.charAt(0).toUpperCase() + type.slice(1)}: ${label} (${items.length})`, items, type);
  };

  const handleEntityClick = (type) => {
    const items = dashboardData.combined.items.filter(
      item => item._type === type
    );
    openDrawer(`All ${type.charAt(0).toUpperCase() + type.slice(1)}s (${items.length})`, items, type);
  };

  // ===== View Item Details =====
  const handleItemClick = (item) => {
    setSelectedItem(item);
    setDetailModalVisible(true);
  };

  // ===== Export =====
  const exportToExcel = () => {
    if (!dashboardData) return;
    
    const items = drawerData.length > 0 ? drawerData : dashboardData.combined.items;
    const wsData = [
      ['=== UNIFIED PIPELINE DASHBOARD ==='],
      [`Period: ${dashboardData.period.start} to ${dashboardData.period.end}`],
      [],
      ['Type', 'Name', 'Status', 'Email/Phone', 'Seller', 'Extra Info'],
      ...items.map(item => [
        item._type,
        item._displayName,
        item._statusLabel,
        item._subInfo,
        item.sellerName || 'Unassigned',
        item._extraInfo
      ])
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pipeline Data');
    XLSX.writeFile(wb, `Pipeline_Report_${dayjs().format('YYYY-MM-DD')}.xlsx`);
    message.success('Report exported');
  };

  // ===== Render Main Chart =====
  const renderMainChart = () => {
    if (!dashboardData) return null;

    const { stageData } = dashboardData;
    
    // Custom tooltip for the chart
    const CustomTooltip = ({ active, payload, label }) => {
      if (active && payload && payload.length) {
        const data = payload[0]?.payload;
        return (
          <div style={{ 
            background: '#fff', 
            padding: '12px 16px', 
            borderRadius: 8, 
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            border: '1px solid #E5E7EB'
          }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{data?.stage}</div>
            {payload.map((p, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <span style={{ 
                  display: 'inline-block', 
                  width: 10, 
                  height: 10, 
                  borderRadius: 2, 
                  background: p.color 
                }} />
                <span>{p.name}:</span>
                <span style={{ fontWeight: 600 }}>{p.value}</span>
              </div>
            ))}
          </div>
        );
      }
      return null;
    };

    const barColors = {
      Leads: '#4F46E5',
      Contacts: '#10B981',
      Deals: '#F59E0B'
    };

    return (
      <Card 
        style={{ borderRadius: 16, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
        bodyStyle={{ padding: '20px 24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>Projects By Stage</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Click on any bar to view details
            </Text>
          </div>
          <Space>
            <Tag color="#4F46E5">Leads</Tag>
            <Tag color="#10B981">Contacts</Tag>
            <Tag color="#F59E0B">Deals</Tag>
          </Space>
        </div>

        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={stageData}
            margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
            barGap={8}
            barCategoryGap={20}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis 
              dataKey="stage" 
              tick={{ fontSize: 12, fill: '#6B7280' }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#6B7280' }}
              axisLine={false}
              tickLine={false}
            />
            <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
            <Legend 
              verticalAlign="top"
              align="right"
              iconType="square"
              iconSize={10}
              formatter={(value) => <span style={{ fontSize: 12, color: '#374151' }}>{value}</span>}
            />
            <Bar 
              dataKey="Leads" 
              fill="#4F46E5" 
              radius={[4, 4, 0, 0]}
              onClick={(data) => handleChartBarClick(data, 'Leads')}
              cursor="pointer"
              maxBarSize={60}
            />
            <Bar 
              dataKey="Contacts" 
              fill="#10B981" 
              radius={[4, 4, 0, 0]}
              onClick={(data) => handleChartBarClick(data, 'Contacts')}
              cursor="pointer"
              maxBarSize={60}
            />
            <Bar 
              dataKey="Deals" 
              fill="#F59E0B" 
              radius={[4, 4, 0, 0]}
              onClick={(data) => handleChartBarClick(data, 'Deals')}
              cursor="pointer"
              maxBarSize={60}
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    );
  };

  // ===== Render Summary Cards =====
  const renderSummaryCards = () => {
    if (!dashboardData) return null;
    
    const { summary } = dashboardData;
    
    const cards = [
      {
        title: 'Total Revenue',
        value: formatCurrency(summary.totalRevenue),
        icon: <DollarOutlined />,
        color: COLORS.success,
        bg: '#ECFDF5'
      },
      {
        title: 'Leads',
        value: summary.totalLeads,
        icon: <TeamOutlined />,
        color: COLORS.blue,
        bg: '#EFF6FF',
        onClick: () => handleEntityClick('lead')
      },
      {
        title: 'Contacts',
        value: summary.totalContacts,
        icon: <UserOutlined />,
        color: COLORS.purple,
        bg: '#F5F3FF',
        onClick: () => handleEntityClick('contact')
      },
      {
        title: 'Deals',
        value: summary.totalDeals,
        icon: <DollarOutlined />,
        color: COLORS.amber,
        bg: '#FFFBEB',
        onClick: () => handleEntityClick('deal')
      },
      {
        title: 'Conversion Rate',
        value: `${summary.conversionRate.toFixed(1)}%`,
        icon: <PercentageOutlined />,
        color: COLORS.cyan,
        bg: '#ECFEFF'
      },
      {
        title: 'Win Rate',
        value: `${summary.winRate.toFixed(1)}%`,
        icon: <TrophyOutlined />,
        color: COLORS.emerald,
        bg: '#ECFDF5'
      }
    ];
    
    return (
      <Row gutter={[12, 12]}>
        {cards.map((card, index) => (
          <Col xs={12} sm={8} md={6} lg={4} key={index}>
            <div
              style={{
                background: card.bg || '#FFFFFF',
                borderRadius: 12,
                padding: '16px 18px',
                border: '1px solid #E5E7EB',
                cursor: card.onClick ? 'pointer' : 'default',
                transition: 'all 0.3s ease',
                height: '100%'
              }}
              onClick={card.onClick}
              onMouseEnter={(e) => {
                if (card.onClick) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: '#6B7280' }}>{card.title}</Text>
                <span style={{ color: card.color, fontSize: 18 }}>{card.icon}</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: card.color, marginTop: 4 }}>
                {card.value}
              </div>
            </div>
          </Col>
        ))}
      </Row>
    );
  };

  // ===== Render Entity Breakdown =====
  const renderEntityBreakdown = () => {
    if (!dashboardData) return null;

    const getEntityData = (type) => {
      const config = STATUS_CONFIGS[type];
      const stats = dashboardData[type].stats;
      return config.values.map(status => ({
        status,
        label: getStatusLabel(type, status),
        color: getStatusColor(type, status),
        count: stats.byStatus[status] || 0,
        total: stats.total || 0,
        icon: getStatusIcon(status)
      }));
    };

    const entityConfigs = [
      { key: 'leads', label: 'Leads', icon: <TeamOutlined />, color: '#4F46E5' },
      { key: 'contacts', label: 'Contacts', icon: <UserOutlined />, color: '#10B981' },
      { key: 'deals', label: 'Deals', icon: <DollarOutlined />, color: '#F59E0B' }
    ];

    return (
      <Card 
        style={{ marginTop: 20, borderRadius: 16, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
        bodyStyle={{ padding: '20px 24px' }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={entityConfigs.map(entity => ({
            key: entity.key,
            label: (
              <span>
                {entity.icon} {entity.label} ({dashboardData[entity.key].stats.total})
              </span>
            ),
            children: (
              <div style={{ paddingTop: 12 }}>
                <Row gutter={[12, 12]}>
                  {getEntityData(entity.key).map(item => {
                    const percentage = item.total > 0 ? (item.count / item.total) * 100 : 0;
                    return (
                      <Col xs={12} sm={8} md={6} lg={4} xl={3} key={item.status}>
                        <div
                          style={{
                            background: '#FFFFFF',
                            borderRadius: 12,
                            padding: '14px 16px',
                            border: `1px solid ${item.count > 0 ? item.color : '#E5E7EB'}`,
                            borderLeft: `4px solid ${item.count > 0 ? item.color : '#E5E7EB'}`,
                            cursor: item.count > 0 ? 'pointer' : 'default',
                            opacity: item.count > 0 ? 1 : 0.5,
                            transition: 'all 0.3s ease',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                            textAlign: 'center'
                          }}
                          onClick={() => item.count > 0 && handleStatusClick(entity.key, item.status)}
                          onMouseEnter={(e) => {
                            if (item.count > 0) {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
                          }}
                        >
                          <div style={{ fontSize: 22, fontWeight: 700, color: item.count > 0 ? item.color : '#D1D5DB' }}>
                            {item.count}
                          </div>
                          <div style={{ fontSize: 12, color: '#6B7280' }}>
                            {item.icon} {item.label}
                          </div>
                          {item.count > 0 && (
                            <div style={{ marginTop: 4 }}>
                              <Progress
                                percent={Math.min(percentage, 100)}
                                strokeColor={item.color}
                                strokeWidth={4}
                                showInfo={false}
                                size="small"
                              />
                            </div>
                          )}
                        </div>
                      </Col>
                    );
                  })}
                </Row>
              </div>
            )
          }))}
        />
      </Card>
    );
  };

  // ===== Render Drawer Content =====
  const renderDrawerContent = () => {
    if (!drawerData.length) {
      return <Empty description="No items found" />;
    }

    return (
      <>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text type="secondary">{drawerData.length} items found</Text>
          <Button icon={<ExportOutlined />} onClick={exportToExcel} size="small">
            Export
          </Button>
        </div>
        <div style={{ maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
          {drawerData.map((item, index) => (
            <div
              key={item.id || index}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                borderBottom: '1px solid #F3F4F6',
                cursor: 'pointer',
                transition: 'background 0.2s',
                borderRadius: 6
              }}
              onClick={() => handleItemClick(item)}
              onMouseEnter={(e) => e.currentTarget.style.background = '#F9FAFB'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <Avatar size="small" style={{ 
                  background: item._type === 'lead' ? '#4F46E5' : 
                             item._type === 'contact' ? '#10B981' : '#F59E0B' 
                }}>
                  {item._displayName?.charAt(0) || '?'}
                </Avatar>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{item._displayName}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>
                    {item._subInfo}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Tag color={item._statusColor} style={{ fontSize: 11, margin: 0 }}>
                  {item._statusLabel}
                </Tag>
                <Tag style={{ fontSize: 11, margin: 0 }}>
                  {item._type}
                </Tag>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  };

  // ===== Main Render =====
  if (loading) {
    return (
      <div style={{ padding: 24, background: '#F9FAFB', minHeight: '100vh' }}>
        <Skeleton active paragraph={{ rows: 12 }} />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div style={{ padding: 24, background: '#F9FAFB', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Alert message="No Data Available" type="warning" showIcon />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, background: '#F9FAFB', minHeight: '100vh' }}>
      
      {/* ===== Header ===== */}
      <Card style={{ marginBottom: 24, borderRadius: 16, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <Row justify="space-between" align="middle" wrap gutter={[16, 16]}>
          <Col xs={24} sm={16}>
            <Space size={16}>
              <div style={{ 
                width: 48, height: 48, borderRadius: 14, 
                background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <DashboardOutlined style={{ fontSize: 24, color: '#fff' }} />
              </div>
              <div>
                <Title level={3} style={{ margin: 0, fontWeight: 600 }}>Pipeline Dashboard</Title>
                <Text type="secondary">Click on any chart bar to view details</Text>
              </div>
            </Space>
          </Col>
          <Col xs={24} sm={8}>
            <Space wrap style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Select value={period} onChange={handlePeriodChange} style={{ width: 110 }}>
                <Option value="today">Today</Option>
                <Option value="week">Week</Option>
                <Option value="month">Month</Option>
                <Option value="quarter">Quarter</Option>
                <Option value="year">Year</Option>
              </Select>
              <RangePicker 
                value={dateRange} 
                onChange={(d) => { if (d) { setDateRange(d); setPeriod('custom'); } }} 
                format="YYYY-MM-DD" 
                size="small"
              />
              <Button icon={<ReloadOutlined />} onClick={loadDashboardData} size="small">Refresh</Button>
            </Space>
          </Col>
        </Row>
        <Divider style={{ margin: '14px 0' }} />
        <Row gutter={12}>
          <Col><Tag color="blue">📅 {dashboardData.period.start} → {dashboardData.period.end}</Tag></Col>
          <Col><Tag color="cyan">📊 {dashboardData.period.days} days</Tag></Col>
          <Col><Tag color="purple">📈 {dashboardData.combined.total} Total Items</Tag></Col>
        </Row>
      </Card>

      {/* ===== Summary Cards ===== */}
      {renderSummaryCards()}

      {/* ===== Main Chart ===== */}
      <div style={{ marginTop: 20 }}>
        {renderMainChart()}
      </div>

      {/* ===== Entity Breakdown ===== */}
      {renderEntityBreakdown()}

      {/* ===== Drawer ===== */}
      <Drawer
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{drawerTitle}</span>
            {drawerData.length > 0 && (
              <Button icon={<ExportOutlined />} onClick={exportToExcel} size="small">
                Export
              </Button>
            )}
          </div>
        }
        placement="right"
        width={Math.min(700, window.innerWidth - 40)}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        destroyOnClose
      >
        {renderDrawerContent()}
      </Drawer>

      {/* ===== Detail Modal ===== */}
      <Modal
        title={
          <Space>
            <Tag color={selectedItem?._statusColor}>
              {selectedItem?._type}
            </Tag>
            <span style={{ fontWeight: 500 }}>{selectedItem?._displayName}</span>
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>Close</Button>
        ]}
        width={600}
      >
        {selectedItem && (
          <div style={{ padding: '8px 0' }}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <div style={{ background: '#F9FAFB', padding: 12, borderRadius: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Name</Text>
                  <div style={{ fontWeight: 500 }}>{selectedItem._displayName}</div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ background: '#F9FAFB', padding: 12, borderRadius: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Status</Text>
                  <div>
                    <Tag color={selectedItem._statusColor}>
                      {getStatusIcon(selectedItem._status)} {selectedItem._statusLabel}
                    </Tag>
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ background: '#F9FAFB', padding: 12, borderRadius: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Type</Text>
                  <div>
                    <Tag color={selectedItem._type === 'lead' ? '#4F46E5' : selectedItem._type === 'contact' ? '#10B981' : '#F59E0B'}>
                      {selectedItem._type}
                    </Tag>
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ background: '#F9FAFB', padding: 12, borderRadius: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Seller</Text>
                  <div>{selectedItem.sellerName || <Tag color="orange">Unassigned</Tag>}</div>
                </div>
              </Col>
              {(selectedItem.email || selectedItem.contact_email) && (
                <Col span={24}>
                  <div style={{ background: '#F9FAFB', padding: 12, borderRadius: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Email</Text>
                    <div>{selectedItem.email || selectedItem.contact_email}</div>
                  </div>
                </Col>
              )}
              {(selectedItem.phoneNumber || selectedItem.phone || selectedItem.contact_phone) && (
                <Col span={24}>
                  <div style={{ background: '#F9FAFB', padding: 12, borderRadius: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Phone</Text>
                    <div>{selectedItem.phoneNumber || selectedItem.phone || selectedItem.contact_phone}</div>
                  </div>
                </Col>
              )}
              {selectedItem.Amount && (
                <Col span={24}>
                  <div style={{ background: '#F9FAFB', padding: 12, borderRadius: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Amount</Text>
                    <div style={{ color: '#10B981', fontWeight: 600 }}>{formatCurrency(selectedItem.Amount)}</div>
                  </div>
                </Col>
              )}
              {selectedItem.region && (
                <Col span={24}>
                  <div style={{ background: '#F9FAFB', padding: 12, borderRadius: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Region</Text>
                    <div>{selectedItem.region}</div>
                  </div>
                </Col>
              )}
              {selectedItem.InterestLevel && (
                <Col span={24}>
                  <div style={{ background: '#F9FAFB', padding: 12, borderRadius: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Interest Level</Text>
                    <div>
                      <Tag color={
                        selectedItem.InterestLevel === 'High' || selectedItem.InterestLevel === 'high' ? 'green' :
                        selectedItem.InterestLevel === 'Medium' || selectedItem.InterestLevel === 'medium' ? 'orange' : 'red'
                      }>
                        {selectedItem.InterestLevel}
                      </Tag>
                    </div>
                  </div>
                </Col>
              )}
            </Row>
          </div>
        )}
      </Modal>

      {/* ===== Footer ===== */}
      <div style={{ textAlign: 'center', marginTop: 24, padding: 16, background: 'white', borderRadius: 12 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {dashboardData.period.start} → {dashboardData.period.end} · {dashboardData.period.days} days · 
          Generated {dayjs().format('YYYY-MM-DD HH:mm')}
        </Text>
      </div>
    </div>
  );
};

export default UnifiedPipelineDashboard;