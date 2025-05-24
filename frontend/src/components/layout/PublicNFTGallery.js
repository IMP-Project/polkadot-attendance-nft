import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, CardMedia,
  CardActions, Button, Divider, Avatar, CircularProgress,
  Chip, IconButton, Menu, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Snackbar, Alert,
  useTheme
} from '@mui/material';
import {
  Event, LocationOn, Share, Facebook, Twitter, LinkedIn,
  Instagram, Link as LinkIcon, ContentCopy, QrCode, Close
} from '@mui/icons-material';
import { QRCodeCanvas } from 'qrcode.react';

/**
 * Public NFT Gallery Component
 * Can be embedded on websites or shared socially
 */
function PublicNFTGallery({ 
  eventId, 
  showTitle = true,
  limit = 6,
  showPoweredBy = true,
  variant = 'grid' // 'grid', 'list', or 'carousel'
}) {
  const theme = useTheme();
  const [nfts, setNfts] = useState([]);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareMenuAnchor, setShareMenuAnchor] = useState(null);
  const [shareUrl, setShareUrl] = useState('');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // In production, these would be actual API calls
        // Mock data for development
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock event data
        const eventData = {
          id: eventId || 'event-123',
          name: 'Polkadot Meetup Berlin',
          date: '2025-05-15',
          location: 'Berlin, Germany',
          description: 'Join us for the biggest Polkadot meetup in Berlin!'
        };
        
        // Mock NFT data
        const nftData = Array.from({ length: 12 }, (_, i) => ({
          id: i + 1,
          metadata: {
            name: `Attendance #${i + 1}`,
            event_name: eventData.name,
            event_date: eventData.date,
            location: eventData.location,
            description: `Attendance NFT for ${eventData.name}`,
            attendee: `User ${i + 1}`,
            image: `https://picsum.photos/seed/${i + 1}/300/200`
          },
          owner: `0x${Math.random().toString(16).substring(2, 14)}`,
          created_at: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString()
        }));
        
        setEvent(eventData);
        setNfts(nftData.slice(0, limit));
        setShareUrl(window.location.href);
      } catch (err) {
        console.error('Error fetching gallery data:', err);
        setError('Failed to load NFT gallery. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [eventId, limit]);
  
  const handleShareClick = (event) => {
    setShareMenuAnchor(event.currentTarget);
  };
  
  const handleShareClose = () => {
    setShareMenuAnchor(null);
  };
  
  const handleShareOption = (platform) => {
    let shareLink;
    
    switch (platform) {
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Check out these NFTs from ${event?.name}`)}`;
        break;
      case 'linkedin':
        shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'custom':
        setShareDialogOpen(true);
        handleShareClose();
        return;
      default:
        shareLink = shareUrl;
    }
    
    // Open share link in new window
    window.open(shareLink, '_blank');
    handleShareClose();
  };
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setSnackbarMessage('Link copied to clipboard!');
    setSnackbarOpen(true);
    handleShareClose();
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        p: 3,
        borderRadius: 2,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(30, 30, 30, 0.85)' 
          : 'rgba(255, 255, 255, 0.85)',
        border: theme.palette.mode === 'dark'
          ? '1px solid rgba(255, 255, 255, 0.05)'
          : '1px solid rgba(0, 0, 0, 0.03)',
      }}
    >
      {showTitle && event && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h5" component="h2" gutterBottom>
              {event.name} - Attendance NFTs
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Event fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {new Date(event.date).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <LocationOn fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {event.location}
              </Typography>
            </Box>
          </Box>
          
          <Button
            variant="outlined"
            startIcon={<Share />}
            onClick={handleShareClick}
            sx={{ borderRadius: 2 }}
          >
            Share Gallery
          </Button>
        </Box>
      )}
      
      {variant === 'grid' && (
        <Grid container spacing={3}>
          {nfts.map((nft) => (
            <Grid item xs={12} sm={6} md={4} key={nft.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  borderRadius: 2,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6,
                  }
                }}
              >
                <CardMedia
                  component="img"
                  height="180"
                  image={nft.metadata.image}
                  alt={nft.metadata.name}
                  sx={{ objectFit: 'cover' }}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ mb: 2 }}>
                    <Chip 
                      label="Attendance NFT" 
                      size="small" 
                      color="secondary" 
                      sx={{ mb: 1 }} 
                    />
                    <Typography variant="h6" component="h3" gutterBottom>
                      {nft.metadata.name}
                    </Typography>
                  </Box>
                  
                  <Divider sx={{ my: 1.5 }} />
                  
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary" component="div">
                      Owner
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-all' }}>
                      {nft.owner ? `${nft.owner.slice(0, 6)}...${nft.owner.slice(-4)}` : 'Unknown'}
                    </Typography>
                  </Box>
                </CardContent>
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button 
                    size="small" 
                    endIcon={<QrCode />}
                    onClick={() => {
                      setShareUrl(`https://explorer.polkadot.io/nft/${nft.id}`);
                      setShareDialogOpen(true);
                    }}
                  >
                    View NFT
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
      {showPoweredBy && (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Powered by Polkadot Attendance NFT System
          </Typography>
        </Box>
      )}
      
      {/* Share Menu */}
      <Menu
        anchorEl={shareMenuAnchor}
        open={Boolean(shareMenuAnchor)}
        onClose={handleShareClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={() => handleShareOption('facebook')}>
          <Facebook sx={{ mr: 1 }} color="primary" fontSize="small" />
          Share on Facebook
        </MenuItem>
        <MenuItem onClick={() => handleShareOption('twitter')}>
          <Twitter sx={{ mr: 1 }} color="info" fontSize="small" />
          Share on Twitter
        </MenuItem>
        <MenuItem onClick={() => handleShareOption('linkedin')}>
          <LinkedIn sx={{ mr: 1 }} color="primary" fontSize="small" />
          Share on LinkedIn
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleCopyLink}>
          <ContentCopy sx={{ mr: 1 }} fontSize="small" />
          Copy Link
        </MenuItem>
        <MenuItem onClick={() => handleShareOption('custom')}>
          <QrCode sx={{ mr: 1 }} fontSize="small" />
          QR Code
        </MenuItem>
      </Menu>
      
      {/* Share Dialog */}
      <Dialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Share NFT Gallery</Typography>
            <IconButton edge="end" color="inherit" onClick={() => setShareDialogOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <QRCodeCanvas value={shareUrl} size={150} includeMargin />
            <Box sx={{ ml: 2 }}>
              <Typography variant="body2" gutterBottom>
                Scan the QR code or use the link below to share this NFT gallery.
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ContentCopy />}
                onClick={handleCopyLink}
                sx={{ mt: 1 }}
              >
                Copy Link
              </Button>
            </Box>
          </Box>
          
          <TextField
            fullWidth
            label="Gallery Link"
            value={shareUrl}
            variant="outlined"
            InputProps={{
              readOnly: true,
              startAdornment: (
                <LinkIcon sx={{ mr: 1, color: 'text.secondary' }} fontSize="small" />
              ),
            }}
          />
          
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <IconButton onClick={() => handleShareOption('facebook')}>
              <Facebook color="primary" />
            </IconButton>
            <IconButton onClick={() => handleShareOption('twitter')}>
              <Twitter color="info" />
            </IconButton>
            <IconButton onClick={() => handleShareOption('linkedin')}>
              <LinkedIn color="primary" />
            </IconButton>
            <IconButton onClick={() => handleShareOption('instagram')}>
              <Instagram color="secondary" />
            </IconButton>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity="success" 
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default PublicNFTGallery; 