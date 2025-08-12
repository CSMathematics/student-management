// src/pages/DashboardHeader.jsx
import React from 'react';
import { AppBar, Toolbar, Typography, Box, IconButton } from '@mui/material';
import { useTheme } from '../context/ThemeContext';
import { Brightness7, Brightness2 } from '@mui/icons-material';

function DashboardHeader({ pageTitle, onBackClick, showBackButton, toggleTheme }) {
    const { mode } = useTheme();

    return (
        <AppBar position="static" color="transparent" elevation={0} sx={{ marginBottom: '0px' }}>
            <Toolbar sx={{ justifyContent: 'space-between', p: '0 !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '0px' }}>
                    {showBackButton && (
                        <IconButton
                            size="large"
                            edge="start"
                            color="inherit"
                            aria-label="back"
                            onClick={onBackClick}
                        >
                            <i className="fas fa-arrow-left"></i>
                        </IconButton>
                    )}
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1, display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: '8px' }}>
                        <i className="fas fa-school"></i> {pageTitle}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    {/* --- ΤΟ ΕΙΚΟΝΙΔΙΟ ΤΗΣ ΚΑΜΠΑΝΑΣ ΑΦΑΙΡΕΘΗΚΕ ΑΠΟ ΕΔΩ --- */}
                    <IconButton color="inherit" title="Messages">
                        <i className="fas fa-envelope"></i>
                    </IconButton>
                    <IconButton color="inherit" title="User Profile">
                        <i className="fas fa-user-circle"></i>
                    </IconButton>
                    <IconButton sx={{ ml: 1 }} onClick={toggleTheme} color="inherit" title="Εναλλαγή Θέματος">
                        {mode === 'dark' ? <Brightness7 /> : <Brightness2 />}
                    </IconButton>
                </Box>
            </Toolbar>
        </AppBar>
    );
}

export default DashboardHeader;
