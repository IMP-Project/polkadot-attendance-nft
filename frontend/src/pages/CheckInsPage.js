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
  const [isInitialLoad, setIsInitialLoad] = useState(true);
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

  // Cache keys for localStorage
  const CACHE_KEYS = {
    checkIns: 'checkIns_cache',
    stats: 'stats_cache',
    pagination: 'pagination_cache',
    lastFetch: 'checkIns_lastFetch'
  };

  // Load cached data immediately
  const loadCachedData = useCallback(() => {
    try {
      const cachedCheckIns = localStorage.getItem(CACHE_KEYS.checkIns);
      const cachedStats = localStorage.getItem(CACHE_KEYS.stats);
      const cachedPagination = localStorage.getItem(CACHE_KEYS.pagination);
      
      if (cachedCheckIns) {
        setCheckIns(JSON.parse(cachedCheckIns));
      }
      if (cachedStats) {
        setStats(JSON.parse(cachedStats));
      }
      if (cachedPagination) {
        setPagination(prev => ({ ...prev, ...JSON.parse(cachedPagination) }));
      }
    } catch (err) {
      console.warn('Failed to load cached data:', err);
    }
  }, []);

  // Save data to cache
  const saveToCache = useCallback((newCheckIns, newStats, newPagination) => {
    try {
      if (newCheckIns) {
        localStorage.setItem(CACHE_KEYS.checkIns, JSON.stringify(newCheckIns));
      }
      if (newStats) {
        localStorage.setItem(CACHE_KEYS.stats, JSON.stringify(newStats));
      }
      if (newPagination) {
        localStorage.setItem(CACHE_KEYS.pagination, JSON.stringify(newPagination));
      }
      localStorage.setItem(CACHE_KEYS.lastFetch, Date.now().toString());
    } catch (err) {
      console.warn('Failed to save to cache:', err);
    }
  }, []);

  const fetchCheckIns = useCallback(async (silent = false) => {
    if (!user) return;
    
    try {
      // Only show loading on initial load, not on background refreshes
      if (!silent && isInitialLoad) {
        setLoading(true);
      }
      
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      };
      
      const data = await api.getCheckIns(params);
      const newCheckIns = data.checkins || [];
      const newPagination = data.pagination;
      
      setCheckIns(newCheckIns);
      setPagination(prev => ({
        ...prev,
        ...newPagination
      }));
      
      // Save to cache
      saveToCache(newCheckIns, null, newPagination);
      setError(null);
      
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    } catch (err) {
      console.error('Failed to fetch check-ins:', err);
      // Only show error if we don't have cached data
      if (checkIns.length === 0) {
        setError('Failed to load check-ins');
      } else {
        console.warn('Background refresh failed, keeping cached data');
      }
    } finally {
      if (!silent && isInitialLoad) {
        setLoading(false);
      }
    }
  }, [user, pagination.page, filters, isInitialLoad, checkIns.length, saveToCache]);

  const fetchStats = useCallback(async (silent = false) => {
    if (!user) return;
    
    try {
      const data = await api.getCheckInsStats();
      setStats(data);
      
      // Save to cache
      saveToCache(null, data, null);
    } catch (err) {
      console.error('Failed to fetch check-in stats:', err);
      // Silently fail for stats if we have cached data
      if (!stats && !silent) {
        console.warn('Stats fetch failed');
      }
    }
  }, [user, stats, saveToCache]);

  // Load cached data immediately and start fetching
  useEffect(() => {
    if (!user) return;

    // Load cached data first (instant display)
    loadCachedData();

    // Initial fetch
    fetchCheckIns();
    fetchStats();

    // Set up 30-second background refresh
    const interval = setInterval(() => {
      fetchCheckIns(true); // silent refresh
      fetchStats(true);    // silent refresh
    }, 30000);

    return () => clearInterval(interval);
  }, [user, loadCachedData, fetchCheckIns, fetchStats]);

  // Effect for filter/pagination changes (immediate fetch)
  useEffect(() => {
    if (!user || isInitialLoad) return;
    
    fetchCheckIns();
  }, [filters, pagination.page]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const explorerUrl = `https://test.azero.dev/#/explorer/extrinsic/${checkIn.nft.transactionHash}`;
      window.open(explorerUrl, '_blank');
    }
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
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h4">
          Event Check-ins
        </Typography>
        {loading && !isInitialLoad && (
          <Box display="flex" alignItems="center" gap={1}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="textSecondary">
              Refreshing...
            </Typography>
          </Box>
        )}
      </Box>

      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Check-ins
                </Typography>
                <Typography variant="h4">
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
                <Typography variant="h4">
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
                <Typography variant="h4">
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
                <Typography variant="h4">
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

      {loading && isInitialLoad && checkIns.length === 0 ? (
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