// js/components/DashboardStats.jsx
import React from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';

function DashboardStats() {
    const statsData = [
        { icon: "fas fa-user", value: 35, label: "Μαθητές" },
        { icon: "fas fa-chalkboard-teacher", value: 18, label: "Τάξεις - Τμήματα" },
        { icon: "fas fa-user-graduate", value: 2, label: "Καθηγητές" },
    ];

    return (
        <Grid container spacing={3} sx={{ marginBottom: '20px' }}>
            {statsData.map((stat, index) => (
                <Grid item xs={12} sm={4} key={index}>
                    <Paper elevation={3} sx={{ padding: '20px', textAlign: 'center', borderRadius: '12px' }}>
                        <Typography variant="h4" component="h3" sx={{ fontWeight: 'bold', color: '#3f51b5' }}>
                            {stat.value}
                        </Typography>
                        <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', mt: 1, color: '#555' }}>
                            <i className={stat.icon}></i> {stat.label}
                        </Typography>
                    </Paper>
                </Grid>
            ))}
        </Grid>
    );
}

export default DashboardStats;
