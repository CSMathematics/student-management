// src/App.jsx
import React, { useState, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
// --- ΑΛΛΑΓΗ: Προσθήκη νέων imports ---
import { getFirestore, onSnapshot, doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import './scss/main.scss';
import AuthPage from './pages/Auth.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import Layout from './components/Layout.jsx';

import AdminPortal from './portals/AdminPortal.jsx';
import TeacherPortal from './portals/TeacherPortal.jsx';
import StudentPortal from './portals/StudentPortal.jsx';
import ParentPortal from './portals/ParentPortal.jsx';

function App() {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [authError, setAuthError] = useState('');
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [appId, setAppId] = useState(null);

    useEffect(() => {
        const firebaseConfigString = typeof __firebase_config !== 'undefined' ? __firebase_config : import.meta.env.VITE_FIREBASE_CONFIG;
        const currentAppId = typeof __app_id !== 'undefined' ? __app_id : import.meta.env.VITE_APP_ID || 'default-local-app-id';
        const parsedFirebaseConfig = firebaseConfigString ? JSON.parse(firebaseConfigString) : {};
        
        if (parsedFirebaseConfig.apiKey) {
            const app = initializeApp(parsedFirebaseConfig);
            const firestoreDb = getFirestore(app);
            const firebaseAuth = getAuth(app);
            setDb(firestoreDb);
            setAuth(firebaseAuth);
            setAppId(currentAppId);

            const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
                if (user) {
                    setUser(user);
                    const userDocRef = doc(firestoreDb, `users/${user.uid}`);
                    const unsubscribeProfile = onSnapshot(userDocRef, (doc) => {
                        if (doc.exists()) {
                            setUserProfile(doc.data());
                        } else {
                            console.log("No such user profile!");
                            setUserProfile({ role: 'unknown' });
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
        } else {
            setAuthLoading(false);
        }
    }, []);

    const handleSignUp = async (email, password, role) => {
        setAuthLoading(true);
        setAuthError('');
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            // Δημιουργία προφίλ χρήστη
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                email: user.email,
                role: role,
                profileId: null,
                createdAt: new Date(),
            });

            // --- ΑΛΛΑΓΗ: Δημιουργία ειδοποίησης για τον admin ---
            const notificationsRef = collection(db, `artifacts/${appId}/public/data/notifications`);
            await addDoc(notificationsRef, {
                recipientId: 'admin', // Ειδικό ID για όλους τους admins
                type: 'newUser',
                message: `Νέος χρήστης (${email}) εγγράφηκε με ρόλο: ${role}.`,
                link: role === 'student' ? '/students' : (role === 'teacher' ? '/teachers' : '/'),
                readBy: [],
                timestamp: serverTimestamp()
            });

        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                setAuthError('Αυτό το email χρησιμοποιείται ήδη.');
            } else if (error.code === 'auth/weak-password') {
                setAuthError('Ο κωδικός πρέπει να είναι τουλάχιστον 6 χαρακτήρες.');
            } else {
                setAuthError('Προέκυψε ένα σφάλμα. Δοκιμάστε ξανά.');
            }
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
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
                setAuthError('Λάθος email ή κωδικός πρόσβασης.');
            } else {
                setAuthError('Προέκυψε ένα σφάλμα. Δοκιμάστε ξανά.');
            }
        } finally {
            setAuthLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out: ", error);
        }
    };

    const renderPortal = () => {
        const props = { db, appId, user, userProfile };
        switch (userProfile?.role) {
            case 'admin':
                return <AdminPortal {...props} />;
            case 'teacher':
                return <TeacherPortal {...props} />;
            case 'student':
                return <StudentPortal {...props} />;
            case 'parent':
                return <ParentPortal {...props} />;
            default:
                return <Box>Loading user profile...</Box>;
        }
    };

    if (authLoading) {
        return (<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>);
    }

    return (
        <ThemeProvider>
            <BrowserRouter>
                {user ? (
                    <Layout 
                        userProfile={userProfile} 
                        handleLogout={handleLogout}
                        db={db}
                        appId={appId}
                        user={user}
                    >
                        {renderPortal()}
                    </Layout>
                ) : (
                    <Routes>
                        <Route path="*" element={<AuthPage handleLogin={handleLogin} handleSignUp={handleSignUp} loading={authLoading} error={authError} />} />
                    </Routes>
                )}
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;
