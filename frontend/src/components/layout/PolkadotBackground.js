import React, { useEffect, useState } from 'react';
import { Box, useTheme } from '@mui/material';

const PolkadotBackground = () => {
  const theme = useTheme();
  const [bubbles, setBubbles] = useState([]);
  
  // Generate random bubbles on mount
  useEffect(() => {
    const numberOfBubbles = 25; // Increased from 15
    const newBubbles = [];
    
    for (let i = 0; i < numberOfBubbles; i++) {
      newBubbles.push({
        id: i,
        size: Math.random() * 100 + 30, // Larger sizes: 30px to 130px
        x: Math.random() * 100, // 0% to 100%
        y: Math.random() * 100, // 0% to 100%
        duration: Math.random() * 40 + 20, // 20s to 60s
        delay: Math.random() * 5,
        primaryColor: Math.random() > 0.5,
      });
    }
    
    setBubbles(newBubbles);
  }, []);
  
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -1,
        overflow: 'hidden',
        pointerEvents: 'none', // Allow clicking through
      }}
    >
      {bubbles.map((bubble) => (
        <Box
          key={bubble.id}
          sx={{
            position: 'absolute',
            width: bubble.size,
            height: bubble.size,
            borderRadius: '50%',
            backgroundColor: bubble.primaryColor 
              ? (theme.palette.mode === 'dark' 
                  ? 'rgba(230, 0, 122, 0.08)' // Increased from 0.05
                  : 'rgba(230, 0, 122, 0.12)') // Increased from 0.08
              : (theme.palette.mode === 'dark'
                  ? 'rgba(85, 43, 191, 0.08)' // Increased from 0.05
                  : 'rgba(85, 43, 191, 0.12)'), // Increased from 0.08
            left: `${bubble.x}%`,
            top: `${bubble.y}%`,
            animation: `float-${bubble.id} ${bubble.duration}s infinite alternate ease-in-out`,
            animationDelay: `${bubble.delay}s`,
            '@keyframes': {
              [`float-${bubble.id}`]: {
                '0%': {
                  transform: 'translate(0, 0) rotate(0deg)',
                },
                '33%': {
                  transform: `translate(${Math.random() * 300 - 150}px, ${Math.random() * 300 - 150}px) rotate(${Math.random() * 30}deg)`,
                },
                '66%': {
                  transform: `translate(${Math.random() * 300 - 150}px, ${Math.random() * 300 - 150}px) rotate(${Math.random() * 30}deg)`,
                },
                '100%': {
                  transform: `translate(${Math.random() * 300 - 150}px, ${Math.random() * 300 - 150}px) rotate(${Math.random() * 30}deg)`,
                },
              },
            },
            // Add internal dots to make them look more like Polkadot branding
            '&::before': {
              content: '""',
              position: 'absolute',
              width: '30%',
              height: '30%',
              borderRadius: '50%',
              backgroundColor: bubble.primaryColor 
                ? (theme.palette.mode === 'dark' 
                    ? 'rgba(230, 0, 122, 0.3)' // Increased from 0.2
                    : 'rgba(230, 0, 122, 0.3)') 
                : (theme.palette.mode === 'dark'
                    ? 'rgba(85, 43, 191, 0.3)' // Increased from 0.2
                    : 'rgba(85, 43, 191, 0.3)'),
              top: '35%',
              left: '35%',
            },
            // Add subtle glow effect
            boxShadow: bubble.primaryColor
              ? (theme.palette.mode === 'dark'
                  ? '0 0 30px rgba(230, 0, 122, 0.07)' // Increased
                  : '0 0 40px rgba(230, 0, 122, 0.1)')
              : (theme.palette.mode === 'dark'
                  ? '0 0 30px rgba(85, 43, 191, 0.07)' // Increased
                  : '0 0 40px rgba(85, 43, 191, 0.1)'),
            // Add subtle rotation to make animation more interesting
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
    </Box>
  );
};

export default PolkadotBackground; 