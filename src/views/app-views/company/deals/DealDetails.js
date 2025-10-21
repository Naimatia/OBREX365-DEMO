import React, { useEffect, useState } from 'react';
import { 
  Drawer, Typography, Row, Col, Descriptions, Button, Space, 
  Tag, Divider, Spin, Card, Tooltip, List, Empty, Popconfirm
} from 'antd';
import {
  UserOutlined, PhoneOutlined, MailOutlined, HomeOutlined,
  DollarOutlined, TagOutlined, CalendarOutlined, LinkOutlined,
  EditOutlined, DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined,
  UserSwitchOutlined
} from '@ant-design/icons';
import moment from 'moment';
import contactService from 'services/firebase/ContactService';
import userService from 'services/firebase/UserService';
import propertyService from 'services/firebase/PropertyService';
import leadService from 'services/firebase/LeadService';
import { DealStatus, DealSource } from 'models/DealModel';

const { Title, Text } = Typography;

const DealDetails = ({ visible, deal, onClose, onEdit, onDelete, onStatusChange }) => {
  const [loading, setLoading] = useState(false);
  const [contact, setContact] = useState(null);
  const [seller, setSeller] = useState(null);
  const [property, setProperty] = useState(null);
  const [lead, setLead] = useState(null);

  useEffect(() => {
    if (visible && deal) {
      fetchRelatedData();
    }
  }, [visible, deal]);

  const fetchRelatedData = async () => {
    setLoading(true);
    try {
      // Reset states to prevent showing stale data
      setContact(null);
      setSeller(null);
      setProperty(null);
      setLead(null);
      
      // Fetch related entities in parallel
      const promises = [];
      
      if (deal.contact_id) {
        promises.push(contactService.getById(deal.contact_id).then(data => setContact(data)));
      }
      
      if (deal.seller_id) {
        promises.push(userService.getUserData(deal.seller_id).then(data => setSeller(data)));
      }
      
      if (deal.property_id) {
        promises.push(propertyService.getById(deal.property_id).then(data => setProperty(data)));
      }
      
      if (deal.lead_id) {
        promises.push(leadService.getById(deal.lead_id).then(data => setLead(data)));
      }
      
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Error fetching related data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStatusTag = (status) => {
    switch(status) {
      case DealStatus.OPENED:
        return <Tag color="blue">Open</Tag>;
      case DealStatus.GAIN:
        return <Tag color="green">Won</Tag>;
      case DealStatus.LOSS:
        return <Tag color="red">Lost</Tag>;
      default:
        return <Tag>Unknown</Tag>;
    }
  };

  const renderSourceTag = (source) => {
    switch(source) {
      case DealSource.LEADS:
        return <Tag color="purple">Leads</Tag>;
      case DealSource.CONTACTS:
        return <Tag color="cyan">Contacts</Tag>;
      case DealSource.FREELANCE:
        return <Tag color="orange">Freelance</Tag>;
      default:
        return <Tag>Other</Tag>;
    }
  };

  const handleMarkAsWon = () => {
    onStatusChange(deal.id, DealStatus.GAIN);
  };

  const handleMarkAsLost = () => {
    onStatusChange(deal.id, DealStatus.LOSS);
  };

  const handleMarkAsOpen = () => {
    onStatusChange(deal.id, DealStatus.OPENED);
  };

  if (!deal) {
    return null;
  }

  return (
    <Drawer
      title={<Title level={4}>Deal Details</Title>}
      placement="right"
      onClose={onClose}
      open={visible}
      width={600}
      className="deal-details-drawer"
      footer={
        <Space style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <div>
            <Popconfirm
              title="Are you sure you want to delete this deal?"
              onConfirm={() => onDelete(deal.id)}
              okText="Yes"
              cancelText="No"
              placement="topRight"
            >
              <Button danger type="primary" icon={<DeleteOutlined />}>
                Delete
              </Button>
            </Popconfirm>
          </div>
          <div>
            <Button 
              type="primary" 
              icon={<EditOutlined />} 
              onClick={() => onEdit(deal)}
              style={{ marginLeft: 8 }}
            >
              Edit
            </Button>
            <Button onClick={onClose} style={{ marginLeft: 8 }}>
              Close
            </Button>
          </div>
        </Space>
      }
    >
      <Spin spinning={loading}>
        <div className="detail-section">
          <Row gutter={[16, 16]} align="middle">
            <Col span={16}>
              <Title level={4}>{deal.Description || 'No Description'}</Title>
            </Col>
            <Col span={8} style={{ textAlign: 'right' }}>
              <Text type="secondary">Deal ID: {deal.id.substring(0, 8)}</Text>
            </Col>
          </Row>

          <Row gutter={[16, 16]} align="middle" style={{ marginTop: 16 }}>
            <Col span={8}>
              <div className="detail-item">
                <div className="detail-label">Amount</div>
                <div className="detail-value">
                  <DollarOutlined /> AED {deal.Amount ? deal.Amount.toLocaleString() : '0'}
                </div>
              </div>
            </Col>
            <Col span={8}>
              <div className="detail-item">
                <div className="detail-label">Status</div>
                <div className="detail-value">{renderStatusTag(deal.Status)}</div>
              </div>
            </Col>
            <Col span={8}>
              <div className="detail-item">
                <div className="detail-label">Source</div>
                <div className="detail-value">{renderSourceTag(deal.Source)}</div>
              </div>
            </Col>
          </Row>
        </div>

        <div className="detail-section">
          <div className="detail-section-title">
            <UserOutlined /> Contact Information
          </div>
          {contact ? (
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <div className="detail-item">
                  <div className="detail-label">Name</div>
                  <div className="detail-value">
                    {contact.FirstName} {contact.LastName}
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div className="detail-item">
                  <div className="detail-label">Email</div>
                  <div className="detail-value">
                    <MailOutlined /> {contact.email || 'N/A'}
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div className="detail-item">
                  <div className="detail-label">Phone</div>
                  <div className="detail-value">
                    <PhoneOutlined /> {contact.phone || 'N/A'}
                  </div>
                </div>
              </Col>
            </Row>
          ) : lead ? (
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <div className="detail-item">
                  <div className="detail-label">Lead Name</div>
                  <div className="detail-value">
                    {lead.firstName} {lead.lastName}
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div className="detail-item">
                  <div className="detail-label">Lead Email</div>
                  <div className="detail-value">
                    <MailOutlined /> {lead.email || 'N/A'}
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div className="detail-item">
                  <div className="detail-label">Lead Phone</div>
                  <div className="detail-value">
                    <PhoneOutlined /> {lead.phone || 'N/A'}
                  </div>
                </div>
              </Col>
            </Row>
          ) : (
            <Empty description="No contact or lead associated with this deal" />
          )}
        </div>

        <div className="detail-section">
          <div className="detail-section-title">
            <UserOutlined /> Seller Information
          </div>
          {seller ? (
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <div className="detail-item">
                  <div className="detail-label">Name</div>
                  <div className="detail-value">
                    {seller.firstname} {seller.lastname}
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div className="detail-item">
                  <div className="detail-label">Email</div>
                  <div className="detail-value">
                    <MailOutlined /> {seller.email || 'N/A'}
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div className="detail-item">
                  <div className="detail-label">Phone</div>
                  <div className="detail-value">
                    <PhoneOutlined /> {seller.phone || 'N/A'}
                  </div>
                </div>
              </Col>
            </Row>
          ) : (
            <Empty description="No seller associated with this deal" />
          )}
        </div>

        {property && (
          <div className="detail-section">
            <div className="detail-section-title">
              <HomeOutlined /> Property Information
            </div>
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <div className="detail-item">
                  <div className="detail-label">Address</div>
                  <div className="detail-value">
                    {property.street}, {property.city}, {property.state} {property.zip}
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div className="detail-item">
                  <div className="detail-label">Type</div>
                  <div className="detail-value">
                    {property.type || 'N/A'}
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div className="detail-item">
                  <div className="detail-label">Price</div>
                  <div className="detail-value">
                    <DollarOutlined /> AED {property.price ? property.price.toLocaleString() : 'N/A'}
                  </div>
                </div>
              </Col>
            </Row>
          </div>
        )}

        <div className="detail-section">
          <div className="detail-section-title">
            <CalendarOutlined /> Timeline
          </div>
          <Descriptions layout="vertical" size="small" column={2}>
            <Descriptions.Item label="Created">
              {deal.CreationDate ? moment(deal.CreationDate.toDate()).format('MMM DD, YYYY') : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Last Updated">
              {deal.LastUpdateDate ? moment(deal.LastUpdateDate.toDate()).format('MMM DD, YYYY') : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Status Last Changed">
              {deal.StatusUpdateDate ? moment(deal.StatusUpdateDate.toDate()).format('MMM DD, YYYY') : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Closed Date">
              {deal.ClosedDate ? moment(deal.ClosedDate.toDate()).format('MMM DD, YYYY') : 'N/A'}
            </Descriptions.Item>
          </Descriptions>
        </div>

        <div className="detail-section">
          <div className="detail-section-title">
            Actions
          </div>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={handleMarkAsWon}
                disabled={deal.Status === DealStatus.GAIN}
                block
              >
                Mark as Won
              </Button>
            </Col>
            <Col span={8}>
              <Button
                danger
                icon={<CloseCircleOutlined />}
                onClick={handleMarkAsLost}
                disabled={deal.Status === DealStatus.LOSS}
                block
              >
                Mark as Lost
              </Button>
            </Col>
            <Col span={8}>
              <Button
                icon={<TagOutlined />}
                onClick={handleMarkAsOpen}
                disabled={deal.Status === DealStatus.OPENED}
                block
              >
                Mark as Open
              </Button>
            </Col>
          </Row>
        </div>

        {deal.Notes && (
          <div className="detail-section notes-section">
            <div className="detail-section-title">
              Notes
            </div>
            <div className="note-item">
              <div className="note-content">{deal.Notes}</div>
            </div>
          </div>
        )}
      </Spin>
    </Drawer>
  );
};

export default DealDetails;
