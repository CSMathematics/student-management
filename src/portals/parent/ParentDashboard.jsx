// src/portals/parent/ParentDashboard.jsx
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Grid, Paper, Typography, List, ListItem, ListItemIcon, ListItemText, Button } from '@mui/material';
import { Event as EventIcon, Grade as GradeIcon, Campaign as CampaignIcon, Assignment as AssignmentIcon } from '@mui/icons-material';
import dayjs from 'dayjs';

function ParentDashboard({ childData, enrolledClassrooms, grades, announcements, assignments }) {
    const navigate = useNavigate();

    const todaysClasses = useMemo(() => {
        if (!enrolledClassrooms) return [];
        const today = dayjs().format('dddd');
        return enrolledClassrooms
            .flatMap(c => (c.schedule || []).map(s => ({ ...s, classroomName: c.classroomName, subject: c.subject })))
            .filter(s => s.day.toLowerCase() === today.toLowerCase())
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
    }, [enrolledClassrooms]);

    const recentGrades = useMemo(() => {
        if (!grades) return [];
        return [...grades]
            .sort((a, b) => b.date.toDate() - a.date.toDate())
            .slice(0, 5);
    }, [grades]);
        
    const upcomingAssignments = useMemo(() => {
        if (!assignments) return [];
        const today = dayjs().startOf('day');
        return [...assignments]
            .filter(a => dayjs(a.dueDate.toDate()).isSameOrAfter(today))
            .sort((a, b) => a.dueDate.toDate() - b.dueDate.toDate())
            .slice(0, 3);
    }, [assignments]);

    const latestAnnouncements = useMemo(() => {
        if (!announcements) return [];
        return [...announcements]
            .sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0))
            .slice(0, 3);
    }, [announcements]);

    return (
        <Box>
            <Typography variant="h4" sx={{ mb: 3 }}>
                Καλώς ήρθατε, Γονέας του/της {childData?.firstName}!
            </Typography>
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>Επερχόμενες Υποχρεώσεις Παιδιού</Typography>
                        <List dense>
                            {upcomingAssignments.length > 0 ? upcomingAssignments.map(item => (
                                <ListItem key={item.id}>
                                    <ListItemIcon><AssignmentIcon color="info" /></ListItemIcon>
                                    <ListItemText
                                        primary={item.title}
                                        secondary={`Προθεσμία: ${dayjs(item.dueDate.toDate()).format('dddd, DD/MM')}`}
                                    />
                                </ListItem>
                            )) : <Typography sx={{ p: 2 }}>Δεν υπάρχουν επερχόμενες εργασίες.</Typography>}
                        </List>
                        <Button size="small" onClick={() => navigate('/child-assignments')} sx={{ mt: 1 }}>Όλες οι εργασίες</Button>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>Σημερινό Πρόγραμμα Παιδιού</Typography>
                        <List dense>
                            {todaysClasses.length > 0 ? todaysClasses.map((item, index) => (
                                <ListItem key={index}>
                                    <ListItemIcon><EventIcon color="primary" /></ListItemIcon>
                                    <ListItemText
                                        primary={`${item.startTime} - ${item.endTime}: ${item.subject}`}
                                        secondary={item.classroomName}
                                    />
                                </ListItem>
                            )) : <Typography sx={{ p: 2 }}>Δεν υπάρχουν μαθήματα σήμερα.</Typography>}
                        </List>
                        <Button size="small" onClick={() => navigate('/child-schedule')} sx={{ mt: 1 }}>Πλήρες Πρόγραμμα</Button>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>Πρόσφατοι Βαθμοί Παιδιού</Typography>
                        <List dense>
                            {recentGrades.length > 0 ? recentGrades.map(grade => (
                                <ListItem key={grade.id}>
                                    <ListItemIcon><GradeIcon color="secondary" /></ListItemIcon>
                                    <ListItemText
                                        primary={`${grade.subject}: ${grade.grade}`}
                                        secondary={`${grade.type} - ${dayjs(grade.date.toDate()).format('DD/MM/YYYY')}`}
                                    />
                                </ListItem>
                            )) : <Typography sx={{ p: 2 }}>Δεν υπάρχουν πρόσφατοι βαθμοί.</Typography>}
                        </List>
                        <Button size="small" onClick={() => navigate('/child-grades-absences')} sx={{ mt: 1 }}>Αναλυτική Βαθμολογία</Button>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                     <Paper sx={{ p: 2, height: '100%' }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>Τελευταίες Ανακοινώσεις</Typography>
                        <List>
                            {latestAnnouncements.length > 0 ? latestAnnouncements.map(item => (
                                <ListItem key={item.id}>
                                    <ListItemIcon><CampaignIcon color="info" /></ListItemIcon>
                                    <ListItemText
                                        primary={item.title}
                                        secondary={`${dayjs(item.createdAt?.toDate()).format('DD/MM/YYYY')} - ${item.content.substring(0, 120)}...`}
                                    />
                                </ListItem>
                            )) : <Typography sx={{ p: 2 }}>Δεν υπάρχουν ανακοινώσεις.</Typography>}
                        </List>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ParentDashboard;
