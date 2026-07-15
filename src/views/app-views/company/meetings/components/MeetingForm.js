// MeetingForm.js - Updated to only show employees from employees table

import React, { useEffect, useState } from 'react';
import { 
  Form, Input, Button, DatePicker, TimePicker, Select, InputNumber,
  Radio, Spin, Row, Col, Typography, message, Tag
} from 'antd';
import dayjs from 'dayjs';
import {
  CalendarOutlined, ClockCircleOutlined, TeamOutlined, UserOutlined,
  LinkOutlined, SaveOutlined, CloseOutlined, MailOutlined,
  SendOutlined
} from '@ant-design/icons';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

const MeetingForm = ({ 
  currentUser, 
  companyUsers, 
  employees, // Employees from the employees table
  initialValues, 
  onSave, 
  onCancel, 
  loading,
  isEdit = false
}) => {
  const [form] = Form.useForm();
  const [meetingType, setMeetingType] = useState(initialValues?.Type || 'onSite');
  const [sendingNotifications, setSendingNotifications] = useState(false);

  useEffect(() => {
    if (initialValues) {
      // Filter initialValues.Users to only include employees that exist
      const validEmployeeIds = initialValues.Users?.filter(id => 
        employees.some(emp => emp.id === id)
      ) || [];
      
      form.setFieldsValue({
        ...initialValues,
        meetingDate: initialValues.DateTime ? dayjs(initialValues.DateTime) : null,
        meetingTime: initialValues.DateTime ? dayjs(initialValues.DateTime) : null,
        Users: validEmployeeIds,
        ExternalParticipants: initialValues.ExternalParticipants || [],
      });
      setMeetingType(initialValues.Type || 'onSite');
    }
  }, [initialValues, form, employees]);

  const handleTypeChange = (e) => {
    setMeetingType(e.target.value);
    if (e.target.value === 'onSite') {
      form.setFieldsValue({ MeetLink: null });
    }
  };

  const handleSubmit = async (values) => {
    setSendingNotifications(true);
    
    try {
      const date = values.meetingDate.format('YYYY-MM-DD');
      const time = values.meetingTime.format('HH:mm');
      const dateTime = dayjs(`${date} ${time}`, 'YYYY-MM-DD HH:mm');

      // Only employees from the employees table
      const employeeParticipants = [];
      const externalParticipants = [];

      (values.Users || []).forEach(item => {
        // Check if it's an employee ID from the employees table
        if (employees.some(emp => emp.id === item)) {
          employeeParticipants.push(item);
        } else {
          // If not an employee, treat as external
          externalParticipants.push(item);
        }
      });

      const meetingData = {
        Title: values.Title,
        Description: values.Description || '',
        DateTime: dateTime.toDate(),
        Duration: values.Duration,
        Type: values.Type,
        Status: values.Status || 'Pending',
        Users: employeeParticipants, // Only employee IDs
        ExternalParticipants: externalParticipants,
        MeetLink: values.Type === 'online' ? values.MeetLink : null,
        company_id: currentUser.company_id,
        creator_id: currentUser.uid
      };

      if (isEdit && initialValues) {
        delete meetingData.creator_id;
      }

      await onSave(meetingData);
      
      message.success(
        isEdit ? 'Meeting updated successfully!' : 'Meeting created and notifications sent to all participants!',
        3
      );
      
    } catch (error) {
      console.error('Error saving meeting:', error);
      message.error(`Failed to ${isEdit ? 'update' : 'create'} meeting: ${error.message}`);
    } finally {
      setSendingNotifications(false);
    }
  };

  const renderNotificationStatus = () => {
    if (sendingNotifications) {
      return (
        <div style={{ marginTop: 16, padding: 12, background: '#e6f7ff', borderRadius: 8 }}>
          <Spin size="small" />
          <Text style={{ marginLeft: 8 }}>Sending email notifications to participants...</Text>
        </div>
      );
    }
    return null;
  };

  // Get participant emails from employees table only
  const getParticipantEmails = () => {
    const emails = [];
    const selectedUsers = form.getFieldValue('Users') || [];
    
    selectedUsers.forEach(userId => {
      // Check in employees table only
      const employee = employees.find(e => e.id === userId);
      if (employee?.email) {
        emails.push(employee.email);
      }
    });
    
    return emails;
  };

  // Get selected employee names for display
  const getSelectedEmployees = () => {
    const names = [];
    const selectedUsers = form.getFieldValue('Users') || [];
    
    selectedUsers.forEach(userId => {
      const employee = employees.find(e => e.id === userId);
      if (employee) {
        names.push({
          name: employee.name,
          role: employee.Role || 'Employee',
          email: employee.email
        });
      }
    });
    
    return names;
  };

  return (
    <Spin spinning={loading || sendingNotifications}>
      <div style={{ padding: '20px 0' }}>
        <Title level={4}>
          {isEdit ? 'Edit Meeting' : 'Add New Meeting'}
        </Title>
        
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            Status: 'Pending',
            Type: 'onSite',
            Duration: 60,
          }}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="Title"
                label="Meeting Title"
                rules={[{ required: true, message: 'Please enter meeting title' }]}
              >
                <Input placeholder="Enter meeting title" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="Status"
                label="Status"
                rules={[{ required: true, message: 'Please select status' }]}
              >
                <Select placeholder="Select status">
                  <Option value="Pending">Pending</Option>
                  <Option value="Cancelled">Cancelled</Option>
                  <Option value="Completed">Completed</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="meetingDate"
                label="Date"
                rules={[{ required: true, message: 'Please select date' }]}
              >
                <DatePicker 
                  style={{ width: '100%' }} 
                  format="YYYY-MM-DD"
                  placeholder="Select date"
                  suffixIcon={<CalendarOutlined />}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="meetingTime"
                label="Time"
                rules={[{ required: true, message: 'Please select time' }]}
              >
                <TimePicker 
                  style={{ width: '100%' }} 
                  format="HH:mm"
                  placeholder="Select time"
                  suffixIcon={<ClockCircleOutlined />}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="Duration"
                label="Duration (minutes)"
                rules={[{ required: true, message: 'Please enter duration' }]}
              >
                <InputNumber 
                  style={{ width: '100%' }} 
                  min={5} 
                  max={480}
                  placeholder="Enter duration in minutes" 
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="Type"
            label="Meeting Type"
            rules={[{ required: true, message: 'Please select meeting type' }]}
          >
            <Radio.Group onChange={handleTypeChange} value={meetingType}>
              <Radio value="onSite">On-Site</Radio>
              <Radio value="online">Online</Radio>
            </Radio.Group>
          </Form.Item>

          {meetingType === 'online' && (
            <Form.Item
              name="MeetLink"
              label="Meeting Link"
              rules={[
                { required: true, message: 'Please enter meeting link' },
                { type: 'url', message: 'Please enter a valid URL' }
              ]}
            >
              <Input 
                placeholder="Enter meeting link (e.g., Zoom, Teams, Google Meet)" 
                prefix={<LinkOutlined />}
              />
            </Form.Item>
          )}

          <Form.Item
            name="Users"
            label="Participants"
            rules={[{ required: true, message: 'Please add at least one participant' }]}
            extra={
              <div style={{ fontSize: '12px', color: '#666' }}>
                <TeamOutlined style={{ marginRight: 4 }} />
                Select employees from the list below. Email notifications will be sent to all selected employees.
                <br />
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  Total employees available: {employees.length}
                </Text>
              </div>
            }
          >
            <Select
              mode="multiple"
              placeholder="Select employees"
              style={{ width: '100%' }}
              suffixIcon={<TeamOutlined />}
              optionFilterProp="children"
              showSearch
            >
              {/* Only employees from employees table */}
              {employees.map(employee => (
                <Option key={employee.id} value={employee.id}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>
                      <UserOutlined style={{ marginRight: 8 }} />
                      {employee.name}
                      <Tag size="small" style={{ marginLeft: 4, fontSize: '10px' }}>
                        {employee.Role || 'Employee'}
                      </Tag>
                    </span>
                    {employee.email && (
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        <MailOutlined style={{ marginRight: 4 }} />
                        {employee.email}
                      </Text>
                    )}
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* Show selected employees with their roles */}
          {getSelectedEmployees().length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Selected Participants ({getSelectedEmployees().length}):
              </Text>
              <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {getSelectedEmployees().map((item, index) => (
                  <Tag key={index} color="blue">
                    {item.name}
                    {item.role && ` (${item.role})`}
                    {item.email && ` - ${item.email}`}
                  </Tag>
                ))}
              </div>
            </div>
          )}

          <Form.Item
            name="Description"
            label="Description"
          >
            <TextArea 
              rows={4} 
              placeholder="Enter meeting description, agenda, or notes (optional)" 
            />
          </Form.Item>

          {renderNotificationStatus()}

          <div style={{ 
            marginTop: 16, 
            padding: 12, 
            background: '#f0f5ff', 
            borderRadius: 8,
            border: '1px solid #d6e4ff'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <MailOutlined style={{ color: '#1890ff', marginRight: 8, marginTop: 2 }} />
              <div>
                <Text style={{ fontSize: '13px', color: '#666' }}>
                  <strong>📧 Email Notifications:</strong> All selected employees with valid email addresses will receive notifications.
                  <br />
                  <span style={{ fontSize: '12px' }}>
                    Found <strong>{getParticipantEmails().length}</strong> employees with email addresses.
                    {getParticipantEmails().length > 0 && (
                      <span style={{ display: 'block', marginTop: 4 }}>
                        Will send to: {getParticipantEmails().join(', ')}
                      </span>
                    )}
                    {getParticipantEmails().length === 0 && (
                      <span style={{ display: 'block', marginTop: 4, color: '#faad14' }}>
                        ⚠️ No employees have email addresses. Please add emails to employee profiles.
                      </span>
                    )}
                  </span>
                </Text>
              </div>
            </div>
          </div>

          <Form.Item style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button onClick={onCancel} icon={<CloseOutlined />} disabled={sendingNotifications}>
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={sendingNotifications}
                icon={sendingNotifications ? null : <SendOutlined />}
              >
                {sendingNotifications 
                  ? 'Sending...' 
                  : isEdit 
                    ? 'Update Meeting' 
                    : 'Create Meeting & Send Notifications'
                }
              </Button>
            </div>
          </Form.Item>
        </Form>
      </div>
    </Spin>
  );
};

export default MeetingForm;