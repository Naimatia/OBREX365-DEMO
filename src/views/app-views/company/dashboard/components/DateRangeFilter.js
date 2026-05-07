import React from 'react';
import { DatePicker, Radio, Space, Card, Typography } from 'antd';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Title } = Typography;

const DateRangeFilter = ({
  rangeType,
  setRangeType,
  dateRange,
  setDateRange,
  onRangeChange,
  title = 'Filter Data Range',
  showTitle = true,
}) => {
  // Preset period selection
  const handleRangeTypeChange = (e) => {
    const type = e.target.value;
    setRangeType(type);

    let start, end;
    switch (type) {
      case 'today':
        start = dayjs().startOf('day');
        end = dayjs().endOf('day');
        break;
      case 'yesterday':
        start = dayjs().subtract(1, 'day').startOf('day');
        end = dayjs().subtract(1, 'day').endOf('day');
        break;
      case 'week':
        start = dayjs().startOf('week');
        end = dayjs().endOf('day');
        break;
      case 'month':
        start = dayjs().startOf('month');
        end = dayjs().endOf('day');
        break;
      case 'quarter':
        start = dayjs().startOf('quarter');
        end = dayjs().endOf('day');
        break;
      case 'year':
        start = dayjs().startOf('year');
        end = dayjs().endOf('day');
        break;
      default:
        start = dayjs().subtract(30, 'days');
        end = dayjs();
    }

    const newRange = [start, end];
    setDateRange(newRange);
    onRangeChange && onRangeChange(newRange);
  };

  // Custom date range selection
  const handleCustomRangeChange = (dates) => {
    if (dates && dates.length === 2) {
      setRangeType('custom');
      setDateRange(dates);
      onRangeChange && onRangeChange(dates);
    }
  };

  return (
    <Card style={{ borderRadius: '8px', marginBottom: '24px' }}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {showTitle && <Title level={5} style={{ margin: 0 }}>{title}</Title>}

        <Radio.Group
          value={rangeType}
          onChange={handleRangeTypeChange}
          style={{ marginBottom: '16px' }}
          buttonStyle="solid"
        >
          <Radio.Button value="today">Today</Radio.Button>
          <Radio.Button value="week">This Week</Radio.Button>
          <Radio.Button value="month">This Month</Radio.Button>
          <Radio.Button value="quarter">This Quarter</Radio.Button>
          <Radio.Button value="year">This Year</Radio.Button>
        </Radio.Group>

        <RangePicker
          value={dateRange}
          onChange={handleCustomRangeChange}
          format="YYYY-MM-DD"
          allowClear={false}
          style={{ width: '100%' }}
        />
      </Space>
    </Card>
  );
};

export default DateRangeFilter;
