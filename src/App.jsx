// js/App.jsx
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
import CalendarComponent from './pages/CalendarComponent.jsx'; // Import CalendarComponent

// Main App component
function App() {
    const [currentPage, setCurrentPage] = useState('dashboard'); // State to manage current page
    const [classroomToEdit, setClassroomToEdit] = useState(null); // State for editing classroom
    const [initialScheduleForNewClassroom, setInitialScheduleForNewClassroom] = useState([]); // State for calendar-initiated new classroom
    const [classrooms, setClassrooms] = useState([]); // State to store fetched classrooms
    const [loadingClassrooms, setLoadingClassrooms] = useState(true); // Loading state for classrooms
    const [db, setDb] = useState(null); // State for Firestore instance
    const [userId, setUserId] = useState(null); // State for user ID

    // Initialize Firebase and authenticate, then set up real-time listener for classrooms
    useEffect(() => {
        let unsubscribe = () => {}; // Initialize unsubscribe function
        let isMounted = true; // Flag to track if component is mounted

        try {
            const firebaseConfigString = typeof __firebase_config !== 'undefined'
                ? __firebase_config
                : import.meta.env.VITE_FIREBASE_CONFIG;

            const appId = typeof __app_id !== 'undefined'
                ? __app_id
                : import.meta.env.VITE_APP_ID || 'default-local-app-id';

            const initialAuthToken = typeof __initial_auth_token !== 'undefined'
                ? __initial_auth_token
                : import.meta.env.VITE_INITIAL_AUTH_TOKEN;

            const parsedFirebaseConfig = firebaseConfigString ? JSON.parse(firebaseConfigString) : {};

            if (Object.keys(parsedFirebaseConfig).length === 0 || !parsedFirebaseConfig.apiKey) {
                console.error("Firebase config is missing or incomplete.");
                // alert("Firebase config is missing or incomplete. Check console for details."); // Avoid alert in main App load
                if (isMounted) setLoadingClassrooms(false);
                return;
            }

            const app = initializeApp(parsedFirebaseConfig);
            const firestoreDb = getFirestore(app);
            const firebaseAuth = getAuth(app);

            if (isMounted) {
                setDb(firestoreDb); // Set db state
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
                    const classroomsCollectionRef = collection(firestoreDb, `artifacts/${appId}/public/data/classrooms`);
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
                            // setError("Failed to load classrooms. Please try again."); // No error state in App for now
                            setLoadingClassrooms(false);
                        }
                    });

                } catch (authError) {
                    console.error("Error during Firebase authentication in App.jsx:", authError);
                    if (isMounted) {
                        // setError("Authentication failed. Cannot load classrooms.");
                        setLoadingClassrooms(false);
                    }
                }
            };

            authenticateAndListen();

        } catch (initError) {
            console.error("Error during Firebase initialization in App.jsx (outside auth block):", initError);
            if (isMounted) {
                // setError("Error initializing Firebase.");
                setLoadingClassrooms(false);
            }
        }

        // Cleanup function for onSnapshot listener
        return () => {
            unsubscribe();
            isMounted = false; // Set flag to false on unmount
        };
    }, []); // Empty dependency array means this runs once on mount


    const navigateTo = (page) => {
        setCurrentPage(page);
        // Clear classroomToEdit and initialSchedule when navigating away from relevant forms
        if (page !== 'newClassroom') {
            setClassroomToEdit(null);
            setInitialScheduleForNewClassroom([]);
        }
    };

    // Callback from CalendarComponent when a slot is selected
    const handleCreateClassroomFromCalendar = (initialSchedule) => {
        setInitialScheduleForNewClassroom(initialSchedule);
        navigateTo('newClassroom');
    };

    // Callback for when NewClassroomForm successfully saves/updates
    const handleNewClassroomSaveSuccess = (updatedInitialSchedule) => {
        // If form was opened from calendar, clear the initial schedule
        if (initialScheduleForNewClassroom.length > 0) {
            setInitialScheduleForNewClassroom([]);
        }
        // Optionally, navigate back to classrooms list or calendar
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
            <Sidebar navigateTo={navigateTo} />
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
                    />
                )}
                {currentPage === 'calendar' && (
                    <CalendarComponent
                        onCreateClassroomFromCalendar={handleCreateClassroomFromCalendar}
                        classrooms={classrooms} // Pass fetched classrooms
                    />
                )}
            </Box>
        </Box>
    );
}

export default App;
