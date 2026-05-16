// src/pages/Classrooms.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
    Box, Container, Grid, Paper, Typography,
    IconButton, Button, CircularProgress,
    List, ListItem, ListItemText, Tabs, Tab, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, InputLabel, Select, MenuItem, Avatar,
    Card, CardContent, CardActionArea, Collapse, TextField, InputAdornment, Chip
} from '@mui/material';
import { Edit, Delete, Search, KeyboardArrowDown, KeyboardArrowUp, ArrowBack, Group, Book } from '@mui/icons-material';
import { doc, deleteDoc, updateDoc, arrayUnion, arrayRemove, writeBatch } from 'firebase/firestore';
import ClassroomTableVisual from './ClassroomTableVisual.jsx';
import SyllabusTracker from './SyllabusTracker.jsx';
import ClassroomAnnouncements from './ClassroomAnnouncements.jsx';
import ClassroomMaterials from './ClassroomMaterials.jsx';
import ClassroomStats from './ClassroomStats.jsx';
import DailyLog from './DailyLog.jsx';
import { useNavigate, useLocation } from 'react-router-dom';

function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </div>
    );
}

const DetailItem = ({ label, value }) => (
    <Box mb={2}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>{label}</Typography>
        <Typography variant="body1" sx={{ fontWeight: 500 }}>{value || '-'}</Typography>
    </Box>
);

