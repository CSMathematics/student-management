// src/pages/Announcements.jsx

import React, { useState, useEffect, useMemo } from 'react';
import {
    Container, Paper, Typography, Button, Box, IconButton, List, ListItem, ListItemText,
    Dialog, DialogActions, DialogContent, DialogTitle, TextField, CircularProgress, Alert, DialogContentText
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { doc, setDoc, deleteDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import dayjs from 'dayjs';

const generateFirestoreId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let autoId = '';
  for (let i = 0; i < 20; i++) {
    autoId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return autoId;
};

const AnnouncementForm = ({ open, onClose, onSave, announcement }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    useEffect(() => {
        if (announcement) {
            setTitle(announcement.title);
            setContent(announcement.content);
        } else {
            setTitle('');
            setContent('');
        }
    }, [announcement, open]);

    const handleSave = () => {
        if (title && content) {
            onSave({ ...announcement, title, content });
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>{announcement ? 'Επεξεργασία Ανακοίνωσης' : 'Νέα Ανακοίνωση'}</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label="Τίτλος"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    sx={{ mb: 2, mt: 1 }}
                />
                <TextField
                    margin="dense"
                    label="Περιεχόμενο"
                    type="text"
                    fullWidth
                    multiline
                    rows={10}
                    variant="outlined"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Ακύρωση</Button>
                <Button onClick={handleSave} variant="contained">Αποθήκευση</Button>
            </DialogActions>
        </Dialog>
    );
};


function Announcements({ allAnnouncements, loading, db, appId }) {
    const [openForm, setOpenForm] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    const [announcementToDelete, setAnnouncementToDelete] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    const handleOpenForm = (announcement = null) => {
        setSelectedAnnouncement(announcement);
        setOpenForm(true);
    };

    const handleCloseForm = () => {
        setOpenForm(false);
        setSelectedAnnouncement(null);
    };

    const handleSave = async (data) => {
        setIsSaving(true);
        setFeedback({ type: '', message: '' });
        const id = data.id || generateFirestoreId();
        const docRef = doc(db, `artifacts/${appId}/public/data/announcements`, id);
        
        try {
            const dataToSave = {
                title: data.title,
                content: data.content,
                updatedAt: serverTimestamp(),
            };
            if (!data.id) {
                dataToSave.createdAt = serverTimestamp();
            }
            await setDoc(docRef, dataToSave, { merge: true });

            if (!data.id) {
                const notificationsRef = collection(db, `artifacts/${appId}/public/data/notifications`);
                await addDoc(notificationsRef, {
                    recipientId: 'global',
                    type: 'announcement',
                    message: `Νέα ανακοίνωση: "${data.title}"`,
                    link: '/announcements',
                    readBy: [], // <-- ΑΛΛΑΓΗ: Χρήση readBy array
                    timestamp: serverTimestamp()
                });
            }

            setFeedback({ type: 'success', message: 'Η ανακοίνωση αποθηκεύτηκε.' });
        } catch (error) {
            console.error("Error saving announcement: ", error);
            setFeedback({ type: 'error', message: 'Σφάλμα κατά την αποθήκευση.' });
        } finally {
            setIsSaving(false);
            handleCloseForm();
        }
    };

    const handleDelete = (announcement) => {
        setAnnouncementToDelete(announcement);
    };

    const confirmDelete = async () => {
        if (!announcementToDelete) return;
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/announcements`, announcementToDelete.id));
            setFeedback({ type: 'success', message: 'Η ανακοίνωση διαγράφηκε.' });
        } catch (error) {
            console.error("Error deleting announcement: ", error);
            setFeedback({ type: 'error', message: 'Σφάλμα κατά τη διαγραφή.' });
        } finally {
            setAnnouncementToDelete(null);
        }
    };

    const sortedAnnouncements = useMemo(() => {
        if (!allAnnouncements) return [];
        return [...allAnnouncements].sort((a, b) => {
            const dateA = a.createdAt?.toDate() || 0;
            const dateB = b.createdAt?.toDate() || 0;
            return dateB - dateA;
        });
    }, [allAnnouncements]);

    if (loading) {
        return <Container sx={{ mt: 4, textAlign: 'center' }}><CircularProgress /></Container>;
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" component="h1" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                        Διαχείριση Ανακοινώσεων
                    </Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenForm()}>
                        Νέα Ανακοίνωση
                    </Button>
                </Box>

                {feedback.message && <Alert severity={feedback.type} sx={{ mb: 2 }}>{feedback.message}</Alert>}

                {sortedAnnouncements.length === 0 ? (
                    <Typography sx={{ textAlign: 'center', my: 4, color: 'text.secondary' }}>
                        Δεν υπάρχουν ανακοινώσεις.
                    </Typography>
                ) : (
                    <List>
                        {sortedAnnouncements.map(ann => (
                            <ListItem
                                key={ann.id}
                                divider
                                secondaryAction={
                                    <>
                                        <IconButton edge="end" aria-label="edit" onClick={() => handleOpenForm(ann)}>
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(ann)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </>
                                }
                            >
                                <ListItemText
                                    primary={ann.title}
                                    secondary={`Δημοσιεύτηκε: ${ann.createdAt ? dayjs(ann.createdAt.toDate()).format('DD/MM/YYYY HH:mm') : '...'}`}
                                />
                            </ListItem>
                        ))}
                    </List>
                )}
            </Paper>

            <AnnouncementForm
                open={openForm}
                onClose={handleCloseForm}
                onSave={handleSave}
                announcement={selectedAnnouncement}
            />

            <Dialog open={!!announcementToDelete} onClose={() => setAnnouncementToDelete(null)}>
                <DialogTitle>Επιβεβαίωση Διαγραφής</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Είστε σίγουροι ότι θέλετε να διαγράψετε την ανακοίνωση "{announcementToDelete?.title}";
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAnnouncementToDelete(null)}>Ακύρωση</Button>
                    <Button onClick={confirmDelete} color="error">Διαγραφή</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default Announcements;
