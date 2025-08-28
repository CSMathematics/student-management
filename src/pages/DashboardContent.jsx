// src/pages/DashboardContent.jsx
import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Grid, Paper, Typography, Button, List, ListItem, ListItemText, ListItemIcon, Divider, Avatar, Card, CardContent, CardHeader, IconButton, ListItemButton } from '@mui/material';
import {
    People as PeopleIcon,
    Class as ClassIcon,
    PersonAdd as PersonAddIcon,
    GroupAdd as GroupAddIcon,
    Campaign as CampaignIcon,
    NoteAdd as NoteAddIcon,
    ArrowForward as ArrowForwardIcon,
    Event as EventIcon,
    NotificationsActive as ActivityIcon
} from '@mui/icons-material';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import dayjs from 'dayjs';
import 'dayjs/locale/el';
dayjs.locale('el');


// At a Glance Info Card Component
const StatCard = ({ title, value, icon, color, onClick }) => (
    <Grid item xs={12} sm={6} md={4}>
        <Paper 
            elevation={3} 
            sx={{ 
                p: 2, 
                display: 'flex', 
                alignItems: 'center', 
                borderRadius: '12px', 
                cursor: onClick ? 'pointer' : 'default',
                '&:hover': {
                    boxShadow: onClick ? 6 : 3,
                    transform: onClick ? 'translateY(-2px)' : 'none'
                },
                transition: 'all 0.2s ease-in-out'
            }}
            onClick={onClick}
        >
            <Avatar sx={{ bgcolor: color, width: 56, height: 56, mr: 2 }}>
                {icon}
            </Avatar>
            <Box>
                <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>{value}</Typography>
                <Typography color="text.secondary">{title}</Typography>
            </Box>
        </Paper>
    </Grid>
);

// Quick Actions Button Component
const QuickActionButton = ({ title, icon, onClick, color = 'primary' }) => (
    <Grid item xs={6} md={3}>
        <Button
            fullWidth
            variant="outlined"
            color={color}
            startIcon={icon}
            onClick={onClick}
            sx={{ p: 2, height: '100%', flexDirection: 'column', justifyContent: 'center', borderRadius: '12px' }}
        >
            <Typography variant="button" sx={{ mt: 1 }}>{title}</Typography>
        </Button>
    </Grid>
);


