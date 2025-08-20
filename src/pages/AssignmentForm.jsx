// src/pages/AssignmentForm.jsx
import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
    FormControl, InputLabel, Select, MenuItem, Grid, FormControlLabel, Checkbox,
    Box, Typography, List, ListItem, ListItemText, IconButton, Chip, CircularProgress
} from '@mui/material';
import { UploadFile as UploadFileIcon, Link as LinkIcon, Delete as DeleteIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc } from 'firebase/firestore';

// --- ΔΙΟΡΘΩΣΗ: Αφαίρεση κενού από το key 'εκφώνηση' ---
const assignmentDocumentTypes = [
    { key: 'εκφώνηση', label: 'Εκφώνηση' },
    { key: 'βοηθητικό_υλικό', label: 'Βοηθητικό Υλικό' },
    { key: 'λύσεις', label: 'Λύσεις' },
];


function AssignmentForm({ open, onClose, onSave, initialData, classrooms, classroomId = null, db, appId, selectedYear, userId }) {
    const [formData, setFormData] = useState({
        title: '',
        type: 'test',
        dueDate: dayjs().format('YYYY-MM-DD'),
        classroomId: '',
        isAllDay: true,
        startTime: '09:00',
        endTime: '10:00',
        attachedFiles: []
    });
    const [isUploading, setIsUploading] = useState(false);
    const [documentType, setDocumentType] = useState('εκφώνηση');

    const isEditMode = Boolean(initialData && initialData.id);

    useEffect(() => {
        if (open) {
            if (isEditMode) {
                setFormData({
                    title: initialData.title || '',
                    type: initialData.type || 'test',
                    dueDate: dayjs(initialData.dueDate.toDate()).format('YYYY-MM-DD'),
                    classroomId: initialData.classroomId || '',
                    isAllDay: initialData.isAllDay !== false,
                    startTime: initialData.startTime || '09:00',
                    endTime: initialData.endTime || '10:00',
                    attachedFiles: initialData.attachedFiles || []
                });
            } else {
                setFormData({
                    title: '', type: 'test', dueDate: dayjs().format('YYYY-MM-DD'),
                    classroomId: classroomId || (classrooms && classrooms.length > 0 ? classrooms[0].id : ''),
                    isAllDay: true, startTime: '09:00', endTime: '10:00', attachedFiles: []
                });
            }
        }
    }, [initialData, open, isEditMode, classrooms, classroomId]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file || !selectedYear || !userId) return;
        setIsUploading(true);
        const storage = getStorage(db.app);
        const storagePath = `artifacts/${appId}/academicYears/${selectedYear}/assignment_attachments/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);

        try {
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            const newFile = { name: file.name, url: downloadURL, path: storagePath, uploadedAt: new Date() };
            setFormData(prev => ({ ...prev, attachedFiles: [...prev.attachedFiles, newFile] }));

            const selectedClassroom = classrooms.find(c => c.id === formData.classroomId);
            const fileMetadata = {
                fileName: file.name, fileURL: downloadURL, storagePath, fileType: file.type, size: file.size,
                uploadedAt: new Date(), uploaderId: userId, source: 'assignment', documentType: documentType,
                grade: selectedClassroom?.grade || 'N/A',
                subject: selectedClassroom?.subject || 'N/A',
                classroomId: formData.classroomId, visibility: 'classroom', visibleTo: [formData.classroomId]
            };
            await addDoc(collection(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/files`), fileMetadata);
        } catch (error) {
            console.error("Error uploading assignment file:", error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemoveFile = (fileToRemove) => {
        setFormData(prev => ({ ...prev, attachedFiles: prev.attachedFiles.filter(f => f.path !== fileToRemove.path) }));
        // Σημείωση: Δεν διαγράφουμε το αρχείο από το storage ή τη βιβλιοθήκη εδώ για απλότητα.
    };

    const handleSave = () => {
        if (!formData.title.trim() || !formData.classroomId) return;
        
        const dataToSave = {
            title: formData.title,
            type: formData.type,
            classroomId: formData.classroomId,
            dueDate: dayjs(formData.dueDate).startOf('day').toDate(),
            isAllDay: formData.isAllDay,
            attachedFiles: formData.attachedFiles,
        };

        if (!formData.isAllDay) {
            dataToSave.startTime = formData.startTime;
            dataToSave.endTime = formData.endTime;
        }

        onSave(dataToSave);
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{isEditMode ? 'Επεξεργασία Αξιολόγησης' : 'Νέα Αξιολόγηση'}</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ pt: 2 }}>
                    {!classroomId && (
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Τμήμα</InputLabel>
                                <Select name="classroomId" value={formData.classroomId} label="Τμήμα" onChange={handleChange}>
                                    {classrooms?.map(c => (
                                        <MenuItem key={c.id} value={c.id}>{c.classroomName} - {c.subject}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    )}
                    <Grid item xs={12}><TextField autoFocus name="title" label="Τίτλος" fullWidth variant="outlined" value={formData.title} onChange={handleChange} /></Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                            <InputLabel>Τύπος</InputLabel>
                            <Select name="type" value={formData.type} label="Τύπος" onChange={handleChange}>
                                <MenuItem value="test">Διαγώνισμα</MenuItem>
                                <MenuItem value="homework">Εργασία για το Σπίτι</MenuItem>
                                <MenuItem value="project">Project</MenuItem>
                                <MenuItem value="oral">Προφορική Εξέταση</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}><TextField name="dueDate" label="Ημερομηνία" type="date" fullWidth value={formData.dueDate} onChange={handleChange} InputLabelProps={{ shrink: true }} /></Grid>
                    <Grid item xs={12}><FormControlLabel control={<Checkbox checked={formData.isAllDay} onChange={handleChange} name="isAllDay" />} label="Ημερήσια (χωρίς συγκεκριμένη ώρα)"/></Grid>
                    {!formData.isAllDay && (
                        <>
                            <Grid item xs={12} sm={6}><TextField name="startTime" label="Ώρα Έναρξης" type="time" fullWidth value={formData.startTime} onChange={handleChange} InputLabelProps={{ shrink: true }} /></Grid>
                            <Grid item xs={12} sm={6}><TextField name="endTime" label="Ώρα Λήξης" type="time" fullWidth value={formData.endTime} onChange={handleChange} InputLabelProps={{ shrink: true }} /></Grid>
                        </>
                    )}
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom>Επισυναπτόμενα Αρχεία</Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                            {formData.attachedFiles.map(file => (
                                <Chip key={file.path} label={file.name} onDelete={() => handleRemoveFile(file)} />
                            ))}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <FormControl size="small" sx={{ minWidth: 180 }}>
                                <InputLabel>Τύπος Αρχείου</InputLabel>
                                <Select value={documentType} label="Τύπος Αρχείου" onChange={(e) => setDocumentType(e.target.value)}>
                                    {assignmentDocumentTypes.map(t => <MenuItem key={t.key} value={t.key}>{t.label}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <Button size="small" startIcon={isUploading ? <CircularProgress size={16} /> : <UploadFileIcon />} component="label" disabled={isUploading}>
                                Μεταφόρτωση
                                <input type="file" hidden onChange={handleFileUpload} />
                            </Button>
                        </Box>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Ακύρωση</Button>
                <Button onClick={handleSave} variant="contained">Αποθήκευση</Button>
            </DialogActions>
        </Dialog>
    );
}

export default AssignmentForm;
