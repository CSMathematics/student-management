// src/pages/ClassroomMaterials.jsx
import React, { useState, useMemo } from 'react';
import {
    Box, Typography, List, ListItem, ListItemText, Button, CircularProgress, Paper,
    Divider, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, ListItemIcon,
    FormControl, InputLabel, Select, MenuItem // --- ΝΕΑ ΠΡΟΣΘΗΚΗ ---
} from '@mui/material';
import { UploadFile as UploadFileIcon, Delete as DeleteIcon, Download as DownloadIcon, InsertDriveFile as FileIcon } from '@mui/icons-material';
// --- ΝΕΑ ΠΡΟΣΘΗΚΗ ---
import { doc, updateDoc, arrayUnion, arrayRemove, addDoc, collection } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import dayjs from 'dayjs';

// --- ΝΕΑ ΠΡΟΣΘΗΚΗ: Τύποι εγγράφων ---
const documentTypes = [
    { key: 'notes', label: 'Σημειώσεις' },
    { key: 'exercises', label: 'Ασκήσεις' },
];

// --- ΕΝΗΜΕΡΩΣΗ: Προσθήκη userId στα props ---
function ClassroomMaterials({ classroom, db, appId, selectedYear, userId }) {
    const [isUploading, setIsUploading] = useState(false);
    const [fileToDelete, setFileToDelete] = useState(null);
    const [documentType, setDocumentType] = useState('notes'); // --- ΝΕΑ ΠΡΟΣΘΗΚΗ ---

    const sortedMaterials = useMemo(() => {
        if (!classroom?.materials) return [];
        return [...classroom.materials].sort((a, b) => b.uploadedAt.toDate() - a.uploadedAt.toDate());
    }, [classroom]);

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file || !selectedYear || !userId) return;

        setIsUploading(true);
        const storage = getStorage(db.app);
        const storageRef = ref(storage, `artifacts/${appId}/academicYears/${selectedYear}/classrooms/${classroom.id}/${Date.now()}_${file.name}`);

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

            const classroomRef = doc(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/classrooms`, classroom.id);
            await updateDoc(classroomRef, {
                materials: arrayUnion(materialData)
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
                source: 'classroomMaterials',
                documentType: documentType,
                grade: classroom.grade,
                subject: classroom.subject,
                classroomId: classroom.id,
                visibility: 'classroom',
                visibleTo: [classroom.id]
            };
            const filesCollectionRef = collection(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/files`);
            await addDoc(filesCollectionRef, fileMetadata);
            // --- ΤΕΛΟΣ ΝΕΑΣ ΠΡΟΣΘΗΚΗΣ ---

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
        if (!fileToDelete || !selectedYear) return;

        const storage = getStorage(db.app);
        const fileRef = ref(storage, fileToDelete.path);

        try {
            await deleteObject(fileRef);
            const classroomRef = doc(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/classrooms`, classroom.id);
            await updateDoc(classroomRef, {
                materials: arrayRemove(fileToDelete)
            });
            // Σημείωση: Δεν διαγράφουμε την εγγραφή από την κεντρική βιβλιοθήκη εδώ,
            // θα μπορούσε να προστεθεί αυτή η λογική αν είναι επιθυμητό.
        } catch (error) {
            console.error("Error deleting file:", error);
        } finally {
            setFileToDelete(null);
        }
    };

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="h6">Αρχεία & Υλικό Τμήματος</Typography>
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
                        Μεταφόρτωση
                        <input type="file" hidden onChange={handleFileUpload} />
                    </Button>
                </Box>
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
