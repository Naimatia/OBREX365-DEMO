import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  DatePicker,
  InputNumber,
  Button,
  Card,
  Row,
  Col,
  Space,
  Divider,
  Typography,
  Select
} from 'antd';
import {
  SaveOutlined,
  CloseOutlined,
  CalendarOutlined,
  FileTextOutlined,
  TagOutlined
} from '@ant-design/icons';
import { InvoiceStatus } from 'models/InvoiceModel';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Title: TitleText } = Typography;
const { Option } = Select;

// Department constants - use same values as in Firestore
const DEPARTMENTS = {
  OFFICE_SUPPLY: 'office_supply',
  MARKETING_EXPENSE: 'marketing_expense',
  OFFICE_OPERATIONS: 'office_operations',
  GENERAL: 'general'
};

const InvoiceForm = ({ onSubmit, onCancel, loading, initialValues = {} }) => {
  const [form] = Form.useForm();
  const isEditMode = !!initialValues?.id;

  // Helper to convert various date formats to dayjs
  const toDayjs = (value) => {
    if (!value) return null;
    if (typeof value === 'object' && value !== null) {
      if (value.toDate && typeof value.toDate === 'function') {
        return dayjs(value.toDate());
      }
      if (value instanceof Date) {
        return dayjs(value);
      }
      if (value.isValid && typeof value.isValid === 'function') {
        return value;
      }
    }
    try {
      return dayjs(value);
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (isEditMode && initialValues) {
      console.log('Editing invoice (form):', initialValues);
      
      const dueDate = toDayjs(initialValues.DateLimit) || dayjs().add(30, 'days');
      
      form.setFieldsValue({
        Title: initialValues.Title || '',
        amount: initialValues.amount || 0,
        DateLimit: dueDate,
        paymentUrl: initialValues.paymentUrl || '',
        description: initialValues.description || '',
        Notes: initialValues.Notes || '',
        department: initialValues.department || DEPARTMENTS.GENERAL,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        DateLimit: dayjs().add(30, 'days'),
        department: DEPARTMENTS.GENERAL,
      });
    }
  }, [initialValues, isEditMode, form]);

  const handleSubmit = async (values) => {
    try {
      // Format values for submission
      const formattedValues = {
        Title: values.Title || '',
        description: values.description || '',
        amount: Number(values.amount || 0),
        paymentUrl: values.paymentUrl || '',
        Notes: values.Notes || '',
        department: values.department || DEPARTMENTS.GENERAL,
        DateLimit: values.DateLimit ? values.DateLimit.toDate() : new Date(),
      };

      console.log('Form submitting values:', formattedValues);
      await onSubmit(formattedValues);
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  return (
    <Card>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <TitleText level={4}>
          {isEditMode ? 'Edit Invoice' : 'Create New Invoice'}
        </TitleText>
        <Divider />

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="Title"
              label="Invoice Title"
              rules={[{ required: true, message: 'Please enter a title' }]}
            >
              <Input
                prefix={<FileTextOutlined />}
                placeholder="Invoice title"
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              name="amount"
              label="Amount"
              rules={[{ required: true, message: 'Please enter an amount' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                addonBefore="AED"
                placeholder="0.00"
                min={0}
                precision={2}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="DateLimit"
              label="Due Date"
              rules={[{ required: true, message: 'Please select a due date' }]}
            >
              <DatePicker
                style={{ width: '100%' }}
                format="YYYY-MM-DD"
                disabledDate={(current) =>
                  current && current < dayjs().startOf('day')
                }
                suffixIcon={<CalendarOutlined />}
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item name="paymentUrl" label="Payment URL (Optional)">
              <Input placeholder="https://payment-provider.com/invoice/12345" />
            </Form.Item>
          </Col>
        </Row>

        {/* Department Field */}
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="department"
              label="Department"
              rules={[{ required: true, message: 'Please select a department' }]}
            >
              <Select
                placeholder="Select department"
                suffixIcon={<TagOutlined />}
              >
                <Option value="office_supply">
                  🏢 Office Supply
                </Option>
                <Option value="marketing_expense">
                  📊 Marketing Expense
                </Option>
                <Option value="office_operations">
                  ⚙️ Office Operations
                </Option>
                <Option value="general">
                  📋 General
                </Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="description"
          label="Description"
          rules={[{ required: true, message: 'Please enter a description' }]}
        >
          <TextArea rows={4} placeholder="Invoice description" />
        </Form.Item>

        <Form.Item name="Notes" label="Notes (Optional)">
          <TextArea rows={3} placeholder="Additional notes" />
        </Form.Item>

        <Divider />

        <Form.Item>
          <Space>
            <Button
              type="default"
              onClick={onCancel}
              icon={<CloseOutlined />}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<SaveOutlined />}
            >
              {isEditMode ? 'Update Invoice' : 'Create Invoice'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default InvoiceForm;