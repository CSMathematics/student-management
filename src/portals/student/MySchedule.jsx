// src/portals/student/MySchedule.jsx
import React, { useMemo } from 'react';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Container } from '@mui/material';
import dayjs from 'dayjs';
import 'dayjs/locale/el';

dayjs.locale('el');

const DAYS_OF_WEEK = ['Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];

function MySchedule({ enrolledClassrooms }) {

    const scheduleByDay = useMemo(() => {
        const schedule = {};
        DAYS_OF_WEEK.forEach(day => schedule[day] = []);

        if (enrolledClassrooms) {
            enrolledClassrooms.forEach(classroom => {
                classroom.schedule?.forEach(slot => {
                    if (schedule[slot.day]) {
                        schedule[slot.day].push({
                            ...slot,
                            subject: classroom.subject,
                            classroomName: classroom.classroomName,
                            color: classroom.color || '#1976d2'
                        });
                    }
                });
            });
        }

        // Sort lessons within each day by start time
        for (const day in schedule) {
            schedule[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
        }

        return schedule;
    }, [enrolledClassrooms]);

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    Το Εβδομαδιαίο Πρόγραμμά μου
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                    <Table>
                        <TableHead>
                            <TableRow>
                                {DAYS_OF_WEEK.map(day => (
                                    <TableCell key={day} sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                                        {day}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            <TableRow>
                                {DAYS_OF_WEEK.map(day => (
                                    <TableCell key={day} sx={{ verticalAlign: 'top', p: 1, minHeight: '300px' }}>
                                        {scheduleByDay[day].map((lesson, index) => (
                                            <Paper 
                                                key={index} 
                                                elevation={2}
                                                sx={{ 
                                                    p: 1.5, 
                                                    mb: 1,
                                                    borderLeft: `5px solid ${lesson.color}`
                                                }}
                                            >
                                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                    {lesson.startTime} - {lesson.endTime}
                                                </Typography>
                                                <Typography variant="subtitle2">
                                                    {lesson.subject}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {lesson.classroomName}
                                                </Typography>
                                            </Paper>
                                        ))}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Container>
    );
}

export default MySchedule;
