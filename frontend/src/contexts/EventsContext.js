import React, { createContext, useContext, useState } from 'react';

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

  const addEvent = (event) => {
    const formattedEvent = {
      id: event.api_id,
      name: event.name,
      date: formatDate(event.start_at),
      location: event.timezone || 'Online',
      status: getEventStatus(event.start_at, event.end_at),
      originalData: event, // Keep original Luma data
    };
    
    setEvents(prevEvents => [...prevEvents, formattedEvent]);
  };

  const removeEvent = (eventId) => {
    setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
  };

  const updateEvent = (eventId, updatedData) => {
    setEvents(prevEvents => 
      prevEvents.map(event => 
        event.id === eventId ? { ...event, ...updatedData } : event
      )
    );
  };

  const clearEvents = () => {
    setEvents([]);
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
    addEvent,
    removeEvent,
    updateEvent,
    clearEvents,
  };

  return (
    <EventsContext.Provider value={value}>
      {children}
    </EventsContext.Provider>
  );
};