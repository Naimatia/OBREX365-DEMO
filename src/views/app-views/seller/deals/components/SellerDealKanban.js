// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Tag, 
  Button, 
  Space, 
  Typography, 
  Avatar, 
  Dropdown, 
  Modal,
  message,
  Empty,
  Tooltip,
  Badge,
  Select,
  DatePicker,
  Input
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  DollarOutlined,
  CalendarOutlined,
  UserOutlined,
  MailOutlined,
  WhatsAppOutlined,
  PhoneOutlined,
  GlobalOutlined,
  TrophyOutlined,
  CloseCircleOutlined,
  StarOutlined,
  ExclamationCircleOutlined,
  DragOutlined,
  EyeOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { DealStatus, DealStatusLabels, DealStatusColors } from 'models/DealModel';
import dayjs from 'dayjs';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Spin } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';

const { Text, Title, Paragraph } = Typography;
const { confirm } = Modal;
const { Option } = Select;
const { RangePicker } = DatePicker;

// Column configuration with colors and icons
const COLUMNS = {
  [DealStatus.OPENED]: {
    id: DealStatus.OPENED,
    title: 'Opened',
    color: 'blue',
    icon: <StarOutlined />,
    bgColor: '#e6f7ff',
    borderColor: '#91d5ff',
    order: 0
  },
  [DealStatus.PROPOSAL]: {
    id: DealStatus.PROPOSAL,
    title: 'Proposal',
    color: 'purple',
    icon: <FileTextOutlined />,
    bgColor: '#f9f0ff',
    borderColor: '#d3adf7',
    order: 1
  },
  [DealStatus.WON]: {
    id: DealStatus.WON,
    title: 'Won',
    color: 'gold',
    icon: <TrophyOutlined />,
    bgColor: '#fffbe6',
    borderColor: '#ffe58f',
    order: 2
  },
  [DealStatus.LOST]: {
    id: DealStatus.LOST,
    title: 'Lost',
    color: 'red',
    icon: <CloseCircleOutlined />,
    bgColor: '#fff1f0',
    borderColor: '#ffa39e',
    order: 3
  }
};

// Month options
const MONTH_OPTIONS = [
  { label: 'All Time', value: 'all' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'Last 3 Months', value: 'last_3_months' },
  { label: 'Last 6 Months', value: 'last_6_months' },
  { label: 'This Year', value: 'this_year' },
  { label: 'Custom', value: 'custom' }
];

