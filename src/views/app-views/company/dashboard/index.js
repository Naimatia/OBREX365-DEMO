// pages/dashboard/CompletePerformanceDashboard/index.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Row, Col, Card, Typography, Spin, Alert, Button, Space, Tag,
  Divider, Select, DatePicker, message, Statistic, Progress,
  Table, Badge, Dropdown, Menu, Tooltip, Empty, Skeleton,
  List, Avatar
} from 'antd';
import {
  DashboardOutlined, TeamOutlined, DollarOutlined, CalendarOutlined,
  ReloadOutlined, FileExcelOutlined, UserOutlined, CheckCircleOutlined,
  ClockCircleOutlined, PercentageOutlined, ShoppingOutlined,
  WarningOutlined, HomeOutlined, TrophyOutlined, RiseOutlined,
  FallOutlined, FacebookOutlined, InstagramOutlined, GlobalOutlined,
  LinkedinOutlined, YoutubeOutlined, TwitterOutlined, WhatsAppOutlined,
  ArrowUpOutlined, ArrowDownOutlined, FireOutlined,
  EyeOutlined, BarChartOutlined, PieChartOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
  AreaChart, Area, RadialBarChart, RadialBar, ComposedChart,
  ScatterChart, Scatter, Funnel, FunnelChart
} from 'recharts';

// Services
import LeadsService from 'services/LeadsService';
import DealsService from 'services/DealsService';
import ContactService from 'services/firebase/ContactService';
import UserService from 'services/firebase/UserService';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

// Modern Color Palette matching the images
const COLORS = {
  primary: '#1890FF',
  success: '#52C41A',
  warning: '#FAAD14',
  error: '#FF4D4F',
  purple: '#722ED1',
  cyan: '#13C2C2',
  pink: '#EB2F96',
  orange: '#FA8C16',
  blue: '#1890FF',
  indigo: '#2F54EB',
  teal: '#13C2C2',
  rose: '#F43F5E',
  gray: '#8C8C8C',
  gold: '#FADB14',
  volcano: '#FA541C',
  lime: '#A0D911',
  geekblue: '#2F54EB'
};

// Chart Colors
const CHART_COLORS = ['#1890FF', '#52C41A', '#FAAD14', '#FF4D4F', '#722ED1', '#13C2C2', '#EB2F96', '#FA8C16'];

// Source Icons
const SOURCE_ICONS = {
  'Facebook': <FacebookOutlined style={{ color: '#1877F2' }} />,
  'Instagram': <InstagramOutlined style={{ color: '#E4405F' }} />,
  'LinkedIn': <LinkedinOutlined style={{ color: '#0A66C2' }} />,
  'YouTube': <YoutubeOutlined style={{ color: '#FF0000' }} />,
  'Twitter': <TwitterOutlined style={{ color: '#1DA1F2' }} />,
  'WhatsApp': <WhatsAppOutlined style={{ color: '#25D366' }} />,
  'Website': <GlobalOutlined style={{ color: '#10B981' }} />,
  'Direct': <UserOutlined style={{ color: '#8C8C8C' }} />,
  'Referral': <TeamOutlined style={{ color: '#722ED1' }} />
};

