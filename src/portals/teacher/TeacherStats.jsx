// src/portals/teacher/TeacherStats.jsx
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container, Paper, Typography, Box, Grid, List, ListItem, ListItemText,
    Avatar, ListItemAvatar, Divider, Button, useTheme as useMuiTheme
} from '@mui/material';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { BarChart as BarChartIcon, TrendingDown, WarningAmber } from '@mui/icons-material';

const StatCard = ({ title, value, icon, color }) => (
    <Paper elevation={3} sx={{ p: 2, display: 'flex', alignItems: 'center', borderRadius: '12px', height: '100%' }}>
        <Avatar sx={{ bgcolor: color, width: 56, height: 56, mr: 2 }}>{icon}</Avatar>
        <Box>
            <Typography variant="h5" component="div">{value}</Typography>
            <Typography color="text.secondary">{title}</Typography>
        </Box>
    </Paper>
);

function TeacherStats({ assignedClassrooms, studentsInClassrooms, allGrades, allAbsences }) {
    const navigate = useNavigate();
    const muiTheme = useMuiTheme();
    const isDark = muiTheme.palette.mode === 'dark';
    const gridColor = isDark ? '#444' : '#e0e0e0';
    const textColor = isDark ? '#ccc' : '#555';
    const tooltipStyle = { backgroundColor: isDark ? '#333' : '#fff', border: `1px solid ${gridColor}`, color: textColor };

    const studentIds = useMemo(() => new Set(studentsInClassrooms.map(s => s.id)), [studentsInClassrooms]);
    const relevantGrades = useMemo(() => allGrades.filter(g => studentIds.has(g.studentId)), [allGrades, studentIds]);
    const relevantAbsences = useMemo(() => allAbsences.filter(a => studentIds.has(a.studentId)), [allAbsences, studentIds]);

    const overallStats = useMemo(() => {
        const avgGrade = relevantGrades.length > 0
            ? (relevantGrades.reduce((sum, g) => sum + parseFloat(g.grade), 0) / relevantGrades.length).toFixed(2)
            : 'N/A';
        const totalAbsences = relevantAbsences.length;
        return { avgGrade, totalAbsences };
    }, [relevantGrades, relevantAbsences]);

    const comparisonData = useMemo(() => {
        const classroomAverages = assignedClassrooms.map(classroom => {
            const gradesInClass = relevantGrades.filter(g => g.classroomId === classroom.id);
            const avg = gradesInClass.length > 0
                ? (gradesInClass.reduce((sum, g) => sum + parseFloat(g.grade), 0) / gradesInClass.length)
                : 0;
            return { name: classroom.classroomName, average: parseFloat(avg.toFixed(2)) };
        });

        return classroomAverages.sort((a, b) => b.average - a.average);
    }, [assignedClassrooms, relevantGrades]);

    const studentsAtRisk = useMemo(() => {
        const studentStats = {};
        studentsInClassrooms.forEach(s => {
            studentStats[s.id] = { ...s, grades: [], absences: 0 };
        });

        relevantGrades.forEach(g => {
            if (studentStats[g.studentId]) {
                studentStats[g.studentId].grades.push(parseFloat(g.grade));
            }
        });
        relevantAbsences.forEach(a => {
            if (studentStats[a.studentId] && a.status !== 'justified') {
                studentStats[a.studentId].absences += 1;
            }
        });

        return Object.values(studentStats)
            .map(s => {
                const avg = s.grades.length > 0 ? (s.grades.reduce((a, b) => a + b, 0) / s.grades.length) : null;
                return { ...s, avgGrade: avg };
            })
            .filter(s => (s.avgGrade !== null && s.avgGrade < 12) || s.absences > 5)
            .sort((a, b) => (a.avgGrade || 21) - (b.avgGrade || 21)); // Sort by lowest grade first
    }, [studentsInClassrooms, relevantGrades, relevantAbsences]);



    return (
        <Container maxWidth={false} sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    Στατιστικά & Αναφορές
                </Typography>
                <Grid container spacing={3} sx={{ my: 2 }}>
                    <Grid item xs={12} sm={6}><StatCard title="Γενικός Μέσος Όρος" value={overallStats.avgGrade} icon={<BarChartIcon />} color="#1976d2" /></Grid>
                    <Grid item xs={12} sm={6}><StatCard title="Σύνολο Απουσιών" value={overallStats.totalAbsences} icon={<TrendingDown />} color="#f57c00" /></Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Grid container spacing={3}>
                    <Grid item xs={12} md={7}>
                        <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                             <Typography variant="h6" sx={{ mb: 2 }}>Συγκριτική Απόδοση Τμημάτων</Typography>
                            {comparisonData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={400}>
                                    <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 0, bottom: 50 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                                        <XAxis dataKey="name" tick={{ fill: textColor, fontSize: 11 }} angle={-45} textAnchor="end" />
                                        <YAxis domain={[0, 20]} tick={{ fill: textColor }} />
                                        <Tooltip contentStyle={tooltipStyle} />
                                        <Bar dataKey="average" name="Μ.Ο. Τμήματος" fill="#1976d2" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <Typography>Δεν υπάρχουν δεδομένα.</Typography>}
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={5}>
                        <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                            <Typography variant="h6" sx={{ mb: 2 }}>Μαθητές προς Υποστήριξη</Typography>
                            <List sx={{ maxHeight: 400, overflowY: 'auto' }}>
                                {studentsAtRisk.length > 0 ? studentsAtRisk.map(student => (
                                    <ListItem key={student.id} divider>
                                        <ListItemAvatar>
                                            <Avatar sx={{ bgcolor: 'warning.main' }}><WarningAmber /></Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={`${student.lastName} ${student.firstName}`}
                                            secondary={`Μ.Ο: ${student.avgGrade?.toFixed(2) || 'N/A'} | Απουσίες: ${student.absences}`}
                                        />
                                        <Button size="small" onClick={() => navigate(`/student/report/${student.id}`)}>Αναφορά</Button>
                                    </ListItem>
                                )) : <Typography>Κανένας μαθητής δεν πληροί τα κριτήρια.</Typography>}
                            </List>
                        </Paper>
                    </Grid>
                </Grid>
            </Paper>
        </Container>
    );
}

export default TeacherStats;
