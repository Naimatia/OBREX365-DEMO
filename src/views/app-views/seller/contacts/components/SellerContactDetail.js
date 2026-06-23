// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Card,
  Tag,
  Timeline,
  Typography,
  Button,
  Space,
  Row,
  Col,
  Input,
  Modal,
  Form,
  message,
  Select,
  InputNumber,
  Popconfirm,
  Spin,
  Divider,
  Avatar
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
  SendOutlined,
  DollarOutlined,
  StarOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  FieldTimeOutlined,
  TagOutlined,
  EnvironmentOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { ContactStatus } from 'models/ContactModel';
import { LeadInterestLevel } from 'models/LeadModel';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const SellerContactDetail = ({
  visible,
  contact,
  onEdit,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onUpdateStatus,
  onClose,
  onUpdateContact,
  loading = false
}) => {
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editNoteModalVisible, setEditNoteModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [editNoteForm] = Form.useForm();
  const [addingNote, setAddingNote] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updatingNote, setUpdatingNote] = useState(false);

  useEffect(() => {
    if (contact && editModalVisible) {
      editForm.setFieldsValue({
        status: contact.status || 'active',
        Budget: contact.Budget || null,
        lookingFor: contact.lookingFor || ''
      });
    }
  }, [contact, editModalVisible, editForm]);

  useEffect(() => {
    if (visible && contact) {
      // This triggers a re-render when contact updates
      // The parent handles the actual data refresh
    }
  }, [contact, visible]);

  const formatDate = (date) => {
    if (!date) return '—';
    try {
      const dateObj = typeof date.toDate === 'function' ? date.toDate() : new Date(date);
      if (isNaN(dateObj.getTime())) return '—';
      return dayjs(dateObj).format('MMM DD, YYYY HH:mm');
    } catch {
      return '—';
    }
  };

  const formatDateShort = (date) => {
    if (!date) return '—';
    try {
      const dateObj = typeof date.toDate === 'function' ? date.toDate() : new Date(date);
      if (isNaN(dateObj.getTime())) return '—';
      return dayjs(dateObj).format('MMM DD, YYYY');
    } catch {
      return '—';
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      [ContactStatus.PENDING]: 'orange',
      [ContactStatus.CONTACTED]: 'blue',
      [ContactStatus.DEAL]: 'green',
      [ContactStatus.LOSS]: 'red',
      [ContactStatus.NO_RESPONSE]: 'default',
      [ContactStatus.NOT_INTERESTED]: 'volcano',
      [ContactStatus.JUNK_LEAD]: 'purple',
      [ContactStatus.ACTIVE]: 'green',
      [ContactStatus.HOT]: 'red',
      [ContactStatus.COLD]: 'blue',
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      [ContactStatus.PENDING]: 'Pending',
      [ContactStatus.CONTACTED]: 'Contacted',
      [ContactStatus.DEAL]: 'Deal',
      [ContactStatus.LOSS]: 'Loss',
      [ContactStatus.NO_RESPONSE]: 'No Response',
      [ContactStatus.NOT_INTERESTED]: 'Not Interested',
      [ContactStatus.JUNK_LEAD]: 'Junk Lead',
      [ContactStatus.ACTIVE]: 'green',
      [ContactStatus.HOT]: 'red',
      [ContactStatus.COLD]: 'blue',
    };
    return labels[status] || status || 'Unknown';
  };

  const handleAddNote = () => {
    setNoteModalVisible(true);
    noteForm.resetFields();
  };

  const handleNoteSubmit = async () => {
    try {
      const values = await noteForm.validateFields();
      setAddingNote(true);
      const success = await onAddNote(contact.id, values.note);
      if (success) {
        setNoteModalVisible(false);
        noteForm.resetFields();
        message.success('Note added');
      }
    } catch (error) {
      message.error('Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    editNoteForm.setFieldsValue({ note: note.note });
    setEditNoteModalVisible(true);
  };

  const handleNoteUpdateSubmit = async () => {
    try {
      const values = await editNoteForm.validateFields();
      setUpdatingNote(true);
      await onUpdateNote(contact.id, editingNote.id, values.note);
      setEditNoteModalVisible(false);
      setEditingNote(null);
      editNoteForm.resetFields();
      message.success('Note updated');
    } catch (error) {
      message.error('Failed to update note');
    } finally {
      setUpdatingNote(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await onDeleteNote(contact.id, noteId);
      message.success('Note deleted');
    } catch (error) {
      message.error('Failed to delete note');
    }
  };

  const handleEditClick = () => {
    if (contact) {
      editForm.setFieldsValue({
        status: contact.status || 'active',
        Budget: contact.Budget || null,
        lookingFor: contact.lookingFor || ''
      });
      setEditModalVisible(true);
    }
  };

  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      setUpdating(true);
      const updateData = {
        status: values.status,
        Budget: values.Budget || null,
        lookingFor: values.lookingFor || ''
      };
      if (onUpdateContact) {
        await onUpdateContact(contact.id, updateData);
        message.success('Contact updated');
        setEditModalVisible(false);
      }
    } catch (error) {
      message.error('Failed to update contact');
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    if (onUpdateStatus) {
      await onUpdateStatus(contact.id, newStatus);
      message.success(`Status updated to ${getStatusLabel(newStatus)}`);
    }
  };

  const handleSendEmail = () => {
    if (contact?.email) {
      const subject = `Follow up - ${contact.name}`;
      const body = `Hi ${contact.name},\n\nFollowing up on your inquiry.\n\nBest regards`;
      window.open(`mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    } else {
      message.warning('No email address');
    }
  };

  const handleSendWhatsApp = () => {
    if (contact?.phoneNumber) {
      const clean = contact.phoneNumber.replace(/[\s\-\(\)]/g, '');
      const msg = `Hi ${contact.name}, following up on your inquiry.`;
      window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, '_blank');
    } else {
      message.warning('No phone number');
    }
  };

  const statusOptions = [
    { value: 'active', label: 'Active', color: 'green' },
    { value: 'hot', label: 'Hot', color: 'red' },
    { value: 'cold', label: 'Cold', color: 'blue' },
    { value: ContactStatus.PENDING, label: 'Pending', color: 'orange' },
    { value: ContactStatus.CONTACTED, label: 'Contacted', color: 'blue' },
    { value: ContactStatus.DEAL, label: 'Deal', color: 'green' },
    { value: ContactStatus.LOSS, label: 'Loss', color: 'red' },
  ];

  if (!contact) return null;

  const isFromLead = contact.leadId || contact.convertedFromLeadId;

  return (
    <Drawer
      title={
        <Space size={12}>
          <Avatar
            size={40}
            style={{
              backgroundColor: getStatusColor(contact.status),
              fontSize: 16,
              fontWeight: 600
            }}
          >
            {(contact.name || 'U')[0].toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{contact.name}</div>
            <Space size={4}>
              <Tag color={getStatusColor(contact.status)}>
                {getStatusLabel(contact.status)}
              </Tag>
              {isFromLead && <Tag color="purple">Lead</Tag>}
              {contact.source && <Tag color="blue">{contact.source}</Tag>}
            </Space>
          </div>
        </Space>
      }
      open={visible}
      onClose={onClose}
      width={window.innerWidth < 768 ? '95%' : 520}
      placement="right"
      extra={
        <Space>
          {loading && <Spin size="small" />}
          <Button type="primary" icon={<EditOutlined />} onClick={handleEditClick}>
            Edit
          </Button>
        </Space>
      }
    >
      <div style={{ padding: '0 4px' }}>
        {/* Quick Status */}
        <Card size="small" style={{ marginBottom: 16, borderRadius: 10 }}>
          <Row align="middle" gutter={12}>
            <Col>
              <Text strong>Status:</Text>
            </Col>
            <Col flex={1}>
              <Select
                value={contact.status}
                onChange={handleStatusUpdate}
                style={{ width: '100%', maxWidth: 200 }}
                size="small"
              >
                {statusOptions.map(opt => (
                  <Option key={opt.value} value={opt.value}>
                    <Tag color={opt.color} style={{ margin: 0 }}>{opt.label}</Tag>
                  </Option>
                ))}
              </Select>
            </Col>
          </Row>
        </Card>

        {/* Contact Info */}
        <Card size="small" style={{ marginBottom: 16, borderRadius: 10 }}>
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            {contact.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MailOutlined style={{ color: '#1677ff', fontSize: 16 }} />
                <Text copyable style={{ flex: 1 }}>{contact.email}</Text>
                <Button size="small" icon={<SendOutlined />} onClick={handleSendEmail}>
                  Email
                </Button>
              </div>
            )}
            {(contact.phoneNumber || contact.phone) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PhoneOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                <Text copyable style={{ flex: 1 }}>{contact.phoneNumber || contact.phone}</Text>
                <Button
                  size="small"
                  icon={<WhatsAppOutlined />}
                  onClick={handleSendWhatsApp}
                  style={{ color: '#25D366' }}
                >
                  WhatsApp
                </Button>
              </div>
            )}
          </Space>
        </Card>

        {/* Details Grid */}
        <Card size="small" style={{ marginBottom: 16, borderRadius: 10 }}>
          <Row gutter={[12, 12]}>
            <Col xs={12}>
              <div style={{
                padding: '8px 12px',
                background: '#f6ffed',
                borderRadius: 8,
                border: '1px solid #d9f7be'
              }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Budget</Text>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1677ff' }}>
                  {contact.Budget ? `AED ${Number(contact.Budget).toLocaleString()}` : '—'}
                </div>
              </div>
            </Col>
            <Col xs={12}>
              <div style={{
                padding: '8px 12px',
                background: '#fff7e6',
                borderRadius: 8,
                border: '1px solid #ffd591'
              }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Interest</Text>
                <div>
                  {contact.InterestLevel ? (
                    <Tag color={
                      contact.InterestLevel === LeadInterestLevel.HIGH ? 'red' :
                        contact.InterestLevel === LeadInterestLevel.MEDIUM ? 'orange' : 'blue'
                    }>
                      {contact.InterestLevel}
                    </Tag>
                  ) : '—'}
                </div>
              </div>
            </Col>
            {contact.lookingFor && (
              <Col span={24}>
                <div style={{
                  padding: '8px 12px',
                  background: '#e6f7ff',
                  borderRadius: 8,
                  border: '1px solid #91d5ff'
                }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    <TagOutlined /> Looking For
                  </Text>
                  <div style={{ fontSize: 13 }}>{contact.lookingFor}</div>
                </div>
              </Col>
            )}
            {contact.region && (
              <Col span={24}>
                <div style={{
                  padding: '8px 12px',
                  background: '#f9f0ff',
                  borderRadius: 8,
                  border: '1px solid #d3adf7'
                }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    <EnvironmentOutlined /> Location
                  </Text>
                  <div style={{ fontSize: 13 }}>{contact.region}</div>
                </div>
              </Col>
            )}
          </Row>
        </Card>

        {/* Timeline */}
        <Card size="small" style={{ marginBottom: 16, borderRadius: 10 }}>
          <Row gutter={[12, 8]}>
            <Col span={24}>
              <Space>
                <CalendarOutlined style={{ color: '#722ed1' }} />
                <Text strong>Timeline</Text>
              </Space>
            </Col>
            <Col span={12}>
              <Text type="secondary" style={{ fontSize: 12 }}>Created</Text>
              <div style={{ fontSize: 13 }}>{formatDate(contact.CreationDate)}</div>
            </Col>
            <Col span={12}>
              <Text type="secondary" style={{ fontSize: 12 }}>Assigned</Text>
              <div style={{ fontSize: 13 }}>
                {contact.AffectingDate ? formatDateShort(contact.AffectingDate) : 'Not assigned'}
              </div>
            </Col>
            {contact.updatedAt && (
              <Col span={24}>
                <Text type="secondary" style={{ fontSize: 12 }}>Last Updated</Text>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>{formatDate(contact.updatedAt)}</div>
              </Col>
            )}
          </Row>
        </Card>

        {/* Action Buttons */}
        <Row gutter={8} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Button block icon={<EditOutlined />} onClick={handleEditClick}>
              Edit
            </Button>
          </Col>
          <Col span={12}>
            <Button block icon={<PlusOutlined />} onClick={handleAddNote}>
              Add Note
            </Button>
          </Col>
        </Row>

        {/* Notes */}
        <Card
          size="small"
          title={
            <Space>
              <ClockCircleOutlined />
              Notes ({contact.Notes?.length || 0})
            </Space>
          }
          style={{ borderRadius: 10 }}
        >
          {contact.Notes && contact.Notes.length > 0 ? (
            <Timeline>
              {contact.Notes.map((note) => (
                <Timeline.Item
                  key={note.id || note._id}
                  dot={<ClockCircleOutlined style={{ fontSize: 12, color: '#1890ff' }} />}
                >
                  <div style={{ marginBottom: 4 }}>
                    <Space wrap>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {formatDate(note.CreationDate)}
                      </Text>
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEditNote(note)}
                      />
                      <Popconfirm
                        title="Delete this note?"
                        onConfirm={() => handleDeleteNote(note.id)}
                        okText="Delete"
                        cancelText="Cancel"
                        okType="danger"
                      >
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </Space>
                  </div>
                  <Paragraph style={{ margin: 0, fontSize: 13, whiteSpace: 'pre-wrap' }}>
                    {note.note}
                  </Paragraph>
                </Timeline.Item>
              ))}
            </Timeline>
          ) : (
            <div style={{ textAlign: 'center', padding: 20, color: '#8c8c8c' }}>
              <ClockCircleOutlined style={{ fontSize: 20, marginBottom: 8 }} />
              <div>No notes</div>
            </div>
          )}
        </Card>
      </div>

      {/* Modals */}
      <Modal
        title="Add Note"
        open={noteModalVisible}
        onOk={handleNoteSubmit}
        onCancel={() => { setNoteModalVisible(false); noteForm.resetFields(); }}
        confirmLoading={addingNote}
      >
        <Form form={noteForm} layout="vertical">
          <Form.Item
            name="note"
            rules={[{ required: true, message: 'Please enter a note' }]}
          >
            <TextArea rows={4} placeholder="Enter your note..." maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Edit Note"
        open={editNoteModalVisible}
        onOk={handleNoteUpdateSubmit}
        onCancel={() => { setEditNoteModalVisible(false); setEditingNote(null); editNoteForm.resetFields(); }}
        confirmLoading={updatingNote}
      >
        <Form form={editNoteForm} layout="vertical">
          <Form.Item name="note" rules={[{ required: true, message: 'Please enter a note' }]}>
            <TextArea rows={4} placeholder="Edit your note..." maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Edit Contact"
        open={editModalVisible}
        onOk={handleEditSubmit}
        onCancel={() => { setEditModalVisible(false); editForm.resetFields(); }}
        confirmLoading={updating}
        width={450}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select>
              {statusOptions.map(opt => (
                <Option key={opt.value} value={opt.value}>
                  <Tag color={opt.color}>{opt.label}</Tag>
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="Budget" label="Budget (AED)">
            <InputNumber
              style={{ width: '100%' }}
              placeholder="Enter budget"
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={v => v.replace(/\$\s?|(,*)/g, '')}
              min={0}
              step={1000}
            />
          </Form.Item>
          <Form.Item name="lookingFor" label="Looking For">
            <Input placeholder="Villa, Apartment, Office..." />
          </Form.Item>
        </Form>
      </Modal>
    </Drawer>
  );
};

export default SellerContactDetail;