import React, { useState } from 'react';
import { Form, Input, Button, Select, Space, Divider, Typography, Row, Col, Alert } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, GlobalOutlined } from '@ant-design/icons';
import { UserRoles } from 'models/UserModel';
import countries from '../../../../constants/CountryList'; // Adjust path as needed

const { Option } = Select;
const { Text } = Typography;

/**
 * Form component for adding a new team member
 * Collects personal and account information with validation
 * Sets forcePasswordReset to true by default
 */
const AddUserForm = ({ onFinish, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // Handle form submission
  const handleSubmit = async (values) => {
    setLoading(true);
    console.log('AddUserForm - Form values submitted:', values); // Log all form values
    try {
      // Validate role
      console.log('AddUserForm - Validating role:', values.role);
      if (!Object.values(UserRoles).includes(values.role)) {
        console.error('AddUserForm - Invalid role selected:', values.role);
        form.setFields([{ name: 'role', errors: ['Invalid role selected'] }]);
        throw new Error('Invalid role selected');
      }

      // Map form values to UserModel schema
      const submitValues = {
        firstname: values.firstname,
        lastname: values.lastname,
        email: values.email,
        secondaryEmail: values.secondaryEmail,
        phoneNumber: values.phoneNumber,
        phoneNumber2: values.phoneNumber2,
        phoneNumber3: values.phoneNumber3,
        country: values.country,
        Role: values.role, // Capitalized to match UserModel
        forcePasswordReset: true,
        CreationDate: new Date().toISOString(), // Temporary, use serverTimestamp() in backend
        LastLogin: new Date().toISOString(), // Temporary, use serverTimestamp() in backend
        Notification: false,
        isBanned: false,
        isVerified: false,
        company_id: values.company_id || '',
        ipAddress: values.ipAddress || '',
        pictureUrl: '',
      };

      console.log('AddUserForm - Submitted values:', submitValues); // Log submitted values
      await onFinish(submitValues);
      console.log('AddUserForm - Form submission successful, resetting form');
      form.resetFields(); // Reset form on success
    } catch (error) {
      console.error('AddUserForm - Submission error:', error.message);
      form.setFields([
        { name: 'email', errors: [`Failed to create user: ${error.message}`] },
      ]);
    } finally {
      setLoading(false);
      console.log('AddUserForm - Form submission completed, loading set to false');
    }
  };

  return (
    <>
      <Alert
        message="New team members will be required to reset their password on first login"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        requiredMark="optional"
        validateTrigger="onBlur"
        initialValues={{}}
        onValuesChange={(changedValues, allValues) => {
          console.log('AddUserForm - Form values changed:', { changedValues, allValues }); // Log form value changes
        }}
      >
        <Divider orientation="left">Personal Information</Divider>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="firstname"
              label="First Name"
              rules={[
                { required: true, message: 'Please enter first name' },
                { min: 2, message: 'Name must be at least 2 characters' },
              ]}
            >
              <Input prefix={<UserOutlined />} placeholder="Enter first name" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="lastname"
              label="Last Name"
              rules={[
                { required: true, message: 'Please enter last name' },
                { min: 2, message: 'Name must be at least 2 characters' },
              ]}
            >
              <Input prefix={<UserOutlined />} placeholder="Enter last name" />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Account Details</Divider>

        <Form.Item
          name="email"
          label="Email Address"
          rules={[
            { required: true, message: 'Please enter email' },
            { type: 'email', message: 'Please enter a valid email' },
          ]}
          extra="This email will be used for login and communications"
        >
          <Input prefix={<MailOutlined />} placeholder="user@example.com" />
        </Form.Item>
        <Form.Item
          name="secondaryEmail"
          label="Secondary Email Address"
          rules={[
            { type: 'email', message: 'Please enter a valid email' },
          ]}
          extra="Optional secondary email for additional communications"
        >
          <Input prefix={<MailOutlined />} placeholder="secondary@example.com" />
        </Form.Item>

        <Form.Item
          name="role"
          label="Team Role"
          rules={[{ required: true, message: 'Please select role' }]}
          tooltip="HR members can manage the team and settings. Sellers have access to sales features."
        >
          <Select
            onChange={(value) => console.log('AddUserForm - Selected role:', value)}
            placeholder="Select a role"
          >
            <Option value={UserRoles.SUPER_ADMIN}>Super Admin</Option>
            <Option value={UserRoles.CEO}>CEO</Option>
            <Option value={UserRoles.HR}>Human Resources (HR)</Option>
            <Option value={UserRoles.SELLER}>Sales Representative</Option>
            <Option value={UserRoles.COORDINATOR}>Coordinator</Option>
            <Option value={UserRoles.SALES_EXECUTIVE}>Sales Executive</Option>
            <Option value={UserRoles.AGENT}>Agent</Option>
            <Option value={UserRoles.TEAM_LEADER}>Team Leader</Option>
            <Option value={UserRoles.SALES_MANAGER}>Sales Manager</Option>
            <Option value={UserRoles.MARKETING_MANAGER}>Marketing Manager</Option>
            <Option value={UserRoles.OFF_PLAN_SALES}>Off-plan Sales</Option>
            <Option value={UserRoles.READY_TO_MOVE_SALES}>Ready to Move Sales</Option>
            <Option value={UserRoles.SECRETARY}>Secretary</Option>
            <Option value={UserRoles.FRONT_DESK_OFFICER}>Front Desk Officer</Option>
            <Option value={UserRoles.OFFICE_BOY}>Office Boy</Option>
            <Option value={UserRoles.ACCOUNTANT}>Accountant</Option>
            <Option value={UserRoles.HUMAN_RESOURCES}>Human Resources</Option>
            <Option value={UserRoles.PUBLIC_RELATIONS_OFFICER}>Public Relations Officer</Option>
          </Select>
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="phoneNumber"
              label="Phone Number"
              rules={[
                { required: true, message: 'Please enter phone number' },
                { pattern: /^[\d\+\-\s()]+$/, message: 'Please enter a valid phone number' },
              ]}
            >
              <Input prefix={<PhoneOutlined />} placeholder="+1 (234) 567-8901" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="phoneNumber2"
              label="Secondary Phone Number"
              rules={[
                { pattern: /^[\d\+\-\s()]+$/, message: 'Please enter a valid phone number' },
              ]}
            >
              <Input prefix={<PhoneOutlined />} placeholder="+1 (234) 567-8902" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="phoneNumber3"
              label="Tertiary Phone Number"
              rules={[
                { pattern: /^[\d\+\-\s()]+$/, message: 'Please enter a valid phone number' },
              ]}
            >
              <Input prefix={<PhoneOutlined />} placeholder="+1 (234) 567-8903" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="country"
              label="Country"
              rules={[{ required: true, message: 'Please select country' }]}
            >
              <Select
                showSearch
                placeholder="Select country"
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option?.children?.toString().toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
                onChange={(value) => console.log('AddUserForm - Selected country:', value)} // Log country selection
              >
                <Option value="" disabled>
                  <GlobalOutlined /> Select a country
                </Option>
                {countries.map((country) => (
                  <Option key={country.code} value={country.name}>
                    {country.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Divider />

        <Form.Item>
          <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Create Team Member
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </>
  );
};

export default AddUserForm;