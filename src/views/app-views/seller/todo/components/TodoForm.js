import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  DatePicker,
  Select,
  Button,
  Space,
  Row,
  Col,
  message,
  Card,
  Typography,
  Divider,
  List,
  Popconfirm,
  Tooltip
} from 'antd';
import { 
  SaveOutlined, 
  CloseOutlined, 
  FileTextOutlined,
  MessageOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import TodoService from 'services/TodoService';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

const TodoForm = ({ 
  todo = null, 
  onSuccess, 
  onCancel, 
  sellers = [], 
  currentUser,
  userRole 
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [existingNotes, setExistingNotes] = useState([]);
  const [editingNoteIndex, setEditingNoteIndex] = useState(null);
  const [editNoteValue, setEditNoteValue] = useState('');

  const canAssignToOthers = ['CEO', 'HR'].includes(userRole);

  useEffect(() => {
    if (todo) {
      form.setFieldsValue({
        ToDo: todo.ToDo || todo.Title,
        DateLimit: todo.DateLimit ? dayjs(todo.DateLimit) : null,
        assignee: todo.assignee || todo.AssignedTo,
        Status: todo.Status || 'ToDo',
        newNote: ''
      });
      setExistingNotes(todo.Notes || []);
    } else {
      form.setFieldsValue({
        Status: 'ToDo',
        assignee: canAssignToOthers ? null : currentUser?.id,
        newNote: ''
      });
      setExistingNotes([]);
    }
  }, [todo, form, canAssignToOthers, currentUser]);

  // Delete a specific note
  const handleDeleteNote = (index) => {
    const updatedNotes = existingNotes.filter((_, i) => i !== index);
    setExistingNotes(updatedNotes);
    message.success('Note deleted');
  };

  // Start editing a note
  const handleStartEditNote = (index, currentText) => {
    setEditingNoteIndex(index);
    setEditNoteValue(currentText);
  };

  // Save edited note
  const handleSaveEditedNote = () => {
    if (editNoteValue.trim() === '') {
      message.warning("Note cannot be empty");
      return;
    }

    const updatedNotes = [...existingNotes];
    updatedNotes[editingNoteIndex] = {
      ...updatedNotes[editingNoteIndex],
      note: editNoteValue.trim(),
      CreationDate: updatedNotes[editingNoteIndex].CreationDate || new Date()
    };

    setExistingNotes(updatedNotes);
    setEditingNoteIndex(null);
    setEditNoteValue('');
    message.success('Note updated');
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      let finalNotes = [...existingNotes];

      // Add new note if provided
      if (values.newNote?.trim()) {
        finalNotes.push({
          note: values.newNote.trim(),
          CreationDate: new Date()
        });
      }

      const todoData = {
        ToDo: values.ToDo,
        DateLimit: values.DateLimit ? values.DateLimit.toDate() : null,
        assignee: values.assignee,
        Status: values.Status,
        company_id: currentUser?.company_id,
        user_id: currentUser?.uid || currentUser?.id,
        Notes: finalNotes
      };

      if (todo) {
        await TodoService.updateTodo(todo.id, todoData);
        message.success('Todo updated successfully');
      } else {
        await TodoService.createTodo(todoData);
        message.success('Todo created successfully');
      }

      onSuccess?.();
      onCancel?.();

    } catch (error) {
      console.error(error);
      message.error('Failed to save todo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Title level={4}>
        <FileTextOutlined style={{ marginRight: 8, color: '#1890ff' }} />
        {todo ? 'Edit Todo' : 'Create New Todo'}
      </Title>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        {/* ... Title, Due Date, Assignee, Status fields (same as before) ... */}
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="ToDo" label="Todo Title" rules={[{ required: true }]}>
              <Input placeholder="Enter todo title..." maxLength={200} showCount />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item name="DateLimit" label="Due Date">
              <DatePicker style={{ width: '100%' }} showTime format="DD/MM/YYYY HH:mm" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="assignee" label="Assign To" rules={[{ required: true }]}>
              <Select placeholder="Select assignee" disabled={!canAssignToOthers}>
                {canAssignToOthers ? sellers.map(s => (
                  <Option key={s.id} value={s.id}>{s.name} ({s.email})</Option>
                )) : (
                  <Option value={currentUser?.id}>
                    {currentUser?.firstname} {currentUser?.lastname} (You)
                  </Option>
                )}
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item name="Status" label="Status" rules={[{ required: true }]}>
              <Select>
                <Option value="ToDo">To Do</Option>
                <Option value="InProgress">In Progress</Option>
                <Option value="Done">Done</Option>
                <Option value="Blocked">Blocked</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* Existing Notes with Edit & Delete */}
        {todo && existingNotes.length > 0 && (
          <>
            <Divider />
            <Text strong style={{ marginBottom: 12, display: 'block' }}>
              <MessageOutlined /> Existing Notes ({existingNotes.length})
            </Text>

            <List
              dataSource={existingNotes}
              renderItem={(note, index) => (
                <List.Item
                  style={{
                    background: '#f8fafc',
                    borderRadius: 8,
                    marginBottom: 8,
                    padding: '12px 16px'
                  }}
                  actions={[
                    <Tooltip title="Edit Note">
                      <Button 
                        type="text" 
                        icon={<EditOutlined />} 
                        onClick={() => handleStartEditNote(index, note.note)}
                      />
                    </Tooltip>,
                    <Popconfirm
                      title="Delete this note?"
                      onConfirm={() => handleDeleteNote(index)}
                      okText="Delete"
                      okButtonProps={{ danger: true }}
                    >
                      <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  ]}
                >
                  {editingNoteIndex === index ? (
                    <Space.Compact style={{ width: '100%' }}>
                      <Input
                        value={editNoteValue}
                        onChange={(e) => setEditNoteValue(e.target.value)}
                        onPressEnter={handleSaveEditedNote}
                        autoFocus
                      />
                      <Button type="primary" onClick={handleSaveEditedNote}>Save</Button>
                      <Button onClick={() => setEditingNoteIndex(null)}>Cancel</Button>
                    </Space.Compact>
                  ) : (
                    <div style={{ width: '100%' }}>
                      <Text style={{ fontSize: '14px' }}>{note.note}</Text>
                      {note.CreationDate && (
                        <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: 4 }}>
                          {new Date(note.CreationDate).toLocaleString('fr-FR')}
                        </Text>
                      )}
                    </div>
                  )}
                </List.Item>
              )}
            />
          </>
        )}

        {/* Add New Note */}
        <Form.Item 
          name="newNote" 
          label={todo ? "Add New Note" : "Initial Note (Optional)"}
        >
          <TextArea 
            rows={4} 
            placeholder="Write your note here..."  
            showCount 
          />
        </Form.Item>

        <Form.Item style={{ textAlign: 'right', marginTop: 24 }}>
          <Space>
            <Button onClick={onCancel} disabled={loading}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
              {todo ? 'Update Todo' : 'Create Todo'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default TodoForm;