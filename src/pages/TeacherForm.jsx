// src/pages/TeacherForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Container, Paper, Typography, TextField, Button, Box, Grid,
    CircularProgress, Alert
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Helper function to generate a random ID
const generateFirestoreId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let autoId = '';
  for (let i = 0; i < 20; i++) {
    autoId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return autoId;
};

// --- ΔΙΟΡΘΩΣΗ 1: Προσθήκη του selectedYear στα props ---
function TeacherForm({ db, appId, selectedYear }) {
    const navigate = useNavigate();
    const { teacherId } = useParams();
    const isEditMode = Boolean(teacherId);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        specialty: '', // e.g., 'Φιλόλογος', 'Μαθηματικός'
    });
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    useEffect(() => {
        if (isEditMode && selectedYear) { // Wait for selectedYear
            const fetchTeacher = async () => {
                setLoading(true);
                try {
                    const teacherDocRef = doc(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/teachers`, teacherId);
                    const docSnap = await getDoc(teacherDocRef);
                    if (docSnap.exists()) {
                        setFormData(docSnap.data());
                    } else {
                        setFeedback({ type: 'error', message: 'Ο καθηγητής δεν βρέθηκε.' });
                    }
                } catch (error) {
                     setFeedback({ type: 'error', message: 'Σφάλμα κατά τη φόρτωση δεδομένων.' });
                } finally {
                    setLoading(false);
                }
            };
            fetchTeacher();
        }
    }, [isEditMode, teacherId, db, appId, selectedYear]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // --- ΔΙΟΡΘΩΣΗ 2: Έλεγχος ύπαρξης του selectedYear ---
        if (!selectedYear) {
            setFeedback({ type: 'error', message: 'Δεν έχει επιλεγεί ακαδημαϊκό έτος.' });
            return;
        }

        setLoading(true);
        setFeedback({ type: '', message: '' });

        try {
            const idToSave = isEditMode ? teacherId : generateFirestoreId();
            // --- ΔΙΟΡΘΩΣΗ 3: Χρήση του selectedYear στη διαδρομή της βάσης δεδομένων ---
            const teacherDocRef = doc(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/teachers`, idToSave);
            
            const dataToSave = { ...formData };
            if (!isEditMode) {
                dataToSave.createdAt = new Date();
            }

            await setDoc(teacherDocRef, dataToSave, { merge: isEditMode });
            setFeedback({ type: 'success', message: `Ο καθηγητής αποθηκεύτηκε με επιτυχία!` });
            setTimeout(() => navigate('/teachers'), 1500);

        } catch (error) {
            console.error("Error saving teacher:", error);
            setFeedback({ type: 'error', message: 'Αποτυχία αποθήκευσης.' });
            setLoading(false);
        }
    };
    
    if (loading && isEditMode) {
        return <Container sx={{mt: 4, textAlign: 'center'}}><CircularProgress /></Container>
    }

    return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
            <Paper component="form" onSubmit={handleSubmit} elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    {isEditMode ? 'Επεξεργασία Καθηγητή' : 'Προσθήκη Νέου Καθηγητή'}
                </Typography>
                <Grid container spacing={3} sx={{ mt: 2 }}>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Όνομα" name="firstName" value={formData.firstName} onChange={handleInputChange} required />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Επώνυμο" name="lastName" value={formData.lastName} onChange={handleInputChange} required />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Email" name="email" type="email" value={formData.email} onChange={handleInputChange} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Τηλέφωνο" name="phone" value={formData.phone} onChange={handleInputChange} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField fullWidth label="Ειδικότητα (π.χ. Μαθηματικός)" name="specialty" value={formData.specialty} onChange={handleInputChange} required />
                    </Grid>
                </Grid>
                <Box sx={{ mt: 4, textAlign: 'right' }}>
                    <Button variant="outlined" color="secondary" sx={{ mr: 2 }} onClick={() => navigate('/teachers')}>
                        Ακύρωση
                    </Button>
                    <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={loading}>
                        {loading ? <CircularProgress size={24} /> : 'Αποθήκευση'}
                    </Button>
                </Box>
                {feedback.message && <Alert severity={feedback.type} sx={{ mt: 3 }}>{feedback.message}</Alert>}
            </Paper>
        </Container>
    );
}

export default TeacherForm;