// src/pages/StudentReport.jsx
import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
    Container, Paper, Typography, Box, Grid, Button, TextField, Divider,
    Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import { Print as PrintIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import 'dayjs/locale/el';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.locale('el');
dayjs.extend(isBetween);

// Helper component for displaying details inside each accordion
const StatItem = ({ label, value, color }) => (
    <Box textAlign="center">
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', display: 'block' }}>
            {label}
        </Typography>
        <Typography variant="h5" sx={{ color: color || 'text.primary', fontWeight: 'bold' }}>
            {value || '-'}
        </Typography>
    </Box>
);

const schoolYearMonths = [
    { name: 'Σεπτέμβριος', number: 9 }, { name: 'Οκτώβριος', number: 10 },
    { name: 'Νοέμβριος', number: 11 }, { name: 'Δεκέμβριος', number: 12 },
    { name: 'Ιανουάριος', number: 1 }, { name: 'Φεβρουάριος', number: 2 },
    { name: 'Μάρτιος', number: 3 }, { name: 'Απρίλιος', number: 4 },
    { name: 'Μάιος', number: 5 }, { name: 'Ιούνιος', number: 6 }
];

function StudentReport({ allStudents, allGrades, allAbsences, classrooms, allAssignments, allPayments }) {
    const { studentId } = useParams();
    const [startDate, setStartDate] = useState(dayjs().subtract(3, 'month').format('YYYY-MM-DD'));
    const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));

    const student = useMemo(() => {
        return allStudents.find(s => s.id === studentId);
    }, [studentId, allStudents]);

    const enrolledClassrooms = useMemo(() => {
        if (!student || !classrooms) return [];
        return classrooms.filter(c => student.enrolledClassrooms?.includes(c.id));
    }, [student, classrooms]);

    const reportDataByClassroom = useMemo(() => {
        if (!student) return [];
        const start = dayjs(startDate).startOf('day');
        const end = dayjs(endDate).endOf('day');

        return enrolledClassrooms.map(classroom => {
            // --- ΔΙΟΡΘΩΣΗ ΕΔΩ: Προστέθηκε ο έλεγχος g.studentId === student.id ---
            const grades = allGrades
                .filter(g => g.studentId === student.id && g.classroomId === classroom.id && dayjs(g.date.toDate()).isBetween(start, end, null, '[]'))
                .sort((a, b) => b.date.toDate() - a.date.toDate());

            const absences = allAbsences
                .filter(a => a.studentId === student.id && a.classroomId === classroom.id && dayjs(a.date.toDate()).isBetween(start, end, null, '[]'))
                .sort((a, b) => b.date.toDate() - a.date.toDate());
            
            const assignments = allAssignments
                .filter(a => a.classroomId === classroom.id && dayjs(a.dueDate.toDate()).isBetween(start, end, null, '[]'))
                .sort((a, b) => b.dueDate.toDate() - a.dueDate.toDate());

            let stats = { avg: 'N/A', highest: 'N/A', lowest: 'N/A', totalAbsences: absences.length };
            if (grades.length > 0) {
                const numericGrades = grades.map(g => parseFloat(g.grade));
                stats.avg = (numericGrades.reduce((sum, g) => sum + g, 0) / numericGrades.length).toFixed(2);
                stats.highest = Math.max(...numericGrades);
                stats.lowest = Math.min(...numericGrades);
            }

            return {
                ...classroom,
                grades,
                absences,
                assignments,
                stats
            };
        });

    }, [student, enrolledClassrooms, allGrades, allAbsences, allAssignments, startDate, endDate]);

    const financialSummary = useMemo(() => {
        if (!student || !allPayments) return null;
        const monthlyFeeRaw = parseFloat(student.payment) || 0;
        const discount = parseFloat(student.debt) || 0;
        const monthlyFee = monthlyFeeRaw - (monthlyFeeRaw * (discount / 100));
        const finalFees = monthlyFee * schoolYearMonths.length;
        const totalPaid = allPayments
            .filter(p => p.studentId === student.id)
            .reduce((sum, p) => sum + p.amount, 0);
        const balance = finalFees - totalPaid;
        return { finalFees: finalFees.toFixed(2), totalPaid: totalPaid.toFixed(2), balance: balance.toFixed(2) };
    }, [student, allPayments]);

    const handlePrint = () => {
        window.print();
    };

    if (!student) {
        return <Typography>Δεν βρέθηκε ο μαθητής.</Typography>;
    }

    return (
        <>
            <style>
                {`
                    @media print {
                        body * { visibility: hidden; }
                        #printable-report, #printable-report * { visibility: visible; }
                        #printable-report { position: absolute; left: 0; top: 0; width: 100%; }
                        .no-print { display: none !important; }
                        .MuiAccordion-root { page-break-inside: avoid; }
                        .MuiPaper-root { box-shadow: none !important; border: 1px solid #ddd; }
                    }
                `}
            </style>
            <Container maxWidth="lg" sx={{ mt: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }} className="no-print">
                    <Typography variant="h4">Αναφορά Προόδου</Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                         <TextField label="Από" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
                         <TextField label="Έως" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
                         <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint}>Εκτύπωση</Button>
                    </Box>
                </Box>

                <Paper id="printable-report" elevation={0} sx={{ p: 4, border: '1px solid #ddd' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, pageBreakAfter: 'avoid' }}>
                        <Box>
                            <Typography variant="h4" component="h1" gutterBottom>{student.firstName} {student.lastName}</Typography>
                            <Typography variant="subtitle1" color="text.secondary">Αναφορά Προόδου: {dayjs(startDate).format('DD/MM/YYYY')} - {dayjs(endDate).format('DD/MM/YYYY')}</Typography>
                        </Box>
                        <Typography variant="h6" color="primary.main">Φιλομάθεια</Typography>
                    </Box>
                    
                    {financialSummary && (
                        <Paper variant="outlined" sx={{ p: 2, mb: 4 }}>
                            <Typography variant="h6" gutterBottom>Συνοπτική Οικονομική Εικόνα</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={4}><StatItem label="Σύνολο Διδάκτρων" value={`${financialSummary.finalFees} €`} /></Grid>
                                <Grid item xs={4}><StatItem label="Έχουν Πληρωθεί" value={`${financialSummary.totalPaid} €`} /></Grid>
                                <Grid item xs={4}><StatItem label="Υπόλοιπο" value={`${financialSummary.balance} €`} color={financialSummary.balance > 0 ? '#e53935' : '#43a047'} /></Grid>
                            </Grid>
                        </Paper>
                    )}

                    <Divider sx={{ mb: 3 }}><Chip label="Αναλυση Ανα Μαθημα" /></Divider>

                    {reportDataByClassroom.map((classData, index) => (
                        <Accordion key={classData.id} defaultExpanded sx={{ mb: 2 }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Box>
                                    <Typography variant="h5">{classData.subject} ({classData.classroomName})</Typography>
                                    <Typography variant="body2" color="text.secondary">Καθηγητής: {classData.teacherName || 'N/A'}</Typography>
                                </Box>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Grid container spacing={3}>
                                    <Grid item xs={12}>
                                        <Paper variant="outlined" sx={{ p: 2 }}>
                                            <Grid container spacing={2}>
                                                <Grid item xs={6} sm={3}><StatItem label="Μ.Ο. Βαθμών" value={classData.stats.avg} color="#1e88e5" /></Grid>
                                                <Grid item xs={6} sm={3}><StatItem label="Υψηλότερος" value={classData.stats.highest} color="#43a047" /></Grid>
                                                <Grid item xs={6} sm={3}><StatItem label="Χαμηλότερος" value={classData.stats.lowest} color="#e53935" /></Grid>
                                                <Grid item xs={6} sm={3}><StatItem label="Απουσίες" value={classData.stats.totalAbsences} /></Grid>
                                            </Grid>
                                        </Paper>
                                    </Grid>

                                    <Grid item xs={12} md={6}>
                                        <Typography variant="h6" gutterBottom>Βαθμολογία</Typography>
                                        {classData.grades.length > 0 ? (
                                            <TableContainer component={Paper} variant="outlined"><Table size="small"><TableHead><TableRow><TableCell>Ημ/νία</TableCell><TableCell>Τύπος</TableCell><TableCell align="right">Βαθμός</TableCell></TableRow></TableHead><TableBody>{classData.grades.map(g => (<TableRow key={g.id}><TableCell>{dayjs(g.date.toDate()).format('DD/MM')}</TableCell><TableCell>{g.type}</TableCell><TableCell align="right">{g.grade}</TableCell></TableRow>))}</TableBody></Table></TableContainer>
                                        ) : <Typography variant="body2">Δεν βρέθηκαν βαθμοί.</Typography>}
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="h6" gutterBottom>Απουσίες</Typography>
                                        {classData.absences.length > 0 ? (
                                            <TableContainer component={Paper} variant="outlined"><Table size="small"><TableHead><TableRow><TableCell>Ημ/νία</TableCell><TableCell>Κατάσταση</TableCell></TableRow></TableHead><TableBody>{classData.absences.map(a => (<TableRow key={a.id}><TableCell>{dayjs(a.date.toDate()).format('DD/MM')}</TableCell><TableCell><Chip label={a.status === 'justified' ? 'Δικ/νη' : 'Αδικ/τη'} size="small" color={a.status === 'justified' ? 'success' : 'error'}/></TableCell></TableRow>))}</TableBody></Table></TableContainer>
                                        ) : <Typography variant="body2">Καμία απουσία.</Typography>}
                                    </Grid>
                                </Grid>
                            </AccordionDetails>
                        </Accordion>
                    ))}
                    
                    <Divider sx={{ my: 4 }} />
                    
                    <Box sx={{ pageBreakBefore: 'always' }}>
                        <Typography variant="h5" gutterBottom>Γενικά Σχόλια Καθηγητών</Typography>
                        <Paper variant="outlined" sx={{ minHeight: 150, p: 2, mt: 1, overflowY: 'auto' }}>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                {student.notes || 'Δεν υπάρχουν γενικά σχόλια.'}
                            </Typography>
                        </Paper>
                    </Box>
                </Paper>
            </Container>
        </>
    );
}

export default StudentReport;
