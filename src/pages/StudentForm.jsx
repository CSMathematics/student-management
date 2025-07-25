// src/pages/StudentForm.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
    Box, Button, Container, Grid, Paper, Typography, TextField,
    FormControl, InputLabel, Select, MenuItem, FormGroup, FormControlLabel,
    Checkbox, IconButton, CircularProgress, Alert, ListItemText, RadioGroup, Radio, Divider
} from '@mui/material';
import { Delete, Add } from '@mui/icons-material';
import { addDoc, doc, updateDoc, collection, writeBatch, arrayUnion, arrayRemove } from 'firebase/firestore';
import { SUBJECTS_BY_GRADE_AND_CLASS, getSubjects, getSpecializations } from '../data/subjects.js';
import { useNavigate } from 'react-router-dom';

// Helper function to format the schedule display
const formatSchedule = (schedule) => {
    if (!schedule || schedule.length === 0) return 'Χωρίς πρόγραμμα';
    const dayMapping = { 'Δευτέρα': 'Δε', 'Τρίτη': 'Τρ', 'Τετάρτη': 'Τε', 'Πέμπτη': 'Πε', 'Παρασκευή': 'Πα', 'Σάββατο': 'Σα' };
    return schedule.map(slot => `${dayMapping[slot.day] || slot.day.substring(0, 2)} ${slot.startTime}-${slot.endTime}`).join(', ');
};

