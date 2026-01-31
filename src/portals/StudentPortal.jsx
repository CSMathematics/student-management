// src/portals/StudentPortal.jsx
import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box, CircularProgress, Typography, Paper } from '@mui/material';
import { StudentDataProvider, useStudentData } from '../context/StudentDataContext.jsx';
import { collection, onSnapshot } from 'firebase/firestore';

// Importing pages
import Communication from '../pages/Communication.jsx';
import MyGradesAndAbsences from './student/MyGradesAndAbsences.jsx';
import MyAssignments from './student/MyAssignments.jsx';
import MyMaterials from './student/MyMaterials.jsx';
import MyProfile from './student/MyProfile.jsx';
import StudentCalendar from './student/StudentCalendar.jsx';
import MyBadges from './student/MyBadges.jsx';
import MyCourses from './student/MyCourses.jsx';

// Study Guide pages
import FacultiesPage from '../pages/FacultiesPage.jsx';
import PointsCalculatorPage from '../pages/PointsCalculatorPage.jsx';

// Import extracted Dashboard
import StudentDashboard from './student/StudentDashboard.jsx';

// Placeholder components
const StudyGuideDocs = () => <Box p={3}><Typography variant="h5">Χρήσιμα Έγγραφα και Πληροφορίες</Typography></Box>;
const StudyGuideSimulation = () => <Box p={3}><Typography variant="h5">Προσομοίωση Μηχανογραφικού</Typography></Box>;

// Component managing Routes
const StudentPortalContent = () => {
    const studentProps = useStudentData();
    const { loading, studentId, studentData, selectedYear } = studentProps;

    // NOTE: Fetching all users is currently necessary for Communication page metadata resolution.
    // Ideally, this should be optimized to fetch only needed profiles or use server-side resolution.
    const [allUsers, setAllUsers] = useState([]);
    useEffect(() => {
        if (!studentProps.db) return;
        const usersRef = collection(studentProps.db, 'users');
        const unsubscribe = onSnapshot(usersRef, (snapshot) => {
            setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [studentProps.db]);

    const allAdmins = useMemo(() => {
        if (!allUsers) return [];
        // FIX: Check for 'roles' array, falling back to 'role' for legacy support
        return allUsers.filter(u =>
            (u.roles && u.roles.includes('admin')) ||
            u.role === 'admin'
        );
    }, [allUsers]);


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
                    allAdmins={allAdmins}
                    currentYearId={selectedYear}
                    allUsers={allUsers}
                />
            } />

            <Route path="/study-guide/faculties" element={<FacultiesPage {...studentProps} />} />
            <Route path="/study-guide/points-calculator" element={<PointsCalculatorPage {...studentProps} />} />
            <Route path="/study-guide/documents" element={<StudyGuideDocs {...studentProps} />} />
            <Route path="/study-guide/simulation" element={<StudyGuideSimulation {...studentProps} />} />
        </Routes>
    );
};

// Main StudentPortal component wrapping with Provider
function StudentPortal({ db, appId, user, userProfile }) {
    return (
        <StudentDataProvider db={db} appId={appId} user={user} userProfile={userProfile}>
            <StudentPortalContent />
        </StudentDataProvider>
    );
}

export default StudentPortal;
