// src/components/NewClassroomForm.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Button, Container, Grid, Paper, Typography, TextField,
    FormControl, InputLabel, Select, MenuItem, IconButton
} from '@mui/material';
import { Add, Delete, CheckCircleOutline, Restore } from '@mui/icons-material';

// Import for Date Pickers
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { TimeClock } from '@mui/x-date-pickers/TimeClock';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
dayjs.extend(duration);

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, doc, updateDoc } from 'firebase/firestore'; // Import doc and updateDoc

import { SUBJECTS_BY_GRADE_AND_CLASS, getSubjects, getSpecializations } from '../data/subjects.js';


function NewClassroomForm({ navigateTo, classroomToEdit, setClassroomToEdit, initialSchedule, onSaveSuccess, db, userId, appId }) { // Added onSaveSuccess, db, userId, appId props
    const initialFormData = {
        classroomName: '',
        grade: '',
        specialization: '',
        subject: '',
        maxStudents: 5,
        schedule: [{ id: Date.now(), day: '', startTime: null, endTime: null, editingStage: 'start' }],
        enrolledStudents: [], // Initialize enrolledStudents as an empty array
    };
    const [formData, setFormData] = useState(classroomToEdit || initialFormData);

    const [availableSpecializations, setAvailableSpecializations] = useState([]);
    const [currentSubjects, setCurrentSubjects] = useState([]);
    const [selectedColor, setSelectedColor] = useState(classroomToEdit?.color || '#2196f3'); // Use existing color or default

    // Effect to update form data if classroomToEdit changes (for editing)
    useEffect(() => {
        if (classroomToEdit) {
            setFormData(classroomToEdit);
            setSelectedColor(classroomToEdit.color || '#2196f3');
        } else {
            // If no classroomToEdit, and there's an initialSchedule (from calendar drag)
            if (initialSchedule && initialSchedule.length > 0) {
                setFormData(prev => ({
                    ...prev,
                    schedule: initialSchedule.map(slot => ({
                        ...slot,
                        startTime: dayjs(`2000-01-01T${slot.startTime}`), // Convert to Dayjs object
                        endTime: dayjs(`2000-01-01T${slot.endTime}`),     // Convert to Dayjs object
                        editingStage: 'done' // Mark as done since it's from a selection
                    }))
                }));
            } else {
                setFormData(initialFormData);
            }
            setSelectedColor('#2196f3'); // Reset color for new form
        }
    }, [classroomToEdit, initialSchedule]);


    // Update available specializations when grade changes
    useEffect(() => {
        const specs = getSpecializations(formData.grade);
        setAvailableSpecializations(specs);

        // If current specialization is not in new specs, reset it
        if (specs.length > 0 && !specs.includes(formData.specialization)) {
            setFormData(prev => ({ ...prev, specialization: '' }));
        } else if (specs.length === 0 && formData.specialization !== '') {
            setFormData(prev => ({ ...prev, specialization: '' }));
        }
    }, [formData.grade]);

    // Update current subjects when grade or specialization changes
    useEffect(() => {
        const subjects = getSubjects(formData.grade, formData.specialization);
        setCurrentSubjects(subjects);
        // If the selected subject is no longer in the list, clear it
        if (formData.subject && !subjects.includes(formData.subject)) {
            setFormData(prev => ({ ...prev, subject: '' }));
        }
    }, [formData.grade, formData.specialization]);


    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleScheduleChange = (id, field, value) => {
        setFormData(prev => ({
            ...prev,
            schedule: prev.schedule.map(slot => {
                if (slot.id === id) {
                    const updatedSlot = { ...slot, [field]: value };
                    // Auto-advance editing stage if start time is set
                    if (field === 'startTime' && value) {
                        updatedSlot.editingStage = 'end';
                    }
                    // Auto-advance to done if end time is set
                    if (field === 'endTime' && value) {
                        updatedSlot.editingStage = 'done';
                    }
                    return updatedSlot;
                }
                return slot;
            })
        }));
    };

    const addScheduleSlot = () => {
        setFormData(prev => ({
            ...prev,
            schedule: [...prev.schedule, { id: Date.now(), day: '', startTime: null, endTime: null, editingStage: 'start' }]
        }));
    };

    const removeScheduleSlot = (id) => {
        setFormData(prev => ({
            ...prev,
            schedule: prev.schedule.filter(slot => slot.id !== id)
        }));
    };

    const calculateTotalDuration = useMemo(() => {
        let totalMinutes = 0;
        formData.schedule.forEach(slot => {
            if (slot.startTime && slot.endTime) {
                const start = dayjs(slot.startTime);
                const end = dayjs(slot.endTime);
                if (end.isAfter(start)) {
                    totalMinutes += end.diff(start, 'minute');
                }
            }
        });

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        let durationString = '';
        if (hours > 0) {
            durationString += `${hours} ${hours > 1 ? 'ώρες' : 'ώρα'}`;
        }
        if (minutes > 0) {
            if (hours > 0) durationString += ' και ';
            durationString += `${minutes} λεπτά`;
        }
        if (hours === 0 && minutes === 0) {
            durationString = '0 λεπτά';
        }
        return durationString;
    }, [formData.schedule]);


    const handleSubmit = async (e) => {
        e.preventDefault();

        // Ensure db and appId are available
        if (!db || !appId) {
            console.error("Firestore DB or appId not initialized. Cannot save classroom.");
            alert("Σφάλμα: Η βάση δεδομένων ή το αναγνωριστικό εφαρμογής δεν είναι διαθέσιμα. Παρακαλώ δοκιμάστε ξανά.");
            return;
        }

        // Validate schedule entries
        const isValidSchedule = formData.schedule.every(slot =>
            slot.day && slot.startTime && slot.endTime && dayjs(slot.endTime).isAfter(dayjs(slot.startTime))
        );

        if (!isValidSchedule) {
            alert("Παρακαλώ συμπληρώστε όλες τις πληροφορίες προγράμματος σωστά (ημέρα, ώρα έναρξης, ώρα λήξης) και βεβαιωθείτε ότι η ώρα λήξης είναι μετά την ώρα έναρξης.");
            return;
        }

        // Prepare data for Firestore
        const dataToSave = {
            ...formData,
            color: selectedColor,
            // Convert Dayjs objects back to string for saving
            schedule: formData.schedule.map(slot => ({
                ...slot,
                startTime: slot.startTime ? dayjs(slot.startTime).format('HH:mm') : null,
                endTime: slot.endTime ? dayjs(slot.endTime).format('HH:mm') : null,
                editingStage: undefined // Remove transient editing stage
            })),
            lastUpdated: new Date(), // Add a timestamp
        };

        if (!classroomToEdit) {
            // Add new classroom
            try {
                const classroomsCollectionRef = collection(db, `artifacts/${appId}/public/data/classrooms`);
                await addDoc(classroomsCollectionRef, dataToSave);
                alert('Τμήμα αποθηκεύτηκε επιτυχώς!');
                if (onSaveSuccess) onSaveSuccess(); // Call success callback
            } catch (error) {
                console.error("Error adding document: ", error);
                alert('Σφάλμα κατά την αποθήκευση του τμήματος.');
            }
        } else {
            // Update existing classroom
            try {
                const classroomDocRef = doc(db, `artifacts/${appId}/public/data/classrooms`, classroomToEdit.id);
                await updateDoc(classroomDocRef, dataToSave);
                alert('Τμήμα ενημερώθηκε επιτυχώς!');
                if (onSaveSuccess) onSaveSuccess(); // Call success callback
            } catch (error) {
                console.error("Error updating document: ", error);
                alert('Σφάλμα κατά την ενημέρωση του τμήματος.');
            }
        }
    };


    return (
        <Container maxWidth="md">
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
                <Paper elevation={3} sx={{ padding: '20px', borderRadius: '12px', mb: 4 }}>
                    <Typography variant="h5" component="h3" sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: 3, color: '#3f51b5' }}>
                        <i className="fas fa-chalkboard"></i> Στοιχεία Τμήματος
                    </Typography>
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Όνομα Τμήματος"
                                name="classroomName"
                                value={formData.classroomName}
                                onChange={handleInputChange}
                                required
                                variant="outlined"
                                size="small"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth variant="outlined" size="small">
                                <InputLabel id="grade-select-label">Τάξη</InputLabel>
                                <Select
                                    labelId="grade-select-label"
                                    id="gradeSelect"
                                    name="grade"
                                    value={formData.grade}
                                    onChange={handleInputChange}
                                    label="Τάξη"
                                    required
                                >
                                    <MenuItem value="">-- Επιλέξτε Τάξη --</MenuItem>
                                    <MenuItem value="Α' Γυμνασίου">Α' Γυμνασίου</MenuItem>
                                    <MenuItem value="Β' Γυμνασίου">Β' Γυμνασίου</MenuItem>
                                    <MenuItem value="Γ' Γυμνασίου">Γ' Γυμνασίου</MenuItem>
                                    <MenuItem value="Α' Λυκείου">Α' Λυκείου</MenuItem>
                                    <MenuItem value="Β' Λυκείου">Β' Λυκείου</MenuItem>
                                    <MenuItem value="Γ' Λυκείου">Γ' Λυκείου</MenuItem>
                                    <MenuItem value="Γ' ΕΠΑ.Λ.">Γ' ΕΠΑ.Λ.</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        {availableSpecializations.length > 0 && (
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth variant="outlined" size="small">
                                    <InputLabel id="specialization-select-label">Κατεύθυνση</InputLabel>
                                    <Select
                                        labelId="specialization-select-label"
                                        id="specializationSelect"
                                        name="specialization"
                                        value={formData.specialization}
                                        onChange={handleInputChange}
                                        label="Κατεύθυνση"
                                        required
                                    >
                                        <MenuItem value="">-- Επιλέξτε Κατεύθυνση --</MenuItem>
                                        {availableSpecializations.map(spec => (
                                            <MenuItem key={spec} value={spec}>{spec}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        )}
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth variant="outlined" size="small">
                                <InputLabel id="subject-select-label">Μάθημα</InputLabel>
                                <Select
                                    labelId="subject-select-label"
                                    id="subjectSelect"
                                    name="subject"
                                    value={formData.subject}
                                    onChange={handleInputChange}
                                    label="Μάθημα"
                                    required
                                >
                                    <MenuItem value="">-- Επιλέξτε Μάθημα --</MenuItem>
                                    {currentSubjects.map(subject => (
                                        <MenuItem key={subject} value={subject}>{subject}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Μέγιστος Αριθμός Μαθητών"
                                name="maxStudents"
                                type="number"
                                value={formData.maxStudents}
                                onChange={handleInputChange}
                                required
                                variant="outlined"
                                size="small"
                                inputProps={{ min: 1 }}
                            />
                        </Grid>
                    </Grid>
                </Paper>

                {/* Schedule Section */}
                <Paper elevation={3} sx={{ padding: '20px', borderRadius: '12px', mb: 4 }}>
                    <Typography variant="h5" component="h3" sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: 3, color: '#3f51b5' }}>
                        <i className="fas fa-calendar-alt"></i> Πρόγραμμα Τμήματος
                    </Typography>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        {formData.schedule.map((slot, index) => (
                            <Grid container spacing={2} key={slot.id} sx={{ mb: 2, alignItems: 'center', border: '1px solid #e0e0e0', borderRadius: '8px', p: 2 }}>
                                <Grid item xs={12} sm={4}>
                                    <FormControl fullWidth variant="outlined" size="small">
                                        <InputLabel id={`day-select-label-${slot.id}`}>Ημέρα</InputLabel>
                                        <Select
                                            labelId={`day-select-label-${slot.id}`}
                                            value={slot.day}
                                            onChange={(e) => handleScheduleChange(slot.id, 'day', e.target.value)}
                                            label="Ημέρα"
                                            required
                                        >
                                            <MenuItem value="">-- Επιλέξτε Ημέρα --</MenuItem>
                                            <MenuItem value="Δευτέρα">Δευτέρα</MenuItem>
                                            <MenuItem value="Τρίτη">Τρίτη</MenuItem>
                                            <MenuItem value="Τετάρτη">Τετάρτη</MenuItem>
                                            <MenuItem value="Πέμπτη">Πέμπτη</MenuItem>
                                            <MenuItem value="Παρασκευή">Παρασκευή</MenuItem>
                                            <MenuItem value="Σάββατο">Σάββατο</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <TimeClock
                                        label="Ώρα Έναρξης"
                                        value={slot.startTime}
                                        onChange={(newValue) => handleScheduleChange(slot.id, 'startTime', newValue)}
                                        ampm={false}
                                        sx={{
                                            border: '1px solid #ccc',
                                            borderRadius: '8px',
                                            padding: '8px',
                                            width: '100%',
                                            '.MuiTimeClock-root': { width: '100%' },
                                            '.MuiClock-root': { width: '100%', height: 'auto' },
                                            '.MuiClock-pmButton': { display: 'none' },
                                            '.MuiClock-amButton': { display: 'none' },
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <TimeClock
                                        label="Ώρα Λήξης"
                                        value={slot.endTime}
                                        onChange={(newValue) => handleScheduleChange(slot.id, 'endTime', newValue)}
                                        ampm={false}
                                        sx={{
                                            border: '1px solid #ccc',
                                            borderRadius: '8px',
                                            padding: '8px',
                                            width: '100%',
                                            '.MuiTimeClock-root': { width: '100%' },
                                            '.MuiClock-root': { width: '100%', height: 'auto' },
                                            '.MuiClock-pmButton': { display: 'none' },
                                            '.MuiClock-amButton': { display: 'none' },
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={2} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
                                    {formData.schedule.length > 1 && (
                                        <IconButton color="error" onClick={() => removeScheduleSlot(slot.id)}>
                                            <Delete />
                                        </IconButton>
                                    )}
                                    {index === formData.schedule.length - 1 && (
                                        <IconButton color="primary" onClick={addScheduleSlot}>
                                            <Add />
                                        </IconButton>
                                    )}
                                </Grid>
                            </Grid>
                        ))}
                    </LocalizationProvider>
                    {/* Total Duration Label */}
                    <Typography variant="h6" sx={{ mt: 3, textAlign: 'right', color: '#3f51b5' }}>
                        Συνολική Διάρκεια Μαθημάτων: {calculateTotalDuration}
                    </Typography>
                </Paper>

                {/* Color Picker for the classroom schedule */}
                <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                            Επιλογή Χρώματος Προγράμματος:
                        </Typography>
                        <input
                            type="color"
                            value={selectedColor}
                            onChange={(e) => setSelectedColor(e.target.value)}
                            style={{ width: '50px', height: '30px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                        />
                    </Box>
                </Grid>

                {/* Submit Button */}
                <Box sx={{ mt: 3, textAlign: 'right' }}>
                    <Button type="submit" variant="contained" color="primary" sx={{ borderRadius: '8px', padding: '10px 20px' }}>
                        <i className="fas fa-save" style={{ marginRight: '8px' }}></i> {classroomToEdit ? 'Ενημέρωση Τμήματος' : 'Αποθήκευση Τμήματος'}
                    </Button>
                </Box>
            </Box>
        </Container>
    );
}

export default NewClassroomForm;
