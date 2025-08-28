// src/portals/ParentPortal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Box, CircularProgress, Typography, Paper, FormControl, Select, MenuItem, Avatar } from '@mui/material';
import { useAcademicYear } from '../context/AcademicYearContext.jsx';

// Pages
import Communication from '../pages/Communication.jsx';
import StudentReport from '../pages/StudentReport.jsx';
import ParentDashboard from './parent/ParentDashboard.jsx';
import ParentFinancials from './parent/ParentFinancials.jsx';
import ViewAnnouncements from './parent/ViewAnnouncements.jsx';
import TeachersAndReport from './parent/TeachersAndReport.jsx';
import ParentProfile from './parent/ParentProfile.jsx';
// Reusable Student Components
import StudentCalendar from './student/StudentCalendar.jsx';
import MyGradesAndAbsences from './student/MyGradesAndAbsences.jsx';
import MyAssignments from './student/MyAssignments.jsx';
import MyMaterials from './student/MyMaterials.jsx';

function ParentPortal({ db, appId, user, userProfile }) {
    const { selectedYear, loadingYears } = useAcademicYear();
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
    const [submissions, setSubmissions] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const childIds = userProfile?.childIds || [];

    useEffect(() => {
        if (!db || !appId || !selectedYear) {
            if (!loadingYears) setLoading(false);
            return;
        }

        let isMounted = true;
        setLoading(true);

        const yearPath = `artifacts/${appId}/public/data/academicYears/${selectedYear}`;
        const unsubscribes = [];

        // Fetch data that is not dependent on specific children first
        const globalCollections = {
            users: setAllUsers,
            teachers: setAllTeachers,
            announcements: setAnnouncements,
            assignments: setAllAssignments,
            dailyLogs: setAllDailyLogs,
            courses: setAllCourses,
        };

        for (const [name, setter] of Object.entries(globalCollections)) {
            const ref = collection(db, name === 'users' ? 'users' : `${yearPath}/${name}`);
            unsubscribes.push(onSnapshot(ref, (snapshot) => {
                if (isMounted) {
                    setter(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                }
            }));
        }

        // Fetch children data
        if (childIds.length > 0) {
            const childrenQuery = query(collection(db, `${yearPath}/students`), where('__name__', 'in', childIds));
            unsubscribes.push(onSnapshot(childrenQuery, (snapshot) => {
                if (isMounted) {
                    const kidsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setChildrenData(kidsData);
                    
                    // Set selected child or update if selection is no longer valid
                    if (!selectedChildId && kidsData.length > 0) {
                        setSelectedChildId(kidsData[0].id);
                    } else if (kidsData.length > 0 && !kidsData.some(k => k.id === selectedChildId)) {
                        setSelectedChildId(kidsData[0].id);
                    } else if (kidsData.length === 0) {
                        setSelectedChildId('');
                    }

                    // Fetch child-specific data only after children are loaded
                    const childSpecificQueries = {
                        grades: query(collection(db, `${yearPath}/grades`), where("studentId", "in", childIds)),
                        absences: query(collection(db, `${yearPath}/absences`), where("studentId", "in", childIds)),
                        payments: query(collection(db, `${yearPath}/payments`), where("studentId", "in", childIds)),
                        submissions: query(collection(db, `${yearPath}/submissions`), where("studentId", "in", childIds)),
                    };
                    const setters = { grades: setGrades, absences: setAbsences, payments: setPayments, submissions: setSubmissions };
                    for (const [key, q] of Object.entries(childSpecificQueries)) {
                        unsubscribes.push(onSnapshot(q, (snapshot) => {
                            if (isMounted) setters[key](snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
                        }));
                    }
                }
            }));
        } else {
             setLoading(false);
        }

        return () => { isMounted = false; unsubscribes.forEach(unsub => unsub()); };
    }, [db, appId, userProfile, selectedYear, loadingYears]);

    useEffect(() => {
        if (childrenData.length === 0) {
            setLoading(false); // Stop loading if there are no children for this year
            return;
        }
        let isMounted = true;
        const allEnrolledClassroomIds = [...new Set(childrenData.flatMap(c => c.enrolledClassrooms || []))];
        
        if (allEnrolledClassroomIds.length === 0) {
            setEnrolledClassrooms([]);
            setLoading(false); // Stop loading if children are not in any class
            return;
        }

        const yearPath = `artifacts/${appId}/public/data/academicYears/${selectedYear}`;
        const classroomsQuery = query(collection(db, `${yearPath}/classrooms`), where('__name__', 'in', allEnrolledClassroomIds));
        const unsubClassrooms = onSnapshot(classroomsQuery, (snapshot) => {
            if (isMounted) {
                setEnrolledClassrooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoading(false); // Final loading state update
            }
        });
        return () => { isMounted = false; unsubClassrooms(); }
    }, [db, appId, childrenData, selectedYear]);

    const allAdmins = useMemo(() => {
        if (!allUsers) return [];
        return allUsers.filter(u => u.role === 'admin');
    }, [allUsers]);

    const selectedChildData = useMemo(() => childrenData.find(c => c.id === selectedChildId), [childrenData, selectedChildId]);
    
    const dataForSelectedChild = useMemo(() => {
        if (!selectedChildData) return {
            childData: null, grades: [], absences: [], payments: [],
            enrolledClassrooms: [], assignments: [], submissions: []
        };
        const childEnrolledClassroomIds = selectedChildData.enrolledClassrooms || [];
        return {
            childData: selectedChildData,
            grades: grades.filter(g => g.studentId === selectedChildId),
            absences: absences.filter(a => a.studentId === selectedChildId),
            payments: payments.filter(p => p.studentId === selectedChildId),
            submissions: submissions.filter(s => s.studentId === selectedChildId),
            enrolledClassrooms: enrolledClassrooms.filter(c => childEnrolledClassroomIds.includes(c.id)),
            assignments: allAssignments.filter(a => childEnrolledClassroomIds.includes(a.classroomId)),
        };
    }, [selectedChildId, selectedChildData, grades, absences, payments, enrolledClassrooms, allAssignments, submissions]);


    if (loading || loadingYears) {
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
                {selectedChildData ? (
                    <Routes>
                        <Route path="/" element={<ParentDashboard {...commonProps} />} />
                        <Route path="/my-profile" element={<ParentProfile {...commonProps} />} />
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
                                allAdmins={allAdmins}
                                currentYearId={selectedYear}
                            />
                        } />
                    </Routes>
                ) : (
                    <Typography sx={{mt: 3}}>Δεν βρέθηκαν δεδομένα για το παιδί σας για τη σχολική χρονιά {selectedYear}.</Typography>
                )}
            </Box>
        </>
    );
}

export default ParentPortal;
