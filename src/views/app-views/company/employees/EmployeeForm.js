// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { 
  Modal, Form, Input, Select, DatePicker, InputNumber, 
  Switch, Divider, Button, Space, message 
} from 'antd';
import { UserOutlined, PhoneOutlined, MailOutlined, DollarOutlined, TeamOutlined } from '@ant-design/icons';
import { db, collection, getDocs } from 'configs/FirebaseConfig';
import moment from 'moment';

const { Option } = Select;

const EmployeeRoles = {
  AGENT: 'Agent',
  SALES: 'Sales',
  EXECUTIVE_SALES: 'Executive Sales',
  OFF_PLAN_SALES: 'Off Plan Sales',
  READY_TO_MOVE_SALES: 'Ready to Move Sales',
  TEAM_MANAGER: 'Team Manager',
  SALES_MANAGER: 'Sales Manager',
  MARKETING_MANAGER: 'Marketing Manager',
  MARKETING_EXECUTIVE: 'Marketing Executive',
  ADMIN: 'Admin',
  SUPPORT: 'Support',
  ACCOUNTANT: 'Accountant',
  HR: 'HR',
  OTHER: 'Other'
};

const EmployeeStatus = {
  WORKING: 'Working',
  VACATION: 'Vacation',
};

const EmployeeForm = ({ visible, onCancel, onSubmit, isEditing, initialValues }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (visible) {
      form.resetFields();
      if (isEditing && initialValues) {
        const formattedValues = {
          ...initialValues,
          JoiningDate: initialValues.JoiningDate ? moment(initialValues.JoiningDate.toDate()) : null,
          CreationDate: initialValues.CreationDate ? moment(initialValues.CreationDate.toDate()) : null,
        };
        form.setFieldsValue(formattedValues);
      }
      fetchUsers();
    }
  }, [visible, isEditing, initialValues, form]);

  const fetchUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersList = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersList);
    } catch (error) {
      console.error('Error fetching users:', error);
      message.error('Failed to load users');
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      const formattedValues = {
        ...values,
        JoiningDate: values.JoiningDate ? values.JoiningDate.toDate() : new Date(),
        Salary: Number(values.Salary || 0),
        DateSalary: Number(values.DateSalary || 1),
        user_id: values.user_id || null
      };
      console.log('Submitting employee data:', formattedValues);
      await onSubmit(formattedValues);
      setLoading(false);
    } catch (error) {
      console.error('Form validation error:', error);
      setLoading(false);
    }
  };

  const title = isEditing ? 'Edit Employee' : 'Add New Employee';

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
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleSubmit}
        >
          {isEditing ? 'Update Employee' : 'Add Employee'}
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          Status: EmployeeStatus.WORKING,
          DateSalary: 1,
          Salary: 0,
        }}
      >
        <Divider>Basic Information</Divider>
        <Form.Item
          name="name"
          label="Full Name"
          rules={[{ required: true, message: 'Please enter employee name' }]}
        >
          <Input prefix={<UserOutlined />} placeholder="Enter employee name" />
        </Form.Item>
        <Form.Item
          name="Role"
          label="Role"
          rules={[{ required: true, message: 'Please select employee role' }]}
        >
          <Select placeholder="Select employee role">
            {Object.entries(EmployeeRoles).map(([key, value]) => (
              <Option key={key} value={value}>{value}</Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          name="user_id"
          label="Associated User Account (Optional)"
        >
          <Select 
            placeholder="Select user account" 
            allowClear
            showSearch
            optionFilterProp="children"
          >
            {users.map(user => (
              <Option key={user.id} value={user.id}>
                {user.displayName || user.email}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Divider>Contact Information</Divider>
        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: 'Please enter email address' },
            { type: 'email', message: 'Please enter a valid email' }
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="Enter email address" />
        </Form.Item>
        <Form.Item
          name="phoneNumber"
          label="Phone Number"
          rules={[{ required: true, message: 'Please enter phone number' }]}
        >
          <Input prefix={<PhoneOutlined />} placeholder="Enter phone number" />
        </Form.Item>
        <Divider>Employment Details</Divider>
        <Form.Item
          name="JoiningDate"
          label="Joining Date"
          rules={[{ required: true, message: 'Please select joining date' }]}
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          name="Status"
          label="Current Status"
          rules={[{ required: true, message: 'Please select status' }]}
        >
          <Select placeholder="Select status">
            {Object.entries(EmployeeStatus).map(([key, value]) => (
              <Option key={key} value={value}>{value}</Option>
            ))}
          </Select>
        </Form.Item>
        <Divider>Salary Information</Divider>
        <Form.Item
          name="Salary"
          label="Monthly Salary"
          rules={[{ required: true, message: 'Please enter salary amount' }]}
        >
          <InputNumber
            prefix={<DollarOutlined />}
            style={{ width: '100%' }}
            min={0}
            formatter={value => `AED ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={value => value.replace(/AED\s?|(,*)/g, '')}
            placeholder="Enter monthly salary amount"
          />
        </Form.Item>
        <Form.Item
          name="DateSalary"
          label="Salary Day (1-31)"
          rules={[
            { required: true, message: 'Please enter salary day' },
            { type: 'number', min: 1, max: 31, message: 'Day must be between 1-31' }
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={1}
            max={31}
            placeholder="Day of month when salary is paid"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EmployeeForm;