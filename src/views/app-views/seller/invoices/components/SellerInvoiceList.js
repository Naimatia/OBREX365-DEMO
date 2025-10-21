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
  Progress
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
  FileTextOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  CreditCardOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import moment from 'moment';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { confirm } = Modal;

// Invoice statuses for filtering
const InvoiceStatuses = ['Pending', 'Paid', 'Missed', 'Cancelled'];

/**
 * Table component to list and manage invoices
 */
const SellerInvoiceList = ({
  invoices,
  loading,
  onView,
  onEdit,
  onDelete,
  onRefresh,
  onStatusChange,
  currentUserId // For checking edit permissions
}) => {
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [filteredStatus, setFilteredStatus] = useState('');
  const [dateRange, setDateRange] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // Update filtered invoices when invoices or filters change
  useEffect(() => {
    let filtered = [...invoices];

    // Search filter
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(invoice =>
        invoice.Title?.toLowerCase().includes(searchLower) ||
        invoice.description?.toLowerCase().includes(searchLower) ||
        invoice.amount?.toString().includes(searchText)
      );
    }

    // Status filter
    if (filteredStatus) {
      filtered = filtered.filter(invoice => invoice.Status === filteredStatus);
    }

    // Date range filter
    if (dateRange && dateRange.length === 2) {
      filtered = filtered.filter(invoice => {
        const invoiceDate = moment(invoice.CreationDate);
        return invoiceDate.isBetween(dateRange[0], dateRange[1], 'day', '[]');
      });
    }

    setFilteredInvoices(filtered);
  }, [invoices, searchText, filteredStatus, dateRange]);

  // Check if user can edit invoice (only creator can edit)
  const canEditInvoice = (invoice) => {
    return invoice.creator_id === currentUserId;
  };

  // Handle delete confirmation
  const handleDelete = (invoiceId) => {
    const invoice = invoices.find(i => i.id === invoiceId);
    
    if (!canEditInvoice(invoice)) {
      message.warning('You can only delete invoices you created');
      return;
    }
    
    confirm({
      title: 'Delete Invoice',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete "${invoice.Title}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => onDelete(invoiceId)
    });
  };

  // Handle edit click
  const handleEdit = (invoice) => {
    if (!canEditInvoice(invoice)) {
      message.warning('You can only edit invoices you created');
      return;
    }
    onEdit(invoice);
  };

  // Handle status change
  const handleStatusChange = (invoiceId, newStatus) => {
    const invoice = invoices.find(i => i.id === invoiceId);
    if (!canEditInvoice(invoice)) {
      message.warning('You can only update invoices you created');
      return;
    }
    onStatusChange(invoiceId, newStatus);
  };

  // Handle payment
  const handlePayNow = (invoice) => {
    if (invoice.paymentUrl) {
      window.open(invoice.paymentUrl, '_blank');
    } else {
      message.warning('Payment URL not available');
    }
  };

  // Get status color and icon
  const getStatusInfo = (status) => {
    switch (status) {
      case 'Pending':
        return { color: '#faad14', icon: <ClockCircleOutlined /> };
      case 'Paid':
        return { color: '#52c41a', icon: <CheckCircleOutlined /> };
      case 'Missed':
        return { color: '#ff4d4f', icon: <CloseCircleOutlined /> };
      case 'Cancelled':
        return { color: '#8c8c8c', icon: <ExclamationCircleOutlined /> };
      default:
        return { color: '#1890ff', icon: <FileTextOutlined /> };
    }
  };

  // Check if invoice is overdue
  const isOverdue = (invoice) => {
    if (!invoice.DateLimit) return false;
    return moment().isAfter(moment(invoice.DateLimit)) && invoice.Status === 'Pending';
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
      title: 'Invoice',
      key: 'invoice',
      width: 300,
      render: (_, record) => {
        const overdue = isOverdue(record);
        
        return (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            padding: '8px 12px',
            backgroundColor: overdue ? '#fff2f0' : '#fafafa',
            borderRadius: '8px',
            margin: '4px 0',
            border: overdue ? '1px solid #ffccc7' : '1px solid #f0f0f0'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              backgroundColor: '#f0f9ff',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '16px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <FileTextOutlined style={{ color: '#1890ff', fontSize: '20px' }} />
            </div>
            
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                fontWeight: '600', 
                fontSize: '15px',
                marginBottom: '4px',
                color: '#262626',
                lineHeight: '1.3'
              }}>
                <Tooltip title={record.Title}>
                  {record.Title?.length > 25 ? `${record.Title.substring(0, 25)}...` : record.Title}
                </Tooltip>
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: '#8c8c8c',
                marginBottom: '6px'
              }}>
                <Tooltip title={record.description}>
                  {record.description?.length > 40 ? `${record.description.substring(0, 40)}...` : record.description}
                </Tooltip>
              </div>
              <Space size={[4, 4]} wrap>
                {overdue && (
                  <Tag 
                    color="red" 
                    size="small"
                    style={{ borderRadius: '8px', fontSize: '10px' }}
                  >
                    OVERDUE
                  </Tag>
                )}
                <Tag 
                  color="blue" 
                  size="small"
                  style={{ borderRadius: '8px', fontSize: '10px' }}
                >
                  {moment(record.CreationDate).format('DD MMM')}
                </Tag>
              </Space>
            </div>
          </div>
        );
      }
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 140,
      sorter: (a, b) => (a.amount || 0) - (b.amount || 0),
      render: (amount) => (
        <div style={{ 
          textAlign: 'center',
          padding: '8px',
          backgroundColor: '#f6ffed',
          borderRadius: '8px',
          border: '1px solid #b7eb8f'
        }}>
          <div style={{ 
            fontWeight: '700', 
            fontSize: '16px',
            color: '#52c41a',
            lineHeight: '1.2'
          }}>
            {formatCurrency(amount)}
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
      title: 'Status',
      dataIndex: 'Status',
      key: 'status',
      width: 120,
      filters: InvoiceStatuses.map(status => ({ text: status, value: status })),
      render: (status, record) => {
        const statusInfo = getStatusInfo(status);
        const canEdit = canEditInvoice(record);
        
        if (canEdit) {
          return (
            <div style={{ textAlign: 'center' }}>
              <Select
                value={status}
                size="small"
                style={{ width: '100px' }}
                onChange={(newStatus) => handleStatusChange(record.id, newStatus)}
                suffixIcon={null}
              >
                {InvoiceStatuses.map(s => (
                  <Option key={s} value={s}>
                    <Space>
                      {getStatusInfo(s).icon}
                      {s}
                    </Space>
                  </Option>
                ))}
              </Select>
            </div>
          );
        }
        
        return (
          <div style={{ textAlign: 'center' }}>
            <Tag 
              icon={statusInfo.icon}
              color={statusInfo.color}
              style={{
                borderRadius: '16px',
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: '600'
              }}
            >
              {status}
            </Tag>
          </div>
        );
      }
    },
    {
      title: 'Due Date',
      dataIndex: 'DateLimit',
      key: 'dueDate',
      width: 120,
      sorter: (a, b) => moment(a.DateLimit) - moment(b.DateLimit),
      render: (date, record) => {
        const overdue = isOverdue(record);
        
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '13px', fontWeight: '500' }}>
              {moment(date).format('DD MMM')}
            </div>
            <div style={{ fontSize: '11px', color: '#8c8c8c' }}>
              {moment(date).format('YYYY')}
            </div>
            {overdue && (
              <div style={{ fontSize: '10px', color: '#ff4d4f', marginTop: '2px' }}>
                OVERDUE
              </div>
            )}
          </div>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      render: (_, record) => {
        const canEdit = canEditInvoice(record);
        
        const menuItems = [
          {
            key: 'view',
            label: 'View Details',
            icon: <EyeOutlined />,
            onClick: () => onView(record)
          }
        ];

        if (record.paymentUrl) {
          menuItems.push({
            key: 'pay',
            label: 'Pay Now',
            icon: <CreditCardOutlined />,
            onClick: () => handlePayNow(record)
          });
        }

        if (canEdit) {
          menuItems.push(
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
          );
        }
        
        return (
          <Space>
            {record.paymentUrl && (
              <Tooltip title="Pay Now">
                <Button
                  type="primary"
                  size="small"
                  icon={<CreditCardOutlined />}
                  onClick={() => handlePayNow(record)}
                  style={{
                    background: 'linear-gradient(45deg, #52c41a, #389e0d)',
                    border: 'none',
                    borderRadius: '6px'
                  }}
                />
              </Tooltip>
            )}
            <Dropdown
              menu={{ items: menuItems }}
              trigger={['click']}
            >
              <Button type="text" icon={<MoreOutlined />} size="small" />
            </Dropdown>
          </Space>
        );
      }
    }
  ];

  // Calculate statistics
  const totalAmount = filteredInvoices.reduce((sum, invoice) => sum + (invoice.amount || 0), 0);
  const pendingCount = filteredInvoices.filter(invoice => invoice.Status === 'Pending').length;
  const paidCount = filteredInvoices.filter(invoice => invoice.Status === 'Paid').length;
  const overdueCount = filteredInvoices.filter(invoice => isOverdue(invoice)).length;

  // Row selection
  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
  };

  if (invoices.length === 0 && !loading) {
    return (
      <Card>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span>
              No invoices found. <br />
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={onRefresh}
                style={{ marginTop: 16 }}
              >
                Create Your First Invoice
              </Button>
            </span>
          }
        />
      </Card>
    );
  }

  return (
    <div>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Search
              placeholder="Search invoices..."
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
              {InvoiceStatuses.map(status => (
                <Option key={status} value={status}>
                  <Space>
                    {getStatusInfo(status).icon}
                    {status}
                  </Space>
                </Option>
              ))}
            </Select>
          </Col>
          
          <Col xs={24} sm={8}>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder={['Start Date', 'End Date']}
              style={{ width: '100%' }}
              size="middle"
            />
          </Col>
        </Row>
      </Card>

      {/* Invoices Table */}
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
          dataSource={filteredInvoices}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
          scroll={{ x: 900 }}
          size="large"
          showHeader={true}
          rowClassName={(record, index) => {
            const overdue = isOverdue(record);
            if (overdue) return 'table-row-overdue';
            return index % 2 === 0 ? 'table-row-light' : 'table-row-dark';
          }}
          pagination={{
            total: filteredInvoices.length,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `Showing ${range[0]}-${range[1]} of ${total} invoices`,
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
          .table-row-overdue {
            background-color: #fff2f0;
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

export default SellerInvoiceList;
