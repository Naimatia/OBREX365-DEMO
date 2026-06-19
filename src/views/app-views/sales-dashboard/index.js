// pages/SellerPerformanceDashboard.js
// ─── Enhanced with Modern AI Insights & Clickable Analytics ─────────────────
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Table, Tag, Space, Button, Input, Modal,
  message, Typography, Row, Col, Avatar, Badge,
  Empty, Progress, Drawer, Select,
  Skeleton, Grid, DatePicker, Tooltip, Form,
  List, Tabs, InputNumber, Alert, Divider
} from 'antd';
import {
  UserOutlined, EyeOutlined, ClockCircleOutlined,
  CloseCircleOutlined, WarningOutlined, TrophyOutlined,
  ReloadOutlined, SearchOutlined, TeamOutlined, HistoryOutlined,
  MailOutlined, PhoneOutlined, FilterOutlined,
  PlusOutlined, RiseOutlined, FallOutlined,
  DashboardOutlined, BellOutlined,
  StarOutlined, CrownOutlined, FireOutlined, CalendarOutlined,
  VideoCameraOutlined,
  CheckCircleOutlined, WhatsAppOutlined, LinkedinOutlined,
  EnvironmentOutlined, DollarOutlined, PercentageOutlined,
  BulbOutlined, ThunderboltOutlined, RocketOutlined,
  ArrowRightOutlined, InfoCircleOutlined,
  BarChartOutlined, LineChartOutlined, PieChartOutlined,
  ExclamationCircleOutlined, SafetyCertificateOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, RadialBarChart, RadialBar,
  AreaChart, Area, ComposedChart
} from 'recharts';

import UserService from 'services/firebase/UserService';
import { UserRoles } from 'models/UserModel';
import {
  collection, query, where, getDocs, addDoc,
  orderBy, Timestamp
} from 'firebase/firestore';
import { db } from 'configs/FirebaseConfig';

dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

// ─── Color System ────────────────────────────────────────────────────────────
const C = {
  primary:  '#1d6fa8',
  success:  '#16a34a',
  warning:  '#ca8a04',
  error:    '#dc2626',
  purple:   '#7c3aed',
  cyan:     '#06b6d4',
  pink:     '#ec4899',
  orange:   '#ea580c',
  indigo:   '#4f46e5',
  gray:     '#6b7280',
  teal:     '#0d9488',
  rose:     '#e11d48',
  lime:     '#65a30d',
  sky:      '#0284c7',
};

// ─── AI Insight type configs ─────────────────────────────────────────────────
const INSIGHT_TYPES = {
  critical:  { color: C.error,   bg: '#fef2f2', border: '#fecaca', icon: <ExclamationCircleOutlined />, label: 'Critical' },
  warning:   { color: C.warning, bg: '#fffbeb', border: '#fde68a', icon: <WarningOutlined />,           label: 'Warning'  },
  success:   { color: C.success, bg: '#f0fdf4', border: '#bbf7d0', icon: <CheckCircleOutlined />,       label: 'Success'  },
  info:      { color: C.primary, bg: '#eff6ff', border: '#bfdbfe', icon: <InfoCircleOutlined />,        label: 'Insight'  },
  tip:       { color: C.purple,  bg: '#faf5ff', border: '#e9d5ff', icon: <BulbOutlined />,              label: 'Tip'      },
  rocket:    { color: C.cyan,    bg: '#ecfeff', border: '#a5f3fc', icon: <RocketOutlined />,            label: 'Growth'   },
};

// ─── Meeting & Contact type configs ──────────────────────────────────────────
const MEETING_TYPES = [
  { value: 'initial',     label: 'Initial Meeting', color: C.primary },
  { value: 'site_visit',  label: 'Site Visit',      color: C.orange  },
  { value: 'negotiation', label: 'Negotiation',     color: C.error   },
  { value: 'closing',     label: 'Closing',         color: C.success },
  { value: 'follow_up',   label: 'Follow-up',       color: C.purple  },
  { value: 'virtual',     label: 'Virtual Tour',    color: C.cyan    },
];

const CONTACT_METHODS = [
  { value: 'call',      label: 'Phone Call', color: C.success },
  { value: 'whatsapp',  label: 'WhatsApp',   color: '#25D366' },
  { value: 'email',     label: 'Email',      color: C.primary },
  { value: 'linkedin',  label: 'LinkedIn',   color: '#0077B5' },
  { value: 'in_person', label: 'In Person',  color: C.purple  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const pct = (n, t) => t > 0 ? Math.round((n / t) * 100) : 0;
const fmtK = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n || 0);

const getMeetingTypeConfig = (type) =>
  MEETING_TYPES.find(t => t.value === type) || MEETING_TYPES[0];

const getContactMethodConfig = (method) =>
  CONTACT_METHODS.find(m => m.value === method) || CONTACT_METHODS[0];

const getPerformanceLevel = (meetingCount, target = 20) => {
  const rate = (meetingCount / target) * 100;
  if (rate >= 100) return { color: C.success, icon: <CrownOutlined />,  label: 'Elite'      };
  if (rate >= 75)  return { color: C.primary, icon: <StarOutlined />,   label: 'Pro'        };
  if (rate >= 50)  return { color: C.warning, icon: <FireOutlined />,   label: 'Rising'     };
  return               { color: C.error,   icon: <WarningOutlined />, label: 'Needs Work' };
};

// ─── Custom Recharts Tooltip ──────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1e293b', borderRadius: 10, padding: '8px 14px',
      border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.25)'
    }}>
      {label && <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 12, color: p.color || '#94a3b8' }}>
          {p.name}: <b style={{ color: '#f8fafc' }}>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</b>
        </div>
      ))}
    </div>
  );
};

