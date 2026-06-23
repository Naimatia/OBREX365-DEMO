// @ts-nocheck
import React, { useEffect, useState } from 'react';
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
  message,
  Spin,
  Avatar,
  Tag,
  Divider,
  Typography 
} from 'antd';
import {
  DollarOutlined,
  ContactsOutlined,
  UserOutlined,
  HomeOutlined,
  TeamOutlined,
  MailOutlined,
  PhoneOutlined,
  GlobalOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { DealStatus, DealStatusLabels, DealStatusColors, DealSourceEnum } from 'models/DealModel';
import LeadsService from 'services/LeadsService';
import ContactsService from 'services/ContactsService';
import PropertyService from 'services/PropertiesService';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

// Status options with new statuses
const statusOptions = [
  { value: DealStatus.OPENED, label: 'Opened', color: 'blue' },
  { value: DealStatus.PROPOSAL, label: 'Proposal', color: 'purple' },
  { value: DealStatus.WON, label: 'Won', color: 'gold' },
  { value: DealStatus.LOST, label: 'Lost', color: 'red' }
];

// Source options
const sourceOptions = [
  { value: DealSourceEnum.LEADS, label: 'Leads', icon: '🧲', color: '#1890ff' },
  { value: DealSourceEnum.CONTACTS, label: 'Contacts', icon: '👥', color: '#52c41a' },
  { value: DealSourceEnum.FACEBOOK, label: 'Facebook', icon: '📘', color: '#1877F2' },
  { value: DealSourceEnum.INSTAGRAM, label: 'Instagram', icon: '📷', color: '#E4405F' },
  { value: DealSourceEnum.WEBSITE, label: 'Website', icon: '🌐', color: '#52c41a' },
  { value: DealSourceEnum.LINKEDIN, label: 'LinkedIn', icon: '💼', color: '#0A66C2' },
  { value: DealSourceEnum.TIKTOK, label: 'TikTok', icon: '🎵', color: '#ff0050' },
  { value: DealSourceEnum.FREELANCE, label: 'Freelance', icon: '💪', color: '#fa8c16' }
];

const SellerDealForm = ({
  visible,
  onCancel,
  onSubmit,
  deal,
  loading,
  sellerId,
  companyId,
}) => {
  const [form] = Form.useForm();
  const [leads, setLeads] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [properties, setProperties] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [selectedSource, setSelectedSource] = useState(DealSourceEnum.LEADS);

  // Watch source changes
  const source = Form.useWatch('Source', form) || DealSourceEnum.LEADS;

  useEffect(() => {
    if (!visible) {
      form.resetFields();
      setSelectedSource(DealSourceEnum.LEADS);
      return;
    }

    // Load data
    const loadData = async () => {
      setDataLoading(true);
      try {
        const [leadsData, allContactsData, propertiesData] = await Promise.all([
          LeadsService.getSellerLeads(companyId, sellerId),
          ContactsService.getCompanyContacts(companyId),
          PropertyService.getCompanyProperties(companyId),
        ]);

        const sellerContacts = allContactsData.filter(c => c.seller_id === sellerId);

        setLeads(leadsData?.filter(lead => lead?.id) ?? []);
        setContacts(sellerContacts?.filter(c => c?.id) ?? []);
        setProperties(propertiesData?.filter(p => p?.id) ?? []);
      } catch (error) {
        console.error('Error loading form data:', error);
        message.error('Failed to load leads, contacts or properties');
      } finally {
        setDataLoading(false);
      }
    };

    loadData();

    // Set form values when editing
    if (deal) {
      const formValues = {
        ...deal,
        Amount: deal.Amount || 0,
        Source: deal.Source || DealSourceEnum.LEADS,
        lead_id: deal.lead_id || undefined,
        contact_id: deal.contact_id || undefined,
        property_id: deal.property_id || undefined,
        Status: deal.Status || DealStatus.OPENED,
        Description: deal.Description || '',
      };
      form.setFieldsValue(formValues);
      setSelectedSource(formValues.Source);
    } else {
      // Set default values for new deal
      form.setFieldsValue({
        Status: DealStatus.OPENED,
        Source: DealSourceEnum.LEADS,
        Amount: 0,
      });
      setSelectedSource(DealSourceEnum.LEADS);
    }
  }, [visible, deal, form, companyId, sellerId]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const dealData = {
        ...values,
        lead_id: source === DealSourceEnum.LEADS ? values.lead_id : null,
        contact_id: source === DealSourceEnum.CONTACTS ? values.contact_id : null,
        property_id: values.property_id || null,
        seller_id: sellerId,
        company_id: companyId,
        // Ensure status is set
        Status: values.Status || DealStatus.OPENED,
      };

      await onSubmit(dealData);
      form.resetFields();
    } catch (error) {
      console.log('Form validation/submit failed:', error);
    }
  };

  // Render related selector based on source
  const renderRelatedSelector = () => {
    if (source === DealSourceEnum.LEADS) {
      return (
        <Form.Item 
          name="lead_id" 
          label="Select Lead"
          rules={[{ required: true, message: 'Please select a lead!' }]}
        >
          <Select
            placeholder="Choose a lead"
            loading={dataLoading}
            showSearch
            filterOption={(input, option) =>
              option?.children?.props?.children?.toString()?.toLowerCase()?.includes(input.toLowerCase())
            }
            allowClear
          >
            {leads.map((lead) => (
              <Option key={lead.id} value={lead.id}>
                <Space>
                  <Avatar size={24} style={{ backgroundColor: '#1890ff' }}>
                    {(lead.name || 'U')[0].toUpperCase()}
                  </Avatar>
                  <div>
                    <div>{lead.name || 'Unnamed'}</div>
                    {lead.email && (
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        <MailOutlined /> {lead.email}
                      </Text>
                    )}
                  </div>
                  {lead.InterestLevel && (
                    <Tag color={
                      lead.InterestLevel === 'High' ? 'red' :
                      lead.InterestLevel === 'Medium' ? 'orange' : 'blue'
                    }>
                      {lead.InterestLevel}
                    </Tag>
                  )}
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>
      );
    }

    if (source === DealSourceEnum.CONTACTS) {
      return (
        <Form.Item 
          name="contact_id" 
          label="Select Contact"
          rules={[{ required: true, message: 'Please select a contact!' }]}
        >
          <Select
            placeholder="Choose a contact"
            loading={dataLoading}
            showSearch
            filterOption={(input, option) =>
              option?.children?.props?.children?.toString()?.toLowerCase()?.includes(input.toLowerCase())
            }
            allowClear
          >
            {contacts.map((contact) => (
              <Option key={contact.id} value={contact.id}>
                <Space>
                  <Avatar size={24} style={{ backgroundColor: '#52c41a' }}>
                    {(contact.name || 'U')[0].toUpperCase()}
                  </Avatar>
                  <div>
                    <div>{contact.name || 'Unnamed'}</div>
                    {contact.email && (
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        <MailOutlined /> {contact.email}
                      </Text>
                    )}
                    {contact.phoneNumber && (
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        <PhoneOutlined /> {contact.phoneNumber}
                      </Text>
                    )}
                  </div>
                  <Tag color={
                    contact.status === 'active' ? 'green' :
                    contact.status === 'hot' ? 'red' :
                    contact.status === 'cold' ? 'blue' : 'default'
                  }>
                    {contact.status || 'Active'}
                  </Tag>
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>
      );
    }

    return null;
  };

  return (
    <Modal
      title={
        <Space>
          <DollarOutlined style={{ color: '#1890ff' }} />
          <span>{deal ? 'Edit Deal' : 'Create New Deal'}</span>
          {deal && (
            <Tag color={DealStatusColors[deal.Status] || 'default'}>
              {DealStatusLabels[deal.Status] || deal.Status || 'Unknown'}
            </Tag>
          )}
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={700}
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
        </Button>,
      ]}
      destroyOnClose
    >
      <Spin spinning={dataLoading}>
        <Form
          form={form}
          layout="vertical"
          size="middle"
          initialValues={{
            Source: DealSourceEnum.LEADS,
            Status: DealStatus.OPENED,
            Amount: 0,
          }}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="Source"
                label="Deal Source"
                rules={[{ required: true, message: 'Please select deal source!' }]}
              >
                <Select 
                  placeholder="Select deal source"
                  onChange={(value) => setSelectedSource(value)}
                >
                  {sourceOptions.map((src) => (
                    <Option key={src.value} value={src.value}>
                      <Space>
                        <span style={{ color: src.color }}>{src.icon}</span>
                        {src.label}
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              {renderRelatedSelector()}
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="Amount"
                label="Deal Amount (AED)"
                rules={[
                  { required: true, message: 'Please enter deal amount!' },
                  { type: 'number', min: 0, message: 'Amount must be positive!' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Enter amount in AED"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value.replace(/AED\s?|(,*)/g, '')}
                  prefix={<DollarOutlined />}
                  min={0}
                  step={1000}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name="Status"
                label="Deal Status"
                rules={[{ required: true, message: 'Please select deal status!' }]}
              >
                <Select placeholder="Select status">
                  {statusOptions.map(opt => (
                    <Option key={opt.value} value={opt.value}>
                      <Tag color={opt.color}>{opt.label}</Tag>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="property_id" label="Related Property (Optional)">
            <Select
              placeholder="Select a property (optional)"
              allowClear
              showSearch
              loading={dataLoading}
              filterOption={(input, option) =>
                option?.children?.props?.children?.toString()?.toLowerCase()?.includes(input.toLowerCase())
              }
            >
              {properties.map((prop) => (
                <Option key={prop.id} value={prop.id}>
                  <Space>
                    <HomeOutlined />
                    {prop.title || prop.name || 'Unnamed Property'}
                    {prop.city && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        <GlobalOutlined /> {prop.city}
                      </Text>
                    )}
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="Description"
            label="Deal Description"
            rules={[
              { required: true, message: 'Please enter deal description!' },
              { min: 10, message: 'Description must be at least 10 characters!' },
            ]}
          >
            <TextArea
              rows={4}
              placeholder="Describe the deal details, terms, negotiation status, and any relevant information..."
              maxLength={1000}
              showCount
            />
          </Form.Item>

          <Divider style={{ margin: '8px 0' }} />

          <div style={{ 
            padding: '12px', 
            background: '#fafafa', 
            borderRadius: 8,
            marginBottom: 8
          }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <FileTextOutlined /> Deal will be assigned to you as the seller.
            </Text>
          </div>
        </Form>
      </Spin>
    </Modal>
  );
};

// Add missing import

export default SellerDealForm;