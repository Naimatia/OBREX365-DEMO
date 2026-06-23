// components/SellerAnalyticsDashboard.jsx - Show all sellers
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Select,
  Spin,
  Empty,
  Button,
  Typography,
  Row,
  Col,
  Statistic,
  Input,
  DatePicker,
  Tooltip,
  Badge,
  Alert,
  Avatar,
} from 'antd';
import {
  HistoryOutlined,
  ReloadOutlined,
  EyeOutlined,
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SearchOutlined,
  FilterOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  TrophyOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import SellerActivityService, { ActivityTypes } from 'services/firebase/SellerActivityService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Search } = Input;

const SellerAnalyticsDashboard = ({ companyId: propCompanyId }) => {
  const user = useSelector(state => state.auth.user);
  const companyId = propCompanyId || user?.company_id;

  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState(null);
  
  // Filter states
  const [searchText, setSearchText] = useState('');
  const [filterEntityType, setFilterEntityType] = useState('all');
  const [filterActivityType, setFilterActivityType] = useState('all');
  const [filterSeller, setFilterSeller] = useState('all');
  const [dateRange, setDateRange] = useState(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!companyId) {
      console.log('No companyId available');
      setLoading(false);
      return;
    }
    
    console.log('Fetching all activities for company:', companyId);
    setLoading(true);
    setError(null);
    
    try {
      const [activitiesData, statsData, leaderboardData] = await Promise.all([
        SellerActivityService.getAllActivitiesWithSellers(companyId, { limit: 500 }),
        SellerActivityService.getAllActivityStats(companyId),
        SellerActivityService.getSellerLeaderboard(companyId, 'month'),
      ]);

      console.log('Activities fetched:', activitiesData?.length || 0);
      console.log('Stats fetched:', statsData);
      console.log('Leaderboard fetched:', leaderboardData?.length || 0);
      
      setActivities(activitiesData || []);
      setFilteredActivities(activitiesData || []);
      setStats(statsData);
      setLeaderboard(leaderboardData || []);
      
      if (!activitiesData || activitiesData.length === 0) {
        setError('No activities found. Start performing actions to see them here.');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load activities. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Apply filters
  useEffect(() => {
    let filtered = [...activities];

    // Search filter
    if (searchText) {
      const term = searchText.toLowerCase();
      filtered = filtered.filter(a => 
        a.entityName?.toLowerCase().includes(term) ||
        a.activityType?.toLowerCase().includes(term) ||
        a.entityType?.toLowerCase().includes(term) ||
        a.details?.name?.toLowerCase().includes(term) ||
        a.seller?.name?.toLowerCase().includes(term)
      );
    }

    // Entity type filter
    if (filterEntityType !== 'all') {
      filtered = filtered.filter(a => a.entityType === filterEntityType);
    }

    // Activity type filter
    if (filterActivityType !== 'all') {
      filtered = filtered.filter(a => a.activityType === filterActivityType);
    }

    // Seller filter
    if (filterSeller !== 'all') {
      filtered = filtered.filter(a => a.sellerId === filterSeller);
    }

    // Date range filter
    if (dateRange && dateRange.length === 2) {
      const [start, end] = dateRange;
      filtered = filtered.filter(a => {
        const date = a.timestamp?.toDate?.() || new Date(a.timestamp);
        return dayjs(date).isBetween(start, end, 'day', '[]');
      });
    }

    setFilteredActivities(filtered);
  }, [activities, searchText, filterEntityType, filterActivityType, filterSeller, dateRange]);

  // Helper functions
  const getActivityIcon = (type) => {
    const icons = {
      [ActivityTypes.LEAD_VIEWED]: <EyeOutlined />,
      [ActivityTypes.LEAD_CREATED]: <UserOutlined />,
      [ActivityTypes.LEAD_STATUS_CHANGED]: <ArrowUpOutlined />,
      [ActivityTypes.LEAD_CONVERTED]: <CheckCircleOutlined />,
      [ActivityTypes.LEAD_REVEALED]: <EyeOutlined />,
      [ActivityTypes.CONTACT_CREATED]: <UserOutlined />,
      [ActivityTypes.CONTACT_STATUS_CHANGED]: <ArrowUpOutlined />,
      [ActivityTypes.CONTACT_CONVERTED_TO_DEAL]: <DollarOutlined />,
      [ActivityTypes.DEAL_CREATED]: <DollarOutlined />,
      [ActivityTypes.DEAL_STATUS_CHANGED]: <ArrowUpOutlined />,
      [ActivityTypes.DEAL_WON]: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      [ActivityTypes.DEAL_LOST]: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
      [ActivityTypes.CONTACT_NOTE_ADDED]: <FileTextOutlined />,
      [ActivityTypes.DEAL_NOTE_ADDED]: <FileTextOutlined />,
      [ActivityTypes.LEAD_NOTE_ADDED]: <FileTextOutlined />,
    };
    return icons[type] || <ClockCircleOutlined />;
  };

  const getActivityColor = (type) => {
    const colors = {
      [ActivityTypes.LEAD_VIEWED]: 'blue',
      [ActivityTypes.LEAD_CREATED]: 'green',
      [ActivityTypes.LEAD_STATUS_CHANGED]: 'orange',
      [ActivityTypes.LEAD_CONVERTED]: 'purple',
      [ActivityTypes.LEAD_REVEALED]: 'cyan',
      [ActivityTypes.CONTACT_CREATED]: 'green',
      [ActivityTypes.CONTACT_STATUS_CHANGED]: 'orange',
      [ActivityTypes.CONTACT_CONVERTED_TO_DEAL]: 'gold',
      [ActivityTypes.DEAL_CREATED]: 'gold',
      [ActivityTypes.DEAL_STATUS_CHANGED]: 'orange',
      [ActivityTypes.DEAL_WON]: 'green',
      [ActivityTypes.DEAL_LOST]: 'red',
      [ActivityTypes.CONTACT_NOTE_ADDED]: 'purple',
      [ActivityTypes.DEAL_NOTE_ADDED]: 'purple',
      [ActivityTypes.LEAD_NOTE_ADDED]: 'purple',
    };
    return colors[type] || 'default';
  };

  const getActivityLabel = (type) => {
    const labels = {
      [ActivityTypes.LEAD_VIEWED]: 'Viewed Lead',
      [ActivityTypes.LEAD_CREATED]: 'Created Lead',
      [ActivityTypes.LEAD_STATUS_CHANGED]: 'Lead Status Changed',
      [ActivityTypes.LEAD_CONVERTED]: 'Lead Converted',
      [ActivityTypes.LEAD_REVEALED]: 'Revealed Lead',
      [ActivityTypes.CONTACT_CREATED]: 'Created Contact',
      [ActivityTypes.CONTACT_STATUS_CHANGED]: 'Contact Status Changed',
      [ActivityTypes.CONTACT_CONVERTED_TO_DEAL]: 'Contact → Deal',
      [ActivityTypes.DEAL_CREATED]: 'Created Deal',
      [ActivityTypes.DEAL_STATUS_CHANGED]: 'Deal Status Changed',
      [ActivityTypes.DEAL_WON]: 'Deal Won',
      [ActivityTypes.DEAL_LOST]: 'Deal Lost',
      [ActivityTypes.CONTACT_NOTE_ADDED]: 'Note Added',
      [ActivityTypes.DEAL_NOTE_ADDED]: 'Note Added',
      [ActivityTypes.LEAD_NOTE_ADDED]: 'Note Added',
    };
    return labels[type] || type;
  };

  const getEntityLabel = (type) => {
    const labels = {
      lead: 'Lead',
      contact: 'Contact',
      deal: 'Deal',
    };
    return labels[type] || type;
  };

  const getEntityColor = (type) => {
    const colors = {
      lead: 'blue',
      contact: 'green',
      deal: 'gold',
    };
    return colors[type] || 'default';
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '—';
    const date = timestamp?.toDate?.() || new Date(timestamp);
    if (isNaN(date.getTime())) return '—';
    return dayjs(date).format('DD MMM YYYY HH:mm');
  };

  // Get unique sellers for filter
  const sellerOptions = [...new Set(activities.map(a => a.sellerId).filter(Boolean))];
  
  // Get unique types for filters
  const activityTypes = [...new Set(activities.map(a => a.activityType).filter(Boolean))];
  const entityTypes = [...new Set(activities.map(a => a.entityType).filter(Boolean))];

  const clearFilters = () => {
    setSearchText('');
    setFilterEntityType('all');
    setFilterActivityType('all');
    setFilterSeller('all');
    setDateRange(null);
  };

  // Table columns
  const columns = [
    {
      title: 'Seller',
      key: 'seller',
      width: 180,
      render: (_, record) => (
        <Space>
          <Avatar 
            icon={<UserOutlined />} 
            size="small"
            style={{ backgroundColor: '#1890ff' }}
          />
          <Text strong>{record.seller?.name || `Seller ${record.sellerId?.slice(-6) || 'Unknown'}`}</Text>
        </Space>
      ),
    },
    {
      title: 'Activity',
      key: 'activity',
      width: 200,
      render: (_, record) => (
        <Space>
          <Tag color={getActivityColor(record.activityType)}>
            {getActivityIcon(record.activityType)}
          </Tag>
          <span>{getActivityLabel(record.activityType)}</span>
        </Space>
      ),
    },
    {
      title: 'Entity',
      key: 'entity',
      width: 150,
      render: (_, record) => (
        <Space>
          <Tag color={getEntityColor(record.entityType)}>
            {getEntityLabel(record.entityType)}
          </Tag>
          <Text strong>{record.entityName || record.entityId}</Text>
        </Space>
      ),
    },
    {
      title: 'Details',
      key: 'details',
      render: (_, record) => {
        const details = [];
        
        if (record.metadata?.oldStatus && record.metadata?.newStatus) {
          details.push(
            <Space key="status" size={4}>
              <Tag color="default">{record.metadata.oldStatus}</Tag>
              <ArrowRightOutlined style={{ fontSize: 10 }} />
              <Tag color={getActivityColor(record.activityType)}>
                {record.metadata.newStatus}
              </Tag>
            </Space>
          );
        }
        
        if (record.metadata?.amount > 0) {
          details.push(
            <Tag key="amount" color="green">
              AED {record.metadata.amount.toLocaleString()}
            </Tag>
          );
        }
        
        if (record.details?.note) {
          details.push(
            <Tooltip key="note" title={record.details.note}>
              <Tag color="purple">
                <FileTextOutlined /> {record.details.note.substring(0, 30)}
                {record.details.note.length > 30 && '...'}
              </Tag>
            </Tooltip>
          );
        }
        
        return <Space size={4}>{details}</Space>;
      },
    },
    {
      title: 'Time',
      key: 'time',
      width: 180,
      render: (_, record) => (
        <Tooltip title={formatDate(record.timestamp)}>
          <Space>
            <ClockCircleOutlined style={{ color: '#8c8c8c' }} />
            <Text>{formatDate(record.timestamp)}</Text>
          </Space>
        </Tooltip>
      ),
      sorter: (a, b) => {
        const dateA = a.timestamp?.toDate?.() || new Date(a.timestamp);
        const dateB = b.timestamp?.toDate?.() || new Date(b.timestamp);
        return dateB - dateA;
      },
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>Loading activities...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 24px' }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Space>
            <TeamOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            <Title level={3} style={{ margin: 0 }}>Team Activity Log</Title>
            <Badge count={activities.length} showZero color="blue" />
          </Space>
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            Refresh
          </Button>
        </Col>
      </Row>

      {/* Error/Warning Alert */}
      {error && (
        <Alert
          message={error}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" type="primary" onClick={fetchData}>
              Refresh
            </Button>
          }
        />
      )}

      {/* Quick Stats */}
      {stats && stats.total > 0 && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Total Activities"
                value={stats.total}
                prefix={<HistoryOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Leads → Contacts"
                value={stats.conversions?.leadsToContacts || 0}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Contacts → Deals"
                value={stats.conversions?.contactsToDeals || 0}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Total Won Amount"
                value={stats.wonAmount || 0}
                prefix={<TrophyOutlined />}
                valueStyle={{ color: '#52c41a' }}
                formatter={(value) => `AED ${value.toLocaleString()}`}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={5}>
            <Search
              placeholder="Search by name or type..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col xs={12} md={4}>
            <Select
              placeholder="Seller"
              value={filterSeller}
              onChange={setFilterSeller}
              allowClear
              style={{ width: '100%' }}
            >
              <Option value="all">All Sellers</Option>
              {sellerOptions.map(sellerId => {
                const activity = activities.find(a => a.sellerId === sellerId);
                return (
                  <Option key={sellerId} value={sellerId}>
                    {activity?.seller?.name || `Seller ${sellerId.slice(-6)}`}
                  </Option>
                );
              })}
            </Select>
          </Col>
          <Col xs={12} md={4}>
            <Select
              placeholder="Entity Type"
              value={filterEntityType}
              onChange={setFilterEntityType}
              allowClear
              style={{ width: '100%' }}
            >
              <Option value="all">All Entities</Option>
              {entityTypes.map(type => (
                <Option key={type} value={type}>
                  {getEntityLabel(type)}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} md={5}>
            <Select
              placeholder="Activity Type"
              value={filterActivityType}
              onChange={setFilterActivityType}
              allowClear
              style={{ width: '100%' }}
              showSearch
            >
              <Option value="all">All Activities</Option>
              {activityTypes.map(type => (
                <Option key={type} value={type}>
                  <Tag color={getActivityColor(type)}>
                    {getActivityLabel(type)}
                  </Tag>
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} md={6}>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder={['Start Date', 'End Date']}
              style={{ width: '100%' }}
            />
          </Col>
        </Row>
        <Row style={{ marginTop: 12 }}>
          <Col span={24}>
            <Button 
              onClick={clearFilters} 
              icon={<FilterOutlined />}
              size="small"
            >
              Clear All Filters
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Activity Table */}
      <Card>
        {filteredActivities.length === 0 ? (
          <Empty 
            description={
              <span>
                No activities found
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {error || 'Try adjusting your filters or refresh the page'}
                </Text>
              </span>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={filteredActivities}
            rowKey="id"
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total) => `${total} activities`,
            }}
            scroll={{ x: 1000 }}
            size="middle"
          />
        )}
      </Card>
    </div>
  );
};

export default SellerAnalyticsDashboard;