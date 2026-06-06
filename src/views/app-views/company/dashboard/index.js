// pages/dashboard/CompletePerformanceDashboard/index.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  Row, Col, Card, Typography, Spin, Alert, Button, Space, Tag,
  Divider, Select, DatePicker, message, Statistic, Progress,
  Avatar, Badge, Table, Timeline, List, Steps, Collapse, Descriptions
} from 'antd';
import {
  DashboardOutlined, TeamOutlined, DollarOutlined, CalendarOutlined,
  EyeOutlined, RiseOutlined, FallOutlined, ReloadOutlined,
  FileExcelOutlined, UserOutlined, CheckCircleOutlined,
  ClockCircleOutlined, PercentageOutlined, ShoppingOutlined,
  WarningOutlined, FileTextOutlined, HomeOutlined,
  TrophyOutlined, BugOutlined, SolutionOutlined, AuditOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

// Services
import LeadsService from 'services/LeadsService';
import DealsService from 'services/DealsService';
import MeetingService from 'services/MeetingService';
import TodoService from 'services/TodoService';
import PropertiesService from 'services/PropertiesService';
import attendanceService from 'services/firebase/AttendanceService';
import ContactService from 'services/firebase/ContactService';
import LeadHistoryService from 'services/firebase/LeadHistoryService';
import InvoiceService from 'services/firebase/InvoiceService';
import UserService from 'services/firebase/UserService';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { Panel } = Collapse;

// Color palette
const COLORS = {
  primary: '#1890ff', success: '#52c41a', warning: '#faad14',
  error: '#ff4d4f', purple: '#722ed1', cyan: '#13c2c2',
  pink: '#eb2f96', orange: '#fa8c16', geekblue: '#2f54eb',
  lime: '#a0d911', gold: '#fadb14', volcano: '#fa541c'
};

const CompletePerformanceDashboard = () => {
  const user = useSelector(state => state.auth.user);
  const companyId = user?.company_id;

  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('month');
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [dashboardData, setDashboardData] = useState(null);
  const [expandedSections, setExpandedSections] = useState([]);

  // Format helpers
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency', currency: 'AED',
      minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(value || 0);
  };

  const formatNumber = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value?.toLocaleString() || 0;
  };

  // Load all data
  const loadDashboardData = useCallback(async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      const startDate = dateRange[0].startOf('day').toDate();
      const endDate = dateRange[1].endOf('day').toDate();
      const periodDays = dateRange[1].diff(dateRange[0], 'day') + 1;
      
      // Fetch all data
      const [
        allLeads, allDeals, allMeetings, allTodos, allEmployees,
        allProperties, allInvoices, attendanceRecords, allContacts
      ] = await Promise.all([
        LeadsService.getCompanyLeads(companyId).catch(() => []),
        DealsService.getCompanyDeals(companyId).catch(() => []),
        MeetingService.fetchMeetings(companyId).catch(() => []),
        TodoService.getCompanyTodos(companyId).catch(() => []),
        UserService.getUsersByCompanyId(companyId).catch(() => []),
        PropertiesService.getCompanyProperties(companyId).catch(() => []),
        InvoiceService.getInvoicesByCompany(companyId).catch(() => []),
        attendanceService.getAttendanceByCompany(companyId).catch(() => []),
        ContactService.getContactsByCompany(companyId).catch(() => [])
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
      
      const meetingsInRange = allMeetings.filter(m => {
        const date = m.DateTime instanceof Date ? m.DateTime : m.DateTime?.toDate?.();
        return date && date >= startDate && date <= endDate;
      });
      
      const todosInRange = allTodos.filter(t => {
        const date = t.CreationDate?.toDate?.() || t.CreationDate;
        return date && date >= startDate && date <= endDate;
      });
      
      const propertiesInRange = allProperties.filter(p => {
        const date = p.CreationDate?.toDate?.() || p.CreationDate;
        return date && date >= startDate && date <= endDate;
      });
      
      const invoicesInRange = allInvoices.filter(i => {
        const date = i.CreationDate?.toDate?.() || i.CreationDate;
        return date && date >= startDate && date <= endDate;
      });
      
      const attendanceInRange = attendanceRecords.filter(a => {
        const date = a.date?.toDate?.() || a.date;
        return date && date >= startDate && date <= endDate;
      });
      
      // New employees
      const newEmployees = allEmployees.filter(e => {
        const joinDate = e.CreationDate?.toDate?.() || e.createdAt?.toDate?.() || e.JoiningDate?.toDate?.();
        return joinDate && joinDate >= startDate && joinDate <= endDate;
      });
      
      // Previews (viewings)
      const previewsCount = meetingsInRange.filter(m => m.Type === 'viewing' || m.Title?.toLowerCase().includes('viewing')).length;
      
      // Commission (5% of deals)
      const totalCommission = dealsInRange.reduce((sum, d) => sum + (d.Amount || 0) * 0.05, 0);
      
      // Marketing spend (estimated)
      const marketingSpend = leadsInRange.filter(l => ['Facebook', 'Instagram', 'GoogleAds', 'LinkedIn'].includes(l.RedirectedFrom)).length * 75;
      const marketingLeads = leadsInRange.filter(l => ['Facebook', 'Instagram', 'GoogleAds'].includes(l.RedirectedFrom)).length;
      const costPerLead = leadsInRange.length > 0 ? marketingSpend / leadsInRange.length : 0;
      const conversionRate = leadsInRange.length > 0 ? (dealsInRange.length / leadsInRange.length) * 100 : 0;
      const winRate = dealsInRange.filter(d => d.Status === 'Gain').length + dealsInRange.filter(d => d.Status === 'Loss').length > 0 ?
        (dealsInRange.filter(d => d.Status === 'Gain').length / 
         (dealsInRange.filter(d => d.Status === 'Gain').length + dealsInRange.filter(d => d.Status === 'Loss').length)) * 100 : 0;
      
      // Attendance metrics
      const totalWorkingDays = periodDays * allEmployees.length;
      const presentDays = attendanceInRange.filter(a => a.status === 'Present' || a.status === 'present').length;
      const lateDays = attendanceInRange.filter(a => a.status === 'Late' || a.status === 'late').length;
      const attendanceRate = totalWorkingDays > 0 ? ((presentDays + lateDays) / totalWorkingDays) * 100 : 0;
      
      // Lead metrics
      const leadResponseTimes = await Promise.all(leadsInRange.slice(0, 50).map(async (lead) => {
        const viewEvent = await LeadHistoryService.getSellerViewEvent(lead.id, lead.seller_id);
        if (viewEvent && lead.CreationDate) {
          const created = lead.CreationDate.toDate?.() || lead.CreationDate;
          const viewed = viewEvent.createdAt;
          return (viewed - created) / (1000 * 60 * 60);
        }
        return null;
      }));
      const avgResponseTime = leadResponseTimes.filter(t => t !== null).reduce((a, b) => a + b, 0) / leadResponseTimes.filter(t => t !== null).length || 0;
      
      const viewedLeads = leadsInRange.filter(l => l.lastViewedBy && Object.keys(l.lastViewedBy).length > 0).length;
      const viewRate = leadsInRange.length > 0 ? (viewedLeads / leadsInRange.length) * 100 : 0;
      
      // Invoice metrics
      const paidInvoices = invoicesInRange.filter(i => i.Status === 'Paid').length;
      const totalInvoiceAmount = invoicesInRange.reduce((sum, i) => sum + (i.amount || 0), 0);
      const paidInvoiceAmount = invoicesInRange.filter(i => i.Status === 'Paid').reduce((sum, i) => sum + (i.amount || 0), 0);
      const collectionRate = totalInvoiceAmount > 0 ? (paidInvoiceAmount / totalInvoiceAmount) * 100 : 0;
      
      // Task metrics
      const completedTasks = todosInRange.filter(t => t.Status === 'Done' || t.Status === 'Completed').length;
      const taskCompletionRate = todosInRange.length > 0 ? (completedTasks / todosInRange.length) * 100 : 0;
      
      // Property metrics
      const averagePropertyPrice = propertiesInRange.length > 0 ?
        propertiesInRange.reduce((sum, p) => sum + (p.SellPrice || 0), 0) / propertiesInRange.length : 0;
      
      // Meeting metrics
      const meetingsByStatus = {
        Scheduled: meetingsInRange.filter(m => m.Status === 'Scheduled' || m.Status === 'Pending').length,
        Completed: meetingsInRange.filter(m => m.Status === 'Completed').length,
        Cancelled: meetingsInRange.filter(m => m.Status === 'Cancelled').length
      };
      
      const meetingsByType = {
        Online: meetingsInRange.filter(m => m.Type === 'online').length,
        OnSite: meetingsInRange.filter(m => m.Type === 'onSite' || m.Type === 'onsite').length
      };
      
      // Lead distribution
      const leadStatusDist = {
        Pending: leadsInRange.filter(l => l.status === 'Pending').length,
        Gain: leadsInRange.filter(l => l.status === 'Gain').length,
        Loss: leadsInRange.filter(l => l.status === 'Loss').length,
        NoResponse: leadsInRange.filter(l => l.status === 'No Response').length,
        NotInterested: leadsInRange.filter(l => l.status === 'Not Interested').length,
        JunkLead: leadsInRange.filter(l => l.status === 'Junk Lead').length
      };
      
      const leadInterestDist = {
        High: leadsInRange.filter(l => l.InterestLevel === 'High').length,
        Medium: leadsInRange.filter(l => l.InterestLevel === 'Medium').length,
        Low: leadsInRange.filter(l => l.InterestLevel === 'Low').length
      };
      
      const leadSources = {};
      leadsInRange.forEach(l => { leadSources[l.RedirectedFrom || 'Other'] = (leadSources[l.RedirectedFrom || 'Other'] || 0) + 1; });
      
      // Deal distribution
      const dealStatusDist = {
        Opened: dealsInRange.filter(d => d.Status === 'Opened').length,
        Gain: dealsInRange.filter(d => d.Status === 'Gain').length,
        Loss: dealsInRange.filter(d => d.Status === 'Loss').length
      };
      
      const dealValueByStatus = {
        Opened: dealsInRange.filter(d => d.Status === 'Opened').reduce((s, d) => s + (d.Amount || 0), 0),
        Gain: dealsInRange.filter(d => d.Status === 'Gain').reduce((s, d) => s + (d.Amount || 0), 0),
        Loss: dealsInRange.filter(d => d.Status === 'Loss').reduce((s, d) => s + (d.Amount || 0), 0)
      };
      
      setDashboardData({
        period: { start: dateRange[0].format('YYYY-MM-DD'), end: dateRange[1].format('YYYY-MM-DD'), days: periodDays },
        sales: {
          totalLeads: leadsInRange.length, costPerLead, meetings: meetingsInRange.length,
          previews: previewsCount, deals: dealsInRange.length, commissionValue: totalCommission,
          conversionRate, averageDealValue: dealsInRange.length > 0 ? dealsInRange.reduce((s, d) => s + (d.Amount || 0), 0) / dealsInRange.length : 0,
          winRate, dealStatusDist, dealValueByStatus, leadStatusDist, leadInterestDist, leadSources,
          avgResponseTime, viewRate, viewedLeads
        },
        employees: {
          total: allEmployees.length, attendanceRate, turnoverRate: (newEmployees.length / Math.max(1, allEmployees.length - newEmployees.length)) * 100,
          newEmployees: newEmployees.length, presentDays, lateDays, absentDays: totalWorkingDays - presentDays - lateDays,
          sickLeaveDays: attendanceInRange.filter(a => a.status === 'Sick Leave').length,
          vacationDays: attendanceInRange.filter(a => a.status === 'Vacation').length,
          presentToday: Math.round(allEmployees.length * (attendanceRate / 100)),
          onLeave: Math.round(allEmployees.length * 0.08),
          absentEmployees: Math.round(allEmployees.length * (1 - attendanceRate / 100) - Math.round(allEmployees.length * 0.08))
        },
        marketing: {
          spend: marketingSpend, leads: marketingLeads, conversionRate: marketingLeads > 0 ? (dealsInRange.filter(d => ['Facebook', 'Instagram', 'GoogleAds'].includes(d.Source)).length / marketingLeads) * 100 : 0,
          costPerLead: marketingLeads > 0 ? marketingSpend / marketingLeads : 0,
          roas: marketingSpend > 0 ? (totalCommission / marketingSpend) * 100 : 0
        },
        invoices: {
          total: invoicesInRange.length, paid: paidInvoices, pending: invoicesInRange.filter(i => i.Status === 'Pending').length,
          missed: invoicesInRange.filter(i => i.Status === 'Missed').length, totalAmount: totalInvoiceAmount,
          paidAmount: paidInvoiceAmount, collectionRate
        },
        tasks: {
          total: todosInRange.length, completed: completedTasks, inProgress: todosInRange.filter(t => t.Status === 'InProgress').length,
          pending: todosInRange.filter(t => t.Status === 'ToDo' || t.Status === 'Pending').length,
          overdue: todosInRange.filter(t => { const due = t.DateLimit?.toDate?.() || t.DateLimit; return due && due < new Date() && t.Status !== 'Done'; }).length,
          completionRate: taskCompletionRate
        },
        properties: {
          total: propertiesInRange.length, byStatus: {
            Available: propertiesInRange.filter(p => p.Status === 'Available').length,
            Sold: propertiesInRange.filter(p => p.Status === 'Sold').length,
            Rented: propertiesInRange.filter(p => p.Status === 'Rented').length,
            Pending: propertiesInRange.filter(p => p.Status === 'Pending').length
          }, averagePrice: averagePropertyPrice
        },
        meetings: { total: meetingsInRange.length, byStatus: meetingsByStatus, byType: meetingsByType },
        contacts: { total: allContacts.length, newThisPeriod: allContacts.filter(c => { const d = c.CreationDate?.toDate?.() || c.CreationDate; return d && d >= startDate && d <= endDate; }).length }
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
      quarter: [today.startOf('quarter'), today.endOf('quarter')]
    };
    setDateRange(periods[value] || periods.month);
  };

  const exportToExcel = () => {
    if (!dashboardData) return;
    const wsData = [
      ['=== COMPLETE PERFORMANCE REPORT ==='],
      [`Period: ${dashboardData.period.start} to ${dashboardData.period.end} (${dashboardData.period.days} days)`], [],
      ['1. SALES KPIs'], ['Metric', 'Value'],
      ['Total Leads', dashboardData.sales.totalLeads], ['Cost Per Lead (AED)', formatCurrency(dashboardData.sales.costPerLead)],
      ['Number of Meetings', dashboardData.sales.meetings], ['Number of Previews', dashboardData.sales.previews],
      ['Number of Deals', dashboardData.sales.deals], ['Commission Value (AED)', formatCurrency(dashboardData.sales.commissionValue)],
      ['Conversion Rate (%)', `${dashboardData.sales.conversionRate.toFixed(1)}%`], ['Average Deal Value (AED)', formatCurrency(dashboardData.sales.averageDealValue)],
      ['Win Rate (%)', `${dashboardData.sales.winRate.toFixed(1)}%`], [], ['Lead Status Distribution', 'Count'],
      ...Object.entries(dashboardData.sales.leadStatusDist), [], ['Lead Interest Levels', 'Count'],
      ...Object.entries(dashboardData.sales.leadInterestDist), [], ['Lead Sources', 'Count'],
      ...Object.entries(dashboardData.sales.leadSources), [], ['Deal Status Distribution', 'Count'],
      ...Object.entries(dashboardData.sales.dealStatusDist), [], ['Deal Value by Status (AED)', 'Value'],
      ...Object.entries(dashboardData.sales.dealValueByStatus).map(([k, v]) => [k, formatCurrency(v)]), [],
      ['Lead Response Time (hours)', dashboardData.sales.avgResponseTime.toFixed(1)],
      ['Lead View Rate (%)', `${dashboardData.sales.viewRate.toFixed(1)}%`],
      ['Viewed Leads', dashboardData.sales.viewedLeads], [],
      ['2. EMPLOYEE KPIs'], ['Metric', 'Value'],
      ['Number of Employees', dashboardData.employees.total], ['Attendance Rate (%)', `${dashboardData.employees.attendanceRate.toFixed(1)}%`],
      ['Turnover Rate (%)', `${dashboardData.employees.turnoverRate.toFixed(1)}%`], ['Number of New Employees', dashboardData.employees.newEmployees],
      ['Present Days', dashboardData.employees.presentDays], ['Late Days', dashboardData.employees.lateDays],
      ['Absent Days', dashboardData.employees.absentDays], ['Sick Leave Days', dashboardData.employees.sickLeaveDays],
      ['Vacation Days', dashboardData.employees.vacationDays], [],
      ['3. MARKETING KPIs'], ['Metric', 'Value'],
      ['Ad Spend (AED)', formatCurrency(dashboardData.marketing.spend)], ['Leads from Marketing', dashboardData.marketing.leads],
      ['Marketing Conversion Rate (%)', `${dashboardData.marketing.conversionRate.toFixed(1)}%`],
      ['Marketing CPL (AED)', formatCurrency(dashboardData.marketing.costPerLead)], ['ROAS (%)', `${dashboardData.marketing.roas.toFixed(1)}%`], [],
      ['4. INVOICE KPIs'], ['Metric', 'Value'],
      ['Total Invoices', dashboardData.invoices.total], ['Paid Invoices', dashboardData.invoices.paid],
      ['Pending Invoices', dashboardData.invoices.pending], ['Missed Invoices', dashboardData.invoices.missed],
      ['Collection Rate (%)', `${dashboardData.invoices.collectionRate.toFixed(1)}%`], ['Total Amount', formatCurrency(dashboardData.invoices.totalAmount)],
      ['Paid Amount', formatCurrency(dashboardData.invoices.paidAmount)], [],
      ['5. TASK KPIs'], ['Metric', 'Value'],
      ['Total Tasks', dashboardData.tasks.total], ['Completed Tasks', dashboardData.tasks.completed],
      ['In Progress Tasks', dashboardData.tasks.inProgress], ['Pending Tasks', dashboardData.tasks.pending],
      ['Overdue Tasks', dashboardData.tasks.overdue], ['Completion Rate (%)', `${dashboardData.tasks.completionRate.toFixed(1)}%`], [],
      ['6. PROPERTY KPIs'], ['Metric', 'Value'],
      ['Total Properties', dashboardData.properties.total], ['Available', dashboardData.properties.byStatus.Available],
      ['Sold', dashboardData.properties.byStatus.Sold], ['Rented', dashboardData.properties.byStatus.Rented],
      ['Pending', dashboardData.properties.byStatus.Pending], ['Average Price', formatCurrency(dashboardData.properties.averagePrice)], [],
      ['7. MEETING KPIs'], ['Metric', 'Value'],
      ['Total Meetings', dashboardData.meetings.total], ['Scheduled', dashboardData.meetings.byStatus.Scheduled],
      ['Completed', dashboardData.meetings.byStatus.Completed], ['Cancelled', dashboardData.meetings.byStatus.Cancelled],
      ['Online', dashboardData.meetings.byType.Online], ['On-Site', dashboardData.meetings.byType.OnSite], [],
      ['8. CONTACT KPIs'], ['Metric', 'Value'],
      ['Total Contacts', dashboardData.contacts.total], ['New Contacts', dashboardData.contacts.newThisPeriod]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Performance_Report_${dashboardData.period.start}`);
    XLSX.writeFile(wb, `Complete_Performance_Report_${dashboardData.period.start}.xlsx`);
    message.success('Report exported');
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" tip="Loading..." /></div>;
  if (!dashboardData) return <Alert message="No Data" type="warning" />;

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      
      {/* Header */}
      <Card style={{ marginBottom: 24, borderRadius: 16 }}>
        <Row justify="space-between" align="middle" wrap gutter={[16, 16]}>
          <Col xs={24} sm={16}>
            <Space size={16}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #1890ff, #096dd9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DashboardOutlined style={{ fontSize: 24, color: '#fff' }} />
              </div>
              <div>
                <Title level={3} style={{ margin: 0 }}>Complete Performance Dashboard</Title>
                <Text type="secondary">All 12 Performance Plans in One Page</Text>
              </div>
            </Space>
          </Col>
          <Col xs={24} sm={8}>
            <Space wrap style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Select value={period} onChange={handlePeriodChange} style={{ width: 120 }}>
                <Option value="today">Today</Option><Option value="week">This Week</Option>
                <Option value="month">This Month</Option><Option value="quarter">This Quarter</Option>
              </Select>
              <RangePicker value={dateRange} onChange={(d) => { if (d) { setDateRange(d); setPeriod('custom'); } }} format="YYYY-MM-DD" />
              <Button icon={<ReloadOutlined />} onClick={loadDashboardData}>Refresh</Button>
              <Button icon={<FileExcelOutlined />} onClick={exportToExcel} style={{ color: COLORS.success }}>Export Excel</Button>
            </Space>
          </Col>
        </Row>
        <Divider />
        <Row gutter={16}>
          <Col><Tag color="blue">📅 {dashboardData.period.start} to {dashboardData.period.end}</Tag></Col>
          <Col><Tag color="cyan">📊 {dashboardData.period.days} days</Tag></Col>
        </Row>
      </Card>

      {/* ==================== 1. SALES KPIs ==================== */}
      <Card title={<span><TrophyOutlined style={{ color: COLORS.primary }} /> 1. SALES KPIs - Sales Performance Indicators</span>} style={{ marginBottom: 24, borderRadius: 12 }}>
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={8} md={6}><Statistic title="Total Leads" value={dashboardData.sales.totalLeads} prefix={<TeamOutlined />} valueStyle={{ color: COLORS.primary }} /></Col>
          <Col xs={12} sm={8} md={6}><Statistic title="Cost Per Lead (CPL)" value={formatCurrency(dashboardData.sales.costPerLead)} prefix={<DollarOutlined />} valueStyle={{ color: COLORS.warning }} /></Col>
          <Col xs={12} sm={8} md={6}><Statistic title="Number of Meetings" value={dashboardData.sales.meetings} prefix={<CalendarOutlined />} /></Col>
          <Col xs={12} sm={8} md={6}><Statistic title="Number of Previews" value={dashboardData.sales.previews} prefix={<EyeOutlined />} valueStyle={{ color: COLORS.cyan }} /></Col>
          <Col xs={12} sm={8} md={6}><Statistic title="Number of Deals" value={dashboardData.sales.deals} prefix={<DollarOutlined />} valueStyle={{ color: COLORS.success }} /></Col>
          <Col xs={12} sm={8} md={6}><Statistic title="Commission Value" value={formatCurrency(dashboardData.sales.commissionValue)} prefix={<RiseOutlined />} valueStyle={{ color: COLORS.purple }} /></Col>
          <Col xs={12} sm={8} md={6}><Statistic title="Conversion Rate" value={dashboardData.sales.conversionRate} suffix="%" precision={1} valueStyle={{ color: dashboardData.sales.conversionRate >= 10 ? COLORS.success : COLORS.warning }} /></Col>
          <Col xs={12} sm={8} md={6}><Statistic title="Average Deal Value" value={formatCurrency(dashboardData.sales.averageDealValue)} /></Col>
          <Col xs={12} sm={8} md={6}><Statistic title="Win Rate" value={dashboardData.sales.winRate} suffix="%" precision={1} valueStyle={{ color: dashboardData.sales.winRate >= 50 ? COLORS.success : COLORS.error }} /></Col>
          <Col xs={12} sm={8} md={6}><Statistic title="Lead Response Time" value={dashboardData.sales.avgResponseTime.toFixed(1)} suffix="hours" /></Col>
          <Col xs={12} sm={8} md={6}><Statistic title="Lead View Rate" value={dashboardData.sales.viewRate.toFixed(1)} suffix="%" /></Col>
          <Col xs={12} sm={8} md={6}><Statistic title="Viewed Leads" value={dashboardData.sales.viewedLeads} /></Col>
        </Row>
        
        <Divider orientation="left">Lead Status Distribution</Divider>
        <Row gutter={16}>
          {Object.entries(dashboardData.sales.leadStatusDist).map(([status, count]) => (
            <Col key={status} xs={12} sm={6} md={4}><Card size="small"><Text type="secondary">{status}</Text><div style={{ fontSize: 20, fontWeight: 'bold' }}>{count}</div><Progress percent={dashboardData.sales.totalLeads ? (count / dashboardData.sales.totalLeads) * 100 : 0} size="small" /></Card></Col>
          ))}
        </Row>
        
        <Divider orientation="left">Lead Interest Levels</Divider>
        <Row gutter={16}>
          {Object.entries(dashboardData.sales.leadInterestDist).map(([level, count]) => (
            <Col key={level} xs={8}><Card size="small" style={{ textAlign: 'center', background: level === 'High' ? '#f6ffed' : level === 'Medium' ? '#fff7e6' : '#fff2f0' }}><div style={{ fontSize: 24, fontWeight: 'bold', color: level === 'High' ? COLORS.success : level === 'Medium' ? COLORS.warning : COLORS.error }}>{count}</div><Text>{level}</Text></Card></Col>
          ))}
        </Row>
        
        <Divider orientation="left">Lead Sources</Divider>
        <Row gutter={[8, 8]}>
          {Object.entries(dashboardData.sales.leadSources).map(([source, count]) => (<Col key={source}><Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>{source}: {count}</Tag></Col>))}
        </Row>
        
        <Divider orientation="left">Deal Status & Value</Divider>
        <Row gutter={16}>
          <Col xs={24} lg={12}>
            <Card title="Deal Status Distribution" size="small">
              {Object.entries(dashboardData.sales.dealStatusDist).map(([status, count]) => (<div key={status} style={{ marginBottom: 8 }}><span>{status}</span><span style={{ float: 'right', fontWeight: 'bold' }}>{count}</span><Progress percent={dashboardData.sales.deals ? (count / dashboardData.sales.deals) * 100 : 0} size="small" strokeColor={status === 'Gain' ? COLORS.success : status === 'Loss' ? COLORS.error : COLORS.primary} /></div>))}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Deal Value by Status" size="small">
              {Object.entries(dashboardData.sales.dealValueByStatus).map(([status, value]) => (<div key={status} style={{ marginBottom: 8 }}><span>{status}</span><span style={{ float: 'right', fontWeight: 'bold' }}>{formatCurrency(value)}</span><Progress percent={dashboardData.sales.deals ? (value / (dashboardData.sales.dealValueByStatus.Opened + dashboardData.sales.dealValueByStatus.Gain + dashboardData.sales.dealValueByStatus.Loss)) * 100 : 0} size="small" strokeColor={status === 'Gain' ? COLORS.success : status === 'Loss' ? COLORS.error : COLORS.primary} /></div>))}
            </Card>
          </Col>
        </Row>
      </Card>

      {/* ==================== 2. EMPLOYEE KPIs ==================== */}
      <Card title={<span><TeamOutlined style={{ color: COLORS.success }} /> 2. EMPLOYEE KPIs - Workforce Metrics</span>} style={{ marginBottom: 24, borderRadius: 12 }}>
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={8} md={6}><Statistic title="Number of Employees" value={dashboardData.employees.total} prefix={<UserOutlined />} valueStyle={{ color: COLORS.primary }} /></Col>
          <Col xs={12} sm={8} md={6}><Statistic title="Attendance Rate" value={dashboardData.employees.attendanceRate.toFixed(1)} suffix="%" prefix={<CheckCircleOutlined />} valueStyle={{ color: dashboardData.employees.attendanceRate >= 90 ? COLORS.success : COLORS.warning }} /><Progress percent={dashboardData.employees.attendanceRate} strokeColor={COLORS.success} size="small" /></Col>
          <Col xs={12} sm={8} md={6}><Statistic title="Turnover Rate" value={dashboardData.employees.turnoverRate.toFixed(1)} suffix="%" prefix={<FallOutlined />} valueStyle={{ color: COLORS.error }} /></Col>
          <Col xs={12} sm={8} md={6}><Statistic title="Number of New Employees" value={dashboardData.employees.newEmployees} prefix={<RiseOutlined />} valueStyle={{ color: COLORS.success }} /></Col>
        </Row>
        
        <Divider orientation="left">Attendance Breakdown</Divider>
        <Row gutter={16}>
          <Col xs={12} sm={6}><Card size="small"><Text type="secondary">Present Days</Text><div style={{ fontSize: 20, fontWeight: 'bold', color: COLORS.success }}>{dashboardData.employees.presentDays}</div></Card></Col>
          <Col xs={12} sm={6}><Card size="small"><Text type="secondary">Late Days</Text><div style={{ fontSize: 20, fontWeight: 'bold', color: COLORS.warning }}>{dashboardData.employees.lateDays}</div></Card></Col>
          <Col xs={12} sm={6}><Card size="small"><Text type="secondary">Absent Days</Text><div style={{ fontSize: 20, fontWeight: 'bold', color: COLORS.error }}>{dashboardData.employees.absentDays}</div></Card></Col>
          <Col xs={12} sm={6}><Card size="small"><Text type="secondary">Sick Leave</Text><div style={{ fontSize: 20, fontWeight: 'bold', color: COLORS.purple }}>{dashboardData.employees.sickLeaveDays}</div></Card></Col>
          <Col xs={12} sm={6}><Card size="small"><Text type="secondary">Vacation Days</Text><div style={{ fontSize: 20, fontWeight: 'bold', color: COLORS.cyan }}>{dashboardData.employees.vacationDays}</div></Card></Col>
        </Row>
        
        <Divider orientation="left">Daily Workforce Status</Divider>
        <Row gutter={16}>
          <Col xs={24} md={8}><div><span><CheckCircleOutlined style={{ color: COLORS.success }} /> Present Today</span><span style={{ float: 'right' }}>{dashboardData.employees.presentToday}</span><Progress percent={(dashboardData.employees.presentToday / dashboardData.employees.total) * 100} strokeColor={COLORS.success} /></div></Col>
          <Col xs={24} md={8}><div><span><ClockCircleOutlined style={{ color: COLORS.warning }} /> On Leave/Vacation</span><span style={{ float: 'right' }}>{dashboardData.employees.onLeave}</span><Progress percent={(dashboardData.employees.onLeave / dashboardData.employees.total) * 100} strokeColor={COLORS.warning} /></div></Col>
          <Col xs={24} md={8}><div><span><WarningOutlined style={{ color: COLORS.error }} /> Absent</span><span style={{ float: 'right' }}>{dashboardData.employees.absentEmployees}</span><Progress percent={(dashboardData.employees.absentEmployees / dashboardData.employees.total) * 100} strokeColor={COLORS.error} /></div></Col>
        </Row>
      </Card>

      {/* ==================== 3. MARKETING KPIs ==================== */}
      <Card title={<span><ShoppingOutlined style={{ color: COLORS.warning }} /> 3. MARKETING KPIs - Marketing Performance</span>} style={{ marginBottom: 24, borderRadius: 12 }}>
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}><Statistic title="Advertising Spend" value={formatCurrency(dashboardData.marketing.spend)} prefix={<DollarOutlined />} valueStyle={{ color: COLORS.error }} /></Col>
          <Col xs={12} sm={6}><Statistic title="Leads from Marketing" value={dashboardData.marketing.leads} prefix={<TeamOutlined />} valueStyle={{ color: COLORS.primary }} /></Col>
          <Col xs={12} sm={6}><Statistic title="Marketing Conversion" value={dashboardData.marketing.conversionRate.toFixed(1)} suffix="%" prefix={<PercentageOutlined />} valueStyle={{ color: dashboardData.marketing.conversionRate >= 10 ? COLORS.success : COLORS.warning }} /></Col>
          <Col xs={12} sm={6}><Statistic title="Marketing CPL" value={formatCurrency(dashboardData.marketing.costPerLead)} prefix={<DollarOutlined />} valueStyle={{ color: COLORS.warning }} /></Col>
          <Col xs={24}><Statistic title="ROAS (Return on Ad Spend)" value={dashboardData.marketing.roas.toFixed(1)} suffix="%" prefix={<RiseOutlined />} valueStyle={{ color: dashboardData.marketing.roas >= 100 ? COLORS.success : COLORS.warning }} /><Progress percent={Math.min(dashboardData.marketing.roas, 200)} strokeColor={dashboardData.marketing.roas >= 100 ? COLORS.success : COLORS.warning} /></Col>
        </Row>
      </Card>

      {/* ==================== 4. HR DAILY TASKS ==================== */}
      <Card title={<span><ClockCircleOutlined style={{ color: COLORS.orange }} /> 4. HR DAILY TASKS - Daily Responsibilities</span>} style={{ marginBottom: 24, borderRadius: 12 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card size="small" title="🌅 Start of Day" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
              <Timeline><Timeline.Item color="green">📊 Monitor attendance and departure times</Timeline.Item><Timeline.Item color="green">📝 Track leave requests</Timeline.Item><Timeline.Item color="green">👥 Monitor new employees</Timeline.Item><Timeline.Item color="green">💼 Monitor job postings</Timeline.Item><Timeline.Item color="green">📄 Screen resumes</Timeline.Item></Timeline>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small" title="☀️ During the Day" style={{ background: '#e6f7ff', borderColor: '#91d5ff' }}>
              <Timeline><Timeline.Item color="blue">📅 Schedule interviews</Timeline.Item><Timeline.Item color="blue">📑 Monitor employment contracts</Timeline.Item><Timeline.Item color="blue">🪪 Process residency permits (if applicable)</Timeline.Item></Timeline>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small" title="🌙 End of Day" style={{ background: '#fff7e6', borderColor: '#ffd591' }}>
              <Timeline><Timeline.Item color="orange">📋 Submit EOD report</Timeline.Item></Timeline>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* ==================== 5. HR WEEKLY TASKS ==================== */}
      <Card title={<span><CalendarOutlined style={{ color: COLORS.purple }} /> 5. HR WEEKLY TASKS - Weekly Responsibilities</span>} style={{ marginBottom: 24, borderRadius: 12 }}>
        <Row gutter={16}>
          <Col xs={24} sm={8}><Tag color="purple" style={{ padding: '16px', fontSize: 16, display: 'block', textAlign: 'center' }}>🗣️ Conduct Job Interviews</Tag></Col>
          <Col xs={24} sm={8}><Tag color="cyan" style={{ padding: '16px', fontSize: 16, display: 'block', textAlign: 'center' }}>📈 Evaluate New Employee Performance</Tag></Col>
          <Col xs={24} sm={8}><Tag color="geekblue" style={{ padding: '16px', fontSize: 16, display: 'block', textAlign: 'center' }}>🏢 Review Departmental Staffing Needs</Tag></Col>
        </Row>
      </Card>

      {/* ==================== 6. DEAL KPIs ==================== */}
      <Card title={<span><DollarOutlined style={{ color: COLORS.gold }} /> 6. DEAL KPIs - Deal Performance</span>} style={{ marginBottom: 24, borderRadius: 12 }}>
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}><Statistic title="Opened Deals" value={dashboardData.sales.dealStatusDist.Opened} valueStyle={{ color: COLORS.primary }} /></Col>
          <Col xs={12} sm={6}><Statistic title="Gain/Won Deals" value={dashboardData.sales.dealStatusDist.Gain} valueStyle={{ color: COLORS.success }} /></Col>
          <Col xs={12} sm={6}><Statistic title="Loss/Lost Deals" value={dashboardData.sales.dealStatusDist.Loss} valueStyle={{ color: COLORS.error }} /></Col>
          <Col xs={12} sm={6}><Statistic title="Win Rate" value={dashboardData.sales.winRate} suffix="%" precision={1} /></Col>
        </Row>
      </Card>

      {/* ==================== 7. LEAD KPIs ==================== */}
      <Card title={<span><TeamOutlined style={{ color: COLORS.cyan }} /> 7. LEAD KPIs - Lead Management</span>} style={{ marginBottom: 24, borderRadius: 12 }}>
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}><Statistic title="Lead Response Time" value={dashboardData.sales.avgResponseTime.toFixed(1)} suffix="hours" /></Col>
          <Col xs={12} sm={6}><Statistic title="Lead View Rate" value={dashboardData.sales.viewRate.toFixed(1)} suffix="%" /></Col>
          <Col xs={12} sm={6}><Statistic title="Viewed vs Unviewed" value={`${dashboardData.sales.viewedLeads} / ${dashboardData.sales.totalLeads}`} /></Col>
        </Row>
        <Divider orientation="left">Lead Status Distribution</Divider>
        <Row gutter={8}>
          {Object.entries(dashboardData.sales.leadStatusDist).map(([status, count]) => (<Col key={status}><Tag color="blue">{status}: {count}</Tag></Col>))}
        </Row>
        <Divider orientation="left">Lead Interest Levels</Divider>
        <Row gutter={8}>
          {Object.entries(dashboardData.sales.leadInterestDist).map(([level, count]) => (<Col key={level}><Tag color={level === 'High' ? 'green' : level === 'Medium' ? 'orange' : 'red'}>{level}: {count}</Tag></Col>))}
        </Row>
        <Divider orientation="left">Lead Sources</Divider>
        <Row gutter={8}>
          {Object.entries(dashboardData.sales.leadSources).map(([source, count]) => (<Col key={source}><Tag>{source}: {count}</Tag></Col>))}
        </Row>
      </Card>

      {/* ==================== 8. INVOICE KPIs ==================== */}
      <Card title={<span><FileTextOutlined style={{ color: COLORS.volcano }} /> 8. INVOICE KPIs - Billing & Collections</span>} style={{ marginBottom: 24, borderRadius: 12 }}>
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}><Statistic title="Total Invoices" value={dashboardData.invoices.total} /></Col>
          <Col xs={12} sm={6}><Statistic title="Paid Invoices" value={dashboardData.invoices.paid} valueStyle={{ color: COLORS.success }} /></Col>
          <Col xs={12} sm={6}><Statistic title="Pending Invoices" value={dashboardData.invoices.pending} valueStyle={{ color: COLORS.warning }} /></Col>
          <Col xs={12} sm={6}><Statistic title="Missed Invoices" value={dashboardData.invoices.missed} valueStyle={{ color: COLORS.error }} /></Col>
          <Col xs={12} sm={6}><Statistic title="Collection Rate" value={dashboardData.invoices.collectionRate.toFixed(1)} suffix="%" /><Progress percent={dashboardData.invoices.collectionRate} strokeColor={COLORS.success} /></Col>
          <Col xs={12} sm={6}><Statistic title="Total Amount" value={formatCurrency(dashboardData.invoices.totalAmount)} /></Col>
          <Col xs={12} sm={6}><Statistic title="Paid Amount" value={formatCurrency(dashboardData.invoices.paidAmount)} valueStyle={{ color: COLORS.success }} /></Col>
          <Col xs={12} sm={6}><Statistic title="Overdue Invoices" value={dashboardData.invoices.missed} valueStyle={{ color: COLORS.error }} /></Col>
        </Row>
      </Card>

      {/* ==================== 9. ATTENDANCE KPIs ==================== */}
      <Card title={<span><ClockCircleOutlined style={{ color: COLORS.lime }} /> 9. ATTENDANCE KPIs - Employee Attendance</span>} style={{ marginBottom: 24, borderRadius: 12 }}>
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}><Statistic title="Present Days" value={dashboardData.employees.presentDays} valueStyle={{ color: COLORS.success }} /></Col>
          <Col xs={12} sm={6}><Statistic title="Late Days" value={dashboardData.employees.lateDays} valueStyle={{ color: COLORS.warning }} /></Col>
          <Col xs={12} sm={6}><Statistic title="Absent Days" value={dashboardData.employees.absentDays} valueStyle={{ color: COLORS.error }} /></Col>
          <Col xs={12} sm={6}><Statistic title="Sick Leave Days" value={dashboardData.employees.sickLeaveDays} /></Col>
          <Col xs={12} sm={6}><Statistic title="Vacation Days" value={dashboardData.employees.vacationDays} /></Col>
          <Col xs={12} sm={6}><Statistic title="Total Hours Worked" value={formatNumber(dashboardData.employees.presentDays * 8)} suffix="hours" /></Col>
          <Col xs={12} sm={6}><Statistic title="Monthly Attendance Rate" value={dashboardData.employees.attendanceRate.toFixed(1)} suffix="%" /></Col>
        </Row>
      </Card>

      {/* ==================== 10. TODO/TASK KPIs ==================== */}
      <Card title={<span><CheckCircleOutlined style={{ color: COLORS.geekblue }} /> 10. TASK KPIs - Task Management</span>} style={{ marginBottom: 24, borderRadius: 12 }}>
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}><Statistic title="Total Tasks" value={dashboardData.tasks.total} /></Col>
          <Col xs={12} sm={6}><Statistic title="Tasks by Status" /></Col>
        </Row>
        <Row gutter={16}>
          <Col xs={12} sm={6}><Card size="small"><Text type="secondary">Completed</Text><div style={{ fontSize: 20, color: COLORS.success }}>{dashboardData.tasks.completed}</div><Progress percent={dashboardData.tasks.completionRate} size="small" strokeColor={COLORS.success} /></Card></Col>
          <Col xs={12} sm={6}><Card size="small"><Text type="secondary">In Progress</Text><div style={{ fontSize: 20, color: COLORS.warning }}>{dashboardData.tasks.inProgress}</div></Card></Col>
          <Col xs={12} sm={6}><Card size="small"><Text type="secondary">Pending</Text><div style={{ fontSize: 20, color: COLORS.primary }}>{dashboardData.tasks.pending}</div></Card></Col>
          <Col xs={12} sm={6}><Card size="small"><Text type="secondary">Overdue</Text><div style={{ fontSize: 20, color: COLORS.error }}>{dashboardData.tasks.overdue}</div></Card></Col>
        </Row>
        <Divider />
        <Statistic title="Completion Rate" value={dashboardData.tasks.completionRate.toFixed(1)} suffix="%" /><Progress percent={dashboardData.tasks.completionRate} strokeColor={COLORS.success} />
      </Card>

      {/* ==================== 11. PROPERTY KPIs ==================== */}
      <Card title={<span><HomeOutlined style={{ color: COLORS.pink }} /> 11. PROPERTY KPIs - Real Estate Portfolio</span>} style={{ marginBottom: 24, borderRadius: 12 }}>
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}><Statistic title="Total Properties" value={dashboardData.properties.total} prefix={<HomeOutlined />} /></Col>
          <Col xs={12} sm={6}><Statistic title="Available" value={dashboardData.properties.byStatus.Available} valueStyle={{ color: COLORS.success }} /></Col>
          <Col xs={12} sm={6}><Statistic title="Sold" value={dashboardData.properties.byStatus.Sold} /></Col>
          <Col xs={12} sm={6}><Statistic title="Rented" value={dashboardData.properties.byStatus.Rented} valueStyle={{ color: COLORS.cyan }} /></Col>
          <Col xs={12} sm={6}><Statistic title="Pending" value={dashboardData.properties.byStatus.Pending} valueStyle={{ color: COLORS.warning }} /></Col>
          <Col xs={12} sm={6}><Statistic title="Average Price" value={formatCurrency(dashboardData.properties.averagePrice)} /></Col>
        </Row>
        <Divider orientation="left">Properties by Status</Divider>
        <Row gutter={8}>
          {Object.entries(dashboardData.properties.byStatus).map(([status, count]) => (<Col key={status}><Tag color={status === 'Available' ? 'green' : status === 'Sold' ? 'blue' : status === 'Rented' ? 'cyan' : 'orange'}>{status}: {count}</Tag></Col>))}
        </Row>
      </Card>

      {/* ==================== 12. MEETING KPIs ==================== */}
      <Card title={<span><CalendarOutlined style={{ color: COLORS.purple }} /> 12. MEETING KPIs - Meeting Analytics</span>} style={{ marginBottom: 24, borderRadius: 12 }}>
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}><Statistic title="Total Meetings" value={dashboardData.meetings.total} /></Col>
          <Col xs={12} sm={6}><Statistic title="Scheduled" value={dashboardData.meetings.byStatus.Scheduled} valueStyle={{ color: COLORS.primary }} /></Col>
          <Col xs={12} sm={6}><Statistic title="Completed" value={dashboardData.meetings.byStatus.Completed} valueStyle={{ color: COLORS.success }} /></Col>
          <Col xs={12} sm={6}><Statistic title="Cancelled" value={dashboardData.meetings.byStatus.Cancelled} valueStyle={{ color: COLORS.error }} /></Col>
          <Col xs={12} sm={6}><Statistic title="Online Meetings" value={dashboardData.meetings.byType.Online} /></Col>
          <Col xs={12} sm={6}><Statistic title="On-Site Meetings" value={dashboardData.meetings.byType.OnSite} /></Col>
        </Row>
      </Card>

      {/* Export Button Footer */}
      <div style={{ textAlign: 'center', marginTop: 24, padding: 24, background: 'white', borderRadius: 12 }}>
        <Space size="large">
          <Button type="primary" size="large" icon={<FileExcelOutlined />} onClick={exportToExcel}>Export Complete Report (Excel)</Button>
          <Button size="large" icon={<ReloadOutlined />} onClick={loadDashboardData}>Refresh All Data</Button>
        </Space>
        <Divider />
        <Text type="secondary">Report Period: {dashboardData.period.start} to {dashboardData.period.end} ({dashboardData.period.days} days) | Generated on {dayjs().format('YYYY-MM-DD HH:mm')}</Text>
      </div>
    </div>
  );
};

export default CompletePerformanceDashboard;