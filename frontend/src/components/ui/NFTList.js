import React, { useState, useMemo, useEffect } from 'react';
import {
  Grid, Card, CardContent, Typography, Box, Avatar, Chip,
  Paper, Divider, useTheme, TextField, InputAdornment,
  MenuItem, Select, FormControl, InputLabel, Stack,
  IconButton, Tooltip, Switch, FormControlLabel,
  Button, Menu, Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert
} from '@mui/material';
import {
  Verified, LocationOn, CalendarToday, Person, AccountBalanceWallet,
  Search, FilterList, BarChart, Refresh, Sort, Download,
  PictureAsPdf, FileDownload, Share, DateRange, Close, QrCode,
  Wallet, CheckCircle
} from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import NFTStatisticsCharts from './NFTStatisticsCharts';
import { api } from '../services/api';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

function NFTList({ nfts, events = [] }) {
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEvent, setFilterEvent] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [showStats, setShowStats] = useState(true);
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showCharts, setShowCharts] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [availableEvents, setAvailableEvents] = useState([]);
  const [walletVerificationOpen, setWalletVerificationOpen] = useState(false);
  const [currentNFT, setCurrentNFT] = useState(null);

  // Fetch events for the filter dropdown if not provided
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const eventsData = await api.getEvents();
        setAvailableEvents(eventsData);
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };
    
    if (events.length === 0) {
      fetchEvents();
    } else {
      setAvailableEvents(events);
    }
  }, [events]);

  // Apply filters and search
  const filteredNFTs = useMemo(() => {
    if (!nfts) return [];
    
    let result = [...nfts];
    
    // Apply event filter
    if (filterEvent !== 'all') {
      result = result.filter(nft => 
        nft.metadata && nft.metadata.event_id === filterEvent
      );
    }
    
    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(nft => 
        (nft.metadata && nft.metadata.name && nft.metadata.name.toLowerCase().includes(term)) ||
        (nft.metadata && nft.metadata.attributes && 
          nft.metadata.attributes.some(attr => 
            attr.value && attr.value.toString().toLowerCase().includes(term)
          )
        )
      );
    }
    
    // Apply date range filter
    if (startDate || endDate) {
      result = result.filter(nft => {
        const nftDate = nft.created_at ? new Date(nft.created_at) : null;
        if (!nftDate) return false;

        if (startDate && endDate) {
          return nftDate >= startDate && nftDate <= endDate;
        } else if (startDate) {
          return nftDate >= startDate;
        } else if (endDate) {
          return nftDate <= endDate;
        }
        return true;
      });
    }
    
    // Apply sorting
    result.sort((a, b) => {
      if (sortOrder === 'newest') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      } else if (sortOrder === 'oldest') {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      } else if (sortOrder === 'id-asc') {
        return a.id - b.id;
      } else if (sortOrder === 'id-desc') {
        return b.id - a.id;
      }
      return 0;
    });
    
    return result;
  }, [nfts, filterEvent, searchTerm, sortOrder, startDate, endDate]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!nfts || nfts.length === 0) return null;
    
    const totalNFTs = nfts.length;
    
    // Count NFTs per event
    const nftsByEvent = nfts.reduce((acc, nft) => {
      const eventName = nft.metadata.event_name || 'Unknown Event';
      acc[eventName] = (acc[eventName] || 0) + 1;
      return acc;
    }, {});
    
    // Get most popular event
    let mostPopularEvent = { name: 'None', count: 0 };
    Object.entries(nftsByEvent).forEach(([name, count]) => {
      if (count > mostPopularEvent.count) {
        mostPopularEvent = { name, count };
      }
    });
    
    // Create date map (past 7 days)
    const last7Days = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      last7Days[dateString] = 0;
    }
    
    // Count NFTs by day (past 7 days)
    nfts.forEach(nft => {
      const createdDate = nft.created_at ? new Date(nft.created_at).toISOString().split('T')[0] : null;
      if (createdDate && last7Days[createdDate] !== undefined) {
        last7Days[createdDate]++;
      }
    });
    
    return {
      totalNFTs,
      nftsByEvent,
      mostPopularEvent,
      recentActivity: last7Days
    };
  }, [nfts]);

  const handleExportMenuOpen = (event) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  const handleExportCSV = () => {
    // In production, this would generate and download a CSV file
    // For now, we're just mocking the functionality
    
    const headers = ["ID", "Name", "Event", "Attendee", "Date", "Location", "Owner"];
    
    // Convert NFT data to CSV rows
    const rows = filteredNFTs.map(nft => [
      nft.id,
      nft.metadata.name || `NFT #${nft.id}`,
      nft.metadata.event_name || "Unknown Event",
      nft.metadata.attendee || "Unknown",
      nft.metadata.event_date || "N/A",
      nft.metadata.location || "N/A",
      nft.owner || "Unknown"
    ]);
    
    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'nft_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    handleExportMenuClose();
  };

  const handleExportPDF = () => {
    try {
      // Create a new PDF document
      const doc = new jsPDF();
      
      // Add a title
      doc.setFontSize(18);
      doc.text('NFT Attendance Report', 14, 22);
      doc.setFontSize(11);
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 30);
      
      // Format data for the table
      const tableColumn = ["ID", "Name", "Event", "Attendee", "Date", "Location", "Owner"];
      const tableRows = filteredNFTs.map(nft => [
        nft.id,
        nft.metadata?.name || `NFT #${nft.id}`,
        nft.metadata?.event_name || "Unknown Event",
        nft.metadata?.attendee || "Unknown",
        nft.metadata?.event_date || "N/A",
        nft.metadata?.location || "N/A",
        nft.owner ? `${nft.owner.slice(0, 6)}...${nft.owner.slice(-4)}` : "Unknown"
      ]);
      
      // Generate the table
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [230, 0, 122] },
        alternateRowStyles: { fillColor: [240, 240, 240] }
      });
      
      // Add a footer
      const pageCount = doc.internal.getNumberOfPages();
      for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text(`Page ${i} of ${pageCount} - Polkadot Attendance NFT System`, 14, doc.internal.pageSize.height - 10);
      }
      
      // Save the PDF
      doc.save('nft_export.pdf');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      setSnackbarMessage('Failed to export PDF');
      setShowSnackbar(true);
    }
    
    handleExportMenuClose();
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterEvent('all');
    setSortOrder('newest');
    setStartDate(null);
    setEndDate(null);
  };

  const handleShareNFT = (nft) => {
    // Create shareable URL
    const shareUrl = `${window.location.origin}/nft/${nft.id}`;
    
    // Try to use the Web Share API if available
    if (navigator.share) {
      navigator.share({
        title: nft.metadata?.name || 'Attendance NFT',
        text: `Check out this Attendance NFT for ${nft.metadata?.attributes?.find(a => a.trait_type === 'Event')?.value || 'an event'}`,
        url: shareUrl,
      })
      .catch(error => {
        console.error('Error sharing:', error);
        copyToClipboard(shareUrl);
      });
    } else {
      // Fallback to clipboard
      copyToClipboard(shareUrl);
    }
  };
  
  const handleVerifyInWallet = (nft) => {
    setCurrentNFT(nft);
    setWalletVerificationOpen(true);
  };
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setSnackbarMessage('Link copied to clipboard!');
        setShowSnackbar(true);
      })
      .catch(err => {
        console.error('Failed to copy:', err);
        setSnackbarMessage('Failed to copy link');
        setShowSnackbar(true);
      });
  };

  if (!nfts || nfts.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6, bgcolor: 'background.paper', borderRadius: 2 }}>
        <Typography variant="body1" color="text.secondary">
          No NFTs have been minted yet.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Statistics */}
      {showStats && stats && (
        <Paper 
          sx={{ 
            p: 3, 
            mb: 4, 
            borderRadius: 2,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(45, 45, 45, 0.85)' 
              : 'rgba(255, 255, 255, 0.85)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
              <BarChart sx={{ mr: 1 }} /> NFT Statistics
            </Typography>
            <Box>
              <Tooltip title={showCharts ? "Hide Charts" : "Show Charts"}>
                <IconButton 
                  size="small" 
                  onClick={() => setShowCharts(!showCharts)}
                  sx={{ 
                    bgcolor: showCharts ? 'primary.main' : 'transparent',
                    color: showCharts ? 'white' : 'inherit',
                    '&:hover': {
                      bgcolor: showCharts ? 'primary.dark' : 'rgba(0,0,0,0.04)',
                    },
                    mr: 1
                  }}
                >
                  <BarChart />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export Data">
                <IconButton size="small" onClick={handleExportMenuOpen}>
                  <Download />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h3" color="primary" sx={{ mb: 1, fontWeight: 'bold' }}>
                  {stats.totalNFTs}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total NFTs Minted
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
                  {stats.mostPopularEvent.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Most Popular Event ({stats.mostPopularEvent.count} NFTs)
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
                  {Object.keys(stats.nftsByEvent).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Events with NFTs
                </Typography>
              </Box>
            </Grid>
          </Grid>
          
          {showCharts && (
            <Box sx={{ mt: 3 }}>
              <NFTStatisticsCharts stats={stats} />
            </Box>
          )}
        </Paper>
      )}
      
      {/* Filters */}
      <Box sx={{ mb: 4 }}>
        <Paper 
          sx={{ 
            p: 2, 
            borderRadius: 2,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(45, 45, 45, 0.85)' 
              : 'rgba(255, 255, 255, 0.85)',
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search by name, owner, or attendee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                size="small"
              />
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Filter by Event</InputLabel>
                <Select
                  value={filterEvent}
                  onChange={(e) => setFilterEvent(e.target.value)}
                  label="Filter by Event"
                >
                  <MenuItem value="all">All Events</MenuItem>
                  {availableEvents.map(event => (
                    <MenuItem key={event.id} value={event.id}>
                      {event.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  label="Sort By"
                >
                  <MenuItem value="newest">Newest First</MenuItem>
                  <MenuItem value="oldest">Oldest First</MenuItem>
                  <MenuItem value="id-asc">ID (Low to High)</MenuItem>
                  <MenuItem value="id-desc">ID (High to Low)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<DateRange />}
                onClick={() => setDateRangeOpen(true)}
                size="medium"
                sx={{ height: '40px' }}
              >
                {startDate || endDate ? 'Date Filter Applied' : 'Date Range'}
              </Button>
            </Grid>
            
            <Grid item xs={12} md={1} sx={{ display: 'flex', justifyContent: 'center' }}>
              <Tooltip title="Reset Filters">
                <IconButton 
                  onClick={handleResetFilters}
                >
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Switch 
                  checked={showStats}
                  onChange={() => setShowStats(!showStats)}
                  size="small"
                />
              }
              label="Show Statistics"
            />
            
            <Typography variant="body2" color="text.secondary">
              Showing {filteredNFTs.length} of {nfts.length} NFTs
            </Typography>
          </Box>
        </Paper>
      </Box>
      
      {/* NFT Grid */}
      <Grid container spacing={3}>
        {filteredNFTs.map((nft) => (
          <Grid item xs={12} sm={6} md={4} key={nft.id}>
            <Card 
              elevation={2} 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                borderRadius: 2,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                }
              }}
            >
              <Box 
                sx={{ 
                  height: 180, 
                  background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.secondary.main} 100%)`,
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 2,
                  color: 'white'
                }}
              >
                <Tooltip title="Share NFT">
                  <IconButton 
                    sx={{ 
                      position: 'absolute', 
                      top: 10, 
                      right: 10, 
                      color: 'white',
                      bgcolor: 'rgba(255,255,255,0.2)',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.3)',
                      }
                    }}
                    onClick={() => handleShareNFT(nft)}
                  >
                    <Share fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Verified 
                  sx={{ 
                    position: 'absolute', 
                    top: 10, 
                    left: 10, 
                    fontSize: 28,
                    filter: 'drop-shadow(0px 2px 5px rgba(0,0,0,0.2))'
                  }} 
                />
                <Avatar 
                  sx={{ 
                    bgcolor: 'white', 
                    color: theme.palette.primary.main,
                    width: 80,
                    height: 80,
                    boxShadow: '0px 4px 12px rgba(0,0,0,0.15)',
                    fontSize: 40,
                    fontWeight: 'bold'
                  }}
                >
                  {nft.id}
                </Avatar>
              </Box>
              
              <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 3 }}>
                <Box sx={{ mb: 1 }}>
                  <Chip 
                    label="Attendance NFT" 
                    size="small" 
                    color="secondary" 
                    sx={{ mb: 1 }} 
                  />
                  <Typography variant="h6" component="h3" gutterBottom>
                    {nft.metadata.name || `NFT #${nft.id}`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {nft.metadata.description || 'No description'}
                  </Typography>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ mt: 'auto' }}>
                  <DetailItem
                    icon={<Person sx={{ color: theme.palette.primary.main }} />}
                    label="Attendee"
                    value={nft.metadata.attendee}
                  />
                  <DetailItem
                    icon={<CalendarToday sx={{ color: theme.palette.primary.main }} />}
                    label="Event Date"
                    value={nft.metadata.event_date}
                  />
                  <DetailItem
                    icon={<LocationOn sx={{ color: theme.palette.primary.main }} />}
                    label="Location"
                    value={nft.metadata.location}
                  />
                  <DetailItem
                    icon={<AccountBalanceWallet sx={{ color: theme.palette.primary.main }} />}
                    label="Owner"
                    value={nft.owner ? `${nft.owner.slice(0, 6)}...${nft.owner.slice(-4)}` : 'Unknown'}
                  />
                </Box>
                
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Wallet />}
                  onClick={() => handleVerifyInWallet(nft)}
                  sx={{ mt: 2 }}
                >
                  Verify in Wallet
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {/* No results message */}
      {filteredNFTs.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6, bgcolor: 'background.paper', borderRadius: 2 }}>
          <Typography variant="body1" color="text.secondary">
            No NFTs match your search criteria. Try adjusting your filters.
          </Typography>
        </Box>
      )}

      {/* Export Menu */}
      <Menu
        anchorEl={exportMenuAnchor}
        open={Boolean(exportMenuAnchor)}
        onClose={handleExportMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleExportCSV}>
          <FileDownload sx={{ mr: 1 }} fontSize="small" />
          Export as CSV
        </MenuItem>
        <MenuItem onClick={handleExportPDF}>
          <PictureAsPdf sx={{ mr: 1 }} fontSize="small" />
          Export as PDF
        </MenuItem>
      </Menu>

      {/* Date Range Dialog */}
      <Dialog 
        open={dateRangeOpen} 
        onClose={() => setDateRangeOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Filter by Date Range</Typography>
            <IconButton edge="end" color="inherit" onClick={() => setDateRangeOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ mb: 2, mt: 1 }}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(newValue) => setStartDate(newValue)}
                renderInput={(params) => <TextField {...params} fullWidth />}
                maxDate={endDate || undefined}
              />
            </Box>
            <Box sx={{ mb: 2 }}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(newValue) => setEndDate(newValue)}
                renderInput={(params) => <TextField {...params} fullWidth />}
                minDate={startDate || undefined}
              />
            </Box>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setStartDate(null);
            setEndDate(null);
          }} color="inherit">
            Clear
          </Button>
          <Button onClick={() => setDateRangeOpen(false)} variant="contained">
            Apply
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={showSnackbar}
        autoHideDuration={4000}
        onClose={() => setShowSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setShowSnackbar(false)} severity="success">
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* Wallet Verification Dialog */}
      <Dialog
        open={walletVerificationOpen}
        onClose={() => setWalletVerificationOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Wallet Verification</Typography>
            <IconButton edge="end" color="inherit" onClick={() => setWalletVerificationOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {currentNFT && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar
                  sx={{
                    bgcolor: theme.palette.primary.main,
                    width: 60,
                    height: 60,
                    mr: 2
                  }}
                >
                  {currentNFT.id}
                </Avatar>
                <Box>
                  <Typography variant="h6">{currentNFT.metadata?.name || `NFT #${currentNFT.id}`}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Attendance NFT for {currentNFT.metadata?.event_name}
                  </Typography>
                </Box>
              </Box>
              
              <Paper sx={{ p: 3, mb: 3, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CheckCircle color="success" sx={{ mr: 1 }} />
                  <Typography variant="subtitle1" fontWeight="medium">Ownership Verified</Typography>
                </Box>
                
                <Typography variant="body2" paragraph>
                  This NFT is owned by the following wallet address:
                </Typography>
                
                <Box sx={{ 
                  p: 2, 
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)', 
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  wordBreak: 'break-all'
                }}>
                  {currentNFT.owner}
                </Box>
                
                <Typography variant="body2" sx={{ mt: 2 }}>
                  In a production environment, this would show the NFT on the actual blockchain 
                  and allow you to verify ownership through a blockchain explorer.
                </Typography>
              </Paper>
              
              <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                <Box sx={{ mr: 4, mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">Token ID</Typography>
                  <Typography variant="body2" fontWeight="medium">{currentNFT.id}</Typography>
                </Box>
                
                <Box sx={{ mr: 4, mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">Event</Typography>
                  <Typography variant="body2" fontWeight="medium">{currentNFT.metadata?.event_name}</Typography>
                </Box>
                
                <Box sx={{ mr: 4, mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">Created</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {new Date(currentNFT.created_at).toLocaleDateString()}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">Standard</Typography>
                  <Typography variant="body2" fontWeight="medium">Polkadot NFT</Typography>
                </Box>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setWalletVerificationOpen(false)}
            variant="contained"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function DetailItem({ icon, label, value }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
      <Box sx={{ mr: 1.5 }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary" component="div">
          {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {value || 'N/A'}
        </Typography>
      </Box>
    </Box>
  );
}

export default NFTList;