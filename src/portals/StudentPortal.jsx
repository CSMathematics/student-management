// src/portals/StudentPortal.jsx
import { React, useState, useEffect, useMemo } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { Box, CircularProgress, Typography, Grid, Paper, List, ListItem, ListItemIcon, ListItemText, Button } from '@mui/material';
import { Event as EventIcon, Grade as GradeIcon, Campaign as CampaignIcon, Assignment as AssignmentIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import { useAcademicYear } from '../context/AcademicYearContext.jsx';

// Εισαγωγή των σελίδων του μαθητή
import Communication from '../pages/Communication.jsx';
import MyGradesAndAbsences from './student/MyGradesAndAbsences.jsx';
import MyAssignments from './student/MyAssignments.jsx';
import MyMaterials from './student/MyMaterials.jsx';
import MyProfile from './student/MyProfile.jsx';
import StudentCalendar from './student/StudentCalendar.jsx';

const StudentDashboard = ({ studentData, enrolledClassrooms, grades, announcements, assignments }) => {
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
            <Typography variant="h4" sx={{ mb: 3 }}>Καλώς ήρθες, {studentData?.firstName}!</Typography>
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>Επερχόμενες Εργασίες</Typography>
                        <List dense>
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
                        <Button size="small" onClick={() => navigate('/my-assignments')} sx={{ mt: 1 }}>Όλες οι εργασίες</Button>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>Το σημερινό σου πρόγραμμα</Typography>
                        <List dense>
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
                        <Button size="small" onClick={() => navigate('/my-schedule')} sx={{ mt: 1 }}>Πλήρες Πρόγραμμα</Button>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>Οι πιο πρόσφατοι βαθμοί σου</Typography>
                        <List dense>
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
                        <Button size="small" onClick={() => navigate('/my-grades')} sx={{ mt: 1 }}>Όλοι οι Βαθμοί</Button>
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


function StudentPortal({ db, appId, user, userProfile }) {
    const { selectedYear, loadingYears } = useAcademicYear();
    const [studentData, setStudentData] = useState(null);
    const [enrolledClassrooms, setEnrolledClassrooms] = useState([]);
    const [grades, setGrades] = useState([]);
    const [absences, setAbsences] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [allAssignments, setAllAssignments] = useState([]);
    const [allDailyLogs, setAllDailyLogs] = useState([]);
    const [allCourses, setAllCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    const studentId = userProfile?.profileId;

    useEffect(() => {
        if (!db || !appId || !studentId || !selectedYear) {
            if (!loadingYears) setLoading(false);
            return;
        }

        const unsubscribes = [];
        setLoading(true);
        let isMounted = true;

        const yearPath = `artifacts/${appId}/public/data/academicYears/${selectedYear}`;

        const studentRef = doc(db, `${yearPath}/students`, studentId);
        unsubscribes.push(onSnapshot(studentRef, (doc) => { 
            if (isMounted && doc.exists()) setStudentData({ id: doc.id, ...doc.data() }); 
        }));

        const gradesQuery = query(collection(db, `${yearPath}/grades`), where("studentId", "==", studentId));
        unsubscribes.push(onSnapshot(gradesQuery, (snapshot) => {
            if (isMounted) setGrades(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        }));

        const absencesQuery = query(collection(db, `${yearPath}/absences`), where("studentId", "==", studentId));
        unsubscribes.push(onSnapshot(absencesQuery, (snapshot) => {
            if (isMounted) setAbsences(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        }));
        
        const announcementsQuery = query(collection(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/announcements`));
        unsubscribes.push(onSnapshot(announcementsQuery, (snapshot) => {
            if (isMounted) setAnnouncements(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        }));

        const assignmentsQuery = query(collection(db, `${yearPath}/assignments`));
        unsubscribes.push(onSnapshot(assignmentsQuery, (snapshot) => {
            if (isMounted) setAllAssignments(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        }));
        
        const dailyLogsQuery = query(collection(db, `${yearPath}/dailyLogs`));
        unsubscribes.push(onSnapshot(dailyLogsQuery, (snapshot) => {
            if (isMounted) setAllDailyLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        }));

        const coursesQuery = query(collection(db, `${yearPath}/courses`));
        unsubscribes.push(onSnapshot(coursesQuery, (snapshot) => {
            if (isMounted) setAllCourses(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        }));

        return () => { isMounted = false; unsubscribes.forEach(unsub => unsub()); };
    }, [db, appId, studentId, selectedYear, loadingYears]);

    useEffect(() => {
        if (!studentData?.enrolledClassrooms || studentData.enrolledClassrooms.length === 0) {
            if(studentData) setLoading(false);
            return;
        }
        const yearPath = `artifacts/${appId}/public/data/academicYears/${selectedYear}`;
        const classroomsQuery = query(collection(db, `${yearPath}/classrooms`), where('__name__', 'in', studentData.enrolledClassrooms));
        const unsubClassrooms = onSnapshot(classroomsQuery, (snapshot) => {
            setEnrolledClassrooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => unsubClassrooms();
    }, [db, appId, studentData, selectedYear]);
    
    const studentAssignments = useMemo(() => {
        if (!studentData || !allAssignments) return [];
        const enrolledIds = studentData.enrolledClassrooms || [];
        return allAssignments.filter(a => enrolledIds.includes(a.classroomId));
    }, [studentData, allAssignments]);


    if (loading || loadingYears) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
    }
    
    if (!studentId) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="h5" color="error">Ο λογαριασμός σας δεν έχει συνδεθεί με προφίλ μαθητή.</Typography>
                <Typography>Παρακαλώ επικοινωνήστε με τη διαχείριση.</Typography>
            </Box>
        );
    }
    
    const commonProps = { 
        db, appId, user,
        studentData, enrolledClassrooms, grades, absences, announcements,
        assignments: studentAssignments,
        allDailyLogs,
        allCourses
    };

    return (
        <Routes>
            <Route path="/" element={<StudentDashboard {...commonProps} />} />
            <Route path="/my-schedule" element={<StudentCalendar {...commonProps} />} />
            <Route path="/my-grades" element={<MyGradesAndAbsences {...commonProps} type="grades" />} />
            <Route path="/my-absences" element={<MyGradesAndAbsences {...commonProps} type="absences" />} />
            <Route path="/my-assignments" element={<MyAssignments {...commonProps} />} />
            <Route path="/my-materials" element={<MyMaterials {...commonProps} />} />
            <Route path="/my-profile" element={<MyProfile {...commonProps} />} />
            <Route path="/communication" element={
                <Communication 
                    db={db} 
                    appId={appId} 
                    userId={user.uid}
                    allStudents={[studentData]} 
                    classrooms={enrolledClassrooms}
                />
            } />
        </Routes>
    );
}

export default StudentPortal;
