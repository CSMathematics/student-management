// src/pages/ClassroomMaterials.jsx
import React, { useState, useMemo } from 'react';
import {
    Box, Typography, List, ListItem, ListItemText, Button, CircularProgress, Paper,
    Divider, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, ListItemIcon
} from '@mui/material';
import { UploadFile as UploadFileIcon, Delete as DeleteIcon, Download as DownloadIcon, InsertDriveFile as FileIcon } from '@mui/icons-material';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import dayjs from 'dayjs';

function ClassroomMaterials({ classroom, db, appId }) {
    const [isUploading, setIsUploading] = useState(false);
    const [fileToDelete, setFileToDelete] = useState(null);

    const sortedMaterials = useMemo(() => {
        if (!classroom?.materials) return [];
        return [...classroom.materials].sort((a, b) => b.uploadedAt.toDate() - a.uploadedAt.toDate());
    }, [classroom]);

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsUploading(true);
        const storage = getStorage(db.app);
        const storageRef = ref(storage, `artifacts/${appId}/classrooms/${classroom.id}/${Date.now()}_${file.name}`);

        try {
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            const materialData = {
                id: Date.now(),
                name: file.name,
                path: snapshot.ref.fullPath,
                url: downloadURL,
                uploadedAt: new Date(),
            };

            const classroomRef = doc(db, `artifacts/${appId}/public/data/classrooms`, classroom.id);
            await updateDoc(classroomRef, {
                materials: arrayUnion(materialData)
            });

        } catch (error) {
            console.error("Error uploading file:", error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteClick = (material) => {
        setFileToDelete(material);
    };

    const confirmDelete = async () => {
        if (!fileToDelete) return;

        const storage = getStorage(db.app);
        const fileRef = ref(storage, fileToDelete.path);

        try {
            // Delete file from Storage
            await deleteObject(fileRef);

            // Remove file metadata from Firestore
            const classroomRef = doc(db, `artifacts/${appId}/public/data/classrooms`, classroom.id);
            await updateDoc(classroomRef, {
                materials: arrayRemove(fileToDelete)
            });
        } catch (error) {
            console.error("Error deleting file:", error);
        } finally {
            setFileToDelete(null);
        }
    };

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Αρχεία & Υλικό Τμήματος</Typography>
                <Button
                    variant="contained"
                    component="label"
                    startIcon={isUploading ? <CircularProgress size={20} /> : <UploadFileIcon />}
                    disabled={isUploading}
                >
                    Μεταφόρτωση
                    <input type="file" hidden onChange={handleFileUpload} />
                </Button>
            </Box>
            <Divider />
            <List sx={{ maxHeight: '50vh', overflowY: 'auto', mt: 2 }}>
                {sortedMaterials.length > 0 ? (
                    sortedMaterials.map((material) => (
                        <ListItem
                            key={material.id}
                            divider
                            secondaryAction={
                                <>
                                    <Tooltip title="Λήψη Αρχείου">
                                        <IconButton edge="end" aria-label="download" href={material.url} target="_blank">
                                            <DownloadIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Διαγραφή">
                                        <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteClick(material)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </Tooltip>
                                </>
                            }
                        >
                            <ListItemIcon>
                                <FileIcon />
                            </ListItemIcon>
                            <ListItemText
                                primary={material.name}
                                secondary={`Μεταφορτώθηκε: ${dayjs(material.uploadedAt.toDate()).format('DD/MM/YYYY HH:mm')}`}
                            />
                        </ListItem>
                    ))
                ) : (
                    <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                        Δεν υπάρχει διαθέσιμο υλικό για αυτό το τμήμα.
                    </Typography>
                )}
            </List>

            <Dialog open={!!fileToDelete} onClose={() => setFileToDelete(null)}>
                <DialogTitle>Επιβεβαίωση Διαγραφής</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Είστε σίγουροι ότι θέλετε να διαγράψετε το αρχείο "{fileToDelete?.name}"; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFileToDelete(null)}>Ακύρωση</Button>
                    <Button onClick={confirmDelete} color="error">Διαγραφή</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}

export default ClassroomMaterials;
