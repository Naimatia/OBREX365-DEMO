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
  Input,
  Modal,
  Form
} from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  GlobalOutlined,
  CalendarOutlined,
  EditOutlined,
  PlusOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { ContactStatus } from 'models/ContactModel';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

/**
 * Contact detail component to display all information about a contact
 */
const ContactDetail = ({ 
  contact, 
  sellers = [], 
  onEdit, 
  onAddNote,
  onClose
}) => {
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [noteForm] = Form.useForm();
  const [addingNote, setAddingNote] = useState(false);

  // Find the assigned seller name
  const assignedSeller = sellers.find(seller => seller.id === contact.seller_id);
  const sellerName = assignedSeller ? assignedSeller.name : 'Not assigned';

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
  };

  // Submit the new note
  const submitNote = () => {
    noteForm.validateFields()
      .then(values => {
        setAddingNote(true);
        onAddNote(contact.id, values.note)
          .then(() => {
            setNoteModalVisible(false);
            noteForm.resetFields();
          })
          .finally(() => {
            setAddingNote(false);
          });
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
            <Descriptions title="Contact Information" column={1} bordered>
              <Descriptions.Item label="Email">
                <Space>
                  <MailOutlined />
                  {contact.email || 'Not provided'}
                </Space>
              </Descriptions.Item>
              
              <Descriptions.Item label="Phone">
                <Space>
                  <PhoneOutlined />
                  {contact.phoneNumber || 'Not provided'}
                </Space>
              </Descriptions.Item>
              
              <Descriptions.Item label="Region">
                <Space>
                  <GlobalOutlined />
                  {contact.region || 'Not specified'}
                </Space>
              </Descriptions.Item>
            </Descriptions>
          </Col>
          
          <Col xs={24} md={12}>
            <Descriptions title="Status Information" column={1} bordered>
              <Descriptions.Item label="Status">
                <Tag color={getStatusColor(contact.status)}>{contact.status}</Tag>
              </Descriptions.Item>
              
              <Descriptions.Item label="Assigned To">
                <Space>
                  <UserOutlined />
                  {sellerName}
                </Space>
              </Descriptions.Item>
              
              <Descriptions.Item label="Created On">
                <Space>
                  <CalendarOutlined />
                  {contact.CreationDate ? moment(contact.CreationDate).format('YYYY-MM-DD') : 'Unknown'}
                </Space>
              </Descriptions.Item>

              {contact.AffectingDate && (
                <Descriptions.Item label="Assigned On">
                  <Space>
                    <CalendarOutlined />
                    {moment(contact.AffectingDate).format('YYYY-MM-DD')}
                  </Space>
                </Descriptions.Item>
              )}
              
              <Descriptions.Item label="Last Updated">
                <Space>
                  <CalendarOutlined />
                  {contact.LastUpdateDate ? moment(contact.LastUpdateDate).format('YYYY-MM-DD') : 'Not updated'}
                </Space>
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>

        <Divider />
        
        <Row>
          <Col span={24}>
            <div className="notes-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <Title level={4}>Notes</Title>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={handleAddNote}
                >
                  Add Note
                </Button>
              </div>
              
              {contact.Notes && contact.Notes.length > 0 ? (
                <Timeline mode="left">
                  {contact.Notes.map((note, index) => (
                    <Timeline.Item 
                      key={index} 
                      dot={<ClockCircleOutlined />}
                      label={note.CreationDate ? moment(note.CreationDate).format('YYYY-MM-DD HH:mm') : 'No date'}
                    >
                      <Paragraph>{note.note}</Paragraph>
                    </Timeline.Item>
                  ))}
                </Timeline>
              ) : (
                <Text type="secondary">No notes available for this contact.</Text>
              )}
            </div>
          </Col>
        </Row>

        {/* Modal for adding a note */}
        <Modal
          title="Add Note"
          visible={noteModalVisible}
          onCancel={() => setNoteModalVisible(false)}
          footer={[
            <Button key="cancel" onClick={() => setNoteModalVisible(false)}>
              Cancel
            </Button>,
            <Button 
              key="submit" 
              type="primary" 
              loading={addingNote} 
              onClick={submitNote}
            >
              Add Note
            </Button>,
          ]}
        >
          <Form form={noteForm} layout="vertical">
            <Form.Item
              name="note"
              rules={[
                { required: true, message: 'Please enter a note' },
              ]}
            >
              <TextArea rows={4} placeholder="Enter your note here..." />
            </Form.Item>
          </Form>
        </Modal>
      </Card>
    </div>
  );
};

export default ContactDetail;
