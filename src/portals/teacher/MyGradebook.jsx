// src/portals/teacher/MyGradebook.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
    Container, Paper, Typography, Box, FormControl, InputLabel, Select, MenuItem,
    List, ListItemButton, ListItemIcon, ListItemText, CircularProgress
} from '@mui/material';
import { Assignment as AssignmentIcon, CheckCircleOutline as GradedIcon } from '@mui/icons-material';
import Gradebook from '../../pages/Gradebook.jsx';
import dayjs from 'dayjs';

const assignmentTypeLabels = {
    homework: 'Εργασία',
    test: 'Διαγώνισμα',
    project: 'Project',
    oral: 'Προφορική Εξέταση'
};

function MyGradebook({ db, appId, allStudents, classrooms, allAssignments, allGrades }) {
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
        // An assignment is considered graded for the classroom if at least one student has a grade for it.
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

    // Reset selected assignment when classroom changes
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
                        key={selectedAssignmentId} // Re-mount component on change
                        db={db}
                        appId={appId}
                        allStudents={allStudents}
                        classroom={selectedClassroom}
                        assignment={selectedAssignment} // Pass the selected assignment
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
