import React, { useState, useEffect } from 'react';
import { Button, Typography, Box, Alert, CircularProgress, Avatar, Card, CardContent, TextField, Divider } from '@mui/material';
import { AccountBalanceWallet, CheckCircle, KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';

const PAPIWalletConnector = ({ onConnect, loading = false }) => {
  const [availableWallets, setAvailableWallets] = useState([]);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [connectedAccount, setConnectedAccount] = useState(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualAddress, setManualAddress] = useState('');

  // Detect available wallets on component mount
  useEffect(() => {
    detectWallets();
  }, []);

  const detectWallets = async () => {
    const wallets = [];
    
    // Better detection using @polkadot/extension-dapp
    try {
      const { web3Enable } = await import('@polkadot/extension-dapp');
      
      // Try to enable extensions to detect them
      const extensions = await web3Enable('Polkadot NFT Attendance');
      
      console.log('🔍 Detected extensions:', extensions);
      console.log('🔍 window.injectedWeb3:', window.injectedWeb3);
      
      // Check what's actually available in injectedWeb3
      if (window.injectedWeb3) {
        Object.keys(window.injectedWeb3).forEach(key => {
          console.log(`🔍 Found extension: ${key}`, window.injectedWeb3[key]);
        });
      }
      
      // Check for Polkadot{.js} extension (multiple possible keys)
      if (window.injectedWeb3?.['polkadot-js'] || 
          window.injectedWeb3?.polkadot || 
          extensions.find(ext => ext.name.includes('polkadot'))) {
        wallets.push({
          name: 'Polkadot{.js}',
          id: 'polkadot-js',
          icon: '🔴',
          installed: true
        });
      }
      
      // Check for Talisman
      if (window.injectedWeb3?.talisman || 
          window.talisman ||
          extensions.find(ext => ext.name.includes('talisman'))) {
        wallets.push({
          name: 'Talisman',
          id: 'talisman',
          icon: '🔮',
          installed: true
        });
      }
      
      // Check for SubWallet
      if (window.injectedWeb3?.['subwallet-js'] || 
          window.SubWallet ||
          extensions.find(ext => ext.name.includes('SubWallet'))) {
        wallets.push({
          name: 'SubWallet',
          id: 'subwallet-js',
          icon: '⚡',
          installed: true
        });
      }
      
    } catch (error) {
      console.log('🔍 Extension detection error:', error);
    }

    // If no wallets detected, show recommended ones
    if (wallets.length === 0) {
      wallets.push(
        {
          name: 'Polkadot{.js}',
          id: 'polkadot-js',
          icon: '🔴',
          installed: false,
          downloadUrl: 'https://polkadot.js.org/extension/'
        },
        {
          name: 'Talisman',
          id: 'talisman',
          icon: '🔮',
          installed: false,
          downloadUrl: 'https://talisman.xyz/'
        }
      );
    }

    console.log('🔍 Final detected wallets:', wallets);
    setAvailableWallets(wallets);
  };

  const connectWallet = async (walletId) => {
    setConnecting(true);
    setError('');

    try {
      // Enable the extension
      const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp');
      
      // Request access to the extension
      const extensions = await web3Enable('Polkadot NFT Attendance');
      
      if (extensions.length === 0) {
        throw new Error('No wallet extension found. Please install a Polkadot wallet.');
      }

      // Get accounts from the extension
      const accounts = await web3Accounts();
      
      if (accounts.length === 0) {
        throw new Error('No accounts found. Please create an account in your wallet.');
      }

      // For simplicity, use the first account
      const selectedAccount = accounts[0];
      
      setConnectedAccount({
        address: selectedAccount.address,
        name: selectedAccount.meta.name || 'Account 1',
        source: selectedAccount.meta.source
      });

      // Call the parent component's connect handler
      if (onConnect) {
        onConnect(selectedAccount.address);
      }

    } catch (err) {
      console.error('Wallet connection error:', err);
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  };

  const handleManualConnect = () => {
    if (!manualAddress || manualAddress.trim() === '') {
      setError('Please enter a valid Polkadot address');
      return;
    }

    // Simple validation - Polkadot addresses start with 1, 5, or other specific prefixes and are 47-48 chars
    if (manualAddress.length < 45 || manualAddress.length > 50) {
      setError('Invalid Polkadot address format');
      return;
    }

    setError('');
    if (onConnect) {
      onConnect(manualAddress.trim());
    }
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  if (connectedAccount) {
    return (
      <Card 
        sx={{ 
          maxWidth: 400, 
          mx: 'auto', 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}
      >
        <CardContent sx={{ textAlign: 'center', py: 3 }}>
          <CheckCircle sx={{ fontSize: 48, mb: 2, color: '#4CAF50' }} />
          <Typography variant="h6" gutterBottom>
            Wallet Connected!
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9, mb: 2 }}>
            {connectedAccount.name}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8, fontFamily: 'monospace' }}>
            {formatAddress(connectedAccount.address)}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto' }}>
      <Typography
        variant="h6"
        gutterBottom
        sx={{ textAlign: 'center', mb: 3, color: '#18171C' }}
      >
        Connect Your Wallet
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {availableWallets.map((wallet) => (
          <Card
            key={wallet.id}
            sx={{
              cursor: wallet.installed ? 'pointer' : 'default',
              border: '2px solid',
              borderColor: wallet.installed ? '#E5E7EB' : '#F3F4F6',
              '&:hover': wallet.installed ? {
                borderColor: '#FF2670',
                boxShadow: '0 4px 12px rgba(255, 38, 112, 0.15)'
              } : {},
              opacity: wallet.installed ? 1 : 0.6
            }}
            onClick={() => wallet.installed && !connecting && connectWallet(wallet.id)}
          >
            <CardContent sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'transparent', fontSize: '24px' }}>
                  {wallet.icon}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1" fontWeight={600}>
                    {wallet.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {wallet.installed ? 'Available' : 'Not installed'}
                  </Typography>
                </Box>
                {wallet.installed ? (
                  connecting ? (
                    <CircularProgress size={20} />
                  ) : (
                    <AccountBalanceWallet color="primary" />
                  )
                ) : (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(wallet.downloadUrl, '_blank');
                    }}
                  >
                    Install
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {availableWallets.every(w => !w.installed) && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            No wallet extensions detected. Please install a Polkadot wallet to continue.
          </Typography>
        </Alert>
      )}

      {/* Manual Address Input Section */}
      <Box sx={{ mt: 3 }}>
        <Divider sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Or
          </Typography>
        </Divider>
        
        <Button
          fullWidth
          variant="outlined"
          startIcon={showManualInput ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          onClick={() => setShowManualInput(!showManualInput)}
          sx={{
            mb: 2,
            borderColor: '#E5E7EB',
            color: '#6B7280',
            '&:hover': {
              borderColor: '#FF2670',
              backgroundColor: 'rgba(255, 38, 112, 0.04)'
            }
          }}
        >
          Enter address manually
        </Button>

        {showManualInput && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Polkadot Address"
              placeholder="e.g., 1xxxx... or 5xxxx..."
              value={manualAddress}
              onChange={(e) => {
                setManualAddress(e.target.value);
                setError('');
              }}
              variant="outlined"
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&.Mui-focused fieldset': {
                    borderColor: '#FF2670',
                  },
                },
              }}
            />
            
            <Button
              fullWidth
              variant="contained"
              onClick={handleManualConnect}
              disabled={loading || !manualAddress.trim()}
              sx={{
                backgroundColor: '#FF2670',
                '&:hover': {
                  backgroundColor: '#E91E63',
                },
                '&:disabled': {
                  backgroundColor: '#F3F4F6',
                  color: '#9CA3AF',
                },
              }}
            >
              {loading ? 'Connecting...' : 'Connect with Address'}
            </Button>
          </Box>
        )}
      </Box>

      <Typography
        variant="body2"
        sx={{ 
          textAlign: 'center', 
          mt: 3, 
          color: 'text.secondary',
          fontSize: '13px'
        }}
      >
        Your wallet will be used to sign transactions and manage your NFTs securely.
      </Typography>
    </Box>
  );
};

export default PAPIWalletConnector; 