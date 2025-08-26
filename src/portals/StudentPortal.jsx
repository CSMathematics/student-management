// src/portals/StudentPortal.jsx
import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography, Grid, Paper, List, ListItem, ListItemIcon, ListItemText, Button, Divider, LinearProgress } from '@mui/material';
import { Event as EventIcon, Grade as GradeIcon, Assignment as AssignmentIcon, EmojiEvents as BadgeIcon, MilitaryTech as LevelIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import { useAcademicYear } from '../context/AcademicYearContext.jsx';
import { StudentDataProvider, useStudentData } from '../context/StudentDataContext.jsx';

// Εισαγωγή των σελίδων του μαθητή
import Communication from '../pages/Communication.jsx';
import MyGradesAndAbsences from './student/MyGradesAndAbsences.jsx';
import MyAssignments from './student/MyAssignments.jsx';
import MyMaterials from './student/MyMaterials.jsx';
import MyProfile from './student/MyProfile.jsx';
import StudentCalendar from './student/StudentCalendar.jsx';
import MyBadges, { allBadges } from './student/MyBadges.jsx';
import MyCourses from './student/MyCourses.jsx';

// Το Dashboard component τώρα δέχεται τα δεδομένα ως props
const StudentDashboard = ({ studentData, enrolledClassrooms, grades, assignments, earnedBadges, levelInfo }) => {
    const navigate = useNavigate();
    const uniqueEarnedCount = React.useMemo(() => new Set(earnedBadges.map(b => b.badgeId)).size, [earnedBadges]);
    
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

    return (
        <Box>
            <Typography variant="h4" sx={{ mb: 3 }}>Καλώς ήρθες, {studentData?.firstName}!</Typography>
            <Grid container spacing={3}>
                 <Grid item xs={12}>
                    <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', background: 'linear-gradient(45deg, #1e88e5 30%, #64b5f6 90%)', color: 'white' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <i class="fa-solid fa-trophy"></i>
                                <Typography variant="h6">Η Πρόοδός σου</Typography>
                            </Box>
                            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{levelInfo.currentLevel.title}</Typography>
                        </Box>
                        <Box sx={{ my: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="h5">Level {levelInfo.currentLevel.level}</Typography>
                                <Typography variant="h5">{levelInfo.totalXp} / {levelInfo.nextLevel.xpRequired} XP</Typography>
                            </Box>
                            <LinearProgress
                                variant="determinate"
                                value={levelInfo.progressPercentage}
                                sx={{ height: 10, borderRadius: 5, '& .MuiLinearProgress-bar': { backgroundColor: '#fdd835' }, backgroundColor: 'rgba(255,255,255,0.3)' }}
                            />
                        </Box>
                        <Button size="small" onClick={() => navigate('/my-badges')} sx={{ alignSelf: 'flex-end', color: 'white' }}>
                            Δες τα παράσημά σου
                        </Button>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>Η Συλλογή σου</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexGrow: 1 }}>
                            <BadgeIcon sx={{ fontSize: 60, color: 'warning.main' }} />
                            <Box>
                                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{uniqueEarnedCount} / {allBadges.length}</Typography>
                                <Typography color="text.secondary">Τύποι Παρασήμων</Typography>
                            </Box>
                            <Divider orientation="vertical" flexItem />
                             <Box>
                                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{earnedBadges.length}</Typography>
                                <Typography color="text.secondary">Σύνολο Κερδισμένων</Typography>
                            </Box>
                        </Box>
                        <Button size="small" onClick={() => navigate('/my-badges')} sx={{ mt: 1, alignSelf: 'flex-end' }}>
                            Δες τη συλλογή
                        </Button>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>Οι πιο πρόσφατοι βαθμοί σου</Typography>
                        <List dense sx={{ flexGrow: 1 }}>
                            {recentGrades.length > 0 ? recentGrades.map(grade => (
                                <ListItem key={grade.id}>
                                    <ListItemIcon><GradeIcon color="secondary" /></ListItemIcon>
                                    <ListItemText
                                        primary={`${grade.subject}: ${grade.grade}`}
                                        secondary={`${grade.type} - ${dayjs(grade.date.toDate()).format('DD/MM/YYYY')}`}
                                    />
                                </ListItem>
                            )) : <Typography sx={{ p: 2 }}>Δεν υπάρχουν καταχωρημένοι βαθμοί.</Typography>}
                        </List>
                        <Button size="small" onClick={() => navigate('/my-grades')} sx={{ mt: 1, alignSelf: 'flex-end' }}>Όλοι οι Βαθμοί</Button>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>Επερχόμενες Εργασίες</Typography>
                        <List dense sx={{ flexGrow: 1 }}>
                            {upcomingAssignments.length > 0 ? upcomingAssignments.map(item => (
                                <ListItem key={item.id}>
                                    <ListItemIcon><AssignmentIcon color="info" /></ListItemIcon>
                                    <ListItemText
                                        primary={item.title}
                                        secondary={`Προθεσμία: ${dayjs(item.dueDate.toDate()).format('dddd, DD/MM')}`}
                                    />
                                </ListItem>
                            )) : <Typography sx={{ p: 2 }}>Δεν έχεις επερχόμενες εργασίες.</Typography>}
                        </List>
                        <Button size="small" onClick={() => navigate('/my-assignments')} sx={{ mt: 1, alignSelf: 'flex-end' }}>Όλες οι εργασίες</Button>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>Το σημερινό σου πρόγραμμα</Typography>
                        <List dense sx={{ flexGrow: 1 }}>
                            {todaysClasses.length > 0 ? todaysClasses.map((item, index) => (
                                <ListItem key={index}>
                                    <ListItemIcon><EventIcon color="primary" /></ListItemIcon>
                                    <ListItemText
                                        primary={`${item.startTime} - ${item.endTime}: ${item.subject}`}
                                        secondary={item.classroomName}
                                    />
                                </ListItem>
                            )) : <Typography sx={{ p: 2 }}>Δεν έχεις μαθήματα σήμερα.</Typography>}
                        </List>
                        <Button size="small" onClick={() => navigate('/my-schedule')} sx={{ mt: 1, alignSelf: 'flex-end' }}>Πλήρες Πρόγραμμα</Button>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

// Το component που διαχειρίζεται τα Routes
const StudentPortalContent = () => {
    const studentProps = useStudentData();
    const { loading, studentId, studentData, selectedYear } = studentProps;

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
    }

    if (!studentId) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="h5" color="error">Ο λογαριασμός σας δεν έχει συνδεθεί με προφίλ μαθητή.</Typography>
                <Typography>Παρακαλώ επικοινωνήστε με τη διαχείριση.</Typography>
            </Box>
        );
    }

    if (!studentData && !loading) {
        return (
            <Box sx={{ p: 3, textAlign: 'center', mt: 4 }}>
                <Paper sx={{ p: 4, display: 'inline-block' }}>
                    <Typography variant="h6">Δεν βρέθηκαν δεδομένα</Typography>
                    <Typography color="text.secondary">
                        Δεν υπάρχει εγγραφή για εσάς στο ακαδημαϊκό έτος {selectedYear}.
                    </Typography>
                </Paper>
            </Box>
        );
    }

    // --- ΔΙΟΡΘΩΣΗ: Περνάμε όλα τα props από το context σε κάθε Route ---
    return (
        <Routes>
            <Route path="/" element={<StudentDashboard {...studentProps} />} />
            <Route path="/my-schedule" element={<StudentCalendar {...studentProps} />} />
            <Route path="/my-grades" element={<MyGradesAndAbsences {...studentProps} type="grades" />} />
            <Route path="/my-absences" element={<MyGradesAndAbsences {...studentProps} type="absences" />} />
            <Route path="/my-assignments" element={<MyAssignments {...studentProps} />} />
            <Route path="/my-materials" element={<MyMaterials {...studentProps} />} />
            <Route path="/my-profile" element={<MyProfile {...studentProps} />} />
            <Route path="/my-badges" element={<MyBadges {...studentProps} />} />
            <Route path="/my-courses" element={<MyCourses {...studentProps} />} />
            <Route path="/communication" element={
                <Communication 
                    db={studentProps.db} 
                    appId={studentProps.appId} 
                    userId={studentProps.user.uid}
                    allStudents={studentProps.classmates} 
                    classrooms={studentProps.enrolledClassrooms}
                    allTeachers={studentProps.allTeachers}
                />
            } />
        </Routes>
    );
};

// Το αρχικό StudentPortal "τυλίγει" την εφαρμογή με τον Provider
function StudentPortal({ db, appId, user, userProfile }) {
    return (
        <StudentDataProvider db={db} appId={appId} user={user} userProfile={userProfile}>
            <StudentPortalContent />
        </StudentDataProvider>
    );
}

export default StudentPortal;