// The unified form component
// --- ΔΙΟΡΘΩΣΗ: Αλλάζουμε το όνομα του prop από allClassrooms σε classrooms ---
function StudentForm({ db, appId, classrooms, allStudents, openModalWithData, initialData = null }) {
    const navigate = useNavigate();
    const isEditMode = Boolean(initialData && initialData.id);

    const [formData, setFormData] = useState(null);
    const [selectedSubjects, setSelectedSubjects] = useState([]);
    const [selectedClassrooms, setSelectedClassrooms] = useState({});
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    // Effect to initialize or reset the form state
    useEffect(() => {
        if (isEditMode) {
            // EDIT MODE: Populate form with existing student data
            const studentData = {
                ...initialData,
                parents: initialData.parents && initialData.parents.length > 0
                    ? initialData.parents.map(p => ({ ...p, id: p.id || Date.now() + Math.random() }))
                    : [{ id: Date.now(), name: '', phones: [{ id: Date.now() + 1, value: '' }] }]
            };
            setFormData(studentData);

            const initialSubjects = new Set();
            const initialClassrooms = {};

            // --- ΔΙΟΡΘΩΣΗ: Χρησιμοποιούμε το 'classrooms' prop ---
            if (classrooms) {
                classrooms.forEach(classroom => {
                    if (initialData.enrolledClassrooms?.includes(classroom.id)) {
                        initialSubjects.add(classroom.subject);
                        initialClassrooms[classroom.subject] = classroom.id;
                    }
                });
            }

            setSelectedSubjects(Array.from(initialSubjects));
            setSelectedClassrooms(initialClassrooms);
        } else {
            // CREATE MODE: Set form to its initial empty state
            setFormData({
                firstName: '', lastName: '', dob: '', studentPhone: '', address: '', email: '',
                parents: [{ id: Date.now(), name: '', phones: [{ id: Date.now() + 1, value: '' }] }],
                grade: '', specialization: '', payment: '', debt: ''
            });
            setSelectedSubjects([]);
            setSelectedClassrooms({});
        }
    }, [initialData, isEditMode, classrooms]);

    // Memoized calculation for classroom enrollment counts
    const classroomEnrollmentCounts = useMemo(() => {
        const counts = new Map();
        if (allStudents) {
            allStudents.forEach(student => {
                student.enrolledClassrooms?.forEach(classroomId => {
                    counts.set(classroomId, (counts.get(classroomId) || 0) + 1);
                });
            });
        }
        return counts;
    }, [allStudents]);

    // Effect to update available subjects/specializations when grade changes
    const [availableSpecializations, setAvailableSpecializations] = useState([]);
    const [availableSubjects, setAvailableSubjects] = useState([]);

    useEffect(() => {
        if (formData?.grade) {
            const specs = getSpecializations(formData.grade);
            setAvailableSpecializations(specs);
            const subjects = getSubjects(formData.grade, formData.specialization);
            setAvailableSubjects(subjects);
        } else {
            setAvailableSpecializations([]);
            setAvailableSubjects([]);
        }
    }, [formData?.grade, formData?.specialization]);

    // Handlers for form inputs
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleParentNameChange = (parentIndex, e) => {
        const newParents = JSON.parse(JSON.stringify(formData.parents));
        newParents[parentIndex].name = e.target.value;
        setFormData(prev => ({ ...prev, parents: newParents }));
    };

    const handleParentPhoneChange = (parentIndex, phoneId, e) => {
        const newParents = JSON.parse(JSON.stringify(formData.parents));
        const phoneIndex = newParents[parentIndex].phones.findIndex(p => p.id === phoneId);
        if (phoneIndex !== -1) {
            newParents[parentIndex].phones[phoneIndex].value = e.target.value;
            setFormData(prev => ({ ...prev, parents: newParents }));
        }
    };

    const addParentPhone = (parentIndex) => {
        const newParents = JSON.parse(JSON.stringify(formData.parents));
        newParents[parentIndex].phones.push({ id: Date.now(), value: '' });
        setFormData(prev => ({ ...prev, parents: newParents }));
    };

    const removeParentPhone = (parentIndex, phoneId) => {
        const newParents = JSON.parse(JSON.stringify(formData.parents));
        newParents[parentIndex].phones = newParents[parentIndex].phones.filter(p => p.id !== phoneId);
        setFormData(prev => ({ ...prev, parents: newParents }));
    };

    const addSecondParent = () => {
        if (formData.parents.length < 2) {
            setFormData(prev => ({
                ...prev,
                parents: [...prev.parents, { id: Date.now(), name: '', phones: [{ id: Date.now() + 1, value: '' }] }]
            }));
        }
    };

    const removeSecondParent = () => {
        setFormData(prev => ({ ...prev, parents: prev.parents.slice(0, 1) }));
    };

    const handleSubjectChange = (event, subject) => {
        const { checked } = event.target;
        const newSelectedSubjects = checked ? [...selectedSubjects, subject] : selectedSubjects.filter(s => s !== subject);
        setSelectedSubjects(newSelectedSubjects);
        if (!checked) {
            const newSelectedClassrooms = { ...selectedClassrooms };
            delete newSelectedClassrooms[subject];
            setSelectedClassrooms(newSelectedClassrooms);
        }
    };

    const handleClassroomSelectionChange = (subject, classroomId) => {
        setSelectedClassrooms(prev => ({ ...prev, [subject]: classroomId }));
    };

    const handleCreateNewClassroom = (subject) => {
        const prefilledData = {
            grade: formData.grade,
            specialization: formData.specialization,
            subject: subject
        };
        openModalWithData(prefilledData);
    };

    // Unified submit handler
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!db || !appId) {
            setFeedback({ type: 'error', message: 'Η σύνδεση με τη βάση δεδομένων απέτυχε.' });
            return;
        }
        setLoading(true);
        setFeedback({ type: '', message: '' });

        const cleanedParents = formData.parents.map(parent => ({
            name: parent.name,
            phones: parent.phones.map(p => p.value).filter(Boolean)
        })).filter(parent => parent.name);

        const finalEnrolledClassrooms = Object.values(selectedClassrooms);
        const studentData = { ...formData, parents: cleanedParents, enrolledClassrooms: finalEnrolledClassrooms };

        try {
            const batch = writeBatch(db);

            if (isEditMode) {
                // --- UPDATE LOGIC ---
                const studentRef = doc(db, `artifacts/${appId}/public/data/students`, initialData.id);
                batch.update(studentRef, studentData);

                const originalClassroomIds = new Set(initialData.enrolledClassrooms || []);
                const newClassroomIds = new Set(finalEnrolledClassrooms);

                const classroomsToAdd = [...newClassroomIds].filter(id => !originalClassroomIds.has(id));
                const classroomsToRemove = [...originalClassroomIds].filter(id => !newClassroomIds.has(id));

                classroomsToAdd.forEach(classroomId => {
                    const classroomRef = doc(db, `artifacts/${appId}/public/data/classrooms`, classroomId);
                    batch.update(classroomRef, { enrolledStudents: arrayUnion(initialData.id) });
                });
                classroomsToRemove.forEach(classroomId => {
                    const classroomRef = doc(db, `artifacts/${appId}/public/data/classrooms`, classroomId);
                    batch.update(classroomRef, { enrolledStudents: arrayRemove(initialData.id) });
                });

                await batch.commit();
                setFeedback({ type: 'success', message: 'Οι αλλαγές αποθηκεύτηκαν επιτυχώς!' });

            } else {
                // --- CREATE LOGIC ---
                studentData.createdAt = new Date();
                const newStudentRef = doc(collection(db, `artifacts/${appId}/public/data/students`));
                batch.set(newStudentRef, studentData);

                finalEnrolledClassrooms.forEach(classroomId => {
                    const classroomDocRef = doc(db, `artifacts/${appId}/public/data/classrooms`, classroomId);
                    batch.update(classroomDocRef, { enrolledStudents: arrayUnion(newStudentRef.id) });
                });

                await batch.commit();
                setFeedback({ type: 'success', message: 'Ο μαθητής αποθηκεύτηκε επιτυχώς!' });
            }

            setTimeout(() => navigate('/students'), 1500);

        } catch (error) {
            console.error("Error saving student:", error);
            setFeedback({ type: 'error', message: 'Αποτυχία αποθήκευσης. Παρακαλώ δοκιμάστε ξανά.' });
        } finally {
            setLoading(false);
        }
    };

    if (!formData) {
        return <Container sx={{ mt: 4, textAlign: 'center' }}><CircularProgress /></Container>;
    }

    return (
        <Container maxWidth="md">
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
                <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
                    <Typography variant="h5" sx={{ mb: 3 }}>
                        {isEditMode ? 'Επεξεργασία Στοιχείων Μαθητή' : 'Προσθήκη Νέου Μαθητή'}
                    </Typography>
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}><TextField fullWidth label="Όνομα" name="firstName" value={formData.firstName} onChange={handleInputChange} required size="small" /></Grid>
                        <Grid item xs={12} sm={6}><TextField fullWidth label="Επώνυμο" name="lastName" value={formData.lastName} onChange={handleInputChange} required size="small" /></Grid>
                        <Grid item xs={12} sm={6}><TextField fullWidth label="Ημερομηνία Γέννησης" name="dob" type="date" value={formData.dob} onChange={handleInputChange} InputLabelProps={{ shrink: true }} size="small" /></Grid>
                        <Grid item xs={12} sm={6}><TextField fullWidth label="Τηλέφωνο Μαθητή" name="studentPhone" value={formData.studentPhone} onChange={handleInputChange} size="small" /></Grid>
                        <Grid item xs={12} sm={6}><TextField fullWidth label="Διεύθυνση" name="address" value={formData.address} onChange={handleInputChange} size="small" /></Grid>
                        <Grid item xs={12} sm={6}><TextField fullWidth label="Email" name="email" type="email" value={formData.email} onChange={handleInputChange} size="small" /></Grid>
                    </Grid>
                </Paper>

                <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
                    <Typography variant="h5" sx={{ mb: 3 }}>Στοιχεία Γονέα/Κηδεμόνα</Typography>
                    {formData.parents.map((parent, parentIndex) => (
                        <Box key={parent.id || parentIndex}>
                            {parentIndex > 0 && <Divider sx={{ my: 3 }} />}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" component="h4" color="textSecondary">Γονέας {parentIndex + 1}</Typography>
                                {parentIndex > 0 && <Button color="error" startIcon={<Delete />} onClick={removeSecondParent}>Αφαίρεση Γονέα</Button>}
                            </Box>
                            <Grid container spacing={3}>
                                <Grid item xs={12}><TextField fullWidth label="Ονοματεπώνυμο Γονέα" value={parent.name} onChange={(e) => handleParentNameChange(parentIndex, e)} size="small" sx={{ mb: 2 }} /></Grid>
                                <Grid item xs={12}>
                                    {parent.phones.map((phoneEntry, phoneIndex) => (
                                        <Box key={phoneEntry.id || phoneIndex} sx={{ display: 'flex', gap: '10px', mb: 2, alignItems: 'center' }}>
                                            <TextField fullWidth label={`Τηλέφωνο ${phoneIndex + 1}`} value={phoneEntry.value} onChange={(e) => handleParentPhoneChange(parentIndex, phoneEntry.id, e)} size="small" />
                                            {parent.phones.length > 1 && <IconButton color="error" onClick={() => removeParentPhone(parentIndex, phoneEntry.id)}><Delete /></IconButton>}
                                        </Box>
                                    ))}
                                    <Button variant="outlined" size="small" startIcon={<Add />} onClick={() => addParentPhone(parentIndex)}>Προσθήκη Τηλεφώνου</Button>
                                </Grid>
                            </Grid>
                        </Box>
                    ))}
                    {formData.parents.length < 2 && <Button variant="contained" onClick={addSecondParent} sx={{ mt: 3 }}>Προσθήκη Δεύτερου Γονέα</Button>}
                </Paper>

                <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
                    <Typography variant="h5" component="h3" sx={{ mb: 3 }}>Ακαδημαϊκά & Εγγραφή</Typography>
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small" sx={{ mb: 3 }}>
                                <InputLabel>Τάξη</InputLabel>
                                <Select name="grade" value={formData.grade} label="Τάξη" onChange={handleInputChange} required>
                                    {Object.keys(SUBJECTS_BY_GRADE_AND_CLASS).map(grade => <MenuItem key={grade} value={grade}>{grade}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            {availableSpecializations.length > 0 && (
                                <FormControl fullWidth size="small">
                                    <InputLabel>Κατεύθυνση</InputLabel>
                                    <Select name="specialization" value={formData.specialization} label="Κατεύθυνση" onChange={handleInputChange} required={availableSpecializations.length > 0}>
                                        {availableSpecializations.map(spec => <MenuItem key={spec} value={spec}>{spec}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            )}
                        </Grid>
                        <Grid item xs={12}>
                            <Typography variant="subtitle1" sx={{ mb: 1 }}>Επιλογή Μαθημάτων & Τμημάτων:</Typography>
                            <Paper variant="outlined" sx={{ p: 2, maxHeight: 400, overflowY: 'auto' }}>
                                {availableSubjects.length > 0 ? (
                                    <FormGroup>
                                        {availableSubjects.map(subject => {
                                            // --- ΔΙΟΡΘΩΣΗ: Χρησιμοποιούμε το 'classrooms' prop ---
                                            const matching = classrooms.filter(c => c.grade === formData.grade && (c.specialization || '') === formData.specialization && c.subject === subject);
                                            const isSubjectSelected = selectedSubjects.includes(subject);
                                            return (
                                                <Box key={subject} sx={{ mb: 1, p: 1, borderLeft: '4px solid', borderColor: isSubjectSelected ? 'primary.main' : 'transparent' }}>
                                                    <FormControlLabel control={<Checkbox value={subject} checked={isSubjectSelected} onChange={(e) => handleSubjectChange(e, subject)} />} label={<Typography variant="h6" sx={{ fontWeight: 500 }}>{subject}</Typography>} />
                                                    {isSubjectSelected && (
                                                        <Box sx={{ pl: 4, mt: 0.5 }}>
                                                            {matching.length > 0 ? (
                                                                <RadioGroup value={selectedClassrooms[subject] || ''} onChange={(e) => handleClassroomSelectionChange(subject, e.target.value)}>
                                                                    {matching.map(c => {
                                                                        const enrolledCount = classroomEnrollmentCounts.get(c.id) || 0;
                                                                        const isCurrentlyEnrolled = isEditMode && initialData.enrolledClassrooms?.includes(c.id);
                                                                        const isFull = enrolledCount >= c.maxStudents && !isCurrentlyEnrolled;
                                                                        return (
                                                                            <FormControlLabel key={c.id} value={c.id} disabled={isFull} control={<Radio size="small" />}
                                                                                label={
                                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                                                        <Box sx={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: c.color || '#ccc', flexShrink: 0 }} />
                                                                                        <ListItemText primary={<Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Typography component="span" variant="body1">{c.classroomName || 'N/A'} -</Typography><Typography component="span" variant="body2" sx={{ color: isFull ? 'error.main' : 'text.secondary', fontWeight: 'bold' }}>Θέσεις: {enrolledCount}/{c.maxStudents}</Typography></Box>} secondary={formatSchedule(c.schedule)} sx={{ m: 0 }} />
                                                                                    </Box>
                                                                                }
                                                                            />
                                                                        );
                                                                    })}
                                                                </RadioGroup>
                                                            ) : <Typography color="textSecondary" sx={{ pl: 1, fontStyle: 'italic', my: 1 }}>Δεν υπάρχουν διαθέσιμα τμήματα.</Typography>}
                                                            {!isEditMode && <Button size="small" startIcon={<Add />} onClick={() => handleCreateNewClassroom(subject)} sx={{ mt: 1 }}>Δημιουργία Νέου Τμήματος</Button>}
                                                        </Box>
                                                    )}
                                                </Box>
                                            );
                                        })}
                                    </FormGroup>
                                ) : <Typography color="textSecondary">Επιλέξτε τάξη για να δείτε τα διαθέσιμα μαθήματα.</Typography>}
                            </Paper>
                        </Grid>
                    </Grid>
                </Paper>

                <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
                    <Typography variant="h5" component="h3" sx={{ mb: 3 }}>Οικονομικά</Typography>
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}><TextField fullWidth label="Δίδακτρα (€)" name="payment" type="number" value={formData.payment || ''} onChange={handleInputChange} size="small" /></Grid>
                        <Grid item xs={12} sm={6}><TextField fullWidth label="Έκπτωση (%)" name="debt" type="number" value={formData.debt || ''} onChange={handleInputChange} size="small" /></Grid>
                    </Grid>
                </Paper>

                <Box sx={{ mt: 3, textAlign: 'right' }}>
                    <Button variant="outlined" color="secondary" sx={{ mr: 2 }} onClick={() => navigate('/students')}>Ακύρωση</Button>
                    <Button type="submit" variant="contained" color="primary" disabled={loading}>
                        {loading ? <CircularProgress size={24} /> : (isEditMode ? 'Αποθήκευση Αλλαγών' : 'Αποθήκευση Μαθητή')}
                    </Button>
                </Box>
                {feedback.message && (<Alert severity={feedback.type} sx={{ mt: 2 }}>{feedback.message}</Alert>)}
            </Box>
        </Container>
    );
}

export default StudentForm;
