import React, { useState, useEffect } from 'react';
import { Table, Tag, Card, Button, Space, Modal, Badge, Tooltip, message } from 'antd';
import {
  DollarOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  LinkOutlined,
  ExclamationOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { InvoiceStatus } from 'models/InvoiceModel';
import InvoiceService from 'services/firebase/InvoiceService';
import UserService from 'services/firebase/UserService';

/**
 * Component for displaying invoices in a table
 */
const InvoiceTable = ({ invoices = [], loading, fetchInvoices, users = [], onViewDetails, onEdit, onDelete }) => {
  const [processingId, setProcessingId] = useState(null);
  const [creatorCache, setCreatorCache] = useState({});

  // Load creator information for invoices
  useEffect(() => {
    const loadCreators = async () => {
      const creatorsToFetch = invoices
        .map(invoice => invoice.creator_id)
        .filter(id => id && !creatorCache[id] && !users.find(user => user.id === id));
      
      // Remove duplicates
      const uniqueCreatorIds = Array.from(new Set(creatorsToFetch));
      
      if (uniqueCreatorIds.length === 0) return;
      
      const newCache = {...creatorCache};
      
      // Fetch each creator in parallel
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
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
    // First check the cache
    if (creatorCache[creatorId]) {
      const creator = creatorCache[creatorId];
      return `${creator.firstname || creator.firstName || ''} ${creator.lastname || creator.lastName || ''}`;
    }
    
    // Then check the users prop
    const creator = users.find(user => user.id === creatorId);
    if (creator) {
      return `${creator.firstname || creator.firstName || ''} ${creator.lastname || creator.lastName || ''}`;
    }
    
    // If we can't find the user yet, show loading text
    return creatorId ? `Loading user info...` : 'Unknown';
  };

  // Calculate days remaining until due date
  const getDaysRemaining = (dateLimit) => {
    if (!dateLimit) return null;
    
    const dueDate = dateLimit.toDate ? dateLimit.toDate() : new Date(dateLimit);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime(); // Use getTime() for proper number type
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
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

  // Handle marking invoice as paid
  const handleMarkAsPaid = async (invoice) => {
    Modal.confirm({
      title: 'Mark as Paid',
      icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      content: 'Are you sure you want to mark this invoice as paid?',
      okText: 'Yes',
      cancelText: 'No',
      onOk: async () => {
        try {
          setProcessingId(invoice.id);
          await InvoiceService.update(invoice.id, {
            Status: InvoiceStatus.PAID,
            LastUpdate: new Date()
          });
          message.success('Invoice marked as paid successfully');
          fetchInvoices();
        } catch (error) {
          console.error('Error marking invoice as paid:', error);
          message.error('Failed to mark invoice as paid');
        } finally {
          setProcessingId(null);
        }
      }
    });
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
    
    // Open URL in a new tab
    window.open(url, '_blank');
  };

  // Set up table columns
  const columns = [
 {
    title: 'Title',
    dataIndex: 'Title',
    key: 'title',
    render: (text, record) => (
      <Space direction="vertical" size={0}>
        <span className="font-weight-bold">{text}</span>
        <small style={{ color: '#8c8c8c' }}>#{record.id?.substring(0, 8)}</small>
      </Space>
    ),
    sorter: (a, b) => a.Title.localeCompare(b.Title),
  },
  {
    title: 'Amount',
    dataIndex: 'amount',
    key: 'amount',
    render: (text) => formatCurrency(text),
    sorter: (a, b) => a.amount - b.amount,
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

        // Show warning indicator if due soon
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
    title: 'Created',
    dataIndex: 'CreationDate',
    key: 'creationDate',
    render: (date) => formatDate(date),
    sorter: (a, b) => {
      const dateA = a.CreationDate?.toDate?.() || new Date(a.CreationDate) || new Date(0);
      const dateB = b.CreationDate?.toDate?.() || new Date(b.CreationDate) || new Date(0);
      return dateA - dateB;
    },
  },
  {
    title: 'Due Date',
    dataIndex: 'DateLimit',
    key: 'dateLimit',
    render: (date, record) => {
      const formattedDate = formatDate(date);
      if (record.Status === InvoiceStatus.PENDING) {
        if (isInvoiceOverdue(date)) {
          return (
            <span style={{ color: '#ff4d4f' }}>
              {formattedDate} <ExclamationCircleOutlined />
            </span>
          );
        } else if (isInvoiceDueSoon(date)) {
          const daysRemaining = getDaysRemaining(date);
          return (
            <Tooltip title={`Due in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`}>
              <span style={{ color: '#faad14' }}>
                {formattedDate} <ExclamationOutlined />
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
      text: `${user.firstname || user.firstName || ''} ${user.lastname || user.lastName || ''}`,
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
          <Space size="small">
            {record.Status === InvoiceStatus.PENDING && (
              <Button 
                type="primary" 
                size="small" 
                icon={<CheckCircleOutlined />}
                onClick={() => handleMarkAsPaid(record)}
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

  return (
    <Card>
      <Table 
        columns={columns}
        dataSource={invoices}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} invoices`
        }}
      />
    </Card>
  );
};

export default InvoiceTable;
