import React from 'react';
import { Card, Statistic, Tooltip } from 'antd';
import { motion } from 'framer-motion';
import { InfoCircleOutlined } from '@ant-design/icons';
import { COLORS } from 'constants/ChartConstant';

const StatsCard = ({ 
  title, 
  value, 
  prefix, 
  suffix,
  icon, 
  color = COLORS[0],
  loading = false,
  tooltip,
  comparison = null,
  colorInverted = false
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ 
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
    >
      <Card
        style={{ 
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          border: colorInverted ? `1px solid ${color}` : '1px solid #f0f0f0',
          background: colorInverted ? color : 'white'
        }}
        bodyStyle={{ 
          padding: '20px 24px',
        }}
        loading={loading}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '8px',
              color: colorInverted ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.65)'
            }}>
              {title} 
              {tooltip && (
                <Tooltip title={tooltip}>
                  <InfoCircleOutlined style={{ marginLeft: 8, fontSize: '14px' }} />
                </Tooltip>
              )}
            </div>
            <Statistic 
              value={value} 
              prefix={prefix}
              suffix={suffix} 
              valueStyle={{ 
                color: colorInverted ? 'white' : color,
                fontSize: '24px',
                fontWeight: 600
              }} 
            />
            {comparison !== null && (
              <div style={{ 
                marginTop: '8px', 
                fontSize: '14px',
                color: colorInverted ? 'rgba(255,255,255,0.85)' : (
                  comparison > 0 ? '#52c41a' : comparison < 0 ? '#ff4d4f' : 'inherit'
                )
              }}>
                {comparison > 0 ? '↑' : comparison < 0 ? '↓' : ''} {Math.abs(comparison)}% vs last period
              </div>
            )}
          </div>
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '48px', 
              height: '48px', 
              borderRadius: '12px', 
              backgroundColor: colorInverted ? 'rgba(255,255,255,0.2)' : color + '20',
              color: colorInverted ? 'white' : color
            }}
          >
            {icon && React.cloneElement(icon, { style: { fontSize: '24px' } })}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default StatsCard;
