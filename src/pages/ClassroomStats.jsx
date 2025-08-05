// src/pages/ClassroomStats.jsx
import React, { useMemo } from 'react';
import { Box, Grid, Paper, Typography, CircularProgress } from '@mui/material';
import Plot from 'react-plotly.js';
import dayjs from 'dayjs';

function ClassroomStats({ selectedClassroom, allStudents, allGrades, allAbsences, classrooms }) {

    // 1. Calculate average grade over time for the selected classroom
    const averageGradeData = useMemo(() => {
        if (!selectedClassroom || !allGrades || !allStudents) return null;

        const studentIdsInClassroom = allStudents
            .filter(s => s.enrolledClassrooms?.includes(selectedClassroom.id))
            .map(s => s.id);

        const gradesForClassroom = allGrades.filter(g => studentIdsInClassroom.includes(g.studentId));

        if (gradesForClassroom.length < 2) return null;

        const gradesByDate = gradesForClassroom.reduce((acc, grade) => {
            const date = dayjs(grade.date.toDate()).format('YYYY-MM-DD');
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(parseFloat(grade.grade));
            return acc;
        }, {});

        const dates = Object.keys(gradesByDate).sort();
        const averages = dates.map(date => {
            const sum = gradesByDate[date].reduce((a, b) => a + b, 0);
            return (sum / gradesByDate[date].length).toFixed(2);
        });

        return [{
            x: dates,
            y: averages,
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Μέσος Όρος',
        }];
    }, [selectedClassroom, allStudents, allGrades]);

    // 2. Calculate absences per month
    const absencesData = useMemo(() => {
        if (!selectedClassroom || !allAbsences || !allStudents) return null;

        const studentIdsInClassroom = allStudents
            .filter(s => s.enrolledClassrooms?.includes(selectedClassroom.id))
            .map(s => s.id);
        
        const absencesForClassroom = allAbsences.filter(a => studentIdsInClassroom.includes(a.studentId));

        if (absencesForClassroom.length === 0) return null;

        const absencesByMonth = absencesForClassroom.reduce((acc, absence) => {
            const month = dayjs(absence.date.toDate()).format('MMMM YYYY');
            acc[month] = (acc[month] || 0) + 1;
            return acc;
        }, {});

        const months = Object.keys(absencesByMonth).sort((a, b) => dayjs(a, 'MMMM YYYY').valueOf() - dayjs(b, 'MMMM YYYY').valueOf());
        const counts = months.map(month => absencesByMonth[month]);

        return [{
            x: months,
            y: counts,
            type: 'bar',
            name: 'Απουσίες',
        }];
    }, [selectedClassroom, allStudents, allAbsences]);

    // 3. Compare performance with other classrooms of the same subject
    const comparisonData = useMemo(() => {
        if (!selectedClassroom || !allGrades || !allStudents || !classrooms) return null;

        const relevantClassrooms = classrooms.filter(c => c.subject === selectedClassroom.subject);
        
        if (relevantClassrooms.length < 2) return null;

        const classroomAverages = relevantClassrooms.map(classroom => {
            const studentIds = allStudents.filter(s => s.enrolledClassrooms?.includes(classroom.id)).map(s => s.id);
            const grades = allGrades.filter(g => studentIds.includes(g.studentId));
            if (grades.length === 0) return { name: classroom.classroomName, average: 0 };
            const sum = grades.reduce((acc, grade) => acc + parseFloat(grade.grade), 0);
            return { name: classroom.classroomName, average: (sum / grades.length) };
        });

        const sortedAverages = classroomAverages.sort((a, b) => b.average - a.average);

        return [{
            x: sortedAverages.map(c => c.name),
            y: sortedAverages.map(c => c.average.toFixed(2)),
            type: 'bar',
            name: 'Μ.Ο. Τμήματος',
            marker: {
                color: sortedAverages.map(c => c.name === selectedClassroom.classroomName ? '#1976d2' : '#B0BEC5')
            }
        }];
    }, [selectedClassroom, allStudents, allGrades, classrooms]);

    const chartLayout = (title) => ({
        title,
        autosize: true,
        margin: { l: 40, r: 20, b: 80, t: 40 },
        yaxis: { range: [0, 20] }
    });

    return (
        <Grid container spacing={3}>
            <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                    {averageGradeData ? (
                        <Plot data={averageGradeData} layout={chartLayout('Μέσος Όρος Τμήματος ανά Ημερομηνία')} style={{ width: '100%', height: '400px' }} useResizeHandler />
                    ) : <Typography sx={{textAlign: 'center', p: 2}}>Δεν υπάρχουν αρκετά δεδομένα βαθμολογίας για το γράφημα.</Typography>}
                </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                    {absencesData ? (
                        <Plot data={absencesData} layout={chartLayout('Απουσίες ανά Μήνα')} style={{ width: '100%', height: '400px' }} useResizeHandler />
                    ) : <Typography sx={{textAlign: 'center', p: 2}}>Δεν υπάρχουν καταχωρημένες απουσίες.</Typography>}
                </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                    {comparisonData ? (
                        <Plot data={comparisonData} layout={chartLayout(`Σύγκριση Επίδοσης - ${selectedClassroom.subject}`)} style={{ width: '100%', height: '400px' }} useResizeHandler />
                    ) : <Typography sx={{textAlign: 'center', p: 2}}>Δεν υπάρχουν άλλα τμήματα για σύγκριση.</Typography>}
                </Paper>
            </Grid>
        </Grid>
    );
}

export default ClassroomStats;
