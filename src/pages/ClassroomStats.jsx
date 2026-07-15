// src/pages/ClassroomStats.jsx
import React, { useMemo } from 'react';
import { Box, Grid, Paper, Typography, useTheme as useMuiTheme } from '@mui/material';
import {
    ResponsiveContainer, LineChart, BarChart, Line, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell
} from 'recharts';
import dayjs from 'dayjs';

function ClassroomStats({ selectedClassroom, allStudents, allGrades, allAbsences, classrooms }) {
    const muiTheme = useMuiTheme();
    const isDark = muiTheme.palette.mode === 'dark';
    const gridColor = isDark ? '#444' : '#e0e0e0';
    const textColor = isDark ? '#ccc' : '#555';
    const tooltipStyle = { backgroundColor: isDark ? '#333' : '#fff', border: `1px solid ${gridColor}`, color: textColor };

    // 1. Average grade over time
    const averageGradeData = useMemo(() => {
        if (!selectedClassroom || !allGrades || !allStudents) return [];
        const studentIds = new Set(allStudents.filter(s => s.enrolledClassrooms?.includes(selectedClassroom.id)).map(s => s.id));
        const gradesForClassroom = allGrades.filter(g => studentIds.has(g.studentId));
        if (gradesForClassroom.length < 2) return [];
        const byDate = {};
        gradesForClassroom.forEach(grade => {
            const date = dayjs(grade.date.toDate()).format('DD/MM/YY');
            if (!byDate[date]) byDate[date] = [];
            byDate[date].push(parseFloat(grade.grade));
        });
        return Object.entries(byDate)
            .sort(([a], [b]) => dayjs(a, 'DD/MM/YY').valueOf() - dayjs(b, 'DD/MM/YY').valueOf())
            .map(([date, grades]) => ({ date, avg: parseFloat((grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2)) }));
    }, [selectedClassroom, allStudents, allGrades]);

    // 2. Absences per month
    const absencesData = useMemo(() => {
        if (!selectedClassroom || !allAbsences || !allStudents) return [];
        const studentIds = new Set(allStudents.filter(s => s.enrolledClassrooms?.includes(selectedClassroom.id)).map(s => s.id));
        const absencesForClassroom = allAbsences.filter(a => studentIds.has(a.studentId));
        if (absencesForClassroom.length === 0) return [];
        const byMonth = {};
        absencesForClassroom.forEach(absence => {
            const month = dayjs(absence.date.toDate()).format('MMM YYYY');
            byMonth[month] = (byMonth[month] || 0) + 1;
        });
        return Object.entries(byMonth)
            .sort(([a], [b]) => dayjs(a, 'MMM YYYY').valueOf() - dayjs(b, 'MMM YYYY').valueOf())
            .map(([month, count]) => ({ month, count }));
    }, [selectedClassroom, allStudents, allAbsences]);

    // 3. Comparison with other classrooms
    const comparisonData = useMemo(() => {
        if (!selectedClassroom || !allGrades || !allStudents || !classrooms) return [];
        const relevant = classrooms.filter(c => c.subject === selectedClassroom.subject);
        if (relevant.length < 2) return [];
        return relevant.map(classroom => {
            const studentIds = allStudents.filter(s => s.enrolledClassrooms?.includes(classroom.id)).map(s => s.id);
            const grades = allGrades.filter(g => studentIds.includes(g.studentId));
            const avg = grades.length > 0 ? grades.reduce((acc, g) => acc + parseFloat(g.grade), 0) / grades.length : 0;
            return { name: classroom.classroomName, avg: parseFloat(avg.toFixed(2)), isSelected: classroom.id === selectedClassroom.id };
        }).sort((a, b) => b.avg - a.avg);
    }, [selectedClassroom, allStudents, allGrades, classrooms]);

    const EmptyMsg = ({ msg }) => <Typography sx={{ textAlign: 'center', p: 3, color: 'text.secondary' }}>{msg}</Typography>;

    return (
        <Grid container spacing={3}>
            <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>Μέσος Όρος Τμήματος ανά Ημερομηνία</Typography>
                    {averageGradeData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={320}>
                            <LineChart data={averageGradeData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                                <XAxis dataKey="date" tick={{ fill: textColor, fontSize: 12 }} />
                                <YAxis domain={[0, 20]} tick={{ fill: textColor, fontSize: 12 }} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Legend wrapperStyle={{ color: textColor }} />
                                <Line type="monotone" dataKey="avg" name="Μέσος Όρος" stroke="#8884d8" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : <EmptyMsg msg="Δεν υπάρχουν αρκετά δεδομένα βαθμολογίας για το γράφημα." />}
                </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>Απουσίες ανά Μήνα</Typography>
                    {absencesData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={absencesData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                                <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 11 }} angle={-30} textAnchor="end" />
                                <YAxis allowDecimals={false} tick={{ fill: textColor, fontSize: 12 }} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Bar dataKey="count" name="Απουσίες" fill="#ff7f7f" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <EmptyMsg msg="Δεν υπάρχουν καταχωρημένες απουσίες." />}
                </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>Σύγκριση Επίδοσης — {selectedClassroom.subject}</Typography>
                    {comparisonData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={comparisonData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                                <XAxis dataKey="name" tick={{ fill: textColor, fontSize: 11 }} angle={-30} textAnchor="end" />
                                <YAxis domain={[0, 20]} tick={{ fill: textColor, fontSize: 12 }} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Bar dataKey="avg" name="Μ.Ο. Τμήματος" radius={[4, 4, 0, 0]}>
                                    {comparisonData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.isSelected ? '#1976d2' : '#B0BEC5'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <EmptyMsg msg="Δεν υπάρχουν άλλα τμήματα για σύγκριση." />}
                </Paper>
            </Grid>
        </Grid>
    );
}

export default ClassroomStats;
