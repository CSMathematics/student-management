// src/portals/teacher/MyLibrary.jsx
import React, { useState, useMemo } from 'react';
import {
    Container, Paper, Typography, Box, Button, List, ListItem, ListItemText,
    ListItemIcon, IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
    DialogContentText, DialogActions, CircularProgress, Divider,
    FormControl, InputLabel, Select, MenuItem // --- ΝΕΑ ΠΡΟΣΘΗΚΗ ---
} from '@mui/material';
import {
    UploadFile as UploadFileIcon,
    Delete as DeleteIcon,
    Download as DownloadIcon,
    InsertDriveFile as FileIcon
} from '@mui/icons-material';
// --- ΝΕΑ ΠΡΟΣΘΗΚΗ ---
import { doc, updateDoc, arrayUnion, arrayRemove, addDoc, collection } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import dayjs from 'dayjs';

// --- ΝΕΑ ΠΡΟΣΘΗΚΗ: Τύποι εγγράφων ---
const documentTypes = [
    { key: 'notes', label: 'Σημειώσεις' },
    { key: 'exercises', label: 'Ασκήσεις' },
    { key: 'other', label: 'Άλλο' },
];

// --- ΕΝΗΜΕΡΩΣΗ: Προσθήκη userId στα props ---
function MyLibrary({ teacherData, db, appId, selectedYear, userId }) {
    const [isUploading, setIsUploading] = useState(false);
    const [fileToDelete, setFileToDelete] = useState(null);
    const [documentType, setDocumentType] = useState('notes'); // --- ΝΕΑ ΠΡΟΣΘΗΚΗ ---

    const sortedLibrary = useMemo(() => {
        if (!teacherData?.library) return [];
        return [...teacherData.library].sort((a, b) => b.uploadedAt.toDate() - a.uploadedAt.toDate());
    }, [teacherData]);

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file || !selectedYear || !userId) return;

        setIsUploading(true);
        const storage = getStorage(db.app);
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

            const teacherRef = doc(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/teachers`, teacherData.id);
            await updateDoc(teacherRef, {
                library: arrayUnion(materialData)
            });

            // --- ΝΕΑ ΠΡΟΣΘΗΚΗ: Δημιουργία εγγραφής στη βιβλιοθήκη ---
            const fileMetadata = {
                fileName: file.name,
                fileURL: downloadURL,
                storagePath: storageRef.fullPath,
                fileType: file.type,
                size: file.size,
                uploadedAt: new Date(),
                uploaderId: userId,
                source: 'teacherLibrary',
                documentType: documentType,
                grade: 'all', // Προσωπικό αρχείο, δεν ανήκει σε τάξη
                subject: 'all', // ούτε σε μάθημα
                visibility: 'teacherPrivate',
                visibleTo: [teacherData.id]
            };
            const filesCollectionRef = collection(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/files`);
            await addDoc(filesCollectionRef, fileMetadata);
            // --- ΤΕΛΟΣ ΝΕΑΣ ΠΡΟΣΘΗΚΗΣ ---

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
        if (!fileToDelete || !selectedYear) return;

        const storage = getStorage(db.app);
        const fileRef = ref(storage, fileToDelete.path);

        try {
            await deleteObject(fileRef);
            const teacherRef = doc(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/teachers`, teacherData.id);
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                    <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                        Η Βιβλιοθήκη μου
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        {/* --- ΝΕΑ ΠΡΟΣΘΗΚΗ: Επιλογή τύπου εγγράφου --- */}
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Τύπος</InputLabel>
                            <Select
                                value={documentType}
                                label="Τύπος"
                                onChange={(e) => setDocumentType(e.target.value)}
                            >
                                {documentTypes.map(t => <MenuItem key={t.key} value={t.key}>{t.label}</MenuItem>)}
                            </Select>
                        </FormControl>
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
