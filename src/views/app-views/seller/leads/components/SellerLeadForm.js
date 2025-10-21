// @ts-nocheck
import React, { useEffect } from 'react';
import { 
  Form, 
  Input, 
  Button, 
  Select, 
  Card,
  Row,
  Col,
  InputNumber,
  Space,
  message 
} from 'antd';
import { LeadStatus, LeadInterestLevel } from 'models/LeadModel';
import { 
  PhoneOutlined, 
  MailOutlined, 
  UserOutlined, 
  GlobalOutlined, 
  CommentOutlined,
  SaveOutlined,
  CloseOutlined,
  DollarOutlined,
  StarOutlined,
  ShareAltOutlined
} from '@ant-design/icons';

const { Option } = Select;
const { TextArea } = Input;

/**
 * Lead form component for sellers to create and edit leads
 */
const SellerLeadForm = ({ 
  lead, 
  onSubmit, 
  onCancel, 
  loading = false 
}) => {
  const [form] = Form.useForm();
  const isEditMode = !!lead?.id;

  // Reset form when lead changes
  useEffect(() => {
    if (lead) {
      form.setFieldsValue(lead);
    } else {
      form.resetFields();
      // Set default values for new lead
      form.setFieldsValue({
        status: LeadStatus.PENDING,
        InterestLevel: LeadInterestLevel.MEDIUM
      });
    }
  }, [form, lead]);

  // Handle form submission
  const handleSubmit = () => {
    form.validateFields()
      .then(values => {
        const formattedValues = {
          ...values,
          status: LeadStatus.PENDING, // Always set status to PENDING for sellers
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
      { required: true, message: 'Please enter the lead name' },
      { min: 2, message: 'Name must be at least 2 characters' }
    ],
    email: [
      { type: 'email', message: 'Please enter a valid email address' }
    ],
    phoneNumber: [
      { pattern: /^[\+]?[\d\s\-\(\)]+$/, message: 'Please enter a valid phone number' }
    ],
    region: [
      { required: true, message: 'Please enter the region' }
    ],
    RedirectedFrom: [
      { required: true, message: 'Please select the lead source' }
    ],
    InterestLevel: [
      { required: true, message: 'Please select interest level' }
    ]
  };

  // Source options with icons
  const sourceOptions = [
    { value: 'Facebook', icon: '📘', color: '#1877F2' },
    { value: 'Instagram', icon: '📷', color: '#E4405F' },
    { value: 'Website', icon: '🌐', color: '#52c41a' },
    { value: 'LinkedIn', icon: '💼', color: '#0A66C2' },
    { value: 'TikTok', icon: '🎵', color: '#ff0050' },
    { value: 'Freelance', icon: '💪', color: '#fa8c16' }
  ];

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
              label="Lead Name"
              rules={rules.name}
            >
              <Input 
                prefix={<UserOutlined />} 
                placeholder="Enter lead's full name"
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
                placeholder="lead@example.com"
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
              name="region"
              label="Region"
              rules={rules.region}
            >
              <Input 
                prefix={<GlobalOutlined />} 
                placeholder="e.g., Dubai, New York, London"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Lead Source and Details */}
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="RedirectedFrom"
              label="Lead Source"
              rules={rules.RedirectedFrom}
            >
              <Select 
                placeholder="Select lead source"
                prefix={<ShareAltOutlined />}
              >
                {sourceOptions.map(source => (
                  <Option key={source.value} value={source.value}>
                    <Space>
                      <span>{source.icon}</span>
                      <span style={{ color: source.color }}>{source.value}</span>
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12}>
            <Form.Item
              name="InterestLevel"
              label="Interest Level"
              rules={rules.InterestLevel}
            >
              <Select placeholder="Select interest level">
                <Option value={LeadInterestLevel.HIGH}>
                  <Space>
                    <span style={{ color: '#ff4d4f' }}>●</span>
                    High Interest
                  </Space>
                </Option>
                <Option value={LeadInterestLevel.MEDIUM}>
                  <Space>
                    <span style={{ color: '#faad14' }}>●</span>
                    Medium Interest
                  </Space>
                </Option>
                <Option value={LeadInterestLevel.LOW}>
                  <Space>
                    <span style={{ color: '#1890ff' }}>●</span>
                    Low Interest
                  </Space>
                </Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* Budget and Status */}
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="Budget"
              label="Budget (Optional)"
            >
              <InputNumber
                style={{ width: '100%' }}
                prefix={<DollarOutlined />}
                placeholder="Enter budget amount"
                min={0}
                formatter={value => `AED ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/AED\s?|(,*)/g, '')}
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12}>
            <Form.Item
              name="status"
              label="Status"
            >
              <Select disabled>
                <Option value={LeadStatus.PENDING}>
                  <Space>
                    <span style={{ color: '#faad14' }}>●</span>
                    Pending
                  </Space>
                </Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* Initial Note (only for new leads) */}
        {!isEditMode && (
          <Form.Item
            name="initialNote"
            label="Initial Note (Optional)"
            extra="This note will be added to the lead's history"
          >
            <TextArea 
              rows={3}
              prefix={<CommentOutlined />}
              placeholder="Add an initial note about this lead..."
              maxLength={300}
              showCount
            />
          </Form.Item>
        )}

        {/* Form Actions */}
        <div style={{ marginTop: '24px', textAlign: 'right' }}>
          <Space>
            <Button 
              onClick={onCancel}
              icon={<CloseOutlined />}
            >
              Cancel
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              icon={<SaveOutlined />}
            >
              {isEditMode ? 'Update Lead' : 'Create Lead'}
            </Button>
          </Space>
        </div>
      </Form>
    </Card>
  );
};

export default SellerLeadForm;
