// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
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
  Avatar,
  Typography
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
  MailOutlined,
  WhatsAppOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  TeamOutlined,
  ContactsOutlined,
  UserOutlined,
  StarOutlined,
  TrophyOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { DealStatus, DealStatusLabels, DealStatusColors, DealSource, DealSourceEnum } from 'models/DealModel';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { confirm } = Modal;
const { Text } = Typography;

/**
 * Table component to list and manage deals
 */
const SellerDealList = ({
  deals,
  loading,
  onView,
  onEdit,
  onDelete,
  onStatusUpdate,
  onRefresh
}) => {
  const [filteredDeals, setFilteredDeals] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [filteredStatus, setFilteredStatus] = useState('');
  const [filteredSource, setFilteredSource] = useState('');
  const [dateRange, setDateRange] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // Status options with new statuses
  const statusOptions = [
    { label: 'Opened', value: DealStatus.OPENED, color: 'blue' },
    { label: 'Proposal', value: DealStatus.PROPOSAL, color: 'purple' },
    { label: 'Won', value: DealStatus.WON, color: 'gold' },
    { label: 'Lost', value: DealStatus.LOST, color: 'red' }
  ];

  // Update filtered deals when deals or filters change
  useEffect(() => {
    let filtered = [...deals];

    // Search filter
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(deal =>
        deal.Description?.toLowerCase().includes(searchLower) ||
        deal.Status?.toLowerCase().includes(searchLower) ||
        deal.Source?.toLowerCase().includes(searchLower) ||
        deal.Amount?.toString().includes(searchText) ||
        deal.contact_name?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (filteredStatus) {
      filtered = filtered.filter(deal => deal.Status === filteredStatus);
    }

    // Source filter
    if (filteredSource) {
      filtered = filtered.filter(deal => deal.Source === filteredSource);
    }

    // Date range filter
    if (dateRange && dateRange.length === 2) {
      const [startDate, endDate] = dateRange;
      filtered = filtered.filter(deal => {
        const dealDate = dayjs(deal.CreationDate?.toDate?.() || deal.CreationDate);
        return dealDate.isBetween(startDate, endDate, 'day', '[]');
      });
    }

    setFilteredDeals(filtered);
  }, [deals, searchText, filteredStatus, filteredSource, dateRange]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Get source icon
  const getSourceIcon = (source) => {
    switch (source) {
      case DealSourceEnum.LEADS:
        return <TeamOutlined style={{ color: '#1890ff' }} />;
      case DealSourceEnum.CONTACTS:
        return <ContactsOutlined style={{ color: '#52c41a' }} />;
      case DealSourceEnum.FREELANCE:
        return <UserOutlined style={{ color: '#faad14' }} />;
      case DealSourceEnum.FACEBOOK:
        return <span style={{ color: '#1877F2' }}>📘</span>;
      case DealSourceEnum.INSTAGRAM:
        return <span style={{ color: '#E4405F' }}>📷</span>;
      default:
        return <UserOutlined />;
    }
  };

  // Handle status update
  const handleStatusUpdate = async (dealId, newStatus) => {
    try {
      await onStatusUpdate(dealId, newStatus);
      message.success(`Status updated to ${DealStatusLabels[newStatus] || newStatus}`);
    } catch (error) {
      console.error('Error updating deal status:', error);
      message.error('Failed to update deal status');
    }
  };

  // Handle delete confirmation
  const handleDelete = (dealId) => {
    confirm({
      title: 'Delete Deal',
      icon: <ExclamationCircleOutlined />,
      content: 'Are you sure you want to delete this deal?',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => onDelete(dealId)
    });
  };

  // Table columns
  const columns = [
    {
      title: 'Contact',
      dataIndex: 'contact_name',
      key: 'contact_name',
      width: 200,
      fixed: 'left',
      render: (text, record) => (
        <Space>
          <Avatar size={32} style={{ backgroundColor: '#1890ff' }}>
            {(text || 'C')[0].toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 500 }}>{text || 'Unknown'}</div>
            {record.contact_email && (
              <Text type="secondary" style={{ fontSize: 11 }}>
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
          <span>{text}</span>
        </Tooltip>
      )
    },
    {
      title: 'Amount',
      dataIndex: 'Amount',
      key: 'amount',
      width: 120,
      sorter: (a, b) => (a.Amount || 0) - (b.Amount || 0),
      render: (amount) => (
        <Tag color="green" style={{ fontSize: 13, fontWeight: 600 }}>
          <DollarOutlined /> {formatCurrency(amount)}
        </Tag>
      )
    },
    {
      title: 'Source',
      dataIndex: 'Source',
      key: 'source',
      width: 100,
      filters: [
        { text: 'Leads', value: DealSourceEnum.LEADS },
        { text: 'Contacts', value: DealSourceEnum.CONTACTS },
        { text: 'Freelance', value: DealSourceEnum.FREELANCE }
      ],
      render: (source) => (
        <Space>
          {getSourceIcon(source)}
          <Tag color="blue">{source || 'Contacts'}</Tag>
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'Status',
      key: 'status',
      width: 130,
      filters: statusOptions.map(opt => ({ text: opt.label, value: opt.value })),
      render: (status, record) => {
        const currentStatus = statusOptions.find(s => s.value === status);
        const color = DealStatusColors[status] || currentStatus?.color || 'default';
        const label = DealStatusLabels[status] || currentStatus?.label || status || 'Unknown';
        
        return (
          <Dropdown
            menu={{
              items: statusOptions.map(option => ({
                key: option.value,
                label: (
                  <Tag color={option.color} style={{ margin: 0 }}>
                    {option.label}
                  </Tag>
                ),
                onClick: () => handleStatusUpdate(record.id, option.value)
              }))
            }}
            trigger={['click']}
          >
            <Tag 
              color={color} 
              style={{ cursor: 'pointer', borderRadius: 16, padding: '2px 14px' }}
            >
              {label} {status !== 'Won' && status !== 'Lost' && <MoreOutlined />}
            </Tag>
          </Dropdown>
        );
      }
    },
  {
  title: 'Created',
  dataIndex: 'CreationDate',
  key: 'created',
  width: 110,
  sorter: (a, b) => {
    const dateA = a.CreationDate?.toDate?.() || new Date(a.CreationDate) || new Date(0);
    const dateB = b.CreationDate?.toDate?.() || new Date(b.CreationDate) || new Date(0);
    return dateA - dateB;
  },
  render: (date) => {
    if (!date) return <Text type="secondary">—</Text>;
    try {
      const d = date.toDate?.() || new Date(date);
      if (isNaN(d.getTime())) return <Text type="secondary">—</Text>;
      return (
        <Space>
          <CalendarOutlined style={{ color: '#8c8c8c' }} />
          {dayjs(d).format('DD MMM YY')}
        </Space>
      );
    } catch {
      return <Text type="secondary">—</Text>;
    }
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
              onClick={() => onView(record)}
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
                  onClick: () => onEdit(record)
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

  // Calculate statistics
  const totalAmount = filteredDeals.reduce((sum, deal) => sum + (deal.Amount || 0), 0);
  const openedCount = filteredDeals.filter(deal => deal.Status === DealStatus.OPENED || deal.Status === 'Opened').length;
  const proposalCount = filteredDeals.filter(deal => deal.Status === DealStatus.PROPOSAL || deal.Status === 'Proposal').length;
  const wonCount = filteredDeals.filter(deal => deal.Status === DealStatus.WON || deal.Status === 'Won').length;
  const lostCount = filteredDeals.filter(deal => deal.Status === DealStatus.LOST || deal.Status === 'Lost').length;

  // Row selection
  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
  };

  if (deals.length === 0 && !loading) {
    return (
      <Card>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span>
              No deals found. <br />
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={onRefresh}
                style={{ marginTop: 16 }}
              >
                Create Your First Deal
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
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ background: '#e6f7ff' }}>
            <Statistic
              title="Total Value"
              value={formatCurrency(totalAmount)}
              prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a', fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ background: '#f0f5ff' }}>
            <Statistic
              title="Opened"
              value={openedCount}
              valueStyle={{ color: '#1890ff', fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ background: '#f9f0ff' }}>
            <Statistic
              title="Proposal"
              value={proposalCount}
              valueStyle={{ color: '#722ed1', fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ background: '#f6ffed' }}>
            <Statistic
              title="Won"
              value={wonCount}
              valueStyle={{ color: '#52c41a', fontSize: 18 }}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ background: '#fff1f0' }}>
            <Statistic
              title="Lost"
              value={lostCount}
              valueStyle={{ color: '#ff4d4f', fontSize: 18 }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Search
              placeholder="Search deals..."
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
              {statusOptions.map(opt => (
                <Option key={opt.value} value={opt.value}>
                  <Tag color={opt.color}>{opt.label}</Tag>
                </Option>
              ))}
            </Select>
          </Col>
          
          <Col xs={24} sm={4}>
            <Select
              placeholder="Filter by source"
              value={filteredSource}
              onChange={setFilteredSource}
              allowClear
              style={{ width: '100%' }}
            >
              <Option value={DealSourceEnum.LEADS}>Leads</Option>
              <Option value={DealSourceEnum.CONTACTS}>Contacts</Option>
              <Option value={DealSourceEnum.FREELANCE}>Freelance</Option>
              <Option value={DealSourceEnum.FACEBOOK}>Facebook</Option>
              <Option value={DealSourceEnum.INSTAGRAM}>Instagram</Option>
            </Select>
          </Col>
          
          <Col xs={24} sm={8}>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder={['Start Date', 'End Date']}
              style={{ width: '100%' }}
            />
          </Col>
        </Row>
      </Card>

      {/* Deals Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredDeals}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
          scroll={{ x: 1000 }}
          pagination={{
            total: filteredDeals.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} deals`
          }}
        />
      </Card>
    </div>
  );
};

export default SellerDealList;