import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useEvents } from '../contexts/EventsContext'; // Add this import

const Login = () => {
  const navigate = useNavigate();
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Add this to access events context
  const { refreshEventsAfterLogin } = useEvents();

  const handleLogin = (address) => {
    // After successful login, redirect to admin dashboard
    navigate('/admin');
  };

  // If user is already logged in, redirect to admin
  useEffect(() => {
    if (api.isAuthenticated()) {
      navigate('/admin');
    }
  }, [navigate]);

  const handleWalletAddressChange = (event) => {
    setWalletAddress(event.target.value);
    setError(''); // Clear error when user types
  };

  const handleContinue = async () => {
    if (!walletAddress || walletAddress.trim() === '') {
      setError('Please enter a valid Polkadot address');
      return;
    }

    // Simple validation - Polkadot addresses start with 1, 5, or other specific prefixes and are 47-48 chars
    if (walletAddress.length < 45 || walletAddress.length > 50) {
      setError('Invalid Polkadot address format');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Call the backend API using the api service
      const data = await api.login(walletAddress.trim());

      // Success! The api.login method already stores the token
      // Log success for debugging
      console.log("API login successful:", {
        userId: data.user.id,
        walletAddress: data.user.walletAddress,
        tokenReceived: !!data.token
      });
      
      // NEW: Refresh events after successful login
      console.log("🔄 Triggering events refresh after login...");
      setTimeout(() => {
        refreshEventsAfterLogin();
      }, 500); // Small delay to ensure token is saved
      
      // Run callback function
      handleLogin(walletAddress);
      
    } catch (err) {
      console.error("Login error:", err);
      
      // Handle specific error cases
      if (err.message.includes('Failed to fetch')) {
        setError("Unable to connect to the server. Please check your internet connection and try again.");
      } else if (err.message.includes('Invalid wallet')) {
        setError("Invalid wallet address format. Please check your address and try again.");
      } else {
        setError(err.message || "Login failed. Please try again.");
      }
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

          {/* Enter your Polkadot address label */}
          <Typography
            sx={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
              fontSize: '14px',
              color: '#6B7280',
              alignSelf: 'flex-start',
              mb: '1px',
            }}
          >
            Enter your Polkadot address
          </Typography>

          {/* Input Field */}
          <TextField
            fullWidth
            value={walletAddress}
            onChange={handleWalletAddressChange}
            placeholder="e.g., 1xxxx... or 5xxxx..."
            variant="outlined"
            error={!!error}
            helperText={error}
            disabled={loading}
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': {
                height: '44px',
                borderRadius: '8px',
                fontFamily: 'Manrope, sans-serif',
                '& fieldset': {
                  borderColor: '#E5E7EB',
                },
                '&:hover fieldset': {
                  borderColor: '#D1D5DB',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#FF2670',
                  borderWidth: '2px',
                },
                '&.Mui-error fieldset': {
                  borderColor: '#EF4444',
                },
              },
              '& .MuiInputBase-input': {
                padding: '12px 16px',
                fontFamily: 'Manrope, sans-serif',
                fontSize: '16px',
              },
              '& .MuiFormHelperText-root': {
                fontFamily: 'Manrope, sans-serif',
                fontSize: '14px',
              },
            }}
          />

          {/* Continue Button */}
          <Button
            fullWidth
            variant="contained"
            onClick={handleContinue}
            disabled={loading}
            sx={{
              backgroundColor: '#FF2670',
              width: '100%',
              height: '44px',
              borderRadius: '10px',
              padding: '12px',
              gap: '4px',
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 600,
              fontSize: '16px',
              textTransform: 'none',
              mb: 3,
              '&:hover': {
                backgroundColor: '#E91E63',
              },
              '&:disabled': {
                backgroundColor: '#F3F4F6',
                color: '#9CA3AF',
              },
            }}
          >
            {loading ? 'Connecting...' : 'Continue'}
          </Button>

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