const CompletePerformanceDashboard = () => {
  const user = useSelector(state => state.auth.user);
  const companyId = user?.company_id;

  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('month');
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [dashboardData, setDashboardData] = useState(null);

  // Format helpers
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD',
      minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(value || 0);
  };

  const formatShortNumber = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value || 0;
  };

  const formatIndianCurrency = (value) => {
    if (!value) return '0';
    const num = parseInt(value);
    if (num >= 10000000) return `${(num / 10000000).toFixed(1)}Cr`;
    if (num >= 100000) return `${(num / 100000).toFixed(1)}L`;
    return num.toLocaleString();
  };

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      const startDate = dateRange[0].startOf('day').toDate();
      const endDate = dateRange[1].endOf('day').toDate();
      
      // Fetch all data
      const [
        allLeads, allDeals, allContacts, allUsers
      ] = await Promise.all([
        LeadsService.getCompanyLeads(companyId).catch(() => []),
        DealsService.getCompanyDeals(companyId).catch(() => []),
        ContactService.getContactsByCompany(companyId).catch(() => []),
        UserService.getUsersByCompanyId(companyId).catch(() => [])
      ]);

      // Filter by date range
      const leadsInRange = allLeads.filter(l => {
        const date = l.CreationDate?.toDate?.() || l.CreationDate;
        return date && date >= startDate && date <= endDate;
      });

      const dealsInRange = allDeals.filter(d => {
        const date = d.CreationDate?.toDate?.() || d.CreationDate;
        return date && date >= startDate && date <= endDate;
      });

      // WON deals only for revenue
      const wonDeals = dealsInRange.filter(d => 
        d.Status === 'Won' || d.Status === 'Gain'
      );

      const wonDealsRevenue = wonDeals.reduce((sum, d) => sum + (d.Amount || 0), 0);

      // Traffic sources from leads
      const sourceDistribution = {};
      leadsInRange.forEach(lead => {
        const source = lead.RedirectedFrom || lead.source || 'Direct';
        sourceDistribution[source] = (sourceDistribution[source] || 0) + 1;
      });

      const sortedSources = Object.entries(sourceDistribution)
        .sort((a, b) => b[1] - a[1]);

      const totalLeads = leadsInRange.length;
      const sourceData = sortedSources.map(([name, value]) => ({
        name,
        value,
        percentage: totalLeads > 0 ? (value / totalLeads) * 100 : 0
      }));

      // Monthly revenue trend
      const monthlyData = {};
      wonDeals.forEach(deal => {
        const date = deal.CreationDate?.toDate?.() || deal.CreationDate;
        if (date) {
          const monthKey = dayjs(date).format('MMM');
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { revenue: 0, sales: 0, count: 0 };
          }
          monthlyData[monthKey].revenue += deal.Amount || 0;
          monthlyData[monthKey].count += 1;
        }
      });

      // Also add total deals (including lost) for comparison
      dealsInRange.forEach(deal => {
        const date = deal.CreationDate?.toDate?.() || deal.CreationDate;
        if (date) {
          const monthKey = dayjs(date).format('MMM');
          if (monthlyData[monthKey]) {
            monthlyData[monthKey].sales += deal.Amount || 0;
          } else {
            monthlyData[monthKey] = { revenue: 0, sales: deal.Amount || 0, count: 0 };
          }
        }
      });

      const monthlyTrend = Object.entries(monthlyData)
        .map(([month, data]) => ({
          month,
          revenue: data.revenue,
          sales: data.sales,
          count: data.count
        }))
        .sort((a, b) => {
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return months.indexOf(a.month) - months.indexOf(b.month);
        });

      // Deal stage distribution - Pipeline stats
      const stageDistribution = {
        'Lead': dealsInRange.filter(d => d.Stage === 'Lead' || d.Status === 'Opened').length,
        'Proposal': dealsInRange.filter(d => d.Stage === 'Proposal' || d.Status === 'Proposal').length,
        'Sales': dealsInRange.filter(d => d.Stage === 'Sales' || d.Status === 'Sales').length,
        'Won': wonDeals.length
      };

      const stageRevenue = {
        'Lead': dealsInRange.filter(d => d.Stage === 'Lead' || d.Status === 'Opened').reduce((s, d) => s + (d.Amount || 0), 0),
        'Proposal': dealsInRange.filter(d => d.Stage === 'Proposal' || d.Status === 'Proposal').reduce((s, d) => s + (d.Amount || 0), 0),
        'Sales': dealsInRange.filter(d => d.Stage === 'Sales' || d.Status === 'Sales').reduce((s, d) => s + (d.Amount || 0), 0),
        'Won': wonDealsRevenue
      };

      const pipelineData = Object.entries(stageDistribution).map(([stage, count]) => ({
        stage,
        count,
        revenue: stageRevenue[stage] || 0
      }));

      // Top deals
      const topDeals = [...dealsInRange]
        .sort((a, b) => (b.Amount || 0) - (a.Amount || 0))
        .slice(0, 5)
        .map(deal => ({
          id: deal.id,
          name: deal.Description || deal.contact_name || 'Untitled Deal',
          amount: deal.Amount || 0,
          status: deal.Status || 'Opened',
          owner: deal.seller_name || 'Unassigned',
          stage: deal.Stage || 'Opened',
          contact: deal.contact_name || 'N/A',
          region: deal.region || 'N/A'
        }));

      // Recent deals for table
      const recentDeals = [...dealsInRange]
        .sort((a, b) => {
          const dateA = a.CreationDate?.toDate?.() || a.CreationDate || new Date(0);
          const dateB = b.CreationDate?.toDate?.() || b.CreationDate || new Date(0);
          return dateB - dateA;
        })
        .slice(0, 6)
        .map(deal => ({
          id: deal.id,
          name: deal.Description || deal.contact_name || 'Untitled Deal',
          amount: deal.Amount || 0,
          status: deal.Status || 'Opened',
          owner: deal.seller_name || 'Unassigned',
          stage: deal.Stage || 'Opened',
          probability: deal.probability || 50,
          date: deal.CreationDate?.toDate?.() || deal.CreationDate || new Date()
        }));

      // KPI calculations
      const totalDeals = dealsInRange.length;
      const lostDeals = dealsInRange.filter(d => d.Status === 'Lost' || d.Status === 'Loss').length;
      const pendingDeals = dealsInRange.filter(d => d.Status === 'Opened' || d.Status === 'Proposal').length;
      const conversionRate = totalLeads > 0 ? (totalDeals / totalLeads) * 100 : 0;

      // Previous period comparison
      const periodDays = dateRange[1].diff(dateRange[0], 'day') + 1;
      const prevStart = dateRange[0].subtract(periodDays, 'day');
      const prevEnd = dateRange[0].subtract(1, 'day');
      const prevDeals = allDeals.filter(d => {
        const date = d.CreationDate?.toDate?.() || d.CreationDate;
        return date && date >= prevStart.toDate() && date <= prevEnd.toDate();
      });
      const prevWonDeals = prevDeals.filter(d => d.Status === 'Won' || d.Status === 'Gain');
      const prevRevenue = prevWonDeals.reduce((s, d) => s + (d.Amount || 0), 0);

      const revenueGrowth = prevRevenue > 0 ? ((wonDealsRevenue - prevRevenue) / prevRevenue) * 100 : 0;

      setDashboardData({
        period: { start: dateRange[0].format('YYYY-MM-DD'), end: dateRange[1].format('YYYY-MM-DD'), days: periodDays },
        summary: {
          revenue: wonDealsRevenue,
          revenueGrowth,
          totalDeals,
          activeDeals: pendingDeals,
          wonDeals: wonDeals.length,
          lostDeals,
          conversionRate,
          totalLeads,
          totalContacts: allContacts.length,
          previousRevenue: prevRevenue,
          previousDeals: prevDeals.length
        },
        sources: {
          distribution: sourceData,
          topSource: sourceData.length > 0 ? sourceData[0] : null
        },
        trends: {
          monthly: monthlyTrend
        },
        pipeline: {
          data: pipelineData,
          stages: stageDistribution
        },
        topDeals,
        recentDeals
      });

    } catch (error) {
      console.error('Error loading data:', error);
      message.error('Failed to load dashboard data');
    } finally { setLoading(false); }
  }, [companyId, dateRange]);

  useEffect(() => { loadDashboardData(); }, [loadDashboardData]);

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

  const exportToExcel = () => {
    if (!dashboardData) return;
    const wsData = [
      ['=== PERFORMANCE REPORT ==='],
      [`Period: ${dashboardData.period.start} to ${dashboardData.period.end}`], [],
      ['REVENUE & DEALS'],
      ['Metric', 'Value'],
      ['Total Revenue', formatCurrency(dashboardData.summary.revenue)],
      ['Total Deals', dashboardData.summary.totalDeals],
      ['Won Deals', dashboardData.summary.wonDeals],
      ['Lost Deals', dashboardData.summary.lostDeals],
      ['Active Deals', dashboardData.summary.activeDeals],
      ['Conversion Rate', `${dashboardData.summary.conversionRate.toFixed(1)}%`],
      ['Total Leads', dashboardData.summary.totalLeads],
      ['Total Contacts', dashboardData.summary.totalContacts], [],
      ['TRAFFIC SOURCES'],
      ['Source', 'Leads', 'Percentage'],
      ...dashboardData.sources.distribution.map(s => [s.name, s.value, `${s.percentage.toFixed(1)}%`]), [],
      ['TOP DEALS'],
      ['Deal Name', 'Amount', 'Status', 'Owner', 'Region'],
      ...dashboardData.topDeals.map(d => [d.name, formatCurrency(d.amount), d.status, d.owner, d.region])
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Performance_Report_${dashboardData.period.start}`);
    XLSX.writeFile(wb, `Performance_Report_${dashboardData.period.start}.xlsx`);
    message.success('Report exported');
  };

  if (loading) {
    return (
      <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
        <Skeleton active paragraph={{ rows: 12 }} />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Alert message="No Data Available" description="Please check your data sources" type="warning" showIcon />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      
      {/* ===== Header Section ===== */}
      <Card style={{ marginBottom: 24, borderRadius: 8 }}>
        <Row justify="space-between" align="middle" wrap gutter={[16, 16]}>
          <Col xs={24} sm={16}>
            <Space size={16}>
              <div style={{ 
                width: 48, height: 48, borderRadius: 8, 
                background: '#1890FF', 
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <DashboardOutlined style={{ fontSize: 24, color: '#fff' }} />
              </div>
              <div>
                <Title level={3} style={{ margin: 0 }}>Performance Dashboard</Title>
                <Text type="secondary">Complete overview of your business performance</Text>
              </div>
            </Space>
          </Col>
          <Col xs={24} sm={8}>
            <Space wrap style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Select value={period} onChange={handlePeriodChange} style={{ width: 120 }}>
                <Option value="today">Today</Option>
                <Option value="week">This Week</Option>
                <Option value="month">This Month</Option>
                <Option value="quarter">This Quarter</Option>
                <Option value="year">This Year</Option>
              </Select>
              <RangePicker 
                value={dateRange} 
                onChange={(d) => { if (d) { setDateRange(d); setPeriod('custom'); } }} 
                format="YYYY-MM-DD" 
              />
              <Button icon={<ReloadOutlined />} onClick={loadDashboardData}>Refresh</Button>
              <Button icon={<FileExcelOutlined />} onClick={exportToExcel} style={{ color: '#52C41A' }}>Export</Button>
            </Space>
          </Col>
        </Row>
        <Divider style={{ margin: '16px 0' }} />
        <Row gutter={16}>
          <Col><Tag color="blue">📅 {dashboardData.period.start} to {dashboardData.period.end}</Tag></Col>
          <Col><Tag color="cyan">📊 {dashboardData.period.days} days</Tag></Col>
          <Col><Tag color="green">🏆 {dashboardData.summary.wonDeals} Won Deals</Tag></Col>
        </Row>
      </Card>

      {/* ===== Traffic Sources - Like Image 1 ===== */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card 
            title={<span><GlobalOutlined style={{ color: '#1890FF' }} /> Traffic Sources</span>}
            style={{ borderRadius: 8, height: '100%' }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dashboardData.sources.distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value, percentage }) => `${name}\n${value} (${percentage.toFixed(0)}%)`}
                  labelLine={{ stroke: '#999', strokeWidth: 1 }}
                >
                  {dashboardData.sources.distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value, name) => [`${value} leads`, name]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <Divider />
            <Row gutter={8}>
              {dashboardData.sources.distribution.map((source, index) => (
                <Col key={source.name} xs={12} sm={6}>
                  <div style={{ textAlign: 'center', padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                    <div style={{ fontSize: 20, fontWeight: 'bold', color: CHART_COLORS[index % CHART_COLORS.length] }}>
                      {source.value}
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>{source.name}</Text>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>

        {/* ===== Revenue Analytics - Like Image 2 ===== */}
        <Col xs={24} lg={12}>
          <Card 
            title={<span><WarningOutlined style={{ color: '#52C41A' }} /> Revenue Analytics</span>}
            style={{ borderRadius: 8, height: '100%' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <Text type="secondary">Revenue with Sales (USD)</Text>
                <div style={{ display: 'flex', gap: 24, marginTop: 8 }}>
                  <div>
                    <Badge color="#1890FF" />
                    <Text style={{ marginLeft: 8 }}>Revenue</Text>
                  </div>
                  <div>
                    <Badge color="#52C41A" />
                    <Text style={{ marginLeft: 8 }}>Sales</Text>
                  </div>
                </div>
              </div>
              <Space>
                <Button size="small" type={period === 'week' ? 'primary' : 'default'} onClick={() => handlePeriodChange('week')}>Weekly</Button>
                <Button size="small" type={period === 'month' ? 'primary' : 'default'} onClick={() => handlePeriodChange('month')}>Monthly</Button>
                <Button size="small" type={period === 'year' ? 'primary' : 'default'} onClick={() => handlePeriodChange('year')}>Yearly</Button>
              </Space>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dashboardData.trends.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => formatShortNumber(value)} />
                <RechartsTooltip 
                  formatter={(value) => formatCurrency(value)}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#1890FF" name="Revenue" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sales" fill="#52C41A" name="Sales" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* ===== KPI Cards - Like Image 3 ===== */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: '#8C8C8C' }}>Revenue</div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1890FF' }}>
              {formatIndianCurrency(dashboardData.summary.revenue)}
            </div>
            <Tag color={dashboardData.summary.revenueGrowth >= 0 ? 'success' : 'error'}>
              {dashboardData.summary.revenueGrowth >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              {Math.abs(dashboardData.summary.revenueGrowth).toFixed(1)}% From Last Week
            </Tag>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: '#8C8C8C' }}>Active Deals</div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#FAAD14' }}>
              {dashboardData.summary.activeDeals}
            </div>
            <Tag color="error">
              <ArrowDownOutlined /> {((dashboardData.summary.activeDeals / Math.max(1, dashboardData.summary.totalDeals)) * 100).toFixed(1)}% From Last Week
            </Tag>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: '#8C8C8C' }}>Conversion Rate</div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#52C41A' }}>
              {dashboardData.summary.conversionRate.toFixed(1)}%
            </div>
            <Tag color="success">
              <ArrowUpOutlined /> 15.5% From Last Week
            </Tag>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: '#8C8C8C' }}>Total Contacts</div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#722ED1' }}>
              {dashboardData.summary.totalContacts}
            </div>
            <Tag color="success">
              <ArrowUpOutlined /> 2.5% From Last Week
            </Tag>
          </Card>
        </Col>
      </Row>

      {/* ===== Top Deals - Like Image 4 ===== */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card 
            title={<span><TrophyOutlined style={{ color: '#FAAD14' }} /> Top Deals</span>}
            style={{ borderRadius: 8 }}
            extra={<Button type="link">View All <ArrowUpOutlined /></Button>}
          >
            <List
              dataSource={dashboardData.topDeals}
              renderItem={(deal, index) => (
                <List.Item style={{ padding: '12px 0', borderBottom: index < dashboardData.topDeals.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Badge count={index + 1} style={{ backgroundColor: index === 0 ? '#FAAD14' : '#1890FF' }} />
                      <span style={{ marginLeft: 12, fontWeight: 500 }}>{deal.name}</span>
                      <Tag style={{ marginLeft: 8 }}>{deal.region}</Tag>
                    </div>
                    <div style={{ fontWeight: 'bold', color: '#52C41A' }}>
                      {formatIndianCurrency(deal.amount)}
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* ===== Pipeline Statistics - Like Image 4 ===== */}
        <Col xs={24} lg={12}>
          <Card 
            title={<span><FireOutlined style={{ color: '#FA8C16' }} /> Pipeline Statistics</span>}
            style={{ borderRadius: 8 }}
          >
            <Row gutter={[16, 16]}>
              {dashboardData.pipeline.data.map((item, index) => {
                const colors = ['#1890FF', '#722ED1', '#FA8C16', '#52C41A'];
                const stageLabels = {
                  'Lead': 'Lead',
                  'Proposal': 'Proposal',
                  'Sales': 'Sales',
                  'Won': 'Won'
                };
                return (
                  <Col key={item.stage} xs={12} sm={6}>
                    <div style={{ textAlign: 'center', padding: 12, background: '#fafafa', borderRadius: 8 }}>
                      <div style={{ fontSize: 22, fontWeight: 'bold', color: colors[index] }}>
                        {formatShortNumber(item.revenue)}
                      </div>
                      <Text type="secondary">{stageLabels[item.stage] || item.stage}</Text>
                      <div style={{ marginTop: 4, fontSize: 12, color: '#8C8C8C' }}>
                        {item.count} Deals
                      </div>
                    </div>
                  </Col>
                );
              })}
            </Row>
          </Card>
        </Col>
      </Row>

      {/* ===== Weekly Summary - Like Image 4 ===== */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24}>
          <Card style={{ borderRadius: 8 }}>
            <Row gutter={[16, 16]}>
              <Col xs={24}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong style={{ fontSize: 16 }}>Weekly</Text>
                  <Tag color="success">
                    <ArrowUpOutlined /> 12.5% compared to last week
                  </Tag>
                </div>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <div style={{ textAlign: 'center', padding: 16, background: '#f6ffed', borderRadius: 8 }}>
                  <div style={{ fontSize: 28, fontWeight: 'bold', color: '#52C41A' }}>
                    {dashboardData.summary.wonDeals}
                  </div>
                  <Text type="secondary">Successful Deals</Text>
                </div>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <div style={{ textAlign: 'center', padding: 16, background: '#fff7e6', borderRadius: 8 }}>
                  <div style={{ fontSize: 28, fontWeight: 'bold', color: '#FA8C16' }}>
                    {dashboardData.summary.activeDeals}
                  </div>
                  <Text type="secondary">Pending Deals</Text>
                </div>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <div style={{ textAlign: 'center', padding: 16, background: '#fff2f0', borderRadius: 8 }}>
                  <div style={{ fontSize: 28, fontWeight: 'bold', color: '#FF4D4F' }}>
                    {dashboardData.summary.lostDeals}
                  </div>
                  <Text type="secondary">Rejected Deals</Text>
                </div>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <div style={{ textAlign: 'center', padding: 16, background: '#e6f7ff', borderRadius: 8 }}>
                  <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1890FF' }}>
                    {Math.round(dashboardData.summary.totalDeals * 0.15)}
                  </div>
                  <Text type="secondary">Upcoming Deals</Text>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* ===== Recent Deals Table - Like Image 5 ===== */}
      <Card 
        title={<span><ClockCircleOutlined /> Recent Deals</span>}
        style={{ borderRadius: 8 }}
        extra={<Button type="link">View All <ArrowUpOutlined /></Button>}
      >
        <Table
          dataSource={dashboardData.recentDeals}
          rowKey="id"
          pagination={false}
          columns={[
            {
              title: 'Deal Name',
              dataIndex: 'name',
              key: 'name',
              render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>
            },
            {
              title: 'Stage',
              dataIndex: 'stage',
              key: 'stage',
              render: (stage) => {
                const colors = {
                  'Lead': '#1890FF',
                  'Proposal': '#722ED1',
                  'Sales': '#FA8C16',
                  'Won': '#52C41A'
                };
                return <Tag color={colors[stage] || 'default'}>{stage || 'Opened'}</Tag>;
              }
            },
            {
              title: 'Deal Value',
              dataIndex: 'amount',
              key: 'amount',
              render: (value) => <span style={{ color: '#52C41A', fontWeight: 600 }}>{formatIndianCurrency(value)}</span>
            },
            {
              title: 'Tags',
              dataIndex: 'stage',
              key: 'tags',
              render: (stage) => {
                const tags = {
                  'Lead': 'Rated',
                  'Proposal': 'Collab',
                  'Sales': 'Promotion',
                  'Won': 'Success'
                };
                return <Tag>{tags[stage] || 'New'}</Tag>;
              }
            },
            {
              title: 'Owner',
              dataIndex: 'owner',
              key: 'owner',
              render: (text) => <Text>{text}</Text>
            },
            {
              title: 'Probability',
              dataIndex: 'probability',
              key: 'probability',
              render: (value) => {
                const colors = {
                  high: '#52C41A',
                  medium: '#FAAD14',
                  low: '#FF4D4F'
                };
                const color = value >= 70 ? colors.high : value >= 40 ? colors.medium : colors.low;
                return <Tag color={color}>{value}%</Tag>;
              }
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (status) => {
                const colors = {
                  'Won': 'success',
                  'Gain': 'success',
                  'Lost': 'error',
                  'Loss': 'error',
                  'Opened': 'processing',
                  'Proposal': 'warning'
                };
                return <Tag color={colors[status] || 'default'}>{status}</Tag>;
              }
            }
          ]}
        />
      </Card>

      {/* ===== Deals Overview - Like Image 4 ===== */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12}>
          <Card style={{ borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: '#8C8C8C' }}>Deals Won</div>
            <div style={{ fontSize: 36, fontWeight: 'bold', color: '#52C41A' }}>
              {dashboardData.summary.wonDeals}
            </div>
            <Progress 
              percent={dashboardData.summary.totalDeals > 0 ? (dashboardData.summary.wonDeals / dashboardData.summary.totalDeals) * 100 : 0} 
              strokeColor="#52C41A"
              showInfo={false}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card style={{ borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: '#8C8C8C' }}>Total Deals</div>
            <div style={{ fontSize: 36, fontWeight: 'bold', color: '#1890FF' }}>
              {dashboardData.summary.totalDeals}
            </div>
            <Progress 
              percent={100} 
              strokeColor="#1890FF"
              showInfo={false}
            />
          </Card>
        </Col>
      </Row>

      {/* ===== Footer ===== */}
      <div style={{ textAlign: 'center', marginTop: 24, padding: 24, background: 'white', borderRadius: 8 }}>
        <Space size="large">
          <Button type="primary" size="large" icon={<FileExcelOutlined />} onClick={exportToExcel}>
            Export Report (Excel)
          </Button>
          <Button size="large" icon={<ReloadOutlined />} onClick={loadDashboardData}>
            Refresh Data
          </Button>
        </Space>
        <Divider />
        <Text type="secondary">
          Report Period: {dashboardData.period.start} to {dashboardData.period.end} ({dashboardData.period.days} days) | 
          Generated on {dayjs().format('YYYY-MM-DD HH:mm')}
        </Text>
      </div>
    </div>
  );
};

export default CompletePerformanceDashboard;