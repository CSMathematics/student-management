// src/pages/Gradebook.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
    Box, Paper, Typography, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, FormControl,
    InputLabel, Select, MenuItem, CircularProgress, Alert
} from '@mui/material';
import { Save } from '@mui/icons-material';
import { collection, doc, writeBatch } from 'firebase/firestore';

// --- ΑΛΛΑΓΗ: Το component δέχεται το classroom ως prop ---
function Gradebook({ db, appId, allStudents, classroom }) {
    const [grades, setGrades] = useState({});
    const [assessmentType, setAssessmentType] = useState('Διαγώνισμα');
    const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    // --- ΑΛΛΑΓΗ: Κάθε φορά που αλλάζει το τμήμα, καθαρίζουμε τη φόρμα ---
    useEffect(() => {
        setGrades({});
        setFeedback({ type: '', message: '' });
        setAssessmentType('Διαγώνισμα');
        setAssessmentDate(new Date().toISOString().split('T')[0]);
    }, [classroom]);


    const studentsInClassroom = useMemo(() => {
        if (!classroom || !allStudents) return [];
        return allStudents
            .filter(student => student.enrolledClassrooms?.includes(classroom.id))
            .sort((a, b) => a.lastName.localeCompare(b.lastName));
    }, [classroom, allStudents]);

    const handleGradeChange = (studentId, value) => {
        const sanitizedValue = value.replace(/[^0-9,.]/g, '').replace(/[.,]/, ',');
        setGrades(prev => ({
            ...prev,
            [studentId]: sanitizedValue
        }));
    };

    const handleSaveGrades = async () => {
        if (!db || !appId) {
            setFeedback({ type: 'error', message: 'Η σύνδεση με τη βάση δεδομένων απέτυχε.' });
            return;
        }
        setLoading(true);
        setFeedback({ type: '', message: '' });

        try {
            const batch = writeBatch(db);
            const gradesCollectionRef = collection(db, `artifacts/${appId}/public/data/grades`);
            let gradesCount = 0;

            for (const student of studentsInClassroom) {
                const gradeValue = grades[student.id];
                if (gradeValue) {
                    gradesCount++;
                    const gradeData = {
                        studentId: student.id,
                        studentName: `${student.firstName} ${student.lastName}`,
                        classroomId: classroom.id,
                        classroomName: classroom.classroomName,
                        subject: classroom.subject,
                        grade: parseFloat(gradeValue.replace(',', '.')),
                        type: assessmentType,
                        date: new Date(assessmentDate),
                        createdAt: new Date(),
                    };
                    const gradeDocRef = doc(gradesCollectionRef);
                    batch.set(gradeDocRef, gradeData);
                }
            }
            
            if (gradesCount === 0) {
                 setFeedback({ type: 'info', message: 'Δεν έχετε εισάγει βαθμούς για αποθήκευση.' });
                 setLoading(false);
                 return;
            }

            await batch.commit();
            setFeedback({ type: 'success', message: `Αποθηκεύτηκαν ${gradesCount} βαθμοί με επιτυχία!` });
            setGrades({}); // Καθαρίζουμε τη φόρμα μετά την επιτυχία

        } catch (error) {
            console.error("Error saving grades:", error);
            setFeedback({ type: 'error', message: 'Αποτυχία αποθήκευσης. Παρακαλώ δοκιμάστε ξανά.' });
        } finally {
            setLoading(false);
        }
    };

    if (!classroom) {
        return <Typography>Σφάλμα: Δεν βρέθηκε τμήμα.</Typography>;
    }

    return (
        <Box>
            <Typography variant="h6" color="primary.main" gutterBottom>
                Τμήμα: {classroom.classroomName} ({classroom.subject})
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, my: 3, flexWrap: 'wrap' }}>
                <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>Τύπος Αξιολόγησης</InputLabel>
                    <Select value={assessmentType} label="Τύπος Αξιολόγησης" onChange={(e) => setAssessmentType(e.target.value)}>
                        <MenuItem value="Διαγώνισμα">Διαγώνισμα</MenuItem>
                        <MenuItem value="Εργασία">Εργασία</MenuItem>
                        <MenuItem value="Προφορικά">Προφορικά</MenuItem>
                        <MenuItem value="Συμμετοχή">Συμμετοχή</MenuItem>
                    </Select>
                </FormControl>
                <TextField
                    type="date"
                    label="Ημερομηνία"
                    value={assessmentDate}
                    onChange={(e) => setAssessmentDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                />
            </Box>

            <TableContainer component={Paper} variant="outlined">
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Επώνυμο</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Όνομα</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', width: '150px' }}>Βαθμός (0-20)</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {studentsInClassroom.map((student) => (
                            <TableRow key={student.id}>
                                <TableCell>{student.lastName}</TableCell>
                                <TableCell>{student.firstName}</TableCell>
                                <TableCell>
                                    <TextField
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                        value={grades[student.id] || ''}
                                        onChange={(e) => handleGradeChange(student.id, e.target.value)}
                                        inputProps={{ maxLength: 5 }}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box sx={{ mt: 3, textAlign: 'right' }}>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Save />}
                    onClick={handleSaveGrades}
                    disabled={loading}
                >
                    {loading ? <CircularProgress size={24} /> : 'Αποθήκευση Βαθμών'}
                </Button>
            </Box>
            {feedback.message && (
                <Alert severity={feedback.type} sx={{ mt: 2 }}>
                    {feedback.message}
                </Alert>
            )}
        </Box>
    );
}

export default Gradebook;
