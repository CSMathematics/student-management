// src/portals/TeacherPortal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAcademicYear } from '../context/AcademicYearContext.jsx';

// Pages
import TeacherDashboard from './teacher/TeacherDashboard.jsx';
import MyGradebook from './teacher/MyGradebook.jsx';
import MyAssignmentsManager from './teacher/MyAssignmentsManager.jsx';
import MyStudents from './teacher/MyStudents.jsx';
import WeeklyScheduleCalendar from '../pages/WeeklyScheduleCalendar.jsx';
import Communication from '../pages/Communication.jsx';
import TeacherStats from './teacher/TeacherStats.jsx';
import Classrooms from '../pages/Classrooms.jsx';
import StudentReport from '../pages/StudentReport.jsx';
import TeacherProfile from './teacher/TeacherProfile.jsx';
import MyLibrary from './teacher/MyLibrary.jsx';
import MyCourses from './teacher/MyCourses.jsx';
import CourseForm from '../pages/CourseForm.jsx';

const CourseFormWrapper = (props) => {
    const { courseId } = useParams();
    return <CourseForm {...props} key={courseId} />;
};

function TeacherPortal({ db, appId, user, userProfile }) {
    const { selectedYear, loadingYears } = useAcademicYear();
    const [teacherData, setTeacherData] = useState(null);
    const [assignedClassrooms, setAssignedClassrooms] = useState([]);
    const [studentsInClassrooms, setStudentsInClassrooms] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [allAssignments, setAllAssignments] = useState([]);
    const [allCourses, setAllCourses] = useState([]);
    const [allGrades, setAllGrades] = useState([]);
    const [allAbsences, setAllAbsences] = useState([]);
    const [allTeachers, setAllTeachers] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [allPayments, setAllPayments] = useState([]);
    const [allSubmissions, setAllSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);

    const teacherId = userProfile?.profileId;

    useEffect(() => {
        if (!db || !appId || !teacherId || !selectedYear) {
            if (!loadingYears) setLoading(false);
            return;
        }

        const unsubscribes = [];
        setLoading(true);
        let isMounted = true;

        const teacherRef = doc(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/teachers`, teacherId);
        unsubscribes.push(onSnapshot(teacherRef, (doc) => {
            if (doc.exists() && isMounted) setTeacherData({ id: doc.id, ...doc.data() });
        }));
        
        const usersRef = collection(db, 'users');
        unsubscribes.push(onSnapshot(usersRef, (snapshot) => {
            if (isMounted) setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }));

        const yearPath = `artifacts/${appId}/public/data/academicYears/${selectedYear}`;

        const collectionsToFetch = {
            announcements: setAnnouncements,
            assignments: setAllAssignments,
            courses: setAllCourses,
            grades: setAllGrades,
            absences: setAllAbsences,
            teachers: setAllTeachers,
            payments: setAllPayments,
            submissions: setAllSubmissions,
        };

        for (const [name, setter] of Object.entries(collectionsToFetch)) {
            const ref = collection(db, `${yearPath}/${name}`);
            unsubscribes.push(onSnapshot(query(ref), (snapshot) => {
                if (isMounted) setter(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            }));
        }

        const classroomsQuery = query(collection(db, `${yearPath}/classrooms`), where("teacherId", "==", teacherId));
        unsubscribes.push(onSnapshot(classroomsQuery, (snapshot) => {
            if (!isMounted) return;
            const classroomsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAssignedClassrooms(classroomsData);

            if (classroomsData.length > 0) {
                const studentIds = [...new Set(classroomsData.flatMap(c => c.enrolledStudents || []))];
                if (studentIds.length > 0) {
                    const studentsQuery = query(collection(db, `${yearPath}/students`), where('__name__', 'in', studentIds));
                    unsubscribes.push(onSnapshot(studentsQuery, (studentSnapshot) => {
                        if (isMounted) {
                            setStudentsInClassrooms(studentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                            setLoading(false);
                        }
                    }));
                } else {
                    setStudentsInClassrooms([]);
                    setLoading(false);
                }
            } else {
                setStudentsInClassrooms([]);
                setLoading(false);
            }
        }));

        return () => {
            isMounted = false;
            unsubscribes.forEach(unsub => unsub());
        };
    }, [db, appId, teacherId, selectedYear, loadingYears]);

    const teacherAssignments = useMemo(() => {
        if (!allAssignments || !assignedClassrooms) return [];
        const classroomIds = assignedClassrooms.map(c => c.id);
        return allAssignments.filter(a => classroomIds.includes(a.classroomId));
    }, [allAssignments, assignedClassrooms]);

    // ΔΙΟΡΘΩΣΗ: Δημιουργία λίστας με τους διαχειριστές
    const allAdmins = useMemo(() => {
        if (!allUsers) return [];
        return allUsers.filter(u => u.role === 'admin');
    }, [allUsers]);

    if (loading || loadingYears) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
    }
    if (!teacherId || !teacherData) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="h5" color="error">Ο λογαριασμός σας δεν έχει συνδεθεί με προφίλ καθηγητή.</Typography>
                <Typography>Παρακαλώ επικοινωνήστε με τη διαχείριση.</Typography>
            </Box>
        );
    }

    const commonProps = { 
        db, appId, userId: user.uid, user,
        allStudents: studentsInClassrooms, 
        classrooms: assignedClassrooms,
        allTeachers,
        allUsers,
        teacherData,
        assignedClassrooms,
        studentsInClassrooms,
        assignments: teacherAssignments,
        allAssignments,
        announcements,
        allCourses,
        allGrades,
        allAbsences,
        allPayments,
        allSubmissions,
        loading,
        allAdmins // ΔΙΟΡΘΩΣΗ: Προσθήκη των admins στα commonProps
    };

    return (
        <Routes>
            <Route path="/" element={<TeacherDashboard {...commonProps} />} />
            <Route path="/my-profile" element={<TeacherProfile {...commonProps} />} />
            <Route path="/my-library" element={<MyLibrary {...commonProps} />} />
            <Route path="/my-courses" element={<MyCourses {...commonProps} />} />
            <Route path="/course/edit/:courseId" element={<CourseFormWrapper {...commonProps} />} />
            <Route path="/my-classrooms" element={<Classrooms {...commonProps} />} />
            <Route path="/my-schedule" element={<WeeklyScheduleCalendar {...commonProps} />} />
            <Route path="/my-gradebook" element={<MyGradebook {...commonProps} />} />
            <Route path="/my-assignments" element={<MyAssignmentsManager {...commonProps} />} />
            <Route path="/teacher-stats" element={<TeacherStats {...commonProps} />} />
            <Route path="/my-students" element={<MyStudents {...commonProps} />} />
            <Route path="/student/report/:studentId" element={<StudentReport {...commonProps} />} />
            <Route path="/communication" element={<Communication {...commonProps} currentYearId={selectedYear} />} />
        </Routes>
    );
}

export default TeacherPortal;
