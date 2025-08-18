// src/pages/AcademicYearsManager.jsx
import React, { useState } from 'react';
import {
    Container, Paper, Typography, Button, Box, IconButton, List, ListItem, ListItemText,
    Dialog, DialogActions, DialogContent, DialogTitle, TextField, CircularProgress, Alert, Grid, DialogContentText
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useAcademicYear } from '../context/AcademicYearContext';
import dayjs from 'dayjs';

function AcademicYearsManager({ db, appId }) {
    const { academicYears, loadingYears } = useAcademicYear();
    const [openForm, setOpenForm] = useState(false);
    const [yearToEdit, setYearToEdit] = useState(null);
    const [formData, setFormData] = useState({ id: '', startDate: '', endDate: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });
    
    const [yearToDelete, setYearToDelete] = useState(null);
    // --- ΝΕΑ ΠΡΟΣΘΗΚΗ: State για το κείμενο επιβεβαίωσης ---
    const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

    const handleOpenForm = (year = null) => {
        if (year) {
            setYearToEdit(year);
            setFormData({
                id: year.id,
                startDate: year.startDate ? dayjs(year.startDate.toDate()).format('YYYY-MM-DD') : '',
                endDate: year.endDate ? dayjs(year.endDate.toDate()).format('YYYY-MM-DD') : ''
            });
        } else {
            setYearToEdit(null);
            const currentYear = dayjs().year();
            setFormData({
                id: `${currentYear}-${currentYear + 1}`,
                startDate: '',
                endDate: ''
            });
        }
        setOpenForm(true);
    };

    const handleCloseForm = () => {
        setOpenForm(false);
        setYearToEdit(null);
    };

    const handleFormChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        if (!formData.id || !formData.startDate) {
            setFeedback({ type: 'error', message: 'Παρακαλώ συμπληρώστε το Ακαδημαϊκό Έτος και την Ημερομηνία Έναρξης.' });
            return;
        }
        
        if (formData.endDate && dayjs(formData.endDate).isBefore(dayjs(formData.startDate))) {
            setFeedback({ type: 'error', message: 'Η ημερομηνία λήξης πρέπει να είναι μετά την ημερομηνία έναρξης.' });
            return;
        }

        setIsSaving(true);
        setFeedback({ type: '', message: '' });

        try {
            const docRef = doc(db, `artifacts/${appId}/public/data/academicYears`, formData.id);
            const dataToSave = {
                year: formData.id,
                startDate: dayjs(formData.startDate).toDate(),
                endDate: formData.endDate ? dayjs(formData.endDate).toDate() : null
            };
            await setDoc(docRef, dataToSave, { merge: true });
            setFeedback({ type: 'success', message: 'Το ακαδημαϊκό έτος αποθηκεύτηκε.' });
            handleCloseForm();
        } catch (error) {
            console.error("Error saving academic year:", error);
            setFeedback({ type: 'error', message: 'Σφάλμα κατά την αποθήκευση.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = (year) => {
        setYearToDelete(year);
        setDeleteConfirmationText(''); // Καθαρίζουμε το πεδίο κάθε φορά που ανοίγει το dialog
    };

    const handleConfirmDelete = async () => {
        if (!yearToDelete) return;
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/academicYears`, yearToDelete.id));
            setFeedback({ type: 'success', message: `Το έτος ${yearToDelete.id} διαγράφηκε.` });
        } catch (error) {
            console.error("Error deleting academic year:", error);
            setFeedback({ type: 'error', message: 'Σφάλμα κατά τη διαγραφή.' });
        } finally {
            setYearToDelete(null);
            setDeleteConfirmationText('');
        }
    };
    
    return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" component="h1" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                        Διαχείριση Ακαδημαϊκών Ετών
                    </Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenForm()}>
                        Νέο Έτος
                    </Button>
                </Box>

                {feedback.message && <Alert severity={feedback.type} sx={{ mb: 2 }} onClose={() => setFeedback({type: '', message: ''})}>{feedback.message}</Alert>}

                {loadingYears ? <CircularProgress /> : (
                    <List>
                        {academicYears.map(year => (
                            <ListItem
                                key={year.id}
                                divider
                                secondaryAction={
                                    <>
                                        <IconButton edge="end" aria-label="edit" onClick={() => handleOpenForm(year)}>
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteClick(year)} sx={{ml: 1}}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </>
                                }
                            >
                                <ListItemText
                                    primary={year.id}
                                    secondary={`Έναрξη: ${year.startDate ? dayjs(year.startDate.toDate()).format('DD/MM/YYYY') : 'Δεν έχει οριστεί'} - Λήξη: ${year.endDate ? dayjs(year.endDate.toDate()).format('DD/MM/YYYY') : 'Δεν έχει οριστεί'}`}
                                />
                            </ListItem>
                        ))}
                    </List>
                )}
            </Paper>

            <Dialog open={openForm} onClose={handleCloseForm}>
                <DialogTitle>{yearToEdit ? 'Επεξεργασία Έτους' : 'Νέο Ακαδημαϊκό Έτος'}</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{mb: 2}}>
                        Ορίστε το όνομα του έτους (π.χ. 2024-2025) και την ημερομηνία έναρξης. Μπορείτε να προσθέσετε την ημερομηνία λήξης αργότερα.
                    </DialogContentText>
                    <Grid container spacing={2} sx={{ pt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                name="id"
                                label="Ακαδημαϊκό Έτος (π.χ. 2024-2025)"
                                value={formData.id}
                                onChange={handleFormChange}
                                fullWidth
                                disabled={!!yearToEdit}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                name="startDate"
                                label="Ημερομηνία Έναρξης"
                                type="date"
                                value={formData.startDate}
                                onChange={handleFormChange}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                name="endDate"
                                label="Ημερομηνία Λήξης (Προαιρετικά)"
                                type="date"
                                value={formData.endDate}
                                onChange={handleFormChange}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseForm}>Ακύρωση</Button>
                    <Button onClick={handleSave} variant="contained" disabled={isSaving}>
                        {isSaving ? <CircularProgress size={24} /> : 'Αποθήκευση'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* --- ΕΝΗΜΕΡΩΜΕΝΟ Dialog επιβεβαίωσης διαγραφής --- */}
            <Dialog open={!!yearToDelete} onClose={() => setYearToDelete(null)}>
                <DialogTitle>Επιβεβαίωση Οριστικής Διαγραφής</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Αυτή η ενέργεια είναι μη αναστρέψιμη. Θα διαγραφεί το ακαδημαϊκό έτος <strong>"{yearToDelete?.id}"</strong> και όλα τα δεδομένα που περιέχει (μαθητές, τμήματα, βαθμοί κ.λπ.).
                        <br/><br/>
                        Για να συνεχίσετε, πληκτρολογήστε <strong>{yearToDelete?.id}</strong> στο παρακάτω πεδίο.
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Πληκτρολογήστε για επιβεβαίωση"
                        type="text"
                        fullWidth
                        variant="standard"
                        value={deleteConfirmationText}
                        onChange={(e) => setDeleteConfirmationText(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setYearToDelete(null)}>Ακύρωση</Button>
                    <Button 
                        onClick={handleConfirmDelete} 
                        color="error"
                        // Το κουμπί ενεργοποιείται μόνο αν το κείμενο ταιριάζει
                        disabled={deleteConfirmationText !== yearToDelete?.id}
                    >
                        Καταλαβαίνω τις συνέπειες, Διαγραφή
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default AcademicYearsManager;
