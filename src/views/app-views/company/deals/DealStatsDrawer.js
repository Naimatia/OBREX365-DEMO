// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { 
  Drawer, Typography, Row, Col, Divider, Card, Empty, 
  Statistic, Progress, Table
} from 'antd';
import {
  DollarOutlined, CheckCircleOutlined, CloseCircleOutlined, 
  BarChartOutlined, InfoCircleOutlined, StarOutlined
} from '@ant-design/icons';
import { DealStatus } from 'models/DealModel';
import { FileTextOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const DealStatsDrawer = ({ visible, onClose, stats }) => {
  const [countData, setCountData] = useState([]);
  const [valueData, setValueData] = useState([]);
  const [winRateData, setWinRateData] = useState(0);

  useEffect(() => {
    if (stats && stats.count && stats.value) {
      const total = stats.count.total || 0;
      
      setCountData([
        { name: 'Opened', value: stats.count.opened || 0, color: '#1890ff', percent: total ? Math.round((stats.count.opened / total) * 100) : 0 },
        { name: 'Proposal', value: stats.count.proposal || 0, color: '#722ed1', percent: total ? Math.round((stats.count.proposal / total) * 100) : 0 },
        { name: 'Won', value: stats.count.won || 0, color: '#52c41a', percent: total ? Math.round((stats.count.won / total) * 100) : 0 },
        { name: 'Lost', value: stats.count.lost || 0, color: '#ff4d4f', percent: total ? Math.round((stats.count.lost / total) * 100) : 0 },
        { name: 'Total', value: total, color: '#8c8c8c', percent: 100 }
      ]);

      const totalValue = stats.value.total || 0;
      setValueData([
        { name: 'Opened', value: stats.value.opened || 0, color: '#1890ff', percent: totalValue ? Math.round((stats.value.opened / totalValue) * 100) : 0 },
        { name: 'Proposal', value: stats.value.proposal || 0, color: '#722ed1', percent: totalValue ? Math.round((stats.value.proposal / totalValue) * 100) : 0 },
        { name: 'Won', value: stats.value.won || 0, color: '#52c41a', percent: totalValue ? Math.round((stats.value.won / totalValue) * 100) : 0 },
        { name: 'Lost', value: stats.value.lost || 0, color: '#ff4d4f', percent: totalValue ? Math.round((stats.value.lost / totalValue) * 100) : 0 },
        { name: 'Total', value: totalValue, color: '#8c8c8c', percent: 100 }
      ]);

      const wonCount = stats.count.won || 0;
      const lostCount = stats.count.lost || 0;
      const totalClosed = wonCount + lostCount;
      setWinRateData(totalClosed ? Math.round((wonCount / totalClosed) * 100) : 0);
    } else {
      setCountData([
        { name: 'Opened', value: 0, color: '#1890ff', percent: 0 },
        { name: 'Proposal', value: 0, color: '#722ed1', percent: 0 },
        { name: 'Won', value: 0, color: '#52c41a', percent: 0 },
        { name: 'Lost', value: 0, color: '#ff4d4f', percent: 0 },
        { name: 'Total', value: 0, color: '#8c8c8c', percent: 100 }
      ]);
      setValueData([
        { name: 'Opened', value: 0, color: '#1890ff', percent: 0 },
        { name: 'Proposal', value: 0, color: '#722ed1', percent: 0 },
        { name: 'Won', value: 0, color: '#52c41a', percent: 0 },
        { name: 'Lost', value: 0, color: '#ff4d4f', percent: 0 },
        { name: 'Total', value: 0, color: '#8c8c8c', percent: 100 }
      ]);
      setWinRateData(0);
    }
  }, [stats]);

  const countColumns = [
    { title: 'Status', dataIndex: 'name', key: 'name', render: (text, record) => <Text strong style={{ color: record.color }}>{text}</Text> },
    { title: 'Count', dataIndex: 'value', key: 'value', render: (text) => <Text strong>{text}</Text> },
    { 
      title: 'Percentage', 
      dataIndex: 'percent', 
      key: 'percent', 
      render: (percent, record) => (
        <Progress percent={percent} strokeColor={record.color} size="small" format={() => `${percent}%`} />
      )
    },
  ];

  const valueColumns = [
    { title: 'Status', dataIndex: 'name', key: 'name', render: (text, record) => <Text strong style={{ color: record.color }}>{text}</Text> },
    { 
      title: 'Value', 
      dataIndex: 'value', 
      key: 'value', 
      render: (value) => <Text strong>AED {value.toLocaleString()}</Text> 
    },
    { 
      title: 'Percentage', 
      dataIndex: 'percent', 
      key: 'percent', 
      render: (percent, record) => (
        <Progress percent={percent} strokeColor={record.color} size="small" format={() => `${percent}%`} />
      )
    },
  ];

  return (
    <Drawer
      title={<Title level={4}>Deal Statistics</Title>}
      placement="right"
      onClose={onClose}
      open={visible}
      width={700}
    >
      {stats ? (
        <>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Card>
                <Statistic title="Total Deals" value={stats.count.total} prefix={<InfoCircleOutlined />} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
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
              <Card>
                <Statistic
                  title="Win Rate"
                  value={winRateData}
                  suffix="%"
                  valueStyle={{ color: winRateData >= 50 ? '#52c41a' : '#ff4d4f' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Card>
            </Col>
          </Row>
          
          <Divider orientation="left">Deal Count by Status</Divider>
          <Table dataSource={countData} columns={countColumns} pagination={false} rowKey="name" size="small" bordered />

          <Divider orientation="left" style={{ marginTop: 24 }}>Deal Value by Status</Divider>
          <Table dataSource={valueData} columns={valueColumns} pagination={false} rowKey="name" size="small" bordered />

          <Divider orientation="left">Status Breakdown</Divider>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card>
                <Statistic title="Opened" value={stats.count.opened} valueStyle={{ color: '#1890ff' }} prefix={<StarOutlined />} />
                <Progress percent={stats.count.total ? Math.round((stats.count.opened / stats.count.total) * 100) : 0} strokeColor="#1890ff" />
                <Text type="secondary">AED {stats.value.opened.toLocaleString()}</Text>
              </Card>
            </Col>
            <Col span={12}>
              <Card>
                <Statistic title="Proposal" value={stats.count.proposal} valueStyle={{ color: '#722ed1' }} prefix={<FileTextOutlined />} />
                <Progress percent={stats.count.total ? Math.round((stats.count.proposal / stats.count.total) * 100) : 0} strokeColor="#722ed1" />
                <Text type="secondary">AED {stats.value.proposal.toLocaleString()}</Text>
              </Card>
            </Col>
            <Col span={12}>
              <Card>
                <Statistic title="Won" value={stats.count.won} valueStyle={{ color: '#52c41a' }} prefix={<CheckCircleOutlined />} />
                <Progress percent={stats.count.total ? Math.round((stats.count.won / stats.count.total) * 100) : 0} strokeColor="#52c41a" />
                <Text type="secondary">AED {stats.value.won.toLocaleString()}</Text>
              </Card>
            </Col>
            <Col span={12}>
              <Card>
                <Statistic title="Lost" value={stats.count.lost} valueStyle={{ color: '#ff4d4f' }} prefix={<CloseCircleOutlined />} />
                <Progress percent={stats.count.total ? Math.round((stats.count.lost / stats.count.total) * 100) : 0} strokeColor="#ff4d4f" />
                <Text type="secondary">AED {stats.value.lost.toLocaleString()}</Text>
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

// Add missing import

export default DealStatsDrawer;