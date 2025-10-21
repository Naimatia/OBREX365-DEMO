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
  Avatar
} from 'antd';
import {
  EditOutlined,
  DollarOutlined,
  CalendarOutlined,
  UserOutlined,
  HomeOutlined,
  MailOutlined,
  WhatsAppOutlined,
  PlusOutlined,
  ExclamationCircleOutlined,
  ContactsOutlined,
  TeamOutlined,
  FileTextOutlined,
  StarOutlined,
  ShareAltOutlined
} from '@ant-design/icons';
import { DealStatus, DealSource } from 'models/DealModel';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { confirm } = Modal;

/**
 * Drawer component to show detailed deal information
 */
const SellerDealDetail = ({ 
  visible, 
  onClose, 
  deal, 
  onEdit, 
  onDelete,
  onAddNote,
  loading 
}) => {
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  if (!deal) return null;

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case DealStatus.OPENED:
        return 'blue';
      case DealStatus.GAIN:
        return 'green';
      case DealStatus.LOSS:
        return 'red';
      default:
        return 'default';
    }
  };

  // Get source icon
  const getSourceIcon = (source) => {
    switch (source) {
      case DealSource.LEADS:
        return <TeamOutlined />;
      case DealSource.CONTACTS:
        return <ContactsOutlined />;
      case DealSource.FREELANCE:
        return <UserOutlined />;
      default:
        return <FileTextOutlined />;
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
      await onAddNote(deal.id, noteText.trim());
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
      title: 'Delete Deal',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete this deal? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => onDelete(deal.id)
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  // Handle email action
  const handleEmail = () => {
    const email = deal.contact_email || deal.lead_email || '';
    if (email) {
      const subject = `Regarding Deal: ${deal.Description?.substring(0, 50)}...`;
      const body = `Dear Client,\n\nI hope this email finds you well. I am reaching out regarding our deal discussion.\n\nDeal Amount: ${formatCurrency(deal.Amount)}\nStatus: ${deal.Status}\n\nPlease let me know if you have any questions or would like to schedule a meeting.\n\nBest regards`;
      
      const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoLink, '_blank');
    } else {
      message.warning('No email address available for this deal');
    }
  };

  // Handle WhatsApp action
  const handleWhatsApp = () => {
    const phone = deal.contact_phone || deal.lead_phone || '';
    if (phone) {
      const message = `Hi! I'm reaching out about our deal discussion. Deal Amount: ${formatCurrency(deal.Amount)}. Let me know when would be a good time to talk. Thanks!`;
      const whatsappLink = `https://wa.me/${phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(whatsappLink, '_blank');
    } else {
      message.warning('No phone number available for this deal');
    }
  };

  return (
    <Drawer
      title={
        <Space>
          <DollarOutlined style={{ color: '#1890ff' }} />
          <span>Deal Details</span>
        </Space>
      }
      placement="right"
      width={window.innerWidth > 768 ? 500 : '100%'}
      onClose={onClose}
      visible={visible}
      extra={
        <Space>
          <Button 
            icon={<EditOutlined />} 
            onClick={() => onEdit(deal)}
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
      }
    >
      {/* Deal Header */}
      <Card className="mb-4" style={{ border: '1px solid #f0f0f0' }}>
        <Row gutter={16}>
          <Col span={12}>
            <Statistic
              title="Deal Amount"
              value={formatCurrency(deal.Amount)}
              valueStyle={{ color: '#52c41a', fontSize: '24px' }}
              prefix={<DollarOutlined />}
            />
          </Col>
          <Col span={12}>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">Status</Text>
              <div style={{ marginTop: '8px' }}>
                <Tag color={getStatusColor(deal.Status)} style={{ fontSize: '14px', padding: '4px 12px' }}>
                  {deal.Status}
                </Tag>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Deal Information */}
      <Card title="Deal Information" className="mb-4" style={{ backgroundColor: '#fafafa' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          {/* Source */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ minWidth: '120px', color: '#8c8c8c' }}>
              {getSourceIcon(deal.Source)} Source:
            </div>
            <Tag color="blue">{deal.Source}</Tag>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ color: '#8c8c8c', marginBottom: '4px' }}>
              <FileTextOutlined /> Description:
            </div>
            <Paragraph style={{ margin: 0, backgroundColor: 'white', padding: '8px', borderRadius: '4px' }}>
              {deal.Description}
            </Paragraph>
          </div>

          {/* Creation Date */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ minWidth: '120px', color: '#8c8c8c' }}>
              <CalendarOutlined /> Created:
            </div>
            <Text>{moment(deal.CreationDate).format('DD MMM YYYY, HH:mm')}</Text>
          </div>

          {/* Last Updated */}
          {deal.LastUpdateDate && (
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ minWidth: '120px', color: '#8c8c8c' }}>
                <CalendarOutlined /> Updated:
              </div>
              <Text>{moment(deal.LastUpdateDate).format('DD MMM YYYY, HH:mm')}</Text>
            </div>
          )}

          {/* Property Info */}
          {deal.property_id && (
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ minWidth: '120px', color: '#8c8c8c' }}>
                <HomeOutlined /> Property:
              </div>
              <Text>Property ID: {deal.property_id}</Text>
            </div>
          )}
        </Space>
      </Card>

      {/* Communication Actions */}
      <Card title="Quick Actions" className="mb-4" style={{ backgroundColor: '#f6ffed' }}>
        <Row gutter={8}>
          <Col span={12}>
            <Button 
              block 
              icon={<MailOutlined />}
              onClick={handleEmail}
              style={{ backgroundColor: '#1890ff', borderColor: '#1890ff', color: 'white' }}
            >
              Send Email
            </Button>
          </Col>
          <Col span={12}>
            <Button 
              block 
              icon={<WhatsAppOutlined />}
              onClick={handleWhatsApp}
              style={{ backgroundColor: '#25d366', borderColor: '#25d366', color: 'white' }}
            >
              WhatsApp
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Add Note Section */}
      <Card title="Add Note" className="mb-4">
        <Space.Compact style={{ width: '100%' }}>
          <TextArea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a note about this deal..."
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
      {deal.Notes && deal.Notes.length > 0 && (
        <Card title="Notes History" style={{ backgroundColor: '#fff7e6' }}>
          <Timeline
            items={deal.Notes.map((note, index) => ({
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

export default SellerDealDetail;
