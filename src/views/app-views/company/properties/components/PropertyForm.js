import React, { useState, useEffect } from 'react';
import { 
  Form, 
  Input, 
  InputNumber, 
  Button, 
  Select, 
  Row, 
  Col, 
  Divider,
  Upload,
  Tag,
  Space,
  Typography,
  message,
  Spin
} from 'antd';
import { 
  PlusOutlined, 
  MinusCircleOutlined, 
  UploadOutlined, 
  HomeOutlined,
  DollarOutlined,
  BankOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import cloudinaryService from 'services/CloudinaryService';
import moment from 'moment';

const { Option } = Select;
const { Title, Text } = Typography;
const { TextArea } = Input;

/**
 * PropertyForm component for adding or editing properties
 */
const PropertyForm = ({ initialValues = null, onSave, onCancel, loading = false, currentUser }) => {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [features, setFeatures] = useState([]);
  const [newFeature, setNewFeature] = useState('');

  const isEditMode = !!initialValues;

  // Set initial values when form is in edit mode
  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue({
        ...initialValues,
        OriginalPrice: Number(initialValues.OriginalPrice),
        SellPrice: Number(initialValues.SellPrice),
        NbrBedRooms: Number(initialValues.NbrBedRooms),
        NbrBathRooms: Number(initialValues.NbrBathRooms)
      });

      if (Array.isArray(initialValues.Features)) {
        setFeatures(initialValues.Features);
      }

      if (Array.isArray(initialValues.Images) && initialValues.Images.length > 0) {
        setUploadedImages(initialValues.Images);
        
        // Create file list for preview
        const initialFileList = initialValues.Images.map((url, index) => ({
          uid: `-${index}`,
          name: `Image ${index + 1}`,
          status: 'done',
          url: url,
          thumbUrl: url
        }));
        setFileList(initialFileList);
      }
    }
  }, [initialValues, form]);

  // Handle form submission
  const handleSubmit = async (values) => {
    try {
      // Check if currentUser is defined
      if (!currentUser) {
        message.error('User information is missing. Please log in again.');
        return;
      }

      // Format the property data
      const propertyData = {
        ...values,
        company_id: currentUser.company_id || '',
        creator_id: currentUser.uid || '',
        Features: features,
        Images: uploadedImages,
      };

      // Call the onSave callback with the property data
      await onSave(propertyData);
    } catch (error) {
      console.error('Error submitting property form:', error);
      message.error('Failed to save property. Please try again.');
    }
  };

  // Handle image uploads
  const handleImageUpload = async (options) => {
    const { file, onSuccess, onError } = options;
    setUploadLoading(true);

    try {
      const result = await cloudinaryService.uploadFile(file, {
        folder: 'properties',
        tags: ['property', currentUser?.company_id]
      });

      // Add the uploaded image URL to the list
      setUploadedImages(prev => [...prev, result.url]);
      
      // Signal success
      onSuccess(result, file);
      message.success(`${file.name} uploaded successfully`);
    } catch (error) {
      console.error('Error uploading image:', error);
      message.error(`${file.name} upload failed: ${error.message}`);
      onError(error);
    } finally {
      setUploadLoading(false);
    }
  };

  // Handle image removal
  const handleImageRemove = (file) => {
    // Remove from file list
    const updatedFileList = fileList.filter(item => item.uid !== file.uid);
    setFileList(updatedFileList);

    // Remove from uploaded images
    if (file.url) {
      const updatedImages = uploadedImages.filter(url => url !== file.url);
      setUploadedImages(updatedImages);
    }
  };

  // Handle feature tag input
  const handleAddFeature = () => {
    if (newFeature && !features.includes(newFeature)) {
      setFeatures([...features, newFeature]);
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (feature) => {
    setFeatures(features.filter(item => item !== feature));
  };

  const propertyTypes = [
    'Studio', 
    'Apartment', 
    'Villa', 
    'Townhouse', 
    'Penthouse', 
    'Duplex', 
    'Office', 
    'Retail', 
    'Commercial', 
    'Land'
  ];

  const propertyCategories = ['OffPlan', 'Buy', 'Rent'];
  const propertyStatuses = ['Pending', 'Sold', 'Rented', 'Available'];

  return (
    <Spin spinning={loading || uploadLoading}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          Type: 'Apartment',
          Category: 'Buy',
          Status: 'Available',
          Features: [],
          Images: [],
          Notes: []
        }}
      >
        <Row gutter={16}>
          <Col xs={24}>
            <Title level={4} style={{ marginBottom: '24px' }}>
              <HomeOutlined /> {isEditMode ? 'Edit Property' : 'Add New Property'}
            </Title>
          </Col>
        </Row>

        {/* Basic Information */}
        <Row gutter={16}>
          <Col xs={24} md={16}>
            <Form.Item
              name="title"
              label="Property Title"
              rules={[{ required: true, message: 'Please enter property title' }]}
            >
              <Input placeholder="Enter property title" maxLength={100} />
            </Form.Item>
          </Col>
          
          <Col xs={24} md={8}>
            <Form.Item
              name="Type"
              label="Property Type"
              rules={[{ required: true, message: 'Please select property type' }]}
            >
              <Select placeholder="Select property type">
                {propertyTypes.map(type => (
                  <Option key={type} value={type}>{type}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="Category"
              label="Category"
              rules={[{ required: true, message: 'Please select category' }]}
            >
              <Select placeholder="Select category">
                {propertyCategories.map(category => (
                  <Option key={category} value={category}>{category}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          
          <Col xs={24} md={12}>
            <Form.Item
              name="Status"
              label="Status"
              rules={[{ required: true, message: 'Please select status' }]}
            >
              <Select placeholder="Select status">
                {propertyStatuses.map(status => (
                  <Option key={status} value={status}>{status}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* Pricing */}
        <Divider orientation="left">Pricing</Divider>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="OriginalPrice"
              label="Original Price (AED)"
              rules={[{ required: true, message: 'Please enter original price' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="Enter price in AED"
                min={0}
                precision={2}
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} md={12}>
            <Form.Item
              name="SellPrice"
              label="Sell/Rent Price (AED)"
              rules={[{ required: true, message: 'Please enter sell/rent price' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="Enter price in AED"
                min={0}
                precision={2}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Location */}
        <Divider orientation="left">Location</Divider>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="Location"
              label="Location/City"
              rules={[{ required: true, message: 'Please enter location' }]}
            >
              <Input placeholder="City or general location" />
            </Form.Item>
          </Col>
          
          <Col xs={24} md={12}>
            <Form.Item
              name="address"
              label="Full Address"
              rules={[{ required: true, message: 'Please enter address' }]}
            >
              <Input placeholder="Full property address" />
            </Form.Item>
          </Col>
        </Row>

        {/* Property Details */}
        <Divider orientation="left">Property Details</Divider>
        <Row gutter={16}>
          <Col xs={24} md={6}>
            <Form.Item
              name="NbrBedRooms"
              label="Bedrooms"
              rules={[{ required: true, message: 'Please enter number of bedrooms' }]}
            >
              <InputNumber style={{ width: '100%' }} min={0} placeholder="Bedrooms" />
            </Form.Item>
          </Col>
          
          <Col xs={24} md={6}>
            <Form.Item
              name="NbrBathRooms"
              label="Bathrooms"
              rules={[{ required: true, message: 'Please enter number of bathrooms' }]}
            >
              <InputNumber style={{ width: '100%' }} min={0} placeholder="Bathrooms" />
            </Form.Item>
          </Col>
          
          <Col xs={24} md={12}>
            <Form.Item
              name="Source"
              label="Source"
              rules={[{ required: false }]}
            >
              <Input placeholder="Property source (e.g., Direct Owner, Agency)" />
            </Form.Item>
          </Col>
        </Row>

        {/* Features */}
        <Divider orientation="left">Features</Divider>
        <Row gutter={16}>
          <Col xs={24}>
            <Space direction="vertical" style={{ width: '100%', marginBottom: '16px' }}>
              <Text>Property Features</Text>
              <Space wrap>
                {features.map(feature => (
                  <Tag 
                    key={feature} 
                    closable 
                    onClose={() => handleRemoveFeature(feature)}
                    color="blue"
                  >
                    {feature}
                  </Tag>
                ))}
              </Space>
              
              <Input 
                placeholder="Add a feature (e.g., Pool, Gym, Parking)" 
                value={newFeature} 
                onChange={e => setNewFeature(e.target.value)}
                onPressEnter={handleAddFeature}
                suffix={
                  <Button 
                    type="text" 
                    icon={<PlusOutlined />} 
                    onClick={handleAddFeature}
                  />
                }
              />
            </Space>
          </Col>
        </Row>

        {/* Description */}
        <Divider orientation="left">Description</Divider>
        <Row gutter={16}>
          <Col xs={24}>
            <Form.Item
              name="description"
              label="Property Description"
              rules={[{ required: true, message: 'Please enter property description' }]}
            >
              <TextArea 
                rows={4} 
                placeholder="Detailed description of the property" 
                maxLength={2000} 
                showCount 
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Images */}
        <Divider orientation="left">Images</Divider>
        <Row gutter={16}>
          <Col xs={24}>
            <Upload
              listType="picture-card"
              fileList={fileList}
              customRequest={handleImageUpload}
              onChange={({ fileList: newFileList }) => setFileList(newFileList)}
              onRemove={handleImageRemove}
              multiple
            >
              <div>
                <PlusOutlined />
                <div style={{ marginTop: 8 }}>Upload</div>
              </div>
            </Upload>
            <Text type="secondary">Upload multiple property images (max 10)</Text>
          </Col>
        </Row>

        {/* Form Actions */}
        <Row justify="end" style={{ marginTop: '24px' }}>
          <Col>
            <Space>
              <Button onClick={onCancel}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                {isEditMode ? 'Update Property' : 'Add Property'}
              </Button>
            </Space>
          </Col>
        </Row>
      </Form>
    </Spin>
  );
};

export default PropertyForm;
