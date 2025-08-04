// src/pages/TeachersList.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container, Paper, Typography, Button, Box, IconButton, List, ListItem, ListItemText,
    CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    Avatar, ListItemAvatar
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { doc, deleteDoc } from 'firebase/firestore';

function TeachersList({ allTeachers, loading, db, appId }) {
    const navigate = useNavigate();
    const [teacherToDelete, setTeacherToDelete] = useState(null);

    const handleDeleteClick = (e, teacher) => {
        e.stopPropagation();
        setTeacherToDelete(teacher);
    };

    const handleConfirmDelete = async () => {
        if (!teacherToDelete) return;
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/teachers`, teacherToDelete.id));
            setTeacherToDelete(null);
        } catch (error) {
            console.error("Error deleting teacher:", error);
            setTeacherToDelete(null);
        }
    };
    
    if (loading) {
        return <Container sx={{ mt: 4, textAlign: 'center' }}><CircularProgress /></Container>;
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" component="h1" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                        Κατάλογος Καθηγητών
                    </Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/teacher/new')}>
                        Νέος Καθηγητής
                    </Button>
                </Box>

                {allTeachers.length === 0 ? (
                    <Typography sx={{ textAlign: 'center', my: 4, color: 'text.secondary' }}>
                        Δεν υπάρχουν καταχωρημένοι καθηγητές.
                    </Typography>
                ) : (
                    <List>
                        {allTeachers.map(teacher => (
                            <ListItem
                                key={teacher.id}
                                divider
                                secondaryAction={
                                    <>
                                        <IconButton edge="end" aria-label="edit" onClick={() => navigate(`/teacher/edit/${teacher.id}`)}>
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton edge="end" aria-label="delete" onClick={(e) => handleDeleteClick(e, teacher)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </>
                                }
                            >
                                <ListItemAvatar>
                                    <Avatar>{teacher.firstName?.charAt(0)}{teacher.lastName?.charAt(0)}</Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={`${teacher.firstName} ${teacher.lastName}`}
                                    secondary={teacher.specialty}
                                />
                            </ListItem>
                        ))}
                    </List>
                )}
            </Paper>

            <Dialog open={Boolean(teacherToDelete)} onClose={() => setTeacherToDelete(null)}>
                <DialogTitle>Επιβεβαίωση Διαγραφής</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Είστε σίγουροι ότι θέλετε να διαγράψετε τον καθηγητή "{teacherToDelete?.firstName} {teacherToDelete?.lastName}";
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTeacherToDelete(null)}>Ακύρωση</Button>
                    <Button onClick={handleConfirmDelete} color="error">Διαγραφή</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default TeachersList;
