import React, { useState } from 'react';
import { Dialog, Box, Typography, TextField, Button, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

const ConnectToLumaModal = ({ open, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImportFromLuma = async () => {
    if (!apiKey.trim()) {
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('https://polkadot-attendance-nft-api-bpa5.onrender.com/api/list-luma-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: apiKey
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch events from Luma');
      }

      const data = await response.json();
      console.log('Luma events:', data);
      
      // For now, just log the events and close modal
      // Later we can pass this data to a parent component
      onClose();
      
    } catch (error) {
      console.error('Error importing from Luma:', error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setApiKey('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          padding: 0,
          maxWidth: '480px',
          margin: '16px',
        },
      }}
    >
      <Box
        sx={{
          padding: '32px',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <IconButton
          onClick={handleClose}
          sx={{
            position: 'absolute',
            top: '24px',
            right: '24px',
            color: '#6B7280',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            },
          }}
        >
          <CloseIcon />
        </IconButton>

        {/* Title */}
        <Typography
          sx={{
            fontFamily: 'Manrope, sans-serif',
            fontWeight: 600,
            fontSize: '24px',
            lineHeight: '32px',
            color: '#18171C',
            marginBottom: '16px',
          }}
        >
          Connect to Luma
        </Typography>

        {/* Description */}
        <Typography
          sx={{
            fontFamily: 'Manrope, sans-serif',
            fontWeight: 400,
            fontSize: '16px',
            lineHeight: '24px',
            color: '#6B7280',
            marginBottom: '24px',
          }}
        >
          Enter your Luma API key to import your Luma events. If you do not have a LUMA API key, you can get one{' '}
          <Box
            component="span"
            sx={{
              color: '#FF2670',
              textDecoration: 'underline',
              cursor: 'pointer',
              '&:hover': {
                color: '#E91E63',
              },
            }}
            onClick={() => window.open('https://luma.com/api', '_blank')}
          >
            here
          </Box>
        </Typography>

        {/* Input Label */}
        <Typography
          sx={{
            fontFamily: 'Manrope, sans-serif',
            fontWeight: 500,
            fontSize: '14px',
            lineHeight: '20px',
            color: '#374151',
            marginBottom: '8px',
          }}
        >
          Enter Luma API key
        </Typography>

        {/* Input Field */}
        <TextField
          fullWidth
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter your API key"
          variant="outlined"
          sx={{
            marginBottom: '24px',
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
              '& fieldset': {
                borderColor: '#D1D5DB',
              },
              '&:hover fieldset': {
                borderColor: '#9CA3AF',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#FF2670',
                borderWidth: '2px',
              },
            },
            '& .MuiInputBase-input': {
              padding: '12px 16px',
              fontFamily: 'Manrope, sans-serif',
              fontSize: '16px',
              color: '#374151',
              '&::placeholder': {
                color: '#9CA3AF',
                opacity: 1,
              },
            },
          }}
        />

        {/* Import Button */}
        <Button
          onClick={handleImportFromLuma}
          disabled={loading || !apiKey.trim()}
          sx={{
            backgroundColor: '#FF2670',
            color: 'white',
            borderRadius: '10px',
            padding: '12px',
            textTransform: 'none',
            fontFamily: 'Manrope, sans-serif',
            fontWeight: 600,
            fontSize: '16px',
            width: '200px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            '&:hover': {
              backgroundColor: '#E91E63',
            },
            '&:disabled': {
              backgroundColor: '#F3F4F6',
              color: '#9CA3AF',
            },
          }}
        >
          <Box
            component="img"
            src="/images/import-icon.png" 
            alt="Import"
            sx={{ width: 16, height: 16 }}
          />
          {loading ? 'Importing...' : 'Import from Luma'}
        </Button>
      </Box>
    </Dialog>
  );
};

export default ConnectToLumaModal;