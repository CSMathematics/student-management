// src/portals/teacher/MyAssignmentsManager.jsx
import React, { useState, useMemo } from 'react';
import {
    Container, Paper, Typography, Box, FormControl, InputLabel, Select, MenuItem,
    List, ListItem, ListItemText, Button, IconButton, Tooltip, Dialog, DialogContent,
    DialogContentText, DialogActions, DialogTitle, Divider
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import AssignmentForm from '../../pages/AssignmentForm.jsx'; // Επαναχρησιμοποιούμε τη φόρμα
import { doc, setDoc, addDoc, deleteDoc, collection, serverTimestamp } from 'firebase/firestore';
import dayjs from 'dayjs';

const assignmentTypeLabels = {
    homework: 'Εργασία', test: 'Διαγώνισμα', project: 'Project', oral: 'Προφορική Εξέταση'
};

function MyAssignmentsManager({ db, appId, classrooms, allAssignments }) {
    const [filterClassroomId, setFilterClassroomId] = useState('all');
    const [formOpen, setFormOpen] = useState(false);
    const [assignmentToEdit, setAssignmentToEdit] = useState(null);
    const [assignmentToDelete, setAssignmentToDelete] = useState(null);

    const filteredAssignments = useMemo(() => {
        if (!allAssignments) return [];
        let assignments = [...allAssignments];
        if (filterClassroomId !== 'all') {
            assignments = assignments.filter(a => a.classroomId === filterClassroomId);
        }
        return assignments.sort((a, b) => b.dueDate.toDate() - a.dueDate.toDate());
    }, [allAssignments, filterClassroomId]);

    const handleOpenForm = (assignment = null) => {
        setAssignmentToEdit(assignment);
        setFormOpen(true);
    };

    const handleCloseForm = () => {
        setFormOpen(false);
        setAssignmentToEdit(null);
    };

    const handleSaveAssignment = async (formData) => {
        const isEditMode = Boolean(assignmentToEdit && assignmentToEdit.id);
        const dataToSave = { ...formData };

        try {
            if (isEditMode) {
                const docRef = doc(db, `artifacts/${appId}/public/data/assignments`, assignmentToEdit.id);
                delete dataToSave.createdAt;
                await setDoc(docRef, dataToSave, { merge: true });
            } else {
                const collectionRef = collection(db, `artifacts/${appId}/public/data/assignments`);
                const newDocRef = doc(collectionRef);
                dataToSave.id = newDocRef.id;
                dataToSave.createdAt = serverTimestamp();
                await setDoc(newDocRef, dataToSave);
            }
        } catch (error) {
            console.error("Error saving assignment:", error);
        } finally {
            handleCloseForm();
        }
    };
    
    // --- ΝΕΑ ΛΟΓΙΚΗ: Διαχείριση διαγραφής ---
    const handleDeleteClick = (assignment) => {
        setAssignmentToDelete(assignment);
    };

    const handleConfirmDelete = async () => {
        if (!assignmentToDelete) return;
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/assignments`, assignmentToDelete.id));
        } catch (error) {
            console.error("Error deleting assignment:", error);
        } finally {
            setAssignmentToDelete(null);
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                        Διαχείριση Αξιολογήσεων
                    </Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenForm()}>
                        Νέα Αξιολόγηση
                    </Button>
                </Box>

                <FormControl sx={{ minWidth: 240, mb: 3 }}>
                    <InputLabel>Φιλτράρισμα ανά Τμήμα</InputLabel>
                    <Select
                        value={filterClassroomId}
                        label="Φιλτράρισμα ανά Τμήμα"
                        onChange={(e) => setFilterClassroomId(e.target.value)}
                        size="small"
                    >
                        <MenuItem value="all"><em>Όλα τα Τμήματα</em></MenuItem>
                        {classrooms.map(c => (
                            <MenuItem key={c.id} value={c.id}>{c.classroomName} - {c.subject}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <List>
                    {filteredAssignments.map(item => {
                        const classroom = classrooms.find(c => c.id === item.classroomId);
                        return (
                            <React.Fragment key={item.id}>
                                <ListItem
                                    secondaryAction={
                                        <Box>
                                            <Tooltip title="Επεξεργασία">
                                                <IconButton edge="end" onClick={() => handleOpenForm(item)}><EditIcon /></IconButton>
                                            </Tooltip>
                                            {/* --- ΝΕΑ ΠΡΟΣΘΗΚΗ: Κουμπί διαγραφής --- */}
                                            <Tooltip title="Διαγραφή">
                                                <IconButton edge="end" onClick={() => handleDeleteClick(item)}><DeleteIcon /></IconButton>
                                            </Tooltip>
                                        </Box>
                                    }
                                >
                                    <ListItemText
                                        primary={`${item.title} (${assignmentTypeLabels[item.type] || item.type})`}
                                        secondary={`Τμήμα: ${classroom?.classroomName || 'N/A'} | Προθεσμία: ${dayjs(item.dueDate.toDate()).format('DD/MM/YYYY')}`}
                                    />
                                </ListItem>
                                <Divider />
                            </React.Fragment>
                        );
                    })}
                </List>
            </Paper>

            <AssignmentForm
                open={formOpen}
                onClose={handleCloseForm}
                onSave={handleSaveAssignment}
                initialData={assignmentToEdit}
                classrooms={classrooms}
            />
            
            {/* --- ΝΕΑ ΠΡΟΣΘΗΚΗ: Παράθυρο επιβεβαίωσης διαγραφής --- */}
            <Dialog open={Boolean(assignmentToDelete)} onClose={() => setAssignmentToDelete(null)}>
                <DialogTitle>Επιβεβαίωση Διαγραφής</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Είστε σίγουροι ότι θέλετε να διαγράψετε την αξιολόγηση "{assignmentToDelete?.title}";
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAssignmentToDelete(null)}>Ακύρωση</Button>
                    <Button onClick={handleConfirmDelete} color="error">Διαγραφή</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default MyAssignmentsManager;
