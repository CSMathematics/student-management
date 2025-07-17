// js/components/YearFilter.jsx
import React from 'react';
import { Box, Typography, Select, MenuItem, InputLabel, FormControl } from '@mui/material';

function YearFilter() {
    return (
        <Box sx={{ mt: 4, mb: 4 }}>
            <Typography variant="body1" component="label" htmlFor="yearSelect" sx={{ fontWeight: 'bold', mb: 1, display: 'block' }}>
                Select Year:
            </Typography>
            <Select
                id="yearSelect"
                defaultValue="2025"
                sx={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc', width: '100%', maxWidth: '200px' }}
                variant="outlined"
                size="small"
            >
                <MenuItem value="2025">2025</MenuItem>
                <MenuItem value="2024">2024</MenuItem>
                <MenuItem value="2023">2023</MenuItem>
            </Select>
        </Box>
    );
}

export default YearFilter;
