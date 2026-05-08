// pages/SellersPage.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  Card, Table, Tag, Space, Button, Input, Select, Modal,
  message, Tooltip, Popconfirm, Typography, Progress, Row, Col,
  Statistic, Drawer, DatePicker, Tabs, List, Avatar, Divider, Badge
} from 'antd';
import {
  UserAddOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  EyeOutlined, PhoneOutlined, MailOutlined, TrophyOutlined,
  CalendarOutlined, LineChartOutlined, SwapOutlined, RiseOutlined,
  FallOutlined, FireOutlined, ThunderboltOutlined, TeamOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined,
  DollarOutlined, FunnelPlotOutlined, BarChartOutlined
} from '@ant-design/icons';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, Legend, ResponsiveContainer, RadialBarChart,
  RadialBar, LineChart, Line, Funnel, FunnelChart, LabelList
} from 'recharts';
import { useSelector } from 'react-redux';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from 'configs/FirebaseConfig';
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

// ─── Color palette ────────────────────────────────────────────────────────────
const C = {
  green:  '#52c41a', red:    '#ff4d4f', blue:   '#1890ff',
  purple: '#722ed1', orange: '#fa8c16', cyan:   '#13c2c2',
  gold:   '#faad14', pink:   '#eb2f96', lime:   '#a0d911',
};

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
const pct = (num, total) => total > 0 ? Math.round((num / total) * 100) : 0;
const fmt  = (n) => Number(n || 0).toLocaleString('en-AE');
const deltaIcon = (v) => v >= 0
  ? <RiseOutlined style={{ color: C.green }} />
  : <FallOutlined style={{ color: C.red }} />;

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, sub, color = C.blue, suffix = '', extra }) => (
  <Card
    size="small"
    style={{
      borderRadius: 12,
      border: `1px solid ${color}33`,
      background: `linear-gradient(135deg, #fff 60%, ${color}11 100%)`,
      height: '100%'
    }}
    bodyStyle={{ padding: '14px 16px' }}
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
        background: `${color}18`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 22, color
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </Text>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1.2 }}>{value}</span>
          {suffix && <span style={{ fontSize: 13, color: '#999' }}>{suffix}</span>}
        </div>
        {sub && <Text type="secondary" style={{ fontSize: 11 }}>{sub}</Text>}
        {extra && <div style={{ marginTop: 4 }}>{extra}</div>}
      </div>
    </div>
  </Card>
);

// ─── Section header ───────────────────────────────────────────────────────────
const SectionTitle = ({ icon, title, color = C.blue }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
    <div style={{ width: 4, height: 20, borderRadius: 2, background: color }} />
    <span style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>{icon} {title}</span>
  </div>
);

