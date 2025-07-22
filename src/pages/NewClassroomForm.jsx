// src/components/NewClassroomForm.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Box, Button, Container, Grid, Paper, Typography, TextField,
    FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle,
    DialogContent, DialogActions, DialogContentText, Checkbox, ListItemText, IconButton
} from '@mui/material';
import { Add, Delete, Edit, CheckCircleOutline } from '@mui/icons-material'; // Import icons for add/delete schedule
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
dayjs.extend(duration);
dayjs.extend(isSameOrBefore);

// Firebase Imports
import { doc, setDoc, addDoc, collection, updateDoc } from 'firebase/firestore';

import { SUBJECTS_BY_GRADE_AND_CLASS, getSubjects, getSpecializations } from '../data/subjects.js';
import ClassroomDetailsForm from './ClassroomDetailsForm.jsx'; // Import the new component

// Helper to generate time slots (duplicate from calendar, consider centralizing if used widely)
const generateTimeSlots = (startHour, endHour) => {
    const slots = [];
    for (let h = startHour; h < endHour; h++) {
        slots.push(`${String(h).padStart(2, '0')}:00`);
        slots.push(`${String(h).padStart(2, '0')}:30`);
    }
    slots.push(`${String(endHour).padStart(2, '0')}:00`);
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
        schedule: [], // This will now hold multiple {day, startTime, endTime} objects
        enrolledStudents: [],
    };

    const [formData, setFormData] = useState(initialFormData);
    const [availableSpecializations, setAvailableSpecializations] = useState([]);
    const [currentSubjects, setCurrentSubjects] = useState([]);
    const [selectedColor, setSelectedColor] = useState('#2196f3');

    const [selectedDay, setSelectedDay] = useState('');
    const [selectedTimeSlots, setSelectedTimeSlots] = useState([]); // Array for multiple selected time slots for a single "add" operation
    const [availableTimeSlots, setAvailableTimeSlots] = useState([]);

    // State for custom alert dialog
    const [openAlertDialog, setOpenAlertDialog] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');

    // Helper to calculate duration string
    const calculateDuration = useCallback((startTimeStr, endTimeStr) => {
        if (!startTimeStr || !endTimeStr) return '';
        const start = dayjs(`2000-01-01T${startTimeStr}`);
        const end = dayjs(`2000-01-01T${endTimeStr}`);

        if (!start.isValid()) {
            console.error("NewClassroomForm - Invalid start time string in calculateDuration:", startTimeStr);
        }
        if (!end.isValid()) {
            console.error("NewClassroomForm - Invalid end time string in calculateDuration:", endTimeStr);
        }

        if (end.isBefore(start) || end.isSame(start)) {
            console.error("NewClassroomForm - End time is before or same as start time in calculateDuration:", startTimeStr, endTimeStr);
            return "Invalid Time";
        }

        const diffMinutes = end.diff(start, 'minute');
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;

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
    }, []);


    // Helper function to check for overlaps
    const checkOverlap = useCallback((targetClassroomId, targetDay, targetStartTimeStr, targetEndTimeStr, existingClassrooms, currentFormSchedule = []) => {
        console.log("checkOverlap called with:", { targetClassroomId, targetDay, targetStartTimeStr, targetEndTimeStr, existingClassrooms, currentFormSchedule });
        const targetStart = dayjs(`2000-01-01T${targetStartTimeStr}`);
        const targetEnd = dayjs(`2000-01-01T${targetEndTimeStr}`);

        if (!targetStart.isValid() || !targetEnd.isValid() || targetEnd.isSameOrBefore(targetStart)) {
            console.log("Invalid target time range, returning true for overlap.");
            return true; // Invalid time range, treat as overlap to prevent saving
        }

        // Check against existing classrooms from Firestore
        for (const classroom of existingClassrooms) {
            // If editing, skip the classroom being updated for overlap check
            if (classroomToEdit && classroom.id === classroomToEdit.id) {
                console.log(`Skipping overlap check for classroom being edited: ${classroom.id}`);
                continue;
            }

            if (classroom.schedule && Array.isArray(classroom.schedule)) {
                for (const slot of classroom.schedule) {
                    if (slot.day === targetDay) {
                        const existingStart = dayjs(`2000-01-01T${slot.startTime}`);
                        const existingEnd = dayjs(`2000-01-01T${slot.endTime}`);

                        // Check for overlap: (StartA < EndB) && (EndA > StartB)
                        if (targetStart.isBefore(existingEnd) && targetEnd.isAfter(existingStart)) {
                            console.log(`Overlap detected with existing classroom ${classroom.id} slot:`, slot);
                            return true; // Overlap detected
                        }
                    }
                }
            }
        }

        // Check against other entries already added to the current form's schedule
        for (const slot of currentFormSchedule) {
            // Ensure we don't compare a slot with itself if it's already in the schedule
            // This is important when iterating through selectedTimeSlots to add them,
            // or when doing a final check on formData.schedule before submission.
            if (slot.day === targetDay && slot.startTime === targetStartTimeStr && slot.endTime === targetEndTimeStr) {
                continue; // Skip if it's the exact same slot already in the current form's schedule
            }

            if (slot.day === targetDay) {
                const existingStart = dayjs(`2000-01-01T${slot.startTime}`);
                const existingEnd = dayjs(`2000-01-01T${slot.endTime}`);

                if (targetStart.isBefore(existingEnd) && targetEnd.isAfter(existingStart)) {
                    console.log(`Overlap detected with another slot in current form's schedule:`, slot);
                    return true; // Overlap detected
                }
            }
        }

        console.log("No overlap detected.");
        return false; // No overlap
    }, [classroomToEdit]);

    // Generate all possible 1-hour time slots (e.g., 08:00-09:00, 09:00-10:00)
    const generateAllOneHourSlots = () => {
        const slots = [];
        for (let h = 8; h < 20; h++) { // From 08:00 to 19:00 (for 1-hour slots ending by 20:00)
            const start = dayjs().hour(h).minute(0).format('HH:mm');
            const end = dayjs().hour(h + 1).minute(0).format('HH:mm');
            slots.push({ startTime: start, endTime: end, label: `${start} - ${end}` });
        }
        console.log("Generated all one-hour slots:", slots);
        return slots;
    };

    // Get available time slots for a specific day, considering existing classrooms and current form's schedule
    const getAvailableTimeSlots = useCallback((day, existingClassrooms, currentFormSchedule) => {
        console.log("getAvailableTimeSlots called with:", { day, existingClassrooms, currentFormSchedule });
        if (!day) {
            console.log("No day selected, returning empty slots.");
            return [];
        }

        const allSlots = generateAllOneHourSlots();
        const available = [];

        allSlots.forEach(slot => {
            const isOverlapping = checkOverlap(classroomToEdit?.id, day, slot.startTime, slot.endTime, existingClassrooms, currentFormSchedule);
            if (!isOverlapping) {
                available.push(slot);
            }
        });
        console.log("Available time slots for day", day, ":", available);
        return available;
    }, [checkOverlap, classroomToEdit]);


    // Effect to update form data if classroomToEdit changes (for editing)
    useEffect(() => {
        if (classroomToEdit) {
            // When editing, ensure schedule times are strings (as they are saved as strings)
            // and set the form data.
            setFormData(classroomToEdit);
            setSelectedColor(classroomToEdit.color || '#2196f3');
            // For editing, we don't pre-select `selectedDay` or `selectedTimeSlots`
            // as they are for adding *new* slots, not displaying existing ones.
            setSelectedDay('');
            setSelectedTimeSlots([]);
        } else {
            // If no classroomToEdit, and there's an initialSchedule (from calendar drag)
            if (initialSchedule && initialSchedule.length > 0) {
                // Initial schedule from calendar drag is already in the correct format with string times
                setFormData(prev => ({
                    ...prev,
                    schedule: initialSchedule.map(slot => ({
                        ...slot,
                        // No need to re-format, they should already be HH:mm
                        // startTime: dayjs(slot.startTime).format('HH:mm'),
                        // endTime: dayjs(slot.endTime).format('HH:mm'),
                    }))
                }));
                // Set the initial selected day for the form
                setSelectedDay(initialSchedule[0].day);
                // Pre-select the time slot in the dropdown for the initial schedule
                // This assumes initialSchedule contains labels like "HH:mm - HH:mm"
                setSelectedTimeSlots(initialSchedule.map(slot => `${slot.startTime} - ${slot.endTime}`));
            } else {
                setFormData(initialFormData);
                setSelectedDay('');
                setSelectedTimeSlots([]);
            }
            setSelectedColor('#2196f3'); // Reset color for new form
        }
        console.log("NewClassroomForm useEffect (classroomToEdit/initialSchedule) - allClassrooms:", allClassrooms);
    }, [classroomToEdit, initialSchedule, allClassrooms]);

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

    // Update available time slots when selected day or allClassrooms or formData.schedule changes
    useEffect(() => {
        console.log("NewClassroomForm useEffect (selectedDay/allClassrooms/formData.schedule) - selectedDay:", selectedDay, "allClassrooms:", allClassrooms, "formData.schedule:", formData.schedule);
        if (selectedDay && allClassrooms) {
            setAvailableTimeSlots(getAvailableTimeSlots(selectedDay, allClassrooms, formData.schedule));
        } else {
            setAvailableTimeSlots([]);
        }
    }, [selectedDay, allClassrooms, formData.schedule, getAvailableTimeSlots]);


    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDayChange = (e) => {
        const day = e.target.value;
        console.log("handleDayChange - selected day:", day);
        setSelectedDay(day);
        setSelectedTimeSlots([]); // Clear selected time slots when day changes
    };

    const handleTimeSlotChange = (event) => {
        const {
            target: { value },
        } = event;
        setSelectedTimeSlots(
            // On autofill we get a stringified value.
            typeof value === 'string' ? value.split(',') : value,
        );
    };

    const handleAddScheduleEntry = () => {
        if (!selectedDay || selectedTimeSlots.length === 0) {
            setAlertMessage("Παρακαλώ επιλέξτε ημέρα και τουλάχιστον μία ώρα για προσθήκη.");
            setOpenAlertDialog(true);
            return;
        }

        const newScheduleEntries = [];
        let hasOverlap = false;

        for (const timeSlotLabel of selectedTimeSlots) {
            const [startTimeStr, endTimeStr] = timeSlotLabel.split(' - ');

            // Check for overlap before adding
            // Pass the *current* formData.schedule to checkOverlap to prevent overlaps within the form itself
            const isOverlapping = checkOverlap(classroomToEdit?.id, selectedDay, startTimeStr, endTimeStr, allClassrooms, formData.schedule);
            if (isOverlapping) {
                setAlertMessage(`Η ώρα ${timeSlotLabel} για την ${selectedDay} επικαλύπτεται με υπάρχον μάθημα.`);
                setOpenAlertDialog(true);
                hasOverlap = true;
                break; // Stop and show alert for the first overlap found
            }

            newScheduleEntries.push({
                id: Date.now() + Math.random(), // Unique ID for each schedule entry
                day: selectedDay,
                startTime: startTimeStr,
                endTime: endTimeStr,
                duration: calculateDuration(startTimeStr, endTimeStr),
            });
        }

        if (!hasOverlap) {
            setFormData(prev => ({
                ...prev,
                schedule: [...prev.schedule, ...newScheduleEntries]
            }));
            setSelectedDay(''); // Clear selected day after adding
            setSelectedTimeSlots([]); // Clear selected time slots after adding
        }
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
            console.error("Firestore DB or appId not initialized. Cannot save classroom.");
            setAlertMessage("Σφάλμα: Η βάση δεδομένων ή το αναγνωριστικό εφαρμογής δεν είναι διαθέσιμα. Παρακαλώ δοκιμάστε ξανά.");
            setOpenAlertDialog(true);
            return;
        }

        // Validate form data
        if (!formData.grade || !formData.subject || !formData.maxStudents || formData.maxStudents < 1) {
            setAlertMessage("Παρακαλώ συμπληρώστε όλα τα απαιτούμενα πεδία (Τάξη, Μάθημα, Μέγιστος Αριθμός Μαθητών).");
            setOpenAlertDialog(true);
            return;
        }

        // Validate schedule entries
        if (formData.schedule.length === 0) {
            setAlertMessage("Παρακαλώ προσθέστε τουλάχιστον μία ώρα στο πρόγραμμα.");
            setOpenAlertDialog(true);
            return;
        }

        // Final overlap check for all schedule entries before saving
        // This check is crucial to catch any overlaps that might occur between entries
        // within the same form's schedule, or with existing classrooms.
        for (const slot of formData.schedule) {
            // Create a temporary schedule array excluding the current slot being checked
            // This prevents a slot from "overlapping" with itself.
            const otherSlotsInForm = formData.schedule.filter(s => s.id !== slot.id);
            const isOverlapping = checkOverlap(classroomToEdit?.id, slot.day, slot.startTime, slot.endTime, allClassrooms, otherSlotsInForm);
            if (isOverlapping) {
                setAlertMessage(`Το πρόγραμμα για την ${slot.day} από ${slot.startTime} έως ${slot.endTime} επικαλύπτεται με ένα υπάρχον μάθημα.`);
                setOpenAlertDialog(true);
                return;
            }
        }

        // Prepare data for Firestore
        const dataToSave = {
            ...formData,
            color: selectedColor,
            // Ensure schedule times are strings for saving
            schedule: formData.schedule.map(slot => ({
                id: slot.id, // Keep the ID for potential future updates/deletions of individual slots
                day: slot.day,
                startTime: slot.startTime,
                endTime: slot.endTime,
                duration: slot.duration,
            })),
            // totalDuration might need to be recalculated if multiple slots are allowed,
            // or removed if not needed for the overall classroom. For now, keep it simple.
            // For simplicity, we can just sum up durations or remove this field if not needed.
            // Keeping it as a placeholder for now, might need more complex logic if
            // total duration across multiple slots is required.
            totalDuration: formData.schedule.length > 0 ? formData.schedule.map(s => dayjs(`2000-01-01T${s.endTime}`).diff(dayjs(`2000-01-01T${s.startTime}`), 'minute')).reduce((acc, curr) => acc + curr, 0) + ' λεπτά' : '',
            lastUpdated: new Date(), // Add a timestamp
        };

        if (!classroomToEdit) {
            // Add new classroom
            try {
                const classroomsCollectionRef = collection(db, `artifacts/${appId}/public/data/classrooms`);
                await addDoc(classroomsCollectionRef, dataToSave);
                setAlertMessage('Τμήμα αποθηκεύτηκε επιτυχώς!');
                setOpenAlertDialog(true);
                if (onSaveSuccess) onSaveSuccess(); // Call success callback
            } catch (error) {
                console.error("Error adding document: ", error);
                setAlertMessage('Σφάλμα κατά την αποθήκευση του τμήματος.');
                setOpenAlertDialog(true);
            }
        } else {
            // Update existing classroom
            try {
                const classroomDocRef = doc(db, `artifacts/${appId}/public/data/classrooms`, classroomToEdit.id);
                await updateDoc(classroomDocRef, dataToSave);
                setAlertMessage('Τμήμα ενημερώθηκε επιτυχώς!');
                setOpenAlertDialog(true);
                if (onSaveSuccess) onSaveSuccess(); // Call success callback
            } catch (error) {
                console.error("Error updating document: ", error);
                setAlertMessage('Σφάλμα κατά την ενημέρωση του τμήματος.');
                setOpenAlertDialog(true);
            }
        }
    };


    return (
        <Container maxWidth="md">
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
                <Paper elevation={3} sx={{ padding: '20px', borderRadius: '12px', mb: 4 }}>
                    <Grid item xs={6} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="h5" component="h3" sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: 3, color: '#3f51b5' }}>
                            <i className="fas fa-chalkboard"></i> Στοιχεία Τμήματος
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

                {/* Schedule Selection */}
                <Paper elevation={3} sx={{ padding: '20px', borderRadius: '12px', mb: 4 }}>
                    <Typography variant="h5" component="h3" sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: 3, color: '#3f51b5' }}>
                        <i className="fas fa-calendar-alt"></i> Επιλογή Προγράμματος
                    </Typography>
                    <Grid container spacing={3} alignItems="flex-end">
                        <Grid item xs={12} sm={5}>
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
                        <Grid item xs={12} sm={5}>
                            <FormControl fullWidth variant="outlined" size="small" required disabled={!selectedDay}>
                                <InputLabel id="time-slot-select-label">Διαθέσιμη Ώρα(ες)</InputLabel>
                                <Select
                                    labelId="time-slot-select-label"
                                    id="timeSlotSelect"
                                    multiple
                                    value={selectedTimeSlots}
                                    onChange={handleTimeSlotChange}
                                    renderValue={(selected) => selected.join(', ')} // Display selected values as comma-separated string
                                    label="Διαθέσιμη Ώρα(ες)"
                                >
                                    {availableTimeSlots.length > 0 ? (
                                        availableTimeSlots.map(slot => (
                                            <MenuItem key={slot.label} value={slot.label}>
                                                <Checkbox checked={selectedTimeSlots.indexOf(slot.label) > -1} />
                                                <ListItemText primary={slot.label} sx={{ ml: 1 }} /> {/* Added ml for spacing */}
                                            </MenuItem>
                                        ))
                                    ) : (
                                        <MenuItem disabled>Δεν υπάρχουν διαθέσιμες ώρες για αυτή την ημέρα.</MenuItem>
                                    )}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={2}>
                            <Button
                                variant="contained" // Changed to outlined for transparency
                                color="primary" // Ensures icon is blue
                                onClick={handleAddScheduleEntry}
                                disabled={!selectedDay || selectedTimeSlots.length === 0}
                                sx={{ borderRadius: '8px', padding: '13px 10px', boxShadow:'none'}}
                            >
                                <i className="fas fa-add" sx={{ mr: 1 , color: '#3f51b5'}} /><i/>
                            </Button>
                        </Grid>
                    </Grid>

                    {/* Display selected schedule entries */}
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

                {/* Submit and Cancel Buttons */}
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

            {/* Custom Alert Dialog */}
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
