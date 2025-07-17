// js/components/DashboardHeader.jsx
import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, IconButton } from '@mui/material';

function DashboardHeader({ pageTitle, onBackClick, showBackButton }) {
    return (
        <AppBar position="static" sx={{ marginBottom: '20px', backgroundColor: '#FFFFFF',boxShadow: 'none' }}>
            <Toolbar sx={{ justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {showBackButton && (
                        <IconButton
                            size="large"
                            edge="start"
                            color="inherit"
                            aria-label="back"
                            onClick={onBackClick}
                            sx={{ color: '#333' }}
                        >
                            <i className="fas fa-arrow-left"></i>
                        </IconButton>
                    )}
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: '8px', color: '#333' }}>
                        <i className="fas fa-school" style={{ color: '#333' }}></i> {pageTitle} <small style={{ color: '#555' }}>...........</small>
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <IconButton color="inherit" title="Notifications" sx={{ color: '#333' }}>
                        <i className="fas fa-bell"></i>
                    </IconButton>
                    <IconButton color="inherit" title="Messages" sx={{ color: '#333' }}>
                        <i className="fas fa-envelope"></i>
                    </IconButton>
                    <IconButton color="inherit" title="User Profile" sx={{ color: '#333' }}>
                        <i className="fas fa-user-circle"></i>
                    </IconButton>
                    <Button
                        color="inherit"
                        sx={{ borderRadius: '8px', color: '#333' }}
                        onClick={() => console.log('Toggle Theme')}
                        title="Εναλλαγή Θέματος 🌙/☀️"
                    >
                        🌙
                    </Button>
                </Box>
            </Toolbar>
        </AppBar>
    );
}

export default DashboardHeader;
