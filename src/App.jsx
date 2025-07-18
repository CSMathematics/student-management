// src/App.jsx
import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, query, onSnapshot } from 'firebase/firestore';

// Import your components
import Sidebar from './pages/Sidebar.jsx';
import DashboardHeader from './pages/DashboardHeader.jsx';
import DashboardContent from './pages/DashboardContent.jsx';
import NewStudentForm from './pages/NewStudentForm.jsx';
import StudentsList from './pages/StudentsList.jsx';
import Classrooms from './pages/Classrooms.jsx'; // Import Classrooms list
import NewClassroomForm from './pages/NewClassroomForm.jsx'; // Import NewClassroomForm
import WeeklyScheduleCalendar from './pages/WeeklyScheduleCalendar.jsx'; // Import your existing WeeklyScheduleCalendar component

// Main App component
function App() {
    const [currentPage, setCurrentPage] = useState('dashboard'); // State to manage current page
    const [classroomToEdit, setClassroomToEdit] = useState(null); // State for editing classroom
    const [initialScheduleForNewClassroom, setInitialScheduleForNewClassroom] = useState([]); // State for calendar-initiated new classroom
    const [classrooms, setClassrooms] = useState([]); // State to store fetched classrooms
    const [loadingClassrooms, setLoadingClassrooms] = useState(true); // Loading state for classrooms
    const [db, setDb] = useState(null); // State for Firestore instance
    const [auth, setAuth] = useState(null); // State for Auth instance
    const [userId, setUserId] = useState(null); // State for user ID
    const [appId, setAppId] = useState(null); // State for appId

    // Initialize Firebase and authenticate, then set up real-time listener for classrooms
    useEffect(() => {
        let unsubscribe = () => {}; // Initialize unsubscribe function
        let isMounted = true; // Flag to track if component is mounted

        try {
            const firebaseConfigString = typeof __firebase_config !== 'undefined'
                ? __firebase_config
                : import.meta.env.VITE_FIREBASE_CONFIG;

            const currentAppId = typeof __app_id !== 'undefined'
                ? __app_id
                : import.meta.env.VITE_APP_ID || 'default-local-app-id';

            const initialAuthToken = typeof __initial_auth_token !== 'undefined'
                ? __initial_auth_token
                : import.meta.env.VITE_INITIAL_AUTH_TOKEN;

            const parsedFirebaseConfig = firebaseConfigString ? JSON.parse(firebaseConfigString) : {};

            if (Object.keys(parsedFirebaseConfig).length === 0 || !parsedFirebaseConfig.apiKey) {
                console.error("Firebase config is missing or incomplete.");
                if (isMounted) setLoadingClassrooms(false);
                return;
            }

            const app = initializeApp(parsedFirebaseConfig);
            const firestoreDb = getFirestore(app);
            const firebaseAuth = getAuth(app);

            if (isMounted) {
                setDb(firestoreDb); // Set db state
                setAuth(firebaseAuth); // Set auth state
                setAppId(currentAppId); // Set appId state
            }

            const authenticateAndListen = async () => {
                try {
                    if (initialAuthToken) {
                        await signInWithCustomToken(firebaseAuth, initialAuthToken);
                        console.log("Authenticated with custom token.");
                    } else {
                        await signInAnonymously(firebaseAuth);
                        console.log("Authenticated anonymously.");
                    }
                    if (isMounted) {
                        const currentUserId = firebaseAuth.currentUser?.uid || crypto.randomUUID();
                        setUserId(currentUserId);
                        console.log("Firebase Auth User ID:", currentUserId);
                    }

                    // Set up real-time listener for classrooms
                    const classroomsCollectionRef = collection(firestoreDb, `artifacts/${currentAppId}/public/data/classrooms`);
                    const q = query(classroomsCollectionRef);

                    unsubscribe = onSnapshot(q, (snapshot) => {
                        if (isMounted) {
                            const fetchedClassrooms = snapshot.docs.map(doc => ({
                                id: doc.id,
                                ...doc.data()
                            }));
                            setClassrooms(fetchedClassrooms);
                            setLoadingClassrooms(false);
                        }
                    }, (err) => {
                        console.error("Error fetching classrooms in App.jsx:", err);
                        if (isMounted) {
                            setLoadingClassrooms(false);
                        }
                    });

                } catch (authError) {
                    console.error("Error during Firebase authentication in App.jsx:", authError);
                    if (isMounted) {
                        setLoadingClassrooms(false);
                    }
                }
            };

            authenticateAndListen();

        } catch (initError) {
            console.error("Error during Firebase initialization in App.jsx (outside auth block):", initError);
            if (isMounted) {
                setLoadingClassrooms(false);
            }
        }

        // Cleanup function for onSnapshot listener
        return () => {
            unsubscribe();
            isMounted = false; // Set flag to false on unmount
        };
    }, []); // Empty dependency array means this runs once on mount


    const navigateTo = (page, params = {}) => { // Added params for navigation
        setCurrentPage(page);
        // Clear classroomToEdit and initialSchedule when navigating away from relevant forms
        if (page !== 'newClassroom') {
            setClassroomToEdit(null);
            setInitialScheduleForNewClassroom([]);
        }

        // Set state based on navigation parameters
        if (params.classroomToEdit) {
            setClassroomToEdit(params.classroomToEdit);
        } else {
            setClassroomToEdit(null); // Clear if not editing
        }
        if (params.initialSchedule) {
            setInitialScheduleForNewClassroom(params.initialSchedule);
        } else {
            setInitialScheduleForNewClassroom([]); // Clear if not creating from calendar
        }
    };

    // Callback from WeeklyScheduleCalendar when a slot is selected
    const handleCreateClassroomFromCalendar = (initialSchedule) => {
        setInitialScheduleForNewClassroom(initialSchedule);
        navigateTo('newClassroom');
    };

    // Callback for when NewClassroomForm successfully saves/updates
    const handleNewClassroomSaveSuccess = () => {
        // Clear initial schedule and classroom to edit after save
        setInitialScheduleForNewClassroom([]);
        setClassroomToEdit(null);
        // Navigate back to classrooms list or calendar
        navigateTo('classroomsList');
    };


    const getPageTitle = () => {
        switch (currentPage) {
            case 'dashboard':
                return 'Σχολικό έτος';
            case 'newStudent':
                return 'Προσθήκη Νέου Μαθητή';
            case 'studentsList':
                return 'Λίστα Μαθητών';
            case 'newClassroom':
                return classroomToEdit ? 'Επεξεργασία Τμήματος' : 'Δημιουργία Νέου Τμήματος';
            case 'classroomsList':
                return 'Λίστα Τμημάτων';
            case 'calendar':
                return 'Πρόγραμμα';
            default:
                return 'Student Management';
        }
    };

    const showBackButton = currentPage !== 'dashboard';

    return (
        <Box sx={{ display: 'flex', width: '100%' }}>
            <Sidebar navigateTo={navigateTo} currentPage={currentPage}/>
            <Box className="main-content-area">
                <DashboardHeader
                    pageTitle={getPageTitle()}
                    onBackClick={() => navigateTo('dashboard')} // Simple back to dashboard for now
                    showBackButton={showBackButton}
                />
                {currentPage === 'dashboard' && (
                    <DashboardContent
                        onNewStudentClick={() => navigateTo('newStudent')}
                        onStudentsListClick={() => navigateTo('studentsList')}
                        onNewClassroomClick={() => navigateTo('newClassroom')} // For manual new classroom
                        onClassroomsListClick={() => navigateTo('classroomsList')}
                        navigateTo={navigateTo} // Pass navigateTo to DashboardContent
                        classrooms={classrooms} // Pass classrooms to DashboardContent for Calendar
                        loadingClassrooms={loadingClassrooms} // Pass loading state
                        db={db} // Pass db instance
                        userId={userId} // Pass userId
                        appId={appId} // Pass appId
                    />
                )}
                {currentPage === 'newStudent' && (
                    <NewStudentForm />
                )}
                {currentPage === 'studentsList' && (
                    <StudentsList />
                )}
                {currentPage === 'newClassroom' && (
                    <NewClassroomForm
                        navigateTo={navigateTo}
                        classroomToEdit={classroomToEdit}
                        setClassroomToEdit={setClassroomToEdit}
                        initialSchedule={initialScheduleForNewClassroom} // Pass initial schedule
                        onSaveSuccess={handleNewClassroomSaveSuccess} // Pass success callback
                        db={db} // Pass db instance
                        userId={userId} // Pass userId
                        appId={appId} // Pass appId
                    />
                )}
                {currentPage === 'classroomsList' && (
                    <Classrooms
                        navigateTo={navigateTo}
                        setClassroomToEdit={setClassroomToEdit}
                        classrooms={classrooms} // Pass fetched classrooms
                        loading={loadingClassrooms} // Pass loading state
                        db={db} // Pass db instance
                        userId={userId} // Pass userId
                        appId={appId} // Pass appId
                    />
                )}
                {currentPage === 'calendar' && (
                    <WeeklyScheduleCalendar
                        classrooms={classrooms} // Pass fetched classrooms
                        loading={loadingClassrooms} // Pass loading state
                        onCreateClassroomFromCalendar={handleCreateClassroomFromCalendar}
                        onEditClassroom={setClassroomToEdit} // Pass setClassroomToEdit for direct edit
                        navigateTo={navigateTo} // Pass navigateTo for navigation
                        db={db} // Pass db instance
                        userId={userId} // Pass userId
                        appId={appId} // Pass appId
                    />
                )}
            </Box>
        </Box>
    );
}

export default App;
