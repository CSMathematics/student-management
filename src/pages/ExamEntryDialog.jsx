// src/pages/ExamEntryDialog.jsx
import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
    TextField, IconButton, Grid, Divider, Chip, Paper, Select, MenuItem,
    FormControl, InputLabel, CircularProgress, Alert
} from '@mui/material';
import { Add, Delete, Close, Save, School, EventNote, AccessTime } from '@mui/icons-material';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

function ExamEntryDialog({ open, onClose, student, examData, db, appId, selectedYear, classrooms }) {
    const [exams, setExams] = useState([]);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState(null);

    // Get subjects from student's enrolled classrooms
    const studentSubjects = React.useMemo(() => {
        if (!student?.enrolledClassrooms || !classrooms) return [];
        const subjects = new Set();
        classrooms.forEach(c => {
            if (student.enrolledClassrooms.includes(c.id) && c.subject) subjects.add(c.subject);
        });
        return Array.from(subjects).sort((a, b) => a.localeCompare(b, 'el'));
    }, [student, classrooms]);

    useEffect(() => {
        if (open && examData?.exams) {
            setExams(examData.exams.map(e => ({ ...e, prepLessons: e.prepLessons ? [...e.prepLessons] : [] })));
        } else if (open) {
            setExams([]);
        }
        setFeedback(null);
    }, [open, examData]);

    const addExam = () => {
        setExams(prev => [...prev, {
            id: Date.now().toString(),
            examDate: '',
            subject: studentSubjects[0] || '',
            prepLessons: []
        }]);
    };

    const updateExam = (idx, field, value) => {
        setExams(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
    };

    const removeExam = (idx) => {
        setExams(prev => prev.filter((_, i) => i !== idx));
    };

    const addPrepLesson = (examIdx) => {
        setExams(prev => prev.map((e, i) => {
            if (i !== examIdx) return e;
            return { ...e, prepLessons: [...e.prepLessons, { id: Date.now().toString(), date: '', startTime: '', endTime: '' }] };
        }));
    };

    const updatePrepLesson = (examIdx, lessonIdx, field, value) => {
        setExams(prev => prev.map((e, i) => {
            if (i !== examIdx) return e;
            return { ...e, prepLessons: e.prepLessons.map((l, j) => j === lessonIdx ? { ...l, [field]: value } : l) };
        }));
    };

    const removePrepLesson = (examIdx, lessonIdx) => {
        setExams(prev => prev.map((e, i) => {
            if (i !== examIdx) return e;
            return { ...e, prepLessons: e.prepLessons.filter((_, j) => j !== lessonIdx) };
        }));
    };

    const handleSave = async () => {
        if (!db || !appId || !selectedYear || !student) return;
        setSaving(true);
        setFeedback(null);
        try {
            const path = `artifacts/${appId}/public/data/academicYears/${selectedYear}/examSchedule`;
            const docRef = doc(db, path, student.id);
            if (exams.length === 0) {
                await deleteDoc(docRef);
            } else {
                await setDoc(docRef, { studentId: student.id, exams, updatedAt: new Date() }, { merge: true });
            }
            setFeedback({ type: 'success', msg: 'Αποθηκεύτηκε!' });
            setTimeout(() => onClose(true), 800);
        } catch (err) {
            console.error('Error saving exam schedule:', err);
            setFeedback({ type: 'error', msg: 'Σφάλμα αποθήκευσης.' });
        } finally {
            setSaving(false);
        }
    };

    if (!student) return null;

    return (
        <Dialog open={open} onClose={() => onClose(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                <School />
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6">{student.lastName} {student.firstName}</Typography>
                    <Typography variant="caption">{student.grade} • Πρόγραμμα Εξετάσεων Ιουνίου</Typography>
                </Box>
                <IconButton onClick={() => onClose(false)} sx={{ color: 'white' }}><Close /></IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 3, pb: 1 }}>
                {exams.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                        <EventNote sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                        <Typography>Δεν έχουν οριστεί εξετάσεις. Πατήστε "Προσθήκη Εξέτασης".</Typography>
                    </Box>
                )}

                {exams.map((exam, examIdx) => (
                    <Paper key={exam.id} variant="outlined" sx={{ p: 2, mb: 2, borderRadius: '12px', borderLeft: '4px solid #667eea' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <Chip label={`Εξέταση ${examIdx + 1}`} size="small" color="primary" />
                            <Box sx={{ flexGrow: 1 }} />
                            <IconButton size="small" color="error" onClick={() => removeExam(examIdx)}><Delete fontSize="small" /></IconButton>
                        </Box>

                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Μάθημα</InputLabel>
                                    <Select value={exam.subject} label="Μάθημα" onChange={(e) => updateExam(examIdx, 'subject', e.target.value)}>
                                        {studentSubjects.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                                        <MenuItem value="__custom">Άλλο...</MenuItem>
                                    </Select>
                                </FormControl>
                                {exam.subject === '__custom' && (
                                    <TextField size="small" fullWidth label="Μάθημα (custom)" sx={{ mt: 1 }}
                                        onChange={(e) => updateExam(examIdx, 'subject', e.target.value)} />
                                )}
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth size="small" type="date" label="Ημερομηνία Εξέτασης"
                                    value={exam.examDate} onChange={(e) => updateExam(examIdx, 'examDate', e.target.value)}
                                    InputLabelProps={{ shrink: true }} />
                            </Grid>
                        </Grid>

                        {/* Prep Lessons */}
                        <Divider sx={{ my: 2 }} />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <AccessTime fontSize="small" color="action" />
                            <Typography variant="subtitle2" color="text.secondary">Μαθήματα Προετοιμασίας</Typography>
                            <Box sx={{ flexGrow: 1 }} />
                            <Button size="small" startIcon={<Add />} onClick={() => addPrepLesson(examIdx)}>Προσθήκη</Button>
                        </Box>

                        {exam.prepLessons.length === 0 && (
                            <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic', display: 'block', ml: 1 }}>
                                Δεν έχουν οριστεί μαθήματα προετοιμασίας
                            </Typography>
                        )}

                        {exam.prepLessons.map((lesson, lessonIdx) => (
                            <Box key={lesson.id} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center', pl: 1 }}>
                                <Chip label={lessonIdx + 1} size="small" variant="outlined" sx={{ minWidth: 28 }} />
                                <TextField size="small" type="date" label="Ημ/νία" value={lesson.date}
                                    onChange={(e) => updatePrepLesson(examIdx, lessonIdx, 'date', e.target.value)}
                                    InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
                                <TextField size="small" type="time" label="Από" value={lesson.startTime}
                                    onChange={(e) => updatePrepLesson(examIdx, lessonIdx, 'startTime', e.target.value)}
                                    InputLabelProps={{ shrink: true }} sx={{ width: 120 }} />
                                <TextField size="small" type="time" label="Έως" value={lesson.endTime}
                                    onChange={(e) => updatePrepLesson(examIdx, lessonIdx, 'endTime', e.target.value)}
                                    InputLabelProps={{ shrink: true }} sx={{ width: 120 }} />
                                <IconButton size="small" color="error" onClick={() => removePrepLesson(examIdx, lessonIdx)}>
                                    <Delete fontSize="small" />
                                </IconButton>
                            </Box>
                        ))}
                    </Paper>
                ))}

                <Button fullWidth variant="outlined" startIcon={<Add />} onClick={addExam}
                    sx={{ borderStyle: 'dashed', borderRadius: '12px', py: 1.5, mt: 1 }}>
                    Προσθήκη Εξέτασης
                </Button>

                {feedback && <Alert severity={feedback.type} sx={{ mt: 2 }}>{feedback.msg}</Alert>}
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={() => onClose(false)}>Ακύρωση</Button>
                <Button variant="contained" startIcon={saving ? <CircularProgress size={18} /> : <Save />}
                    onClick={handleSave} disabled={saving}>
                    {saving ? 'Αποθήκευση...' : 'Αποθήκευση'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default ExamEntryDialog;
