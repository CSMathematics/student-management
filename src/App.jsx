// src/App.jsx
import React, { useState, useEffect } from 'react';
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Toolbar, AppBar } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MenuIcon from '@mui/icons-material/Menu';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, query, onSnapshot } from 'firebase/firestore';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';

import Sidebar from './pages/Sidebar.jsx';
import DashboardHeader from './pages/DashboardHeader.jsx';
import DashboardContent from './pages/DashboardContent.jsx';
import StudentsList from './pages/StudentsList.jsx';
import Classrooms from './pages/Classrooms.jsx';
import NewClassroomForm from './pages/NewClassroomForm.jsx';
import WeeklyScheduleCalendar from './pages/WeeklyScheduleCalendar.jsx';
import StudentForm from './pages/StudentForm.jsx'; 

const drawerWidth = 280;

// Wrapper component to pass route params (studentId) to the StudentForm
const StudentFormWrapper = (props) => {
    const { studentId } = useParams();
    const studentToEdit = props.allStudents.find(s => s.id === studentId);
    return <StudentForm {...props} initialData={studentToEdit} key={studentId} />;
};

// Wrapper component to pass route params (classroomId) to the NewClassroomForm
const ClassroomFormWrapper = (props) => {
    const { classroomId } = useParams();
    // --- ΔΙΟΡΘΩΣΗ: Χρησιμοποιούμε το props.classrooms αντί για το ανύπαρκτο allClassrooms ---
    const classroomToEdit = props.classrooms.find(c => c.id === classroomId);
    return <NewClassroomForm {...props} classroomToEdit={classroomToEdit} key={classroomId} />;
};


function App() {
    const [classrooms, setClassrooms] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [appId, setAppId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState(null);
    const [mobileOpen, setMobileOpen] = useState(false);
    
    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    // Firebase initialization and data fetching useEffect remains the same
    useEffect(() => {
        let unsubscribeClassrooms = () => {};
        let unsubscribeStudents = () => {};
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
                    if (isMounted) {
                        setUserId(firebaseAuth.currentUser?.uid || crypto.randomUUID());
                    }

                    const classroomsCollectionRef = collection(firestoreDb, `artifacts/${currentAppId}/public/data/classrooms`);
                    unsubscribeClassrooms = onSnapshot(query(classroomsCollectionRef), (snapshot) => {
                        if (isMounted) setClassrooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                    });

                    const studentsCollectionRef = collection(firestoreDb, `artifacts/${currentAppId}/public/data/students`);
                    unsubscribeStudents = onSnapshot(query(studentsCollectionRef), (snapshot) => {
                        if (isMounted) {
                            setAllStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                            setLoading(false);
                        }
                    });

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
    
    // --- ΔΙΟΡΘΩΣΗ: Περνάμε τη σωστή μεταβλητή 'classrooms' αντί για το ανύπαρκτο 'allClassrooms' ---
    const commonProps = { db, appId, classrooms, allStudents, openModalWithData, loading, userId };

    return (
        <BrowserRouter>
            <Box sx={{ display: 'flex' }}>
                <Sidebar handleDrawerToggle={handleDrawerToggle} mobileOpen={mobileOpen} />
                <Box 
                    component="main"
                    sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` } }}
                >
                    <AppBar
                        position="fixed"
                        sx={{
                            width: { md: `calc(100% - ${drawerWidth}px)` },
                            ml: { md: `${drawerWidth}px` },
                            backgroundColor: 'white', boxShadow: 'none', borderBottom: '1px solid #e0e0e0'
                        }}
                    >
                        <Toolbar>
                            <IconButton
                                color="inherit" aria-label="open drawer" edge="start"
                                onClick={handleDrawerToggle}
                                sx={{ mr: 2, display: { md: 'none' }, color: 'text.primary' }}
                            >
                                <MenuIcon />
                            </IconButton>
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
                    </Routes>
                </Box>

                <Dialog open={isModalOpen} onClose={closeModal} maxWidth="md" fullWidth>
                     <DialogTitle>
                        Δημιουργία Νέου Τμήματος
                        <IconButton onClick={closeModal} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        <NewClassroomForm
                            classroomToEdit={modalData}
                            onSaveSuccess={closeModal}
                            onCancel={closeModal}
                            {...commonProps}
                        />
                    </DialogContent>
                </Dialog>
            </Box>
        </BrowserRouter>
    );
}

export default App;
