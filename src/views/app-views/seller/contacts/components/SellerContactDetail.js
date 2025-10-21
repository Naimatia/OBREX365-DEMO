// @ts-nocheck
import React, { useState } from 'react';
import { 
  Drawer,
  Card, 
  Descriptions, 
  Tag, 
  Timeline, 
  Typography, 
  Button, 
  Space, 
  Divider, 
  Row, 
  Col,
  Input,
  Modal,
  Form,
  message
} from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  GlobalOutlined,
  CalendarOutlined,
  EditOutlined,
  PlusOutlined,
  ClockCircleOutlined,
  WhatsAppOutlined,
  SendOutlined
} from '@ant-design/icons';
import { ContactStatus } from 'models/ContactModel';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

/**
 * Contact detail component for sellers to view and interact with contacts
 * Includes email and WhatsApp functionality
 */
const SellerContactDetail = ({ 
  visible,
  contact, 
  onEdit, 
  onAddNote,
  onClose
}) => {
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [noteForm] = Form.useForm();
  const [addingNote, setAddingNote] = useState(false);

  // Get the appropriate status color
  const getStatusColor = (status) => {
    switch (status) {
      case ContactStatus.PENDING:
        return 'orange';
      case ContactStatus.CONTACTED:
        return 'blue';
      case ContactStatus.DEAL:
        return 'green';
      case ContactStatus.LOSS:
        return 'red';
      default:
        return 'default';
    }
  };

  // Handle adding a note
  const handleAddNote = () => {
    setNoteModalVisible(true);
    noteForm.resetFields();
  };

  // Handle note submission
  const handleNoteSubmit = async () => {
    try {
      const values = await noteForm.validateFields();
      setAddingNote(true);
      
      const success = await onAddNote(contact.id, values.note);
      if (success) {
        setNoteModalVisible(false);
        noteForm.resetFields();
      }
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setAddingNote(false);
    }
  };

  // Handle sending email
  const handleSendEmail = () => {
    if (contact?.email) {
      const subject = `Follow up on your inquiry - ${contact.name}`;
      const body = `Hi ${contact.name},\n\nI hope this email finds you well. I wanted to follow up regarding your property inquiry.\n\nBest regards`;
      const mailtoUrl = `mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoUrl, '_blank');
    } else {
      message.warning('No email address available for this contact');
    }
  };

  // Handle sending WhatsApp message
  const handleSendWhatsApp = () => {
    if (contact?.phoneNumber) {
      // Clean phone number (remove spaces, dashes, etc.)
      const cleanPhone = contact.phoneNumber.replace(/[\s\-\(\)]/g, '');
      const message = `Hi ${contact.name}, I wanted to follow up regarding your property inquiry. How can I assist you further?`;
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    } else {
      message.warning('No phone number available for this contact');
    }
  };

  if (!contact) return null;

  return (
    <Drawer
      title={
        <Space>
          <UserOutlined />
          <span>{contact.name}</span>
          <Tag color={getStatusColor(contact.status)}>
            {contact.status || 'Unknown'}
          </Tag>
        </Space>
      }
      open={visible}
      onClose={onClose}
      width={window.innerWidth < 768 ? '90%' : 500}
      placement="right"
    >
      <div style={{ padding: '0 8px' }}>
        {/* Contact Information */}
        <Card 
          size="small" 
          style={{ 
            marginBottom: '20px', 
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          <div style={{ padding: '8px' }}>
            {/* Email Section */}
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e8f4fd' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <MailOutlined style={{ color: '#1890ff', marginRight: '8px', fontSize: '16px' }} />
                <Text strong style={{ color: '#1890ff' }}>Email</Text>
              </div>
              {contact.email ? (
                <div style={{ marginLeft: '24px' }}>
                  <Text copyable style={{ wordBreak: 'break-all', display: 'block', marginBottom: '8px' }}>
                    {contact.email}
                  </Text>
                  <Button 
                    type="primary" 
                    size="small" 
                    icon={<SendOutlined />}
                    onClick={handleSendEmail}
                    style={{ borderRadius: '6px' }}
                  >
                    Send Email
                  </Button>
                </div>
              ) : (
                <Text type="secondary" style={{ marginLeft: '24px' }}>Not provided</Text>
              )}
            </div>

            {/* Phone Section */}
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f6ffed', borderRadius: '8px', border: '1px solid #d9f7be' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <PhoneOutlined style={{ color: '#52c41a', marginRight: '8px', fontSize: '16px' }} />
                <Text strong style={{ color: '#52c41a' }}>Phone</Text>
              </div>
              {contact.phoneNumber ? (
                <div style={{ marginLeft: '24px' }}>
                  <Text copyable style={{ display: 'block', marginBottom: '8px' }}>
                    {contact.phoneNumber}
                  </Text>
                  <Button 
                    size="small" 
                    icon={<WhatsAppOutlined />}
                    onClick={handleSendWhatsApp}
                    style={{ 
                      backgroundColor: '#25D366', 
                      borderColor: '#25D366', 
                      color: 'white',
                      borderRadius: '6px'
                    }}
                  >
                    WhatsApp
                  </Button>
                </div>
              ) : (
                <Text type="secondary" style={{ marginLeft: '24px' }}>Not provided</Text>
              )}
            </div>

            {/* Location Section */}
            {contact.region && (
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#fff7e6', borderRadius: '8px', border: '1px solid #ffd591' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <GlobalOutlined style={{ color: '#fa8c16', marginRight: '8px', fontSize: '16px' }} />
                  <Text strong style={{ color: '#fa8c16' }}>Location</Text>
                </div>
                <div style={{ marginLeft: '24px' }}>
                  <div>
                    <Text strong>Region: </Text>
                    <Text>{contact.region}</Text>
                  </div>
                </div>
              </div>
            )}

            {/* Dates Section */}
            <div style={{ padding: '12px', backgroundColor: '#f9f0ff', borderRadius: '8px', border: '1px solid #d3adf7' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <CalendarOutlined style={{ color: '#722ed1', marginRight: '8px', fontSize: '16px' }} />
                <Text strong style={{ color: '#722ed1' }}>Timeline</Text>
              </div>
              <div style={{ marginLeft: '24px' }}>
                <div style={{ marginBottom: '4px' }}>
                  <Text strong>Assigned: </Text>
                  <Text>
                    {contact.AffectingDate ? 
                      moment(contact.AffectingDate).format('MMM DD, YYYY') : 
                      <span style={{ color: '#8c8c8c' }}>Not assigned</span>
                    }
                  </Text>
                </div>
                <div>
                  <Text strong>Created: </Text>
                  <Text>
                    {contact.CreationDate ? 
                      moment(contact.CreationDate).format('MMM DD, YYYY HH:mm') : 
                      <span style={{ color: '#8c8c8c' }}>Unknown</span>
                    }
                  </Text>
                </div>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div style={{ marginTop: '16px' }}>
            <Row gutter={12}>
              <Col span={12}>
                <Button 
                  type="primary" 
                  block 
                  icon={<EditOutlined />}
                  onClick={() => onEdit(contact)}
                  style={{ borderRadius: '8px', height: '40px' }}
                >
                  Edit Contact
                </Button>
              </Col>
              <Col span={12}>
                <Button 
                  block 
                  icon={<PlusOutlined />}
                  onClick={handleAddNote}
                  style={{ borderRadius: '8px', height: '40px' }}
                >
                  Add Note
                </Button>
              </Col>
            </Row>
          </div>
        </Card>

        {/* Contact Description */}
        {contact.description && (
          <Card size="small" title="Description" style={{ marginBottom: '16px' }}>
            <Paragraph>{contact.description}</Paragraph>
          </Card>
        )}

        {/* Notes Section */}
        <Card size="small" title="Notes & History">
          {contact.Notes && contact.Notes.length > 0 ? (
            <Timeline mode="left">
              {contact.Notes.map((note, index) => (
                <Timeline.Item 
                  key={index}
                  dot={<ClockCircleOutlined style={{ fontSize: '12px' }} />}
                >
                  <div style={{ marginBottom: '8px' }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {note.CreationDate ? moment(note.CreationDate).format('MMM DD, YYYY HH:mm') : 'Unknown date'}
                    </Text>
                  </div>
                  <Paragraph style={{ margin: 0, fontSize: '14px' }}>
                    {note.note}
                  </Paragraph>
                </Timeline.Item>
              ))}
            </Timeline>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#8c8c8c' }}>
              <ClockCircleOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
              <div>No notes yet</div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Add a note to track your interactions with this contact
              </Text>
            </div>
          )}
        </Card>
      </div>

      {/* Add Note Modal */}
      <Modal
        title="Add Note"
        open={noteModalVisible}
        onOk={handleNoteSubmit}
        onCancel={() => {
          setNoteModalVisible(false);
          noteForm.resetFields();
        }}
        confirmLoading={addingNote}
        okText="Add Note"
      >
        <Form form={noteForm} layout="vertical">
          <Form.Item
            name="note"
            label="Note"
            rules={[
              { required: true, message: 'Please enter a note' },
              { min: 5, message: 'Note must be at least 5 characters' }
            ]}
          >
            <TextArea 
              rows={4}
              placeholder="Enter your note about this contact..."
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </Drawer>
  );
};

export default SellerContactDetail;
