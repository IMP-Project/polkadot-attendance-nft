// Updated Admin.js with close icon in drawer and fixed spacing below AppBar
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Divider, IconButton, Button, Drawer, AppBar, Toolbar, ListItemButton, ListItemIcon, ListItemText
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import EventsPage from '../pages/EventsPage';
import NFTDesignPage from '../pages/NFTDesignPage';
import Gallery from '../pages/Gallery';
import MockCheckInSimulator from '../components/admin/MockCheckInSimulator';
import { api } from '../services/api';
import ConnectToLumaModal from '../components/ui/ConnectToLumaModal';

const drawerWidth = 272;

const Dashboard = ({ onCreateEvent }) => (
  <Box sx={{ minHeight: '100vh', backgroundColor: 'white', display: 'flex', flexDirection: 'column', pt: { xs: 7, md: 0 } }}>
    <Box
  sx={{
    px: { xs: 2, md: 4 },
    pb: 3,
    mt: { xs: 0, md: 3 }, // 👈 This is the update: adds top margin on desktop
    display: { xs: 'block', md: 'flex' }, 
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
  }}
>


  {/* Title + Subtitle */}
  <Box>
    <Typography sx={{ fontFamily: 'Manrope, sans-serif', fontWeight: 500, fontSize: '20px', color: '#18171C', mb: 0.5 }}>
      Dashboard
    </Typography>
    <Typography sx={{ fontFamily: 'Manrope, sans-serif', fontWeight: 400, fontSize: '14px', color: '#77738C' }}>
      Your personalized overview
    </Typography>
  </Box>

  {/* Action Icons + Button */}
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      position: { xs: 'absolute', sm: 'static' },
      top: 0,
      right: 16,
      mt: { xs: 1, sm: 0 },
    }}
  >
    <Box component="img" src="/images/search-icon.png" alt="Search" sx={{ width: 20, height: 20, cursor: 'pointer' }} />
    <Box component="img" src="/images/bell-icon.png" alt="Notifications" sx={{ width: 20, height: 20, cursor: 'pointer' }} />
    <Button
      onClick={onCreateEvent}
      sx={{
        backgroundColor: '#FF2670',
        color: 'white',
        borderRadius: '8px',
        padding: {
  xs: '6px 10px',             // mobile: keep as-is
  sm: '10px 20px 10px 16px',  // desktop: top-right-bottom-left (adds extra right space)
},

        fontSize: { xs: '12px', sm: '14px' },
        minWidth: 'auto',
        textTransform: 'none',
        fontFamily: 'Manrope, sans-serif',
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        '&:hover': { backgroundColor: '#E91E63' },
      }}
    >
      <Box component="img" src="/images/plus-icon.png" alt="Create" sx={{ width: 14, height: 14 }} />
      <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
        Connect to Luma
      </Box>
    </Button>
  </Box>
</Box>


    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', px: { xs: 2, md: 4 }, width: '100%' }}>
      <Box sx={{ textAlign: 'center', maxWidth: '600px', width: '100%' }}>
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
          <Box component="img" src="/images/calender-icon.png" alt="Calendar" sx={{ width: 120, height: 120 }} />
        </Box>
        <Typography
  sx={{
    fontFamily: 'Unbounded, sans-serif',
    fontWeight: 400,
    fontSize: { xs: '24px', md: '39px' }, // 👈 make responsive
    textAlign: 'center',
    color: '#18171C',
    mb: 3,
  }}
>

          Ready to make your mark on the chain?
        </Typography>
        <Typography
  sx={{
    fontFamily: 'Manrope, sans-serif',
    fontWeight: 400,
    fontSize: { xs: '16px', md: '18px' },
    textAlign: 'center',
    color: '#484554',
    mb: 4,
    maxWidth: '500px',
    mx: 'auto',
  }}
>

          Create your first event and start minting on-chain attendance NFTs — scan, check-in, and reward your attendees the Web3 way.
        </Typography>
        <Button
  onClick={onCreateEvent}
  sx={{
    backgroundColor: '#FF2670',
    color: 'white',
    borderRadius: '8px',
    padding: '12px 20px 12px 16px',
    textTransform: 'none',
    fontFamily: 'Manrope, sans-serif',
    fontWeight: 500,
    fontSize: '14px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 1,
    width: 'fit-content', // ⬅️ prevents stretching full width
    mx: 'auto', // ⬅️ centers the button on small screens
    boxShadow: '0 4px 12px rgba(255, 38, 112, 0.3)',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: '#E91E63',
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px rgba(255, 38, 112, 0.4)',
    },
  }}
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
    <Box
  sx={{
    width: drawerWidth,
    height: '100vh',
    backgroundColor: '#FAFAFA',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden', // 👈 Add this line
  }}
