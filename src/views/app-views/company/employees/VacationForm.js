// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, DatePicker, Button, Alert } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import moment from 'moment';

const { RangePicker } = DatePicker;
const { TextArea } = Input;

const VacationForm = ({ visible, onCancel, onSubmit, employee }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [dateError, setDateError] = useState('');

  useEffect(() => {
    if (visible) {
      form.resetFields();
      setDateError('');
    }
  }, [visible, form]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      // Extract start and end dates from range picker
      const [startDate, endDate] = values.dateRange;
      
      // Format vacation data
      const vacationData = {
        StartDate: startDate.toDate(),
        EndDate: endDate.toDate(),
        Cause: values.Cause || '',
      };
      
      // Clean data before submitting to Firestore
      const cleanData = { ...vacationData };
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined) {
          cleanData[key] = null;
        }
      });
      
      console.log('Clean vacation data for Firestore:', cleanData);
      await onSubmit(cleanData);
      setLoading(false);
    } catch (error) {
      console.error('Form validation error:', error);
      setLoading(false);
    }
  };

  // Validate date range - cannot be in the past
  const validateDateRange = (_, value) => {
    if (!value || value.length !== 2) {
      return Promise.reject(new Error('Please select start and end dates'));
    }
    
    const [start, end] = value;
    const today = moment().startOf('day');
    
    if (start.isBefore(today)) {
      return Promise.reject(new Error('Start date cannot be in the past'));
    }
    
    if (end.isBefore(start)) {
      return Promise.reject(new Error('End date must be after start date'));
    }
    
    if (end.diff(start, 'days') > 30) {
      return Promise.reject(new Error('Vacation cannot exceed 30 days'));
    }
    
    return Promise.resolve();
  };

  // Disable past dates in date picker
  const disabledDate = (current) => {
    return current && current < moment().startOf('day');
  };

  return (
    <Modal
      title={`Add Vacation - ${employee?.name || ''}`}
      open={visible}
      onCancel={onCancel}
      width={600}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleSubmit}
        >
          Add Vacation
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical">
        {dateError && (
          <Alert 
            message={dateError} 
            type="error" 
            showIcon 
            style={{ marginBottom: 16 }} 
          />
        )}

        <Form.Item
          name="dateRange"
          label="Vacation Date Range"
          rules={[
            { required: true, message: 'Please select vacation dates' },
            { validator: validateDateRange }
          ]}
        >
          <RangePicker 
            style={{ width: '100%' }} 
            disabledDate={disabledDate}
            format="YYYY-MM-DD"
          />
        </Form.Item>
        
        <Form.Item
          name="Cause"
          label="Reason for Vacation"
          rules={[{ required: true, message: 'Please enter reason for vacation' }]}
        >
          <TextArea 
            rows={4} 
            placeholder="Enter reason or cause for vacation request"
            maxLength={500}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default VacationForm;
