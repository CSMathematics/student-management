// src/portals/TeacherPortal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { Box, CircularProgress, Typography } from '@mui/material';

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
import MyCourses from './teacher/MyCourses.jsx'; // <-- ΝΕΑ ΕΙΣΑΓΩΓΗ
import CourseForm from '../pages/CourseForm.jsx'; // <-- ΝΕΑ ΕΙΣΑΓΩΓΗ

// Wrapper for editing a course
const CourseFormWrapper = (props) => {
    const { courseId } = useParams();
    return <CourseForm {...props} key={courseId} />;
};

function TeacherPortal({ db, appId, user, userProfile }) {
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
    const [loading, setLoading] = useState(true);

    const teacherId = userProfile?.profileId;

    useEffect(() => {
        // ... (η λογική φόρτωσης παραμένει ίδια)
        if (!db || !appId || !teacherId) {
            setLoading(false);
            return;
        }
        const unsubscribes = [];
        setLoading(true);
        const teacherRef = doc(db, `artifacts/${appId}/public/data/teachers`, teacherId);
        unsubscribes.push(onSnapshot(teacherRef, (doc) => {
            if (doc.exists()) setTeacherData({ id: doc.id, ...doc.data() });
        }));
        
        const usersRef = collection(db, 'users');
        unsubscribes.push(onSnapshot(usersRef, (snapshot) => {
            setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }));

        const queries = {
            announcements: query(collection(db, `artifacts/${appId}/public/data/announcements`)),
            assignments: query(collection(db, `artifacts/${appId}/public/data/assignments`)),
            courses: query(collection(db, `artifacts/${appId}/public/data/courses`)),
            grades: query(collection(db, `artifacts/${appId}/public/data/grades`)),
            absences: query(collection(db, `artifacts/${appId}/public/data/absences`)),
            teachers: query(collection(db, `artifacts/${appId}/public/data/teachers`)),
            payments: query(collection(db, `artifacts/${appId}/public/data/payments`)),
        };
        const setters = {
            announcements: setAnnouncements, assignments: setAllAssignments,
            courses: setAllCourses, grades: setAllGrades, absences: setAllAbsences,
            teachers: setAllTeachers, payments: setAllPayments,
        };
        for (const [key, q] of Object.entries(queries)) {
            unsubscribes.push(onSnapshot(q, (snapshot) => {
                setters[key](snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            }));
        }
        const classroomsQuery = query(collection(db, `artifacts/${appId}/public/data/classrooms`), where("teacherId", "==", teacherId));
        unsubscribes.push(onSnapshot(classroomsQuery, (snapshot) => {
            const classroomsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAssignedClassrooms(classroomsData);
            if (classroomsData.length > 0) {
                const studentIds = classroomsData.flatMap(c => c.enrolledStudents || []);
                if (studentIds.length > 0) {
                    const studentsQuery = query(collection(db, `artifacts/${appId}/public/data/students`), where('__name__', 'in', [...new Set(studentIds)]));
                    unsubscribes.push(onSnapshot(studentsQuery, (studentSnapshot) => {
                        setStudentsInClassrooms(studentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                        setLoading(false);
                    }));
                } else { setLoading(false); }
            } else { setLoading(false); }
        }));
        return () => unsubscribes.forEach(unsub => unsub());
    }, [db, appId, teacherId]);

    const teacherAssignments = useMemo(() => {
        if (!allAssignments || !assignedClassrooms) return [];
        const classroomIds = assignedClassrooms.map(c => c.id);
        return allAssignments.filter(a => classroomIds.includes(a.classroomId));
    }, [allAssignments, assignedClassrooms]);

    if (loading) {
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
        loading
    };

    return (
        <Routes>
            <Route path="/" element={<TeacherDashboard {...commonProps} />} />
            <Route path="/my-profile" element={<TeacherProfile {...commonProps} />} />
            <Route path="/my-library" element={<MyLibrary {...commonProps} />} />
            <Route path="/my-courses" element={<MyCourses {...commonProps} />} /> {/* <-- ΝΕΑ ΔΙΑΔΡΟΜΗ */}
            <Route path="/course/edit/:courseId" element={<CourseFormWrapper {...commonProps} />} /> {/* <-- ΝΕΑ ΔΙΑΔΡΟΜΗ */}
            <Route path="/my-classrooms" element={<Classrooms {...commonProps} />} />
            <Route path="/my-schedule" element={<WeeklyScheduleCalendar {...commonProps} />} />
            <Route path="/my-gradebook" element={<MyGradebook {...commonProps} />} />
            <Route path="/my-assignments" element={<MyAssignmentsManager {...commonProps} />} />
            <Route path="/teacher-stats" element={<TeacherStats {...commonProps} />} />
            <Route path="/my-students" element={<MyStudents {...commonProps} />} />
            <Route path="/student/report/:studentId" element={<StudentReport {...commonProps} />} />
            <Route path="/communication" element={<Communication {...commonProps} />} />
        </Routes>
    );
}

export default TeacherPortal;
