import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Divider,
  Switch,
  FormControlLabel,
  Grid,
  Alert,
  Avatar,
  Chip,
  CircularProgress
} from '@mui/material';
import { PhotoCamera, Delete, Link, LinkOff } from '@mui/icons-material';
import PageHeader from '../components/ui/PageHeader';
import { api } from '../services/api';

const SettingsPage = ({ mode, toggleDarkMode }) => {
  const walletAddress = localStorage.getItem('wallet_address') || '';
  const userID = walletAddress ? `User-${walletAddress.slice(-4).toUpperCase()}` : 'User-ANON';
  const fileInputRef = useRef(null);
  
  const [settings, setSettings] = useState({
    notifications: true,
    emailAlerts: false,
    autoMintNFTs: true,
    profilePicture: localStorage.getItem('profile_picture') || ''
  });
  
  const [saved, setSaved] = useState(false);
  
  // Luma integration state
  const [lumaStatus, setLumaStatus] = useState({ connected: false, connectedAt: null });
  const [lumaApiKey, setLumaApiKey] = useState('');
  const [lumaLoading, setLumaLoading] = useState(false);
  const [lumaMessage, setLumaMessage] = useState({ type: '', text: '' });
  
  // Load Luma status on component mount
  useEffect(() => {
    if (api.isAuthenticated()) {
      loadLumaStatus();
    }
  }, []);

  const loadLumaStatus = async () => {
    try {
      const status = await api.getLumaStatus();
      setLumaStatus(status);
    } catch (error) {
      console.error('Failed to load Luma status:', error);
    }
  };

  const handleLumaConnect = async () => {
    if (!lumaApiKey.trim()) {
      setLumaMessage({ type: 'error', text: 'Please enter your Luma API key' });
      return;
    }

    setLumaLoading(true);
    setLumaMessage({ type: '', text: '' });

    try {
      const result = await api.connectToLuma(lumaApiKey);
      setLumaStatus({ connected: true, connectedAt: new Date().toISOString() });
      setLumaApiKey('');
      setLumaMessage({ type: 'success', text: 'Successfully connected to Luma!' });
    } catch (error) {
      console.error('Luma connection failed:', error);
      setLumaMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to connect to Luma' 
      });
    } finally {
      setLumaLoading(false);
    }
  };

  const handleLumaDisconnect = async () => {
    setLumaLoading(true);
    setLumaMessage({ type: '', text: '' });

    try {
      await api.disconnectFromLuma();
      setLumaStatus({ connected: false, connectedAt: null });
      setLumaMessage({ type: 'success', text: 'Successfully disconnected from Luma' });
    } catch (error) {
      console.error('Luma disconnect failed:', error);
      setLumaMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to disconnect from Luma' 
      });
    } finally {
      setLumaLoading(false);
    }
  };

  const handleChange = (field) => (event) => {
    setSettings({
      ...settings,
      [field]: event.target.checked !== undefined ? event.target.checked : event.target.value
    });
    setSaved(false);
  };

  const handleProfilePictureChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({
          ...settings,
          profilePicture: reader.result
        });
        setSaved(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveProfilePicture = () => {
    setSettings({
      ...settings,
      profilePicture: ''
    });
    setSaved(false);
  };

  const handleSave = () => {
    // Save settings to localStorage
    localStorage.setItem('user_settings', JSON.stringify(settings));
    localStorage.setItem('profile_picture', settings.profilePicture);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    
    // Reload to update the sidebar
    window.location.reload();
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: (theme) => theme.palette.background.default,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Page Header */}
      <Box sx={{ px: 4, py: 3 }}>
        <Typography
          sx={{
            fontFamily: 'Manrope, sans-serif',
            fontWeight: 500,
            fontSize: '20px',
            color: (theme) => theme.palette.text.primary,
            mb: 0.5,
          }}
        >
          Settings
        </Typography>
        <Typography
          sx={{
            fontFamily: 'Manrope, sans-serif',
            fontWeight: 400,
            fontSize: '14px',
            color: (theme) => theme.palette.text.secondary,
          }}
        >
          Manage your account and preferences
        </Typography>
      </Box>

      {/* Settings Content */}
      <Box sx={{ px: 4, pb: 4 }}>
        <Grid container spacing={3}>
          {/* Profile Settings */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 3, fontFamily: 'Manrope, sans-serif' }}>
                Profile Settings
              </Typography>
              
              {/* Profile Picture Upload */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar
                  src={settings.profilePicture}
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: !settings.profilePicture ? '#E6007A' : 'transparent',
                    fontSize: '24px',
                    fontWeight: 600,
                    mr: 2
                  }}
                >
                  {!settings.profilePicture && userID.slice(-2).toUpperCase()}
                </Avatar>
                <Box>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleProfilePictureChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<PhotoCamera />}
                    onClick={() => fileInputRef.current.click()}
                    sx={{ mb: 1 }}
                  >
                    Upload Photo
                  </Button>
                  {settings.profilePicture && (
                    <Box>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<Delete />}
                        onClick={handleRemoveProfilePicture}
                      >
                        Remove
                      </Button>
                    </Box>
                  )}
                </Box>
              </Box>
              
              <TextField
                fullWidth
                label="User ID"
                value={userID}
                disabled
                sx={{ mb: 3 }}
                helperText="Your unique identifier based on wallet"
              />
              
              <TextField
                fullWidth
                label="Wallet Address"
                value={walletAddress || 'Not connected'}
                disabled
                helperText="Your connected Polkadot wallet"
              />
            </Paper>
          </Grid>

          {/* Notification Settings */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 3, fontFamily: 'Manrope, sans-serif' }}>
                Notification Settings
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifications}
                    onChange={handleChange('notifications')}
                    color="primary"
                  />
                }
                label="Enable notifications"
                sx={{ mb: 2 }}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.emailAlerts}
                    onChange={handleChange('emailAlerts')}
                    color="primary"
                  />
                }
                label="Email alerts"
                sx={{ mb: 2 }}
              />
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h6" sx={{ mb: 2, fontFamily: 'Manrope, sans-serif' }}>
                NFT Settings
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoMintNFTs}
                    onChange={handleChange('autoMintNFTs')}
                    color="primary"
                  />
                }
                label="Auto-mint NFTs on check-in"
                sx={{ mb: 2 }}
              />
            </Paper>
          </Grid>

          {/* Luma Integration */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 3, fontFamily: 'Manrope, sans-serif' }}>
                Luma Integration
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Typography variant="body2" sx={{ mr: 2 }}>
                  Status:
                </Typography>
                <Chip
                  icon={lumaStatus.connected ? <Link /> : <LinkOff />}
                  label={lumaStatus.connected ? 'Connected' : 'Disconnected'}
                  color={lumaStatus.connected ? 'success' : 'default'}
                  size="small"
                />
                {lumaStatus.connected && lumaStatus.connectedAt && (
                  <Typography variant="caption" sx={{ ml: 2, color: 'text.secondary' }}>
                    Connected on {new Date(lumaStatus.connectedAt).toLocaleDateString()}
                  </Typography>
                )}
              </Box>

              {lumaMessage.text && (
                <Alert severity={lumaMessage.type} sx={{ mb: 3 }}>
                  {lumaMessage.text}
                </Alert>
              )}

              {!lumaStatus.connected ? (
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <TextField
                    placeholder="Enter your Luma API key"
                    value={lumaApiKey}
                    onChange={(e) => setLumaApiKey(e.target.value)}
                    type="password"
                    size="small"
                    sx={{ flexGrow: 1 }}
                    disabled={lumaLoading}
                  />
                  <Button
                    variant="contained"
                    onClick={handleLumaConnect}
                    disabled={lumaLoading || !lumaApiKey.trim()}
                    startIcon={lumaLoading ? <CircularProgress size={16} /> : <Link />}
                    sx={{
                      backgroundColor: '#E6007A',
                      '&:hover': { backgroundColor: '#C50066' },
                      textTransform: 'none',
                    }}
                  >
                    Connect
                  </Button>
                </Box>
              ) : (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleLumaDisconnect}
                  disabled={lumaLoading}
                  startIcon={lumaLoading ? <CircularProgress size={16} /> : <LinkOff />}
                  sx={{ textTransform: 'none' }}
                >
                  Disconnect
                </Button>
              )}

              <Typography variant="caption" sx={{ display: 'block', mt: 2, color: 'text.secondary' }}>
                Connect your Luma account to sync events and attendee data automatically.
              </Typography>
            </Paper>
          </Grid>

        </Grid>

        {/* Save Button */}
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          {saved && (
            <Alert severity="success" sx={{ alignItems: 'center' }}>
              Settings saved successfully!
            </Alert>
          )}
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{
              backgroundColor: '#E6007A',
              '&:hover': { backgroundColor: '#C50066' },
              textTransform: 'none',
              fontFamily: 'Manrope, sans-serif',
            }}
          >
            Save Changes
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default SettingsPage; 