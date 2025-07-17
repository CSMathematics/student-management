// js/components/LicenseUsage.jsx
import React from 'react';
import { Box, Typography } from '@mui/material';

function LicenseUsage() {
    return (
        <Box sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h6" component="p" sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: 1 }}>
                <i className="fas fa-id-badge"></i> Licence Usage
            </Typography>
            <Box sx={{ width: '100%', backgroundColor: '#e0e0e0', borderRadius: '8px', height: '20px', overflow: 'hidden' }}>
                <Box sx={{ width: '12.6%', backgroundColor: '#4caf50', height: '100%', borderRadius: '8px' }}></Box>
            </Box>
            <Typography variant="body2" sx={{ mt: 1, color: '#757575' }}>
                12.6% of 1000
            </Typography>
        </Box>
    );
}

export default LicenseUsage;
