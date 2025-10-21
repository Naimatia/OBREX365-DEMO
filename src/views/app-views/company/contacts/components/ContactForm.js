import React, { useState, useEffect } from 'react';
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
  message 
} from 'antd';
import moment from 'moment';
import { ContactStatus } from 'models/ContactModel';
import { PhoneOutlined, MailOutlined, UserOutlined, GlobalOutlined, CommentOutlined } from '@ant-design/icons';
// Import country list from constants
import countries from '../../../../../constants/CountryList';

const { Option } = Select;
const { TextArea } = Input;

/**
 * Contact form component for creating and editing contacts
 */
const ContactForm = ({ 
  contact, 
  sellers, 
  onSubmit, 
  onCancel, 
  loading = false 
}) => {
  const [form] = Form.useForm();
  const isEditMode = !!contact?.id;

  // Reset form when contact changes (switching between create/edit or editing different contacts)
  useEffect(() => {
    if (contact) {
      const formData = {
        ...contact,
        AffectingDate: contact.AffectingDate ? moment(contact.AffectingDate) : null,
      };
      form.setFieldsValue(formData);
    } else {
      form.resetFields();
    }
  }, [form, contact]);

  // Handle form submission
  const handleSubmit = () => {
    form.validateFields()
      .then(values => {
        // Format dates from moment objects to Date objects
        const formattedValues = {
          ...values,
          // Always set status to PENDING
          status: ContactStatus.PENDING,
          AffectingDate: values.AffectingDate ? values.AffectingDate.toDate() : null,
        };
        onSubmit(formattedValues);
      })
      .catch(info => {
        message.error('Please check the form for errors.');
        console.error('Validate Failed:', info);
      });
  };

  return (
    <Card className="contact-form-card">
      <Form
        form={form}
        layout="vertical"
        name="contact_form"
        initialValues={{
          status: ContactStatus.PENDING,
          seller_id: '',
        }}
      >
        <Row gutter={16}>
          <Col xs={24} sm={24} md={12}>
            <Form.Item
              name="name"
              label="Full Name"
              rules={[
                { required: true, message: 'Please enter contact name' },
              ]}
            >
              <Input prefix={<UserOutlined />} placeholder="Enter full name" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={24} md={12}>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { 
                  type: 'email',
                  message: 'Please enter a valid email'
                },
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="Email address" />
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col xs={24} sm={24} md={12}>
            <Form.Item
              name="phoneNumber"
              label="Phone Number"
              rules={[
                { required: true, message: 'Please enter phone number' },
              ]}
            >
              <Input prefix={<PhoneOutlined />} placeholder="Phone number" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={24} md={12}>
            <Form.Item
              name="region"
              label="Country"
              rules={[
                { required: true, message: 'Please select a country' }
              ]}
            >
              <Select
                placeholder="Select country"
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) => 
                  option?.children?.toString().toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
                suffixIcon={<GlobalOutlined />}
              >
                {countries.map(country => (
                  <Option key={country.code} value={country.name}>
                    {country.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          {/* Status is now set automatically to PENDING */}
          <Col xs={24} sm={24} md={24}>

            <Form.Item
              name="seller_id"
              label="Assign to Seller"
            >
              <Select placeholder="Select a seller (optional)">
                <Option value="">Not assigned</Option>
                {sellers.map(seller => (
                  <Option key={seller.id} value={seller.id}>{seller.name}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
        
        {/* Only show assignment date if seller is selected */}
        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) => prevValues.seller_id !== currentValues.seller_id}
        >
          {({ getFieldValue }) => {
            const sellerId = getFieldValue('seller_id');
            return sellerId ? (
              <Row gutter={16}>
                <Col xs={24} sm={24} md={12}>
                  <Form.Item
                    name="AffectingDate"
                    label="Assignment Date"
                  >
                    <DatePicker 
                      style={{ width: '100%' }} 
                      placeholder="Select assignment date"
                    />
                  </Form.Item>
                </Col>
              </Row>
            ) : null;
          }}
        </Form.Item>

        {/* Initial note for the contact */}
        {!isEditMode && (
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="initialNote"
                label="Initial Note (Optional)"
              >
                <>
                  <span className="ant-input-prefix"><CommentOutlined /></span>
                  <TextArea 
                    rows={4} 
                    placeholder="Add any initial notes about this contact" 
                    style={{ paddingLeft: '30px' }}
                  />
                </>
              </Form.Item>
            </Col>
          </Row>
        )}
        
        <Divider />
        
        <Row justify="end" gutter={8}>
          <Col>
            <Button onClick={onCancel}>
              Cancel
            </Button>
          </Col>
          <Col>
            <Button type="primary" onClick={handleSubmit} loading={loading}>
              {isEditMode ? 'Update Contact' : 'Create Contact'}
            </Button>
          </Col>
        </Row>
      </Form>
    </Card>
  );
};

export default ContactForm;
