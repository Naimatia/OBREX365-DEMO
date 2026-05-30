import React, { useState, useEffect } from 'react';
import { 
  Drawer, 
  Row, 
  Col, 
  Card, 
  Select, 
  DatePicker, 
  Space, 
  Divider, 
  Typography, 
  Empty,
  Spin,
  Statistic
} from 'antd';
import { 
  PieChartOutlined, 
  BarChartOutlined, 
  CalendarOutlined,
  TeamOutlined,
  DollarOutlined,
  RiseOutlined
} from '@ant-design/icons';
import { LeadStatus, LeadInterestLevel } from 'models/LeadModel';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';


// Register ChartJS
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
dayjs.extend(isBetween);

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const { Title: TextTitle } = Typography;
const { RangePicker } = DatePicker;

const LeadStatsDrawer = ({ 
  visible, 
  onClose, 
  leads = [], 
  sellers = [],
  loading = false 
}) => {
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [dateRange, setDateRange] = useState(null);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);

  // Filter leads
  useEffect(() => {
    setChartLoading(true);
    let filtered = [...leads];

    // Seller filter
    if (selectedSeller) {
      filtered = filtered.filter(lead => lead.seller_id === selectedSeller);
    }

    // Date range filter
    if (dateRange && dateRange.length === 2) {
      const [start, end] = dateRange;
      filtered = filtered.filter(lead => {
        const leadDate = lead.CreationDate?.toDate?.() 
                      || lead.CreationDate 
                      || lead.createdAt?.toDate?.() 
                      || lead.createdAt;
        
        if (!leadDate) return false;
        return dayjs(leadDate).isBetween(start, end, 'day', '[]');
      });
    }

    setFilteredLeads(filtered);
    setTimeout(() => setChartLoading(false), 250);
  }, [leads, selectedSeller, dateRange]);

  const handleDateRangeChange = (dates) => setDateRange(dates);
  const handleSellerChange = (value) => setSelectedSeller(value);
  const handleClearFilters = () => {
    setDateRange(null);
    setSelectedSeller(null);
  };

  // Summary Stats
  const totalLeads = filteredLeads.length;
  const gainedLeads = filteredLeads.filter(l => l.status === LeadStatus.GAIN).length;
  const conversionRate = totalLeads > 0 ? ((gainedLeads / totalLeads) * 100).toFixed(1) : 0;

  const numericBudgets = filteredLeads
    .map(l => Number(l.Budget))
    .filter(n => !isNaN(n) && n > 0);

  const avgBudget = numericBudgets.length > 0 
    ? Math.round(numericBudgets.reduce((a, b) => a + b, 0) / numericBudgets.length) 
    : 0;

  // Charts Data
  const getStatusData = () => ({
    labels: ['Pending', 'Gained', 'Lost', 'Others'],
    datasets: [{
      data: [
        filteredLeads.filter(l => l.status === LeadStatus.PENDING).length,
        gainedLeads,
        filteredLeads.filter(l => l.status === LeadStatus.LOSS).length,
        filteredLeads.filter(l => !['Pending','Gain','Loss'].includes(l.status)).length,
      ],
      backgroundColor: ['#faad14', '#52c41a', '#f5222d', '#8c8c8c'],
      borderWidth: 2,
    }]
  });

  const getInterestData = () => ({
    labels: ['Low', 'Medium', 'High'],
    datasets: [{
      data: [
        filteredLeads.filter(l => l.InterestLevel === LeadInterestLevel.LOW).length,
        filteredLeads.filter(l => l.InterestLevel === LeadInterestLevel.MEDIUM).length,
        filteredLeads.filter(l => l.InterestLevel === LeadInterestLevel.HIGH).length,
      ],
      backgroundColor: ['#ff7a45', '#1890ff', '#52c41a'],
    }]
  });

  const getMonthlyTrendData = () => {
    const monthly = {};
    filteredLeads.forEach(lead => {
      const date = lead.CreationDate?.toDate?.() || lead.createdAt?.toDate?.() || lead.CreationDate;
      if (!date) return;
      const key = dayjs(date).format('MMM YYYY');
      monthly[key] = (monthly[key] || 0) + 1;
    });

    const sortedKeys = Object.keys(monthly).sort((a,b) => dayjs(a,'MMM YYYY').diff(dayjs(b,'MMM YYYY')));

    return {
      labels: sortedKeys,
      datasets: [{
        label: 'Leads per Month',
        data: sortedKeys.map(key => monthly[key]),
        backgroundColor: '#1890ff',
        borderColor: '#1677ff',
        borderWidth: 2,
      }]
    };
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } },
    scales: { y: { beginAtZero: true } }
  };

  return (
    <Drawer
      title="Lead Statistics & Analytics"
      width={800}
      placement="right"
      onClose={onClose}
      open={visible}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>

        {/* Filters */}
        <Card title="Filters">
          <Row gutter={16}>
            <Col span={12}>
              <label>Date Range</label>
              <RangePicker 
                style={{ width: '100%' }} 
                onChange={handleDateRangeChange} 
                value={dateRange}
                allowClear
              />
            </Col>
            <Col span={12}>
              <label>Filter by Seller</label>
              <Select
                style={{ width: '100%' }}
                placeholder="All Sellers"
                allowClear
                onChange={handleSellerChange}
                value={selectedSeller}
              >
                {sellers.map(s => (
                  <Select.Option key={s.id} value={s.id}>
                    {s.name || `${s.firstname} ${s.lastname}`}
                  </Select.Option>
                ))}
              </Select>
            </Col>
          </Row>
          <Space style={{ marginTop: 12 }}>
            <a onClick={handleClearFilters} style={{ color: '#1677ff' }}>Clear Filters</a>
          </Space>
        </Card>

        {/* Summary Cards */}
        <Row gutter={16}>
          <Col span={8}>
            <Card>
              <Statistic 
                title="Total Leads" 
                value={totalLeads} 
                prefix={<TeamOutlined />} 
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic 
                title="Conversion Rate" 
                value={conversionRate} 
                suffix="%" 
                prefix={<RiseOutlined />} 
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic 
                title="Avg Budget" 
                value={avgBudget ? `AED ${avgBudget.toLocaleString()}` : '—'} 
                prefix={<DollarOutlined />} 
              />
            </Card>
          </Col>
        </Row>

        <Divider />

        {/* Charts */}
        <Spin spinning={loading || chartLoading}>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card title="Status Distribution" style={{ height: '100%' }}>
                {totalLeads > 0 ? (
                  <div style={{ height: 320 }}>
                    <Pie data={getStatusData()} />
                  </div>
                ) : <Empty description="No data" />}
              </Card>
            </Col>

            <Col span={12}>
              <Card title="Interest Level" style={{ height: '100%' }}>
                {totalLeads > 0 ? (
                  <div style={{ height: 320 }}>
                    <Pie data={getInterestData()} />
                  </div>
                ) : <Empty description="No data" />}
              </Card>
            </Col>

            <Col span={24}>
              <Card title="Monthly Lead Trend" style={{ height: '100%' }}>
                {totalLeads > 0 ? (
                  <div style={{ height: 420 }}>
                    <Bar data={getMonthlyTrendData()} options={barOptions} />
                  </div>
                ) : <Empty description="No data for selected period" />}
              </Card>
            </Col>
          </Row>
        </Spin>
      </Space>
    </Drawer>
  );
};

export default LeadStatsDrawer;