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
  Tooltip
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
  ShareAltOutlined
} from '@ant-design/icons';
import { DealStatus, DealSource } from 'models/DealModel';
import moment from 'moment';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { confirm } = Modal;

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
        deal.Amount?.toString().includes(searchText)
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
        const dealDate = moment(deal.CreationDate);
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
      case DealSource.LEADS:
        return <TeamOutlined style={{ color: '#1890ff' }} />;
      case DealSource.CONTACTS:
        return <ContactsOutlined style={{ color: '#52c41a' }} />;
      case DealSource.FREELANCE:
        return <UserOutlined style={{ color: '#faad14' }} />;
      default:
        return <UserOutlined />;
    }
  };

  // Handle status update
  const handleStatusUpdate = async (dealId, newStatus) => {
    try {
      await onStatusUpdate(dealId, newStatus);
      message.success('Deal status updated successfully');
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

  // Handle email action
  const handleEmail = (deal) => {
    const subject = `Regarding Deal: ${deal.Description?.substring(0, 50)}...`;
    const body = `Dear Client,\n\nI hope this email finds you well. I am reaching out regarding our deal discussion.\n\nDeal Amount: ${formatCurrency(deal.Amount)}\nStatus: ${deal.Status}\n\nPlease let me know if you have any questions.\n\nBest regards`;
    
    const email = 'client@example.com'; // This should come from related lead/contact
    const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_blank');
  };

  // Handle WhatsApp action
  const handleWhatsApp = (deal) => {
    const message = `Hi! Regarding our deal discussion (${formatCurrency(deal.Amount)}). Let me know when would be a good time to talk. Thanks!`;
    const phone = '+971501234567'; // This should come from related lead/contact
    const whatsappLink = `https://wa.me/${phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappLink, '_blank');
  };

  // Table columns
  const columns = [
    {
      title: 'Description',
      dataIndex: 'Description',
      key: 'description',
      ellipsis: true,
      width: 200,
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
      sorter: (a, b) => a.Amount - b.Amount,
      render: (amount) => (
        <Space>
          <DollarOutlined style={{ color: '#52c41a' }} />
          <strong>{formatCurrency(amount)}</strong>
        </Space>
      )
    },
    {
      title: 'Source',
      dataIndex: 'Source',
      key: 'source',
      width: 100,
      filters: [
        { text: 'Leads', value: DealSource.LEADS },
        { text: 'Contacts', value: DealSource.CONTACTS },
        { text: 'Freelance', value: DealSource.FREELANCE }
      ],
      render: (source) => (
        <Space>
          {getSourceIcon(source)}
          <Tag color={
            source === DealSource.LEADS ? 'blue' :
            source === DealSource.CONTACTS ? 'green' : 'orange'
          }>
            {source}
          </Tag>
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'Status',
      key: 'status',
      width: 120,
      filters: [
        { text: 'Opened', value: DealStatus.OPENED },
        { text: 'Gain', value: DealStatus.GAIN },
        { text: 'Loss', value: DealStatus.LOSS }
      ],
      render: (status, record) => {
        const statusOptions = [
          { label: 'Opened', value: DealStatus.OPENED, color: 'blue' },
          { label: 'Gain', value: DealStatus.GAIN, color: 'green' },
          { label: 'Loss', value: DealStatus.LOSS, color: 'red' }
        ];

        const currentStatus = statusOptions.find(s => s.value === status);
        
        return (
          <Dropdown
            menu={{
              items: statusOptions.map(option => ({
                key: option.value,
                label: (
                  <Space>
                    <span style={{ color: option.color === 'blue' ? '#1890ff' : option.color === 'green' ? '#52c41a' : '#ff4d4f' }}>●</span>
                    {option.label}
                  </Space>
                ),
                onClick: () => handleStatusUpdate(record.id, option.value)
              }))
            }}
            trigger={['click']}
          >
            <Tag 
              color={currentStatus?.color || 'default'} 
              style={{ cursor: 'pointer' }}
            >
              {status} <MoreOutlined />
            </Tag>
          </Dropdown>
        );
      }
    },
    {
      title: 'Created',
      dataIndex: 'CreationDate',
      key: 'created',
      width: 100,
      sorter: (a, b) => moment(a.CreationDate) - moment(b.CreationDate),
      render: (date) => (
        <Space>
          <CalendarOutlined style={{ color: '#8c8c8c' }} />
          {moment(date).format('DD MMM YY')}
        </Space>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'view',
                label: 'View Details',
                icon: <EyeOutlined />,
                onClick: () => onView(record)
              },
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
                key: 'email',
                label: 'Send Email',
                icon: <MailOutlined />,
                onClick: () => handleEmail(record)
              },
              {
                key: 'whatsapp',
                label: 'WhatsApp',
                icon: <WhatsAppOutlined />,
                onClick: () => handleWhatsApp(record)
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
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      )
    }
  ];

  // Calculate statistics
  const totalAmount = filteredDeals.reduce((sum, deal) => sum + (deal.Amount || 0), 0);
  const openedCount = filteredDeals.filter(deal => deal.Status === DealStatus.OPENED).length;
  const gainCount = filteredDeals.filter(deal => deal.Status === DealStatus.GAIN).length;
  const lossCount = filteredDeals.filter(deal => deal.Status === DealStatus.LOSS).length;

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
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Total Value"
              value={formatCurrency(totalAmount)}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Opened"
              value={openedCount}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Gained"
              value={gainCount}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Lost"
              value={lossCount}
              valueStyle={{ color: '#ff4d4f' }}
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
              <Option value={DealStatus.OPENED}>Opened</Option>
              <Option value={DealStatus.GAIN}>Gain</Option>
              <Option value={DealStatus.LOSS}>Loss</Option>
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
              <Option value={DealSource.LEADS}>Leads</Option>
              <Option value={DealSource.CONTACTS}>Contacts</Option>
              <Option value={DealSource.FREELANCE}>Freelance</Option>
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
          scroll={{ x: 800 }}
          pagination={{
            total: filteredDeals.length,
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