function Classrooms({ classrooms, allStudents, allAbsences, allCourses, allTeachers, allGrades, allAssignments, loading, db, appId, selectedYear, userId }) { 
    const navigate = useNavigate();
    const location = useLocation();
    
    const [selectedClassroomId, setSelectedClassroomId] = useState('');
    
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedGrades, setExpandedGrades] = useState({});
    
    const [activeTab, setActiveTab] = useState(0);
    const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
    const [classroomToDelete, setClassroomToDelete] = useState(null);

    const [moveStudentData, setMoveStudentData] = useState(null);
    const [swapStudentData, setSwapStudentData] = useState(null);
    const [targetClassroomId, setTargetClassroomId] = useState('');
    const [errorDialog, setErrorDialog] = useState({ open: false, message: '' });

    const filteredAndGroupedClassrooms = useMemo(() => {
        const groups = {};
        if (classrooms) {
            classrooms.forEach(classroom => {
                if (searchTerm) {
                    const searchLower = searchTerm.toLowerCase();
                    const nameMatch = classroom.classroomName?.toLowerCase().includes(searchLower);
                    const subjectMatch = classroom.subject?.toLowerCase().includes(searchLower);
                    if (!nameMatch && !subjectMatch) return;
                }
                const grade = classroom.grade || 'Χωρίς Τάξη';
                if (!groups[grade]) groups[grade] = [];
                groups[grade].push(classroom);
            });
        }
        Object.keys(groups).forEach(grade => {
            groups[grade].sort((a, b) => a.classroomName.localeCompare(b.classroomName));
        });
        return groups;
    }, [classrooms, searchTerm]);

    const availableGrades = useMemo(() => Object.keys(filteredAndGroupedClassrooms).sort(), [filteredAndGroupedClassrooms]);

    useEffect(() => {
        if (searchTerm) {
            const newExpanded = {};
            availableGrades.forEach(g => newExpanded[g] = true);
            setExpandedGrades(newExpanded);
        }
    }, [searchTerm, availableGrades]);

    const selectedClassroom = useMemo(() => classrooms.find(c => c.id === selectedClassroomId) || null, [selectedClassroomId, classrooms]);

    const otherClassroomsOfSameSubject = useMemo(() => {
        if (!selectedClassroom) return [];
        return classrooms.filter(c => 
            c.id !== selectedClassroom.id && 
            c.subject === selectedClassroom.subject &&
            c.grade === selectedClassroom.grade
        );
    }, [selectedClassroom, classrooms]);


    // --- START: Updated logic to handle navigation from dashboard ---
    useEffect(() => {
        const classroomIdFromState = location.state?.selectedId;
        if (classroomIdFromState && classrooms.length > 0) {
            const classroomToSelect = classrooms.find(c => c.id === classroomIdFromState);
            if (classroomToSelect) {
                setSelectedClassroomId(classroomToSelect.id);
                setSelectedClassroomId(classroomToSelect.id);
                // Clear the state to prevent re-triggering on refresh
                navigate(location.pathname, { replace: true, state: {} });
            }
        }
    }, [location.state, classrooms, navigate, location.pathname]);
    // --- END: Updated logic ---


    const handleTabChange = (event, newValue) => setActiveTab(newValue);

    useEffect(() => { setActiveTab(0); }, [selectedClassroomId]);

    const classroomDetails = useMemo(() => {
        if (!selectedClassroom) return null;
        const enrolledStudents = allStudents.filter(s => s.enrolledClassrooms?.includes(selectedClassroom.id));
        return { enrolledStudentsCount: enrolledStudents.length, enrolledStudents };
    }, [selectedClassroom, allStudents]);

    const handleAssignStudent = async (studentId, classroomId) => {
        if (!db || !appId || !selectedYear) return;
        try {
            const batch = writeBatch(db);
            const yearPath = `artifacts/${appId}/public/data/academicYears/${selectedYear}`;
            const studentRef = doc(db, `${yearPath}/students`, studentId);
            batch.update(studentRef, { enrolledClassrooms: arrayUnion(classroomId) });
            const classroomRef = doc(db, `${yearPath}/classrooms`, classroomId);
            batch.update(classroomRef, { enrolledStudents: arrayUnion(studentId) });
            await batch.commit();
        } catch (error) {
            console.error("Error assigning student to classroom:", error);
        }
    };

    const handleRemoveStudent = async (student, fromClassroom) => {
        if (!student || !fromClassroom || !selectedYear) return;
        try {
            const batch = writeBatch(db);
            const yearPath = `artifacts/${appId}/public/data/academicYears/${selectedYear}`;
            const studentRef = doc(db, `${yearPath}/students`, student.id);
            batch.update(studentRef, { enrolledClassrooms: arrayRemove(fromClassroom.id) });
            const classroomRef = doc(db, `${yearPath}/classrooms`, fromClassroom.id);
            batch.update(classroomRef, { enrolledStudents: arrayRemove(student.id) });
            await batch.commit();
        } catch (error) {
            console.error("Error removing student from classroom:", error);
        }
    };

    const handleMoveStudent = async () => {
        const { student, fromClassroom } = moveStudentData;
        const toClassroomId = targetClassroomId;
        if (!student || !fromClassroom || !toClassroomId || !selectedYear) return;

        const targetClassroom = classrooms.find(c => c.id === toClassroomId);
        const targetEnrolledCount = allStudents.filter(s => s.enrolledClassrooms?.includes(toClassroomId)).length;

        if (targetEnrolledCount >= targetClassroom.maxStudents) {
            setErrorDialog({ open: true, message: 'Το τμήμα προορισμού είναι γεμάτο. Η μετακίνηση δεν μπορεί να πραγματοποιηθεί.' });
            setMoveStudentData(null);
            setTargetClassroomId('');
            return;
        }

        try {
            const batch = writeBatch(db);
            const yearPath = `artifacts/${appId}/public/data/academicYears/${selectedYear}`;
            const studentRef = doc(db, `${yearPath}/students`, student.id);
            batch.update(studentRef, { enrolledClassrooms: arrayRemove(fromClassroom.id) });
            batch.update(studentRef, { enrolledClassrooms: arrayUnion(toClassroomId) });

            const fromClassroomRef = doc(db, `${yearPath}/classrooms`, fromClassroom.id);
            batch.update(fromClassroomRef, { enrolledStudents: arrayRemove(student.id) });

            const toClassroomRef = doc(db, `${yearPath}/classrooms`, toClassroomId);
            batch.update(toClassroomRef, { enrolledStudents: arrayUnion(student.id) });

            await batch.commit();
        } catch (error) {
            console.error("Error moving student:", error);
        } finally {
            setMoveStudentData(null);
            setTargetClassroomId('');
        }
    };

    const handleSwapStudents = async () => {
        const { student1, classroom1, student2 } = swapStudentData;
        const classroom2Id = targetClassroomId;
        if (!student1 || !classroom1 || !student2 || !classroom2Id || !selectedYear) return;

        try {
            const batch = writeBatch(db);
            const yearPath = `artifacts/${appId}/public/data/academicYears/${selectedYear}`;

            const student1Ref = doc(db, `${yearPath}/students`, student1.id);
            batch.update(student1Ref, { enrolledClassrooms: arrayRemove(classroom1.id) });
            batch.update(student1Ref, { enrolledClassrooms: arrayUnion(classroom2Id) });

            const student2Ref = doc(db, `${yearPath}/students`, student2.id);
            batch.update(student2Ref, { enrolledClassrooms: arrayRemove(classroom2Id) });
            batch.update(student2Ref, { enrolledClassrooms: arrayUnion(classroom1.id) });

            const classroom1Ref = doc(db, `${yearPath}/classrooms`, classroom1.id);
            batch.update(classroom1Ref, { enrolledStudents: arrayRemove(student1.id) });
            batch.update(classroom1Ref, { enrolledStudents: arrayUnion(student2.id) });

            const classroom2Ref = doc(db, `${yearPath}/classrooms`, classroom2Id);
            batch.update(classroom2Ref, { enrolledStudents: arrayRemove(student2.id) });
            batch.update(classroom2Ref, { enrolledStudents: arrayUnion(student1.id) });

            await batch.commit();
        } catch (error) {
            console.error("Error swapping students:", error);
        } finally {
            setSwapStudentData(null);
            setTargetClassroomId('');
        }
    };


    const handleEditClick = (classroom) => navigate(`/classroom/edit/${classroom.id}`);
    const handleDeleteClick = (classroom) => { setClassroomToDelete(classroom); setOpenDeleteConfirm(true); };
    const handleCloseDeleteConfirm = () => { setOpenDeleteConfirm(false); setClassroomToDelete(null); };
    const handleConfirmDelete = async () => {
        if (!db || !appId || !classroomToDelete || !selectedYear) return;
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/classrooms`, classroomToDelete.id));
            setSelectedClassroomId('');
        } catch (error) {
            console.error("Error deleting classroom:", error);
        } finally {
            handleCloseDeleteConfirm();
        }
    };

    if (loading) {
        return <Container maxWidth={false} sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Container>;
    }
    
    return (
        <Container maxWidth="lg">
            {!selectedClassroom && (
                <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1a237e' }}>Τμήματα</Typography>
                        <Box>
                            <Button onClick={() => {
                                const newExpanded = {};
                                availableGrades.forEach(g => newExpanded[g] = true);
                                setExpandedGrades(newExpanded);
                            }}>Επέκταση Όλων</Button>
                            <Button onClick={() => setExpandedGrades({})}>Σύμπτυξη Όλων</Button>
                        </Box>
                    </Box>

                    <Paper elevation={2} sx={{ p: 2, mb: 4, borderRadius: '12px' }}>
                        <TextField
                            fullWidth
                            variant="outlined"
                            placeholder="Αναζήτηση με βάση το όνομα ή το μάθημα..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                            }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                        />
                    </Paper>

                    {availableGrades.length === 0 ? (
                        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '12px' }}>
                            <Typography color="text.secondary">Δεν βρέθηκαν τμήματα που να ταιριάζουν στα κριτήρια αναζήτησης.</Typography>
                        </Paper>
                    ) : (
                        availableGrades.map((grade) => {
                            const isExpanded = expandedGrades[grade] !== false;
                            const gradeClassrooms = filteredAndGroupedClassrooms[grade];
                            return (
                                <Paper key={grade} elevation={2} sx={{ mb: 3, borderRadius: '12px', overflow: 'hidden' }}>
                                    <Box
                                        onClick={() => setExpandedGrades(prev => ({ ...prev, [grade]: !isExpanded }))}
                                        sx={{
                                            p: 2,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            cursor: 'pointer',
                                            backgroundColor: '#f5f7fa',
                                            borderBottom: isExpanded ? '1px solid #e0e0e0' : 'none',
                                            transition: 'background-color 0.2s',
                                            '&:hover': { backgroundColor: '#eef2f6' }
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Typography variant="h6" sx={{ color: '#2c3e50', fontWeight: 'bold' }}>
                                                {grade}
                                            </Typography>
                                            <Chip size="small" label={`${gradeClassrooms.length} τμήματα`} color="primary" variant="outlined" />
                                        </Box>
                                        <IconButton size="small">
                                            {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                                        </IconButton>
                                    </Box>
                                    <Collapse in={isExpanded}>
                                        <Box sx={{ p: 3, backgroundColor: '#ffffff' }}>
                                            <Grid container spacing={3}>
                                                {gradeClassrooms.map(classroom => {
                                                    const enrolledCount = classroom.enrolledStudents?.length || 0;
                                                    return (
                                                        <Grid item xs={12} sm={6} md={4} key={classroom.id}>
                                                            <Card 
                                                                elevation={0}
                                                                sx={{ 
                                                                    border: '1px solid #e0e0e0',
                                                                    borderRadius: '12px',
                                                                    height: '100%',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    transition: 'all 0.2s ease-in-out',
                                                                    '&:hover': {
                                                                        borderColor: '#3f51b5',
                                                                        boxShadow: '0 4px 12px rgba(63, 81, 181, 0.15)',
                                                                        transform: 'translateY(-2px)'
                                                                    }
                                                                }}
                                                            >
                                                                <CardActionArea 
                                                                    onClick={() => setSelectedClassroomId(classroom.id)}
                                                                    sx={{ flexGrow: 1, p: 2 }}
                                                                >
                                                                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1, color: '#1a237e' }}>
                                                                        {classroom.classroomName}
                                                                    </Typography>
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: 'text.secondary' }}>
                                                                        <Book fontSize="small" />
                                                                        <Typography variant="body2">{classroom.subject}</Typography>
                                                                    </Box>
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                                                                        <Group fontSize="small" />
                                                                        <Typography variant="body2">{enrolledCount} μαθητές / {classroom.maxStudents || 0}</Typography>
                                                                    </Box>
                                                                </CardActionArea>
                                                            </Card>
                                                        </Grid>
                                                    );
                                                })}
                                            </Grid>
                                        </Box>
                                    </Collapse>
                                </Paper>
                            );
                        })
                    )}
                </Box>
            )}

            {selectedClassroom && (
                <Paper elevation={3} sx={{ padding: '20px', borderRadius: '12px', minHeight: '400px' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, pb: 2, borderBottom: '1px solid #e0e0e0' }}>
                        <Button 
                            startIcon={<ArrowBack />} 
                            onClick={() => setSelectedClassroomId('')}
                            sx={{ mr: 2, fontWeight: 'bold' }}
                            variant="outlined"
                        >
                            Πίσω
                        </Button>
                        <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="h5" component="h3" color='#1a237e' sx={{ fontWeight: 'bold' }}>
                                {selectedClassroom.classroomName}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                                <Chip size="small" icon={<Book />} label={selectedClassroom.subject} variant="outlined" color="primary" />
                                <Chip size="small" label={selectedClassroom.grade} variant="outlined" />
                            </Box>
                        </Box>
                        <Box>
                            <IconButton color="primary" onClick={() => handleEditClick(selectedClassroom)}><Edit /></IconButton>
                            <IconButton color="error" onClick={() => handleDeleteClick(selectedClassroom)}><Delete /></IconButton>
                        </Box>
                    </Box>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
                            <Tab label="Διάταξη & Διαχείριση" />
                            <Tab label="Ημερολόγιο Τάξης" />
                            <Tab label="Ύλη & Πρόοδος" />
                            <Tab label="Ανακοινώσεις" />
                            <Tab label="Αρχεία & Υλικό" />
                            <Tab label="Στατιστικά" />
                        </Tabs>
                    </Box>
                    <TabPanel value={activeTab} index={0}>
                        <ClassroomTableVisual 
                            classroom={selectedClassroom} 
                            db={db} appId={appId} 
                            allStudents={allStudents} 
                            classrooms={classrooms}
                            selectedYear={selectedYear}
                            onAssignStudent={handleAssignStudent}
                            onRemoveStudent={handleRemoveStudent}
                            onMoveStudent={(student, fromClassroom) => setMoveStudentData({ student, fromClassroom })}
                            onSwapStudent={(student1, classroom1) => setSwapStudentData({ student1, classroom1 })}
                            otherClassrooms={otherClassroomsOfSameSubject}
                        />
                    </TabPanel>
                    <TabPanel value={activeTab} index={1}>
                        <DailyLog 
                            classroom={selectedClassroom} 
                            allStudents={allStudents} 
                            allGrades={allGrades} 
                            allAbsences={allAbsences} 
                            allAssignments={allAssignments} 
                            allCourses={allCourses} 
                            db={db} 
                            appId={appId} 
                            selectedYear={selectedYear}
                            userId={userId}
                        />
                    </TabPanel>
                    <TabPanel value={activeTab} index={2}><SyllabusTracker classroom={selectedClassroom} allCourses={allCourses} db={db} appId={appId} selectedYear={selectedYear} /></TabPanel>
                    <TabPanel value={activeTab} index={3}><ClassroomAnnouncements classroom={selectedClassroom} db={db} appId={appId} selectedYear={selectedYear} /></TabPanel>
                    <TabPanel value={activeTab} index={4}>
                        <ClassroomMaterials 
                            classroom={selectedClassroom} 
                            db={db} 
                            appId={appId} 
                            selectedYear={selectedYear}
                            userId={userId}
                        />
                    </TabPanel>
                    <TabPanel value={activeTab} index={5}><ClassroomStats selectedClassroom={selectedClassroom} allStudents={allStudents} allGrades={allGrades} allAbsences={allAbsences} classrooms={classrooms} /></TabPanel>
                </Paper>
            )}
            
            <Dialog open={openDeleteConfirm} onClose={handleCloseDeleteConfirm}>
                <DialogTitle>Επιβεβαίωση Διαγραφής</DialogTitle>
                <DialogContent><DialogContentText>Είστε σίγουροι ότι θέλετε να διαγράψετε το τμήμα "{classroomToDelete?.classroomName}";</DialogContentText></DialogContent>
                <DialogActions><Button onClick={handleCloseDeleteConfirm}>Ακύρωση</Button><Button onClick={handleConfirmDelete} color="error">Διαγραφή</Button></DialogActions>
            </Dialog>

            <Dialog open={!!moveStudentData} onClose={() => setMoveStudentData(null)}>
                <DialogTitle>Μετακίνηση Μαθητή</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{mb: 2}}>Μετακίνηση του/της {moveStudentData?.student.lastName} από το {moveStudentData?.fromClassroom.classroomName} σε:</DialogContentText>
                    <FormControl fullWidth>
                        <InputLabel>Νέο Τμήμα</InputLabel>
                        <Select value={targetClassroomId} label="Νέο Τμήμα" onChange={(e) => setTargetClassroomId(e.target.value)}>
                            {otherClassroomsOfSameSubject.map(c => <MenuItem key={c.id} value={c.id}>{c.classroomName}</MenuItem>)}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions><Button onClick={() => setMoveStudentData(null)}>Ακύρωση</Button><Button onClick={handleMoveStudent} disabled={!targetClassroomId}>Μετακίνηση</Button></DialogActions>
            </Dialog>

            <Dialog open={!!swapStudentData} onClose={() => setSwapStudentData(null)}>
                <DialogTitle>Ανταλλαγή Μαθητών</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{mb: 2}}>Ανταλλαγή του/της {swapStudentData?.student1.lastName} με μαθητή από άλλο τμήμα.</DialogContentText>
                    <FormControl fullWidth sx={{mb: 2}}>
                        <InputLabel>Τμήμα Προορισμού</InputLabel>
                        <Select value={targetClassroomId} label="Τμήμα Προορισμού" onChange={(e) => setTargetClassroomId(e.target.value)}>
                            {otherClassroomsOfSameSubject.map(c => <MenuItem key={c.id} value={c.id}>{c.classroomName}</MenuItem>)}
                        </Select>
                    </FormControl>
                    {targetClassroomId && (
                        <List>
                            {allStudents.filter(s => s.enrolledClassrooms?.includes(targetClassroomId)).map(student2 => (
                                <ListItem button key={student2.id} onClick={() => setSwapStudentData(prev => ({...prev, student2}))}>
                                    <Avatar sx={{mr: 2}}>{student2.firstName.charAt(0)}{student2.lastName.charAt(0)}</Avatar>
                                    <ListItemText primary={`${student2.lastName} ${student2.firstName}`} />
                                </ListItem>
                            ))}
                        </List>
                    )}
                    {swapStudentData?.student2 && <Typography sx={{mt: 2}}>Επιλέχθηκε: {swapStudentData.student2.lastName}</Typography>}
                </DialogContent>
                <DialogActions><Button onClick={() => setSwapStudentData(null)}>Ακύρωση</Button><Button onClick={handleSwapStudents} disabled={!swapStudentData?.student2}>Ανταλλαγή</Button></DialogActions>
            </Dialog>

            <Dialog open={errorDialog.open} onClose={() => setErrorDialog({ open: false, message: '' })}>
                <DialogTitle>Σφάλμα</DialogTitle>
                <DialogContent><DialogContentText>{errorDialog.message}</DialogContentText></DialogContent>
                <DialogActions><Button onClick={() => setErrorDialog({ open: false, message: '' })}>Εντάξει</Button></DialogActions>
            </Dialog>

        </Container>
    );
}

export default Classrooms;
