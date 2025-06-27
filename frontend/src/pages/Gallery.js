import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Grid, 
  FormControl, Select, MenuItem, TextField, InputAdornment,
  CircularProgress, Alert, Tabs, Tab, Chip, Dialog, DialogContent,
  DialogTitle, IconButton, Divider
} from '@mui/material';
import {
  ContentCopy, Image, Token, Close, OpenInNew, Share
} from '@mui/icons-material';
import { api } from '../services/api';
import UploadDesignModal from '../components/ui/UploadDesignModal';

function Gallery() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [publicUrl, setPublicUrl] = useState('');
  const [urlCopied, setUrlCopied] = useState(false);
  const [error, setError] = useState(null);
  const [designs, setDesigns] = useState([]);
  const [mintedNFTs, setMintedNFTs] = useState([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0 = Design Templates, 1 = Minted NFTs
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [nftDetailOpen, setNftDetailOpen] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const eventsData = await api.getEvents();
        setEvents(eventsData);
        
        if (eventsData.length > 0) {
  console.log('🎉 Events loaded:', eventsData);
  console.log('🎯 Setting initial event to:', eventsData[0].api_id);
  setSelectedEvent(eventsData[0].api_id);
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
      
      // Fetch both designs and minted NFTs for the selected event
      fetchEventDesigns(selectedEvent);
      fetchMintedNFTs(selectedEvent);
    }
  }, [selectedEvent]);
  
  const fetchEventDesigns = async (eventId) => {
    try {
      const response = await api.getEventDesigns(eventId);
      setDesigns(response.designs || []);
    } catch (error) {
      console.error('Error fetching designs:', error);
      setDesigns([]);
    }
  };

  const fetchMintedNFTs = async (eventId) => {
    try {
      const nftsData = await api.getNFTsByEvent(eventId);
      setMintedNFTs(nftsData || []);
    } catch (error) {
      console.error('Error fetching minted NFTs:', error);
      setMintedNFTs([]);
    }
  };
  
  const handleEventChange = (event) => {
     console.log('🔄 Dropdown change triggered!');
  console.log('📝 Full event object:', event);
  console.log('🎯 Target:', event.target);
  console.log('📊 Target value:', event.target.value);
  console.log('📋 Target name:', event.target.name);
  console.log('🗂️ All available events:', events.map(e => `${e.id}: ${e.name}`));
  

    setSelectedEvent(event.target.value);

    console.log('✅ setSelectedEvent called with:', event.target.value);

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

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleUploadComplete = async (designData) => {
  try {
    // Step 1: Upload image to Cloudinary
    const uploadResponse = await api.uploadDesignImage(designData.file);
    
    // Step 2: Create design with Cloudinary details
    const designPayload = {
      event_id: selectedEvent,
      title: designData.title,
      description: designData.description,
      traits: designData.traits,
      image_url: uploadResponse.image_url,
      cloudinary_id: uploadResponse.cloudinary_id,
      file_size: uploadResponse.file_size,
      mime_type: uploadResponse.mime_type,
      metadata: designData.metadata
    };
    
    // Step 3: Save design to database
    await api.createDesign(designPayload);
    
    // Step 4: Refresh designs list
    await fetchEventDesigns(selectedEvent);
    
    // Step 5: Close modal
    setUploadModalOpen(false);
    
    console.log('Design uploaded successfully!');
  } catch (error) {
    console.error('Error uploading design:', error);
    setError('Failed to upload design');
  }
};  
  
const handleUseDesign = async (design) => {
  try {
    console.log('Using design:', design);
    
    // Call the new API endpoint to apply design to event NFTs
    await api.applyDesignToEvent(selectedEvent, design.id);
    
    // Refresh minted NFTs to show the updated design
    await fetchMintedNFTs(selectedEvent);
    
    console.log('Design applied successfully!');
  } catch (error) {
    console.error('Error applying design:', error);
    setError('Failed to apply design');
  }
};

const handleViewOnChain = (nft) => {
  if (!nft.transaction_hash) {
    alert('Transaction hash not available for this NFT');
    return;
  }

  const explorerUrl = getExplorerUrl(nft.transaction_hash);
  window.open(explorerUrl, '_blank');
};

const getExplorerUrl = (txHash) => {
  // Westend Explorer (for testing)
  return `https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fws.test.azero.dev#/explorer/query/${txHash};`;
};


const handleViewNFTDetails = (nft) => {
  setSelectedNFT(nft);
  setNftDetailOpen(true);
};

const handleShareNFT = (nft) => {
  const shareUrl = `${window.location.origin}/nft/${nft.id}`;
  if (navigator.share) {
    navigator.share({
      title: `NFT: ${nft.metadata?.event_name || 'Event NFT'}`,
      text: `Check out this attendance NFT from ${nft.metadata?.event_name || 'an event'}`,
      url: shareUrl,
    });
  } else {
    navigator.clipboard.writeText(shareUrl);
    // Could add a toast notification here
  }
};

const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text);
  // Could add a toast notification here
};

  // Render Design Templates
  const renderDesignTemplates = () => (
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
            <Image sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" sx={{ mb: 2 }}>
              No design templates yet
            </Typography>
            <Typography variant="body2">
              Click "Upload new design" to add your first NFT design template
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
              {/* Design Image */}
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
                  src={design.image_url}
                  alt={design.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
                <Chip 
                  label="Template" 
                  size="small" 
                  sx={{ 
                    position: 'absolute', 
                    top: 8, 
                    right: 8,
                    backgroundColor: '#4CAF50',
                    color: 'white'
                  }} 
                />
              </Box>
              
              <CardContent sx={{ p: 2 }}>
                {/* Template Label */}
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
                  Design Template
                </Typography>
                
                {/* Template Title */}
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
<Box>
  <Button
    variant="contained"
    fullWidth
    onClick={() => handleUseDesign(design)}
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
  );

  // Render Minted NFTs
  const renderMintedNFTs = () => (
    <Grid container spacing={3}>
      {mintedNFTs.length === 0 ? (
        <Grid item xs={12}>
          <Box 
            sx={{ 
              textAlign: 'center', 
              py: 8,
              color: (theme) => theme.palette.text.secondary
            }}
          >
            <Token sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" sx={{ mb: 2 }}>
              No NFTs minted yet
            </Typography>
            <Typography variant="body2">
              NFTs will appear here when attendees check in to your events
            </Typography>
          </Box>
        </Grid>
      ) : (
        mintedNFTs.map((nft) => (
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
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  backgroundColor: (theme) => theme.palette.action.hover
                }}
              >
                {nft.metadata?.image_data ? (
                  <img
                    src={nft.metadata.image_data}
                    alt={nft.metadata?.event_name || 'NFT'}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <Token sx={{ fontSize: 64, color: '#FF2670' }} />
                )}
                <Chip 
                  label="Minted" 
                  size="small" 
                  sx={{ 
                    position: 'absolute', 
                    top: 8, 
                    right: 8,
                    backgroundColor: '#FF2670',
                    color: 'white'
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
                  Minted NFT #{nft.id}
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
                  {nft.metadata?.event_name || 'Event NFT'}
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
                    Owner
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: (theme) => theme.palette.text.secondary,
                      fontSize: '11px',
                      wordBreak: 'break-all'
                    }}
                  >
                    {nft.recipientAddress ? `${nft.recipientAddress.slice(0, 6)}...${nft.recipientAddress.slice(-4)}` : 'Unknown'}
                  </Typography>
                </Box>

                {/* Mint Status */}
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
                    Status
                  </Typography>
                  <Chip
                    label={nft.mintStatus || 'Completed'}
                    size="small"
                    sx={{
                      backgroundColor: nft.mintStatus === 'COMPLETED' ? '#DCFCE7' : '#FED7AA',
                      color: nft.mintStatus === 'COMPLETED' ? '#15803D' : '#C2410C',
                      fontSize: '10px',
                      height: '20px'
                    }}
                  />
                </Box>

                {/* Minted Date */}
                {nft.mintedAt && (
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
                      Minted
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: (theme) => theme.palette.text.primary,
                        fontSize: '11px'
                      }}
                    >
                      {new Date(nft.mintedAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                )}

                {/* Attendee Info */}
                {nft.metadata?.attendee && (
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
                      Attendee
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: (theme) => theme.palette.text.primary,
                        fontSize: '12px',
                        fontWeight: 500
                      }}
                    >
                      {nft.metadata.attendee}
                    </Typography>
                  </Box>
                )}

                {/* Action Buttons */}
<Box sx={{ display: 'flex', gap: 1 }}>
  <Button
    variant="outlined"
    size="small"
    onClick={() => handleViewNFTDetails(nft)}
    sx={{
      flex: 1,
      borderColor: '#E0E0E0',
      color: (theme) => theme.palette.text.primary,
      borderRadius: '6px',
      textTransform: 'none',
      fontWeight: 500,
      fontSize: '11px',
      '&:hover': {
        borderColor: '#FF2670',
        backgroundColor: 'rgba(255, 38, 112, 0.04)',
      },
    }}
  >
    Details
  </Button>
  <Button
    variant="outlined"
    size="small"
    onClick={() => handleViewOnChain(nft)}
    sx={{
      flex: 1,
      borderColor: '#E0E0E0',
      color: (theme) => theme.palette.text.primary,
      borderRadius: '6px',
      textTransform: 'none',
      fontWeight: 500,
      fontSize: '11px',
      '&:hover': {
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.04)',
      },
    }}
  >
    <OpenInNew sx={{ fontSize: 14, mr: 0.5 }} />
    Chain
  </Button>
  <IconButton
    size="small"
    onClick={() => handleShareNFT(nft)}
    sx={{
      border: '1px solid #E0E0E0',
      borderRadius: '6px',
      width: 32,
      height: 32,
      '&:hover': {
        borderColor: '#FF2670',
        backgroundColor: 'rgba(255, 38, 112, 0.04)',
      },
    }}
  >
    <Share sx={{ fontSize: 14 }} />
  </IconButton>
</Box>
              </CardContent>
            </Card>
          </Grid>
        ))
      )}
    </Grid>
  );

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
            Manage design templates and view minted NFTs for your events
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
                   
          {/* Upload new design Button - only show on Design Templates tab */}
          {activeTab === 0 && (
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
          )}
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
  value={selectedEvent || events[0]?.api_id || ''}
  onChange={handleEventChange}
  displayEmpty
  MenuProps={{
    PaperProps: {
      style: {
        maxHeight: 200,
      },
    },
  }}
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
  <MenuItem key={event.api_id} value={event.api_id}>
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

      {/* Tabs */}
      <Box sx={{ px: 4, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 500,
              fontSize: '14px',
              minHeight: 48,
            }
          }}
        >
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Image fontSize="small" />
                Design Templates ({designs.length})
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Token fontSize="small" />
                Minted NFTs ({mintedNFTs.length})
              </Box>
            } 
          />
        </Tabs>
      </Box>

      {/* Content */}
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
          activeTab === 0 ? renderDesignTemplates() : renderMintedNFTs()
        )}
      </Box>

      {/* Upload Design Modal */}
      <UploadDesignModal 
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUpload={handleUploadComplete}
      />

      {/* NFT Detail Modal */}
      <Dialog
        open={nftDetailOpen}
        onClose={() => setNftDetailOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            backgroundColor: (theme) => theme.palette.background.paper
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            NFT Details
          </Typography>
          <IconButton onClick={() => setNftDetailOpen(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          {selectedNFT && (
            <Grid container spacing={3}>
              {/* Left - Image */}
              <Grid item xs={12} md={5}>
                <Box sx={{ position: 'sticky', top: 0 }}>
                  <Card sx={{ borderRadius: '12px', overflow: 'hidden', mb: 2 }}>
                    <Box sx={{ height: 300, position: 'relative' }}>
                      {selectedNFT.metadata?.image_data ? (
                        <img
                          src={selectedNFT.metadata.image_data}
                          alt={selectedNFT.metadata?.event_name || 'NFT'}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <Box sx={{ 
                          height: '100%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          backgroundColor: (theme) => theme.palette.action.hover
                        }}>
                          <Token sx={{ fontSize: 64, color: '#FF2670' }} />
                        </Box>
                      )}
                    </Box>
                  </Card>
                  
                  {/* Action Buttons */}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={() => handleViewOnChain(selectedNFT)}
                      sx={{
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontWeight: 500,
                        '&:hover': { backgroundColor: '#45a049' },
                      }}
                    >
                      <OpenInNew sx={{ mr: 1, fontSize: 16 }} />
                      View on Blockchain
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => handleShareNFT(selectedNFT)}
                      sx={{
                        borderColor: '#E0E0E0',
                        color: (theme) => theme.palette.text.primary,
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontWeight: 500,
                        minWidth: 'auto',
                        px: 2
                      }}
                    >
                      <Share sx={{ fontSize: 16 }} />
                    </Button>
                  </Box>
                </Box>
              </Grid>

              {/* Right - Details */}
              <Grid item xs={12} md={7}>
                <Box>
                  {/* Title */}
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                    {selectedNFT.metadata?.event_name || 'Event NFT'}
                  </Typography>
                  
                  {/* NFT ID */}
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                    NFT #{selectedNFT.id}
                  </Typography>

                  <Divider sx={{ mb: 3 }} />

                  {/* Metadata Grid */}
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        Owner
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {selectedNFT.recipientAddress ? `${selectedNFT.recipientAddress.slice(0, 8)}...${selectedNFT.recipientAddress.slice(-6)}` : 'Unknown'}
                        </Typography>
                        <IconButton size="small" onClick={() => copyToClipboard(selectedNFT.recipientAddress)}>
                          <ContentCopy sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Box>
                    </Grid>

                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        Status
                      </Typography>
                      <Chip
                        label={selectedNFT.mintStatus || 'Completed'}
                        size="small"
                        sx={{
                          backgroundColor: selectedNFT.mintStatus === 'COMPLETED' ? '#DCFCE7' : '#FED7AA',
                          color: selectedNFT.mintStatus === 'COMPLETED' ? '#15803D' : '#C2410C',
                        }}
                      />
                    </Grid>

                    {selectedNFT.mintedAt && (
                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          Minted Date
                        </Typography>
                        <Typography variant="body2">
                          {new Date(selectedNFT.mintedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </Typography>
                      </Grid>
                    )}

                    {selectedNFT.transactionHash && (
                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          Transaction
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {`${selectedNFT.transactionHash.slice(0, 8)}...${selectedNFT.transactionHash.slice(-6)}`}
                          </Typography>
                          <IconButton size="small" onClick={() => copyToClipboard(selectedNFT.transactionHash)}>
                            <ContentCopy sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Box>
                      </Grid>
                    )}
                  </Grid>

                  <Divider sx={{ mb: 3 }} />

                  {/* Attendee Information */}
                  {selectedNFT.metadata?.attendee && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                        Attendee Information
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {selectedNFT.metadata.attendee}
                      </Typography>
                    </Box>
                  )}

                  {/* Description */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                      Description
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                      {selectedNFT.metadata?.description || 
                       'This NFT serves as verifiable proof of attendance at this event. Minted on the Polkadot blockchain, it commemorates participation and may unlock special perks or access.'}
                    </Typography>
                  </Box>

                  {/* Additional Metadata */}
                  {selectedNFT.metadata && Object.keys(selectedNFT.metadata).length > 0 && (
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                        Metadata
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {Object.entries(selectedNFT.metadata).map(([key, value]) => {
                          if (key === 'image_data' || key === 'description' || key === 'attendee' || key === 'event_name') return null;
                          return (
                            <Chip
                              key={key}
                              label={`${key}: ${value}`}
                              size="small"
                              sx={{
                                backgroundColor: (theme) => theme.palette.action.selected,
                                color: (theme) => theme.palette.text.primary,
                              }}
                            />
                          );
                        })}
                      </Box>
                    </Box>
                  )}
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default Gallery;