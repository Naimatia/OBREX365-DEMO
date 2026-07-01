// components/InvoiceForm.js
import React, { useEffect } from 'react';
import { Form, Input, InputNumber, Select, DatePicker, Button, Space, Card, Alert } from 'antd';
import { InvoiceStatus } from 'models/InvoiceModel';
import dayjs from 'dayjs';
import { CalendarOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Option } = Select;

const InvoiceForm = ({ 
  initialValues, 
  onSubmit, 
  onCancel, 
  loading 
}) => {
  const [form] = Form.useForm();

  // Helper function to safely convert any date format to dayjs
  const toDayjs = (dateValue) => {
    if (!dateValue) return null;
    
    // If it's already a dayjs object
    if (dayjs.isDayjs(dateValue)) return dateValue;
    
    // If it's a Firestore Timestamp with toDate method
    if (dateValue.toDate && typeof dateValue.toDate === 'function') {
      return dayjs(dateValue.toDate());
    }
    
    // If it's a Date object or can be converted to Date
    if (dateValue instanceof Date || typeof dateValue === 'string' || typeof dateValue === 'number') {
      const d = dayjs(dateValue);
      return d.isValid() ? d : null;
    }
    
    // Try as is
    const d = dayjs(dateValue);
    return d.isValid() ? d : null;
  };

  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      try {
        // Transform data for form - ensure dates are dayjs objects
        const formValues = {
          ...initialValues,
          paymentDate: toDayjs(initialValues.paymentDate),
          DateLimit: toDayjs(initialValues.DateLimit),
          amount: initialValues.amount ? Number(initialValues.amount) : undefined,
          Status: initialValues.Status || InvoiceStatus.PENDING,
        };
        
        console.log('Setting form values:', formValues);
        form.setFieldsValue(formValues);
      } catch (error) {
        console.error('Error setting form values:', error);
        form.resetFields();
      }
    } else {
      // Reset form for new invoice
      form.resetFields();
      // Set default values for new invoice - paymentDate is null by default
      form.setFieldsValue({
        Status: InvoiceStatus.PENDING,
        paymentDate: null, // Changed from dayjs() to null
        DateLimit: null,
      });
    }
  }, [initialValues, form]);

  const handleFinish = (values) => {
    console.log('Form values before submit:', values);
    
    try {
      const submitData = {
        ...values,
        paymentDate: values.paymentDate ? values.paymentDate.toDate() : null,
        DateLimit: values.DateLimit ? values.DateLimit.toDate() : null,
        amount: values.amount ? Number(values.amount) : 0,
        Status: values.Status || InvoiceStatus.PENDING,
      };
      
      console.log('Submitting data:', submitData);
      onSubmit(submitData);
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const departments = [
    { value: 'office_supply', label: '🏢 Office Supply' },
    { value: 'marketing_expense', label: '📊 Marketing Expense' },
    { value: 'office_operations', label: '⚙️ Office Operations' },
    { value: 'general', label: '📋 General' },
  ];

  // Custom date format for display
  const dateFormat = 'DD/MM/YYYY';

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      style={{ padding: '8px 0' }}
    >
      {/* Invoice Title */}
      <Form.Item
        name="Title"
        label="Invoice Title"
        rules={[{ required: true, message: 'Please enter invoice title' }]}
      >
        <Input 
          placeholder="e.g., Office Supplies Purchase" 
          size="large"
        />
      </Form.Item>

      {/* Amount and Department Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <Form.Item
          name="amount"
          label="Amount (AED)"
          rules={[
            { required: true, message: 'Please enter amount' },
            { 
              validator: (_, value) => {
                if (value && value <= 0) {
                  return Promise.reject(new Error('Amount must be greater than 0'));
                }
                return Promise.resolve();
              }
            }
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder="0.00"
            formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={value => value.replace(/\$\s?|(,*)/g, '')}
            step={0.01}
            min={0.01}
            precision={2}
            size="large"
            prefix="AED"
          />
        </Form.Item>

        <Form.Item
          name="department"
          label="Department"
          rules={[{ required: true, message: 'Please select department' }]}
        >
          <Select placeholder="Select department" size="large">
            {departments.map(dept => (
              <Option key={dept.value} value={dept.value}>
                {dept.label}
              </Option>
            ))}
          </Select>
        </Form.Item>
      </div>

      {/* Payment Date - Main Date Field - Now optional */}
      <Form.Item
        name="paymentDate"
        label={
          <span>
            <CalendarOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            Payment Date (from receipt)
          </span>
        }
        // Removed required rule - now optional
        extra={
          <span style={{ color: '#8c8c8c', fontSize: '12px' }}>
            <InfoCircleOutlined style={{ marginRight: 4 }} />
            Enter the date shown on the receipt or leave empty if not available
          </span>
        }
      >
        <DatePicker
          style={{ width: '100%' }}
          placeholder="Select date from receipt (optional)"
          format={dateFormat}
          size="large"
          suffixIcon={<CalendarOutlined />}
          allowClear={true}
        />
      </Form.Item>

      {/* Due Date - Optional Field */}
      <Form.Item
        name="DateLimit"
        label="Due Date (Optional)"
        extra="Set a due date for payment tracking (optional)"
      >
        <DatePicker
          style={{ width: '100%' }}
          placeholder="Select due date (optional)"
          format={dateFormat}
          size="large"
          suffixIcon={<CalendarOutlined />}
          allowClear={true}
        />
      </Form.Item>

      {/* Status and Payment URL Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <Form.Item
          name="Status"
          label="Status"
        >
          <Select placeholder="Select status" size="large">
            <Option value={InvoiceStatus.PENDING}>⏳ Pending</Option>
            <Option value={InvoiceStatus.PAID}>✅ Paid</Option>
            <Option value={InvoiceStatus.MISSED}>❌ Missed</Option>
            <Option value={InvoiceStatus.CANCELLED}>🚫 Cancelled</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="paymentUrl"
          label="Payment URL (Optional)"
        >
          <Input 
            placeholder="https://payment-link.com/..." 
            size="large"
          />
        </Form.Item>
      </div>

      {/* Description */}
      <Form.Item
        name="description"
        label="Description (Optional)"
      >
        <TextArea 
          placeholder="Enter additional details about this invoice..." 
          rows={4}
          style={{ resize: 'vertical' }}
        />
      </Form.Item>

      {/* Info Alert */}
      <Alert
        message="Payment Date Information"
        description="If you don't have the payment date yet, you can leave it empty and set it later when marking the invoice as paid."
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 16 }}
      />

      {/* Form Actions */}
      <Form.Item style={{ marginBottom: 0, paddingTop: 16 }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: '8px',
          borderTop: '1px solid #f0f0f0',
          paddingTop: 16
        }}>
          <Button 
            onClick={onCancel}
            size="large"
          >
            Cancel
          </Button>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading}
            size="large"
            icon={initialValues?.id ? null : <CalendarOutlined />}
          >
            {initialValues?.id ? 'Update Invoice' : 'Create Invoice'}
          </Button>
        </div>
      </Form.Item>
    </Form>
  );
};

export default InvoiceForm;