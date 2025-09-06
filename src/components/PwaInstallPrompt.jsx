import React, { useState, useEffect } from 'react';
import { Button, Snackbar, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';

function PwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      // Prevent the mini-infobar from appearing on mobile
      event.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPrompt(event);
      // Show the installation snackbar
      setOpen(true);
      console.log('PWA install prompt captured.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) {
      return;
    }
    // Show the browser's installation prompt
    const result = await installPrompt.prompt();
    console.log(`Install prompt outcome: ${result.outcome}`);
    // We've used the prompt, so we can't use it again
    setInstallPrompt(null);
    // Hide the snackbar
    setOpen(false);
  };

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  if (!open || !installPrompt) {
    return null;
  }

  return (
    <Snackbar
      open={open}
      onClose={handleClose}
      message="Εγκαταστήστε την εφαρμογή στη συσκευή σας"
      action={
        <>
          <Button
            color="secondary"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={handleInstallClick}
          >
            Εγκατάσταση
          </Button>
          <IconButton
            size="small"
            aria-label="close"
            color="inherit"
            onClick={handleClose}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </>
      }
    />
  );
}

export default PwaInstallPrompt;

