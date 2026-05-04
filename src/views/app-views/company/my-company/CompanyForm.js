import React, { useState } from 'react';
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Row,
  Col,
  Upload,
  message,
  Select,
  Divider,
  Alert
} from 'antd';
import {
  UploadOutlined,
  BuildOutlined,
  MailOutlined,
  PhoneOutlined,
  GlobalOutlined,
  FacebookOutlined,
  LinkedinOutlined,
  InstagramOutlined,
  VideoCameraOutlined,
  KeyOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import companyService from 'services/CompanyService';
import countries from 'assets/data/countries.json';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// Business fields/industries
const businessFields = [
  'Real Estate', 'Finance', 'Technology', 'Healthcare', 'Education',
  'Retail', 'Manufacturing', 'Hospitality', 'Construction', 'Legal Services',
  'Marketing', 'Transportation', 'Agriculture', 'Energy', 'Entertainment',
  'Consulting', 'Other'
];

const CompanyForm = ({ onSuccess, initialValues = null, isEditing = false }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(initialValues?.logo || '');

  // Get current user from Redux store
  const user = useSelector(state => state.auth.user);

  // Set initial form values if editing an existing company
  React.useEffect(() => {
    if (initialValues && form) {
      // Set initial form values from the company data
      const formValues = {
        ...initialValues,
        // Handle social media links format conversion if needed
        socialMediaLinks: initialValues.socialMediaLinks || {},
        // Meta credentials
        facebookPageId: initialValues.facebookPageId || '',
        instagramAccountId: initialValues.instagramAccountId || '',
        metaAccessToken: initialValues.metaAccessToken || ''
      };

      form.setFieldsValue(formValues);
    }
  }, [initialValues, form]);

  // Logo upload props
  const uploadProps = {
    beforeUpload: file => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('You can only upload image files!');
        return Upload.LIST_IGNORE;
      }

      const isLt2M = file.size / 1024 / 1024 < 2;
      if (!isLt2M) {
        message.error('Image must be smaller than 2MB!');
        return Upload.LIST_IGNORE;
      }

      // Store the file and generate preview
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        // Ensure we only set the preview if result is a string
        if (typeof reader.result === 'string') {
          setLogoPreview(reader.result);
        }
      };
      reader.readAsDataURL(file);

      // Prevent automatic upload
      return false;
    },
    showUploadList: false,
  };

  // Form submission handler
  const onFinish = async (values) => {
    try {
      setLoading(true);

      const companyData = {
        ...values,
        // Ensure social media links object exists
        socialMediaLinks: values.socialMediaLinks || {}
      };

      if (isEditing && initialValues?.id) {
        await companyService.updateCompany(initialValues.id, companyData, logoFile);
        message.success('Company updated successfully!');
      } else {
        await companyService.createCompany(companyData, user.uid, logoFile);
        message.success('Company created successfully!');
      }

      if (onSuccess) {
        onSuccess();
      }

      // Reset form if not editing
      if (!isEditing) {
        form.resetFields();
        setLogoFile(null);
        setLogoPreview('');
      }
    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} company:`, error);
      message.error(`Failed to ${isEditing ? 'update' : 'create'} company: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-sm">
      <div className="text-center mb-4">
        <Title level={3}>{isEditing ? 'Edit Company Profile' : 'Create Your Company Profile'}</Title>
        <Text type="secondary">
          {isEditing
            ? 'Update your company information'
            : 'Complete the form below to set up your company in OBREX365-Demo'}
        </Text>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          status: 'active',
          socialMediaLinks: { facebook: '', instagram: '', linkedin: '', tiktok: '' } // ✅ safe defaults
        }}
      >
        <Row gutter={24}>
          {/* Company Logo */}
          <Col xs={24} md={8} className="mb-4 text-center">
            <Form.Item label="Company Logo" name="logo">
              <div className="logo-upload-container">
                {logoPreview ? (
                  <div className="logo-preview" style={{ marginBottom: 16 }}>
                    <img
                      src={logoPreview}
                      alt="Logo Preview"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '200px',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                ) : (
                  <div
                    className="logo-placeholder"
                    style={{
                      width: '100%',
                      height: '200px',
                      background: '#f5f5f5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '4px',
                      marginBottom: 16
                    }}
                  >
                    <BuildOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />
                  </div>
                )}
                <Upload {...uploadProps}>
                  <Button icon={<UploadOutlined />}>
                    {logoPreview ? 'Change Logo' : 'Upload Logo'}
                  </Button>
                </Upload>
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">Recommended: 200x200px, max 2MB</Text>
                </div>
              </div>
            </Form.Item>
          </Col>

          <Col xs={24} md={16}>
            <Row gutter={16}>
              {/* Company Name */}
              <Col span={24}>
                <Form.Item
                  label="Company Name"
                  name="name"
                  rules={[
                    { required: true, message: 'Please enter your company name' },
                    { max: 100, message: 'Name is too long' }
                  ]}
                >
                  <Input placeholder="Enter your company name" />
                </Form.Item>
              </Col>

              {/* Business Field/Industry */}
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Business Field"
                  name="field"
                  rules={[
                    { required: true, message: 'Please select your business field' }
                  ]}
                >
                  <Select placeholder="Select business field">
                    {businessFields.map(field => (
                      <Option key={field} value={field}>{field}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              {/* Company Status */}
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Status"
                  name="status"
                  rules={[
                    { required: true, message: 'Please select company status' }
                  ]}
                >
                  <Select>
                    <Option value="Active">Active</Option>
                    <Option value="Inactive">Inactive</Option>
                    <Option value="Under Construction">Under Construction</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Col>
        </Row>

        <Divider orientation="left">Company Description</Divider>

        {/* Company Description */}
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              label="Description"
              name="description"
              rules={[
                { required: true, message: 'Please enter your company description' },
                { max: 1000, message: 'Description is too long (maximum 1000 characters)' }
              ]}
            >
              <TextArea
                placeholder="Tell us about your company..."
                autoSize={{ minRows: 4, maxRows: 6 }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Contact Information</Divider>

        {/* Location and Region */}
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Location"
              name="location"
              rules={[
                { required: true, message: 'Please enter your company location' }
              ]}
            >
              <Input placeholder="City, Street, etc." />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label="Country/Region"
              name="region"
              rules={[
                { required: true, message: 'Please select your region' }
              ]}
            >
              <Select placeholder="Select country/region">
                {countries.map(country => (
                  <Option key={country.code} value={country.code}>
                    {country.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* Contact Information */}
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Phone Number"
              name="phoneNumber"
              rules={[
                { required: true, message: 'Please enter your company phone number' },
                {
                  pattern: /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
                  message: 'Please enter a valid phone number'
                }
              ]}
            >
              <Input
                prefix={<PhoneOutlined />}
                placeholder="+1 (555) 555-5555"
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label="Email Address"
              name="emailAddress"
              rules={[
                { required: true, message: 'Please enter your company email address' },
                { type: 'email', message: 'Please enter a valid email address' }
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="company@example.com"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* ==================== META INTEGRATION ==================== */}
        <Divider orientation="left">
          <span><KeyOutlined /> Meta Business Integration (Facebook & Instagram)</span>
        </Divider>

        <Alert
          message="Facebook & Instagram Connection"
          description="Enter your Meta credentials to enable posting and analytics for this company."
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Facebook Page ID"
              name="facebookPageId"
              tooltip="You can find this in your Facebook Page settings"
            >
              <Input placeholder="893044467235258" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="Instagram Business Account ID"
              name="instagramAccountId"
              tooltip="Instagram Professional Account ID connected to your Facebook Page"
            >
              <Input placeholder="17841480042156096" />
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item
              label="Meta Access Token (Long-lived)"
              name="metaAccessToken"
              rules={[
                { required: false, message: 'Access Token is recommended for full functionality' }
              ]}
            >
              <Input.Password
                placeholder="EAAiWoHfGMz0BRSOHM2OQDmTFajZCzh8dXhbrDxe8ZABipZCdN5KerpFK5GCveCIyKXzAhAXZCpMVAnzVPrDs1WEjHfgCKDr5FQBgibz91lqyf7ZA68Dqz1MFK32PAM65m4YZBRMBfN4rMAyKmZBl1WJweIjnmjzbwIhS5xNQvs..."
                visibilityToggle
              />
            </Form.Item>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              ⚠️ Keep this token secure. It allows access to your Facebook Page and Instagram account.
            </Text>
          </Col>
        </Row>

        <Divider orientation="left">Social Media Profiles</Divider>

        {/* Website */}
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              label="Website URL"
              name="websiteUrl"
              rules={[
                { type: 'url', message: 'Please enter a valid URL' }
              ]}
            >
              <Input
                prefix={<GlobalOutlined />}
                placeholder="https://www.example.com"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Social Media */}
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item
              label="Facebook"
              name={['socialMediaLinks', 'facebook']}
            >
              <Input
                prefix={<FacebookOutlined />}
                placeholder="Facebook page URL"
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={8}>
            <Form.Item
              label="Tiktok"
              name={['socialMediaLinks', 'tiktok']}
            >
              <Input
                prefix={<VideoCameraOutlined />}
                placeholder="Tiktok profile URL"
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={8}>
            <Form.Item
              label="LinkedIn"
              name={['socialMediaLinks', 'linkedin']}
            >
              <Input
                prefix={<LinkedinOutlined />}
                placeholder="LinkedIn profile URL"
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={8}>
            <Form.Item
              label="Instagram"
              name={['socialMediaLinks', 'instagram']}
            >
              <Input
                prefix={<InstagramOutlined />}
                placeholder="Instagram profile URL"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Submit Button */}
        <Form.Item className="text-right">
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            size="large"
          >
            Create Company
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default CompanyForm;
