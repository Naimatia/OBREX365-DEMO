// pages/SellerPerformanceAnalytics.js - Responsive Design with Improved Details
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Tag, Space, Button, Input, Modal,
  message, Tooltip, Typography, Row, Col,
  Statistic, Avatar, Badge, Timeline, Empty, Progress,
  Drawer, Descriptions, Grid, List, Divider
} from 'antd';
import {
  UserOutlined, EyeOutlined, ClockCircleOutlined, CheckCircleOutlined,
  CloseCircleOutlined, WarningOutlined, TrophyOutlined,
  ReloadOutlined, SearchOutlined, TeamOutlined, HistoryOutlined,
  MailOutlined, PhoneOutlined, DollarOutlined, StarOutlined
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

// Status Configuration
const STATUS_CONFIG = {
  [LeadStatus.PENDING]: { color: '#1890ff', text: 'Pending', icon: <ClockCircleOutlined /> },
  [LeadStatus.GAIN]: { color: '#52c41a', text: 'Gain', icon: <TrophyOutlined /> },
  [LeadStatus.LOSS]: { color: '#ff4d4f', text: 'Loss', icon: <CloseCircleOutlined /> },
  [LeadStatus.NO_RESPONSE]: { color: '#8c8c8c', text: 'No Response', icon: <WarningOutlined /> },
  [LeadStatus.NOT_INTERESTED]: { color: '#faad14', text: 'Not Interested', icon: <CloseCircleOutlined /> },
  [LeadStatus.JUNK_LEAD]: { color: '#722ed1', text: 'Junk', icon: <WarningOutlined /> },
};

// Format time
const formatTime = (seconds) => {
  if (!seconds || seconds === 0) return '—';
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${(seconds / 86400).toFixed(1)}d`;
};

// Mobile-friendly seller card component
const SellerMobileCard = ({ seller, onViewDetails }) => {
  const viewRate = seller.viewRate || 0;
  const statusEntries = Object.entries(seller.statusCount || {}).filter(([_, count]) => count > 0);
  
  return (
    <Card 
      style={{ marginBottom: 12, borderRadius: 12 }}
      bodyStyle={{ padding: 16 }}
      onClick={() => onViewDetails(seller)}
      hoverable
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff', marginRight: 12 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 16 }}>{seller.name}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{seller.role}</Text>
        </div>
        <Badge count={seller.totalAssigned} showZero color="#1890ff" />
      </div>
      
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text type="secondary">View Rate</Text>
          <Text strong style={{ color: '#52c41a' }}>{viewRate}%</Text>
        </div>
        <Progress percent={viewRate} size="small" strokeColor="#52c41a" showInfo={false} />
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>Viewed</Text>
          <div style={{ fontWeight: 600 }}>{seller.viewedCount}/{seller.totalAssigned}</div>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>Avg Response</Text>
          <div style={{ fontWeight: 600 }}>{seller.viewedCount > 0 && seller.avgResponse > 0 ? formatTime(seller.avgResponse) : '—'}</div>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>Own Leads</Text>
          <div style={{ fontWeight: 600 }}>{seller.ownLeads}</div>
        </div>
      </div>
      
      {statusEntries.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
          {statusEntries.map(([status, count]) => {
            const config = STATUS_CONFIG[status];
            return (
              <Tag key={status} color={config?.color} style={{ fontSize: 11, margin: 0 }}>
                {config?.text}: {count}
              </Tag>
            );
          })}
        </div>
      )}
    </Card>
  );
};

// Lead mobile card component
const LeadMobileCard = ({ lead, onViewHistory }) => {
  const config = STATUS_CONFIG[lead.status];
  
  return (
    <Card 
      style={{ marginBottom: 12, borderRadius: 12 }}
      bodyStyle={{ padding: 16 }}
      hoverable
    >
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
          {lead.name || 'Unknown'}
        </div>
        <Text type="secondary" style={{ fontSize: 12 }}>{lead.email}</Text>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <Tag color={config?.color} icon={config?.icon}>
          {config?.text || lead.status || '—'}
        </Tag>
        <Badge 
          status={lead.isViewed ? "success" : "warning"} 
          text={lead.isViewed ? "Viewed" : "Not Viewed"}
        />
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <Text type="secondary" style={{ fontSize: 11 }}>Response Time</Text>
          <div style={{ fontSize: 13, fontWeight: 500 }}>
            {lead.responseTime ? (
              <Tag color={lead.responseTime <= 7200 ? 'green' : 'orange'}>
                {formatTime(lead.responseTime)}
              </Tag>
            ) : '—'}
          </div>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 11 }}>Assigned</Text>
          <div style={{ fontSize: 13 }}>
            {lead.assignedAt ? dayjs(lead.assignedAt).format('MMM DD') : '—'}
          </div>
        </div>
        <Button 
          size="small" 
          icon={<HistoryOutlined />} 
          onClick={(e) => {
            e.stopPropagation();
            onViewHistory(lead);
          }}
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
  const [selectedLead, setSelectedLead] = useState(null);
  const [leadHistory, setLeadHistory] = useState([]);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  
  const user = useSelector(state => state.auth.user);
  const companyId = user?.company_id;
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  // Get view event for a lead
  const getLeadViewEvent = async (leadId, sellerId) => {
    try {
      const history = await LeadHistoryService.getLeadHistory(leadId);
      const viewEvent = history.find(h => 
        (h.type === 'view' || h.type === 'reveal' || h.eventType === 'LEAD_VIEWED') && 
        (h.sellerId === sellerId || h.userId === sellerId || h.createdBy?.id === sellerId)
      );
      if (viewEvent) return viewEvent;
      
      const q = query(
        collection(db, 'leadHistory'),
        where('leadId', '==', leadId),
        where('userId', '==', sellerId)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) return snapshot.docs[0].data();
      
      return null;
    } catch (error) {
      return null;
    }
  };

  // Fetch all sellers
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
          
          const viewEvent = await getLeadViewEvent(lead.id, seller.id);
          
          if (viewEvent) {
            viewedCount++;
            
            const assignedAt = lead.assignedAt?.toDate?.() || lead.assignedAt || lead.CreationDate?.toDate?.() || new Date(lead.CreationDate);
            const viewedAt = viewEvent.createdAt?.toDate?.() || viewEvent.createdAt || new Date();
            
            const responseSeconds = (viewedAt - assignedAt) / 1000;
            
            if (responseSeconds > 0 && responseSeconds < 604800) {
              totalResponseSeconds += responseSeconds;
              responseCount++;
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

  // View seller details
  const handleViewSeller = async (seller) => {
    setSelectedSeller(seller);
    setDrawerVisible(true);
    
    try {
      const allLeads = await LeadsService.getSellerLeads(companyId, seller.id);
      const assignedLeads = allLeads.filter(l => l.seller_id === seller.id && l.createdBy !== seller.id);
      
      const leadsWithInfo = await Promise.all(assignedLeads.map(async (lead) => {
        const viewEvent = await getLeadViewEvent(lead.id, seller.id);
        
        let responseTime = null;
        let viewedAt = null;
        let assignedAt = lead.assignedAt?.toDate?.() || lead.assignedAt || null;
        
        if (viewEvent && assignedAt) {
          viewedAt = viewEvent.createdAt?.toDate?.() || viewEvent.createdAt || new Date();
          responseTime = (viewedAt - assignedAt) / 1000;
        }
        
        return {
          ...lead,
          viewedAt,
          responseTime,
          isViewed: !!viewEvent,
          assignedAt,
        };
      }));
      
      setSellerLeads(leadsWithInfo);
    } catch (error) {
      message.error('Failed to load leads');
    }
  };

  // View lead history
  const handleViewLeadHistory = async (lead) => {
    if (historyModalVisible) return;
    
    setSelectedLead(lead);
    setHistoryModalVisible(true);
    
    try {
      let history = await LeadHistoryService.getLeadHistory(lead.id);
      const q = query(collection(db, 'leadHistory'), where('leadId', '==', lead.id));
      const snapshot = await getDocs(q);
      snapshot.forEach(doc => {
        history.push({ ...doc.data(), createdAt: doc.data().timestamp?.toDate?.() });
      });
      setLeadHistory(history.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (error) {
      console.error('Error loading history:', error);
      message.error('Failed to load history');
      setLeadHistory([]);
    }
  };

  const filteredSellers = sellers.filter(s => 
    s.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const totalAssigned = sellers.reduce((sum, s) => sum + s.totalAssigned, 0);
  const totalViewed = sellers.reduce((sum, s) => sum + s.viewedCount, 0);

  // Desktop columns
  const columns = [
    {
      title: 'Seller',
      key: 'seller',
      width: 200,
      render: (_, r) => (
        <Space>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
          <div>
            <div style={{ fontWeight: 600 }}>{r.name}</div>
            <Text type="secondary" style={{ fontSize: 11 }}>{r.role}</Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Assigned',
      dataIndex: 'totalAssigned',
      key: 'totalAssigned',
      width: 100,
      sorter: (a, b) => a.totalAssigned - b.totalAssigned,
      render: (v) => <span style={{ fontSize: 18, fontWeight: 600 }}>{v}</span>
    },
    {
      title: 'Own',
      dataIndex: 'ownLeads',
      key: 'ownLeads',
      width: 80,
      render: (v) => <span style={{ color: '#666' }}>{v}</span>
    },
    {
      title: 'Viewed',
      key: 'viewed',
      width: 160,
      render: (_, r) => (
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#52c41a' }}>
            {r.viewedCount} / {r.totalAssigned}
          </div>
          <Progress 
            percent={r.viewRate} 
            size="small" 
            strokeColor="#52c41a"
            showInfo={false}
          />
        </div>
      )
    },
    {
      title: 'Avg Response',
      key: 'response',
      width: 120,
      render: (_, r) => (
        <Tooltip title={r.viewedCount > 0 && r.avgResponse > 0 ? `Average time to view lead` : 'No responses recorded'}>
          <span style={{ fontWeight: 500 }}>
            {r.viewedCount > 0 && r.avgResponse > 0 ? formatTime(r.avgResponse) : '—'}
          </span>
        </Tooltip>
      )
    },
    {
      title: 'Status Distribution',
      key: 'status',
      width: 220,
      render: (_, r) => (
        <Space size={4} wrap>
          {Object.entries(r.statusCount || {}).map(([status, count]) => {
            if (count === 0) return null;
            const config = STATUS_CONFIG[status];
            return (
              <Tooltip key={status} title={`${config?.text}: ${count} leads`}>
                <Tag color={config?.color} style={{ fontSize: 11, cursor: 'pointer' }}>
                  {config?.text}: {count}
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
        >
          Details
        </Button>
      )
    }
  ];

  // Desktop lead columns
  const leadColumns = [
    {
      title: 'Lead Information',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      render: (v, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{v || 'Unknown'}</div>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.email}</Text>
          {r.phone && <div style={{ fontSize: 11 }}><PhoneOutlined /> {r.phone}</div>}
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (v) => {
        const config = STATUS_CONFIG[v];
        return (
          <Tag color={config?.color} icon={config?.icon}>
            {config?.text || v || '—'}
          </Tag>
        );
      }
    },
    {
      title: 'View Status',
      key: 'viewed',
      width: 100,
      render: (_, r) => r.isViewed ? (
        <Badge status="success" text="Viewed" />
      ) : (
        <Badge status="warning" text="Not viewed" />
      )
    },
    {
      title: 'Response Time',
      key: 'response',
      width: 120,
      render: (_, r) => {
        if (!r.responseTime) return '—';
        const isFast = r.responseTime <= 7200;
        return (
          <Tag color={isFast ? 'green' : 'orange'} icon={isFast ? <CheckCircleOutlined /> : <ClockCircleOutlined />}>
            {formatTime(r.responseTime)}
          </Tag>
        );
      }
    },
    {
      title: 'Assigned Date',
      key: 'assigned',
      width: 130,
      render: (_, r) => r.assignedAt ? (
        <Tooltip title={dayjs(r.assignedAt).format('YYYY-MM-DD HH:mm:ss')}>
          {dayjs(r.assignedAt).format('MMM DD, YYYY')}
        </Tooltip>
      ) : '—'
    },
    {
      title: 'Actions',
      key: 'history',
      width: 80,
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

  // Seller stats summary component
  const SellerStatsSummary = () => (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={24} sm={8}>
        <Card style={{ borderRadius: 12 }}>
          <Statistic 
            title="Total Sellers" 
            value={sellers.length} 
            prefix={<TeamOutlined />}
            valueStyle={{ fontSize: isMobile ? 24 : 32 }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card style={{ borderRadius: 12 }}>
          <Statistic 
            title="Assigned Leads" 
            value={totalAssigned} 
            prefix={<UserOutlined />}
            valueStyle={{ fontSize: isMobile ? 24 : 32 }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card style={{ borderRadius: 12 }}>
          <Statistic 
            title="Viewed" 
            value={totalViewed} 
            suffix={`/ ${totalAssigned}`}
            prefix={<EyeOutlined />}
            valueStyle={{ color: '#52c41a', fontSize: isMobile ? 24 : 32 }}
          />
          <Progress 
            percent={totalAssigned ? (totalViewed / totalAssigned) * 100 : 0} 
            size="small" 
            strokeColor="#52c41a"
            showInfo={false}
          />
        </Card>
      </Col>
    </Row>
  );

  return (
    <div style={{ padding: isMobile ? 12 : 24, background: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <Card style={{ marginBottom: 24, borderRadius: 12 }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between', 
          alignItems: isMobile ? 'stretch' : 'center',
          gap: isMobile ? 16 : 0
        }}>
          <div>
            <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>
              Seller Performance Analytics
            </Title>
            <Text type="secondary">Track assigned leads and response times</Text>
          </div>
          <Space direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: isMobile ? '100%' : 'auto' }}>
            <Input
              placeholder="Search seller..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: isMobile ? '100%' : 200 }}
              allowClear
              size={isMobile ? 'middle' : 'default'}
            />
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchSellers} 
              loading={loading}
              block={isMobile}
            >
              Refresh
            </Button>
          </Space>
        </div>
      </Card>

      {/* Stats Summary */}
      <SellerStatsSummary />

      {/* Sellers List - Responsive */}
      <Card 
        title="Sellers Performance" 
        style={{ borderRadius: 12 }}
        bodyStyle={{ padding: isMobile ? 12 : 24 }}
      >
        {isMobile ? (
          // Mobile View - Card List
          <div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Text type="secondary">Loading sellers...</Text>
              </div>
            ) : (
              filteredSellers.map(seller => (
                <SellerMobileCard 
                  key={seller.id} 
                  seller={seller} 
                  onViewDetails={handleViewSeller}
                />
              ))
            )}
            {!loading && filteredSellers.length === 0 && (
              <Empty description="No sellers found" />
            )}
          </div>
        ) : (
          // Desktop View - Table
          <Table
            columns={columns}
            dataSource={filteredSellers}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            scroll={{ x: 1100 }}
            bordered
          />
        )}
      </Card>

      {/* Seller Details Drawer */}
      <Drawer
        title={
          <Space>
            <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
            <span style={{ fontSize: 16, fontWeight: 600 }}>{selectedSeller?.name}</span>
            <Text type="secondary">({selectedSeller?.role})</Text>
          </Space>
        }
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width={isMobile ? '100%' : 1100}
        placement="right"
        closable
        destroyOnClose
      >
        {/* Seller Stats Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic 
                title="Assigned Leads" 
                value={selectedSeller?.totalAssigned}
                valueStyle={{ fontSize: 20 }}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic 
                title="Viewed" 
                value={`${selectedSeller?.viewedCount} / ${selectedSeller?.totalAssigned}`}
                valueStyle={{ color: '#52c41a', fontSize: 20 }}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic 
                title="Avg Response Time" 
                value={formatTime(selectedSeller?.avgResponse)}
                valueStyle={{ fontSize: 20 }}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic 
                title="View Rate" 
                value={selectedSeller?.viewRate}
                suffix="%"
                valueStyle={{ fontSize: 20 }}
              />
              <Progress percent={selectedSeller?.viewRate} size="small" />
            </Card>
          </Col>
        </Row>

        <Divider orientation="left">Assigned Leads</Divider>

        {/* Leads List - Responsive */}
        {isMobile ? (
          <div>
            {sellerLeads.map(lead => (
              <LeadMobileCard 
                key={lead.id} 
                lead={lead} 
                onViewHistory={handleViewLeadHistory}
              />
            ))}
            {sellerLeads.length === 0 && (
              <Empty description="No assigned leads" />
            )}
          </div>
        ) : (
          <Table
            columns={leadColumns}
            dataSource={sellerLeads}
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: true }}
            size="middle"
            scroll={{ x: 900 }}
            bordered
          />
        )}
      </Drawer>

      {/* Lead History Modal */}
      <Modal
        title={
          <Space>
            <HistoryOutlined />
            <span>Lead History: {selectedLead?.name}</span>
          </Space>
        }
        open={historyModalVisible}
        onCancel={() => {
          setHistoryModalVisible(false);
          setSelectedLead(null);
          setLeadHistory([]);
        }}
        afterClose={() => {
          setSelectedLead(null);
          setLeadHistory([]);
        }}
        footer={null}
        width={isMobile ? '90%' : 550}
        destroyOnClose
        maskClosable={true}
      >
        {leadHistory.length === 0 ? (
          <Empty description="No history records found" />
        ) : (
          <Timeline
            items={leadHistory.map((event, idx) => ({
              key: idx,
              color: event.type === 'view' || event.eventType === 'LEAD_VIEWED' ? 'green' : 
                     event.type === 'assign' ? 'blue' : 'gray',
              dot: event.type === 'view' || event.eventType === 'LEAD_VIEWED' ? <EyeOutlined /> : 
                   event.type === 'assign' ? <UserOutlined /> : <ClockCircleOutlined />,
              children: (
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {event.type === 'view' || event.eventType === 'LEAD_VIEWED' ? 'Lead Viewed' : 
                     event.type === 'reveal' ? 'Contact Revealed' : 
                     event.type === 'assign' ? 'Lead Assigned' : 
                     event.type === 'whatsapp' ? 'WhatsApp Message' :
                     event.type === 'email' ? 'Email Sent' :
                     event.type === 'call' ? 'Phone Call' : 'Activity Recorded'}
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    {dayjs(event.createdAt?.toDate?.() || event.createdAt || event.timestamp?.toDate?.()).format('YYYY-MM-DD HH:mm:ss')}
                  </div>
                  {event.message && (
                    <div style={{ fontSize: 12, marginTop: 8, background: '#f5f5f5', padding: 8, borderRadius: 6 }}>
                      {event.message}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                    By: {event.createdBy?.name || event.userId || event.sellerId || 'System'}
                  </div>
                </div>
              )
            }))}
          />
        )}
      </Modal>
    </div>
  );
};

export default SellerPerformanceAnalytics;