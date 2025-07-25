// src/pages/EditStudentForm.jsx
import React, { useState, useEffect, useMemo } from 'react'; // <-- ΔΙΟΡΘΩΣΗ: Προστέθηκε το useMemo
import {
    Box, Button, Container, Grid, Paper, Typography, TextField,
    FormControl, InputLabel, Select, MenuItem, FormGroup, FormControlLabel,
    Checkbox, IconButton, CircularProgress, Alert, ListItemText, RadioGroup, Radio, Divider
} from '@mui/material';
import { Delete, Add } from '@mui/icons-material';
import { doc, updateDoc, writeBatch, arrayUnion, arrayRemove } from 'firebase/firestore';
import { SUBJECTS_BY_GRADE_AND_CLASS, getSubjects, getSpecializations } from '../data/subjects.js';

const formatSchedule = (schedule) => {
    if (!schedule || schedule.length === 0) return 'Χωρίς πρόγραμμα';
    const dayMapping = { 'Δευτέρα': 'Δε', 'Τρίτη': 'Τρ', 'Τετάρτη': 'Τε', 'Πέμπτη': 'Πε', 'Παρασκευή': 'Πα', 'Σάββατο': 'Σα' };
    return schedule.map(slot => `${dayMapping[slot.day] || slot.day.substring(0, 2)} ${slot.startTime}-${slot.endTime}`).join(', ');
};

