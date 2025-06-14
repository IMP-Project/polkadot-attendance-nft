import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const EventsContext = createContext();

// API Base URL - Use local backend for development
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export const useEvents = () => {
  const context = useContext(EventsContext);
  if (!context) {
    throw new Error('useEvents must be used within an EventsProvider');
  }
  return context;
};

export const EventsProvider = ({ children }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allEventsImported, setAllEventsImported] = useState(false);
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('auth_token'));

  // Memoized function to load events - prevents recreation on every render
  const loadEventsFromDatabase = useCallback(async () => {
    const currentAuthToken = localStorage.getItem('auth_token');
    
    // Skip loading if user is not authenticated
    if (!currentAuthToken) {
      setEvents([]);
      setAllEventsImported(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Load events from database (synced from Luma)
      const response = await fetch(`${API_BASE_URL}/api/events`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${currentAuthToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Loaded events from database:', data);
        
        // Transform database events to match UI format
        const eventsArray = data.events || data || [];
        const formattedEvents = (Array.isArray(eventsArray) ? eventsArray : [])
          .filter(event => event && typeof event === 'object') // Filter out undefined/null events
          .map(event => ({
            id: event.lumaEventId || event.id || 'unknown',
            name: event.name || 'Untitled Event',
            date: formatDate(event.startDate || event.date || event.start_at),
            location: event.location || event.timezone || 'Online',
            status: getEventStatus(event.startDate || event.date || event.start_at, event.endDate || event.end_at),
            checkinsCount: event.checkinsCount || 0, // Include check-ins count
            originalData: event, // Keep original database data
          }));
        
        setEvents(formattedEvents);
        setAllEventsImported(true);
        console.log(`✅ Loaded ${formattedEvents.length} events from database`);
      } else {
        console.warn('Failed to load events:', response.status);
        if (response.status !== 401 && response.status !== 403) {
          setError('Failed to load events');
        }
      }
    } catch (err) {
      console.warn('Error loading events:', err);
      setError('Error loading events');
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies - function is stable

  // Memoized sync status check
  const checkSyncStatus = useCallback(async (currentAuthToken, currentEventCount) => {
    try {
      // Get saved API key
      const apiKeyResponse = await fetch(`${API_BASE_URL}/api/user/luma-api-key`, {
        headers: {
          'Authorization': `Bearer ${currentAuthToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (apiKeyResponse.ok) {
        const apiKeyData = await apiKeyResponse.json();
        const lumaApiKey = apiKeyData.api_key;

        if (lumaApiKey) {
          // Get Luma events count
          const lumaResponse = await fetch(`${API_BASE_URL}/api/list-luma-events`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ apiKey: lumaApiKey }),
          });

          if (lumaResponse.ok) {
            const lumaData = await lumaResponse.json();
            const lumaEventCount = lumaData.events?.length || 0;
            const dbEventCount = currentEventCount || 0;

            console.log(`📊 Sync Status: DB has ${dbEventCount} events, Luma has ${lumaEventCount} events`);

            // If we have same number of events (or more), consider all imported
            const isAllImported = dbEventCount >= lumaEventCount && lumaEventCount > 0;
            setAllEventsImported(isAllImported);
            
            console.log(`🔄 All events imported: ${isAllImported}`);
          }
        } else {
          // No API key saved, so not all events imported
          setAllEventsImported(false);
        }
      }
    } catch (err) {
      console.warn('Error checking sync status:', err);
      // If we can't check, assume not all imported
      setAllEventsImported(false);
    }
  }, []);

  // Load events only once when component mounts and user is authenticated
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      loadEventsFromDatabase();
    } else {
      setLoading(false); // Stop loading if no token
    }
  }, [loadEventsFromDatabase]);

  // Monitor auth token changes - FIXED: Only update when token actually changes
  useEffect(() => {
    const checkAuthToken = () => {
      const currentToken = localStorage.getItem('auth_token');
      
      // Only update if token actually changed
      if (currentToken !== authToken) {
        console.log('Auth token changed:', currentToken ? 'Login detected' : 'Logout detected');
        setAuthToken(currentToken);
        
        if (currentToken) {
          console.log('Auth token detected, loading events...');
          loadEventsFromDatabase();
        } else {
          console.log('No auth token, clearing events');
          setEvents([]);
          setAllEventsImported(false);
          setLoading(false);
        }
      }
    };

    // Check immediately
    checkAuthToken();

    // Set up interval to check for auth changes - REDUCED frequency
    const authCheckInterval = setInterval(checkAuthToken, 5000); // Check every 5 seconds instead of 2

    return () => clearInterval(authCheckInterval);
  }, [authToken, loadEventsFromDatabase]); // FIXED: Include authToken as dependency

  // Function to manually trigger event loading (call this after successful login)
  const refreshEventsAfterLogin = useCallback(() => {
    console.log('🔄 Refreshing events after login...');
    loadEventsFromDatabase();
  }, [loadEventsFromDatabase]);

  // Function to mark all events as imported (call after successful bulk import)
  const markAllEventsImported = useCallback(async () => {
    console.log('✅ Marking all events as imported');
    setAllEventsImported(true);
    
    // Also trigger a sync check to ensure accuracy
    const currentAuthToken = localStorage.getItem('auth_token');
    if (currentAuthToken) {
      setTimeout(() => {
        checkSyncStatus(currentAuthToken, events.length);
      }, 1000);
    }
  }, [events.length, checkSyncStatus]);

  // Function to check if import is needed
  const needsImport = useCallback(() => {
    return !allEventsImported;
  }, [allEventsImported]);

  const addEvent = useCallback((event) => {
    const formattedEvent = {
      id: event.api_id || event.id || 'unknown',
      name: event.name || 'Untitled Event',
      date: formatDate(event.start_at || event.date),
      location: event.location || event.timezone || 'Online',
      status: getEventStatus(event.start_at || event.date, event.end_at),
      originalData: event, // Keep original data
    };
    
    setEvents(prevEvents => [...prevEvents, formattedEvent]);
  }, []);

  const removeEvent = useCallback(async (eventId) => {
    const currentAuthToken = localStorage.getItem('auth_token');
    
    // Remove from UI immediately for better UX
    setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
    
    // Try to delete from database
    if (currentAuthToken) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/user/events/${eventId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${currentAuthToken}`,
          },
        });
        
        if (!response.ok) {
          console.warn('Failed to delete event from database');
          // Optionally reload events to sync with database
          loadEventsFromDatabase();
        } else {
          // After deletion, recheck sync status with new count
          const newEventCount = events.length - 1;
          checkSyncStatus(currentAuthToken, newEventCount);
        }
      } catch (err) {
        console.warn('Error deleting event from database:', err);
        // Optionally reload events to sync with database
        loadEventsFromDatabase();
      }
    }
  }, [events.length, loadEventsFromDatabase, checkSyncStatus]);

  const updateEvent = useCallback(async (eventId, updatedData) => {
    const currentAuthToken = localStorage.getItem('auth_token');
    
    // Update UI immediately for better UX
    setEvents(prevEvents => 
      prevEvents.map(event => 
        event.id === eventId ? { ...event, ...updatedData } : event
      )
    );
    
    // Try to update in database
    if (currentAuthToken) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/user/events/${eventId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${currentAuthToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedData),
        });
        
        if (!response.ok) {
          console.warn('Failed to update event in database');
          // Optionally reload events to sync with database
          loadEventsFromDatabase();
        }
      } catch (err) {
        console.warn('Error updating event in database:', err);
        // Optionally reload events to sync with database
        loadEventsFromDatabase();
      }
    }
  }, [loadEventsFromDatabase]);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setAllEventsImported(false);
  }, []);

  const refreshEvents = useCallback(() => {
    loadEventsFromDatabase();
  }, [loadEventsFromDatabase]);

  // Helper functions
  const formatDate = (dateString) => {
    if (!dateString) return 'No date set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getEventStatus = (startDate, endDate) => {
    if (!startDate) return 'upcoming';
    
    const now = new Date();
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;
    
    if (end && now > end) {
      return 'past';
    } else if (now >= start && (!end || now <= end)) {
      return 'ongoing';
    } else {
      return 'upcoming';
    }
  };

  const value = {
    events,
    loading,
    error,
    allEventsImported,
    addEvent,
    removeEvent,
    updateEvent,
    clearEvents,
    refreshEvents,
    refreshEventsAfterLogin,
    markAllEventsImported,
    needsImport,
    loadEventsFromDatabase,
  };

  return (
    <EventsContext.Provider value={value}>
      {children}
    </EventsContext.Provider>
  );
};