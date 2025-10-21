// @ts-nocheck
import React, { useState } from 'react';
import {
  Drawer,
  Typography,
  Divider,
  Space,
  Tag,
  Button,
  Input,
  Timeline,
  Row,
  Col,
  Statistic,
  Card,
  message,
  Modal,
  Avatar,
  Image,
  Carousel
} from 'antd';
import {
  EditOutlined,
  DollarOutlined,
  CalendarOutlined,
  UserOutlined,
  HomeOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  StarOutlined,
  ShareAltOutlined
} from '@ant-design/icons';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { confirm } = Modal;

/**
 * Drawer component to show detailed property information
 */
const SellerPropertyDetail = ({ 
  visible, 
  onClose, 
  property, 
  onEdit, 
  onDelete,
  onAddNote,
  loading,
  canEdit // Whether the current user can edit this property
}) => {
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  if (!property) return null;

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return 'blue';
      case 'Sold':
        return 'green';
      default:
        return 'default';
    }
  };

  // Get category color
  const getCategoryColor = (category) => {
    switch (category) {
      case 'Buy':
        return 'green';
      case 'Rent':
        return 'orange';
      case 'OffPlan':
        return 'purple';
      default:
        return 'blue';
    }
  };

  // Handle adding note
  const handleAddNote = async () => {
    if (!noteText.trim()) {
      message.warning('Please enter a note');
      return;
    }

    setAddingNote(true);
    try {
      await onAddNote(property.id, noteText.trim());
      setNoteText('');
      message.success('Note added successfully');
    } catch (error) {
      console.error('Error adding note:', error);
      message.error('Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  // Handle delete confirmation
  const handleDelete = () => {
    confirm({
      title: 'Delete Property',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete "${property.title}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => onDelete(property.id)
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  return (
    <Drawer
      title={
        <Space>
          <HomeOutlined style={{ color: '#1890ff' }} />
          <span>Property Details</span>
        </Space>
      }
      placement="right"
      width={window.innerWidth > 768 ? 600 : '100%'}
      onClose={onClose}
      open={visible}
      extra={
        canEdit && (
          <Space>
            <Button 
              icon={<EditOutlined />} 
              onClick={() => onEdit(property)}
              type="primary"
              ghost
            >
              Edit
            </Button>
            <Button 
              icon={<ExclamationCircleOutlined />} 
              onClick={handleDelete}
              danger
            >
              Delete
            </Button>
          </Space>
        )
      }
    >
      {/* Property Images Carousel */}
      {property.Images && property.Images.length > 0 && (
        <Card className="mb-4" style={{ border: '1px solid #f0f0f0' }}>
          <Carousel autoplay dots={{ position: 'bottom' }}>
            {property.Images.map((imageUrl, index) => (
              <div key={index}>
                <Image
                  width="100%"
                  height={250}
                  src={imageUrl}
                  style={{ objectFit: 'cover', borderRadius: '8px' }}
                  preview={{
                    mask: (
                      <div style={{ 
                        background: 'rgba(0,0,0,0.5)', 
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%'
                      }}>
                        <EyeOutlined style={{ fontSize: '24px' }} />
                      </div>
                    )
                  }}
                />
              </div>
            ))}
          </Carousel>
        </Card>
      )}

      {/* Property Header */}
      <Card className="mb-4" style={{ border: '1px solid #f0f0f0' }}>
        <Row gutter={16}>
          <Col span={16}>
            <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
              {property.title}
            </Title>
            <Space style={{ marginTop: '8px' }}>
              <Tag color={getCategoryColor(property.Category)} style={{ fontSize: '12px' }}>
                {property.Category}
              </Tag>
              <Tag color={getStatusColor(property.Status)} style={{ fontSize: '12px' }}>
                {property.Status}
              </Tag>
            </Space>
          </Col>
          <Col span={8} style={{ textAlign: 'right' }}>
            <Statistic
              title="Price"
              value={formatCurrency(property.SellPrice)}
              valueStyle={{ color: '#52c41a', fontSize: '20px' }}
              prefix={<DollarOutlined />}
            />
          </Col>
        </Row>
      </Card>

      {/* Property Information */}
      <Card title="Property Information" className="mb-4" style={{ backgroundColor: '#fafafa' }}>
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <div style={{ textAlign: 'center' }}>
              <HomeOutlined style={{ fontSize: '24px', color: '#1890ff', marginBottom: '8px' }} />
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{property.Type}</div>
              <div style={{ fontSize: '12px', color: '#8c8c8c' }}>Property Type</div>
            </div>
          </Col>
          
          <Col span={12}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '24px', marginBottom: '8px', display: 'block' }}>🛏️</span>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{property.NbrBedRooms}</div>
              <div style={{ fontSize: '12px', color: '#8c8c8c' }}>Bedrooms</div>
            </div>
          </Col>
          
          <Col span={12}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '24px', marginBottom: '8px', display: 'block' }}>🚿</span>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{property.NbrBathRooms}</div>
              <div style={{ fontSize: '12px', color: '#8c8c8c' }}>Bathrooms</div>
            </div>
          </Col>
          
          <Col span={12}>
            <div style={{ textAlign: 'center' }}>
              <EnvironmentOutlined style={{ fontSize: '24px', color: '#52c41a', marginBottom: '8px' }} />
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>📍</div>
              <div style={{ fontSize: '12px', color: '#8c8c8c' }}>Location</div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Location Details */}
      <Card title="Location Details" className="mb-4" style={{ backgroundColor: '#f6ffed' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ minWidth: '80px', color: '#8c8c8c' }}>
              <EnvironmentOutlined /> Location:
            </div>
            <Text strong>{property.Location}</Text>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ minWidth: '80px', color: '#8c8c8c' }}>
              🏠 Address:
            </div>
            <Text>{property.address}</Text>
          </div>
          
          {property.Source && (
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ minWidth: '80px', color: '#8c8c8c' }}>
                📋 Source:
              </div>
              <Text>{property.Source}</Text>
            </div>
          )}
        </Space>
      </Card>

      {/* Features */}
      {property.Features && property.Features.length > 0 && (
        <Card title="Features" className="mb-4" style={{ backgroundColor: '#fff7e6' }}>
          <Space wrap>
            {property.Features.map((feature, index) => (
              <Tag key={index} icon={<StarOutlined />} color="orange">
                {feature}
              </Tag>
            ))}
          </Space>
        </Card>
      )}

      {/* Property Dates */}
      <Card title="Property Information" className="mb-4">
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ minWidth: '100px', color: '#8c8c8c' }}>
              <CalendarOutlined /> Created:
            </div>
            <Text>{moment(property.CreationDate).format('DD MMM YYYY, HH:mm')}</Text>
          </div>

          {property.LastUpdateDateTime && (
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ minWidth: '100px', color: '#8c8c8c' }}>
                <CalendarOutlined /> Updated:
              </div>
              <Text>{moment(property.LastUpdateDateTime).format('DD MMM YYYY, HH:mm')}</Text>
            </div>
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ minWidth: '100px', color: '#8c8c8c' }}>
              <UserOutlined /> Creator:
            </div>
            <Text>ID: {property.creator_id}</Text>
          </div>
        </Space>
      </Card>

      {/* Add Note Section */}
      <Card title="Add Note" className="mb-4">
        <Space.Compact style={{ width: '100%' }}>
          <TextArea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a note about this property..."
            rows={2}
            style={{ resize: 'none' }}
          />
        </Space.Compact>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddNote}
          loading={addingNote}
          disabled={!noteText.trim()}
          style={{ marginTop: '8px', width: '100%' }}
        >
          Add Note
        </Button>
      </Card>

      {/* Notes Timeline */}
      {property.Notes && property.Notes.length > 0 && (
        <Card title="Notes History" style={{ backgroundColor: '#f0f0f0' }}>
          <Timeline
            items={property.Notes.map((note, index) => ({
              key: index,
              dot: <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />,
              children: (
                <div>
                  <Text>{note.note}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {moment(note.CreationDate).format('DD MMM YYYY, HH:mm')}
                  </Text>
                </div>
              )
            }))}
          />
        </Card>
      )}
    </Drawer>
  );
};

export default SellerPropertyDetail;
