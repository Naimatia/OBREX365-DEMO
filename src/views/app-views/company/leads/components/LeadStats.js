import React from 'react';
import { Row, Col, Card, Statistic, Button, Progress } from 'antd';
import {
  TeamOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  RiseOutlined,
  PhoneOutlined,
  StarOutlined,
  DeleteOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { LeadStatus, LeadStatusColors, LeadStatusLabels } from 'models/LeadModel';

const LeadStats = ({ leads = [], loading = false, onShowDetailStats }) => {
  const totalLeads = leads.length;
  
  // Calculate stats based on new status values
  const newLeads = leads.filter(l => l.status === LeadStatus.NEW).length;
  const contactedLeads = leads.filter(l => l.status === LeadStatus.CONTACTED).length;
  const interestedLeads = leads.filter(l => l.status === LeadStatus.INTERESTED).length;
  const notInterestedLeads = leads.filter(l => l.status === LeadStatus.NOT_INTERESTED).length;
  const convertedLeads = leads.filter(l => l.status === LeadStatus.CONVERTED).length;
  const junkLeads = leads.filter(l => l.status === LeadStatus.JUNK_LEAD).length;
  
  // Calculate conversion rate (interested + converted) / total
  const qualifiedLeads = interestedLeads + convertedLeads;
  const conversionRate = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;
  
  // Calculate contact rate (contacted + interested + converted) / total
  const contactedCount = contactedLeads + interestedLeads + convertedLeads;
  const contactRate = totalLeads > 0 ? Math.round((contactedCount / totalLeads) * 100) : 0;

  const stats = [
    {
      key: 'total',
      title: 'Total Leads',
      value: totalLeads,
      icon: <TeamOutlined />,
      color: '#1677ff',
      bg: '#e6f4ff',
      progress: 100,
      progressColor: '#1677ff',
    },
    {
      key: 'new',
      title: 'New',
      value: newLeads,
      icon: <ClockCircleOutlined />,
      color: '#1677ff',
      bg: '#e6f4ff',
      progress: totalLeads ? Math.round((newLeads / totalLeads) * 100) : 0,
      progressColor: '#1677ff',
    },
    {
      key: 'contacted',
      title: 'Contacted',
      value: contactedLeads,
      icon: <PhoneOutlined />,
      color: '#fa8c16',
      bg: '#fff7e6',
      progress: totalLeads ? Math.round((contactedLeads / totalLeads) * 100) : 0,
      progressColor: '#fa8c16',
    },
    {
      key: 'interested',
      title: 'Interested',
      value: interestedLeads,
      icon: <StarOutlined />,
      color: '#52c41a',
      bg: '#f6ffed',
      progress: totalLeads ? Math.round((interestedLeads / totalLeads) * 100) : 0,
      progressColor: '#52c41a',
    },
    {
      key: 'converted',
      title: 'Converted',
      value: convertedLeads,
      icon: <CheckCircleOutlined />,
      color: '#722ed1',
      bg: '#f9f0ff',
      progress: totalLeads ? Math.round((convertedLeads / totalLeads) * 100) : 0,
      progressColor: '#722ed1',
    },
    {
      key: 'not_interested',
      title: 'Not Interested',
      value: notInterestedLeads,
      icon: <CloseCircleOutlined />,
      color: '#ff4d4f',
      bg: '#fff2f0',
      progress: totalLeads ? Math.round((notInterestedLeads / totalLeads) * 100) : 0,
      progressColor: '#ff4d4f',
    },
    {
      key: 'junk',
      title: 'Junk',
      value: junkLeads,
      icon: <DeleteOutlined />,
      color: '#8c8c8c',
      bg: '#f5f5f5',
      progress: totalLeads ? Math.round((junkLeads / totalLeads) * 100) : 0,
      progressColor: '#8c8c8c',
    },
  ];

  // Primary stats (first 4 cards)
  const primaryStats = stats.slice(0, 4);
  
  // Secondary stats (remaining cards)
  const secondaryStats = stats.slice(4);

  return (
    <>
      {/* Primary Stats Row */}
      <Row gutter={[12, 12]}>
        {primaryStats.map(stat => (
          <Col key={stat.key} xs={12} sm={12} md={6} lg={6}>
            <Card
              loading={loading}
              bordered={false}
              style={{
                borderRadius: 12,
                background: stat.bg,
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                height: '100%',
                transition: 'transform 0.2s',
              }}
              bodyStyle={{ padding: '16px 20px' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4, fontWeight: 500 }}>
                    {stat.title}
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: stat.color, lineHeight: 1.1 }}>
                    {stat.value}
                  </div>
                </div>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: stat.color + '22',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    color: stat.color,
                    flexShrink: 0,
                  }}
                >
                  {stat.icon}
                </div>
              </div>
              <Progress
                percent={stat.progress}
                showInfo={false}
                strokeColor={stat.color}
                trailColor={stat.color + '22'}
                strokeWidth={4}
                style={{ marginTop: 10, marginBottom: 0 }}
              />
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                {stat.progress}% of total
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Secondary Stats Row - Hidden on mobile, visible on larger screens */}
      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        {secondaryStats.map(stat => (
          <Col key={stat.key} xs={24} sm={12} md={6} lg={4}>
            <Card
              loading={loading}
              bordered={false}
              style={{
                borderRadius: 12,
                background: stat.bg,
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                height: '100%',
              }}
              bodyStyle={{ padding: '12px 16px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: stat.color + '22',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    color: stat.color,
                    flexShrink: 0,
                  }}
                >
                  {stat.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: '#8c8c8c', fontWeight: 500 }}>
                    {stat.title}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: stat.color }}>
                    {stat.value}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#aaa' }}>
                  {stat.progress}%
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Metrics & Actions Row */}
      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        <Col xs={24} sm={24} md={24} lg={24}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              background: '#fafafa',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}
            bodyStyle={{ padding: '12px 20px' }}
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              flexWrap: 'wrap', 
              gap: 8 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <RiseOutlined style={{ color: '#52c41a' }} />
                  <span style={{ fontSize: 13, color: '#595959' }}>
                    Conversion Rate: <strong style={{ color: '#52c41a' }}>{conversionRate}%</strong>
                    <span style={{ fontSize: 11, color: '#8c8c8c', marginLeft: 4 }}>
                      ({qualifiedLeads} qualified)
                    </span>
                  </span>
                </div>
                <div style={{ width: 1, height: 20, background: '#e8e8e8' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <PhoneOutlined style={{ color: '#fa8c16' }} />
                  <span style={{ fontSize: 13, color: '#595959' }}>
                    Contact Rate: <strong style={{ color: '#fa8c16' }}>{contactRate}%</strong>
                    <span style={{ fontSize: 11, color: '#8c8c8c', marginLeft: 4 }}>
                      ({contactedCount} contacted)
                    </span>
                  </span>
                </div>
                <div style={{ width: 1, height: 20, background: '#e8e8e8' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <DeleteOutlined style={{ color: '#8c8c8c' }} />
                  <span style={{ fontSize: 13, color: '#595959' }}>
                    Junk: <strong style={{ color: '#8c8c8c' }}>{junkLeads}</strong>
                    <span style={{ fontSize: 11, color: '#8c8c8c', marginLeft: 4 }}>
                      ({totalLeads ? Math.round((junkLeads / totalLeads) * 100) : 0}%)
                    </span>
                  </span>
                </div>
              </div>
              {/* 
              <Button
                type="primary"
                icon={<BarChartOutlined />}
                onClick={onShowDetailStats}
                style={{ borderRadius: 8 }}
              >
                View Details
              </Button>
              */}
            </div>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default LeadStats;