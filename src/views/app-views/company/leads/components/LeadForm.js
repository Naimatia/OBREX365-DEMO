import React, { useEffect, useState } from 'react';
import { Form, Input, Select, Button, InputNumber, Row, Col, DatePicker, Modal } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, GlobalOutlined } from '@ant-design/icons';
import { LeadStatus, LeadInterestLevel, LeadRedirectionSource } from 'models/LeadModel';
import { db, collection, getDocs } from 'configs/FirebaseConfig';
import countries from 'constants/countries';
import moment from 'moment';
import { UserRoles } from 'models/UserModel';


const { Option } = Select;

const salesRoles = [
  UserRoles.SELLER,
  UserRoles.SALES_EXECUTIVE,
  UserRoles.AGENT,
  UserRoles.TEAM_LEADER,
  UserRoles.SALES_MANAGER,
  UserRoles.OFF_PLAN_SALES,
  UserRoles.READY_TO_MOVE_SALES,
];

  // Source options with icons
  const sourceOptions = [
    { value: 'Facebook', icon: '📘', color: '#1877F2' },
    { value: 'Instagram', icon: '📷', color: '#E4405F' },
    { value: 'Website', icon: '🌐', color: '#52c41a' },
    { value: 'LinkedIn', icon: '💼', color: '#0A66C2' },
    { value: 'TikTok', icon: '🎵', color: '#ff0050' },
    { value: 'Freelance', icon: '💪', color: '#fa8c16' }
  ];

/**
 * Component for adding or editing lead
 */
const LeadForm = ({
  visible,
  onCancel,
  onSubmit,
  editingLead = null,
  confirmLoading
}) => {
  const [form] = Form.useForm();
  const [sellers, setSellers] = useState([]);

  // Fetch sellers (employees with sales-related roles) from Firebase
  useEffect(() => {
    if (visible) {
      form.resetFields();

      if (editingLead) {
        const creationDate = editingLead.CreationDate
          ? moment(editingLead.CreationDate.toDate?.() || editingLead.CreationDate)
          : moment();

        form.setFieldsValue({
          ...editingLead,
          CreationDate: creationDate
        });
      } else {
        form.setFieldsValue({
          CreationDate: moment()
        });
      }

      const fetchSellers = async () => {
        try {
          const sellersRef = collection(db, 'users');
          const sellersSnapshot = await getDocs(sellersRef);

          const sellersList = sellersSnapshot.docs
            .map(doc => ({
              id: doc.id,
              ...doc.data()
            }))
            .filter(seller => salesRoles.includes(seller.Role))   // changed here
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


  const handleSubmit = () => {
    form.validateFields().then(values => {
      onSubmit(values);
    });
  };

  const title = editingLead ? 'Edit Lead' : 'Add New Lead';

  return (
    <Modal
      title={title}
      visible={visible}
      onCancel={onCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={confirmLoading}
          onClick={handleSubmit}
        >
          {editingLead ? 'Update' : 'Create'}
        </Button>
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        name="leadForm"
        initialValues={{
          status: LeadStatus.PENDING,
          InterestLevel: LeadInterestLevel.MEDIUM,
          RedirectedFrom: LeadRedirectionSource.WEBSITE
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="name"
              label="Full Name"
              rules={[{ required: true, message: 'Please enter the lead name' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="Enter full name" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="region"
              label="Region"
              rules={[{ required: true, message: 'Please select a region' }]}
            >
              <Select
                placeholder="Select region"
                showSearch
                optionFilterProp="children"
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

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { type: 'email', message: 'Please enter a valid email' },
                { required: true, message: 'Please enter email' }
              ]}
            >
              <Input placeholder="Enter email address" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="phoneNumber"
              label="Phone Number"
              rules={[{ required: true, message: 'Please enter phone number' }]}
            >
              <Input placeholder="Enter phone number" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
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
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="status"
              label="Status"
              rules={[{ required: true, message: 'Please select status' }]}
            >
              <Select placeholder="Select status">
                {Object.values(LeadStatus).map(status => (
                  <Option key={status} value={status}>
                    {status}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="InterestLevel"
              label="Interest Level"
              rules={[{ required: true, message: 'Please select interest level' }]}
            >
              <Select placeholder="Select interest level">
                {Object.values(LeadInterestLevel).map(level => (
                  <Option key={level} value={level}>
                    {level}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="Budget"
              label="Budget (AED)"
              rules={[{ required: false }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                addonBefore="AED"
                placeholder="0.00"
                min={0}
                precision={2}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="RedirectedFrom"
              label="Lead Source"
              rules={[{ required: true, message: 'Please select lead source' }]}
            >
            <Select
  placeholder="Select lead source"
  optionLabelProp="label"
>
  {sourceOptions.map(source => (
    <Option
      key={source.value}
      value={source.value}
      label={
        <span>
          <span style={{ color: source.color, marginRight: 8 }}>
            {source.icon}
          </span>
          {source.value}
        </span>
      }
    >
      <span style={{ color: source.color, marginRight: 8 }}>
        {source.icon}
      </span>
      {source.value}
    </Option>
  ))}
</Select>

            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="seller_id"
              label="Assigned Seller"
              rules={[{ required: false }]}
            >
              <Select
                placeholder="Select seller"
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
          </Col>
        </Row>

        <Form.Item
          name="CreationDate"
          hidden
        >
          <DatePicker />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default LeadForm;