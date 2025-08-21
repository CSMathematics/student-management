// src/portals/teacher/MyGradebook.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
    Container, Paper, Typography, Box, FormControl, InputLabel, Select, MenuItem,
    List, ListItemButton, ListItemIcon, ListItemText, CircularProgress, Link, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Alert, Button
} from '@mui/material';
import { Assignment as AssignmentIcon, CheckCircleOutline as GradedIcon, Download as DownloadIcon, Save } from '@mui/icons-material';
import { collection, doc, writeBatch, query, where, getDocs } from 'firebase/firestore';
import dayjs from 'dayjs';
import { checkAndAwardBadges } from '../../services/BadgeService.js'; // --- ΝΕΑ ΕΙΣΑΓΩΓΗ ---

const assignmentTypeLabels = {
    homework: 'Εργασία',
    test: 'Διαγώνισμα',
    project: 'Project',
    oral: 'Προφορική Εξέταση'
};

function Gradebook({ db, appId, allStudents, classroom, assignment, selectedYear, submissions }) {
    const [grades, setGrades] = useState({});
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    useEffect(() => {
        const fetchExistingGrades = async () => {
            if (!assignment || !selectedYear) return;
            setLoading(true);
            try {
                const q = query(
                    collection(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/grades`),
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
    }, [assignment, db, appId, selectedYear]);


    const studentsInClassroom = useMemo(() => {
        if (!classroom || !allStudents) return [];
        return allStudents
            .filter(student => student.enrolledClassrooms?.includes(classroom.id))
            .sort((a, b) => a.lastName.localeCompare(b.lastName));
    }, [classroom, allStudents]);

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
        if (!db || !appId || !assignment || !selectedYear) return;
        setLoading(true);
        setFeedback({ type: '', message: '' });
        const studentsToCheckForBadges = new Set();

        try {
            const batch = writeBatch(db);
            const gradesCollectionRef = collection(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/grades`);
            
            for (const student of studentsInClassroom) {
                const studentGradeData = grades[student.id];
                if (studentGradeData && studentGradeData.grade) {
                    const gradeValue = parseFloat(String(studentGradeData.grade).replace(',', '.'));
                    const gradeData = {
                        studentId: student.id,
                        classroomId: classroom.id,
                        subject: classroom.subject,
                        grade: gradeValue,
                        feedback: studentGradeData.feedback || '',
                        type: assignment.type,
                        date: assignment.dueDate.toDate(),
                        assignmentId: assignment.id,
                        createdAt: new Date(),
                    };
                    const docId = `${assignment.id}_${student.id}`;
                    const gradeDocRef = doc(gradesCollectionRef, docId);
                    batch.set(gradeDocRef, gradeData, { merge: true });
                    studentsToCheckForBadges.add(student.id);
                }
            }

            await batch.commit();
            setFeedback({ type: 'success', message: `Οι βαθμοί για "${assignment.title}" αποθηκεύτηκαν!` });

            for (const studentId of studentsToCheckForBadges) {
                await checkAndAwardBadges(db, appId, selectedYear, studentId);
            }

        } catch (error) {
            console.error("Error saving grades:", error);
            setFeedback({ type: 'error', message: 'Αποτυχία αποθήκευσης.' });
        } finally {
            setLoading(false);
        }
    };
    
    const submissionsMap = useMemo(() => 
        new Map((submissions || []).map(s => [s.studentId, s])), 
    [submissions]);

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
                            <TableCell sx={{ fontWeight: 'bold' }}>Υποβολή</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', width: '150px' }}>Βαθμός (0-20)</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Σχόλια / Ανατροφοδότηση</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {studentsInClassroom.map((student) => {
                            const submission = submissionsMap.get(student.id);
                            return (
                                <TableRow key={student.id}>
                                    <TableCell>{student.lastName} {student.firstName}</TableCell>
                                    <TableCell>
                                        {submission ? (
                                            <Link href={submission.fileURL} target="_blank" rel="noopener noreferrer" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <DownloadIcon fontSize="small" />
                                                {submission.fileName}
                                            </Link>
                                        ) : (
                                            <Typography variant="caption" color="text.secondary">Δεν έχει υποβληθεί</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            variant="outlined" size="small" fullWidth
                                            value={grades[student.id]?.grade || ''}
                                            onChange={(e) => handleDataChange(student.id, 'grade', e.target.value)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            variant="outlined" size="small" fullWidth
                                            placeholder="Προαιρετικά σχόλια..."
                                            value={grades[student.id]?.feedback || ''}
                                            onChange={(e) => handleDataChange(student.id, 'feedback', e.target.value)}
                                        />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
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

function MyGradebook({ db, appId, allStudents, classrooms, allAssignments, allGrades, allSubmissions, selectedYear }) {
    const [selectedClassroomId, setSelectedClassroomId] = useState('');
    const [selectedAssignmentId, setSelectedAssignmentId] = useState('');

    const selectedClassroom = useMemo(() => {
        return classrooms.find(c => c.id === selectedClassroomId) || null;
    }, [selectedClassroomId, classrooms]);

    const assignmentsForClassroom = useMemo(() => {
        if (!selectedClassroom || !allAssignments) return [];
        return allAssignments
            .filter(a => a.classroomId === selectedClassroomId)
            .sort((a, b) => b.dueDate.toDate() - a.dueDate.toDate());
    }, [selectedClassroom, allAssignments]);

    const gradedAssignmentIds = useMemo(() => {
        if (!allGrades || !selectedClassroom) return new Set();
        const ids = new Set();
        allGrades.forEach(grade => {
            if (grade.assignmentId) {
                ids.add(grade.assignmentId);
            }
        });
        return ids;
    }, [allGrades, selectedClassroom]);

    const selectedAssignment = useMemo(() => {
        return allAssignments.find(a => a.id === selectedAssignmentId) || null;
    }, [selectedAssignmentId, allAssignments]);

    const submissionsForAssignment = useMemo(() => {
        if (!selectedAssignment || !allSubmissions) return [];
        return allSubmissions.filter(s => s.assignmentId === selectedAssignment.id);
    }, [selectedAssignment, allSubmissions]);

    useEffect(() => {
        setSelectedAssignmentId('');
    }, [selectedClassroomId]);

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    Βαθμολόγηση Αξιολογήσεων
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    Επιλέξτε τμήμα και στη συνέχεια την αξιολόγηση που θέλετε να βαθμολογήσετε.
                </Typography>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>1. Επιλογή Τμήματος</InputLabel>
                    <Select
                        value={selectedClassroomId}
                        label="1. Επιλογή Τμήματος"
                        onChange={(e) => setSelectedClassroomId(e.target.value)}
                    >
                        <MenuItem value=""><em>-- Επιλέξτε --</em></MenuItem>
                        {classrooms.map(c => (
                            <MenuItem key={c.id} value={c.id}>{c.classroomName} - {c.subject}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {selectedClassroom && (
                    <>
                        <Typography variant="h6" sx={{ mb: 1 }}>2. Επιλογή Αξιολόγησης</Typography>
                        {assignmentsForClassroom.length > 0 ? (
                            <Paper variant="outlined" sx={{ maxHeight: '200px', overflowY: 'auto', mb: 3 }}>
                                <List dense>
                                    {assignmentsForClassroom.map(assignment => (
                                        <ListItemButton
                                            key={assignment.id}
                                            selected={selectedAssignmentId === assignment.id}
                                            onClick={() => setSelectedAssignmentId(assignment.id)}
                                        >
                                            <ListItemIcon>
                                                {gradedAssignmentIds.has(assignment.id) ? <GradedIcon color="success" /> : <AssignmentIcon />}
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={`${assignment.title} (${assignmentTypeLabels[assignment.type] || assignment.type})`}
                                                secondary={`Ημερομηνία: ${dayjs(assignment.dueDate.toDate()).format('DD/MM/YYYY')}`}
                                            />
                                        </ListItemButton>
                                    ))}
                                </List>
                            </Paper>
                        ) : (
                             <Typography color="text.secondary" sx={{ p: 1, mb: 3 }}>Δεν υπάρχουν καταχωρημένες αξιολογήσεις για αυτό το τμήμα.</Typography>
                        )}
                    </>
                )}

                {selectedAssignment ? (
                    <Gradebook
                        key={selectedAssignmentId}
                        db={db}
                        appId={appId}
                        allStudents={allStudents}
                        classroom={selectedClassroom}
                        assignment={selectedAssignment}
                        selectedYear={selectedYear}
                        submissions={submissionsForAssignment}
                    />
                ) : (
                    <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary', border: '1px dashed grey', borderRadius: '4px' }}>
                        <Typography>Παρακαλώ επιλέξτε μια αξιολόγηση για να καταχωρήσετε βαθμούς.</Typography>
                    </Box>
                )}
            </Paper>
        </Container>
    );
}

export default MyGradebook;
