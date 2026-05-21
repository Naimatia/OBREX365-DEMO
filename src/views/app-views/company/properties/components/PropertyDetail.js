import React from 'react';
import { 
  Drawer, 
  Typography, 
  Descriptions, 
  Image, 
  Tag, 
  Space, 
  Button, 
  Divider, 
  Row, 
  Col, 
  List,
  Carousel,
  Card
} from 'antd';
import {
  HomeOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  TagOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  MessageOutlined,
  BankOutlined,
  NumberOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

/**
 * PropertyDetail component for displaying detailed property information
 */
const PropertyDetail = ({ 
  property, 
  visible, 
  onClose, 
  onEdit, 
  onDelete, 
  currentUser 
}) => {
  if (!property) return null;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      maximumFractionDigits: 0,
    }).format(price || 0);
  };

  const formatDate = (date) => {
    return date ? dayjs(date).format('MMMM DD, YYYY HH:mm') : 'N/A';
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'sold': return '#f5222d';
      case 'rented': return '#722ed1';
      case 'available': return '#52c41a';
      case 'vacant': return '#13c2c2';
      default: return '#faad14';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'OffPlan': return '#1890ff';
      case 'Rent': return '#722ed1';
      case 'Buy': return '#13c2c2';
      default: return '#595959';
    }
  };

  const hasPermission = property.creator_id === currentUser?.uid || 
                       currentUser?.Role === 'CEO' || 
                       currentUser?.Role === 'HR';

  const hasImages = Array.isArray(property.Images) && property.Images.length > 0;
  const placeholderImage = 'https://res.cloudinary.com/dop2pji6u/image/upload/v1708523400/properties/property-placeholder_gmcvxd.jpg';

  return (
    <Drawer
      title={<Space><HomeOutlined /> Property Details</Space>}
      placement="right"
      width={680}
      onClose={onClose}
      open={visible}
      footer={
        hasPermission && (
          <Space>
            <Button icon={<DeleteOutlined />} danger onClick={() => onDelete(property.id)}>
              Delete
            </Button>
            <Button type="primary" icon={<EditOutlined />} onClick={() => onEdit(property)}>
              Edit Property
            </Button>
          </Space>
        )
      }
    >
      {/* Title + Tags */}
      <Title level={4} style={{ marginBottom: 16 }}>{property.title}</Title>

      <Space wrap style={{ marginBottom: 24 }}>
        <Tag color={getStatusColor(property.Status)} style={{ padding: '6px 12px', fontSize: '14px' }}>
          {property.Status}
        </Tag>
        <Tag color={getCategoryColor(property.Category)} style={{ padding: '6px 12px', fontSize: '14px' }}>
          {property.Category}
        </Tag>
        <Tag color="purple" style={{ padding: '6px 12px', fontSize: '14px' }}>
          {property.Type}
        </Tag>
      </Space>

      {/* Image Carousel */}
      <Card style={{ marginBottom: 24, borderRadius: 12 }} bodyStyle={{ padding: 0 }}>
        <Carousel autoplay dots autoplaySpeed={5000}>
          {hasImages ? property.Images.map((url, idx) => (
            <div key={idx}>
              <Image
                src={url}
                alt={`Property ${idx + 1}`}
                style={{ width: '100%', height: 420, objectFit: 'cover' }}
                preview
              />
            </div>
          )) : (
            <Image
              src={placeholderImage}
              alt="No image"
              style={{ width: '100%', height: 420, objectFit: 'contain', opacity: 0.6 }}
              preview={false}
            />
          )}
        </Carousel>
      </Card>

      {/* Price */}
      <Card 
        title={<Space><DollarOutlined /> Pricing Information</Space>}
        style={{ marginBottom: 24, borderRadius: 12 }}
      >
        <Row gutter={16}>
          <Col span={24}>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#faad14' }}>
              {formatPrice(property.SellPrice)}
            </div>
            <Text type="secondary">
              {property.Category === 'Rent' ? 'Monthly Rent' : 'Selling Price'}
            </Text>
          </Col>

          {property.Category === 'Rent' && property.Cheques && (
            <Col span={24} style={{ marginTop: 16 }}>
              <Space>
                <NumberOutlined />
                <Text strong>{property.Cheques} Cheques</Text>
              </Space>
            </Col>
          )}
        </Row>
      </Card>

      {/* Location & Unit Details */}
      <Card 
        title={<Space><EnvironmentOutlined /> Location & Unit Details</Space>}
        style={{ marginBottom: 24, borderRadius: 12 }}
      >
        <Descriptions bordered column={2}>
          <Descriptions.Item label="City / Area" span={2}>
            {property.Location}
          </Descriptions.Item>
          <Descriptions.Item label="Building Name">
            {property.BuildingName || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Unit Number">
            {property.UnitNumber || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Floor">
            {property.FloorNumber || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Area">
            {property.Area ? `${property.Area} Sq Ft` : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Property Details */}
      <Card 
        title={<Space><InfoCircleOutlined /> Property Details</Space>}
        style={{ marginBottom: 24, borderRadius: 12 }}
      >
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Type">{property.Type}</Descriptions.Item>
          <Descriptions.Item label="Status">{property.Status}</Descriptions.Item>
          <Descriptions.Item label="Bedrooms">{property.NbrBedRooms}</Descriptions.Item>
          <Descriptions.Item label="Bathrooms">{property.NbrBathRooms}</Descriptions.Item>
          <Descriptions.Item label="Source" span={2}>
            {property.Source || 'Not specified'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Features */}
      <Card 
        title={<Space><TagOutlined /> Features</Space>}
        style={{ marginBottom: 24, borderRadius: 12 }}
      >
        {Array.isArray(property.Features) && property.Features.length > 0 ? (
          <Space wrap>
            {property.Features.map((feature, i) => (
              <Tag key={i} color="blue" style={{ padding: '6px 12px' }}>
                {feature}
              </Tag>
            ))}
          </Space>
        ) : (
          <Text type="secondary">No features added</Text>
        )}
      </Card>

      {/* Description */}
      <Card 
        title={<Space><FileTextOutlined /> Description</Space>}
        style={{ marginBottom: 24, borderRadius: 12 }}
      >
        <Paragraph style={{ whiteSpace: 'pre-line' }}>
          {property.description || <Text type="secondary">No description provided.</Text>}
        </Paragraph>
      </Card>

      {/* Notes */}
      <Card 
        title={<Space><MessageOutlined /> Notes</Space>}
        style={{ marginBottom: 24, borderRadius: 12 }}
      >
        {Array.isArray(property.Notes) && property.Notes.length > 0 ? (
          <List
            dataSource={property.Notes}
            renderItem={(note) => (
              <List.Item>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text>{note.note}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {note.CreationDate ? dayjs(note.CreationDate).format('DD MMM YYYY • HH:mm') : ''}
                  </Text>
                </Space>
              </List.Item>
            )}
          />
        ) : (
          <Text type="secondary">No notes available</Text>
        )}
      </Card>

      {/* Metadata */}
      <Card style={{ borderRadius: 12 }} bordered={false}>
        <Row gutter={16}>
          <Col span={12}>
            <Text type="secondary">Created</Text><br />
            <Text strong>{formatDate(property.CreationDate)}</Text>
          </Col>
          <Col span={12}>
            <Text type="secondary">Last Updated</Text><br />
            <Text strong>{formatDate(property.LastUpdateDateTime)}</Text>
          </Col>
        </Row>
      </Card>
    </Drawer>
  );
};

export default PropertyDetail;