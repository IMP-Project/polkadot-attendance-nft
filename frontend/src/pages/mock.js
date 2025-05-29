// Updated Admin.js with responsive sidebar drawer
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, ListItemButton, ListItemIcon, ListItemText, Typography,
  Divider, IconButton, Button, Drawer, AppBar, Toolbar
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { api } from '../services/api';
import EventsPage from '../pages/EventsPage';
import NFTDesignPage from '../pages/NFTDesignPage';
import Gallery from '../pages/Gallery';
import MockCheckInSimulator from '../components/admin/MockCheckInSimulator';
import ConnectToLumaModal from '../components/ui/ConnectToLumaModal';

const drawerWidth = 272;

const Dashboard = ({ onCreateEvent }) => (
  <Box
    sx={{
      minHeight: '100vh',
      backgroundColor: 'white',
      display: 'flex',
      flexDirection: 'column',
    }}
  >
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
        <Typography sx={{ fontFamily: 'Manrope, sans-serif', fontWeight: 500, fontSize: '20px', color: '#18171C', mb: 0.5 }}>Dashboard</Typography>
        <Typography sx={{ fontFamily: 'Manrope, sans-serif', fontWeight: 400, fontSize: '14px', color: '#77738C' }}>Your personalized overview</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <Box component="img" src="/images/search-icon.png" alt="Search" sx={{ width: 20, height: 20, cursor: 'pointer' }} />
        <Box component="img" src="/images/bell-icon.png" alt="Notifications" sx={{ width: 20, height: 20, cursor: 'pointer' }} />
        <Button
          onClick={onCreateEvent}
          sx={{ backgroundColor: '#FF2670', color: 'white', borderRadius: '8px', padding: '12px', textTransform: 'none', fontFamily: 'Manrope, sans-serif', fontWeight: 500, fontSize: '14px', display: 'flex', alignItems: 'center', gap: 1, '&:hover': { backgroundColor: '#E91E63' } }}
        >
          <Box sx={{ width: 7 }} />
          <Box component="img" src="/images/plus-icon.png" alt="Create" sx={{ width: 16, height: 16 }} />
          Connect to Luma
          <Box sx={{ width: 13 }} />
        </Button>
      </Box>
    </Box>

    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', px: 4 }}>
      <Box sx={{ textAlign: 'center', maxWidth: '600px' }}>
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
          <Box component="img" src="/images/calender-icon.png" alt="Calendar" sx={{ width: 120, height: 120 }} />
        </Box>
        <Typography sx={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 400, fontSize: '39px', textAlign: 'center', color: '#18171C', mb: 3 }}>
          Ready to make your mark on the chain?
        </Typography>
        <Typography sx={{ fontFamily: 'Manrope, sans-serif', fontWeight: 400, fontSize: '18px', textAlign: 'center', color: '#484554', mb: 4, maxWidth: '500px', mx: 'auto' }}>
          Create your first event and start minting on-chain attendance NFTs — scan, check-in, and reward your attendees the Web3 way.
        </Typography>
        <Button
          onClick={onCreateEvent}
          sx={{ backgroundColor: '#FF2670', color: 'white', borderRadius: '8px', padding: '12px 24px', textTransform: 'none', fontFamily: 'Manrope, sans-serif', fontWeight: 500, fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: 1, boxShadow: '0 4px 12px rgba(255, 38, 112, 0.3)', transition: 'all 0.2s ease', '&:hover': { backgroundColor: '#E91E63', transform: 'translateY(-2px)', boxShadow: '0 6px 20px rgba(255, 38, 112, 0.4)' } }}
        >
          <Box component="img" src="/images/plus-icon.png" alt="Create" sx={{ width: 16, height: 16 }} />
          Connect to luma
        </Button>
      </Box>
    </Box>
  </Box>
);

function Admin() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [events, setEvents] = useState([]);
  const [nfts, setNFTs] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [connectToLumaModalOpen, setConnectToLumaModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [eventsData, nftsData] = await Promise.all([api.getEvents(), api.getNFTs()]);
      setEvents(eventsData);
      setNFTs(nftsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, []);

  useEffect(() => {
    fetchData();
    window.addEventListener('nft_minted', fetchData);
    return () => window.removeEventListener('nft_minted', fetchData);
  }, [fetchData]);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '/images/dashboard-icon.png' },
    { id: 'events', label: 'Events', icon: '/images/events-icon.png' },
    { id: 'nft-design', label: 'NFT Design', icon: '/images/nft-icon.png' },
    { id: 'nft-gallery', label: 'NFT Gallery', icon: '/images/gallery-icon.png' },
    { id: 'check-ins', label: 'Check-ins', icon: '/images/check-ins-icon.png' },
  ];

  const drawer = (
    <Box sx={{ width: drawerWidth, p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Box component="img" src="/images/pol-logo.png" alt="Polkadot" sx={{ width: 24, height: 24, mr: 2 }} />
        <Typography sx={{ fontFamily: 'Manrope, sans-serif', fontWeight: 500, fontSize: '14px', color: '#18171C' }}>
          Polkadot Attendance Sys
        </Typography>
      </Box>
      <Divider sx={{ my: 2 }} />
      {menuItems.map((item) => (
        <ListItemButton key={item.id} onClick={() => { setCurrentPage(item.id); setMobileOpen(false); }}>
          <ListItemIcon><Box component="img" src={item.icon} alt={item.label} sx={{ width: 20, height: 20 }} /></ListItemIcon>
          <ListItemText primary={item.label} primaryTypographyProps={{ fontFamily: 'Manrope, sans-serif', fontSize: '14px', fontWeight: 500, color: '#18171C' }} />
        </ListItemButton>
      ))}
    </Box>
  );

  const renderPageContent = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard onCreateEvent={() => setConnectToLumaModalOpen(true)} />;
      case 'events': return <EventsPage onConnectToLuma={() => setConnectToLumaModalOpen(true)} />;
      case 'nft-design': return <NFTDesignPage nfts={nfts} events={events} />;
      case 'nft-gallery': return <Gallery />;
      case 'check-ins': return <MockCheckInSimulator onNFTMinted={fetchData} />;
      default: return <Dashboard onCreateEvent={() => setConnectToLumaModalOpen(true)} />;
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar for mobile */}
      <AppBar position="fixed" sx={{ display: { xs: 'block', md: 'none' }, backgroundColor: '#fff', color: '#000' }}>
        <Toolbar>
          <IconButton edge="start" onClick={() => setMobileOpen(!mobileOpen)}>
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Drawer for mobile */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: drawerWidth } }}
      >
        {drawer}
      </Drawer>

      {/* Sidebar for desktop */}
      <Box
        sx={{
          display: { xs: 'none', md: 'block' },
          width: drawerWidth,
          flexShrink: 0,
        }}
      >
        {drawer}
      </Box>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, mt: { xs: 8, md: 0 } }}>
        {renderPageContent()}
      </Box>

      <ConnectToLumaModal open={connectToLumaModalOpen} onClose={() => setConnectToLumaModalOpen(false)} />
    </Box>
  );
}

export default Admin;
