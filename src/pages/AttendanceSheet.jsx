// src/pages/AttendanceSheet.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
    Box, Paper, Typography, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, FormControl,
    RadioGroup, FormControlLabel, Radio, CircularProgress, Alert
} from '@mui/material';
import { Save } from '@mui/icons-material';
import { collection, doc, writeBatch, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import dayjs from 'dayjs';

function AttendanceSheet({ db, appId, allStudents, classroom }) {
    const [attendance, setAttendance] = useState({});
    const [attendanceDate, setAttendanceDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState({ type: '', message: '' });
    const [todaysAbsences, setTodaysAbsences] = useState({});

    const studentsInClassroom = useMemo(() => {
        if (!classroom || !allStudents) return [];
        return allStudents
            .filter(student => student.enrolledClassrooms?.includes(classroom.id))
            .sort((a, b) => a.lastName.localeCompare(b.lastName));
    }, [classroom, allStudents]);

    // --- ΑΛΛΑΓΗ: Effect #1 - Φορτώνει τις απουσίες μόνο όταν αλλάζει η ημερομηνία ή το τμήμα ---
    useEffect(() => {
        const fetchAttendance = async () => {
            if (!attendanceDate || !classroom || !db || !appId) {
                setAttendance({});
                setTodaysAbsences({});
                return;
            };
            setLoading(true);
            try {
                const startOfDay = dayjs(attendanceDate).startOf('day').toDate();
                const endOfDay = dayjs(attendanceDate).endOf('day').toDate();

                const absencesQuery = query(
                    collection(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/absences`),
                    where('classroomId', '==', classroom.id),
                    where('date', '>=', startOfDay),
                    where('date', '<=', endOfDay)
                );

                const snapshot = await getDocs(absencesQuery);
                const existingAbsences = {};
                snapshot.forEach(doc => {
                    const data = doc.data();
                    existingAbsences[data.studentId] = data.status;
                });
                setTodaysAbsences(existingAbsences);
            } catch (error) {
                console.error("Error fetching attendance:", error);
                setFeedback({ type: 'error', message: 'Σφάλμα κατά τη φόρτωση του παρουσιολογίου.' });
            } finally {
                setLoading(false);
            }
        };

        fetchAttendance();
    }, [attendanceDate, classroom, db, appId]);

    // --- ΑΛΛΑΓΗ: Effect #2 - Αρχικοποιεί τη φόρμα όταν αλλάζουν οι μαθητές ή οι σημερινές απουσίες ---
    useEffect(() => {
        const initialAttendance = {};
        studentsInClassroom.forEach(student => {
            initialAttendance[student.id] = todaysAbsences[student.id] || 'present';
        });
        setAttendance(initialAttendance);
    }, [studentsInClassroom, todaysAbsences]);


    const handleStatusChange = (studentId, status) => {
        setAttendance(prev => ({ ...prev, [studentId]: status }));
    };

    const handleSaveAttendance = async () => {
        setLoading(true);
        setFeedback({ type: '', message: '' });

        try {
            const batch = writeBatch(db);
            const absencesCollectionRef = collection(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/absences`);
            const date = dayjs(attendanceDate).toDate();

            for (const studentId in attendance) {
                const status = attendance[studentId];
                const docId = `${dayjs(date).format('YYYY-MM-DD')}_${classroom.id}_${studentId}`;
                const absenceDocRef = doc(absencesCollectionRef, docId);

                if (status === 'present') {
                    // If student is present, delete any existing absence record for that day
                    batch.delete(absenceDocRef);
                } else {
                    // If student is absent or justified, create or update the record
                    const absenceData = {
                        studentId,
                        classroomId: classroom.id,
                        subject: classroom.subject,
                        date,
                        status, // 'absent' or 'justified'
                        createdAt: new Date(),
                    };
                    batch.set(absenceDocRef, absenceData);
                }
            }

            await batch.commit();
            setFeedback({ type: 'success', message: 'Οι απουσίες αποθηκεύτηκαν με επιτυχία!' });
        } catch (error) {
            console.error("Error saving attendance:", error);
            setFeedback({ type: 'error', message: 'Αποτυχία αποθήκευσης.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Typography variant="h6" color="primary.main" gutterBottom>
                Τμήμα: {classroom.classroomName} ({classroom.subject})
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, my: 3 }}>
                <TextField
                    type="date"
                    label="Ημερομηνία"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                />
            </Box>

            {loading ? <CircularProgress /> : (
                <TableContainer component={Paper} variant="outlined">
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Ονοματεπώνυμο</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Κατάσταση</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {studentsInClassroom.map((student) => (
                                <TableRow key={student.id}>
                                    <TableCell>{student.lastName} {student.firstName}</TableCell>
                                    <TableCell>
                                        <FormControl component="fieldset">
                                            <RadioGroup
                                                row
                                                value={attendance[student.id] || 'present'}
                                                onChange={(e) => handleStatusChange(student.id, e.target.value)}
                                            >
                                                <FormControlLabel value="present" control={<Radio />} label="Παρών" />
                                                <FormControlLabel value="absent" control={<Radio />} label="Απών" />
                                                <FormControlLabel value="justified" control={<Radio />} label="Δικαιολογημένη" />
                                            </RadioGroup>
                                        </FormControl>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <Box sx={{ mt: 3, textAlign: 'right' }}>
                <Button variant="contained" startIcon={<Save />} onClick={handleSaveAttendance} disabled={loading}>
                    Αποθήκευση
                </Button>
            </Box>
            {feedback.message && <Alert severity={feedback.type} sx={{ mt: 2 }}>{feedback.message}</Alert>}
        </Box>
    );
}

export default AttendanceSheet;
