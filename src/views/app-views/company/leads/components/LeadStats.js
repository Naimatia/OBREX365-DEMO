import React from 'react';
import { Row, Col, Card, Statistic, Button, Progress } from 'antd';
import {
  TeamOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import { LeadStatus } from 'models/LeadModel';

const LeadStats = ({ leads = [], loading = false, onShowDetailStats }) => {
  const totalLeads   = leads.length;
  const pendingLeads = leads.filter(l => l.status === LeadStatus.PENDING).length;
  const gainLeads    = leads.filter(l => l.status === LeadStatus.GAIN).length;
  const lossLeads    = leads.filter(l => l.status === LeadStatus.LOSS).length;
  const winRate      = totalLeads > 0 ? Math.round((gainLeads / totalLeads) * 100) : 0;

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
      key: 'pending',
      title: 'Pending',
      value: pendingLeads,
      icon: <ClockCircleOutlined />,
      color: '#faad14',
      bg: '#fffbe6',
      progress: totalLeads ? Math.round((pendingLeads / totalLeads) * 100) : 0,
      progressColor: '#faad14',
    },
    {
      key: 'gain',
      title: 'Gained',
      value: gainLeads,
      icon: <CheckCircleOutlined />,
      color: '#52c41a',
      bg: '#f6ffed',
      progress: totalLeads ? Math.round((gainLeads / totalLeads) * 100) : 0,
      progressColor: '#52c41a',
    },
    {
      key: 'loss',
      title: 'Lost',
      value: lossLeads,
      icon: <CloseCircleOutlined />,
      color: '#ff4d4f',
      bg: '#fff2f0',
      progress: totalLeads ? Math.round((lossLeads / totalLeads) * 100) : 0,
      progressColor: '#ff4d4f',
    },
  ];

  return (
    <Row gutter={[12, 12]} align="middle">
      {stats.map(stat => (
        <Col key={stat.key} xs={12} sm={12} md={6} lg={6}>
          <Card
            loading={loading}
            bordered={false}
            style={{
              borderRadius: 12,
              background: stat.bg,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              height: '100%',
            }}
            bodyStyle={{ padding: '16px 20px' }}
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

      {/* Win Rate + Stats Button row */}
      <Col xs={24} sm={24} md={24} lg={24}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RiseOutlined style={{ color: '#52c41a' }} />
            <span style={{ fontSize: 13, color: '#595959' }}>
              Win rate: <strong style={{ color: '#52c41a' }}>{winRate}%</strong>
            </span>
          </div>
          <Button
            type="primary"
            icon={<BarChartOutlined />}
            onClick={onShowDetailStats}
            style={{ borderRadius: 8 }}
          >
            View Details
          </Button>
        </div>
      </Col>
    </Row>
  );
};

export default LeadStats;