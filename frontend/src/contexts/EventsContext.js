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

  // Load events from database when component mounts
  useEffect(() => {
    loadEventsFromDatabase();
  }, []);

  const loadEventsFromDatabase = async () => {
    const authToken = localStorage.getItem('auth_token');
    
    // Skip loading if user is not authenticated
    if (!authToken) {
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
          id: event.api_id || event.id,
          name: event.name,
          date: formatDate(event.date || event.start_at),
          location: event.location || event.timezone || 'Online',
          status: getEventStatus(event.date || event.start_at, event.end_at),
          originalData: event, // Keep original database data
        }));
        
        setEvents(formattedEvents);
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

  const addEvent = (event) => {
    const formattedEvent = {
      id: event.api_id || event.id,
      name: event.name,
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
    addEvent,
    removeEvent,
    updateEvent,
    clearEvents,
    refreshEvents,
    loadEventsFromDatabase, // Expose for manual refresh
  };

  return (
    <EventsContext.Provider value={value}>
      {children}
    </EventsContext.Provider>
  );
};