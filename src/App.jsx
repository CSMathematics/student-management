// src/App.jsx
import React, { useState, useEffect } from 'react';
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Toolbar, AppBar, CircularProgress, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MenuIcon from '@mui/icons-material/Menu';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, query, onSnapshot } from 'firebase/firestore';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';

import './scss/main.scss';
import Sidebar from './pages/Sidebar.jsx';
import DashboardHeader from './pages/DashboardHeader.jsx';
import DashboardContent from './pages/DashboardContent.jsx';
import StudentsList from './pages/StudentsList.jsx';
import Classrooms from './pages/Classrooms.jsx';
import NewClassroomForm from './pages/NewClassroomForm.jsx';
import WeeklyScheduleCalendar from './pages/WeeklyScheduleCalendar.jsx';
import StudentForm from './pages/StudentForm.jsx';
import Payments from './pages/Payments.jsx';
import Courses from './pages/Courses.jsx';
import CourseForm from './pages/CourseForm.jsx';
import TeachersList from './pages/TeachersList.jsx';
import TeacherForm from './pages/TeacherForm.jsx';
import Announcements from './pages/Announcements.jsx';

const drawerWidth = 280;

// Wrappers
const StudentFormWrapper = (props) => {
    const { studentId } = useParams();
    const studentToEdit = props.allStudents.find(s => s.id === studentId);
    return <StudentForm {...props} initialData={studentToEdit} key={studentId} />;
};
const ClassroomFormWrapper = (props) => {
    const { classroomId } = useParams();
    const classroomToEdit = props.classrooms.find(c => c.id === classroomId);
    return <NewClassroomForm {...props} classroomToEdit={classroomToEdit} key={classroomId} />;
};
const CourseFormWrapper = (props) => {
    const { courseId } = useParams();
    return <CourseForm {...props} key={courseId} />;
};
const TeacherFormWrapper = (props) => {
    const { teacherId } = useParams();
    return <TeacherForm {...props} key={teacherId} />;
};

