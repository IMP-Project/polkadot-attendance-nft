import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useEvents } from '../contexts/EventsContext';
import PAPIWalletConnector from '../components/auth/PAPIWalletConnector';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Add this to access events context
  const { refreshEventsAfterLogin } = useEvents();

  // If user is already logged in, redirect to admin
  useEffect(() => {
    if (api.isAuthenticated()) {
      navigate('/admin');
    }
  }, [navigate]);

  const handleWalletConnect = async (walletAddress) => {
    setLoading(true);
    
    try {
      // Call the backend API using the api service
      const data = await api.login(walletAddress.trim());

      // Success! The api.login method already stores the token
      console.log("🎉 Wallet login successful:", {
        userId: data.user.id,
        walletAddress: data.user.walletAddress,
        tokenReceived: !!data.token
      });
      
      // Refresh events after successful login
      console.log("🔄 Triggering events refresh after login...");
      setTimeout(() => {
        refreshEventsAfterLogin();
      }, 500); // Small delay to ensure token is saved
      
      // Redirect to admin dashboard
      navigate('/admin');
      
    } catch (err) {
      console.error("❌ Wallet login error:", err);
      // Error handling will be done by the wallet connector component
    } finally {
      setLoading(false);
    }
  };

  const handleLearnMore = () => {
    // You can customize this to redirect wherever you want
    window.open('https://polkadot.network/', '_blank');
  };

  return (
    <Box
  sx={{
    display: 'flex',
    minHeight: '100vh',
    fontFamily: 'Unbounded, sans-serif',
    flexDirection: {
      xs: 'column-reverse', // Form on top, image below on mobile
      lg: 'row',            // Image left, form right on large screens
    },
  }}
>

      {/* Left Side - Background Image */}
      <Box
  sx={{
    width: { xs: '100%', lg: '50%' },
    minHeight: { xs: '200px', lg: 'auto' },
    flexGrow: 1,
    backgroundImage: `url('/images/conference-image.png')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    position: 'relative',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: `
        radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.3) 2px, transparent 2px),
        radial-gradient(circle at 80% 40%, rgba(255, 255, 255, 0.2) 2px, transparent 2px),
        radial-gradient(circle at 40% 80%, rgba(255, 255, 255, 0.25) 2px, transparent 2px),
        radial-gradient(circle at 70% 70%, rgba(255, 255, 255, 0.2) 2px, transparent 2px),
        radial-gradient(circle at 30% 50%, rgba(255, 255, 255, 0.3) 2px, transparent 2px)
      `,
      backgroundSize: '60px 60px, 80px 80px, 100px 100px, 90px 90px, 70px 70px',
      zIndex: 1,
    }
  }}
/>

      {/* Right Side - Login Form */}
      <Box
  sx={{
    width: { xs: '100%', lg: '50%' },
    flexGrow: 1,
    minHeight: { xs: 'auto', lg: '100vh' },
    backgroundColor: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    padding: { xs: '24px', sm: '32px', lg: '60px' },
  }}
>

        {/* Top Right Icons */}
        <Box
          sx={{
            position: 'absolute',
            top: 24,
            right: 24,
            display: 'flex',
            gap: 1,
          }}
        >
          <IconButton
            sx={{
              width: 40,
              height: 40,
              backgroundColor: '#f5f5f5',
              '&:hover': { backgroundColor: '#e0e0e0' },
            }}
          >
            {/* Replace with your first icon */}
            <Box
              component="img"
              src="/images/bulbicon.png" // Replace with your icon path
              alt="Settings"
              sx={{ width: 20, height: 20 }}
            />
          </IconButton>
          <IconButton
            sx={{
              width: 40,
              height: 40,
              backgroundColor: '#f5f5f5',
              '&:hover': { backgroundColor: '#e0e0e0' },
            }}
          >
            {/* Replace with your second icon */}
            <Box
              component="img"
              src="/images/moonicon.png" // Replace with your icon path
              alt="Theme"
              sx={{ width: 20, height: 20 }}
            />
          </IconButton>
        </Box>

        {/* Main Content Container */}
        <Box
  sx={{
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    width: '100%',
    maxWidth: '400px', // slightly smaller max
    px: { xs: 2, sm: 3, md: 0 }, // mobile padding
    margin: '0 auto',
  }}
>

          {/* Polkadot Logo */}
          <Box
            sx={{
              mb: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Box
              component="img"
              src="/images/Polkadot_Logo.png" 
              alt="Polkadot"
              sx={{ height: 32 }}
            />
            <Typography
              sx={{
                fontFamily: 'Unbounded, sans-serif',
                fontWeight: 600,
                fontSize: '24px',
                color: '#18171C',
              }}
            >
            </Typography>
          </Box>

          {/* Holla */}
          <Typography
            sx={{
              fontFamily: 'Unbounded, sans-serif',
              fontWeight: 400,
              fontSize: '39px',
              lineHeight: '114.999%',
              letterSpacing: '0%',
              textAlign: 'center',
              color: '#18171C',
              mb: 1,
            }}
          >
            Holla
          </Typography>

          {/* Connect your wallet */}
          <Typography
            sx={{
              fontFamily: 'Unbounded, sans-serif',
              fontWeight: 400,
              fontSize: '39px',
              lineHeight: '114.999%',
              letterSpacing: '0%',
              textAlign: 'center',
              color: '#18171C',
              mb: 4,
            }}
          >
            Connect your wallet
          </Typography>

          {/* Description paragraph */}
          <Typography
            sx={{
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 400,
              fontSize: '18px',
              lineHeight: '24px',
              letterSpacing: '0.9%',
              textAlign: 'center',
              color: '#18171C',
              mb: 6,
              maxWidth: '400px',
            }}
          >
            Connect your Polkadot wallet to manage events and mint attendance NFTs
          </Typography>

          {/* PAPI Wallet Connector */}
          <PAPIWalletConnector 
            onConnect={handleWalletConnect}
            loading={loading}
          />

          {/* Learn how it works link */}
          <Button
            onClick={handleLearnMore}
            sx={{
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 500,
              fontSize: '16px',
              color: '#FF2670',
              textTransform: 'none',
              textDecoration: 'none',
              '&:hover': {
                backgroundColor: 'rgba(255, 38, 112, 0.04)',
                textDecoration: 'underline',
              },
            }}
          >
            Learn how it works →
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Login;