function DashboardContent({ allStudents, classrooms, allUsers, db, appId, selectedYear, allAnnouncements }) {
    const navigate = useNavigate();
    const [activityFeed, setActivityFeed] = useState([]);

    const stats = useMemo(() => ({
        activeStudents: allStudents?.length || 0,
        activeClassrooms: classrooms?.length || 0,
        pendingUsers: allUsers?.filter(u => u.roles?.includes('pending_approval')).length || 0,
    }), [allStudents, classrooms, allUsers]);

    const todaysSchedule = useMemo(() => {
        if (!classrooms) return [];
        const today = dayjs().format('dddd');
        return classrooms
            .flatMap(c => (c.schedule || []).map(s => ({ 
                ...s, 
                classroomName: c.classroomName, 
                subject: c.subject,
                classroomId: c.id // --- START: Add classroomId for navigation ---
            })))
            .filter(s => s.day.toLowerCase() === today.toLowerCase())
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
    }, [classrooms]);

    // Effect for Activity Feed
    useEffect(() => {
        if (!db || !appId || !selectedYear) return;

        const recentAnnouncements = (allAnnouncements || [])
            .sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate())
            .slice(0, 5)
            .map(item => ({
                id: item.id,
                type: 'announcement',
                text: `Νέα ανακοίνωση: ${item.title}`,
                timestamp: item.createdAt.toDate(),
                icon: <CampaignIcon color="primary" />,
            }));

        const recentUsers = (allUsers || [])
            .filter(u => u.roles?.includes('pending_approval'))
            .sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate())
            .slice(0, 5)
            .map(item => ({
                id: item.id,
                type: 'newUser',
                text: `Νέα εγγραφή: ${item.firstName} ${item.lastName}`,
                timestamp: item.createdAt.toDate(),
                icon: <PersonAddIcon color="success" />,
            }));
        
        const combinedFeed = [...recentAnnouncements, ...recentUsers]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 10);
            
        setActivityFeed(combinedFeed);

    }, [db, appId, selectedYear, allAnnouncements, allUsers]);


    return (
        <Box sx={{ flexGrow: 1 }}>
            <Grid container spacing={3}>
                {/* At a Glance Section */}
                <StatCard title="Ενεργοί Μαθητές" value={stats.activeStudents} icon={<PeopleIcon />} color="primary.main" />
                <StatCard title="Ενεργά Τμήματα" value={stats.activeClassrooms} icon={<ClassIcon />} color="secondary.main" />
                <StatCard title="Εγγραφές σε Αναμονή" value={stats.pendingUsers} icon={<PersonAddIcon />} color="warning.main" onClick={() => navigate('/users-management')} />
                
                {/* Quick Actions Section */}
                <Grid item xs={12}>
                    <Typography variant="h5" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>Γρήγορες Ενέργειες</Typography>
                    <Grid container spacing={2}>
                        <QuickActionButton title="Νέος Μαθητής" icon={<PersonAddIcon />} color="success" onClick={() => navigate('/student/new')} />
                        <QuickActionButton title="Νέο Τμήμα" icon={<GroupAddIcon />} color="secondary" onClick={() => navigate('/classroom/new')} />
                        <QuickActionButton title="Νέα Ανακοίνωση" icon={<CampaignIcon />} color="primary" onClick={() => navigate('/announcements')} />
                        <QuickActionButton title="Νέα Αξιολόγηση" icon={<NoteAddIcon />} color="info" onClick={() => navigate('/assignments')} />
                    </Grid>
                </Grid>

                {/* Today's Schedule & Activity Feed */}
                <Grid item xs={12} md={6}>
                     <Card elevation={3} sx={{ height: '100%', borderRadius: '12px' }}>
                        <CardHeader
                            title="Το Σημερινό Πρόγραμμα"
                            action={
                                <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/calendar')}>
                                    Πλήρες Πρόγραμμα
                                </Button>
                            }
                        />
                        <CardContent sx={{ pt: 0 }}>
                            {todaysSchedule.length > 0 ? (
                                <List dense>
                                    {/* --- START: Make list items clickable --- */}
                                    {todaysSchedule.map((item, index) => (
                                        <ListItemButton 
                                            key={index} 
                                            divider={index < todaysSchedule.length - 1}
                                            onClick={() => navigate('/classrooms', { state: { selectedId: item.classroomId } })}
                                        >
                                            <ListItemIcon sx={{minWidth: '40px'}}>
                                                <EventIcon color="action" />
                                            </ListItemIcon>
                                            <ListItemText 
                                                primary={`${item.startTime} - ${item.endTime}: ${item.subject}`}
                                                secondary={item.classroomName}
                                            />
                                        </ListItemButton>
                                    ))}
                                    {/* --- END: Make list items clickable --- */}
                                </List>
                            ) : (
                                <Typography color="text.secondary" sx={{ textAlign: 'center', p: 2 }}>
                                    Δεν υπάρχουν προγραμματισμένα μαθήματα για σήμερα.
                                </Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Card elevation={3} sx={{ height: '100%', borderRadius: '12px' }}>
                        <CardHeader
                            title="Ροή Δραστηριότητας"
                            avatar={<ActivityIcon color="action"/>}
                        />
                        <CardContent sx={{ pt: 0 }}>
                            {activityFeed.length > 0 ? (
                                <List dense>
                                    {activityFeed.map((item) => (
                                        <ListItem key={item.id} divider>
                                            <ListItemIcon sx={{minWidth: '40px'}}>
                                                {item.icon}
                                            </ListItemIcon>
                                            <ListItemText 
                                                primary={item.text}
                                                secondary={dayjs(item.timestamp).fromNow()}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            ) : (
                                <Typography color="text.secondary" sx={{ textAlign: 'center', p: 2 }}>
                                    Δεν υπάρχει πρόσφατη δραστηριότητα.
                                </Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

            </Grid>
        </Box>
    );
}

export default DashboardContent;
