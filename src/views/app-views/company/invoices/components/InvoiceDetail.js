import React, { useState, useEffect } from 'react';
import { 
  Modal, Typography, Descriptions, Card, Row, Col, 
  Tag, Space, Button, Divider, Alert, Skeleton,
  message, Timeline, Badge
} from 'antd';
import {
  FileTextOutlined, CalendarOutlined, UserOutlined,
  DollarOutlined, CheckCircleOutlined, ClockCircleOutlined,
  ExclamationCircleOutlined, PrinterOutlined, LinkOutlined,
  WarningOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import moment from 'moment';
import { InvoiceStatus } from 'models/InvoiceModel';
import InvoiceService from 'services/firebase/InvoiceService';
import UserService from 'services/firebase/UserService';

const { Title, Text } = Typography;

/**
 * Enhanced Invoice Detail Component
 * Displays complete invoice information in a modal or standalone view
 */
const InvoiceDetail = ({ 
  visible, 
  onClose, 
  invoice, 
  loading = false,
  onMarkAsPaid,
  onOpenPaymentUrl 
}) => {
  const [creatorInfo, setCreatorInfo] = useState(null);
  const [loadingCreator, setLoadingCreator] = useState(false);

  // Load creator information when invoice changes
  useEffect(() => {
    if (invoice?.creator_id) {
      loadCreatorInfo(invoice.creator_id);
    }
  }, [invoice]);

  const loadCreatorInfo = async (creatorId) => {
    if (!creatorId) return;
    
    setLoadingCreator(true);
    try {
      const userData = await UserService.getUserById(creatorId);
      setCreatorInfo(userData);
    } catch (error) {
      console.error('Error fetching creator info:', error);
    } finally {
      setLoadingCreator(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    const dateObj = date?.toDate?.() || new Date(date);
    return moment(dateObj).format('MMMM DD, YYYY HH:mm');
  };

  // Get status configuration
  const getStatusConfig = (status) => {
    switch (status) {
      case InvoiceStatus.PAID:
        return {
          color: '#52c41a',
          icon: <CheckCircleOutlined />,
          text: 'Paid',
          bgColor: 'rgba(82, 196, 26, 0.1)'
        };
      case InvoiceStatus.PENDING:
        return {
          color: '#faad14',
          icon: <ClockCircleOutlined />,
          text: 'Pending',
          bgColor: 'rgba(250, 173, 20, 0.1)'
        };
      case InvoiceStatus.MISSED:
        return {
          color: '#f5222d',
          icon: <ExclamationCircleOutlined />,
          text: 'Missed',
          bgColor: 'rgba(245, 34, 45, 0.1)'
        };
      default:
        return {
          color: '#8c8c8c',
          icon: <InfoCircleOutlined />,
          text: status || 'Unknown',
          bgColor: 'rgba(140, 140, 140, 0.1)'
        };
    }
  };

  // Calculate days remaining
  const getDaysRemaining = (dateLimit) => {
    if (!dateLimit) return null;
    const dueDate = dateLimit?.toDate?.() || new Date(dateLimit);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get priority alert
  const getPriorityAlert = () => {
    if (!invoice || invoice.Status !== InvoiceStatus.PENDING) return null;
    
    const daysRemaining = getDaysRemaining(invoice.DateLimit);
    if (daysRemaining === null) return null;

    if (daysRemaining < 0) {
      return (
        <Alert
          message="Invoice Overdue"
          description={`This invoice is ${Math.abs(daysRemaining)} day(s) overdue. Immediate action required.`}
          type="error"
          icon={<WarningOutlined />}
          showIcon
          style={{ marginBottom: 16 }}
        />
      );
    } else if (daysRemaining <= 10) {
      return (
        <Alert
          message="Invoice Due Soon"
          description={`This invoice is due in ${daysRemaining} day(s). Please follow up.`}
          type="warning"
          icon={<CalendarOutlined />}
          showIcon
          style={{ marginBottom: 16 }}
        />
      );
    }
    return null;
  };

  if (!invoice) return null;

  const statusConfig = getStatusConfig(invoice.Status);
  const priorityAlert = getPriorityAlert();

  return (
    <Modal
      visible={visible}
      onCancel={onClose}
      width={900}
      footer={null}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #1890ff 0%, #13c2c2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FileTextOutlined style={{ color: '#fff', fontSize: '20px' }} />
          </div>
          <div>
            <Title level={4} style={{ margin: 0 }}>Invoice Details</Title>
            <Text type="secondary">#{invoice.id?.substring(0, 8)}</Text>
          </div>
        </div>
      }
      bodyStyle={{ padding: '24px' }}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <div>
          {priorityAlert}

          {/* Header with Status and Amount */}
          <Card style={{ marginBottom: 24, background: statusConfig.bgColor, border: `2px solid ${statusConfig.color}` }}>
            <Row gutter={24} align="middle">
              <Col span={12}>
                <Space direction="vertical" size={4}>
                  <Text strong style={{ fontSize: '16px' }}>{invoice.Title}</Text>
                  <Space>
                    <Tag 
                      style={{
                        backgroundColor: statusConfig.color,
                        color: '#fff',
                        border: 'none',
                        fontWeight: '600',
                        padding: '4px 12px',
                        borderRadius: '6px'
                      }}
                      icon={statusConfig.icon}
                    >
                      {statusConfig.text}
                    </Tag>
                  </Space>
                </Space>
              </Col>
              <Col span={12} style={{ textAlign: 'right' }}>
                <Space direction="vertical" size={4} style={{ alignItems: 'flex-end' }}>
                  <Text type="secondary" style={{ fontSize: '14px' }}>Total Amount</Text>
                  <Title level={2} style={{ margin: 0, color: statusConfig.color }}>
                    {formatCurrency(invoice.amount)}
                  </Title>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* Invoice Information */}
          <Card title="Invoice Information" style={{ marginBottom: 24 }}>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="Invoice ID" span={1}>
                <Text code>#{invoice.id?.substring(0, 8)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Title" span={1}>
                <Text strong>{invoice.Title}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Amount" span={1}>
                <Text strong style={{ color: '#1890ff', fontSize: '16px' }}>
                  {formatCurrency(invoice.amount)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Status" span={1}>
                <Tag 
                  style={{
                    backgroundColor: statusConfig.color,
                    color: '#fff',
                    border: 'none',
                    fontWeight: '600',
                    padding: '4px 12px',
                    borderRadius: '6px'
                  }}
                  icon={statusConfig.icon}
                >
                  {statusConfig.text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Creation Date" span={1}>
                <Space>
                  <CalendarOutlined style={{ color: '#8c8c8c' }} />
                  {formatDate(invoice.CreationDate)}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Due Date" span={1}>
                <Space>
                  <CalendarOutlined style={{ color: '#8c8c8c' }} />
                  {formatDate(invoice.DateLimit)}
                  {invoice.Status === InvoiceStatus.PENDING && getDaysRemaining(invoice.DateLimit) !== null && (
                    <Badge 
                      count={`${getDaysRemaining(invoice.DateLimit)} days`} 
                      style={{ 
                        backgroundColor: getDaysRemaining(invoice.DateLimit) < 0 ? '#f5222d' : '#faad14' 
                      }} 
                    />
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Creator" span={2}>
                <Space>
                  <UserOutlined style={{ color: '#8c8c8c' }} />
                  {loadingCreator ? (
                    <Skeleton.Input size="small" active />
                  ) : (
                    <Text>{creatorInfo ? `${creatorInfo.firstname || ''} ${creatorInfo.lastname || ''}` : 'Unknown'}</Text>
                  )}
                </Space>
              </Descriptions.Item>
              {invoice.Description && (
                <Descriptions.Item label="Description" span={2}>
                  <Text>{invoice.Description}</Text>
                </Descriptions.Item>
              )}
              {invoice.paymentUrl && (
                <Descriptions.Item label="Payment URL" span={2}>
                  <Button 
                    type="link" 
                    icon={<LinkOutlined />} 
                    onClick={() => onOpenPaymentUrl?.(invoice.paymentUrl)}
                    style={{ padding: 0 }}
                  >
                    Open Payment Link
                  </Button>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* Timeline */}
          <Card title="Invoice Timeline" style={{ marginBottom: 24 }}>
            <Timeline>
              <Timeline.Item
                dot={<FileTextOutlined style={{ color: '#1890ff' }} />}
                color="blue"
              >
                <Text strong>Invoice Created</Text>
                <br />
                <Text type="secondary">{formatDate(invoice.CreationDate)}</Text>
              </Timeline.Item>
              
              {invoice.Status === InvoiceStatus.PAID && (
                <Timeline.Item
                  dot={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                  color="green"
                >
                  <Text strong>Payment Received</Text>
                  <br />
                  <Text type="secondary">{formatDate(invoice.LastUpdate)}</Text>
                </Timeline.Item>
              )}
              
              {invoice.Status === InvoiceStatus.MISSED && (
                <Timeline.Item
                  dot={<ExclamationCircleOutlined style={{ color: '#f5222d' }} />}
                  color="red"
                >
                  <Text strong>Payment Missed</Text>
                  <br />
                  <Text type="secondary">{formatDate(invoice.LastUpdate)}</Text>
                </Timeline.Item>
              )}
              
              <Timeline.Item
                dot={<CalendarOutlined style={{ color: '#faad14' }} />}
                color="orange"
              >
                <Text strong>Due Date</Text>
                <br />
                <Text type="secondary">{formatDate(invoice.DateLimit)}</Text>
              </Timeline.Item>
            </Timeline>
          </Card>

          {/* Actions */}
          <Card>
            <Space size="middle" wrap>
              {invoice.Status === InvoiceStatus.PENDING && onMarkAsPaid && (
                <Button 
                  type="primary" 
                  icon={<CheckCircleOutlined />}
                  onClick={() => onMarkAsPaid(invoice)}
                  size="large"
                >
                  Mark as Paid
                </Button>
              )}
              
              {invoice.paymentUrl && onOpenPaymentUrl && (
                <Button 
                  type="default" 
                  icon={<LinkOutlined />}
                  onClick={() => onOpenPaymentUrl(invoice.paymentUrl)}
                  size="large"
                >
                  Open Payment Link
                </Button>
              )}
              
              <Button 
                type="default" 
                icon={<PrinterOutlined />}
                onClick={() => window.print()}
                size="large"
              >
                Print Invoice
              </Button>
            </Space>
          </Card>
        </div>
      )}
    </Modal>
  );
};

export default InvoiceDetail;