// ─── Custom tooltip for recharts ──────────────────────────────────────────────
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: '8px 12px', boxShadow: '0 2px 8px rgba(0,0,0,.1)' }}>
      {label && <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 12 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 12, color: p.color }}>
          {p.name}: <b>{p.value}</b>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const SellersPage = () => {
  const reduxUser = useSelector(s => s.auth.user);
  const companyId  = reduxUser?.company_id || '';
  const userRole   = reduxUser?.Role || '';

  const [loading,          setLoading]          = useState(true);
  const [users,            setUsers]            = useState([]);
  const [filteredUsers,    setFilteredUsers]    = useState([]);
  const [searchText,       setSearchText]       = useState('');
  const [roleFilter,       setRoleFilter]       = useState(undefined);
  const [isAddModalVisible,  setIsAddModalVisible]  = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [currentUser,      setCurrentUser]      = useState(null);
  const [sellerProgress,   setSellerProgress]   = useState({});
  const [selectedSeller,   setSelectedSeller]   = useState(null);
  const [analyticsVisible, setAnalyticsVisible] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsData,    setAnalyticsData]    = useState(null);
  const [dateRange,        setDateRange]        = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [selectedMonth,    setSelectedMonth]    = useState(dayjs());
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [transferFromSeller,   setTransferFromSeller]   = useState(null);

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
      list = list.filter(u => u.id !== reduxUser?.id);

      const withLeads = await Promise.all(list.map(async u => {
        try {
          const allLeads = await LeadsService.getSellerLeadsByDateRange(companyId, u.id);
          const contacted = await Promise.all(
            allLeads.map(lead => LeadHistoryService.hasSellerContactedLead(lead.id, u.id))
          ).then(rs => rs.filter(Boolean).length);
          return { ...u, totalLeads: allLeads.length, contactedLeads: contacted };
        } catch { return { ...u, totalLeads: 0, contactedLeads: 0 }; }
      }));

      setUsers(withLeads);
      setFilteredUsers(withLeads);
      await fetchAllSellersProgress(withLeads);
    } catch (err) {
      console.error(err);
      message.error('Failed to load team members');
    } finally { setLoading(false); }
  };

  const calculateSellerProgress = async (sellerId) => {
    try {
      const s = dayjs().startOf('month').toDate(), e = dayjs().endOf('month').toDate();
      const contacts = await ContactsService.getSellerContactsByDateRange(sellerId, s, e);
      const total = contacts.length;
      const contacted = contacts.filter(c => c.status === 'Contacted').length;
      const deal      = contacts.filter(c => c.status === 'Deal').length;
      return { total, contacted, deal,
        progressPercentage: pct(contacted + deal, total) };
    } catch { return { total:0, contacted:0, deal:0, progressPercentage:0 }; }
  };

  const fetchAllSellersProgress = async (list) => {
    const sellers = list.filter(u => salesRoles.includes(u.Role || u.role));
    const entries = await Promise.all(
      sellers.map(async s => [s.id, await calculateSellerProgress(s.id)])
    );
    setSellerProgress(Object.fromEntries(entries));
  };

  // ── Enhanced analytics fetch ────────────────────────────────────────────────
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

      // contacts
      const cStats = {
        total:     contacts.length,
        pending:   contacts.filter(c => c.status === 'Pending').length,
        contacted: contacts.filter(c => c.status === 'Contacted').length,
        deal:      contacts.filter(c => c.status === 'Deal').length,
        loss:      contacts.filter(c => c.status === 'Loss').length,
      };
      cStats.successRate = pct(cStats.contacted + cStats.deal, cStats.total);

      // deals
      const dStats = {
        total:    deals.length,
        opened:   deals.filter(d => d.Status === DealStatus.OPENED).length,
        gain:     deals.filter(d => d.Status === DealStatus.GAIN).length,
        loss:     deals.filter(d => d.Status === DealStatus.LOSS).length,
        totalValue: deals.reduce((s, d) => s + (Number(d.Amount) || 0), 0),
        gainValue:  deals.filter(d => d.Status === DealStatus.GAIN)
                        .reduce((s, d) => s + (Number(d.Amount) || 0), 0),
      };
      dStats.winRate = pct(dStats.gain, dStats.total);
      dStats.avgDeal = dStats.total > 0 ? Math.round(dStats.totalValue / dStats.total) : 0;

      // leads
      const lvl = l => (l.InterestLevel || '').toUpperCase();
      const lStats = {
        total: leads.length,
        hot:   leads.filter(l => ['HIGH','HOT'].includes(lvl(l))).length,
        warm:  leads.filter(l => ['MEDIUM','WARM'].includes(lvl(l))).length,
        cold:  leads.filter(l => ['LOW','COLD'].includes(lvl(l))).length,
        contacted: leads.filter(l => l.contacted).length,
      };
      lStats.hotRate = pct(lStats.hot, lStats.total);

      // meetings
      const mStats = {
        total:     meetings.length,
        completed: meetings.filter(m => m.Status === 'Completed').length,
        pending:   meetings.filter(m => m.Status === 'Pending').length,
        cancelled: meetings.filter(m => m.Status === 'Cancelled').length,
        online:    meetings.filter(m => m.Type?.toLowerCase() === 'online').length,
        onSite:    meetings.filter(m => m.Type?.toLowerCase() === 'onsite').length,
      };
      mStats.completionRate = pct(mStats.completed, mStats.total);

      // invoices
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
        { name: 'Leads',     value: lStats.total,    fill: C.blue   },
        { name: 'Contacts',  value: cStats.total,    fill: C.cyan   },
        { name: 'Meetings',  value: mStats.completed,fill: C.purple },
        { name: 'Deals',     value: dStats.total,    fill: C.orange },
        { name: 'Won',       value: dStats.gain,     fill: C.green  },
      ];

      // contacts bar
      const contactsBarData = [
        { name: 'Pending',   value: cStats.pending,   fill: C.gold   },
        { name: 'Contacted', value: cStats.contacted, fill: C.cyan   },
        { name: 'Deal',      value: cStats.deal,      fill: C.green  },
        { name: 'Loss',      value: cStats.loss,      fill: C.red    },
      ];

      // deals pie
      const dealsPieData = [
        { name: 'Open',   value: dStats.opened, fill: C.orange },
        { name: 'Won',    value: dStats.gain,   fill: C.green  },
        { name: 'Lost',   value: dStats.loss,   fill: C.red    },
      ].filter(d => d.value > 0);

      // leads pie
      const leadsPieData = [
        { name: 'Hot',  value: lStats.hot,  fill: C.red    },
        { name: 'Warm', value: lStats.warm, fill: C.orange },
        { name: 'Cold', value: lStats.cold, fill: C.blue   },
      ].filter(d => d.value > 0);

      // meetings pie
      const meetingsPieData = [
        { name: 'Completed', value: mStats.completed, fill: C.green  },
        { name: 'Pending',   value: mStats.pending,   fill: C.blue   },
        { name: 'Cancelled', value: mStats.cancelled, fill: C.red    },
      ].filter(d => d.value > 0);

      // radial KPI
      const radialData = [
        { name: 'Contacts', value: cStats.successRate, fill: C.cyan   },
        { name: 'Deals',    value: dStats.winRate,     fill: C.green  },
        { name: 'Meetings', value: mStats.completionRate, fill: C.purple },
        { name: 'Invoices', value: iStats.payRate,     fill: C.gold   },
      ];

      // overall score
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
    await fetchSellerAnalytics(seller.id, dateRange[0].toDate(), dateRange[1].toDate());
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

  // ── Table columns ───────────────────────────────────────────────────────────
  const roleColor = { [UserRoles.CEO]:'gold', [UserRoles.HR]:'geekblue', [UserRoles.SELLER]:'green',
    [UserRoles.SALES_EXECUTIVE]:'blue', [UserRoles.AGENT]:'purple', [UserRoles.TEAM_LEADER]:'orange',
    [UserRoles.SALES_MANAGER]:'magenta', [UserRoles.OFF_PLAN_SALES]:'#2db7f5',
    [UserRoles.READY_TO_MOVE_SALES]:'#87d068' };

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
        .filter(Boolean).map((p, i) => <div key={i}>{p}</div>) || '-'
    },
    {
      title: 'Leads', key: 'leads', width: 160,
      render: (_, r) => {
        if (!salesRoles.includes(r.Role)) return null;
        const prog = sellerProgress[r.id];
        return (
          <div style={{ textAlign: 'center' }}>
            <Space size={6}>
              <Tooltip title="Total leads assigned">
                <div style={{ background: C.red, color: '#fff', fontWeight: 700, fontSize: 15, padding: '3px 10px', borderRadius: 6 }}>
                  {r.totalLeads || 0}
                </div>
              </Tooltip>
              <Tooltip title="Leads contacted at least once">
                <div style={{ background: C.green, color: '#fff', fontWeight: 700, fontSize: 15, padding: '3px 10px', borderRadius: 6 }}>
                  {r.contactedLeads || 0}
                </div>
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
        : <Tag color="green">Active</Tag>
    },
    {
      title: 'Joined', dataIndex: 'CreationDate', key: 'created',
      render: d => d ? dayjs(d.toDate ? d.toDate() : d).format('YYYY-MM-DD') : '-',
      sorter: (a, b) => {
        const da = a.CreationDate?.toDate ? a.CreationDate.toDate() : new Date(a.CreationDate || 0);
        const db = b.CreationDate?.toDate ? b.CreationDate.toDate() : new Date(b.CreationDate || 0);
        return da - db;
      }
    }
  ];

  if (canManageUsers) columns.push({
    title: 'Actions', key: 'actions',
    render: (_, r) => (
      <Space size={4}>
        {salesRoles.includes(r.Role) && <>
          <Tooltip title="Analytics">
            <Button icon={<EyeOutlined />} size="small" onClick={() => handleSellerClick(r)} />
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

  // ── Analytics Drawer Content ─────────────────────────────────────────────────
  const renderAnalytics = () => {
    if (analyticsLoading) return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Progress type="dashboard" percent={75} status="active" width={100}
          strokeColor={{ '0%': C.blue, '100%': C.purple }} />
        <div style={{ marginTop: 16, color: '#999' }}>Crunching the numbers…</div>
      </div>
    );
    if (!analyticsData) return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: '#bbb' }}>
        Select a date range to view analytics
      </div>
    );

    const d = analyticsData;
    const scoreColor = d.overallScore >= 70 ? C.green : d.overallScore >= 45 ? C.gold : C.red;

    return (
      <div>
        {/* ── Date filters ── */}
        <Card size="small" style={{ marginBottom: 20, background: '#fafbff', borderColor: '#e6ecff' }}>
          <Row gutter={16} align="middle">
            <Col xs={24} sm={8}>
              <Text strong style={{ color: C.blue, fontSize: 12 }}><CalendarOutlined /> Quick Month</Text>
              <DatePicker picker="month" value={selectedMonth} onChange={handleMonthChange}
                format="MMMM YYYY" style={{ width: '100%', marginTop: 4 }} />
            </Col>
            <Col xs={24} sm={16}>
              <Text strong style={{ color: C.purple, fontSize: 12 }}><LineChartOutlined /> Custom Range</Text>
              <RangePicker
                value={dateRange?.length === 2 ? dateRange : null}
                onChange={handleDateRangeChange} format="YYYY-MM-DD"
                style={{ width: '100%', marginTop: 4 }} />
            </Col>
          </Row>
        </Card>

        {/* ── Overall Score ── */}
        <Card size="small" style={{ marginBottom: 20, background: `linear-gradient(135deg, ${scoreColor}0a, #fff)`, borderColor: `${scoreColor}44` }}>
          <Row align="middle" gutter={16}>
            <Col xs={24} sm={8} style={{ textAlign: 'center' }}>
              <Progress type="dashboard" percent={d.overallScore} width={110}
                strokeColor={{ '0%': scoreColor, '100%': scoreColor + 'aa' }}
                format={p => <span style={{ fontSize: 22, fontWeight: 700, color: scoreColor }}>{p}</span>} />
              <div style={{ fontWeight: 600, marginTop: 4 }}>Overall Score</div>
            </Col>
            <Col xs={24} sm={16}>
              <Row gutter={[8, 8]}>
                {d.radialData.map(r => (
                  <Col span={12} key={r.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <Text style={{ fontSize: 12 }}>{r.name}</Text>
                      <Text strong style={{ fontSize: 12, color: r.fill }}>{r.value}%</Text>
                    </div>
                    <Progress percent={r.value} size="small" strokeColor={r.fill} showInfo={false} />
                  </Col>
                ))}
              </Row>
            </Col>
          </Row>
        </Card>

        {/* ── Sales Funnel ── */}
        <Card size="small" style={{ marginBottom: 20 }}>
          <SectionTitle icon="🔻" title="Sales Funnel" color={C.purple} />
          <Row gutter={0} align="middle" justify="center">
            {d.funnelData.map((f, i) => {
              const maxVal = d.funnelData[0]?.value || 1;
              const w = Math.max(30, Math.round((f.value / maxVal) * 100));
              const conv = i > 0 && d.funnelData[i - 1].value > 0
                ? pct(f.value, d.funnelData[i - 1].value) : null;
              return (
                <div key={f.name} style={{ textAlign: 'center', width: '100%' }}>
                  {conv !== null && (
                    <div style={{ fontSize: 11, color: '#aaa', marginBottom: 2 }}>
                      ↓ {conv}% conversion
                    </div>
                  )}
                  <div style={{
                    margin: '0 auto 4px', height: 36, width: `${w}%`,
                    background: f.fill, borderRadius: 6, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: 13,
                    transition: 'width .3s', minWidth: 80
                  }}>
                    {f.name} · {f.value}
                  </div>
                </div>
              );
            })}
          </Row>
        </Card>

        {/* ── KPI Grid ── */}
        <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
          <Col xs={12} sm={8} md={6}>
            <KpiCard icon={<PhoneOutlined />} label="Contacts" value={d.contacts.total}
              color={C.cyan}
              sub={`${d.contacts.successRate}% success rate`}
              extra={<Progress percent={d.contacts.successRate} size="small" strokeColor={C.cyan} showInfo={false} />} />
          </Col>
          <Col xs={12} sm={8} md={6}>
            <KpiCard icon={<FunnelPlotOutlined />} label="Deals Won" value={d.deals.gain}
              color={C.green} sub={`${d.deals.winRate}% win rate · ${d.deals.total} total`}
              extra={<Progress percent={d.deals.winRate} size="small" strokeColor={C.green} showInfo={false} />} />
          </Col>
          <Col xs={12} sm={8} md={6}>
            <KpiCard icon={<FireOutlined />} label="Hot Leads" value={d.leads.hot}
              color={C.red} sub={`${d.leads.hotRate}% of ${d.leads.total} leads`}
              extra={<Progress percent={d.leads.hotRate} size="small" strokeColor={C.red} showInfo={false} />} />
          </Col>
          <Col xs={12} sm={8} md={6}>
            <KpiCard icon={<CalendarOutlined />} label="Meetings Done" value={d.meetings.completed}
              color={C.purple} sub={`${d.meetings.completionRate}% completion`}
              extra={<Progress percent={d.meetings.completionRate} size="small" strokeColor={C.purple} showInfo={false} />} />
          </Col>
          <Col xs={12} sm={8} md={6}>
            <KpiCard icon={<DollarOutlined />} label="Revenue (AED)" value={fmt(d.deals.gainValue)}
              color={C.gold} sub={`Avg deal: AED ${fmt(d.deals.avgDeal)}`} />
          </Col>
          <Col xs={12} sm={8} md={6}>
            <KpiCard icon={<ThunderboltOutlined />} label="Leads Total" value={d.leads.total}
              color={C.blue} sub={`${d.leads.warm} warm · ${d.leads.cold} cold`} />
          </Col>
          <Col xs={12} sm={8} md={6}>
            <KpiCard icon={<CheckCircleOutlined />} label="Invoices Paid" value={d.invoices.paid}
              color={C.lime} sub={`AED ${fmt(d.invoices.paidValue)} collected`}
              extra={<Progress percent={d.invoices.payRate} size="small" strokeColor={C.lime} showInfo={false} />} />
          </Col>
          <Col xs={12} sm={8} md={6}>
            <KpiCard icon={<ClockCircleOutlined />} label="Meetings Pending" value={d.meetings.pending}
              color={C.orange} sub={`${d.meetings.cancelled} cancelled`} />
          </Col>
        </Row>

        {/* ── Charts Row 1 ── */}
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          {/* Contacts Bar */}
          <Col xs={24} md={12}>
            <Card size="small">
              <SectionTitle icon="📞" title="Contacts by Status" color={C.cyan} />
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={d.contactsBarData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RTooltip content={<ChartTip />} />
                  <Bar dataKey="value" name="Count" radius={[6, 6, 0, 0]}>
                    {d.contactsBarData.map((e, i) => (
                      <Cell key={i} fill={e.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          {/* Deals Pie */}
          <Col xs={24} md={12}>
            <Card size="small">
              <SectionTitle icon="🤝" title="Deals Distribution" color={C.green} />
              {d.dealsPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={d.dealsPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                      dataKey="value" nameKey="name" paddingAngle={3}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}>
                      {d.dealsPieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Pie>
                    <RTooltip content={<ChartTip />} />
                    <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: 'center', padding: 40, color: '#bbb' }}>No deals in period</div>}
            </Card>
          </Col>
        </Row>

        {/* ── Charts Row 2 ── */}
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          {/* Leads Pie */}
          <Col xs={24} md={12}>
            <Card size="small">
              <SectionTitle icon="🎯" title="Leads by Interest" color={C.orange} />
              {d.leadsPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={d.leadsPieData} cx="50%" cy="50%" outerRadius={80}
                      dataKey="value" nameKey="name" paddingAngle={3}
                      label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}>
                      {d.leadsPieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Pie>
                    <RTooltip content={<ChartTip />} />
                    <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: 'center', padding: 40, color: '#bbb' }}>No leads data</div>}
            </Card>
          </Col>

          {/* Meetings Pie */}
          <Col xs={24} md={12}>
            <Card size="small">
              <SectionTitle icon="📅" title="Meetings by Status" color={C.purple} />
              {d.meetingsPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={d.meetingsPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                      dataKey="value" nameKey="name" paddingAngle={3}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}>
                      {d.meetingsPieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Pie>
                    <RTooltip content={<ChartTip />} />
                    <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: 'center', padding: 40, color: '#bbb' }}>No meetings in period</div>}
            </Card>
          </Col>
        </Row>

        {/* ── Meetings KPI strip ── */}
        <Card size="small" style={{ marginBottom: 20, borderColor: `${C.purple}33` }}>
          <SectionTitle icon="📅" title="Meetings Breakdown" color={C.purple} />
          <Row gutter={[12, 8]}>
            {[
              { label: 'Total', val: d.meetings.total,     color: C.blue   },
              { label: 'Done',  val: d.meetings.completed, color: C.green  },
              { label: 'Wait',  val: d.meetings.pending,   color: C.gold   },
              { label: 'Off',   val: d.meetings.cancelled, color: C.red    },
              { label: 'Online',val: d.meetings.online,    color: C.purple },
              { label: 'On-Site',val: d.meetings.onSite,   color: C.orange },
            ].map(item => (
              <Col xs={8} sm={4} key={item.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: item.color }}>{item.val}</div>
                <Text type="secondary" style={{ fontSize: 11 }}>{item.label}</Text>
              </Col>
            ))}
          </Row>
        </Card>

        {/* ── Raw data lists ── */}
        <Tabs type="card" size="small">
          <TabPane tab={`Contacts (${d.contacts.total})`} key="c">
            <List size="small" dataSource={d.rawData.contacts.slice(0, 15)}
              renderItem={c => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar size={32} style={{ background: c.status === 'Deal' ? C.green : c.status === 'Contacted' ? C.cyan : c.status === 'Loss' ? C.red : C.gold }}>
                      {c.name?.[0] || 'C'}
                    </Avatar>}
                    title={<Text strong style={{ fontSize: 13 }}>{c.name || 'Unnamed'}</Text>}
                    description={<Text type="secondary" style={{ fontSize: 11 }}>{c.email || '—'} · {c.phoneNumber || '—'}</Text>}
                  />
                  <Tag color={c.status === 'Deal' ? 'green' : c.status === 'Contacted' ? 'cyan' : c.status === 'Loss' ? 'red' : 'gold'}>{c.status}</Tag>
                </List.Item>
              )} />
          </TabPane>

          <TabPane tab={`Deals (${d.deals.total})`} key="d">
            <List size="small" dataSource={d.rawData.deals.slice(0, 15)}
              locale={{ emptyText: 'No deals in this period' }}
              renderItem={dl => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar size={32} style={{ background: dl.Status === DealStatus.GAIN ? C.green : dl.Status === DealStatus.LOSS ? C.red : C.orange }}>
                      {dl.Description?.[0]?.toUpperCase() || 'D'}
                    </Avatar>}
                    title={<Text strong style={{ fontSize: 13 }}>{(dl.Description || 'No description').substring(0, 50)}</Text>}
                    description={<Text type="secondary" style={{ fontSize: 11 }}>AED {fmt(dl.Amount)} · {dayjs(dl.CreationDate).format('DD MMM YYYY')}</Text>}
                  />
                  <Tag color={dl.Status === DealStatus.GAIN ? 'green' : dl.Status === DealStatus.LOSS ? 'red' : 'orange'}>{dl.Status}</Tag>
                </List.Item>
              )} />
          </TabPane>

          <TabPane tab={`Leads (${d.leads.total})`} key="l">
            <List size="small" dataSource={d.rawData.leads.slice(0, 15)}
              renderItem={ld => {
                const lvl = (ld.InterestLevel || '').toUpperCase();
                const col = ['HIGH','HOT'].includes(lvl) ? C.red : ['MEDIUM','WARM'].includes(lvl) ? C.orange : C.blue;
                return (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar size={32} style={{ background: col }}>{ld.name?.[0] || 'L'}</Avatar>}
                      title={<Text strong style={{ fontSize: 13 }}>{ld.name || 'Unnamed Lead'}</Text>}
                      description={<Text type="secondary" style={{ fontSize: 11 }}>Budget: AED {fmt(ld.Budget)} · {ld.email || '—'}</Text>}
                    />
                    <Tag color={col === C.red ? 'red' : col === C.orange ? 'orange' : 'blue'}>{ld.InterestLevel || '—'}</Tag>
                  </List.Item>
                );
              }} />
          </TabPane>

          <TabPane tab={`Meetings (${d.meetings.total})`} key="m">
            <List size="small" dataSource={d.rawData.meetings?.slice(0, 15) || []}
              locale={{ emptyText: 'No meetings in this period' }}
              renderItem={mt => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar size={32} style={{ background: mt.Status === 'Completed' ? C.green : mt.Status === 'Cancelled' ? C.red : C.blue }}>
                      {mt.Title?.[0] || 'M'}
                    </Avatar>}
                    title={<Text strong style={{ fontSize: 13 }}>{mt.Title || 'Untitled'}</Text>}
                    description={<Text type="secondary" style={{ fontSize: 11 }}>
                      {dayjs(mt.DateTime).format('DD MMM YYYY HH:mm')} · {mt.Duration} mins · {mt.Type}
                    </Text>}
                  />
                  <Tag color={mt.Status === 'Completed' ? 'green' : mt.Status === 'Cancelled' ? 'red' : 'blue'}>{mt.Status}</Tag>
                </List.Item>
              )} />
          </TabPane>
        </Tabs>
      </div>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 16 }}>
      <Card className="shadow-lg">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Title level={2} style={{ margin: 0 }}>
            <TeamOutlined style={{ marginRight: 10, color: C.blue }} />Team Management
          </Title>
          {canManageUsers && (
            <Button type="primary" icon={<UserAddOutlined />} onClick={() => setIsAddModalVisible(true)}>
              Add Member
            </Button>
          )}
        </div>

        <Row gutter={12} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={14}>
            <Input placeholder="Search name or email…" prefix={<SearchOutlined />}
              value={searchText} onChange={e => setSearchText(e.target.value)}
              allowClear style={{ width: '100%' }} />
          </Col>
          <Col xs={24} sm={10}>
            <Select placeholder="Filter by role" style={{ width: '100%' }}
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

        <Table columns={columns} dataSource={filteredUsers} rowKey="id" loading={loading}
          pagination={{ defaultPageSize: 10, showSizeChanger: true, pageSizeOptions: ['10','20','50'] }}
          rowClassName={() => 'hoverable-row'} />
      </Card>

      {/* Add modal */}
      <Modal title="Add Team Member" open={isAddModalVisible}
        onCancel={() => setIsAddModalVisible(false)} footer={null} destroyOnClose>
        <AddUserForm onFinish={handleAddUser} onCancel={() => setIsAddModalVisible(false)} />
      </Modal>

      {/* Edit modal */}
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
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            margin: '-16px -24px 0', padding: '20px 24px', color: '#fff'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar size={56} icon={<TrophyOutlined />}
                style={{ background: 'rgba(255,255,255,.2)', fontSize: 26 }} />
              <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>
                  {selectedSeller ? `${selectedSeller.firstname} ${selectedSeller.lastname}` : 'Analytics'}
                </div>
                <div style={{ fontSize: 13, opacity: .8 }}>Performance Dashboard</div>
                {analyticsData && (
                  <div style={{ marginTop: 6 }}>
                    <Progress percent={analyticsData.overallScore} size="small"
                      strokeColor="rgba(255,255,255,.9)" trailColor="rgba(255,255,255,.2)"
                      format={p => <span style={{ color: '#fff', fontSize: 11 }}>{p} overall score</span>} />
                  </div>
                )}
              </div>
            </div>
          </div>
        }
        width={860} open={analyticsVisible}
        onClose={() => { setAnalyticsVisible(false); setSelectedSeller(null); setAnalyticsData(null); }}
        destroyOnClose
        bodyStyle={{ paddingTop: 20 }}
      >
        {renderAnalytics()}
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