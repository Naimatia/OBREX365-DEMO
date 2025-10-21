import React, { useState } from 'react';
import { Typography, Space } from 'antd';
import { HeartFilled, CodeOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';

const { Text, Link } = Typography;

/**
 * Developer Credit Component with Beautiful Animations
 * Shows "Developer By Nihed BenAbdennour" with redirect to personal website
 */
const DeveloperCredit = () => {
  const [isHovered, setIsHovered] = useState(false);

  const containerVariants = {
    initial: { 
      opacity: 0, 
      y: 20 
    },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.6,
        delay: 0.8,
        ease: "easeOut"
      }
    }
  };

  const heartScale = isHovered ? 1.2 : 1;
  const heartColor = isHovered ? '#eb2f96' : '#ff4d4f';

  const codeIconVariants = {
    initial: { 
      rotate: 0,
      color: '#8c8c8c'
    },
    animate: {
      rotate: isHovered ? 360 : 0,
      color: isHovered ? '#1890ff' : '#8c8c8c',
      transition: {
        duration: 0.6,
        ease: "easeInOut"
      }
    }
  };
/*
  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '0',
        right: '0',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'none'
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Space 
        align="center" 
        size="small"
        style={{
          padding: '8px 16px',
          borderRadius: '20px',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          whiteSpace: 'nowrap',
          pointerEvents: 'auto'
        }}
      >
        <motion.div variants={codeIconVariants}>
          <CodeOutlined style={{ fontSize: '14px' }} />
        </motion.div>

        <Text style={{ fontSize: '13px', fontWeight: '500' }}>
          Developed with
        </Text>

        <motion.div
          animate={{
            scale: heartScale,
            transition: { duration: 0.3 }
          }}
        >
          <HeartFilled 
            style={{ 
              fontSize: '12px', 
              color: heartColor
            }} 
          />
        </motion.div>

        <Text style={{ fontSize: '13px', fontWeight: '500' }}>
          by
        </Text>

        <Link
          href="https://www.linkedin.com/in/naim-atia/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: '13px',
            fontWeight: '600',
            textDecoration: 'none',
            color: isHovered ? '#1890ff' : '#8c8c8c',
            transition: 'color 0.3s ease'
          }}
        >
          Atia Naim
        </Link>
      </Space>

    </motion.div>
  );
  */
};

export default DeveloperCredit;
