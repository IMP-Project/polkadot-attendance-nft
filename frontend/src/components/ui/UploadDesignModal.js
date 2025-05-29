import React, { useState, useCallback } from 'react';
import {
  Dialog, DialogContent, Box, Typography, Button, TextField,
  IconButton, Switch, FormControlLabel, Chip, Grid, Paper
} from '@mui/material';
import { Close, CloudUpload } from '@mui/icons-material';

const UploadDesignModal = ({ open, onClose, onUpload }) => {
  const [nftTitle, setNftTitle] = useState('');
  const [description, setDescription] = useState('');
  const [traits, setTraits] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [metadata, setMetadata] = useState({
    attendeeName: true,
    eventName: true,
    eventDate: true
  });

  // Handle drag events
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setUploadedFile(file);
    }
  }, []);

  // Handle file input change
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
    }
  };

  // Handle browse file click
  const handleBrowseFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.jpg,.png,.pdf,.mp4';
    input.onchange = handleFileChange;
    input.click();
  };

  // Handle metadata toggle
  const handleMetadataToggle = (field) => {
    setMetadata(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // Handle preview
  const handlePreview = () => {
    // Preview functionality
    console.log('Preview clicked');
  };

  // Handle close
  const handleClose = () => {
    // Reset form
    setNftTitle('');
    setDescription('');
    setTraits('');
    setUploadedFile(null);
    setMetadata({
      attendeeName: true,
      eventName: true,
      eventDate: true
    });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          maxHeight: '90vh',
          backgroundColor: '#FFFFFF'
        }
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Grid container sx={{ height: '100%', flexDirection: 'row', flexWrap: 'nowrap' }}>
          {/* Left Side - Form */}
          <Grid item sx={{ width: '50%', padding: '32px', boxSizing: 'border-box' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography
                sx={{
                  fontFamily: 'Manrope, sans-serif',
                  fontWeight: 600,
                  fontSize: '24px',
                  lineHeight: '32px',
                  color: '#18171C'
                }}
              >
                Add a new design
              </Typography>
              <IconButton onClick={handleClose} sx={{ color: '#6B7280' }}>
                <Close />
              </IconButton>
            </Box>

            <Typography
              sx={{
                fontFamily: 'Manrope, sans-serif',
                fontWeight: 400,
                fontSize: '14px',
                lineHeight: '20px',
                color: '#6B7280',
                mb: 4
              }}
            >
              Upload your artwork and customize how your NFT will look and behave when minted to attendees' wallets.
            </Typography>

            {/* File Upload Area */}
            <Box
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              sx={{
                border: '2px dashed #E5E7EB',
                borderRadius: '12px',
                padding: '32px',
                textAlign: 'center',
                backgroundColor: dragActive ? '#F9FAFB' : '#FAFBFC',
                cursor: 'pointer',
                mb: 3,
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: '#FF2670',
                  backgroundColor: '#F9FAFB'
                }
              }}
              onClick={handleBrowseFile}
            >
              <CloudUpload sx={{ fontSize: 48, color: '#9CA3AF', mb: 2 }} />
              <Typography
                sx={{
                  fontFamily: 'Manrope, sans-serif',
                  fontWeight: 500,
                  fontSize: '16px',
                  lineHeight: '24px',
                  color: '#374151',
                  mb: 1
                }}
              >
                Choose a file or drag & drop it here
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'Manrope, sans-serif',
                  fontWeight: 400,
                  fontSize: '12px',
                  lineHeight: '16px',
                  color: '#9CA3AF',
                  mb: 2
                }}
              >
                JPEG, PNG, PDF, and MP4 formats, up to 50 MB
              </Typography>
              <Button
                variant="outlined"
                sx={{
                  borderColor: '#E5E7EB',
                  color: '#6B7280',
                  textTransform: 'none',
                  fontFamily: 'Manrope, sans-serif',
                  fontWeight: 500,
                  borderRadius: '8px',
                  px: 3,
                  '&:hover': {
                    borderColor: '#FF2670',
                    backgroundColor: 'transparent'
                  }
                }}
              >
                Browse File
              </Button>
              {uploadedFile && (
                <Typography
                  sx={{
                    fontFamily: 'Manrope, sans-serif',
                    fontWeight: 500,
                    fontSize: '14px',
                    color: '#059669',
                    mt: 2
                  }}
                >
                  File uploaded: {uploadedFile.name}
                </Typography>
              )}
            </Box>

            {/* NFT Title */}
            <Box sx={{ mb: 3 }}>
              <Typography
                sx={{
                  fontFamily: 'Manrope, sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  lineHeight: '20px',
                  color: '#374151',
                  mb: 1
                }}
              >
                NFT Title
              </Typography>
              <TextField
                fullWidth
                placeholder="NFT Title"
                value={nftTitle}
                onChange={(e) => setNftTitle(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    '& fieldset': {
                      borderColor: '#E5E7EB',
                    },
                    '& input': {
                      fontFamily: 'Manrope, sans-serif',
                      fontSize: '14px',
                      padding: '12px 14px'
                    }
                  }
                }}
              />
            </Box>

            {/* Description */}
            <Box sx={{ mb: 3 }}>
              <Typography
                sx={{
                  fontFamily: 'Manrope, sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  lineHeight: '20px',
                  color: '#374151',
                  mb: 1
                }}
              >
                Description
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                placeholder="Write something here..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    '& fieldset': {
                      borderColor: '#E5E7EB',
                    },
                    '& textarea': {
                      fontFamily: 'Manrope, sans-serif',
                      fontSize: '14px',
                      padding: '12px 14px'
                    }
                  }
                }}
              />
            </Box>

            {/* Traits */}
            <Box sx={{ mb: 3 }}>
              <Typography
                sx={{
                  fontFamily: 'Manrope, sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  lineHeight: '20px',
                  color: '#374151',
                  mb: 1
                }}
              >
                Traits
              </Typography>
              <TextField
                fullWidth
                placeholder="Add some traits"
                value={traits}
                onChange={(e) => setTraits(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    '& fieldset': {
                      borderColor: '#E5E7EB',
                    },
                    '& input': {
                      fontFamily: 'Manrope, sans-serif',
                      fontSize: '14px',
                      padding: '12px 14px'
                    }
                  }
                }}
              />
            </Box>

            {/* Metadata */}
            <Box sx={{ mb: 4 }}>
              <Typography
                sx={{
                  fontFamily: 'Manrope, sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  lineHeight: '20px',
                  color: '#374151',
                  mb: 2
                }}
              >
                Metadata
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={metadata.attendeeName}
                      onChange={() => handleMetadataToggle('attendeeName')}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#FF2670',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#FF2670',
                        },
                      }}
                    />
                  }
                  label={
                    <Typography
                      sx={{
                        fontFamily: 'Manrope, sans-serif',
                        fontSize: '14px',
                        color: '#6B7280'
                      }}
                    >
                      Attendee name
                    </Typography>
                  }
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={metadata.eventName}
                      onChange={() => handleMetadataToggle('eventName')}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#FF2670',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#FF2670',
                        },
                      }}
                    />
                  }
                  label={
                    <Typography
                      sx={{
                        fontFamily: 'Manrope, sans-serif',
                        fontSize: '14px',
                        color: '#6B7280'
                      }}
                    >
                      Event name
                    </Typography>
                  }
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={metadata.eventDate}
                      onChange={() => handleMetadataToggle('eventDate')}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#FF2670',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#FF2670',
                        },
                      }}
                    />
                  }
                  label={
                    <Typography
                      sx={{
                        fontFamily: 'Manrope, sans-serif',
                        fontSize: '14px',
                        color: '#6B7280'
                      }}
                    >
                      Event Date
                    </Typography>
                  }
                />
              </Box>
            </Box>

            {/* Preview Button */}
            <Button
              onClick={handlePreview}
              variant="contained"
              sx={{
                backgroundColor: '#FF2670',
                color: 'white',
                borderRadius: '8px',
                padding: '12px 24px',
                textTransform: 'none',
                fontFamily: 'Manrope, sans-serif',
                fontWeight: 500,
                fontSize: '14px',
                '&:hover': {
                  backgroundColor: '#E91E63',
                },
              }}
            >
              Preview
            </Button>
          </Grid>

          {/* Right Side - Preview */}
          <Grid item sx={{ width: '50%', padding: '32px', backgroundColor: '#F9FAFB', boxSizing: 'border-box' }}>
            <Typography
              sx={{
                fontFamily: 'Manrope, sans-serif',
                fontWeight: 600,
                fontSize: '24px',
                lineHeight: '32px',
                color: '#18171C',
                mb: 1
              }}
            >
              Preview
            </Typography>

            <Typography
              sx={{
                fontFamily: 'Manrope, sans-serif',
                fontWeight: 400,
                fontSize: '14px',
                lineHeight: '20px',
                color: '#6B7280',
                mb: 4
              }}
            >
              View how your NFT looks in real time
            </Typography>

            {/* NFT Preview Card */}
            <Paper
              sx={{
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                mb: 3
              }}
            >
              <Typography
                sx={{
                  fontFamily: 'Manrope, sans-serif',
                  fontWeight: 600,
                  fontSize: '16px',
                  lineHeight: '24px',
                  color: '#18171C',
                  p: 2,
                  borderBottom: '1px solid #E5E7EB'
                }}
              >
                Attendance Badge - Polkadot Connect
              </Typography>

              {/* Preview Image Area */}
              <Box
                sx={{
                  height: '200px',
                  backgroundColor: '#E5E7EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {uploadedFile ? (
                  <img
                    src={URL.createObjectURL(uploadedFile)}
                    alt="Preview"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <Typography sx={{ color: '#9CA3AF', fontSize: '14px' }}>
                    Preview will appear here
                  </Typography>
                )}
              </Box>
            </Paper>

            {/* Description */}
            <Box sx={{ mb: 3 }}>
              <Typography
                sx={{
                  fontFamily: 'Manrope, sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  lineHeight: '20px',
                  color: '#374151',
                  mb: 1
                }}
              >
                Description
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'Manrope, sans-serif',
                  fontWeight: 400,
                  fontSize: '12px',
                  lineHeight: '16px',
                  color: '#6B7280'
                }}
              >
                {description || 'This NFT serves as verifiable proof of attendance at {event_name}. Minted on the Polkadot blockchain, it commemorates your participation and may unlock special perks, access, or exclusive content within the ecosystem.'}
              </Typography>
            </Box>

            {/* Traits */}
            <Box sx={{ mb: 3 }}>
              <Typography
                sx={{
                  fontFamily: 'Manrope, sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  lineHeight: '20px',
                  color: '#374151',
                  mb: 1
                }}
              >
                Traits
              </Typography>
              <Chip
                label="VIP"
                size="small"
                sx={{
                  backgroundColor: '#F3F4F6',
                  color: '#6B7280',
                  fontFamily: 'Manrope, sans-serif',
                  fontSize: '12px'
                }}
              />
            </Box>

            {/* Metadata */}
            <Box>
              <Typography
                sx={{
                  fontFamily: 'Manrope, sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  lineHeight: '20px',
                  color: '#374151',
                  mb: 2
                }}
              >
                Metadata
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label="Attendee Name"
                  size="small"
                  sx={{
                    backgroundColor: '#EFF6FF',
                    color: '#1D4ED8',
                    fontFamily: 'Manrope, sans-serif',
                    fontSize: '11px'
                  }}
                />
                <Chip
                  label="Event date"
                  size="small"
                  sx={{
                    backgroundColor: '#F0F9FF',
                    color: '#0369A1',
                    fontFamily: 'Manrope, sans-serif',
                    fontSize: '11px'
                  }}
                />
                <Chip
                  label="Tag"
                  size="small"
                  sx={{
                    backgroundColor: '#F9FAFB',
                    color: '#6B7280',
                    fontFamily: 'Manrope, sans-serif',
                    fontSize: '11px'
                  }}
                />
              </Box>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
};

export default UploadDesignModal;