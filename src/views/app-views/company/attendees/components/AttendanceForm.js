// @ts-nocheck
import React, { useEffect } from 'react';
import { Modal, Form, Input, DatePicker, message } from 'antd';
import moment from 'moment';

const AttendanceForm = ({ visible, onCancel, onSubmit, isEditing, initialValues }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible) {
      form.resetFields();
      if (isEditing && initialValues) {
        // Ensure month_year is parsed correctly
        const monthYear = initialValues.month_year
          ? moment(initialValues.month_year, 'YYYY-MM', true).isValid()
            ? moment(initialValues.month_year, 'YYYY-MM')
            : null
          : null;
        form.setFieldsValue({
          name: initialValues.name || '',
          title: initialValues.title || '',
          department: initialValues.department || '',
          month_year: monthYear,
        });
      } else {
        // Default to current month (October 2025) for new records
        form.setFieldsValue({ month_year: moment('2025-10', 'YYYY-MM') });
      }
    }
  }, [visible, isEditing, initialValues, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const formatted = {
        name: values.name,
        title: values.title,
        department: values.department,
        month_year: values.month_year ? values.month_year.format('YYYY-MM') : null,
      };
      if (!formatted.month_year) {
        message.error('Please select a valid month and year');
        return;
      }
      await onSubmit(formatted);
    } catch (error) {
      console.error('Validation error:', error);
      message.error('Please fill all required fields correctly');
    }
  };

  return (
    <Modal
      title={isEditing ? 'Edit Attendance Sheet' : 'Create Attendance Sheet'}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      okText={isEditing ? 'Update' : 'Create'}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="Employee Name"
          rules={[{ required: true, message: 'Please enter employee name' }]}
        >
          <Input placeholder="Enter employee name" />
        </Form.Item>
        <Form.Item
          name="title"
          label="Employee Title"
          rules={[{ required: true, message: 'Please enter employee title' }]}
        >
          <Input placeholder="Enter employee title" />
        </Form.Item>
        <Form.Item
          name="department"
          label="Department"
          rules={[{ required: true, message: 'Please enter department' }]}
        >
          <Input placeholder="Enter department" />
        </Form.Item>
        <Form.Item
          name="month_year"
          label="Month/Year"
          rules={[{ required: true, message: 'Please select month and year' }]}
        >
          <DatePicker.MonthPicker format="YYYY-MM" style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AttendanceForm;