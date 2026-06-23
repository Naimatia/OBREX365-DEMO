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
  message,
  Avatar,
  Tooltip
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
  DeleteOutlined,
  HistoryOutlined,
  TeamOutlined
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
  onUpdateNote,
  onDeleteNote,
  onClose 
}) => {
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const assignedSeller = sellers.find(s => s.id === contact.seller_id);
  const sellerName = assignedSeller ? assignedSeller.name : 'Not assigned';

  // Get status color
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

  // Format date helper
  const formatDate = (date) => {
    if (!date) return '—';
    try {
      const d = date.toDate ? date.toDate() : new Date(date);
      if (isNaN(d.getTime())) return '—';
      return dayjs(d).format('DD MMM YYYY HH:mm');
    } catch {
      return '—';
    }
  };

  // Format date short
  const formatDateShort = (date) => {
    if (!date) return '—';
    try {
      const d = date.toDate ? date.toDate() : new Date(date);
      if (isNaN(d.getTime())) return '—';
      return dayjs(d).format('DD MMM YYYY');
    } catch {
      return '—';
    }
  };

  // Note handlers
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

  const handleNoteSubmit = async () => {
    try {
      const values = await noteForm.validateFields();
      setSubmitting(true);

      if (editingNote) {
        await onUpdateNote(contact.id, editingNote.id, values.note);
        message.success('Note updated successfully');
      } else {
        await onAddNote(contact.id, values.note);
        message.success('Note added successfully');
      }

      setNoteModalVisible(false);
      noteForm.resetFields();
      setEditingNote(null);
    } catch (error) {
      console.error('Error saving note:', error);
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
      onOk: async () => {
        try {
          await onDeleteNote(contact.id, noteId);
          message.success('Note deleted successfully');
        } catch (error) {
          console.error('Error deleting note:', error);
          message.error('Failed to delete note');
        }
      }
    });
  };

  // Check if contact has notes
  const hasNotes = contact.Notes && contact.Notes.length > 0;

  // Check if contact is from lead
  const isFromLead = contact.leadId || contact.convertedFromLeadId;

  return (
    <div className="contact-detail">
      <Card
        title={
          <Space size="middle" align="center">
            <Avatar 
              size={48} 
              style={{ 
                backgroundColor: getStatusColor(contact.status),
                fontSize: 20,
                fontWeight: 600
              }}
            >
              {(contact.name || 'U')[0].toUpperCase()}
            </Avatar>
            <div>
              <Title level={4} style={{ margin: 0 }}>{contact.name}</Title>
              <Space size={4}>
                <Tag color={getStatusColor(contact.status)}>
                  {contact.status || 'Unknown'}
                </Tag>
                {isFromLead && <Tag color="purple">From Lead</Tag>}
                {contact.source && <Tag color="blue">{contact.source}</Tag>}
              </Space>
            </div>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<EditOutlined />} onClick={() => onEdit(contact)}>
              Edit
            </Button>
            <Button type="primary" onClick={onClose}>
              Close
            </Button>
          </Space>
        }
      >
        <Row gutter={[16, 24]}>
          <Col xs={24} md={12}>
            <Descriptions title="Contact Information" column={1} bordered size="small">
              <Descriptions.Item label={<><MailOutlined /> Email</>}>
                {contact.email || 'Not provided'}
              </Descriptions.Item>
              <Descriptions.Item label={<><PhoneOutlined /> Phone</>}>
                {contact.phoneNumber || 'Not provided'}
              </Descriptions.Item>
              <Descriptions.Item label={<><GlobalOutlined /> Region</>}>
                {contact.region || 'Not specified'}
              </Descriptions.Item>
              {contact.lookingFor && (
                <Descriptions.Item label="Looking For">
                  {contact.lookingFor}
                </Descriptions.Item>
              )}
              {contact.Budget && (
                <Descriptions.Item label="Budget">
                  AED {Number(contact.Budget).toLocaleString()}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Col>

          <Col xs={24} md={12}>
            <Descriptions title="Status Information" column={1} bordered size="small">
              <Descriptions.Item label={<><TeamOutlined /> Assigned To</>}>
                <Space>
                  <UserOutlined />
                  {sellerName}
                  {assignedSeller?.phoneNumber && (
                    <Tooltip title={assignedSeller.phoneNumber}>
                      <PhoneOutlined style={{ color: '#52c41a' }} />
                    </Tooltip>
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label={<><CalendarOutlined /> Created</>}>
                {formatDate(contact.CreationDate)}
              </Descriptions.Item>
              {contact.AffectingDate && (
                <Descriptions.Item label="Assigned On">
                  {formatDateShort(contact.AffectingDate)}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Last Updated">
                {contact.LastUpdateDate ? formatDate(contact.LastUpdateDate) : 'Never'}
              </Descriptions.Item>
              {contact.source && (
                <Descriptions.Item label="Source">
                  <Tag color="blue">{contact.source}</Tag>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Col>
        </Row>

        <Divider />

        {/* Notes Section */}
        <div className="notes-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Space>
              <HistoryOutlined style={{ color: '#1890ff' }} />
              <Title level={4} style={{ margin: 0 }}>Notes History</Title>
              {hasNotes && <Tag color="blue">{contact.Notes.length}</Tag>}
            </Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={openAddNoteModal}
            >
              Add Note
            </Button>
          </div>

          {hasNotes ? (
            <Timeline mode="left">
              {contact.Notes.map((note) => (
                <Timeline.Item 
                  key={note.id || note._id}
                  dot={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
                  label={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatDate(note.CreationDate)}
                    </Text>
                  }
                >
                  <Paragraph style={{ marginBottom: 8, whiteSpace: 'pre-wrap' }}>
                    {note.note}
                  </Paragraph>
                  <Space size="small">
                    <Button 
                      size="small" 
                      type="text"
                      icon={<EditOutlined />} 
                      onClick={() => openEditNoteModal(note)}
                    >
                      Edit
                    </Button>
                    <Button 
                      size="small" 
                      type="text"
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
            <div style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>
              <ClockCircleOutlined style={{ fontSize: 32, marginBottom: 16, display: 'block' }} />
              <Text>No notes available for this contact yet.</Text>
              <div>
                <Button type="link" onClick={openAddNoteModal}>
                  Add your first note
                </Button>
              </div>
            </div>
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
        width={500}
      >
        <Form form={noteForm} layout="vertical">
          <Form.Item
            name="note"
            rules={[{ required: true, message: 'Please enter note content' }]}
          >
            <TextArea 
              rows={5} 
              placeholder="Write your note here..." 
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ContactDetail;