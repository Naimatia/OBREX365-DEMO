import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, InputNumber, Divider, Button, message } from 'antd';
import { UserOutlined, DollarOutlined } from '@ant-design/icons';

const { Option } = Select;

const PayrollForm = ({ visible, onCancel, onSubmit, isEditing, initialValues }) => {
  const [form] = Form.useForm();

  const monthlySalary = Form.useWatch('monthly_salary', form);
  const daysInMonth = Form.useWatch('days_in_month', form);
  const hoursPerDay = Form.useWatch('hours_per_day', form);

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

  // Auto-calculate daily and hourly rate
  useEffect(() => {
    if (monthlySalary > 0 && daysInMonth > 0 && hoursPerDay > 0) {
      const dailyRate = Number((monthlySalary / daysInMonth).toFixed(2));
      const hourlyRate = Number((dailyRate / hoursPerDay).toFixed(2));

      form.setFieldsValue({
        daily_rate: dailyRate,
        hourly_rate: hourlyRate,
      });
    }
  }, [monthlySalary, daysInMonth, hoursPerDay, form]);

  // Initialize form - Improved version
  useEffect(() => {
    if (visible) {
      if (isEditing && initialValues) {
        // For editing existing records (including old ones with monthly_salary = 0)
        form.setFieldsValue({
          ...initialValues,
          monthly_salary: Number(initialValues.monthly_salary || 0),
          days_in_month: Number(initialValues.days_in_month || 30),
          hours_per_day: Number(initialValues.hours_per_day || 8),
          working_days: Number(initialValues.working_days || 0),
          overtime_hours: Number(initialValues.overtime_hours || 0),
          absent_days: Number(initialValues.absent_days || initialValues.absent_per_day || 0),
          other_deduction: Number(initialValues.other_deduction || 0),
        });
      } else {
        // For new records
        form.setFieldsValue({
          employee_id: '',
          employee_name: '',
          position: undefined,
          monthly_salary: 0,
          days_in_month: 30,
          hours_per_day: 8,
          working_days: 0,
          overtime_hours: 0,
          absent_days: 0,
          other_deduction: 0,
          daily_rate: 0,
          hourly_rate: 0,
        });
      }
    }
  }, [visible, isEditing, initialValues, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (!values.monthly_salary || values.monthly_salary <= 0) {
        message.error("Monthly Salary is required and must be greater than 0");
        return;
      }

      await onSubmit(values);
    } catch (error) {
      console.error(error);
      message.error('Please fill all required fields correctly');
    }
  };

  return (
    <Modal
      title={isEditing ? 'Edit Payroll' : 'Add Payroll'}
      open={visible}
      onCancel={onCancel}
      width={850}
      footer={[
        <Button key="cancel" onClick={onCancel}>Cancel</Button>,
        <Button key="submit" type="primary" onClick={handleSubmit}>
          {isEditing ? 'Update Payroll' : 'Add Payroll'}
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical">
        <Divider>Employee Information</Divider>

        <Form.Item name="employee_id" label="Employee ID" rules={[{ required: true, message: 'Employee ID is required' }]}>
          <Input prefix={<UserOutlined />} placeholder="Enter employee ID" />
        </Form.Item>

        <Form.Item name="employee_name" label="Employee Name" rules={[{ required: true, message: 'Employee Name is required' }]}>
          <Input prefix={<UserOutlined />} placeholder="Enter employee name" />
        </Form.Item>

        <Form.Item name="position" label="Position" rules={[{ required: true, message: 'Position is required' }]}>
          <Select placeholder="Select position">
            {Object.entries(EmployeeRoles).map(([key, value]) => (
              <Option key={key} value={value}>{value}</Option>
            ))}
          </Select>
        </Form.Item>

        <Divider>Salary Information</Divider>

        <Form.Item 
          name="monthly_salary" 
          label="Monthly Salary (AED)" 
          rules={[{ required: true, message: 'Monthly Salary is required' }]}
        >
          <InputNumber 
            style={{ width: '100%' }} 
            min={0} 
            formatter={value => `AED ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
            parser={value => value.replace(/AED\s?|(,*)/g, '')}
          />
        </Form.Item>

        <Form.Item name="days_in_month" label="Days in Month" rules={[{ required: true }]}>
          <InputNumber style={{ width: '100%' }} min={1} max={31} />
        </Form.Item>

        <Form.Item name="hours_per_day" label="Hours per Day" rules={[{ required: true }]}>
          <InputNumber style={{ width: '100%' }} min={1} max={24} />
        </Form.Item>

        <Form.Item name="daily_rate" label="Daily Rate (Auto)" >
          <InputNumber style={{ width: '100%' }} readOnly />
        </Form.Item>

        <Form.Item name="hourly_rate" label="Hourly Rate (Auto)" >
          <InputNumber style={{ width: '100%' }} readOnly />
        </Form.Item>

        <Divider>Attendance & Deductions</Divider>

        <Form.Item name="working_days" label="Working Days" rules={[{ required: true }]}>
          <InputNumber style={{ width: '100%' }} min={0} max={31} />
        </Form.Item>

        <Form.Item name="overtime_hours" label="Overtime Hours">
          <InputNumber style={{ width: '100%' }} min={0} />
        </Form.Item>

        <Form.Item name="absent_days" label="Absent Days">
          <InputNumber style={{ width: '100%' }} min={0} />
        </Form.Item>

        <Form.Item name="other_deduction" label="Other Deduction (AED)">
          <InputNumber 
            style={{ width: '100%' }} 
            min={0} 
            formatter={value => `AED ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PayrollForm;