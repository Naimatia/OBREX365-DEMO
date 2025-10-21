import React from 'react';
import { 
  Card, 
  Badge, 
  Typography, 
  Tag, 
  Space, 
  Row, 
  Col, 
  Tooltip, 
  Image, 
  Divider,
  Button
} from 'antd';
import { 
  HomeOutlined, 
  DollarOutlined, 
  BankOutlined, 
  EnvironmentOutlined, 
  InfoCircleOutlined, 
  CalendarOutlined, 
  AppstoreOutlined,
  TagOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined
} from '@ant-design/icons';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { Meta } = Card;

/**
 * PropertyCard component for displaying property in card format
 */
const PropertyCard = ({ property, onClick, onEdit, onDelete, currentUser }) => {
  // Check if current user is the creator or has permission
  const canManageProperty = property.creator_id === currentUser?.uid || 
                          currentUser?.Role === 'CEO' || 
                          currentUser?.Role === 'HR';
  // Format price with commas
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      maximumFractionDigits: 0,
    }).format(price);
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

  // Get placeholder image if no images
  const coverImage = property.Images && property.Images.length > 0 
    ? property.Images[0] 
    : 'https://res.cloudinary.com/dop2pji6u/image/upload/v1708523400/properties/property-placeholder_gmcvxd.jpg';

  // Format creation date
  const formattedDate = property.CreationDate 
    ? moment(property.CreationDate).format('MMM DD, YYYY') 
    : 'N/A';

  return (
    <Card
      hoverable
      className="property-card"
      style={{ 
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        margin: '10px 0',
        height: '100%', /* Ensure all cards have the same height */
        display: 'flex',
        flexDirection: 'column'
      }}
      cover={
        <div className="property-image-container" style={{ position: 'relative', height: '240px', overflow: 'hidden' }}>
          <Image 
            alt={property.title}
            src={coverImage}
            style={{
              height: '240px',
              width: '100%',
              objectFit: 'cover',
              background: '#f0f2f5'
            }}            
            preview={false} 
            fallback="https://res.cloudinary.com/dop2pji6u/image/upload/v1708523400/properties/property-placeholder_gmcvxd.jpg"
          />
          <div style={{ 
            position: 'absolute',
            top: '10px',
            right: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px'
          }}>
            <Badge.Ribbon 
              text={property.Status} 
              color={getStatusColor(property.Status)}
            />
          </div>
          <div style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            width: '100%',
            background: 'linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0.7))',
            padding: '30px 15px 10px 15px'
          }}>
            <Tag 
              style={{
                backgroundColor: getCategoryColor(property.Category),
                color: '#fff',
                border: 'none',
                fontWeight: '600',
                fontSize: '11px',
                padding: '4px 8px',
                borderRadius: '6px',
                marginRight: '8px'
              }} 
              icon={<TagOutlined style={{ color: '#fff' }} />}
            >
              {property.Category}
            </Tag>
            <Tag 
              style={{
                backgroundColor: getTypeColor(property.Type),
                color: '#fff',
                border: 'none',
                fontWeight: '600',
                fontSize: '11px',
                padding: '4px 8px',
                borderRadius: '6px'
              }} 
              icon={<HomeOutlined style={{ color: '#fff' }} />}
            >
              {property.Type}
            </Tag>
          </div>
        </div>
      }
      onClick={() => onClick(property)}
      bodyStyle={{ padding: '20px', minHeight: '280px', background: '#f9fafb', display: 'flex', flexDirection: 'column' }}
    >
      <Title level={5} ellipsis={{ tooltip: true }} style={{ marginBottom: '12px', marginTop: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1a3353' }}>
        {property.title}
      </Title>
      
      <Space direction="horizontal" style={{ marginBottom: '12px' }}>
        <EnvironmentOutlined style={{ color: '#1890ff' }} /> 
        <Text type="secondary" ellipsis={{ tooltip: true }} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {property.Location}, {property.address}
        </Text>
      </Space>

      {/* Enhanced Price Display Section */}
      <div style={{ 
        background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
        border: '1px solid #e8e8e8',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}>
        <Row gutter={[16, 12]}>
          {/* Original Price */}
          <Col span={24}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#ff7875'
                }} />
                <Text type="secondary" style={{ fontSize: '11px', fontWeight: '500' }}>ORIGINAL PRICE</Text>
              </div>
              <Text style={{ 
                fontSize: '13px', 
                color: '#ff7875',
                fontWeight: '600',
                textDecoration: 'line-through'
              }}>
                {formatPrice(property.OriginalPrice)}
              </Text>
            </div>
          </Col>
          
          {/* Sell/Rent Price */}
          <Col span={24}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#faad14'
                }} />
                <Text type="secondary" style={{ fontSize: '11px', fontWeight: '500' }}>SELLING PRICE</Text>
              </div>
              <Text style={{ 
                fontSize: '16px', 
                color: '#faad14',
                fontWeight: 'bold'
              }}>
                {formatPrice(property.SellPrice)}
              </Text>
            </div>
          </Col>
          
          {/* Gain/Loss Amount */}
          <Col span={24}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '8px 12px',
              borderRadius: '8px',
              backgroundColor: property.SellPrice > property.OriginalPrice ? 'rgba(82, 196, 26, 0.1)' : 'rgba(245, 34, 45, 0.1)',
              border: `1px solid ${property.SellPrice > property.OriginalPrice ? 'rgba(82, 196, 26, 0.2)' : 'rgba(245, 34, 45, 0.2)'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: property.SellPrice > property.OriginalPrice ? '#52c41a' : '#f5222d'
                }} />
                <Text type="secondary" style={{ fontSize: '11px', fontWeight: '500' }}>
                  {property.SellPrice > property.OriginalPrice ? 'PROFIT' : 'LOSS'}
                </Text>
              </div>
              <Text style={{ 
                fontSize: '14px', 
                fontWeight: 'bold',
                color: property.SellPrice > property.OriginalPrice ? '#52c41a' : '#f5222d'
              }}>
                {property.SellPrice > property.OriginalPrice ? '+' : ''}
                {formatPrice(property.SellPrice - property.OriginalPrice)}
              </Text>
            </div>
          </Col>
        </Row>
      </div>

      <Divider style={{ margin: '10px 0', background: '#e8e8e8' }} />
      
      {/* Action buttons */}
      {canManageProperty && (
        <Row gutter={[8, 0]} style={{ marginBottom: '10px' }}>
          <Col span={24} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button 
              type="primary" 
              size="small" 
              icon={<EyeOutlined />} 
              onClick={(e) => {
                e.stopPropagation();
                onClick(property);
              }}
            >
              View
            </Button>
            <Space>
              <Button 
                type="default" 
                size="small" 
                icon={<EditOutlined />} 
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(property);
                }}
              >
                Edit
              </Button>
              <Button 
                danger 
                size="small" 
                icon={<DeleteOutlined />} 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(property.id);
                }}
              >
                Delete
              </Button>
            </Space>
          </Col>
        </Row>
      )}
      
      <Row gutter={[16, 8]} style={{ background: '#f0f7ff', padding: '10px 0', borderRadius: '8px', marginTop: 'auto' }}>
        <Col span={8}>
          <Tooltip title="Bedrooms">
            <div style={{ textAlign: 'center' }}>
              <AppstoreOutlined style={{ fontSize: '18px', color: '#1890ff' }} />
              <div style={{ fontSize: '14px', fontWeight: '500', marginTop: '4px' }}>{property.NbrBedRooms || 0}</div>
            </div>
          </Tooltip>
        </Col>
        <Col span={8}>
          <Tooltip title="Bathrooms">
            <div style={{ textAlign: 'center' }}>
              <BankOutlined style={{ fontSize: '18px', color: '#1890ff' }} />
              <div style={{ fontSize: '14px', fontWeight: '500', marginTop: '4px' }}>{property.NbrBathRooms || 0}</div>
            </div>
          </Tooltip>
        </Col>
        <Col span={8}>
          <Tooltip title="Added Date">
            <div style={{ textAlign: 'center' }}>
              <CalendarOutlined style={{ fontSize: '18px', color: '#1890ff' }} />
              <div style={{ fontSize: '12px', fontWeight: '500', marginTop: '4px' }}>{formattedDate}</div>
            </div>
          </Tooltip>
        </Col>
      </Row>

      <Divider style={{ margin: '12px 0' }} />

      <Paragraph ellipsis={{ rows: 2, tooltip: true }} style={{ fontSize: '12px' }}>
        {property.description}
      </Paragraph>
    </Card>
  );
};

export default PropertyCard;
