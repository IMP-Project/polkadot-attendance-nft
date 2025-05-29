import React, { useState, useMemo, useEffect } from 'react';
import { 
  Box, Typography, Button, Grid, Card, CardContent, 
  FormControl, Select, MenuItem, InputLabel, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Avatar, Paper, Divider, Snackbar, Alert,
  Menu, TextField
} from '@mui/material';
import { 
  Close, Person, CalendarToday, LocationOn, 
  AccountBalanceWallet, CheckCircle, Share, 
  FileDownload, PictureAsPdf
} from '@mui/icons-material';
import PageHeader from '../components/ui/PageHeader';
import { api } from '../services/api';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const NFTDesignPage = ({ nfts = [], events = [] }) => {
  const [viewMode, setViewMode] = useState('expanded'); // 'expanded' or 'collapsed'
  const [filterEvent, setFilterEvent] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const [walletVerificationOpen, setWalletVerificationOpen] = useState(false);
  const [currentNFT, setCurrentNFT] = useState(null);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [availableEvents, setAvailableEvents] = useState([]);

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

  // Apply filters and sorting
  const filteredNFTs = useMemo(() => {
    if (!nfts) return [];
    
    let result = [...nfts];
    
    // Apply event filter
    if (filterEvent !== 'all') {
      result = result.filter(nft => 
        nft.metadata && nft.metadata.event_id === filterEvent
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      if (sortOrder === 'newest') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      } else if (sortOrder === 'oldest') {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      }
      return 0;
    });
    
    return result;
  }, [nfts, filterEvent, sortOrder]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!nfts || nfts.length === 0) return {
      eventsWithNFTs: 0,
      totalNFTs: 0,
      mostPopularEventCount: 0
    };
    
    const totalNFTs = nfts.length;
    
    // Count NFTs per event
    const nftsByEvent = nfts.reduce((acc, nft) => {
      const eventName = nft.metadata?.event_name || 'Unknown Event';
      acc[eventName] = (acc[eventName] || 0) + 1;
      return acc;
    }, {});
    
    // Get most popular event count
    const mostPopularEventCount = Math.max(...Object.values(nftsByEvent), 0);
    
    return {
      eventsWithNFTs: Object.keys(nftsByEvent).length,
      totalNFTs,
      mostPopularEventCount
    };
  }, [nfts]);

  const handleExportMenuOpen = (event) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  const handleExportCSV = () => {
    const headers = ["ID", "Name", "Event", "Attendee", "Date", "Location", "Owner"];
    
    const rows = filteredNFTs.map(nft => [
      nft.id,
      nft.metadata?.name || `NFT #${nft.id}`,
      nft.metadata?.event_name || "Unknown Event",
      nft.metadata?.attendee || "Unknown",
      nft.metadata?.event_date || "N/A",
      nft.metadata?.location || "N/A",
      nft.owner || "Unknown"
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");
    
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
      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.text('NFT Attendance Report', 14, 22);
      doc.setFontSize(11);
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 30);
      
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
      
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [230, 0, 122] },
        alternateRowStyles: { fillColor: [240, 240, 240] }
      });
      
      doc.save('nft_export.pdf');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      setSnackbarMessage('Failed to export PDF');
      setShowSnackbar(true);
    }
    
    handleExportMenuClose();
  };

  const handleVerifyInWallet = (nft) => {
    setCurrentNFT(nft);
    setWalletVerificationOpen(true);
  };

  const handleShareNFT = (nft) => {
    const shareUrl = `${window.location.origin}/nft/${nft.id}`;
    
    if (navigator.share) {
      navigator.share({
        title: nft.metadata?.name || 'Attendance NFT',
        text: `Check out this Attendance NFT for ${nft.metadata?.event_name || 'an event'}`,
        url: shareUrl,
      }).catch(() => copyToClipboard(shareUrl));
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setSnackbarMessage('Link copied to clipboard!');
        setShowSnackbar(true);
      })
      .catch(() => {
        setSnackbarMessage('Failed to copy link');
        setShowSnackbar(true);
      });
  };

  return (
    <Box
      sx={{
        height: '100vh', // Force full viewport height
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
        overflowY: 'auto', // Enable vertical scroll
      }}
    >
      {/* Page Header */}
      <PageHeader 
        title="NFTs"
        subtitle="View and manage all attendance NFTs minted through your events"
        buttonText="Export"
        buttonIcon="/images/export-icon.png"
        onButtonClick={handleExportMenuOpen}
      />

      {/* Filter Bar */}
      <Box 
        sx={{ 
          px: { xs: 2, md: 4 },
          py: 2,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2
        }}
      >
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            justifyContent: { xs: 'center', md: 'flex-start' },
            gap: 2,
            mt: { xs: 1, md: 3 },
            ml: { xs: 0, md: 1 }
          }}
        >
          {/* Showing */}
          {/* Row 1: Showing */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography>Showing</Typography>
            <FormControl size="small" sx={{ minWidth: '140px' }}>
              <Select value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
                <MenuItem value="expanded">Expanded view</MenuItem>
                <MenuItem value="collapsed">Collapsed view</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Row 2: Event Select */}
          <FormControl size="small" sx={{ minWidth: '160px' }}>
            <Select value={filterEvent} onChange={(e) => setFilterEvent(e.target.value)}>
              <MenuItem value="all">All Events</MenuItem>
              {availableEvents.map(event => (
                <MenuItem key={event.id} value={event.id}>{event.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Row 3: Sort by */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography>Sort by</Typography>
            <FormControl size="small" sx={{ minWidth: '140px' }}>
              <Select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                <MenuItem value="newest">Newest first</MenuItem>
                <MenuItem value="oldest">Oldest first</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Box>

      {/* Statistics */}
      <Box sx={{ px: 4, py: 3 }}>
        <Grid 
          container 
          spacing={3} 
          justifyContent={{ xs: 'center', md: 'flex-start' }}
        >
          <Grid item xs={12} sm={6} md={4}>
            <Box
              sx={{
                width: '258px',
                height: 'auto',
                minHeight: '127px',
                borderRadius: '32px',
                padding: '24px',
                backgroundColor: '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
            >
              <Typography 
                sx={{ 
                  fontFamily: 'Manrope, sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  lineHeight: '20px',
                  letterSpacing: '-0.6%',
                  textAlign: 'center',
                  color: '#484554'
                }}
              >
                Events with NFTs
              </Typography>
              <Typography 
                variant="h1" 
                sx={{ 
                  fontWeight: 700, 
                  color: '#18171C',
                  fontSize: '48px',
                  lineHeight: 1.2,
                  fontFamily: 'Manrope, sans-serif',
                  textAlign: 'center'
                }}
              >
                {stats.eventsWithNFTs}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item>
            <Box
              sx={{
                width: '258px',
                height: 'auto',
                minHeight: '127px',
                borderRadius: '32px',
                padding: '24px',
                backgroundColor: '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
            >
              <Typography 
                sx={{ 
                  fontFamily: 'Manrope, sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  lineHeight: '20px',
                  letterSpacing: '-0.6%',
                  textAlign: 'center',
                  color: '#484554'
                }}
              >
                Minted NFTs
              </Typography>
              <Typography 
                variant="h1" 
                sx={{ 
                  fontWeight: 700, 
                  color: '#18171C',
                  fontSize: '48px',
                  lineHeight: 1.2,
                  fontFamily: 'Manrope, sans-serif',
                  textAlign: 'center'
                }}
              >
                {stats.totalNFTs}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item>
            <Box
              sx={{
                width: '258px',
                height: 'auto',
                minHeight: '127px',
                borderRadius: '32px',
                padding: '24px',
                backgroundColor: '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
            >
              <Typography 
                sx={{ 
                  fontFamily: 'Manrope, sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  lineHeight: '20px',
                  letterSpacing: '-0.6%',
                  textAlign: 'center',
                  color: '#484554'
                }}
              >
                Most popular event
              </Typography>
              <Typography 
                variant="h1" 
                sx={{ 
                  fontWeight: 700, 
                  color: '#18171C',
                  fontSize: '48px',
                  lineHeight: 1.2,
                  fontFamily: 'Manrope, sans-serif',
                  textAlign: 'center'
                }}
              >
                {stats.mostPopularEventCount}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* NFT Grid */}
      <Box sx={{ px: 4, py: 2, flex: 1 }}>
        {filteredNFTs.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
              No NFTs have been minted yet.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              NFTs will appear here when attendees check into your events.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3} justifyContent={{ xs: 'center', md: 'flex-start' }}>
            {filteredNFTs.map((nft) => (
              <Grid item xs={12} sm={6} md={3} key={nft.id}>
                <Card 
                  sx={{ 
                    borderRadius: 3,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                    }
                  }}
                >
                  {/* NFT Image */}
                  <Box 
                    sx={{ 
                      height: 200,
                      background: 'linear-gradient(135deg, #00D4AA 0%, #00B894 100%)',
                      borderRadius: '12px 12px 0 0',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Box
                      component="img"
                      src="/images/nft-character.png" // Replace with your NFT character image
                      alt="NFT Character"
                      sx={{
                        width: 120,
                        height: 120,
                        objectFit: 'contain'
                      }}
                    />
                  </Box>
                  
                  <CardContent sx={{ p: 2 }}>
                    {/* NFT Label */}
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: '#6B7280',
                        fontSize: '12px',
                        fontWeight: 500,
                        mb: 1,
                        display: 'block'
                      }}
                    >
                      Attendance NFT
                    </Typography>
                    
                    {/* NFT Title */}
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontWeight: 600,
                        fontSize: '16px',
                        color: '#18171C',
                        mb: viewMode === 'expanded' ? 2 : 1
                      }}
                    >
                      {nft.metadata?.event_name || 'PolkaDot Connect'}
                    </Typography>

                    {/* Expanded View Details */}
                    {viewMode === 'expanded' && (
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Person sx={{ fontSize: 16, color: '#6B7280', mr: 1 }} />
                          <Typography variant="body2" color="text.secondary">
                            {nft.metadata?.attendee || 'Joshua Olayot'}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <LocationOn sx={{ fontSize: 16, color: '#6B7280', mr: 1 }} />
                          <Typography variant="body2" color="text.secondary">
                            {nft.metadata?.location || 'Virtual'}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <CalendarToday sx={{ fontSize: 16, color: '#6B7280', mr: 1 }} />
                          <Typography variant="body2" color="text.secondary">
                            {nft.metadata?.event_date || '25.05.2025'}
                          </Typography>
                        </Box>
                        
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: '#6B7280',
                            fontSize: '11px',
                            wordBreak: 'break-all'
                          }}
                        >
                          {nft.owner ? `${nft.owner.slice(0, 12)}...${nft.owner.slice(-8)}` : '125qasd1bcvkey136T3qsf1Qkr1'}
                        </Typography>
                      </Box>
                    )}

                    {/* Verify Button */}
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => handleVerifyInWallet(nft)}
                      sx={{
                        borderColor: '#FF2670',
                        color: '#FF2670',
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontWeight: 500,
                        '&:hover': {
                          borderColor: '#E91E63',
                          backgroundColor: 'rgba(255, 38, 112, 0.04)',
                        },
                      }}
                    >
                      Verify
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Export Menu */}
      <Menu
        anchorEl={exportMenuAnchor}
        open={Boolean(exportMenuAnchor)}
        onClose={handleExportMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
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
            <IconButton onClick={() => setWalletVerificationOpen(false)}>
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
                    bgcolor: '#FF2670',
                    width: 60,
                    height: 60,
                    mr: 2
                  }}
                >
                  {currentNFT.id}
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {currentNFT.metadata?.name || `NFT #${currentNFT.id}`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Attendance NFT for {currentNFT.metadata?.event_name}
                  </Typography>
                </Box>
              </Box>
              
              <Paper sx={{ p: 3, mb: 3, bgcolor: 'rgba(0,0,0,0.02)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CheckCircle color="success" sx={{ mr: 1 }} />
                  <Typography variant="subtitle1" fontWeight="medium">
                    Ownership Verified
                  </Typography>
                </Box>
                
                <Typography variant="body2" paragraph>
                  This NFT is owned by the following wallet address:
                </Typography>
                
                <Box sx={{ 
                  p: 2, 
                  bgcolor: 'rgba(0,0,0,0.05)', 
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
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setWalletVerificationOpen(false)}
            variant="contained"
            sx={{ backgroundColor: '#FF2670' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
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
    </Box>
  );
};

export default NFTDesignPage;