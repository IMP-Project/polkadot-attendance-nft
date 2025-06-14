import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog, DialogContent, Box, Typography, Button, TextField,
  IconButton, Switch, FormControlLabel, Chip, Grid, Paper, CircularProgress
} from '@mui/material';
import { Close, CloudUpload } from '@mui/icons-material';

const UploadDesignModal = ({ open, onClose, onUpload }) => {
  const [nftTitle, setNftTitle] = useState('');
  const [description, setDescription] = useState('');
  const [traits, setTraits] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedFileData, setUploadedFileData] = useState(null); // Store base64 data
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [metadata, setMetadata] = useState({
    attendeeName: true,
    eventName: true,
    eventDate: true
  });

  // Load saved data from localStorage on component mount
  useEffect(() => {
    if (open) {
      const savedData = localStorage.getItem('nftDesignDraft');
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          setNftTitle(parsed.nftTitle || '');
          setDescription(parsed.description || '');
          setTraits(parsed.traits || '');
          setMetadata(parsed.metadata || {
            attendeeName: true,
            eventName: true,
            eventDate: true
          });
          if (parsed.uploadedFileData) {
            setUploadedFileData(parsed.uploadedFileData);
            // Recreate file object for display purposes
            setUploadedFile({ name: parsed.uploadedFileName || 'Saved file' });
          }
        } catch (error) {
          console.error('Error loading saved draft:', error);
        }
      }
    }
  }, [open]);

  // Save draft data to localStorage whenever form data changes
  useEffect(() => {
    if (open && (nftTitle || description || traits || uploadedFileData)) {
      const draftData = {
        nftTitle,
        description,
        traits,
        metadata,
        uploadedFileData,
        uploadedFileName: uploadedFile?.name,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('nftDesignDraft', JSON.stringify(draftData));
    }
  }, [nftTitle, description, traits, metadata, uploadedFileData, uploadedFile, open]);

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

  // NEW - Just store the file, no base64 conversion:
const processFile = (file) => {
  setUploadedFile(file);
  // Create preview URL for display
  const previewUrl = URL.createObjectURL(file);
  setUploadedFileData(previewUrl);
};

  // Handle drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  }, []);

  // Handle file input change
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processFile(file);
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

  // Handle upload instead of preview
  const handleUpload = async () => {
    // Validate required fields
    if (!uploadedFileData || !nftTitle) {
      console.error('Please upload a file and provide a title');
      return;
    }

    setUploading(true);

    try {
      const designData = {
        file: uploadedFile,           // Just the File object, no base64
        title: nftTitle,
        description: description || 'This NFT serves as verifiable proof of attendance at {event_name}. Minted on the Polkadot blockchain, it commemorates your participation and may unlock special perks, access, or exclusive content within the ecosystem.',
        traits: traits || 'VIP',
        metadata: metadata
      };

      // Call the onUpload callback with the design data
      if (onUpload) {
        await onUpload(designData);
      }

      // Clear the saved draft after successful upload
      localStorage.removeItem('nftDesignDraft');

      // Close the modal
      handleClose();
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  // Handle close
  const handleClose = () => {

    // Add this to handleClose to prevent memory leaks:
if (uploadedFileData && uploadedFileData.startsWith('blob:')) {
  URL.revokeObjectURL(uploadedFileData);
}

    // Ask user if they want to save draft before closing
    if ((nftTitle || description || traits || uploadedFileData) && open) {
      const shouldClearDraft = window.confirm('Do you want to discard your changes? Your draft will be saved for later.');
      if (shouldClearDraft) {
        localStorage.removeItem('nftDesignDraft');
      }
    }
    
    // Reset form
    setNftTitle('');
    setDescription('');
    setTraits('');
    setUploadedFile(null);
    setUploadedFileData(null);
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
          backgroundColor: (theme) => theme.palette.background.paper
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
                  color: (theme) => theme.palette.text.primary
                }}
              >
                Add a new design
              </Typography>
              <IconButton onClick={handleClose} sx={{ color: (theme) => theme.palette.text.secondary }}>
                <Close />
              </IconButton>
            </Box>

            <Typography
              sx={{
                fontFamily: 'Manrope, sans-serif',
                fontWeight: 400,
                fontSize: '14px',
                lineHeight: '20px',
                color: (theme) => theme.palette.text.secondary,
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
                border: (theme) => `2px dashed ${theme.palette.divider}`,
                borderRadius: '12px',
                padding: '32px',
                textAlign: 'center',
                backgroundColor: (theme) => dragActive ? theme.palette.action.hover : theme.palette.background.default,
                cursor: 'pointer',
                mb: 3,
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: '#FF2670',
                  backgroundColor: (theme) => theme.palette.action.hover
                }
              }}
              onClick={handleBrowseFile}
            >
              <CloudUpload sx={{ fontSize: 48, color: (theme) => theme.palette.text.secondary, mb: 2 }} />
              <Typography
                sx={{
                  fontFamily: 'Manrope, sans-serif',
                  fontWeight: 500,
                  fontSize: '16px',
                  lineHeight: '24px',
                  color: (theme) => theme.palette.text.primary,
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
                  color: (theme) => theme.palette.text.secondary,
                  mb: 2
                }}
              >
                JPEG, PNG, PDF, and MP4 formats, up to 50 MB
              </Typography>
              <Button
                variant="outlined"
                sx={{
                  borderColor: (theme) => theme.palette.divider,
                  color: (theme) => theme.palette.text.secondary,
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
                  color: (theme) => theme.palette.text.primary,
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
                      borderColor: (theme) => theme.palette.divider,
                    },
                    '& input': {
                      fontFamily: 'Manrope, sans-serif',
                      fontSize: '14px',
                      padding: '12px 14px',
                      color: (theme) => theme.palette.text.primary
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
                  color: (theme) => theme.palette.text.primary,
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
                      borderColor: (theme) => theme.palette.divider,
                    },
                    '& textarea': {
                      fontFamily: 'Manrope, sans-serif',
                      fontSize: '14px',
                      padding: '12px 14px',
                      color: (theme) => theme.palette.text.primary
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
                  color: (theme) => theme.palette.text.primary,
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
                      borderColor: (theme) => theme.palette.divider,
                    },
                    '& input': {
                      fontFamily: 'Manrope, sans-serif',
                      fontSize: '14px',
                      padding: '12px 14px',
                      color: (theme) => theme.palette.text.primary
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
                  color: (theme) => theme.palette.text.primary,
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
                        color: (theme) => theme.palette.text.primary
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
                        color: (theme) => theme.palette.text.primary
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
                        color: (theme) => theme.palette.text.primary
                      }}
                    >
                      Event Date
                    </Typography>
                  }
                />
              </Box>
            </Box>

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              variant="contained"
              disabled={!uploadedFile || !nftTitle || uploading}
              startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : null}
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
                '&:disabled': {
                  backgroundColor: (theme) => theme.palette.action.disabledBackground,
                  color: (theme) => theme.palette.action.disabled,
                }
              }}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </Grid>

          {/* Right Side - Preview */}
          <Grid item sx={{ width: '50%', padding: '32px', backgroundColor: (theme) => theme.palette.background.default, boxSizing: 'border-box' }}>
            <Typography
              sx={{
                fontFamily: 'Manrope, sans-serif',
                fontWeight: 600,
                fontSize: '24px',
                lineHeight: '32px',
                color: (theme) => theme.palette.text.primary,
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
                color: (theme) => theme.palette.text.secondary,
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
                boxShadow: (theme) => theme.palette.mode === 'dark' 
                  ? '0 1px 3px rgba(0, 0, 0, 0.3)' 
                  : '0 4px 12px rgba(0, 0, 0, 0.1)',
                mb: 3,
                backgroundColor: (theme) => theme.palette.background.paper
              }}
            >
              <Typography
                sx={{
                  fontFamily: 'Manrope, sans-serif',
                  fontWeight: 600,
                  fontSize: '16px',
                  lineHeight: '24px',
                  color: (theme) => theme.palette.text.primary,
                  p: 2,
                  borderBottom: (theme) => `1px solid ${theme.palette.divider}`
                }}
              >
                Attendance Badge - Polkadot Connect
              </Typography>

              {/* Preview Image Area */}
              <Box
                sx={{
                  height: '200px',
                  backgroundColor: (theme) => theme.palette.action.hover,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {uploadedFileData ? (
                  <img
                    src={uploadedFileData}
                    alt="Preview"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <Typography sx={{ color: (theme) => theme.palette.text.secondary, fontSize: '14px' }}>
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
                  color: (theme) => theme.palette.text.primary,
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
                  color: (theme) => theme.palette.text.secondary
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
                  color: (theme) => theme.palette.text.primary,
                  mb: 1
                }}
              >
                Traits
              </Typography>
              <Chip
                label={traits || "VIP"}
                size="small"
                sx={{
                  backgroundColor: (theme) => theme.palette.action.selected,
                  color: (theme) => theme.palette.text.primary,
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
                  color: (theme) => theme.palette.text.primary,
                  mb: 2
                }}
              >
                Metadata
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {metadata.attendeeName && (
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
                )}
                {metadata.eventDate && (
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
                )}
                {metadata.eventName && (
                  <Chip
                    label="Event name"
                    size="small"
                    sx={{
                      backgroundColor: '#F9FAFB',
                      color: '#6B7280',
                      fontFamily: 'Manrope, sans-serif',
                      fontSize: '11px'
                    }}
                  />
                )}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
};

export default UploadDesignModal;