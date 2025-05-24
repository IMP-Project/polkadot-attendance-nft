import React, { useState } from 'react';
import { api } from '../services/api';
import { 
  TextField, Button, Grid, Alert, AlertTitle,
  CircularProgress, Box, InputAdornment, Snackbar,
  Divider, Typography, Dialog, DialogActions, DialogContent,
  DialogTitle, Paper, Card, CardContent, CardActionArea,
  Tooltip, IconButton
} from '@mui/material';
import { 
  Event, LocationOn, Title, Add, CloudDownload, Close, 
  LinkOff, Link as LinkIcon, Check
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useTheme } from '@mui/material/styles';

function EventForm({ onEventCreated }) {
  const [name, setName] = useState('');
  const [date, setDate] = useState(null);
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [lumaConnected, setLumaConnected] = useState(false);
  const [mockLumaEvents, setMockLumaEvents] = useState([]);
  const [connectingLuma, setConnectingLuma] = useState(false);
  const [importingEvent, setImportingEvent] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    date: null,
    location: 'Virtual',
    capacity: 100
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const theme = useTheme();

  // Mock function to simulate Luma connection
  const handleConnectLuma = () => {
    setConnectingLuma(true);
    
    // Simulate API call delay
    setTimeout(() => {
      setLumaConnected(true);
      setConnectingLuma(false);
      
      // Set mock events when connected
      setMockLumaEvents([
        {
          id: 'luma-123',
          name: 'Polkadot Meetup Berlin',
          date: '2025-05-15',
          location: 'Berlin, Germany'
        },
        {
          id: 'luma-456',
          name: 'Web3 Developer Conference',
          date: '2025-06-22',
          location: 'London, UK'
        },
        {
          id: 'luma-789',
          name: 'Blockchain Workshop',
          date: '2025-07-10',
          location: 'Paris, France'
        }
      ]);
    }, 1500);
  };

  // Mock function to simulate importing an event from Luma
  const handleImportEvent = (event) => {
    setImportingEvent(true);
    
    // Simulate API call delay
    setTimeout(() => {
      setFormData({
        name: event.name,
        date: event.date,
        location: event.location,
        startDate: event.date,
        endDate: event.date,
      });
      
      setImportingEvent(false);
      setImportDialogOpen(false);
      
      // Show success message
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    }, 1000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log(`Field ${name} changed to:`, value);
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleDateChange = (newDate) => {
    setFormData({
      ...formData,
      date: newDate
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) {
      console.log('Preventing duplicate submission - form is already submitting');
      return;
    }
    
    // Validate form
    if (!formData.name) {
      setErrorMessage('Event name is required');
      return;
    }
    
    // Set submitting state to prevent multiple clicks
    setIsSubmitting(true);
    
    try {
      // Add an explicit delay to ensure UI shows the loading state
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const response = await api.createEvent(formData);
      console.log('Event created:', response);
      
      // Clear form only after successful creation
      setFormData({
        name: '',
        date: null,
        location: 'Virtual',
        capacity: 100
      });
      
      // Show success message
      setSuccessMessage('Event created successfully!');
      
      // Notify parent component
      if (onEventCreated) {
        onEventCreated(response);
      }
      
      // Add a longer delay before allowing new submissions to prevent accidental double-clicks
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      console.error('Error creating event:', error);
      setErrorMessage('Failed to create event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Import from Luma button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Button
          variant="outlined"
          color="secondary"
          onClick={() => setImportDialogOpen(true)}
          startIcon={<CloudDownload />}
          sx={{ 
            borderRadius: 2,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            color: theme.palette.mode === 'dark' ? '#E6007A' : undefined,
            borderColor: theme.palette.mode === 'dark' ? 'rgba(230, 0, 122, 0.5)' : 'rgba(85, 43, 191, 0.5)',
            '&:hover': {
              borderColor: theme.palette.mode === 'dark' ? 'rgba(230, 0, 122, 0.8)' : 'rgba(85, 43, 191, 0.8)',
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(230, 0, 122, 0.08)' : 'rgba(85, 43, 191, 0.08)',
            },
          }}
        >
          Import from Luma
        </Button>
      </Box>

      <form onSubmit={handleSubmit}>
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <AlertTitle>Error</AlertTitle>
            {errorMessage}
          </Alert>
        )}

        <Snackbar
          open={successMessage}
          autoHideDuration={4000}
          onClose={() => setSuccessMessage('')}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert severity="success" variant="filled">
            {successMessage}
          </Alert>
        </Snackbar>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              id="name"
              name="name"
              label="Event Name"
              value={formData.name}
              onChange={handleChange}
              required
              fullWidth
              placeholder="e.g. Polkadot Meetup Berlin"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Title fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Event Date"
                value={formData.date}
                onChange={handleDateChange}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    variant: 'outlined'
                  }
                }}
              />
            </LocalizationProvider>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              id="location"
              name="location"
              label="Event Location"
              value={formData.location}
              onChange={handleChange}
              required
              fullWidth
              placeholder="e.g. Berlin, Germany"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LocationOn fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              id="capacity"
              name="capacity"
              label="Attendee Capacity"
              type="number"
              value={formData.capacity}
              onChange={handleChange}
              required
              fullWidth
              placeholder="e.g. 100"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Event fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <Add />}
                sx={{ 
                  px: 4, 
                  py: 1, 
                  borderRadius: 2,
                  backdropFilter: isSubmitting ? 'none' : 'blur(8px)',
                  WebkitBackdropFilter: isSubmitting ? 'none' : 'blur(8px)',
                  backgroundColor: isSubmitting ? 'rgba(0,0,0,0.12)' : 'rgba(230, 0, 122, 0.85)',
                  '&:hover': {
                    backgroundColor: 'rgba(230, 0, 122, 0.95)',
                  },
                  boxShadow: '0 4px 12px rgba(230, 0, 122, 0.3)',
                  border: '1px solid rgba(230, 0, 122, 0.1)',
                }}
              >
                {isSubmitting ? 'Creating...' : 'Create Event'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>

      {/* Import from Luma Dialog */}
      <Dialog 
        open={importDialogOpen} 
        onClose={() => setImportDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Import Events from Luma</Typography>
            <IconButton onClick={() => setImportDialogOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          {!lumaConnected ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
              <LinkOff sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>Not Connected to Luma</Typography>
              <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3, maxWidth: 450 }}>
                Connect your Luma account to import events. This will allow you to easily sync events 
                and automatically configure webhooks for NFT minting.
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                startIcon={connectingLuma ? <CircularProgress size={20} color="inherit" /> : <LinkIcon />}
                onClick={handleConnectLuma}
                disabled={connectingLuma}
              >
                {connectingLuma ? 'Connecting...' : 'Connect Luma Account'}
              </Button>
            </Box>
          ) : (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Check sx={{ color: 'success.main', mr: 1 }} />
                <Typography variant="body2" color="success.main">
                  Connected to Luma
                </Typography>
              </Box>
              
              <Typography variant="subtitle1" gutterBottom>
                Select an event to import:
              </Typography>
              
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {mockLumaEvents.map((event) => (
                  <Grid item xs={12} md={6} key={event.id}>
                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                      <CardActionArea 
                        onClick={() => handleImportEvent(event)}
                        disabled={importingEvent}
                      >
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            {event.name}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Event sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {event.date}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <LocationOn sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {event.location}
                            </Typography>
                          </Box>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default EventForm;