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
  Tag,
  Divider,
  Typography
} from 'antd';
import { 
  HomeOutlined, 
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined
} from '@ant-design/icons';
import CloudinaryService from 'services/CloudinaryService';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

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
  const [features, setFeatures] = useState([]);
  const [newFeature, setNewFeature] = useState('');

  const isEditMode = !!property;
  const category = Form.useWatch('Category', form);

  // Initialize form
  useEffect(() => {
    if (property) {
      form.setFieldsValue({
        ...property,
        SellPrice: Number(property.SellPrice) || 0,
        NbrBedRooms: Number(property.NbrBedRooms) || 0,
        NbrBathRooms: Number(property.NbrBathRooms) || 0,
        Cheques: Number(property.Cheques) || undefined,
        FloorNumber: property.FloorNumber || undefined,
        Area: Number(property.Area) || undefined,
      });
      setUploadedImages(property.Images || []);
      setFeatures(property.Features || []);
    } else {
      form.resetFields();
      form.setFieldsValue({
        Category: 'Buy',
        Status: 'Pending',
        Type: 'Apartment',
        NbrBedRooms: 1,
        NbrBathRooms: 1,
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
        company_id: companyId,
      };

      await onSubmit(propertyData);

      // Reset after successful submit
      form.resetFields();
      setUploadedImages([]);
      setFeatures([]);
      setNewFeature('');
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  // Fixed Image Upload Handler
  const handleImageUpload = async (file) => {
    try {
      setUploading(true);

      const result = await CloudinaryService.uploadFile(file, {
        folder: 'properties',
        tags: ['property', companyId]
      });

      setUploadedImages(prev => [...prev, result.url || result.secure_url]);
      message.success(`${file.name} uploaded successfully`);
    } catch (error) {
      console.error('Upload error:', error);
      message.error('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }

    return false; // Prevent default Ant Design upload behavior
  };

  const removeImage = (imageUrl) => {
    setUploadedImages(prev => prev.filter(url => url !== imageUrl));
    message.info('Image removed');
  };

  const addFeature = () => {
    if (newFeature.trim() && !features.includes(newFeature.trim())) {
      setFeatures([...features, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const removeFeature = (feature) => {
    setFeatures(features.filter(f => f !== feature));
  };

  const propertyTypes = [
    "Studio", "Apartment", "Villa", "Penthouse", "Retail", "Hotel",
    "Building", "Tower", "Land", "Hotel Room", "Store", "Mall", 
    "Office", "Warehouse"
  ];

  const propertyCategories = ['OffPlan', 'Buy', 'Rent'];
  const propertyStatuses = [ 'Sold', 'Available', 'Rented', 'Vacant'];

  return (
    <Modal
      title={isEditMode ? 'Edit Property' : 'Add New Property'}
      open={visible}
      onCancel={onCancel}
      width={950}
      footer={[
        <Button key="cancel" onClick={onCancel}>Cancel</Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleSubmit}
          icon={<HomeOutlined />}
        >
          {isEditMode ? 'Update Property' : 'Create Property'}
        </Button>
      ]}
    >
      <Form form={form} layout="vertical">
        {/* Basic Information */}
        <Divider orientation="left">Basic Information</Divider>
        <Row gutter={16}>
          <Col xs={24} md={16}>
            <Form.Item name="title" label="Property Title" rules={[{ required: true, message: 'Please enter property title' }]}>
              <Input placeholder="Enter property title" maxLength={100} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="Type" label="Property Type" rules={[{ required: true }]}>
              <Select placeholder="Select type">
                {propertyTypes.map(type => <Option key={type} value={type}>{type}</Option>)}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item name="Category" label="Category" rules={[{ required: true }]}>
              <Select placeholder="Select category">
                {propertyCategories.map(cat => <Option key={cat} value={cat}>{cat}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="Status" label="Status" rules={[{ required: true }]}>
              <Select placeholder="Select status">
                {propertyStatuses.map(status => <Option key={status} value={status}>{status}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="SellPrice" label="Price (AED)" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={0} precision={0} />
            </Form.Item>
          </Col>
        </Row>

        {/* Cheques for Rent */}
        {category === 'Rent' && (
          <Form.Item name="Cheques" label="Number of Cheques" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={1} max={24} />
          </Form.Item>
        )}

        {/* Location */}
        <Divider orientation="left">Location Details</Divider>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="Location" label="City / Area" rules={[{ required: true }]}>
              <Input placeholder="e.g. Dubai Marina" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="BuildingName" label="Building Name" rules={[{ required: true }]}>
              <Input placeholder="Building name" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item name="UnitNumber" label="Unit Number" rules={[{ required: true }]}>
              <Input placeholder="e.g. 1203" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="FloorNumber" label="Floor Number" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="Area" label="Area (Sq Ft)" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
        </Row>

        {/* Property Details */}
        <Divider orientation="left">Property Details</Divider>
        <Row gutter={16}>
          <Col xs={24} md={6}>
            <Form.Item name="NbrBedRooms" label="Bedrooms" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item name="NbrBathRooms" label="Bathrooms" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="Source" label="Source">
              <Input placeholder="Direct Owner, Agency, etc." />
            </Form.Item>
          </Col>
        </Row>

        {/* Features */}
        <Divider orientation="left">Features</Divider>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space wrap>
            {features.map(feature => (
              <Tag key={feature} closable onClose={() => removeFeature(feature)} color="blue">
                {feature}
              </Tag>
            ))}
          </Space>
          <Input
            placeholder="Add a feature (e.g. Pool, Gym, Parking)"
            value={newFeature}
            onChange={e => setNewFeature(e.target.value)}
            onPressEnter={addFeature}
            suffix={<Button type="text" icon={<PlusOutlined />} onClick={addFeature} />}
          />
        </Space>

        {/* Description */}
        <Divider orientation="left">Description</Divider>
        <Form.Item
          name="description"
          label="Property Description"
          rules={[{ required: true, message: 'Please enter description' }]}
        >
          <TextArea rows={4} placeholder="Detailed description of the property..." />
        </Form.Item>

        {/* Images */}
        <Divider orientation="left">Property Images</Divider>
        <Upload
          multiple
          beforeUpload={handleImageUpload}
          showUploadList={false}
          accept="image/*"
        >
          <Button icon={<UploadOutlined />} loading={uploading}>
            {uploading ? 'Uploading...' : 'Upload Images'}
          </Button>
        </Upload>

        <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {uploadedImages.map((url, index) => (
            <div key={index} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden' }}>
              <img
                src={url}
                alt="uploaded"
                style={{ width: 110, height: 110, objectFit: 'cover' }}
              />
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                style={{ position: 'absolute', top: 6, right: 6 }}
                onClick={() => removeImage(url)}
              />
            </div>
          ))}
        </div>
      </Form>
    </Modal>
  );
};

export default SellerPropertyForm;