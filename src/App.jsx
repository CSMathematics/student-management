// src/App.jsx
import React, { useState, useEffect } from 'react';
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Toolbar, AppBar } from '@mui/material';
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
import Payments from './pages/Payments.jsx'; // <-- ΝΕΟ IMPORT

const drawerWidth = 280;

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

function App() {
    const [classrooms, setClassrooms] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [allGrades, setAllGrades] = useState([]);
    const [allAbsences, setAllAbsences] = useState([]);
    const [allPayments, setAllPayments] = useState([]); // <-- ΝΕΟ STATE ΓΙΑ ΠΛΗΡΩΜΕΣ
    const [loading, setLoading] = useState(true);
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [appId, setAppId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState(null);
    const [mobileOpen, setMobileOpen] = useState(false);
    
    const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

    useEffect(() => {
        let unsubscribeClassrooms = () => {};
        let unsubscribeStudents = () => {};
        let unsubscribeGrades = () => {};
        let unsubscribeAbsences = () => {};
        let unsubscribePayments = () => {}; // <-- ΝΕΟ Unsubscribe
        let isMounted = true;

        try {
            const firebaseConfigString = typeof __firebase_config !== 'undefined' ? __firebase_config : import.meta.env.VITE_FIREBASE_CONFIG;
            const currentAppId = typeof __app_id !== 'undefined' ? __app_id : import.meta.env.VITE_APP_ID || 'default-local-app-id';
            const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : import.meta.env.VITE_INITIAL_AUTH_TOKEN;
            const parsedFirebaseConfig = firebaseConfigString ? JSON.parse(firebaseConfigString) : {};

            if (Object.keys(parsedFirebaseConfig).length === 0 || !parsedFirebaseConfig.apiKey) {
                if (isMounted) setLoading(false); return;
            }

            const app = initializeApp(parsedFirebaseConfig);
            const firestoreDb = getFirestore(app);
            const firebaseAuth = getAuth(app);

            if (isMounted) {
                setDb(firestoreDb);
                setAuth(firebaseAuth);
                setAppId(currentAppId);
            }

            const authenticateAndListen = async () => {
                try {
                    if (initialAuthToken) {
                        await signInWithCustomToken(firebaseAuth, initialAuthToken);
                    } else {
                        await signInAnonymously(firebaseAuth);
                    }
                    if (isMounted) setUserId(firebaseAuth.currentUser?.uid || crypto.randomUUID());
                    
                    const classroomsRef = collection(firestoreDb, `artifacts/${currentAppId}/public/data/classrooms`);
                    unsubscribeClassrooms = onSnapshot(query(classroomsRef), s => isMounted && setClassrooms(s.docs.map(d => ({ id: d.id, ...d.data() }))));

                    const studentsRef = collection(firestoreDb, `artifacts/${currentAppId}/public/data/students`);
                    unsubscribeStudents = onSnapshot(query(studentsRef), s => isMounted && setAllStudents(s.docs.map(d => ({ id: d.id, ...d.data() }))));

                    const gradesRef = collection(firestoreDb, `artifacts/${currentAppId}/public/data/grades`);
                    unsubscribeGrades = onSnapshot(query(gradesRef), s => isMounted && setAllGrades(s.docs.map(d => ({ id: d.id, ...d.data() }))));

                    const absencesRef = collection(firestoreDb, `artifacts/${currentAppId}/public/data/absences`);
                    unsubscribeAbsences = onSnapshot(query(absencesRef), s => isMounted && setAllAbsences(s.docs.map(d => ({ id: d.id, ...d.data() }))));

                    // --- ΝΕΟ LISTENER ΓΙΑ ΤΙΣ ΠΛΗΡΩΜΕΣ ---
                    const paymentsRef = collection(firestoreDb, `artifacts/${currentAppId}/public/data/payments`);
                    unsubscribePayments = onSnapshot(query(paymentsRef), s => isMounted && setAllPayments(s.docs.map(d => ({ id: d.id, ...d.data() }))));

                    if(isMounted) setLoading(false);

                } catch (authError) {
                    console.error("Error during Firebase authentication:", authError);
                    if (isMounted) setLoading(false);
                }
            };
            authenticateAndListen();
        } catch (initError) {
            console.error("Error during Firebase initialization:", initError);
            if (isMounted) setLoading(false);
        }

        return () => {
            unsubscribeClassrooms();
            unsubscribeStudents();
            unsubscribeGrades();
            unsubscribeAbsences();
            unsubscribePayments(); // <-- Καθαρισμός του νέου listener
            isMounted = false;
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
    
    const commonProps = { db, appId, classrooms, allStudents, allGrades, allAbsences, allPayments, loading, userId };

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
                        <Route path="/payments" element={<Payments {...commonProps} />} /> {/* <-- ΝΕΑ ΔΙΑΔΡΟΜΗ */}
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
