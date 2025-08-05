// src/pages/AssignmentForm.jsx
import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
    FormControl, InputLabel, Select, MenuItem, Grid
} from '@mui/material';
import dayjs from 'dayjs';

function AssignmentForm({ open, onClose, onSave, classroomId }) {
    const [title, setTitle] = useState('');
    const [type, setType] = useState('homework');
    const [dueDate, setDueDate] = useState(dayjs().format('YYYY-MM-DD'));

    const handleSave = () => {
        if (!title.trim()) return;
        onSave({
            title,
            type,
            dueDate: new Date(dueDate),
            classroomId,
            createdAt: new Date(),
        });
        onClose();
        // Reset form
        setTitle('');
        setType('homework');
        setDueDate(dayjs().format('YYYY-MM-DD'));
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Νέα Εργασία / Διαγώνισμα</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ pt: 2 }}>
                    <Grid item xs={12}>
                        <TextField
                            autoFocus
                            label="Τίτλος"
                            fullWidth
                            variant="outlined"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                            <InputLabel>Τύπος</InputLabel>
                            <Select value={type} label="Τύπος" onChange={(e) => setType(e.target.value)}>
                                <MenuItem value="homework">Εργασία για το Σπίτι</MenuItem>
                                <MenuItem value="test">Διαγώνισμα</MenuItem>
                                <MenuItem value="project">Project</MenuItem>
                                <MenuItem value="oral">Προφορική Εξέταση</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="Ημερομηνία Παράδοσης/Εξέτασης"
                            type="date"
                            fullWidth
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
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
