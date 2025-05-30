import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Grid,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Tooltip,
  Avatar,
  Menu
} from '@mui/material';
import {
  Search as SearchIcon,
  QrCodeScanner as QrCodeScannerIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  FileDownload as ExportIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
  Event as EventIcon
} from '@mui/icons-material';
import { api } from '../services/api';
import PageHeader from '../components/ui/PageHeader';

const EventCheckInsPage = ({ mode, toggleDarkMode }) => {
  const [selectedEvent, setSelectedEvent] = useState('');
  const [events, setEvents] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [manualCheckInOpen, setManualCheckInOpen] = useState(false);
  const [selectedAttendee, setSelectedAttendee] = useState(null);
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);

  // Fetch events on mount
  useEffect(() => {
    fetchEvents();
  }, []);

  // Fetch attendees when event is selected
  useEffect(() => {
    if (selectedEvent) {
      fetchAttendees(selectedEvent);
    }
  }, [selectedEvent]);

  const fetchEvents = async () => {
    try {
      const eventsData = await api.getEvents();
      setEvents(eventsData);
      if (eventsData.length > 0) {
        setSelectedEvent(eventsData[0].id);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchAttendees = async (eventId) => {
    setLoading(true);
    try {
      // In a real implementation, this would fetch from Luma API
      // For now, we'll use mock data
      const mockAttendees = [
        {
          id: 'att1',
          name: 'John Doe',
          email: 'john@example.com',
          checkInTime: null,
          walletAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          ticketType: 'General Admission'
        },
        {
          id: 'att2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          checkInTime: '2024-03-20T14:30:00',
          walletAddress: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
          ticketType: 'VIP'
        },
        {
          id: 'att3',
          name: 'Bob Wilson',
          email: 'bob@example.com',
          checkInTime: null,
          walletAddress: '5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw',
          ticketType: 'General Admission'
        }
      ];
      setAttendees(mockAttendees);
    } catch (error) {
      console.error('Error fetching attendees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (attendee) => {
    try {
      // In production, this would:
      // 1. Call Luma API to mark attendee as checked in
      // 2. Trigger NFT minting for their wallet
      
      const updatedAttendees = attendees.map(a => 
        a.id === attendee.id 
          ? { ...a, checkInTime: new Date().toISOString() }
          : a
      );
      setAttendees(updatedAttendees);
      
      // Close manual check-in dialog
      setManualCheckInOpen(false);
      setSelectedAttendee(null);
      
      // Show success message
      console.log('Checked in:', attendee.name);
    } catch (error) {
      console.error('Error checking in attendee:', error);
    }
  };

  const handleQRScan = () => {
    setScannerOpen(true);
    // In production, this would open a QR scanner
    // The scanner would read the Luma ticket QR code
    // Extract the attendee ID and process check-in
  };

  const handleManualCheckIn = (attendee) => {
    setSelectedAttendee(attendee);
    setManualCheckInOpen(true);
  };

  const handleExportMenuOpen = (event) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  const handleExport = () => {
    // Export attendee list as CSV
    const csvContent = [
      ['Name', 'Email', 'Ticket Type', 'Check-in Time', 'Wallet Address'],
      ...attendees.map(a => [
        a.name,
        a.email,
        a.ticketType,
        a.checkInTime || 'Not checked in',
        a.walletAddress
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendees-${selectedEvent}.csv`;
    link.click();
    handleExportMenuClose();
  };

  // Filter attendees based on search
  const filteredAttendees = attendees.filter(attendee =>
    attendee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    attendee.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate statistics
  const stats = {
    total: attendees.length,
    checkedIn: attendees.filter(a => a.checkInTime).length,
    pending: attendees.filter(a => !a.checkInTime).length,
    percentage: attendees.length > 0 
      ? Math.round((attendees.filter(a => a.checkInTime).length / attendees.length) * 100)
      : 0
  };

  return (
    <Box
      sx={{
        height: '100vh',
        backgroundColor: (theme) => theme.palette.background.default,
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
        overflowY: 'auto',
      }}
    >
      {/* Page Header */}
      <PageHeader 
        title="Check-ins"
        subtitle="Scan attendee QR codes to check them in and mint attendance NFTs"
        buttonText="Scan QR Code"
        buttonIcon={<QrCodeScannerIcon />}
        onButtonClick={handleQRScan}
        mode={mode}
        toggleDarkMode={toggleDarkMode}
        sx={{
          '& .MuiButton-root': {
            backgroundColor: '#E6007A',
            '&:hover': { backgroundColor: '#C50066' }
          }
        }}
      />

      {/* Filter Bar */}
      <Box 
        sx={{ 
          px: { xs: 2, md: 4 },
          py: 2,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2
        }}
      >
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            justifyContent: { xs: 'center', md: 'flex-start' },
            gap: 2,
            mt: { xs: 1, md: 3 },
            ml: { xs: 0, md: 1 }
          }}
        >
          {/* Event Selection */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ 
              color: (theme) => theme.palette.text.primary,
              fontFamily: 'Manrope, sans-serif',
              fontSize: '14px'
            }}>Event</Typography>
            <FormControl size="small" sx={{ minWidth: '200px' }}>
              <Select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                displayEmpty
              >
                <MenuItem value="" disabled>Select an event</MenuItem>
                {events.map(event => (
                  <MenuItem key={event.id} value={event.id}>
                    {event.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Search Bar */}
          <TextField
            size="small"
            variant="outlined"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ 
              minWidth: '300px',
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
            <IconButton onClick={() => fetchAttendees(selectedEvent)} disabled={!selectedEvent} size="small">
              <RefreshIcon />
            </IconButton>
            <Button
              size="small"
              startIcon={<ExportIcon />}
              onClick={handleExportMenuOpen}
              disabled={!selectedEvent || attendees.length === 0}
              sx={{
                textTransform: 'none',
                fontFamily: 'Manrope, sans-serif',
                fontSize: '14px',
              }}
            >
              Export
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Statistics Cards */}
      {selectedEvent && (
        <Box sx={{ px: 4, py: 3 }}>
          <Grid 
            container 
            spacing={3} 
            justifyContent={{ xs: 'center', md: 'flex-start' }}
          >
            <Grid item xs={12} sm={6} md={3}>
              <Box
                sx={{
                  width: { xs: '100%', md: '258px' },
                  height: 'auto',
                  minHeight: '127px',
                  borderRadius: '32px',
                  padding: '24px',
                  backgroundColor: (theme) => theme.palette.background.paper,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  boxShadow: (theme) => theme.palette.mode === 'dark' 
                    ? '0 1px 3px rgba(0, 0, 0, 0.3)' 
                    : '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}
              >
                <Typography 
                  sx={{ 
                    fontFamily: 'Manrope, sans-serif',
                    fontWeight: 500,
                    fontSize: '14px',
                    lineHeight: '20px',
                    letterSpacing: '-0.6%',
                    textAlign: 'center',
                    color: (theme) => theme.palette.text.secondary
                  }}
                >
                  Total Registered
                </Typography>
                <Typography 
                  variant="h1" 
                  sx={{ 
                    fontWeight: 700, 
                    color: (theme) => theme.palette.text.primary,
                    fontSize: '48px',
                    lineHeight: 1.2,
                    fontFamily: 'Manrope, sans-serif',
                    textAlign: 'center'
                  }}
                >
                  {stats.total}
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Box
                sx={{
                  width: { xs: '100%', md: '258px' },
                  height: 'auto',
                  minHeight: '127px',
                  borderRadius: '32px',
                  padding: '24px',
                  backgroundColor: (theme) => theme.palette.background.paper,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  boxShadow: (theme) => theme.palette.mode === 'dark' 
                    ? '0 1px 3px rgba(0, 0, 0, 0.3)' 
                    : '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}
              >
                <Typography 
                  sx={{ 
                    fontFamily: 'Manrope, sans-serif',
                    fontWeight: 500,
                    fontSize: '14px',
                    lineHeight: '20px',
                    letterSpacing: '-0.6%',
                    textAlign: 'center',
                    color: (theme) => theme.palette.text.secondary
                  }}
                >
                  Checked In
                </Typography>
                <Typography 
                  variant="h1" 
                  sx={{ 
                    fontWeight: 700, 
                    color: '#4CAF50',
                    fontSize: '48px',
                    lineHeight: 1.2,
                    fontFamily: 'Manrope, sans-serif',
                    textAlign: 'center'
                  }}
                >
                  {stats.checkedIn}
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Box
                sx={{
                  width: { xs: '100%', md: '258px' },
                  height: 'auto',
                  minHeight: '127px',
                  borderRadius: '32px',
                  padding: '24px',
                  backgroundColor: (theme) => theme.palette.background.paper,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  boxShadow: (theme) => theme.palette.mode === 'dark' 
                    ? '0 1px 3px rgba(0, 0, 0, 0.3)' 
                    : '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}
              >
                <Typography 
                  sx={{ 
                    fontFamily: 'Manrope, sans-serif',
                    fontWeight: 500,
                    fontSize: '14px',
                    lineHeight: '20px',
                    letterSpacing: '-0.6%',
                    textAlign: 'center',
                    color: (theme) => theme.palette.text.secondary
                  }}
                >
                  Pending
                </Typography>
                <Typography 
                  variant="h1" 
                  sx={{ 
                    fontWeight: 700, 
                    color: '#FF9800',
                    fontSize: '48px',
                    lineHeight: 1.2,
                    fontFamily: 'Manrope, sans-serif',
                    textAlign: 'center'
                  }}
                >
                  {stats.pending}
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Box
                sx={{
                  width: { xs: '100%', md: '258px' },
                  height: 'auto',
                  minHeight: '127px',
                  borderRadius: '32px',
                  padding: '24px',
                  backgroundColor: (theme) => theme.palette.background.paper,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  boxShadow: (theme) => theme.palette.mode === 'dark' 
                    ? '0 1px 3px rgba(0, 0, 0, 0.3)' 
                    : '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}
              >
                <Typography 
                  sx={{ 
                    fontFamily: 'Manrope, sans-serif',
                    fontWeight: 500,
                    fontSize: '14px',
                    lineHeight: '20px',
                    letterSpacing: '-0.6%',
                    textAlign: 'center',
                    color: (theme) => theme.palette.text.secondary
                  }}
                >
                  Check-in Rate
                </Typography>
                <Box sx={{ width: '100%', textAlign: 'center' }}>
                  <Typography 
                    variant="h1" 
                    sx={{ 
                      fontWeight: 700, 
                      color: (theme) => theme.palette.text.primary,
                      fontSize: '48px',
                      lineHeight: 1.2,
                      fontFamily: 'Manrope, sans-serif',
                      textAlign: 'center'
                    }}
                  >
                    {stats.percentage}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={stats.percentage} 
                    sx={{ 
                      mt: 2, 
                      height: 8, 
                      borderRadius: 4,
                      backgroundColor: (theme) => theme.palette.action.hover,
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: '#E6007A',
                        borderRadius: 4,
                      }
                    }}
                  />
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Attendees Table */}
      <Box sx={{ px: 4, py: 2, flex: 1 }}>
        <TableContainer 
          component={Paper} 
          sx={{ 
            borderRadius: 2,
            boxShadow: (theme) => theme.palette.mode === 'dark' 
              ? '0 1px 3px rgba(0, 0, 0, 0.3)' 
              : '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, fontFamily: 'Manrope, sans-serif' }}>Attendee</TableCell>
                <TableCell sx={{ fontWeight: 600, fontFamily: 'Manrope, sans-serif' }}>Ticket Type</TableCell>
                <TableCell sx={{ fontWeight: 600, fontFamily: 'Manrope, sans-serif' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, fontFamily: 'Manrope, sans-serif' }}>Check-in Time</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, fontFamily: 'Manrope, sans-serif' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <LinearProgress />
                  </TableCell>
                </TableRow>
              ) : filteredAttendees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Box sx={{ py: 8 }}>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          color: (theme) => theme.palette.text.secondary,
                          fontFamily: 'Manrope, sans-serif',
                          mb: 1
                        }}
                      >
                        {selectedEvent ? 'No attendees found' : 'Select an event to view attendees'}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: (theme) => theme.palette.text.secondary,
                          fontFamily: 'Manrope, sans-serif'
                        }}
                      >
                        {selectedEvent ? 'Try adjusting your search or refresh the list' : 'Choose an event from the dropdown above'}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAttendees.map((attendee) => (
                  <TableRow key={attendee.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar 
                          sx={{ 
                            bgcolor: '#E6007A',
                            width: 40,
                            height: 40,
                            fontSize: '16px',
                            fontWeight: 600
                          }}
                        >
                          {attendee.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              fontWeight: 500, 
                              fontFamily: 'Manrope, sans-serif',
                              color: (theme) => theme.palette.text.primary
                            }}
                          >
                            {attendee.name}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: (theme) => theme.palette.text.secondary,
                              fontFamily: 'Manrope, sans-serif'
                            }}
                          >
                            {attendee.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={attendee.ticketType}
                        size="small"
                        color={attendee.ticketType === 'VIP' ? 'secondary' : 'default'}
                        sx={{ fontFamily: 'Manrope, sans-serif' }}
                      />
                    </TableCell>
                    <TableCell>
                      {attendee.checkInTime ? (
                        <Chip
                          icon={<CheckCircleIcon />}
                          label="Checked In"
                          color="success"
                          size="small"
                          sx={{ fontFamily: 'Manrope, sans-serif' }}
                        />
                      ) : (
                        <Chip
                          icon={<CancelIcon />}
                          label="Not Checked In"
                          color="default"
                          size="small"
                          sx={{ fontFamily: 'Manrope, sans-serif' }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {attendee.checkInTime ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TimeIcon fontSize="small" color="action" />
                          <Typography 
                            variant="body2"
                            sx={{ fontFamily: 'Manrope, sans-serif' }}
                          >
                            {new Date(attendee.checkInTime).toLocaleString()}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: (theme) => theme.palette.text.secondary,
                            fontFamily: 'Manrope, sans-serif'
                          }}
                        >
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {!attendee.checkInTime && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleManualCheckIn(attendee)}
                          sx={{
                            textTransform: 'none',
                            fontFamily: 'Manrope, sans-serif',
                            borderColor: '#E6007A',
                            color: '#E6007A',
                            '&:hover': {
                              borderColor: '#C50066',
                              backgroundColor: 'rgba(230, 0, 122, 0.04)'
                            }
                          }}
                        >
                          Check In
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Export Menu */}
      <Menu
        anchorEl={exportMenuAnchor}
        open={Boolean(exportMenuAnchor)}
        onClose={handleExportMenuClose}
      >
        <MenuItem onClick={handleExport}>
          <ExportIcon fontSize="small" sx={{ mr: 1 }} />
          Export as CSV
        </MenuItem>
      </Menu>

      {/* QR Scanner Dialog */}
      <Dialog
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Scan QR Code</DialogTitle>
        <DialogContent>
          <Box sx={{ 
            height: 400, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.1)',
            borderRadius: 2
          }}>
            <Typography color="text.secondary">
              QR Scanner would appear here
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScannerOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Manual Check-in Confirmation Dialog */}
      <Dialog
        open={manualCheckInOpen}
        onClose={() => {
          setManualCheckInOpen(false);
          setSelectedAttendee(null);
        }}
      >
        <DialogTitle>Confirm Check-in</DialogTitle>
        <DialogContent>
          {selectedAttendee && (
            <Box>
              <Typography 
                variant="body1" 
                gutterBottom
                sx={{ fontFamily: 'Manrope, sans-serif' }}
              >
                Check in <strong>{selectedAttendee.name}</strong>?
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: (theme) => theme.palette.text.secondary,
                  fontFamily: 'Manrope, sans-serif'
                }}
              >
                Email: {selectedAttendee.email}
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: (theme) => theme.palette.text.secondary,
                  fontFamily: 'Manrope, sans-serif'
                }}
              >
                Ticket: {selectedAttendee.ticketType}
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: (theme) => theme.palette.text.secondary,
                  fontFamily: 'Manrope, sans-serif',
                  mt: 2, 
                  display: 'block' 
                }}
              >
                This will mint an attendance NFT to their wallet address.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setManualCheckInOpen(false);
              setSelectedAttendee(null);
            }}
            sx={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => handleCheckIn(selectedAttendee)}
            variant="contained"
            sx={{ 
              backgroundColor: '#E6007A',
              '&:hover': { backgroundColor: '#C50066' },
              fontFamily: 'Manrope, sans-serif',
              textTransform: 'none'
            }}
          >
            Confirm Check-in
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EventCheckInsPage; 