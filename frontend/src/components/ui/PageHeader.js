import React from 'react';
import { Box, Typography, Button } from '@mui/material';

const PageHeader = ({ 
  title, 
  subtitle, 
  showIcons = true, 
  showButton = true, 
  buttonText = "Connect to Luma", 
  onButtonClick,
  buttonIcon = "/images/plus-icon.png",
  sx
}) => {
  return (
    <Box
  sx={{
    px: { xs: 2, md: 4 },
    py: { xs: 8, md: 3 },
    display: 'flex',
    flexDirection: { xs: 'column', md: 'row' },
    justifyContent: 'space-between',
    alignItems: { xs: 'center', md: 'flex-start' },
    gap: 2,
    ...sx
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
    color: (theme) => theme.palette.text.primary,
    mb: 0.5,
    textAlign: { xs: 'center', md: 'left' }
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
    color: (theme) => theme.palette.text.secondary,
    textAlign: { xs: 'center', md: 'left' }
  }}
>

          {subtitle}
        </Typography>
      </Box>
      
      {/* Right Side - Icons and Button */}
      <Box
  sx={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: { xs: 'center', md: 'flex-end' },
    gap: 3,
    mt: { xs: 2, md: 0 },
    flexWrap: 'wrap'
  }}
>

        {showIcons && (
          <>
            {/* Search icon */}
            <Box
              component="img"
              src="/images/search-icon.png"
              alt="Search"
              sx={{ 
                width: 20, 
                height: 20, 
                cursor: 'pointer',
                filter: (theme) => theme.palette.mode === 'dark' ? 'brightness(0) invert(1)' : 'none'
              }}
            />
            
            {/* Bell icon */}
            <Box
              component="img"
              src="/images/bell-icon.png"
              alt="Notifications"
              sx={{ 
                width: 20, 
                height: 20, 
                cursor: 'pointer',
                filter: (theme) => theme.palette.mode === 'dark' ? 'brightness(0) invert(1)' : 'none'
              }}
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
            {typeof buttonIcon === 'string' ? (
              <Box
                component="img"
                src={buttonIcon}
                alt="Action"
                sx={{ width: 16, height: 16 }}
              />
            ) : (
              buttonIcon
            )}
            {buttonText}
            <Box sx={{ width: 13 }} /> 
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default PageHeader;