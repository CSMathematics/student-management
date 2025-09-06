// src/App.jsx
import React, { useState, useEffect, Suspense } from 'react'; // Προσθήκη Suspense
import { Box, CircularProgress, Paper, Typography, Container } from '@mui/material';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, onSnapshot, doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import './scss/main.scss';
import AuthPage from './pages/Auth.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AcademicYearProvider } from './context/AcademicYearContext.jsx';
import Layout from './components/Layout.jsx';
import PwaInstallPrompt from './components/PwaInstallPrompt.jsx';

// --- ΑΛΛΑΓΗ: Δυναμική φόρτωση των Portals ---
const AdminPortal = React.lazy(() => import('./portals/AdminPortal.jsx'));
const TeacherPortal = React.lazy(() => import('./portals/TeacherPortal.jsx'));
const StudentPortal = React.lazy(() => import('./portals/StudentPortal.jsx'));
const ParentPortal = React.lazy(() => import('./portals/ParentPortal.jsx'));

const PendingApprovalPage = () => (
    <Container component="main" maxWidth="sm" sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h5" component="h1" gutterBottom>
                Εν Αναμονή Έγκρισης
            </Typography>
            <Typography variant="body1" align="center">
                Ο λογαριασμός σας δημιουργήθηκε με επιτυχία. Θα ειδοποιηθείτε μέσω email μόλις ο διαχειριστής τον ενεργοποιήσει.
            </Typography>
        </Paper>
    </Container>
);

function App() {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [authError, setAuthError] = useState('');
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [appId, setAppId] = useState(null);
    const [isFirebaseReady, setIsFirebaseReady] = useState(false);

    useEffect(() => {
        const firebaseConfigString = typeof __firebase_config !== 'undefined' ? __firebase_config : import.meta.env.VITE_FIREBASE_CONFIG;
        const currentAppId = typeof __app_id !== 'undefined' ? __app_id : import.meta.env.VITE_APP_ID || 'default-local-app-id';
        
        try {
            const parsedFirebaseConfig = JSON.parse(firebaseConfigString);
            if (parsedFirebaseConfig.apiKey) {
                const app = initializeApp(parsedFirebaseConfig);
                setDb(getFirestore(app));
                setAuth(getAuth(app));
                setAppId(currentAppId);
                setIsFirebaseReady(true);
            }
        } catch (error) {
            console.error("Firebase config error:", error);
            setIsFirebaseReady(true);
        }
    }, []);

    useEffect(() => {
        if (!auth) {
            if(isFirebaseReady) setAuthLoading(false);
            return;
        };

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUser(user);
                const userDocRef = doc(db, `users/${user.uid}`);
                const unsubscribeProfile = onSnapshot(userDocRef, (doc) => {
                    if (doc.exists()) {
                        setUserProfile(doc.data());
                    } else {
                        setUserProfile({ roles: ['unknown'] });
                    }
                    setAuthLoading(false);
                });
                return () => unsubscribeProfile();
            } else {
                setUser(null);
                setUserProfile(null);
                setAuthLoading(false);
            }
        });

        return () => unsubscribe();
    }, [auth, db, isFirebaseReady]);

    const handleSignUp = async (email, password, role, firstName, lastName) => {
        setAuthLoading(true);
        setAuthError('');
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                email: user.email,
                firstName: firstName,
                lastName: lastName,
                roles: ['pending_approval'], 
                requestedRole: role,
                profileId: null,
                createdAt: new Date(),
            });

            const notificationsRef = collection(db, `artifacts/${appId}/public/data/adminNotifications`);
            await addDoc(notificationsRef, {
                recipientId: 'admin',
                type: 'newUser',
                message: `Ο χρήστης ${firstName} ${lastName} (${email}) έκανε εγγραφή ως ${role} και αναμένει έγκριση.`,
                link: '/users-management',
                readBy: [],
                timestamp: serverTimestamp()
            });

        } catch (error) {
            setAuthError('Προέκυψε ένα σφάλμα. Δοκιμάστε ξανά.');
        } finally {
            setAuthLoading(false);
        }
    };

    const handleLogin = async (email, password) => {
        setAuthLoading(true);
        setAuthError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            setAuthError('Λάθος email ή κωδικός πρόσβασης.');
        }
    };

    const handleLogout = async () => {
        // --- ΔΙΟΡΘΩΣΗ: Προσθήκη loading state κατά την αποσύνδεση ---
        setAuthLoading(true); 
        try {
            await signOut(auth);
            // Το onAuthStateChanged θα χειριστεί τα user/userProfile και θα θέσει το authLoading σε false.
        } catch (error) {
            console.error("Error signing out: ", error);
            setAuthLoading(false); // Σε περίπτωση σφάλματος, σταματάμε το loading.
        }
    };

    const renderPortal = () => {
        const roles = userProfile?.roles || [];
        const props = { db, appId, user, userProfile };

        if (roles.includes('admin')) return <AdminPortal {...props} />;
        if (roles.includes('teacher')) return <TeacherPortal {...props} />;
        if (roles.includes('student')) return <StudentPortal {...props} />;
        if (roles.includes('parent')) return <ParentPortal {...props} />;
        if (roles.includes('pending_approval')) return <PendingApprovalPage />;
        
        return <AuthPage handleLogin={handleLogin} handleSignUp={handleSignUp} loading={authLoading} error={authError} />;
    };

    if (authLoading) {
        return (<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>);
    }

    return (
        <ThemeProvider>
            <AcademicYearProvider db={db} appId={appId}>
                <BrowserRouter>
                    {user && userProfile ? (
                        <>
                            <Layout 
                                userProfile={userProfile} 
                                handleLogout={handleLogout}
                                db={db}
                                appId={appId}
                                user={user}
                            >
                                {/* --- ΑΛΛΑΓΗ: Προσθήκη Suspense για τη δυναμική φόρτωση --- */}
                                <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
                                    {renderPortal()}
                                </Suspense>
                            </Layout>
                            <PwaInstallPrompt />
                        </>
                    ) : (
                        <Routes>
                            <Route path="*" element={<AuthPage handleLogin={handleLogin} handleSignUp={handleSignUp} loading={authLoading} error={authError} />} />
                        </Routes>
                    )}
                </BrowserRouter>
            </AcademicYearProvider>
        </ThemeProvider>
    );
}

export default App;

