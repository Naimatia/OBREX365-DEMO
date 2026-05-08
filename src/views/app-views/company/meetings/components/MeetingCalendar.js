import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Badge, 
  Tooltip, 
  Button, 
  Row, 
  Col, 
  Card, 
  Typography, 
  Tag, 
  Select,
  Space
} from 'antd';
import { 
  PlusOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  FilterOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

const { Text, Title } = Typography;
const { Option } = Select;

const MeetingCalendar = ({ 
  meetings, 
  onSelectMeeting, 
  onAddMeeting,
  companyUsers = []   // Pass all users for seller filter
}) => {

  const [selectedSeller, setSelectedSeller] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(dayjs());

  // Filter meetings based on seller and month
  const filteredMeetings = useMemo(() => {
    let result = [...meetings];

    // Filter by Seller (Creator)
    if (selectedSeller) {
      result = result.filter(meeting => meeting.creator_id === selectedSeller);
    }

    // Filter by Month
    if (selectedMonth) {
      result = result.filter(meeting => {
        const meetingDate = dayjs(meeting.DateTime);
        return meetingDate.month() === selectedMonth.month() && 
               meetingDate.year() === selectedMonth.year();
      });
    }

    return result;
  }, [meetings, selectedSeller, selectedMonth]);

  // Get list of meetings for a specific date (using filtered data)
  const getListData = (value) => {
    const dateStr = value.format('YYYY-MM-DD');
    return filteredMeetings.filter(meeting => {
      const meetingDate = dayjs(meeting.DateTime).format('YYYY-MM-DD');
      return meetingDate === dateStr;
    });
  };

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
                  <div>{dayjs(item.DateTime).format('HH:mm')} - {item.Duration} mins</div>
                  <div>Type: {item.Type === 'online' ? 'Online' : 'On-Site'}</div>
                  <div>Status: {item.Status}</div>
                  <div>Click to view details</div>
                </>
              }
            >
              <div 
                onClick={() => onSelectMeeting(item)} 
                style={{ cursor: 'pointer', ...getMeetingStyles(item) }}
              >
                <Badge 
                  color={getMeetingStyles(item).badgeColor}
                  text={
                    <span style={{ fontSize: '12px' }}>
                      {dayjs(item.DateTime).format('HH:mm')} {item.Title}
                      {item.Type?.toLowerCase() === 'online' && 
                        <Tag color="purple" style={{ marginLeft: '4px', fontSize: '10px' }}>Online</Tag>
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

  const monthCellRender = (value) => {
    const monthMeetings = filteredMeetings.filter(meeting => {
      const meetingDate = dayjs(meeting.DateTime);
      return meetingDate.isBetween(
        value.clone().startOf('month'), 
        value.clone().endOf('month'), 
        null, 
        '[]'
      );
    });

    if (monthMeetings.length === 0) return null;
    
    return <Badge count={monthMeetings.length} style={{ backgroundColor: '#1890ff' }} />;
  };

  // Get all sellers for filter
  const sellers = companyUsers.filter(user => 
    user.Role?.toLowerCase() === 'seller' || 
    user.role?.toLowerCase() === 'seller'
  );

  // Reset filters
  const resetFilters = () => {
    setSelectedSeller(null);
    setSelectedMonth(dayjs());
  };

  const getMeetingStyles = (meeting) => {
    // ... (Keep your existing getMeetingStyles function unchanged)
    const status = meeting.Status?.toLowerCase() || 'pending';
    const type = meeting.Type?.toLowerCase() || 'onsite';
    
    const styles = {
      badgeColor: '#d9d9d9',
      backgroundColor: 'transparent',
      borderLeft: '4px solid #d9d9d9',
      padding: '2px 4px',
      borderRadius: '3px',
      margin: '2px 0'
    };

    switch (status) {
      case 'completed': styles.badgeColor = '#52c41a'; styles.borderLeft = '4px solid #52c41a'; break;
      case 'cancelled': styles.badgeColor = '#f5222d'; styles.borderLeft = '4px solid #f5222d'; break;
      case 'pending':   styles.badgeColor = '#1890ff'; styles.borderLeft = '4px solid #1890ff'; break;
    }

    if (type === 'online') {
      styles.borderRight = '4px solid #722ed1';
    } else {
      styles.borderRight = '4px solid #fa8c16';
    }

    return styles;
  };

  // Calendar Header with Filters
  const calendarHeader = ({ value, onChange }) => {
    return (
      <div style={{ padding: '0 16px', marginBottom: '16px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} style={{ margin: 0 }}>
              {value.format('MMMM YYYY')}
            </Title>
          </Col>

          <Col>
            <Space>
              {/* Seller Filter */}
              <Select
                style={{ width: 220 }}
                placeholder="Filter by Seller"
                allowClear
                value={selectedSeller}
                onChange={setSelectedSeller}
              >
                {sellers.map(seller => (
                  <Option key={seller.id} value={seller.id}>
                    {seller.name} {seller.email ? `(${seller.email})` : ''}
                  </Option>
                ))}
              </Select>

              {/* Month Filter */}
              <Select
                style={{ width: 140 }}
                value={selectedMonth.format('YYYY-MM')}
                onChange={(val) => {
                  const newMonth = dayjs(val);
                  setSelectedMonth(newMonth);
                  onChange(newMonth); // Sync with calendar
                }}
              >
                {Array.from({ length: 12 }, (_, i) => {
                  const month = dayjs().year(dayjs().year()).month(i);
                  return (
                    <Option key={i} value={month.format('YYYY-MM')}>
                      {month.format('MMMM YYYY')}
                    </Option>
                  );
                })}
              </Select>

              <Button 
                icon={<ReloadOutlined />} 
                onClick={resetFilters}
                title="Reset Filters"
              >
                Reset
              </Button>

           
            </Space>
          </Col>
        </Row>
      </div>
    );
  };

  return (
    <div className="calendar-container">
      <Card className="mb-4">
        <Title level={5}>
          <FilterOutlined /> Filtered Meetings ({filteredMeetings.length})
        </Title>
      </Card>

      <Card bordered={false} bodyStyle={{ padding: 0 }}>
        <Calendar 
          dateCellRender={dateCellRender} 
          monthCellRender={monthCellRender}
          headerRender={calendarHeader}
          mode="month"
          value={selectedMonth}
          onChange={setSelectedMonth}
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
        `}
      </style>
    </div>
  );
};

export default MeetingCalendar;