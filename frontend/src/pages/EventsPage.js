import React from 'react';
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
  Menu,
  MenuItem,
  Tooltip
} from '@mui/material';
import { 
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings as ConfigureIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { useEvents } from '../contexts/EventsContext';
import { api } from '../services/api';

const EventsPage = ({ onConnectToLuma, mode, toggleDarkMode, setCurrentPage }) => {
  const { events, removeEvent, allEventsImported } = useEvents();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [selectedEventId, setSelectedEventId] = React.useState(null);
  // Note: check-in counts are already included in events data from the API

  const handleMenuClick = (event, eventId) => {
    setAnchorEl(event.currentTarget);
    setSelectedEventId(eventId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedEventId(null);
  };

  const handleAction = (action) => {
    console.log(`${action} event:`, selectedEventId);
    if (action === 'delete') {
      removeEvent(selectedEventId);
    }
    handleMenuClose();
  };

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
              fontSize: '20px',
              lineHeight: '33.6px',
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
              fontSize: '14px',
              lineHeight: '19.6px',
              letterSpacing: '1.4%',
              color: (theme) => theme.palette.text.secondary,
            }}
          >
            Plan, manage, and monitor your on-chain events
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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

          {/* Import from Luma button - conditionally show based on allEventsImported */}
          {allEventsImported ? (
            // Show "All Events Synced" chip when all events are imported
            <Chip
              icon={<CheckCircleIcon />}
              label="All Events Synced"
              sx={{
                backgroundColor: '#DCFCE7',
                color: '#15803D',
                fontFamily: 'Manrope, sans-serif',
                fontWeight: 500,
                fontSize: '14px',
                '& .MuiChip-icon': {
                  color: '#15803D',
                },
              }}
            />
          ) : (
            // Show import button when not all events are imported
            <Button
              onClick={onConnectToLuma}
              startIcon={
                <Box
                  component="img"
                  src="/images/plus-icon.png"
                  alt="Import"
                  sx={{ width: 16, height: 16 }}
                />
              }
              sx={{
                backgroundColor: '#FF2670',
                color: 'white',
                borderRadius: '8px',
                padding: '8px 16px',
                textTransform: 'none',
                fontFamily: 'Manrope, sans-serif',
                fontWeight: 500,
                fontSize: '14px',
                whiteSpace: 'nowrap',
                '&:hover': {
                  backgroundColor: '#E91E63',
                },
              }}
            >
              {events.length > 0 ? 'Import More' : 'Connect to Luma'}
            </Button>
          )}

        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, px: 4, pb: 4 }}>
        {events.length === 0 ? (
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
                sx={{
                  fontFamily: 'Unbounded, sans-serif',
                  fontWeight: 400,
                  fontSize: '39px',
                  lineHeight: '114.9%',
                  letterSpacing: '0%',
                  textAlign: 'center',
                  color: (theme) => theme.palette.text.primary,
                  mb: 3,
                }}
              >
                Import your events
              </Typography>

              {/* Description */}
              <Typography
                sx={{
                  fontFamily: 'Manrope, sans-serif',
                  fontWeight: 400,
                  fontSize: '18px',
                  lineHeight: '24px',
                  letterSpacing: '0.9%',
                  textAlign: 'center',
                  color: (theme) => theme.palette.text.secondary,
                  mb: 4,
                  maxWidth: '500px',
                  mx: 'auto',
                }}
              >
                Connect your Luma events and start minting on-chain attendance NFTs — reward your attendees the web 3 way
              </Typography>

              {/* Connect to Luma Button */}
              <Button
                onClick={onConnectToLuma}
                sx={{
                  backgroundColor: '#FF2670',
                  color: 'white',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  textTransform: 'none',
                  fontFamily: 'Manrope, sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  boxShadow: '0 4px 12px rgba(255, 38, 112, 0.3)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: '#E91E63',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 20px rgba(255, 38, 112, 0.4)',
                  },
                }}
              >
                <Box
                  component="img"
                  src="/images/plus-icon.png"
                  alt="Create"
                  sx={{ width: 16, height: 16 }}
                />
                Connect to Luma
              </Button>
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
                  fontSize: '13px',
                  color: (theme) => theme.palette.text.secondary 
                }}
              >
                Showing {events.length} synced events from your Luma organization
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
                      fontSize: '14px',
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
                      fontSize: '14px',
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
                      fontSize: '14px',
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
                      fontSize: '14px',
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
                      fontSize: '14px',
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
                      fontSize: '14px',
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
                      fontSize: '14px',
                      color: (theme) => theme.palette.text.primary,
                      borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                      py: 2,
                      textAlign: 'center'
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
                        fontSize: '14px',
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
                      {event.name || 'Untitled Event'}
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        fontFamily: 'Manrope, sans-serif',
                        fontSize: '14px',
                        color: (theme) => theme.palette.text.secondary,
                        py: 2
                      }}
                    >
                      {event.date || 'No date set'}
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        fontFamily: 'Manrope, sans-serif',
                        fontSize: '14px',
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
                    <TableCell sx={{ py: 2, textAlign: 'center' }}>
                      <IconButton
                        onClick={(e) => handleMenuClick(e, event.id)}
                        size="small"
                        sx={{
                          color: '#6B7280',
                          '&:hover': {
                            backgroundColor: '#F3F4F6',
                            color: '#374151'
                          }
                        }}
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
        PaperProps={{
          sx: {
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            border: '1px solid #E5E7EB',
            minWidth: '160px'
          }
        }}
      >
        <MenuItem 
          onClick={() => handleAction('view')}
          sx={{ 
            fontFamily: 'Manrope, sans-serif',
            fontSize: '14px',
            py: 1.5,
            '&:hover': {
              backgroundColor: '#F3F4F6'
            }
          }}
        >
          <ViewIcon sx={{ mr: 2, fontSize: '18px', color: '#6B7280' }} />
          View
        </MenuItem>
        <MenuItem 
          onClick={() => handleAction('edit')}
          sx={{ 
            fontFamily: 'Manrope, sans-serif',
            fontSize: '14px',
            py: 1.5,
            '&:hover': {
              backgroundColor: '#F3F4F6'
            }
          }}
        >
          <EditIcon sx={{ mr: 2, fontSize: '18px', color: '#6B7280' }} />
          Edit
        </MenuItem>
        <MenuItem 
          onClick={() => handleAction('configure')}
          sx={{ 
            fontFamily: 'Manrope, sans-serif',
            fontSize: '14px',
            py: 1.5,
            '&:hover': {
              backgroundColor: '#F3F4F6'
            }
          }}
        >
          <ConfigureIcon sx={{ mr: 2, fontSize: '18px', color: '#6B7280' }} />
          Configure
        </MenuItem>
        <MenuItem 
          onClick={() => handleAction('delete')}
          sx={{ 
            fontFamily: 'Manrope, sans-serif',
            fontSize: '14px',
            py: 1.5,
            color: '#DC2626',
            '&:hover': {
              backgroundColor: '#FEF2F2',
              color: '#DC2626'
            }
          }}
        >
          <DeleteIcon sx={{ mr: 2, fontSize: '18px' }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default EventsPage;