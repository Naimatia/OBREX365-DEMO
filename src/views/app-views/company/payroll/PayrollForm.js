// @ts-nocheck
import React, { useEffect } from 'react';
import { 
  Modal, Form, Input, Select, InputNumber, 
  Divider, Button, message 
} from 'antd';
import { UserOutlined, DollarOutlined } from '@ant-design/icons';
const { Option } = Select; // Destructure Option from Select

const PayrollForm = ({ visible, onCancel, onSubmit, isEditing, initialValues }) => {
  const [form] = Form.useForm();
  const salaryRatePerDay = Form.useWatch('salary_rate_per_day', form);

  // Employee roles
  const EmployeeRoles = {
    HR: 'H.R',
    SALES_OFFICER: 'Sales Officer',
    ASSISTANT: 'Assistant',
    DRIVER: 'Driver',
    RECEPTIONIST: 'Receptionist',
    SUPERVISOR: 'Supervisor',
    SECRETARY: 'Secretary',
    TEAM_LEADER: 'Team Leader',
    SALES: 'Sales',
    OFF_PLAN_SALES: 'Off-Plan Sales',
    READY_TO_MOVE_SALES: 'Ready to Move Sales',
    MARKETING_OFFICER: 'Marketing Officer',
  };

  // Dynamically update calculated salary_per_hour
  useEffect(() => {
    if (salaryRatePerDay !== undefined && salaryRatePerDay !== null) {
      const calculatedSalaryPerHour = Number((salaryRatePerDay / 8).toFixed(2));
      form.setFieldsValue({ salary_per_hour: calculatedSalaryPerHour });
    }
  }, [salaryRatePerDay, form]);

  // Handle form initialization for add/edit mode
  useEffect(() => {
    if (visible) {
      console.log('Form initializing with initialValues:', initialValues); // Debug: Log initial values
      if (isEditing && initialValues) {
        form.setFieldsValue({
          ...initialValues,
          salary_per_hour: initialValues.salary_per_hour || Number((initialValues.salary_rate_per_day || 0 / 8).toFixed(2)),
        });
      } else {
        form.setFieldsValue({
          employee_id: '',
          employee_name: '',
          position: undefined,
          salary_rate_per_day: 0,
          salary_per_hour: 0,
          working_days: 0,
          hours_worked: 0,
          overtime_hours: 0,
          absent_per_day: 0,
          other_deduction: 0,
        });
      }
    }
  }, [visible, isEditing, initialValues, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      console.log('Form values submitted:', values); // Debug: Log submitted values
      await onSubmit(values);
    } catch (error) {
      console.error('Form validation error:', error);
      message.error('Failed to validate form');
    }
  };

  const title = isEditing ? 'Edit Payroll' : 'Add Payroll';

  return (
    <Modal
      title={title}
      open={visible}
      onCancel={onCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit}>
          {isEditing ? 'Update Payroll' : 'Add Payroll'}
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          employee_id: '',
          employee_name: '',
          position: '',
          salary_rate_per_day: 0,
          salary_per_hour: 0,
          working_days: 0,
          hours_worked: 0,
          overtime_hours: 0,
          absent_per_day: 0,
          other_deduction: 0,
        }}
      >
        <Divider>Payroll Information</Divider>
        <Form.Item name="employee_id" label="Employee ID" rules={[{ required: true, message: 'Please enter the employee ID' }]}>
          <Input prefix={<UserOutlined />} placeholder="Enter employee ID" />
        </Form.Item>
        <Form.Item name="employee_name" label="Employee Name" rules={[{ required: true, message: 'Please enter the employee name' }]}>
          <Input prefix={<UserOutlined />} placeholder="Enter employee name" />
        </Form.Item>

        <Form.Item
          name="position" // Changed from "Position" to "position" to match the form data
          label="position"
          rules={[{ required: true, message: 'Please select employee position' }]}
        >
          <Select placeholder="Select employee position">
            {Object.entries(EmployeeRoles).map(([key, value]) => (
              <Option key={key} value={value}>{value}</Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="salary_rate_per_day" label="Salary Rate (per day)" rules={[{ required: true, message: 'Please enter salary rate per day' }]}>
          <InputNumber
            prefix={<DollarOutlined />}
            style={{ width: '100%' }}
            min={0}
            formatter={value => `AED ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={value => value.replace(/AED\s?|(,*)/g, '')}
            placeholder="Enter salary rate per day"
          />
        </Form.Item>
        <Form.Item name="salary_per_hour" label="Salary (per hour)" rules={[{ required: true, message: 'Salary per hour is calculated automatically' }]}>
          <InputNumber
            prefix={<DollarOutlined />}
            style={{ width: '100%' }}
            min={0}
            formatter={value => `AED ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={value => value.replace(/AED\s?|(,*)/g, '')}
            placeholder="Calculated automatically"
            readOnly
          />
        </Form.Item>
        <Form.Item name="working_days" label="Working Days" rules={[{ required: true, message: 'Please enter working days' }]}>
          <InputNumber style={{ width: '100%' }} min={0} max={31} placeholder="Enter number of working days" />
        </Form.Item>
        <Form.Item name="hours_worked" label="Hours Worked" rules={[{ required: true, message: 'Please enter hours worked' }]}>
          <InputNumber style={{ width: '100%' }} min={0} placeholder="Enter total hours worked" />
        </Form.Item>
        <Form.Item name="overtime_hours" label="Overtime Hours" rules={[{ required: true, message: 'Please enter overtime hours' }]}>
          <InputNumber style={{ width: '100%' }} min={0} placeholder="Enter overtime hours" />
        </Form.Item>
        <Form.Item name="absent_per_day" label="Absent Days" rules={[{ required: true, message: 'Please enter number of absent days' }]}>
          <InputNumber style={{ width: '100%' }} min={0} placeholder="Enter number of absent days" />
        </Form.Item>
        <Form.Item name="other_deduction" label="Other Deduction" rules={[{ required: true, message: 'Please enter other deductions' }]}>
          <InputNumber
            prefix={<DollarOutlined />}
            style={{ width: '100%' }}
            min={0}
            formatter={value => `AED ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={value => value.replace(/AED\s?|(,*)/g, '')}
            placeholder="Enter other deductions"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PayrollForm;