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
  Button,
  Checkbox
} from 'antd';
import { 
  HomeOutlined, 
  DollarOutlined, 
  BankOutlined, 
  EnvironmentOutlined, 
  CalendarOutlined, 
  AppstoreOutlined,
  TagOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  WhatsAppOutlined
} from '@ant-design/icons';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;

/**
 * PropertyCard component with Checkbox support for multi-select
 */
const PropertyCard = ({ 
  property, 
  onClick, 
  onEdit, 
  onDelete, 
  currentUser,
  isMultiSelectMode = false,
  isSelected = false,
  onSelect,
  onShareWhatsApp
}) => {
  
  const canManageProperty = property.creator_id === currentUser?.uid || 
                           currentUser?.Role === 'CEO' || 
                           currentUser?.Role === 'HR';

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'sold': return '#f5222d';
      case 'rented': return '#722ed1';
      case 'pending': return '#fa8c16';
      case 'available':
      default: return '#52c41a';
    }
  };

  const getTypeColor = (type) => {
    if (!type) return '#595959';
    switch (type.toLowerCase()) {
      case 'studio': return '#722ed1';
      case 'apartment': return '#fa541c';
      case 'villa': return '#52c41a';
      case 'townhouse': return '#1890ff';
      case 'penthouse': return '#eb2f96';
      case 'duplex': return '#13c2c2';
      case 'office': return '#2f54eb';
      case 'retail': return '#fadb14';
      case 'commercial': return '#d48806';
      case 'land': return '#8c8c8c';
      default: return '#595959';
    }
  };

  const coverImage = property.Images && property.Images.length > 0 
    ? property.Images[0] 
    : 'https://res.cloudinary.com/dop2pji6u/image/upload/v1708523400/properties/property-placeholder_gmcvxd.jpg';

  const formattedDate = property.CreationDate 
    ? moment(property.CreationDate).format('MMM DD, YYYY') 
    : 'N/A';

  // Handle checkbox change
  const handleCheckboxChange = (e) => {
    e.stopPropagation();
    if (onSelect) onSelect(property);
  };

  // Handle card click (only when not in multi-select mode)
  const handleCardClick = () => {
    if (isMultiSelectMode) return; // Prevent opening detail when selecting
    if (onClick) onClick(property);
  };

  return (
    <Card
      hoverable={!isMultiSelectMode}
      className="property-card"
      style={{ 
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
      cover={
        <div className="property-image-container" style={{ position: 'relative', height: '240px', overflow: 'hidden' }}>
          <Image 
            alt={property.title}
            src={coverImage}
            style={{ height: '240px', width: '100%', objectFit: 'cover' }}
            preview={false}
            fallback="https://res.cloudinary.com/dop2pji6u/image/upload/v1708523400/properties/property-placeholder_gmcvxd.jpg"
          />

          {/* Status Ribbon */}
          <Badge.Ribbon 
            text={property.Status} 
            color={getStatusColor(property.Status)}
            style={{ top: '10px', right: '-2px' }}
          />

          {/* Multi-Select Checkbox */}
          {isMultiSelectMode && (
            <div style={{ 
              position: 'absolute', 
              top: '12px', 
              left: '12px',
              zIndex: 10 
            }}>
              <Checkbox 
                checked={isSelected}
                onChange={handleCheckboxChange}
                style={{ 
                  background: 'white', 
                  borderRadius: '4px',
                  padding: '4px'
                }}
              />
            </div>
          )}

          {/* Type & Category Tags */}
          <div style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            width: '100%',
            background: 'linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0.75))',
            padding: '30px 15px 12px 15px'
          }}>
            <Tag 
              style={{ backgroundColor: '#1890ff', color: '#fff', border: 'none', fontWeight: '600' }}
            >
              {property.Category}
            </Tag>
            <Tag 
              style={{ 
                backgroundColor: getTypeColor(property.Type), 
                color: '#fff', 
                border: 'none', 
                fontWeight: '600',
                marginLeft: '6px'
              }}
            >
              {property.Type}
            </Tag>
          </div>
        </div>
      }
      onClick={handleCardClick}
      bodyStyle={{ 
        padding: '20px', 
        minHeight: '280px', 
        background: '#f9fafb', 
        display: 'flex', 
        flexDirection: 'column',
        flex: 1
      }}
    >
      <Title level={5} ellipsis={{ tooltip: true }} style={{ marginBottom: '12px', color: '#1a3353' }}>
        {property.title}
      </Title>

      <Space style={{ marginBottom: '16px' }}>
        <EnvironmentOutlined style={{ color: '#1890ff' }} /> 
        <Text type="secondary" ellipsis>
          {property.Location || property.address}
        </Text>
      </Space>

      {/* Price Section */}
      <div style={{ 
        background: '#fff', 
        borderRadius: '12px', 
        padding: '14px', 
        marginBottom: '16px',
        border: '1px solid #e8e8e8'
      }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#faad14' }}>
          {formatPrice(property.SellPrice)}
        </div>
        {property.OriginalPrice && (
          <div style={{ textDecoration: 'line-through', color: '#ff7875', fontSize: '13px' }}>
            {formatPrice(property.OriginalPrice)}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {canManageProperty && !isMultiSelectMode && (
        <Row gutter={[8, 8]} style={{ marginBottom: '12px' }}>
          <Col span={24}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Button 
                type="primary" 
                size="small" 
                icon={<EyeOutlined />} 
                onClick={(e) => { e.stopPropagation(); onClick(property); }}
              >
                View
              </Button>
              <Space>
                <Button 
                  size="small" 
                  icon={<EditOutlined />} 
                  onClick={(e) => { e.stopPropagation(); onEdit(property); }}
                >
                  Edit
                </Button>
                <Button 
                  danger 
                  size="small" 
                  icon={<DeleteOutlined />} 
                  onClick={(e) => { e.stopPropagation(); onDelete(property.id); }}
                >
                  Delete
                </Button>
              </Space>
            </Space>
          </Col>
        </Row>
      )}

      {/* Bottom Info */}
      <Row gutter={[16, 8]} style={{ marginTop: 'auto' }}>
        <Col span={8}>
          <Tooltip title="Bedrooms">
            <div style={{ textAlign: 'center' }}>
              <AppstoreOutlined style={{ fontSize: '18px', color: '#1890ff' }} />
              <div style={{ fontSize: '14px', fontWeight: '500' }}>{property.NbrBedRooms || 0}</div>
            </div>
          </Tooltip>
        </Col>
        <Col span={8}>
          <Tooltip title="Bathrooms">
            <div style={{ textAlign: 'center' }}>
              <BankOutlined style={{ fontSize: '18px', color: '#1890ff' }} />
              <div style={{ fontSize: '14px', fontWeight: '500' }}>{property.NbrBathRooms || 0}</div>
            </div>
          </Tooltip>
        </Col>
        <Col span={8}>
          <Tooltip title="Added Date">
            <div style={{ textAlign: 'center' }}>
              <CalendarOutlined style={{ fontSize: '18px', color: '#1890ff' }} />
              <div style={{ fontSize: '12px' }}>{formattedDate}</div>
            </div>
          </Tooltip>
        </Col>
      </Row>

      {onShareWhatsApp && !isMultiSelectMode && (
        <Button 
          type="link" 
          icon={<WhatsAppOutlined />} 
          onClick={(e) => { 
            e.stopPropagation(); 
            onShareWhatsApp(property); 
          }}
          style={{ marginTop: '12px' }}
        >
          Share on WhatsApp
        </Button>
      )}
    </Card>
  );
};

export default PropertyCard;