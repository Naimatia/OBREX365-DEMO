import React, { useMemo } from 'react';
import { Card, Row, Col, Statistic, Progress, Space, Typography } from 'antd';
import { 
  DollarOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  WarningOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { InvoiceStatus } from 'models/InvoiceModel';

const { Text } = Typography;

/**
 * Component for displaying invoice statistics based on filtered invoices
 */
const InvoiceStats = ({ invoices, loading }) => {
  const stats = useMemo(() => {
    if (!invoices?.length) {
      return {
        total: 0,
        paid: 0,
        pending: 0,
        missed: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        paidPercentage: 0,
        pendingPercentage: 0,
        missedPercentage: 0,
        paidThisMonth: 0,
      paidThisYear: 0,
      };
    }

    const total = invoices.length;
    
    const paid = invoices.filter(inv => inv.Status === InvoiceStatus.PAID).length;
    const pending = invoices.filter(inv => inv.Status === InvoiceStatus.PENDING).length;
    const missed = invoices.filter(inv => inv.Status === InvoiceStatus.MISSED).length;
    
    const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
    const paidAmount = invoices
      .filter(inv => inv.Status === InvoiceStatus.PAID)
      .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
    const pendingAmount = invoices
      .filter(inv => inv.Status === InvoiceStatus.PENDING)
      .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

    const paidPercentage = total > 0 ? Math.round((paid / total) * 100) : 0;
    const pendingPercentage = total > 0 ? Math.round((pending / total) * 100) : 0;
    const missedPercentage = total > 0 ? Math.round((missed / total) * 100) : 0;
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Calculate paid invoices based on payment date
  const paidThisMonth = invoices.filter(inv => {
    if (inv.Status !== InvoiceStatus.PAID || !inv.paymentDate) return false;
    const paymentDate = inv.paymentDate?.toDate?.() || new Date(inv.paymentDate);
    return paymentDate.getMonth() === currentMonth && 
           paymentDate.getFullYear() === currentYear;
  }).length;

  const paidThisYear = invoices.filter(inv => {
    if (inv.Status !== InvoiceStatus.PAID || !inv.paymentDate) return false;
    const paymentDate = inv.paymentDate?.toDate?.() || new Date(inv.paymentDate);
    return paymentDate.getFullYear() === currentYear;
  }).length;

    return {
      total,
      paid,
      pending,
      missed,
      totalAmount,
      paidAmount,
      pendingAmount,
      paidPercentage,
      pendingPercentage,
      missedPercentage,
       paidThisMonth,
    paidThisYear,
    };
  }, [invoices]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  return (
    <>
      {/* Status Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card loading={loading} style={{ height: '100%', background: '#f6ffed', borderColor: '#b7eb8f' }}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                <Text strong style={{ fontSize: 14 }}>Paid Invoices</Text>
              </Space>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: '#52c41a' }}>
                  {stats.paid}
                </span>
                <span style={{ fontSize: 16, color: '#52c41a', fontWeight: 600 }}>
                  {stats.paidPercentage}%
                </span>
              </div>
              <Progress 
                percent={stats.paidPercentage} 
                strokeColor="#52c41a" 
                size="small"
                showInfo={false}
              />
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loading} style={{ height: '100%', background: '#e6f7ff', borderColor: '#91d5ff' }}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Space>
                <ClockCircleOutlined style={{ color: '#1890ff', fontSize: 20 }} />
                <Text strong style={{ fontSize: 14 }}>Pending Invoices</Text>
              </Space>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: '#1890ff' }}>
                  {stats.pending}
                </span>
                <span style={{ fontSize: 16, color: '#1890ff', fontWeight: 600 }}>
                  {stats.pendingPercentage}%
                </span>
              </div>
              <Progress 
                percent={stats.pendingPercentage} 
                strokeColor="#1890ff" 
                size="small"
                showInfo={false}
              />
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loading} style={{ height: '100%', background: '#fff2e8', borderColor: '#ffccc7' }}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Space>
                <WarningOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
                <Text strong style={{ fontSize: 14 }}>Missed Invoices</Text>
              </Space>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: '#ff4d4f' }}>
                  {stats.missed}
                </span>
                <span style={{ fontSize: 16, color: '#ff4d4f', fontWeight: 600 }}>
                  {stats.missedPercentage}%
                </span>
              </div>
              <Progress 
                percent={stats.missedPercentage} 
                strokeColor="#ff4d4f" 
                size="small"
                showInfo={false}
              />
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Amount Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card loading={loading} style={{ height: '100%' }}>
            <Statistic
              title="Total Amount"
              value={formatCurrency(stats.totalAmount)}
              prefix={<DollarOutlined />}
              valueStyle={{ fontSize: 24 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loading} style={{ height: '100%', background: '#f6ffed', borderColor: '#b7eb8f' }}>
            <Statistic
              title="Paid Amount"
              value={formatCurrency(stats.paidAmount)}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a', fontSize: 24 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loading} style={{ height: '100%', background: '#e6f7ff', borderColor: '#91d5ff' }}>
            <Statistic
              title="Pending Amount"
              value={formatCurrency(stats.pendingAmount)}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff', fontSize: 24 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Summary Row */}
      <Row style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card loading={loading} style={{ background: '#fafafa' }}>
            <Space size={24} wrap>
              <Space>
                <FileTextOutlined style={{ color: '#1890ff' }} />
                <Text>Total Invoices: <strong>{stats.total}</strong></Text>
              </Space>
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <Text>Paid: <strong>{stats.paid}</strong></Text>
              </Space>
              <Space>
                <ClockCircleOutlined style={{ color: '#1890ff' }} />
                <Text>Pending: <strong>{stats.pending}</strong></Text>
              </Space>
              <Space>
                <WarningOutlined style={{ color: '#ff4d4f' }} />
                <Text>Missed: <strong>{stats.missed}</strong></Text>
              </Space>
            </Space>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default InvoiceStats;