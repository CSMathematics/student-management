// src/pages/AssignmentForm.jsx
import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
    FormControl, InputLabel, Select, MenuItem, Grid, FormControlLabel, Checkbox
} from '@mui/material';
import dayjs from 'dayjs';

function AssignmentForm({ open, onClose, onSave, initialData, classrooms, classroomId = null }) {
    const [formData, setFormData] = useState({
        title: '',
        type: 'test',
        dueDate: dayjs().format('YYYY-MM-DD'),
        classroomId: '',
        isAllDay: true,
        startTime: '09:00',
        endTime: '10:00'
    });

    const isEditMode = Boolean(initialData && initialData.id);

    useEffect(() => {
        if (open) {
            if (isEditMode) {
                setFormData({
                    title: initialData.title || '',
                    type: initialData.type || 'test',
                    dueDate: dayjs(initialData.dueDate.toDate()).format('YYYY-MM-DD'),
                    classroomId: initialData.classroomId || '',
                    isAllDay: initialData.isAllDay !== false, // Default to true if undefined
                    startTime: initialData.startTime || '09:00',
                    endTime: initialData.endTime || '10:00'
                });
            } else {
                // Reset form for new entry
                setFormData({
                    title: '',
                    type: 'test',
                    dueDate: dayjs().format('YYYY-MM-DD'),
                    classroomId: classroomId || (classrooms && classrooms.length > 0 ? classrooms[0].id : ''),
                    isAllDay: true,
                    startTime: '09:00',
                    endTime: '10:00'
                });
            }
        }
    }, [initialData, open, isEditMode, classrooms, classroomId]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    };

    const handleSave = () => {
        if (!formData.title.trim() || !formData.classroomId) return;
        
        const dataToSave = {
            title: formData.title,
            type: formData.type,
            classroomId: formData.classroomId,
            dueDate: dayjs(formData.dueDate).startOf('day').toDate(),
            isAllDay: formData.isAllDay,
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
                        <TextField name="dueDate" label="Ημερομηνία" type="date" fullWidth value={formData.dueDate} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                    </Grid>
                    <Grid item xs={12}>
                        <FormControlLabel
                            control={<Checkbox checked={formData.isAllDay} onChange={handleChange} name="isAllDay" />}
                            label="Ημερήσια (χωρίς συγκεκριμένη ώρα)"
                        />
                    </Grid>
                    {!formData.isAllDay && (
                        <>
                            <Grid item xs={12} sm={6}>
                                <TextField name="startTime" label="Ώρα Έναρξης" type="time" fullWidth value={formData.startTime} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField name="endTime" label="Ώρα Λήξης" type="time" fullWidth value={formData.endTime} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                            </Grid>
                        </>
                    )}
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
