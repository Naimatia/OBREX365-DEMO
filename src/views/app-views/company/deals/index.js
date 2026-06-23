// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Typography, Table, Input, Button, Row, Col, Tag, Drawer, Space, 
  Statistic, Tooltip, Modal, Spin, Badge, Divider, message, Popconfirm,
  Select, Avatar, Dropdown
} from 'antd';
import { db, collection, query, where, getDocs, doc, getDoc } from 'configs/FirebaseConfig';
import { 
  PlusOutlined, SearchOutlined, FilterOutlined, BarChartOutlined, 
  EditOutlined, DeleteOutlined, EyeOutlined, DollarOutlined, 
  CheckCircleOutlined, CloseCircleOutlined, InfoCircleOutlined,
  UserOutlined, PhoneOutlined, MailOutlined, MoreOutlined,
  TeamOutlined, TrophyOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import dealService from 'services/firebase/DealService';
import contactService from 'services/firebase/ContactService';
import userService from 'services/firebase/UserService';
import { DealStatus, DealStatusLabels, DealStatusColors, DealSourceEnum } from 'models/DealModel';
import dayjs from 'dayjs';
import DealDetails from './DealDetails';
import DealStatsDrawer from './DealStatsDrawer';
import DealForm from './DealForm';
import './deals.css';

const { Title, Text } = Typography;
const { Option } = Select;

// Status options with colors
const statusOptions = [
  { value: DealStatus.OPENED, label: 'Opened', color: 'blue' },
  { value: DealStatus.PROPOSAL, label: 'Proposal', color: 'purple' },
  { value: DealStatus.WON, label: 'Won', color: 'gold' },
  { value: DealStatus.LOST, label: 'Lost', color: 'red' }
];

const DealsPage = () => {
  const user = useSelector(state => state.auth.user);
  const companyId = user?.company_id || '';

  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({
    status: null,
    source: null,
    sellerId: null,
  });
  const [stats, setStats] = useState({
    count: { total: 0, opened: 0, proposal: 0, won: 0, lost: 0 },
    value: { total: 0, opened: 0, proposal: 0, won: 0, lost: 0 }
  });
  
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [statsDrawerVisible, setStatsDrawerVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [sellers, setSellers] = useState([]);

  // Fetch deals with all data
  const fetchDeals = useCallback(async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      // Get all deals
      const dealsCollection = collection(db, 'deals');
      const dealsSnap = await getDocs(dealsCollection);
      
      // Process and filter by company
      const allDeals = dealsSnap.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      
      const companyDeals = allDeals.filter(deal => 
        deal.company_id === companyId || 
        deal.company_id?.path?.includes(companyId)
      );
      
      // Apply filters
      let filteredDeals = companyDeals;
      
      if (filters.status) {
        filteredDeals = filteredDeals.filter(deal => deal.Status === filters.status);
      }
      
      if (filters.source) {
        filteredDeals = filteredDeals.filter(deal => deal.Source === filters.source);
      }
      
      if (filters.sellerId) {
        filteredDeals = filteredDeals.filter(deal => deal.seller_id === filters.sellerId);
      }
      
      if (searchText) {
        const term = searchText.toLowerCase();
        filteredDeals = filteredDeals.filter(deal => 
          deal.Description?.toLowerCase().includes(term) ||
          deal.contact_name?.toLowerCase().includes(term) ||
          deal.contact_email?.toLowerCase().includes(term)
        );
      }
      
      // Fetch seller names for display
      const dealsWithSellers = await Promise.all(
        filteredDeals.map(async (deal) => {
          let sellerName = deal.seller_name || '';
          if (deal.seller_id && !sellerName) {
            try {
              const sellerDoc = await getDoc(doc(db, 'users', deal.seller_id));
              if (sellerDoc.exists()) {
                const sellerData = sellerDoc.data();
                sellerName = `${sellerData.firstname || ''} ${sellerData.lastname || ''}`.trim();
              }
            } catch (e) {
              console.warn('Could not fetch seller:', e);
            }
          }
          return { ...deal, seller_name: sellerName };
        })
      );
      
      setDeals(dealsWithSellers);
      
      // Calculate stats
      const statsCounts = {
        total: filteredDeals.length,
        opened: filteredDeals.filter(d => d.Status === DealStatus.OPENED || d.Status === 'Opened').length,
        proposal: filteredDeals.filter(d => d.Status === DealStatus.PROPOSAL || d.Status === 'Proposal').length,
        won: filteredDeals.filter(d => d.Status === DealStatus.WON || d.Status === 'Won').length,
        lost: filteredDeals.filter(d => d.Status === DealStatus.LOST || d.Status === 'Lost').length
      };
      
      const statsValues = {
        total: filteredDeals.reduce((sum, deal) => sum + (Number(deal.Amount) || 0), 0),
        opened: filteredDeals.filter(d => d.Status === DealStatus.OPENED || d.Status === 'Opened')
                          .reduce((sum, deal) => sum + (Number(deal.Amount) || 0), 0),
        proposal: filteredDeals.filter(d => d.Status === DealStatus.PROPOSAL || d.Status === 'Proposal')
                          .reduce((sum, deal) => sum + (Number(deal.Amount) || 0), 0),
        won: filteredDeals.filter(d => d.Status === DealStatus.WON || d.Status === 'Won')
                        .reduce((sum, deal) => sum + (Number(deal.Amount) || 0), 0),
        lost: filteredDeals.filter(d => d.Status === DealStatus.LOST || d.Status === 'Lost')
                        .reduce((sum, deal) => sum + (Number(deal.Amount) || 0), 0)
      };
      
      setStats({
        count: statsCounts,
        value: statsValues
      });
    } catch (error) {
      console.error('Error fetching deals:', error);
      message.error('Failed to fetch deals');
    } finally {
      setLoading(false);
    }
  }, [companyId, filters, searchText]);

  // Fetch sellers
  const fetchSellers = useCallback(async () => {
    if (!companyId) return;
    
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const sellersList = [];
      
      usersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.company_id === companyId) {
          sellersList.push({
            id: doc.id,
            ...data,
            fullName: `${data.firstname || ''} ${data.lastname || ''}`.trim()
          });
        }
      });
      
      setSellers(sellersList);
    } catch (error) {
      console.error('Error fetching sellers:', error);
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      fetchDeals();
      fetchSellers();
    }
  }, [companyId, fetchDeals, fetchSellers]);

  // Handlers
  const handleSearch = (value) => {
    setSearchText(value);
    setTimeout(() => fetchDeals(), 300);
  };

  const handleFilterChange = (type, value) => {
    setFilters(prev => ({ ...prev, [type]: value }));
    setTimeout(() => fetchDeals(), 100);
  };

  const handleCreateDeal = () => {
    setSelectedDeal(null);
    setIsEditing(false);
    setFormVisible(true);
  };

  const handleEditDeal = (deal) => {
    setSelectedDeal(deal);
    setIsEditing(true);
    setFormVisible(true);
  };

  const handleViewDetails = (deal) => {
    setSelectedDeal(deal);
    setDetailsVisible(true);
  };

  const handleDeleteDeal = async (dealId) => {
    try {
      await dealService.delete(dealId);
      message.success('Deal deleted');
      fetchDeals();
    } catch (error) {
      message.error('Failed to delete deal');
    }
  };

  const handleStatusChange = async (dealId, newStatus) => {
    try {
      await dealService.update(dealId, { Status: newStatus });
      message.success(`Status updated to ${DealStatusLabels[newStatus] || newStatus}`);
      fetchDeals();
    } catch (error) {
      message.error('Failed to update status');
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      const cleanData = { ...formData };
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined || cleanData[key] === null) {
          delete cleanData[key];
        }
      });
      
      if (isEditing && selectedDeal) {
        await dealService.update(selectedDeal.id, cleanData);
        message.success('Deal updated');
      } else {
        await dealService.create({
          ...cleanData,
          company_id: companyId,
          Status: DealStatus.OPENED
        });
        message.success('Deal created');
      }
      
      setFormVisible(false);
      fetchDeals();
    } catch (error) {
      console.error('Error saving deal:', error);
      message.error('Failed to save deal');
    }
  };

  // Render status tag
  const renderStatus = (status) => {
    const config = statusOptions.find(s => s.value === status);
    const color = DealStatusColors[status] || config?.color || 'default';
    const label = DealStatusLabels[status] || config?.label || status || 'Unknown';
    
    return (
      <Tag color={color} style={{ borderRadius: 16, padding: '2px 12px' }}>
        {label}
      </Tag>
    );
  };

  // Render source
  const renderSource = (source) => {
    const sources = {
      [DealSourceEnum.LEADS]: { icon: '🧲', color: '#1890ff' },
      [DealSourceEnum.CONTACTS]: { icon: '👥', color: '#52c41a' },
      [DealSourceEnum.FACEBOOK]: { icon: '📘', color: '#1877F2' },
      [DealSourceEnum.INSTAGRAM]: { icon: '📷', color: '#E4405F' },
      [DealSourceEnum.WEBSITE]: { icon: '🌐', color: '#52c41a' },
      [DealSourceEnum.LINKEDIN]: { icon: '💼', color: '#0A66C2' },
      [DealSourceEnum.TIKTOK]: { icon: '🎵', color: '#ff0050' },
      [DealSourceEnum.FREELANCE]: { icon: '💪', color: '#fa8c16' }
    };
    
    const src = sources[source];
    return src ? (
      <Tag color={src.color}>{src.icon} {source}</Tag>
    ) : (
      <Tag>{source || 'Other'}</Tag>
    );
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Table columns
  const columns = [
    {
      title: 'Contact',
      dataIndex: 'contact_name',
      key: 'contact_name',
      width: 180,
      fixed: 'left',
      render: (text, record) => (
        <Space>
          <Avatar size={32} style={{ backgroundColor: '#1890ff' }}>
            {(text || 'U')[0].toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 500 }}>{text || 'Unknown'}</div>
            {record.contact_email && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                <MailOutlined style={{ marginRight: 2 }} />
                {record.contact_email}
              </Text>
            )}
          </div>
        </Space>
      ),
      sorter: (a, b) => (a.contact_name || '').localeCompare(b.contact_name || '')
    },
    {
      title: 'Description',
      dataIndex: 'Description',
      key: 'description',
      ellipsis: true,
      width: 180,
      render: (text) => (
        <Tooltip title={text}>
          <span>{text || '—'}</span>
        </Tooltip>
      )
    },
    {
      title: 'Amount',
      dataIndex: 'Amount',
      key: 'amount',
      width: 130,
      sorter: (a, b) => (a.Amount || 0) - (b.Amount || 0),
      render: (amount) => (
        <Text strong style={{ color: '#52c41a', fontSize: 14 }}>
          <DollarOutlined /> {formatCurrency(amount)}
        </Text>
      )
    },
    {
      title: 'Seller',
      dataIndex: 'seller_name',
      key: 'seller',
      width: 140,
      render: (name) => (
        <Space>
          <UserOutlined style={{ color: '#722ed1' }} />
          <Text>{name || 'Unassigned'}</Text>
        </Space>
      ),
      filters: sellers.map(s => ({ text: s.fullName || s.name || 'Unknown', value: s.id })),
      onFilter: (value, record) => record.seller_id === value
    },
    {
      title: 'Source',
      dataIndex: 'Source',
      key: 'source',
      width: 120,
      render: (source) => renderSource(source),
      filters: Object.values(DealSourceEnum).map(src => ({ text: src, value: src })),
      onFilter: (value, record) => record.Source === value
    },
    {
      title: 'Status',
      dataIndex: 'Status',
      key: 'status',
      width: 130,
      render: (status, record) => (
        <Dropdown
          menu={{
            items: statusOptions.map(opt => ({
              key: opt.value,
              label: <Tag color={opt.color}>{opt.label}</Tag>,
              onClick: () => handleStatusChange(record.id, opt.value)
            }))
          }}
          trigger={['click']}
        >
          <Tag 
            color={DealStatusColors[status] || 'default'} 
            style={{ cursor: 'pointer', borderRadius: 16, padding: '2px 12px' }}
          >
            {DealStatusLabels[status] || status || 'Unknown'}
          </Tag>
        </Dropdown>
      ),
      filters: statusOptions.map(opt => ({ text: opt.label, value: opt.value })),
      onFilter: (value, record) => record.Status === value
    },
    {
      title: 'Created',
      dataIndex: 'CreationDate',
      key: 'created',
      width: 110,
      render: (date) => {
        if (!date) return '—';
        try {
          const d = date.toDate?.() || new Date(date);
          return dayjs(d).format('DD MMM YY');
        } catch {
          return '—';
        }
      },
      sorter: (a, b) => {
        const da = a.CreationDate?.toDate?.() || new Date(a.CreationDate) || new Date(0);
        const db = b.CreationDate?.toDate?.() || new Date(b.CreationDate) || new Date(0);
        return da - db;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button 
              type="text" 
              size="small" 
              icon={<EyeOutlined />} 
              onClick={() => handleViewDetails(record)}
              style={{ color: '#1890ff' }}
            />
          </Tooltip>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'edit',
                  label: 'Edit',
                  icon: <EditOutlined />,
                  onClick: () => handleEditDeal(record)
                },
                {
                  type: 'divider'
                },
                {
                  key: 'delete',
                  label: 'Delete',
                  icon: <DeleteOutlined />,
                  danger: true,
                  onClick: () => {
                    Modal.confirm({
                      title: 'Delete Deal',
                      content: 'Are you sure you want to delete this deal?',
                      onOk: () => handleDeleteDeal(record.id)
                    });
                  }
                }
              ]
            }}
            trigger={['click']}
          >
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      )
    }
  ];

  // Row class name
  const getRowClassName = (record) => {
    switch(record.Status) {
      case DealStatus.OPENED: return 'deal-row-opened';
      case DealStatus.PROPOSAL: return 'deal-row-proposal';
      case DealStatus.WON: return 'deal-row-won';
      case DealStatus.LOST: return 'deal-row-lost';
      default: return '';
    }
  };

  return (
    <div className="deals-page" style={{ padding: '24px' }}>
      {/* Stats Summary */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic title="Total" value={stats.count.total} valueStyle={{ fontSize: 18 }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ textAlign: 'center', background: '#e6f7ff' }}>
            <Statistic title="Opened" value={stats.count.opened} valueStyle={{ fontSize: 18, color: '#1890ff' }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ textAlign: 'center', background: '#f9f0ff' }}>
            <Statistic title="Proposal" value={stats.count.proposal} valueStyle={{ fontSize: 18, color: '#722ed1' }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ textAlign: 'center', background: '#f6ffed' }}>
            <Statistic title="Won" value={stats.count.won} valueStyle={{ fontSize: 18, color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ textAlign: 'center', background: '#fff1f0' }}>
            <Statistic title="Lost" value={stats.count.lost} valueStyle={{ fontSize: 18, color: '#ff4d4f' }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ textAlign: 'center', background: '#f0f5ff' }}>
            <Statistic title="Total Value" value={formatCurrency(stats.value.total)} valueStyle={{ fontSize: 16, color: '#52c41a' }} />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }} bodyStyle={{ padding: '12px 16px' }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={6}>
            <Input 
              placeholder="Search deals..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={12} sm={4}>
            <Select
              placeholder="Status"
              style={{ width: '100%' }}
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              allowClear
            >
              {statusOptions.map(opt => (
                <Option key={opt.value} value={opt.value}>
                  <Tag color={opt.color}>{opt.label}</Tag>
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={4}>
            <Select
              placeholder="Source"
              style={{ width: '100%' }}
              value={filters.source}
              onChange={(value) => handleFilterChange('source', value)}
              allowClear
            >
              {Object.values(DealSourceEnum).map(src => (
                <Option key={src} value={src}>{src}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={6}>
            <Select
              placeholder="Seller"
              style={{ width: '100%' }}
              value={filters.sellerId}
              onChange={(value) => handleFilterChange('sellerId', value)}
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {sellers.map(seller => (
                <Option key={seller.id} value={seller.id}>
                  {seller.fullName || seller.name || 'Unknown'}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={4}>
            <Space>
              <Button onClick={() => {
                setFilters({ status: null, source: null, sellerId: null });
                setSearchText('');
                fetchDeals();
              }}>
                Reset
              </Button>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={handleCreateDeal}
              >
                Add Deal
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Deals Table */}
      <Card bodyStyle={{ padding: 0 }}>
        <Table 
          columns={columns} 
          dataSource={deals} 
          rowKey="id" 
          loading={loading}
          pagination={{ 
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `${total} deals`
          }}
          rowClassName={getRowClassName}
          scroll={{ x: 1100 }}
        />
      </Card>
      
      {/* Deal Details Drawer */}
      <DealDetails
        visible={detailsVisible}
        deal={selectedDeal}
        onClose={() => setDetailsVisible(false)}
        onStatusChange={handleStatusChange}
        onEdit={handleEditDeal}
        onDelete={(dealId) => {
          setDetailsVisible(false);
          handleDeleteDeal(dealId);
        }}
        onRefresh={fetchDeals}
      />
      
      {/* Stats Drawer */}
      <DealStatsDrawer 
        visible={statsDrawerVisible}
        onClose={() => setStatsDrawerVisible(false)}
        stats={stats}
      />
      
      {/* Deal Form Modal */}
      <DealForm
        visible={formVisible}
        onCancel={() => setFormVisible(false)}
        onSubmit={handleFormSubmit}
        isEditing={isEditing}
        initialValues={selectedDeal}
        companyId={companyId}
        sellers={sellers}
      />
    </div>
  );
};

export default DealsPage;