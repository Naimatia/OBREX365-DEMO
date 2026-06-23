// LeadForm.js - Updated with new status system
import React, { useEffect, useState } from 'react';
import { 
  Form, Input, Select, Button, Row, Col, Modal, Divider, Typography, Alert, Space, Switch, Tag
} from 'antd';
import { 
  UserOutlined, MailOutlined, PhoneOutlined, GlobalOutlined, DollarOutlined, 
  InfoCircleOutlined, 
} from '@ant-design/icons';
import { LeadStatus, LeadInterestLevel, LeadStatusLabels, LeadStatusColors } from 'models/LeadModel';
import { db, collection, getDocs } from 'configs/FirebaseConfig';
import countries from 'constants/countries';
import dayjs from 'dayjs';
import { UserRoles } from 'models/UserModel';

const { Option } = Select;
const { Text, Title } = Typography;

const salesRoles = [
  UserRoles.SELLER, UserRoles.SALES_EXECUTIVE, UserRoles.AGENT,
  UserRoles.TEAM_LEADER, UserRoles.SALES_MANAGER,
  UserRoles.OFF_PLAN_SALES, UserRoles.READY_TO_MOVE_SALES,
];

// Source options with icons
const sourceOptions = [
  { value: 'Facebook', icon: '📘', color: '#1877F2' },
  { value: 'Instagram', icon: '📷', color: '#E4405F' },
  { value: 'Website', icon: '🌐', color: '#52c41a' },
  { value: 'LinkedIn', icon: '💼', color: '#0A66C2' },
  { value: 'TikTok', icon: '🎵', color: '#ff0050' },
  { value: 'Freelance', icon: '💪', color: '#fa8c16' },
  { value: 'Direct', icon: '✋', color: '#8c8c8c' },
  { value: 'Referral', icon: '🤝', color: '#722ed1' },
  { value: 'Import', icon: '📥', color: '#13c2c2' }
];

// Status options with colors
const statusOptions = Object.values(LeadStatus).map(status => ({
  value: status,
  label: LeadStatusLabels[status] || status,
  color: LeadStatusColors[status] || 'blue'
}));

