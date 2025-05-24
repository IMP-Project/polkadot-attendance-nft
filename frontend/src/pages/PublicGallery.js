import React, { useState, useEffect } from 'react';
import { Box, Container, CircularProgress, Typography, useTheme } from '@mui/material';
import { useParams } from 'react-router-dom';
import PublicNFTGallery from '../components/layout/PublicNFTGallery';
import { api } from '../services/api';

function PublicGallery() {
  const { eventId } = useParams();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [error, setError] = useState(null);
  const [nfts, setNfts] = useState([]);
  
  useEffect(() => {
    const fetchEventData = async () => {
      if (!eventId) return;
      
      setLoading(true);
      try {
        const eventData = await api.getEvent(eventId);
        setEvent(eventData);
        
        // Fetch NFTs for this event
        const nftsData = await api.getNFTsByEvent(eventId);
        setNfts(nftsData);
      } catch (error) {
        console.error('Error fetching event:', error);
        setError('Event not found or unable to load data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchEventData();
  }, [eventId]);
  
  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          backgroundColor: theme.palette.background.default
        }}
      >
        <CircularProgress color="primary" />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          backgroundColor: theme.palette.background.default
        }}
      >
        <Typography variant="h6" color="error" align="center">
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default,
        py: 4
      }}
    >
      <Container maxWidth="lg">
        <PublicNFTGallery 
          eventId={eventId} 
          showTitle={true}
          limit={12}
          showPoweredBy={true}
          variant="grid"
        />
      </Container>
    </Box>
  );
}

export default PublicGallery; 