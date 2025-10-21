import React, { useMemo } from 'react';
import { Card, Row, Col, Statistic, Progress } from 'antd';
import { DollarOutlined, CheckCircleOutlined, ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { InvoiceStatus } from 'models/InvoiceModel';

/**
 * Component for displaying invoice statistics
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
        paidPercentage: 0
      };
    }

    const currentYear = new Date().getFullYear();
    const thisYearInvoices = invoices.filter(invoice => 
      new Date(invoice.CreationDate?.toDate()).getFullYear() === currentYear
    );

    const total = thisYearInvoices.length;
    
    const paid = thisYearInvoices.filter(invoice => 
      invoice.Status === InvoiceStatus.PAID
    ).length;
    
    const pending = thisYearInvoices.filter(invoice => 
      invoice.Status === InvoiceStatus.PENDING
    ).length;
    
    const missed = thisYearInvoices.filter(invoice => 
      invoice.Status === InvoiceStatus.MISSED
    ).length;

    const totalAmount = thisYearInvoices.reduce(
      (sum, invoice) => sum + Number(invoice.amount || 0), 
      0
    );

    const paidAmount = thisYearInvoices
      .filter(invoice => invoice.Status === InvoiceStatus.PAID)
      .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);

    const pendingAmount = thisYearInvoices
      .filter(invoice => invoice.Status === InvoiceStatus.PENDING)
      .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);

    const paidPercentage = total > 0 
      ? Math.round((paid / total) * 100) 
      : 0;

    return {
      total,
      paid,
      pending,
      missed,
      totalAmount,
      paidAmount,
      pendingAmount,
      paidPercentage
    };
  }, [invoices]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} md={6}>
        <Card loading={loading}>
          <Statistic
            title="Total Invoices (This Year)"
            value={stats.total}
            prefix={<DollarOutlined />}
          />
          <div className="mt-3">
            <Progress 
              percent={100} 
              status="active" 
              size={5} 
              showInfo={false} 
            />
          </div>
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card loading={loading}>
          <Statistic
            title="Paid Invoices"
            value={stats.paid}
            prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            valueStyle={{ color: '#52c41a' }}
          />
          <div className="mt-3">
            <Progress 
              percent={stats.paidPercentage} 
              strokeColor="#52c41a" 
              size={5} 
            />
          </div>
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card loading={loading}>
          <Statistic
            title="Pending Invoices"
            value={stats.pending}
            prefix={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
            valueStyle={{ color: '#1890ff' }}
          />
          <div className="mt-3">
            <Progress 
              percent={stats.pending > 0 ? Math.round((stats.pending / stats.total) * 100) : 0} 
              strokeColor="#1890ff" 
              size={5} 
            />
          </div>
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card loading={loading}>
          <Statistic
            title="Missed Invoices"
            value={stats.missed}
            prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />}
            valueStyle={{ color: '#ff4d4f' }}
          />
          <div className="mt-3">
            <Progress 
              percent={stats.missed > 0 ? Math.round((stats.missed / stats.total) * 100) : 0} 
              strokeColor="#ff4d4f" 
              size={5} 
            />
          </div>
        </Card>
      </Col>
      <Col xs={24} sm={12} md={8}>
        <Card loading={loading}>
          <Statistic
            title="Total Amount"
            value={formatCurrency(stats.totalAmount)}
            valueStyle={{ color: '#6c757d' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={8}>
        <Card loading={loading}>
          <Statistic
            title="Paid Amount"
            value={formatCurrency(stats.paidAmount)}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={8}>
        <Card loading={loading}>
          <Statistic
            title="Pending Amount"
            value={formatCurrency(stats.pendingAmount)}
            valueStyle={{ color: '#1890ff' }}
          />
        </Card>
      </Col>
    </Row>
  );
};

export default InvoiceStats;
