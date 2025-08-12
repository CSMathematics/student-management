// src/portals/ParentPortal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { Box, CircularProgress, Typography } from '@mui/material';

// Pages
import Communication from '../pages/Communication.jsx';
import StudentReport from '../pages/StudentReport.jsx';
import ParentDashboard from './parent/ParentDashboard.jsx';
import ParentFinancials from './parent/ParentFinancials.jsx';
import ViewAnnouncements from './parent/ViewAnnouncements.jsx';
import TeachersAndReport from './parent/TeachersAndReport.jsx';
// Reusable Student Components
import StudentCalendar from './student/StudentCalendar.jsx';
import MyGradesAndAbsences from './student/MyGradesAndAbsences.jsx';
import MyAssignments from './student/MyAssignments.jsx';
import MyMaterials from './student/MyMaterials.jsx';


function ParentPortal({ db, appId, user, userProfile }) {
    const [childData, setChildData] = useState(null);
    const [enrolledClassrooms, setEnrolledClassrooms] = useState([]);
    const [grades, setGrades] = useState([]);
    const [absences, setAbsences] = useState([]);
    const [payments, setPayments] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [allAssignments, setAllAssignments] = useState([]);
    const [allDailyLogs, setAllDailyLogs] = useState([]);
    const [allCourses, setAllCourses] = useState([]);
    const [allTeachers, setAllTeachers] = useState([]);
    const [loading, setLoading] = useState(true);

    const childId = userProfile?.childId;

    useEffect(() => {
        if (!db || !appId || !childId) {
            setLoading(false);
            return;
        }

        const unsubscribes = [];
        setLoading(true);

        const childRef = doc(db, `artifacts/${appId}/public/data/students`, childId);
        unsubscribes.push(onSnapshot(childRef, (doc) => {
            if (doc.exists()) setChildData({ id: doc.id, ...doc.data() });
        }));

        const queries = {
            grades: query(collection(db, `artifacts/${appId}/public/data/grades`), where("studentId", "==", childId)),
            absences: query(collection(db, `artifacts/${appId}/public/data/absences`), where("studentId", "==", childId)),
            payments: query(collection(db, `artifacts/${appId}/public/data/payments`), where("studentId", "==", childId)),
            announcements: query(collection(db, `artifacts/${appId}/public/data/announcements`)),
            assignments: query(collection(db, `artifacts/${appId}/public/data/assignments`)),
            dailyLogs: query(collection(db, `artifacts/${appId}/public/data/dailyLogs`)),
            courses: query(collection(db, `artifacts/${appId}/public/data/courses`)),
            teachers: query(collection(db, `artifacts/${appId}/public/data/teachers`))
        };

        const setters = {
            grades: setGrades, absences: setAbsences, payments: setPayments,
            announcements: setAnnouncements, assignments: setAllAssignments,
            dailyLogs: setAllDailyLogs, courses: setAllCourses,
            teachers: setAllTeachers
        };
        
        for (const [key, q] of Object.entries(queries)) {
            unsubscribes.push(onSnapshot(q, (snapshot) => {
                setters[key](snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            }));
        }

        return () => unsubscribes.forEach(unsub => unsub());
    }, [db, appId, childId]);

    useEffect(() => {
        if (!childData?.enrolledClassrooms || childData.enrolledClassrooms.length === 0) {
            if(childData) setLoading(false);
            return;
        }
        const classroomsQuery = query(collection(db, `artifacts/${appId}/public/data/classrooms`), where('__name__', 'in', childData.enrolledClassrooms));
        const unsubClassrooms = onSnapshot(classroomsQuery, (snapshot) => {
            setEnrolledClassrooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => unsubClassrooms();
    }, [db, appId, childData]);

    const childAssignments = useMemo(() => {
        if (!childData || !allAssignments) return [];
        const enrolledIds = childData.enrolledClassrooms || [];
        return allAssignments.filter(a => enrolledIds.includes(a.classroomId));
    }, [childData, allAssignments]);


    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
    }
    
    if (!childId || !childData) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="h5" color="error">Ο λογαριασμός σας δεν έχει συνδεθεί με προφίλ μαθητή.</Typography>
                <Typography>Παρακαλώ επικοινωνήστε με τη διαχείριση.</Typography>
            </Box>
        );
    }
    
    const commonProps = { 
        db, appId, userId: user.uid, 
        studentData: childData,
        allStudents: [childData],
        // --- Η ΔΙΟΡΘΩΣΗ ΕΙΝΑΙ ΕΔΩ ---
        enrolledClassrooms: enrolledClassrooms, // Το όνομα του prop ταιριάζει με αυτό που περιμένουν τα child components
        classrooms: enrolledClassrooms, // Το κρατάμε για συμβατότητα αν κάποιο component το χρησιμοποιεί
        grades, absences, payments, announcements,
        allAssignments: childAssignments, allDailyLogs, allCourses, allTeachers,
        childData
    };

    return (
        <Routes>
            <Route path="/" element={<ParentDashboard {...commonProps} assignments={childAssignments} />} />
            <Route path="/child-schedule" element={<StudentCalendar {...commonProps} />} />
            <Route path="/child-assignments" element={<MyAssignments {...commonProps} />} />
            <Route path="/child-materials" element={<MyMaterials {...commonProps} />} />
            <Route path="/child-grades-absences" element={<MyGradesAndAbsences {...commonProps} />} />
            <Route path="/payments" element={<ParentFinancials {...commonProps} />} />
            <Route path="/announcements" element={<ViewAnnouncements announcements={announcements} loading={loading} />} />
            <Route path="/child-teachers-report" element={<TeachersAndReport {...commonProps} />} />
            <Route path="/student/report/:studentId" element={<StudentReport {...commonProps} />} />
            <Route path="/communication" element={
                <Communication 
                    db={db} 
                    appId={appId} 
                    userId={user.uid}
                    allStudents={[childData]} 
                    classrooms={enrolledClassrooms}
                    allTeachers={allTeachers}
                />
            } />
        </Routes>
    );
}

export default ParentPortal;
