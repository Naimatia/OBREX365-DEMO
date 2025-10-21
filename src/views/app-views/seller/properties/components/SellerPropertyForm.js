// @ts-nocheck
import React, { useState, useEffect } from 'react';
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
  Upload,
  Progress,
  Tag,
  Image,
  Divider
} from 'antd';
import { 
  HomeOutlined, 
  DollarOutlined, 
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
  EyeOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import CloudinaryService from 'services/CloudinaryService';

const { Option } = Select;
const { TextArea } = Input;

// Property categories and types
const PropertyCategories = {
  OFFPLAN: 'OffPlan',
  BUY: 'Buy',
  RENT: 'Rent'
};

const PropertyTypes = {
  STUDIO: 'Studio',
  APARTMENT: 'Apartment',
  VILLA: 'Villa',
  PENTHOUSE: 'Penthouse',
  TOWNHOUSE: 'Townhouse',
  OFFICE: 'Office',
  WAREHOUSE: 'Warehouse',
  LAND: 'Land'
};

const PropertyStatus = {
  PENDING: 'Pending',
  SOLD: 'Sold'
};

/**
 * Form component for creating/editing properties
 */
const SellerPropertyForm = ({ 
  visible, 
  onCancel, 
  onSubmit, 
  property, 
  loading,
  userId,
  companyId 
}) => {
  const [form] = Form.useForm();
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [featuresInput, setFeaturesInput] = useState('');
  const [features, setFeatures] = useState([]);

  // Validation rules
  const rules = {
    title: [
      { required: true, message: 'Please enter property title!' },
      { min: 5, message: 'Title must be at least 5 characters!' }
    ],
    SellPrice: [
      { required: true, message: 'Please enter property price!' },
      { type: 'number', min: 0, message: 'Price must be positive!' }
    ],
    Type: [
      { required: true, message: 'Please select property type!' }
    ],
    Category: [
      { required: true, message: 'Please select property category!' }
    ],
    Status: [
      { required: true, message: 'Please select property status!' }
    ],
    Location: [
      { required: true, message: 'Please enter location!' }
    ],
    address: [
      { required: true, message: 'Please enter address!' }
    ],
    NbrBedRooms: [
      { required: true, message: 'Please enter number of bedrooms!' },
      { type: 'number', min: 0, message: 'Bedrooms must be 0 or more!' }
    ],
    NbrBathRooms: [
      { required: true, message: 'Please enter number of bathrooms!' },
      { type: 'number', min: 1, message: 'Bathrooms must be at least 1!' }
    ]
  };

  // Set form values when property prop changes
  useEffect(() => {
    if (property) {
      form.setFieldsValue({
        ...property,
        SellPrice: property.SellPrice || 0
      });
      setUploadedImages(property.Images || []);
      setFeatures(property.Features || []);
    } else {
      // Set default values for new property
      form.setFieldsValue({
        Status: PropertyStatus.PENDING,
        Category: PropertyCategories.BUY,
        Type: PropertyTypes.APARTMENT,
        NbrBedRooms: 1,
        NbrBathRooms: 1
      });
      setUploadedImages([]);
      setFeatures([]);
    }
  }, [form, property]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      const propertyData = {
        ...values,
        Images: uploadedImages,
        Features: features,
        creator_id: userId,
        company_id: companyId
      };
      
      await onSubmit(propertyData);
      form.resetFields();
      setUploadedImages([]);
      setFeatures([]);
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  // Handle image upload
  const handleImageUpload = async (file) => {
    try {
      setUploading(true);
      setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
      
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: Math.min((prev[file.name] || 0) + 10, 90)
        }));
      }, 200);
      
      const result = await CloudinaryService.uploadImage(file, {
        folder: 'properties',
        tags: ['property', companyId]
      });
      
      clearInterval(progressInterval);
      setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
      
      const newImageUrl = result.secure_url;
      setUploadedImages(prev => [...prev, newImageUrl]);
      
      message.success(`${file.name} uploaded successfully!`);
      
      // Clear progress after a delay
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Upload error:', error);
      message.error(`Failed to upload ${file.name}`);
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[file.name];
        return newProgress;
      });
    } finally {
      setUploading(false);
    }
    
    return false; // Prevent default upload behavior
  };

  // Remove image
  const removeImage = (imageUrl) => {
    setUploadedImages(prev => prev.filter(url => url !== imageUrl));
    message.success('Image removed');
  };

  // Add feature
  const addFeature = () => {
    if (featuresInput.trim() && !features.includes(featuresInput.trim())) {
      setFeatures([...features, featuresInput.trim()]);
      setFeaturesInput('');
    }
  };

  // Remove feature
  const removeFeature = (feature) => {
    setFeatures(features.filter(f => f !== feature));
  };

  return (
    <Modal
      title={property ? 'Edit Property' : 'Add New Property'}
      open={visible}
      onCancel={onCancel}
      width={900}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleSubmit}
          icon={<HomeOutlined />}
        >
          {property ? 'Update Property' : 'Create Property'}
        </Button>
      ]}
      style={{ top: 20 }}
    >
      <Form form={form} layout="vertical" size="large">
        {/* Basic Information */}
        <Divider orientation="left">Basic Information</Divider>
        
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="title"
              label="Property Title"
              rules={rules.title}
            >
              <Input 
                placeholder="Enter property title"
                prefix={<HomeOutlined />}
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12}>
            <Form.Item
              name="SellPrice"
              label="Price (AED)"
              rules={rules.SellPrice}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="Enter price in AED"
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/\$\s?|(,*)/g, '')}
                prefix="AED"
                min={0}
                precision={0}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item
              name="Type"
              label="Property Type"
              rules={rules.Type}
            >
              <Select placeholder="Select type">
                {Object.values(PropertyTypes).map(type => (
                  <Option key={type} value={type}>{type}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={8}>
            <Form.Item
              name="Category"
              label="Category"
              rules={rules.Category}
            >
              <Select placeholder="Select category">
                {Object.values(PropertyCategories).map(category => (
                  <Option key={category} value={category}>{category}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={8}>
            <Form.Item
              name="Status"
              label="Status"
              rules={rules.Status}
            >
              <Select placeholder="Select status">
                {Object.values(PropertyStatus).map(status => (
                  <Option key={status} value={status}>
                    <Space>
                      <span style={{ color: status === 'Sold' ? '#52c41a' : '#1890ff' }}>●</span>
                      {status}
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* Location Information */}
        <Divider orientation="left">Location Information</Divider>
        
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="Location"
              label="Location"
              rules={rules.Location}
            >
              <Input placeholder="e.g., Dubai Marina, Business Bay" />
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12}>
            <Form.Item
              name="address"
              label="Address"
              rules={rules.address}
            >
              <Input placeholder="Full address" />
            </Form.Item>
          </Col>
        </Row>

        {/* Property Details */}
        <Divider orientation="left">Property Details</Divider>
        
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item
              name="NbrBedRooms"
              label="Bedrooms"
              rules={rules.NbrBedRooms}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                placeholder="Number of bedrooms"
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={8}>
            <Form.Item
              name="NbrBathRooms"
              label="Bathrooms"
              rules={rules.NbrBathRooms}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={1}
                placeholder="Number of bathrooms"
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={8}>
            <Form.Item
              name="Source"
              label="Source"
            >
              <Input placeholder="Property source (optional)" />
            </Form.Item>
          </Col>
        </Row>

        {/* Features */}
        <Divider orientation="left">Features</Divider>
        
        <Row gutter={16}>
          <Col xs={24}>
            <Form.Item label="Features">
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  value={featuresInput}
                  onChange={(e) => setFeaturesInput(e.target.value)}
                  placeholder="Add a feature (e.g., Swimming Pool, Gym, Parking)"
                  onPressEnter={addFeature}
                />
                <Button type="primary" icon={<PlusOutlined />} onClick={addFeature}>
                  Add
                </Button>
              </Space.Compact>
              
              <div style={{ marginTop: '8px' }}>
                {features.map(feature => (
                  <Tag
                    key={feature}
                    closable
                    onClose={() => removeFeature(feature)}
                    style={{ marginBottom: '8px' }}
                  >
                    {feature}
                  </Tag>
                ))}
              </div>
            </Form.Item>
          </Col>
        </Row>

        {/* Images Upload */}
        <Divider orientation="left">Property Images</Divider>
        
        <Row gutter={16}>
          <Col xs={24}>
            <Form.Item label="Images">
              <Upload
                multiple
                beforeUpload={handleImageUpload}
                showUploadList={false}
                accept="image/*"
              >
                <Button 
                  icon={uploading ? <LoadingOutlined /> : <UploadOutlined />} 
                  loading={uploading}
                  style={{ marginBottom: '16px' }}
                >
                  Upload Images
                </Button>
              </Upload>

              {/* Upload Progress */}
              {Object.entries(uploadProgress).map(([fileName, progress]) => (
                <div key={fileName} style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>Uploading {fileName}</div>
                  <Progress percent={progress} size="small" />
                </div>
              ))}

              {/* Uploaded Images */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {uploadedImages.map((imageUrl, index) => (
                  <div key={index} style={{ position: 'relative', border: '1px solid #d9d9d9', borderRadius: '6px' }}>
                    <Image
                      width={100}
                      height={100}
                      src={imageUrl}
                      style={{ objectFit: 'cover', borderRadius: '6px' }}
                      preview={{
                        mask: <EyeOutlined />
                      }}
                    />
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => removeImage(imageUrl)}
                      style={{ 
                        position: 'absolute', 
                        top: '4px', 
                        right: '4px',
                        backgroundColor: 'rgba(255,255,255,0.8)'
                      }}
                    />
                  </div>
                ))}
              </div>
              
              {uploadedImages.length === 0 && (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '20px', 
                  border: '2px dashed #d9d9d9', 
                  borderRadius: '6px',
                  color: '#999'
                }}>
                  No images uploaded yet
                </div>
              )}
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default SellerPropertyForm;
