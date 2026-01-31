// src/App.jsx
import React, { Suspense } from 'react';
import { Box, CircularProgress, Paper, Typography, Container } from '@mui/material';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import './scss/main.scss';
import AuthPage from './pages/Auth.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AcademicYearProvider } from './context/AcademicYearContext.jsx';
import Layout from './components/Layout.jsx';
import PwaInstallPrompt from './components/PwaInstallPrompt.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';

// Dynamic imports
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

const AppContent = () => {
    const {
        user,
        userProfile,
        loading,
        error: authError,
        db,
        appId,
        login,
        signUp,
        logout
    } = useAuth();

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    const renderPortal = () => {
        const roles = userProfile?.roles || [];
        // Extract common props
        const portalProps = { db, appId, user, userProfile };

        if (roles.includes('admin')) return <AdminPortal {...portalProps} />;
        if (roles.includes('teacher')) return <TeacherPortal {...portalProps} />;
        if (roles.includes('student')) return <StudentPortal {...portalProps} />;
        if (roles.includes('parent')) return <ParentPortal {...portalProps} />;
        if (roles.includes('pending_approval')) return <PendingApprovalPage />;

        return (
            <AuthPage
                handleLogin={login}
                handleSignUp={signUp}
                loading={loading}
                error={authError}
            />
        );
    };

    return (
        <ThemeProvider>
            <AcademicYearProvider db={db} appId={appId}>
                <BrowserRouter>
                    {user && userProfile ? (
                        <>
                            <Layout
                                userProfile={userProfile}
                                handleLogout={logout}
                                db={db}
                                appId={appId}
                                user={user}
                            >
                                <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
                                    {renderPortal()}
                                </Suspense>
                            </Layout>
                            <PwaInstallPrompt />
                        </>
                    ) : (
                        <Routes>
                            <Route path="*" element={
                                <AuthPage
                                    handleLogin={login}
                                    handleSignUp={signUp}
                                    loading={loading}
                                    error={authError}
                                />
                            } />
                        </Routes>
                    )}
                </BrowserRouter>
            </AcademicYearProvider>
        </ThemeProvider>
    );
};

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;

