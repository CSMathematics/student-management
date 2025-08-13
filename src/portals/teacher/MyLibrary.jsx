// src/portals/teacher/MyLibrary.jsx
import React, { useState, useMemo } from 'react';
import {
    Container, Paper, Typography, Box, Button, List, ListItem, ListItemText,
    ListItemIcon, IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
    DialogContentText, DialogActions, CircularProgress, Divider
} from '@mui/material';
import {
    UploadFile as UploadFileIcon,
    Delete as DeleteIcon,
    Download as DownloadIcon,
    InsertDriveFile as FileIcon
} from '@mui/icons-material';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import dayjs from 'dayjs';

function MyLibrary({ teacherData, db, appId }) {
    const [isUploading, setIsUploading] = useState(false);
    const [fileToDelete, setFileToDelete] = useState(null);

    const sortedLibrary = useMemo(() => {
        if (!teacherData?.library) return [];
        return [...teacherData.library].sort((a, b) => b.uploadedAt.toDate() - a.uploadedAt.toDate());
    }, [teacherData]);

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsUploading(true);
        const storage = getStorage(db.app);
        // Αποθήκευση σε έναν προσωπικό φάκελο για τον καθηγητή
        const storageRef = ref(storage, `artifacts/${appId}/teacher_libraries/${teacherData.id}/${Date.now()}_${file.name}`);

        try {
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            const materialData = {
                name: file.name,
                path: snapshot.ref.fullPath,
                url: downloadURL,
                uploadedAt: new Date(),
            };

            const teacherRef = doc(db, `artifacts/${appId}/public/data/teachers`, teacherData.id);
            await updateDoc(teacherRef, {
                library: arrayUnion(materialData)
            });

        } catch (error) {
            console.error("Error uploading file to library:", error);
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
            await deleteObject(fileRef);
            const teacherRef = doc(db, `artifacts/${appId}/public/data/teachers`, teacherData.id);
            await updateDoc(teacherRef, {
                library: arrayRemove(fileToDelete)
            });
        } catch (error) {
            console.error("Error deleting file from library:", error);
        } finally {
            setFileToDelete(null);
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                        Η Βιβλιοθήκη μου
                    </Typography>
                    <Button
                        variant="contained"
                        component="label"
                        startIcon={isUploading ? <CircularProgress size={20} /> : <UploadFileIcon />}
                        disabled={isUploading}
                    >
                        Μεταφόρτωση Υλικού
                        <input type="file" hidden onChange={handleFileUpload} />
                    </Button>
                </Box>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    Ανεβάστε και διαχειριστείτε τα προσωπικά σας αρχεία. Αυτά τα αρχεία είναι ορατά μόνο σε εσάς και μπορείτε να τα επισυνάψετε σε μαθήματα.
                </Typography>
                <Divider />
                <List sx={{ mt: 2 }}>
                    {sortedLibrary.length > 0 ? (
                        sortedLibrary.map((material) => (
                            <ListItem
                                key={material.path}
                                divider
                                secondaryAction={
                                    <>
                                        <Tooltip title="Λήψη Αρχείου">
                                            <IconButton edge="end" href={material.url} target="_blank">
                                                <DownloadIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Διαγραφή">
                                            <IconButton edge="end" onClick={() => handleDeleteClick(material)}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </>
                                }
                            >
                                <ListItemIcon><FileIcon /></ListItemIcon>
                                <ListItemText
                                    primary={material.name}
                                    secondary={`Μεταφορτώθηκε: ${dayjs(material.uploadedAt.toDate()).format('DD/MM/YYYY HH:mm')}`}
                                />
                            </ListItem>
                        ))
                    ) : (
                        <Typography sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                            Η βιβλιοθήκη σας είναι άδεια.
                        </Typography>
                    )}
                </List>
            </Paper>

            <Dialog open={!!fileToDelete} onClose={() => setFileToDelete(null)}>
                <DialogTitle>Επιβεβαίωση Διαγραφής</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Είστε σίγουροι ότι θέλετε να διαγράψετε το αρχείο "{fileToDelete?.name}" από την προσωπική σας βιβλιοθήκη;
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFileToDelete(null)}>Ακύρωση</Button>
                    <Button onClick={confirmDelete} color="error">Διαγραφή</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default MyLibrary;
