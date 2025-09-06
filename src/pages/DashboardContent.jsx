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
    NotificationsActive as ActivityIcon,
    Grade as GradeIcon,
    Assignment as AssignmentIcon,
    LinkOff as LinkOffIcon,
    Book as BookIcon,
    Functions as FunctionsIcon, 
    HistoryEdu as HistoryEduIcon, 
    Science as ScienceIcon, 
    Computer as ComputerIcon,
    Event as EventIcon,
    PlaylistAddCheck as PlaylistAddCheckIcon,
    Warning as WarningIcon,
    LabelImportant as LabelImportantIcon,
    Label as LabelIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';
import 'dayjs/locale/el';
dayjs.locale('el');


const StatCard = ({ title, value, icon, color, onClick }) => (
    <Grid item xs={12} sm={6} md={3}>
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
                transition: 'all 0.2s ease-in-out',
                height: '100%'
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

// Helper to assign icon and a fallback color based on subject name
const getSubjectStyle = (subject = '') => {
    const subjectLower = subject.toLowerCase();
    if (subjectLower.includes('γλώσσα') || subjectLower.includes('φιλολογία') || subjectLower.includes('αρχαία') || subjectLower.includes('ιστορία')) {
        return { color: '#ff9800', icon: <HistoryEduIcon /> }; // orange
    }
    if (subjectLower.includes('μαθηματικά') || subjectLower.includes('άλγεβρα') || subjectLower.includes('γεωμετρία')) {
        return { color: '#f44336', icon: <FunctionsIcon /> }; // red
    }
    if (subjectLower.includes('φυσική') || subjectLower.includes('χημεία') || subjectLower.includes('βιολογία')) {
        return { color: '#4caf50', icon: <ScienceIcon /> }; // green
    }
    if (subjectLower.includes('πληροφορική')) {
        return { color: '#2196f3', icon: <ComputerIcon /> }; // blue
    }
    // default style
    return { color: '#607d8b', icon: <BookIcon /> }; // blueGrey
};

const getPriorityIcon = (priority) => {
    switch (priority) {
        case 'high': return <WarningIcon fontSize="inherit" sx={{ color: '#d40e0bff' }} />;
        case 'medium': return <LabelImportantIcon fontSize="inherit" sx={{ color: '#ff9800' }} />;
        case 'low': return <LabelIcon fontSize="inherit" sx={{ color: '#4caf50' }} />;
        default: return null;
    }
};


function DashboardContent({ allStudents, classrooms, allUsers, allFiles, allAnnouncements, allAssignments, allGrades, allTasks, db, appId, selectedYear }) {
    const navigate = useNavigate();
    const [activityFeed, setActivityFeed] = useState([]);

    const stats = useMemo(() => {
        const unlinkedTeacherUsers = allUsers?.filter(user => {
            const userRoles = user.roles || (user.role ? [user.role] : []);
            return userRoles.includes('teacher') && !user.profileId;
        }).length || 0;

        const filesThisWeek = allFiles?.filter(file => 
            dayjs().diff(dayjs(file.uploadedAt?.toDate()), 'day') <= 7
        ).length || 0;

        return {
            activeStudents: allStudents?.length || 0,
            activeClassrooms: classrooms?.length || 0,
            pendingUsers: allUsers?.filter(u => u.roles?.includes('pending_approval')).length || 0,
            unlinkedTeachers: unlinkedTeacherUsers,
            libraryFileCount: allFiles?.length || 0,
            libraryFilesThisWeek: filesThisWeek,
        };
    }, [allStudents, classrooms, allUsers, allFiles]);

    const todaysSchedule = useMemo(() => {
        if (!classrooms || !allUsers) return {};
        const today = dayjs().format('dddd');

        const teachers = allUsers.filter(u => u.roles?.includes('teacher'));

        // FIX: Use profileId as the key for the map to match classroom's teacherId
        const teacherMap = new Map(
            teachers.map(t => [t.profileId, `${t.firstName} ${t.lastName}`])
        );

        const scheduleItems = classrooms
            .flatMap(c => {
                return (c.schedule || []).map(s => ({
                    ...s,
                    classroomName: c.classroomName,
                    subject: c.subject,
                    grade: c.grade, // Added grade
                    classroomId: c.id,
                    classroomColor: c.color,
                    teacherName: teacherMap.get(c.teacherId) || 'Χωρίς Καθηγητή'
                }));
            })
            .filter(s => s.day.toLowerCase() === today.toLowerCase())
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
        
        const groupedSchedule = scheduleItems.reduce((acc, item) => {
            const key = item.teacherName;
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(item);
            return acc;
        }, {});

        return groupedSchedule;

    }, [classrooms, allUsers]);
    
    const upcomingAdminTasks = useMemo(() => {
        if (!allTasks) return [];
        const today = dayjs().startOf('day');
        const priorityOrder = { high: 1, medium: 2, low: 3 };

        return allTasks
            .filter(task => !task.isCompleted && dayjs(task.start?.toDate()).isAfter(today.subtract(1, 'month'))) // Filter out old tasks
            .sort((a, b) => {
                // Primary sort: by priority
                const priorityA = priorityOrder[a.priority] || 4;
                const priorityB = priorityOrder[b.priority] || 4;
                if (priorityA !== priorityB) {
                    return priorityA - priorityB;
                }
                // Secondary sort: by date
                return a.start?.toDate() - b.start?.toDate();
            })
            .slice(0, 5);
    }, [allTasks]);


    const upcomingAssignments = useMemo(() => {
        if (!allAssignments) return [];
        const today = dayjs().startOf('day');
        return allAssignments
            .filter(a => dayjs(a.dueDate.toDate()).isSameOrAfter(today))
            .sort((a, b) => a.dueDate.toDate() - b.dueDate.toDate())
            .slice(0, 5);
    }, [allAssignments]);

    const recentGrades = useMemo(() => {
        if (!allGrades || !allStudents) return [];
        const studentMap = new Map(allStudents.map(s => [s.id, `${s.firstName} ${s.lastName}`]));
        return allGrades
            .sort((a, b) => b.date.toDate() - a.date.toDate())
            .slice(0, 5)
            .map(grade => ({
                ...grade,
                studentName: studentMap.get(grade.studentId) || 'Άγνωστος Μαθητής'
            }));
    }, [allGrades, allStudents]);

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
            .sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate())
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
                {/* STAT CARDS */}
                <StatCard title="Ενεργοί Μαθητές" value={stats.activeStudents} icon={<PeopleIcon />} color="primary.main" onClick={() => navigate('/students')} />
                <StatCard title="Ενεργά Τμήματα" value={stats.activeClassrooms} icon={<ClassIcon />} color="secondary.main" onClick={() => navigate('/classrooms')} />
                <StatCard title="Εγγραφές σε Αναμονή" value={stats.pendingUsers} icon={<PersonAddIcon />} color="warning.main" onClick={() => navigate('/users-management')} />
                <StatCard title="Ασύνδετοι Καθηγητές" value={stats.unlinkedTeachers} icon={<LinkOffIcon />} color="error.main" onClick={() => navigate('/teachers')} />

                {/* QUICK ACTIONS */}
                <Grid item xs={12}>
                    <Typography variant="h5" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>Γρήγορες Ενέργειες</Typography>
                    <Grid container spacing={2}>
                        <QuickActionButton title="Νέος Μαθητής" icon={<PersonAddIcon />} color="success" onClick={() => navigate('/student/new')} />
                        <QuickActionButton title="Νέο Τμήμα" icon={<GroupAddIcon />} color="secondary" onClick={() => navigate('/classroom/new')} />
                        <QuickActionButton title="Νέα Ανακοίνωση" icon={<CampaignIcon />} color="primary" onClick={() => navigate('/announcements')} />
                        <QuickActionButton title="Νέα Αξιολόγηση" icon={<NoteAddIcon />} color="info" onClick={() => navigate('/assignments')} />
                    </Grid>
                </Grid>

                {/* TODAY'S SCHEDULE */}
                <Grid item xs={12}>
                     <Card elevation={3} sx={{ height: '100%', borderRadius: '12px' }}>
                        <CardHeader title="Το Σημερινό Πρόγραμμα" action={<Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/calendar')}>Πλήρες Πρόγραμμα</Button>} />
                        <CardContent sx={{ pt: 0 }}>
                            {Object.keys(todaysSchedule).length > 0 ? (
                                Object.entries(todaysSchedule).map(([teacherName, scheduleItems], teacherIndex) => (
                                    <Box key={teacherName} sx={{ mb: teacherIndex < Object.keys(todaysSchedule).length - 1 ? 3 : 0 }}>
                                         <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1, ml: 1, fontSize: '1rem' }}>{teacherName}</Typography>
                                         <Box
                                            sx={{
                                                display: 'flex',
                                                overflowX: 'auto',
                                                p: 1,
                                                gap: 2,
                                                '&::-webkit-scrollbar': { height: 8 },
                                                '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 4 }
                                            }}
                                        >
                                            {scheduleItems.map((item, index) => {
                                                const { icon, color: fallbackColor } = getSubjectStyle(item.subject);
                                                const bgColor = item.classroomColor || fallbackColor;
                                                return (
                                                    <Paper
                                                        key={index}
                                                        elevation={2}
                                                        onClick={() => navigate('/classrooms', { state: { selectedId: item.classroomId } })}
                                                        sx={{
                                                            minWidth: 220,
                                                            p: 2,
                                                            borderRadius: '12px',
                                                            bgcolor: bgColor,
                                                            color: 'common.white',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            justifyContent: 'space-between',
                                                            flexShrink: 0,
                                                            '&:hover': {
                                                                transform: 'scale(1.03)',
                                                                boxShadow: 6
                                                            },
                                                            transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out'
                                                        }}
                                                    >
                                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, opacity: 0.8 }}>
                                                            {React.cloneElement(icon, { sx: { color: 'common.white' } })}
                                                            <Typography variant="body2" sx={{ ml: 1, fontWeight: 'bold' }}>
                                                                {`${item.startTime} - ${item.endTime}`}
                                                            </Typography>
                                                        </Box>
                                                        <Box>
                                                            <Typography variant="h6" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>{item.subject}</Typography>
                                                            <Typography variant="body1" sx={{ opacity: 0.9 }}>{item.grade}</Typography>
                                                            <Typography variant='body2' sx={{ opacity: 0.9 }}>{item.classroomName}</Typography>
                                                        </Box>
                                                    </Paper>
                                                );
                                            })}
                                        </Box>
                                    </Box>
                                ))
                            ) : ( <Typography color="text.secondary" sx={{ textAlign: 'center', p: 2 }}>Δεν υπάρχουν προγραμματισμένα μαθήματα για σήμερα.</Typography> )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* INFO CARDS ROW */}
                <Grid item xs={12} md={6} lg={3}>
                     <Card elevation={3} sx={{ height: '100%', borderRadius: '12px' }}>
                        <CardHeader title="Επερχόμενες Αξιολογήσεις" action={<Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/assignments')}>Όλες</Button>} />
                        <CardContent sx={{ pt: 0 }}>
                            {upcomingAssignments.length > 0 ? (
                                <List dense>
                                    {upcomingAssignments.map((item, index) => (
                                        <ListItem key={item.id} divider={index < upcomingAssignments.length - 1}>
                                            <ListItemIcon sx={{minWidth: '40px'}}><AssignmentIcon color="info" /></ListItemIcon>
                                            <ListItemText primary={item.title} secondary={`Προθεσμία: ${dayjs(item.dueDate.toDate()).format('dddd, DD/MM')}`} />
                                        </ListItem>
                                    ))}
                                </List>
                            ) : ( <Typography color="text.secondary" sx={{ textAlign: 'center', p: 2 }}>Δεν υπάρχουν επερχόμενες αξιολογήσεις.</Typography> )}
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                     <Card elevation={3} sx={{ height: '100%', borderRadius: '12px' }}>
                        <CardHeader title="Οι Εργασίες μου" action={<Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/tasks-calendar')}>Όλες</Button>} />
                        <CardContent sx={{ pt: 0 }}>
                            {upcomingAdminTasks.length > 0 ? (
                                <List dense>
                                    {upcomingAdminTasks.map((item, index) => (
                                        <ListItem key={item.id} divider={index < upcomingAdminTasks.length - 1}>
                                            <ListItemIcon sx={{minWidth: '40px'}}>{getPriorityIcon(item.priority)}</ListItemIcon>
                                            <ListItemText primary={item.title} secondary={`Έως: ${dayjs(item.start.toDate()).format('dddd, DD/MM')}`} />
                                        </ListItem>
                                    ))}
                                </List>
                            ) : ( <Typography color="text.secondary" sx={{ textAlign: 'center', p: 2 }}>Δεν υπάρχουν εκκρεμείς εργασίες.</Typography> )}
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                     <Card elevation={3} sx={{ height: '100%', borderRadius: '12px' }}>
                        <CardHeader title="Πρόσφατη Βαθμολογία" action={<Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/grades-summary')}>Αναλυτικά</Button>} />
                        <CardContent sx={{ pt: 0 }}>
                            {recentGrades.length > 0 ? (
                                <List dense>
                                    {recentGrades.map((item, index) => (
                                        <ListItem key={item.id} divider={index < recentGrades.length - 1}>
                                            <ListItemIcon sx={{minWidth: '40px'}}><GradeIcon color="secondary" /></ListItemIcon>
                                            <ListItemText primary={`${item.studentName}: ${item.grade}`} secondary={`${item.subject} - ${item.type}`} />
                                        </ListItem>
                                    ))}
                                 </List>
                            ) : ( <Typography color="text.secondary" sx={{ textAlign: 'center', p: 2 }}>Δεν υπάρχουν πρόσφατοι βαθμοί.</Typography> )}
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                    <Card elevation={3} sx={{ height: '100%', borderRadius: '12px' }}>
                        <CardHeader title="Ροή Δραστηριότητας" avatar={<ActivityIcon color="action"/>} />
                        <CardContent sx={{ pt: 0 }}>
                            {activityFeed.length > 0 ? (
                                <List dense>
                                    {activityFeed.map((item) => (
                                        <ListItem key={item.id} divider>
                                            <ListItemIcon sx={{minWidth: '40px'}}>{item.icon}</ListItemIcon>
                                            <ListItemText primary={item.text} secondary={dayjs(item.timestamp).fromNow()} />
                                        </ListItem>
                                    ))}
                                </List>
                            ) : ( <Typography color="text.secondary" sx={{ textAlign: 'center', p: 2 }}>Δεν υπάρχει πρόσφατη δραστηριότητα.</Typography> )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* LIBRARY STATS */}
                <Grid item xs={12}>
                    <Paper elevation={3} sx={{ p: 2, display: 'flex', alignItems: 'center', borderRadius: '12px' }}>
                        <Avatar sx={{ bgcolor: 'info.main', width: 56, height: 56, mr: 2 }}><BookIcon /></Avatar>
                        <Box sx={{ display: 'flex', justifyContent: 'space-around', width: '100%' }}>
                            <Box textAlign="center">
                                <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>{stats.libraryFileCount}</Typography>
                                <Typography color="text.secondary">Σύνολο Αρχείων Βιβλιοθήκης</Typography>
                            </Box>
                             <Divider orientation="vertical" flexItem />
                            <Box textAlign="center">
                                <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>{stats.libraryFilesThisWeek}</Typography>
                                <Typography color="text.secondary">Νέα Αρχεία (7 ημέρες)</Typography>
                            </Box>
                        </Box>
                        <IconButton sx={{ml: 2}} onClick={() => navigate('/library')}><ArrowForwardIcon /></IconButton>
                    </Paper>
                </Grid>

            </Grid>
        </Box>
    );
}

export default DashboardContent;

