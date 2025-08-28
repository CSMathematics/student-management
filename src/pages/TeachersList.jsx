// src/pages/TeachersList.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container, Paper, Typography, Button, Box, IconButton, List, ListItem, ListItemText,
    CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    Avatar, ListItemAvatar, Chip, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Link as LinkIcon } from '@mui/icons-material';
import { doc, deleteDoc, collection, onSnapshot, updateDoc } from 'firebase/firestore';

function TeachersList({ allTeachers, loading, db, appId, selectedYear }) {
    const navigate = useNavigate();
    const [teacherToDelete, setTeacherToDelete] = useState(null);
    
    const [allUsers, setAllUsers] = useState([]);
    const [openLinkDialog, setOpenLinkDialog] = useState(false);
    const [teacherToLink, setTeacherToLink] = useState(null);
    const [selectedUserId, setSelectedUserId] = useState('');

    useEffect(() => {
        if (!db) return;
        const usersRef = collection(db, 'users');
        const unsubscribe = onSnapshot(usersRef, (snapshot) => {
            setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [db]);

    const usersByProfileId = useMemo(() => {
        const map = new Map();
        allUsers.forEach(user => {
            if (user.profileId) {
                map.set(user.profileId, user);
            }
        });
        return map;
    }, [allUsers]);

    // --- START: Updated logic to check 'roles' array ---
    const unlinkedTeacherUsers = useMemo(() => {
        return allUsers.filter(user => {
            const userRoles = user.roles || (user.role ? [user.role] : []);
            return userRoles.includes('teacher') && !user.profileId;
        });
    }, [allUsers]);
    // --- END: Updated logic ---

    const handleOpenLinkDialog = (teacher) => {
        setTeacherToLink(teacher);
        setOpenLinkDialog(true);
    };

    const handleCloseLinkDialog = () => {
        setTeacherToLink(null);
        setOpenLinkDialog(false);
        setSelectedUserId('');
    };

    const handleLinkUser = async () => {
        if (!teacherToLink || !selectedUserId) return;
        try {
            const userDocRef = doc(db, 'users', selectedUserId);
            await updateDoc(userDocRef, { profileId: teacherToLink.id });
            handleCloseLinkDialog();
        } catch (error) {
            console.error("Error linking teacher user:", error);
        }
    };

    const handleDeleteClick = (e, teacher) => {
        e.stopPropagation();
        setTeacherToDelete(teacher);
    };

    const handleConfirmDelete = async () => {
        if (!teacherToDelete || !selectedYear) return;
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/teachers`, teacherToDelete.id));
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
                        {allTeachers.map(teacher => {
                            const linkedUser = usersByProfileId.get(teacher.id);
                            return (
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
                                        secondary={
                                            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Typography component="span" variant="body2">{teacher.specialty}</Typography>
                                                {linkedUser ? (
                                                    <Chip label={linkedUser.email} size="small" color="success" variant="outlined" />
                                                ) : (
                                                    <Button variant="outlined" size="small" startIcon={<LinkIcon />} onClick={() => handleOpenLinkDialog(teacher)}>
                                                        Σύνδεση
                                                    </Button>
                                                )}
                                            </Box>
                                        }
                                    />
                                </ListItem>
                            );
                        })}
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

            <Dialog open={openLinkDialog} onClose={handleCloseLinkDialog} fullWidth maxWidth="xs">
                <DialogTitle>Σύνδεση Καθηγητή</DialogTitle>
                {teacherToLink && (
                    <>
                        <DialogContent>
                            <DialogContentText sx={{ mb: 2 }}>
                                Επιλέξτε τον λογαριασμό χρήστη που θέλετε να συνδέσετε με τον καθηγητή <strong>{teacherToLink.firstName} {teacherToLink.lastName}</strong>.
                            </DialogContentText>
                            <FormControl fullWidth>
                                <InputLabel>Λογαριασμός Χρήστη</InputLabel>
                                <Select value={selectedUserId} label="Λογαριασμός Χρήστη" onChange={(e) => setSelectedUserId(e.target.value)}>
                                    {unlinkedTeacherUsers.length > 0 ? (
                                        unlinkedTeacherUsers.map(user => (
                                            <MenuItem key={user.id} value={user.id}>{user.email}</MenuItem>
                                        ))
                                    ) : (<MenuItem disabled>Δεν υπάρχουν διαθέσιμοι χρήστες</MenuItem>)}
                                </Select>
                            </FormControl>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleCloseLinkDialog}>Ακύρωση</Button>
                            <Button onClick={handleLinkUser} variant="contained" disabled={!selectedUserId}>Σύνδεση</Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Container>
    );
}

export default TeachersList;
