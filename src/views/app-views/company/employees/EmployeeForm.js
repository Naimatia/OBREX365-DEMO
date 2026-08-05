// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { 
  Modal, Form, Input, Select, DatePicker, InputNumber, 
  Switch, Divider, Button, Space, message 
} from 'antd';
import { UserOutlined, PhoneOutlined, MailOutlined, DollarOutlined, TeamOutlined } from '@ant-design/icons';
import { db, collection, getDocs, query, where } from 'configs/FirebaseConfig';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';

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
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Get current user and company ID from Redux
  const currentUser = useSelector(state => state.auth.user);
  const companyId = currentUser?.company_id || currentUser?.companyId || '';

  useEffect(() => {
    if (visible) {
      form.resetFields();
      if (isEditing && initialValues) {
        const formattedValues = {
          ...initialValues,
          JoiningDate: initialValues.JoiningDate ? dayjs(initialValues.JoiningDate.toDate()) : null,
          CreationDate: initialValues.CreationDate ? dayjs(initialValues.CreationDate.toDate()) : null,
        };
        form.setFieldsValue(formattedValues);
      }
      // Fetch users only when modal is visible and we have a company ID
      if (companyId) {
        fetchCompanyUsers();
      }
    }
  }, [visible, isEditing, initialValues, form, companyId]);

  /**
   * Fetch only users that belong to the current company
   * Excludes the joker account (isJoker: true)
   */
  const fetchCompanyUsers = async () => {
    if (!companyId) {
      console.warn('No company ID available, skipping user fetch');
      setUsers([]);
      return;
    }

    setLoadingUsers(true);
    try {
      // Query users collection filtering by company_id
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef, 
        where('company_id', '==', companyId)
      );
      
      const usersSnapshot = await getDocs(q);
      const usersList = usersSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        // Filter out the joker account
        .filter(user => user.isJoker !== true)
        // Sort by name
        .sort((a, b) => {
          const nameA = (a.displayName || a.firstname || a.email || '').toLowerCase();
          const nameB = (b.displayName || b.firstname || b.email || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });

      console.log(`Found ${usersList.length} users for company ${companyId}`);
      setUsers(usersList);
    } catch (error) {
      console.error('Error fetching company users:', error);
      message.error('Failed to load users');
      setUsers([]);
    } finally {
      setLoadingUsers(false);
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
        user_id: values.user_id || null,
        company_id: companyId, // Ensure employee is linked to the company
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
          tooltip="Link this employee to an existing user account. Only users from your company are shown."
        >
          <Select 
            placeholder="Select user account" 
            allowClear
            showSearch
            loading={loadingUsers}
            optionFilterProp="children"
            filterOption={(input, option) => {
              const children = option?.children?.toString?.() || '';
              return children.toLowerCase().includes(input.toLowerCase());
            }}
            notFoundContent={loadingUsers ? 'Loading users...' : 'No users found in your company'}
          >
            {users.map(user => {
              // Get display name from various possible fields
              const displayName = user.displayName || 
                                 `${user.firstname || ''} ${user.lastname || ''}`.trim() || 
                                 user.email || 
                                 'Unnamed User';
              
              // Get email for subtitle
              const email = user.email || '';
              
              return (
                <Option key={user.id} value={user.id}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 500 }}>{displayName}</span>
                    {email && <span style={{ fontSize: '11px', color: '#888' }}>{email}</span>}
                  </div>
                </Option>
              );
            })}
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

        {/* Display company context info */}
        <Divider />
        <div style={{ 
          fontSize: '12px', 
          color: '#888', 
          background: '#f5f5f5', 
          padding: '8px 12px', 
          borderRadius: '4px',
          marginTop: '-8px'
        }}>
          <TeamOutlined style={{ marginRight: '6px' }} />
          Employees will be associated with your current company: 
          <strong style={{ marginLeft: '4px' }}>
            {currentUser?.companyName || companyId || 'Unknown Company'}
          </strong>
        </div>
      </Form>
    </Modal>
  );
};

export default EmployeeForm;