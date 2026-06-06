// pages/dashboard/HRDashboard/components/KPICard.js
import React from 'react';
import { Card, Statistic, Tooltip, Progress, Space, Typography } from 'antd';
import { InfoCircleOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

const { Text } = Typography;

const KPICard = ({
  title,
  value,
  prefix,
  suffix,
  valueStyle,
  precision = 0,
  trend,
  trendValue,
  progress,
  progressColor,
  tooltip,
  loading,
  children
}) => {
  return (
    <Card
      className="kpi-card"
      loading={loading}
      style={{
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        height: '100%',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease'
      }}
      hoverable
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <Text type="secondary" style={{ fontSize: '13px', fontWeight: 500 }}>
          {title}
          {tooltip && (
            <Tooltip title={tooltip}>
              <InfoCircleOutlined style={{ marginLeft: 6, color: '#bfbfbf', fontSize: 12 }} />
            </Tooltip>
          )}
        </Text>
        {trend && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 4,
            padding: '2px 8px',
            borderRadius: '12px',
            background: trend === 'up' ? '#f6ffed' : '#fff2f0',
            color: trend === 'up' ? '#52c41a' : '#ff4d4f'
          }}>
            {trend === 'up' ? <ArrowUpOutlined style={{ fontSize: 12 }} /> : <ArrowDownOutlined style={{ fontSize: 12 }} />}
            <span style={{ fontSize: 12, fontWeight: 600 }}>{trendValue}%</span>
          </div>
        )}
      </div>

      <Statistic
        value={value}
        prefix={prefix}
        suffix={suffix}
        precision={precision}
        valueStyle={{
          fontSize: '28px',
          fontWeight: 700,
          color: valueStyle?.color || '#1a3353',
          ...valueStyle
        }}
      />

      {progress !== undefined && (
        <div style={{ marginTop: 12 }}>
          <Progress
            percent={progress}
            showInfo={false}
            strokeColor={progressColor || '#1890ff'}
            trailColor="#e8e8e8"
            strokeWidth={6}
          />
        </div>
      )}

      {children}
    </Card>
  );
};

export default KPICard;