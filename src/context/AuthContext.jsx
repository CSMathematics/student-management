import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import {
    getFirestore,
    doc,
    setDoc,
    onSnapshot,
    collection,
    addDoc,
    serverTimestamp
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [appId, setAppId] = useState(null);
    const [isFirebaseReady, setIsFirebaseReady] = useState(false);

    // Initialize Firebase
    useEffect(() => {
        const firebaseConfigString = typeof __firebase_config !== 'undefined'
            ? __firebase_config
            : import.meta.env.VITE_FIREBASE_CONFIG;
        const currentAppId = typeof __app_id !== 'undefined'
            ? __app_id
            : import.meta.env.VITE_APP_ID || 'default-local-app-id';

        try {
            if (firebaseConfigString) {
                const parsedFirebaseConfig = JSON.parse(firebaseConfigString);
                if (parsedFirebaseConfig.apiKey) {
                    const app = initializeApp(parsedFirebaseConfig);
                    setDb(getFirestore(app));
                    setAuth(getAuth(app));
                    setAppId(currentAppId);
                    setIsFirebaseReady(true);
                }
            } else {
                console.error("Firebase config is missing");
                setLoading(false);
            }
        } catch (error) {
            console.error("Firebase config error:", error);
            setLoading(false);
        }
    }, []);

    // Monitor Auth State
    useEffect(() => {
        if (!auth) {
            if (isFirebaseReady) setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                // Fetch User Profile
                const userDocRef = doc(db, `users/${currentUser.uid}`);
                const unsubscribeProfile = onSnapshot(userDocRef, (docSnapshot) => {
                    if (docSnapshot.exists()) {
                        setUserProfile(docSnapshot.data());
                    } else {
                        setUserProfile({ roles: ['unknown'] });
                    }
                    setLoading(false);
                }, (err) => {
                    console.error("Error fetching user profile:", err);
                    setError("Failed to load user profile");
                    setLoading(false);
                });
                return () => unsubscribeProfile();
            } else {
                setUser(null);
                setUserProfile(null);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [auth, db, isFirebaseReady]);

    const signUp = async (email, password, role, firstName, lastName) => {
        setLoading(true);
        setError('');
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const newUser = userCredential.user;

            // Create user document
            await setDoc(doc(db, "users", newUser.uid), {
                uid: newUser.uid,
                email: newUser.email,
                firstName: firstName,
                lastName: lastName,
                roles: ['pending_approval'],
                requestedRole: role,
                profileId: null,
                createdAt: new Date(),
            });

            // Notify Admin
            const notificationsRef = collection(db, `artifacts/${appId}/public/data/adminNotifications`);
            await addDoc(notificationsRef, {
                recipientId: 'admin',
                type: 'newUser',
                message: `Ο χρήστης ${firstName} ${lastName} (${email}) έκανε εγγραφή ως ${role} και αναμένει έγκριση.`,
                link: '/users-management',
                readBy: [],
                timestamp: serverTimestamp()
            });

        } catch (err) {
            console.error("Signup error:", err);
            setError('Προέκυψε ένα σφάλμα. Δοκιμάστε ξανά.');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        setLoading(true);
        setError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            console.error("Login error:", err);
            setError('Λάθος email ή κωδικός πρόσβασης.');
            setLoading(false);
            throw err;
        }
    };

    const logout = async () => {
        setLoading(true);
        try {
            await signOut(auth);
        } catch (err) {
            console.error("Logout error:", err);
            setLoading(false);
        }
    };

    const value = {
        user,
        userProfile,
        loading,
        error,
        db,
        auth,
        appId,
        signUp,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
