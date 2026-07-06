// src/pages/ExamSchedule.jsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Box, Container, Paper, Typography, Grid, FormControl, InputLabel, Select, MenuItem,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    CircularProgress, Chip, TextField, InputAdornment, IconButton, Button, Tooltip,
    Collapse, Avatar, Badge
} from '@mui/material';
import {
    Search, Clear, ExpandMore, ExpandLess, School, Groups, CalendarMonth,
    Print, FilterList, EventNote, Edit, AccessTime
} from '@mui/icons-material';
import { collection, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import ExamEntryDialog from './ExamEntryDialog.jsx';
import StudentExamPrintView from './StudentExamPrintView.jsx';
import GlobalExamPrintView from './GlobalExamPrintView.jsx';
import { Dialog, DialogTitle, DialogContent, DialogActions, Radio, RadioGroup, FormControlLabel, FormLabel } from '@mui/material';

const GRADE_ORDER = [
    "Α' Γυμνασίου", "Β' Γυμνασίου", "Γ' Γυμνασίου",
    "Α' Λυκείου", "Β' Λυκείου", "Γ' Λυκείου"
];

const GRADE_COLORS = {
    "Α' Γυμνασίου": { bg: '#e3f2fd', color: '#1565c0', chip: '#1976d2' },
    "Β' Γυμνασίου": { bg: '#e8f5e9', color: '#2e7d32', chip: '#388e3c' },
    "Γ' Γυμνασίου": { bg: '#fff3e0', color: '#e65100', chip: '#ef6c00' },
    "Α' Λυκείου": { bg: '#f3e5f5', color: '#6a1b9a', chip: '#7b1fa2' },
    "Β' Λυκείου": { bg: '#fce4ec', color: '#c62828', chip: '#d32f2f' },
    "Γ' Λυκείου": { bg: '#e0f2f1', color: '#00695c', chip: '#00897b' },
};
const DEFAULT_COLOR = { bg: '#f5f5f5', color: '#616161', chip: '#757575' };

const formatDate = (d) => {
    if (!d) return '';
    const parts = d.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return d;
};

// ──────────────────────────────────────────────
// Memoized StudentRow – re-renders only when its
// own data (student, exams, subjects, colors) changes
// ──────────────────────────────────────────────
const StudentRow = React.memo(function StudentRow({ student, idx, subjects, exams, colors, onEdit, onPrint, onDateChange }) {
    const hasExams = exams.length > 0;

    return (
        <TableRow sx={{
            '&:nth-of-type(odd)': { backgroundColor: '#fafafa' },
            '&:hover': { backgroundColor: colors.bg + '60' },
            transition: 'background 0.15s ease',
        }}>
            <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>{idx + 1}</Typography>
            </TableCell>
            <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar src={student.profileImageUrl} sx={{
                        width: 30, height: 30, backgroundColor: colors.chip + '30', color: colors.color, fontSize: '0.75rem',
                        '@media print': { display: 'none' }
                    }}>
                        {student.firstName?.charAt(0)}{student.lastName?.charAt(0)}
                    </Avatar>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {student.lastName} {student.firstName}
                    </Typography>
                </Box>
            </TableCell>
            <TableCell>
                <Typography variant="body2">{student.studentPhone || '-'}</Typography>
            </TableCell>
            <TableCell>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {subjects.map(subj => {
                        const existingExam = exams.find(e => e.subject === subj);
                        return (
                            <Box key={subj} sx={{
                                display: 'flex', alignItems: 'center', gap: 1,
                                backgroundColor: existingExam?.examDate ? colors.chip + '15' : '#f5f5f5',
                                p: 0.5, pr: 1, borderRadius: 1,
                                border: `1px solid ${existingExam?.examDate ? colors.chip + '40' : '#e0e0e0'}`
                            }}>
                                <Typography variant="caption" sx={{ fontWeight: 500, color: existingExam?.examDate ? colors.color : 'text.secondary', pl: 0.5 }}>
                                    {subj}:
                                </Typography>
                                <TextField
                                    type="date"
                                    size="small"
                                    variant="standard"
                                    value={existingExam?.examDate || ''}
                                    onChange={(e) => onDateChange(student.id, subj, e.target.value)}
                                    InputProps={{ disableUnderline: true, sx: { fontSize: '0.8rem', height: 24, padding: 0 } }}
                                />
                            </Box>
                        );
                    })}
                    {subjects.length === 0 && <Typography variant="caption" color="text.disabled">Δεν βρέθηκαν μαθήματα</Typography>}
                </Box>
            </TableCell>
            <TableCell>
                {hasExams ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {exams.map((ex) =>
                            (ex.prepLessons || []).map((l, j) => (
                                <Chip key={`${ex.id}-${j}`}
                                    label={`${ex.subject}: ${formatDate(l.date)} ${l.startTime}-${l.endTime}`}
                                    size="small"
                                    icon={<AccessTime sx={{ fontSize: '14px !important' }} />}
                                    sx={{
                                        justifyContent: 'flex-start', height: 24, fontSize: '0.7rem',
                                        backgroundColor: '#f5f5f5', color: '#555',
                                        border: '1px solid #e0e0e0',
                                    }} />
                            ))
                        )}
                        {exams.every(ex => !ex.prepLessons || ex.prepLessons.length === 0) && (
                            <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>—</Typography>
                        )}
                    </Box>
                ) : (
                    <Typography variant="caption" color="text.disabled">—</Typography>
                )}
            </TableCell>
            <TableCell align="center" sx={{ '@media print': { display: 'none' } }}>
                <Tooltip title="Εκτύπωση Προγράμματος Μαθητή">
                    <IconButton size="small" color="secondary" onClick={() => onPrint(student)} sx={{ mr: 1 }}>
                        <Print fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Λεπτομερής Επεξεργασία (Προετοιμασία, κλπ)">
                    <IconButton size="small" color="primary" onClick={() => onEdit(student)}>
                        <Edit fontSize="small" />
                    </IconButton>
                </Tooltip>
            </TableCell>
        </TableRow>
    );
});

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────
function ExamSchedule({ allStudents, classrooms, allCourses, loading, db, appId, selectedYear }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGrade, setSelectedGrade] = useState('');
    const [expandedGrades, setExpandedGrades] = useState({});
    const [examScheduleData, setExamScheduleData] = useState({});
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogStudent, setDialogStudent] = useState(null);
    const [printDialogOpen, setPrintDialogOpen] = useState(false);
    const [printStudent, setPrintStudent] = useState(null);
    
    const [globalPrintDialogOpen, setGlobalPrintDialogOpen] = useState(false);
    const [globalPrintGroupBy, setGlobalPrintGroupBy] = useState('date');

    // Listen to examSchedule collection
    useEffect(() => {
        if (!db || !appId || !selectedYear) return;
        const path = `artifacts/${appId}/public/data/academicYears/${selectedYear}/examSchedule`;
        const unsub = onSnapshot(collection(db, path), (snap) => {
            const data = {};
            snap.docs.forEach(d => { data[d.id] = { id: d.id, ...d.data() }; });
            setExamScheduleData(data);
        }, (err) => { console.error('Error fetching examSchedule:', err); });
        return () => unsub();
    }, [db, appId, selectedYear]);

    // ── Pre-compute: classroom lookup by id ──
    const classroomById = useMemo(() => {
        const map = {};
        (classrooms || []).forEach(c => { map[c.id] = c; });
        return map;
    }, [classrooms]);

    // ── Pre-compute: subjects per student ──
    const studentSubjectsMap = useMemo(() => {
        const map = {};
        (allStudents || []).forEach(s => {
            if (!s?.id) return;
            const subjectsSet = new Set();
            (s.enrolledClassrooms || []).forEach(cId => {
                const c = classroomById[cId];
                if (c?.subject) subjectsSet.add(c.subject);
            });
            map[s.id] = Array.from(subjectsSet).sort((a, b) => a.localeCompare(b, 'el'));
        });
        return map;
    }, [allStudents, classroomById]);

    // ── Group students by grade (sorted) ──
    const studentsByGrade = useMemo(() => {
        const groups = {};
        (allStudents || []).forEach(s => {
            if (!s?.grade) return;
            if (!groups[s.grade]) groups[s.grade] = [];
            groups[s.grade].push(s);
        });
        Object.values(groups).forEach(arr =>
            arr.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || '', 'el') || (a.firstName || '').localeCompare(b.firstName || '', 'el'))
        );
        return groups;
    }, [allStudents]);

    // ── Sorted grades ──
    const sortedGrades = useMemo(() =>
        Object.keys(studentsByGrade).sort((a, b) => {
            const iA = GRADE_ORDER.indexOf(a), iB = GRADE_ORDER.indexOf(b);
            if (iA === -1 && iB === -1) return a.localeCompare(b, 'el');
            if (iA === -1) return 1;
            if (iB === -1) return -1;
            return iA - iB;
        }), [studentsByGrade]);

    // ── Filter students by search term ──
    const filteredByGrade = useMemo(() => {
        if (!searchTerm) return studentsByGrade;
        const t = searchTerm.toLowerCase();
        const f = {};
        Object.entries(studentsByGrade).forEach(([g, students]) => {
            const m = students.filter(s =>
                (s.lastName || '').toLowerCase().includes(t) ||
                (s.firstName || '').toLowerCase().includes(t)
            );
            if (m.length > 0) f[g] = m;
        });
        return f;
    }, [studentsByGrade, searchTerm]);

    const displayGrades = useMemo(() =>
        selectedGrade ? sortedGrades.filter(g => g === selectedGrade) : sortedGrades,
        [sortedGrades, selectedGrade]
    );

    const totalStudents = useMemo(() =>
        Object.values(filteredByGrade).reduce((s, a) => s + a.length, 0),
        [filteredByGrade]
    );

    // ── Stable callbacks (useCallback) ──
    const toggleGrade = useCallback((g) =>
        setExpandedGrades(p => ({ ...p, [g]: !p[g] })), []);

    const expandAll = useCallback(() => {
        setExpandedGrades(prev => {
            const e = { ...prev };
            displayGrades.forEach(g => { e[g] = true; });
            return e;
        });
    }, [displayGrades]);

    const collapseAll = useCallback(() => setExpandedGrades({}), []);

    const openDialog = useCallback((student) => {
        setDialogStudent(student);
        setDialogOpen(true);
    }, []);

    const closeDialog = useCallback(() => {
        setDialogOpen(false);
        setDialogStudent(null);
    }, []);

    const openPrintDialog = useCallback((student) => {
        setPrintStudent(student);
        setPrintDialogOpen(true);
    }, []);

    const closePrintDialog = useCallback(() => {
        setPrintDialogOpen(false);
        setPrintStudent(null);
    }, []);

    const openGlobalPrintDialog = useCallback(() => {
        setGlobalPrintDialogOpen(true);
    }, []);

    const closeGlobalPrintDialog = useCallback(() => {
        setGlobalPrintDialogOpen(false);
    }, []);

    const handleExecuteGlobalPrint = useCallback(() => {
        setGlobalPrintDialogOpen(false);
        setTimeout(() => {
            window.print();
        }, 100);
    }, []);

    const handleInlineDateChange = useCallback(async (studentId, subject, newDate) => {
        if (!db || !appId || !selectedYear) return;

        setExamScheduleData(prevData => {
            const currentExams = [...(prevData[studentId]?.exams || [])];
            const existingIdx = currentExams.findIndex(e => e.subject === subject);

            let newExams;
            if (existingIdx >= 0) {
                newExams = currentExams.map((e, i) => i === existingIdx ? { ...e, examDate: newDate } : e);
            } else {
                if (!newDate) return prevData;
                newExams = [...currentExams, { id: Date.now().toString(), subject, examDate: newDate, prepLessons: [] }];
            }

            // Optimistic update
            const updatedData = {
                ...prevData,
                [studentId]: { ...(prevData[studentId] || {}), id: studentId, studentId, exams: newExams }
            };

            // Fire-and-forget save to Firebase outside the render cycle
            setTimeout(() => {
                const path = `artifacts/${appId}/public/data/academicYears/${selectedYear}/examSchedule`;
                setDoc(doc(db, path, studentId), { studentId, exams: newExams, updatedAt: serverTimestamp() }, { merge: true })
                    .catch(err => console.error('Error saving inline date:', err));
            }, 0);

            return updatedData;
        });
    }, [db, appId, selectedYear]);

    if (loading) return <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Container>;

    return (
        <Box>
            {/* SCREEN VIEW - Hidden during print */}
            <Box sx={{ '@media print': { display: 'none' } }}>
                <Container maxWidth="lg" sx={{ pb: 4 }}>
            {/* Header */}
            <Paper elevation={0} sx={{
                p: 3, mb: 3, borderRadius: '16px', color: 'white', position: 'relative', overflow: 'hidden',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '@media print': { display: 'none' }
            }}>
                <Box sx={{ position: 'absolute', top: -20, right: -20, opacity: 0.1, fontSize: 120 }}>
                    <EventNote sx={{ fontSize: 'inherit' }} />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1 }}>
                    <CalendarMonth sx={{ fontSize: 48 }} />
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>Πρόγραμμα Εξετάσεων Ιουνίου</Typography>
                        <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5 }}>
                            Πίνακας μαθητών ανά τάξη • {totalStudents} μαθητές σε {displayGrades.length} τάξεις
                        </Typography>
                    </Box>
                </Box>
            </Paper>

            {/* Filters */}
            <Paper elevation={2} sx={{ p: 2, mb: 3, borderRadius: '12px', display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', '@media print': { display: 'none' } }}>
                <FilterList color="action" />
                <TextField placeholder="Αναζήτηση μαθητή..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} size="small" sx={{ minWidth: 250 }}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                        endAdornment: searchTerm ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearchTerm('')}><Clear fontSize="small" /></IconButton></InputAdornment> : null
                    }} />
                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Φιλτράρισμα Τάξης</InputLabel>
                    <Select value={selectedGrade} label="Φιλτράρισμα Τάξης" onChange={(e) => setSelectedGrade(e.target.value)}>
                        <MenuItem value=""><em>Όλες οι Τάξεις</em></MenuItem>
                        {sortedGrades.map(g => <MenuItem key={g} value={g}>{g} ({studentsByGrade[g]?.length || 0})</MenuItem>)}
                    </Select>
                </FormControl>
                <Box sx={{ flexGrow: 1 }} />
                <Button size="small" onClick={expandAll} startIcon={<ExpandMore />}>Ανάπτυξη Όλων</Button>
                <Button size="small" onClick={collapseAll} startIcon={<ExpandLess />}>Σύμπτυξη Όλων</Button>
                <Button variant="outlined" size="small" startIcon={<Print />} onClick={openGlobalPrintDialog}>Εκτύπωση</Button>
            </Paper>

            {/* Grade Cards */}
            <Grid container spacing={2} sx={{ mb: 3, '@media print': { display: 'none' } }}>
                {sortedGrades.map(g => {
                    const c = GRADE_COLORS[g] || DEFAULT_COLOR;
                    const count = studentsByGrade[g]?.length || 0;
                    const scheduled = (studentsByGrade[g] || []).filter(s => examScheduleData[s.id]?.exams?.length > 0).length;
                    return (
                        <Grid item xs={6} sm={4} md={2} key={g}>
                            <Paper elevation={selectedGrade === g ? 6 : 1} onClick={() => setSelectedGrade(p => p === g ? '' : g)}
                                sx={{
                                    p: 2, borderRadius: '12px', cursor: 'pointer', textAlign: 'center',
                                    background: selectedGrade === g ? c.bg : 'white',
                                    border: selectedGrade === g ? `2px solid ${c.chip}` : '2px solid transparent',
                                    transition: 'all 0.2s ease',
                                    '&:hover': { transform: 'translateY(-2px)', boxShadow: 4, background: c.bg },
                                }}>
                                <Typography variant="h5" sx={{ fontWeight: 700, color: c.color }}>{count}</Typography>
                                <Typography variant="caption" sx={{ color: c.color, fontWeight: 500, display: 'block' }}>{g}</Typography>
                                <Chip label={`${scheduled}/${count} προγρ.`} size="small"
                                    sx={{ mt: 0.5, fontSize: '0.65rem', height: 20, backgroundColor: scheduled === count && count > 0 ? '#4caf5020' : '#ff980020', color: scheduled === count && count > 0 ? '#2e7d32' : '#e65100' }} />
                            </Paper>
                        </Grid>
                    );
                })}
            </Grid>

            {/* Grade Tables */}
            <Box>
                {displayGrades.map(grade => {
                    const students = filteredByGrade[grade];
                    if (!students || students.length === 0) return null;
                    const colors = GRADE_COLORS[grade] || DEFAULT_COLOR;
                    const isExpanded = expandedGrades[grade] !== false;

                    return (
                        <Paper key={grade} elevation={2} sx={{ mb: 3, borderRadius: '12px', overflow: 'hidden', '@media print': { mb: 2, breakInside: 'avoid', boxShadow: 'none', border: '1px solid #ddd' } }}>
                            <Box onClick={() => toggleGrade(grade)} sx={{
                                p: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2,
                                background: `linear-gradient(135deg, ${colors.bg} 0%, white 100%)`,
                                borderBottom: `3px solid ${colors.chip}`,
                                '&:hover': { background: colors.bg },
                            }}>
                                <Badge badgeContent={students.length} color="primary" max={999}>
                                    <School sx={{ fontSize: 32, color: colors.color }} />
                                </Badge>
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 700, color: colors.color }}>{grade}</Typography>
                                </Box>
                                <Chip icon={<Groups sx={{ color: 'white !important' }} />} label={`${students.length} μαθητές`}
                                    sx={{ backgroundColor: colors.chip, color: 'white', fontWeight: 600, '@media print': { display: 'none' } }} />
                                <IconButton size="small" sx={{ '@media print': { display: 'none' } }}>
                                    {isExpanded ? <ExpandLess /> : <ExpandMore />}
                                </IconButton>
                            </Box>

                            <Collapse in={isExpanded}>
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow sx={{ backgroundColor: '#fafafa' }}>
                                                <TableCell sx={{ fontWeight: 700, width: '4%' }}>#</TableCell>
                                                <TableCell sx={{ fontWeight: 700, width: '18%' }}>Ονοματεπώνυμο</TableCell>
                                                <TableCell sx={{ fontWeight: 700, width: '10%' }}>Τηλέφωνο</TableCell>
                                                <TableCell sx={{ fontWeight: 700, width: '35%' }}>Εξετάσεις</TableCell>
                                                <TableCell sx={{ fontWeight: 700, width: '25%' }}>Μαθ. Προετοιμασίας</TableCell>
                                                <TableCell sx={{ fontWeight: 700, width: '8%', '@media print': { display: 'none' } }} align="center">Πλήρης Επεξ.</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {students.map((student, idx) => (
                                                <StudentRow
                                                    key={student.id}
                                                    student={student}
                                                    idx={idx}
                                                    subjects={studentSubjectsMap[student.id] || []}
                                                    exams={examScheduleData[student.id]?.exams || []}
                                                    colors={colors}
                                                    onEdit={openDialog}
                                                    onPrint={openPrintDialog}
                                                    onDateChange={handleInlineDateChange}
                                                />
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Collapse>
                        </Paper>
                    );
                })}
            </Box>

            {/* Exam Entry Dialog */}
            <ExamEntryDialog
                open={dialogOpen}
                onClose={closeDialog}
                student={dialogStudent}
                examData={dialogStudent ? examScheduleData[dialogStudent.id] : null}
                db={db} appId={appId} selectedYear={selectedYear}
                classrooms={classrooms}
            />

            {/* Print View Dialog */}
            <StudentExamPrintView
                open={printDialogOpen}
                onClose={closePrintDialog}
                student={printStudent}
                examData={printStudent ? examScheduleData[printStudent.id] : null}
                classrooms={classrooms}
            />

            {/* Global Print Options Dialog */}
            <Dialog open={globalPrintDialogOpen} onClose={closeGlobalPrintDialog} maxWidth="xs" fullWidth>
                <DialogTitle>Επιλογές Εκτύπωσης</DialogTitle>
                <DialogContent dividers>
                    <FormControl component="fieldset">
                        <FormLabel component="legend">Ομαδοποίηση Προγράμματος</FormLabel>
                        <RadioGroup
                            value={globalPrintGroupBy}
                            onChange={(e) => setGlobalPrintGroupBy(e.target.value)}
                        >
                            <FormControlLabel value="date" control={<Radio />} label="Ανά Ημέρα" />
                            <FormControlLabel value="grade" control={<Radio />} label="Ανά Τάξη" />
                        </RadioGroup>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeGlobalPrintDialog}>Ακύρωση</Button>
                    <Button variant="contained" onClick={handleExecuteGlobalPrint} startIcon={<Print />}>
                        Εκτύπωση
                    </Button>
                </DialogActions>
            </Dialog>

                </Container>
            </Box>

            {/* PRINT VIEW - Only visible during print */}
            <GlobalExamPrintView 
                examData={examScheduleData} 
                allStudents={allStudents} 
                groupBy={globalPrintGroupBy} 
            />

            <style>{`
                @media print {
                    @page { margin: 1cm; size: auto; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
                    /* Hide drawer and appbar just in case */
                    .MuiDrawer-root, nav, header, .MuiAppBar-root { display: none !important; }
                }
            `}</style>
        </Box>
    );
}

export default ExamSchedule;
