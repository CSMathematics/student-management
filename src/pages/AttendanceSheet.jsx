// src/pages/AttendanceSheet.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
    Box, Paper, Typography, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, FormControl,
    RadioGroup, FormControlLabel, Radio, CircularProgress, Alert
} from '@mui/material';
import { Save } from '@mui/icons-material';
import { collection, doc, writeBatch, query, where, getDocs } from 'firebase/firestore';
import dayjs from 'dayjs';

// --- ΔΙΟΡΘΩΣΗ: Προσθήκη του selectedYear στα props ---
function AttendanceSheet({ db, appId, allStudents, classroom, selectedYear }) {
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

    useEffect(() => {
        const fetchAttendance = async () => {
            // --- ΔΙΟΡΘΩΣΗ: Έλεγχος για το selectedYear ---
            if (!attendanceDate || !classroom || !db || !appId || !selectedYear) {
                setAttendance({});
                setTodaysAbsences({});
                return;
            };
            setLoading(true);
            try {
                const startOfDay = dayjs(attendanceDate).startOf('day').toDate();
                const endOfDay = dayjs(attendanceDate).endOf('day').toDate();

                // --- ΔΙΟΡΘΩΣΗ: Χρήση του selectedYear στη διαδρομή ---
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
    }, [attendanceDate, classroom, db, appId, selectedYear]);

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
        // --- ΔΙΟΡΘΩΣΗ: Έλεγχος για το selectedYear ---
        if (!selectedYear) {
            setFeedback({ type: 'error', message: 'Δεν έχει επιλεγεί ακαδημαϊκό έτος.' });
            return;
        }
        setLoading(true);
        setFeedback({ type: '', message: '' });

        try {
            const batch = writeBatch(db);
            // --- ΔΙΟΡΘΩΣΗ: Χρήση του selectedYear στη διαδρομή ---
            const absencesCollectionRef = collection(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/absences`);
            const date = dayjs(attendanceDate).toDate();

            for (const studentId in attendance) {
                const status = attendance[studentId];
                const docId = `${dayjs(date).format('YYYY-MM-DD')}_${classroom.id}_${studentId}`;
                const absenceDocRef = doc(absencesCollectionRef, docId);

                if (status === 'present') {
                    batch.delete(absenceDocRef);
                } else {
                    const absenceData = {
                        studentId,
                        classroomId: classroom.id,
                        subject: classroom.subject,
                        date,
                        status,
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
