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
  UploadOutlined, 
  HomeOutlined
} from '@ant-design/icons';
import cloudinaryService from 'services/CloudinaryService';

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

  // Watch category to show/hide rent-specific fields
  const category = Form.useWatch('Category', form);

  // Set initial values when form is in edit mode
  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue({
        ...initialValues,
        SellPrice: Number(initialValues.SellPrice) || 0,
        NbrBedRooms: Number(initialValues.NbrBedRooms) || 0,
        NbrBathRooms: Number(initialValues.NbrBathRooms) || 0,
        Cheques: Number(initialValues.Cheques) || undefined,
        UnitNumber: initialValues.UnitNumber || '',
        FloorNumber: initialValues.FloorNumber || '',
        BuildingName: initialValues.BuildingName || '',
        Area: Number(initialValues.Area) || undefined,
      });

      if (Array.isArray(initialValues.Features)) setFeatures(initialValues.Features);
      if (Array.isArray(initialValues.Images) && initialValues.Images.length > 0) {
        setUploadedImages(initialValues.Images);
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
      if (!currentUser) {
        message.error('User information is missing. Please log in again.');
        return;
      }

      const propertyData = {
        ...values,
        company_id: currentUser.company_id || '',
        creator_id: currentUser.uid || '',
        Features: features,
        Images: uploadedImages,
      };

      await onSave(propertyData);
    } catch (error) {
      console.error('Error submitting property form:', error);
      message.error('Failed to save property. Please try again.');
    }
  };

  // Image handlers
  const handleImageUpload = async (options) => {
    const { file, onSuccess, onError } = options;
    setUploadLoading(true);

    try {
      const result = await cloudinaryService.uploadFile(file, {
        folder: 'properties',
        tags: ['property', currentUser?.company_id]
      });

      setUploadedImages(prev => [...prev, result.url]);
      onSuccess(result, file);
      message.success(`${file.name} uploaded successfully`);
    } catch (error) {
      console.error('Error uploading image:', error);
      message.error(`${file.name} upload failed`);
      onError(error);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleImageRemove = (file) => {
    setFileList(prev => prev.filter(item => item.uid !== file.uid));
    if (file.url) {
      setUploadedImages(prev => prev.filter(url => url !== file.url));
    }
  };

  // Feature handlers
  const handleAddFeature = () => {
    if (newFeature?.trim() && !features.includes(newFeature.trim())) {
      setFeatures([...features, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (feature) => {
    setFeatures(features.filter(item => item !== feature));
  };

  const propertyTypes = [
    "Studio", "Apartment", "Villa", "Penthouse", "Retail", "Hotel",
    "Building", "Tower", "Land", "Hotel Room", "Store", "Mall"
  ];

  const propertyCategories = ['OffPlan', 'Buy', 'Rent'];
  const propertyStatuses = ['Vacant', 'Rented', 'Available', 'Sold'];

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
              rules={[{ required: true, message: 'Please enter the property title' }]}
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
                {propertyCategories.map(cat => (
                  <Option key={cat} value={cat}>{cat}</Option>
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
              name="SellPrice"
              label="Sell / Rent Price (AED)"
              rules={[{ required: true, message: 'Please enter the sell or rent price' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="Enter price in AED"
                min={0}
                precision={2}
              />
            </Form.Item>
          </Col>

          {category === 'Rent' && (
            <Col xs={24} md={12}>
              <Form.Item
                name="Cheques"
                label="Number of Cheques"
                rules={[{ required: true, message: 'Please enter number of cheques' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="e.g. 12"
                  min={1}
                  max={24}
                />
              </Form.Item>
            </Col>
          )}
        </Row>

        {/* Location */}
        <Divider orientation="left">Location</Divider>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="Location"
              label="Location / City"
              rules={[{ required: true, message: 'Please enter the location or city' }]}
            >
              <Input placeholder="e.g. Dubai Marina, Downtown, etc." />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              name="BuildingName"
              label="Building Name"
              rules={[{ required: true, message: 'Please enter building name' }]}
            >
              <Input placeholder="Building name" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              name="UnitNumber"
              label="Unit Number"
              rules={[{ required: true, message: 'Please enter unit number' }]}
            >
              <Input placeholder="e.g. 1203" />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item
              name="FloorNumber"
              label="Floor Number"
              rules={[{ required: true, message: 'Please enter floor number' }]}
            >
              <InputNumber style={{ width: '100%' }} placeholder="Floor" min={0} />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item
              name="Area"
              label="Area (Sq Ft)"
              rules={[{ required: true, message: 'Please enter the area in square feet' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="Area in Sq Ft"
                min={0}
              />
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
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          
          <Col xs={24} md={6}>
            <Form.Item
              name="NbrBathRooms"
              label="Bathrooms"
              rules={[{ required: true, message: 'Please enter number of bathrooms' }]}
            >
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          
          <Col xs={24} md={12}>
            <Form.Item
              name="Source"
              label="Source"
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
                  <Button type="text" icon={<PlusOutlined />} onClick={handleAddFeature} />
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
              rules={[{ required: true, message: 'Please provide a detailed property description' }]}
            >
              <TextArea 
                rows={4} 
                placeholder="Detailed description of the property..." 
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
            <Text type="secondary">Upload multiple property images (max 10 recommended)</Text>
          </Col>
        </Row>

        {/* Form Actions */}
        <Row justify="end" style={{ marginTop: '32px' }}>
          <Col>
            <Space>
              <Button onClick={onCancel}>Cancel</Button>
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