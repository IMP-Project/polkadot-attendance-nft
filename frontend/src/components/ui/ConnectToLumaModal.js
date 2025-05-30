import React, { useState } from 'react';
import { Dialog, Box, Typography, TextField, Button, IconButton, List, ListItem, ListItemText, Divider, Chip } from '@mui/material';
import { Close as CloseIcon, ArrowBack as ArrowBackIcon, Event as EventIcon } from '@mui/icons-material';
import { useEvents } from '../../contexts/EventsContext';
import ImportProgressModal from './ImportProgressModal';

const ConnectToLumaModal = ({ open, onClose, onSuccess }) => {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [step, setStep] = useState(1); // 1: Enter API Key, 2: Select Event
  const [importProgress, setImportProgress] = useState({ open: false, eventName: '', progress: 0 });
  const [savedApiKey, setSavedApiKey] = useState('');
  const [hasSavedKey, setHasSavedKey] = useState(false);
  
  const { addEvent } = useEvents();

  // Load saved API key when modal opens
  React.useEffect(() => {
    if (open) {
      loadSavedApiKey();
    }
  }, [open]);

  const loadSavedApiKey = async () => {
    const authToken = localStorage.getItem('auth_token');
    if (!authToken) return;

    try {
      const response = await fetch('https://polkadot-attendance-nft-api-bpa5.onrender.com/api/user/luma-api-key', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSavedApiKey(data.api_key);
        setApiKey(data.api_key);
        setHasSavedKey(true);
        // Auto-fetch events if we have a saved API key
        handleImportFromLuma(data.api_key);
      } else if (response.status === 404) {
        // No saved API key
        setHasSavedKey(false);
        setSavedApiKey('');
      }
    } catch (error) {
      console.warn('Error loading saved API key:', error);
      setHasSavedKey(false);
    }
  };

  const saveApiKeyToDatabase = async (keyToSave) => {
    const authToken = localStorage.getItem('auth_token');
    if (!authToken) return false;

    try {
      const response = await fetch('https://polkadot-attendance-nft-api-bpa5.onrender.com/api/user/luma-api-key', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ api_key: keyToSave }),
      });

      if (response.ok) {
        setSavedApiKey(keyToSave);
        setHasSavedKey(true);
        console.log('API key saved to database');
        return true;
      } else {
        console.warn('Failed to save API key to database');
        return false;
      }
    } catch (error) {
      console.warn('Error saving API key to database:', error);
      return false;
    }
  };

  const deleteApiKeyFromDatabase = async () => {
    const authToken = localStorage.getItem('auth_token');
    if (!authToken) return false;

    try {
      const response = await fetch('https://polkadot-attendance-nft-api-bpa5.onrender.com/api/user/luma-api-key', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        setSavedApiKey('');
        setHasSavedKey(false);
        console.log('API key deleted from database');
        return true;
      } else {
        console.warn('Failed to delete API key from database');
        return false;
      }
    } catch (error) {
      console.warn('Error deleting API key from database:', error);
      return false;
    }
  };

  const handleImportFromLuma = async (savedKey = null) => {
    const keyToUse = savedKey || apiKey;
    
    if (!keyToUse.trim()) {
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('https://polkadot-attendance-nft-api-bpa5.onrender.com/api/list-luma-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: keyToUse
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch events from Luma');
      }

      const data = await response.json();
      console.log('Luma events:', data);
      
      setEvents(data.events || []);
      
      // Save API key to database if it works and is not already saved
      if (!savedKey && keyToUse !== savedApiKey) {
        await saveApiKeyToDatabase(keyToUse);
      }
      
      setStep(2); // Move to event selection step
      
    } catch (error) {
      console.error('Error importing from Luma:', error);
      // If saved key fails, clear it from database
      if (savedKey && hasSavedKey) {
        await deleteApiKeyFromDatabase();
        setApiKey('');
        setStep(1);
      }
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEvent = async (selectedEvent) => {
    // Start import progress
    setImportProgress({
      open: true,
      eventName: selectedEvent.name,
      progress: 0
    });

    // Simulate progress steps
    const progressSteps = [20, 40, 60, 80, 100];
    
    try {
      for (let i = 0; i < progressSteps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 800));
        setImportProgress(prev => ({
          ...prev,
          progress: progressSteps[i]
        }));
      }

      // Import the selected event from Luma
      const lumaResponse = await fetch('https://polkadot-attendance-nft-api-bpa5.onrender.com/api/import-luma-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: savedApiKey || apiKey,
          eventId: selectedEvent.api_id
        }),
      });

      if (!lumaResponse.ok) {
        throw new Error('Failed to import event from Luma');
      }

      const lumaData = await lumaResponse.json();
      console.log('Imported event from Luma:', lumaData);
      
      // Save event to your database via your backend API
      const authToken = localStorage.getItem('auth_token');
      if (authToken) {
        try {
          const dbResponse = await fetch('https://polkadot-attendance-nft-api-bpa5.onrender.com/api/user/events', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
              name: lumaData.event.name || selectedEvent.name,
              date: lumaData.event.start_at || selectedEvent.start_at,
              location: lumaData.event.geo_address_json?.address || 'Online',
              description: lumaData.event.description || '',
              url: lumaData.event.url || selectedEvent.url || '',
            }),
          });

          if (dbResponse.ok) {
            const savedEvent = await dbResponse.json();
            console.log('Event saved to database:', savedEvent);
            
            // Add the saved event (with database ID) to context
            addEvent(savedEvent);
          } else {
            console.warn('Failed to save event to database, adding to context only');
            // Fallback: add Luma event to context
            addEvent(lumaData.event);
          }
        } catch (dbError) {
          console.warn('Database save error, adding to context only:', dbError);
          // Fallback: add Luma event to context
          addEvent(lumaData.event);
        }
      } else {
        console.warn('No auth token found, adding to context only');
        // Fallback: add Luma event to context
        addEvent(lumaData.event);
      }
      
      // Close progress modal
      setImportProgress({ open: false, eventName: '', progress: 0 });
      
      // Close main modal
      handleClose();
      
      // Call success callback to redirect to events page
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error) {
      console.error('Error importing event:', error);
      setImportProgress({ open: false, eventName: '', progress: 0 });
      alert('Error importing event: ' + error.message);
    }
  };

  const handleClose = () => {
    setEvents([]);
    setStep(1);
    setImportProgress({ open: false, eventName: '', progress: 0 });
    onClose();
    // Note: We don't clear apiKey here so it's remembered for next time
  };

  const handleBackToApiKey = () => {
    setStep(1);
    setEvents([]);
  };

  const clearSavedApiKey = async () => {
    const success = await deleteApiKeyFromDatabase();
    if (success) {
      setApiKey('');
      setStep(1);
      setEvents([]);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            padding: 0,
            maxWidth: '580px',
            margin: '16px',
            maxHeight: '90vh',
            backgroundColor: (theme) => theme.palette.background.paper,
            backgroundImage: 'none',
          },
        }}
      >
        <Box
          sx={{
            padding: '32px',
            position: 'relative',
          }}
        >
          {/* Close Button */}
          <IconButton
            onClick={handleClose}
            sx={{
              position: 'absolute',
              top: '24px',
              right: '24px',
              color: '#6B7280',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              },
            }}
          >
            <CloseIcon />
          </IconButton>

          {/* Back Button (Step 2 only) */}
          {step === 2 && (
            <IconButton
              onClick={handleBackToApiKey}
              sx={{
                position: 'absolute',
                top: '24px',
                left: '24px',
                color: '#6B7280',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                },
              }}
            >
              <ArrowBackIcon />
            </IconButton>
          )}

          {/* Step 1: API Key Input */}
          {step === 1 && (
            <>
              {/* Title */}
              <Typography
                sx={{
                  fontFamily: 'Manrope, sans-serif',
                  fontWeight: 600,
                  fontSize: '24px',
                  lineHeight: '32px',
                  color: (theme) => theme.palette.text.primary,
                  marginBottom: '16px',
                }}
              >
                {hasSavedKey ? 'Update Luma API Key' : 'Connect to Luma'}
              </Typography>

              {/* Description */}
              <Typography
                sx={{
                  fontFamily: 'Manrope, sans-serif',
                  fontWeight: 400,
                  fontSize: '16px',
                  lineHeight: '24px',
                  color: (theme) => theme.palette.text.secondary,
                  marginBottom: '24px',
                }}
              >
                {hasSavedKey 
                  ? 'Update your Luma API key or continue with the saved one.'
                  : 'Enter your Luma API key to import your Luma events. If you do not have a LUMA API key, you can get one'
                }{' '}
                {!hasSavedKey && (
                  <Box
                    component="span"
                    sx={{
                      color: '#FF2670',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      '&:hover': {
                        color: '#E91E63',
                      },
                    }}
                    onClick={() => window.open('https://luma.com/api', '_blank')}
                  >
                    here
                  </Box>
                )}
              </Typography>

              {/* Show saved API key info */}
              {hasSavedKey && (
                <Box
                  sx={{
                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#F0F9FF',
                    border: '1px solid #3B82F6',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '16px',
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: 'Manrope, sans-serif',
                      fontSize: '14px',
                      color: '#3B82F6',
                      marginBottom: '8px',
                      fontWeight: 500,
                    }}
                  >
                    ✅ API Key Saved to Your Account
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'Manrope, sans-serif',
                      fontSize: '12px',
                      color: (theme) => theme.palette.text.secondary,
                    }}
                  >
                    Your Luma API key is securely saved and syncs across all your devices.
                  </Typography>
                </Box>
              )}

              {/* Input Label */}
              <Typography
                sx={{
                  fontFamily: 'Manrope, sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  lineHeight: '20px',
                  color: (theme) => theme.palette.text.primary,
                  marginBottom: '8px',
                }}
              >
                {hasSavedKey ? 'Update Luma API key (optional)' : 'Enter Luma API key'}
              </Typography>

              {/* Input Field */}
              <TextField
                fullWidth
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={hasSavedKey ? 'Update your API key...' : 'Enter your API key'}
                variant="outlined"
                sx={{
                  marginBottom: '16px',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    backgroundColor: (theme) => theme.palette.background.paper,
                    '& fieldset': {
                      borderColor: (theme) => theme.palette.divider,
                    },
                    '&:hover fieldset': {
                      borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.23)' : '#9CA3AF',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#FF2670',
                      borderWidth: '2px',
                    },
                  },
                  '& .MuiInputBase-input': {
                    padding: '12px 16px',
                    fontFamily: 'Manrope, sans-serif',
                    fontSize: '16px',
                    color: (theme) => theme.palette.text.primary,
                    '&::placeholder': {
                      color: (theme) => theme.palette.text.secondary,
                      opacity: 0.7,
                    },
                  },
                }}
              />

              {/* Clear API Key Button */}
              {hasSavedKey && (
                <Button
                  onClick={clearSavedApiKey}
                  sx={{
                    color: '#EF4444',
                    textTransform: 'none',
                    fontFamily: 'Manrope, sans-serif',
                    fontSize: '14px',
                    marginBottom: '16px',
                    '&:hover': {
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    },
                  }}
                >
                  Remove Saved API Key
                </Button>
              )}

              {/* Import Button */}
              <Button
                onClick={() => handleImportFromLuma()}
                disabled={loading || (!apiKey.trim() && !hasSavedKey)}
                sx={{
                  backgroundColor: '#FF2670',
                  color: 'white',
                  borderRadius: '10px',
                  padding: '12px',
                  textTransform: 'none',
                  fontFamily: 'Manrope, sans-serif',
                  fontWeight: 600,
                  fontSize: '16px',
                  width: '200px',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  '&:hover': {
                    backgroundColor: '#E91E63',
                  },
                  '&:disabled': {
                    backgroundColor: '#F3F4F6',
                    color: '#9CA3AF',
                  },
                }}
              >
                <Box
                  component="img"
                  src="/images/import-icon.png" 
                  alt="Import"
                  sx={{ width: 16, height: 16 }}
                />
                {loading ? 'Fetching Events...' : 'Fetch Events'}
              </Button>
            </>
          )}

          {/* Step 2: Event Selection */}
          {step === 2 && (
            <>
              {/* Title */}
              <Typography
                sx={{
                  fontFamily: 'Manrope, sans-serif',
                  fontWeight: 600,
                  fontSize: '24px',
                  lineHeight: '32px',
                  color: (theme) => theme.palette.text.primary,
                  marginBottom: '16px',
                  marginLeft: '40px', // Account for back button
                }}
              >
                Select Event to Import
              </Typography>

              {/* Description */}
              <Typography
                sx={{
                  fontFamily: 'Manrope, sans-serif',
                  fontWeight: 400,
                  fontSize: '16px',
                  lineHeight: '24px',
                  color: (theme) => theme.palette.text.secondary,
                  marginBottom: '24px',
                }}
              >
                Choose which event you'd like to import from your Luma account.
              </Typography>

              {events.length === 0 ? (
                <Box
                  sx={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: '#6B7280',
                  }}
                >
                  <EventIcon sx={{ fontSize: 48, marginBottom: 2, opacity: 0.5 }} />
                  <Typography
                    sx={{
                      fontFamily: 'Manrope, sans-serif',
                      fontSize: '16px',
                    }}
                  >
                    No events found. Make sure you have events in your Luma account.
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    maxHeight: '400px',
                    overflowY: 'auto',
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                    borderRadius: '12px',
                    backgroundColor: (theme) => theme.palette.background.paper,
                  }}
                >
                  <List sx={{ padding: 0 }}>
                    {events.map((event, index) => (
                      <React.Fragment key={event.api_id || index}>
                        <ListItem
                          button
                          onClick={() => handleSelectEvent(event)}
                          sx={{
                            padding: '20px',
                            '&:hover': {
                              backgroundColor: (theme) => theme.palette.action.hover,
                            },
                          }}
                        >
                          <Box sx={{ width: '100%' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                              <Typography
                                sx={{
                                  fontFamily: 'Manrope, sans-serif',
                                  fontWeight: 600,
                                  fontSize: '18px',
                                  color: (theme) => theme.palette.text.primary,
                                  flex: 1,
                                }}
                              >
                                {event.name || 'Untitled Event'}
                              </Typography>
                              <Chip
                                label={event.visibility || 'public'}
                                size="small"
                                sx={{
                                  backgroundColor: event.visibility === 'public' ? '#DCFCE7' : '#FEF3C7',
                                  color: event.visibility === 'public' ? '#15803D' : '#92400E',
                                  fontFamily: 'Manrope, sans-serif',
                                  fontWeight: 500,
                                  textTransform: 'capitalize',
                                }}
                              />
                            </Box>
                            
                            <Typography
                              sx={{
                                fontFamily: 'Manrope, sans-serif',
                                fontSize: '14px',
                                color: (theme) => theme.palette.text.secondary,
                                marginBottom: '8px',
                              }}
                            >
                              {event.start_at ? formatDate(event.start_at) : 'No date set'}
                            </Typography>
                            
                            {event.timezone && (
                              <Typography
                                sx={{
                                  fontFamily: 'Manrope, sans-serif',
                                  fontSize: '12px',
                                  color: (theme) => theme.palette.text.secondary,
                                  marginBottom: '8px',
                                  opacity: 0.8,
                                }}
                              >
                                📍 {event.timezone}
                              </Typography>
                            )}
                            
                            {event.url && (
                              <Typography
                                sx={{
                                  fontFamily: 'Manrope, sans-serif',
                                  fontSize: '12px',
                                  color: '#FF2670',
                                  textDecoration: 'underline',
                                }}
                              >
                                {event.url}
                              </Typography>
                            )}
                          </Box>
                        </ListItem>
                        {index < events.length - 1 && <Divider sx={{ borderColor: (theme) => theme.palette.divider }} />}
                      </React.Fragment>
                    ))}
                  </List>
                </Box>
              )}
            </>
          )}
        </Box>
      </Dialog>

      {/* Import Progress Modal */}
      <ImportProgressModal
        open={importProgress.open}
        onClose={() => {}}
        eventName={importProgress.eventName}
        progress={importProgress.progress}
      />
    </>
  );
};

export default ConnectToLumaModal;