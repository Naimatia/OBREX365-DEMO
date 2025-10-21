// @ts-nocheck
import React, { useEffect } from 'react';
import { 
  Form, 
  Input, 
  Button, 
  Select, 
  DatePicker, 
  Card,
  Row,
  Col,
  Divider,
  Space,
  message 
} from 'antd';
import moment from 'moment';
import { ContactStatus } from 'models/ContactModel';
import { 
  PhoneOutlined, 
  MailOutlined, 
  UserOutlined, 
  GlobalOutlined, 
  CommentOutlined,
  SaveOutlined,
  CloseOutlined
} from '@ant-design/icons';
// Import country list from constants
import countries from '../../../../../constants/CountryList';

const { Option } = Select;
const { TextArea } = Input;

/**
 * Contact form component for sellers to create and edit contacts
 */
const SellerContactForm = ({ 
  contact, 
  onSubmit, 
  onCancel, 
  loading = false 
}) => {
  const [form] = Form.useForm();
  const isEditMode = !!contact?.id;

  // Reset form when contact changes
  useEffect(() => {
    if (contact) {
      const formData = {
        ...contact,
        AffectingDate: contact.AffectingDate ? moment(contact.AffectingDate) : moment(),
      };
      form.setFieldsValue(formData);
    } else {
      form.resetFields();
      // Set default values for new contact
      form.setFieldsValue({
        AffectingDate: moment(),
        status: ContactStatus.PENDING
      });
    }
  }, [form, contact]);

  // Handle form submission
  const handleSubmit = () => {
    form.validateFields()
      .then(values => {
        // Format dates from moment objects to Date objects
        const formattedValues = {
          ...values,
          AffectingDate: values.AffectingDate ? values.AffectingDate.toDate() : new Date(),
          status: ContactStatus.PENDING, // Always set status to PENDING for sellers
        };
        onSubmit(formattedValues);
      })
      .catch(info => {
        message.error('Please check the form for errors.');
        console.error('Validate Failed:', info);
      });
  };

  // Form validation rules
  const rules = {
    name: [
      { required: true, message: 'Please enter the contact name' },
      { min: 2, message: 'Name must be at least 2 characters' }
    ],
    email: [
      { type: 'email', message: 'Please enter a valid email address' }
    ],
    phoneNumber: [
      { pattern: /^[\+]?[\d\s\-\(\)]+$/, message: 'Please enter a valid phone number' }
    ],
    country: [
      { required: true, message: 'Please select a country' }
    ]
  };

  return (
    <Card style={{ maxHeight: '80vh', overflow: 'auto' }}>
      <Form 
        form={form} 
        layout="vertical"
        onFinish={handleSubmit}
        size="middle"
      >
        {/* Basic Information */}
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="name"
              label="Full Name"
              rules={rules.name}
            >
              <Input 
                prefix={<UserOutlined />} 
                placeholder="Enter contact's full name"
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12}>
            <Form.Item
              name="email"
              label="Email Address"
              rules={rules.email}
            >
              <Input 
                prefix={<MailOutlined />} 
                placeholder="contact@example.com"
                type="email"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="phoneNumber"
              label="Phone Number"
              rules={rules.phoneNumber}
            >
              <Input 
                prefix={<PhoneOutlined />} 
                placeholder="+1 234 567 8900"
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12}>
            <Form.Item
              name="country"
              label="Country"
              rules={rules.country}
            >
              <Select 
                placeholder="Select country"
                showSearch
                filterOption={(input, option) =>
                  String(option?.children || '').toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {countries.map(country => (
                  <Option key={country.code} value={country.name}>
                    `${country.flag} ${country.name}`
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider />

        {/* Additional Information */}
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="AffectingDate"
              label="Assignment Date"
              rules={[{ required: true, message: 'Please select assignment date' }]}
            >
              <DatePicker 
                style={{ width: '100%' }} 
                placeholder="Select assignment date"
                format="YYYY-MM-DD"
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12}>
            <Form.Item
              name="status"
              label="Status"
            >
              <Select disabled>
                <Option value={ContactStatus.PENDING}>
                  <Space>
                    <span style={{ color: '#faad14' }}>●</span>
                    Pending
                  </Space>
                </Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* Description */}
        <Form.Item
          name="description"
          label="Description / Notes"
        >
          <TextArea 
            rows={4}
            placeholder="Add any additional information about this contact..."
            maxLength={500}
            showCount
          />
        </Form.Item>

        {/* Initial Note (only for new contacts) */}
        {!isEditMode && (
          <Form.Item
            name="initialNote"
            label="Initial Note (Optional)"
            extra="This note will be added to the contact's history"
          >
            <TextArea 
              rows={3}
              prefix={<CommentOutlined />}
              placeholder="Add an initial note about this contact..."
              maxLength={300}
              showCount
            />
          </Form.Item>
        )}

        <Divider />

        {/* Form Actions */}
        <Row justify="end" gutter={8}>
          <Col>
            <Button 
              onClick={onCancel}
              icon={<CloseOutlined />}
            >
              Cancel
            </Button>
          </Col>
          <Col>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              icon={<SaveOutlined />}
            >
              {isEditMode ? 'Update Contact' : 'Create Contact'}
            </Button>
          </Col>
        </Row>
      </Form>
    </Card>
  );
};

export default SellerContactForm;
