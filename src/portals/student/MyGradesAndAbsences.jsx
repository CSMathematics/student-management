// src/portals/student/MyGradesAndAbsences.jsx
import React, { useMemo } from 'react';
import {
    Container, Paper, Typography, Box, Accordion, AccordionSummary,
    AccordionDetails, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Chip
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import dayjs from 'dayjs';

function MyGradesAndAbsences({ enrolledClassrooms, grades, absences, type }) {

    const dataByClassroom = useMemo(() => {
        return enrolledClassrooms.map(classroom => {
            const classroomGrades = grades
                .filter(g => g.classroomId === classroom.id)
                .sort((a, b) => b.date.toDate() - a.date.toDate());
            
            const classroomAbsences = absences
                .filter(a => a.classroomId === classroom.id)
                .sort((a, b) => b.date.toDate() - a.date.toDate());

            return {
                ...classroom,
                grades: classroomGrades,
                absences: classroomAbsences
            };
        });
    }, [enrolledClassrooms, grades, absences]);

    const title = type === 'grades' ? 'Οι Βαθμοί μου' : 'Οι Απουσίες μου';

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    {title}
                </Typography>
                
                {dataByClassroom.map(classroom => (
                    <Accordion key={classroom.id} defaultExpanded>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6">{classroom.subject} ({classroom.classroomName})</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            {type === 'grades' ? (
                                <TableContainer component={Paper} variant="outlined">
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Ημερομηνία</TableCell>
                                                <TableCell>Τύπος</TableCell>
                                                <TableCell align="right">Βαθμός</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {classroom.grades.length > 0 ? classroom.grades.map(g => (
                                                <TableRow key={g.id}>
                                                    <TableCell>{dayjs(g.date.toDate()).format('DD/MM/YYYY')}</TableCell>
                                                    <TableCell>{g.type}</TableCell>
                                                    <TableCell align="right">{g.grade}</TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow><TableCell colSpan={3} align="center">Δεν υπάρχουν βαθμοί</TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            ) : (
                                <TableContainer component={Paper} variant="outlined">
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Ημερομηνία</TableCell>
                                                <TableCell>Κατάσταση</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {classroom.absences.length > 0 ? classroom.absences.map(a => (
                                                <TableRow key={a.id}>
                                                    <TableCell>{dayjs(a.date.toDate()).format('DD/MM/YYYY')}</TableCell>
                                                    <TableCell>
                                                        <Chip 
                                                            label={a.status === 'justified' ? 'Δικαιολογημένη' : 'Αδικαιολόγητη'} 
                                                            size="small" 
                                                            color={a.status === 'justified' ? 'success' : 'error'}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow><TableCell colSpan={2} align="center">Δεν υπάρχουν απουσίες</TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </AccordionDetails>
                    </Accordion>
                ))}
            </Paper>
        </Container>
    );
}

export default MyGradesAndAbsences;
