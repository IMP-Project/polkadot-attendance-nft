import React, { useState, useEffect } from 'react';
import { Button, Card, CardContent, Typography, CircularProgress, FormControl, Select, MenuItem, InputLabel, Box, Alert, Stack, Divider, TextField } from '@mui/material';
import { api } from '../services/api';
import { stringToHex } from '@polkadot/util';

const WalletConnector = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [error, setError] = useState('');
  const [extensionDetected, setExtensionDetected] = useState(false);
  const [showNoAccountsHelp, setShowNoAccountsHelp] = useState(false);
  const [browserInfo, setBrowserInfo] = useState({ name: '', supported: true });
  const [checkingExtension, setCheckingExtension] = useState(true);
  const [debugInfo, setDebugInfo] = useState('');
  const [showManualMode, setShowManualMode] = useState(true);
  const [manualAddress, setManualAddress] = useState('');
  const [networkInfo, setNetworkInfo] = useState({ name: 'Polkadot', isTestnet: false });

  // Use a more reliable method to detect the extension
  useEffect(() => {
    // Detect browser type
    const detectBrowser = () => {
      const userAgent = navigator.userAgent;
      let browserName = "Unknown";
      let isSupported = true;

      if (userAgent.indexOf("Safari") > -1 && userAgent.indexOf("Chrome") === -1) {
        browserName = "Safari";
        isSupported = false;
      } else if (userAgent.indexOf("Firefox") > -1) {
        browserName = "Firefox";
      } else if (userAgent.indexOf("Edge") > -1) {
        browserName = "Edge";
      } else if (userAgent.indexOf("Chrome") > -1) {
        browserName = "Chrome";
      } else if (userAgent.indexOf("Opera") > -1 || userAgent.indexOf("OPR") > -1) {
        browserName = "Opera";
      }

      setBrowserInfo({ name: browserName, supported: isSupported });
    };

    detectBrowser();

    // Simplified extension detection - just check if it exists
    const checkExtension = async () => {
      setCheckingExtension(true);
      try {
        if (window.injectedWeb3 && window.injectedWeb3['polkadot-js']) {
          setExtensionDetected(true);
        } else {
          setExtensionDetected(false);
        }
      } catch (err) {
        console.error('Error checking for Polkadot extension:', err);
        setExtensionDetected(false);
      } finally {
        setCheckingExtension(false);
      }
    };
    
    // We'll still check if the extension exists, but won't rely on it
    if (browserInfo.supported) {
      checkExtension();
    }
  }, [browserInfo.supported]);

  // Add network detection - simplified to always assume mainnet
  useEffect(() => {
    setNetworkInfo({
      name: 'Polkadot',
      isTestnet: false
    });
  }, []);

  const handleManualAddressChange = (event) => {
    setManualAddress(event.target.value);
  };

  const manualLogin = () => {
    if (!manualAddress || manualAddress.trim() === '') {
      setError('Please enter a valid Polkadot address');
      return;
    }

    // Simple validation - Polkadot addresses start with 1, 5, or other specific prefixes and are 47-48 chars
    if (manualAddress.length < 45 || manualAddress.length > 50) {
      setError('Invalid Polkadot address format');
      return;
    }

    setLoading(true);
    
    try {
      // For manual mode, we'll generate a simple token ourselves
      // Store the address in localStorage
      localStorage.setItem('wallet_address', manualAddress);
      
      // Create a placeholder token for the frontend flow
      const placeholderToken = `manual_${Date.now()}_${manualAddress.substring(0, 8)}`;
      localStorage.setItem('auth_token', placeholderToken);
      localStorage.setItem('auth_mode', 'manual');
      
      // Log information for debugging
      console.log("Manual login successful with address:", manualAddress);
      
      // Run callback function
      if (onLogin) {
        onLogin(manualAddress);
      }
    } catch (err) {
      console.error("Error in manual login:", err);
      setError("Failed to process manual login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card elevation={3} sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Connect Your Wallet
        </Typography>
        
        {networkInfo.isTestnet && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>Polkadot Testnet Mode</strong> - This application is using a testnet for development purposes. No real funds will be used.
          </Alert>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ mt: 2, p: 3, border: '1px solid rgba(0,0,0,0.1)', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>
            Enter Your Polkadot Address
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
            Paste your Polkadot wallet address below to access the dashboard. 
            No transaction signing is needed as this is in development mode.
          </Typography>
          <TextField
            fullWidth
            label="Polkadot Address"
            variant="outlined"
            value={manualAddress}
            onChange={handleManualAddressChange}
            placeholder="e.g., 1xxxx... or 5xxxx..."
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={manualLogin}
            disabled={loading}
            fullWidth
            sx={{ py: 1.5 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Continue to Dashboard'}
          </Button>
        </Box>
        
        {extensionDetected && (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Divider sx={{ my: 2 }}>
              <Typography variant="body2" color="text.secondary">Or</Typography>
            </Divider>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => setShowManualMode(false)}
              sx={{ mt: 1 }}
            >
              Try Extension Connection (Experimental)
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default WalletConnector; 