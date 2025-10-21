// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Button,
  Row,
  Col,
  Select,
  InputNumber,
  Modal,
  Space,
  message 
} from 'antd';
import { DealStatus, DealSource } from 'models/DealModel';
import { 
  DollarOutlined, 
  FileTextOutlined, 
  ContactsOutlined,
  UserOutlined,
  HomeOutlined,
  TeamOutlined
} from '@ant-design/icons';
import LeadsService from 'services/LeadsService';
import ContactsService from 'services/ContactsService';

const { Option } = Select;
const { TextArea } = Input;

/**
 * Form component for creating/editing deals
 */
const SellerDealForm = ({ 
  visible, 
  onCancel, 
  onSubmit, 
  deal, 
  loading,
  sellerId,
  companyId 
}) => {
  const [form] = Form.useForm();
  const [sourceType, setSourceType] = useState(DealSource.LEADS);
  const [leads, setLeads] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Validation rules
  const rules = {
    Source: [
      { required: true, message: 'Please select deal source!' }
    ],
    Amount: [
      { required: true, message: 'Please enter deal amount!' },
      { type: 'number', min: 0, message: 'Amount must be positive!' }
    ],
    Status: [
      { required: true, message: 'Please select deal status!' }
    ],
    Description: [
      { required: true, message: 'Please enter deal description!' },
      { min: 10, message: 'Description must be at least 10 characters!' }
    ]
  };

  // Load leads and contacts when component mounts or source changes
  useEffect(() => {
    const loadSourceData = async () => {
      if (!sellerId || !companyId) {
        console.log('Missing sellerId or companyId:', { sellerId, companyId });
        return;
      }
      
      setLoadingData(true);
      try {
        // Load leads
        const leadsData = await LeadsService.getSellerLeads(companyId, sellerId);
        setLeads(leadsData);
        
        // Load contacts
        const allContacts = await ContactsService.getCompanyContacts(companyId);
        const sellerContacts = allContacts.filter(contact => contact.seller_id === sellerId);
        setContacts(sellerContacts);
        
        // For properties, we'll create a simple mock since PropertiesService might not exist
        // In production, replace with actual PropertiesService call
        setProperties([
          { id: '1', title: 'Luxury Apartment - Downtown', location: 'Dubai Marina' },
          { id: '2', title: 'Villa - Palm Jumeirah', location: 'Palm Jumeirah' },
          { id: '3', title: 'Office Space - Business Bay', location: 'Business Bay' }
        ]);
      } catch (error) {
        console.error('Error loading source data:', error);
        message.error('Failed to load source data');
      } finally {
        setLoadingData(false);
      }
    };

    if (visible) {
      loadSourceData();
    }
  }, [visible, sellerId, companyId]);

  // Set form values when deal prop changes
  useEffect(() => {
    if (deal) {
      form.setFieldsValue({
        ...deal,
        Amount: deal.Amount || 0
      });
      setSourceType(deal.Source || DealSource.LEADS);
    } else {
      // Set default values for new deal
      form.setFieldsValue({
        Status: DealStatus.OPENED,
        Source: DealSource.LEADS,
        Amount: 0
      });
      setSourceType(DealSource.LEADS);
    }
  }, [form, deal]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      const dealData = {
        ...values,
        // Ensure nullability for IDs based on source
        contact_id: values.Source === DealSource.CONTACTS ? values.contact_id : null,
        lead_id: values.Source === DealSource.LEADS ? values.lead_id : null,
        property_id: values.property_id || null,
        seller_id: sellerId,
        company_id: companyId
      };
      
      await onSubmit(dealData);
      form.resetFields();
      setSourceType(DealSource.LEADS);
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  const handleSourceChange = (value) => {
    setSourceType(value);
    // Clear related fields when source changes
    form.setFieldsValue({
      contact_id: undefined,
      lead_id: undefined
    });
  };

  const renderSourceSelection = () => {
    if (sourceType === DealSource.LEADS) {
      return (
        <Form.Item
          name="lead_id"
          label="Select Lead"
          rules={[{ required: true, message: 'Please select a lead!' }]}
        >
          <Select 
            placeholder="Choose a lead"
            loading={loadingData}
            showSearch
            filterOption={(input, option) =>
              option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
          >
            {leads.map(lead => (
              <Option key={lead.id} value={lead.id}>
                <Space>
                  <UserOutlined />
                  {lead.name} - {lead.email}
                  {lead.InterestLevel && (
                    <span style={{ 
                      color: lead.InterestLevel === 'High' ? '#ff4d4f' : 
                            lead.InterestLevel === 'Medium' ? '#faad14' : '#1890ff' 
                    }}>
                      ({lead.InterestLevel})
                    </span>
                  )}
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>
      );
    }
    
    if (sourceType === DealSource.CONTACTS) {
      return (
        <Form.Item
          name="contact_id"
          label="Select Contact"
          rules={[{ required: true, message: 'Please select a contact!' }]}
        >
          <Select 
            placeholder="Choose a contact"
            loading={loadingData}
            showSearch
            filterOption={(input, option) =>
              option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
          >
            {contacts.map(contact => (
              <Option key={contact.id} value={contact.id}>
                <Space>
                  <ContactsOutlined />
                  {contact.name} - {contact.email}
                  {contact.status && (
                    <span style={{ 
                      color: contact.status === 'Deal' ? '#52c41a' : 
                            contact.status === 'Contacted' ? '#1890ff' : '#d9d9d9' 
                    }}>
                      ({contact.status})
                    </span>
                  )}
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>
      );
    }
    
    return null; // Freelance - no selection needed
  };

  return (
    <Modal
      title={deal ? 'Edit Deal' : 'Create New Deal'}
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
          icon={<DollarOutlined />}
        >
          {deal ? 'Update Deal' : 'Create Deal'}
        </Button>
      ]}
    >
      <Form form={form} layout="vertical" size="large">
        {/* Source and Related Selection */}
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="Source"
              label="Deal Source"
              rules={rules.Source}
            >
              <Select 
                placeholder="Select deal source"
                onChange={handleSourceChange}
              >
                <Option value={DealSource.LEADS}>
                  <Space>
                    <TeamOutlined />
                    Leads
                  </Space>
                </Option>
                <Option value={DealSource.CONTACTS}>
                  <Space>
                    <ContactsOutlined />
                    Contacts
                  </Space>
                </Option>
                <Option value={DealSource.FREELANCE}>
                  <Space>
                    <UserOutlined />
                    Freelance
                  </Space>
                </Option>
              </Select>
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12}>
            {renderSourceSelection()}
          </Col>
        </Row>

        {/* Amount and Status */}
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="Amount"
              label="Deal Amount (AED)"
              rules={rules.Amount}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="Enter amount in AED"
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/AED\s?|(,*)/g, '')}
                prefix="AED"
                min={0}
                precision={2}
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12}>
            <Form.Item
              name="Status"
              label="Deal Status"
              rules={rules.Status}
            >
              <Select placeholder="Select status">
                <Option value={DealStatus.OPENED}>
                  <Space>
                    <span style={{ color: '#1890ff' }}>●</span>
                    Opened
                  </Space>
                </Option>
                <Option value={DealStatus.GAIN}>
                  <Space>
                    <span style={{ color: '#52c41a' }}>●</span>
                    Gain
                  </Space>
                </Option>
                <Option value={DealStatus.LOSS}>
                  <Space>
                    <span style={{ color: '#ff4d4f' }}>●</span>
                    Loss
                  </Space>
                </Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* Property Selection */}
        <Row gutter={16}>
          <Col xs={24}>
            <Form.Item
              name="property_id"
              label="Related Property (Optional)"
            >
              <Select 
                placeholder="Select a property (optional)"
                allowClear
                showSearch
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {properties.map(property => (
                  <Option key={property.id} value={property.id}>
                    <Space>
                      <HomeOutlined />
                      {property.title} - {property.location}
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* Description */}
        <Row gutter={16}>
          <Col xs={24}>
            <Form.Item
              name="Description"
              label="Deal Description"
              rules={rules.Description}
            >
              <TextArea
                rows={4}
                placeholder="Describe the deal details, terms, and any relevant information..."
                maxLength={1000}
                showCount
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default SellerDealForm;
