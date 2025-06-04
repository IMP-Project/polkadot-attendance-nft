// Updated Admin.js with close icon in drawer and fixed spacing below AppBar
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Divider, IconButton, Button, Drawer, AppBar, Toolbar, ListItemButton, ListItemIcon, ListItemText,
  Dialog, DialogTitle, DialogContent, TextField, InputAdornment, List, ListItem, Chip, Avatar
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import EventsPage from '../pages/EventsPage';
import NFTDesignPage from '../pages/NFTDesignPage';
import Gallery from '../pages/Gallery';
import MockCheckInSimulator from '../components/admin/MockCheckInSimulator';
import { api } from '../services/api';
import ConnectToLumaModal from '../components/ui/ConnectToLumaModal';
import DarkModeToggle from '../components/ui/DarkModeToggle';
import EventCheckInsPage from './EventCheckInsPage';
import SettingsPage from './SettingsPage';

const drawerWidth = 272;

const Dashboard = ({ onCreateEvent, mode, toggleDarkMode, onSearch }) => {
  // Generate a unique user ID based on wallet address
  const walletAddress = localStorage.getItem('wallet_address') || '';
  const userID = walletAddress ? `User-${walletAddress.slice(-4).toUpperCase()}` : 'User-ANON';
  
  return (
    <Box sx={{ 
      minHeight: '100vh', 
      backgroundColor: (theme) => theme.palette.background.default, 
      display: 'flex', 
      flexDirection: 'column', 
      pt: { xs: 7, md: 0 } 
    }}>
      <Box
        sx={{
          px: { xs: 2, md: 4 },
          pb: 3,
          mt: { xs: 0, md: 3 },
          display: { xs: 'block', md: 'flex' }, 
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        {/* Title + Subtitle */}
        <Box>
          <Typography sx={{ fontFamily: 'Manrope, sans-serif', fontWeight: 500, fontSize: '20px', color: (theme) => theme.palette.text.primary, mb: 0.5 }}>
            Dashboard
          </Typography>
          <Typography sx={{ fontFamily: 'Manrope, sans-serif', fontWeight: 400, fontSize: '14px', color: (theme) => theme.palette.text.secondary }}>
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
          <Box component="img" src="/images/search-icon.png" alt="Search" sx={{ 
            width: 20, 
            height: 20, 
            cursor: 'pointer',
            filter: (theme) => theme.palette.mode === 'dark' ? 'brightness(0) invert(1)' : 'none'
          }} 
          onClick={onSearch}
          />
          <Box component="img" src="/images/bell-icon.png" alt="Notifications" sx={{ 
            width: 20, 
            height: 20, 
            cursor: 'pointer',
            filter: (theme) => theme.palette.mode === 'dark' ? 'brightness(0) invert(1)' : 'none'
          }} />
          <Button
            onClick={onCreateEvent}
            sx={{
              backgroundColor: '#FF2670',
              color: 'white',
              borderRadius: '8px',
              padding: {
                xs: '6px 10px',
                sm: '10px 20px 10px 16px',
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
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 600,
              fontSize: { xs: '20px', md: '24px' },
              color: (theme) => theme.palette.text.primary,
              mb: 2,
            }}
          >
            Welcome, {userID}!
          </Typography>
          <Typography
            sx={{
              fontFamily: 'Unbounded, sans-serif',
              fontWeight: 400,
              fontSize: { xs: '24px', md: '39px' },
              textAlign: 'center',
              color: (theme) => theme.palette.text.primary,
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
              color: (theme) => theme.palette.text.secondary,
              mb: 4,
              maxWidth: '500px',
              mx: 'auto',
            }}
          >
            Create your first event and start minting on-chain attendance NFTs — scan, check-in, and reward your attendees the Web3 way.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

function Admin({ mode, toggleDarkMode }) {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [events, setEvents] = useState([]);
  const [nfts, setNFTs] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [connectToLumaModalOpen, setConnectToLumaModalOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // User identification
  const walletAddress = localStorage.getItem('wallet_address') || '';
  const userID = walletAddress ? `User-${walletAddress.slice(-4).toUpperCase()}` : 'User-ANON';
  const [profilePicture, setProfilePicture] = useState(localStorage.getItem('profile_picture') || '');

  const fetchData = useCallback(async () => {
  try {
    // Only fetch events - remove NFTs call that requires admin access
    const eventsData = await api.getEvents();
    setEvents(eventsData);
    // Don't fetch NFTs here since it requires admin permissions
    setNFTs([]); // Set empty array instead
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
    { id: 'nft-gallery', label: 'NFT Gallery', icon: '/images/gallery-icon.png' },
    { id: 'check-ins', label: 'Check-ins', icon: '/images/check-ins-icon.png' },
  ];

  const drawer = (
    <Box
      sx={{
        width: drawerWidth,
        height: '100vh',
        backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#242424' : '#FAFAFA',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRight: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
      }}
    >
      {/* Close icon for mobile drawer */}
      <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'flex-start', p: 2 }}>
        <IconButton onClick={() => setMobileOpen(false)}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Polkadot Branding at Top */}
      <Box sx={{ p: 3, pt: { xs: 0, md: 4 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box component="img" src="/images/pol-logo.png" alt="Polkadot" sx={{ width: 24, height: 24, mr: 2 }} />
          <Typography sx={{ fontFamily: 'Manrope, sans-serif', fontWeight: 500, fontSize: '14px', color: (theme) => theme.palette.text.primary }}>
            Polkadot Attendance Sys
          </Typography>
        </Box>
        <Typography sx={{ fontFamily: 'Manrope, sans-serif', fontWeight: 400, fontSize: '12px', color: (theme) => theme.palette.text.secondary }}>
          Management
        </Typography>
      </Box>
      <Divider sx={{ mx: 3, borderColor: (theme) => theme.palette.divider }} />
      
      {/* Main Navigation */}
      <Box sx={{ px: 3, py: 2, flex: 1 }}>
        <Typography sx={{ fontFamily: 'Manrope, sans-serif', fontWeight: 500, fontSize: '12px', letterSpacing: '0.04em', textTransform: 'uppercase', color: (theme) => theme.palette.text.secondary, mb: 2 }}>
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
              sx={{ 
                borderRadius: '8px', 
                padding: '12px 16px', 
                backgroundColor: currentPage === item.id 
                  ? (theme) => theme.palette.action.selected 
                  : 'transparent', 
                '&:hover': { 
                  backgroundColor: currentPage === item.id 
                    ? (theme) => theme.palette.action.selected 
                    : (theme) => theme.palette.action.hover 
                }, 
                '&.Mui-selected': { 
                  backgroundColor: (theme) => theme.palette.action.selected 
                } 
              }}
            >
              <ListItemIcon sx={{ minWidth: 32, mr: 1 }}>
                <Box component="img" src={item.icon} alt={item.label} sx={{ 
                  width: 20, 
                  height: 20,
                  filter: (theme) => theme.palette.mode === 'dark' ? 'brightness(0) invert(1)' : 'none'
                }} />
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ 
                  fontFamily: 'Manrope, sans-serif', 
                  fontSize: '14px', 
                  fontWeight: 500, 
                  color: (theme) => theme.palette.text.primary 
                }}
              />
            </ListItemButton>
          ))}
        </Box>
      </Box>
      
      {/* Bottom Section with User Profile */}
      <Box sx={{ px: 3, pb: 3 }}>
        <Divider sx={{ mb: 3, borderColor: (theme) => theme.palette.divider }} />
        
        {/* Settings and Logout */}
        {[{ id: 'settings', label: 'Settings', icon: '/images/settings-icon.png' }, { id: 'Log out', label: 'Log out', icon: '/images/Logout-icon.png' }].map((item) => (
          <ListItemButton
            key={item.id}
            onClick={item.id === 'Log out' ? () => { api.logout(); window.location.href = '/'; } : () => {
              setCurrentPage('settings');
              setMobileOpen(false);
            }}
            sx={{ 
              borderRadius: '8px', 
              padding: '12px 16px', 
              mb: 1, 
              '&:hover': { 
                backgroundColor: (theme) => theme.palette.action.hover 
              } 
            }}
          >
            <ListItemIcon sx={{ minWidth: 32, mr: 1 }}>
              <Box component="img" src={item.icon} alt={item.label} sx={{ 
                width: 20, 
                height: 20,
                filter: (theme) => theme.palette.mode === 'dark' ? 'brightness(0) invert(1)' : 'none'
              }} />
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{ 
                fontFamily: 'Manrope, sans-serif', 
                fontSize: '14px', 
                fontWeight: 500, 
                color: (theme) => theme.palette.text.primary 
              }}
            />
          </ListItemButton>
        ))}
        
        {/* User Profile Section */}
        <Box sx={{ mt: 3 }}>
          <Divider sx={{ mb: 3, borderColor: (theme) => theme.palette.divider }} />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar 
                src={profilePicture}
                sx={{ 
                  width: 40, 
                  height: 40, 
                  bgcolor: !profilePicture ? '#E6007A' : 'transparent',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  '&:hover': {
                    opacity: 0.8
                  }
                }}
                onClick={() => setCurrentPage('settings')}
              >
                {!profilePicture && userID.slice(-2).toUpperCase()}
              </Avatar>
              <Box>
                <Typography sx={{ 
                  fontFamily: 'Manrope, sans-serif', 
                  fontWeight: 600, 
                  fontSize: '14px', 
                  color: (theme) => theme.palette.text.primary 
                }}>
                  {userID}
                </Typography>
                <Typography sx={{ 
                  fontFamily: 'Manrope, sans-serif', 
                  fontWeight: 400, 
                  fontSize: '12px', 
                  color: (theme) => theme.palette.text.secondary 
                }}>
                  {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Not connected'}
                </Typography>
              </Box>
            </Box>
            <DarkModeToggle mode={mode} onToggle={toggleDarkMode} />
          </Box>
        </Box>
      </Box>
    </Box>
  );

  const handleSearch = () => {
    setSearchOpen(true);
  };

  const handleSearchClose = () => {
    setSearchOpen(false);
    setSearchQuery('');
  };

  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    
    const query = searchQuery.toLowerCase();
    const results = [];
    
    // Search in menu items
    menuItems.forEach(item => {
      if (item.label.toLowerCase().includes(query)) {
        results.push({
          type: 'page',
          label: item.label,
          icon: item.icon,
          action: () => {
            setCurrentPage(item.id);
            handleSearchClose();
          }
        });
      }
    });
    
    // Search in events
    events.forEach(event => {
      if (event.name.toLowerCase().includes(query)) {
        results.push({
          type: 'event',
          label: event.name,
          subtitle: event.date,
          action: () => {
            setCurrentPage('events');
            handleSearchClose();
          }
        });
      }
    });
    
    // Search in NFTs
    nfts.forEach(nft => {
      if (nft.metadata?.event_name?.toLowerCase().includes(query) || 
          nft.metadata?.attendee?.toLowerCase().includes(query)) {
        results.push({
          type: 'nft',
          label: nft.metadata?.event_name || 'Unnamed NFT',
          subtitle: nft.metadata?.attendee || 'Unknown attendee',
          action: () => {
            setCurrentPage('nft-gallery');
            handleSearchClose();
          }
        });
      }
    });
    
    return results.slice(0, 10); // Limit to 10 results
  }, [searchQuery, events, nfts, menuItems]);

  const renderPageContent = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard onCreateEvent={() => setConnectToLumaModalOpen(true)} mode={mode} toggleDarkMode={toggleDarkMode} onSearch={handleSearch} />;
      case 'events': return <EventsPage onConnectToLuma={() => setConnectToLumaModalOpen(true)} mode={mode} toggleDarkMode={toggleDarkMode} setCurrentPage={setCurrentPage} />;
      case 'nft-gallery': return <Gallery mode={mode} toggleDarkMode={toggleDarkMode} />;
      case 'check-ins': return <EventCheckInsPage mode={mode} toggleDarkMode={toggleDarkMode} />;
      case 'settings': return <SettingsPage mode={mode} toggleDarkMode={toggleDarkMode} />;
      default: return <Dashboard onCreateEvent={() => setConnectToLumaModalOpen(true)} mode={mode} toggleDarkMode={toggleDarkMode} onSearch={handleSearch} />;
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          display: { xs: 'block', md: 'none' },
          backgroundColor: (theme) => theme.palette.background.paper,
          color: (theme) => theme.palette.text.primary,
          boxShadow: 'none',
          height: '48px',
          justifyContent: 'center'
        }}
      >
        <Toolbar sx={{ minHeight: '48px', px: 1 }}>
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
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
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
      
      {/* Search Modal */}
      <Dialog
        open={searchOpen}
        onClose={handleSearchClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: (theme) => theme.palette.background.paper,
            backgroundImage: 'none',
          }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ color: (theme) => theme.palette.text.primary }}>
              Search
            </Typography>
            <IconButton onClick={handleSearchClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            autoFocus
            placeholder="Search pages, events, or NFTs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: (theme) => theme.palette.text.secondary }} />
                </InputAdornment>
              ),
            }}
          />
          
          {searchQuery && (
            <List>
              {searchResults.length === 0 ? (
                <ListItem>
                  <Typography sx={{ color: (theme) => theme.palette.text.secondary }}>
                    No results found for "{searchQuery}"
                  </Typography>
                </ListItem>
              ) : (
                searchResults.map((result, index) => (
                  <ListItem
                    key={index}
                    button
                    onClick={result.action}
                    sx={{
                      borderRadius: 1,
                      mb: 1,
                      '&:hover': {
                        backgroundColor: (theme) => theme.palette.action.hover,
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                      {result.icon && (
                        <Box 
                          component="img" 
                          src={result.icon} 
                          alt={result.label} 
                          sx={{ 
                            width: 20, 
                            height: 20,
                            filter: (theme) => theme.palette.mode === 'dark' ? 'brightness(0) invert(1)' : 'none'
                          }} 
                        />
                      )}
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ color: (theme) => theme.palette.text.primary }}>
                          {result.label}
                        </Typography>
                        {result.subtitle && (
                          <Typography variant="caption" sx={{ color: (theme) => theme.palette.text.secondary }}>
                            {result.subtitle}
                          </Typography>
                        )}
                      </Box>
                      <Chip 
                        label={result.type} 
                        size="small" 
                        sx={{ 
                          textTransform: 'capitalize',
                          backgroundColor: (theme) => theme.palette.action.selected,
                        }} 
                      />
                    </Box>
                  </ListItem>
                ))
              )}
            </List>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default Admin;