const LeadForm = ({
  visible,
  onCancel,
  onSubmit,
  editingLead = null,
  confirmLoading
}) => {
  const [form] = Form.useForm();
  const [sellers, setSellers] = useState([]);
  const [autoConvert, setAutoConvert] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(LeadStatus.NEW);

  useEffect(() => {
    if (visible) {
      form.resetFields();

      if (editingLead) {
        const creationDate = editingLead.CreationDate
          ? dayjs(editingLead.CreationDate.toDate?.() || editingLead.CreationDate)
          : dayjs();

        // Set form values with proper status handling
        const formValues = {
          ...editingLead,
          CreationDate: creationDate,
          Budget: editingLead.Budget || '',
          lookingFor: editingLead.lookingFor || '',
          status: editingLead.status || LeadStatus.NEW,
          InterestLevel: editingLead.InterestLevel || LeadInterestLevel.MEDIUM,
          RedirectedFrom: editingLead.RedirectedFrom || 'Website',
        };

        form.setFieldsValue(formValues);
        setSelectedStatus(formValues.status);
        
        // Check if lead is already converted
        if (editingLead.convertedContactId || editingLead.status === LeadStatus.CONVERTED) {
          setAutoConvert(true);
        }
      } else {
        form.setFieldsValue({
          CreationDate: dayjs(),
          status: LeadStatus.NEW,
          InterestLevel: LeadInterestLevel.MEDIUM,
          RedirectedFrom: 'Website',
          region: 'UAE',
        });
        setSelectedStatus(LeadStatus.NEW);
        setAutoConvert(false);
      }

      // Fetch sellers
      const fetchSellers = async () => {
        try {
          const sellersSnapshot = await getDocs(collection(db, 'users'));
          const sellersList = sellersSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(seller => salesRoles.includes(seller.Role))
            .map(seller => ({
              id: seller.id,
              name: `${seller.firstname ?? ""} ${seller.lastname ?? ""}${seller.country ? ` (${seller.country})` : ""}`.trim(),
              phoneNumber: seller.phoneNumber || seller.phone || '',
              email: seller.email || '',
            }));

          setSellers(sellersList);
        } catch (error) {
          console.error('Error fetching sellers:', error);
        }
      };

      fetchSellers();
    }
  }, [visible, editingLead, form]);

  const handleStatusChange = (value) => {
    setSelectedStatus(value);
    // If status is CONVERTED, suggest auto-conversion
    if (value === LeadStatus.CONVERTED) {
      setAutoConvert(true);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Clean undefined values
      const cleanedValues = { ...values };
      Object.keys(cleanedValues).forEach(key => {
        if (cleanedValues[key] === undefined || cleanedValues[key] === '') {
          delete cleanedValues[key];
        }
      });

      // Add auto-convert flag
      cleanedValues.autoConvert = autoConvert || cleanedValues.status === LeadStatus.CONVERTED;
      
      // Ensure status is set correctly
      cleanedValues.status = cleanedValues.status || LeadStatus.NEW;
      
      // Handle seller assignment
      if (cleanedValues.seller_id) {
        const seller = sellers.find(s => s.id === cleanedValues.seller_id);
        if (seller) {
          cleanedValues.assignedTo = {
            id: seller.id,
            name: seller.name,
            phoneNumber: seller.phoneNumber,
            email: seller.email,
          };
        }
      }

      onSubmit(cleanedValues);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const isMetaLead = editingLead?.meta_lead_id;
  const isConverted = editingLead?.convertedContactId || editingLead?.status === LeadStatus.CONVERTED;

  // Render status tag with color
  const renderStatusTag = (status) => {
    const color = LeadStatusColors[status] || 'blue';
    const label = LeadStatusLabels[status] || status;
    return <Tag color={color}>{label}</Tag>;
  };

  return (
    <Modal
      title={
        <Space>
          <span>{editingLead ? 'Edit Lead' : 'Add New Lead'}</span>
          {editingLead && (
            <Tag color="blue" style={{ marginLeft: 8 }}>
              {editingLead.id?.slice(0, 8)}
            </Tag>
          )}
          {isConverted && (
            <Tag color="success" style={{ marginLeft: 8 }}>
              ✓ Converted
            </Tag>
          )}
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={900}
      footer={[
        <Button key="cancel" onClick={onCancel}>Cancel</Button>,
        <Button
          key="submit"
          type="primary"
          loading={confirmLoading}
          onClick={handleSubmit}
        >
          {editingLead ? 'Update Lead' : 'Create Lead'}
        </Button>
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        name="leadForm"
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="name"
              label="Full Name"
              rules={[{ required: true, message: 'Full name is required' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="Enter full name" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="region"
              label="Region / Country"
              rules={[{ required: true, message: 'Region is required' }]}
            >
              <Select placeholder="Select region" showSearch>
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
          <Col span={12}>
            <Form.Item
              name="email"
              label="Email Address"
              rules={[
                { type: 'email', message: 'Valid email required' },
                { required: true, message: 'Email is required' }
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="example@email.com" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="phoneNumber"
              label="Phone Number"
              rules={[{ required: true, message: 'Phone number is required' }]}
            >
              <Input prefix={<PhoneOutlined />} placeholder="+971 50 123 4567" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="secondaryEmail" label="Secondary Email">
              <Input placeholder="secondary@email.com" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="phoneNumber2" label="Secondary Phone">
              <Input placeholder="+971 50 123 4567" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item 
              name="status" 
              label="Status" 
              rules={[{ required: true, message: 'Status is required' }]}
            >
              <Select 
                placeholder="Select status"
                onChange={handleStatusChange}
              >
                {statusOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    <Space>
                      <Tag color={option.color}>{option.label}</Tag>
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item 
              name="InterestLevel" 
              label="Interest Level" 
              rules={[{ required: true, message: 'Interest level is required' }]}
            >
              <Select placeholder="Select interest level">
                {Object.values(LeadInterestLevel).map(level => (
                  <Option key={level} value={level}>
                    <Tag color={
                      level === LeadInterestLevel.HIGH ? 'green' :
                      level === LeadInterestLevel.MEDIUM ? 'blue' : 'orange'
                    }>
                      {level}
                    </Tag>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="Budget" label="Budget (AED)">
              <Input 
                prefix={<DollarOutlined />} 
                placeholder="e.g., 500,000 or 500k-1M" 
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="lookingFor" label="Looking For">
              <Input.TextArea 
                rows={2} 
                placeholder="What is the lead looking for? (e.g., Villa, Apartment, Investment...)" 
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item 
              name="RedirectedFrom" 
              label="Lead Source" 
              rules={[{ required: true, message: 'Lead source is required' }]}
            >
              <Select 
                placeholder="Select source"
                optionLabelProp="label"
              >
                {sourceOptions.map(source => (
                  <Option
                    key={source.value}
                    value={source.value}
                    label={
                      <span>
                        <span style={{ color: source.color, marginRight: 8 }}>{source.icon}</span>
                        {source.value}
                      </span>
                    }
                  >
                    <span style={{ color: source.color, marginRight: 8 }}>{source.icon}</span>
                    {source.value}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="seller_id" label="Assigned Seller">
          <Select 
            placeholder="Select seller to assign" 
            allowClear 
            showSearch
            optionFilterProp="children"
          >
            {sellers.map(seller => (
              <Option key={seller.id} value={seller.id}>
                {seller.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* Auto-convert toggle - only for new leads or non-converted leads */}
        {!isConverted && (
          <Form.Item>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Switch
                checked={autoConvert}
                onChange={setAutoConvert}
                checkedChildren="Auto-convert to Contact"
                unCheckedChildren="Manual Conversion"
              />
              <Alert
                message={
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {autoConvert || selectedStatus === LeadStatus.CONVERTED
                      ? '✓ A contact will be automatically created when this lead is saved.'
                      : 'ℹ️ You will need to manually convert this lead to a contact later.'}
                  </Text>
                }
                type={autoConvert || selectedStatus === LeadStatus.CONVERTED ? 'success' : 'info'}
                showIcon
                icon={<InfoCircleOutlined />}
              />
            </Space>
          </Form.Item>
        )}

        {/* Show converted status */}
        {isConverted && (
          <Alert
            message="Lead Already Converted"
            description={`This lead was converted to a contact on ${dayjs(editingLead?.convertedAt?.toDate?.() || editingLead?.convertedAt).format('MMMM DD, YYYY h:mm A')}`}
            type="success"
            showIcon
          />
        )}

        {/* Status-specific alerts */}
        {selectedStatus === LeadStatus.CONVERTED && !isConverted && (
          <Alert
            message="Lead Will Be Converted"
            description="When you save this lead, it will automatically create a contact with all lead information."
            type="success"
            showIcon
          />
        )}

        {selectedStatus === LeadStatus.NOT_INTERESTED && (
          <Alert
            message="Not Interested Lead"
            description="This lead has indicated they are not interested. Consider marking as junk if no future potential."
            type="warning"
            showIcon
          />
        )}

        {/* Meta Information - Read Only */}
        {isMetaLead && (
          <>
            <Divider />
            <Title level={5}>Meta Lead Information (Read Only)</Title>
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>Form:</Text> <Text>{editingLead.meta_form_name || 'N/A'}</Text>
              </Col>
              <Col span={12}>
                <Text strong>Ad:</Text> <Text>{editingLead.meta_ad_name || 'N/A'}</Text>
              </Col>
              <Col span={12}>
                <Text strong>Campaign:</Text> <Text>{editingLead.meta_campaign || 'N/A'}</Text>
              </Col>
              <Col span={12}>
                <Text strong>Platform:</Text> <Text>{editingLead.meta_platform || 'Facebook'}</Text>
              </Col>
              <Col span={24}>
                <Text strong>Lead ID:</Text> <Text copyable>{editingLead.meta_lead_id || 'N/A'}</Text>
              </Col>
            </Row>
          </>
        )}

        {/* Notes */}
        <Form.Item name="Notes" label="Notes">
          <Input.TextArea 
            rows={3} 
            placeholder="Add any additional notes about this lead" 
          />
        </Form.Item>

        <Form.Item name="CreationDate" hidden>
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default LeadForm;