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
  Tooltip,
  Dropdown
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
  ShareAltOutlined,
  PhoneOutlined,
  GlobalOutlined,
  TrophyOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { DealStatus, DealStatusLabels, DealStatusColors } from 'models/DealModel';
import dayjs from 'dayjs';

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
  onStatusUpdate,
  loading 
}) => {
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  if (!deal) return null;

  // Helper to safely format Firestore timestamps
  const formatDate = (date) => {
    if (!date) return '—';
    try {
      const dateObj = typeof date.toDate === 'function' ? date.toDate() : new Date(date);
      if (isNaN(dateObj.getTime())) return '—';
      return dayjs(dateObj).format('DD MMM YYYY, HH:mm');
    } catch (error) {
      return '—';
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    return DealStatusColors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    return DealStatusLabels[status] || status || 'Unknown';
  };

  // Get source icon
  const getSourceIcon = (source) => {
    switch (source) {
      case 'Leads':
        return <TeamOutlined />;
      case 'Contacts':
        return <ContactsOutlined />;
      case 'Freelance':
        return <UserOutlined />;
      case 'Facebook':
        return <span style={{ color: '#1877F2' }}>📘</span>;
      case 'Instagram':
        return <span style={{ color: '#E4405F' }}>📷</span>;
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Handle email action
  const handleEmail = () => {
    const email = deal.contact_email || deal.contact_data?.email || '';
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
    const phone = deal.contact_phone || deal.contact_data?.phone || '';
    if (phone) {
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
      const message = `Hi! I'm reaching out about our deal discussion. Deal Amount: ${formatCurrency(deal.Amount)}. Let me know when would be a good time to talk. Thanks!`;
      const whatsappLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappLink, '_blank');
    } else {
      message.warning('No phone number available for this deal');
    }
  };

  // Status options for dropdown
  const statusOptions = [
    { label: 'Opened', value: DealStatus.OPENED, color: 'blue' },
    { label: 'Proposal', value: DealStatus.PROPOSAL, color: 'purple' },
    { label: 'Won', value: DealStatus.WON, color: 'gold' },
    { label: 'Lost', value: DealStatus.LOST, color: 'red' }
  ];

  return (
    <Drawer
      title={
        <Space>
          <DollarOutlined style={{ color: '#1890ff' }} />
          <span>Deal Details</span>
          {deal.Status && (
            <Tag color={getStatusColor(deal.Status)}>
              {getStatusLabel(deal.Status)}
            </Tag>
          )}
        </Space>
      }
      placement="right"
      width={window.innerWidth > 768 ? 520 : '100%'}
      onClose={onClose}
      open={visible}
      extra={
        <Space>
          <Button 
            icon={<EditOutlined />} 
            onClick={() => onEdit(deal)}
            type="primary"
          >
            Edit Deal
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
      <Card style={{ marginBottom: 16, borderRadius: 12, border: '1px solid #f0f0f0' }}>
        <Row gutter={16}>
          <Col span={12}>
            <Statistic
              title="Deal Amount"
              value={formatCurrency(deal.Amount)}
              valueStyle={{ color: '#52c41a', fontSize: '22px' }}
              prefix={<DollarOutlined />}
            />
          </Col>
          <Col span={12}>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">Status</Text>
              <div style={{ marginTop: 8 }}>
                <Dropdown
                  menu={{
                    items: statusOptions.map(option => ({
                      key: option.value,
                      label: (
                        <Tag color={option.color} style={{ margin: 0 }}>
                          {option.label}
                        </Tag>
                      ),
                      onClick: () => onStatusUpdate?.(deal.id, option.value)
                    }))
                  }}
                  trigger={['click']}
                >
                  <Tag 
                    color={getStatusColor(deal.Status)} 
                    style={{ 
                      fontSize: '14px', 
                      padding: '4px 16px',
                      cursor: 'pointer',
                      borderRadius: 20
                    }}
                  >
                    {getStatusLabel(deal.Status)} <EditOutlined style={{ fontSize: 10, marginLeft: 4 }} />
                  </Tag>
                </Dropdown>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Contact Info */}
      {deal.contact_name && (
        <Card title="Contact" style={{ marginBottom: 16, borderRadius: 12, backgroundColor: '#fafafa' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar size={40} style={{ backgroundColor: '#1890ff' }}>
                {deal.contact_name[0]?.toUpperCase()}
              </Avatar>
              <div>
                <div style={{ fontWeight: 600 }}>{deal.contact_name}</div>
                {deal.contact_email && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <MailOutlined /> {deal.contact_email}
                  </Text>
                )}
                {deal.contact_phone && (
                  <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                    <PhoneOutlined /> {deal.contact_phone}
                  </Text>
                )}
                {deal.region && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <GlobalOutlined /> {deal.region}
                  </Text>
                )}
              </div>
            </div>
          </Space>
        </Card>
      )}

      {/* Deal Information */}
      <Card title="Deal Information" style={{ marginBottom: 16, borderRadius: 12 }}>
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          {/* Source */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ minWidth: '100px', color: '#8c8c8c' }}>
              {getSourceIcon(deal.Source)} Source:
            </div>
            <Tag color="blue">{deal.Source || 'Contacts'}</Tag>
          </div>

          {/* Description */}
          <div>
            <div style={{ color: '#8c8c8c', marginBottom: 4 }}>
              <FileTextOutlined /> Description:
            </div>
            <Paragraph style={{ margin: 0, backgroundColor: 'white', padding: '8px 12px', borderRadius: 6 }}>
              {deal.Description || '—'}
            </Paragraph>
          </div>

          {/* Creation Date */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ minWidth: '100px', color: '#8c8c8c' }}>
              <CalendarOutlined /> Created:
            </div>
            <Text>{formatDate(deal.CreationDate)}</Text>
          </div>

          {/* Last Updated */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ minWidth: '100px', color: '#8c8c8c' }}>
              <CalendarOutlined /> Updated:
            </div>
            <Text>{formatDate(deal.LastUpdateDate || deal.updatedAt)}</Text>
          </div>

          {/* Seller Info */}
          {deal.seller_name && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ minWidth: '100px', color: '#8c8c8c' }}>
                <UserOutlined /> Seller:
              </div>
              <Tag color="green">{deal.seller_name}</Tag>
            </div>
          )}
        </Space>
      </Card>

      {/* Quick Actions */}
      <Card title="Quick Actions" style={{ marginBottom: 16, borderRadius: 12, backgroundColor: '#f6ffed' }}>
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
      <Card title="Add Note" style={{ marginBottom: 16, borderRadius: 12 }}>
        <TextArea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Add a note about this deal..."
          rows={2}
          style={{ resize: 'none', marginBottom: 8 }}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddNote}
          loading={addingNote}
          disabled={!noteText.trim()}
          style={{ width: '100%' }}
        >
          Add Note
        </Button>
      </Card>

      {/* Notes Timeline */}
      {deal.Notes && deal.Notes.length > 0 && (
        <Card title="Notes History" style={{ borderRadius: 12 }}>
          <Timeline>
            {deal.Notes.map((note, index) => (
              <Timeline.Item 
                key={index}
                dot={<Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />}
              >
                <div>
                  <Paragraph style={{ margin: 0 }}>{note.note}</Paragraph>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {formatDate(note.CreationDate)}
                  </Text>
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        </Card>
      )}
    </Drawer>
  );
};

export default SellerDealDetail;