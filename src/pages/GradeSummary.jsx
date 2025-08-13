// src/pages/GradeSummary.jsx
import React, { useMemo, useState } from 'react';
import {
    Container, Paper, Typography, Box, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, CircularProgress, Accordion,
    AccordionSummary, AccordionDetails, FormControl, InputLabel, Select, MenuItem, Grid, Button
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, Print as PrintIcon, PictureAsPdf as PictureAsPdfIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const schoolYearMonths = [
    { name: 'ΣΕΠ', number: 9 }, { name: 'ΟΚΤ', number: 10 },
    { name: 'ΝΟΕ', number: 11 }, { name: 'ΔΕΚ', number: 12 },
    { name: 'ΙΑΝ', number: 1 }, { name: 'ΦΕΒ', number: 2 },
    { name: 'ΜΑΡ', number: 3 }, { name: 'ΑΠΡ', number: 4 },
    { name: 'ΜΑΙ', number: 5 }, { name: 'ΙΟΥΝ', number: 6 }
];

const writtenTypes = ['test', 'project', 'homework', 'oral'];

const calculateAverage = (grades) => {
    if (!grades || grades.length === 0) return '-';
    const sum = grades.reduce((acc, g) => acc + parseFloat(g.grade), 0);
    return (sum / grades.length).toFixed(2);
};

let robotoFontBytes = null;

const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

function GradeSummary({ allStudents, allGrades, classrooms, loading }) {
    const [expandedStudent, setExpandedStudent] = useState(null);
    const [gradeFilter, setGradeFilter] = useState('all');

    const studentData = useMemo(() => {
        if (loading) return [];

        const validMonths = new Set(schoolYearMonths.map(m => m.number));

        const studentSubjects = {};
        allStudents.forEach(student => {
            studentSubjects[student.id] = {
                ...student,
                subjects: new Set(),
            };
            const enrolled = student.enrolledClassrooms || [];
            classrooms.forEach(classroom => {
                if (enrolled.includes(classroom.id)) {
                    studentSubjects[student.id].subjects.add(classroom.subject);
                }
            });
        });

        const summary = {};
        allGrades.forEach(grade => {
            const studentId = grade.studentId;
            if (!summary[studentId]) summary[studentId] = {};
            
            const subject = grade.subject;
            if (!summary[studentId][subject]) summary[studentId][subject] = {};

            const month = dayjs(grade.date.toDate()).month() + 1;
            const monthName = schoolYearMonths.find(m => m.number === month)?.name;
            if (!monthName) return;

            if (!summary[studentId][subject][monthName]) {
                summary[studentId][subject][monthName] = { oral: [], written: [] };
            }

            const type = writtenTypes.includes(grade.type) ? 'written' : 'oral';
            summary[studentId][subject][monthName][type].push(grade);
        });

        return Object.values(studentSubjects).map(student => {
            const allGradesForStudentInSchoolYear = allGrades.filter(g =>
                g.studentId === student.id &&
                validMonths.has(dayjs(g.date.toDate()).month() + 1)
            );

            const subjectAverages = {};
            const allSubjectAveragesNumeric = [];
            const studentSubjectsArray = Array.from(student.subjects).sort();

            studentSubjectsArray.forEach(subject => {
                // --- ΔΙΟΡΘΩΣΗ 1: Ο υπολογισμός του Μ.Ο. έτους γίνεται μόνο με τους βαθμούς του συγκεκριμένου μαθήματος ---
                const gradesForSubject = allGradesForStudentInSchoolYear.filter(g => g.subject === subject);
                const avg = calculateAverage(gradesForSubject);
                subjectAverages[subject] = avg;
                if (avg !== '-') {
                    allSubjectAveragesNumeric.push(parseFloat(avg));
                }
            });

            const generalAverage = allSubjectAveragesNumeric.length > 0
                ? (allSubjectAveragesNumeric.reduce((a, b) => a + b, 0) / allSubjectAveragesNumeric.length).toFixed(2)
                : '-';

            return {
                ...student,
                subjects: studentSubjectsArray,
                grades: summary[student.id] || {},
                subjectAverages,
                generalAverage
            };
        });

    }, [allStudents, allGrades, classrooms, loading]);
    
    const filteredStudents = useMemo(() => {
        if (gradeFilter === 'all') return studentData;
        return studentData.filter(s => s.grade === gradeFilter);
    }, [studentData, gradeFilter]);

    const availableGrades = useMemo(() => {
        return [...new Set(allStudents.map(s => s.grade))].sort();
    }, [allStudents]);

    const handlePrint = () => {
        window.print();
    };

    const generatePDF = async () => {
        const doc = new jsPDF({ orientation: 'landscape' });
        
        try {
            if (!robotoFontBytes) {
                const fontUrl = 'https://raw.githubusercontent.com/googlefonts/roboto/main/src/hinted/Roboto-Regular.ttf';
                robotoFontBytes = await fetch(fontUrl).then(res => res.arrayBuffer());
            }
            const robotoBase64 = arrayBufferToBase64(robotoFontBytes);
            doc.addFileToVFS('Roboto-Regular.ttf', robotoBase64);
            doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
            doc.setFont('Roboto');
        } catch (e) {
            console.error("Font loading failed, falling back to Helvetica", e);
            doc.setFont('Helvetica');
        }

        filteredStudents.forEach((student, index) => {
            if (index > 0) {
                doc.addPage();
            }
            doc.text(`Βαθμολογία για: ${student.lastName} ${student.firstName} (${student.grade})`, 14, 20);

            const subHeaders = schoolYearMonths.flatMap(() => [
                { content: 'Προφ.', styles: { halign: 'center' } },
                { content: 'Γραπ.', styles: { halign: 'center' } }
            ]);

            const head = [
                [
                    { content: 'Μάθημα', rowSpan: 2, styles: { valign: 'middle' } },
                    ...schoolYearMonths.map(m => ({ content: m.name, colSpan: 2, styles: { halign: 'center' } })),
                    { content: 'Μ.Ο. Έτους', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } }
                ],
                subHeaders
            ];

            const body = student.subjects.map(subject => {
                const row = [subject];
                schoolYearMonths.forEach(month => {
                    const oralAvg = calculateAverage(student.grades[subject]?.[month.name]?.oral);
                    const writtenAvg = calculateAverage(student.grades[subject]?.[month.name]?.written);
                    row.push({ content: oralAvg, styles: { halign: 'center' } });
                    row.push({ content: writtenAvg, styles: { halign: 'center' } });
                });
                row.push({ content: student.subjectAverages[subject], styles: { halign: 'center', fontStyle: 'bold' } });
                return row;
            });
            
            // --- ΔΙΟΡΘΩΣΗ 2: Χρήση του foot property για τη γραμμή του γενικού Μ.Ο. ---
            const foot = [
                [
                    { content: 'Γενικός Μέσος Όρος', colSpan: schoolYearMonths.length * 2 + 1, styles: { halign: 'right', fontStyle: 'bold' } },
                    { content: student.generalAverage, styles: { halign: 'center', fontStyle: 'bold' } }
                ]
            ];
            
            autoTable(doc, {
                head: head,
                body: body,
                foot: foot,
                startY: 25,
                theme: 'grid',
                styles: { font: 'Roboto', fontStyle: 'normal' }
            });
        });

        doc.save('grade_summary.pdf');
    };

    if (loading) {
        return <Container sx={{ mt: 4, textAlign: 'center' }}><CircularProgress /></Container>;
    }

    return (
        <Container maxWidth={false} sx={{ mt: 4 }}>
            <style>
                {`
                    @media print {
                        body * { visibility: hidden; }
                        #printable-grades, #printable-grades * { visibility: visible; }
                        #printable-grades { position: absolute; left: 0; top: 0; width: 100%; }
                        .no-print { display: none !important; }
                    }
                `}
            </style>
            <Paper id="printable-grades" elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                <Box className="no-print" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                        Συγκεντρωτική Βαθμολογία
                    </Typography>
                    <Box>
                        <Button sx={{ mr: 1 }} variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint}>Εκτύπωση</Button>
                        <Button variant="contained" startIcon={<PictureAsPdfIcon />} onClick={generatePDF}>Εξαγωγή PDF</Button>
                    </Box>
                </Box>
                
                <Grid container spacing={2} sx={{ mb: 3 }} className="no-print">
                    <Grid item xs={12} sm={4}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Φίλτρο Τάξης</InputLabel>
                            <Select
                                value={gradeFilter}
                                label="Φίλτρο Τάξης"
                                onChange={(e) => setGradeFilter(e.target.value)}
                            >
                                <MenuItem value="all"><em>Όλες οι Τάξεις</em></MenuItem>
                                {availableGrades.map(grade => (
                                    <MenuItem key={grade} value={grade}>{grade}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>

                {filteredStudents.map(student => (
                    <Accordion 
                        key={student.id} 
                        expanded={expandedStudent === student.id} 
                        onChange={() => setExpandedStudent(expandedStudent === student.id ? null : student.id)}
                    >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography>{student.lastName} {student.firstName} ({student.grade})</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell rowSpan={2} sx={{ fontWeight: 'bold', verticalAlign: 'bottom' }}>Μάθημα</TableCell>
                                            {schoolYearMonths.map(month => (
                                                <TableCell key={month.name} colSpan={2} align="center" sx={{ fontWeight: 'bold', borderRight: '1px solid rgba(224, 224, 224, 1)' }}>{month.name}</TableCell>
                                            ))}
                                            <TableCell rowSpan={2} sx={{ fontWeight: 'bold', verticalAlign: 'bottom', textAlign: 'center' }}>Μ.Ο. Έτους</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            {schoolYearMonths.map(month => (
                                                <React.Fragment key={month.name}>
                                                    <TableCell align="center">Προφ.</TableCell>
                                                    <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>Γραπ.</TableCell>
                                                </React.Fragment>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {student.subjects.map(subject => (
                                            <TableRow key={subject}>
                                                <TableCell sx={{ fontWeight: 500 }}>{subject}</TableCell>
                                                {schoolYearMonths.map(month => (
                                                    <React.Fragment key={month.name}>
                                                        <TableCell align="center">
                                                            {calculateAverage(student.grades[subject]?.[month.name]?.oral)}
                                                        </TableCell>
                                                        <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>
                                                            {calculateAverage(student.grades[subject]?.[month.name]?.written)}
                                                        </TableCell>
                                                    </React.Fragment>
                                                ))}
                                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                                                    {student.subjectAverages[subject]}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            <Box sx={{ mt: 2, textAlign: 'right', pr: 1 }}>
                                <Typography variant="h6">
                                    Γενικός Μέσος Όρος: <strong>{student.generalAverage}</strong>
                                </Typography>
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                ))}
            </Paper>
        </Container>
    );
}

export default GradeSummary;
