import React, { useEffect, useState } from 'react';
import { 
  Form, Input, Button, DatePicker, TimePicker, Select, InputNumber,
  Radio, Spin, Row, Col, Typography
} from 'antd';
import dayjs from 'dayjs';
import {
  CalendarOutlined, ClockCircleOutlined, TeamOutlined, UserOutlined,
  LinkOutlined, SaveOutlined, CloseOutlined
} from '@ant-design/icons';

const { Option } = Select;
const { TextArea } = Input;
const { Title } = Typography;

const MeetingForm = ({ 
  currentUser, 
  companyUsers, 
  initialValues, 
  onSave, 
  onCancel, 
  loading,
  isEdit = false
}) => {
  const [form] = Form.useForm();
  const [meetingType, setMeetingType] = useState(initialValues?.Type || 'onSite');

  // Set form initial values when editing
  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue({
        ...initialValues,
        meetingDate: initialValues.DateTime ? dayjs(initialValues.DateTime) : null,
        meetingTime: initialValues.DateTime ? dayjs(initialValues.DateTime) : null,
        Users: initialValues.Users || [],
        ExternalParticipants: initialValues.ExternalParticipants || [],
      });
      setMeetingType(initialValues.Type || 'onSite');
    }
  }, [initialValues, form]);

  const handleTypeChange = (e) => {
    setMeetingType(e.target.value);
    if (e.target.value === 'onSite') {
      form.setFieldsValue({ MeetLink: null });
    }
  };

  const handleSubmit = (values) => {
     const date = values.meetingDate.format('YYYY-MM-DD');
  const time = values.meetingTime.format('HH:mm');

  const dateTime = dayjs(`${date} ${time}`, 'YYYY-MM-DD HH:mm');

    // Separate internal users (IDs) and external participants (free text)
    const internalUsers = [];
    const externalParticipants = [];

    (values.Users || []).forEach(item => {
      // If it matches a company user ID → internal
      if (companyUsers.some(user => user.id === item)) {
        internalUsers.push(item);
      } 
      // Otherwise → external (free text)
      else {
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
      Users: internalUsers,                    // Only real user IDs
      ExternalParticipants: externalParticipants, // Free text names/emails
      MeetLink: values.Type === 'online' ? values.MeetLink : null,
      company_id: currentUser.company_id,
      creator_id: currentUser.uid
    };

    if (isEdit && initialValues) {
      delete meetingData.creator_id;
    }

    onSave(meetingData);
  };

  return (
    <Spin spinning={loading}>
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
          {/* Participants Field */}
          <Form.Item
            name="Users"
            label="Participants"
            rules={[{ required: true, message: 'Please add at least one participant' }]}
            extra="Select company users or type external names/emails and press Enter"
          >
            <Select
              mode="tags"
              placeholder="Type name or email and press Enter"
              style={{ width: '100%' }}
              suffixIcon={<TeamOutlined />}
            >
              {companyUsers.map(user => (
                <Option key={user.id} value={user.id}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <UserOutlined style={{ marginRight: 8 }} />
                    {user.name} ({user.email || user.Role || ''})
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="Description"
            label="Description"
          >
            <TextArea 
              rows={4} 
              placeholder="Enter meeting description, agenda, or notes (optional)" 
            />
          </Form.Item>

          <Form.Item>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button onClick={onCancel} icon={<CloseOutlined />}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                {isEdit ? 'Update Meeting' : 'Create Meeting'}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </div>
    </Spin>
  );
};

export default MeetingForm;