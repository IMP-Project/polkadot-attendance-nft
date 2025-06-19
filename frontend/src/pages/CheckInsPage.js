import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Chip,
  Button,
  Alert,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import { format } from 'date-fns';
import { api } from '../services/api';

const CheckInsPage = () => {
  const user = api.isAuthenticated() ? { walletAddress: localStorage.getItem('wallet_address') } : null;
  const [checkIns, setCheckIns] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    hasValidWallet: '',
    eventId: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  const fetchCheckIns = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      };
      
      const data = await api.getCheckIns(params);
      setCheckIns(data.checkins || []);
      setPagination(prev => ({
        ...prev,
        ...data.pagination
      }));
      setError(null);
    } catch (err) {
      console.error('Failed to fetch check-ins:', err);
      setError('Failed to load check-ins');
    } finally {
      setLoading(false);
    }
  }, [user, pagination.page, filters]);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    
    try {
      const data = await api.getCheckInsStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch check-in stats:', err);
    }
  }, [user]);

  // Initial data loading on component mount
  useEffect(() => {
    if (user) {
      fetchCheckIns();
      fetchStats();
    }
  }, [user, fetchCheckIns, fetchStats]);

  // Smart refresh: Check for updates only when there might be new data
  useEffect(() => {
    let isActive = true;
    let timeoutId;

    const checkForUpdates = async () => {
      if (!isActive || !user) return;

      try {
        // Check if there are any recent check-ins (last 2 minutes)
        const currentStats = await api.getCheckInsStats();
        
        // Compare with previous stats to see if anything changed
        if (stats && (
          currentStats.totalCheckins !== stats.totalCheckins ||
          currentStats.minting.pending !== stats.minting.pending ||
          currentStats.minting.completed !== stats.minting.completed ||
          currentStats.minting.failed !== stats.minting.failed
        )) {
          console.log('📊 Check-in data changed, refreshing...');
          fetchCheckIns();
          fetchStats();
        }
      } catch (error) {
        console.log('Error checking for updates:', error);
      }

      // Check again in 15 seconds (reduced from 30)
      if (isActive) {
        timeoutId = setTimeout(checkForUpdates, 15000);
      }
    };

    // Start checking after initial load
    if (stats) {
      timeoutId = setTimeout(checkForUpdates, 15000);
    }

    return () => {
      isActive = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user, stats, fetchCheckIns, fetchStats]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'PENDING': return 'warning';
      case 'FAILED': return 'error';
      case 'SKIPPED': return 'default';
      default: return 'default';
    }
  };

  const formatDate = (dateString) => {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleStatusClick = (checkIn) => {
    if (checkIn.nftMintStatus === 'COMPLETED' && checkIn.nft?.transactionHash) {
      const explorerUrl = `https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Froc-contracts-rpc.polkadot.io#/explorer/query/${checkIn.nft.transactionHash}`;
      window.open(explorerUrl, '_blank');
    }
  };

  const handleManualRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    fetchCheckIns();
    fetchStats();
  };

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="warning">Please connect your wallet to view check-ins.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h3" gutterBottom sx={{ fontSize: '28px' }}>
          Event Check-ins
        </Typography>
        <Button 
          variant="outlined" 
          onClick={handleManualRefresh}
          disabled={loading}
          sx={{ minWidth: 120 }}
        >
          {loading ? <CircularProgress size={20} /> : 'Refresh'}
        </Button>
      </Box>

      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Check-ins
                </Typography>
                <Typography variant="h3" sx={{ fontSize: '32px' }}>
                  {stats.totalCheckins}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  With Wallet Address
                </Typography>
                <Typography variant="h3" sx={{ fontSize: '32px' }}>
                  {stats.validWalletCheckins}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  NFTs Minted
                </Typography>
                <Typography variant="h3" sx={{ fontSize: '32px' }}>
                  {stats.minting.completed}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Pending Mints
                </Typography>
                <Typography variant="h3" sx={{ fontSize: '32px' }}>
                  {stats.minting.pending}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filters
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>NFT Status</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                label="NFT Status"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="PENDING">Pending</MenuItem>
                <MenuItem value="COMPLETED">Completed</MenuItem>
                <MenuItem value="FAILED">Failed</MenuItem>
                <MenuItem value="SKIPPED">Skipped</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Wallet Status</InputLabel>
              <Select
                value={filters.hasValidWallet}
                onChange={(e) => handleFilterChange('hasValidWallet', e.target.value)}
                label="Wallet Status"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="true">Has Wallet</MenuItem>
                <MenuItem value="false">No Wallet</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button 
              variant="outlined" 
              onClick={() => {
                setFilters({ status: '', hasValidWallet: '', eventId: '' });
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              sx={{ height: '56px' }}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Attendee</TableCell>
                  <TableCell>Event</TableCell>
                  <TableCell>Check-in Time</TableCell>
                  <TableCell>Wallet Address</TableCell>
                  <TableCell>NFT Status</TableCell>
                  <TableCell>Location</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {checkIns.map((checkIn) => (
                  <TableRow key={checkIn.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {checkIn.attendeeName}
                        </Typography>
                        {checkIn.attendeeEmail && (
                          <Typography variant="caption" color="textSecondary">
                            {checkIn.attendeeEmail}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {checkIn.event.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(checkIn.checkedInAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {checkIn.walletAddress ? (
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontFamily: 'monospace',
                            wordBreak: 'break-all'
                          }}
                        >
                          {checkIn.walletAddress.length > 20 
                            ? `${checkIn.walletAddress.slice(0, 10)}...${checkIn.walletAddress.slice(-10)}`
                            : checkIn.walletAddress
                          }
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          No wallet address
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={checkIn.nftMintStatus}
                        color={getStatusColor(checkIn.nftMintStatus)}
                        size="small"
                        onClick={() => handleStatusClick(checkIn)}
                        sx={{
                          cursor: checkIn.nftMintStatus === 'COMPLETED' && checkIn.nft?.transactionHash ? 'pointer' : 'default',
                          '&:hover': checkIn.nftMintStatus === 'COMPLETED' && checkIn.nft?.transactionHash ? {
                            backgroundColor: 'rgba(76, 175, 80, 0.1)',
                          } : {}
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {checkIn.location || 'N/A'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {checkIns.length === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center', mt: 2 }}>
              <Typography variant="h6" color="textSecondary">
                No check-ins found
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Check-ins will appear here when attendees check in to your events via Luma.
              </Typography>
            </Paper>
          )}

          {pagination.pages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Button
                disabled={pagination.page === 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                sx={{ mr: 1 }}
              >
                Previous
              </Button>
              <Typography variant="body2" sx={{ mx: 2, alignSelf: 'center' }}>
                Page {pagination.page} of {pagination.pages}
              </Typography>
              <Button
                disabled={pagination.page === pagination.pages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                sx={{ ml: 1 }}
              >
                Next
              </Button>
            </Box>
          )}
        </>
      )}
    </Container>
  );
};

export default CheckInsPage;