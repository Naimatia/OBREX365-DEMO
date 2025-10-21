import React from 'react';
import { motion } from 'framer-motion';

// Animation wrapper component for property cards
const AnimatedCard = ({ children, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5,
        delay: index * 0.1, // stagger effect
        ease: "easeOut"
      }}
      className="h-100"
    >
      {children}
    </motion.div>
  );
};

export default AnimatedCard;
