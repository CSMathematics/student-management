// src/pages/NewClassroomForm.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Box, Button, Container, Grid, Paper, Typography, TextField,
    FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle,
    DialogContent, DialogActions, DialogContentText, IconButton, Divider
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { doc, addDoc, collection, updateDoc } from 'firebase/firestore';
import { SUBJECTS_BY_GRADE_AND_CLASS, getSubjects, getSpecializations } from '../data/subjects.js';
import { useLocation, useNavigate } from 'react-router-dom';

dayjs.extend(duration);
dayjs.extend(isSameOrBefore);

const generateTimeSlots = (startHour, endHour) => {
    const slots = [];
    for (let h = startHour; h < endHour; h++) {
        slots.push(`${String(h).padStart(2, '0')}:00`);
        slots.push(`${String(h).padStart(2, '0')}:30`);
    }
    slots.push(`${String(endHour).padStart(2, '0')}:00`);
    return slots;
};

const DAYS_OF_WEEK = ['Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];
const TIME_SLOTS = generateTimeSlots(8, 22);

function NewClassroomForm({ classroomToEdit, db, userId, appId, classrooms, allTeachers }) {
    const location = useLocation();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        classroomName: '', grade: '', specialization: '', subject: '',
        maxStudents: 5, schedule: [], color: '#2196f3', enrolledStudents: [],
        teacherId: '', teacherName: ''
    });
    
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

    // --- ΑΝΑΒΑΘΜΙΣΜΕΝΗ ΣΥΝΑΡΤΗΣΗ ΕΛΕΓΧΟΥ ΕΠΙΚΑΛΥΨΗΣ ---
    const checkOverlap = useCallback((targetDay, targetStartTimeStr, targetEndTimeStr, currentFormSchedule = [], ignoreFormScheduleIds = []) => {
        const targetStart = dayjs(`2000-01-01T${targetStartTimeStr}`);
        const targetEnd = dayjs(`2000-01-01T${targetEndTimeStr}`);

        if (!targetStart.isValid() || !targetEnd.isValid() || targetEnd.isSameOrBefore(targetStart)) {
            return true;
        }

        const targetTeacherId = formData.teacherId;

        // Αν δεν έχει επιλεγεί καθηγητής, δεν υπάρχει λόγος για έλεγχο επικάλυψης.
        if (!targetTeacherId) {
            return false;
        }

        // Έλεγχος σε σχέση με τα ήδη υπάρχοντα τμήματα στη βάση δεδομένων
        if (Array.isArray(classrooms)) {
            for (const classroom of classrooms) {
                if (classroomToEdit && classroom.id === classroomToEdit.id) continue;
                
                // Έλεγχος μόνο στα τμήματα του ΙΔΙΟΥ καθηγητή
                if (classroom.teacherId === targetTeacherId) {
                    if (classroom.schedule && Array.isArray(classroom.schedule)) {
                        for (const slot of classroom.schedule) {
                            if (slot.day === targetDay) {
                                const existingStart = dayjs(`2000-01-01T${slot.startTime}`);
                                const existingEnd = dayjs(`2000-01-01T${slot.endTime}`);
                                if (targetStart.isBefore(existingEnd) && targetEnd.isAfter(existingStart)) return true;
                            }
                        }
                    }
                }
            }
        }

        // Έλεγχος σε σχέση με τις άλλες ώρες που προστίθενται σε αυτή τη φόρμα
        for (const slot of currentFormSchedule) {
            if (ignoreFormScheduleIds.includes(slot.id)) continue;
            if (slot.day === targetDay) {
                const existingStart = dayjs(`2000-01-01T${slot.startTime}`);
                const existingEnd = dayjs(`2000-01-01T${slot.endTime}`);
                if (targetStart.isBefore(existingEnd) && targetEnd.isAfter(existingStart)) return true;
            }
        }
        return false;
    }, [classroomToEdit, classrooms, formData.teacherId]); // <-- Προσθήκη formData.teacherId

    const getAvailableTimeSlotsForDay = useCallback((day, currentFormSchedule) => {
        if (!day) return [];
        const available = [];
        const idsToIgnoreForInternalCheck = currentFormSchedule.map(s => s.id);
        TIME_SLOTS.forEach((startTimeStr, index) => {
            const endTimeStr = TIME_SLOTS[index + 1];
            if (!endTimeStr) return;
            const isOverlapping = checkOverlap(day, startTimeStr, endTimeStr, currentFormSchedule, idsToIgnoreForInternalCheck);
            if (!isOverlapping) {
                available.push({ startTime: startTimeStr, endTime: endTimeStr, label: `${startTimeStr} - ${endTimeStr}` });
            }
        });
        return available;
    }, [checkOverlap]);

    useEffect(() => {
        const initialFormState = {
            classroomName: '', grade: '', specialization: '', subject: '',
            maxStudents: 5, schedule: [], color: '#2196f3', enrolledStudents: [],
            teacherId: '', teacherName: ''
        };
        const processSchedule = (schedule) => (schedule || []).map(s => ({ ...s, id: s.id || Date.now() + Math.random(), duration: calculateDuration(s.startTime, s.endTime) }));

        if (classroomToEdit) {
            const updatedSchedule = processSchedule(classroomToEdit.schedule);
            setFormData({ ...initialFormState, ...classroomToEdit, schedule: updatedSchedule });
        } else {
            const scheduleFromLocation = processSchedule(location.state?.initialSchedule);
            setFormData(prev => ({ ...initialFormState, ...prev, schedule: scheduleFromLocation }));
        }
    }, [classroomToEdit, location.state, calculateDuration]);
    
    const totalScheduleDuration = useMemo(() => {
        if (!formData.schedule || formData.schedule.length === 0) return '0 ώρες';
        const totalMinutes = formData.schedule.reduce((acc, curr) => {
            const start = dayjs(`2000-01-01T${curr.startTime}`);
            const end = dayjs(`2000-01-01T${curr.endTime}`);
            if (end.isAfter(start)) {
                return acc + end.diff(start, 'minute');
            }
            return acc;
        }, 0);
        return calculateDuration('00:00', dayjs('2000-01-01T00:00').add(totalMinutes, 'minute').format('HH:mm'));
    }, [formData.schedule, calculateDuration]);

    const handleAddScheduleEntry = () => {
        if (!selectedDay || !selectedStartTime || !selectedEndTime) {
            setAlertMessage("Παρακαλώ επιλέξτε ημέρα, ώρα έναρξης και ώρα λήξης.");
            setOpenAlertDialog(true);
            return;
        }
        const newEntry = { id: Date.now(), day: selectedDay, startTime: selectedStartTime, endTime: selectedEndTime, duration: calculateDuration(selectedStartTime, selectedEndTime) };
        setFormData(prev => ({ ...prev, schedule: [...prev.schedule, newEntry] }));
    };

    const handleRemoveScheduleEntry = (idToRemove) => {
        setFormData(prev => ({ ...prev, schedule: prev.schedule.filter(entry => entry.id !== idToRemove) }));
    };
    
    const handleTeacherChange = (e) => {
        const teacherId = e.target.value;
        const selectedTeacher = allTeachers.find(t => t.id === teacherId);
        setFormData(prev => ({
            ...prev,
            teacherId: teacherId,
            teacherName: selectedTeacher ? `${selectedTeacher.firstName} ${selectedTeacher.lastName}` : ''
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!db || !appId) {
            setAlertMessage("Σφάλμα: Η βάση δεδομένων δεν είναι έτοιμη.");
            setOpenAlertDialog(true);
            return;
        }
        if (formData.schedule.length === 0) {
            setAlertMessage("Πρέπει να προσθέσετε τουλάχιστον μία ώρα στο πρόγραμμα.");
            setOpenAlertDialog(true);
            return;
        }
        const dataToSave = { ...formData, totalDuration: totalScheduleDuration };
        try {
            if (classroomToEdit && classroomToEdit.id) {
                const classroomDocRef = doc(db, `artifacts/${appId}/public/data/classrooms`, classroomToEdit.id);
                await updateDoc(classroomDocRef, dataToSave);
            } else {
                const classroomsCollectionRef = collection(db, `artifacts/${appId}/public/data/classrooms`);
                await addDoc(classroomsCollectionRef, dataToSave);
            }
            navigate('/classrooms');
        } catch (error) {
            console.error("Error saving classroom:", error);
            setAlertMessage("Σφάλμα κατά την αποθήκευση.");
            setOpenAlertDialog(true);
        }
    };

    const availableSpecializations = getSpecializations(formData.grade);
    const currentSubjects = getSubjects(formData.grade, formData.specialization);
    
    const availableStartTimes = useMemo(() => {
        if (!selectedDay) return [];
        const slots = getAvailableTimeSlotsForDay(selectedDay, formData.schedule);
        const uniqueStartTimes = new Set(slots.map(s => s.startTime));
        if (selectedStartTime) {
            const isSelectedStartTimeInCurrentSchedule = formData.schedule.some(s => s.day === selectedDay && s.startTime === selectedStartTime);
            if (isSelectedStartTimeInCurrentSchedule) uniqueStartTimes.add(selectedStartTime);
        }
        return Array.from(uniqueStartTimes).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }, [selectedDay, formData.schedule, getAvailableTimeSlotsForDay, selectedStartTime]);

    const availableEndTimes = useMemo(() => {
        if (!selectedDay || !selectedStartTime) return [];
        const startIndex = TIME_SLOTS.indexOf(selectedStartTime);
        if (startIndex === -1) return [];
        const possibleEndTimes = [];
        const idsToIgnoreForInternalCheck = formData.schedule.map(s => s.id);
        for (let i = startIndex + 1; i < TIME_SLOTS.length; i++) {
            const potentialEndTime = TIME_SLOTS[i];
            const isOverlapping = checkOverlap(selectedDay, selectedStartTime, potentialEndTime, formData.schedule, idsToIgnoreForInternalCheck);
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
    }, [selectedDay, selectedStartTime, formData.schedule, checkOverlap, selectedEndTime]);

    return (
        <Container maxWidth={false}>
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
                <Paper elevation={3} sx={{ padding: '20px', borderRadius: '12px', mb: 4 }}>
                    <Typography variant="h5" component="h3" sx={{ mb: 3 }}>
                        {classroomToEdit ? 'Επεξεργασία Τμήματος' : 'Δημιουργία Νέου Τμήματος'}
                    </Typography>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6}><TextField fullWidth label="Κωδικός Τμήματος" name="classroomName" value={formData.classroomName} onChange={(e) => setFormData({...formData, classroomName: e.target.value})} required size="small" /></Grid>
                        <Grid item xs={12} sm={6}><FormControl fullWidth size="small"><InputLabel>Τάξη</InputLabel><Select name="grade" value={formData.grade} label="Τάξη" onChange={(e) => setFormData({...formData, grade: e.target.value, specialization: '', subject: ''})} required>{Object.keys(SUBJECTS_BY_GRADE_AND_CLASS).map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}</Select></FormControl></Grid>
                        
                        {availableSpecializations.length > 0 && (<Grid item xs={12} sm={6}><FormControl fullWidth size="small"><InputLabel>Κατεύθυνση</InputLabel><Select name="specialization" value={formData.specialization} label="Κατεύθυνση" onChange={(e) => setFormData({...formData, specialization: e.target.value, subject: ''})} required>{availableSpecializations.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}</Select></FormControl></Grid>)}
                        <Grid item xs={12} sm={6}><FormControl fullWidth size="small"><InputLabel>Μάθημα</InputLabel><Select name="subject" value={formData.subject} label="Μάθημα" onChange={(e) => setFormData({...formData, subject: e.target.value})} required>{currentSubjects.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}</Select></FormControl></Grid>
                        
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Καθηγητής</InputLabel>
                                <Select name="teacherId" value={formData.teacherId} label="Καθηγητής" onChange={handleTeacherChange}>
                                    <MenuItem value=""><em>Κανένας</em></MenuItem>
                                    {allTeachers && allTeachers.map(teacher => (
                                        <MenuItem key={teacher.id} value={teacher.id}>
                                            {teacher.firstName} {teacher.lastName}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} sm={4}><TextField fullWidth label="Μέγ. Μαθητές" name="maxStudents" type="number" value={formData.maxStudents} onChange={(e) => setFormData({...formData, maxStudents: e.target.value})} required size="small" /></Grid>
                        <Grid item xs={12} sm={2}><FormControl fullWidth><InputLabel shrink sx={{position: 'absolute', top: -18, left: -12, fontSize: '0.9rem'}}>Χρώμα</InputLabel><input type="color" value={formData.color} onChange={(e) => setFormData({...formData, color: e.target.value})} style={{width: '100%', height: '40px', border: '1px solid #ccc', borderRadius: '4px', padding: '2px', boxSizing: 'border-box', cursor: 'pointer'}}/></FormControl></Grid>
                    </Grid>
                </Paper>
                <Paper elevation={3} sx={{ padding: '20px', borderRadius: '12px', mb: 4 }}>
                    <Typography variant="h5" component="h3" sx={{ mb: 3 }}>Επιλογή Προγράμματος</Typography>
                    <Grid container spacing={3} alignItems="flex-end">
                        <Grid item xs={12} sm={4}><FormControl fullWidth size="small"><InputLabel>Ημέρα</InputLabel><Select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} label="Ημέρα">{DAYS_OF_WEEK.map(day => <MenuItem key={day} value={day}>{day}</MenuItem>)}</Select></FormControl></Grid>
                        <Grid item xs={12} sm={3}><FormControl fullWidth size="small"><InputLabel>Ώρα Έναρξης</InputLabel><Select value={selectedStartTime} onChange={(e) => setSelectedStartTime(e.target.value)} label="Ώρα Έναρξης">{availableStartTimes.map(time => <MenuItem key={time} value={time}>{time}</MenuItem>)}</Select></FormControl></Grid>
                        <Grid item xs={12} sm={3}><FormControl fullWidth size="small"><InputLabel>Ώρα Λήξης</InputLabel><Select value={selectedEndTime} onChange={(e) => setSelectedEndTime(e.target.value)} label="Ώρα Λήξης" disabled={!selectedStartTime}>{availableEndTimes.map(time => <MenuItem key={time} value={time}>{time}</MenuItem>)}</Select></FormControl></Grid>
                        <Grid item xs={12} sm={2}><Button variant="contained" onClick={handleAddScheduleEntry} startIcon={<Add />} fullWidth>Προσθήκη</Button></Grid>
                    </Grid>
                    {formData.schedule.length > 0 && (
                        <Box sx={{ mt: 3 }}>
                            {formData.schedule.map((slot) => (
                                <Box key={slot.id} sx={{ display: 'flex', alignItems: 'center', mb: 1, p: 1, border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                                    <Typography sx={{ flexGrow: 1 }}>{slot.day}: {slot.startTime} - {slot.endTime} ({slot.duration})</Typography>
                                    <IconButton color="error" size="small" onClick={() => handleRemoveScheduleEntry(slot.id)}><Delete /></IconButton>
                                </Box>
                            ))}
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="h6" align="right">Συνολική Διάρκεια: <strong>{totalScheduleDuration}</strong></Typography>
                        </Box>
                    )}
                </Paper>
                <Box sx={{ mt: 3, textAlign: 'right', display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <Button variant="outlined" color="secondary" onClick={() => navigate(-1)}>Ακύρωση</Button>
                    <Button type="submit" variant="contained" color="primary">{classroomToEdit ? 'Ενημέρωση' : 'Αποθήκευση'}</Button>
                </Box>
            </Box>
            <Dialog open={openAlertDialog} onClose={() => setOpenAlertDialog(false)}>
                <DialogTitle>Ειδοποίηση</DialogTitle>
                <DialogContent><DialogContentText>{alertMessage}</DialogContentText></DialogContent>
                <DialogActions><Button onClick={() => setOpenAlertDialog(false)} autoFocus>Εντάξει</Button></DialogActions>
            </Dialog>
        </Container>
    );
}

export default NewClassroomForm;
