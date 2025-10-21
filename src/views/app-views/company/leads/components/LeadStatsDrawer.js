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
  Spin
} from 'antd';
import { 
  PieChartOutlined, 
  BarChartOutlined, 
  CalendarOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { LeadStatus, LeadInterestLevel } from 'models/LeadModel';
import moment from 'moment';

// Import Chart.js components
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const { Title: TextTitle } = Typography;
const { RangePicker } = DatePicker;

/**
 * Component for displaying detailed lead statistics in a drawer
 */
const LeadStatsDrawer = ({ 
  visible, 
  onClose, 
  leads = [], 
  sellers = [],
  loading = false 
}) => {
  const [filteredLeads, setFilteredLeads] = useState(leads);
  const [dateRange, setDateRange] = useState(null);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);

  // Update filtered leads when props change or filters are applied
  useEffect(() => {
    setChartLoading(true);
    let filtered = [...leads];
    
    // Apply seller filter
    if (selectedSeller) {
      filtered = filtered.filter(lead => lead.seller_id === selectedSeller);
    }
    
    // Apply date range filter
    if (dateRange && dateRange.length === 2) {
      filtered = filtered.filter(lead => {
        const leadDate = lead.CreationDate?.toDate?.() || lead.CreationDate;
        return moment(leadDate).isBetween(dateRange[0], dateRange[1], 'day', '[]');
      });
    }
    
    setFilteredLeads(filtered);
    setTimeout(() => setChartLoading(false), 300); // Small delay for animation
  }, [leads, selectedSeller, dateRange]);
  
  // Handle date range change
  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
  };
  
  // Handle seller change
  const handleSellerChange = (value) => {
    setSelectedSeller(value);
  };
  
  // Clear filters
  const handleClearFilters = () => {
    setDateRange(null);
    setSelectedSeller(null);
  };
  
  // Calculate data for status distribution chart
  const getStatusData = () => {
    const pending = filteredLeads.filter(lead => lead.status === LeadStatus.PENDING).length;
    const gain = filteredLeads.filter(lead => lead.status === LeadStatus.GAIN).length;
    const loss = filteredLeads.filter(lead => lead.status === LeadStatus.LOSS).length;
    
    const data = {
      labels: ['Pending', 'Gained', 'Lost'],
      datasets: [
        {
          data: [pending, gain, loss],
          backgroundColor: [
            '#faad14',
            '#52c41a',
            '#f5222d',
          ],
          borderWidth: 1,
        },
      ],
    };
    
    return data;
  };
  
  // Calculate data for interest level distribution chart
  const getInterestData = () => {
    const low = filteredLeads.filter(lead => lead.InterestLevel === LeadInterestLevel.LOW).length;
    const medium = filteredLeads.filter(lead => lead.InterestLevel === LeadInterestLevel.MEDIUM).length;
    const high = filteredLeads.filter(lead => lead.InterestLevel === LeadInterestLevel.HIGH).length;
    
    const data = {
      labels: ['Low Interest', 'Medium Interest', 'High Interest'],
      datasets: [
        {
          data: [low, medium, high],
          backgroundColor: [
            '#ff7a45',
            '#1890ff',
            '#52c41a',
          ],
          borderWidth: 1,
        },
      ],
    };
    
    return data;
  };
  
  // Calculate monthly trend data
  const getMonthlyTrendData = () => {
    // Group leads by month
    const monthlyData = {};
    
    filteredLeads.forEach(lead => {
      const date = lead.CreationDate?.toDate?.() || lead.CreationDate;
      if (date) {
        const monthYear = moment(date).format('MMM YYYY');
        
        if (!monthlyData[monthYear]) {
          monthlyData[monthYear] = {
            pending: 0,
            gain: 0,
            loss: 0
          };
        }
        
        if (lead.status === LeadStatus.PENDING) {
          monthlyData[monthYear].pending++;
        } else if (lead.status === LeadStatus.GAIN) {
          monthlyData[monthYear].gain++;
        } else if (lead.status === LeadStatus.LOSS) {
          monthlyData[monthYear].loss++;
        }
      }
    });
    
    // Sort months chronologically
    const sortedMonths = Object.keys(monthlyData).sort((a, b) => {
      return moment(a, 'MMM YYYY').diff(moment(b, 'MMM YYYY'));
    });
    
    // Create chart data
    const data = {
      labels: sortedMonths,
      datasets: [
        {
          label: 'Pending',
          data: sortedMonths.map(month => monthlyData[month].pending),
          backgroundColor: '#faad14',
        },
        {
          label: 'Gained',
          data: sortedMonths.map(month => monthlyData[month].gain),
          backgroundColor: '#52c41a',
        },
        {
          label: 'Lost',
          data: sortedMonths.map(month => monthlyData[month].loss),
          backgroundColor: '#f5222d',
        },
      ],
    };
    
    return data;
  };
  
  // Chart options
  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top', // Valid values: 'top', 'left', 'bottom', 'right'
      },
      title: {
        display: true,
        text: 'Monthly Leads Trend'
      },
    },
    scales: {
      x: {
        stacked: false,
      },
      y: {
        stacked: false,
        beginAtZero: true
      }
    }
  };

  // Render empty state when no data
  const renderEmptyState = () => (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description="No lead data available for the selected filters"
    />
  );

  return (
    <Drawer
      title="Lead Statistics"
      width={720}
      placement="right"
      onClose={onClose}
      visible={visible}
      bodyStyle={{ paddingBottom: 80 }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Filters */}
        <Card title="Filters">
          <Row gutter={16}>
            <Col span={12}>
              <div className="mb-2">
                <label><CalendarOutlined /> Date Range</label>
                <RangePicker 
                  style={{ width: '100%' }}
                  onChange={handleDateRangeChange}
                  value={dateRange}
                />
              </div>
            </Col>
            <Col span={12}>
              <div className="mb-2">
                <label><TeamOutlined /> Filter by Seller</label>
                <Select
                  style={{ width: '100%' }}
                  placeholder="Select a seller"
                  allowClear
                  onChange={handleSellerChange}
                  value={selectedSeller}
                >
                  {sellers.map(seller => (
                    <Select.Option key={seller.id} value={seller.id}>
                      {seller.firstname} {seller.lastname}
                    </Select.Option>
                  ))}
                </Select>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Stats Overview */}
        <div>
          <TextTitle level={4}><BarChartOutlined /> Leads Overview</TextTitle>
          <Spin spinning={loading || chartLoading}>
            <Row gutter={16}>
              {/* Status Distribution */}
              <Col span={12}>
                <Card title="Lead Status Distribution">
                  {filteredLeads.length > 0 ? (
                    <div style={{ height: 300 }}>
                      <Pie data={getStatusData()} />
                    </div>
                  ) : renderEmptyState()}
                </Card>
              </Col>
              
              {/* Interest Level Distribution */}
              <Col span={12}>
                <Card title="Interest Level Distribution">
                  {filteredLeads.length > 0 ? (
                    <div style={{ height: 300 }}>
                      <Pie data={getInterestData()} />
                    </div>
                  ) : renderEmptyState()}
                </Card>
              </Col>
            </Row>
          </Spin>
        </div>

        <Divider />
        
        {/* Monthly Trend */}
        <div>
          <TextTitle level={4}><PieChartOutlined /> Monthly Trends</TextTitle>
          <Spin spinning={loading || chartLoading}>
            <Card title="Lead Status by Month">
              {filteredLeads.length > 0 ? (
                <div style={{ height: 400 }}>
                  <Bar data={getMonthlyTrendData()} options={barOptions} />
                </div>
              ) : renderEmptyState()}
            </Card>
          </Spin>
        </div>
      </Space>
    </Drawer>
  );
};

export default LeadStatsDrawer;
