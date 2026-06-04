// pages/SellerPerformanceAnalytics.js - Fixed with assignedAt field
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Tag, Space, Button, Input, Modal,
  message, Tooltip, Typography, Row, Col,
  Statistic, Avatar, Badge, Timeline, Empty, Progress
} from 'antd';
import {
  UserOutlined, EyeOutlined, ClockCircleOutlined, CheckCircleOutlined,
  CloseCircleOutlined, WarningOutlined, TrophyOutlined,
  ReloadOutlined, SearchOutlined, TeamOutlined, HistoryOutlined
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

// Status Configuration
const STATUS_CONFIG = {
  [LeadStatus.PENDING]: { color: '#1890ff', text: 'Pending' },
  [LeadStatus.GAIN]: { color: '#52c41a', text: 'Gain' },
  [LeadStatus.LOSS]: { color: '#ff4d4f', text: 'Loss' },
  [LeadStatus.NO_RESPONSE]: { color: '#8c8c8c', text: 'No Response' },
  [LeadStatus.NOT_INTERESTED]: { color: '#faad14', text: 'Not Interested' },
  [LeadStatus.JUNK_LEAD]: { color: '#722ed1', text: 'Junk' },
};

// Format time
const formatTime = (seconds) => {
  if (!seconds || seconds === 0) return '—';
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${(seconds / 86400).toFixed(1)}d`;
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
        // Get ALL leads for this seller
        const allLeads = await LeadsService.getSellerLeads(companyId, seller.id);
        
        // Separate leads
        const ownLeads = allLeads.filter(l => l.createdBy === seller.id);
        const assignedLeads = allLeads.filter(l => l.seller_id === seller.id && l.createdBy !== seller.id);
        
        let viewedCount = 0;
        let totalResponseSeconds = 0;
        let responseCount = 0;
        
        // Track status for assigned leads only
        let statusCount = {};
        Object.keys(STATUS_CONFIG).forEach(s => statusCount[s] = 0);
        
        for (const lead of assignedLeads) {
          // Count status
          if (lead.status) statusCount[lead.status] = (statusCount[lead.status] || 0) + 1;
          
          // Check if lead was viewed
          const viewEvent = await getLeadViewEvent(lead.id, seller.id);
          
          if (viewEvent) {
            viewedCount++;
            
            // Use assignedAt from the lead (set when lead was assigned to seller)
            // This is the key fix - using the assignment date from the lead document
            const assignedAt = lead.assignedAt?.toDate?.() || lead.assignedAt || lead.CreationDate?.toDate?.() || new Date(lead.CreationDate);
            const viewedAt = viewEvent.createdAt?.toDate?.() || viewEvent.createdAt || new Date();
            
            const responseSeconds = (viewedAt - assignedAt) / 1000;
            
            if (responseSeconds > 0 && responseSeconds < 604800) { // Within 7 days
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
// View lead history - update this function
const handleViewLeadHistory = async (lead) => {
  // Don't open if already open
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

  const columns = [
    {
      title: 'Seller',
      key: 'seller',
      width: 180,
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
      width: 80,
      sorter: (a, b) => a.totalAssigned - b.totalAssigned,
      render: (v) => <span style={{ fontSize: 18, fontWeight: 600 }}>{v}</span>
    },
    {
      title: 'Own',
      dataIndex: 'ownLeads',
      key: 'ownLeads',
      width: 60,
      render: (v) => <span style={{ color: '#666' }}>{v}</span>
    },
    {
      title: 'Viewed',
      key: 'viewed',
      width: 130,
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
      width: 100,
      render: (_, r) => (
        <span style={{ fontWeight: 500 }}>
          {r.viewedCount > 0 && r.avgResponse > 0 ? formatTime(r.avgResponse) : '—'}
        </span>
      )
    },
    {
      title: 'Status',
      key: 'status',
      width: 200,
      render: (_, r) => (
        <Space size={4} wrap>
          {Object.entries(r.statusCount || {}).map(([status, count]) => {
            if (count === 0) return null;
            const config = STATUS_CONFIG[status];
            return (
              <Tag key={status} color={config?.color} style={{ fontSize: 11 }}>
                {config?.text}: {count}
              </Tag>
            );
          })}
        </Space>
      )
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_, r) => (
        <Button type="link" size="small" onClick={() => handleViewSeller(r)}>
          Details
        </Button>
      )
    }
  ];

  const leadColumns = [
    {
      title: 'Lead Name',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (v, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{v || 'Unknown'}</div>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.email}</Text>
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (v) => {
        const config = STATUS_CONFIG[v];
        return <Tag color={config?.color}>{config?.text || v || '—'}</Tag>;
      }
    },
    {
      title: 'Viewed',
      key: 'viewed',
      width: 80,
      render: (_, r) => r.isViewed ? (
        <Tag color="success">✅ Yes</Tag>
      ) : (
        <Tag color="warning">❌ No</Tag>
      )
    },
    {
      title: 'Response Time',
      key: 'response',
      width: 100,
      render: (_, r) => {
        if (!r.responseTime) return '—';
        const isFast = r.responseTime <= 7200;
        return (
          <Tag color={isFast ? 'green' : 'orange'}>
            {formatTime(r.responseTime)}
          </Tag>
        );
      }
    },
    {
      title: 'Assigned',
      key: 'assigned',
      width: 100,
      render: (_, r) => r.assignedAt ? dayjs(r.assignedAt).format('MMM DD, HH:mm') : '—'
    },
    {
      title: '',
      key: 'history',
      width: 70,
      render: (_, r) => (
        <Button size="small" icon={<HistoryOutlined />} onClick={() => handleViewLeadHistory(r)} />
      )
    }
  ];

  return (
    <div style={{ padding: 24, background: '#f5f5f5', minHeight: '100vh' }}>
      <Card style={{ marginBottom: 24, borderRadius: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              Seller Performance
            </Title>
            <Text type="secondary">Track assigned leads and response times</Text>
          </div>
          <Space>
            <Input
              placeholder="Search seller..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 200 }}
              allowClear
            />
            <Button icon={<ReloadOutlined />} onClick={fetchSellers} loading={loading}>
              Refresh
            </Button>
          </Space>
        </div>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic title="Sellers" value={sellers.length} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col span={8}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic title="Assigned Leads" value={totalAssigned} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col span={8}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic 
              title="Viewed" 
              value={totalViewed} 
              suffix={`/ ${totalAssigned}`}
              prefix={<EyeOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Sellers" style={{ borderRadius: 12 }}>
        <Table
          columns={columns}
          dataSource={filteredSellers}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1000 }}
        />
      </Card>

      <Modal
        title={
          <Space>
            <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
            <span style={{ fontSize: 16, fontWeight: 600 }}>{selectedSeller?.name}</span>
            <Text type="secondary">({selectedSeller?.role})</Text>
          </Space>
        }
        open={drawerVisible}
        onCancel={() => setDrawerVisible(false)}
        footer={null}
        width={1100}
        destroyOnClose
      >
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Assigned Leads" value={selectedSeller?.totalAssigned} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic 
                title="Viewed" 
                value={`${selectedSeller?.viewedCount} / ${selectedSeller?.totalAssigned}`}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic 
                title="Avg Response Time" 
                value={formatTime(selectedSeller?.avgResponse)}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic 
                title="View Rate" 
                value={selectedSeller?.viewRate}
                suffix="%"
              />
              <Progress percent={selectedSeller?.viewRate} size="small" />
            </Card>
          </Col>
        </Row>

        <Card title="Assigned Leads" size="small">
          <Table
            columns={leadColumns}
            dataSource={sellerLeads}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="small"
            scroll={{ x: 900 }}
          />
        </Card>
      </Modal>

     // Fix the Lead History Modal - replace the existing modal with this:

<Modal
  title={`Lead History: ${selectedLead?.name}`}
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
  width={550}
  destroyOnClose
  maskClosable={true}
>
  {leadHistory.length === 0 ? (
    <Empty description="No history" />
  ) : (
    <Timeline
      items={leadHistory.map((event, idx) => ({
        key: idx,
        color: event.type === 'view' || event.eventType === 'LEAD_VIEWED' ? 'green' : 'blue',
        dot: event.type === 'view' || event.eventType === 'LEAD_VIEWED' ? <EyeOutlined /> : <ClockCircleOutlined />,
        children: (
          <div>
            <div style={{ fontWeight: 600 }}>
              {event.type === 'view' || event.eventType === 'LEAD_VIEWED' ? 'Viewed' : 
               event.type === 'reveal' ? 'Revealed' : 
               event.type === 'assign' ? 'Assigned' : 
               event.type === 'whatsapp' ? 'WhatsApp' :
               event.type === 'email' ? 'Email' :
               event.type === 'call' ? 'Call' : 'Activity'}
            </div>
            <div style={{ fontSize: 12, color: '#666' }}>
              {dayjs(event.createdAt?.toDate?.() || event.createdAt || event.timestamp?.toDate?.()).format('YYYY-MM-DD HH:mm:ss')}
            </div>
            {event.message && (
              <div style={{ fontSize: 12, marginTop: 4, background: '#f5f5f5', padding: 4, borderRadius: 4 }}>
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