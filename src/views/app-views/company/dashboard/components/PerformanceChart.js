import React from 'react';
import { Card, Radio, Spin, Empty, Typography } from 'antd';
import ChartWidget from 'components/shared-components/ChartWidget';
import { motion } from 'framer-motion';

const { Title } = Typography;

const PerformanceChart = ({
  title,
  data,
  loading = false,
  chartType = 'line',
  xField = 'date',
  yField = 'value',
  seriesField = 'category',
  color,
  height = 320,
  filters = [],
  onFilterChange,
  activeFilter,
}) => {
  // Transform data if needed for ChartWidget
  const prepareDataForChart = () => {
    // ChartWidget expects series and xAxis format
    if (!data || data.length === 0) return { series: [], categories: [] };
    
    // Group by series field if it exists
    if (seriesField) {
      const uniqueXFields = Array.from(new Set(data.map(item => item[xField])));
      const uniqueSeriesFields = Array.from(new Set(data.map(item => item[seriesField])));
      const categories = uniqueXFields.sort();
      
      const series = uniqueSeriesFields.map(name => {
        return {
          name,
          data: categories.map(cat => {
            const matchingItem = data.find(item => 
              item[xField] === cat && item[seriesField] === name
            );
            return matchingItem ? matchingItem[yField] : 0;
          })
        };
      });
      
      return { series, categories };
    } else {
      // Simple series
      return {
        series: [{
          name: title || 'Value',
          data: data.map(item => item[yField])
        }],
        categories: data.map(item => item[xField])
      };
    }
  };

  const renderChart = () => {
    // Return empty state if no data
    if (!data || data.length === 0) {
      return (
        <div className="chart-empty-container" style={{ height: height || 300 }}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No data available" />
        </div>
      );
    }

    // If loading, show spinner
    if (loading) {
      return (
        <div className="chart-loading-container" style={{ height: height || 300 }}>
          <Spin size="large" />
        </div>
      );
    }

    // Prepare data for ChartWidget
    const { series, categories } = prepareDataForChart();

    // Render appropriate chart type using ChartWidget
    return (
      <ChartWidget 
        series={series}
        xAxis={categories} 
        height={height || 300}
        type={chartType}
        direction="ltr"
        customOptions={{
          colors: color,
          legend: { show: true, position: 'top' },
          chart: {
            zoom: { enabled: false },
            toolbar: { show: false }
          },
          tooltip: { enabled: true },
        }}
      />
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card
        title={<Title level={5} style={{ margin: 0 }}>{title}</Title>}
        extra={
          filters && filters.length > 0 ? (
            <Radio.Group
              value={activeFilter}
              onChange={(e) => onFilterChange && onFilterChange(e.target.value)}
              buttonStyle="solid"
              size="small"
            >
              {filters.map(filter => (
                <Radio.Button key={filter.value} value={filter.value}>
                  {filter.label}
                </Radio.Button>
              ))}
            </Radio.Group>
          ) : null
        }
        bordered={true}
        style={{
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}
        bodyStyle={{ padding: '12px 24px 24px' }}
      >
        {renderChart()}
      </Card>
    </motion.div>
  );
};

export default PerformanceChart;
