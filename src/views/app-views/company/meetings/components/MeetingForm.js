import React, { useEffect, useState } from 'react';
import { 
  Form, 
  Input, 
  Button, 
  DatePicker, 
  TimePicker, 
  Select, 
  InputNumber,
  Radio,
  message,
  Spin,
  Row,
  Col,
  Typography
} from 'antd';
import moment from 'moment';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  UserOutlined,
  LinkOutlined,
  SaveOutlined,
  CloseOutlined
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
  const [selectedUsers, setSelectedUsers] = useState(initialValues?.Users || []);
  
  // Set form initial values when editing
  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue({
        ...initialValues,
        meetingDate: initialValues.DateTime ? moment(initialValues.DateTime) : null,
        meetingTime: initialValues.DateTime ? moment(initialValues.DateTime) : null,
        Users: initialValues.Users || [],
      });
      setMeetingType(initialValues.Type || 'onSite');
      setSelectedUsers(initialValues.Users || []);
    }
  }, [initialValues, form]);

  const handleTypeChange = (e) => {
    setMeetingType(e.target.value);
    // Clear MeetLink if type is onSite
    if (e.target.value === 'onSite') {
      form.setFieldsValue({ MeetLink: null });
    }
  };

  const handleUserSelectionChange = (selectedUserIds) => {
    setSelectedUsers(selectedUserIds);
  };

  const handleSubmit = (values) => {
    // Combine date and time
    const dateTime = values.meetingDate.clone();
    dateTime.hour(values.meetingTime.hour());
    dateTime.minute(values.meetingTime.minute());
    
    // Prepare meeting data
    const meetingData = {
      Title: values.Title,
      Description: values.Description,
      DateTime: dateTime.toDate(),
      Duration: values.Duration,
      Type: values.Type,
      Status: values.Status || 'Pending',
      Users: values.Users,
      MeetLink: values.Type === 'online' ? values.MeetLink : null,
      company_id: currentUser.company_id,
      creator_id: currentUser.uid
    };
    
    // If editing, don't override creator and creation info
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

          <Form.Item
            name="Users"
            label="Participants"
            rules={[{ required: true, message: 'Please select at least one participant' }]}
          >
            <Select
              mode="multiple"
              placeholder="Select participants"
              style={{ width: '100%' }}
              onChange={handleUserSelectionChange}
              optionFilterProp="children"
              optionLabelProp="label"
              prefixIcon={<TeamOutlined />}
              loading={!companyUsers.length}
            >
              {companyUsers.map(user => (
                <Option 
                  key={user.id} 
                  value={user.id}
                  label={`${user.name} (${user.email || user.Role || ''})`}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <UserOutlined style={{ marginRight: 8 }} />
                    <span>{user.name}</span>
                    <span style={{ marginLeft: 8, color: '#888', fontSize: '0.9em' }}>
                      ({user.email || user.Role || ''})
                    </span>
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
              placeholder="Enter meeting description, agenda, or notes" 
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
