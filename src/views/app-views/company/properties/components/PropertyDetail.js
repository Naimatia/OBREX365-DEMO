import React from 'react';
import { 
  Drawer, 
  Typography, 
  Descriptions, 
  Image, 
  Tag, 
  Badge, 
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
  BankOutlined,
  EnvironmentOutlined,
  TagOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  MessageOutlined
} from '@ant-design/icons';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;

/**
 * PropertyDetail component for displaying detailed property information in a drawer
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
  
  // Format price with currency
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Format date
  const formatDate = (date) => {
    return date ? moment(date).format('MMMM DD, YYYY HH:mm') : 'N/A';
  };

  // Get status color with better contrast
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'sold':
        return '#f5222d'; // Strong red
      case 'rented':
        return '#722ed1'; // Strong purple
      case 'pending':
        return '#fa8c16'; // Strong orange
      case 'available':
      default:
        return '#52c41a'; // Strong green
    }
  };

  // Get category color with better contrast
  const getCategoryColor = (category) => {
    switch (category) {
      case 'OffPlan':
        return '#1890ff'; // Strong blue
      case 'Rent':
        return '#722ed1'; // Strong purple
      case 'Buy':
      default:
        return '#13c2c2'; // Strong cyan
    }
  };

  // Get type color for better distinction
  const getTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'apartment':
        return '#fa541c'; // Strong orange
      case 'villa':
        return '#52c41a'; // Strong green  
      case 'townhouse':
        return '#1890ff'; // Strong blue
      case 'penthouse':
        return '#eb2f96'; // Strong pink
      case 'studio':
        return '#722ed1'; // Strong purple
      default:
        return '#595959'; // Strong gray
    }
  };

  // Check if the current user has permission to edit/delete
  const hasPermission = property.creator_id === currentUser?.uid || 
                       currentUser?.Role === 'CEO' || 
                       currentUser?.Role === 'HR';

  // Use placeholder image if no images
  const hasImages = Array.isArray(property.Images) && property.Images.length > 0;
  
  // Placeholder image for the carousel when no images
  const placeholderImage = 'https://res.cloudinary.com/dop2pji6u/image/upload/v1708523400/properties/property-placeholder_gmcvxd.jpg';

  return (
    <Drawer
      title={
        <Space align="center">
          <HomeOutlined />
          <span>Property Details</span>
        </Space>
      }
      placement="right"
      width={600}
      onClose={onClose}
      open={visible}
      footer={
        hasPermission && (
          <Space>
            <Button 
              icon={<DeleteOutlined />} 
              danger 
              onClick={() => onDelete(property.id)}
            >
              Delete Property
            </Button>
            <Button 
              type="primary" 
              icon={<EditOutlined />} 
              onClick={() => onEdit(property)}
            >
              Edit Property
            </Button>
          </Space>
        )
      }
    >
      {/* Property Title */}
      <Title level={4} style={{ marginBottom: '16px' }}>
        {property.title}
      </Title>
      
      {/* Status and Category Tags */}
      <Space style={{ marginBottom: '24px' }} wrap>
        <Tag 
          style={{
            backgroundColor: getStatusColor(property.Status),
            color: '#fff',
            border: 'none',
            fontWeight: '600',
            fontSize: '13px',
            padding: '6px 12px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <HomeOutlined style={{ color: '#fff' }} />
          {property.Status}
        </Tag>
        <Tag 
          style={{
            backgroundColor: getCategoryColor(property.Category),
            color: '#fff',
            border: 'none',
            fontWeight: '600',
            fontSize: '13px',
            padding: '6px 12px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <TagOutlined style={{ color: '#fff' }} />
          {property.Category}
        </Tag>
        <Tag 
          style={{
            backgroundColor: getTypeColor(property.Type),
            color: '#fff',
            border: 'none',
            fontWeight: '600',
            fontSize: '13px',
            padding: '6px 12px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <AppstoreOutlined style={{ color: '#fff' }} />
          {property.Type}
        </Tag>
      </Space>

      {/* Image Carousel */}
      <div style={{ marginBottom: '24px' }}>
        <Card
          bordered={false}
          style={{ 
            borderRadius: '12px', 
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
          }}
          bodyStyle={{ padding: 0 }}
        >
          <Carousel 
            autoplay 
            dots
            autoplaySpeed={5000}
            style={{ 
              background: 'linear-gradient(to right, #f0f2f5, #e6f7ff)', 
              borderRadius: '12px', 
              overflow: 'hidden' 
            }}
          >
            {hasImages ? (
              property.Images.map((imageUrl, index) => (
                <div key={index}>
                  <div style={{ 
                    height: '400px', 
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f0f2f5',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <Image 
                      src={imageUrl} 
                      alt={`Property image ${index + 1}`} 
                      style={{ 
                        width: '100%', 
                        height: '400px',
                        objectFit: 'cover'
                      }} 
                      preview={{
                        mask: <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <InfoCircleOutlined /> View Fullscreen
                        </div>
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      bottom: '10px',
                      right: '10px',
                      background: 'rgba(0,0,0,0.5)',
                      color: 'white',
                      padding: '3px 8px',
                      borderRadius: '4px'
                    }}>
                      {index + 1}/{property.Images.length}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div>
                <div style={{ 
                  height: '400px', 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#f0f2f5'
                }}>
                  <Image 
                    src={placeholderImage} 
                    alt="No image available" 
                    style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain', opacity: '0.5' }} 
                    preview={false}
                  />
                </div>
              </div>
            )}
          </Carousel>
        </Card>
      </div>

      {/* Price Information */}
      <Card 
        style={{ 
          marginBottom: '24px', 
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }} 
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #ffd93d 0%, #faad14 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <DollarOutlined style={{ color: '#fff', fontSize: '16px' }} />
            </div>
            <Text strong style={{ fontSize: '16px' }}>Price Information (AED)</Text>
          </div>
        }
        headStyle={{ 
          background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
          borderBottom: '2px solid #f0f0f0',
          borderRadius: '8px 8px 0 0'
        }}
      >
        <Row gutter={[16, 16]} align="stretch">
          {/* Original Price */}
          <Col xs={24} sm={24} md={8}>
            <div style={{ 
              textAlign: 'center',
              padding: '16px 12px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(255, 120, 117, 0.1) 0%, rgba(255, 120, 117, 0.05) 100%)',
              border: '2px solid rgba(255, 120, 117, 0.2)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{ 
                fontSize: '11px', 
                color: '#8c8c8c',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '8px'
              }}>
                Original Price
              </div>
              <div style={{ 
                fontSize: '16px', 
                fontWeight: '600',
                color: '#ff7875',
                textDecoration: 'line-through',
                marginBottom: '4px',
                wordBreak: 'break-word',
                lineHeight: '1.2'
              }}>
                {formatPrice(property.OriginalPrice)}
              </div>
              <div style={{ 
                fontSize: '9px',
                color: '#ff7875',
                textTransform: 'uppercase',
                fontWeight: '500'
              }}>
                Listed Price
              </div>
            </div>
          </Col>
          
          {/* Sell/Rent Price */}
          <Col xs={24} sm={24} md={8}>
            <div style={{ 
              textAlign: 'center',
              padding: '16px 12px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(250, 173, 20, 0.15) 0%, rgba(250, 173, 20, 0.05) 100%)',
              border: '2px solid rgba(250, 173, 20, 0.3)',
              position: 'relative',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{
                position: 'absolute',
                top: '-8px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#faad14',
                color: '#fff',
                padding: '2px 6px',
                borderRadius: '10px',
                fontSize: '9px',
                fontWeight: '600',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap'
              }}>
                Current
              </div>
              <div style={{ 
                fontSize: '11px', 
                color: '#8c8c8c',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '8px'
              }}>
                Selling Price
              </div>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: 'bold',
                color: '#faad14',
                marginBottom: '4px',
                wordBreak: 'break-word',
                lineHeight: '1.1'
              }}>
                {formatPrice(property.SellPrice)}
              </div>
              <div style={{ 
                fontSize: '9px',
                color: '#faad14',
                textTransform: 'uppercase',
                fontWeight: '500'
              }}>
                Market Price
              </div>
            </div>
          </Col>
          
          {/* Gain/Loss */}
          <Col xs={24} sm={24} md={8}>
            <div style={{ 
              textAlign: 'center',
              padding: '16px 12px',
              borderRadius: '12px',
              background: property.SellPrice > property.OriginalPrice 
                ? 'linear-gradient(135deg, rgba(82, 196, 26, 0.15) 0%, rgba(82, 196, 26, 0.05) 100%)'
                : 'linear-gradient(135deg, rgba(245, 34, 45, 0.15) 0%, rgba(245, 34, 45, 0.05) 100%)',
              border: `2px solid ${property.SellPrice > property.OriginalPrice ? 'rgba(82, 196, 26, 0.3)' : 'rgba(245, 34, 45, 0.3)'}`,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{ 
                fontSize: '11px', 
                color: '#8c8c8c',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '8px'
              }}>
                {property.SellPrice > property.OriginalPrice ? 'Profit' : 'Loss'}
              </div>
              <div style={{ 
                fontSize: '18px', 
                fontWeight: 'bold',
                color: property.SellPrice > property.OriginalPrice ? '#52c41a' : '#f5222d',
                marginBottom: '4px',
                wordBreak: 'break-word',
                lineHeight: '1.1'
              }}>
                {property.SellPrice > property.OriginalPrice ? '+' : ''}
                {formatPrice(property.SellPrice - property.OriginalPrice)}
              </div>
              <div style={{ 
                fontSize: '9px',
                color: property.SellPrice > property.OriginalPrice ? '#52c41a' : '#f5222d',
                textTransform: 'uppercase',
                fontWeight: '500'
              }}>
                {property.SellPrice > property.OriginalPrice ? 'Gain Amount' : 'Loss Amount'}
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Property Details */}
      <Descriptions 
        title={<Text strong style={{ fontSize: '16px' }}><InfoCircleOutlined /> Property Details</Text>} 
        bordered 
        column={2}
        style={{ 
          marginBottom: '24px',
          borderRadius: '8px',
          overflow: 'hidden'
        }}
        labelStyle={{ background: '#f9fafc' }}
      >
        <Descriptions.Item label="Type" span={1}>
          {property.Type}
        </Descriptions.Item>
        <Descriptions.Item label="Status" span={1}>
          <Tag icon={<InfoCircleOutlined />} color={getStatusColor(property.Status)}>{property.Status}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Bedrooms" span={1}>
          <Space>
            <AppstoreOutlined />
            {property.NbrBedRooms}
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="Bathrooms" span={1}>
          <Space>
            <BankOutlined />
            {property.NbrBathRooms}
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="Source" span={2}>
          {property.Source || 'Not specified'}
        </Descriptions.Item>
        <Descriptions.Item label="Location" span={2}>
          <Space>
            <EnvironmentOutlined />
            {property.Location}, {property.address}
          </Space>
        </Descriptions.Item>
      </Descriptions>

      {/* Features */}
      <Card
        title={<Text strong><TagOutlined /> Features</Text>}
        style={{ 
          marginBottom: '24px',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}
        headStyle={{ background: '#f9fafc', borderBottom: '1px solid #f0f0f0' }}
        bodyStyle={{ padding: '16px' }}
      >
        {Array.isArray(property.Features) && property.Features.length > 0 ? (
          <Space wrap size="middle">
            {property.Features.map((feature, index) => (
              <Tag 
                key={index} 
                color="blue"
                style={{ 
                  padding: '4px 10px', 
                  fontSize: '14px',
                  borderRadius: '16px'
                }}
              >
                {feature}
              </Tag>
            ))}
          </Space>
        ) : (
          <Text type="secondary">No features specified</Text>
        )}
      </Card>

      {/* Description */}
      <Card
        title={<Text strong><FileTextOutlined /> Description</Text>}
        style={{ 
          marginBottom: '24px',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}
        headStyle={{ background: '#f9fafc', borderBottom: '1px solid #f0f0f0' }}
      >
        <Paragraph style={{ margin: 0, padding: '8px 0' }}>
          {property.description || <Text type="secondary" italic>No description available</Text>}
        </Paragraph>
      </Card>

      {/* Notes */}
      <Card
        title={<Text strong><MessageOutlined /> Notes</Text>}
        style={{ 
          marginBottom: '24px',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}
        headStyle={{ background: '#f9fafc', borderBottom: '1px solid #f0f0f0' }}
        bodyStyle={{ padding: Array.isArray(property.Notes) && property.Notes.length > 0 ? 0 : '24px' }}
      >
        {Array.isArray(property.Notes) && property.Notes.length > 0 ? (
          <List
            dataSource={property.Notes}
            renderItem={(note, index) => (
              <List.Item style={{ padding: '12px 24px' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text>{note.note}</Text>
                  <Text type="secondary" style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <CalendarOutlined style={{ color: '#1890ff' }} />
                    {note.CreationDate ? moment(note.CreationDate).format('MMMM DD, YYYY HH:mm') : 'N/A'}
                  </Text>
                </Space>
              </List.Item>
            )}
            style={{ 
              borderRadius: '0 0 12px 12px',
              overflow: 'hidden'
            }}
          />
        ) : (
          <Text type="secondary" italic>No notes available</Text>
        )}
      </Card>

      {/* Metadata */}
      <Card 
        style={{ 
          marginBottom: '16px',
          borderRadius: '12px',
          background: '#f9fafc',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}
        bordered={false}
      >
        <Row gutter={16} align="middle">
          <Col span={12}>
            <Text type="secondary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <CalendarOutlined style={{ color: '#1890ff' }} /> 
              <span>Created: {formatDate(property.CreationDate)}</span>
            </Text>
          </Col>
          <Col span={12}>
            <Text type="secondary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <CalendarOutlined style={{ color: '#1890ff' }} /> 
              <span>Updated: {formatDate(property.LastUpdateDateTime)}</span>
            </Text>
          </Col>
        </Row>
      </Card>
    </Drawer>
  );
};



export default PropertyDetail;
