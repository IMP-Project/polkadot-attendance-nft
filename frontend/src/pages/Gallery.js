import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Grid, 
  FormControl, Select, MenuItem, TextField, InputAdornment,
  useTheme
} from '@mui/material';
import { Link } from 'react-router-dom';
import {
  ContentCopy, Share
} from '@mui/icons-material';
import { api } from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import UploadDesignModal from '../components/ui/UploadDesignModal';

function Gallery({ mode, toggleDarkMode }) {
  const theme = useTheme();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [loading, setLoading] = useState(true);
  const [publicUrl, setPublicUrl] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [urlCopied, setUrlCopied] = useState(false);
  const [error, setError] = useState(null);
  const [nfts, setNfts] = useState([]);
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
      
      // Mock NFT data - replace with actual API call
      const mockNfts = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        metadata: {
          name: `Attendance #${i + 1}`,
          event_name: 'PolkaDot Connect',
          event_date: '25.05.2025',
          location: 'Virtual',
          attendee: `User ${i + 1}`,
          image: '/images/nft-character.png'
        },
        owner: `125oca134cwqgv128${i}g231286${i}`,
        created_at: new Date().toISOString()
      }));
      setNfts(mockNfts);
    }
  }, [selectedEvent]);
  
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

  const handleUploadComplete = (designData) => {
    // Handle the uploaded design data
    console.log('Design uploaded:', designData);
    // You can add logic here to save the design, update NFTs, etc.
    setUploadModalOpen(false);
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
        <Grid container spacing={3}>
          {nfts.map((nft) => (
            <Grid item xs={12} sm={6} md={3} key={nft.id}>
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
                    background: 'linear-gradient(135deg, #00D4AA 0%, #00B894 100%)',
                    borderRadius: '12px 12px 0 0',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Box
                    component="img"
                    src="/images/nft-character.png"
                    alt="NFT Character"
                    sx={{
                      width: 120,
                      height: 120,
                      objectFit: 'contain'
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
                    Attendance NFT
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
                    {nft.metadata?.name || 'Attendance #1'}
                  </Typography>

                  {/* Owner Info */}
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
                      Owned by
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: (theme) => theme.palette.text.secondary,
                        fontSize: '11px',
                        wordBreak: 'break-all'
                      }}
                    >
                      {nft.owner}
                    </Typography>
                  </Box>

                  {/* View NFT Button */}
                  <Button
                    variant="outlined"
                    fullWidth
                    sx={{
                      borderColor: '#FF2670',
                      color: '#FF2670',
                      borderRadius: '8px',
                      textTransform: 'none',
                      fontWeight: 500,
                      '&:hover': {
                        borderColor: '#E91E63',
                        backgroundColor: 'rgba(255, 38, 112, 0.04)',
                      },
                    }}
                  >
                    View NFT
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
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