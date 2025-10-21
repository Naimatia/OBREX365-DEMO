// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Modal } from 'antd';
import { motion } from 'framer-motion';
import { ContactStatus } from 'models/ContactModel';

/**
 * Encouragement Modal Component
 * Shows animated motivational messages when contact status is updated
 */
const EncouragementModal = ({ visible, status, contactName, onClose }) => {
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
      case ContactStatus.CONTACTED:
        return {
          emoji: '📞',
          title: 'Nice Move!',
          message: 'Great job reaching out to the client!',
          subtitle: 'Keep building that relationship 🚀',
          color: '#1890ff',
          bgColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          particle: '💫'
        };
      case ContactStatus.DEAL:
        return {
          emoji: '🎉',
          title: 'BINGO!',
          message: 'Fantastic! You closed the deal!',
          subtitle: 'You\'re absolutely crushing it! 💰',
          color: '#52c41a',
          bgColor: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          particle: '🌟'
        };
      case ContactStatus.LOSS:
        return {
          emoji: '💪',
          title: 'Keep Going!',
          message: 'Not every lead converts, and that\'s okay!',
          subtitle: 'You can do better next time! 🎯',
          color: '#faad14',
          bgColor: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
          particle: '⚡'
        };
      default:
        return {
          emoji: '👍',
          title: 'Great!',
          message: 'Status updated successfully!',
          subtitle: 'Keep up the good work!',
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
      width={400}
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
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          animate={showContent ? { 
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
            x: [0, Math.random() * 200 - 100],
            y: [0, Math.random() * 200 - 100]
          } : {}}
          transition={{ 
            duration: 2,
            delay: i * 0.3,
            repeat: Infinity,
            repeatDelay: 2
          }}
          style={{
            position: 'absolute',
            fontSize: '20px',
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
          stiffness: 260,
          damping: 20,
          duration: 0.6
        }}
      >
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>
          {data.emoji}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={showContent ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <h2 style={{ 
          color: 'white', 
          fontSize: '28px', 
          fontWeight: 'bold', 
          margin: '0 0 10px 0',
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
        }}>
          {data.title}
        </h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={showContent ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <p style={{ 
          color: 'white', 
          fontSize: '18px', 
          margin: '0 0 8px 0',
          textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
        }}>
          {data.message}
        </p>
        <p style={{ 
          color: 'rgba(255,255,255,0.9)', 
          fontSize: '16px', 
          margin: '0 0 20px 0',
          textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
        }}>
          {contactName && `Contact: ${contactName}`}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={showContent ? { opacity: 1, scale: 1 } : {}}
        transition={{ delay: 0.7, duration: 0.4 }}
      >
        <p style={{ 
          color: 'rgba(255,255,255,0.95)', 
          fontSize: '14px', 
          margin: '0 0 25px 0',
          fontStyle: 'italic',
          textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
        }}>
          {data.subtitle}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={showContent ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.9, duration: 0.4 }}
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: '25px',
            padding: '12px 30px',
            color: 'white',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease'
          }}
        >
          Continue 🚀
        </motion.button>
      </motion.div>

      {/* Auto close after 4 seconds */}
      {visible && setTimeout(() => onClose(), 4000)}
    </Modal>
  );
};

export default EncouragementModal;
