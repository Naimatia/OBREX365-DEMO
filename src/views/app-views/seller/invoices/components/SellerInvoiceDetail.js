// @ts-nocheck
import React, { useState } from 'react';
import {
  Drawer,
  Card,
  Typography,
  Space,
  Tag,
  Button,
  Descriptions,
  Timeline,
  Input,
  Form,
  message,
  Divider,
  Row,
  Col,
  Tooltip,
  Alert
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  DollarOutlined,
  CalendarOutlined,
  LinkOutlined,
  PlusOutlined,
  SendOutlined,
  CreditCardOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

/**
 * Invoice detail drawer component
 */
const SellerInvoiceDetail = ({
  visible,
  onClose,
  invoice,
  onEdit,
  onDelete,
  onAddNote,
  canEdit = true
}) => {
  const [noteForm] = Form.useForm();
  const [addingNote, setAddingNote] = useState(false);

  // Handle adding note
  const handleAddNote = async () => {
    try {
      const values = await noteForm.validateFields();
      setAddingNote(true);
      await onAddNote(invoice.id, values.note);
      noteForm.resetFields();
      message.success('Note added successfully');
    } catch (error) {
      message.error('Failed to add note');
    } finally {
      setAddingNote(false);
    }
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

  // Handle payment
  const handlePayNow = () => {
    if (invoice?.paymentUrl) {
      window.open(invoice.paymentUrl, '_blank');
    } else {
      message.warning('Payment URL not available');
    }
  };

  // Check if invoice is overdue
  const isOverdue = () => {
    if (!invoice?.DateLimit) return false;
    return moment().isAfter(moment(invoice.DateLimit)) && invoice.Status === 'Pending';
  };

  if (!invoice) return null;

  const statusInfo = getStatusInfo(invoice.Status);
  const overdue = isOverdue();

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <FileTextOutlined style={{ fontSize: 20, color: '#1890ff', marginRight: 8 }} />
          <span>Invoice Details</span>
        </div>
      }
      width={600}
      onClose={onClose}
      open={visible}
      bodyStyle={{ padding: 0 }}
    >
      <div style={{ padding: '24px' }}>
        {/* Status Alert */}
        {overdue && (
          <Alert
            message="Invoice Overdue"
            description="This invoice has passed its due date"
            type="error"
            icon={<ClockCircleOutlined />}
            style={{ marginBottom: '16px', borderRadius: '8px' }}
            action={
              invoice.paymentUrl && (
                <Button size="small" danger onClick={handlePayNow}>
                  Pay Now
                </Button>
              )
            }
          />
        )}

        {/* Header Card */}
        <Card 
          style={{ 
            marginBottom: '16px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none'
          }}
          bodyStyle={{ padding: '20px' }}
        >
          <Row justify="space-between" align="top">
            <Col span={16}>
              <Title level={4} style={{ color: 'white', margin: 0, marginBottom: '8px' }}>
                {invoice.Title}
              </Title>
              <div style={{ marginBottom: '12px' }}>
                <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: '32px', fontWeight: '700' }}>
                  {formatCurrency(invoice.amount)}
                </Text>
              </div>
              <Space>
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
                  {invoice.Status}
                </Tag>
                {overdue && (
                  <Tag color="red" style={{ borderRadius: '16px', padding: '4px 12px' }}>
                    OVERDUE
                  </Tag>
                )}
              </Space>
            </Col>
            <Col span={8} style={{ textAlign: 'right' }}>
              <Space direction="vertical" size="small">
                {invoice.paymentUrl && (
                  <Button
                    type="primary"
                    size="large"
                    icon={<CreditCardOutlined />}
                    onClick={handlePayNow}
                    style={{
                      background: 'linear-gradient(45deg, #52c41a, #389e0d)',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(82, 196, 26, 0.3)'
                    }}
                  >
                    Pay Now
                  </Button>
                )}
                {canEdit && (
                  <Space>
                    <Tooltip title="Edit Invoice">
                      <Button
                        icon={<EditOutlined />}
                        onClick={() => onEdit(invoice)}
                        style={{ borderRadius: '8px' }}
                      />
                    </Tooltip>
                    <Tooltip title="Delete Invoice">
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => onDelete(invoice.id)}
                        style={{ borderRadius: '8px' }}
                      />
                    </Tooltip>
                  </Space>
                )}
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Invoice Information */}
        <Card 
          title={
            <span>
              <FileTextOutlined style={{ marginRight: 8, color: '#1890ff' }} />
              Invoice Information
            </span>
          }
          style={{ marginBottom: '16px', borderRadius: '12px' }}
        >
          <Descriptions column={1} size="middle">
            <Descriptions.Item 
              label={
                <span style={{ fontWeight: '600' }}>
                  <FileTextOutlined style={{ marginRight: 4 }} /> Description
                </span>
              }
            >
              <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {invoice.description}
              </Paragraph>
            </Descriptions.Item>
            
            <Descriptions.Item 
              label={
                <span style={{ fontWeight: '600' }}>
                  <DollarOutlined style={{ marginRight: 4 }} /> Amount
                </span>
              }
            >
              <Text style={{ fontSize: '18px', fontWeight: '700', color: '#52c41a' }}>
                {formatCurrency(invoice.amount)}
              </Text>
            </Descriptions.Item>
            
            <Descriptions.Item 
              label={
                <span style={{ fontWeight: '600' }}>
                  <CalendarOutlined style={{ marginRight: 4 }} /> Due Date
                </span>
              }
            >
              <Space>
                <Text>{moment(invoice.DateLimit).format('DD MMMM YYYY')}</Text>
                {overdue && <Tag color="red" size="small">OVERDUE</Tag>}
              </Space>
            </Descriptions.Item>
            
            <Descriptions.Item 
              label={
                <span style={{ fontWeight: '600' }}>
                  <CalendarOutlined style={{ marginRight: 4 }} /> Created
                </span>
              }
            >
              {moment(invoice.CreationDate).format('DD MMMM YYYY, HH:mm')}
            </Descriptions.Item>
            
            <Descriptions.Item 
              label={
                <span style={{ fontWeight: '600' }}>
                  <CalendarOutlined style={{ marginRight: 4 }} /> Last Updated
                </span>
              }
            >
              {moment(invoice.LastUpdate).format('DD MMMM YYYY, HH:mm')}
            </Descriptions.Item>
            
            {invoice.paymentUrl && (
              <Descriptions.Item 
                label={
                  <span style={{ fontWeight: '600' }}>
                    <LinkOutlined style={{ marginRight: 4 }} /> Payment URL
                  </span>
                }
              >
                <Button 
                  type="link" 
                  icon={<LinkOutlined />}
                  onClick={handlePayNow}
                  style={{ padding: 0 }}
                >
                  Open Payment Page
                </Button>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        {/* Notes Section */}
        <Card 
          title={
            <span>
              <FileTextOutlined style={{ marginRight: 8, color: '#722ed1' }} />
              Notes & Timeline
            </span>
          }
          style={{ borderRadius: '12px' }}
        >
          {/* Add Note Form */}
          <Form form={noteForm} style={{ marginBottom: '16px' }}>
            <Form.Item
              name="note"
              rules={[{ required: true, message: 'Please enter a note' }]}
            >
              <TextArea 
                rows={2}
                placeholder="Add a note about this invoice..."
                style={{ borderRadius: '8px' }}
              />
            </Form.Item>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleAddNote}
              loading={addingNote}
              style={{ borderRadius: '8px' }}
            >
              Add Note
            </Button>
          </Form>

          <Divider />

          {/* Notes Timeline */}
          {invoice.Notes && invoice.Notes.length > 0 ? (
            <Timeline>
              {invoice.Notes.map((note, index) => (
                <Timeline.Item 
                  key={note.id || index}
                  color="#1890ff"
                  dot={<FileTextOutlined style={{ fontSize: '16px' }} />}
                >
                  <div style={{ marginBottom: '4px' }}>
                    <Text style={{ fontSize: '13px', color: '#8c8c8c' }}>
                      {moment(note.timestamp?.toDate?.() || note.timestamp).format('DD MMM YYYY, HH:mm')}
                    </Text>
                  </div>
                  <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {note.text}
                  </Paragraph>
                </Timeline.Item>
              ))}
            </Timeline>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#8c8c8c' }}>
              <FileTextOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
              <br />
              No notes added yet
            </div>
          )}
        </Card>
      </div>
    </Drawer>
  );
};

export default SellerInvoiceDetail;
