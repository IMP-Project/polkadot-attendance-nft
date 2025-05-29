import React, { useState, useEffect, useCallback } from 'react';
import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Divider, Dialog, AppBar, Toolbar, IconButton, Button } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { Close } from '@mui/icons-material';
import EventList from '../components/ui/EventList';
import NFTList from '../components/ui/NFTList';
import MockCheckInSimulator from '../components/admin/MockCheckInSimulator';
import { api } from '../services/api';
import ConnectToLumaModal from '../components/ui/ConnectToLumaModal';
import EventsPage from '../pages/EventsPage';
import NFTDesignPage from '../pages/NFTDesignPage'; 
import Gallery from '../pages/Gallery';

// Dashboard component matching Image 2 exactly
const Dashboard = ({ onCreateEvent }) => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Bar */}
      <Box
        sx={{
          px: 4,
          py: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <Box>
          <Typography
            sx={{
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 500,
              fontSize: '20px',
              lineHeight: '33.6px',
              color: '#18171C',
              mb: 0.5,
            }}
          >
            Dashboard
          </Typography>
          <Typography
            sx={{
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 400,
              fontSize: '14px',
              lineHeight: '19.6px',
              letterSpacing: '1.4%',
              color: '#77738C',
            }}
          >
            Your personalized overview
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {/* Search icon */}
          <Box
            component="img"
            src="/images/search-icon.png"
            alt="Search"
            sx={{ width: 20, height: 20, cursor: 'pointer' }}
          />
          
          {/* Bell icon */}
          <Box
            component="img"
            src="/images/bell-icon.png"
            alt="Notifications"
            sx={{ width: 20, height: 20, cursor: 'pointer' }}
          />
                   

<Button
  onClick={onCreateEvent}
  sx={{
    backgroundColor: '#FF2670',
    color: 'white',
    borderRadius: '8px',
    padding: '12px',
    textTransform: 'none',
    fontFamily: 'Manrope, sans-serif',
    fontWeight: 500,
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    '&:hover': {
      backgroundColor: '#E91E63',
    },
  }}
>
    <Box sx={{ width: 7 }} /> 
    <Box
      component="img"
      src="/images/plus-icon.png"
      alt="Create"
      sx={{ width: 16, height: 16 }}
    />
    Connect to Luma
    <Box sx={{ width: 13 }} /> 
  </Button>

        </Box>
      </Box>

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 4,
        }}
      >
        <Box
          sx={{
            textAlign: 'center',
            maxWidth: '600px',
          }}
        >
          {/* Calendar Image */}
          <Box
            sx={{
              mb: 4,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <Box
              component="img"
              src="/images/calender-icon.png"
              alt="Calendar"
              sx={{
                width: 120,
                height: 120,
              }}
            />
          </Box>

          {/* Main Heading */}
          <Typography
            sx={{
              fontFamily: 'Unbounded, sans-serif',
              fontWeight: 400,
              fontSize: '39px',
              lineHeight: '114.9%',
              letterSpacing: '0%',
              textAlign: 'center',
              color: '#18171C',
              mb: 3,
            }}
          >
            Ready to make your mark on the chain?
          </Typography>

          {/* Description */}
          <Typography
            sx={{
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 400,
              fontSize: '18px',
              lineHeight: '24px',
              letterSpacing: '0.9%',
              textAlign: 'center',
              color: '#484554',
              mb: 4,
              maxWidth: '500px',
              mx: 'auto',
            }}
          >
            Create your first event and start minting on-chain attendance NFTs — scan, check-in, and reward your attendees the Web3 way.
          </Typography>

          {/* Create Event Button */}
          <Button
            onClick={onCreateEvent}
            sx={{
              backgroundColor: '#FF2670',
              color: 'white',
              borderRadius: '8px',
              padding: '12px 24px',
              textTransform: 'none',
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 500,
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              boxShadow: '0 4px 12px rgba(255, 38, 112, 0.3)',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: '#E91E63',
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 20px rgba(255, 38, 112, 0.4)',
              },
            }}
          >
            <Box
              component="img"
              src="/images/plus-icon.png"
              alt="Create"
              sx={{ width: 16, height: 16 }}
            />
            Connect to luma
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

// Main Admin Component
function Admin() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [events, setEvents] = useState([]);
  const [nfts, setNFTs] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectToLumaModalOpen, setConnectToLumaModalOpen] = useState(false);

  // Sidebar menu items
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '/images/dashboard-icon.png' },
    { id: 'events', label: 'Events', icon: '/images/events-icon.png' },
    { id: 'nft-design', label: 'NFT Design', icon: '/images/nft-icon.png' },
     { id: 'nft-gallery', label: 'NFT Gallery', icon: '/images/gallery-icon.png' },
    { id: 'check-ins', label: 'Check-ins', icon: '/images/check-ins-icon.png' },
  ];

  const bottomMenuItems = [
    { id: 'settings', label: 'Settings', icon: '/images/settings-icon.png' },
    { id: 'Log out', label: 'Log out', icon: '/images/Logout-icon.png' },
  ];

  // Function to fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [eventsData, nftsData] = await Promise.all([
        api.getEvents(),
        api.getNFTs()
      ]);
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
    window.addEventListener('nft_minted', fetchData);
    return () => {
      window.removeEventListener('nft_minted', fetchData);
    };
  }, [fetchData]);
  
  const handleNFTMinted = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const renderPageContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onCreateEvent={() => setConnectToLumaModalOpen(true)} />;
      case 'events':
  return <EventsPage onConnectToLuma={() => setConnectToLumaModalOpen(true)} />;
      case 'nft-design':
  return <NFTDesignPage nfts={nfts} events={events} />;
  case 'nft-gallery':
  return <Gallery />;
      case 'check-ins':
        return (
          <Box sx={{ p: 3, backgroundColor: 'white', minHeight: '100vh' }}>
            <Typography variant="h5" sx={{ mb: 3, color: '#18171C', fontWeight: 600 }}>
              Check-in Management
            </Typography>
            <MockCheckInSimulator onNFTMinted={handleNFTMinted} />
          </Box>
        );
      default:
        return <Dashboard onCreateEvent={() => setConnectToLumaModalOpen(true)} />;
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Box
        sx={{
          width: '272px',
          maxWidth: '272px',
          height: '100vh',
          backgroundColor: '#FAFAFA',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Logo Section */}
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Box
              component="img"
              src="/images/pol-logo.png"
              alt="Polkadot"
              sx={{ width: 24, height: 24, mr: 2 }}
            />
            <Typography
              sx={{
                width: '172px',
                height: '20px',
                fontFamily: 'Manrope, sans-serif',
                fontWeight: 500,
                fontSize: '14px',
                lineHeight: '20px',
                letterSpacing: '0.6%',
                color: '#18171C',
              }}
            >
              Polkadot Attendance Sys
            </Typography>
          </Box>
          <Typography
            sx={{
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 400,
              fontSize: '12px',
              lineHeight: '16.8px',
              letterSpacing: '2%',
              color: '#77738C',
            }}
          >
            Management
          </Typography>
        </Box>

        {/* Divider */}
        <Divider sx={{ mx: 3, borderColor: '#E5E5E5' }} />

        {/* Main Menu */}
        <Box sx={{ px: 3, py: 2, flex: 1 }}>
          <Typography
            sx={{
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 500,
              fontSize: '12px',
              lineHeight: '16px',
              letterSpacing: '4%',
              textTransform: 'uppercase',
              color: '#928FA3',
              mb: 2,
            }}
          >
            MAIN
          </Typography>
          
          <Box
            sx={{
              width: '232px',
              height: '374px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            {menuItems.map((item) => (
              <ListItemButton
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                selected={currentPage === item.id}
                sx={{
                  borderRadius: '8px',
                  padding: '12px 16px',
                  backgroundColor: currentPage === item.id ? '#FFEBF1' : 'transparent',
                  '&:hover': {
                    backgroundColor: currentPage === item.id ? '#FFEBF1' : 'rgba(0, 0, 0, 0.04)',
                  },
                  '&.Mui-selected': {
                    backgroundColor: '#FFEBF1',
                    '&:hover': {
                      backgroundColor: '#FFEBF1',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 32, mr: 1 }}>
                  <Box
                    component="img"
                    src={item.icon}
                    alt={item.label}
                    sx={{ width: 20, height: 20 }}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontFamily: 'Manrope, sans-serif',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#18171C',
                  }}
                />
              </ListItemButton>
            ))}
          </Box>
        </Box>

        {/* Bottom Menu */}
        <Box sx={{ px: 3, pb: 3 }}>
          {bottomMenuItems.map((item) => (
            <ListItemButton
              key={item.id}
              onClick={item.id === 'Log out' ? () => {
                api.logout();
                  window.location.href = '/';
                  } : undefined}
              sx={{
                borderRadius: '8px',
                padding: '12px 16px',
                mb: 1,
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 32, mr: 1 }}>
                <Box
                  component="img"
                  src={item.icon}
                  alt={item.label}
                  sx={{ width: 20, height: 20 }}
                />
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontFamily: 'Manrope, sans-serif',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#18171C',
                }}
              />
            </ListItemButton>
          ))}
        </Box>
      </Box>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1 }}>
        {renderPageContent()}
      </Box>

      {/* Connect to Luma Modal */}
      <ConnectToLumaModal 
        open={connectToLumaModalOpen}
        onClose={() => setConnectToLumaModalOpen(false)}
      />
     
    </Box>
  );
}

export default Admin;