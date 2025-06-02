import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Grid, 
  FormControl, Select, MenuItem, TextField, InputAdornment,
  CircularProgress, Alert
} from '@mui/material';
import {
  ContentCopy
} from '@mui/icons-material';
import { api } from '../services/api';
import UploadDesignModal from '../components/ui/UploadDesignModal';

function Gallery() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [loading, setLoading] = useState(true);
  const [publicUrl, setPublicUrl] = useState('');
  const [urlCopied, setUrlCopied] = useState(false);
  const [error, setError] = useState(null);
  const [designs, setDesigns] = useState([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const eventsData = await api.getEvents();
        setEvents(eventsData);
        
        if (eventsData.length > 0) {
          setSelectedEvent(eventsData[0].id);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
        setError('Failed to load events');
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      const baseUrl = window.location.origin;
      setPublicUrl(`${baseUrl}/public/gallery/${selectedEvent}`);
      
      // Fetch real designs for the selected event
      fetchEventDesigns(selectedEvent);
    }
  }, [selectedEvent]);
  
  const fetchEventDesigns = async (eventId) => {
    try {
      setLoading(true);
      const response = await api.getEventDesigns(eventId);
      setDesigns(response.designs || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching designs:', error);
      setError('Failed to load designs');
    } finally {
      setLoading(false);
    }
  };
  
  const handleEventChange = (event) => {
    setSelectedEvent(event.target.value);
  };
  
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  const handleUploadNewDesign = () => {
    setUploadModalOpen(true);
  };

  const handleShareGallery = () => {
    // Share gallery functionality
    if (navigator.share) {
      navigator.share({
        title: 'NFT Gallery',
        text: 'Check out this NFT Gallery',
        url: publicUrl,
      });
    } else {
      handleCopyUrl();
    }
  };

  const handleUploadComplete = async (designData) => {
    try {
      // Use fileData if available (from saved draft), otherwise convert file to base64
      let base64;
      if (designData.fileData) {
        base64 = designData.fileData;
      } else if (designData.file) {
        base64 = await fileToBase64(designData.file);
      } else {
        throw new Error('No image data available');
      }
      
      // Prepare design data for API
      const designPayload = {
        event_id: selectedEvent,
        title: designData.title,
        description: designData.description,
        traits: designData.traits,
        image_data: base64,
        metadata: designData.metadata
      };
      
      // Save design to database
      await api.createDesign(designPayload);
      
      // Refresh designs list
      await fetchEventDesigns(selectedEvent);
      
      // Close modal
      setUploadModalOpen(false);
      
      // Show success message (you could add a snackbar here)
      console.log('Design uploaded successfully!');
    } catch (error) {
      console.error('Error uploading design:', error);
      setError('Failed to upload design');
    }
  };
  
  // Helper function to convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: (theme) => theme.palette.background.default,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Page Header */}
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
              color: (theme) => theme.palette.text.primary,
              mb: 0.5,
            }}
          >
            NFT Gallery
          </Typography>
          <Typography
            sx={{
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 400,
              fontSize: '14px',
              lineHeight: '19.6px',
              letterSpacing: '1.4%',
              color: (theme) => theme.palette.text.secondary,
            }}
          >
            Create and manage the visual identity of your event NFTs
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 5 }}>
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

          {/* Share Gallery Button */}
          <Button
            onClick={handleShareGallery}
            sx={{
              backgroundColor: 'transparent',
              color: (theme) => theme.palette.text.primary,
              borderRadius: '8px',
              padding: '12px 16px',
              textTransform: 'none',
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 500,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              border: '1px solid',
              borderColor: (theme) => theme.palette.divider,
              '&:hover': {
                backgroundColor: (theme) => theme.palette.action.hover,
                borderColor: (theme) => theme.palette.text.secondary,
              },
            }}
          >
            <Box
              component="img"
              src="/images/share-icon.png"
              alt="Share"
              sx={{ 
                width: 16, 
                height: 16,
                filter: (theme) => theme.palette.mode === 'dark' ? 'brightness(0) invert(1)' : 'none'
              }}
            />
            Share Gallery
          </Button>
                   
          {/* Upload new design Button */}
          <Button
            onClick={handleUploadNewDesign}
            sx={{
              backgroundColor: '#FF2670',
              color: 'white',
              borderRadius: '8px',
              padding: '12px 16px',
              textTransform: 'none',
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 500,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              '&:hover': {
                backgroundColor: '#E91E63',
              },
            }}
          >
            <Box
              component="img"
              src="/images/plus-icon.png"
              alt="Upload"
              sx={{ width: 16, height: 16 }}
            />
            Upload new design
          </Button>
        </Box>
      </Box>

      {/* Filter Bar */}
      <Box 
        sx={{ 
          px: 4, 
          py: 2,
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center'
        }}
      >
        <Box
          sx={{
            width: 'auto',
            maxWidth: '600px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            marginTop: '20px',
            marginLeft: '0px'
          }}
        >
          {/* Showing */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Typography 
              sx={{
                fontFamily: 'Manrope, sans-serif',
                fontWeight: 500,
                fontSize: '14px',
                lineHeight: '20px',
                letterSpacing: '-0.6%',
                color: (theme) => theme.palette.text.primary,
                whiteSpace: 'nowrap'
              }}
            >
              Showing
            </Typography>
            <FormControl size="small" sx={{ minWidth: '200px' }}>
              <Select
                value={selectedEvent}
                onChange={handleEventChange}
                displayEmpty
                sx={{
                  backgroundColor: (theme) => theme.palette.background.paper,
                  borderRadius: '8px',
                  height: '40px',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: (theme) => theme.palette.divider,
                  },
                  '& .MuiSelect-select': {
                    fontFamily: 'Manrope, sans-serif',
                    fontWeight: 500,
                    fontSize: '14px',
                    lineHeight: '20px',
                    letterSpacing: '-0.6%',
                    color: (theme) => theme.palette.text.primary,
                    padding: '10px 14px'
                  }
                }}
              >
                {events.map(event => (
                  <MenuItem key={event.id} value={event.id}>
                    {event.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* URL */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Typography 
              sx={{
                fontFamily: 'Manrope, sans-serif',
                fontWeight: 500,
                fontSize: '14px',
                lineHeight: '20px',
                letterSpacing: '-0.6%',
                color: (theme) => theme.palette.text.primary,
                whiteSpace: 'nowrap'
              }}
            >
              URL
            </Typography>
            <TextField
              value={publicUrl}
              size="small"
              sx={{
                minWidth: '300px',
                '& .MuiOutlinedInput-root': {
                  backgroundColor: (theme) => theme.palette.background.paper,
                  borderRadius: '8px',
                  height: '40px',
                  '& fieldset': {
                    borderColor: (theme) => theme.palette.divider,
                  },
                  '& input': {
                    fontFamily: 'Manrope, sans-serif',
                    fontWeight: 500,
                    fontSize: '14px',
                    lineHeight: '20px',
                    letterSpacing: '-0.6%',
                    color: (theme) => theme.palette.text.primary,
                    padding: '10px 14px'
                  }
                }
              }}
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <Button
                      size="small"
                      onClick={handleCopyUrl}
                      sx={{
                        minWidth: 'auto',
                        p: 1,
                        color: '#6B7280',
                        '&:hover': {
                          backgroundColor: 'rgba(0,0,0,0.04)'
                        }
                      }}
                    >
                      <ContentCopy fontSize="small" />
                    </Button>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* NFT Grid */}
      <Box sx={{ px: 4, py: 2, flex: 1 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {designs.length === 0 ? (
              <Grid item xs={12}>
                <Box 
                  sx={{ 
                    textAlign: 'center', 
                    py: 8,
                    color: (theme) => theme.palette.text.secondary
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    No designs uploaded yet
                  </Typography>
                  <Typography variant="body2">
                    Click "Upload new design" to add your first NFT design
                  </Typography>
                </Box>
              </Grid>
            ) : (
              designs.map((design) => (
                <Grid item xs={12} sm={6} md={3} key={design.id}>
                  <Card 
                    sx={{ 
                      borderRadius: 3,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                      }
                    }}
                  >
                    {/* NFT Image */}
                    <Box 
                      sx={{ 
                        height: 200,
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        backgroundColor: (theme) => theme.palette.action.hover
                      }}
                    >
                      <img
                        src={design.image_data}
                        alt={design.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    </Box>
                    
                    <CardContent sx={{ p: 2 }}>
                      {/* NFT Label */}
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: (theme) => theme.palette.text.secondary,
                          fontSize: '12px',
                          fontWeight: 500,
                          mb: 1,
                          display: 'block'
                        }}
                      >
                        NFT Design
                      </Typography>
                      
                      {/* NFT Title */}
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontWeight: 600,
                          fontSize: '16px',
                          color: (theme) => theme.palette.text.primary,
                          mb: 2
                        }}
                      >
                        {design.title}
                      </Typography>

                      {/* Design Info */}
                      <Box sx={{ mb: 2 }}>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: (theme) => theme.palette.text.secondary,
                            fontSize: '11px',
                            display: 'block',
                            mb: 0.5
                          }}
                        >
                          Created by
                        </Typography>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: (theme) => theme.palette.text.secondary,
                            fontSize: '11px',
                            wordBreak: 'break-all'
                          }}
                        >
                          {design.created_by ? `${design.created_by.slice(0, 6)}...${design.created_by.slice(-4)}` : 'Unknown'}
                        </Typography>
                      </Box>

                      {/* Action Buttons */}
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="outlined"
                          fullWidth
                          sx={{
                            borderColor: '#FF2670',
                            color: '#FF2670',
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 500,
                            fontSize: '12px',
                            '&:hover': {
                              borderColor: '#E91E63',
                              backgroundColor: 'rgba(255, 38, 112, 0.04)',
                            },
                          }}
                        >
                          View
                        </Button>
                        <Button
                          variant="contained"
                          fullWidth
                          sx={{
                            backgroundColor: '#FF2670',
                            color: 'white',
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 500,
                            fontSize: '12px',
                            '&:hover': {
                              backgroundColor: '#E91E63',
                            },
                          }}
                        >
                          Use Design
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        )}
      </Box>

      {/* Upload Design Modal */}
      <UploadDesignModal 
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUpload={handleUploadComplete}
      />
    </Box>
  );
}

export default Gallery;