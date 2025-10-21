import React from 'react';
import { Row, Col, Card, Statistic, Button } from 'antd';
import { 
  TeamOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  ClockCircleOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { LeadStatus } from 'models/LeadModel';

/**
 * Component for displaying lead statistics summary
 */
const LeadStats = ({ 
  leads = [], 
  loading = false, 
  onShowDetailStats 
}) => {
  // Calculate statistics
  const totalLeads = leads.length;
  const pendingLeads = leads.filter(lead => lead.status === LeadStatus.PENDING).length;
  const gainLeads = leads.filter(lead => lead.status === LeadStatus.GAIN).length;
  const lossLeads = leads.filter(lead => lead.status === LeadStatus.LOSS).length;
  
  return (
    <Row gutter={16}>
      <Col xs={24} sm={12} md={6}>
        <Card className="lead-stat-card" loading={loading}>
          <Statistic 
            title="Total Leads"
            value={totalLeads}
            prefix={<TeamOutlined />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Card>
      </Col>
      
      <Col xs={24} sm={12} md={6}>
        <Card className="lead-stat-card" loading={loading}>
          <Statistic 
            title="Pending Leads"
            value={pendingLeads}
            prefix={<ClockCircleOutlined />}
            valueStyle={{ color: '#faad14' }}
          />
        </Card>
      </Col>
      
      <Col xs={24} sm={12} md={6}>
        <Card className="lead-stat-card" loading={loading}>
          <Statistic 
            title="Gained Leads"
            value={gainLeads}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
      </Col>
      
      <Col xs={24} sm={12} md={6}>
        <Card className="lead-stat-card" loading={loading}>
          <div className="d-flex justify-content-between align-items-center">
            <Statistic 
              title="Lost Leads"
              value={lossLeads}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
            <Button 
              type="primary"
              icon={<BarChartOutlined />}
              onClick={onShowDetailStats}
              className="ml-3"
            >
              Stats
            </Button>
          </div>
        </Card>
      </Col>
    </Row>
  );
};

export default LeadStats;
