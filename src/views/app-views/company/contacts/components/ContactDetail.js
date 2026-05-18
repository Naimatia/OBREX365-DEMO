import React, { useState } from 'react';
import { 
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
  Modal,
  Form,
  Input,
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
  DeleteOutlined
} from '@ant-design/icons';
import { ContactStatus } from 'models/ContactModel';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const ContactDetail = ({ 
  contact, 
  sellers = [], 
  onEdit, 
  onAddNote,
  onUpdateNote,     // New prop
  onDeleteNote,     // New prop
  onClose 
}) => {
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const assignedSeller = sellers.find(s => s.id === contact.seller_id);
  const sellerName = assignedSeller ? assignedSeller.name : 'Not assigned';

const getStatusColor = (status) => {
  const statusColors = {
    [ContactStatus.PENDING]: 'orange',
    [ContactStatus.CONTACTED]: 'blue',
    [ContactStatus.DEAL]: 'green',
    [ContactStatus.LOSS]: 'red',
    [ContactStatus.NO_RESPONSE]: 'default',
    [ContactStatus.NOT_INTERESTED]: 'volcano',
    [ContactStatus.JUNK_LEAD]: 'purple',
  };

  return statusColors[status] || 'default';
};

  // ==================== Note Handlers ====================

  const openAddNoteModal = () => {
    setEditingNote(null);
    noteForm.resetFields();
    setNoteModalVisible(true);
  };

  const openEditNoteModal = (note) => {
    setEditingNote(note);
    noteForm.setFieldsValue({ note: note.note });
    setNoteModalVisible(true);
  };

 // Inside ContactDetail component

const handleNoteSubmit = async () => {
  try {
    const values = await noteForm.validateFields();
    setSubmitting(true);

    if (editingNote) {
      await onUpdateNote(contact.id, editingNote.id, values.note);
    } else {
      await onAddNote(contact.id, values.note);
    }

    setNoteModalVisible(false);
    noteForm.resetFields();
    setEditingNote(null);
  } catch (error) {
    message.error('Failed to save note');
  } finally {
    setSubmitting(false);
  }
};

const handleDeleteNoteClick = (noteId) => {
  Modal.confirm({
    title: 'Delete this note?',
    content: 'This action cannot be undone.',
    okType: 'danger',
    onOk: () => onDeleteNote(contact.id, noteId)
  });
};

  return (
    <div className="contact-detail">
      <Card
        title={
          <Space size="middle" align="center">
            <UserOutlined style={{ fontSize: '24px' }} />
            <Title level={4} style={{ margin: 0 }}>{contact.name}</Title>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<EditOutlined />} onClick={() => onEdit(contact)}>
              Edit Contact
            </Button>
            <Button type="primary" onClick={onClose}>
              Close
            </Button>
          </Space>
        }
      >
        <Row gutter={[16, 24]}>
          <Col xs={24} md={12}>
            <Descriptions title="Contact Information" column={1} bordered>
              <Descriptions.Item label="Email">
                <Space><MailOutlined /> {contact.email || 'Not provided'}</Space>
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                <Space><PhoneOutlined /> {contact.phoneNumber || 'Not provided'}</Space>
              </Descriptions.Item>
              <Descriptions.Item label="Region">
                <Space><GlobalOutlined /> {contact.region || 'Not specified'}</Space>
              </Descriptions.Item>
            </Descriptions>
          </Col>

          <Col xs={24} md={12}>
            <Descriptions title="Status Information" column={1} bordered>
              <Descriptions.Item label="Status">
                <Tag color={getStatusColor(contact.status)}>{contact.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Assigned To">
                <Space><UserOutlined /> {sellerName}</Space>
              </Descriptions.Item>
              <Descriptions.Item label="Created On">
                <Space><CalendarOutlined /> {contact.CreationDate ? dayjs(contact.CreationDate).format('YYYY-MM-DD') : 'Unknown'}</Space>
              </Descriptions.Item>
              {contact.AffectingDate && (
                <Descriptions.Item label="Assigned On">
                  <Space><CalendarOutlined /> {dayjs(contact.AffectingDate).format('YYYY-MM-DD')}</Space>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Last Updated">
                <Space><CalendarOutlined /> {contact.LastUpdateDate ? dayjs(contact.LastUpdateDate).format('YYYY-MM-DD HH:mm') : 'Never'}</Space>
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>

        <Divider />

        {/* Notes Section */}
        <div className="notes-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={4}>Notes History</Title>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={openAddNoteModal}
            >
              Add Note
            </Button>
          </div>

          {contact.Notes && contact.Notes.length > 0 ? (
            <Timeline mode="left">
              {contact.Notes.map((note) => (
                <Timeline.Item 
                  key={note.id}
                  dot={<ClockCircleOutlined />}
                  label={note.CreationDate ? dayjs(note.CreationDate).format('YYYY-MM-DD HH:mm') : ''}
                >
                  <Paragraph style={{ marginBottom: 8 }}>{note.note}</Paragraph>
                  
                  <Space size="small">
                    <Button 
                      size="small" 
                      icon={<EditOutlined />} 
                      onClick={() => openEditNoteModal(note)}
                    >
                      Edit
                    </Button>
                    <Button 
                      size="small" 
                      danger 
                      icon={<DeleteOutlined />} 
                      onClick={() => handleDeleteNoteClick(note.id)}
                    >
                      Delete
                    </Button>
                  </Space>
                </Timeline.Item>
              ))}
            </Timeline>
          ) : (
            <Text type="secondary">No notes available for this contact yet.</Text>
          )}
        </div>
      </Card>

      {/* Add / Edit Note Modal */}
      <Modal
        title={editingNote ? "Edit Note" : "Add New Note"}
        open={noteModalVisible}
        onOk={handleNoteSubmit}
        onCancel={() => {
          setNoteModalVisible(false);
          setEditingNote(null);
          noteForm.resetFields();
        }}
        confirmLoading={submitting}
        okText={editingNote ? "Update Note" : "Add Note"}
      >
        <Form form={noteForm} layout="vertical">
          <Form.Item
            name="note"
            rules={[{ required: true, message: 'Please enter note content' }]}
          >
            <TextArea 
              rows={5} 
              placeholder="Write your note here..." 
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ContactDetail;