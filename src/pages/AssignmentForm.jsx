// src/pages/AssignmentForm.jsx
import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
    FormControl, InputLabel, Select, MenuItem, Grid
} from '@mui/material';
import dayjs from 'dayjs';

function AssignmentForm({ open, onClose, onSave, initialData, classrooms }) {
    const [formData, setFormData] = useState({
        title: '',
        type: 'test',
        dueDate: dayjs().format('YYYY-MM-DD'),
        classroomId: ''
    });

    const isEditMode = Boolean(initialData && initialData.id);

    useEffect(() => {
        if (open) {
            if (isEditMode) {
                setFormData({
                    title: initialData.title || '',
                    type: initialData.type || 'test',
                    dueDate: dayjs(initialData.dueDate.toDate()).format('YYYY-MM-DD'),
                    classroomId: initialData.classroomId || ''
                });
            } else {
                // Reset form for new entry
                setFormData({
                    title: '',
                    type: 'test',
                    dueDate: dayjs().format('YYYY-MM-DD'),
                    classroomId: classrooms?.[0]?.id || '' // Pre-select first classroom if available
                });
            }
        }
    }, [initialData, open, isEditMode, classrooms]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = () => {
        if (!formData.title.trim() || !formData.classroomId) return;
        onSave({
            ...formData,
            dueDate: new Date(formData.dueDate),
        });
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{isEditMode ? 'Επεξεργασία Αξιολόγησης' : 'Νέα Αξιολόγηση'}</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ pt: 2 }}>
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
                    <Grid item xs={12}>
                        <TextField autoFocus name="title" label="Τίτλος" fullWidth variant="outlined" value={formData.title} onChange={handleChange} />
                    </Grid>
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
                    <Grid item xs={12} sm={6}>
                        <TextField name="dueDate" label="Ημερομηνία Παράδοσης/Εξέτασης" type="date" fullWidth value={formData.dueDate} onChange={handleChange} InputLabelProps={{ shrink: true }} />
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
