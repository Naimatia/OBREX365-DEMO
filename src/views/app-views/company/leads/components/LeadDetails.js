import React, { useState, useEffect } from 'react';
import { 
  Drawer, 
  Descriptions, 
  Button, 
  Typography, 
  Tag, 
  Space, 
  Divider, 
  List,
  Form,
  Input,
  Avatar,
  Card,
  Tooltip,
  message,
  Row,
  Col
} from 'antd';
import './LeadDetails.css';
import { 
  EditOutlined, 
  PhoneOutlined, 
  MailOutlined, 
  GlobalOutlined,
  CalendarOutlined,
  UserOutlined,
  DollarOutlined,
  TagOutlined,
  MessageOutlined,
  CopyOutlined,
  CheckOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { LeadStatus, LeadInterestLevel } from 'models/LeadModel';
import UserService from 'services/firebase/UserService';
import moment from 'moment';

const { Title, Text } = Typography;
const { TextArea } = Input;

/**
 * Component for displaying lead details in a sidebar
 */
const LeadDetails = ({ 
  visible, 
  onClose, 
  lead, 
  onEdit, 
  onAddNote 
}) => {
  const [sellerInfo, setSellerInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [noteForm] = Form.useForm();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const currentUser = useSelector(state => state.auth.user);
  
  // Status color mapping
  const statusColors = {
    [LeadStatus.PENDING]: 'blue',
    [LeadStatus.GAIN]: 'green',
    [LeadStatus.LOSS]: 'red'
  };

  // Interest level color mapping
  const interestLevelColors = {
    [LeadInterestLevel.LOW]: 'orange',
    [LeadInterestLevel.MEDIUM]: 'blue',
    [LeadInterestLevel.HIGH]: 'green'
  };
  
  // Function to copy text to clipboard
  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text).then(
      () => {
        if (type === 'email') {
          setCopiedEmail(true);
          setTimeout(() => setCopiedEmail(false), 2000);
        } else if (type === 'phone') {
          setCopiedPhone(true);
          setTimeout(() => setCopiedPhone(false), 2000);
        }
        message.success(`${type === 'email' ? 'Email' : 'Phone number'} copied to clipboard`);
      },
      () => {
        message.error('Failed to copy');
      },
    );
  };
  
  useEffect(() => {
    const fetchSellerInfo = async () => {
      if (lead?.seller_id) {
        setLoading(true);
        try {
          const sellerData = await UserService.getUserById(lead.seller_id);
          setSellerInfo(sellerData);
        } catch (error) {
          console.error('Error fetching seller info:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setSellerInfo(null);
      }
    };
    
    if (visible && lead) {
      fetchSellerInfo();
    }
  }, [visible, lead]);
  
  const handleAddNote = () => {
    noteForm.validateFields().then(values => {
      const note = {
        text: values.note,
        createdBy: {
          id: currentUser.id,
          name: `${currentUser.firstname} ${currentUser.lastname}`
        },
        createdAt: new Date()
      };
      
      onAddNote(lead.id, note);
      noteForm.resetFields();
    });
  };
  
  if (!lead) {
    return null;
  }

  return (
    <Drawer
      title={
        <div className="lead-details-header">
          <Row gutter={16} align="middle">
            <Col flex="auto">
              <Space align="center">
                <Title level={4} style={{ margin: 0 }}>{lead.name}</Title>
                <Tag color={statusColors[lead.status]} style={{ fontSize: '14px', padding: '3px 8px' }}>
                  {lead.status}
                </Tag>
              </Space>
            </Col>
            <Col>
              <Button 
                type="primary" 
                icon={<EditOutlined />}
                onClick={() => onEdit(lead)}
              >
                Edit
              </Button>
            </Col>
          </Row>
        </div>
      }
      width={600}
      placement="right"
      onClose={onClose}
      visible={visible}
      className="lead-details-drawer"
    >
      <div className="lead-details-content">
        <Row gutter={[16, 24]}>
          {/* Contact Information Card */}
          <Col span={24}>
            <Card 
              title={<Title level={5}><InfoCircleOutlined /> Contact Information</Title>} 
              className="lead-info-card"
              bordered={false}
              style={{ backgroundColor: '#f5f7fa' }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                  <div className="lead-detail-item">
                    <Text type="secondary"><GlobalOutlined /> Region</Text>
                    <div className="detail-value">{lead.region || 'Not specified'}</div>
                  </div>
                </Col>
                <Col xs={24} md={8}>
                  <div className="lead-detail-item">
                    <Text type="secondary"><MailOutlined /> Email</Text>
                    <div className="detail-value with-copy">
                      <a href={`mailto:${lead.email}`}>{lead.email}</a>
                      <Tooltip title={copiedEmail ? 'Copied!' : 'Copy Email'}>
                        <Button 
                          type="text" 
                          size="small" 
                          icon={copiedEmail ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />} 
                          onClick={() => copyToClipboard(lead.email, 'email')}
                        />
                      </Tooltip>
                    </div>
                  </div>
                </Col>
                <Col xs={24} md={8}>
                  <div className="lead-detail-item">
                    <Text type="secondary"><PhoneOutlined /> Phone</Text>
                    <div className="detail-value with-copy">
                      <a href={`tel:${lead.phoneNumber}`}>{lead.phoneNumber}</a>
                      <Tooltip title={copiedPhone ? 'Copied!' : 'Copy Phone'}>
                        <Button 
                          type="text" 
                          size="small" 
                          icon={copiedPhone ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />} 
                          onClick={() => copyToClipboard(lead.phoneNumber, 'phone')}
                        />
                      </Tooltip>
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
          
          {/* Lead Details Card */}
          <Col span={24}>
            <Card 
              title={<Title level={5}><DollarOutlined /> Lead Details</Title>} 
              className="lead-info-card"
              bordered={false}
              style={{ backgroundColor: '#f0f7ff' }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                  <div className="lead-detail-item">
                    <Text type="secondary"><CalendarOutlined /> Created</Text>
                    <div className="detail-value">
                      {lead.CreationDate ? moment(lead.CreationDate.toDate?.() || lead.CreationDate).format('MMM DD, YYYY') : 'Not available'}
                    </div>
                  </div>
                </Col>
                <Col xs={24} md={8}>
                  <div className="lead-detail-item">
                    <Text type="secondary"><TagOutlined /> Interest Level</Text>
                    <div className="detail-value">
                      <Tag color={interestLevelColors[lead.InterestLevel]} style={{ padding: '2px 10px' }}>
                        {lead.InterestLevel}
                      </Tag>
                    </div>
                  </div>
                </Col>
                <Col xs={24} md={8}>
                  <div className="lead-detail-item">
                    <Text type="secondary"><DollarOutlined /> Budget</Text>
                    <div className="detail-value">
                      <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                        {lead.Budget ? `AED ${lead.Budget.toLocaleString()}` : 'Not specified'}
                      </Text>
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
          
          {/* Seller Information Card */}
          <Col span={24}>
            <Card 
              title={<Title level={5}><UserOutlined /> Seller Assignment</Title>} 
              className="lead-info-card"
              bordered={false}
              style={{ backgroundColor: '#f6ffed' }}
            >
              <div className="seller-info">
                {loading ? (
                  <div>Loading seller information...</div>
                ) : sellerInfo ? (
                  <div className="assigned-seller">
                    <Avatar 
                      size={48} 
                      icon={<UserOutlined />}
                      style={{ backgroundColor: '#1890ff' }} 
                    />
                    <div className="seller-details">
                      <Text strong style={{ fontSize: '16px' }}>
                        {sellerInfo.firstname} {sellerInfo.lastname}
                      </Text>
                      <Text type="secondary">
                        {sellerInfo.email}
                      </Text>
                    </div>
                  </div>
                ) : (
                  <div className="no-seller">
                    <Text type="secondary">No seller assigned yet</Text>
                  </div>
                )}
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      <Card 
        title={<Title level={5}><MessageOutlined /> Lead Notes</Title>}
        bordered={false}
        className="lead-info-card notes-card"
        style={{ marginTop: 24, backgroundColor: '#f9f0ff' }}
      >
        {Array.isArray(lead.Notes) && lead.Notes.length > 0 ? (
          <List
            itemLayout="horizontal"
            dataSource={lead.Notes}
            renderItem={note => (
              <List.Item
                key={note.createdAt?.toString()}
                style={{ padding: '12px 0' }}
              >
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} style={{ backgroundColor: '#722ed1' }} />}
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text strong>{note.createdBy?.name || 'Unknown'}</Text>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {note.createdAt ? 
                        moment(note.createdAt.toDate?.() || note.createdAt).format('MMM DD, YYYY HH:mm') :
                        'Unknown time'}
                      </Text>
                    </div>
                  }
                  description={
                    <div style={{ marginTop: '8px', backgroundColor: '#fff', padding: '8px 12px', borderRadius: '4px', border: '1px solid #f0f0f0' }}>
                      {note.text}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <Text type="secondary">No notes yet</Text>
          </div>
        )}
        
        <Divider style={{ margin: '16px 0' }} />
        
        <Form form={noteForm} layout="vertical">
          <Form.Item
            name="note"
            rules={[{ required: true, message: 'Please write a note' }]}
          >
            <TextArea 
              rows={4} 
              placeholder="Add a note..." 
              style={{ borderRadius: '4px', resize: 'none' }} 
            />
          </Form.Item>
          <Form.Item>
            <Button 
              type="primary" 
              onClick={handleAddNote}
              icon={<MessageOutlined />}
              style={{ borderRadius: '4px', background: '#722ed1', borderColor: '#722ed1' }}
            >
              Add Note
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </Drawer>
  );
};

export default LeadDetails;
