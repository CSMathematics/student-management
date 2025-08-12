// src/portals/teacher/TeacherDashboard.jsx
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Grid, Paper, Typography, List, ListItem, ListItemIcon, ListItemText, Button, Avatar } from '@mui/material';
import { Event as EventIcon, Assignment as AssignmentIcon, Campaign as CampaignIcon, People as PeopleIcon, School as SchoolIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

dayjs.extend(isSameOrAfter);

const StatCard = ({ icon, title, value, color }) => (
    <Paper elevation={3} sx={{ p: 2, display: 'flex', alignItems: 'center', borderRadius: '12px' }}>
        <Avatar sx={{ bgcolor: color, width: 56, height: 56, mr: 2 }}>
            {icon}
        </Avatar>
        <Box>
            <Typography variant="h6" component="div">{value}</Typography>
            <Typography color="text.secondary">{title}</Typography>
        </Box>
    </Paper>
);

function TeacherDashboard({ teacherData, assignedClassrooms, studentsInClassrooms, assignments, announcements }) {
    const navigate = useNavigate();

    const stats = useMemo(() => ({
        classroomCount: assignedClassrooms?.length || 0,
        studentCount: studentsInClassrooms?.length || 0,
    }), [assignedClassrooms, studentsInClassrooms]);

    const todaysClasses = useMemo(() => {
        if (!assignedClassrooms) return [];
        const today = dayjs().format('dddd');
        return assignedClassrooms
            .flatMap(c => (c.schedule || []).map(s => ({ ...s, classroomName: c.classroomName, subject: c.subject, classroomId: c.id })))
            .filter(s => s.day.toLowerCase() === today.toLowerCase())
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
    }, [assignedClassrooms]);

    const upcomingAssignments = useMemo(() => {
        if (!assignments) return [];
        const today = dayjs().startOf('day');
        return [...assignments]
            .filter(a => dayjs(a.dueDate.toDate()).isSameOrAfter(today))
            .sort((a, b) => a.dueDate.toDate() - b.dueDate.toDate())
            .slice(0, 5); // Show the next 5 upcoming deadlines
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
                Καλώς ήρθατε, {teacherData?.firstName}!
            </Typography>
            <Grid container spacing={3}>
                {/* Stat Cards */}
                <Grid item xs={12} sm={6}><StatCard icon={<SchoolIcon />} title="Τμήματα που Διδάσκετε" value={stats.classroomCount} color="#1976d2" /></Grid>
                <Grid item xs={12} sm={6}><StatCard icon={<PeopleIcon />} title="Σύνολο Μαθητών σας" value={stats.studentCount} color="#388e3c" /></Grid>

                {/* Today's Schedule */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>Το σημερινό σας πρόγραμμα</Typography>
                        <List dense>
                            {todaysClasses.length > 0 ? todaysClasses.map((item, index) => (
                                <ListItem key={index} button onClick={() => navigate('/my-classrooms', { state: { selectedClassroomId: item.classroomId } })}>
                                    <ListItemIcon><EventIcon color="primary" /></ListItemIcon>
                                    <ListItemText
                                        primary={`${item.startTime} - ${item.endTime}: ${item.subject}`}
                                        secondary={item.classroomName}
                                    />
                                </ListItem>
                            )) : <Typography sx={{ p: 2 }}>Δεν έχετε προγραμματισμένα μαθήματα για σήμερα.</Typography>}
                        </List>
                        <Button size="small" onClick={() => navigate('/my-schedule')} sx={{ mt: 1 }}>Πλήρες Πρόγραμμα</Button>
                    </Paper>
                </Grid>

                {/* Upcoming Assignments */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>Επερχόμενες Προθεσμίες</Typography>
                        <List dense>
                            {upcomingAssignments.length > 0 ? upcomingAssignments.map(item => (
                                <ListItem key={item.id}>
                                    <ListItemIcon><AssignmentIcon color="info" /></ListItemIcon>
                                    <ListItemText
                                        primary={item.title}
                                        secondary={`Λήγει: ${dayjs(item.dueDate.toDate()).format('dddd, DD/MM')}`}
                                    />
                                </ListItem>
                            )) : <Typography sx={{ p: 2 }}>Δεν υπάρχουν επερχόμενες προθεσμίες.</Typography>}
                        </List>
                    </Paper>
                </Grid>
                
                {/* Announcements */}
                <Grid item xs={12}>
                     <Paper sx={{ p: 2, height: '100%' }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>Τελευταίες Ανακοινώσεις</Typography>
                        <List>
                            {latestAnnouncements.length > 0 ? latestAnnouncements.map(item => (
                                <ListItem key={item.id}>
                                    <ListItemIcon><CampaignIcon color="action" /></ListItemIcon>
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
}

export default TeacherDashboard;
