// src/components/QuickActions.jsx
import React from 'react';
import { Box, Button } from '@mui/material';

function QuickActions({ onNewStudentClick, onStudentsListClick, onNewClassroomClick, onClassroomsListClick }) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', mt: 4, mb: 4 }}>
            <Button variant="contained" color="primary" sx={{ borderRadius: '8px', flexGrow: 1, minWidth: '180px' }} onClick={onNewStudentClick}>
                <i className="fas fa-user-plus" style={{ marginRight: '8px' }}></i> Νέος μαθητής
            </Button>
            <Button variant="contained" color="secondary" sx={{ borderRadius: '8px', flexGrow: 1, minWidth: '180px' }} onClick={onStudentsListClick}>
                <i className="fas fa-users" style={{ marginRight: '8px' }}></i> Λίστα Μαθητών
            </Button>
            <Button variant="contained" color="secondary" sx={{ borderRadius: '8px', flexGrow: 1, minWidth: '180px' }} onClick={onNewClassroomClick}>
                <i className="fas fa-list" style={{ marginRight: '8px' }}></i> Νέο τμήμα
            </Button>
            <Button variant="contained" color="secondary" sx={{ borderRadius: '8px', flexGrow: 1, minWidth: '180px' }} onClick={onClassroomsListClick}>
                <i className="fas fa-chalkboard" style={{ marginRight: '8px' }}></i> Λίστα Τμημάτων
            </Button>
            <Button variant="contained" color="secondary" sx={{ borderRadius: '8px', flexGrow: 1, minWidth: '180px' }}>
                <i className="fas fa-users-cog" style={{ marginRight: '8px' }}></i> User Accounts
            </Button>
            <Button variant="contained" color="secondary" sx={{ borderRadius: '8px', flexGrow: 1, minWidth: '180px' }}>
                <i className="fas fa-chart-pie" style={{ marginRight: '8px' }}></i> Usage Statistics
            </Button>
            <Button variant="contained" color="secondary" sx={{ borderRadius: '8px', flexGrow: 1, minWidth: '180px' }}>
                <i className="fas fa-cogs" style={{ marginRight: '8px' }}></i> Basic Lists
            </Button>
        </Box>
    );
}

export default QuickActions;
