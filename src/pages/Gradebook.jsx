// src/pages/Gradebook.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
    Box, Paper, Typography, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, CircularProgress, Alert
} from '@mui/material';
import { Save } from '@mui/icons-material';
import { collection, doc, writeBatch, query, where, getDocs } from 'firebase/firestore';

function Gradebook({ db, appId, allStudents, classroom, assignment }) {
    // --- ΑΛΛΑΓΗ: Το state κρατάει πλέον αντικείμενο με βαθμό και σχόλια ---
    const [grades, setGrades] = useState({});
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    useEffect(() => {
        const fetchExistingGrades = async () => {
            if (!assignment) return;
            setLoading(true);
            try {
                const q = query(
                    collection(db, `artifacts/${appId}/academicYears/${selectedYear}/grades`),
                    where('assignmentId', '==', assignment.id)
                );
                const snapshot = await getDocs(q);
                const gradesData = {};
                snapshot.forEach(doc => {
                    const data = doc.data();
                    gradesData[data.studentId] = {
                        grade: data.grade || '',
                        feedback: data.feedback || ''
                    };
                });
                setGrades(gradesData);
            } catch (error) {
                console.error("Error fetching existing grades:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchExistingGrades();
    }, [assignment, db, appId]);

    const studentsInClassroom = useMemo(() => {
        if (!classroom || !allStudents) return [];
        return allStudents
            .filter(student => student.enrolledClassrooms?.includes(classroom.id))
            .sort((a, b) => a.lastName.localeCompare(b.lastName));
    }, [classroom, allStudents]);

    // --- ΑΛΛΑΓΗ: Ενημερωμένη συνάρτηση για αλλαγές ---
    const handleDataChange = (studentId, field, value) => {
        let sanitizedValue = value;
        if (field === 'grade') {
            sanitizedValue = value.replace(/[^0-9,.]/g, '').replace(/[.,]/, ',');
            if (parseFloat(sanitizedValue.replace(',', '.')) > 20) return;
        }
        setGrades(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [field]: sanitizedValue
            }
        }));
    };

    const handleSaveGrades = async () => {
        if (!db || !appId || !assignment) return;
        setLoading(true);
        setFeedback({ type: '', message: '' });

        try {
            const batch = writeBatch(db);
            const gradesCollectionRef = collection(db, `artifacts/${appId}/public/data/grades`);
            
            for (const student of studentsInClassroom) {
                const studentGradeData = grades[student.id];
                if (studentGradeData && studentGradeData.grade) {
                    const gradeValue = parseFloat(String(studentGradeData.grade).replace(',', '.'));
                    const gradeData = {
                        studentId: student.id,
                        classroomId: classroom.id,
                        subject: classroom.subject,
                        grade: gradeValue,
                        // --- ΑΛΛΑΓΗ: Προσθήκη του feedback ---
                        feedback: studentGradeData.feedback || '',
                        type: assignment.type,
                        date: assignment.dueDate.toDate(),
                        assignmentId: assignment.id,
                        createdAt: new Date(),
                    };
                    const docId = `${assignment.id}_${student.id}`;
                    const gradeDocRef = doc(gradesCollectionRef, docId);
                    batch.set(gradeDocRef, gradeData, { merge: true });
                }
            }

            await batch.commit();
            setFeedback({ type: 'success', message: `Οι βαθμοί για "${assignment.title}" αποθηκεύτηκαν!` });
        } catch (error) {
            console.error("Error saving grades:", error);
            setFeedback({ type: 'error', message: 'Αποτυχία αποθήκευσης.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Typography variant="h6" color="primary.main" gutterBottom>
                Καταχώρηση Βαθμών για: {assignment.title}
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Ονοματεπώνυμο</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', width: '150px' }}>Βαθμός (0-20)</TableCell>
                            {/* --- ΑΛΛΑΓΗ: Νέα στήλη --- */}
                            <TableCell sx={{ fontWeight: 'bold' }}>Σχόλια / Ανατροφοδότηση</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {studentsInClassroom.map((student) => (
                            <TableRow key={student.id}>
                                <TableCell>{student.lastName} {student.firstName}</TableCell>
                                <TableCell>
                                    <TextField
                                        variant="outlined" size="small" fullWidth
                                        value={grades[student.id]?.grade || ''}
                                        onChange={(e) => handleDataChange(student.id, 'grade', e.target.value)}
                                    />
                                </TableCell>
                                {/* --- ΑΛΛΑΓΗ: Νέο πεδίο εισαγωγής --- */}
                                <TableCell>
                                    <TextField
                                        variant="outlined" size="small" fullWidth
                                        placeholder="Προαιρετικά σχόλια..."
                                        value={grades[student.id]?.feedback || ''}
                                        onChange={(e) => handleDataChange(student.id, 'feedback', e.target.value)}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <Box sx={{ mt: 3, textAlign: 'right' }}>
                <Button variant="contained" startIcon={<Save />} onClick={handleSaveGrades} disabled={loading}>
                    {loading ? <CircularProgress size={24} /> : 'Αποθήκευση Βαθμών'}
                </Button>
            </Box>
            {feedback.message && <Alert severity={feedback.type} sx={{ mt: 2 }}>{feedback.message}</Alert>}
        </Box>
    );
}

export default Gradebook;
