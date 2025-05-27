import React from 'react';
import { Box, Typography, Button } from '@mui/material';

const PageHeader = ({ 
  title, 
  subtitle, 
  showIcons = true, 
  showButton = true, 
  buttonText = "Connect to Luma", 
  onButtonClick,
  buttonIcon = "/images/plus-icon.png"
}) => {
  return (
    <Box
      sx={{
        px: 4,
        py: 3,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}
    >
      {/* Left Side - Title and Subtitle */}
      <Box>
        <Typography
          sx={{
            fontFamily: 'Manrope, sans-serif',
            fontWeight: 500,
            fontSize: '20px',
            lineHeight: '33.6px',
            color: '#18171C',
            mb: 0.5,
          }}
        >
          {title}
        </Typography>
        <Typography
          sx={{
            fontFamily: 'Manrope, sans-serif',
            fontWeight: 400,
            fontSize: '14px',
            lineHeight: '19.6px',
            letterSpacing: '1.4%',
            color: '#77738C',
          }}
        >
          {subtitle}
        </Typography>
      </Box>
      
      {/* Right Side - Icons and Button */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {showIcons && (
          <>
            {/* Search icon */}
            <Box
              component="img"
              src="/images/search-icon.png"
              alt="Search"
              sx={{ width: 20, height: 20, cursor: 'pointer' }}
            />
            
            {/* Bell icon */}
            <Box
              component="img"
              src="/images/bell-icon.png"
              alt="Notifications"
              sx={{ width: 20, height: 20, cursor: 'pointer' }}
            />
          </>
        )}
        
        {/* Action Button */}
        {showButton && (
          <Button
            onClick={onButtonClick}
            sx={{
              backgroundColor: '#FF2670',
              color: 'white',
              borderRadius: '8px',
              padding: '12px',
              textTransform: 'none',
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 500,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              whiteSpace: 'nowrap',
              '&:hover': {
                backgroundColor: '#E91E63',
              },
            }}
          >
            <Box sx={{ width: 7 }} /> 
            <Box
              component="img"
              src={buttonIcon}
              alt="Action"
              sx={{ width: 16, height: 16 }}
            />
            {buttonText}
            <Box sx={{ width: 13 }} /> 
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default PageHeader;