import React, { useState } from 'react';
import { 
  Box, Typography, Stepper, Step, StepLabel, Button,
  Paper, Card, CardContent, TextField, CircularProgress,
  Alert, Divider, Grid, StepContent, Link, IconButton, 
  Tooltip, useTheme, Dialog, DialogContent, DialogTitle,
  DialogActions
} from '@mui/material';
import {
  Link as LinkIcon, CheckCircle, InfoOutlined, FileCopy,
  Webhook, ContentCopy, PlayArrow, Close, Mail
} from '@mui/icons-material';

// Mock API url that would be configured in a real environment
const WEBHOOK_URL = 'https://your-domain.com/api/webhook/check-in';

function WebhookSetup({ eventId, eventName }) {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [webhookStatus, setWebhookStatus] = useState('not_configured');
  const [webhookTesting, setWebhookTesting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setWebhookStatus('not_configured');
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(WEBHOOK_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestWebhook = () => {
    setWebhookTesting(true);
    
    // Simulate webhook test
    setTimeout(() => {
      setWebhookStatus('configured');
      setWebhookTesting(false);
      handleNext();
    }, 1500);
  };

  const handleSendEmail = () => {
    // In production, this would send the actual instructions via email
    setEmailSent(true);
    setTimeout(() => {
      setEmailDialogOpen(false);
      setEmailSent(false);
      setEmailAddress('');
    }, 1500);
  };

  const steps = [
    {
      label: 'Go to Luma Dashboard',
      description: 'Log in to your Luma dashboard and select the event you want to connect.',
      content: (
        <Box>
          <Typography variant="body2" paragraph>
            1. Open your web browser and go to <Link href="https://lu.ma/dashboard" target="_blank">https://lu.ma/dashboard</Link>
          </Typography>
          <Typography variant="body2" paragraph>
            2. Log in to your Luma account
          </Typography>
          <Typography variant="body2">
            3. Find and select the event "<strong>{eventName || 'Your Event'}</strong>"
          </Typography>
          
          <Alert severity="info" sx={{ mt: 3 }}>
            Make sure you have admin access to the event in Luma.
          </Alert>
        </Box>
      )
    },
    {
      label: 'Set Up Webhook in Luma',
      description: 'Configure a webhook in Luma to notify our system when attendees check in.',
      content: (
        <Box>
          <Typography variant="body2" paragraph>
            1. In your Luma event dashboard, go to <strong>Settings</strong> → <strong>Integrations</strong>
          </Typography>
          <Typography variant="body2" paragraph>
            2. Find the <strong>Webhooks</strong> section and click <strong>Add Webhook</strong>
          </Typography>
          <Typography variant="body2" paragraph>
            3. In the URL field, paste the following webhook URL:
          </Typography>
          
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.03)', 
            p: 2, 
            borderRadius: 1,
            mb: 2 
          }}>
            <Typography 
              variant="body2" 
              sx={{ 
                fontFamily: 'monospace', 
                flexGrow: 1,
                wordBreak: 'break-all'
              }}
            >
              {WEBHOOK_URL}
            </Typography>
            <Tooltip title={copied ? "Copied!" : "Copy webhook URL"}>
              <IconButton onClick={handleCopyWebhook} size="small">
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Typography variant="body2" paragraph>
            4. For <strong>Webhook Events</strong>, select <strong>"Check-in Created"</strong>
          </Typography>
          <Typography variant="body2" paragraph>
            5. Click <strong>Save</strong> to activate the webhook
          </Typography>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              startIcon={<Mail />}
              onClick={() => setEmailDialogOpen(true)}
            >
              Email Instructions
            </Button>
            
            <Button
              variant="contained"
              startIcon={webhookTesting ? <CircularProgress size={20} /> : <PlayArrow />}
              onClick={handleTestWebhook}
              disabled={webhookTesting}
            >
              {webhookTesting ? 'Testing...' : 'Test Connection'}
            </Button>
          </Box>
        </Box>
      )
    },
    {
      label: 'Verify Connection',
      description: 'Make sure the connection is working properly.',
      content: (
        <Box>
          {webhookStatus === 'configured' ? (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <CheckCircle color="success" sx={{ fontSize: 60, mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Webhook Successfully Configured!
              </Typography>
              <Typography variant="body2" paragraph>
                Your Luma event is now connected to the NFT system. When attendees check in,
                they will automatically receive attendance NFTs.
              </Typography>
              <Alert severity="success" sx={{ mt: 2 }}>
                The system is ready to mint NFTs for event attendees.
              </Alert>
            </Box>
          ) : (
            <Box>
              <Typography variant="body2" paragraph>
                To verify the connection is working properly:
              </Typography>
              <Typography variant="body2" paragraph>
                1. In Luma, go to the attendee list for your event
              </Typography>
              <Typography variant="body2" paragraph>
                2. Check in a test attendee (perhaps yourself)
              </Typography>
              <Typography variant="body2" paragraph>
                3. Return here and click "Test Connection" to verify the webhook is working
              </Typography>
              
              <Button
                variant="contained"
                color="primary"
                startIcon={webhookTesting ? <CircularProgress size={20} /> : <PlayArrow />}
                onClick={handleTestWebhook}
                disabled={webhookTesting}
                sx={{ mt: 2 }}
              >
                {webhookTesting ? 'Testing...' : 'Test Connection'}
              </Button>
            </Box>
          )}
        </Box>
      )
    }
  ];

  return (
    <Box>
      <Paper
        sx={{
          p: 3,
          borderRadius: 2,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          backgroundColor: theme.palette.mode === 'dark' 
            ? 'rgba(45, 45, 45, 0.85)' 
            : 'rgba(255, 255, 255, 0.85)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Webhook sx={{ mr: 1.5, color: 'primary.main' }} />
          <Typography variant="h6">
            Configure Event Webhook
          </Typography>
        </Box>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          This wizard will help you connect Luma with our NFT system so attendees automatically receive NFTs when they check in.
        </Alert>
        
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel>
                <Typography variant="subtitle1">
                  {step.label}
                </Typography>
              </StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {step.description}
                </Typography>
                <Box sx={{ mb: 2 }}>
                  {step.content}
                </Box>
                <Box sx={{ mb: 2, mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                  <Button
                    disabled={index === 0}
                    onClick={handleBack}
                    variant="outlined"
                  >
                    Back
                  </Button>
                  {index === steps.length - 1 && webhookStatus === 'configured' && (
                    <Button onClick={handleReset} variant="contained">
                      Done
                    </Button>
                  )}
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Paper>
      
      {/* Email Instructions Dialog */}
      <Dialog 
        open={emailDialogOpen} 
        onClose={() => !emailSent && setEmailDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Email Setup Instructions</Typography>
            <IconButton 
              onClick={() => setEmailDialogOpen(false)}
              disabled={emailSent}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {!emailSent ? (
            <Box sx={{ py: 1 }}>
              <Typography variant="body2" paragraph>
                Enter an email address to send the setup instructions to your team member who manages Luma:
              </Typography>
              
              <TextField
                label="Email Address"
                variant="outlined"
                fullWidth
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="team@example.com"
                sx={{ mb: 2 }}
              />
              
              <Alert severity="info">
                We'll send step-by-step instructions with screenshots to help them configure the webhook in Luma.
              </Alert>
            </Box>
          ) : (
            <Box sx={{ py: 2, textAlign: 'center' }}>
              <CheckCircle color="success" sx={{ fontSize: 50, mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Instructions Sent!
              </Typography>
              <Typography variant="body2">
                Setup instructions have been sent to {emailAddress}
              </Typography>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          {!emailSent ? (
            <>
              <Button onClick={() => setEmailDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="contained" 
                onClick={handleSendEmail}
                disabled={!emailAddress}
              >
                Send Instructions
              </Button>
            </>
          ) : (
            <Button onClick={() => {
              setEmailDialogOpen(false);
              setEmailSent(false);
              setEmailAddress('');
            }}>
              Close
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default WebhookSetup; 