// ─── AI Insight Card ──────────────────────────────────────────────────────────
const AiInsightCard = ({ insight, onClick, selected }) => {
  const cfg = INSIGHT_TYPES[insight.type] || INSIGHT_TYPES.info;
  return (
    <div
      onClick={() => onClick(insight)}
      style={{
        background: selected ? cfg.bg : '#fff',
        border: `1.5px solid ${selected ? cfg.color : '#e5e7eb'}`,
        borderLeft: `4px solid ${cfg.color}`,
        borderRadius: 12,
        padding: '12px 16px',
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        marginBottom: 10,
        transform: selected ? 'translateX(3px)' : 'none',
        boxShadow: selected ? `0 4px 16px ${cfg.color}22` : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: cfg.bg, border: `1px solid ${cfg.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, color: cfg.color, flexShrink: 0,
        }}>
          {cfg.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Tag
              style={{
                background: cfg.bg, border: `1px solid ${cfg.border}`,
                color: cfg.color, borderRadius: 20, fontSize: 10,
                fontWeight: 700, padding: '0 8px', lineHeight: '18px',
              }}
            >
              {cfg.label}
            </Tag>
            {insight.metric && (
              <span style={{ fontSize: 18, fontWeight: 800, color: cfg.color }}>{insight.metric}</span>
            )}
          </div>
          <Text style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>
            {insight.text}
          </Text>
          {insight.action && (
            <div style={{ marginTop: 6 }}>
              <Text style={{ fontSize: 11, color: cfg.color, fontWeight: 600 }}>
                → {insight.action}
              </Text>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── AI Insights Panel ────────────────────────────────────────────────────────
const AiInsightsPanel = ({ sellerStats, globalStats, period }) => {
  const [selectedInsight, setSelectedInsight] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

  const insights = useMemo(() => {
    const list = [];

    // Critical: sellers with zero meetings
    const zeroMeetingSellers = sellerStats.filter(s => s.totalMeetings === 0);
    if (zeroMeetingSellers.length > 0) {
      list.push({
        id: 'zero-meetings',
        type: 'critical',
        metric: `${zeroMeetingSellers.length}`,
        text: `${zeroMeetingSellers.map(s => s.name.split(' ')[0]).join(', ')} ${zeroMeetingSellers.length === 1 ? 'has' : 'have'} logged zero meetings this ${period}.`,
        action: 'Follow up immediately and assign leads.',
        detail: {
          chart: 'bar',
          title: 'Meetings per seller',
          data: sellerStats.map(s => ({ name: s.name.split(' ')[0], value: s.totalMeetings, fill: s.totalMeetings === 0 ? C.error : C.primary })),
        },
        sellers: zeroMeetingSellers,
      });
    }

    // Warning: low conversion rate
    const lowConvSellers = sellerStats.filter(s => s.conversionRate < 20 && s.totalMeetings > 3);
    if (lowConvSellers.length > 0) {
      list.push({
        id: 'low-conversion',
        type: 'warning',
        metric: `${Math.round(lowConvSellers.reduce((s, x) => s + x.conversionRate, 0) / lowConvSellers.length)}%`,
        text: `${lowConvSellers.length} seller${lowConvSellers.length > 1 ? 's' : ''} have conversion below 20%. Review their qualification process and follow-up cadence.`,
        action: 'Schedule a coaching session on objection handling.',
        detail: {
          chart: 'bar',
          title: 'Conversion rate by seller',
          data: sellerStats.filter(s => s.totalMeetings > 0).map(s => ({ name: s.name.split(' ')[0], value: s.conversionRate, fill: s.conversionRate < 20 ? C.warning : C.success })),
        },
        sellers: lowConvSellers,
      });
    }

    // Success: top performer
    const top = [...sellerStats].sort((a, b) => b.totalMeetings - a.totalMeetings)[0];
    if (top && top.totalMeetings > 0) {
      list.push({
        id: 'top-performer',
        type: 'success',
        metric: `${top.totalMeetings}`,
        text: `${top.name} is the top performer with ${top.totalMeetings} meetings and ${top.conversionRate}% conversion this ${period}.`,
        action: 'Use their workflow as a team template.',
        detail: {
          chart: 'radial',
          title: 'Top performer breakdown',
          data: [
            { name: 'Meetings',   value: top.totalMeetings,  fill: C.primary  },
            { name: 'Contacts',   value: top.totalContacts,  fill: C.success  },
            { name: 'Conversion', value: top.conversionRate, fill: C.warning  },
          ],
        },
        sellers: [top],
      });
    }

    // Info: contact activity leader
    const contactLeader = [...sellerStats].sort((a, b) => b.totalContacts - a.totalContacts)[0];
    if (contactLeader && contactLeader.totalContacts > 0) {
      list.push({
        id: 'contact-leader',
        type: 'info',
        metric: `${contactLeader.totalContacts}`,
        text: `${contactLeader.name} leads in client contacts with ${contactLeader.totalContacts} interactions, showing strong pipeline activity.`,
        action: 'Document their outreach cadence for onboarding.',
        detail: {
          chart: 'bar',
          title: 'Contacts per seller',
          data: sellerStats.map(s => ({ name: s.name.split(' ')[0], value: s.totalContacts, fill: s.id === contactLeader.id ? C.cyan : `${C.cyan}66` })),
        },
        sellers: [contactLeader],
      });
    }

    // Tip: peak activity analysis
    const totalActivity = globalStats.totalMeetings + globalStats.totalContacts;
    if (totalActivity > 0) {
      list.push({
        id: 'activity-tip',
        type: 'tip',
        metric: fmtK(totalActivity),
        text: `Team recorded ${globalStats.totalMeetings} meetings and ${globalStats.totalContacts} contacts this ${period}. Average ${Math.round(totalActivity / Math.max(sellerStats.length, 1))} activities per seller.`,
        action: 'Target 30+ activities per seller per month for optimal pipeline health.',
        detail: {
          chart: 'composed',
          title: 'Team activity overview',
          data: sellerStats.map(s => ({
            name: s.name.split(' ')[0],
            meetings: s.totalMeetings,
            contacts: s.totalContacts,
          })),
        },
      });
    }

    // Rocket: growth opportunity
    const avgConv = globalStats.avgConversion;
    if (avgConv > 0) {
      list.push({
        id: 'growth-opportunity',
        type: 'rocket',
        metric: `${Math.round(avgConv)}%`,
        text: `Team conversion rate is ${Math.round(avgConv)}%. ${avgConv >= 30 ? 'Above industry average — focus on volume scaling.' : 'Below 30% benchmark — improving qualification could double deals.'}`,
        action: avgConv >= 30 ? 'Scale lead volume by 20% this quarter.' : 'Implement a 5-step qualification checklist.',
        detail: {
          chart: 'pie',
          title: 'Conversion distribution',
          data: [
            { name: 'Converted', value: Math.round(avgConv), fill: C.success },
            { name: 'Not Yet',   value: 100 - Math.round(avgConv), fill: '#e5e7eb' },
          ],
        },
      });
    }

    return list;
  }, [sellerStats, globalStats, period]);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return insights;
    return insights.filter(i => i.type === activeFilter);
  }, [insights, activeFilter]);

  const selected = selectedInsight
    ? insights.find(i => i.id === selectedInsight)
    : null;

  const filterCounts = useMemo(() => {
    const counts = { all: insights.length };
    insights.forEach(i => { counts[i.type] = (counts[i.type] || 0) + 1; });
    return counts;
  }, [insights]);

  const renderDetailChart = (detail) => {
    if (!detail || !detail.data?.length) return null;
    if (detail.chart === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={detail.data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <RechartsTooltip content={<ChartTooltip />} />
            <Bar dataKey="value" name="Value" radius={[6, 6, 0, 0]}>
              {detail.data.map((e, i) => <Cell key={i} fill={e.fill || C.primary} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }
    if (detail.chart === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={detail.data} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
              dataKey="value" nameKey="name" paddingAngle={3}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}>
              {detail.data.map((e, i) => <Cell key={i} fill={e.fill} />)}
            </Pie>
            <RechartsTooltip content={<ChartTooltip />} />
            <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      );
    }
    if (detail.chart === 'composed') {
      return (
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={detail.data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <RechartsTooltip content={<ChartTooltip />} />
            <Bar dataKey="meetings" name="Meetings" fill={C.primary} radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="contacts" name="Contacts" stroke={C.cyan} strokeWidth={2} dot={{ r: 3 }} />
            <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11 }} />
          </ComposedChart>
        </ResponsiveContainer>
      );
    }
    if (detail.chart === 'radial') {
      return (
        <ResponsiveContainer width="100%" height={180}>
          <RadialBarChart cx="50%" cy="50%" innerRadius={30} outerRadius={80} data={detail.data} startAngle={180} endAngle={0}>
            <RadialBar minAngle={5} background clockWise dataKey="value">
              {detail.data.map((e, i) => <Cell key={i} fill={e.fill} />)}
            </RadialBar>
            <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11 }} />
            <RechartsTooltip content={<ChartTooltip />} />
          </RadialBarChart>
        </ResponsiveContainer>
      );
    }
    return null;
  };

  if (!insights.length) {
    return (
      <Card style={{ borderRadius: 16 }}>
        <Empty
          image={<BulbOutlined style={{ fontSize: 48, color: C.warning }} />}
          description="No insights yet — add more seller activity to generate recommendations"
        />
      </Card>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
        borderRadius: 16, padding: '20px 24px', marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'rgba(253,230,138,0.18)', border: '1px solid rgba(253,230,138,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: '#fde68a',
            }}>
              <BulbOutlined />
            </div>
            <div>
              <Text style={{ color: '#fde68a', fontWeight: 800, fontSize: 15, display: 'block' }}>
                AI Insights & Recommendations
              </Text>
              <Text style={{ color: 'rgba(199,210,254,0.7)', fontSize: 11 }}>
                {insights.length} actionable insights · Click any card for details
              </Text>
            </div>
          </div>
          <Tag style={{
            background: 'rgba(253,230,138,0.15)', border: '1px solid rgba(253,230,138,0.3)',
            color: '#fde68a', borderRadius: 20, fontSize: 11,
          }}>
            {period === 'month' ? 'This Month' : period === 'quarter' ? 'This Quarter' : 'This Year'}
          </Tag>
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[
            { key: 'all', label: 'All', color: '#c7d2fe' },
            ...Object.entries(INSIGHT_TYPES).map(([k, v]) => ({
              key: k, label: v.label, color: v.bg, textColor: v.color, border: v.border,
            })),
          ].filter(f => f.key === 'all' || filterCounts[f.key] > 0).map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              style={{
                padding: '4px 14px', borderRadius: 20, border: 'none',
                background: activeFilter === f.key
                  ? (f.key === 'all' ? '#fff' : f.color)
                  : 'rgba(255,255,255,0.1)',
                color: activeFilter === f.key
                  ? (f.key === 'all' ? '#312e81' : f.textColor || '#312e81')
                  : 'rgba(199,210,254,0.8)',
                fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {f.label} {filterCounts[f.key] ? `(${filterCounts[f.key]})` : ''}
            </button>
          ))}
        </div>
      </div>

      <Row gutter={[16, 16]}>
        {/* Left: insight list */}
        <Col xs={24} lg={selected ? 10 : 24}>
          {selected ? (
            filtered.map(ins => (
              <AiInsightCard
                key={ins.id}
                insight={ins}
                onClick={i => setSelectedInsight(i.id === selectedInsight ? null : i.id)}
                selected={ins.id === selectedInsight}
              />
            ))
          ) : (
            <Row gutter={[12, 12]}>
              {filtered.map(ins => (
                <Col xs={24} md={12} key={ins.id}>
                  <AiInsightCard
                    insight={ins}
                    onClick={i => setSelectedInsight(i.id)}
                    selected={false}
                  />
                </Col>
              ))}
            </Row>
          )}
        </Col>

        {/* Right: detail panel */}
        {selected && (
          <Col xs={24} lg={14}>
            <Card
              style={{
                borderRadius: 16, border: `1.5px solid ${INSIGHT_TYPES[selected.type]?.border || '#e5e7eb'}`,
                background: INSIGHT_TYPES[selected.type]?.bg || '#fff',
                position: 'sticky', top: 0,
              }}
              bodyStyle={{ padding: 20 }}
            >
              {/* Detail header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: '#fff', border: `1px solid ${INSIGHT_TYPES[selected.type]?.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, color: INSIGHT_TYPES[selected.type]?.color,
                  }}>
                    {INSIGHT_TYPES[selected.type]?.icon}
                  </div>
                  <Text style={{ fontWeight: 700, fontSize: 14, color: INSIGHT_TYPES[selected.type]?.color }}>
                    {INSIGHT_TYPES[selected.type]?.label} Detail
                  </Text>
                </div>
                <Button
                  size="small" type="text"
                  onClick={() => setSelectedInsight(null)}
                  style={{ color: C.gray }}
                >
                  ✕
                </Button>
              </div>

              <Paragraph style={{ fontSize: 13, color: '#374151', marginBottom: 12 }}>
                {selected.text}
              </Paragraph>

              {selected.action && (
                <div style={{
                  background: '#fff', border: `1px solid ${INSIGHT_TYPES[selected.type]?.border}`,
                  borderRadius: 10, padding: '10px 14px', marginBottom: 16,
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                }}>
                  <ArrowRightOutlined style={{ color: INSIGHT_TYPES[selected.type]?.color, marginTop: 2 }} />
                  <Text style={{ fontSize: 12, color: INSIGHT_TYPES[selected.type]?.color, fontWeight: 600 }}>
                    Recommended: {selected.action}
                  </Text>
                </div>
              )}

              {/* Chart */}
              {selected.detail && (
                <Card
                  size="small"
                  style={{ borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff' }}
                >
                  <Text style={{ fontSize: 11, fontWeight: 700, color: C.gray, display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {selected.detail.title}
                  </Text>
                  {renderDetailChart(selected.detail)}
                </Card>
              )}

              {/* Sellers involved */}
              {selected.sellers?.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <Text style={{ fontSize: 11, fontWeight: 700, color: C.gray, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Sellers involved
                  </Text>
                  <Row gutter={[8, 8]}>
                    {selected.sellers.map(s => (
                      <Col key={s.id}>
                        <Tag style={{
                          borderRadius: 20, padding: '4px 12px',
                          background: '#fff', border: `1px solid ${INSIGHT_TYPES[selected.type]?.border}`,
                          color: INSIGHT_TYPES[selected.type]?.color,
                          fontWeight: 600, fontSize: 12,
                        }}>
                          {s.name}
                        </Tag>
                      </Col>
                    ))}
                  </Row>
                </div>
              )}
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, color = C.primary, colorClass = 'blue', onClick, trend, sub, period }) => (
  <div
    className={`stat-card stat-card-${colorClass}`}
    onClick={onClick}
    style={{ cursor: onClick ? 'pointer' : 'default' }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>{label}</Text>
        <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
        {sub && <Text type="secondary" style={{ fontSize: 11, marginTop: 2, display: 'block' }}>{sub}</Text>}
        {trend !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
            {trend >= 0
              ? <RiseOutlined style={{ color: C.success, fontSize: 11 }} />
              : <FallOutlined style={{ color: C.error, fontSize: 11 }} />}
            <Text style={{ fontSize: 11, color: trend >= 0 ? C.success : C.error }}>
              {Math.abs(trend)}% vs last {period}
            </Text>
          </div>
        )}
      </div>
      <div style={{ fontSize: 28, color, opacity: 0.18 }}>{icon}</div>
    </div>
  </div>
);

// ─── CSS ──────────────────────────────────────────────────────────────────────
const styles = `
  .seller-dashboard { padding: 20px; max-width: 1600px; margin: 0 auto; }
  .stat-card {
    background: #fff; border-radius: 16px; padding: 20px;
    cursor: pointer; transition: all 0.2s;
    border: 1px solid #e5e7eb; position: relative; overflow: hidden;
  }
  .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.09); }
  .stat-card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; border-radius:16px 16px 0 0; }
  .stat-card-blue::before   { background: linear-gradient(90deg,#1d6fa8,#3b82f6); }
  .stat-card-green::before  { background: linear-gradient(90deg,#16a34a,#22c55e); }
  .stat-card-yellow::before { background: linear-gradient(90deg,#ca8a04,#eab308); }
  .stat-card-purple::before { background: linear-gradient(90deg,#7c3aed,#8b5cf6); }
  .seller-rank-card {
    background:#fff; border:1px solid #e5e7eb; border-radius:14px; padding:14px;
    margin-bottom:10px; cursor:pointer; transition:all 0.15s;
  }
  .seller-rank-card:hover { border-color:#1d6fa8; transform:translateY(-2px); box-shadow:0 4px 16px rgba(0,0,0,0.07); }
  .period-btn {
    padding:5px 16px; border-radius:20px; border:1px solid #e5e7eb;
    background:transparent; cursor:pointer; font-size:12px; transition:all 0.15s;
  }
  .period-btn.active { background:#1d6fa8; border-color:#1d6fa8; color:#fff; font-weight:600; }
  .activity-card {
    background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:14px;
    margin-bottom:10px; transition:all 0.15s; cursor:pointer;
  }
  .activity-card:hover { border-color:#1d6fa8; transform:translateX(2px); }
  .filter-bar {
    display:flex; align-items:center; gap:12px; flex-wrap:wrap;
    background:#fff; border:1px solid #e5e7eb; border-radius:14px;
    padding:12px 20px; margin-bottom:20px;
  }
  @media (max-width:768px) {
    .seller-dashboard { padding:12px; }
    .stat-card { padding:14px; }
  }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
const SellerPerformanceDashboard = () => {
  const [sellers,             setSellers]             = useState([]);
  const [meetings,            setMeetings]            = useState([]);
  const [contacts,            setContacts]            = useState([]);
  const [loading,             setLoading]             = useState(true);
  const [searchText,          setSearchText]          = useState('');
  const [selectedSeller,      setSelectedSeller]      = useState(null);
  const [drawerVisible,       setDrawerVisible]       = useState(false);
  const [meetingModalVisible, setMeetingModalVisible] = useState(false);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [period,              setPeriod]              = useState('month');
  const [currentSort,         setCurrentSort]         = useState('meetings');
  const [activeTab,           setActiveTab]           = useState('overview');
  const [meetingForm]                                 = Form.useForm();
  const [contactForm]                                 = Form.useForm();

  const user      = useSelector(state => state.auth.user);
  const companyId = user?.company_id;
  const screens   = useBreakpoint();
  const isMobile  = !screens.md;

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchSellers = useCallback(async () => {
    if (!companyId) return;
    try {
      const allUsers = await UserService.getUsersByCompanyId(companyId);
      const salesTeam = allUsers.filter(u =>
        [UserRoles.SELLER, UserRoles.SALES_EXECUTIVE, UserRoles.AGENT].includes(u.Role)
      );
      setSellers(salesTeam.map(s => ({
        id: s.id,
        name: `${s.firstname || ''} ${s.lastname || ''}`.trim() || s.email,
        initials: (s.firstname?.[0] || '').toUpperCase() + (s.lastname?.[0] || '').toUpperCase(),
        role: s.Role,
        email: s.email,
        phone: s.phoneNumber || s.phone,
      })));
    } catch (error) {
      console.error(error);
      message.error('Failed to load sellers');
    }
  }, [companyId]);

  const fetchMeetings = useCallback(async () => {
    if (!companyId) return;
    try {
      const q = query(
        collection(db, 'sellerMeetings'),
        where('companyId', '==', companyId),
        orderBy('scheduledAt', 'desc')
      );
      const snap = await getDocs(q);
      setMeetings(snap.docs.map(d => ({
        id: d.id, ...d.data(),
        scheduledAt: d.data().scheduledAt?.toDate?.() || d.data().scheduledAt,
      })));
    } catch (error) { console.error(error); }
  }, [companyId]);

  const fetchContacts = useCallback(async () => {
    if (!companyId) return;
    try {
      const q = query(
        collection(db, 'sellerContacts'),
        where('companyId', '==', companyId),
        orderBy('contactedAt', 'desc')
      );
      const snap = await getDocs(q);
      setContacts(snap.docs.map(d => ({
        id: d.id, ...d.data(),
        contactedAt: d.data().contactedAt?.toDate?.() || d.data().contactedAt,
      })));
    } catch (error) { console.error(error); }
  }, [companyId]);

  useEffect(() => {
    Promise.all([fetchSellers(), fetchMeetings(), fetchContacts()])
      .finally(() => setLoading(false));
  }, [fetchSellers, fetchMeetings, fetchContacts]);

  // ── Computed stats ─────────────────────────────────────────────────────────
  const sellerStats = useMemo(() => {
    const inPeriod = (date) => {
      if (!date) return false;
      const d = dayjs(date);
      if (period === 'month')   return d.isSame(dayjs(), 'month');
      if (period === 'quarter') return d.isSame(dayjs(), 'quarter');
      if (period === 'year')    return d.isSame(dayjs(), 'year');
      return true;
    };
    return sellers.map(seller => {
      const sm = meetings.filter(m => m.sellerId === seller.id && inPeriod(m.scheduledAt));
      const sc = contacts.filter(c => c.sellerId === seller.id && inPeriod(c.contactedAt));
      const completed = sm.filter(m => m.status === 'completed').length;
      const won       = sm.filter(m => m.result === 'won').length;
      return {
        ...seller,
        totalMeetings:   sm.length,
        totalContacts:   sc.length,
        completedMeetings: completed,
        conversionRate:  completed > 0 ? Math.round((won / completed) * 100) : 0,
        meetingsByType:  sm.reduce((a, m) => { a[m.type] = (a[m.type] || 0) + 1; return a; }, {}),
        contactsByMethod:sc.reduce((a, c) => { a[c.method] = (a[c.method] || 0) + 1; return a; }, {}),
        lastActivity:    [...sm, ...sc].sort((a, b) =>
          new Date(b.scheduledAt || b.contactedAt) - new Date(a.scheduledAt || a.contactedAt)
        )[0]?.scheduledAt,
      };
    });
  }, [sellers, meetings, contacts, period]);

  const globalStats = useMemo(() => {
    const totalMeetings = sellerStats.reduce((s, x) => s + x.totalMeetings, 0);
    const totalContacts = sellerStats.reduce((s, x) => s + x.totalContacts, 0);
    const avgConversion = sellerStats.length
      ? sellerStats.reduce((s, x) => s + x.conversionRate, 0) / sellerStats.length
      : 0;
    return { totalMeetings, totalContacts, avgConversion };
  }, [sellerStats]);

  // ── Trend line data (6 months) ─────────────────────────────────────────────
  const trendData = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => {
      const m = dayjs().subtract(5 - i, 'month');
      const mm = meetings.filter(x => x.scheduledAt && dayjs(x.scheduledAt).format('YYYY-MM') === m.format('YYYY-MM'));
      return {
        month:     m.format('MMM'),
        meetings:  mm.length,
        completed: mm.filter(x => x.status === 'completed').length,
        won:       mm.filter(x => x.result === 'won').length,
      };
    }), [meetings]);

  const meetingTypeData = useMemo(() => {
    const counts = {};
    meetings.forEach(m => { counts[m.type] = (counts[m.type] || 0) + 1; });
    return Object.entries(counts).map(([type, value]) => ({
      name:  MEETING_TYPES.find(t => t.value === type)?.label || type,
      value,
      fill:  MEETING_TYPES.find(t => t.value === type)?.color || C.gray,
    }));
  }, [meetings]);

  const rankedSellers = useMemo(() => {
    return [...sellerStats]
      .sort((a, b) => {
        if (currentSort === 'meetings')   return b.totalMeetings - a.totalMeetings;
        if (currentSort === 'contacts')   return b.totalContacts - a.totalContacts;
        if (currentSort === 'conversion') return b.conversionRate - a.conversionRate;
        return b.totalMeetings - a.totalMeetings;
      })
      .filter(s => s.name.toLowerCase().includes(searchText.toLowerCase()));
  }, [sellerStats, currentSort, searchText]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAddMeeting = async (values) => {
    try {
      await addDoc(collection(db, 'sellerMeetings'), {
        ...values,
        companyId,
        sellerId:   selectedSeller?.id || user?.uid,
        sellerName: selectedSeller?.name || `${user?.firstname} ${user?.lastname}`,
        scheduledAt: Timestamp.fromDate(values.scheduledAt.toDate()),
        createdAt:   Timestamp.now(),
        status:      'scheduled',
      });
      message.success('Meeting scheduled successfully');
      setMeetingModalVisible(false);
      meetingForm.resetFields();
      fetchMeetings();
    } catch { message.error('Failed to schedule meeting'); }
  };

  const handleAddContact = async (values) => {
    try {
      await addDoc(collection(db, 'sellerContacts'), {
        ...values,
        companyId,
        sellerId:    selectedSeller?.id || user?.uid,
        sellerName:  selectedSeller?.name || `${user?.firstname} ${user?.lastname}`,
        contactedAt: Timestamp.fromDate(values.contactedAt.toDate()),
        createdAt:   Timestamp.now(),
      });
      message.success('Contact logged successfully');
      setContactModalVisible(false);
      contactForm.resetFields();
      fetchContacts();
    } catch { message.error('Failed to log contact'); }
  };

  const handleViewSeller = (seller) => {
    setSelectedSeller(seller);
    setDrawerVisible(true);
  };

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns = [
    {
      title: '#', key: 'rank', width: 50,
      render: (_, __, i) => (
        <div style={{ textAlign: 'center', fontSize: 18 }}>
          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <Text type="secondary">{i + 1}</Text>}
        </div>
      ),
    },
    {
      title: 'Seller', key: 'seller', width: 220,
      render: (_, r) => {
        const perf = getPerformanceLevel(r.totalMeetings);
        return (
          <Space>
            <Avatar style={{ background: perf.color, fontWeight: 700, color: '#fff' }}>
              {r.initials}
            </Avatar>
            <div>
              <div style={{ fontWeight: 600 }}>{r.name}</div>
              <Text type="secondary" style={{ fontSize: 11 }}>{r.role}</Text>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Meetings', dataIndex: 'totalMeetings', width: 100, sorter: true,
      render: v => <span style={{ fontWeight: 700, color: C.primary, fontSize: 16 }}>{v}</span>,
    },
    {
      title: 'Contacts', dataIndex: 'totalContacts', width: 100, sorter: true,
      render: v => <span style={{ fontWeight: 600, color: C.success }}>{v}</span>,
    },
    {
      title: 'Conversion', dataIndex: 'conversionRate', width: 110, sorter: true,
      render: v => (
        <Tag
          color={v >= 50 ? 'success' : v >= 30 ? 'warning' : 'error'}
          style={{ borderRadius: 12 }}
        >
          {v}%
        </Tag>
      ),
    },
    {
      title: 'Last Activity', key: 'lastActivity', width: 140,
      render: (_, r) => r.lastActivity ? dayjs(r.lastActivity).fromNow() : '—',
    },
    {
      title: '', key: 'action', width: 90,
      render: (_, r) => (
        <Button
          type="primary" size="small" icon={<EyeOutlined />}
          onClick={() => handleViewSeller(r)}
          style={{ borderRadius: 16 }}
        >
          Details
        </Button>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="seller-dashboard">
      <style>{styles}</style>

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <Title level={3} style={{ margin: 0, fontWeight: 700 }}>Seller Performance Dashboard</Title>
            <Text type="secondary">Track meetings, contacts, and team analytics with AI-powered insights</Text>
          </div>
          <Space wrap>
            <Input
              placeholder="Search sellers…"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 200, borderRadius: 10 }}
              allowClear
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setLoading(true);
                Promise.all([fetchMeetings(), fetchContacts()])
                  .finally(() => setLoading(false));
              }}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <FilterOutlined style={{ color: C.gray }} />
        <Text style={{ fontSize: 12, fontWeight: 600 }}>Period:</Text>
        {[['month', 'This Month'], ['quarter', 'Quarter'], ['year', 'Year']].map(([k, l]) => (
          <button
            key={k}
            className={`period-btn ${period === k ? 'active' : ''}`}
            onClick={() => setPeriod(k)}
          >
            {l}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: 12, color: C.gray }}>
          <b style={{ color: C.primary }}>{globalStats.totalMeetings}</b> meetings ·{' '}
          <b style={{ color: C.success }}>{globalStats.totalContacts}</b> contacts ·{' '}
          <b style={{ color: C.warning }}>{Math.round(globalStats.avgConversion)}%</b> avg conversion
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        style={{ marginBottom: 20 }}
        items={[
          { key: 'overview',  label: <span><DashboardOutlined /> Overview</span>              },
          { key: 'insights',  label: <span><BulbOutlined />      AI Insights</span>           },
          { key: 'sellers',   label: <span><TeamOutlined />       Seller Rankings</span>      },
          { key: 'calendar',  label: <span><CalendarOutlined />   Calendar</span>             },
        ]}
      />

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={6}>
              <KpiCard
                icon={<CalendarOutlined />}
                label="Total Meetings"
                value={globalStats.totalMeetings}
                color={C.primary} colorClass="blue"
                onClick={() => setActiveTab('sellers')}
              />
            </Col>
            <Col xs={12} sm={6}>
              <KpiCard
                icon={<PhoneOutlined />}
                label="Total Contacts"
                value={globalStats.totalContacts}
                color={C.success} colorClass="green"
                onClick={() => setActiveTab('sellers')}
              />
            </Col>
            <Col xs={12} sm={6}>
              <KpiCard
                icon={<PercentageOutlined />}
                label="Avg Conversion"
                value={`${Math.round(globalStats.avgConversion)}%`}
                color={C.warning} colorClass="yellow"
                onClick={() => setActiveTab('insights')}
              />
            </Col>
            <Col xs={12} sm={6}>
              <KpiCard
                icon={<TeamOutlined />}
                label="Active Sellers"
                value={sellers.length}
                color={C.purple} colorClass="purple"
                onClick={() => setActiveTab('sellers')}
              />
            </Col>
          </Row>

          {/* Inline insight alerts for overview */}
          {sellerStats.filter(s => s.totalMeetings === 0).length > 0 && (
            <Alert
              message={
                <span>
                  <b>🔥 {sellerStats.filter(s => s.totalMeetings === 0).length} seller(s)</b> have zero meetings this {period} — action needed.
                </span>
              }
              type="error" showIcon closable
              action={<Button size="small" onClick={() => setActiveTab('insights')}>View Insights →</Button>}
              style={{ marginBottom: 16, borderRadius: 10 }}
            />
          )}

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={14}>
              <Card
                title={<><LineChartOutlined style={{ color: C.primary, marginRight: 6 }} />Meeting Activity Trend</>}
                style={{ borderRadius: 16 }}
              >
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={C.primary} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={C.primary} stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="meetings"  name="Meetings"  stroke={C.primary} fill="url(#areaGrad)" strokeWidth={2} />
                    <Line type="monotone" dataKey="completed" name="Completed" stroke={C.success} strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="won"       name="Won"       stroke={C.warning} strokeWidth={2} dot={{ r: 4 }} />
                    <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card
                title={<><PieChartOutlined style={{ color: C.purple, marginRight: 6 }} />Meetings by Type</>}
                style={{ borderRadius: 16 }}
              >
                {meetingTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={meetingTypeData} cx="50%" cy="50%"
                        innerRadius={60} outerRadius={90} paddingAngle={3}
                        dataKey="value"
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {meetingTypeData.map((e, i) => (
                          <Cell key={i} fill={e.fill} stroke="#fff" strokeWidth={2} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<ChartTooltip />} />
                      <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description="No meetings recorded yet" style={{ padding: 60 }} />
                )}
              </Card>
            </Col>
          </Row>

          {/* Quick actions */}
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={12}>
              <Card
                style={{
                  borderRadius: 16,
                  background: `linear-gradient(135deg, ${C.primary}, ${C.indigo})`,
                  border: 'none',
                }}
                bodyStyle={{ padding: '18px 20px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, display: 'block' }}>Ready to track?</Text>
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: 700, display: 'block' }}>Schedule a Meeting</Text>
                  </div>
                  <Button
                    icon={<PlusOutlined />}
                    size="large"
                    onClick={() => setMeetingModalVisible(true)}
                    style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 10 }}
                  >
                    Schedule
                  </Button>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12}>
              <Card
                style={{
                  borderRadius: 16,
                  background: `linear-gradient(135deg, ${C.success}, ${C.teal})`,
                  border: 'none',
                }}
                bodyStyle={{ padding: '18px 20px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, display: 'block' }}>Log interaction</Text>
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: 700, display: 'block' }}>Record a Contact</Text>
                  </div>
                  <Button
                    icon={<PhoneOutlined />}
                    size="large"
                    onClick={() => setContactModalVisible(true)}
                    style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 10 }}
                  >
                    Log Contact
                  </Button>
                </div>
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* ── AI INSIGHTS TAB ──────────────────────────────────────────────── */}
      {activeTab === 'insights' && (
        <AiInsightsPanel
          sellerStats={sellerStats}
          globalStats={globalStats}
          period={period}
        />
      )}

      {/* ── SELLERS TAB ──────────────────────────────────────────────────── */}
      {activeTab === 'sellers' && (
        <Card style={{ borderRadius: 16, overflow: 'hidden' }} bodyStyle={{ padding: 0 }}>
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid #e5e7eb',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: 12,
          }}>
            <Space>
              <TeamOutlined style={{ color: C.primary }} />
              <span style={{ fontWeight: 700 }}>Seller Leaderboard</span>
              <Tag style={{ borderRadius: 20 }}>{rankedSellers.length} sellers</Tag>
            </Space>
            <Space wrap>
              {[['meetings', 'Meetings'], ['contacts', 'Contacts'], ['conversion', 'Conversion']].map(([k, l]) => (
                <button
                  key={k}
                  className={`period-btn ${currentSort === k ? 'active' : ''}`}
                  onClick={() => setCurrentSort(k)}
                >
                  {l}
                </button>
              ))}
            </Space>
          </div>

          {isMobile ? (
            <div style={{ padding: 16 }}>
              {rankedSellers.map((seller, idx) => {
                const perf = getPerformanceLevel(seller.totalMeetings);
                return (
                  <div key={seller.id} className="seller-rank-card" onClick={() => handleViewSeller(seller)}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ fontSize: 22, width: 36 }}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                      </div>
                      <Avatar size={44} style={{ background: perf.color, color: '#fff', fontWeight: 700 }}>
                        {seller.initials}
                      </Avatar>
                      <div style={{ flex: 1, marginLeft: 10 }}>
                        <div style={{ fontWeight: 600 }}>{seller.name}</div>
                        <Text type="secondary" style={{ fontSize: 11 }}>{seller.role}</Text>
                      </div>
                      <Tag color={perf.color === C.success ? 'success' : perf.color === C.warning ? 'warning' : 'error'}
                        style={{ borderRadius: 20, fontSize: 10 }}>
                        {perf.label}
                      </Tag>
                    </div>
                    <Row gutter={8}>
                      {[
                        { val: seller.totalMeetings,   label: 'Meetings',   color: C.primary },
                        { val: seller.totalContacts,    label: 'Contacts',   color: C.success },
                        { val: `${seller.conversionRate}%`, label: 'Conversion', color: C.warning },
                      ].map(({ val, label, color }) => (
                        <Col span={8} key={label}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 20, fontWeight: 700, color }}>{val}</div>
                            <Text type="secondary" style={{ fontSize: 10 }}>{label}</Text>
                          </div>
                        </Col>
                      ))}
                    </Row>
                    <Progress
                      percent={Math.min(100, (seller.totalMeetings / 30) * 100)}
                      size="small" strokeColor={perf.color}
                      style={{ marginTop: 12 }}
                      showInfo={false}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <Table
              columns={columns}
              dataSource={rankedSellers}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10, showSizeChanger: true }}
              scroll={{ x: 900 }}
              onRow={r => ({ onClick: () => handleViewSeller(r), style: { cursor: 'pointer' } })}
            />
          )}
        </Card>
      )}

      {/* ── CALENDAR TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'calendar' && (
        <Card style={{ borderRadius: 16 }}>
          <div style={{ textAlign: 'center', padding: 40 }}>
            <CalendarOutlined style={{ fontSize: 48, color: C.primary, marginBottom: 12 }} />
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Meeting Calendar</div>
            <Text type="secondary">Calendar view requires the Ant Design Calendar component with your meetings data mapped in.</Text>
          </div>
        </Card>
      )}

      {/* ── SELLER DETAIL DRAWER ──────────────────────────────────────────── */}
      <Drawer
        title={
          <Space>
            <Avatar
              size={40}
              style={{
                background: getPerformanceLevel(selectedSeller?.totalMeetings || 0).color,
                color: '#fff', fontWeight: 700,
              }}
            >
              {selectedSeller?.initials}
            </Avatar>
            <div>
              <div style={{ fontWeight: 700 }}>{selectedSeller?.name}</div>
              <Text type="secondary" style={{ fontSize: 12 }}>{selectedSeller?.role}</Text>
            </div>
          </Space>
        }
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width={isMobile ? '100%' : 580}
      >
        {selectedSeller && (
          <div>
            <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
              {[
                { val: selectedSeller.totalMeetings,        label: 'Meetings',   color: C.primary },
                { val: selectedSeller.totalContacts,        label: 'Contacts',   color: C.success },
                { val: `${selectedSeller.conversionRate}%`, label: 'Conversion', color: C.warning },
              ].map(({ val, label, color }) => (
                <Col span={8} key={label}>
                  <div style={{ background: '#f8f9fa', borderRadius: 12, padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color }}>{val}</div>
                    <Text type="secondary" style={{ fontSize: 11 }}>{label}</Text>
                  </div>
                </Col>
              ))}
            </Row>

            {/* Meetings by type */}
            {Object.keys(selectedSeller.meetingsByType || {}).length > 0 && (
              <Card title="Meetings by Type" size="small" style={{ marginBottom: 16, borderRadius: 12 }}>
                <Row gutter={[8, 10]}>
                  {Object.entries(selectedSeller.meetingsByType).map(([type, count]) => {
                    const cfg = getMeetingTypeConfig(type);
                    return (
                      <Col span={12} key={type}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 12, color: cfg.color }}>{cfg.label}</Text>
                          <Tag color="default" style={{ fontWeight: 700 }}>{count}</Tag>
                        </div>
                      </Col>
                    );
                  })}
                </Row>
              </Card>
            )}

            {/* Recent meetings */}
            <Card title="Recent Meetings" size="small" style={{ marginBottom: 16, borderRadius: 12 }}>
              {meetings.filter(m => m.sellerId === selectedSeller.id).slice(0, 5).map(meeting => {
                const type = getMeetingTypeConfig(meeting.type);
                return (
                  <div key={meeting.id} className="activity-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text strong style={{ color: type.color, fontSize: 13 }}>{type.label}</Text>
                      <Tag color={meeting.result === 'won' ? 'success' : meeting.result === 'lost' ? 'error' : 'default'} style={{ fontSize: 10 }}>
                        {meeting.result || 'Scheduled'}
                      </Tag>
                    </div>
                    <Text style={{ fontSize: 12, display: 'block' }}><b>Client:</b> {meeting.clientName}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {dayjs(meeting.scheduledAt).format('DD MMM YYYY, HH:mm')}
                    </Text>
                  </div>
                );
              })}
              {meetings.filter(m => m.sellerId === selectedSeller.id).length === 0 && (
                <Empty description="No meetings recorded" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>

            {/* Recent contacts */}
            <Card title="Recent Contacts" size="small" style={{ borderRadius: 12 }}>
              {contacts.filter(c => c.sellerId === selectedSeller.id).slice(0, 5).map(contact => {
                const method = getContactMethodConfig(contact.method);
                return (
                  <div key={contact.id} className="activity-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text strong style={{ color: method.color, fontSize: 13 }}>{method.label}</Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {dayjs(contact.contactedAt).fromNow()}
                      </Text>
                    </div>
                    <Text style={{ fontSize: 12, display: 'block' }}><b>Client:</b> {contact.clientName}</Text>
                    {contact.notes && (
                      <Text type="secondary" style={{ fontSize: 11 }}>{contact.notes}</Text>
                    )}
                  </div>
                );
              })}
              {contacts.filter(c => c.sellerId === selectedSeller.id).length === 0 && (
                <Empty description="No contacts recorded" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>

            <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
              <Button
                type="primary" icon={<PlusOutlined />} block
                onClick={() => { setMeetingModalVisible(true); setDrawerVisible(false); }}
                style={{ borderRadius: 10 }}
              >
                Schedule Meeting
              </Button>
              <Button
                icon={<PhoneOutlined />} block
                onClick={() => { setContactModalVisible(true); setDrawerVisible(false); }}
                style={{ borderRadius: 10 }}
              >
                Log Contact
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Schedule Meeting Modal */}
      <Modal
        title="Schedule Meeting"
        open={meetingModalVisible}
        onCancel={() => { setMeetingModalVisible(false); meetingForm.resetFields(); }}
        onOk={() => meetingForm.submit()}
        okText="Schedule"
        width={500}
        style={{ borderRadius: 16 }}
      >
        <Form form={meetingForm} onFinish={handleAddMeeting} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="clientName" label="Client Name" rules={[{ required: true }]}>
            <Input placeholder="Enter client name" />
          </Form.Item>
          <Form.Item name="type" label="Meeting Type" rules={[{ required: true }]} initialValue="initial">
            <Select>
              {MEETING_TYPES.map(t => (
                <Select.Option key={t.value} value={t.value}>
                  <span style={{ color: t.color }}>{t.label}</span>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="scheduledAt" label="Date & Time" rules={[{ required: true }]}>
            <DatePicker showTime format="DD MMM YYYY, HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="duration" label="Duration (minutes)">
            <InputNumber min={15} step={15} style={{ width: '100%' }} placeholder="30" />
          </Form.Item>
          <Form.Item name="location" label="Location">
            <Input placeholder="Office, Zoom link, Property address…" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <TextArea rows={3} placeholder="Meeting agenda or context…" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Log Contact Modal */}
      <Modal
        title="Log Client Contact"
        open={contactModalVisible}
        onCancel={() => { setContactModalVisible(false); contactForm.resetFields(); }}
        onOk={() => contactForm.submit()}
        okText="Log Contact"
        width={500}
      >
        <Form form={contactForm} onFinish={handleAddContact} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="clientName" label="Client Name" rules={[{ required: true }]}>
            <Input placeholder="Enter client name" />
          </Form.Item>
          <Form.Item name="method" label="Contact Method" rules={[{ required: true }]} initialValue="call">
            <Select>
              {CONTACT_METHODS.map(m => (
                <Select.Option key={m.value} value={m.value}>
                  <span style={{ color: m.color }}>{m.label}</span>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="contactedAt" label="Date & Time" rules={[{ required: true }]}>
            <DatePicker showTime format="DD MMM YYYY, HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="purpose" label="Purpose">
            <Input placeholder="Initial outreach, follow-up, negotiation…" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <TextArea rows={3} placeholder="Summary of conversation…" />
          </Form.Item>
          <Form.Item name="nextAction" label="Next Action">
            <Input placeholder="Schedule follow-up, send proposal…" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SellerPerformanceDashboard;