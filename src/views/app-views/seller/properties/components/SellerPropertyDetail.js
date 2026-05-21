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
  NumberOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { confirm } = Modal;

const SellerPropertyDetail = ({ 
  visible, 
  onClose, 
  property, 
  onEdit, 
  onDelete,
  onAddNote,
  loading,
  canEdit 
}) => {
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  if (!property) return null;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'sold': return 'green';
      case 'rented': return 'purple';
      case 'available': return 'blue';
      case 'vacant': return 'cyan';
      default: return 'default';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Buy': return 'green';
      case 'Rent': return 'orange';
      case 'OffPlan': return 'purple';
      default: return 'blue';
    }
  };

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
      message.error('Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const handleDelete = () => {
    confirm({
      title: 'Delete Property',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete "${property.title}"?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: () => onDelete(property.id)
    });
  };

  const hasImages = Array.isArray(property.Images) && property.Images.length > 0;

  return (
    <Drawer
      title={<Space><HomeOutlined style={{ color: '#1890ff' }} /> Property Details</Space>}
      placement="right"
      width={window.innerWidth > 768 ? 680 : '100%'}
      onClose={onClose}
      open={visible}
      extra={
        canEdit && (
          <Space>
            <Button icon={<EditOutlined />} onClick={() => onEdit(property)} type="primary" ghost>
              Edit
            </Button>
            <Button danger onClick={handleDelete}>
              Delete
            </Button>
          </Space>
        )
      }
    >
      {/* Images Carousel */}
      {hasImages && (
        <Card style={{ marginBottom: 20 }}>
          <Carousel autoplay dots>
            {property.Images.map((url, index) => (
              <div key={index}>
                <Image
                  width="100%"
                  height={280}
                  src={url}
                  style={{ objectFit: 'cover', borderRadius: 8 }}
                  preview={{ mask: <EyeOutlined style={{ fontSize: 24 }} /> }}
                />
              </div>
            ))}
          </Carousel>
        </Card>
      )}

      {/* Header */}
      <Card style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>{property.title}</Title>
        <Space style={{ marginTop: 12 }} wrap>
          <Tag color={getCategoryColor(property.Category)}>{property.Category}</Tag>
          <Tag color={getStatusColor(property.Status)}>{property.Status}</Tag>
          <Tag color="purple">{property.Type}</Tag>
        </Space>
      </Card>

      {/* Price */}
      <Card style={{ marginBottom: 20 }}>
        <Statistic
          title={property.Category === 'Rent' ? "Monthly Rent" : "Selling Price"}
          value={formatCurrency(property.SellPrice)}
          valueStyle={{ color: '#52c41a', fontSize: 28 }}
          prefix={<DollarOutlined />}
        />
        {property.Category === 'Rent' && property.Cheques && (
          <Space style={{ marginTop: 12 }}>
            <NumberOutlined />
            <Text strong>{property.Cheques} Cheques</Text>
          </Space>
        )}
      </Card>

      {/* Location & Unit Details */}
      <Card title="📍 Location & Unit Details" style={{ marginBottom: 20 }}>
        <Row gutter={[16, 12]}>
          <Col span={24}>
            <Text type="secondary">City / Area</Text><br />
            <Text strong>{property.Location}</Text>
          </Col>
          <Col xs={12}>
            <Text type="secondary">Building</Text><br />
            <Text strong>{property.BuildingName || '-'}</Text>
          </Col>
          <Col xs={12}>
            <Text type="secondary">Unit Number</Text><br />
            <Text strong>{property.UnitNumber || '-'}</Text>
          </Col>
          <Col xs={12}>
            <Text type="secondary">Floor</Text><br />
            <Text strong>{property.FloorNumber || '-'}</Text>
          </Col>
          <Col xs={12}>
            <Text type="secondary">Area</Text><br />
            <Text strong>{property.Area ? `${property.Area} Sq Ft` : '-'}</Text>
          </Col>
        </Row>
      </Card>

      {/* Property Details */}
      <Card title="Property Details" style={{ marginBottom: 20 }}>
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Text type="secondary">Type</Text><br />
            <Text strong>{property.Type}</Text>
          </Col>
          <Col span={12}>
            <Text type="secondary">Bedrooms</Text><br />
            <Text strong>{property.NbrBedRooms}</Text>
          </Col>
          <Col span={12}>
            <Text type="secondary">Bathrooms</Text><br />
            <Text strong>{property.NbrBathRooms}</Text>
          </Col>
          <Col span={12}>
            <Text type="secondary">Source</Text><br />
            <Text strong>{property.Source || 'Not specified'}</Text>
          </Col>
        </Row>
      </Card>

      {/* Features */}
      {Array.isArray(property.Features) && property.Features.length > 0 && (
        <Card title="Features" style={{ marginBottom: 20 }}>
          <Space wrap>
            {property.Features.map((feature, i) => (
              <Tag key={i} color="blue" icon={<StarOutlined />}>
                {feature}
              </Tag>
            ))}
          </Space>
        </Card>
      )}

      {/* Description */}
      <Card title="Description" style={{ marginBottom: 20 }}>
        <Paragraph style={{ whiteSpace: 'pre-line' }}>
          {property.description || <Text type="secondary">No description provided.</Text>}
        </Paragraph>
      </Card>

      {/* Add Note */}
      <Card title="Add Note" style={{ marginBottom: 20 }}>
        <TextArea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Write a note about this property..."
          rows={3}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddNote}
          loading={addingNote}
          disabled={!noteText.trim()}
          style={{ marginTop: 12, width: '100%' }}
        >
          Add Note
        </Button>
      </Card>

      {/* Notes History */}
      {Array.isArray(property.Notes) && property.Notes.length > 0 && (
        <Card title="Notes History">
          <Timeline
            items={property.Notes.map((note, index) => ({
              dot: <UserOutlined />,
              children: (
                <>
                  <Text>{note.note}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {dayjs(note.CreationDate).format('DD MMM YYYY • HH:mm')}
                  </Text>
                </>
              )
            }))}
          />
        </Card>
      )}
    </Drawer>
  );
};

export default SellerPropertyDetail;