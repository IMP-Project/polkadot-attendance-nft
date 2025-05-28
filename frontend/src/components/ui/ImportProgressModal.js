import React from 'react';
import { Dialog, Box, Typography, LinearProgress, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

const ImportProgressModal = ({ open, onClose, eventName = '', progress = 50 }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          padding: 0,
          maxWidth: '400px',
          margin: '16px',
        },
      }}
    >
      <Box
        sx={{
          padding: '32px',
          position: 'relative',
          textAlign: 'center',
        }}
      >
        {/* Close Button */}
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: '16px',
            right: '16px',
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
            marginBottom: '12px',
          }}
        >
          Importing...
        </Typography>

        {/* Description */}
        <Typography
          sx={{
            fontFamily: 'Manrope, sans-serif',
            fontWeight: 400,
            fontSize: '16px',
            lineHeight: '24px',
            color: '#6B7280',
            marginBottom: '32px',
          }}
        >
          Be patient. This will take just a little while
        </Typography>

        {/* Event Name */}
        {eventName && (
          <Typography
            sx={{
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 500,
              fontSize: '14px',
              lineHeight: '20px',
              color: '#374151',
              marginBottom: '24px',
            }}
          >
            {eventName}
          </Typography>
        )}

        {/* Progress Bar */}
        <Box sx={{ marginBottom: '16px' }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: '8px',
              borderRadius: '4px',
              backgroundColor: '#E5E7EB',
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#FF2670',
                borderRadius: '4px',
              },
            }}
          />
        </Box>

        {/* Progress Percentage */}
        <Typography
          sx={{
            fontFamily: 'Manrope, sans-serif',
            fontWeight: 500,
            fontSize: '14px',
            lineHeight: '20px',
            color: '#FF2670',
          }}
        >
          {Math.round(progress)}%
        </Typography>
      </Box>
    </Dialog>
  );
};

export default ImportProgressModal;