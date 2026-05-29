import React, { useEffect, useState } from 'react';
import { 
  Form, Input, Select, Button, Row, Col, Modal, Divider, Typography 
} from 'antd';
import { 
  UserOutlined, MailOutlined, PhoneOutlined, GlobalOutlined, DollarOutlined 
} from '@ant-design/icons';
import { LeadStatus, LeadInterestLevel } from 'models/LeadModel';
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

// Source options
const sourceOptions = [
  { value: 'Facebook', icon: '📘', color: '#1877F2' },
  { value: 'Instagram', icon: '📷', color: '#E4405F' },
  { value: 'Website', icon: '🌐', color: '#52c41a' },
  { value: 'LinkedIn', icon: '💼', color: '#0A66C2' },
  { value: 'TikTok', icon: '🎵', color: '#ff0050' },
  { value: 'Freelance', icon: '💪', color: '#fa8c16' }
];

const LeadForm = ({
  visible,
  onCancel,
  onSubmit,
  editingLead = null,
  confirmLoading
}) => {
  const [form] = Form.useForm();
  const [sellers, setSellers] = useState([]);

  useEffect(() => {
    if (visible) {
      form.resetFields();

      if (editingLead) {
        const creationDate = editingLead.CreationDate
          ? dayjs(editingLead.CreationDate.toDate?.() || editingLead.CreationDate)
          : dayjs();

        form.setFieldsValue({
          ...editingLead,
          CreationDate: creationDate,
          Budget: editingLead.Budget || '',           // Support string budget
          lookingFor: editingLead.lookingFor || '',
        });
      } else {
        form.setFieldsValue({
          CreationDate: dayjs(),
          status: LeadStatus.PENDING,
          InterestLevel: LeadInterestLevel.MEDIUM,
          RedirectedFrom: 'Website',
        });
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
              name: `${seller.firstname ?? ""} ${seller.lastname ?? ""}${seller.country ? ` (${seller.country})` : ""}`.trim()
            }));

          setSellers(sellersList);
        } catch (error) {
          console.error('Error fetching sellers:', error);
        }
      };

      fetchSellers();
    }
  }, [visible, editingLead, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const cleanedValues = { ...values };

      // Clean undefined values
      Object.keys(cleanedValues).forEach(key => {
        if (cleanedValues[key] === undefined || cleanedValues[key] === '') {
          delete cleanedValues[key];
        }
      });

      onSubmit(cleanedValues);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const isMetaLead = editingLead?.meta_lead_id;

  return (
    <Modal
      title={editingLead ? 'Edit Lead' : 'Add New Lead'}
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
              <Input prefix={<PhoneOutlined />} placeholder="+964 781 780 0362" />
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
              <Input placeholder="+964 xxx xxx xxxx" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="status" label="Status" rules={[{ required: true }]}>
              <Select>
                {Object.values(LeadStatus).map(status => (
                  <Option key={status} value={status}>{status}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="InterestLevel" label="Interest Level" rules={[{ required: true }]}>
              <Select>
                {Object.values(LeadInterestLevel).map(level => (
                  <Option key={level} value={level}>{level}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="Budget" label="Budget">
              <Input 
                prefix={<DollarOutlined />} 
                placeholder="807_ألف_دولار_–_1.08_مليون_دولار" 
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="lookingFor" label="Looking For">
              <Input.TextArea 
                rows={2} 
                placeholder="What is the lead looking for? (e.g. للسكن, investment...)" 
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="RedirectedFrom" label="Lead Source" rules={[{ required: true }]}>
              <Select optionLabelProp="label">
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
          <Select placeholder="Select seller" allowClear showSearch>
            {sellers.map(seller => (
              <Option key={seller.id} value={seller.id}>
                {seller.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* Meta Information - Read Only */}
        {isMetaLead && (
          <>
            <Divider />
            <Title level={5}>Meta Lead Information (Read Only)</Title>
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>Form:</Text> <Text>{editingLead.meta_form_name}</Text>
              </Col>
              <Col span={12}>
                <Text strong>Ad:</Text> <Text>{editingLead.meta_ad_name}</Text>
              </Col>
              <Col span={12}>
                <Text strong>Campaign:</Text> <Text>{editingLead.meta_campaign}</Text>
              </Col>
              <Col span={12}>
                <Text strong>Lead ID:</Text> <Text>{editingLead.meta_lead_id}</Text>
              </Col>
            </Row>
          </>
        )}

        <Form.Item name="CreationDate" hidden>
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default LeadForm;