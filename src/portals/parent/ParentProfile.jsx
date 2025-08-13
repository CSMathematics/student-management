// src/portals/parent/ParentProfile.jsx
import React, { useState } from 'react';
import {
    Container, Paper, Typography, Grid, Box, TextField, Button,
    CircularProgress, Alert
} from '@mui/material';
import { LockReset as LockResetIcon } from '@mui/icons-material';
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';

function ParentProfile({ user }) {
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordFeedback, setPasswordFeedback] = useState({ type: '', message: '' });

    const handlePasswordChange = (e) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    };

    const handleChangePassword = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordFeedback({ type: 'error', message: 'Οι νέοι κωδικοί δεν ταιριάζουν.' });
            return;
        }
        if (passwordData.newPassword.length < 6) {
            setPasswordFeedback({ type: 'error', message: 'Ο νέος κωδικός πρέπει να είναι τουλάχιστον 6 χαρακτήρες.' });
            return;
        }

        setIsChangingPassword(true);
        setPasswordFeedback({ type: '', message: '' });

        try {
            const auth = getAuth();
            const credential = EmailAuthProvider.credential(user.email, passwordData.currentPassword);
            
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, passwordData.newPassword);

            setPasswordFeedback({ type: 'success', message: 'Ο κωδικός πρόσβασης άλλαξε με επιτυχία!' });
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            console.error("Error changing password:", error);
            if (error.code === 'auth/wrong-password') {
                setPasswordFeedback({ type: 'error', message: 'Ο τρέχων κωδικός είναι λανθασμένος.' });
            } else {
                setPasswordFeedback({ type: 'error', message: 'Προέκυψε ένα σφάλμα. Δοκιμάστε ξανά.' });
            }
        } finally {
            setIsChangingPassword(false);
        }
    };

    if (!user) {
        return <CircularProgress />;
    }

    return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    Το Προφίλ μου
                </Typography>
                <Grid container spacing={4}>
                    {/* Account Info Section */}
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Στοιχεία Λογαριασμού</Typography>
                        <TextField 
                            label="Email Λογαριασμού" 
                            value={user.email || ''} 
                            fullWidth 
                            sx={{ mb: 2 }} 
                            disabled 
                            helperText="Το email δεν μπορεί να αλλάξει."
                        />
                    </Grid>

                    {/* Change Password Section */}
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Αλλαγή Κωδικού Πρόσβασης</Typography>
                        <TextField name="currentPassword" label="Τρέχων Κωδικός" type="password" value={passwordData.currentPassword} onChange={handlePasswordChange} fullWidth sx={{ mb: 2 }} />
                        <TextField name="newPassword" label="Νέος Κωδικός" type="password" value={passwordData.newPassword} onChange={handlePasswordChange} fullWidth sx={{ mb: 2 }} />
                        <TextField name="confirmPassword" label="Επιβεβαίωση Νέου Κωδικού" type="password" value={passwordData.confirmPassword} onChange={handlePasswordChange} fullWidth sx={{ mb: 2 }} />
                        <Button
                            variant="contained"
                            color="secondary"
                            startIcon={<LockResetIcon />}
                            onClick={handleChangePassword}
                            disabled={isChangingPassword}
                        >
                            {isChangingPassword ? <CircularProgress size={24} /> : 'Αλλαγή Κωδικού'}
                        </Button>
                        {passwordFeedback.message && <Alert severity={passwordFeedback.type} sx={{ mt: 2 }}>{passwordFeedback.message}</Alert>}
                    </Grid>
                </Grid>
            </Paper>
        </Container>
    );
}

export default ParentProfile;
