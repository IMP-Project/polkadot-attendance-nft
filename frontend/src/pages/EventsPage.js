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
  Add as AddIcon
} from '@mui/icons-material';
import { useEvents } from '../contexts/EventsContext';

const EventsPage = ({ onConnectToLuma }) => {
  const { events, removeEvent } = useEvents();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [selectedEventId, setSelectedEventId] = React.useState(null);

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

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Bar */}
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
              color: '#18171C',
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
              color: '#77738C',
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
                sx={{ width: 20, height: 20 }}
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
                sx={{ width: 20, height: 20 }}
              />
            </IconButton>
          </Tooltip>

          {/* Import from Luma button (always visible) */}
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

          {/* Create Event button (only show when events exist) */}
          {events.length > 0 && (
            <Button
              startIcon={<AddIcon />}
              sx={{
                backgroundColor: '#18171C',
                color: 'white',
                borderRadius: '8px',
                padding: '8px 16px',
                textTransform: 'none',
                fontFamily: 'Manrope, sans-serif',
                fontWeight: 500,
                fontSize: '14px',
                whiteSpace: 'nowrap',
                '&:hover': {
                  backgroundColor: '#374151',
                },
              }}
            >
              Create Event
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
                  color: '#18171C',
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
                  color: '#484554',
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
          // Events Table
          <TableContainer 
            component={Paper} 
            sx={{ 
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              border: '1px solid #E5E7EB'
            }}
          >
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#F9FAFB' }}>
                  <TableCell 
                    sx={{ 
                      fontFamily: 'Manrope, sans-serif',
                      fontWeight: 600,
                      fontSize: '14px',
                      color: '#374151',
                      borderBottom: '1px solid #E5E7EB',
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
                      color: '#374151',
                      borderBottom: '1px solid #E5E7EB',
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
                      color: '#374151',
                      borderBottom: '1px solid #E5E7EB',
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
                      color: '#374151',
                      borderBottom: '1px solid #E5E7EB',
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
                      color: '#374151',
                      borderBottom: '1px solid #E5E7EB',
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
                      color: '#374151',
                      borderBottom: '1px solid #E5E7EB',
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
                    key={event.id} 
                    sx={{ 
                      '&:hover': { 
                        backgroundColor: '#F9FAFB' 
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
                        color: '#6B7280',
                        py: 2
                      }}
                    >
                      {event.id.substring(0, 8)}...
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        fontFamily: 'Manrope, sans-serif',
                        fontSize: '14px',
                        color: '#18171C',
                        fontWeight: 500,
                        py: 2
                      }}
                    >
                      {event.name}
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        fontFamily: 'Manrope, sans-serif',
                        fontSize: '14px',
                        color: '#6B7280',
                        py: 2
                      }}
                    >
                      {event.date}
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        fontFamily: 'Manrope, sans-serif',
                        fontSize: '14px',
                        color: '#6B7280',
                        py: 2
                      }}
                    >
                      {event.location}
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Chip
                        label={event.status}
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