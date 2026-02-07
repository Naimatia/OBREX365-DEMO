import React, { useEffect } from 'react';
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
} from 'antd';
import {
  DollarOutlined,
  ContactsOutlined,
  UserOutlined,
  HomeOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { DealStatus, DealSource } from 'models/DealModel';
import LeadsService from 'services/LeadsService';
import ContactsService from 'services/ContactsService';
import PropertyService from 'services/PropertiesService';

const { Option } = Select;
const { TextArea } = Input;

const SellerDealForm = ({
  visible,
  onCancel,
  onSubmit,
  deal,           // existing deal when editing
  loading,
  sellerId,
  companyId,
}) => {
  const [form] = Form.useForm();

  const [leads, setLeads] = React.useState([]);
  const [contacts, setContacts] = React.useState([]);
  const [properties, setProperties] = React.useState([]);
  const [dataLoading, setDataLoading] = React.useState(false);

  // Watch current source (fallback to Leads)
  const source = Form.useWatch('Source', form) ?? DealSource[0].value; // DealSource[0] = Leads

  useEffect(() => {
    if (!visible || !sellerId || !companyId) return;

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
  }, [visible, sellerId, companyId]);

  useEffect(() => {
    if (!visible) {
      form.resetFields();
      return;
    }

    const defaultSource = DealSource[0].value; // Leads

    if (deal) {
      form.setFieldsValue({
        ...deal,
        Amount: deal.Amount ?? 0,
        Source: deal.Source ?? defaultSource,        // Prevent empty source
        lead_id: deal.lead_id ?? undefined,
        contact_id: deal.contact_id ?? undefined,
        property_id: deal.property_id ?? undefined,
      });
    } else {
      form.setFieldsValue({
        Status: DealStatus.OPENED,
        Source: defaultSource,
        Amount: 0,
      });
    }
  }, [visible, deal, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const dealData = {
        ...values,
        lead_id:    source === DealSource[0].value ? values.lead_id    : null,
        contact_id: source === DealSource[1].value ? values.contact_id : null, // Contacts is index 1
        property_id: values.property_id ?? null,
        seller_id: sellerId,
        company_id: companyId,
      };

      await onSubmit(dealData);
      message.success(deal ? 'Deal updated successfully' : 'Deal created successfully');
      form.resetFields();
    } catch (error) {
      console.log('Form validation/submit failed:', error);
    }
  };

  const getLeadRules = () => [
    { required: source === DealSource[0].value, message: 'Please select a lead!' },
  ];

  const getContactRules = () => [
    { required: source === DealSource[1].value, message: 'Please select a contact!' },
  ];

  const renderRelatedSelector = () => {
    if (source === DealSource[0].value) { // Leads
      return (
        <Form.Item name="lead_id" label="Select Lead" rules={getLeadRules()}>
          <Select
            placeholder="Choose a lead"
            loading={dataLoading}
            showSearch
            filterOption={(input, option) =>
              option?.children?.props?.children?.toString()?.toLowerCase()?.includes(input.toLowerCase())
            }
            allowClear
          >
            {leads.map((lead, index) => (
              <Option
                key={lead.id ?? `lead-${index}`}
                value={lead.id}
                disabled={!lead.id}
              >
                <Space>
                  <UserOutlined />
                  {lead.name || 'Unnamed'} - {lead.email || 'No email'}
                  {lead.InterestLevel && (
                    <span
                      style={{
                        color:
                          lead.InterestLevel === 'High' ? '#ff4d4f' :
                          lead.InterestLevel === 'Medium' ? '#faad14' : '#1890ff',
                      }}
                    >
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

    if (source === DealSource[1].value) { // Contacts
      return (
        <Form.Item name="contact_id" label="Select Contact" rules={getContactRules()}>
          <Select
            placeholder="Choose a contact"
            loading={dataLoading}
            showSearch
            filterOption={(input, option) =>
              option?.children?.props?.children?.toString()?.toLowerCase()?.includes(input.toLowerCase())
            }
            allowClear
          >
            {contacts.map((contact, index) => (
              <Option
                key={contact.id ?? `contact-${index}`}
                value={contact.id}
                disabled={!contact.id}
              >
                <Space>
                  <ContactsOutlined />
                  {contact.name || 'Unnamed'} - {contact.email || 'No email'}
                  {contact.status && (
                    <span
                      style={{
                        color:
                          contact.status === 'Deal' ? '#52c41a' :
                          contact.status === 'Contacted' ? '#1890ff' : '#d9d9d9',
                      }}
                    >
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

    return null;
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
        </Button>,
      ]}
    >
      <Spin spinning={dataLoading}>
        <Form
          form={form}
          layout="vertical"
          size="large"
          initialValues={{
            Source: DealSource[0].value,   // Always start with Leads
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
                <Select placeholder="Select deal source">
                  {DealSource.map((src) => (
                    <Option key={src.value} value={src.value}>
                      <Space>
                        <span style={{ color: src.color }}>{src.icon}</span>
                        {src.value}
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
                rules={[{ required: true, message: 'Please select deal status!' }]}
              >
                <Select placeholder="Select status">
                  <Option value={DealStatus.OPENED}>
                    <Space><span style={{ color: '#1890ff' }}>●</span> Opened</Space>
                  </Option>
                  <Option value={DealStatus.GAIN}>
                    <Space><span style={{ color: '#52c41a' }}>●</span> Gain</Space>
                  </Option>
                  <Option value={DealStatus.LOSS}>
                    <Space><span style={{ color: '#ff4d4f' }}>●</span> Loss</Space>
                  </Option>
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
              {properties.map((prop, index) => (
                <Option
                  key={prop.id ?? `prop-${index}`}
                  value={prop.id}
                  disabled={!prop.id}
                >
                  <Space>
                    <HomeOutlined />
                    {prop.title || prop.name || 'Unnamed Property'} - {prop.location || prop.city || ''}
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
        </Form>
      </Spin>
    </Modal>
  );
};

export default SellerDealForm;