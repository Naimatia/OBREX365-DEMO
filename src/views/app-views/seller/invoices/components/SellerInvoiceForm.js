// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  message,
  Button,
  Space,
  Row,
  Col,
  Typography,
  Card,
  Divider
} from 'antd';
import {
  DollarOutlined,
  CalendarOutlined,
  FileTextOutlined,
  LinkOutlined,
  SaveOutlined,
  CloseOutlined
} from '@ant-design/icons';
import moment from 'moment';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

// Invoice statuses
const InvoiceStatuses = ['Pending', 'Paid', 'Missed', 'Cancelled'];

/**
 * Form component for creating and editing invoices
 */
const SellerInvoiceForm = ({
  visible,
  onCancel,
  onSubmit,
  invoice = null,
  loading = false,
  userId,
  companyId
}) => {
  const [form] = Form.useForm();
  const [formLoading, setFormLoading] = useState(false);

  // Reset form when modal opens/closes or invoice changes
  useEffect(() => {
    if (visible) {
      if (invoice) {
        // Editing existing invoice
        form.setFieldsValue({
          Title: invoice.Title,
          description: invoice.description,
          amount: invoice.amount,
          Status: invoice.Status,
          DateLimit: invoice.DateLimit ? moment(invoice.DateLimit) : null,
          paymentUrl: invoice.paymentUrl
        });
      } else {
        // Creating new invoice
        form.resetFields();
        form.setFieldsValue({
          Status: 'Pending'
        });
      }
    }
  }, [visible, invoice, form]);

  // Handle form submission
  const handleSubmit = async () => {
    try {
      setFormLoading(true);
      const values = await form.validateFields();
      
      const invoiceData = {
        ...values,
        creator_id: userId,
        company_id: companyId,
        DateLimit: values.DateLimit ? values.DateLimit.toDate() : null
      };
      
      await onSubmit(invoiceData);
      form.resetFields();
    } catch (error) {
      console.error('Form validation failed:', error);
      message.error('Please check all required fields');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  // Format currency
  const formatCurrency = (value) => {
    if (!value) return 'AED 0';
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return '#faad14';
      case 'Paid':
        return '#52c41a';
      case 'Missed':
        return '#ff4d4f';
      case 'Cancelled':
        return '#8c8c8c';
      default:
        return '#1890ff';
    }
  };

  return (
    <Modal
      title={
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <FileTextOutlined style={{ fontSize: 24, color: '#1890ff', marginRight: 8 }} />
          <Title level={3} style={{ margin: 0, display: 'inline' }}>
            {invoice ? 'Edit Invoice' : 'Create New Invoice'}
          </Title>
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      width={800}
      centered
      footer={[
        <Button 
          key="cancel" 
          onClick={handleCancel}
          icon={<CloseOutlined />}
          size="large"
        >
          Cancel
        </Button>,
        <Button 
          key="submit" 
          type="primary" 
          loading={formLoading || loading}
          onClick={handleSubmit}
          icon={<SaveOutlined />}
          size="large"
          style={{
            background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
            border: 'none'
          }}
        >
          {invoice ? 'Update Invoice' : 'Create Invoice'}
        </Button>
      ]}
      bodyStyle={{ 
        padding: '24px',
        backgroundColor: '#fafafa'
      }}
    >
      <Card 
        style={{ 
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}
        bodyStyle={{ padding: '24px' }}
      >
        <Form
          form={form}
          layout="vertical"
          size="large"
          requiredMark={false}
        >
          <Row gutter={[24, 16]}>
            {/* Invoice Title */}
            <Col xs={24}>
              <Form.Item
                name="Title"
                label={
                  <span style={{ fontWeight: '600', fontSize: '14px' }}>
                    <FileTextOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                    Invoice Title
                  </span>
                }
                rules={[
                  { required: true, message: 'Please enter invoice title' },
                  { min: 3, message: 'Title must be at least 3 characters' }
                ]}
              >
                <Input 
                  placeholder="Enter invoice title (e.g., Service Invoice #001)"
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>
            </Col>

            {/* Description */}
            <Col xs={24}>
              <Form.Item
                name="description"
                label={
                  <span style={{ fontWeight: '600', fontSize: '14px' }}>
                    <FileTextOutlined style={{ marginRight: 8, color: '#722ed1' }} />
                    Description
                  </span>
                }
                rules={[
                  { required: true, message: 'Please enter description' }
                ]}
              >
                <TextArea 
                  rows={3}
                  placeholder="Describe the services or products provided..."
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>
            </Col>

            {/* Amount and Status Row */}
            <Col xs={24} sm={12}>
              <Form.Item
                name="amount"
                label={
                  <span style={{ fontWeight: '600', fontSize: '14px' }}>
                    <DollarOutlined style={{ marginRight: 8, color: '#52c41a' }} />
                    Amount (AED)
                  </span>
                }
                rules={[
                  { required: true, message: 'Please enter amount' },
                  { type: 'number', min: 1, message: 'Amount must be greater than 0' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%', borderRadius: '8px' }}
                  placeholder="0"
                  min={0}
                  step={1}
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value.replace(/AED\s?|(,*)/g, '')}
                  addonBefore="AED"
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name="Status"
                label={
                  <span style={{ fontWeight: '600', fontSize: '14px' }}>
                    Status
                  </span>
                }
                rules={[{ required: true, message: 'Please select status' }]}
              >
                <Select 
                  placeholder="Select status"
                  style={{ borderRadius: '8px' }}
                >
                  {InvoiceStatuses.map(status => (
                    <Option key={status} value={status}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: getStatusColor(status),
                            marginRight: 8
                          }}
                        />
                        {status}
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            {/* Due Date */}
            <Col xs={24} sm={12}>
              <Form.Item
                name="DateLimit"
                label={
                  <span style={{ fontWeight: '600', fontSize: '14px' }}>
                    <CalendarOutlined style={{ marginRight: 8, color: '#faad14' }} />
                    Due Date
                  </span>
                }
                rules={[
                  { required: true, message: 'Please select due date' }
                ]}
              >
                <DatePicker
                  style={{ width: '100%', borderRadius: '8px' }}
                  placeholder="Select due date"
                  disabledDate={(current) => current && current < moment().startOf('day')}
                />
              </Form.Item>
            </Col>

            {/* Payment URL */}
            <Col xs={24} sm={12}>
              <Form.Item
                name="paymentUrl"
                label={
                  <span style={{ fontWeight: '600', fontSize: '14px' }}>
                    <LinkOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                    Payment URL
                  </span>
                }
                rules={[
                  { type: 'url', message: 'Please enter a valid URL' }
                ]}
              >
                <Input 
                  placeholder="https://payment-gateway.com/invoice/..."
                  style={{ borderRadius: '8px' }}
                  addonBefore="🔗"
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Preview Section */}
          <Divider orientation="left">
            <span style={{ color: '#1890ff', fontWeight: '600' }}>Preview</span>
          </Divider>
          
          <div style={{
            padding: '16px',
            backgroundColor: '#f0f9ff',
            borderRadius: '8px',
            border: '1px solid #91d5ff'
          }}>
            <Form.Item dependencies={['Title', 'amount', 'Status']} noStyle>
              {({ getFieldValue }) => {
                const title = getFieldValue('Title') || 'Invoice Title';
                const amount = getFieldValue('amount') || 0;
                const status = getFieldValue('Status') || 'Pending';
                
                return (
                  <div>
                    <Text strong style={{ fontSize: '16px' }}>{title}</Text>
                    <br />
                    <Text style={{ color: '#52c41a', fontSize: '18px', fontWeight: '700' }}>
                      {formatCurrency(amount)}
                    </Text>
                    <br />
                    <div style={{ marginTop: '8px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        backgroundColor: getStatusColor(status),
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {status}
                      </span>
                    </div>
                  </div>
                );
              }}
            </Form.Item>
          </div>
        </Form>
      </Card>
    </Modal>
  );
};

export default SellerInvoiceForm;
