import React, { createContext, useContext, useState, useEffect } from 'react';

const EventsContext = createContext();

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

  // Load events from database when component mounts OR when auth token changes
  useEffect(() => {
    loadEventsFromDatabase();
  }, []);

  // Check sync status when events change
  useEffect(() => {
    if (events.length > 0) {
      const authToken = localStorage.getItem('auth_token');
      if (authToken) {
        checkSyncStatus(authToken, events.length);
      }
    }
  }, [events]);

  // NEW: Listen for auth token changes (login/logout)
  useEffect(() => {
    const checkAuthAndLoadEvents = () => {
      const authToken = localStorage.getItem('auth_token');
      if (authToken) {
        console.log('Auth token detected, loading events...');
        loadEventsFromDatabase();
      } else {
        console.log('No auth token, clearing events');
        setEvents([]);
        setAllEventsImported(false);
        setLoading(false);
      }
    };

    // Check immediately
    checkAuthAndLoadEvents();

    // Set up interval to check for auth changes every 2 seconds
    const authCheckInterval = setInterval(checkAuthAndLoadEvents, 2000);

    return () => clearInterval(authCheckInterval);
  }, []);

  const loadEventsFromDatabase = async () => {
    const authToken = localStorage.getItem('auth_token');
    
    // Skip loading if user is not authenticated
    if (!authToken) {
      setEvents([]);
      setAllEventsImported(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('https://polkadot-attendance-nft-api-bpa5.onrender.com/api/user/events', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Loaded events from database:', data);
        
        // Transform database events to match UI format
        const formattedEvents = (Array.isArray(data) ? data : []).map(event => ({
          id: event.api_id || event.id || 'unknown',
          name: event.name || 'Untitled Event',
          date: formatDate(event.date || event.start_at),
          location: event.location || event.timezone || 'Online',
          status: getEventStatus(event.date || event.start_at, event.end_at),
          originalData: event, // Keep original database data
        }));
        
        setEvents(formattedEvents);
        console.log(`✅ Loaded ${formattedEvents.length} events after login`);

        // Check sync status after loading events
        // Pass the event count directly since state update is async
        checkSyncStatus(authToken, formattedEvents.length);
      } else {
        console.warn('Failed to load events from database:', response.status);
        // Don't set error for 401/403 as user might not be logged in
        if (response.status !== 401 && response.status !== 403) {
          setError('Failed to load events');
        }
      }
    } catch (err) {
      console.warn('Error loading events from database:', err);
      setError('Error loading events');
    } finally {
      setLoading(false);
    }
  };

  // NEW: Check if all Luma events are imported
  const checkSyncStatus = async (authToken, currentEventCount) => {
    try {
      // Get saved API key
      const apiKeyResponse = await fetch('https://polkadot-attendance-nft-api-bpa5.onrender.com/api/user/luma-api-key', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (apiKeyResponse.ok) {
        const apiKeyData = await apiKeyResponse.json();
        const lumaApiKey = apiKeyData.api_key;

        if (lumaApiKey) {
          // Get Luma events count
          const lumaResponse = await fetch('https://polkadot-attendance-nft-api-bpa5.onrender.com/api/list-luma-events', {
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
  };

  // NEW: Function to manually trigger event loading (call this after successful login)
  const refreshEventsAfterLogin = () => {
    console.log('🔄 Refreshing events after login...');
    loadEventsFromDatabase();
  };

  // NEW: Function to mark all events as imported (call after successful bulk import)
  const markAllEventsImported = async () => {
    console.log('✅ Marking all events as imported');
    setAllEventsImported(true);
    
    // Also trigger a sync check to ensure accuracy
    const authToken = localStorage.getItem('auth_token');
    if (authToken) {
      setTimeout(() => {
        checkSyncStatus(authToken, events.length);
      }, 1000);
    }
  };

  // NEW: Function to check if import is needed
  const needsImport = () => {
    return !allEventsImported;
  };

  const addEvent = (event) => {
    const formattedEvent = {
      id: event.api_id || event.id || 'unknown',
      name: event.name || 'Untitled Event',
      date: formatDate(event.start_at || event.date),
      location: event.location || event.timezone || 'Online',
      status: getEventStatus(event.start_at || event.date, event.end_at),
      originalData: event, // Keep original data
    };
    
    setEvents(prevEvents => [...prevEvents, formattedEvent]);
  };

  const removeEvent = async (eventId) => {
    const authToken = localStorage.getItem('auth_token');
    
    // Remove from UI immediately for better UX
    setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
    
    // Try to delete from database
    if (authToken) {
      try {
        const response = await fetch(`https://polkadot-attendance-nft-api-bpa5.onrender.com/api/user/events/${eventId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        });
        
        if (!response.ok) {
          console.warn('Failed to delete event from database');
          // Optionally reload events to sync with database
          loadEventsFromDatabase();
        } else {
          // After deletion, recheck sync status with new count
          const newEventCount = events.length - 1;
          checkSyncStatus(authToken, newEventCount);
        }
      } catch (err) {
        console.warn('Error deleting event from database:', err);
        // Optionally reload events to sync with database
        loadEventsFromDatabase();
      }
    }
  };

  const updateEvent = async (eventId, updatedData) => {
    const authToken = localStorage.getItem('auth_token');
    
    // Update UI immediately for better UX
    setEvents(prevEvents => 
      prevEvents.map(event => 
        event.id === eventId ? { ...event, ...updatedData } : event
      )
    );
    
    // Try to update in database
    if (authToken) {
      try {
        const response = await fetch(`https://polkadot-attendance-nft-api-bpa5.onrender.com/api/user/events/${eventId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${authToken}`,
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
  };

  const clearEvents = () => {
    setEvents([]);
    setAllEventsImported(false);
  };

  const refreshEvents = () => {
    loadEventsFromDatabase();
  };

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
    allEventsImported, // NEW: Expose sync status
    addEvent,
    removeEvent,
    updateEvent,
    clearEvents,
    refreshEvents,
    refreshEventsAfterLogin,
    markAllEventsImported, // NEW: Function to mark as imported
    needsImport, // NEW: Function to check if import needed
    loadEventsFromDatabase, // Expose for manual refresh
  };

  return (
    <EventsContext.Provider value={value}>
      {children}
    </EventsContext.Provider>
  );
};