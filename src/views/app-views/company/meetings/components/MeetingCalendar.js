import React from 'react';
import { Calendar, Badge, Tooltip, Button, Row, Col, Card, Typography, Tag, Select } from 'antd';
import { 
  PlusOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  GlobalOutlined
} from '@ant-design/icons';
import moment from 'moment';

const { Text, Title } = Typography;

/**
 * Calendar component that displays all meetings
 */
const MeetingCalendar = ({ meetings, onSelectMeeting, onAddMeeting }) => {
  // Function to get list of meetings for a specific date
  const getListData = (value) => {
    const dateStr = value.format('YYYY-MM-DD');
    return meetings.filter(meeting => {
      const meetingDate = moment(meeting.DateTime).format('YYYY-MM-DD');
      return meetingDate === dateStr;
    });
  };

  // Cell renderer for the calendar
  const dateCellRender = (value) => {
    const listData = getListData(value);
    
    return (
      <ul className="meeting-events-list" style={{ padding: 0, margin: 0, listStyle: 'none' }}>
        {listData.map((item) => (
          <li key={item.id} style={{ marginBottom: '4px' }}>
            <Tooltip
              title={
                <>
                  <div><strong>{item.Title}</strong></div>
                  <div>{moment(item.DateTime).format('HH:mm')} - {item.Duration} mins</div>
                  <div>Type: {item.Type === 'online' ? 'Online' : 'On-Site'}</div>
                  <div>Status: {item.Status}</div>
                  <div>Click to view details</div>
                </>
              }
            >
              <div 
                onClick={() => onSelectMeeting(item)} 
                style={{ 
                  cursor: 'pointer',
                  ...getMeetingStyles(item)
                }}
              >
                <Badge 
                  color={getMeetingStyles(item).badgeColor}
                  text={
                    <span style={{ fontSize: '12px', fontWeight: item.Type?.toLowerCase() === 'online' ? '500' : 'normal' }}>
                      {moment(item.DateTime).format('HH:mm')} {item.Title}
                      {item.Type?.toLowerCase() === 'online' && 
                        <Tag 
                          color="purple" 
                          style={{ marginLeft: '4px', fontSize: '10px', lineHeight: '14px', padding: '0 4px' }}
                        >
                          Online
                        </Tag>
                      }
                    </span>
                  }
                />
              </div>
            </Tooltip>
          </li>
        ))}
      </ul>
    );
  };

  // Monthly cell renderer
  const monthCellRender = (value) => {
    const monthStart = value.clone().startOf('month');
    const monthEnd = value.clone().endOf('month');
    
    // Count meetings for the month
    const monthMeetings = meetings.filter(meeting => {
      const meetingDate = moment(meeting.DateTime);
      return meetingDate.isBetween(monthStart, monthEnd, null, '[]');
    });
    
    if (monthMeetings.length === 0) return null;
    
    return (
      <div className="month-meetings">
        <Badge count={monthMeetings.length} style={{ backgroundColor: '#1890ff' }} />
      </div>
    );
  };

  // Helper function to get badge status and color based on meeting status and type
  /**
   * Get meeting styles based on status and type
   * @param {Object} meeting - The meeting object
   * @returns {Object} - Style object with badgeStatus and CSS styles
   */
  const getMeetingStyles = (meeting) => {
    const status = meeting.Status?.toLowerCase() || 'pending';
    const type = meeting.Type?.toLowerCase() || 'onsite';
    
    // Base style object
    const styles = {
      badgeStatus: 'default', // Valid values: success, error, default, processing, warning
      badgeColor: '#d9d9d9', // Custom color for more variety
      backgroundColor: 'transparent',
      borderLeft: '3px solid #d9d9d9',
      padding: '2px 4px',
      borderRadius: '3px',
      margin: '2px 0'
    };
    
    // Set badge color and styles based on meeting status and type for more visual distinction
    // First, set base colors by status
    switch (status) {
      case 'completed':
        styles.badgeColor = '#52c41a'; // Green
        styles.backgroundColor = 'rgba(82, 196, 26, 0.15)';
        styles.borderLeft = '4px solid #52c41a';
        break;
      case 'cancelled':
        styles.badgeColor = '#f5222d'; // Red
        styles.backgroundColor = 'rgba(245, 34, 45, 0.15)';
        styles.borderLeft = '4px solid #f5222d';
        break;
      case 'pending':
        styles.badgeColor = '#1890ff'; // Blue
        styles.backgroundColor = 'rgba(24, 144, 255, 0.15)';
        styles.borderLeft = '4px solid #1890ff';
        break;
      default:
        styles.badgeColor = '#d9d9d9'; // Grey
    }
    
    // Add distinct styling based on meeting type
    if (type === 'online') {
      // Online meetings get purple accents
      styles.borderRight = '4px solid #722ed1';
      styles.boxShadow = '0 1px 2px rgba(114, 46, 209, 0.2)';
      // Add slight gradient effect
      styles.backgroundImage = 'linear-gradient(to right, ' + styles.backgroundColor + ', rgba(114, 46, 209, 0.05))';
      styles.backgroundColor = 'transparent'; // Clear base color since we're using gradient
    } else {
      // On-site meetings get orange/amber accents
      styles.borderRight = '4px solid #fa8c16';
      styles.boxShadow = '0 1px 2px rgba(250, 140, 22, 0.2)';
      // Add slight gradient for consistency
      styles.backgroundImage = 'linear-gradient(to right, ' + styles.backgroundColor + ', rgba(250, 140, 22, 0.05))';
      styles.backgroundColor = 'transparent'; // Clear base color
    }
    
    return styles;
  };

  // Calendar header with Add Meeting button
  const calendarHeader = ({ value, type, onChange, onTypeChange }) => {
    const start = 0;
    const end = 12;
    const monthOptions = [];

    const months = moment.monthsShort();
    for (let i = start; i < end; i++) {
      monthOptions.push(
        <Select.Option key={i} value={i} className="month-item">
          {months[i]}
        </Select.Option>,
      );
    }

    return (
      <Row justify="space-between" align="middle" style={{ padding: '0 16px', marginBottom: '16px' }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            {value.format('MMMM YYYY')}
          </Title>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onAddMeeting}
          >
            Add Meeting
          </Button>
        </Col>
      </Row>
    );
  };

  // Summary card showing meetings by status
  const renderSummaryCard = () => {
    const pendingMeetings = meetings.filter(m => m.Status === 'Pending').length;
    const completedMeetings = meetings.filter(m => m.Status === 'Completed').length;
    const cancelledMeetings = meetings.filter(m => m.Status === 'Cancelled').length;
    const onlineMeetings = meetings.filter(m => m.Type === 'online').length;
    const onSiteMeetings = meetings.filter(m => m.Type === 'onSite').length;

    return (
      <Card className="mb-4">
        <Title level={5}>Meetings Summary</Title>
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={8} md={4}>
            <div className="text-center">
              <div><ClockCircleOutlined style={{ fontSize: '24px', color: '#1890ff' }} /></div>
              <div><Text strong>{pendingMeetings}</Text></div>
              <div><Text type="secondary">Pending</Text></div>
            </div>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <div className="text-center">
              <div><CheckCircleOutlined style={{ fontSize: '24px', color: '#52c41a' }} /></div>
              <div><Text strong>{completedMeetings}</Text></div>
              <div><Text type="secondary">Completed</Text></div>
            </div>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <div className="text-center">
              <div><CloseCircleOutlined style={{ fontSize: '24px', color: '#f5222d' }} /></div>
              <div><Text strong>{cancelledMeetings}</Text></div>
              <div><Text type="secondary">Cancelled</Text></div>
            </div>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <div className="text-center">
              <div><GlobalOutlined style={{ fontSize: '24px', color: '#722ed1' }} /></div>
              <div><Text strong>{onlineMeetings}</Text></div>
              <div><Text type="secondary">Online</Text></div>
            </div>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <div className="text-center">
              <div><EnvironmentOutlined style={{ fontSize: '24px', color: '#fa8c16' }} /></div>
              <div><Text strong>{onSiteMeetings}</Text></div>
              <div><Text type="secondary">On-Site</Text></div>
            </div>
          </Col>
        </Row>
      </Card>
    );
  };

  return (
    <div className="calendar-container">
      {renderSummaryCard()}
      
      <Card bordered={false} bodyStyle={{ padding: 0 }}>
        <Calendar 
          dateCellRender={dateCellRender} 
          monthCellRender={monthCellRender}
          headerRender={calendarHeader}
          mode="month"
        />
      </Card>
      
      <style>
        {`
          .meeting-events-list li {
            transition: all 0.3s ease;
          }
          .meeting-events-list li:hover {
            background-color: rgba(24, 144, 255, 0.1);
            border-radius: 4px;
            padding-left: 2px;
          }
          .calendar-container {
            margin-bottom: 24px;
          }
          .ant-picker-calendar-date-content {
            height: 80px;
            overflow-y: auto;
          }
        `}
      </style>
    </div>
  );
};

export default MeetingCalendar;
