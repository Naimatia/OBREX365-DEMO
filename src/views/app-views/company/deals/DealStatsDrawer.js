import React, { useEffect, useState } from 'react';
import { 
  Drawer, Typography, Row, Col, Divider, Card, Empty, 
  Statistic, Progress, Table
} from 'antd';
import {
  DollarOutlined, CheckCircleOutlined, CloseCircleOutlined, 
  BarChartOutlined, PieChartOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { DealStatus } from 'models/DealModel';

const { Title, Text } = Typography;

const DealStatsDrawer = ({ visible, onClose, stats }) => {
  // Format data for tables and stats
  const [countData, setCountData] = useState([]);
  const [valueData, setValueData] = useState([]);
  const [winRateData, setWinRateData] = useState(0);

  useEffect(() => {
    if (stats && stats.count && stats.value) {
      // Prepare data for tables
      setCountData([
        { name: 'Open', value: stats.count.opened || 0, color: '#1890ff', percent: stats.count.total ? Math.round((stats.count.opened / stats.count.total) * 100) : 0 },
        { name: 'Won', value: stats.count.gain || 0, color: '#52c41a', percent: stats.count.total ? Math.round((stats.count.gain / stats.count.total) * 100) : 0 },
        { name: 'Lost', value: stats.count.loss || 0, color: '#f5222d', percent: stats.count.total ? Math.round((stats.count.loss / stats.count.total) * 100) : 0 },
        { name: 'Total', value: stats.count.total || 0, color: '#8c8c8c', percent: 100 }
      ]);

      setValueData([
        { name: 'Open', value: stats.value.opened || 0, color: '#1890ff', percent: stats.value.total ? Math.round((stats.value.opened / stats.value.total) * 100) : 0 },
        { name: 'Won', value: stats.value.gain || 0, color: '#52c41a', percent: stats.value.total ? Math.round((stats.value.gain / stats.value.total) * 100) : 0 },
        { name: 'Lost', value: stats.value.loss || 0, color: '#f5222d', percent: stats.value.total ? Math.round((stats.value.loss / stats.value.total) * 100) : 0 },
        { name: 'Total', value: stats.value.total || 0, color: '#8c8c8c', percent: 100 }
      ]);

      // Calculate win rate
      setWinRateData(Math.round((stats.winRate || 0) * 100));
    } else {
      // Set default empty values if stats is null or undefined
      setCountData([
        { name: 'Open', value: 0, color: '#1890ff', percent: 0 },
        { name: 'Won', value: 0, color: '#52c41a', percent: 0 },
        { name: 'Lost', value: 0, color: '#f5222d', percent: 0 },
        { name: 'Total', value: 0, color: '#8c8c8c', percent: 100 }
      ]);
      
      setValueData([
        { name: 'Open', value: 0, color: '#1890ff', percent: 0 },
        { name: 'Won', value: 0, color: '#52c41a', percent: 0 },
        { name: 'Lost', value: 0, color: '#f5222d', percent: 0 },
        { name: 'Total', value: 0, color: '#8c8c8c', percent: 100 }
      ]);
      
      setWinRateData(0);
    }
  }, [stats]);

  // Table columns for deal counts
  const countColumns = [
    {
      title: 'Status',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Text strong style={{ color: record.color }}>{text}</Text>
      ),
    },
    {
      title: 'Count',
      dataIndex: 'value',
      key: 'value',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Percentage',
      dataIndex: 'percent',
      key: 'percent',
      render: (percent, record) => (
        <Progress 
          percent={percent} 
          strokeColor={record.color}
          size="small"
          format={() => `${percent}%`}
        />
      ),
    },
  ];

  // Table columns for deal values
  const valueColumns = [
    {
      title: 'Status',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Text strong style={{ color: record.color }}>{text}</Text>
      ),
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      render: (value) => <Text strong>AED {value.toLocaleString()}</Text>,
    },
    {
      title: 'Percentage',
      dataIndex: 'percent',
      key: 'percent',
      render: (percent, record) => (
        <Progress 
          percent={percent} 
          strokeColor={record.color}
          size="small"
          format={() => `${percent}%`}
        />
      ),
    },
  ];

  return (
    <Drawer
      title={<Title level={4}>Deal Statistics</Title>}
      placement="right"
      onClose={onClose}
      open={visible}
      width={700}
      className="deal-stats-drawer"
    >
      {stats ? (
        <>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Card className="detail-card">
                <Statistic
                  title="Total Deals"
                  value={stats.count.total}
                  prefix={<InfoCircleOutlined />}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card className="detail-card">
                <Statistic
                  title="Total Value"
                  value={stats.value.total}
                  precision={2}
                  prefix={<DollarOutlined />}
                  formatter={(value) => `AED ${value.toLocaleString()}`}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card className="detail-card">
                <Statistic
                  title="Win Rate"
                  value={winRateData}
                  suffix="%"
                  valueStyle={{
                    color: winRateData >= 50 ? '#52c41a' : '#f5222d',
                  }}
                  prefix={<CheckCircleOutlined />}
                />
              </Card>
            </Col>
          </Row>
          
          <Divider orientation="left">Deal Count by Status</Divider>
          <Table 
            dataSource={countData} 
            columns={countColumns} 
            pagination={false}
            rowKey="name"
            size="small"
            bordered
          />

          <Divider orientation="left" style={{ marginTop: 24 }}>Deal Value by Status</Divider>
          <Table 
            dataSource={valueData} 
            columns={valueColumns} 
            pagination={false}
            rowKey="name"
            size="small"
            bordered
          />

          <Divider orientation="left">Status Breakdown</Divider>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Card className="detail-card">
                <Statistic
                  title="Open Deals"
                  value={stats.count.opened}
                  valueStyle={{ color: '#1890ff' }}
                  prefix={<InfoCircleOutlined />}
                />
                <Progress 
                  percent={stats.count.total ? Math.round((stats.count.opened / stats.count.total) * 100) : 0} 
                  strokeColor="#1890ff" 
                />
                <Text type="secondary">
                  AED {stats.value.opened.toLocaleString()}
                </Text>
              </Card>
            </Col>
            <Col span={8}>
              <Card className="detail-card">
                <Statistic
                  title="Won Deals"
                  value={stats.count.gain}
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<CheckCircleOutlined />}
                />
                <Progress 
                  percent={stats.count.total ? Math.round((stats.count.gain / stats.count.total) * 100) : 0} 
                  strokeColor="#52c41a" 
                />
                <Text type="secondary">
                  AED {stats.value.gain.toLocaleString()}
                </Text>
              </Card>
            </Col>
            <Col span={8}>
              <Card className="detail-card">
                <Statistic
                  title="Lost Deals"
                  value={stats.count.loss}
                  valueStyle={{ color: '#f5222d' }}
                  prefix={<CloseCircleOutlined />}
                />
                <Progress 
                  percent={stats.count.total ? Math.round((stats.count.loss / stats.count.total) * 100) : 0} 
                  strokeColor="#f5222d" 
                />
                <Text type="secondary">
                  AED {stats.value.loss.toLocaleString()}
                </Text>
              </Card>
            </Col>
          </Row>
        </>
      ) : (
        <Empty description="No statistics available" />
      )}
    </Drawer>
  );
};

export default DealStatsDrawer;
