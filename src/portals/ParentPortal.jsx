// src/portals/ParentPortal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Box, CircularProgress, Typography, Paper, FormControl, Select, MenuItem, Avatar } from '@mui/material';

// Pages
import Communication from '../pages/Communication.jsx';
import StudentReport from '../pages/StudentReport.jsx';
import ParentDashboard from './parent/ParentDashboard.jsx';
import ParentFinancials from './parent/ParentFinancials.jsx';
import ViewAnnouncements from './parent/ViewAnnouncements.jsx';
import TeachersAndReport from './parent/TeachersAndReport.jsx';
import ParentProfile from './parent/ParentProfile.jsx'; // <-- ΝΕΑ ΕΙΣΑΓΩΓΗ
// Reusable Student Components
import StudentCalendar from './student/StudentCalendar.jsx';
import MyGradesAndAbsences from './student/MyGradesAndAbsences.jsx';
import MyAssignments from './student/MyAssignments.jsx';
import MyMaterials from './student/MyMaterials.jsx';

function ParentPortal({ db, appId, user, userProfile }) {
    const [childrenData, setChildrenData] = useState([]);
    const [selectedChildId, setSelectedChildId] = useState('');
    
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

    const childIds = userProfile?.childIds || [];

    useEffect(() => {
        if (!db || !appId || childIds.length === 0) {
            setLoading(false);
            return;
        }

        const unsubscribes = [];
        setLoading(true);

        const childrenQuery = query(collection(db, `artifacts/${appId}/public/data/students`), where('__name__', 'in', childIds));
        unsubscribes.push(onSnapshot(childrenQuery, (snapshot) => {
            const kidsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setChildrenData(kidsData);
            if (!selectedChildId && kidsData.length > 0) {
                setSelectedChildId(kidsData[0].id);
            }
        }));

        const queries = {
            grades: query(collection(db, `artifacts/${appId}/public/data/grades`), where("studentId", "in", childIds)),
            absences: query(collection(db, `artifacts/${appId}/public/data/absences`), where("studentId", "in", childIds)),
            payments: query(collection(db, `artifacts/${appId}/public/data/payments`), where("studentId", "in", childIds)),
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
    }, [db, appId, userProfile]);

    useEffect(() => {
        if (childrenData.length === 0) {
            setLoading(false);
            return;
        }
        const allEnrolledClassroomIds = [...new Set(childrenData.flatMap(c => c.enrolledClassrooms || []))];
        if (allEnrolledClassroomIds.length === 0) {
            setLoading(false);
            return;
        }
        const classroomsQuery = query(collection(db, `artifacts/${appId}/public/data/classrooms`), where('__name__', 'in', allEnrolledClassroomIds));
        const unsubClassrooms = onSnapshot(classroomsQuery, (snapshot) => {
            setEnrolledClassrooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => unsubClassrooms();
    }, [db, appId, childrenData]);


    const selectedChildData = useMemo(() => childrenData.find(c => c.id === selectedChildId), [childrenData, selectedChildId]);
    
    const dataForSelectedChild = useMemo(() => {
        if (!selectedChildData) return {};
        const childEnrolledClassroomIds = selectedChildData.enrolledClassrooms || [];
        return {
            childData: selectedChildData,
            grades: grades.filter(g => g.studentId === selectedChildId),
            absences: absences.filter(a => a.studentId === selectedChildId),
            payments: payments.filter(p => p.studentId === selectedChildId),
            enrolledClassrooms: enrolledClassrooms.filter(c => childEnrolledClassroomIds.includes(c.id)),
            assignments: allAssignments.filter(a => childEnrolledClassroomIds.includes(a.classroomId)),
        };
    }, [selectedChildId, selectedChildData, grades, absences, payments, enrolledClassrooms, allAssignments]);


    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
    }
    
    if (childIds.length === 0) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="h5" color="error">Ο λογαριασμός σας δεν έχει συνδεθεί με προφίλ μαθητή.</Typography>
                <Typography>Παρακαλώ επικοινωνήστε με τη διαχείριση.</Typography>
            </Box>
        );
    }
    
    const commonProps = { 
        db, appId, user, 
        announcements, allDailyLogs, allCourses, allTeachers,
        ...dataForSelectedChild
    };

    return (
        <>
            {childrenData.length > 1 && (
                <Paper sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography>Προβολή για:</Typography>
                    <FormControl size="small">
                        <Select
                            value={selectedChildId}
                            onChange={(e) => setSelectedChildId(e.target.value)}
                            renderValue={(selected) => {
                                const student = childrenData.find(c => c.id === selected);
                                return (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Avatar sx={{ width: 24, height: 24, fontSize: '0.8rem' }}>{student?.firstName?.[0]}</Avatar>
                                        {student?.firstName} {student?.lastName}
                                    </Box>
                                );
                            }}
                        >
                            {childrenData.map(child => (
                                <MenuItem key={child.id} value={child.id}>
                                    {child.firstName} {child.lastName}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Paper>
            )}

            <Box key={selectedChildId}>
                <Routes>
                    <Route path="/" element={<ParentDashboard {...commonProps} />} />
                    <Route path="/my-profile" element={<ParentProfile {...commonProps} />} /> {/* <-- ΝΕΑ ΔΙΑΔΡΟΜΗ */}
                    <Route path="/child-schedule" element={<StudentCalendar {...commonProps} />} />
                    <Route path="/child-assignments" element={<MyAssignments {...commonProps} />} />
                    <Route path="/child-materials" element={<MyMaterials {...commonProps} />} />
                    <Route path="/child-grades-absences" element={<MyGradesAndAbsences {...commonProps} />} />
                    <Route path="/payments" element={<ParentFinancials {...commonProps} />} />
                    <Route path="/announcements" element={<ViewAnnouncements announcements={announcements} loading={loading} />} />
                    <Route path="/child-teachers-report" element={<TeachersAndReport {...commonProps} />} />
                    <Route path="/student/report/:studentId" element={<StudentReport {...commonProps} allStudents={childrenData} />} />
                    <Route path="/communication" element={
                        <Communication 
                            db={db} appId={appId} userId={user.uid}
                            allStudents={childrenData} 
                            classrooms={enrolledClassrooms}
                            allTeachers={allTeachers}
                        />
                    } />
                </Routes>
            </Box>
        </>
    );
}

export default ParentPortal;
