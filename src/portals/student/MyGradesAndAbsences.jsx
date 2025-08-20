// src/portals/student/MyGradesAndAbsences.jsx
import React, { useMemo } from 'react';
import {
    Container, Paper, Typography, Box, Accordion, AccordionSummary,
    AccordionDetails, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Chip, Grid, Avatar
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, BarChart, Star, Functions } from '@mui/icons-material';
import dayjs from 'dayjs';
import StudentProgressChart from '../../pages/StudentProgressChart.jsx'; // Επαναχρησιμοποιούμε το γράφημα

const StatCard = ({ title, value, icon, color }) => (
    <Paper elevation={3} sx={{ p: 2, display: 'flex', alignItems: 'center', borderRadius: '12px', height: '100%' }}>
        <Avatar sx={{ bgcolor: color, width: 56, height: 56, mr: 2 }}>{icon}</Avatar>
        <Box>
            <Typography variant="h5" component="div">{value}</Typography>
            <Typography color="text.secondary">{title}</Typography>
        </Box>
    </Paper>
);

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

    // --- ΝΕΑ ΛΟΓΙΚΗ: Υπολογισμός συνολικών στατιστικών ---
    const overallStats = useMemo(() => {
        if (!grades || grades.length === 0) {
            return { avg: 'N/A', count: 0, bestSubject: 'N/A' };
        }
        
        const totalSum = grades.reduce((sum, g) => sum + parseFloat(g.grade), 0);
        const avg = (totalSum / grades.length).toFixed(2);

        const gradesBySubject = {};
        grades.forEach(g => {
            if (!gradesBySubject[g.subject]) {
                gradesBySubject[g.subject] = [];
            }
            gradesBySubject[g.subject].push(parseFloat(g.grade));
        });

        let bestSubject = 'N/A';
        let highestAvg = 0;
        for (const subject in gradesBySubject) {
            const subjectSum = gradesBySubject[subject].reduce((a, b) => a + b, 0);
            const subjectAvg = subjectSum / gradesBySubject[subject].length;
            if (subjectAvg > highestAvg) {
                highestAvg = subjectAvg;
                bestSubject = subject;
            }
        }

        return { avg, count: grades.length, bestSubject };
    }, [grades]);

    const title = type === 'grades' ? 'Οι Βαθμοί & η Πρόοδός μου' : 'Οι Απουσίες μου';

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    {title}
                </Typography>
                
                {/* --- ΝΕΑ ΠΡΟΣΘΗΚΗ: Ενότητα Στατιστικών & Γραφήματος (εμφανίζεται μόνο για τους βαθμούς) --- */}
                {type === 'grades' && (
                    <Box sx={{ my: 4 }}>
                        <Grid container spacing={3}>
                            <Grid item xs={12} sm={4}><StatCard title="Γενικός Μ.Ο." value={overallStats.avg} icon={<Functions />} color="#1976d2" /></Grid>
                            <Grid item xs={12} sm={4}><StatCard title="Σύνολο Βαθμών" value={overallStats.count} icon={<BarChart />} color="#388e3c" /></Grid>
                            <Grid item xs={12} sm={4}><StatCard title="Καλύτερο Μάθημα" value={overallStats.bestSubject} icon={<Star />} color="#f57c00" /></Grid>
                        </Grid>
                        <Box sx={{ mt: 4 }}>
                             <Typography variant="h5" sx={{ mb: 2 }}>Γράφημα Προόδου</Typography>
                             <StudentProgressChart studentGrades={grades} />
                        </Box>
                    </Box>
                )}

                <Typography variant="h5" sx={{ mt: type === 'grades' ? 5 : 0, mb: 2 }}>Αναλυτική Προβολή</Typography>
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
                                                <TableCell>Σχόλια Καθηγητή</TableCell>
                                                <TableCell align="right">Βαθμός</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {classroom.grades.length > 0 ? classroom.grades.map(g => (
                                                <TableRow key={g.id}>
                                                    <TableCell>{dayjs(g.date.toDate()).format('DD/MM/YYYY')}</TableCell>
                                                    <TableCell>{g.type}</TableCell>
                                                    <TableCell sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                                                        {g.feedback || '-'}
                                                    </TableCell>
                                                    <TableCell align="right">{g.grade}</TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow><TableCell colSpan={4} align="center">Δεν υπάρχουν βαθμοί</TableCell></TableRow>
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
