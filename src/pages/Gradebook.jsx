// src/pages/Gradebook.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
    Box, Paper, Typography, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, CircularProgress, Alert
} from '@mui/material';
import { Save } from '@mui/icons-material';
import { collection, doc, writeBatch, query, where, getDocs } from 'firebase/firestore';

function Gradebook({ db, appId, allStudents, classroom, assignment }) {
    const [grades, setGrades] = useState({});
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });
    const [existingGrades, setExistingGrades] = useState(new Map());

    // Fetch existing grades for this specific assignment when it changes
    useEffect(() => {
        const fetchExistingGrades = async () => {
            if (!assignment) return;
            setLoading(true);
            try {
                const q = query(
                    collection(db, `artifacts/${appId}/public/data/grades`),
                    where('assignmentId', '==', assignment.id)
                );
                const snapshot = await getDocs(q);
                const gradesMap = new Map();
                snapshot.forEach(doc => {
                    const data = doc.data();
                    gradesMap.set(data.studentId, data.grade);
                });
                setExistingGrades(gradesMap);
                setGrades(Object.fromEntries(gradesMap)); // Pre-fill the form with existing grades
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

    const handleGradeChange = (studentId, value) => {
        const sanitizedValue = value.replace(/[^0-9,.]/g, '').replace(/[.,]/, ',');
        if (parseFloat(sanitizedValue.replace(',', '.')) > 20) return; // Limit max grade to 20
        setGrades(prev => ({
            ...prev,
            [studentId]: sanitizedValue
        }));
    };

    const handleSaveGrades = async () => {
        if (!db || !appId || !assignment) return;
        setLoading(true);
        setFeedback({ type: '', message: '' });

        try {
            const batch = writeBatch(db);
            const gradesCollectionRef = collection(db, `artifacts/${appId}/public/data/grades`);
            let gradesCount = 0;

            for (const student of studentsInClassroom) {
                const gradeValueStr = grades[student.id];
                if (gradeValueStr) {
                    gradesCount++;
                    const gradeValue = parseFloat(gradeValueStr.replace(',', '.'));
                    const gradeData = {
                        studentId: student.id,
                        classroomId: classroom.id,
                        subject: classroom.subject,
                        grade: gradeValue,
                        type: assignment.type, // Get type from assignment
                        date: assignment.dueDate.toDate(), // Get date from assignment
                        assignmentId: assignment.id, // Link the grade to the assignment
                        createdAt: new Date(),
                    };
                    const docId = `${assignment.id}_${student.id}`;
                    const gradeDocRef = doc(gradesCollectionRef, docId);
                    batch.set(gradeDocRef, gradeData, { merge: true });
                }
            }
            
            if (gradesCount === 0) {
                 setFeedback({ type: 'info', message: 'Δεν έχετε εισάγει βαθμούς.' });
                 setLoading(false);
                 return;
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
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {studentsInClassroom.map((student) => (
                            <TableRow key={student.id}>
                                <TableCell>{student.lastName} {student.firstName}</TableCell>
                                <TableCell>
                                    <TextField
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                        value={grades[student.id] || ''}
                                        onChange={(e) => handleGradeChange(student.id, e.target.value)}
                                        placeholder={existingGrades.has(student.id) ? existingGrades.get(student.id).toString() : ""}
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
