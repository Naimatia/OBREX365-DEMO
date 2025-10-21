// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  Card, Typography, Table, Input, Button, Row, Col, Tag, Drawer, Space, 
  Statistic, Tooltip, Modal, Spin, Badge, Divider, message, Popconfirm,
  Select
} from 'antd';
import { db, collection, query, where, getDocs, doc } from 'configs/FirebaseConfig';
import { 
  PlusOutlined, SearchOutlined, FilterOutlined, BarChartOutlined, 
  EditOutlined, DeleteOutlined, EyeOutlined, DollarOutlined, 
  CheckCircleOutlined, CloseCircleOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import dealService from 'services/firebase/DealService';
import contactService from 'services/firebase/ContactService';
import userService from 'services/firebase/UserService';
import propertyService from 'services/firebase/PropertyService';
import { DealStatus, DealSource } from 'models/DealModel';
import moment from 'moment';
import DealDetails from './DealDetails';
import DealStatsDrawer from './DealStatsDrawer';
import DealForm from './DealForm';
import './deals.css';

const { Title, Text } = Typography;
const { Option } = Select;

const DealsPage = () => {
  // Redux state
  const user = useSelector(state => state.auth.user);
  const companyId = user?.company_id || ''; // Extract company_id directly from the user object
  console.log('User object:', user);
  console.log('Company ID from user:', companyId);
  
  // Component state
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
    count: { total: 0, opened: 0, gain: 0, loss: 0 },
    value: { total: 0, opened: 0, gain: 0, loss: 0 }
  });
  
  // UI state
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [statsDrawerVisible, setStatsDrawerVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [sellers, setSellers] = useState([]);
  
  // Fetch deals and related data
  useEffect(() => {
    if (companyId) {
      fetchDeals();
      fetchSellers();
    }
  }, [companyId]);
  
  // Fetch deals with filters
  const fetchDeals = async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      // Get all deals and manually filter to handle Firestore reference objects
      const dealsCollection = collection(db, 'deals');
      const allDealsSnap = await getDocs(dealsCollection);
      console.log(`Found ${allDealsSnap.docs.length} total deals in database`);
      
      // Create possible company ID formats for matching
      const companyRef = doc(db, 'companies', companyId);
      const companyPath = `companies/${companyId}`;
      const companyRefPath = `/companies/${companyId}`;
      
      console.log('Looking for company paths:', [companyId, companyPath, companyRefPath]);
      
      // Process all deals and filter by company_id
      const allDeals = allDealsSnap.docs.map(docSnap => {
        const data = docSnap.data();
        return { id: docSnap.id, ...data };
      });
      
      const companyDeals = allDeals.filter(deal => {
        const dealCompanyId = deal.company_id;
        if (!dealCompanyId) return false;
        
        // If it's a Firebase reference object
        if (typeof dealCompanyId === 'object' && dealCompanyId.path) {
          return dealCompanyId.path.includes(companyId);
        }
        
        // If it's a string path
        if (typeof dealCompanyId === 'string') {
          return dealCompanyId === companyId || 
                 dealCompanyId === companyPath || 
                 dealCompanyId === companyRefPath;
        }
        
        return false;
      });
      
      console.log(`Filtered ${companyDeals.length} deals for company_id: ${companyId}`);
      
      // Apply additional filters
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
      
      // Filter by search text if provided
      if (searchText) {
        filteredDeals = filteredDeals.filter(deal => 
          deal.Description?.toLowerCase().includes(searchText.toLowerCase())
        );
      }
      
      // Debug information
      if (companyDeals.length === 0 && allDeals.length > 0) {
        const sampleDeal = allDeals[0];
        console.log('Sample deal fields:', Object.keys(sampleDeal));
        console.log('Sample company_id:', sampleDeal.company_id);
        if (typeof sampleDeal.company_id === 'object') {
          console.log('Reference path:', sampleDeal.company_id.path);
          console.log('Reference ID:', sampleDeal.company_id.id);
        }
      }
      
      setDeals(filteredDeals);
      
      // Calculate stats
      const statsCounts = {
        total: filteredDeals.length,
        opened: filteredDeals.filter(deal => deal.Status === DealStatus.OPENED).length,
        gain: filteredDeals.filter(deal => deal.Status === DealStatus.GAIN).length,
        loss: filteredDeals.filter(deal => deal.Status === DealStatus.LOSS).length
      };
      
      const statsValues = {
        total: filteredDeals.reduce((sum, deal) => sum + (Number(deal.Amount) || 0), 0),
        opened: filteredDeals.filter(deal => deal.Status === DealStatus.OPENED)
                          .reduce((sum, deal) => sum + (Number(deal.Amount) || 0), 0),
        gain: filteredDeals.filter(deal => deal.Status === DealStatus.GAIN)
                        .reduce((sum, deal) => sum + (Number(deal.Amount) || 0), 0),
        loss: filteredDeals.filter(deal => deal.Status === DealStatus.LOSS)
                        .reduce((sum, deal) => sum + (Number(deal.Amount) || 0), 0)
      };
      
      setStats({
        count: statsCounts,
        value: statsValues
      });
    } catch (error) {
      console.error('Error fetching deals:', error);
      message.error('Failed to fetch deals. Please try again.');
      // Even on error, we should stop loading
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchSellers = async () => {
    if (!companyId) return;
    
    try {
      const sellersData = await userService.getUsersByCompany(companyId);
      setSellers(sellersData);
    } catch (error) {
      console.error('Error fetching sellers:', error);
    }
  };
  
  const handleSearch = (value) => {
    setSearchText(value);
    // Debounce fetch to avoid too many requests
    setTimeout(() => {
      fetchDeals();
    }, 500);
  };
  
  const handleFilterChange = (type, value) => {
    setFilters(prev => ({
      ...prev,
      [type]: value
    }));
    fetchDeals();
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
      message.success('Deal deleted successfully');
      fetchDeals();
    } catch (error) {
      console.error('Error deleting deal:', error);
      message.error('Failed to delete deal');
    }
  };
  
  const handleFormSubmit = async (formData) => {
    try {
      // Clean any remaining undefined values to prevent Firestore errors
      const cleanData = { ...formData };
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined) {
          delete cleanData[key]; // Remove any undefined values
        }
      });
      
      console.log('Final form data before submission:', cleanData);
      
      if (isEditing && selectedDeal) {
        await dealService.update(selectedDeal.id, cleanData);
        message.success('Deal updated successfully');
      } else {
        await dealService.create({
          ...cleanData,
          company_id: companyId,
          CreationDate: new Date(),
          LastUpdateDate: new Date(),
        });
        message.success('Deal created successfully');
      }
      setFormVisible(false);
      fetchDeals();
    } catch (error) {
      console.error('Error saving deal:', error);
      message.error('Failed to save deal');
    }
  };

  const handleStatusChange = async (dealId, status) => {
    try {
      await dealService.updateStatus(dealId, status);
      message.success(`Deal marked as ${status}`);
      fetchDeals();
    } catch (error) {
      console.error('Error updating deal status:', error);
      message.error('Failed to update deal status');
    }
  };
  
  // Render status tag with appropriate color
  const renderStatus = (status) => {
    switch(status) {
      case DealStatus.OPENED:
        return <Tag color="blue">Open</Tag>;
      case DealStatus.GAIN:
        return <Tag color="green">Won</Tag>;
      case DealStatus.LOSS:
        return <Tag color="red">Lost</Tag>;
      default:
        return <Tag>Unknown</Tag>;
    }
  };

  // Render source with appropriate icon
  const renderSource = (source) => {
    switch(source) {
      case DealSource.LEADS:
        return <Tag color="purple">Leads</Tag>;
      case DealSource.CONTACTS:
        return <Tag color="cyan">Contacts</Tag>;
      case DealSource.FREELANCE:
        return <Tag color="orange">Freelance</Tag>;
      default:
        return <Tag>Other</Tag>;
    }
  };
  
  // Table columns configuration
  const columns = [
    {
      title: 'Amount',
      dataIndex: 'Amount',
      key: 'amount',
      sorter: (a, b) => a.Amount - b.Amount,
      render: (amount) => (
        <Text strong style={{ color: '#1890ff' }}>
          AED {amount ? amount.toLocaleString() : '0'}
        </Text>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'Description',
      key: 'description',
      render: (text) => <Text ellipsis={{ tooltip: text }}>{text || 'No description'}</Text>,
    },
    {
      title: 'Source',
      dataIndex: 'Source',
      key: 'source',
      render: (source) => renderSource(source),
      filters: Object.values(DealSource).map(source => ({
        text: source,
        value: source,
      })),
      onFilter: (value, record) => record.Source === value,
    },
    {
      title: 'Status',
      dataIndex: 'Status',
      key: 'status',
      render: (status) => renderStatus(status),
      filters: Object.values(DealStatus).map(status => ({
        text: status,
        value: status,
      })),
      onFilter: (value, record) => record.Status === value,
    },
    {
      title: 'Created',
      dataIndex: 'CreationDate',
      key: 'created',
      render: (date) => date ? moment(date.toDate()).format('MMM DD, YYYY') : 'N/A',
      sorter: (a, b) => {
        if (!a.CreationDate || !b.CreationDate) return 0;
        return a.CreationDate.toDate() - b.CreationDate.toDate();
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button 
              icon={<EyeOutlined />} 
              size="small" 
              onClick={() => handleViewDetails(record)} 
            />
          </Tooltip>
          <Tooltip title="Edit Deal">
            <Button 
              icon={<EditOutlined />} 
              size="small" 
              onClick={() => handleEditDeal(record)} 
            />
          </Tooltip>
          <Popconfirm
            title="Are you sure you want to delete this deal?"
            onConfirm={() => handleDeleteDeal(record.id)}
            okText="Yes"
            cancelText="No"
            placement="left"
          >
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];
  
  // Row class name based on status
  const getRowClassName = (record) => {
    switch(record.Status) {
      case DealStatus.OPENED:
        return 'deal-row-open';
      case DealStatus.GAIN:
        return 'deal-row-won';
      case DealStatus.LOSS:
        return 'deal-row-lost';
      default:
        return '';
    }
  };

  return (
    <div className="deals-page">
      {/* Header with Stats Summary */}
      <Card className="stats-summary-card" bordered={false}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={24} md={16} lg={18}>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic 
                  title="Total Deals" 
                  value={stats.count.total} 
                  prefix={<InfoCircleOutlined />} 
                />
              </Col>
              <Col span={6}>
                <Statistic 
                  title="Open Deals" 
                  value={stats.count.opened} 
                  valueStyle={{ color: '#1890ff' }}
                  prefix={<InfoCircleOutlined />} 
                />
              </Col>
              <Col span={6}>
                <Statistic 
                  title="Won Deals" 
                  value={stats.count.gain} 
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<CheckCircleOutlined />} 
                />
              </Col>
              <Col span={6}>
                <Statistic 
                  title="Lost Deals" 
                  value={stats.count.loss} 
                  valueStyle={{ color: '#f5222d' }}
                  prefix={<CloseCircleOutlined />} 
                />
              </Col>
            </Row>
            <Row style={{ marginTop: 16 }}>
              <Col span={12}>
                <Statistic 
                  title="Total Value" 
                  value={stats.value.total} 
                  precision={2}
                  prefix={<DollarOutlined />} 
                  formatter={(value) => `AED ${value.toLocaleString()}`}
                />
              </Col>
              <Col span={12}>
                <Button 
                  type="default" 
                  icon={<BarChartOutlined />} 
                  onClick={() => setStatsDrawerVisible(true)}
                >
                  View Detailed Statistics
                </Button>
              </Col>
            </Row>
          </Col>
          <Col xs={24} sm={24} md={8} lg={6} style={{ textAlign: 'right' }}>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleCreateDeal}
              style={{ marginBottom: 16 }}
              block
            >
              Create New Deal
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Filters and Search */}
      <Card className="filters-card" bordered={false} style={{ marginTop: 16 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={8} lg={6}>
            <Input 
              placeholder="Search by description"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={5} lg={4}>
            <Select
              placeholder="Filter by status"
              style={{ width: '100%' }}
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              allowClear
            >
              {Object.values(DealStatus).map((status) => (
                <Option key={status} value={status}>{status}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={5} lg={4}>
            <Select
              placeholder="Filter by source"
              style={{ width: '100%' }}
              value={filters.source}
              onChange={(value) => handleFilterChange('source', value)}
              allowClear
            >
              {Object.values(DealSource).map((source) => (
                <Option key={source} value={source}>{source}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6} lg={6}>
            <Select
              placeholder="Filter by seller"
              style={{ width: '100%' }}
              value={filters.sellerId}
              onChange={(value) => handleFilterChange('sellerId', value)}
              allowClear
            >
              {sellers.map((seller) => (
                <Option key={seller.id} value={seller.id}>
                  {seller.firstname} {seller.lastname}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={24} md={24} lg={4} style={{ textAlign: 'right' }}>
            <Button 
              onClick={() => {
                setFilters({ status: null, source: null, sellerId: null });
                setSearchText('');
                fetchDeals();
              }}
            >
              Reset Filters
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Deals Table */}
      <Card className="deals-table-card" bordered={false} style={{ marginTop: 16 }}>
        <Table 
          columns={columns} 
          dataSource={deals} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
          rowClassName={getRowClassName}
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
      />
    </div>
  );
};

export default DealsPage;