function App() {
    const [classrooms, setClassrooms] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [allGrades, setAllGrades] = useState([]);
    const [allAbsences, setAllAbsences] = useState([]);
    const [allPayments, setAllPayments] = useState([]);
    const [allCourses, setAllCourses] = useState([]);
    const [allTeachers, setAllTeachers] = useState([]);
    const [allAnnouncements, setAllAnnouncements] = useState([]);
    const [allAssignments, setAllAssignments] = useState([]); // <-- ΝΕΑ ΚΑΤΑΣΤΑΣΗ
    const [loading, setLoading] = useState(true);
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [appId, setAppId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState(null);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isFirebaseReady, setIsFirebaseReady] = useState(false);

    const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

    useEffect(() => {
        let isMounted = true;
        const unsubscribes = [];

        const setupFirebase = async () => {
            try {
                const firebaseConfigString = typeof __firebase_config !== 'undefined' ? __firebase_config : import.meta.env.VITE_FIREBASE_CONFIG;
                const currentAppId = typeof __app_id !== 'undefined' ? __app_id : import.meta.env.VITE_APP_ID || 'default-local-app-id';
                const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : import.meta.env.VITE_INITIAL_AUTH_TOKEN;
                const parsedFirebaseConfig = firebaseConfigString ? JSON.parse(firebaseConfigString) : {};

                if (!parsedFirebaseConfig.apiKey) {
                    if (isMounted) {
                        setLoading(false);
                        setIsFirebaseReady(true);
                    }
                    return;
                }

                const app = initializeApp(parsedFirebaseConfig);
                const firestoreDb = getFirestore(app);
                const firebaseAuth = getAuth(app);

                if (isMounted) {
                    setDb(firestoreDb);
                    setAuth(firebaseAuth);
                    setAppId(currentAppId);
                }

                if (initialAuthToken) {
                    await signInWithCustomToken(firebaseAuth, initialAuthToken);
                } else {
                    await signInAnonymously(firebaseAuth);
                }

                if (isMounted) {
                    setUserId(firebaseAuth.currentUser?.uid || crypto.randomUUID());
                    
                    const collections = {
                        classrooms: setClassrooms,
                        students: setAllStudents,
                        grades: setAllGrades,
                        absences: setAllAbsences,
                        payments: setAllPayments,
                        courses: setAllCourses,
                        teachers: setAllTeachers,
                        announcements: setAllAnnouncements,
                        assignments: setAllAssignments, // <-- ΝΕΑ ΣΥΛΛΟΓΗ
                    };

                    for (const [name, setter] of Object.entries(collections)) {
                        const ref = collection(firestoreDb, `artifacts/${currentAppId}/public/data/${name}`);
                        const unsubscribe = onSnapshot(query(ref), snapshot => {
                            if (isMounted) {
                                setter(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
                            }
                        });
                        unsubscribes.push(unsubscribe);
                    }

                    setLoading(false);
                    setIsFirebaseReady(true);
                }

            } catch (error) {
                console.error("Firebase Initialization/Auth Error:", error);
                if (isMounted) {
                    setLoading(false);
                    setIsFirebaseReady(true);
                }
            }
        };

        setupFirebase();

        return () => {
            isMounted = false;
            unsubscribes.forEach(unsub => unsub());
        };
    }, []);

    const openModalWithData = (data) => {
        setModalData(data);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setModalData(null);
    };
    
    const commonProps = { db, appId, classrooms, allStudents, allGrades, allAbsences, allPayments, allCourses, allTeachers, allAnnouncements, allAssignments, loading, userId };

    if (!isFirebaseReady) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Σύνδεση στις υπηρεσίες...</Typography>
            </Box>
        );
    }

    return (
        <BrowserRouter>
            <Box sx={{ display: 'flex' }}>
                <Sidebar handleDrawerToggle={handleDrawerToggle} mobileOpen={mobileOpen} />
                <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
                    <AppBar position="fixed" sx={{ width: { md: `calc(100% - ${drawerWidth}px)` }, ml: { md: `${drawerWidth}px` }, backgroundColor: 'white', boxShadow: 'none', borderBottom: '1px solid #e0e0e0' }}>
                        <Toolbar>
                            <IconButton color="inherit" aria-label="open drawer" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { md: 'none' }, color: 'text.primary' }}><MenuIcon /></IconButton>
                            <DashboardHeader />
                        </Toolbar>
                    </AppBar>
                    <Toolbar />
                    <Routes>
                        <Route path="/" element={<DashboardContent {...commonProps} />} />
                        <Route path="/students" element={<StudentsList {...commonProps} />} />
                        <Route path="/student/new" element={<StudentForm {...commonProps} />} />
                        <Route path="/student/edit/:studentId" element={<StudentFormWrapper {...commonProps} />} />
                        <Route path="/classrooms" element={<Classrooms {...commonProps} />} />
                        <Route path="/classroom/new" element={<NewClassroomForm {...commonProps} />} />
                        <Route path="/classroom/edit/:classroomId" element={<ClassroomFormWrapper {...commonProps} />} />
                        <Route path="/calendar" element={<WeeklyScheduleCalendar {...commonProps} />} />
                        <Route path="/payments" element={<Payments {...commonProps} />} />
                        <Route path="/courses" element={<Courses {...commonProps} />} />
                        <Route path="/course/new" element={<CourseForm {...commonProps} />} />
                        <Route path="/course/edit/:courseId" element={<CourseFormWrapper {...commonProps} />} />
                        <Route path="/teachers" element={<TeachersList {...commonProps} />} />
                        <Route path="/teacher/new" element={<TeacherForm {...commonProps} />} />
                        <Route path="/teacher/edit/:teacherId" element={<TeacherFormWrapper {...commonProps} />} />
                        <Route path="/announcements" element={<Announcements {...commonProps} />} />
                    </Routes>
                </Box>
                <Dialog open={isModalOpen} onClose={closeModal} maxWidth="md" fullWidth>
                     <DialogTitle>
                        Δημιουργία Νέου Τμήματος
                        <IconButton onClick={closeModal} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        <NewClassroomForm classroomToEdit={modalData} onSaveSuccess={closeModal} onCancel={closeModal} {...commonProps} />
                    </DialogContent>
                </Dialog>
            </Box>
        </BrowserRouter>
    );
}

export default App;
