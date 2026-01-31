
import React from 'react';
import { Paper, Box } from '@mui/material';
import { useTheme } from '../context/ThemeContext';

const DashboardCard = ({ children, sx = {}, onClick, ...props }) => {
    const { mode } = useTheme();

    return (
        <Paper
            elevation={0}
            onClick={onClick}
            sx={{
                p: 3,
                borderRadius: 4,
                height: '100%',
                display: 'flex',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'transform 0.2s, box-shadow 0.2s',
                border: '1px solid',
                borderColor: mode === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
                background: mode === 'light'
                    ? 'rgba(255, 255, 255, 0.8)'
                    : 'rgba(30, 41, 59, 0.7)',
                backdropFilter: 'blur(10px)',
                boxShadow: mode === 'light'
                    ? '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
                    : '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1)',
                '&:hover': onClick ? {
                    transform: 'translateY(-4px)',
                    boxShadow: mode === 'light'
                        ? '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)'
                        : '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
                } : {},
                ...sx
            }}
            {...props}
        >
            {children}
        </Paper>
    );
};

export default DashboardCard;
