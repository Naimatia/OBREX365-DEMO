// @ts-nocheck
import React, { useEffect, useState } from 'react';
import {
  Drawer, Descriptions, Tag, Timeline, Card, Typography, Divider,
  Button, Row, Col, Statistic, Avatar, Space, Empty, List, Badge, Spin, Tooltip
} from 'antd';
import {
  UserOutlined, CalendarOutlined, PhoneOutlined, MailOutlined,
  DollarOutlined, ClockCircleOutlined, EditOutlined, IdcardOutlined,
  BankOutlined, TeamOutlined, GlobalOutlined, ShopOutlined,
  EnvironmentOutlined, HomeOutlined, SafetyCertificateOutlined,
  ApartmentOutlined, CheckCircleOutlined, GiftOutlined, TrophyOutlined
} from '@ant-design/icons';
import moment from 'moment';

const { Text, Title } = Typography;

const EmployeeDetail = ({ visible, onClose, employee, vacations, onEdit }) => {
  const [activeVacations, setActiveVacations] = useState([]);
  const [pastVacations, setPastVacations] = useState([]);
  const [futureVacations, setFutureVacations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && employee && vacations) {
      setLoading(true);
      
      // Filter vacations related to this employee
      const employeeVacations = vacations.filter(v => v.employee_id === employee.id);
      
      // Sort and categorize vacations
      const now = new Date();
      const active = [];
      const past = [];
      const future = [];
      
      employeeVacations.forEach(vacation => {
        const startDate = vacation.StartDate.toDate();
        const endDate = vacation.EndDate.toDate();
        
        if (startDate <= now && endDate >= now) {
          active.push(vacation);
        } else if (endDate < now) {
          past.push(vacation);
        } else if (startDate > now) {
          future.push(vacation);
        }
      });
      
      // Sort by date
      active.sort((a, b) => b.StartDate.toDate() - a.StartDate.toDate());
      past.sort((a, b) => b.EndDate.toDate() - a.EndDate.toDate());
      future.sort((a, b) => a.StartDate.toDate() - b.StartDate.toDate());
      
      setActiveVacations(active);
      setPastVacations(past);
      setFutureVacations(future);
      setLoading(false);
    }
  }, [visible, employee, vacations]);

  if (!employee) {
    return null;
  }

  // Calculate employee metrics
  const calculateMetrics = () => {
    const joinDate = employee.JoiningDate?.toDate();
    const now = new Date();
    
    let tenureYears = 0;
    let tenureMonths = 0;
    
    if (joinDate) {
      const diffTime = Math.abs(now - joinDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      tenureYears = Math.floor(diffDays / 365);
      tenureMonths = Math.floor((diffDays % 365) / 30);
    }
    
    // Calculate vacation days taken this year
    const currentYear = now.getFullYear();
    const vacationDaysThisYear = pastVacations
      .filter(v => {
        const endYear = v.EndDate.toDate().getFullYear();
        return endYear === currentYear;
      })
      .reduce((total, v) => {
        const start = v.StartDate.toDate();
        const end = v.EndDate.toDate();
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include start day
        return total + diffDays;
      }, 0);
    
    return {
      tenureYears,
      tenureMonths,
      vacationDaysThisYear
    };
  };

  const metrics = calculateMetrics();

  // Format vacation period
  const formatVacationPeriod = (vacation) => {
    const startDate = moment(vacation.StartDate.toDate()).format('MMM DD, YYYY');
    const endDate = moment(vacation.EndDate.toDate()).format('MMM DD, YYYY');
    const diffDays = moment(vacation.EndDate.toDate()).diff(moment(vacation.StartDate.toDate()), 'days') + 1;
    
    return `${startDate} - ${endDate} (${diffDays} days)`;
  };

  // Get status tag color
  const getStatusColor = (status) => {
    switch(status) {
      case 'Working':
        return 'green';
      case 'Vacation':
        return 'orange';
      default:
        return 'default';
    }
  };

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar 
            size={40} 
            icon={<UserOutlined />} 
            style={{ 
              backgroundColor: '#1890ff', 
              marginRight: 12,
              boxShadow: '0 2px 8px rgba(24, 144, 255, 0.35)'
            }} 
          />
          <div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{employee.name}</div>
            <div style={{ fontSize: 13, color: '#888' }}>{employee.Role}</div>
          </div>
        </div>
      }
      placement="right"
      closable={true}
      onClose={onClose}
      open={visible}
      width={800}
      headerStyle={{ 
        padding: '16px 24px',
        borderBottom: '1px solid #f0f0f0',
        background: 'linear-gradient(to right, #f6f6f6, #ffffff)'
      }}
      footer={
        <div style={{ textAlign: 'right', padding: '12px 0' }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Close
          </Button>
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            onClick={() => onEdit(employee)}
            style={{ backgroundColor: '#1890ff', borderColor: '#1890ff' }}
          >
            Edit Employee
          </Button>
        </div>
      }
    >
      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card>
              <Row align="middle" gutter={16}>
                <Col xs={24} sm={4} md={3}>
                  <Avatar size={80} icon={<UserOutlined />} />
                </Col>
                <Col xs={24} sm={20} md={21}>
                  <Title level={3} style={{ marginBottom: 0 }}>{employee.name}</Title>
                  <Text type="secondary">{employee.Role}</Text>
                  <div style={{ marginTop: 8 }}>
                    <Tag color={getStatusColor(employee.Status)}>{employee.Status}</Tag>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card>
              <Statistic 
                title="Tenure" 
                value={metrics.tenureYears > 0 ? `${metrics.tenureYears}y ${metrics.tenureMonths}m` : `${metrics.tenureMonths} months`} 
                prefix={<ClockCircleOutlined />} 
              />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card>
              <Statistic 
                title="Vacation Days (This Year)" 
                value={metrics.vacationDaysThisYear}
                prefix={<CalendarOutlined />} 
              />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card>
              <Statistic 
                title="Monthly Salary" 
                value={`AED ${employee.Salary?.toLocaleString() || '0'}`}
                prefix={<DollarOutlined />} 
              />
            </Card>
          </Col>
        </Row>

        <Divider orientation="left">Employee Information</Divider>
        <Row gutter={[16, 16]} className="info-card-row">
          <Col xs={24} sm={12} md={8} lg={8}>
            <Card className="info-card" hoverable>
              <Row align="middle" gutter={16}>
                <Col span={6}>
                  <Avatar size={48} icon={<MailOutlined />} style={{ backgroundColor: '#1890ff' }} />
                </Col>
                <Col span={18}>
                  <div className="info-title">Email</div>
                  <div className="info-content">
                    <Text copyable>{employee.email || 'Not provided'}</Text>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
          
          <Col xs={24} sm={12} md={8} lg={8}>
            <Card className="info-card" hoverable>
              <Row align="middle" gutter={16}>
                <Col span={6}>
                  <Avatar size={48} icon={<PhoneOutlined />} style={{ backgroundColor: '#52c41a' }} />
                </Col>
                <Col span={18}>
                  <div className="info-title">Phone Number</div>
                  <div className="info-content">
                    <Text copyable>{employee.phoneNumber || 'Not provided'}</Text>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
          
          <Col xs={24} sm={12} md={8} lg={8}>
            <Card className="info-card" hoverable>
              <Row align="middle" gutter={16}>
                <Col span={6}>
                  <Avatar size={48} icon={<IdcardOutlined />} style={{ backgroundColor: '#722ed1' }} />
                </Col>
                <Col span={18}>
                  <div className="info-title">Role</div>
                  <div className="info-content">
                    <Tag color="purple" style={{ fontSize: '14px', padding: '4px 8px' }}>{employee.Role || 'Not assigned'}</Tag>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
          
          <Col xs={24} sm={12} md={8} lg={8}>
            <Card className="info-card" hoverable>
              <Row align="middle" gutter={16}>
                <Col span={6}>
                  <Avatar size={48} icon={<SafetyCertificateOutlined />} style={{ backgroundColor: '#fa541c' }} />
                </Col>
                <Col span={18}>
                  <div className="info-title">Status</div>
                  <div className="info-content">
                    <Tag color={getStatusColor(employee.Status)} style={{ fontSize: '14px', padding: '4px 8px' }}>
                      {employee.Status || 'Unknown'}
                    </Tag>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
          
          <Col xs={24} sm={12} md={8} lg={8}>
            <Card className="info-card" hoverable>
              <Row align="middle" gutter={16}>
                <Col span={6}>
                  <Avatar size={48} icon={<CalendarOutlined />} style={{ backgroundColor: '#13c2c2' }} />
                </Col>
                <Col span={18}>
                  <div className="info-title">Joining Date</div>
                  <div className="info-content">
                    {employee.JoiningDate ? 
                      moment(employee.JoiningDate.toDate()).format('MMM DD, YYYY') : 
                      'Not set'}
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
          
          <Col xs={24} sm={12} md={8} lg={8}>
            <Card className="info-card" hoverable>
              <Row align="middle" gutter={16}>
                <Col span={6}>
                  <Avatar size={48} icon={<BankOutlined />} style={{ backgroundColor: '#eb2f96' }} />
                </Col>
                <Col span={18}>
                  <div className="info-title">Salary Day</div>
                  <div className="info-content">
                    Day {employee.DateSalary || '1'} of month
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
          
          <Col xs={24} sm={12} md={8} lg={8}>
            <Card className="info-card" hoverable>
              <Row align="middle" gutter={16}>
                <Col span={6}>
                  <Avatar size={48} icon={<ApartmentOutlined />} style={{ backgroundColor: '#faad14' }} />
                </Col>
                <Col span={18}>
                  <div className="info-title">Department</div>
                  <div className="info-content">
                    {employee.Department || 'Not assigned'}
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
          
          <Col xs={24} sm={12} md={8} lg={8}>
            <Card className="info-card" hoverable>
              <Row align="middle" gutter={16}>
                <Col span={6}>
                  <Avatar size={48} icon={<TeamOutlined />} style={{ backgroundColor: '#7cb305' }} />
                </Col>
                <Col span={18}>
                  <div className="info-title">Team</div>
                  <div className="info-content">
                    {employee.Team || 'Not assigned'}
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
          
          <Col xs={24} sm={12} md={8} lg={8}>
            <Card className="info-card" hoverable>
              <Row align="middle" gutter={16}>
                <Col span={6}>
                  <Avatar size={48} icon={<ClockCircleOutlined />} style={{ backgroundColor: '#1890ff' }} />
                </Col>
                <Col span={18}>
                  <div className="info-title">Last Updated</div>
                  <div className="info-content">
                    {employee.LastUpdate ? 
                      moment(employee.LastUpdate.toDate()).format('MMM DD, YYYY') : 
                      'Not available'}
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        <Divider orientation="left">
          <Space>
            <GiftOutlined style={{ fontSize: '18px', color: '#1890ff' }} />
            <span>Current & Upcoming Vacations</span>
          </Space>
        </Divider>
        
        {activeVacations.length === 0 && futureVacations.length === 0 ? (
          <Empty 
            description="No current or upcoming vacations" 
            image={Empty.PRESENTED_IMAGE_SIMPLE} 
          />
        ) : (
          <div className="vacation-timeline-container">
            <Timeline mode="left">
              {activeVacations.map(vacation => (
                <Timeline.Item 
                  key={vacation.id}
                  color="green"
                  label={<Badge status="processing" text={<Tag color="green">ACTIVE</Tag>} />}
                >
                  <Card 
                    size="small" 
                    className="vacation-card" 
                    style={{ 
                      backgroundColor: '#f6ffed', 
                      borderColor: '#b7eb8f',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.09)'
                    }}
                    hoverable
                  >
                    <div className="vacation-title">
                      <CalendarOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
                      <strong>{formatVacationPeriod(vacation)}</strong>
                    </div>
                    <div className="vacation-reason">
                      <span style={{ color: '#888' }}>Reason:</span> {vacation.Cause || 'No reason provided'}
                    </div>
                  </Card>
                </Timeline.Item>
              ))}
              {futureVacations.map(vacation => (
                <Timeline.Item 
                  key={vacation.id}
                  color="blue"
                  label={<Badge status="default" text={<Tag color="blue">UPCOMING</Tag>} />}
                >
                  <Card 
                    size="small" 
                    className="vacation-card" 
                    style={{ 
                      backgroundColor: '#e6f7ff', 
                      borderColor: '#91d5ff',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.09)'
                    }}
                    hoverable
                  >
                    <div className="vacation-title">
                      <CalendarOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                      <strong>{formatVacationPeriod(vacation)}</strong>
                    </div>
                    <div className="vacation-reason">
                      <span style={{ color: '#888' }}>Reason:</span> {vacation.Cause || 'No reason provided'}
                    </div>
                  </Card>
                </Timeline.Item>
              ))}
            </Timeline>
          </div>
        )}

        <Divider orientation="left">
          <Space>
            <TrophyOutlined style={{ fontSize: '18px', color: '#722ed1' }} />
            <span>Vacation History</span>
          </Space>
        </Divider>
        
        {pastVacations.length === 0 ? (
          <Empty 
            description="No vacation history" 
            image={Empty.PRESENTED_IMAGE_SIMPLE} 
          />
        ) : (
          <List
            className="vacation-history-list"
            itemLayout="horizontal"
            dataSource={pastVacations}
            renderItem={vacation => (
              <List.Item>
                <Card 
                  className="vacation-history-card"
                  hoverable 
                  style={{ 
                    width: '100%',
                    borderRadius: '8px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    marginBottom: '8px',
                    backgroundColor: '#f9f9f9'
                  }}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        icon={<CalendarOutlined />} 
                        style={{ 
                          backgroundColor: '#d3adf7', 
                          color: '#722ed1',
                        }} 
                      />
                    }
                    title={
                      <span style={{ fontWeight: 500, color: '#333' }}>
                        {formatVacationPeriod(vacation)}
                      </span>
                    }
                    description={
                      <div>
                        <Text type="secondary">Reason: </Text> 
                        {vacation.Cause || 'No reason provided'}
                      </div>
                    }
                  />
                </Card>
              </List.Item>
            )}
          />
        )}
      </Spin>
    </Drawer>
  );
};

export default EmployeeDetail;
