import React, { useState } from 'react';
import { Form, Input, Button, Select, Space, Divider, Switch, Typography, Row, Col, Alert } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, GlobalOutlined, KeyOutlined } from '@ant-design/icons';
import { UserRoles } from 'models/UserModel';
// Using direct path to avoid module resolution issues
import countries from '../../../../constants/CountryList';

const { Option } = Select;
const { Text } = Typography;

/**
 * Form component for editing an existing user
 */
const EditUserForm = ({ initialValues, onFinish, onCancel }) => {
  const [loading, setLoading] = useState(false);

  // Handle form submission
  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await onFinish(values);
    } finally {
      setLoading(false);
    }
  };

  // Handle initial values, checking multiple property names for compatibility
  const getInitialValue = (obj, keys) => {
    for (const key of keys) {
      if (obj && obj[key] !== undefined) {
        return obj[key];
      }
    }
    return undefined;
  };

  return (
    <>
      <Alert
        message="Editing team member information"
        description="You can update user details and set whether they should be required to reset their password on next login."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />
      <Form 
        layout="vertical"
        onFinish={handleSubmit}
        requiredMark="optional"
        initialValues={{
          firstname: getInitialValue(initialValues, ['firstname', 'firstName']),
          lastname: getInitialValue(initialValues, ['lastname', 'lastName']),
          email: initialValues?.email,
          secondaryEmail: initialValues?.secondaryEmail,
          role: getInitialValue(initialValues, ['Role', 'role']),
          phoneNumber: initialValues?.phoneNumber,
          phoneNumber2: initialValues?.phoneNumber2,
          phoneNumber3: initialValues?.phoneNumber3,
          country: initialValues?.country,
          forcePasswordReset: initialValues?.forcePasswordReset || false,
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
              { min: 2, message: 'Name must be at least 2 characters' }
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
              { min: 2, message: 'Name must be at least 2 characters' }
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
        tooltip="Email address cannot be changed as it's used for authentication"
      >
        <Input prefix={<MailOutlined />} disabled />
      </Form.Item>

<Form.Item
  name="secondaryEmail"
  label="Secondary Email Address"
  tooltip="Optional secondary email for additional communications"
  rules={[
    { type: 'email', message: 'Please enter a valid email' },
  ]}
>
  <Input prefix={<MailOutlined />} placeholder="secondary@example.com" />
</Form.Item>

      <Form.Item
        name="role"
        label="Team Role"
        rules={[{ required: true, message: 'Please select role' }]}
        tooltip="HR members can manage the team and settings. Sellers have access to sales features."
      >
        <Select>
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
              { pattern: /^[\d\+\-\s()]+$/, message: 'Please enter a valid phone number' }
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
      { pattern: /^[\d\+\-\s()]+$/, message: 'Please enter a valid phone number' }
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
      { pattern: /^[\d\+\-\s()]+$/, message: 'Please enter a valid phone number' }
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
            >
              <Option value="" disabled>
                <GlobalOutlined /> Select a country
              </Option>
              {countries.map(country => (
                <Option key={country.code} value={country.name}>
                  {country.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name="forcePasswordReset"
        label="Force Password Reset"
        valuePropName="checked"
        tooltip="When enabled, the user will be required to change their password on next login"
      >
        <Switch 
          checkedChildren="Required" 
          unCheckedChildren="Not Required" 
        />
      </Form.Item>
      
      <Form.Item>
        <Alert
          message="Password Reset"
          description={
            <>
              <p>
                <KeyOutlined /> If you enable "Force Password Reset", the user will need to set a new password when they next log in.
              </p>
              <p>This is useful when you want to ensure users create their own secure passwords.</p>
            </>
          }
          type="warning"
          showIcon
        />
      </Form.Item>

      <Divider />
      
      <Form.Item>
        <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={onCancel}>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            Save Changes
          </Button>
        </Space>
      </Form.Item>
    </Form>
    </>
  );
};

export default EditUserForm;
