import React, { useState, useEffect } from 'react';
import { Drawer, Row, Col, Card, Typography, Select, DatePicker, Radio, Empty, Spin, Statistic } from 'antd';
import { Pie, Column } from '@ant-design/plots';
import moment from 'moment';
import { InvoiceStatus } from 'models/InvoiceModel';
import InvoiceChart from './InvoiceChart';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

/**
 * Drawer component to display detailed invoice statistics and charts
 * @param {Object} props Component props
 * @param {boolean} props.visible Whether the drawer is visible
 * @param {React.MouseEventHandler} props.onClose Function to close the drawer
 * @param {Array} props.invoices Array of invoice data
 */
const InvoiceStatsDrawer = ({ visible, onClose, invoices = [] }) => {
  const [loading, setLoading] = useState(false);
  const [filterYear, setFilterYear] = useState(moment().year());
  const [filterPeriod, setFilterPeriod] = useState('year');
  const [dateRange, setDateRange] = useState([
    moment().startOf('year'),
    moment().endOf('year')
  ]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);

  // Generate years for filter dropdown (current year and 2 years back)
  const currentYear = moment().year();
  const years = [currentYear, currentYear - 1, currentYear - 2];

  useEffect(() => {
    if (invoices.length > 0) {
      setLoading(true);
      
      // Apply date range filtering
      const start = dateRange[0].startOf('day');
      const end = dateRange[1].endOf('day');
      
      const filtered = invoices.filter(invoice => {
        const invoiceDate = moment(invoice.CreationDate?.toDate?.() || invoice.CreationDate);
        return invoiceDate.isBetween(start, end, null, '[]');
      });
      
      setFilteredInvoices(filtered);
      setLoading(false);
    }
  }, [invoices, dateRange]);

  // Handle date range filter changes based on period selection
  const handlePeriodChange = (period) => {
    setFilterPeriod(period);
    let start, end;
    
    switch(period) {
      case 'month':
        start = moment().startOf('month');
        end = moment().endOf('month');
        break;
      case 'quarter':
        start = moment().startOf('quarter');
        end = moment().endOf('quarter');
        break;
      case 'year':
      default:
        start = moment().startOf('year');
        end = moment().endOf('year');
        break;
    }
    
    setDateRange([start, end]);
  };

  // Handle year selection
  const handleYearChange = (year) => {
    setFilterYear(year);
    const start = moment().year(year).startOf('year');
    const end = moment().year(year).endOf('year');
    setDateRange([start, end]);
  };

  // Handle custom date range selection
  const handleDateRangeChange = (dates) => {
    if (dates && dates.length === 2) {
      setDateRange(dates);
      setFilterPeriod('custom');
    }
  };

  // Calculate total amounts by status
  const calculateTotalsByStatus = () => {
    const totals = {};
    let total = 0;
    
    filteredInvoices.forEach(invoice => {
      const status = invoice.Status || 'Unknown';
      const amount = Number(invoice.amount) || 0;
      
      if (!totals[status]) {
        totals[status] = 0;
      }
      
      totals[status] += amount;
      total += amount;
    });
    
    return { totals, total };
  };

  // Prepare data for status distribution pie chart
  const prepareStatusPieData = () => {
    const statusCounts = {};
    
    filteredInvoices.forEach(invoice => {
      const status = invoice.Status || 'Unknown';
      
      if (!statusCounts[status]) {
        statusCounts[status] = 0;
      }
      
      statusCounts[status]++;
    });
    
    return Object.entries(statusCounts).map(([status, count]) => ({
      type: status,
      value: count
    }));
  };

  // Prepare data for monthly invoice amounts chart
  const prepareMonthlyData = () => {
    const monthlyData = {};
    
    // Initialize all months with zero
    for (let i = 0; i < 12; i++) {
      const monthName = moment().month(i).format('MMM');
      monthlyData[monthName] = 0;
    }
    
    filteredInvoices.forEach(invoice => {
      const date = moment(invoice.CreationDate?.toDate?.() || invoice.CreationDate);
      const monthName = date.format('MMM');
      const amount = Number(invoice.amount) || 0;
      
      if (monthlyData[monthName] !== undefined) {
        monthlyData[monthName] += amount;
      }
    });
    
    return Object.entries(monthlyData).map(([month, amount]) => ({
      month,
      amount
    }));
  };

  // Status distribution pie chart config
  const pieConfig = {
    data: prepareStatusPieData(),
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: {
      type: 'outer',
      content: '{name}: {percentage}',
    },
    interactions: [{ type: 'element-active' }],
    legend: {
      layout: 'horizontal',
      position: 'bottom'
    }
  };

  // Monthly amounts column chart config
  const columnConfig = {
    data: prepareMonthlyData(),
    xField: 'month',
    yField: 'amount',
    label: {
      position: 'middle',
      style: {
        fill: '#FFFFFF',
        opacity: 0.6,
      },
    },
    xAxis: {
      label: {
        autoHide: true,
        autoRotate: false,
      },
    },
    meta: {
      amount: {
        alias: 'Amount (AED)',
      },
    },
  };

  // Calculate totals
  const { totals, total } = calculateTotalsByStatus();

  return (
    <Drawer
      title={
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          margin: '-24px -24px 24px -24px',
          padding: '32px 24px',
          color: '#fff',
          borderRadius: '0 0 16px 16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)'
            }}>
              📊
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '4px' }}>
                Invoice Analytics
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>
                Comprehensive insights and statistics
              </div>
            </div>
          </div>
        </div>
      }
      placement="right"
      width={720}
      onClose={onClose}
      open={visible}
      headerStyle={{ border: 'none', padding: 0 }}
      bodyStyle={{ padding: '0 24px 24px 24px' }}
    >
      <Spin spinning={loading}>
        <div className="invoice-stats-filters" style={{ marginBottom: 24 }}>
          <Card 
            bordered={false} 
            className="filter-card"
            style={{
              background: 'linear-gradient(135deg, #f6f9fc 0%, #eef2f7 100%)',
              borderRadius: '16px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
            }}
          >
            <Row gutter={[24, 16]}>
              {/* Time Period Selection */}
              <Col xs={24} md={24} lg={8}>
                <div className="filter-item">
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>Time Period:</Text>
                  <Radio.Group 
                    value={filterPeriod} 
                    onChange={(e) => handlePeriodChange(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <Radio.Button value="month" style={{ width: '33.33%', textAlign: 'center' }}>Month</Radio.Button>
                    <Radio.Button value="quarter" style={{ width: '33.33%', textAlign: 'center' }}>Quarter</Radio.Button>
                    <Radio.Button value="year" style={{ width: '33.33%', textAlign: 'center' }}>Year</Radio.Button>
                  </Radio.Group>
                </div>
              </Col>
              
              {/* Year Selection */}
              <Col xs={24} sm={12} lg={6}>
                <div className="filter-item">
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>Year:</Text>
                  <Select 
                    value={filterYear} 
                    onChange={handleYearChange}
                    style={{ width: '100%' }}
                  >
                    {years.map(year => (
                      <Option key={year} value={year}>{year}</Option>
                    ))}
                  </Select>
                </div>
              </Col>
              
              {/* Custom Date Range */}
              <Col xs={24} sm={12} lg={10}>
                <div className="filter-item">
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>Custom Date Range:</Text>
                  <RangePicker 
                    onChange={handleDateRangeChange} 
                    style={{ width: '100%' }}
                  />
                </div>
              </Col>
            </Row>
          </Card>
        </div>

        {filteredInvoices.length === 0 ? (
          <Empty description="No invoice data available for the selected period" />
        ) : (
          <>
            <Card 
              title={
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>
                  📈 Invoice Summary
                </div>
              }
              style={{ 
                marginBottom: 20,
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
              }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Card 
                    size="small"
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#fff'
                    }}
                    bodyStyle={{ padding: '20px' }}
                  >
                    <Statistic 
                      title={
                        <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px' }}>
                          📋 Total Invoices
                        </span>
                      }
                      value={filteredInvoices.length}
                      precision={0}
                      valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12}>
                  <Card 
                    size="small"
                    style={{
                      background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#8b4513'
                    }}
                    bodyStyle={{ padding: '20px' }}
                  >
                    <Statistic 
                      title={
                        <span style={{ color: '#8b4513', fontSize: '14px', opacity: 0.8 }}>
                          💰 Total Amount
                        </span>
                      }
                      value={total}
                      precision={2}
                      prefix="AED "
                      valueStyle={{ color: '#8b4513', fontSize: '28px', fontWeight: 'bold' }}
                    />
                  </Card>
                </Col>
                {Object.entries(totals).map(([status, amount], index) => {
                  const gradients = [
                    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
                    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
                  ];
                  const colors = ['#2d5a87', '#8b2635', '#8b4513'];
                  const icons = ['⏳', '✅', '❌'];
                  
                  return (
                    <Col xs={24} sm={12} md={8} key={status}>
                      <Card 
                        size="small"
                        style={{
                          background: gradients[index % gradients.length],
                          border: 'none',
                          borderRadius: '12px',
                          color: colors[index % colors.length]
                        }}
                        bodyStyle={{ padding: '16px' }}
                      >
                        <Statistic 
                          title={
                            <span style={{ 
                              color: colors[index % colors.length], 
                              fontSize: '13px', 
                              opacity: 0.8 
                            }}>
                              {icons[index % icons.length]} {status} Invoices
                            </span>
                          }
                          value={amount}
                          precision={2}
                          prefix="AED "
                          valueStyle={{ 
                            color: colors[index % colors.length], 
                            fontSize: '22px', 
                            fontWeight: 'bold' 
                          }}
                        />
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            </Card>

            <Card 
              title={
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>
                  🍩 Invoice Status Distribution
                </div>
              }
              style={{ 
                marginBottom: 20,
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                background: 'linear-gradient(135deg, #fff 0%, #f8fafc 100%)'
              }}
            >
              <div style={{ height: 300, padding: '20px' }}>
                <Pie {...pieConfig} />
              </div>
            </Card>

            <Card 
              title={
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>
                  📈 Invoice Trends by Month
                </div>
              }
              style={{ 
                marginBottom: 20,
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                background: 'linear-gradient(135deg, #fff 0%, #f8fafc 100%)'
              }}
            >
              <div style={{ height: 300, padding: '20px' }}>
                <InvoiceChart 
                  invoices={filteredInvoices}
                  loading={loading}
                  year={filterYear}
                />
              </div>
            </Card>

            <Card 
              title={
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>
                  💹 Monthly Invoice Amounts
                </div>
              }
              style={{
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                background: 'linear-gradient(135deg, #fff 0%, #f8fafc 100%)'
              }}
            >
              <div style={{ height: 300, padding: '20px' }}>
                <Column {...columnConfig} />
              </div>
            </Card>
          </>
        )}
      </Spin>
    </Drawer>
  );
};

export default InvoiceStatsDrawer;
