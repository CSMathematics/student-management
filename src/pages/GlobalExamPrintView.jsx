import React, { useMemo } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';

const GRADE_ORDER = [
    "Α' Γυμνασίου", "Β' Γυμνασίου", "Γ' Γυμνασίου",
    "Α' Λυκείου", "Β' Λυκείου", "Γ' Λυκείου"
];

const formatDateGreek = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const days = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];
    return `${days[date.getDay()]} ${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
};

export default function GlobalExamPrintView({ examData, allStudents, groupBy }) {
    // Flatten all events
    const allEvents = useMemo(() => {
        const events = [];
        Object.values(examData || {}).forEach(studentData => {
            const student = allStudents?.find(s => s.id === studentData.studentId);
            if (!student) return;

            (studentData.exams || []).forEach(exam => {
                if (exam.examDate) {
                    events.push({
                        type: 'Εξέταση',
                        date: exam.examDate,
                        time: '-',
                        subject: exam.subject,
                        studentName: `${student.lastName} ${student.firstName}`,
                        grade: student.grade,
                        timestamp: new Date(exam.examDate).getTime()
                    });
                }
                (exam.prepLessons || []).forEach(prep => {
                    if (prep.date) {
                        events.push({
                            type: 'Προετοιμασία',
                            date: prep.date,
                            time: `${prep.startTime || ''} - ${prep.endTime || ''}`,
                            subject: exam.subject,
                            studentName: `${student.lastName} ${student.firstName}`,
                            grade: student.grade,
                            timestamp: new Date(prep.date).getTime()
                        });
                    }
                });
            });
        });
        return events;
    }, [examData, allStudents]);

    // Grouping
    const groupedData = useMemo(() => {
        const groups = {};
        if (groupBy === 'date') {
            allEvents.forEach(ev => {
                if (!groups[ev.date]) groups[ev.date] = [];
                groups[ev.date].push(ev);
            });
            // Sort dates
            const sortedDates = Object.keys(groups).sort((a, b) => new Date(a) - new Date(b));
            
            // Sort inside each date
            sortedDates.forEach(date => {
                groups[date].sort((a, b) => {
                    // Sort by Time, then Grade, then Subject
                    if (a.time !== b.time) return a.time.localeCompare(b.time);
                    const gA = GRADE_ORDER.indexOf(a.grade);
                    const gB = GRADE_ORDER.indexOf(b.grade);
                    if (gA !== gB) return gA - gB;
                    return a.subject.localeCompare(b.subject, 'el');
                });
            });
            return { sortedKeys: sortedDates, groups };
            
        } else { // By Grade
            allEvents.forEach(ev => {
                if (!groups[ev.grade]) groups[ev.grade] = [];
                groups[ev.grade].push(ev);
            });
            
            const sortedGrades = Object.keys(groups).sort((a, b) => {
                const gA = GRADE_ORDER.indexOf(a);
                const gB = GRADE_ORDER.indexOf(b);
                if (gA === -1 && gB === -1) return a.localeCompare(b);
                if (gA === -1) return 1;
                if (gB === -1) return -1;
                return gA - gB;
            });
            
            sortedGrades.forEach(grade => {
                groups[grade].sort((a, b) => {
                    if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
                    if (a.time !== b.time) return a.time.localeCompare(b.time);
                    return a.studentName.localeCompare(b.studentName, 'el');
                });
            });
            
            return { sortedKeys: sortedGrades, groups };
        }
    }, [allEvents, groupBy]);

    if (!examData || Object.keys(examData).length === 0 || allEvents.length === 0) {
        return (
            <Box className="print-global-schedule" sx={{ display: 'none', '@media print': { display: 'block', p: 2 } }}>
                <Typography variant="h5" sx={{ textAlign: 'center', mt: 4 }}>Δεν υπάρχουν δεδομένα εξετάσεων για εκτύπωση.</Typography>
            </Box>
        );
    }

    return (
        <Box className="print-global-schedule" sx={{ display: 'none', '@media print': { display: 'block', p: 2, bgcolor: 'white', color: 'black' } }}>
            <Typography variant="h4" sx={{ textAlign: 'center', mb: 1, fontWeight: 'bold' }}>
                Πρόγραμμα Εξετάσεων & Προετοιμασίας
            </Typography>
            <Typography variant="subtitle1" sx={{ textAlign: 'center', mb: 3 }}>
                {groupBy === 'date' ? 'Ομαδοποίηση: Ανά Ημέρα' : 'Ομαδοποίηση: Ανά Τάξη'}
            </Typography>

            {groupedData.sortedKeys.map(key => {
                const events = groupedData.groups[key];
                const headerTitle = groupBy === 'date' ? formatDateGreek(key) : key;
                
                return (
                    <Box key={key} sx={{ mb: 4, breakInside: 'avoid' }}>
                        <Typography variant="h6" sx={{ backgroundColor: '#f0f0f0', p: 1, border: '1px solid #ddd', borderBottom: 'none', fontWeight: 'bold' }}>
                            {headerTitle}
                        </Typography>
                        <Table size="small" sx={{ border: '1px solid #ddd' }}>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: '#fafafa' }}>
                                    {groupBy === 'grade' && <TableCell sx={{ fontWeight: 'bold', border: '1px solid #ddd' }}>Ημερομηνία</TableCell>}
                                    <TableCell sx={{ fontWeight: 'bold', border: '1px solid #ddd' }}>Ώρα</TableCell>
                                    {groupBy === 'date' && <TableCell sx={{ fontWeight: 'bold', border: '1px solid #ddd' }}>Τάξη</TableCell>}
                                    <TableCell sx={{ fontWeight: 'bold', border: '1px solid #ddd' }}>Μάθημα</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', border: '1px solid #ddd' }}>Μαθητής</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', border: '1px solid #ddd' }}>Τύπος</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {events.map((ev, idx) => (
                                    <TableRow key={idx} sx={{ '& td': { border: '1px solid #ddd' } }}>
                                        {groupBy === 'grade' && <TableCell>{formatDateGreek(ev.date)}</TableCell>}
                                        <TableCell>{ev.time}</TableCell>
                                        {groupBy === 'date' && <TableCell>{ev.grade}</TableCell>}
                                        <TableCell>{ev.subject}</TableCell>
                                        <TableCell>{ev.studentName}</TableCell>
                                        <TableCell>{ev.type}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                );
            })}
        </Box>
    );
}
