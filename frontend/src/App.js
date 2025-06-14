import React, { useState, useMemo, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate, useParams } from 'react-router-dom';
import { 
  Box, CssBaseline, Typography, Container, ThemeProvider, createTheme, useMediaQuery
} from '@mui/material';

import Admin from './pages/Admin';
import PublicGallery from './pages/PublicGallery';
import EventsPage from './pages/EventsPage';
import CheckInsPage from './pages/CheckInsPage';
import PolkadotBackground from './components/layout/PolkadotBackground';
import { FontSizeProvider, useFontSize } from './contexts/FontSizeContext';
import { EventsProvider } from './contexts/EventsContext';
import Login from './pages/Login';
import { api } from './services/api';
import ConnectToLumaModal from './components/ui/ConnectToLumaModal';

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
          Check-ins are managed through the Luma API integration. When attendees check in
          at your event using Luma, they will automatically receive their attendance NFT.
        </Typography>
      </Box>
    </Container>
  );
};

// Protected route wrapper
const ProtectedRoute = ({ element }) => {
  const location = useLocation();
  
  if (!api.isAuthenticated()) {
    // Redirect to root if not authenticated (which will show login)
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  
  return element;
};

// Main landing page component that shows login or redirects to admin
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
  
  // Redirect authenticated users directly to admin
  return <Navigate to="/admin" replace />;
};

// Events Page Wrapper with Luma Modal
const EventsPageWrapper = () => {
  const [isLumaModalOpen, setIsLumaModalOpen] = useState(false);

  const handleConnectToLuma = () => {
    setIsLumaModalOpen(true);
  };

  const handleCloseLumaModal = () => {
    setIsLumaModalOpen(false);
  };

  const handleImportSuccess = () => {
    // Modal will close automatically, events are already added to context
    // EventsPage will automatically update to show table view
    console.log('Event imported successfully!');
  };

  return (
    <>
      <EventsPage onConnectToLuma={handleConnectToLuma} />
      
      <ConnectToLumaModal
        open={isLumaModalOpen}
        onClose={handleCloseLumaModal}
        onSuccess={handleImportSuccess}
      />
    </>
  );
};

