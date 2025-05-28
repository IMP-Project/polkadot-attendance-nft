import React, { useState, useMemo, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate, useParams } from 'react-router-dom';
import { 
  Box, CssBaseline, Typography, Container, ThemeProvider, createTheme, useMediaQuery
} from '@mui/material';

import Admin from './pages/Admin';
import Gallery from './pages/Gallery';
import PublicGallery from './pages/PublicGallery';
import EventsPage from './pages/EventsPage';
import PolkadotBackground from './components/layout/PolkadotBackground';
import { FontSizeProvider, useFontSize } from './contexts/FontSizeContext';
import { EventsProvider } from './contexts/EventsContext';
import Login from './pages/Login';
import { api } from './services/api';
import MockCheckInSimulator from './components/admin/MockCheckInSimulator';
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
          Use this page to simulate attendee check-ins for this event. Each check-in will
          generate an NFT for the attendee's wallet address.
        </Typography>
        <MockCheckInSimulator eventId={eventId} />
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
        fontSize: `${2.5 * scale}rem`,
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
    spacing: (factor) => `${0.5 * scale * factor}rem`,
  }), [mode, scale]);

  // Save theme preference to localStorage
  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  // Check if we're on a public page route
  const isPublicPage = location.pathname.startsWith('/public');
  
  // Check if we're showing the login page (when user is not authenticated and on root)
  const isLoginPage = location.pathname === '/' && !api.isAuthenticated();

  // Check if we're on admin page
  const isAdminPage = location.pathname.startsWith('/admin');

  // Check if we're on events page
  const isEventsPage = location.pathname.startsWith('/events');

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
          <Route path="/admin/*" element={<ProtectedRoute element={<Admin />} />} />
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

  // For other pages (Home, Gallery), show simple layout without old sidebar
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <PolkadotBackground />
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
        <Container maxWidth="lg" sx={{ pt: 4, pb: 4 }}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/gallery" element={<ProtectedRoute element={<Gallery />} />} />
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