import React from 'react';
import { Box, Typography, Button } from '@mui/material';

const EventsPage = ({ onConnectToLuma }) => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Bar */}
      <Box
        sx={{
          px: 4,
          py: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
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
            Events
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
            Plan, manage, and monitor your on-chain events
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 5 }}>
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
          
          {/* Import from Luma button */}
          <Button
            onClick={onConnectToLuma}
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
              src="/images/plus-icon.png"
              alt="Import"
              sx={{ width: 16, height: 16 }}
            />
            Import from Luma
            <Box sx={{ width: 13 }} /> 
          </Button>
        </Box>
      </Box>

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 4,
        }}
      >
        <Box
          sx={{
            textAlign: 'center',
            maxWidth: '600px',
          }}
        >
          {/* Calendar Image */}
          <Box
            sx={{
              mb: 4,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <Box
              component="img"
              src="/images/calender-icon.png"
              alt="Calendar"
              sx={{
                width: 120,
                height: 120,
              }}
            />
          </Box>

          {/* Main Heading */}
          <Typography
            sx={{
              fontFamily: 'Unbounded, sans-serif',
              fontWeight: 400,
              fontSize: '39px',
              lineHeight: '114.9%',
              letterSpacing: '0%',
              textAlign: 'center',
              color: '#18171C',
              mb: 3,
            }}
          >
            Create an event
          </Typography>

          {/* Description */}
          <Typography
            sx={{
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 400,
              fontSize: '18px',
              lineHeight: '24px',
              letterSpacing: '0.9%',
              textAlign: 'center',
              color: '#484554',
              mb: 4,
              maxWidth: '500px',
              mx: 'auto',
            }}
          >
            Connect your Luma events and start minting on-chain attendance NFTs — reward your attendees the web 3 way
          </Typography>

          {/* Connect to Luma Button */}
          <Button
            onClick={onConnectToLuma}
            sx={{
              backgroundColor: '#FF2670',
              color: 'white',
              borderRadius: '8px',
              padding: '12px 24px',
              textTransform: 'none',
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 500,
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              boxShadow: '0 4px 12px rgba(255, 38, 112, 0.3)',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: '#E91E63',
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 20px rgba(255, 38, 112, 0.4)',
              },
            }}
          >
            <Box
              component="img"
              src="/images/plus-icon.png"
              alt="Create"
              sx={{ width: 16, height: 16 }}
            />
            Connect to Luma
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default EventsPage;