// src/pages/DashboardContent.jsx
import React, { useMemo } from 'react';
import { Box, Grid, Paper, Typography, List, ListItem, ListItemText, ListItemIcon, Avatar, CircularProgress, ListItemButton, Divider, Button } from '@mui/material'; // <-- Η ΔΙΟΡΘΩΣΗ ΕΙΝΑΙ ΕΔΩ
import { Event as EventIcon, Cake as CakeIcon, People as PeopleIcon, School as SchoolIcon, PersonAdd as PersonAddIcon, Campaign as CampaignIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import 'dayjs/locale/el';
import { useNavigate } from 'react-router-dom';

dayjs.locale('el');

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

// --- ΠΡΟΣΘΗΚΗ allAnnouncements στα props ---
function DashboardContent({ allStudents, classrooms, allAnnouncements, loading }) {
    const navigate = useNavigate();

    const stats = useMemo(() => ({
        studentCount: allStudents?.length || 0,
        classroomCount: classrooms?.length || 0,
    }), [allStudents, classrooms]);

    const todaysClasses = useMemo(() => {
        if (!classrooms) return [];
        const today = dayjs().format('dddd');
        return classrooms
            .flatMap(c => c.schedule.map(s => ({ ...s, classroomName: c.classroomName, subject: c.subject, classroomId: c.id })))
            .filter(s => s.day.toLowerCase() === today.toLowerCase())
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
    }, [classrooms]);

    const upcomingBirthdays = useMemo(() => {
        if (!allStudents) return [];
        const today = dayjs();
        return allStudents
            .map(student => ({ ...student, dobDate: dayjs(student.dob) }))
            .filter(student => student.dobDate.isValid())
            .map(student => {
                const birthdayThisYear = student.dobDate.year(today.year());
                const daysUntil = birthdayThisYear.diff(today, 'day');
                return { ...student, daysUntil };
            })
            .filter(student => student.daysUntil >= 0 && student.daysUntil <= 15)
            .sort((a, b) => a.daysUntil - b.daysUntil);
    }, [allStudents]);

    const recentStudents = useMemo(() => {
        if (!allStudents) return [];
        return [...allStudents]
            .filter(s => s.createdAt?.toDate)
            .sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate())
            .slice(0, 5);
    }, [allStudents]);

    // --- ΝΕΑ ΛΟΓΙΚΗ ΓΙΑ ΤΙΣ ΑΝΑΚΟΙΝΩΣΕΙΣ ---
    const latestAnnouncements = useMemo(() => {
        if (!allAnnouncements) return [];
        return [...allAnnouncements]
            .sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0))
            .slice(0, 3); // Εμφάνισε τις 3 πιο πρόσφατες
    }, [allAnnouncements]);
    
    const handleClassClick = (classroomId) => {
        navigate('/classrooms', { state: { selectedClassroomId: classroomId } });
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
    }

    return (
        <Box>
            {/* Stat Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}><StatCard icon={<PeopleIcon />} title="Σύνολο Μαθητών" value={stats.studentCount} color="#1976d2" /></Grid>
                <Grid item xs={12} sm={6} md={3}><StatCard icon={<SchoolIcon />} title="Σύνολο Τμημάτων" value={stats.classroomCount} color="#388e3c" /></Grid>
                <Grid item xs={12} sm={6} md={3}><StatCard icon={<EventIcon />} title="Μαθήματα Σήμερα" value={todaysClasses.length} color="#f57c00" /></Grid>
                <Grid item xs={12} sm={6} md={3}><StatCard icon={<CakeIcon />} title="Επερχόμενα Γενέθλια" value={upcomingBirthdays.length} color="#d32f2f" /></Grid>
            </Grid>

            {/* Main Content Grid */}
            <Grid container spacing={3}>
                {/* Today's Schedule & Announcements */}
                <Grid item xs={12} md={7}>
                    {/* --- ΝΕΑ ΚΑΡΤΑ ΑΝΑΚΟΙΝΩΣΕΩΝ --- */}
                    <Paper elevation={3} sx={{ p: 2, borderRadius: '12px', mb: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Τελευταίες Ανακοινώσεις</Typography>
                        <List>
                            {latestAnnouncements.length > 0 ? latestAnnouncements.map((item, index) => (
                                <ListItem key={item.id} divider={index < latestAnnouncements.length - 1}>
                                    <ListItemIcon><CampaignIcon color="primary" /></ListItemIcon>
                                    <ListItemText
                                        primary={item.title}
                                        secondary={`${dayjs(item.createdAt?.toDate()).format('DD/MM/YYYY')} - ${item.content.substring(0, 100)}...`}
                                    />
                                </ListItem>
                            )) : (
                                <Typography sx={{ p: 2, color: 'text.secondary' }}>Δεν υπάρχουν πρόσφατες ανακοινώσεις.</Typography>
                            )}
                        </List>
                        <Box sx={{textAlign: 'right', mt: 1}}>
                            <Button size="small" onClick={() => navigate('/announcements')}>Όλες οι ανακοινώσεις</Button>
                        </Box>
                    </Paper>

                    <Paper elevation={3} sx={{ p: 2, borderRadius: '12px' }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Πρόγραμμα Ημέρας ({dayjs().format('dddd, D MMMM')})</Typography>
                        <List>
                            {todaysClasses.length > 0 ? todaysClasses.map((item, index) => (
                                <ListItemButton key={index} onClick={() => handleClassClick(item.classroomId)} divider>
                                    <ListItemIcon><EventIcon color="primary" /></ListItemIcon>
                                    <ListItemText
                                        primary={`${item.startTime} - ${item.endTime}: ${item.subject}`}
                                        secondary={`Τμήμα: ${item.classroomName}`}
                                    />
                                </ListItemButton>
                            )) : (
                                <Typography sx={{ p: 2 }}>Δεν υπάρχουν προγραμματισμένα μαθήματα για σήμερα.</Typography>
                            )}
                        </List>
                    </Paper>
                </Grid>

                {/* Birthdays and Recent Students */}
                <Grid item xs={12} md={5}>
                    <Paper elevation={3} sx={{ p: 2, borderRadius: '12px', mb: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Επερχόμενα Γενέθλια (Επόμενες 15 ημέρες)</Typography>
                        <List>
                            {upcomingBirthdays.length > 0 ? upcomingBirthdays.map(student => (
                                <ListItem key={student.id}>
                                    <ListItemIcon><CakeIcon color="error" /></ListItemIcon>
                                    <ListItemText
                                        primary={`${student.firstName} ${student.lastName}`}
                                        secondary={`Γενέθλια σε ${student.daysUntil} ημέρες (${student.dobDate.format('D MMMM')})`}
                                    />
                                </ListItem>
                            )) : (
                                <Typography sx={{ p: 2 }}>Κανένα επερχόμενο γενέθλιο.</Typography>
                            )}
                        </List>
                    </Paper>
                    <Paper elevation={3} sx={{ p: 2, borderRadius: '12px' }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Τελευταίες Εγγραφές</Typography>
                        <List>
                            {recentStudents.length > 0 ? recentStudents.map(student => (
                                <ListItem key={student.id}>
                                    <ListItemIcon><PersonAddIcon color="success" /></ListItemIcon>
                                    <ListItemText
                                        primary={`${student.firstName} ${student.lastName}`}
                                        secondary={`Εγγραφή: ${dayjs(student.createdAt.toDate()).format('D MMM YYYY')}`}
                                    />
                                </ListItem>
                            )) : (
                                <Typography sx={{ p: 2 }}>Δεν υπάρχουν πρόσφατες εγγραφές.</Typography>
                            )}
                        </List>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}

export default DashboardContent;
