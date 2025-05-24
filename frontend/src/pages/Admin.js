import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import EventForm from '../components/ui/EventForm';
import EventList from '../components/ui/EventList';
import NFTList from '../components/ui/NFTList';
import MockCheckInSimulator from '../components/admin/MockCheckInSimulator';
import { api } from '../services/api';
import { 
  Box, Tabs, Tab, Typography, Paper, Divider, CircularProgress, 
  Alert, AlertTitle, Button, Grid, Card, CardContent, useTheme, Fade 
} from '@mui/material';
import { ArrowBack, EventNote, Style, QrCode2 } from '@mui/icons-material';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  const theme = useTheme();

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box 
          sx={{ 
            py: 3,
            animation: 'fadeIn 0.3s ease-in-out',
            '@keyframes fadeIn': {
              '0%': {
                opacity: 0,
                transform: 'translateY(10px)'
              },
              '100%': {
                opacity: 1,
                transform: 'translateY(0)'
              }
            }
          }}
        >
          {children}
        </Box>
      )}
    </div>
  );
}

function Admin() {
  const theme = useTheme();
  const [events, setEvents] = useState([]);
  const [nfts, setNFTs] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to fetch all data - made reusable so it can be called after NFT minting
  const fetchData = useCallback(async () => {
    setLoading(true);
    
    try {
      const [eventsData, nftsData] = await Promise.all([
        api.getEvents(),
        api.getNFTs()
      ]);
      
      // Process data
      setEvents(eventsData);
      setNFTs(nftsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Listen for NFT minting events
    window.addEventListener('nft_minted', fetchData);
    
    return () => {
      window.removeEventListener('nft_minted', fetchData);
    };
  }, [fetchData]);

  // Function to handle NFT minting from MockCheckInSimulator
  const handleNFTMinted = useCallback(() => {
    console.log('NFT minted, refreshing data...');
    fetchData();
  }, [fetchData]);

  const handleEventCreated = (newEvent) => {
    // Check if the event already exists in our state to prevent duplicates
    const eventExists = events.some(e => e.id === newEvent.id);
    if (!eventExists) {
      console.log('Adding new event to state:', newEvent.id);
      setEvents(prevEvents => [...prevEvents, newEvent]);
    } else {
      console.log('Event already exists in state, not adding duplicate:', newEvent.id);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        <AlertTitle>Error</AlertTitle>
        {error}
      </Alert>
    );
  }

  return (
    <Fade in={true} timeout={500}>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Button
            component={Link}
            to="/"
            variant="outlined"
            startIcon={<ArrowBack />}
            sx={{ borderRadius: 2 }}
          >
            Back to Home
          </Button>
        </Box>

        <Paper sx={{ 
          borderRadius: 2, 
          mb: 4,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          backgroundColor: theme.palette.mode === 'dark' 
            ? 'rgba(45, 45, 45, 0.85)' 
            : 'rgba(255, 255, 255, 0.85)',
          border: '1px solid rgba(229, 229, 229, 0.5)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
          overflow: 'hidden',
        }} elevation={2}>
          <Box sx={{ 
            borderBottom: 1, 
            borderColor: 'divider', 
            borderBottomWidth: '3px',
            px: 1
          }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange} 
              variant="fullWidth"
              textColor="primary"
              indicatorColor="primary"
              aria-label="admin tabs"
              TabIndicatorProps={{
                style: {
                  height: 3,
                  borderRadius: '3px 3px 0 0',
                  backgroundColor: theme.palette.primary.main,
                }
              }}
              sx={{
                '& .MuiTab-root': {
                  color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.7)',
                  opacity: 1,
                  py: 2.5,
                  minHeight: 64,
                  '&.Mui-selected': {
                    color: theme.palette.primary.main,
                    fontWeight: 'bold',
                  },
                  '& .MuiSvgIcon-root': {
                    fontSize: 22,
                    mr: 1,
                  },
                  textTransform: 'none',
                  fontSize: '0.95rem',
                },
                '& .MuiTabs-indicator': {
                  height: 3,
                  borderRadius: '2px 2px 0 0',
                },
              }}
            >
              <Tab 
                icon={<EventNote />} 
                label="Events" 
                iconPosition="start" 
                disableRipple
                sx={{ 
                  borderBottom: activeTab === 0 ? `3px solid ${theme.palette.primary.main}` : 'none',
                }} 
              />
              <Tab 
                icon={<Style />} 
                label="NFTs" 
                iconPosition="start"
                disableRipple
                sx={{ 
                  borderBottom: activeTab === 1 ? `3px solid ${theme.palette.primary.main}` : 'none',
                }}
              />
              <Tab 
                icon={<QrCode2 />} 
                label="Demo Tools" 
                iconPosition="start"
                disableRipple
                sx={{ 
                  borderBottom: activeTab === 2 ? `3px solid ${theme.palette.primary.main}` : 'none',
                }}
              />
            </Tabs>
          </Box>
        </Paper>

        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={4}>
            <Grid item xs={12}>
              <Card sx={{ 
                mb: 4, 
                borderRadius: 2,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                backgroundColor: theme.palette.mode === 'dark' 
                  ? 'rgba(30, 30, 30, 0.85)' 
                  : 'rgba(255, 255, 255, 0.85)',
                border: theme.palette.mode === 'dark'
                  ? '1px solid rgba(255, 255, 255, 0.05)'
                  : '1px solid rgba(0, 0, 0, 0.03)',
              }} elevation={2}>
                <CardContent sx={{ 
                  p: 3,
                  ...(theme.palette.mode === 'dark' && {
                    '& .MuiTypography-root.MuiTypography-h5': {
                      color: theme.palette.primary.light
                    }
                  })
                }}>
                  <Typography variant="h5" component="h2" gutterBottom color="primary">
                    Create New Event
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  <EventForm onEventCreated={handleEventCreated} />
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Card sx={{ 
                borderRadius: 2,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                backgroundColor: theme.palette.mode === 'dark' 
                  ? 'rgba(30, 30, 30, 0.85)' 
                  : 'rgba(255, 255, 255, 0.85)',
                border: theme.palette.mode === 'dark'
                  ? '1px solid rgba(255, 255, 255, 0.05)'
                  : '1px solid rgba(0, 0, 0, 0.03)',
              }} elevation={2}>
                <CardContent sx={{ 
                  p: 3,
                  ...(theme.palette.mode === 'dark' && {
                    '& .MuiTypography-root.MuiTypography-h5': {
                      color: theme.palette.primary.light
                    }
                  })
                }}>
                  <Typography variant="h5" component="h2" gutterBottom color="primary">
                    Manage Events
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  <EventList events={events} />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Card sx={{ 
            borderRadius: 2,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(30, 30, 30, 0.85)' 
              : 'rgba(255, 255, 255, 0.85)',
            border: theme.palette.mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.05)'
              : '1px solid rgba(0, 0, 0, 0.03)',
          }} elevation={2}>
            <CardContent sx={{ 
              p: 3,
              ...(theme.palette.mode === 'dark' && {
                '& .MuiTypography-root.MuiTypography-h5': {
                  color: theme.palette.primary.light
                }
              })
            }}>
              <Typography variant="h5" component="h2" gutterBottom color="primary">
                Issued NFTs
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <NFTList nfts={nfts} />
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Card sx={{ 
            borderRadius: 2,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(30, 30, 30, 0.85)' 
              : 'rgba(255, 255, 255, 0.85)',
            border: theme.palette.mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.05)'
              : '1px solid rgba(0, 0, 0, 0.03)',
          }} elevation={2}>
            <CardContent sx={{ 
              p: 3,
              ...(theme.palette.mode === 'dark' && {
                '& .MuiTypography-root.MuiTypography-h5': {
                  color: theme.palette.primary.light
                }
              })
            }}>
              <Typography variant="h5" component="h2" gutterBottom color="primary">
                Demonstration Tools
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Alert severity="info" sx={{ mb: 3 }}>
                <AlertTitle>Demo Mode Active</AlertTitle>
                The following tools simulate what would normally happen in a production environment with real Luma API integration.
                Since the application is currently running in demo mode (using mock data), you can use these tools to test the full workflow.
              </Alert>
              
              <MockCheckInSimulator onNFTMinted={handleNFTMinted} />

              <Button
                variant="contained"
                startIcon={<QrCode2 />}
                onClick={() => {/* Import functionality would go here */}}
                sx={{ 
                  mt: 3,
                  borderRadius: 2,
                  backgroundColor: theme.palette.mode === 'dark' ? '#E6007A' : '#8B00BF',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: theme.palette.mode === 'dark' ? '#D0006A' : '#7A00AF',
                  }
                }}
              >
                Import from Luma
              </Button>
            </CardContent>
          </Card>
        </TabPanel>
      </Box>
    </Fade>
  );
}

export default Admin;