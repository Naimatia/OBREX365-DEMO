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
  Typography
} from 'antd';
import {
  SaveOutlined,
  CloseOutlined,
  CalendarOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { InvoiceStatus } from 'models/InvoiceModel';
import moment from 'moment';

/**
 * @typedef {Object} InvoiceData
 * @property {string} [id]
 * @property {string} [Title]
 * @property {number} [amount]
 * @property {Date|Object} [DateLimit]
 * @property {Date|Object} [CreationDate]
 * @property {string} [paymentUrl]
 * @property {string} [description]
 * @property {string} [Notes]
 * @property {string} [Status]
 */

const { TextArea } = Input;
const { Title: TitleText } = Typography;

/**
 * Form component for adding/editing invoices
 * @param {Object} props Component props
 * @param {(values: any) => Promise<void>} props.onSubmit Submit handler function
 * @param {React.MouseEventHandler<HTMLElement>} props.onCancel Cancel handler function
 * @param {boolean} props.loading Loading state
 * @param {InvoiceData} [props.initialValues] Optional initial form values
 */
const InvoiceForm = ({ onSubmit, onCancel, loading, initialValues = {} }) => {
  const [form] = Form.useForm();
  const isEditMode = !!initialValues?.id; // Vérifie si c’est une modification

  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      // 🧾 Si on édite une facture existante
      form.setFieldsValue({
        ...initialValues,
        CreationDate: initialValues?.CreationDate
          ? moment(
              initialValues.CreationDate.toDate?.() ||
                initialValues.CreationDate
            )
          : moment(),
        DateLimit: initialValues?.DateLimit
          ? moment(
              initialValues.DateLimit.toDate?.() || initialValues.DateLimit
            )
          : moment().add(30, 'days')
      });
    } else {
      // 🧹 Réinitialiser le formulaire pour une nouvelle facture
      form.resetFields();
    }
  }, [initialValues, form]);

  const handleSubmit = async (values) => {
    try {
      const formattedValues = {
        ...values,
        CreationDate: values.CreationDate
          ? values.CreationDate.toDate?.() || values.CreationDate.toDate()
          : new Date(),
        DateLimit: values.DateLimit
          ? values.DateLimit.toDate?.() || values.DateLimit.toDate()
          : new Date(),
        Status: InvoiceStatus.PENDING,
        Notes: values.Notes || '',
        Title: values.Title || '',
        description: values.description || '',
        amount: Number(values.amount || 0),
        paymentUrl: values.paymentUrl || ''
      };

      await onSubmit(formattedValues);
    } catch (error) {
      console.error('❌ Error submitting form:', error);
    }
  };

  const today = moment();
  const defaultDueDate = moment().add(30, 'days');

  return (
    <Card>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          ...initialValues,
          CreationDate: initialValues?.CreationDate
            ? moment(
                initialValues.CreationDate.toDate?.() ||
                  initialValues.CreationDate
              )
            : today,
          DateLimit: initialValues?.DateLimit
            ? moment(
                initialValues.DateLimit.toDate?.() || initialValues.DateLimit
              )
            : defaultDueDate
        }}
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
                  current && current < moment().startOf('day')
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
