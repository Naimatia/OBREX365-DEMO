// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Modal } from 'antd';
import { motion } from 'framer-motion';
import { LeadStatus } from 'models/LeadModel';

/**
 * Lead Encouragement Modal Component
 * Shows animated motivational messages when lead status is updated
 */
const LeadEncouragementModal = ({ visible, status, leadName, onClose }) => {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (visible) {
      // Delay content animation slightly after modal opens
      const timer = setTimeout(() => setShowContent(true), 200);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [visible]);

  // Get message and style based on status
  const getEncouragementData = (status) => {
    switch (status) {
      case LeadStatus.GAIN:
        return {
          emoji: '🎯',
          title: 'JACKPOT!',
          message: 'Amazing! You converted the lead!',
          subtitle: 'Your persistence paid off! 🚀💰',
          color: '#52c41a',
          bgColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          particle: '🌟'
        };
      case LeadStatus.LOSS:
        return {
          emoji: '💪',
          title: 'Keep Pushing!',
          message: 'Every "no" gets you closer to a "yes"!',
          subtitle: 'You\'re building experience! Next one\'s yours! 🎯',
          color: '#faad14',
          bgColor: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
          particle: '⚡'
        };
      case LeadStatus.PENDING:
        return {
          emoji: '⏰',
          title: 'Good Move!',
          message: 'Lead is back in progress!',
          subtitle: 'Keep nurturing this opportunity! 🌱',
          color: '#1890ff',
          bgColor: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
          particle: '✨'
        };
      default:
        return {
          emoji: '👍',
          title: 'Great!',
          message: 'Lead status updated successfully!',
          subtitle: 'Keep up the excellent work!',
          color: '#722ed1',
          bgColor: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
          particle: '✨'
        };
    }
  };

  const data = getEncouragementData(status);

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      centered
      width={420}
      style={{ 
        top: 0,
        transform: 'none',
        margin: 0
      }}
      bodyStyle={{
        background: data.bgColor,
        borderRadius: '16px',
        padding: '40px 30px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}
      maskStyle={{
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(4px)'
      }}
    >
      {/* Floating Particles */}
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          animate={showContent ? { 
            opacity: [0, 1, 0],
            scale: [0, 1.2, 0],
            x: [0, Math.random() * 240 - 120],
            y: [0, Math.random() * 240 - 120],
            rotate: [0, Math.random() * 360]
          } : {}}
          transition={{ 
            duration: 2.5,
            delay: i * 0.2,
            repeat: Infinity,
            repeatDelay: 3
          }}
          style={{
            position: 'absolute',
            fontSize: '22px',
            top: '50%',
            left: '50%',
            pointerEvents: 'none'
          }}
        >
          {data.particle}
        </motion.div>
      ))}

      {/* Main Content */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={showContent ? { scale: 1, rotate: 0 } : {}}
        transition={{ 
          type: "spring",
          stiffness: 280,
          damping: 15,
          duration: 0.8
        }}
      >
        <div style={{ fontSize: '70px', marginBottom: '20px' }}>
          {data.emoji}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={showContent ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        <h2 style={{ 
          color: 'white', 
          fontSize: '32px', 
          fontWeight: 'bold', 
          margin: '0 0 12px 0',
          textShadow: '2px 2px 4px rgba(0,0,0,0.4)'
        }}>
          {data.title}
        </h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={showContent ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <p style={{ 
          color: 'white', 
          fontSize: '20px', 
          margin: '0 0 10px 0',
          textShadow: '1px 1px 3px rgba(0,0,0,0.4)'
        }}>
          {data.message}
        </p>
        <p style={{ 
          color: 'rgba(255,255,255,0.9)', 
          fontSize: '16px', 
          margin: '0 0 20px 0',
          textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
        }}>
          {leadName && `Lead: ${leadName}`}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={showContent ? { opacity: 1, scale: 1 } : {}}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        <p style={{ 
          color: 'rgba(255,255,255,0.95)', 
          fontSize: '15px', 
          margin: '0 0 30px 0',
          fontStyle: 'italic',
          textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
        }}>
          {data.subtitle}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={showContent ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 1.0, duration: 0.4 }}
      >
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.25)',
            border: '2px solid rgba(255,255,255,0.4)',
            borderRadius: '30px',
            padding: '14px 35px',
            color: 'white',
            fontSize: '17px',
            fontWeight: '700',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease'
          }}
        >
          Keep Going! 💪
        </motion.button>
      </motion.div>

      {/* Auto close after 4.5 seconds */}
      {visible && setTimeout(() => onClose(), 4500)}
    </Modal>
  );
};

export default LeadEncouragementModal;
