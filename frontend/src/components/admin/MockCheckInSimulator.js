import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  TextField, 
  Snackbar, 
  Alert,
  Grid,
  Card,
  CardContent,
  Divider,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { api } from '../services/api';

/**
 * MockCheckInSimulator component to trigger simulated Luma check-in events
 * This is used for demonstration purposes since a real Luma API integration
 * requires a paid subscription.
 */
const MockCheckInSimulator = ({ onNFTMinted, eventId: initialEventId }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    eventId: initialEventId || 'luma123',
    attendeeId: 'attendee456',
    attendeeName: 'John Doe',
    walletAddress: localStorage.getItem('wallet_address') || '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
  });
  const [availableEvents, setAvailableEvents] = useState([]);

  // Fetch available events for the dropdown
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const events = await api.getEvents();
        setAvailableEvents(events);
        
        // If we have an initialEventId, use it
        if (initialEventId) {
          setFormData(prev => ({
            ...prev,
            eventId: initialEventId
          }));
        }
        // Otherwise use the first event if available
        else if (events.length > 0 && !initialEventId) {
          setFormData(prev => ({
            ...prev,
            eventId: events[0].id
          }));
        }
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };
    
    fetchEvents();
  }, [initialEventId]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSimulate = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Fetch event details to get the real event name for the NFT
      let eventName = "Unknown Event";
      try {
        const events = await api.getEvents();
        const event = events.find(e => e.id === formData.eventId);
        if (event) {
          eventName = event.name;
        }
      } catch (err) {
        console.warn('Could not fetch event details, using ID as name');
      }

      // In demo mode, directly create a mock NFT in local storage
      const mockNft = {
        id: `nft-${Date.now()}`,
        owner: formData.walletAddress,
        metadata: {
          name: `${eventName} Attendance`,
          description: `Attended ${eventName}`,
          image: 'https://via.placeholder.com/300',
          event_id: formData.eventId,
          event_name: eventName,
          attendee: formData.attendeeName,
          event_date: new Date().toISOString().split('T')[0],
          location: 'Virtual',
          attributes: [
            { trait_type: 'Event', value: eventName },
            { trait_type: 'Date', value: new Date().toISOString().split('T')[0] },
            { trait_type: 'Attendee', value: formData.attendeeName },
            { trait_type: 'Location', value: 'Virtual' }
          ]
        },
        created_at: new Date().toISOString()
      };
      
      // Get existing mock NFTs from localStorage
      let mockNfts = JSON.parse(localStorage.getItem('mock_nfts') || '[]');
      mockNfts.push(mockNft);
      localStorage.setItem('mock_nfts', JSON.stringify(mockNfts));
      
      // Dispatch an event to notify parent components that an NFT was minted
      window.dispatchEvent(new CustomEvent('nft_minted', { detail: mockNft }));
      
      // Call the callback if provided
      if (typeof onNFTMinted === 'function') {
        onNFTMinted(mockNft);
      }
      
      // API call can still be attempted but we don't depend on it
      const apiUrl = process.env.REACT_APP_API_URL || 'https://polkadot-attendance-nft-api.onrender.com';
      
      try {
        await fetch(`${apiUrl}/api/webhook/check-in`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event_id: formData.eventId,
            attendee_id: formData.attendeeId,
            timestamp: new Date().toISOString()
          })
        });
      } catch (apiErr) {
        console.log('API call failed, but using local mock data instead', apiErr);
      }
      
      setSuccess(true);
      console.log('Simulated check-in successful, created mock NFT:', mockNft);
    } catch (err) {
      setError(err.message || 'An error occurred');
      console.error('Error simulating check-in:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card 
      sx={{ 
        mt: 4, 
        border: `1px solid ${theme.palette.divider}`,
        background: theme.palette.mode === 'dark' 
          ? 'rgba(255, 255, 255, 0.05)' 
          : 'rgba(0, 0, 0, 0.02)',
        boxShadow: theme.shadows[2]
      }}
    >
      <CardContent>
        <Typography variant="h6" color="primary" gutterBottom>
          Demo: Simulate Luma Check-In
        </Typography>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          This simulates a webhook from Luma when an attendee checks in at an event. 
          In production, this would come from the actual Luma API integration.
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth variant="outlined" size="small" margin="normal">
              <InputLabel id="event-select-label">Event</InputLabel>
              <Select
                labelId="event-select-label"
                id="event-select"
                value={formData.eventId}
                name="eventId"
                onChange={handleChange}
                label="Event"
              >
                {availableEvents.map(event => (
                  <MenuItem key={event.id} value={event.id}>
                    {event.name}
                  </MenuItem>
                ))}
                {availableEvents.length === 0 && (
                  <MenuItem value="luma123">Demo Event</MenuItem>
                )}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Attendee ID"
              name="attendeeId"
              value={formData.attendeeId}
              onChange={handleChange}
              margin="normal"
              variant="outlined"
              size="small"
              helperText="Luma attendee identifier"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Attendee Name"
              name="attendeeName"
              value={formData.attendeeName}
              onChange={handleChange}
              margin="normal"
              variant="outlined"
              size="small"
              helperText="This would come from Luma in production"
              disabled
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Wallet Address"
              name="walletAddress"
              value={formData.walletAddress}
              onChange={handleChange}
              margin="normal"
              variant="outlined"
              size="small"
              helperText="This would be from a Luma custom field in production"
              disabled
            />
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSimulate}
            disabled={loading}
            sx={{ 
              minWidth: 200,
              background: 'linear-gradient(45deg, #E6007A 30%, #8B00BF 90%)',
              '&:hover': {
                background: 'linear-gradient(45deg, #D0006A 30%, #7A00AF 90%)',
              }
            }}
          >
            {loading ? 'Simulating...' : 'Simulate Check-In'}
          </Button>
        </Box>
        
        <Snackbar 
          open={success} 
          autoHideDuration={6000} 
          onClose={() => setSuccess(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="success" onClose={() => setSuccess(false)}>
            Check-in simulated successfully! NFT minting process initiated.
          </Alert>
        </Snackbar>
        
        <Snackbar 
          open={!!error} 
          autoHideDuration={6000} 
          onClose={() => setError('')}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        </Snackbar>
      </CardContent>
    </Card>
  );
};

export default MockCheckInSimulator; 