// src/portals/teacher/TeacherProfile.jsx
import React, { useState, useEffect } from 'react';
import {
    Container, Paper, Typography, Grid, TextField, Button,
    CircularProgress, Alert, Divider
} from '@mui/material';
import { Save as SaveIcon, LockReset as LockResetIcon } from '@mui/icons-material';
import { doc, updateDoc } from 'firebase/firestore';
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';

function TeacherProfile({ teacherData, db, appId, user }) {
    const [formData, setFormData] = useState({
        phone: '',
        email: '',
        specialty: ''
    });
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });
    const [passwordFeedback, setPasswordFeedback] = useState({ type: '', message: '' });

    useEffect(() => {
        if (teacherData) {
            setFormData({
                phone: teacherData.phone || '',
                email: teacherData.email || '',
                specialty: teacherData.specialty || ''
            });
        }
    }, [teacherData]);

    const handleInfoChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePasswordChange = (e) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        setFeedback({ type: '', message: '' });
        try {
            const teacherRef = doc(db, `artifacts/${appId}/public/data/teachers`, teacherData.id);
            await updateDoc(teacherRef, {
                phone: formData.phone,
                email: formData.email,
                specialty: formData.specialty
            });
            setFeedback({ type: 'success', message: 'Οι πληροφορίες αποθηκεύτηκαν με επιτυχία!' });
        } catch (error) {
            console.error("Error updating teacher info:", error);
            setFeedback({ type: 'error', message: 'Προέκυψε σφάλμα κατά την αποθήκευση.' });
        } finally {
            setIsSaving(false);
        }
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

    if (!teacherData) {
        return <CircularProgress />;
    }

    return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    Το Προφίλ μου
                </Typography>
                <Grid container spacing={4}>
                    {/* Personal Info Section */}
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Προσωπικά Στοιχεία</Typography>
                        <TextField label="Όνομα" value={teacherData.firstName || ''} fullWidth sx={{ mb: 2 }} disabled />
                        <TextField label="Επώνυμο" value={teacherData.lastName || ''} fullWidth sx={{ mb: 2 }} disabled />
                        <TextField name="specialty" label="Ειδικότητα" value={formData.specialty} onChange={handleInfoChange} fullWidth sx={{ mb: 2 }} />
                        <TextField name="phone" label="Τηλέφωνο" value={formData.phone} onChange={handleInfoChange} fullWidth sx={{ mb: 2 }} />
                        <TextField name="email" label="Email" type="email" value={formData.email} onChange={handleInfoChange} fullWidth sx={{ mb: 2 }} />
                        <Button
                            variant="contained"
                            startIcon={<SaveIcon />}
                            onClick={handleSaveChanges}
                            disabled={isSaving}
                        >
                            {isSaving ? <CircularProgress size={24} /> : 'Αποθήκευση Αλλαγών'}
                        </Button>
                        {feedback.message && <Alert severity={feedback.type} sx={{ mt: 2 }}>{feedback.message}</Alert>}
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

export default TeacherProfile;
