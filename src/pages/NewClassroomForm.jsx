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
import { getFirestore, collection, addDoc } from 'firebase/firestore';

import { SUBJECTS_BY_GRADE_AND_CLASS, getSubjects, getSpecializations } from '../data/subjects.js';


function NewClassroomForm() {
    const [formData, setFormData] = useState({
        grade: '',
        specialization: '',
        subject: '',
        maxStudents: 5,
        schedule: [{ id: Date.now(), day: '', startTime: null, endTime: null, editingStage: 'start' }],
    });

    const [availableSpecializations, setAvailableSpecializations] = useState([]);
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [db, setDb] = useState(null); // State for Firestore instance
    const [auth, setAuth] = useState(null); // State for Auth instance
    const [userId, setUserId] = useState(null); // State for user ID

    // Initialize Firebase and authenticate
    useEffect(() => {
        try {
            // Read Firebase config from environment variables for local development
            // In the Canvas environment, __firebase_config and __app_id are provided globally.
            // For local VS Code development, use .env variables prefixed with VITE_
            const firebaseConfigString = typeof __firebase_config !== 'undefined'
                ? __firebase_config // Use Canvas global variable if available
                : import.meta.env.VITE_FIREBASE_CONFIG; // Use Vite .env variable locally

            const appId = typeof __app_id !== 'undefined'
                ? __app_id // Use Canvas global variable if available
                : import.meta.env.VITE_APP_ID || 'default-local-app-id'; // Use Vite .env variable or fallback

            const initialAuthToken = typeof __initial_auth_token !== 'undefined'
                ? __initial_auth_token // Use Canvas global variable if available
                : import.meta.env.VITE_INITIAL_AUTH_TOKEN; // Use Vite .env variable for local mock token

            const parsedFirebaseConfig = firebaseConfigString ? JSON.parse(firebaseConfigString) : {};

            if (Object.keys(parsedFirebaseConfig).length === 0) {
                console.error("Firebase config is missing. Please ensure VITE_FIREBASE_CONFIG is set in your .env file or provided by the Canvas environment.");
                return;
            }

            const app = initializeApp(parsedFirebaseConfig);
            const firestoreDb = getFirestore(app);
            const firebaseAuth = getAuth(app);

            setDb(firestoreDb);
            setAuth(firebaseAuth);

            const authenticate = async () => {
                if (initialAuthToken) {
                    await signInWithCustomToken(firebaseAuth, initialAuthToken);
                } else {
                    await signInAnonymously(firebaseAuth);
                }
                setUserId(firebaseAuth.currentUser?.uid || crypto.randomUUID());
            };

            authenticate();
        } catch (error) {
            console.error("Error initializing Firebase or authenticating:", error);
            alert("Error initializing Firebase. Check console for details and ensure your .env config is correct.");
        }
    }, []); // Empty dependency array means this runs once on component mount


    useEffect(() => {
        const specs = getSpecializations(formData.grade);
        setAvailableSpecializations(specs);

        if (specs.length > 0 && !specs.includes(formData.specialization)) {
            setFormData(prev => ({ ...prev, specialization: '' }));
        }

        const subjects = getSubjects(formData.grade, formData.specialization);
        setAvailableSubjects(subjects);

        if (!subjects.includes(formData.subject)) {
            setFormData(prev => ({ ...prev, subject: '' }));
        }

    }, [formData.grade, formData.specialization, formData.subject]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleTimePickerChange = (id, field, newValue) => {
        setFormData(prev => ({
            ...prev,
            schedule: prev.schedule.map(slot =>
                slot.id === id ? { ...slot, [field]: newValue } : slot
            )
        }));
    };

    const handleConfirmTime = (id, field) => {
        setFormData(prev => ({
            ...prev,
            schedule: prev.schedule.map(slot => {
                if (slot.id === id) {
                    if (field === 'startTime') {
                        return { ...slot, editingStage: 'end' };
                    } else if (field === 'endTime') {
                        // Ensure endTime is after startTime if both are set
                        if (slot.startTime && slot.endTime && dayjs(slot.endTime).isBefore(dayjs(slot.startTime))) {
                            alert("Η ώρα λήξης δεν μπορεί να είναι πριν από την ώρα έναρξης.");
                            return { ...slot, endTime: null }; // Reset endTime if invalid
                        }
                        return { ...slot, editingStage: 'done' };
                    }
                }
                return slot;
            })
        }));
    };

    const handleResetTime = (id) => {
        setFormData(prev => ({
            ...prev,
            schedule: prev.schedule.map(slot =>
                slot.id === id ? { ...slot, startTime: null, endTime: null, editingStage: 'start' } : slot
            )
        }));
    };

    const handleScheduleDayChange = (id, e) => {
        const { value } = e.target;
        setFormData(prev => ({
            ...prev,
            schedule: prev.schedule.map(slot =>
                slot.id === id ? { ...slot, day: value } : slot
            )
        }));
    };

    const addScheduleSlot = () => {
        setFormData(prev => ({
            ...prev,
            schedule: [...prev.schedule, { id: Date.now(), day: '', startTime: null, endTime: null, editingStage: 'start' }]
        }));
    };

    const removeScheduleSlot = (idToRemove) => {
        setFormData(prev => ({
            ...prev,
            schedule: prev.schedule.filter(slot => slot.id !== idToRemove)
        }));
    };

    const calculateDuration = (startTime, endTime) => {
        if (!startTime || !endTime) return '';
        const start = dayjs(startTime);
        const end = dayjs(endTime);

        if (end.isBefore(start)) {
            return "Invalid Time Range";
        }

        const diff = dayjs.duration(end.diff(start));
        const hours = diff.hours();
        const minutes = diff.minutes();

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
    };

    const calculateTotalDuration = useMemo(() => {
        let totalMinutes = 0;
        formData.schedule.forEach(slot => {
            if (slot.startTime && slot.endTime && slot.editingStage === 'done') {
                const start = dayjs(slot.startTime);
                const end = dayjs(slot.endTime);
                if (end.isAfter(start)) {
                    totalMinutes += end.diff(start, 'minute');
                }
            }
        });

        const totalHours = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;

        let totalDurationString = '';
        if (totalHours > 0) {
            totalDurationString += `${totalHours} ${totalHours > 1 ? 'ώρες' : 'ώρα'}`;
        }
        if (remainingMinutes > 0) {
            if (totalHours > 0) totalDurationString += ' και ';
            totalDurationString += `${remainingMinutes} λεπτά`;
        }
        if (totalHours === 0 && remainingMinutes === 0 && formData.schedule.some(s => s.editingStage === 'done')) {
            totalDurationString = '0 λεπτά';
        } else if (totalHours === 0 && remainingMinutes === 0) {
            totalDurationString = '0 ώρες';
        }
        return totalDurationString;
    }, [formData.schedule]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!db || !userId) {
            alert("Firebase is not initialized or user not authenticated. Please try again.");
            console.error("Firestore DB or User ID is null.");
            return;
        }

        const newClassroom = {
            grade: formData.grade,
            specialization: formData.specialization,
            subject: formData.subject,
            maxStudents: formData.maxStudents,
            schedule: formData.schedule.map(slot => ({
                day: slot.day,
                startTime: slot.startTime ? dayjs(slot.startTime).format('HH:mm') : '',
                endTime: slot.endTime ? dayjs(slot.endTime).format('HH:mm') : '',
                duration: calculateDuration(slot.startTime, slot.endTime)
            })),
            totalDuration: calculateTotalDuration,
            createdAt: new Date(),
            createdBy: userId,
        };

        try {
            // Prioritize Canvas's __app_id, fallback to Vite's .env, then a default
            const currentAppId = typeof __app_id !== 'undefined'
                ? __app_id
                : import.meta.env.VITE_APP_ID || 'default-local-app-id';

            const classroomsCollectionRef = collection(db, `artifacts/${currentAppId}/public/data/classrooms`);

            const docRef = await addDoc(classroomsCollectionRef, newClassroom);
            console.log('New Classroom Data Submitted to Firestore:', newClassroom);
            console.log('Document written with ID: ', docRef.id);
            alert('New classroom created and saved to Firestore!');

            setFormData({
                grade: '',
                specialization: '',
                subject: '',
                maxStudents: 5,
                schedule: [{ id: Date.now(), day: '', startTime: null, endTime: null, editingStage: 'start' }],
            });
        } catch (error) {
            console.error("Error adding document to Firestore: ", error);
            alert("Failed to save classroom. Please check console for errors.");
        }
    };

    const daysOfWeek = ['Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];

    return (
        <Container maxWidth="md">
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
                <Paper elevation={3} sx={{ padding: '20px', borderRadius: '12px', mb: 4 }}>
                    <Typography variant="h5" component="h3" sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: 3, color: '#3f51b5' }}>
                        <i className="fas fa-plus-circle"></i> Δημιουργία Νέου Τμήματος
                    </Typography>
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth variant="outlined" size="small" required>
                                <InputLabel id="grade-select-label">Τάξη</InputLabel>
                                <Select
                                    labelId="grade-select-label"
                                    name="grade"
                                    value={formData.grade}
                                    onChange={handleInputChange}
                                    label="Τάξη"
                                >
                                    <MenuItem value="">-- Επιλέξτε Τάξη --</MenuItem>
                                    {Object.keys(SUBJECTS_BY_GRADE_AND_CLASS).map(gradeOption => (
                                        <MenuItem key={gradeOption} value={gradeOption}>{gradeOption}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            {availableSpecializations.length > 0 && (
                                <FormControl fullWidth variant="outlined" size="small">
                                    <InputLabel id="specialization-select-label">Κατεύθυνση</InputLabel>
                                    <Select
                                        labelId="specialization-select-label"
                                        name="specialization"
                                        value={formData.specialization}
                                        onChange={handleInputChange}
                                        label="Κατεύθυνση"
                                    >
                                        <MenuItem value="">-- Επιλέξτε Κατεύθυνση --</MenuItem>
                                        {availableSpecializations.map(spec => (
                                            <MenuItem key={spec} value={spec}>{spec}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            )}
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth variant="outlined" size="small" required>
                                <InputLabel id="subject-select-label">Μάθημα</InputLabel>
                                <Select
                                    labelId="subject-select-label"
                                    name="subject"
                                    value={formData.subject}
                                    onChange={handleInputChange}
                                    label="Μάθημα"
                                >
                                    <MenuItem value="">-- Επιλέξτε Μάθημα --</MenuItem>
                                    {availableSubjects.map(subjectOption => (
                                        <MenuItem key={subjectOption} value={subjectOption}>{subjectOption}</MenuItem>
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
                                variant="outlined"
                                size="small"
                                inputProps={{ min: 1 }}
                                required
                            />
                        </Grid>
                    </Grid>
                </Paper>

                {/* ⏰ Schedule Section */}
                <Paper elevation={3} sx={{ padding: '20px', borderRadius: '12px', mb: 4 }}>
                    <Typography variant="h5" component="h3" sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: 3, color: '#3f51b5' }}>
                        <i className="fas fa-calendar-alt"></i> Πρόγραμμα
                    </Typography>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        {formData.schedule.map((slot, index) => (
                            <Grid container spacing={2} key={slot.id} sx={{ mb: 2, alignItems: 'center' }}>
                                <Grid item xs={12} sm={4}>
                                    <FormControl fullWidth variant="outlined" size="small">
                                        <InputLabel id={`day-select-label-${slot.id}`}>Ημέρα</InputLabel>
                                        <Select
                                            labelId={`day-select-label-${slot.id}`}
                                            name="day"
                                            value={slot.day}
                                            onChange={(e) => handleScheduleDayChange(slot.id, e)}
                                            label="Ημέρα"
                                        >
                                            <MenuItem value="">-- Επιλέξτε Ημέρα --</MenuItem>
                                            {daysOfWeek.map(day => (
                                                <MenuItem key={day} value={day}>{day}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                {/* Time Pickers / Display */}
                                {slot.editingStage === 'start' && (
                                    <Grid item xs={12} sm={6}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="subtitle1" sx={{ mb: 1, color: '#3f51b5' }}>Ώρα Έναρξης</Typography>
                                            <TimeClock
                                                value={slot.startTime}
                                                onChange={(newValue) => handleTimePickerChange(slot.id, 'startTime', newValue)}
                                                views={['hours', 'minutes']}
                                                ampm={false}
                                            />
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                onClick={() => handleConfirmTime(slot.id, 'startTime')}
                                                startIcon={<CheckCircleOutline />}
                                                sx={{ mt: 1, borderRadius: '8px' }}
                                                disabled={!slot.startTime}
                                            >
                                                OK
                                            </Button>
                                        </Box>
                                    </Grid>
                                )}
                                {slot.editingStage === 'end' && (
                                    <Grid item xs={12} sm={6}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="subtitle1" sx={{ mb: 1, color: '#3f51b5' }}>Ώρα Λήξης</Typography>
                                            <TimeClock
                                                value={slot.endTime}
                                                onChange={(newValue) => handleTimePickerChange(slot.id, 'endTime', newValue)}
                                                views={['hours', 'minutes']}
                                                ampm={false}
                                            />
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                onClick={() => handleConfirmTime(slot.id, 'endTime')}
                                                startIcon={<CheckCircleOutline />}
                                                sx={{ mt: 1, borderRadius: '8px' }}
                                                disabled={!slot.endTime}
                                            >
                                                OK
                                            </Button>
                                        </Box>
                                    </Grid>
                                )}
                                {slot.editingStage === 'done' && (
                                    <Grid item xs={12} sm={6}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.5, ml: 2 }}>
                                            <Typography variant="body1" sx={{ color: '#555' }}>
                                                Ώρα: {slot.startTime ? dayjs(slot.startTime).format('HH:mm') : ''} - {slot.endTime ? dayjs(slot.endTime).format('HH:mm') : ''}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: '#757575', fontStyle: 'italic' }}>
                                                Διάρκεια: {calculateDuration(slot.startTime, slot.endTime)}
                                            </Typography>
                                            <IconButton color="info" onClick={() => handleResetTime(slot.id)} size="small" sx={{ mt: 1 }}>
                                                <Restore fontSize="small" /> Επεξεργασία Ώρας
                                            </IconButton>
                                        </Box>
                                    </Grid>
                                )}
                                <Grid item xs={12} sm={2} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
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

                {/* Submit Button */}
                <Box sx={{ mt: 3, textAlign: 'right' }}>
                    <Button type="submit" variant="contained" color="primary" sx={{ borderRadius: '8px', padding: '10px 20px' }}>
                        <i className="fas fa-save" style={{ marginRight: '8px' }}></i> Αποθήκευση Τμήματος
                    </Button>
                </Box>
            </Box>
        </Container>
    );
}

export default NewClassroomForm;
