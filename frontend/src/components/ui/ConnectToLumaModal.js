import React, { useState } from 'react';
import {
  Dialog,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  Event as EventIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useEvents } from '../contexts/EventsContext';
import { useNavigate } from 'react-router-dom';

const ConnectToLumaModal = ({ open, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [lumaEvents, setLumaEvents] = useState([]);
  const [view, setView] = useState('input'); // 'input', 'events', or 'details'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedApiKey, setSavedApiKey] = useState('');
  const [importingAll, setImportingAll] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  
  const { 
    addEvent, 
    events, 
    refreshEventsAfterLogin, 
    markAllEventsImported, 
    allEventsImported,
    needsImport 
  } = useEvents();
  
  const navigate = useNavigate();

  // Load saved API key when modal opens
  React.useEffect(() => {
    const loadSavedApiKey = async () => {
      const authToken = localStorage.getItem('auth_token');
      if (authToken) {
        try {
          const response = await fetch(
            'https://polkadot-attendance-nft-api-bpa5.onrender.com/api/user/luma-api-key',
            {
              headers: { 'Authorization': `Bearer ${authToken}` },
            }
          );
          if (response.ok) {
            const data = await response.json();
            if (data.api_key) {
              setSavedApiKey(data.api_key);
              setApiKey(data.api_key);
            }
          }
        } catch (error) {
          console.log('No saved API key found');
        }
      }
    };

    if (open) {
      loadSavedApiKey();
    }
  }, [open]);

  const saveApiKey = async () => {
    const authToken = localStorage.getItem('auth_token');
    if (authToken && apiKey) {
      try {
        const response = await fetch(
          'https://polkadot-attendance-nft-api-bpa5.onrender.com/api/user/luma-api-key',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ api_key: apiKey }),
          }
        );
        if (response.ok) {
          setSavedApiKey(apiKey);
        }
      } catch (error) {
        console.error('Failed to save API key:', error);
      }
    }
  };

  const fetchLumaEvents = async () => {
    if (!apiKey && !savedApiKey) {
      setError('Please enter your Luma API key');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('https://polkadot-attendance-nft-api-bpa5.onrender.com/api/list-luma-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: savedApiKey || apiKey }),
      });

      if (!response.ok) throw new Error('Failed to fetch events');

      const data = await response.json();
      setLumaEvents(data.events || []);
      setView('events');
      
      // Save API key if successfully fetched events
      if (apiKey && !savedApiKey) {
        await saveApiKey();
      }
    } catch (err) {
      setError('Failed to fetch events from Luma');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkImport = async () => {
    if (!apiKey && !savedApiKey) {
      setError('Please enter your Luma API key');
      return;
    }

    setImportingAll(true);
    setError('');
    setImportProgress({ current: 0, total: 0 });

    try {
      const authToken = localStorage.getItem('auth_token');
      const userDataStr = localStorage.getItem('user_data');
      let userId = 1;
      
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        userId = userData.id || 1;
      }

      console.log('Calling bulk import with:', {
        apiKey: savedApiKey || apiKey,
        userId: userId
      });

      const response = await fetch('https://polkadot-attendance-nft-api-bpa5.onrender.com/api/bulk-import-luma-events', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          apiKey: savedApiKey || apiKey,
          userId: userId.toString()
        }),
      });

      const responseText = await response.text();
      console.log('Bulk import response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response:', responseText);
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to bulk import events');
      }

      // Update progress
      setImportProgress({ 
        current: data.imported_count || 0, 
        total: data.total_count || 0 
      });

      // Show success message
      if (data.imported_count > 0) {
        setError(`Success! Imported ${data.imported_count} out of ${data.total_count} events`);
        
        // Mark all events as imported in context
        await markAllEventsImported();
        
        // Refresh events in context
        await refreshEventsAfterLogin();
        
        // Save API key if not already saved
        if (apiKey && !savedApiKey) {
          await saveApiKey();
        }
        
        // Navigate to events page after 2 seconds
        setTimeout(() => {
          onClose();
          navigate('/events');
        }, 2000);
      } else {
        setError(`All events already imported (${data.total_count} events exist)`);
      }
    } catch (err) {
      console.error('Error during bulk import:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setImportingAll(false);
    }
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setView('details');
  };

  const handleImportSingleEvent = async () => {
    if (!selectedEvent) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('https://polkadot-attendance-nft-api-bpa5.onrender.com/api/import-luma-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          eventId: selectedEvent.api_id,
          eventData: selectedEvent 
        }),
      });

      if (!response.ok) throw new Error('Failed to import event');
      
      const data = await response.json();
      addEvent(data);
      
      setView('input');
      setApiKey('');
      setLumaEvents([]);
      setSelectedEvent(null);
      onClose();
    } catch (err) {
      setError('Failed to import event');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setView('input');
    setApiKey('');
    setLumaEvents([]);
    setSelectedEvent(null);
    setError('');
    onClose();
  };

  const renderInputView = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
        Connect to Luma
      </Typography>
      
      {allEventsImported && (
        <Alert 
          icon={<CheckCircleIcon />} 
          severity="success" 
          sx={{ mb: 3 }}
        >
          <Typography variant="body2" fontWeight="bold">
            ✅ All Events Synced
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Your Luma events are already synchronized. They will auto-update in the background.
          </Typography>
        </Alert>
      )}
      
      {!allEventsImported && (
        <>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Enter your Luma API key to import your events. You can find your API key in your Luma account settings.
          </Typography>
          
          <TextField
            fullWidth
            label="Luma API Key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="luma-api-key-xxxxx"
            sx={{ mb: 2 }}
          />
        </>
      )}
      
      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      
      <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
        <Button
          variant="outlined"
          onClick={handleClose}
          disabled={loading || importingAll}
        >
          Cancel
        </Button>
        
        {!allEventsImported && (
          <>
            <Button
              variant="contained"
              onClick={fetchLumaEvents}
              disabled={loading || importingAll || (!apiKey && !savedApiKey)}
              sx={{
                background: '#FF6B6B',
                '&:hover': { background: '#FF5252' },
              }}
            >
              {loading ? 'Fetching...' : 'Fetch Events'}
            </Button>
            
            <Button
              variant="contained"
              onClick={handleBulkImport}
              disabled={loading || importingAll || (!apiKey && !savedApiKey)}
              sx={{
                background: '#4CAF50',
                '&:hover': { background: '#45a049' },
              }}
            >
              {importingAll ? 'Importing All Events...' : 'Import All Events'}
            </Button>
          </>
        )}
      </Box>
      
      {importingAll && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Importing: {importProgress.current} of {importProgress.total} events
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0} 
          />
        </Box>
      )}
    </Box>
  );

  const renderEventsView = () => (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => setView('input')} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Select Event to Import
        </Typography>
      </Box>
      
      {lumaEvents.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No events found
        </Typography>
      ) : (
        <List>
          {lumaEvents.map((event, index) => (
            <React.Fragment key={event.api_id}>
              <ListItem
                button
                onClick={() => handleEventClick(event)}
                sx={{
                  borderRadius: 1,
                  '&:hover': { backgroundColor: 'action.hover' },
                }}
              >
                <EventIcon sx={{ mr: 2, color: 'primary.main' }} />
                <ListItemText
                  primary={event.name}
                  secondary={new Date(event.start_at).toLocaleDateString()}
                />
              </ListItem>
              {index < lumaEvents.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      )}
    </Box>
  );

  const renderDetailsView = () => (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => setView('events')} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Event Details
        </Typography>
      </Box>
      
      {selectedEvent && (
        <Box>
          <Typography variant="h5" sx={{ mb: 2 }}>
            {selectedEvent.name}
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Chip
              label={new Date(selectedEvent.start_at).toLocaleDateString()}
              size="small"
              sx={{ mr: 1 }}
            />
            {selectedEvent.geo_address_json && (
              <Chip
                label={selectedEvent.geo_address_json.city || 'Virtual'}
                size="small"
              />
            )}
          </Box>
          
          {selectedEvent.description && (
            <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
              {selectedEvent.description}
            </Typography>
          )}
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => setView('events')}
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleImportSingleEvent}
              disabled={loading}
              sx={{
                background: 'linear-gradient(45deg, #E6007A 30%, #3E3E5D 90%)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #C70066 30%, #2E2E4D 90%)',
                },
              }}
            >
              {loading ? 'Importing...' : 'Import Event'}
            </Button>
          </Box>
        </Box>
      )}
      
      {error && (
        <Typography color="error" variant="body2" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          p: 2,
        },
      }}
    >
      <IconButton
        onClick={handleClose}
        sx={{
          position: 'absolute',
          right: 8,
          top: 8,
          color: (theme) => theme.palette.grey[500],
        }}
      >
        <CloseIcon />
      </IconButton>
      
      <Box sx={{ p: 2 }}>
        {view === 'input' && renderInputView()}
        {view === 'events' && renderEventsView()}
        {view === 'details' && renderDetailsView()}
      </Box>
    </Dialog>
  );
};

export default ConnectToLumaModal;