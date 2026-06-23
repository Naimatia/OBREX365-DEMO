// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  Drawer, Typography, Row, Col, Descriptions, Button, Space, 
  Tag, Divider, Spin, Card, Tooltip, Empty, Avatar, Dropdown,Modal
} from 'antd';
import {
  UserOutlined, PhoneOutlined, MailOutlined, HomeOutlined,
  DollarOutlined, TagOutlined, CalendarOutlined, LinkOutlined,
  EditOutlined, DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined,
  UserSwitchOutlined, GlobalOutlined, TeamOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { DealStatus, DealStatusLabels, DealStatusColors, DealSourceEnum } from 'models/DealModel';

const { Title, Text } = Typography;

// Status options
const statusOptions = [
  { value: DealStatus.OPENED, label: 'Opened', color: 'blue' },
  { value: DealStatus.PROPOSAL, label: 'Proposal', color: 'purple' },
  { value: DealStatus.WON, label: 'Won', color: 'gold' },
  { value: DealStatus.LOST, label: 'Lost', color: 'red' }
];

const DealDetails = ({ 
  visible, 
  deal, 
  onClose, 
  onEdit, 
  onDelete, 
  onStatusChange,
  onRefresh 
}) => {
  const [loading, setLoading] = useState(false);

  if (!deal) return null;

  // Format date helper
  const formatDate = (date) => {
    if (!date) return '—';
    try {
      const d = date.toDate?.() || new Date(date);
      if (isNaN(d.getTime())) return '—';
      return dayjs(d).format('DD MMM YYYY, HH:mm');
    } catch {
      return '—';
    }
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

  // Render status tag
  const renderStatus = (status) => {
    const config = statusOptions.find(s => s.value === status);
    const color = DealStatusColors[status] || config?.color || 'default';
    const label = DealStatusLabels[status] || config?.label || status || 'Unknown';
    
    return (
      <Tag color={color} style={{ borderRadius: 16, padding: '2px 14px', fontSize: 14 }}>
        {label}
      </Tag>
    );
  };

  // Render source
  const renderSource = (source) => {
    const sources = {
      [DealSourceEnum.LEADS]: { icon: '🧲', color: '#1890ff' },
      [DealSourceEnum.CONTACTS]: { icon: '👥', color: '#52c41a' },
      [DealSourceEnum.FACEBOOK]: { icon: '📘', color: '#1877F2' },
      [DealSourceEnum.INSTAGRAM]: { icon: '📷', color: '#E4405F' },
      [DealSourceEnum.WEBSITE]: { icon: '🌐', color: '#52c41a' },
      [DealSourceEnum.LINKEDIN]: { icon: '💼', color: '#0A66C2' },
      [DealSourceEnum.TIKTOK]: { icon: '🎵', color: '#ff0050' },
      [DealSourceEnum.FREELANCE]: { icon: '💪', color: '#fa8c16' }
    };
    
    const src = sources[source];
    return src ? (
      <Tag color={src.color}>{src.icon} {source}</Tag>
    ) : (
      <Tag>{source || 'Other'}</Tag>
    );
  };

  // Handle status change
  const handleStatusChange = (newStatus) => {
    onStatusChange(deal.id, newStatus);
  };

  return (
    <Drawer
      title={
        <Space>
          <DollarOutlined style={{ color: '#1890ff' }} />
          <span>Deal Details</span>
          {deal.Status && renderStatus(deal.Status)}
        </Space>
      }
      placement="right"
      onClose={onClose}
      open={visible}
      width={520}
      extra={
        <Space>
          <Button 
            icon={<EditOutlined />} 
            onClick={() => onEdit(deal)}
          >
            Edit
          </Button>
          <Button 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => {
              Modal.confirm({
                title: 'Delete Deal',
                content: 'Are you sure you want to delete this deal?',
                onOk: () => onDelete(deal.id)
              });
            }}
          >
            Delete
          </Button>
        </Space>
      }
    >
      <Spin spinning={loading}>
        {/* Deal Header */}
        <Card style={{ marginBottom: 16, borderRadius: 10 }}>
          <Row gutter={16}>
            <Col span={12}>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>Amount</Text>
                <div style={{ fontSize: 22, fontWeight: 600, color: '#52c41a' }}>
                  <DollarOutlined /> {formatCurrency(deal.Amount)}
                </div>
              </div>
            </Col>
            <Col span={12}>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>Status</Text>
                <div style={{ marginTop: 4 }}>
                  <Dropdown
                    menu={{
                      items: statusOptions.map(opt => ({
                        key: opt.value,
                        label: <Tag color={opt.color}>{opt.label}</Tag>,
                        onClick: () => handleStatusChange(opt.value)
                      }))
                    }}
                    trigger={['click']}
                  >
                    <Tag 
                      color={DealStatusColors[deal.Status] || 'default'} 
                      style={{ 
                        cursor: 'pointer', 
                        borderRadius: 16, 
                        padding: '2px 14px',
                        fontSize: 14
                      }}
                    >
                      {DealStatusLabels[deal.Status] || deal.Status || 'Unknown'}
                      <EditOutlined style={{ marginLeft: 6, fontSize: 12 }} />
                    </Tag>
                  </Dropdown>
                </div>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Contact Info */}
        {deal.contact_name && (
          <Card title={<><UserOutlined /> Contact</>} style={{ marginBottom: 16, borderRadius: 10 }}>
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar size={40} style={{ backgroundColor: '#1890ff' }}>
                  {deal.contact_name[0].toUpperCase()}
                </Avatar>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{deal.contact_name}</div>
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
              {deal.lookingFor && (
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Looking For:</Text>
                  <Text> {deal.lookingFor}</Text>
                </div>
              )}
              {deal.interestLevel && (
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Interest:</Text>
                  <Tag color={deal.interestLevel === 'High' ? 'red' : deal.interestLevel === 'Medium' ? 'orange' : 'blue'}>
                    {deal.interestLevel}
                  </Tag>
                </div>
              )}
            </Space>
          </Card>
        )}

        {/* Seller Info */}
        <Card title={<><TeamOutlined /> Seller</>} style={{ marginBottom: 16, borderRadius: 10 }}>
          {deal.seller_name ? (
            <Space>
              <Avatar size={32} style={{ backgroundColor: '#722ed1' }}>
                {deal.seller_name[0].toUpperCase()}
              </Avatar>
              <div>
                <div style={{ fontWeight: 500 }}>{deal.seller_name}</div>
                {deal.seller_email && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <MailOutlined /> {deal.seller_email}
                  </Text>
                )}
                {deal.seller_phone && (
                  <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                    <PhoneOutlined /> {deal.seller_phone}
                  </Text>
                )}
              </div>
            </Space>
          ) : (
            <Text type="secondary">No seller assigned</Text>
          )}
        </Card>

        {/* Deal Info */}
        <Card title={<><TagOutlined /> Deal Information</>} style={{ marginBottom: 16, borderRadius: 10 }}>
          <Space direction="vertical" style={{ width: '100%' }} size={8}>
            <div>
              <Text type="secondary">Source:</Text>
              <div style={{ marginTop: 2 }}>{renderSource(deal.Source)}</div>
            </div>
            <div>
              <Text type="secondary">Description:</Text>
              <div style={{ marginTop: 2 }}>{deal.Description || '—'}</div>
            </div>
            <div>
              <Text type="secondary">Created:</Text>
              <div style={{ marginTop: 2 }}>{formatDate(deal.CreationDate)}</div>
            </div>
            {deal.LastUpdateDate && (
              <div>
                <Text type="secondary">Last Updated:</Text>
                <div style={{ marginTop: 2 }}>{formatDate(deal.LastUpdateDate)}</div>
              </div>
            )}
            {deal.priority && (
              <div>
                <Text type="secondary">Priority:</Text>
                <Tag color={deal.priority === 'high' ? 'red' : deal.priority === 'medium' ? 'orange' : 'blue'}>
                  {deal.priority}
                </Tag>
              </div>
            )}
          </Space>
        </Card>

        {/* Notes */}
        {deal.Notes && deal.Notes.length > 0 && (
          <Card title="Notes" style={{ borderRadius: 10 }}>
            {deal.Notes.map((note, index) => (
              <div key={index} style={{ 
                padding: '8px 12px', 
                marginBottom: 8, 
                background: '#fafafa', 
                borderRadius: 6,
                border: '1px solid #f0f0f0'
              }}>
                <Text>{note.note}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {formatDate(note.CreationDate)}
                </Text>
              </div>
            ))}
          </Card>
        )}
      </Spin>
    </Drawer>
  );
};

export default DealDetails;