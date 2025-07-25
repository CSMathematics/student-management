// src/App.jsx
import React, { useState, useEffect } from 'react';
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Toolbar, AppBar } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MenuIcon from '@mui/icons-material/Menu';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, query, onSnapshot } from 'firebase/firestore';
import Sidebar from './pages/Sidebar.jsx';
import DashboardHeader from './pages/DashboardHeader.jsx';
import DashboardContent from './pages/DashboardContent.jsx';
import NewStudentForm from './pages/NewStudentForm.jsx';
import StudentsList from './pages/StudentsList.jsx';
import Classrooms from './pages/Classrooms.jsx';
import NewClassroomForm from './pages/NewClassroomForm.jsx';
import WeeklyScheduleCalendar from './pages/WeeklyScheduleCalendar.jsx';
import EditStudentForm from './pages/EditStudentForm.jsx';

const drawerWidth = 280;

function App() {
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [classroomToEdit, setClassroomToEdit] = useState(null);
    const [studentToEdit, setStudentToEdit] = useState(null);
    const [initialScheduleForNewClassroom, setInitialScheduleForNewClassroom] = useState([]);
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
                if (isMounted) setLoading(false);
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

    const navigateTo = (page, params = {}) => {
        setCurrentPage(page);
        setClassroomToEdit(params.classroomToEdit || null);
        setStudentToEdit(params.studentToEdit || null);
        setInitialScheduleForNewClassroom(params.initialSchedule || []);
        if (mobileOpen) {
            handleDrawerToggle();
        }
    };
    
    const handleCreateClassroomFromCalendar = (initialSchedule) => {
        setInitialScheduleForNewClassroom(initialSchedule);
        navigateTo('newClassroom');
    };

    const handleNewClassroomSaveSuccess = () => {
        setInitialScheduleForNewClassroom([]);
        setClassroomToEdit(null);
        if (isModalOpen) {
            closeModal();
        } else {
            navigateTo('classroomsList');
        }
    };

    const handleNewClassroomFormCancel = () => {
        setInitialScheduleForNewClassroom([]);
        setClassroomToEdit(null);
        if (isModalOpen) {
            closeModal();
        } else {
            navigateTo('dashboard');
        }
    };

    const getPageTitle = () => {
        switch (currentPage) {
            case 'dashboard': return 'Σχολικό έτος';
            case 'newStudent': return 'Προσθήκη Νέου Μαθητή';
            case 'editStudent': return 'Επεξεργασία Μαθητή';
            case 'studentsList': return 'Λίστα Μαθητών';
            case 'newClassroom': return classroomToEdit && !classroomToEdit.id ? 'Δημιουργία Νέου Τμήματος' : (classroomToEdit ? 'Επεξεργασία Τμήματος' : 'Δημιουργία Νέου Τμήματος');
            case 'classroomsList': return 'Λίστα Τμημάτων';
            case 'calendar': return 'Πρόγραμμα';
            default: return 'Student Management';
        }
    };

    return (
        <Box sx={{ display: 'flex' }}>
            <Sidebar 
                navigateTo={navigateTo} 
                currentPage={currentPage}
                mobileOpen={mobileOpen}
                handleDrawerToggle={handleDrawerToggle}
            />
            <Box 
                component="main"
                sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` } }}
            >
                <AppBar
                    position="fixed"
                    sx={{
                        width: { md: `calc(100% - ${drawerWidth}px)` },
                        ml: { md: `${drawerWidth}px` },
                        backgroundColor: 'white',
                        boxShadow: 'none',
                        borderBottom: '1px solid #e0e0e0'
                    }}
                >
                    <Toolbar>
                        <IconButton
                            color="inherit"
                            aria-label="open drawer"
                            edge="start"
                            onClick={handleDrawerToggle}
                            sx={{ mr: 2, display: { md: 'none' }, color: 'text.primary' }}
                        >
                            <MenuIcon />
                        </IconButton>
                        <DashboardHeader 
                            pageTitle={getPageTitle()} 
                            onBackClick={() => navigateTo('dashboard')} 
                            showBackButton={currentPage !== 'dashboard'} 
                        />
                    </Toolbar>
                </AppBar>
                
                <Toolbar />

                {currentPage === 'dashboard' && <DashboardContent navigateTo={navigateTo} classrooms={classrooms} loadingClassrooms={loading} db={db} userId={userId} appId={appId} />}
                {currentPage === 'newStudent' && <NewStudentForm db={db} appId={appId} allClassrooms={classrooms} allStudents={allStudents} navigateTo={navigateTo} openModalWithData={openModalWithData} />}
                {currentPage === 'studentsList' && <StudentsList allStudents={allStudents} loading={loading} db={db} appId={appId} navigateTo={navigateTo} />}
                {currentPage === 'editStudent' && <EditStudentForm db={db} appId={appId} allClassrooms={classrooms} allStudents={allStudents} navigateTo={navigateTo} studentToEdit={studentToEdit} />}
                {currentPage === 'newClassroom' && <NewClassroomForm navigateTo={navigateTo} classroomToEdit={classroomToEdit} initialSchedule={initialScheduleForNewClassroom} onSaveSuccess={handleNewClassroomSaveSuccess} onCancel={handleNewClassroomFormCancel} db={db} userId={userId} appId={appId} allClassrooms={classrooms} />}
                {currentPage === 'classroomsList' && <Classrooms navigateTo={navigateTo} setClassroomToEdit={setClassroomToEdit} classrooms={classrooms} allStudents={allStudents} loading={loading} db={db} appId={appId} />}
                {currentPage === 'calendar' && <WeeklyScheduleCalendar classrooms={classrooms} loading={loading} onCreateClassroomFromCalendar={handleCreateClassroomFromCalendar} navigateTo={navigateTo} db={db} userId={userId} appId={appId} />}
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
                        db={db}
                        userId={userId}
                        appId={appId}
                        allClassrooms={classrooms}
                    />
                </DialogContent>
            </Dialog>
        </Box>
    );
}

export default App;