function MainContent() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = useState(
    localStorage.getItem('themeMode') || (prefersDarkMode ? 'dark' : 'light')
  );
  const location = useLocation();
  const { scale } = useFontSize();

  // Create a theme with Polkadot colors and font scaling
  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: {
        main: '#E6007A', // Polkadot pink
      },
      secondary: {
        main: mode === 'dark' ? '#8B5CF6' : '#552BBF', // Lighter purple for better contrast in dark mode
      },
      background: {
        default: mode === 'dark' ? '#1a1a1a' : '#f7f7f7',
        paper: mode === 'dark' ? '#2d2d2d' : '#ffffff',
      },
      text: {
        primary: mode === 'dark' ? '#ffffff' : '#18171C',
        secondary: mode === 'dark' ? '#b3b3b3' : '#77738C',
      },
      divider: mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : '#E5E5E5',
      action: {
        selected: mode === 'dark' ? 'rgba(230, 0, 122, 0.16)' : 'rgba(255, 235, 241, 1)',
        hover: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
      },
    },
    typography: {
      fontFamily: '"Manrope", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      fontSize: 14 * scale, // Base font size scaled
      // Enhanced typography scale
      h1: {
        fontFamily: '"Unbounded", "Manrope", sans-serif',
        fontWeight: 700,
        fontSize: `${2.5 * scale}rem`, // 40px
        lineHeight: 1.2,
      },
      h2: {
        fontFamily: '"Manrope", sans-serif',
        fontWeight: 600,
        fontSize: `${2 * scale}rem`, // 32px
        lineHeight: 1.25,
      },
      h3: {
        fontFamily: '"Manrope", sans-serif',
        fontWeight: 600,
        fontSize: `${1.5 * scale}rem`, // 24px
        lineHeight: 1.33,
      },
      h4: {
        fontFamily: '"Manrope", sans-serif',
        fontWeight: 600,
        fontSize: `${1.25 * scale}rem`, // 20px
        lineHeight: 1.4,
      },
      h5: {
        fontFamily: '"Manrope", sans-serif',
        fontWeight: 500,
        fontSize: `${1.125 * scale}rem`, // 18px
        lineHeight: 1.44,
      },
      h6: {
        fontFamily: '"Manrope", sans-serif',
        fontWeight: 500,
        fontSize: `${1 * scale}rem`, // 16px
        lineHeight: 1.5,
      },
      subtitle1: {
        fontFamily: '"Manrope", sans-serif',
        fontWeight: 500,
        fontSize: `${1 * scale}rem`, // 16px
        lineHeight: 1.5,
      },
      subtitle2: {
        fontFamily: '"Manrope", sans-serif',
        fontWeight: 500,
        fontSize: `${0.875 * scale}rem`, // 14px
        lineHeight: 1.43,
      },
      body1: {
        fontFamily: '"Manrope", sans-serif',
        fontWeight: 400,
        fontSize: `${1 * scale}rem`, // 16px
        lineHeight: 1.5,
      },
      body2: {
        fontFamily: '"Manrope", sans-serif',
        fontWeight: 400,
        fontSize: `${0.875 * scale}rem`, // 14px
        lineHeight: 1.43,
      },
      button: {
        fontFamily: '"Manrope", sans-serif',
        fontWeight: 500,
        textTransform: 'none',
        fontSize: `${0.875 * scale}rem`, // 14px
        lineHeight: 1.43,
      },
      caption: {
        fontFamily: '"Manrope", sans-serif',
        fontWeight: 400,
        fontSize: `${0.75 * scale}rem`, // 12px
        lineHeight: 1.33,
      },
      // Custom variants for consistent usage
      overline: {
        fontFamily: '"Manrope", sans-serif',
        fontWeight: 500,
        fontSize: `${0.75 * scale}rem`, // 12px
        lineHeight: 1.33,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      },
    },
    // Custom spacing system (in addition to default 8px scale)
    spacing: 8, // Base unit: 8px
    // Custom properties for consistent spacing
    customSpacing: {
      xs: 4,   // 4px
      sm: 8,   // 8px  
      md: 16,  // 16px
      lg: 24,  // 24px
      xl: 32,  // 32px
      xxl: 48, // 48px
      xxxl: 64 // 64px
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'dark' ? 'rgba(45, 45, 45, 0.95)' : 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(10px)',
            border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            fontFamily: '"Manrope", sans-serif',
            fontWeight: 500,
            borderRadius: '8px',
            padding: `${12 * scale}px ${24 * scale}px`,
            textTransform: 'none',
            fontSize: `${14 * scale}px`,
            lineHeight: 1.43,
          },
          contained: {
            boxShadow: mode === 'dark' ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(255, 38, 112, 0.3)',
            '&:hover': {
              boxShadow: mode === 'dark' ? '0 4px 16px rgba(0, 0, 0, 0.4)' : '0 6px 20px rgba(255, 38, 112, 0.4)',
            },
          },
          outlined: {
            borderWidth: '1.5px',
            '&:hover': {
              borderWidth: '1.5px',
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            padding: `${0.5 * scale}rem`,
            color: mode === 'dark' ? '#ffffff' : 'inherit',
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            '&.Mui-selected': {
              backgroundColor: mode === 'dark' ? 'rgba(230, 0, 122, 0.16)' : '#FFEBF1',
              '&:hover': {
                backgroundColor: mode === 'dark' ? 'rgba(230, 0, 122, 0.24)' : '#FFEBF1',
              },
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            fontFamily: '"Manrope", sans-serif',
            padding: `${16 * scale}px`,
            borderBottom: `1px solid ${mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : '#E5E5E5'}`,
          },
          head: {
            fontWeight: 600,
            fontSize: `${14 * scale}px`,
            color: mode === 'dark' ? '#ffffff' : '#18171C',
            backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
          },
          body: {
            fontSize: `${14 * scale}px`,
            color: mode === 'dark' ? '#b3b3b3' : '#77738C',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
            },
            '&:last-child td': {
              borderBottom: 0,
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontFamily: '"Manrope", sans-serif',
            fontWeight: 500,
            fontSize: `${12 * scale}px`,
            height: `${24 * scale}px`,
            borderRadius: `${12 * scale}px`,
          },
        },
      },
    },
    spacing: (factor) => `${0.5 * scale * factor}rem`,
  }), [mode, scale]);

  // Save theme preference to localStorage
  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  // Toggle dark mode function
  const toggleDarkMode = () => {
    setMode((prevMode) => prevMode === 'light' ? 'dark' : 'light');
  };

  // Pass mode and toggle function via context or props
  const themeContext = { mode, toggleDarkMode };

  // Check if we're on a public page route
  const isPublicPage = location.pathname.startsWith('/public');
  
  // Check if we're showing the login page (when user is not authenticated and on root)
  const isLoginPage = location.pathname === '/' && !api.isAuthenticated();

  // Check if we're on admin page
  const isAdminPage = location.pathname.startsWith('/admin');

  // Check if we're on events page
  const isEventsPage = location.pathname.startsWith('/events');
  
  // Check if we're on check-ins page
  const isCheckInsPage = location.pathname.startsWith('/checkins');

  // Don't show any wrapper for public pages
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

  // Show full-screen login without any wrapper
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

  // Show admin without any wrapper
  if (isAdminPage) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Routes>
          <Route path="/admin/*" element={<ProtectedRoute element={<Admin mode={mode} toggleDarkMode={toggleDarkMode} />} />} />
        </Routes>
      </ThemeProvider>
    );
  }

  // Show events page without any wrapper (full screen like admin)
  if (isEventsPage) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Routes>
          <Route path="/events" element={<ProtectedRoute element={<EventsPageWrapper />} />} />
        </Routes>
      </ThemeProvider>
    );
  }

  // Show check-ins page without any wrapper (full screen like admin)
  if (isCheckInsPage) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Routes>
          <Route path="/checkins" element={<ProtectedRoute element={<CheckInsPage />} />} />
        </Routes>
      </ThemeProvider>
    );
  }

  // For other pages (Home), show simple layout without old sidebar
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <PolkadotBackground />
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
        <Container maxWidth="lg" sx={{ pt: 4, pb: 4 }}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/check-in/:eventId" element={<ProtectedRoute element={<CheckInPage />} />} />
          </Routes>
        </Container>
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
        <EventsProvider>
          <MainContent />
        </EventsProvider>
      </FontSizeProvider>
    </Router>
  );
}

export default App;