import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Button,
  Row,
  Col,
  Select,
  DatePicker,
  Space,
  Card,
  Typography,
  message,
  Upload,
  Progress
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  FileTextOutlined,
  UploadOutlined,
  BankOutlined
} from '@ant-design/icons';
import moment from 'moment';
import cloudinaryService from 'services/CloudinaryService'; // Import the updated CloudinaryService

const { Option } = Select;
const { TextArea } = Input;

const JobPositions = [
  'Agent', 'Sales', 'Executive Sales', 'Off Plan Sales', 'Ready to Move Sales',
  'Team Manager', 'Sales Manager', 'Marketing Manager', 'Marketing Executive',
  'Admin', 'Support', 'Accountant', 'HR', 'Other'
];

const ApplicationStatuses = [
  { value: 'Pending', label: 'Pending', color: '#faad14' },
  { value: 'Reviewed', label: 'Reviewed', color: '#1890ff' },
  { value: 'Interviewed', label: 'Interviewed', color: '#722ed1' },
  { value: 'Hired', label: 'Hired', color: '#52c41a' },
  { value: 'Rejected', label: 'Rejected', color: '#f5222d' }
];

const ApplicationForm = ({ initialValues, onSubmit, onCancel, loading }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [uploadedFileUrl, setUploadedFileUrl] = useState(initialValues?.CVUrl || '');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Initialize fileList for edit mode
  useEffect(() => {
    if (initialValues?.CVUrl) {
      setFileList([
        {
          uid: '-1',
          name: 'Current CV',
          status: 'done',
          url: initialValues.CVUrl
        }
      ]);
      setUploadedFileUrl(initialValues.CVUrl);
    }
  }, [initialValues]);

  // Handle file selection
  const handleFileChange = ({ fileList: newFileList }) => {
    setFileList(newFileList);
    if (newFileList.length === 0) {
      setUploadProgress(0);
      setIsUploading(false);
      setUploadedFileUrl(initialValues?.CVUrl || '');
    }
  };

  // Custom upload function using Cloudinary
  const customUpload = async (options) => {
    const { file, onSuccess, onError, onProgress } = options;
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const result = await cloudinaryService.uploadFile(file, {
        folder: 'cvs',
  tags: ['application', 'cv'],
  resource_type: 'raw',
  access_mode: 'public'
      });

      setUploadedFileUrl(result.url);
      setUploadProgress(100);
      onSuccess({ url: result.url }, file);
      message.success(`${file.name} uploaded successfully!`);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress(0);
      onError(error);
      message.error(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Validate file before upload
  const beforeUpload = (file) => {
    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const isValidType = allowedTypes.includes(file.type);
    const isLt5M = file.size / 1024 / 1024 < 5;

    if (!isValidType) {
      message.error('You can only upload PDF, PNG, JPG, DOC, or DOCX files!');
      return Upload.LIST_IGNORE;
    }
    if (!isLt5M) {
      message.error('File must be smaller than 5MB!');
      return Upload.LIST_IGNORE;
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);

      if (fileList.length > 0 && fileList[0].status === 'uploading') {
        message.warning('Please wait for file upload to complete before submitting');
        return;
      }

      if (fileList.length > 0 && fileList[0].status === 'error') {
        message.error('Please fix file upload errors before submitting');
        return;
      }

      const formattedValues = {
        ...values,
        ApplicantDate: values.ApplicantDate ? values.ApplicantDate.toDate() : new Date(),
        firstname: values.firstname?.trim(),
        lastname: values.lastname?.trim(),
        Job: values.Job,
        CVUrl: uploadedFileUrl, // Use Cloudinary URL
        Status: values.Status || 'Pending'
      };

      await onSubmit(formattedValues);

      if (!initialValues) {
        form.resetFields();
        setFileList([]);
        setUploadProgress(0);
        setIsUploading(false);
        setUploadedFileUrl('');
      }

      message.success(initialValues ? 'Application updated successfully!' : 'Application created successfully!');
    } catch (error) {
      console.error('Error submitting form:', error);
      message.error('Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle form reset
  const handleReset = () => {
    form.resetFields();
    setFileList([]);
    setUploadProgress(0);
    setIsUploading(false);
    setUploadedFileUrl(initialValues?.CVUrl || '');
  };

  // Upload props
  const uploadProps = {
    fileList,
    beforeUpload,
    onChange: handleFileChange,
    customRequest: customUpload,
    accept: '.pdf,.png,.jpg,.jpeg,.doc,.docx',
    maxCount: 1,
    showUploadList: {
      showPreviewIcon: true,
      showRemoveIcon: true,
      showDownloadIcon: false,
    }
  };

  return (
    <div className="application-form">
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          ...initialValues,
          ApplicantDate: initialValues?.ApplicantDate ? moment(initialValues.ApplicantDate) : moment(),
          Status: initialValues?.Status || 'Pending'
        }}
        onFinish={handleSubmit}
        scrollToFirstError
      >
        {/* Personal Information Section */}
        <Card
          title={
            <Space>
              <UserOutlined />
              <span>Personal Information</span>
            </Space>
          }
          style={{ marginBottom: '16px' }}
          size="small"
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="First Name"
                name="firstname"
                rules={[
                  { required: true, message: 'Please enter first name' },
                  { min: 2, message: 'First name must be at least 2 characters' },
                  { max: 50, message: 'First name cannot exceed 50 characters' }
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="Enter first name"
                  size="large"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Last Name"
                name="lastname"
                rules={[
                  { required: true, message: 'Please enter last name' },
                  { min: 2, message: 'Last name must be at least 2 characters' },
                  { max: 50, message: 'Last name cannot exceed 50 characters' }
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="Enter last name"
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Email (Optional)"
                name="email"
                rules={[{ type: 'email', message: 'Please enter a valid email address' }]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="Enter email address"
                  size="large"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Phone Number (Optional)"
                name="phoneNumber"
                rules={[{ pattern: /^[+]?[\d\s\-()]+$/, message: 'Please enter a valid phone number' }]}
              >
                <Input
                  placeholder="Enter phone number"
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Application Details Section */}
        <Card
          title={
            <Space>
              <BankOutlined />
              <span>Application Details</span>
            </Space>
          }
          style={{ marginBottom: '16px' }}
          size="small"
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Job Position"
                name="Job"
                rules={[{ required: true, message: 'Please select a job position' }]}
              >
                <Select
                  placeholder="Select job position"
                  size="large"
                  showSearch
                  optionFilterProp="children"
                >
                  {JobPositions.map(job => (
                    <Option key={job} value={job}>
                      {job}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Application Status"
                name="Status"
                rules={[{ required: true, message: 'Please select application status' }]}
              >
                <Select placeholder="Select status" size="large">
                  {ApplicationStatuses.map(status => (
                    <Option key={status.value} value={status.value}>
                      <span style={{ color: status.color }}>● {status.label}</span>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Application Date"
                name="ApplicantDate"
                rules={[{ required: true, message: 'Please select application date' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  placeholder="Select application date"
                  size="large"
                  format="YYYY-MM-DD"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="CV/Resume"
                name="cvFile"
                rules={[
                  { 
                    required: !initialValues?.CVUrl && !uploadedFileUrl, 
                    message: 'Please upload a CV file' 
                  }
                ]}
              >
                <div>
                  <Upload {...uploadProps}>
                    <Button 
                      icon={<UploadOutlined />} 
                      size="large"
                      disabled={isUploading}
                    >
                      {isUploading ? 'Uploading...' : 'Upload CV (PDF, PNG, JPG, DOC, DOCX)'}
                    </Button>
                  </Upload>
                  
                  {/* Progress display */}
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <Progress 
                      percent={Math.round(uploadProgress)} 
                      style={{ marginTop: '8px' }}
                      size="small"
                      status="active"
                    />
                  )}
                  
                  {/* Existing CV link */}
                  {uploadedFileUrl && fileList.length > 0 && fileList[0].status === 'done' && (
                    <div style={{ marginTop: '8px' }}>
                      <a
                        href={uploadedFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View Uploaded CV
                      </a>
                    </div>
                  )}
                  {initialValues?.CVUrl && fileList.length === 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <a
                        href={initialValues.CVUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View Current CV
                      </a>
                    </div>
                  )}
                </div>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Additional Information Section */}
        <Card
          title={
            <Space>
              <FileTextOutlined />
              <span>Additional Information</span>
            </Space>
          }
          style={{ marginBottom: '24px' }}
          size="small"
        >
          <Form.Item label="Notes/Comments (Optional)" name="notes">
            <TextArea
              rows={4}
              placeholder="Enter any additional notes or comments about the application..."
              maxLength={1000}
              showCount
            />
          </Form.Item>
          <Form.Item label="Experience Summary (Optional)" name="experience">
            <TextArea
              rows={3}
              placeholder="Brief summary of candidate's experience..."
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Card>

        {/* Form Actions */}
        <div style={{ textAlign: 'right' }}>
          <Space>
            <Button onClick={onCancel} size="large" disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleReset} size="large" disabled={submitting}>
              Reset
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting || loading}
              size="large"
              disabled={isUploading}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none'
              }}
            >
              {initialValues ? 'Update Application' : 'Create Application'}
            </Button>
          </Space>
        </div>
      </Form>
    </div>
  );
};

export default ApplicationForm;