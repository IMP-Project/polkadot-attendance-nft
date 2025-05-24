import React, { useState, useMemo, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, useLocation, Navigate, useParams } from 'react-router-dom';
import { 
  AppBar, Box, CssBaseline, Drawer, IconButton, List, ListItem, 
  ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography,
  ThemeProvider, createTheme, Container, Divider, Tooltip, useMediaQuery,
  Menu, MenuItem, Button, Grid
} from '@mui/material';
import { 
  Menu as MenuIcon, 
  Home as HomeIcon, 
  Dashboard as DashboardIcon,
  Style as StyleIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Collections as CollectionsIcon,
  TextFields as TextFieldsIcon,
  ArrowDropDown as ArrowDropDownIcon,
  Brightness4 as Brightness4Icon,
  Brightness7 as Brightness7Icon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import Home from './pages/Home';
import Admin from './pages/Admin';
import Gallery from './pages/Gallery';
import PublicGallery from './pages/PublicGallery';
import PolkadotBackground from './components/PolkadotBackground';
import { FontSizeProvider, useFontSize, SCALE_OPTIONS } from './contexts/FontSizeContext';
import Login from './pages/Login';
import { api } from './services/api';
import MockCheckInSimulator from './components/MockCheckInSimulator';

// CheckIn page component
const CheckInPage = () => {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadEvent = async () => {
      try {
        const events = await api.getEvents();
        const foundEvent = events.find(e => e.id === eventId);
        if (foundEvent) {
          setEvent(foundEvent);
        }
      } catch (error) {
        console.error('Error loading event:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadEvent();
  }, [eventId]);
  
  if (loading) {
    return (
      <Container>
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="h6">Loading event information...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container>
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>Check-In: {event?.name || 'Unknown Event'}</Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Use this page to simulate attendee check-ins for this event. Each check-in will
          generate an NFT for the attendee's wallet address.
        </Typography>
        <MockCheckInSimulator eventId={eventId} />
      </Box>
    </Container>
  );
};

function FontSizeSelector() {
  const { scale, setScale, scaleLabel } = useFontSize();
  const [anchorEl, setAnchorEl] = useState(null);
  
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleSelect = (newScale) => {
    setScale(newScale);
    handleClose();
  };
  
  return (
    <>
      <Tooltip title="Adjust font size">
        <Button 
          color="inherit" 
          onClick={handleClick}
          startIcon={<TextFieldsIcon />}
          endIcon={<ArrowDropDownIcon />}
          sx={{ 
            ml: 1,
            backdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(255,255,255,0.1)',
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.2)',
            },
            borderRadius: 2,
          }}
        >
          {scaleLabel}
        </Button>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem 
          onClick={() => handleSelect(SCALE_OPTIONS.DEFAULT)}
          selected={scale === SCALE_OPTIONS.DEFAULT}
        >
          Default
        </MenuItem>
        <MenuItem 
          onClick={() => handleSelect(SCALE_OPTIONS.MEDIUM)}
          selected={scale === SCALE_OPTIONS.MEDIUM}
        >
          Medium
        </MenuItem>
        <MenuItem 
          onClick={() => handleSelect(SCALE_OPTIONS.LARGE)}
          selected={scale === SCALE_OPTIONS.LARGE}
        >
          Large
        </MenuItem>
      </Menu>
    </>
  );
}

// Protected route wrapper
const ProtectedRoute = ({ element }) => {
  const location = useLocation();
  
  if (!api.isAuthenticated()) {
    // Redirect to root if not authenticated (which will show login)
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  
  return element;
};

// Main landing page component that shows login or home based on auth
const LandingPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(api.isAuthenticated());
  
  // Listen for authentication changes
  useEffect(() => {
    const checkAuth = () => {
      setIsAuthenticated(api.isAuthenticated());
    };
    
    // Check authentication status every second
    const interval = setInterval(checkAuth, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  if (!isAuthenticated) {
    return <Login />;
  }
  
  return <Home />;
};

function MainContent() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = useState(
    localStorage.getItem('themeMode') || (prefersDarkMode ? 'dark' : 'light')
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { scale } = useFontSize();
  const [isMockMode, setIsMockMode] = useState(api.isMockModeEnabled());

  // Monitor mock mode changes
  useEffect(() => {
    const checkMockMode = () => {
      setIsMockMode(api.isMockModeEnabled());
    };
    
    checkMockMode();
    
    // Check periodically in case it changes
    const interval = setInterval(checkMockMode, 2000);
    
    return () => clearInterval(interval);
  }, []);

  // Create a theme with Polkadot colors and font scaling
  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: {
        main: '#E6007A', // Polkadot pink
      },
      secondary: {
        main: '#552BBF', // Polkadot purple
      },
      background: {
        default: mode === 'dark' ? '#121212' : '#f7f7f7',
        paper: mode === 'dark' ? '#1E1E1E' : '#ffffff',
      },
      text: {
        primary: mode === 'dark' ? '#f5f5f5' : '#333333',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      fontSize: 14 * scale, // Base font size scaled
      h1: {
        fontWeight: 700,
        fontSize: `${2.5 * scale}rem`, // Scale headings
      },
      h2: {
        fontWeight: 600,
        fontSize: `${2 * scale}rem`,
      },
      h3: {
        fontSize: `${1.75 * scale}rem`,
      },
      h4: {
        fontSize: `${1.5 * scale}rem`,
      },
      h5: {
        fontSize: `${1.25 * scale}rem`,
      },
      h6: {
        fontSize: `${1.1 * scale}rem`,
      },
      subtitle1: {
        fontSize: `${1 * scale}rem`,
      },
      subtitle2: {
        fontSize: `${0.875 * scale}rem`,
      },
      body1: {
        fontSize: `${1 * scale}rem`,
      },
      body2: {
        fontSize: `${0.875 * scale}rem`,
      },
      button: {
        textTransform: 'none',
        fontSize: `${0.875 * scale}rem`,
      },
      caption: {
        fontSize: `${0.75 * scale}rem`,
      },
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'dark' ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)',
          },
        },
      },
      // Scale other components
      MuiButton: {
        styleOverrides: {
          root: {
            padding: `${0.5 * scale}rem ${1 * scale}rem`,
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            padding: `${0.5 * scale}rem`,
          },
        },
      },
    },
    spacing: (factor) => `${0.5 * scale * factor}rem`, // Scale spacing
  }), [mode, scale]);

  // Save theme preference to localStorage
  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const toggleColorMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const menuItems = [
    { text: 'Home', icon: <HomeIcon />, path: '/' },
    { text: 'Admin Dashboard', icon: <DashboardIcon />, path: '/admin', requiresAuth: true },
    { text: 'NFT Gallery', icon: <CollectionsIcon />, path: '/gallery' },
  ];
  
  // Check if we're on a public page route
  const isPublicPage = location.pathname.startsWith('/public');
  
  // Check if we're showing the login page (when user is not authenticated and on root)
  const isLoginPage = location.pathname === '/' && !api.isAuthenticated();

  // Don't show the drawer and app bar on public pages OR login page
  if (isPublicPage) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <PolkadotBackground />
        <Routes>
          <Route path="/public/gallery/:eventId" element={<PublicGallery />} />
        </Routes>
      </ThemeProvider>
    );
  }

  // If it's the login page, show full-screen login without sidebar/header
  if (isLoginPage) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Routes>
          <Route path="/" element={<LandingPage />} />
        </Routes>
      </ThemeProvider>
    );
  }

  const drawer = (
    <div>
      <Toolbar sx={{ justifyContent: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <StyleIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" noWrap component="div" fontWeight="bold">
            Polkadot NFT
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          (!item.requiresAuth || api.isAuthenticated()) && (
            <ListItem key={item.text} disablePadding>
              <ListItemButton 
                component={Link} 
                to={item.path}
                selected={location.pathname === item.path}
              >
                <ListItemIcon sx={{ color: location.pathname === item.path ? 'primary.main' : 'inherit' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          )
        ))}
        {api.isAuthenticated() && (
          <ListItem disablePadding>
            <ListItemButton onClick={() => {
              api.logout();
              window.location.href = '/';
            }}>
              <ListItemIcon>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItemButton>
          </ListItem>
        )}
      </List>
    </div>
  );

  const drawerWidth = 240 * scale; // Scale drawer width

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        <PolkadotBackground />
        <AppBar
          position="fixed"
          sx={{
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            ml: { sm: `${drawerWidth}px` },
            boxShadow: 1,
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
              {location.pathname === '/' ? 'Polkadot Attendance NFT System' : 
               location.pathname === '/admin' ? 'Admin Dashboard' : 
               location.pathname === '/gallery' ? 'NFT Gallery' : 'Polkadot NFT'}
            </Typography>
            
            <FontSizeSelector />
            
            <Tooltip title={mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
              <IconButton 
                color="inherit" 
                onClick={toggleColorMode}
                sx={{ 
                  p: 1,
                  ml: 1,
                  backdropFilter: 'blur(8px)',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.2)',
                  },
                  borderRadius: '50%',
                  transition: 'all 0.2s',
                }}
              >
                {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>
        
        <Box
          component="nav"
          sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
          aria-label="menu items"
        >
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: 'block', sm: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
          >
            {drawer}
          </Drawer>
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', sm: 'block' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
            open
          >
            {drawer}
          </Drawer>
        </Box>
        
        <Box
          component="main"
          sx={{ 
            flexGrow: 1, 
            p: 3, 
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            minHeight: '100vh',
            backgroundColor: 'background.default'
          }}
        >
          <Toolbar />
          <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/admin/*" element={<ProtectedRoute element={<Admin />} />} />
              <Route path="/gallery" element={<ProtectedRoute element={<Gallery />} />} />
              <Route path="/check-in/:eventId" element={<ProtectedRoute element={<CheckInPage />} />} />
            </Routes>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

function App() {
  // Enable mock mode by default if the backend is not available
  useEffect(() => {
    // Check if mock mode is already set
    if (localStorage.getItem('use_mock_data') === null) {
      // Try to connect to backend, enable mock mode if it fails
      api.checkHealth().catch(() => {
        api.enableMockMode();
        console.log('Backend server not detected, enabling mock mode automatically');
      });
    }
  }, []);

  return (
    <Router>
      <FontSizeProvider>
        <MainContent />
      </FontSizeProvider>
    </Router>
  );
}

export default App;