function EditStudentForm({ db, appId, allClassrooms, allStudents, navigateTo, studentToEdit }) {
    const [formData, setFormData] = useState(null);
    const [availableSpecializations, setAvailableSpecializations] = useState([]);
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [selectedSubjects, setSelectedSubjects] = useState([]);
    const [selectedClassrooms, setSelectedClassrooms] = useState({});
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    // Effect to populate the form when studentToEdit is available
    useEffect(() => {
        if (studentToEdit) {
            const studentData = {
                ...studentToEdit,
                parents: studentToEdit.parents && studentToEdit.parents.length > 0 
                    ? studentToEdit.parents.map(p => ({...p, id: p.id || Date.now() + Math.random()})) 
                    : [{ id: Date.now(), name: '', phones: [{ id: Date.now() + 1, value: '' }] }]
            };
            setFormData(studentData);

            const initialSubjects = new Set();
            const initialClassrooms = {};
            
            allClassrooms.forEach(classroom => {
                if (studentToEdit.enrolledClassrooms?.includes(classroom.id)) {
                    initialSubjects.add(classroom.subject);
                    initialClassrooms[classroom.subject] = classroom.id;
                }
            });

            setSelectedSubjects(Array.from(initialSubjects));
            setSelectedClassrooms(initialClassrooms);
        }
    }, [studentToEdit, allClassrooms]);

    useEffect(() => {
        if (formData) {
            const specs = getSpecializations(formData.grade);
            setAvailableSpecializations(specs);
            const subjects = getSubjects(formData.grade, formData.specialization);
            setAvailableSubjects(subjects);
        }
    }, [formData?.grade, formData?.specialization]);

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
        if(phoneIndex !== -1) {
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
        setFormData(prev => ({
            ...prev,
            parents: prev.parents.slice(0, 1)
        }));
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const originalClassroomIds = new Set(studentToEdit.enrolledClassrooms || []);
        const newClassroomIds = new Set(Object.values(selectedClassrooms));

        const classroomsToAdd = [...newClassroomIds].filter(id => !originalClassroomIds.has(id));
        const classroomsToRemove = [...originalClassroomIds].filter(id => !newClassroomIds.has(id));

        const cleanedParents = formData.parents.map(parent => ({
            name: parent.name,
            phones: parent.phones.map(p => p.value).filter(Boolean)
        })).filter(parent => parent.name);

        const studentData = { ...formData, parents: cleanedParents, enrolledClassrooms: Object.values(selectedClassrooms) };

        try {
            const batch = writeBatch(db);
            const studentRef = doc(db, `artifacts/${appId}/public/data/students`, studentToEdit.id);
            batch.update(studentRef, studentData);

            classroomsToAdd.forEach(classroomId => {
                const classroomRef = doc(db, `artifacts/${appId}/public/data/classrooms`, classroomId);
                batch.update(classroomRef, { enrolledStudents: arrayUnion(studentToEdit.id) });
            });

            classroomsToRemove.forEach(classroomId => {
                const classroomRef = doc(db, `artifacts/${appId}/public/data/classrooms`, classroomId);
                batch.update(classroomRef, { enrolledStudents: arrayRemove(studentToEdit.id) });
            });

            await batch.commit();
            setFeedback({ type: 'success', message: 'Οι αλλαγές αποθηκεύτηκαν επιτυχώς!' });
            setTimeout(() => navigateTo('studentsList'), 1500);
        } catch (error) {
            console.error("Error updating student:", error);
            setFeedback({ type: 'error', message: 'Αποτυχία ενημέρωσης.' });
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
                    <Typography variant="h5" sx={{ mb: 3 }}>Επεξεργασία Στοιχείων Μαθητή</Typography>
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
                                {parentIndex > 0 && (
                                    <Button color="error" startIcon={<Delete />} onClick={removeSecondParent}>Αφαίρεση Γονέα</Button>
                                )}
                            </Box>
                            <Grid container spacing={3}>
                                <Grid item xs={12}>
                                    <TextField fullWidth label="Ονοματεπώνυμο Γονέα" value={parent.name} onChange={(e) => handleParentNameChange(parentIndex, e)} size="small" sx={{ mb: 2 }}/>
                                </Grid>
                                <Grid item xs={12}>
                                    {parent.phones.map((phoneEntry, phoneIndex) => (
                                        <Box key={phoneEntry.id || phoneIndex} sx={{ display: 'flex', gap: '10px', mb: 2, alignItems: 'center' }}>
                                            <TextField fullWidth label={`Τηλέφωνο ${phoneIndex + 1}`} value={phoneEntry.value} onChange={(e) => handleParentPhoneChange(parentIndex, phoneEntry.id, e)} size="small" />
                                            {parent.phones.length > 1 && (<IconButton color="error" onClick={() => removeParentPhone(parentIndex, phoneEntry.id)}><Delete /></IconButton>)}
                                        </Box>
                                    ))}
                                    <Button variant="outlined" size="small" startIcon={<Add />} onClick={() => addParentPhone(parentIndex)}>Προσθήκη Τηλεφώνου</Button>
                                </Grid>
                            </Grid>
                        </Box>
                    ))}
                    {formData.parents.length < 2 && (
                        <Button variant="contained" onClick={addSecondParent} sx={{ mt: 3 }}>Προσθήκη Δεύτερου Γονέα</Button>
                    )}
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
                                    <Select name="specialization" value={formData.specialization} label="Κατεύθυνση" onChange={handleInputChange} required>
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
                                            const matching = allClassrooms.filter(c => c.grade === formData.grade && (c.specialization || '') === formData.specialization && c.subject === subject);
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
                                                                        const isCurrentlyEnrolled = studentToEdit.enrolledClassrooms?.includes(c.id);
                                                                        const isFull = enrolledCount >= c.maxStudents && !isCurrentlyEnrolled;
                                                                        return (
                                                                            <FormControlLabel key={c.id} value={c.id} disabled={isFull} control={<Radio size="small"/>}
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
                                                            ) : <Typography color="textSecondary" sx={{ pl: 1, fontStyle: 'italic' }}>Δεν υπάρχουν διαθέσιμα τμήματα.</Typography>}
                                                        </Box>
                                                    )}
                                                </Box>
                                            );
                                        })}
                                    </FormGroup>
                                ) : <Typography color="textSecondary">Επιλέξτε τάξη.</Typography>}
                            </Paper>
                        </Grid>
                    </Grid>
                </Paper>
                <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
                    <Typography variant="h5" component="h3" sx={{ mb: 3 }}>Οικονομικά</Typography>
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}><TextField fullWidth label="Δίδακτρα (€)" name="payment" type="number" value={formData.payment} onChange={handleInputChange} size="small" /></Grid>
                        <Grid item xs={12} sm={6}><TextField fullWidth label="Έκπτωση (%)" name="debt" type="number" value={formData.debt} onChange={handleInputChange} size="small" /></Grid>
                    </Grid>
                </Paper>
                <Box sx={{ mt: 3, textAlign: 'right' }}>
                    <Button variant="outlined" color="secondary" sx={{ mr: 2 }} onClick={() => navigateTo('studentsList')}>Ακύρωση</Button>
                    <Button type="submit" variant="contained" color="primary" disabled={loading}>
                        {loading ? <CircularProgress size={24} /> : 'Αποθήκευση Αλλαγών'}
                    </Button>
                </Box>
                {feedback.message && (<Alert severity={feedback.type} sx={{ mt: 2 }}>{feedback.message}</Alert>)}
            </Box>
        </Container>
    );
}

export default EditStudentForm;
