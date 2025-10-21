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
  Typography
} from 'antd';
import { 
  SaveOutlined, 
  CloseOutlined, 
  UserOutlined, 
  CalendarOutlined,
  FileTextOutlined 
} from '@ant-design/icons';
import TodoService from 'services/TodoService';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;
const { Title } = Typography;

/**
 * TodoForm Component for creating and editing todos
 */
const TodoForm = ({ 
  todo = null, 
  onSubmit, 
  onCancel, 
  sellers = [], 
  currentUser,
  userRole 
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Check if user is CEO/HR (can assign to others) or Seller (can only assign to self)
  const canAssignToOthers = ['CEO', 'HR'].includes(userRole);

  useEffect(() => {
    if (todo) {
      // Editing existing todo
      form.setFieldsValue({
        ToDo: todo.ToDo,
        DateLimit: todo.DateLimit ? dayjs(todo.DateLimit) : null,
        assignee: todo.assignee,
        Status: todo.Status,
        Notes: todo.Notes && todo.Notes.length > 0 ? todo.Notes[0].note : ''
      });
    } else {
      // Creating new todo
      form.setFieldsValue({
        Status: 'ToDo',
        assignee: canAssignToOthers ? null : currentUser?.id // Auto-assign to self if seller
      });
    }
  }, [todo, form, canAssignToOthers, currentUser]);

  const handleSubmit = async (values) => {
    if (loading) return; // Prevent double submission
    
    setLoading(true);
    try {
      const todoData = {
        ToDo: values.ToDo,
        DateLimit: values.DateLimit ? values.DateLimit.toDate() : null,
        assignee: values.assignee,
        Status: values.Status,
        company_id: currentUser?.company_id,
        user_id: currentUser?.uid || currentUser?.id, // Creator of the todo
        Notes: values.Notes ? [{
          note: values.Notes,
          CreationDate: new Date()
        }] : []
      };

      // Pass data to parent handler - don't call service directly
      await onSubmit?.(todoData);
    } catch (error) {
      console.error('Error saving todo:', error);
      message.error('Failed to save todo');
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { value: 'ToDo', label: 'To Do', color: '#faad14' },
    { value: 'InProgress', label: 'In Progress', color: '#1890ff' },
    { value: 'Done', label: 'Done', color: '#52c41a' },
    { value: 'Blocked', label: 'Blocked', color: '#ff4d4f' }
  ];

  return (
    <Card>
      <Title level={4}>
        <FileTextOutlined style={{ marginRight: 8, color: '#1890ff' }} />
        {todo ? 'Edit Todo' : 'Create New Todo'}
      </Title>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        requiredMark={false}
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="ToDo"
              label="Todo Title"
              rules={[
                { required: true, message: 'Please enter todo title' },
                { max: 200, message: 'Title cannot exceed 200 characters' }
              ]}
            >
              <Input
                placeholder="Enter todo title..."
                prefix={<FileTextOutlined />}
                maxLength={200}
                showCount
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              name="DateLimit"
              label="Due Date"
            >
              <DatePicker
                style={{ width: '100%' }}
                placeholder="Select due date"
                showTime={{ format: 'HH:mm' }}
                format="DD/MM/YYYY HH:mm"
                disabledDate={(current) => {
                  // Can't select dates before today
                  return current && current < dayjs().startOf('day');
                }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="assignee"
              label="Assign To"
              rules={[
                { required: true, message: 'Please select assignee' }
              ]}
            >
              <Select
                placeholder="Select assignee"
                disabled={!canAssignToOthers} // Disable if seller (auto-assigned to self)
              >
                {canAssignToOthers ? (
                  // CEO/HR can assign to any seller
                  sellers.map(seller => (
                    <Option key={seller.id} value={seller.id}>
                      <Space>
                        <UserOutlined />
                        {seller.name} ({seller.email})
                      </Space>
                    </Option>
                  ))
                ) : (
                  // Seller can only assign to themselves
                  <Option key={currentUser?.id} value={currentUser?.id}>
                    <Space>
                      <UserOutlined />
                      {currentUser?.firstname} {currentUser?.lastname} (You)
                    </Space>
                  </Option>
                )}
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              name="Status"
              label="Status"
              rules={[
                { required: true, message: 'Please select status' }
              ]}
            >
              <Select placeholder="Select status">
                {statusOptions.map(status => (
                  <Option key={status.value} value={status.value}>
                    <Space>
                      <div 
                        style={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: '50%', 
                          backgroundColor: status.color 
                        }} 
                      />
                      {status.label}
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="Notes"
          label="Initial Note (Optional)"
        >
          <TextArea
            placeholder="Add any initial notes or description..."
            rows={3}
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button 
              icon={<CloseOutlined />} 
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={loading}
            >
              {todo ? 'Update Todo' : 'Create Todo'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default TodoForm;
