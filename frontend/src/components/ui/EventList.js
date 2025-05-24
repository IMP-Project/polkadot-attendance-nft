import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, Box, Chip, NoSsr, Button, Dialog, 
  DialogTitle, DialogContent, DialogActions, IconButton, useTheme,
  Grid, Tooltip, TextField, Snackbar, Alert, Card, CardContent, CardActions, CardActionArea,
  InputAdornment
} from '@mui/material';
import { 
  Event, Room, Webhook, Close, MoreVert, QrCode, Edit, Delete, LocationOn, People,
  Add, Title, CalendarMonth
} from '@mui/icons-material';
import WebhookSetup from './WebhookSetup';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { api } from '../services/api';
import { QRCodeCanvas } from 'qrcode.react';
import { format } from 'date-fns';

// Helper function to get events from localStorage
const getEventsFromStorage = () => {
  try {
    const storedEvents = localStorage.getItem('mock_events');
    return storedEvents ? JSON.parse(storedEvents) : [];
  } catch (error) {
    console.error('Error retrieving events from localStorage:', error);
    return [];
  }
};

// Helper function to save events to localStorage
const saveEventsToStorage = (events) => {
  try {
    localStorage.setItem('mock_events', JSON.stringify(events));
  } catch (error) {
    console.error('Error saving events to localStorage:', error);
  }
};

function EventList({ events: propEvents }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const [events, setEvents] = useState(propEvents || []);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Initialize events from props or localStorage
  useEffect(() => {
    if (propEvents && propEvents.length > 0) {
      setEvents(propEvents);
    } else {
      setEvents(getEventsFromStorage());
    }
  }, [propEvents]);

  const handleOpenWebhookDialog = (event) => {
    setSelectedEvent(event);
    setWebhookDialogOpen(true);
  };

  const handleCloseWebhookDialog = () => {
    setWebhookDialogOpen(false);
  };

  const handleEditClick = (event) => {
    setCurrentEvent(event);
    setEditFormData({
      name: event.name,
      date: event.date,
      location: event.location,
      capacity: event.capacity
    });
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (event) => {
    setCurrentEvent(event);
    setDeleteDialogOpen(true);
  };

  const handleQrClick = (event) => {
    setCurrentEvent(event);
    setQrDialogOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (newDate) => {
    setEditFormData(prev => ({
      ...prev,
      date: newDate
    }));
  };

  const handleSaveEdit = async () => {
    try {
      const updatedEvents = events.map(e => 
        e.id === currentEvent.id ? { ...e, ...editFormData } : e
      );
      setEvents(updatedEvents);
      saveEventsToStorage(updatedEvents);
      setEditDialogOpen(false);
      setSnackbar({
        open: true,
        message: 'Event updated successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating event:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update event',
        severity: 'error'
      });
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      const updatedEvents = events.filter(e => e.id !== currentEvent.id);
      setEvents(updatedEvents);
      saveEventsToStorage(updatedEvents);
      setDeleteDialogOpen(false);
      setSnackbar({
        open: true,
        message: 'Event deleted successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete event',
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleViewEvent = (event) => {
    navigate(`/admin/event/${event.id}`);
  };

  if (!events || events.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          No events found. Create your first event above.
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Your Events</Typography>
        <Button 
          variant="contained" 
          startIcon={<Add />} 
          onClick={() => navigate('/admin/create-event')}
          sx={{ borderRadius: 28 }}
        >
          Create Event
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2 }}>
        <Table sx={{ minWidth: 650 }} aria-label="events table">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'rgba(0, 0, 0, 0.02)' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Location</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((event) => {
              const eventDate = new Date(event.date);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              
              let status = 'upcoming';
              let chipColor = 'primary';
              
              if (eventDate.getTime() === today.getTime()) {
                status = 'active';
                chipColor = 'success';
              } else if (eventDate < today) {
                status = 'past';
                chipColor = 'default';
              }
              
              return (
                <TableRow
                  key={event.id}
                  sx={{ '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }}
                >
                  <TableCell component="th" scope="row">
                    {event.id}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body1" fontWeight="medium">
                      {event.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Event fontSize="small" sx={{ mr: 1, color: 'primary.main', opacity: 0.7 }} />
                      <NoSsr>
                        {format(eventDate, 'MMMM dd, yyyy')}
                      </NoSsr>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <LocationOn fontSize="small" sx={{ mr: 1, color: 'primary.main', opacity: 0.7 }} />
                      {event.location || 'Virtual'}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={status.charAt(0).toUpperCase() + status.slice(1)} 
                      color={chipColor}
                      size="small"
                      variant={status === 'active' ? 'filled' : 'outlined'}
                      sx={{ fontWeight: 'medium' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        color="primary"
                        onClick={() => navigate(`/check-in/${event.id}`)}
                        sx={{ borderRadius: '8px' }}
                      >
                        Check-In
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        color="secondary"
                        startIcon={<Webhook />}
                        onClick={() => handleOpenWebhookDialog(event)}
                        sx={{ borderRadius: '8px' }}
                      >
                        Configure
                      </Button>
                      <IconButton 
                        size="small" 
                        sx={{ color: theme.palette.grey[600] }} 
                        onClick={() => handleEditClick(event)}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        sx={{ color: theme.palette.grey[600] }} 
                        onClick={() => handleQrClick(event)}
                      >
                        <QrCode fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        sx={{ color: theme.palette.error.main }} 
                        onClick={() => handleDeleteClick(event)}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={webhookDialogOpen}
        onClose={handleCloseWebhookDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          elevation: 3,
          sx: {
            borderRadius: 2,
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Connect Event to Luma
            </Typography>
            <IconButton edge="end" color="inherit" onClick={handleCloseWebhookDialog} aria-label="close">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedEvent && (
            <Box>
              <Box sx={{ mb: 3, px: 1 }}>
                <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                  {selectedEvent.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Event fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {format(new Date(selectedEvent.date), 'MMMM dd, yyyy')}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <LocationOn fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {selectedEvent.location || 'Virtual'}
                  </Typography>
                </Box>
              </Box>
              
              <WebhookSetup 
                eventId={selectedEvent.id} 
                eventName={selectedEvent.name} 
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseWebhookDialog}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Event</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                name="name"
                label="Event Name"
                fullWidth
                value={editFormData.name}
                onChange={handleEditChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Title fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="date"
                label="Event Date"
                type="date"
                fullWidth
                value={editFormData.date}
                onChange={handleEditChange}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarMonth fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="location"
                label="Location"
                fullWidth
                value={editFormData.location}
                onChange={handleEditChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationOn fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="capacity"
                label="Capacity"
                type="number"
                fullWidth
                value={editFormData.capacity}
                onChange={handleEditChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <People fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Event</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{currentEvent?.name}</strong>?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={qrDialogOpen}
        onClose={() => setQrDialogOpen(false)}
      >
        <DialogTitle>Event QR Code</DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pb: 3 }}>
          <Box sx={{ bgcolor: '#f5f5f5', p: 3, borderRadius: 2, mt: 2 }}>
            <QRCodeCanvas 
              value={`${window.location.origin}/check-in/${currentEvent?.id}`} 
              size={200}
              level="H"
              includeMargin
            />
          </Box>
          <Typography sx={{ mt: 3 }}>
            <strong>Event ID:</strong> {currentEvent?.id}
          </Typography>
          <Typography>
            <strong>Event Name:</strong> {currentEvent?.name}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialogOpen(false)}>Close</Button>
          <Button 
            color="primary" 
            variant="contained"
            onClick={() => {
              window.print();
            }}
          >
            Print
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}

export default EventList;