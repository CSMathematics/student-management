import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Grid, Paper, List, ListItem, ListItemIcon, ListItemText, Button, Divider, LinearProgress, useTheme } from '@mui/material';
import { Event as EventIcon, Grade as GradeIcon, Assignment as AssignmentIcon, EmojiEvents as BadgeIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import { allBadges } from './MyBadges.jsx';
import DashboardCard from '../../components/DashboardCard.jsx';

dayjs.extend(isSameOrAfter);

const StudentDashboard = ({ studentData, enrolledClassrooms, grades, assignments, earnedBadges, levelInfo }) => {
    const navigate = useNavigate();
    const theme = useTheme();

    // Ensure earnedBadges is an array to avoid errors
    const safeEarnedBadges = Array.isArray(earnedBadges) ? earnedBadges : [];

    const uniqueEarnedCount = React.useMemo(() => new Set(safeEarnedBadges.map(b => b.badgeId)).size, [safeEarnedBadges]);

    const todaysClasses = React.useMemo(() => {
        if (!enrolledClassrooms) return [];
        const today = dayjs().format('dddd');
        return enrolledClassrooms
            .flatMap(c => (c.schedule || []).map(s => ({ ...s, classroomName: c.classroomName, subject: c.subject })))
            .filter(s => s.day.toLowerCase() === today.toLowerCase())
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
    }, [enrolledClassrooms]);

    const recentGrades = React.useMemo(() => {
        if (!grades) return [];
        return [...grades].sort((a, b) => b.date.toDate() - a.date.toDate()).slice(0, 5);
    }, [grades]);

    const upcomingAssignments = React.useMemo(() => {
        if (!assignments) return [];
        const today = dayjs().startOf('day');
        return [...assignments]
            .filter(a => dayjs(a.dueDate.toDate()).isSameOrAfter(today))
            .sort((a, b) => a.dueDate.toDate() - b.dueDate.toDate())
            .slice(0, 3);
    }, [assignments]);

    // Calculate level info safely
    const currentLevelInfo = levelInfo || {
        currentLevel: { title: 'Novice', level: 1 },
        totalXp: 0,
        nextLevel: { xpRequired: 100 },
        progressPercentage: 0
    };

    return (
        <Box>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`, backgroundClip: 'text', textFillColor: 'transparent', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Καλώς ήρθες, {studentData?.firstName}!
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Εδώ είναι η σύνοψη της προόδου σου για σήμερα.
                </Typography>
            </Box>

            <Grid container spacing={3}>
                {/* Hero Section: Level & Progress */}
                <Grid item xs={12} md={8}>
                    <DashboardCard
                        sx={{
                            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                            color: 'white',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        <Box sx={{ position: 'relative', zIndex: 1, width: '100%' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                                <Box>
                                    <Typography variant="overline" sx={{ opacity: 0.8, letterSpacing: 1.2 }}>ΤΡΕΧΟΝ ΕΠΙΠΕΔΟ</Typography>
                                    <Typography variant="h3" sx={{ fontWeight: 800 }}>{currentLevelInfo.currentLevel.title}</Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                        <BadgeIcon sx={{ color: theme.palette.warning.main }} />
                                        <Typography variant="h6">Level {currentLevelInfo.currentLevel.level}</Typography>
                                    </Box>
                                </Box>
                                <Box sx={{ textAlign: 'right' }}>
                                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{currentLevelInfo.totalXp}</Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.8 }}>Συνολικά XP</Typography>
                                </Box>
                            </Box>

                            <Box sx={{ mt: 4 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Πρόοδος για το επόμενο επίπεδο</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{currentLevelInfo.nextLevel.xpRequired - currentLevelInfo.totalXp} XP ακόμη</Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={currentLevelInfo.progressPercentage}
                                    sx={{
                                        height: 12,
                                        borderRadius: 6,
                                        backgroundColor: 'rgba(255,255,255,0.2)',
                                        '& .MuiLinearProgress-bar': {
                                            backgroundColor: theme.palette.warning.main,
                                            borderRadius: 6
                                        }
                                    }}
                                />
                            </Box>
                        </Box>

                        {/* Decorative background elements */}
                        <Box sx={{
                            position: 'absolute',
                            top: -20,
                            right: -20,
                            width: 200,
                            height: 200,
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)',
                        }} />
                    </DashboardCard>
                </Grid>

                {/* Quick Badge Stats */}
                <Grid item xs={12} md={4}>
                    <DashboardCard onClick={() => navigate('/my-badges')} sx={{ flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                        <BadgeIcon sx={{ fontSize: 64, color: 'warning.main', mb: 2, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))' }} />
                        <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>
                            {safeEarnedBadges.length}
                        </Typography>
                        <Typography variant="body1" color="text.secondary" gutterBottom>
                            Κερδισμένα Παράσημα
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 'bold', mt: 1 }}>
                            {uniqueEarnedCount} / {allBadges.length} Μοναδικά
                        </Typography>
                    </DashboardCard>
                </Grid>

                {/* Today's Schedule */}
                <Grid item xs={12} md={6}>
                    <DashboardCard sx={{ flexDirection: 'column' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Πρόγραμμα Σήμερα</Typography>
                            <Button size="small" onClick={() => navigate('/my-schedule')} variant="text">Προβολή Όλων</Button>
                        </Box>
                        <List dense sx={{ flexGrow: 1 }}>
                            {todaysClasses.length > 0 ? todaysClasses.map((item, index) => (
                                <ListItem key={index} sx={{
                                    mb: 1,
                                    bgcolor: theme.palette.background.default,
                                    borderRadius: 3,
                                    borderLeft: `4px solid ${theme.palette.primary.main}`
                                }}>
                                    <ListItemIcon sx={{ minWidth: 40 }}><EventIcon color="primary" fontSize="small" /></ListItemIcon>
                                    <ListItemText
                                        primary={<Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{item.subject}</Typography>}
                                        secondary={`${item.startTime} - ${item.endTime} | ${item.classroomName}`}
                                    />
                                </ListItem>
                            )) : (
                                <Box sx={{ textAlign: 'center', py: 3, opacity: 0.6 }}>
                                    <EventIcon sx={{ fontSize: 40, mb: 1, color: 'text.disabled' }} />
                                    <Typography variant="body2">Κανένα μάθημα σήμερα.</Typography>
                                </Box>
                            )}
                        </List>
                    </DashboardCard>
                </Grid>

                {/* Upcoming Assignments */}
                <Grid item xs={12} md={6}>
                    <DashboardCard sx={{ flexDirection: 'column' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Εργασίες</Typography>
                            <Button size="small" onClick={() => navigate('/my-assignments')} variant="text">Προβολή Όλων</Button>
                        </Box>
                        <List dense sx={{ flexGrow: 1 }}>
                            {upcomingAssignments.length > 0 ? upcomingAssignments.map(item => (
                                <ListItem key={item.id} sx={{ mb: 1, bgcolor: theme.palette.background.default, borderRadius: 2 }}>
                                    <ListItemIcon sx={{ minWidth: 40 }}><AssignmentIcon color="info" fontSize="small" /></ListItemIcon>
                                    <ListItemText
                                        primary={<Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{item.title}</Typography>}
                                        secondary={
                                            <Typography variant="caption" color={dayjs(item.dueDate.toDate()).diff(dayjs(), 'day') < 2 ? 'error' : 'textSecondary'}>
                                                {`Προθεσμία: ${dayjs(item.dueDate.toDate()).format('ddd, DD/MM')}`}
                                            </Typography>
                                        }
                                    />
                                </ListItem>
                            )) : (
                                <Box sx={{ textAlign: 'center', py: 3, opacity: 0.6 }}>
                                    <AssignmentIcon sx={{ fontSize: 40, mb: 1, color: 'text.disabled' }} />
                                    <Typography variant="body2">Καμία επερχόμενη εργασία.</Typography>
                                </Box>
                            )}
                        </List>
                    </DashboardCard>
                </Grid>

                {/* Recent Grades - Compact */}
                <Grid item xs={12}>
                    <DashboardCard sx={{ flexDirection: 'column' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Πρόσφατοι Βαθμοί</Typography>
                            <Button size="small" onClick={() => navigate('/my-grades')} variant="text">Αναλυτικά</Button>
                        </Box>

                        <Grid container spacing={2}>
                            {recentGrades.length > 0 ? recentGrades.slice(0, 4).map(grade => (
                                <Grid item xs={6} sm={3} key={grade.id}>
                                    <Box sx={{
                                        p: 2,
                                        borderRadius: 3,
                                        bgcolor: theme.palette.background.default,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        textAlign: 'center'
                                    }}>
                                        <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>{grade.grade}</Typography>
                                        <Typography variant="caption" noWrap sx={{ width: '100%', fontWeight: 600, mt: 0.5 }}>{grade.subject}</Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>{dayjs(grade.date.toDate()).format('DD/MM')}</Typography>
                                    </Box>
                                </Grid>
                            )) : (
                                <Grid item xs={12}>
                                    <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>Δεν υπάρχουν πρόσφατοι βαθμοί.</Typography>
                                </Grid>
                            )}
                        </Grid>
                    </DashboardCard>
                </Grid>
            </Grid>
        </Box>
    );
};

export default StudentDashboard;
