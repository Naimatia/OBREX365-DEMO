// @ts-nocheck
import React, { useEffect } from 'react';
import { Modal } from 'antd';
import { motion } from 'framer-motion';
import { 
  TrophyOutlined, 
  HeartOutlined, 
  RocketOutlined, 
  StarOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { DealStatus } from 'models/DealModel';

/**
 * Encouragement modal for deal status changes
 */
const DealEncouragementModal = ({ visible, onClose, status, amount }) => {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onClose, 3000); // Auto close after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getModalContent = () => {
    switch (status) {
      case DealStatus.GAIN:
        return {
          title: "🎉 JACKPOT! 🎉",
          message: "Congratulations! You've closed another deal!",
          subMessage: `Amazing work securing ${formatCurrency(amount)}!`,
          bgGradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          icon: <TrophyOutlined style={{ fontSize: 48, color: '#FFD700' }} />,
          color: "#52c41a",
          emoji: "🏆"
        };
      
      case DealStatus.LOSS:
        return {
          title: "💪 Keep Pushing!",
          message: "Every 'no' gets you closer to a 'yes'!",
          subMessage: "This experience makes you stronger!",
          bgGradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
          icon: <RocketOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />,
          color: "#fa8c16",
          emoji: "🚀"
        };
      
      default:
        return {
          title: "⚡ Good Move!",
          message: "Deal status updated successfully!",
          subMessage: "Keep up the great work!",
          bgGradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
          icon: <StarOutlined style={{ fontSize: 48, color: '#1890ff' }} />,
          color: "#1890ff",
          emoji: "⭐"
        };
    }
  };

  const content = getModalContent();

  return (
    <Modal
      open={visible}
      footer={null}
      closable={false}
      centered
      width={400}
      bodyStyle={{
        background: content.bgGradient,
        borderRadius: '12px',
        padding: '40px 20px',
        textAlign: 'center',
        color: 'white',
        minHeight: '200px'
      }}
      style={{
        top: 20,
      }}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          duration: 0.5,
          ease: "easeOut",
          type: "spring",
          stiffness: 300
        }}
      >
        <motion.div
          animate={{ 
            rotate: [0, 10, -10, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            repeatType: "loop"
          }}
        >
          {content.icon}
        </motion.div>
        
        <motion.h2
          style={{ 
            color: 'white', 
            fontSize: '24px', 
            marginTop: '16px', 
            marginBottom: '8px',
            fontWeight: 'bold',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {content.title}
        </motion.h2>
        
        <motion.p
          style={{ 
            fontSize: '16px', 
            margin: '0 0 8px 0',
            color: 'white',
            textShadow: '0 1px 2px rgba(0,0,0,0.2)'
          }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          {content.message}
        </motion.p>
        
        <motion.p
          style={{ 
            fontSize: '14px',
            color: 'white',
            opacity: 0.95,
            margin: 0,
            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
          }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          {content.subMessage}
        </motion.p>

        {/* Floating elements animation */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              style={{
                position: 'absolute',
                fontSize: '20px',
                top: `${20 + Math.random() * 60}%`,
                left: `${10 + Math.random() * 80}%`,
              }}
              animate={{
                y: [-10, -20, -10],
                opacity: [0.7, 1, 0.7],
                scale: [0.8, 1.2, 0.8]
              }}
              transition={{
                duration: 2 + Math.random(),
                repeat: Infinity,
                delay: Math.random() * 2
              }}
            >
              {content.emoji}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </Modal>
  );
};

export default DealEncouragementModal;
