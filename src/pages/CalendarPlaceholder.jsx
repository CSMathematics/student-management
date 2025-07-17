// js/components/CalendarPlaceholder.jsx
import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

function CalendarPlaceholder() {
    return (
        <Box sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h5" component="h4" sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: 2 }}>
                <i className="fas fa-calendar-alt"></i> Εργασίες - Υποχρεώσεις
            </Typography>
            <Paper elevation={2} sx={{ padding: '20px', borderRadius: '12px', minHeight: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#9e9e9e' }}>
                <Typography variant="body1">Calendar will be integrated here.</Typography>
            </Paper>
        </Box>
    );
}

export default CalendarPlaceholder;
