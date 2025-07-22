// src/components/NewClassroomForm.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Box, Button, Container, Grid, Paper, Typography, TextField,
    FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle,
    DialogContent, DialogActions, DialogContentText, IconButton
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
dayjs.extend(duration);
dayjs.extend(isSameOrBefore);

// Firebase Imports
import { doc, setDoc, addDoc, collection, updateDoc } from 'firebase/firestore';

import { SUBJECTS_BY_GRADE_AND_CLASS, getSubjects, getSpecializations } from '../data/subjects.js';

// Helper to generate time slots (30-minute intervals)
const generateTimeSlots = (startHour, endHour) => {
    const slots = [];
    for (let h = startHour; h < endHour; h++) {
        slots.push(`${String(h).padStart(2, '0')}:00`);
        slots.push(`${String(h).padStart(2, '0')}:30`);
    }
    slots.push(`${String(endHour).padStart(2, '0')}:00`); // Ensure the end hour is included
    return slots;
};

// Define the days of the week (excluding Sunday)
const DAYS_OF_WEEK = ['Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];
const TIME_SLOTS = generateTimeSlots(8, 20); // Assuming calendar hours 8-20 for consistency

function NewClassroomForm({ navigateTo, classroomToEdit, setClassroomToEdit, initialSchedule, onSaveSuccess, onCancel, db, userId, appId, allClassrooms }) {
    const initialFormData = {
        classroomName: '',
        grade: '',
        specialization: '',
        subject: '',
        maxStudents: 5,
        schedule: [],
        enrolledStudents: [],
    };

    const [formData, setFormData] = useState(initialFormData);
    const [availableSpecializations, setAvailableSpecializations] = useState([]);
    const [currentSubjects, setCurrentSubjects] = useState([]);
    const [selectedColor, setSelectedColor] = useState('#2196f3');

    const [selectedDay, setSelectedDay] = useState('');
    const [selectedStartTime, setSelectedStartTime] = useState('');
    const [selectedEndTime, setSelectedEndTime] = useState('');

    const [openAlertDialog, setOpenAlertDialog] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');

    const calculateDuration = useCallback((startTimeStr, endTimeStr) => {
        if (!startTimeStr || !endTimeStr) return '';
        const start = dayjs(`2000-01-01T${startTimeStr}`);
        const end = dayjs(`2000-01-01T${endTimeStr}`);
        if (end.isBefore(start) || end.isSame(start)) return "Invalid Time";
        const diffMinutes = end.diff(start, 'minute');
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;
        let durationString = '';
        if (hours > 0) durationString += `${hours} ${hours > 1 ? 'ώρες' : 'ώρα'}`;
        if (minutes > 0) {
            if (hours > 0) durationString += ' και ';
            durationString += `${minutes} λεπτά`;
        }
        return durationString || '0 λεπτά';
    }, []);

    const checkOverlap = useCallback((targetClassroomId, targetDay, targetStartTimeStr, targetEndTimeStr, existingClassrooms, currentFormSchedule = [], ignoreFormScheduleIds = []) => {
        const targetStart = dayjs(`2000-01-01T${targetStartTimeStr}`);
        const targetEnd = dayjs(`2000-01-01T${targetEndTimeStr}`);

        if (!targetStart.isValid() || !targetEnd.isValid() || targetEnd.isSameOrBefore(targetStart)) {
            return true;
        }

        for (const classroom of existingClassrooms) {
            // When editing, skip checking the classroom against its own saved schedule
            if (classroomToEdit && classroom.id === classroomToEdit.id) {
                continue;
            }
            if (classroom.schedule && Array.isArray(classroom.schedule)) {
                for (const slot of classroom.schedule) {
                    if (slot.day === targetDay) {
                        const existingStart = dayjs(`2000-01-01T${slot.startTime}`);
                        const existingEnd = dayjs(`2000-01-01T${slot.endTime}`);
                        if (targetStart.isBefore(existingEnd) && targetEnd.isAfter(existingStart)) {
                            return true;
                        }
                    }
                }
            }
        }

        // Check against other entries already added to the current form's schedule
        for (const slot of currentFormSchedule) {
            if (ignoreFormScheduleIds.includes(slot.id)) {
                continue;
            }
            if (slot.day === targetDay) {
                const existingStart = dayjs(`2000-01-01T${slot.startTime}`);
                const existingEnd = dayjs(`2000-01-01T${slot.endTime}`);
                if (targetStart.isBefore(existingEnd) && targetEnd.isAfter(existingStart)) {
                    return true;
                }
            }
        }
        return false;
    }, [classroomToEdit]);

    const getAvailableTimeSlotsForDay = useCallback((day, existingClassrooms, currentFormSchedule) => {
        if (!day) return [];
        const available = [];
        const idsToIgnoreForInternalCheck = currentFormSchedule.map(s => s.id);
        TIME_SLOTS.forEach((startTimeStr, index) => {
            const endTimeStr = TIME_SLOTS[index + 1];
            if (!endTimeStr) return;
            const isOverlapping = checkOverlap(classroomToEdit?.id, day, startTimeStr, endTimeStr, existingClassrooms, currentFormSchedule, idsToIgnoreForInternalCheck);
            if (!isOverlapping) {
                available.push({ startTime: startTimeStr, endTime: endTimeStr, label: `${startTimeStr} - ${endTimeStr}` });
            }
        });
        return available;
    }, [checkOverlap, classroomToEdit]);

    // <-- ΑΛΛΑΓΗ: Ενημερωμένη λογική για να χειρίζεται όλες τις περιπτώσεις
    useEffect(() => {
        const baseData = classroomToEdit ? { ...classroomToEdit } : { ...initialFormData };
        let finalSchedule = classroomToEdit ? [...(classroomToEdit.schedule || [])] : [];

        if (initialSchedule && initialSchedule.length > 0) {
            const newSlots = initialSchedule.map(slot => ({
                ...slot,
                id: slot.id || dayjs().valueOf() + Math.random(),
                duration: calculateDuration(slot.startTime, slot.endTime)
            }));
            finalSchedule.push(...newSlots);
        }

        const uniqueSchedule = Array.from(new Map(finalSchedule.map(item => 
            [JSON.stringify({ day: item.day, startTime: item.startTime, endTime: item.endTime }), item]
        )).values());

        setFormData({
            ...baseData,
            schedule: uniqueSchedule,
        });

        setSelectedColor(classroomToEdit?.color || '#2196f3');

        // Pre-fill the dropdowns for adding a new entry
        if (initialSchedule && initialSchedule.length > 0) {
             const lastNewSlot = initialSchedule[initialSchedule.length - 1];
             setSelectedDay(lastNewSlot.day);
             setSelectedStartTime(lastNewSlot.startTime);
             setSelectedEndTime(lastNewSlot.endTime);
        } else if (uniqueSchedule.length > 0) {
            const lastSlot = uniqueSchedule[uniqueSchedule.length - 1];
            setSelectedDay(lastSlot.day);
            setSelectedStartTime(lastSlot.startTime);
            setSelectedEndTime(lastSlot.endTime);
        } else {
            setSelectedDay('');
            setSelectedStartTime('');
            setSelectedEndTime('');
        }

    }, [classroomToEdit, initialSchedule, allClassrooms, calculateDuration]);


    useEffect(() => {
        const specs = getSpecializations(formData.grade);
        setAvailableSpecializations(specs);
        if (specs.length > 0 && !specs.includes(formData.specialization)) {
            setFormData(prev => ({ ...prev, specialization: '' }));
        } else if (specs.length === 0 && formData.specialization !== '') {
            setFormData(prev => ({ ...prev, specialization: '' }));
        }
    }, [formData.grade]);

    useEffect(() => {
        const subjects = getSubjects(formData.grade, formData.specialization);
        setCurrentSubjects(subjects);
        if (formData.subject && !subjects.includes(formData.subject)) {
            setFormData(prev => ({ ...prev, subject: '' }));
        }
    }, [formData.grade, formData.specialization]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDayChange = (e) => {
        const day = e.target.value;
        setSelectedDay(day);
        setSelectedStartTime('');
        setSelectedEndTime('');
    };

    const handleStartTimeChange = (e) => {
        const startTime = e.target.value;
        setSelectedStartTime(startTime);
        if (selectedEndTime && dayjs(`2000-01-01T${selectedEndTime}`).isSameOrBefore(dayjs(`2000-01-01T${startTime}`))) {
            setSelectedEndTime('');
        }
    };

    const handleEndTimeChange = (e) => {
        setSelectedEndTime(e.target.value);
    };

    const handleAddScheduleEntry = () => {
        if (!selectedDay || !selectedStartTime || !selectedEndTime) {
            setAlertMessage("Παρακαλώ επιλέξτε ημέρα, ώρα έναρξης και ώρα λήξης για προσθήκη.");
            setOpenAlertDialog(true);
            return;
        }

        const newEntry = {
            id: dayjs().valueOf() + Math.random(),
            day: selectedDay,
            startTime: selectedStartTime,
            endTime: selectedEndTime,
            duration: calculateDuration(selectedStartTime, selectedEndTime),
        };

        const isOverlapping = checkOverlap(classroomToEdit?.id, newEntry.day, newEntry.startTime, newEntry.endTime, allClassrooms, formData.schedule, []);
        if (isOverlapping) {
            setAlertMessage(`Η επιλεγμένη ώρα ${newEntry.startTime}-${newEntry.endTime} για την ${newEntry.day} επικαλύπτεται με υπάρχον μάθημα.`);
            setOpenAlertDialog(true);
            return;
        }

        setFormData(prev => ({
            ...prev,
            schedule: [...prev.schedule, newEntry]
        }));
        setSelectedDay('');
        setSelectedStartTime('');
        setSelectedEndTime('');
    };

    const handleRemoveScheduleEntry = (idToRemove) => {
        setFormData(prev => ({
            ...prev,
            schedule: prev.schedule.filter(entry => entry.id !== idToRemove)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!db || !appId) {
            setAlertMessage("Σφάλμα: Η βάση δεδομένων ή το αναγνωριστικό εφαρμογής δεν είναι διαθέσιμα. Παρακαλώ δοκιμάστε ξανά.");
            setOpenAlertDialog(true);
            return;
        }

        if (!formData.grade || !formData.subject || !formData.maxStudents || formData.maxStudents < 1) {
            setAlertMessage("Παρακαλώ συμπληρώστε όλα τα απαιτούμενα πεδία (Τάξη, Μάθημα, Μέγιστος Αριθμός Μαθητών).");
            setOpenAlertDialog(true);
            return;
        }

        if (formData.schedule.length === 0) {
            setAlertMessage("Παρακαλώ προσθέστε τουλάχιστον μία ώρα στο πρόγραμμα.");
            setOpenAlertDialog(true);
            return;
        }

        for (const slot of formData.schedule) {
            const otherSlotsInForm = formData.schedule.filter(s => s.id !== slot.id);
            const isOverlapping = checkOverlap(classroomToEdit?.id, slot.day, slot.startTime, slot.endTime, allClassrooms, otherSlotsInForm, []);
            if (isOverlapping) {
                setAlertMessage(`Το πρόγραμμα για την ${slot.day} από ${slot.startTime} έως ${slot.endTime} επικαλύπτεται με ένα υπάρχον μάθημα.`);
                setOpenAlertDialog(true);
                return;
            }
        }

        const dataToSave = {
            ...formData,
            color: selectedColor,
            schedule: formData.schedule.map(slot => ({
                id: slot.id,
                day: slot.day,
                startTime: slot.startTime,
                endTime: slot.endTime,
                duration: slot.duration,
            })),
            lastUpdated: new Date(),
        };
        
        const totalMinutes = formData.schedule.reduce((acc, curr) => {
            const start = dayjs(`2000-01-01T${curr.startTime}`);
            const end = dayjs(`2000-01-01T${curr.endTime}`);
            return acc + end.diff(start, 'minute');
        }, 0);
        dataToSave.totalDuration = calculateDuration('00:00', dayjs('2000-01-01T00:00').add(totalMinutes, 'minute').format('HH:mm'));

        try {
            if (!classroomToEdit) {
                const classroomsCollectionRef = collection(db, `artifacts/${appId}/public/data/classrooms`);
                await addDoc(classroomsCollectionRef, dataToSave);
                setAlertMessage('Τμήμα αποθηκεύτηκε επιτυχώς!');
            } else {
                const classroomDocRef = doc(db, `artifacts/${appId}/public/data/classrooms`, classroomToEdit.id);
                await updateDoc(classroomDocRef, dataToSave);
                setAlertMessage('Τμήμα ενημερώθηκε επιτυχώς!');
            }
            setOpenAlertDialog(true);
            if (onSaveSuccess) onSaveSuccess();
        } catch (error) {
            console.error("Error saving document: ", error);
            setAlertMessage('Σφάλμα κατά την αποθήκευση του τμήματος.');
            setOpenAlertDialog(true);
        }
    };

    const availableStartTimes = useMemo(() => {
        if (!selectedDay) return [];
        const slots = getAvailableTimeSlotsForDay(selectedDay, allClassrooms, formData.schedule);
        const uniqueStartTimes = new Set(slots.map(s => s.startTime));
        if (selectedStartTime) {
            const isSelectedStartTimeInCurrentSchedule = formData.schedule.some(s => s.day === selectedDay && s.startTime === selectedStartTime);
            if (isSelectedStartTimeInCurrentSchedule) {
                uniqueStartTimes.add(selectedStartTime);
            }
        }
        return Array.from(uniqueStartTimes).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }, [selectedDay, allClassrooms, formData.schedule, getAvailableTimeSlotsForDay, selectedStartTime]);

    const availableEndTimes = useMemo(() => {
        if (!selectedDay || !selectedStartTime) return [];
        const startIndex = TIME_SLOTS.indexOf(selectedStartTime);
        if (startIndex === -1) return [];
        const possibleEndTimes = [];
        const idsToIgnoreForInternalCheck = formData.schedule.map(s => s.id);
        for (let i = startIndex + 1; i < TIME_SLOTS.length; i++) {
            const potentialEndTime = TIME_SLOTS[i];
            const isOverlapping = checkOverlap(classroomToEdit?.id, selectedDay, selectedStartTime, potentialEndTime, allClassrooms, formData.schedule, idsToIgnoreForInternalCheck);
            if (!isOverlapping && dayjs(`2000-01-01T${potentialEndTime}`).isAfter(dayjs(`2000-01-01T${selectedStartTime}`))) {
                possibleEndTimes.push(potentialEndTime);
            } else if (isOverlapping) {
                break;
            }
        }
        if (selectedEndTime) {
            const isSelectedEndTimeInCurrentSchedule = formData.schedule.some(s => s.day === selectedDay && s.startTime === selectedStartTime && s.endTime === selectedEndTime);
            if (isSelectedEndTimeInCurrentSchedule && !possibleEndTimes.includes(selectedEndTime)) {
                possibleEndTimes.push(selectedEndTime);
            }
        }
        return possibleEndTimes.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }, [selectedDay, selectedStartTime, allClassrooms, formData.schedule, checkOverlap, classroomToEdit, selectedEndTime]);

    const formTitle = classroomToEdit ? 'Επεξεργασία Τμήματος' : 'Δημιουργία Νέου Τμήματος';

    return (
        <Container maxWidth="md">
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
                <Paper elevation={3} sx={{ padding: '20px', borderRadius: '12px', mb: 4 }}>
                    <Grid item xs={6} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="h5" component="h3" sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: 3, color: '#3f51b5' }}>
                            <i className="fas fa-chalkboard"></i> {formTitle}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                            <Typography variant="body1">
                                Επιλέξτε χρώμα:
                            </Typography>
                            <input
                                type="color"
                                value={selectedColor}
                                onChange={(e) => setSelectedColor(e.target.value)}
                                style={{ width: '50px', height: '30px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                            />
                        </Box>
                    </Grid>
                    <Grid container spacing={3}>
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
                                    {Object.keys(SUBJECTS_BY_GRADE_AND_CLASS).map(gradeOption => (
                                        <MenuItem key={gradeOption} value={gradeOption}>{gradeOption}</MenuItem>
                                    ))}
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

                <Paper elevation={3} sx={{ padding: '20px', borderRadius: '12px', mb: 4 }}>
                    <Typography variant="h5" component="h3" sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: 3, color: '#3f51b5' }}>
                        <i className="fas fa-calendar-alt"></i> Επιλογή Προγράμματος
                    </Typography>
                    <Grid container spacing={3} alignItems="flex-end">
                        <Grid item xs={12} sm={4}>
                            <FormControl fullWidth variant="outlined" size="small" required>
                                <InputLabel id="day-select-label">Ημέρα</InputLabel>
                                <Select
                                    labelId="day-select-label"
                                    id="daySelect"
                                    value={selectedDay}
                                    onChange={handleDayChange}
                                    label="Ημέρα"
                                >
                                    <MenuItem value="">-- Επιλέξτε Ημέρα --</MenuItem>
                                    {DAYS_OF_WEEK.map(day => (
                                        <MenuItem key={day} value={day}>{day}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <FormControl fullWidth variant="outlined" size="small" required disabled={!selectedDay}>
                                <InputLabel id="start-time-select-label">Ώρα Έναρξης</InputLabel>
                                <Select
                                    labelId="start-time-select-label"
                                    id="startTimeSelect"
                                    value={selectedStartTime}
                                    onChange={handleStartTimeChange}
                                    label="Ώρα Έναρξης"
                                >
                                    <MenuItem value="">-- Επιλέξτε Ώρα --</MenuItem>
                                    {availableStartTimes.map(time => (
                                        <MenuItem key={time} value={time}>{time}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <FormControl fullWidth variant="outlined" size="small" required disabled={!selectedStartTime}>
                                <InputLabel id="end-time-select-label">Ώρα Λήξης</InputLabel>
                                <Select
                                    labelId="end-time-select-label"
                                    id="endTimeSelect"
                                    value={selectedEndTime}
                                    onChange={handleEndTimeChange}
                                    label="Ώρα Λήξης"
                                >
                                    <MenuItem value="">-- Επιλέξτε Ώρα --</MenuItem>
                                    {availableEndTimes.map(time => (
                                        <MenuItem key={time} value={time}>{time}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={2}>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleAddScheduleEntry}
                                disabled={!selectedDay || !selectedStartTime || !selectedEndTime}
                                sx={{ borderRadius: '8px', padding: '13px 10px', boxShadow: 'none' }}
                            >
                                <Add />
                            </Button>
                        </Grid>
                    </Grid>

                    {formData.schedule.length > 0 && (
                        <Box sx={{ mt: 3 }}>
                            <Typography variant="h6" sx={{ mb: 1, color: '#3f51b5' }}>
                                Επιλεγμένο Πρόγραμμα:
                            </Typography>
                            {formData.schedule.map((slot, index) => (
                                <Box key={slot.id} sx={{ display: 'flex', alignItems: 'center', mb: 1, p: 1, border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                                    <Typography variant="body2" sx={{ flexGrow: 1 }}>
                                        <strong>{slot.day}</strong>: {slot.startTime} - {slot.endTime} ({calculateDuration(slot.startTime, slot.endTime)})
                                    </Typography>
                                    <IconButton
                                        color="error"
                                        size="small"
                                        onClick={() => handleRemoveScheduleEntry(slot.id)}
                                        aria-label="delete schedule entry"
                                    >
                                        <Delete />
                                    </IconButton>
                                </Box>
                            ))}
                        </Box>
                    )}
                </Paper>

                <Box sx={{ mt: 3, textAlign: 'right' }}>
                    <Button
                        variant="outlined"
                        color="secondary"
                        sx={{ borderRadius: '8px', padding: '10px 20px', mr: 2 }}
                        onClick={onCancel}
                    >
                        <i className="fas fa-times" style={{ marginRight: '8px' }}></i> Ακύρωση
                    </Button>
                    <Button type="submit" variant="contained" color="primary" sx={{ borderRadius: '8px', padding: '10px 20px' }}>
                        <i className="fas fa-save" style={{ marginRight: '8px' }}></i> {classroomToEdit ? 'Ενημέρωση Τμήματος' : 'Αποθήκευση Τμήματος'}
                    </Button>
                </Box>
            </Box>

            <Dialog
                open={openAlertDialog}
                onClose={() => setOpenAlertDialog(false)}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">{"Ειδοποίηση"}</DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        {alertMessage}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAlertDialog(false)} color="primary" autoFocus>
                        Εντάξει
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default NewClassroomForm;
