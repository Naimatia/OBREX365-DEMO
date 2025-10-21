// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Input,
  Select,
  DatePicker,
  Tag,
  Dropdown,
  message,
  Modal,
  Card,
  Row,
  Col,
  Statistic,
  Empty,
  Tooltip,
  Image,
  Avatar
} from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  SearchOutlined,
  FilterOutlined,
  DollarOutlined,
  CalendarOutlined,
  HomeOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  UserOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import moment from 'moment';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { confirm } = Modal;

// Property types for filtering
const PropertyTypes = [
  'Studio', 'Apartment', 'Villa', 'Penthouse', 
  'Townhouse', 'Office', 'Warehouse', 'Land'
];

const PropertyCategories = ['Buy', 'Rent', 'OffPlan'];
const PropertyStatuses = ['Pending', 'Sold'];

/**
 * Table component to list and manage properties
 */
const SellerPropertyList = ({
  properties,
  loading,
  onView,
  onEdit,
  onDelete,
  onRefresh,
  currentUserId // For checking edit permissions
}) => {
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [filteredStatus, setFilteredStatus] = useState('');
  const [filteredType, setFilteredType] = useState('');
  const [filteredCategory, setFilteredCategory] = useState('');
  const [dateRange, setDateRange] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // Update filtered properties when properties or filters change
  useEffect(() => {
    let filtered = [...properties];

    // Search filter
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(property =>
        property.title?.toLowerCase().includes(searchLower) ||
        property.Location?.toLowerCase().includes(searchLower) ||
        property.address?.toLowerCase().includes(searchLower) ||
        property.Type?.toLowerCase().includes(searchLower) ||
        property.SellPrice?.toString().includes(searchText)
      );
    }

    // Status filter
    if (filteredStatus) {
      filtered = filtered.filter(property => property.Status === filteredStatus);
    }

    // Type filter
    if (filteredType) {
      filtered = filtered.filter(property => property.Type === filteredType);
    }

    // Category filter
    if (filteredCategory) {
      filtered = filtered.filter(property => property.Category === filteredCategory);
    }

    // Date range filter
    if (dateRange && dateRange.length === 2) {
      const [startDate, endDate] = dateRange;
      filtered = filtered.filter(property => {
        const propertyDate = moment(property.CreationDate);
        return propertyDate.isBetween(startDate, endDate, 'day', '[]');
      });
    }

    setFilteredProperties(filtered);
  }, [properties, searchText, filteredStatus, filteredType, filteredCategory, dateRange]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Check if user can edit property
  const canEditProperty = (property) => {
    return property.creator_id === currentUserId;
  };

  // Handle delete confirmation
  const handleDelete = (propertyId) => {
    const property = properties.find(p => p.id === propertyId);
    
    if (!canEditProperty(property)) {
      message.warning('You can only delete properties you created');
      return;
    }
    
    confirm({
      title: 'Delete Property',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete "${property.title}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => onDelete(propertyId)
    });
  };

  // Handle edit click
  const handleEdit = (property) => {
    if (!canEditProperty(property)) {
      message.warning('You can only edit properties you created');
      return;
    }
    onEdit(property);
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return 'blue';
      case 'Sold':
        return 'green';
      default:
        return 'default';
    }
  };

  // Get category color
  const getCategoryColor = (category) => {
    switch (category) {
      case 'Buy':
        return 'green';
      case 'Rent':
        return 'orange';
      case 'OffPlan':
        return 'purple';
      default:
        return 'blue';
    }
  };

  // Table columns
  const columns = [
    {
      title: 'Property',
      key: 'property',
      width: 300,
      render: (_, record) => (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          padding: '8px 12px',
          backgroundColor: '#fafafa',
          borderRadius: '8px',
          margin: '4px 0'
        }}>
          {record.Images && record.Images.length > 0 ? (
            <div style={{
              width: '80px',
              height: '60px',
              marginRight: '16px',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <Image
                width={80}
                height={60}
                src={record.Images[0]}
                style={{ objectFit: 'cover' }}
                preview={{
                  src: record.Images[0],
                  mask: <div style={{ color: 'white' }}>Preview</div>
                }}
              />
            </div>
          ) : (
            <div style={{ 
              width: '80px', 
              height: '60px', 
              backgroundColor: '#f0f0f0', 
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '16px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <HomeOutlined style={{ color: '#bfbfbf', fontSize: '24px' }} />
            </div>
          )}
          
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ 
              fontWeight: '600', 
              fontSize: '15px',
              marginBottom: '6px',
              color: '#262626',
              lineHeight: '1.3'
            }}>
              <Tooltip title={record.title}>
                {record.title?.length > 30 ? `${record.title.substring(0, 30)}...` : record.title}
              </Tooltip>
            </div>
            <div style={{ 
              fontSize: '13px', 
              color: '#8c8c8c',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <EnvironmentOutlined style={{ marginRight: '4px' }} /> 
              {record.Location}
            </div>
            <Space size={[6, 6]} wrap>
              <Tag 
                color={getCategoryColor(record.Category)} 
                style={{
                  borderRadius: '12px',
                  padding: '2px 10px',
                  fontSize: '11px',
                  fontWeight: '500'
                }}
              >
                {record.Category}
              </Tag>
              <Tag 
                color="geekblue" 
                style={{
                  borderRadius: '12px',
                  padding: '2px 10px',
                  fontSize: '11px',
                  fontWeight: '500'
                }}
              >
                {record.Type}
              </Tag>
            </Space>
          </div>
        </div>
      )
    },
    {
      title: 'Price',
      dataIndex: 'SellPrice',
      key: 'price',
      width: 120,
      sorter: (a, b) => (a.SellPrice || 0) - (b.SellPrice || 0),
      render: (price) => (
        <div style={{ 
          textAlign: 'center',
          padding: '8px',
          backgroundColor: '#f6ffed',
          borderRadius: '6px',
          border: '1px solid #b7eb8f'
        }}>
          <div style={{ 
            fontWeight: '700', 
            fontSize: '16px',
            color: '#52c41a',
            lineHeight: '1.2'
          }}>
            {formatCurrency(price)}
          </div>
          <div style={{
            fontSize: '11px',
            color: '#8c8c8c',
            marginTop: '2px'
          }}>
            AED
          </div>
        </div>
      )
    },
    {
      title: 'Details',
      key: 'details',
      width: 100,
      render: (_, record) => (
        <div style={{
          padding: '8px',
          backgroundColor: '#fafafa',
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          <Space direction="vertical" size={4}>
            <div style={{ 
              fontSize: '13px',
              fontWeight: '500',
              color: '#1890ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              🛏️ <span style={{ marginLeft: '4px' }}>{record.NbrBedRooms} bed</span>
            </div>
            <div style={{ 
              fontSize: '13px',
              fontWeight: '500',
              color: '#722ed1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              🚿 <span style={{ marginLeft: '4px' }}>{record.NbrBathRooms} bath</span>
            </div>
          </Space>
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'Status',
      key: 'status',
      width: 100,
      filters: PropertyStatuses.map(status => ({ text: status, value: status })),
      render: (status) => (
        <div style={{ textAlign: 'center' }}>
          <Tag 
            color={getStatusColor(status)}
            style={{
              borderRadius: '16px',
              padding: '4px 12px',
              fontSize: '12px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            {status}
          </Tag>
        </div>
      )
    },
    {
      title: 'Created',
      dataIndex: 'CreationDate',
      key: 'created',
      width: 100,
      sorter: (a, b) => moment(a.CreationDate) - moment(b.CreationDate),
      render: (date) => (
        <div style={{ fontSize: '12px' }}>
          <CalendarOutlined style={{ color: '#8c8c8c', marginRight: '4px' }} />
          {moment(date).format('DD MMM')}
          <br />
          <span style={{ color: '#8c8c8c' }}>
            {moment(date).format('YYYY')}
          </span>
        </div>
      )
    },
    {
      title: 'Creator',
      key: 'creator',
      width: 80,
      render: (_, record) => (
        <div style={{ 
          textAlign: 'center',
          padding: '8px'
        }}>
          {record.creator_id === currentUserId ? (
            <div>
              <Avatar 
                size="large"
                style={{ 
                  backgroundColor: '#52c41a',
                  boxShadow: '0 2px 8px rgba(82, 196, 26, 0.3)'
                }} 
                icon={<UserOutlined />} 
              />
              <div style={{ 
                fontSize: '11px', 
                marginTop: '6px',
                color: '#52c41a',
                fontWeight: '600'
              }}>
                YOU
              </div>
            </div>
          ) : (
            <div>
              <Avatar 
                size="large"
                style={{ 
                  backgroundColor: '#bfbfbf',
                  color: '#ffffff'
                }} 
                icon={<UserOutlined />} 
              />
              <div style={{ 
                fontSize: '11px', 
                marginTop: '6px',
                color: '#8c8c8c',
                fontWeight: '500'
              }}>
                OTHER
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => {
        const canEdit = canEditProperty(record);
        
        return (
          <Dropdown
            menu={{
              items: [
                {
                  key: 'view',
                  label: 'View Details',
                  icon: <EyeOutlined />,
                  onClick: () => onView(record)
                },
                ...(canEdit ? [
                  {
                    key: 'edit',
                    label: 'Edit',
                    icon: <EditOutlined />,
                    onClick: () => handleEdit(record)
                  },
                  {
                    type: 'divider'
                  },
                  {
                    key: 'delete',
                    label: 'Delete',
                    icon: <DeleteOutlined />,
                    danger: true,
                    onClick: () => handleDelete(record.id)
                  }
                ] : [])
              ]
            }}
            trigger={['click']}
          >
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        );
      }
    }
  ];

  // Calculate statistics
  const totalValue = filteredProperties.reduce((sum, property) => sum + (property.SellPrice || 0), 0);
  const pendingCount = filteredProperties.filter(property => property.Status === 'Pending').length;
  const soldCount = filteredProperties.filter(property => property.Status === 'Sold').length;
  const myPropertiesCount = filteredProperties.filter(property => property.creator_id === currentUserId).length;

  // Row selection
  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
  };

  if (properties.length === 0 && !loading) {
    return (
      <Card>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span>
              No properties found. <br />
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={onRefresh}
                style={{ marginTop: 16 }}
              >
                Add Your First Property
              </Button>
            </span>
          }
        />
      </Card>
    );
  }

  return (
    <div>
      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Total Properties"
              value={filteredProperties.length}
              prefix={<HomeOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Total Value"
              value={formatCurrency(totalValue)}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Available"
              value={pendingCount}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Your Properties"
              value={myPropertiesCount}
              valueStyle={{ color: '#faad14' }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Search
              placeholder="Search properties..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              prefix={<SearchOutlined />}
            />
          </Col>
          
          <Col xs={24} sm={4}>
            <Select
              placeholder="Filter by status"
              value={filteredStatus}
              onChange={setFilteredStatus}
              allowClear
              style={{ width: '100%' }}
            >
              {PropertyStatuses.map(status => (
                <Option key={status} value={status}>{status}</Option>
              ))}
            </Select>
          </Col>
          
          <Col xs={24} sm={4}>
            <Select
              placeholder="Filter by type"
              value={filteredType}
              onChange={setFilteredType}
              allowClear
              style={{ width: '100%' }}
            >
              {PropertyTypes.map(type => (
                <Option key={type} value={type}>{type}</Option>
              ))}
            </Select>
          </Col>
          
          <Col xs={24} sm={4}>
            <Select
              placeholder="Filter by category"
              value={filteredCategory}
              onChange={setFilteredCategory}
              allowClear
              style={{ width: '100%' }}
            >
              {PropertyCategories.map(category => (
                <Option key={category} value={category}>{category}</Option>
              ))}
            </Select>
          </Col>
          
          <Col xs={24} sm={4}>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder={['Start', 'End']}
              style={{ width: '100%' }}
              size="middle"
            />
          </Col>
        </Row>
      </Card>

      {/* Properties Table */}
      <Card 
        style={{
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}
        bodyStyle={{ padding: 0 }}
      >
        <Table
          columns={columns}
          dataSource={filteredProperties}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
          scroll={{ x: 1200 }}
          size="large"
          showHeader={true}
          rowClassName={(record, index) => {
            return index % 2 === 0 ? 'table-row-light' : 'table-row-dark';
          }}
          style={{
            '.ant-table-thead > tr > th': {
              backgroundColor: '#fafafa',
              fontWeight: '600',
              fontSize: '14px',
              borderBottom: '2px solid #f0f0f0'
            }
          }}
          pagination={{
            total: filteredProperties.length,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `Showing ${range[0]}-${range[1]} of ${total} properties`,
            pageSizeOptions: ['10', '20', '50', '100'],
            style: {
              padding: '16px 24px',
              borderTop: '1px solid #f0f0f0',
              backgroundColor: '#fafafa'
            }
          }}
        />
        
        <style jsx global>{`
          .table-row-light {
            background-color: #ffffff;
          }
          .table-row-dark {
            background-color: #fafafa;
          }
          .ant-table-thead > tr > th {
            background-color: #f5f5f5 !important;
            font-weight: 600 !important;
            font-size: 14px !important;
            padding: 16px 12px !important;
            border-bottom: 2px solid #e6f7ff !important;
          }
          .ant-table-tbody > tr > td {
            padding: 12px !important;
            border-bottom: 1px solid #f0f0f0 !important;
          }
        `}</style>
      </Card>
    </div>
  );
};

export default SellerPropertyList;
