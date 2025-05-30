import React, { useState, useRef } from 'react';
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
  IconButton
} from '@mui/material';
import { PhotoCamera, Delete } from '@mui/icons-material';
import PageHeader from '../components/ui/PageHeader';

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