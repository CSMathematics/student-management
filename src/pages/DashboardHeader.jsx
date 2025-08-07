// src/pages/DashboardHeader.jsx
import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, IconButton } from '@mui/material';
import { useTheme } from '../context/ThemeContext'; // <-- ΕΙΣΑΓΩΓΗ του useTheme
import { Brightness4, Brightness7 } from '@mui/icons-material'; // <-- Εικονίδια για light/dark

// --- ΑΛΛΑΓΗ: Προσθέτουμε το toggleTheme στα props ---
function DashboardHeader({ pageTitle, onBackClick, showBackButton, toggleTheme }) {
    const { mode } = useTheme(); // <-- Παίρνουμε την τρέχουσα κατάσταση του θέματος

    return (
        // --- ΑΛΛΑΓΗ: Το AppBar δεν χρειάζεται πλέον inline styling, θα το πάρει από το θέμα ---
        <AppBar position="static" color="transparent" elevation={0} sx={{ marginBottom: '0px' }}>
            <Toolbar sx={{ justifyContent: 'space-between' }}>
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
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fas fa-school"></i> {pageTitle} <small>...........</small>
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <IconButton color="inherit" title="Notifications">
                        <i className="fas fa-bell"></i>
                    </IconButton>
                    <IconButton color="inherit" title="Messages">
                        <i className="fas fa-envelope"></i>
                    </IconButton>
                    <IconButton color="inherit" title="User Profile">
                        <i className="fas fa-user-circle"></i>
                    </IconButton>
                    {/* --- ΑΛΛΑΓΗ: Το κουμπί καλεί τη συνάρτηση toggleTheme και αλλάζει εικονίδιο --- */}
                    <IconButton sx={{ ml: 1 }} onClick={toggleTheme} color="inherit" title="Εναλλαγή Θέματος">
                        {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
                    </IconButton>
                </Box>
            </Toolbar>
        </AppBar>
    );
}

export default DashboardHeader;
