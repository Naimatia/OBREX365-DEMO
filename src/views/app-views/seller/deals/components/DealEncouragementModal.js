// @ts-nocheck
import React, { useEffect } from 'react';
import { Modal, Button, Space, Typography } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrophyOutlined, 
  HeartOutlined, 
  RocketOutlined, 
  StarOutlined,
  DollarOutlined,
  SmileOutlined,
  FrownOutlined,
  FireOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ArrowUpOutlined
} from '@ant-design/icons';
import { DealStatus, DealStatusLabels } from 'models/DealModel';
import { FileTextOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * Encouragement modal for deal status changes
 */
const DealEncouragementModal = ({ visible, onClose, status, amount, contactName = '' }) => {
  useEffect(() => {
    if (visible) {
      // Auto close after 4 seconds for Won/Lost, 3 seconds for others
      const duration = status === DealStatus.WON || status === DealStatus.LOST ? 4000 : 3000;
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose, status]);

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
    const statusLower = status?.toLowerCase() || '';
    
    switch (statusLower) {
      case DealStatus.WON?.toLowerCase():
      case 'won':
        return {
          title: "🎉 DEAL WON! 🎉",
          message: `Amazing work! You've closed this deal successfully!`,
          subMessage: `${contactName ? `With ${contactName} for ` : ''}${formatCurrency(amount)}`,
          bgGradient: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
          icon: <TrophyOutlined style={{ fontSize: 52, color: '#FFD700' }} />,
          emoji: "🏆",
          confetti: true,
          action: "Celebrate!"
        };
      
      case DealStatus.LOST?.toLowerCase():
      case 'lost':
        return {
          title: "💪 Stay Strong!",
          message: "Every 'no' gets you closer to a 'yes'!",
          subMessage: `You'll get the next one! Keep pushing forward!`,
          bgGradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
          icon: <RocketOutlined style={{ fontSize: 48, color: '#ff6b6b' }} />,
          emoji: "🚀",
          confetti: false,
          action: "Keep Going!"
        };
      
      case DealStatus.PROPOSAL?.toLowerCase():
      case 'proposal':
        return {
          title: "📋 Proposal Sent!",
          message: `Great job! You've sent a proposal to ${contactName || 'the client'}.`,
          subMessage: "Now follow up and close this deal!",
          bgGradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          icon: <FileTextOutlined style={{ fontSize: 48, color: '#fff' }} />,
          emoji: "📄",
          confetti: false,
          action: "Follow Up"
        };
      
      case DealStatus.OPENED?.toLowerCase():
      case 'opened':
        return {
          title: "🚀 Deal Opened!",
          message: `New deal opened${contactName ? ` with ${contactName}` : ''}!`,
          subMessage: `Amount: ${formatCurrency(amount)}. Start working on it!`,
          bgGradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
          icon: <FireOutlined style={{ fontSize: 48, color: '#fff' }} />,
          emoji: "🔥",
          confetti: false,
          action: "Let's Go!"
        };
      
      default:
        return {
          title: "⚡ Status Updated!",
          message: `Deal status updated to ${status || 'Opened'}`,
          subMessage: "Keep up the great work!",
          bgGradient: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
          icon: <StarOutlined style={{ fontSize: 48, color: '#fff' }} />,
          emoji: "⭐",
          confetti: false,
          action: "Continue"
        };
    }
  };

  const content = getModalContent();

  // Confetti animation for Won deals
  const ConfettiPieces = () => {
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
    return (
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              width: `${6 + Math.random() * 8}px`,
              height: `${6 + Math.random() * 8}px`,
              backgroundColor: colors[Math.floor(Math.random() * colors.length)],
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              top: '-10%',
              left: `${Math.random() * 100}%`,
              opacity: 0.8,
              zIndex: 10
            }}
            animate={{
              y: ['0vh', '120vh'],
              x: [`${Math.random() * 200 - 100}px`, `${Math.random() * 400 - 200}px`],
              rotate: [0, 720],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: 'linear'
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <Modal
      open={visible}
      footer={null}
      closable={false}
      centered
      width={420}
      bodyStyle={{
        background: content.bgGradient,
        borderRadius: '16px',
        padding: '40px 24px',
        textAlign: 'center',
        color: 'white',
        minHeight: '220px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}
    >
      {/* Confetti for Won deals */}
      {content.confetti && <ConfettiPieces />}

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          duration: 0.6,
          ease: "easeOut",
          type: "spring",
          stiffness: 300,
          damping: 20
        }}
      >
        {/* Icon with pulse animation */}
        <motion.div
          animate={{ 
            scale: [1, 1.15, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "loop"
          }}
          style={{ position: 'relative', zIndex: 5 }}
        >
          {content.icon}
        </motion.div>
        
        {/* Title */}
        <motion.h2
          style={{ 
            color: 'white', 
            fontSize: '26px', 
            marginTop: '16px', 
            marginBottom: '8px',
            fontWeight: 'bold',
            textShadow: '0 2px 8px rgba(0,0,0,0.3)',
            position: 'relative',
            zIndex: 5
          }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {content.title}
        </motion.h2>
        
        {/* Message */}
        <motion.p
          style={{ 
            fontSize: '18px', 
            margin: '0 0 8px 0',
            color: 'white',
            textShadow: '0 1px 4px rgba(0,0,0,0.2)',
            fontWeight: 500,
            position: 'relative',
            zIndex: 5
          }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          {content.message}
        </motion.p>
        
        {/* Sub-message with amount */}
        <motion.div
          style={{ 
            marginTop: 8,
            position: 'relative',
            zIndex: 5
          }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          {amount > 0 && (
            <div style={{ 
              display: 'inline-block', 
              background: 'rgba(255,255,255,0.2)',
              padding: '4px 20px',
              borderRadius: 20,
              backdropFilter: 'blur(10px)'
            }}>
              <DollarOutlined style={{ marginRight: 8 }} />
              <Text strong style={{ color: 'white', fontSize: 18 }}>
                {formatCurrency(amount)}
              </Text>
            </div>
          )}
          {content.subMessage && !amount && (
            <Text style={{ 
              color: 'white', 
              fontSize: '14px',
              opacity: 0.95,
              textShadow: '0 1px 2px rgba(0,0,0,0.2)'
            }}>
              {content.subMessage}
            </Text>
          )}
        </motion.div>

        {/* Floating emojis */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              style={{
                position: 'absolute',
                fontSize: `${18 + Math.random() * 14}px`,
                top: `${10 + Math.random() * 80}%`,
                left: `${5 + Math.random() * 90}%`,
                opacity: 0.6,
                zIndex: 1
              }}
              animate={{
                y: [-10, -30, -10],
                x: [0, 10, 0],
                rotate: [0, 20, -20, 0],
                opacity: [0.4, 0.8, 0.4]
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: 'easeInOut'
              }}
            >
              {['✨', '🌟', '💫', '🎯', '💪', '🔥', '⚡', '🌈'][i % 8]}
            </motion.div>
          ))}
        </div>

        {/* Close button with motion */}
        <motion.div
          style={{ marginTop: 20, position: 'relative', zIndex: 5 }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <Button 
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white',
              borderRadius: 20,
              padding: '4px 24px',
              height: 'auto',
              backdropFilter: 'blur(10px)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.2)';
            }}
          >
            <Space>
              <span>{content.action || 'Continue'}</span>
              <ArrowUpOutlined style={{ fontSize: 12 }} />
            </Space>
          </Button>
        </motion.div>
      </motion.div>
    </Modal>
  );
};

// Add missing import for FileTextOutlined

export default DealEncouragementModal;