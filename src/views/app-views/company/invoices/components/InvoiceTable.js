// components/InvoiceTable.js
import React, { useState, useEffect } from 'react';
import { Table, Tag, Card, Button, Space, Modal, Badge, Tooltip, message, DatePicker, Form, Input, Select } from 'antd';
import {
  DollarOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  LinkOutlined,
  ExclamationOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { InvoiceStatus } from 'models/InvoiceModel';
import InvoiceService from 'services/firebase/InvoiceService';
import UserService from 'services/firebase/UserService';
import dayjs from 'dayjs';

const InvoiceTable = ({ invoices = [], loading, fetchInvoices, users = [], onViewDetails, onEdit, onDelete }) => {
  const [processingId, setProcessingId] = useState(null);
  const [creatorCache, setCreatorCache] = useState({});
  const [markPaidModalVisible, setMarkPaidModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [form] = Form.useForm();

  // Load creator information for invoices
  useEffect(() => {
    const loadCreators = async () => {
      const creatorsToFetch = invoices
        .map(invoice => invoice.creator_id)
        .filter(id => id && !creatorCache[id] && !users.find(user => user.id === id));
      
      const uniqueCreatorIds = Array.from(new Set(creatorsToFetch));
      
      if (uniqueCreatorIds.length === 0) return;
      
      const newCache = {...creatorCache};
      
      await Promise.all(uniqueCreatorIds.map(async (creatorId) => {
        try {
          const userData = await UserService.getUserById(creatorId);
          if (userData) {
            newCache[creatorId] = userData;
          }
        } catch (error) {
          console.error(`Error fetching creator ${creatorId}:`, error);
        }
      }));
      
      setCreatorCache(newCache);
    };
    
    loadCreators();
  }, [invoices, creatorCache]);

  // Format date from Firestore timestamp
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    try {
      let date;
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        date = new Date(timestamp);
      } else {
        date = new Date(timestamp);
      }
      
      if (isNaN(date.getTime())) return 'N/A';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  // Format currency amount
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  // Get creator name from user ID
  const getCreatorName = (creatorId) => {
    if (!creatorId) return 'Unknown';
    
    if (creatorCache[creatorId]) {
      const creator = creatorCache[creatorId];
      return `${creator.firstname || creator.firstName || ''} ${creator.lastname || creator.lastName || ''}`.trim() || 'Unknown';
    }
    
    const creator = users.find(user => user.id === creatorId);
    if (creator) {
      return `${creator.firstname || creator.firstName || ''} ${creator.lastname || creator.lastName || ''}`.trim() || 'Unknown';
    }
    
    return creatorId ? 'Loading...' : 'Unknown';
  };

  // Get department label
  const getDepartmentLabel = (department) => {
    const labels = {
      'office_supply': { text: 'Office Supply', icon: '🏢' },
      'marketing_expense': { text: 'Marketing Expense', icon: '📊' },
      'office_operations': { text: 'Office Operations', icon: '⚙️' },
      'general': { text: 'General', icon: '📋' }
    };
    const dept = labels[department];
    return dept ? `${dept.icon} ${dept.text}` : department || 'N/A';
  };

  // Calculate days remaining until due date
  const getDaysRemaining = (dateLimit) => {
    if (!dateLimit) return null;
    
    try {
      const dueDate = dateLimit.toDate ? dateLimit.toDate() : new Date(dateLimit);
      const today = new Date();
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (error) {
      return null;
    }
  };

  // Check if invoice is due soon (10 days or less)
  const isInvoiceDueSoon = (dateLimit) => {
    const daysRemaining = getDaysRemaining(dateLimit);
    return daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 10;
  };

  // Check if invoice is overdue
  const isInvoiceOverdue = (dateLimit) => {
    const daysRemaining = getDaysRemaining(dateLimit);
    return daysRemaining !== null && daysRemaining < 0;
  };

  // Helper function to get payment date from invoice
  const getDefaultPaymentDate = (invoice) => {
    // If invoice has a paymentDate, use it
    if (invoice.paymentDate) {
      try {
        let date;
        if (invoice.paymentDate.toDate && typeof invoice.paymentDate.toDate === 'function') {
          date = invoice.paymentDate.toDate();
        } else if (invoice.paymentDate instanceof Date) {
          date = invoice.paymentDate;
        } else {
          date = new Date(invoice.paymentDate);
        }
        if (!isNaN(date.getTime())) {
          return dayjs(date);
        }
      } catch (error) {
        console.error('Error parsing payment date:', error);
      }
    }
    // Default to today
    return dayjs();
  };

  // Open mark as paid modal
  const showMarkAsPaidModal = (invoice) => {
    setSelectedInvoice(invoice);
    
    // Get the default payment date
    const defaultDate = getDefaultPaymentDate(invoice);
    
    form.setFieldsValue({
      paymentDate: defaultDate,
      paymentMethod: 'OTHER',
      notes: '',
    });
    setMarkPaidModalVisible(true);
  };

  // Handle marking invoice as paid with custom date
  const handleMarkAsPaid = async () => {
    try {
      const values = await form.validateFields();
      const date = values.paymentDate ? values.paymentDate.toDate() : new Date();
      
      setProcessingId(selectedInvoice.id);
      await InvoiceService.markAsPaid(selectedInvoice.id, {
        method: values.paymentMethod || 'OTHER',
        paymentDate: date,
        notes: values.notes || '',
      });
      
      message.success('Invoice marked as paid successfully');
      setMarkPaidModalVisible(false);
      setSelectedInvoice(null);
      form.resetFields();
      fetchInvoices();
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      message.error('Failed to mark invoice as paid: ' + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  // Handle marking invoice as missed
  const handleMarkAsMissed = async (invoice) => {
    try {
      setProcessingId(invoice.id);
      await InvoiceService.update(invoice.id, {
        Status: InvoiceStatus.MISSED,
        LastUpdate: new Date()
      });
      message.warning('Invoice marked as missed');
      fetchInvoices();
    } catch (error) {
      console.error('Error marking invoice as missed:', error);
    } finally {
      setProcessingId(null);
    }
  };

  // Handle opening payment URL
  const handleOpenPaymentUrl = (url) => {
    if (!url) {
      message.error('No payment URL provided');
      return;
    }
    window.open(url, '_blank');
  };

  // Set up table columns
  const columns = [
    {
      title: 'Invoice #',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <span className="font-weight-bold">{text || 'N/A'}</span>
          <small style={{ color: '#8c8c8c' }}>ID: {record.id?.substring(0, 8)}</small>
        </Space>
      ),
      sorter: (a, b) => (a.invoiceNumber || '').localeCompare(b.invoiceNumber || ''),
    },
    {
      title: 'Title',
      dataIndex: 'Title',
      key: 'title',
      render: (text) => text || 'N/A',
      sorter: (a, b) => (a.Title || '').localeCompare(b.Title || ''),
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      render: (department) => {
        const label = getDepartmentLabel(department);
        return <Tag color="blue">{label}</Tag>;
      },
      filters: [
        { text: '🏢 Office Supply', value: 'office_supply' },
        { text: '📊 Marketing Expense', value: 'marketing_expense' },
        { text: '⚙️ Office Operations', value: 'office_operations' },
        { text: '📋 General', value: 'general' }
      ],
      onFilter: (value, record) => record.department === value,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (text) => formatCurrency(text),
      sorter: (a, b) => (a.amount || 0) - (b.amount || 0),
    },
    {
      title: 'Status',
      dataIndex: 'Status',
      key: 'status',
      render: (status, record) => {
        let color = 'default';
        let icon = null;
        
        switch(status) {
          case InvoiceStatus.PAID:
            color = 'success';
            icon = <CheckCircleOutlined />;
            break;
          case InvoiceStatus.PENDING:
            color = isInvoiceOverdue(record.DateLimit) ? 'error' : 'processing';
            icon = isInvoiceOverdue(record.DateLimit) ? 
              <ExclamationCircleOutlined /> : <ClockCircleOutlined />;
            break;
          case InvoiceStatus.MISSED:
            color = 'error';
            icon = <ExclamationCircleOutlined />;
            break;
          case InvoiceStatus.CANCELLED:
            color = 'default';
            icon = <StopOutlined />;
            break;
          default:
            color = 'default';
        }

        if (status === InvoiceStatus.PENDING && isInvoiceDueSoon(record.DateLimit)) {
          const daysRemaining = getDaysRemaining(record.DateLimit);
          return (
            <Space>
              <Badge dot={true} color="red">
                <Tag color={color} icon={icon}>
                  {status}
                </Tag>
              </Badge>
              <Tooltip title={`Due in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`}>
                <ExclamationOutlined style={{ color: '#ff4d4f' }} />
              </Tooltip>
            </Space>
          );
        }

        return <Tag color={color} icon={icon}>{status}</Tag>;
      },
      filters: Object.values(InvoiceStatus).map(status => ({
        text: status,
        value: status,
      })),
      onFilter: (value, record) => record.Status === value,
    },
    {
      title: 'Created Date',
      dataIndex: 'CreationDate',
      key: 'creationDate',
      render: (date) => {
        const formatted = formatDate(date);
        return (
          <Space direction="vertical" size={0}>
            <span>{formatted}</span>
            {date && (
              <small style={{ color: '#8c8c8c' }}>
                <CalendarOutlined style={{ marginRight: 4 }} />
                {new Date(date.toDate ? date.toDate() : date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </small>
            )}
          </Space>
        );
      },
      sorter: (a, b) => {
        const dateA = a.CreationDate?.toDate?.() || new Date(a.CreationDate) || new Date(0);
        const dateB = b.CreationDate?.toDate?.() || new Date(b.CreationDate) || new Date(0);
        return dateA - dateB;
      },
      defaultSortOrder: 'descend',
    },
    {
      title: 'Payment Date',
      dataIndex: 'paymentDate',
      key: 'paymentDate',
      render: (date) => {
        if (!date) {
          return (
            <Tag color="default" icon={<ClockCircleOutlined />}>
              Not Paid
            </Tag>
          );
        }
        
        try {
          let dateObj;
          if (date.toDate && typeof date.toDate === 'function') {
            dateObj = date.toDate();
          } else if (date instanceof Date) {
            dateObj = date;
          } else if (typeof date === 'string' || typeof date === 'number') {
            dateObj = new Date(date);
          } else {
            dateObj = new Date(date);
          }
          
          if (isNaN(dateObj.getTime())) return 'N/A';
          
          const formattedDate = dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
          
          const formattedTime = dateObj.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          });
          
          return (
            <Space direction="vertical" size={0}>
              <span style={{ color: '#52c41a' }}>
                <CheckCircleOutlined style={{ marginRight: 4 }} />
                {formattedDate}
              </span>
              <small style={{ color: '#8c8c8c', fontSize: '11px' }}>
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                {formattedTime}
              </small>
            </Space>
          );
        } catch (error) {
          console.error('Error formatting payment date:', error);
          return 'N/A';
        }
      },
      sorter: (a, b) => {
        const dateA = a.paymentDate?.toDate?.() || new Date(a.paymentDate) || new Date(0);
        const dateB = b.paymentDate?.toDate?.() || new Date(b.paymentDate) || new Date(0);
        return dateA - dateB;
      },
    },
    {
      title: 'Due Date',
      dataIndex: 'DateLimit',
      key: 'dateLimit',
      render: (date, record) => {
        if (!date) return 'N/A';
        const formattedDate = formatDate(date);
        
        if (record.Status === InvoiceStatus.PENDING) {
          if (isInvoiceOverdue(date)) {
            return (
              <span style={{ color: '#ff4d4f' }}>
                <ExclamationCircleOutlined style={{ marginRight: 4 }} />
                {formattedDate}
              </span>
            );
          } else if (isInvoiceDueSoon(date)) {
            const daysRemaining = getDaysRemaining(date);
            return (
              <Tooltip title={`Due in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`}>
                <span style={{ color: '#faad14' }}>
                  <ExclamationOutlined style={{ marginRight: 4 }} />
                  {formattedDate}
                </span>
              </Tooltip>
            );
          }
        }
        return formattedDate;
      },
      sorter: (a, b) => {
        const dateA = a.DateLimit?.toDate?.() || new Date(a.DateLimit) || new Date(0);
        const dateB = b.DateLimit?.toDate?.() || new Date(b.DateLimit) || new Date(0);
        return dateA - dateB;
      },
    },
    {
      title: 'Creator',
      dataIndex: 'creator_id',
      key: 'creator',
      render: (creatorId) => getCreatorName(creatorId),
      filters: users.map(user => ({
        text: `${user.firstname || user.firstName || ''} ${user.lastname || user.lastName || ''}`.trim() || 'Unknown',
        value: user.id,
      })),
      onFilter: (value, record) => record.creator_id === value,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => {
        const isLoading = processingId === record.id;
        
        // Auto mark as missed if overdue
        if (
          record.Status === InvoiceStatus.PENDING && 
          isInvoiceOverdue(record.DateLimit) && 
          !isLoading
        ) {
          handleMarkAsMissed(record);
          return <span>Processing...</span>;
        }
        
        return (
          <Space size="small" wrap>
            {record.Status === InvoiceStatus.PENDING && (
              <Button 
                type="primary" 
                size="small" 
                icon={<CheckCircleOutlined />}
                onClick={() => showMarkAsPaidModal(record)}
                loading={isLoading}
              >
                Mark Paid
              </Button>
            )}
            
            {record.paymentUrl && (
              <Button 
                type="default" 
                size="small" 
                icon={<LinkOutlined />}
                onClick={() => handleOpenPaymentUrl(record.paymentUrl)}
              >
                Pay
              </Button>
            )}
            
            <Button 
              type="default" 
              size="small" 
              icon={<DollarOutlined />}
              onClick={() => onViewDetails?.(record)}
            >
              Details
            </Button>
            
            <Button 
              type="default" 
              size="small" 
              icon={<EditOutlined />}
              onClick={() => onEdit?.(record)}
              style={{ color: '#1890ff' }}
            >
              Edit
            </Button>
            
            <Button 
              type="default" 
              size="small" 
              icon={<DeleteOutlined />}
              onClick={() => onDelete?.(record)}
              style={{ color: '#ff4d4f' }}
              disabled={record.Status === InvoiceStatus.PAID}
            >
              Delete
            </Button>
          </Space>
        );
      },
    },
  ];

  // Sort invoices by creation date (latest first) before displaying
  const sortedInvoices = [...invoices].sort((a, b) => {
    const dateA = a.CreationDate?.toDate?.() || new Date(a.CreationDate) || new Date(0);
    const dateB = b.CreationDate?.toDate?.() || new Date(b.CreationDate) || new Date(0);
    return dateB - dateA;
  });

  return (
    <>
      <Card>
        <Table 
          columns={columns}
          dataSource={sortedInvoices}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} invoices`
          }}
        />
      </Card>

      {/* Mark as Paid Modal with Date Picker - Allows any date */}
      <Modal
        title="Mark Invoice as Paid"
        open={markPaidModalVisible}
        onCancel={() => {
          setMarkPaidModalVisible(false);
          setSelectedInvoice(null);
          form.resetFields();
        }}
        onOk={handleMarkAsPaid}
        okText="Mark as Paid"
        cancelText="Cancel"
        okButtonProps={{ loading: processingId === selectedInvoice?.id }}
        width={500}
        destroyOnClose
      >
        {selectedInvoice && (
          <div style={{ 
            marginBottom: 16, 
            padding: '12px', 
            background: '#f5f5f5', 
            borderRadius: '8px',
            border: '1px solid #e8e8e8'
          }}>
            <p style={{ marginBottom: 4 }}>
              <strong>Invoice:</strong> {selectedInvoice.invoiceNumber || 'N/A'}
            </p>
            <p style={{ marginBottom: 4 }}>
              <strong>Title:</strong> {selectedInvoice.Title || 'N/A'}
            </p>
            <p style={{ marginBottom: 0 }}>
              <strong>Amount:</strong> {formatCurrency(selectedInvoice.amount || 0)}
            </p>
            {selectedInvoice.paymentDate && (
              <p style={{ marginBottom: 0, marginTop: 4, fontSize: '12px', color: '#52c41a' }}>
                <CheckCircleOutlined style={{ marginRight: 4 }} />
                Current Payment Date: {formatDate(selectedInvoice.paymentDate)}
              </p>
            )}
          </div>
        )}
        
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            paymentDate: dayjs(),
            paymentMethod: 'OTHER',
            notes: '',
          }}
        >
          <Form.Item
            name="paymentDate"
            label={
              <span>
                <CalendarOutlined style={{ marginRight: 8 }} />
                Select Payment Date
              </span>
            }
            rules={[{ required: true, message: 'Please select payment date' }]}
            extra="Select the date when the payment was received (can be past, present, or future)"
          >
            <DatePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              placeholder="Select payment date"
              suffixIcon={<CalendarOutlined />}
              // No disabledDate - allows any date (past, present, future)
              allowClear={false}
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="paymentMethod"
            label="Payment Method"
            rules={[{ required: true, message: 'Please select payment method' }]}
          >
            <Select 
              placeholder="Select payment method"
              size="large"
            >
              <Select.Option value="CASH">Cash</Select.Option>
              <Select.Option value="BANK_TRANSFER">Bank Transfer</Select.Option>
              <Select.Option value="CREDIT_CARD">Credit Card</Select.Option>
              <Select.Option value="DEBIT_CARD">Debit Card</Select.Option>
              <Select.Option value="CHEQUE">Cheque</Select.Option>
              <Select.Option value="ONLINE">Online Payment</Select.Option>
              <Select.Option value="OTHER">Other</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="notes"
            label="Payment Notes (Optional)"
          >
            <Input.TextArea 
              placeholder="Add any notes about this payment..."
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default InvoiceTable;