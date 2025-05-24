import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Divider, Button,
  Grid, FormControl, InputLabel, Select, MenuItem,
  TextField, InputAdornment, Tabs, Tab, Paper, 
  useTheme
} from '@mui/material';
import { Link } from 'react-router-dom';
import {
  Event, Share, Search, ContentCopy
} from '@mui/icons-material';
import { api } from '../services/api';
import PublicNFTGallery from '../components/layout/PublicNFTGallery';

function Gallery() {
  const theme = useTheme();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [loading, setLoading] = useState(true);
  const [publicUrl, setPublicUrl] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [urlCopied, setUrlCopied] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const eventsData = await api.getEvents();
        setEvents(eventsData);
        
        if (eventsData.length > 0) {
          setSelectedEvent(eventsData[0].id);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
        setError('Failed to load events');
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvents();
  }, []);
  
  useEffect(() => {
    if (selectedEvent) {
      const baseUrl = window.location.origin;
      setPublicUrl(`${baseUrl}/public/gallery/${selectedEvent}`);
    }
  }, [selectedEvent]);
  
  const handleEventChange = (event) => {
    setSelectedEvent(event.target.value);
  };
  
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };
  
  const filteredEvents = events.filter(event => 
    event.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const selectedEventData = events.find(event => event.id === selectedEvent);

  return (
    <Box>
      <Card 
        sx={{ 
          mb: 4, 
          borderRadius: 2,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          backgroundColor: theme.palette.mode === 'dark' 
            ? 'rgba(30, 30, 30, 0.85)' 
            : 'rgba(255, 255, 255, 0.85)',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h5" component="h1" gutterBottom>
            NFT Gallery
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            View and share the NFTs from your events with a public gallery that can be embedded on your website.
          </Typography>
          
          <Divider sx={{ my: 2 }} />
          
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="event-select-label">Select Event</InputLabel>
                <Select
                  labelId="event-select-label"
                  id="event-select"
                  value={selectedEvent}
                  label="Select Event"
                  onChange={handleEventChange}
                  disabled={events.length === 0}
                >
                  {events.map((event) => (
                    <MenuItem key={event.id} value={event.id}>
                      {event.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                value={publicUrl}
                label="Public Gallery URL"
                variant="outlined"
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        startIcon={<ContentCopy />}
                        onClick={handleCopyUrl}
                        sx={{ borderRadius: 1 }}
                      >
                        {urlCopied ? 'Copied!' : 'Copy'}
                      </Button>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
          
          {selectedEvent && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<Share />}
                component={Link}
                to={`/public/gallery/${selectedEvent}`}
                target="_blank"
                sx={{ borderRadius: 2 }}
              >
                View Public Gallery
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
      
      <Paper 
        sx={{ 
          borderRadius: 2,
          overflow: 'hidden',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          backgroundColor: theme.palette.mode === 'dark' 
            ? 'rgba(30, 30, 30, 0.85)' 
            : 'rgba(255, 255, 255, 0.85)',
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Gallery Preview
          </Typography>
          
          <TextField
            placeholder="Search events..."
            size="small"
            value={searchTerm}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ width: 250 }}
          />
        </Box>
        
        <Divider />
        
        {selectedEventData && (
          <Box p={3}>
            <PublicNFTGallery
              eventId={selectedEvent}
              showTitle={true}
              limit={6}
              showPoweredBy={true}
              variant="grid"
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
}

export default Gallery; 