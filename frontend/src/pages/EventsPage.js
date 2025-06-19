import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  CircularProgress,
  Skeleton
} from '@mui/material';
import { 
  CheckCircle as CheckCircleIcon,
  People as PeopleIcon,
  MoreVert as MoreVertIcon,
  Image as ImageIcon
} from '@mui/icons-material';
import { useEvents } from '../contexts/EventsContext';
import { api } from '../services/api';
import UploadDesignModal from '../components/ui/UploadDesignModal';

const EventsPage = ({ mode, toggleDarkMode, setCurrentPage }) => {
  const { events, allEventsImported, loading } = useEvents();
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [uploadDesignOpen, setUploadDesignOpen] = useState(false);
  // Note: check-in counts are already included in events data from the API


  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming':
        return { backgroundColor: '#DCFCE7', color: '#15803D' };
      case 'ongoing':
        return { backgroundColor: '#FED7AA', color: '#C2410C' };
      case 'past':
        return { backgroundColor: '#F3F4F6', color: '#6B7280' };
      default:
        return { backgroundColor: '#DCFCE7', color: '#15803D' };
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'upcoming':
        return '🟢';
      case 'ongoing':
        return '🟠';
      case 'past':
        return '⚫';
      default:
        return '🟢';
    }
  };

  // Helper function to safely format event ID for display
  const formatEventId = (id) => {
    if (!id) return 'N/A';
    const idStr = id.toString();
    return idStr.length > 8 ? `${idStr.substring(0, 8)}...` : idStr;
  };

  const handleCheckInClick = (event) => {
    // Store the selected event ID for the Check-ins page
    localStorage.setItem('selectedEventId', event.id);
    // Navigate to check-ins page
    setCurrentPage('check-ins');
  };

  const handleMenuClick = (event, eventItem) => {
    setAnchorEl(event.currentTarget);
    setSelectedEvent(eventItem);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleUploadDesign = () => {
    setUploadDesignOpen(true);
    handleMenuClose();
  };

  const handleDesignUpload = async (designData) => {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', designData.file);
      formData.append('title', designData.title);
      formData.append('description', designData.description);
      formData.append('traits', designData.traits);
      formData.append('metadata', JSON.stringify(designData.metadata));
      formData.append('eventId', selectedEvent.id);

      // Upload the design to the backend
      await api.uploadEventDesign(selectedEvent.id, formData);
      
      // Refresh events to show updated design status
      window.location.reload();
    } catch (error) {
      console.error('Failed to upload design:', error);
      alert('Failed to upload design. Please try again.');
    }
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
      {/* Top Bar */}
      <Box
        sx={{
          px: { xs: 2, md: 4 },
          pt: { xs: 6, md: 3 }, // Adds top padding on mobile
          pb: 3,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: { xs: 2, sm: 0 },
        }}
      >
        <Box>
          <Typography
            sx={{
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 500,
              fontSize: '24px',
              lineHeight: '36px',
              color: (theme) => theme.palette.text.primary,
              mb: 0.5,
            }}
          >
            Events
          </Typography>
          <Typography
            sx={{
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 400,
              fontSize: '16px',
              lineHeight: '22px',
              letterSpacing: '1.4%',
              color: (theme) => theme.palette.text.secondary,
            }}
          >
            Plan, manage, and monitor your on-chain events
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Refresh Button */}
          <Button 
            variant="outlined" 
            onClick={() => window.location.reload()}
            disabled={loading}
            sx={{ minWidth: 120 }}
          >
            {loading ? <CircularProgress size={20} /> : 'Refresh'}
          </Button>
          
          {/* Search icon */}
          <Tooltip title="Search">
            <IconButton>
              <Box
                component="img"
                src="/images/search-icon.png"
                alt="Search"
                sx={{ 
                  width: 20, 
                  height: 20,
                  filter: (theme) => theme.palette.mode === 'dark' ? 'brightness(0) invert(1)' : 'none'
                }}
              />
            </IconButton>
          </Tooltip>
          
          {/* Bell icon */}
          <Tooltip title="Notifications">
            <IconButton>
              <Box
                component="img"
                src="/images/bell-icon.png"
                alt="Notifications"
                sx={{ 
                  width: 20, 
                  height: 20,
                  filter: (theme) => theme.palette.mode === 'dark' ? 'brightness(0) invert(1)' : 'none'
                }}
              />
            </IconButton>
          </Tooltip>


        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, px: 4, pb: 4 }}>
        {loading ? (
          // Loading State
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            minHeight: '60vh',
            gap: 3 
          }}>
            <CircularProgress size={40} />
            <Typography variant="h6" color="text.secondary">
              Loading events...
            </Typography>
          </Box>
        ) : events.length === 0 ? (
          // Empty State
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '60vh',
            }}
          >
            <Box
              sx={{
                textAlign: 'center',
                maxWidth: '600px',
              }}
            >
              {/* Calendar Image */}
              <Box
                sx={{
                  mb: 4,
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <Box
                  component="img"
                  src="/images/calender-icon.png"
                  alt="Calendar"
                  sx={{
                    width: 120,
                    height: 120,
                  }}
                />
              </Box>

              {/* Main Heading */}
              <Typography
                variant="h1"
                sx={{
                  textAlign: 'center',
                  mb: 3,
                  fontSize: { xs: '28px', md: '39px' }
                }}
              >
                Ready to mint NFTs?
              </Typography>

              {/* Description */}
              <Typography
                variant="h5"
                color="text.secondary"
                sx={{
                  textAlign: 'center',
                  mb: 4,
                  maxWidth: '500px',
                  mx: 'auto',
                  fontWeight: 400,
                }}
              >
                Connect your Luma events and start minting on-chain attendance NFTs — reward your attendees the web3 way
              </Typography>

              {/* Call to Action */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                <Button
                  variant="contained"
                  size="large"
                  sx={{
                    borderRadius: '12px',
                    px: 4,
                    py: 1.5,
                    fontSize: '16px',
                    fontWeight: 500,
                  }}
                  onClick={() => {/* Navigate to settings to connect Luma */}}
                >
                  Connect to Luma
                </Button>
              </Box>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: 'center' }}
              >
                Events will automatically sync and appear here once connected
              </Typography>
            </Box>
          </Box>
        ) : (
          <>
            {/* Sync Status Indicator */}
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1, 
                mb: 2, 
                px: 1,
                py: 1,
                backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(76, 175, 80, 0.05)',
                borderRadius: '8px',
                border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(76, 175, 80, 0.3)' : 'rgba(76, 175, 80, 0.2)'}`
              }}
            >
              <CheckCircleIcon sx={{ color: '#4CAF50', fontSize: 16 }} />
              <Typography 
                variant="body2" 
                sx={{ 
                  fontFamily: 'Manrope, sans-serif',
                  fontSize: '15px',
                  color: (theme) => theme.palette.text.secondary 
                }}
              >
                Showing {events.length} synced events from all organizers
              </Typography>
            </Box>

            {/* Events Table */}
            <TableContainer 
            component={Paper} 
            sx={{ 
              borderRadius: '12px',
              boxShadow: (theme) => theme.palette.mode === 'dark' 
                ? '0 1px 3px rgba(0, 0, 0, 0.3)' 
                : '0 1px 3px rgba(0, 0, 0, 0.1)',
              border: (theme) => `1px solid ${theme.palette.divider}`
            }}
          >
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#F9FAFB' }}>
                  <TableCell 
                    sx={{ 
                      fontFamily: 'Manrope, sans-serif',
                      fontWeight: 600,
                      fontSize: '16px',
                      color: (theme) => theme.palette.text.primary,
                      borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                      py: 2
                    }}
                  >
                    ID
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      fontFamily: 'Manrope, sans-serif',
                      fontWeight: 600,
                      fontSize: '16px',
                      color: (theme) => theme.palette.text.primary,
                      borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                      py: 2
                    }}
                  >
                    Name
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      fontFamily: 'Manrope, sans-serif',
                      fontWeight: 600,
                      fontSize: '16px',
                      color: (theme) => theme.palette.text.primary,
                      borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                      py: 2
                    }}
                  >
                    Owner
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      fontFamily: 'Manrope, sans-serif',
                      fontWeight: 600,
                      fontSize: '16px',
                      color: (theme) => theme.palette.text.primary,
                      borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                      py: 2
                    }}
                  >
                    Date
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      fontFamily: 'Manrope, sans-serif',
                      fontWeight: 600,
                      fontSize: '16px',
                      color: (theme) => theme.palette.text.primary,
                      borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                      py: 2
                    }}
                  >
                    Location
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      fontFamily: 'Manrope, sans-serif',
                      fontWeight: 600,
                      fontSize: '16px',
                      color: (theme) => theme.palette.text.primary,
                      borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                      py: 2
                    }}
                  >
                    Status
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      fontFamily: 'Manrope, sans-serif',
                      fontWeight: 600,
                      fontSize: '16px',
                      color: (theme) => theme.palette.text.primary,
                      borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                      py: 2
                    }}
                  >
                    Check-ins
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      fontFamily: 'Manrope, sans-serif',
                      fontWeight: 600,
                      fontSize: '16px',
                      color: (theme) => theme.palette.text.primary,
                      borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                      py: 2
                    }}
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {events.map((event, index) => (
                  <TableRow 
                    key={event.id || index} 
                    sx={{ 
                      '&:hover': { 
                        backgroundColor: (theme) => theme.palette.action.hover 
                      },
                      '&:last-child td': {
                        borderBottom: 0
                      }
                    }}
                  >
                    <TableCell 
                      sx={{ 
                        fontFamily: 'monospace',
                        fontSize: '16px',
                        color: (theme) => theme.palette.text.secondary,
                        py: 2
                      }}
                    >
                      {formatEventId(event.id)}
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        fontFamily: 'Manrope, sans-serif',
                        fontSize: '14px',
                        color: (theme) => theme.palette.text.primary,
                        fontWeight: 500,
                        py: 2
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {event.name || 'Untitled Event'}
                        {event.isOwner && (
                          <Chip 
                            label="Owner" 
                            size="small"
                            sx={{ 
                              backgroundColor: '#E3F2FD',
                              color: '#1976D2',
                              fontSize: '10px',
                              height: '20px'
                            }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        color: (theme) => theme.palette.text.secondary,
                        py: 2
                      }}
                    >
                      {event.ownerAddress ? 
                        `${event.ownerAddress.slice(0, 6)}...${event.ownerAddress.slice(-4)}` : 
                        'Unknown'
                      }
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        fontFamily: 'Manrope, sans-serif',
                        fontSize: '16px',
                        color: (theme) => theme.palette.text.secondary,
                        py: 2
                      }}
                    >
                      {event.date || 'No date set'}
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        fontFamily: 'Manrope, sans-serif',
                        fontSize: '16px',
                        color: (theme) => theme.palette.text.secondary,
                        py: 2
                      }}
                    >
                      {event.location || 'No location'}
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Chip
                        label={event.status || 'upcoming'}
                        size="small"
                        icon={<span style={{ fontSize: '12px' }}>{getStatusIcon(event.status)}</span>}
                        sx={{
                          ...getStatusColor(event.status),
                          fontFamily: 'Manrope, sans-serif',
                          fontWeight: 500,
                          fontSize: '12px',
                          textTransform: 'capitalize',
                          '& .MuiChip-icon': {
                            marginLeft: '4px',
                            marginRight: '-4px'
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 0.5,
                          cursor: 'pointer',
                          '&:hover': {
                            opacity: 0.8
                          }
                        }}
                        onClick={() => handleCheckInClick(event)}
                      >
                        <PeopleIcon sx={{ fontSize: '16px', color: '#6B7280' }} />
                        <Typography sx={{ 
                          fontFamily: 'Manrope, sans-serif',
                          fontSize: '14px',
                          color: (theme) => theme.palette.text.primary,
                          fontWeight: 500,
                          textDecoration: 'underline'
                        }}>
                          {event.checkinsCount || 0}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuClick(e, event)}
                        sx={{ color: (theme) => theme.palette.text.secondary }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          </>
        )}
      </Box>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {selectedEvent?.isOwner && (
          <MenuItem onClick={handleUploadDesign}>
            <ImageIcon sx={{ mr: 1, fontSize: 20 }} />
            Upload NFT Design
          </MenuItem>
        )}
        {!selectedEvent?.isOwner && (
          <MenuItem disabled>
            <ImageIcon sx={{ mr: 1, fontSize: 20, opacity: 0.5 }} />
            Upload NFT Design (Owner Only)
          </MenuItem>
        )}
      </Menu>

      {/* Upload Design Modal */}
      <UploadDesignModal
        open={uploadDesignOpen}
        onClose={() => setUploadDesignOpen(false)}
        onUpload={handleDesignUpload}
      />

    </Box>
  );
};

export default EventsPage;