const SellerDealKanban = ({
  deals,
  loading,
  onView,
  onEdit,
  onDelete,
  onStatusUpdate,
  onRefresh
}) => {
  const [searchText, setSearchText] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('this_month');
  const [customDateRange, setCustomDateRange] = useState(null);

  // Filter deals by date range
  const getDateRange = () => {
    const now = dayjs();
    switch (selectedMonth) {
      case 'this_month':
        return [now.startOf('month'), now.endOf('month')];
      case 'last_month':
        return [now.subtract(1, 'month').startOf('month'), now.subtract(1, 'month').endOf('month')];
      case 'last_3_months':
        return [now.subtract(3, 'month').startOf('month'), now.endOf('month')];
      case 'last_6_months':
        return [now.subtract(6, 'month').startOf('month'), now.endOf('month')];
      case 'this_year':
        return [now.startOf('year'), now.endOf('year')];
      case 'custom':
        return customDateRange || [now.startOf('month'), now.endOf('month')];
      default:
        return null;
    }
  };

  // Filter and search deals
  const filteredDeals = useMemo(() => {
    let filtered = [...deals];

    // Date filter
    if (selectedMonth !== 'all') {
      const range = getDateRange();
      if (range) {
        const [start, end] = range;
        filtered = filtered.filter(deal => {
          const dealDate = dayjs(deal.CreationDate?.toDate?.() || deal.CreationDate);
          return dealDate.isBetween(start, end, 'day', '[]');
        });
      }
    }

    // Search filter
    if (searchText) {
      const term = searchText.toLowerCase();
      filtered = filtered.filter(deal =>
        deal.contact_name?.toLowerCase().includes(term) ||
        deal.Description?.toLowerCase().includes(term) ||
        deal.contact_email?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [deals, searchText, selectedMonth, customDateRange]);

  // Group filtered deals by status
  const groupedDeals = useMemo(() => {
    const groups = {};
    Object.keys(COLUMNS).forEach(status => {
      groups[status] = filteredDeals.filter(deal => deal.Status === status);
    });
    return groups;
  }, [filteredDeals]);

  // Calculate statistics for filtered deals
  const stats = useMemo(() => {
    const total = filteredDeals.length;
    const totalValue = filteredDeals.reduce((sum, deal) => sum + (deal.Amount || 0), 0);
    const wonCount = filteredDeals.filter(d => d.Status === DealStatus.WON).length;
    const lostCount = filteredDeals.filter(d => d.Status === DealStatus.LOST).length;
    const openedCount = filteredDeals.filter(d => d.Status === DealStatus.OPENED).length;
    const proposalCount = filteredDeals.filter(d => d.Status === DealStatus.PROPOSAL).length;
    const avgValue = total > 0 ? totalValue / total : 0;

    return { total, totalValue, wonCount, lostCount, openedCount, proposalCount, avgValue };
  }, [filteredDeals]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Handle drag end
  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && 
        destination.index === source.index) return;

    const newStatus = destination.droppableId;
    const deal = deals.find(d => d.id === draggableId);
    
    if (deal) {
      onStatusUpdate(deal.id, newStatus);
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    return DealStatusColors[status] || 'default';
  };

  // Get status label
  const getStatusLabel = (status) => {
    return DealStatusLabels[status] || status || 'Unknown';
  };

  // Handle delete
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

  // Clear filters
  const clearFilters = () => {
    setSearchText('');
    setSelectedMonth('this_month');
    setCustomDateRange(null);
  };

  // Render deal card
  const DealCard = ({ deal, index }) => {
    const statusColor = getStatusColor(deal.Status);
    const statusLabel = getStatusLabel(deal.Status);
    
    return (
      <Draggable draggableId={deal.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={{
              ...provided.draggableProps.style,
              marginBottom: 10,
            }}
          >
            <Card
              size="small"
              style={{
                borderRadius: 10,
                cursor: 'grab',
                border: snapshot.isDragging ? '2px solid #1890ff' : '1px solid #f0f0f0',
                boxShadow: snapshot.isDragging ? '0 6px 16px rgba(0,0,0,0.15)' : '0 2px 4px rgba(0,0,0,0.04)',
                background: '#fff',
                transition: 'all 0.3s ease',
                transform: snapshot.isDragging ? 'scale(1.02)' : 'scale(1)'
              }}
              bodyStyle={{ padding: '12px 14px' }}
              onMouseEnter={(e) => {
                if (!snapshot.isDragging) {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!snapshot.isDragging) {
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.04)';
                }
              }}
            >
              {/* Header with status and actions */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: 8
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <DragOutlined style={{ color: '#bfbfbf', fontSize: 12 }} />
                  <Tag 
                    color={statusColor} 
                    style={{ 
                      fontSize: 10, 
                      margin: 0,
                      borderRadius: 12,
                      padding: '0 10px'
                    }}
                  >
                    {statusLabel}
                  </Tag>
                </div>
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: 'view',
                        label: 'View Details',
                        icon: <EyeOutlined />,
                        onClick: () => onView(deal)
                      },
                      {
                        key: 'edit',
                        label: 'Edit Deal',
                        icon: <EditOutlined />,
                        onClick: () => onEdit(deal)
                      },
                      {
                        type: 'divider'
                      },
                      {
                        key: 'delete',
                        label: 'Delete',
                        icon: <DeleteOutlined />,
                        danger: true,
                        onClick: () => handleDelete(deal.id)
                      }
                    ]
                  }}
                  trigger={['click']}
                >
                  <Button type="text" size="small" icon={<MoreOutlined />} />
                </Dropdown>
              </div>

              {/* Contact info - clickable */}
              <div 
                onClick={() => onView(deal)}
                style={{ cursor: 'pointer' }}
              >
                <Space style={{ marginBottom: 6 }}>
                  <Avatar 
                    size={32} 
                    style={{ 
                      backgroundColor: '#1890ff',
                      fontSize: 13,
                      fontWeight: 600
                    }}
                  >
                    {(deal.contact_name || 'C')[0].toUpperCase()}
                  </Avatar>
                  <div>
                    <Text strong style={{ fontSize: 14 }}>
                      {deal.contact_name || 'Unknown'}
                    </Text>
                    {deal.region && (
                      <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                        <GlobalOutlined style={{ marginRight: 2 }} />
                        {deal.region}
                      </Text>
                    )}
                  </div>
                </Space>

                {/* Amount */}
                <div style={{ 
                  marginTop: 4, 
                  background: '#f6ffed', 
                  padding: '2px 12px', 
                  borderRadius: 14,
                  display: 'inline-block'
                }}>
                  <Text strong style={{ color: '#52c41a', fontSize: 15 }}>
                    <DollarOutlined /> {formatCurrency(deal.Amount)}
                  </Text>
                </div>

                {/* Description */}
                {deal.Description && (
                  <Paragraph 
                    ellipsis={{ rows: 1 }} 
                    style={{ 
                      fontSize: 12, 
                      margin: '6px 0 0 0', 
                      color: '#8c8c8c'
                    }}
                  >
                    {deal.Description}
                  </Paragraph>
                )}

                {/* Bottom info */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginTop: 10,
                  paddingTop: 8,
                  borderTop: '1px solid #f5f5f5'
                }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    <CalendarOutlined style={{ marginRight: 4 }} />
                    {deal.CreationDate ? dayjs(deal.CreationDate.toDate?.() || deal.CreationDate).format('DD MMM YY') : '—'}
                  </Text>
                  <Space size={4}>
                    {deal.contact_phone && (
                      <Tooltip title={deal.contact_phone}>
                        <PhoneOutlined style={{ color: '#52c41a', fontSize: 12 }} />
                      </Tooltip>
                    )}
                    {deal.contact_email && (
                      <Tooltip title={deal.contact_email}>
                        <MailOutlined style={{ color: '#1677ff', fontSize: 12 }} />
                      </Tooltip>
                    )}
                    {deal.interestLevel && (
                      <Tag 
                        color={deal.interestLevel === 'High' ? 'red' : deal.interestLevel === 'Medium' ? 'orange' : 'blue'}
                        style={{ fontSize: 9, margin: 0, padding: '0 6px' }}
                      >
                        {deal.interestLevel}
                      </Tag>
                    )}
                  </Space>
                </div>
              </div>
            </Card>
          </div>
        )}
      </Draggable>
    );
  };

  // Render column
  const Column = ({ status, deals }) => {
    const column = COLUMNS[status];
    const color = column.color;
    const icon = column.icon;
    const title = column.title;
    const bgColor = column.bgColor;
    const borderColor = column.borderColor;
    const count = deals.length;
    const totalValue = deals.reduce((sum, deal) => sum + (deal.Amount || 0), 0);

    return (
      <div style={{ 
        flex: 1,
        minWidth: 280,
        maxWidth: 360,
        margin: '0 6px'
      }}>
        <Card
          size="small"
          style={{
            background: bgColor,
            borderRadius: 12,
            border: `1px solid ${borderColor}`,
            height: '100%',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}
          headStyle={{
            padding: '12px 16px',
            borderBottom: `1px solid ${borderColor}`,
            background: 'rgba(255,255,255,0.5)'
          }}
          bodyStyle={{
            padding: '8px 4px',
            maxHeight: 'calc(100vh - 420px)',
            overflowY: 'auto'
          }}
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                {icon}
                <span style={{ fontWeight: 600 }}>{title}</span>
                <Badge 
                  count={count} 
                  color={color}
                  style={{ 
                    backgroundColor: color === 'gold' ? '#faad14' : 
                                    color === 'purple' ? '#722ed1' :
                                    color === 'red' ? '#ff4d4f' : '#1890ff'
                  }}
                />
              </Space>
              {count > 0 && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {formatCurrency(totalValue)}
                </Text>
              )}
            </div>
          }
        >
          <Droppable droppableId={status}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={{
                  minHeight: 100,
                  padding: '4px',
                  background: snapshot.isDraggingOver ? 'rgba(255,255,255,0.6)' : 'transparent',
                  borderRadius: 8,
                  transition: 'background 0.3s ease',
                  border: snapshot.isDraggingOver ? `2px dashed ${borderColor}` : '2px dashed transparent'
                }}
              >
                {deals.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '20px 10px',
                    color: '#bfbfbf'
                  }}>
                    <Empty 
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No deals"
                      style={{ margin: 0 }}
                      imageStyle={{ height: 30 }}
                    />
                  </div>
                ) : (
                  deals.map((deal, index) => (
                    <DealCard key={deal.id} deal={deal} index={index} />
                  ))
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </Card>
      </div>
    );
  };

  // Get month label
  const getMonthLabel = () => {
    const option = MONTH_OPTIONS.find(o => o.value === selectedMonth);
    if (selectedMonth === 'custom' && customDateRange) {
      return `${customDateRange[0].format('DD MMM YY')} - ${customDateRange[1].format('DD MMM YY')}`;
    }
    return option?.label || 'This Month';
  };

  return (
    <div>
      {/* Filter & Stats Bar */}
      <Card 
        style={{ 
          marginBottom: 16, 
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}
        bodyStyle={{ padding: '16px 20px' }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8}>
            <Input
              placeholder="Search contacts or deals..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              prefix={<SearchOutlined style={{ color: '#8c8c8c' }} />}
              allowClear
              style={{ borderRadius: 8 }}
            />
          </Col>
          
          <Col xs={12} sm={4}>
            <Select
              value={selectedMonth}
              onChange={setSelectedMonth}
              style={{ width: '100%', borderRadius: 8 }}
              suffixIcon={<FilterOutlined />}
            >
              {MONTH_OPTIONS.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Col>

          {selectedMonth === 'custom' && (
            <Col xs={12} sm={8}>
              <RangePicker
                value={customDateRange}
                onChange={setCustomDateRange}
                style={{ width: '100%', borderRadius: 8 }}
                format="DD MMM YYYY"
                placeholder={['Start', 'End']}
              />
            </Col>
          )}

          <Col xs={12} sm={4}>
            <Space>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={onRefresh}
                loading={loading}
                style={{ borderRadius: 8 }}
              >
                Refresh
              </Button>
              {(searchText || selectedMonth !== 'this_month') && (
                <Button onClick={clearFilters} style={{ borderRadius: 8 }}>
                  Clear
                </Button>
              )}
            </Space>
          </Col>
        </Row>

        {/* Stats */}
        <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
          <Col xs={12} sm={4}>
            <div style={{ textAlign: 'center', padding: '4px 0' }}>
              <Text type="secondary" style={{ fontSize: 11 }}>Total Deals</Text>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#1890ff' }}>
                {stats.total}
              </div>
            </div>
          </Col>
          <Col xs={12} sm={4}>
            <div style={{ textAlign: 'center', padding: '4px 0' }}>
              <Text type="secondary" style={{ fontSize: 11 }}>Total Value</Text>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#52c41a' }}>
                {formatCurrency(stats.totalValue)}
              </div>
            </div>
          </Col>
          <Col xs={12} sm={4}>
            <div style={{ textAlign: 'center', padding: '4px 0' }}>
              <Text type="secondary" style={{ fontSize: 11 }}>Won</Text>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#faad14' }}>
                <TrophyOutlined /> {stats.wonCount}
              </div>
            </div>
          </Col>
          <Col xs={12} sm={4}>
            <div style={{ textAlign: 'center', padding: '4px 0' }}>
              <Text type="secondary" style={{ fontSize: 11 }}>Lost</Text>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#ff4d4f' }}>
                <CloseCircleOutlined /> {stats.lostCount}
              </div>
            </div>
          </Col>
          <Col xs={12} sm={4}>
            <div style={{ textAlign: 'center', padding: '4px 0' }}>
              <Text type="secondary" style={{ fontSize: 11 }}>Opened</Text>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#1890ff' }}>
                <StarOutlined /> {stats.openedCount}
              </div>
            </div>
          </Col>
          <Col xs={12} sm={4}>
            <div style={{ textAlign: 'center', padding: '4px 0' }}>
              <Text type="secondary" style={{ fontSize: 11 }}>Avg Value</Text>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#722ed1' }}>
                {formatCurrency(stats.avgValue)}
              </div>
            </div>
          </Col>
        </Row>

        <div style={{ marginTop: 8, textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Showing: {getMonthLabel()} • {filteredDeals.length} deals
          </Text>
        </div>
      </Card>

      {/* Kanban Board */}
      <Card 
        style={{ 
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}
        bodyStyle={{ padding: '16px 8px' }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16, color: '#8c8c8c' }}>Loading deals...</div>
          </div>
        ) : filteredDeals.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span>
                No deals found for {getMonthLabel()}
                <br />
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={onRefresh}
                  style={{ marginTop: 12 }}
                >
                  Create Your First Deal
                </Button>
              </span>
            }
            style={{ padding: '40px 0' }}
          />
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div style={{ 
              display: 'flex', 
              overflowX: 'auto',
              padding: '0 4px',
              gap: 4,
              minHeight: 400
            }}>
              {Object.keys(COLUMNS).map(status => (
                <Column 
                  key={status}
                  status={status}
                  deals={groupedDeals[status] || []}
                />
              ))}
            </div>
          </DragDropContext>
        )}
      </Card>

      <style>{`
        .ant-card-small > .ant-card-body {
          padding: 8px;
        }
        .ant-card-small > .ant-card-head {
          min-height: 40px;
        }
        .ant-card-small > .ant-card-head > .ant-card-head-wrapper > .ant-card-head-title {
          padding: 4px 0;
          font-size: 13px;
        }
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
        .ant-empty-image {
          height: 40px;
        }
      `}</style>
    </div>
  );
};

export default SellerDealKanban;