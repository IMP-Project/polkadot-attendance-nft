import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  IconButton,
  Link,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  ContentCopy,
  OpenInNew,
  Check,
  Error as ErrorIcon
} from '@mui/icons-material';
import api from '../../services/api';

const TransactionDetailsModal = ({ open, onClose, transactionHash, nftData }) => {
  const [copied, setCopied] = useState(false);
  const [txDetails, setTxDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && transactionHash) {
      fetchTransactionDetails();
    }
  }, [open, transactionHash]);

  const fetchTransactionDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/blockchain/transaction/${transactionHash}`);
      setTxDetails(response.data);
    } catch (err) {
      console.error('Failed to fetch transaction details:', err);
      setError('Failed to fetch transaction details');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getPolkadotAppsUrl = () => {
    return `https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fws.test.azero.dev#/explorer/query/${transactionHash}`;
  };

  const getAlephZeroUrl = () => {
    return `https://test.azero.dev/#/explorer/extrinsic/${transactionHash}`;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Check color="success" />
          NFT Minted Successfully
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Transaction Details
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Transaction Hash
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="body1" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {transactionHash}
              </Typography>
              <IconButton 
                size="small" 
                onClick={() => handleCopy(transactionHash)}
                color={copied ? "success" : "default"}
              >
                {copied ? <Check /> : <ContentCopy />}
              </IconButton>
            </Box>
          </Box>

          {loading && (
            <Box display="flex" alignItems="center" gap={2} sx={{ my: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2">Loading transaction details...</Typography>
            </Box>
          )}

          {error && (
            <Alert severity="warning" sx={{ my: 2 }}>
              {error}
            </Alert>
          )}

          {txDetails && (
            <Box sx={{ my: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Block Number: {txDetails.blockNumber}
              </Typography>
              {txDetails.blockHash && (
                <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                  Block Hash: {txDetails.blockHash}
                </Typography>
              )}
            </Box>
          )}

          {nftData && (
            <Box sx={{ my: 2 }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                NFT Information
              </Typography>
              
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Contract NFT ID
                </Typography>
                <Typography variant="body1">
                  #{nftData.contractNftId}
                </Typography>
              </Box>

              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Event
                </Typography>
                <Typography variant="body1">
                  {nftData.eventName}
                </Typography>
              </Box>

              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Recipient
                </Typography>
                <Typography variant="body1" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {nftData.recipientAddress}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />
        
        <Typography variant="h6" gutterBottom>
          View in Block Explorer
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Link
            href={getPolkadotAppsUrl()}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <OpenInNew fontSize="small" />
            View in Polkadot.js Apps (Recommended)
          </Link>
          
          <Link
            href={getAlephZeroUrl()}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <OpenInNew fontSize="small" />
            View in Aleph Zero Explorer
          </Link>
        </Box>

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            💡 <strong>Tip:</strong> The Polkadot.js Apps interface provides more detailed transaction information and is more reliable for Aleph Zero testnet.
          </Typography>
        </Alert>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default TransactionDetailsModal; 