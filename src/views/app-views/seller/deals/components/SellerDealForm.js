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
  // @ts-ignore
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
  // @ts-ignore
  const [sourceType, setSourceType] = useState(DealSource.LEADS);
  const [leads, setLeads] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Validation rules
  const rules = {
    Source: [{ required: true, message: 'Please select deal source!' }],
    Amount: [
      { required: true, message: 'Please enter deal amount!' },
      { type: 'number', min: 0, message: 'Amount must be positive!' }
    ],
    Status: [{ required: true, message: 'Please select deal status!' }],
    Description: [
      { required: true, message: 'Please enter deal description!' },
      { min: 10, message: 'Description must be at least 10 characters!' }
    ],
    // @ts-ignore
    lead_id: [{ required: sourceType === DealSource.LEADS, message: 'Please select a lead!' }],
    // @ts-ignore
    contact_id: [{ required: sourceType === DealSource.CONTACTS, message: 'Please select a contact!' }]
  };

  // Load leads, contacts, properties when modal opens
  useEffect(() => {
    const loadSourceData = async () => {
      if (!sellerId || !companyId) return;

      setLoadingData(true);
      try {
        const leadsData = await LeadsService.getSellerLeads(companyId, sellerId);
        setLeads(leadsData);

        const allContacts = await ContactsService.getCompanyContacts(companyId);
        const sellerContacts = allContacts.filter(c => c.seller_id === sellerId);
        setContacts(sellerContacts);

        // Mock properties (replace with real service when available)
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

  // Set form values when deal changes or modal opens
  useEffect(() => {
    if (visible) {
      if (deal) {
        form.setFieldsValue({
          ...deal,
          Amount: deal.Amount || 0,
          // @ts-ignore
          Source: deal.Source || DealSource.LEADS
        });
        // @ts-ignore
        setSourceType(deal.Source || DealSource.LEADS);
      } else {
        form.setFieldsValue({
          Status: DealStatus.OPENED,
          // @ts-ignore
          Source: DealSource.LEADS,
          Amount: 0
        });
        // @ts-ignore
        setSourceType(DealSource.LEADS);
      }
    }
  }, [visible, deal, form]);

  const handleSubmit = async () => {
    try {
      // This triggers validation → shows "Please select deal source!" if missing
      const values = await form.validateFields();

      const dealData = {
        ...values,
        // @ts-ignore
        contact_id: values.Source === DealSource.CONTACTS ? values.contact_id : null,
        // @ts-ignore
        lead_id: values.Source === DealSource.LEADS ? values.lead_id : null,
        property_id: values.property_id || null,
        seller_id: sellerId,
        company_id: companyId
      };

      await onSubmit(dealData);
      form.resetFields();
      // @ts-ignore
      setSourceType(DealSource.LEADS);
      message.success(deal ? 'Deal updated successfully' : 'Deal created successfully');
    } catch (error) {
      console.log('Validation failed or submit error:', error);
      // Ant Design already shows error messages for required fields
    }
  };

  const handleSourceChange = (value) => {
    setSourceType(value);
    // Clear dependent fields when source changes
    form.setFieldsValue({
      lead_id: undefined,
      contact_id: undefined
    });
  };

  const renderSourceSelection = () => {
    // @ts-ignore
    if (sourceType === DealSource.LEADS) {
      return (
        <Form.Item
          name="lead_id"
          label="Select Lead"
          rules={rules.lead_id}
        >
          <Select
            placeholder="Choose a lead"
            loading={loadingData}
            showSearch
            filterOption={(input, option) =>
              // @ts-ignore
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

    // @ts-ignore
    if (sourceType === DealSource.CONTACTS) {
      return (
        <Form.Item
          name="contact_id"
          label="Select Contact"
          rules={rules.contact_id}
        >
          <Select
            placeholder="Choose a contact"
            loading={loadingData}
            showSearch
            filterOption={(input, option) =>
              // @ts-ignore
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
                <Option value={DealSource.
// @ts-ignore
                LEADS}>
                  <Space>
                    <TeamOutlined />
                    Leads
                  </Space>
                </Option>
                <Option value={DealSource.
// @ts-ignore
                CONTACTS}>
                  <Space>
                    <ContactsOutlined />
                    Contacts
                  </Space>
                </Option>
                <Option value={DealSource.
// @ts-ignore
                FREELANCE}>
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
            <Form.Item name="Amount" label="Deal Amount (AED)" 
// @ts-ignore
            rules={rules.Amount}>
              <InputNumber
                style={{ width: '100%' }}
                placeholder="Enter amount in AED"
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                // @ts-ignore
                parser={value => value.replace(/AED\s?|(,*)/g, '')}
                prefix="AED"
                min={0}
                precision={2}
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item name="Status" label="Deal Status" rules={rules.Status}>
              <Select placeholder="Select status">
                <Option value={DealStatus.OPENED}>
                  <Space>
                    <span style={{ color: '#1890ff' }}>●</span> Opened
                  </Space>
                </Option>
                <Option value={DealStatus.GAIN}>
                  <Space>
                    <span style={{ color: '#52c41a' }}>●</span> Gain
                  </Space>
                </Option>
                <Option value={DealStatus.LOSS}>
                  <Space>
                    <span style={{ color: '#ff4d4f' }}>●</span> Loss
                  </Space>
                </Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* Property Selection (optional) */}
        <Row gutter={16}>
          <Col xs={24}>
            <Form.Item name="property_id" label="Related Property (Optional)">
              <Select
                placeholder="Select a property (optional)"
                allowClear
                showSearch
                filterOption={(input, option) =>
                  // @ts-ignore
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
            <Form.Item name="Description" label="Deal Description" rules={rules.Description}>
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