>

      {/* Close icon for mobile drawer */}
      <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'flex-start', p: 2 }}>
  <IconButton onClick={() => setMobileOpen(false)}>
    <CloseIcon />
  </IconButton>
</Box>

      <Box sx={{ p: 3, pt: { xs: 0, md: 4 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box component="img" src="/images/pol-logo.png" alt="Polkadot" sx={{ width: 24, height: 24, mr: 2 }} />
          <Typography sx={{ fontFamily: 'Manrope, sans-serif', fontWeight: 500, fontSize: '14px', color: '#18171C' }}>
            Polkadot Attendance Sys
          </Typography>
        </Box>
        <Typography sx={{ fontFamily: 'Manrope, sans-serif', fontWeight: 400, fontSize: '12px', color: '#77738C' }}>
          Management
        </Typography>
      </Box>
      <Divider sx={{ mx: 3, borderColor: '#E5E5E5' }} />
      <Box sx={{ px: 3, py: 2, flex: 1 }}>
        <Typography sx={{ fontFamily: 'Manrope, sans-serif', fontWeight: 500, fontSize: '12px', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#928FA3', mb: 2 }}>
          MAIN
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {menuItems.map((item) => (
            <ListItemButton
              key={item.id}
              onClick={() => {
                setCurrentPage(item.id);
                setMobileOpen(false);
              }}
              selected={currentPage === item.id}
              sx={{ borderRadius: '8px', padding: '12px 16px', backgroundColor: currentPage === item.id ? '#FFEBF1' : 'transparent', '&:hover': { backgroundColor: currentPage === item.id ? '#FFEBF1' : 'rgba(0, 0, 0, 0.04)' }, '&.Mui-selected': { backgroundColor: '#FFEBF1' } }}
            >
              <ListItemIcon sx={{ minWidth: 32, mr: 1 }}>
                <Box component="img" src={item.icon} alt={item.label} sx={{ width: 20, height: 20 }} />
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontFamily: 'Manrope, sans-serif', fontSize: '14px', fontWeight: 500, color: '#18171C' }}
              />
            </ListItemButton>
          ))}
        </Box>
      </Box>
      <Box sx={{ px: 3, pb: 3 }}>
        {[{ id: 'settings', label: 'Settings', icon: '/images/settings-icon.png' }, { id: 'Log out', label: 'Log out', icon: '/images/Logout-icon.png' }].map((item) => (
          <ListItemButton
            key={item.id}
            onClick={item.id === 'Log out' ? () => { api.logout(); window.location.href = '/'; } : undefined}
            sx={{ borderRadius: '8px', padding: '12px 16px', mb: 1, '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }}
          >
            <ListItemIcon sx={{ minWidth: 32, mr: 1 }}>
              <Box component="img" src={item.icon} alt={item.label} sx={{ width: 20, height: 20 }} />
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{ fontFamily: 'Manrope, sans-serif', fontSize: '14px', fontWeight: 500, color: '#18171C' }}
            />
          </ListItemButton>
        ))}
      </Box>
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
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
  position="fixed"
  elevation={0}
  sx={{
    display: { xs: 'block', md: 'none' },
    backgroundColor: '#fff',
    color: '#000',
    boxShadow: 'none', // 👈 removes default shadow
    height: '48px',     // 👈 consistent height
    justifyContent: 'center'
  }}
>
  <Toolbar sx={{ minHeight: '48px', px: 1 }}>  {/* 👈 resets internal padding */}
    <IconButton edge="start" onClick={() => setMobileOpen(!mobileOpen)}>
      <MenuIcon />
    </IconButton>
  </Toolbar>
</AppBar>


      <Drawer
  variant="temporary"
  open={mobileOpen}
  onClose={() => setMobileOpen(false)}
  ModalProps={{ keepMounted: true }}
  sx={{
    display: { xs: 'block', md: 'none' },
    '& .MuiDrawer-paper': {
      width: drawerWidth,
      height: '100vh',
      position: 'fixed',
      overflow: 'hidden', // ensure no scroll inside the drawer
      display: 'flex',
      flexDirection: 'column', // maintain vertical stacking
    },
  }}
>



        {drawer}
      </Drawer>

      <Box sx={{ display: { xs: 'none', md: 'block' }, width: drawerWidth, flexShrink: 0 }}>
        {drawer}
      </Box>

      <Box component="main" sx={{ flexGrow: 1, mt: { xs: 0, md: 0 } }}>
        {renderPageContent()}
      </Box>

      <ConnectToLumaModal open={connectToLumaModalOpen} onClose={() => setConnectToLumaModalOpen(false)} />
    </Box>
  );
}

export default Admin;
