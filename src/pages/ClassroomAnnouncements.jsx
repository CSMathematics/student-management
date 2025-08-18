// src/pages/ClassroomAnnouncements.jsx
import React, { useState, useMemo } from 'react';
import {
    Box,
    Typography,
    List,
    ListItem,
    ListItemText,
    TextField,
    Button,
    CircularProgress,
    Paper,
    Divider,
    IconButton,
    Tooltip
} from '@mui/material';
import { AddComment as AddCommentIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import dayjs from 'dayjs';

// --- ΔΙΟΡΘΩΣΗ 1: Προσθήκη του selectedYear στα props ---
function ClassroomAnnouncements({ classroom, db, appId, selectedYear }) {
    const [newAnnouncement, setNewAnnouncement] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const sortedAnnouncements = useMemo(() => {
        if (!classroom?.announcements) return [];
        // Sort announcements by date, newest first
        return [...classroom.announcements].sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());
    }, [classroom]);

    const handleAddAnnouncement = async () => {
        if (!newAnnouncement.trim() || !selectedYear) return;

        setIsSaving(true);
        const announcementData = {
            id: Date.now(),
            text: newAnnouncement,
            createdAt: new Date(),
        };

        try {
            // --- ΔΙΟΡΘΩΣΗ 2: Χρήση του selectedYear στη διαδρομή ---
            const classroomRef = doc(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/classrooms`, classroom.id);
            await updateDoc(classroomRef, {
                announcements: arrayUnion(announcementData)
            });
            setNewAnnouncement('');
        } catch (error) {
            console.error("Error adding announcement:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAnnouncement = async (announcementToDelete) => {
        if (!selectedYear) return;
        try {
            // --- ΔΙΟΡΘΩΣΗ 2: Χρήση του selectedYear στη διαδρομή ---
            const classroomRef = doc(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/classrooms`, classroom.id);
            await updateDoc(classroomRef, {
                announcements: arrayRemove(announcementToDelete)
            });
        } catch (error) {
            console.error("Error deleting announcement:", error);
        }
    };

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Ανακοινώσεις Τμήματος</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    label="Προσθήκη νέας ανακοίνωσης..."
                    value={newAnnouncement}
                    onChange={(e) => setNewAnnouncement(e.target.value)}
                    multiline
                    rows={2}
                    disabled={isSaving}
                />
                <Button
                    variant="contained"
                    onClick={handleAddAnnouncement}
                    disabled={isSaving || !newAnnouncement.trim()}
                    startIcon={isSaving ? <CircularProgress size={20} /> : <AddCommentIcon />}
                >
                    Αποστολή
                </Button>
            </Box>
            <Divider />
            <List sx={{ maxHeight: '50vh', overflowY: 'auto', mt: 2 }}>
                {sortedAnnouncements.length > 0 ? (
                    sortedAnnouncements.map((ann) => (
                        <ListItem
                            key={ann.id}
                            divider
                            secondaryAction={
                                <Tooltip title="Διαγραφή">
                                    <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteAnnouncement(ann)}>
                                        <DeleteIcon />
                                    </IconButton>
                                </Tooltip>
                            }
                        >
                            <ListItemText
                                primary={ann.text}
                                secondary={`Δημοσιεύτηκε: ${dayjs(ann.createdAt.toDate()).format('DD/MM/YYYY HH:mm')}`}
                                primaryTypographyProps={{ style: { whiteSpace: 'pre-wrap' } }}
                            />
                        </ListItem>
                    ))
                ) : (
                    <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                        Δεν υπάρχουν ανακοινώσεις για αυτό το τμήμα.
                    </Typography>
                )}
            </List>
        </Paper>
    );
}

export default ClassroomAnnouncements;
