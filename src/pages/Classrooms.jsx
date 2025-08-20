// src/pages/Classrooms.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
    Box, Container, Grid, Paper, Typography,
    IconButton, Button, CircularProgress,
    List, ListItem, ListItemText, Tabs, Tab, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, InputLabel, Select, MenuItem, Menu, Avatar
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
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

// --- ΔΙΟΡΘΩΣΗ: Προσθήκη του userId στα props ---
function Classrooms({ classrooms, allStudents, allAbsences, allCourses, allTeachers, allGrades, allAssignments, loading, db, appId, selectedYear, userId }) { 
    const navigate = useNavigate();
    const location = useLocation();
    
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedClassroomId, setSelectedClassroomId] = useState('');
    
    const [activeTab, setActiveTab] = useState(0);
    const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
    const [classroomToDelete, setClassroomToDelete] = useState(null);

    const [moveStudentData, setMoveStudentData] = useState(null);
    const [swapStudentData, setSwapStudentData] = useState(null);
    const [targetClassroomId, setTargetClassroomId] = useState('');
    const [errorDialog, setErrorDialog] = useState({ open: false, message: '' });


    const groupedClassrooms = useMemo(() => {
        const groups = {};
        if (classrooms) {
            classrooms.forEach(classroom => {
                const grade = classroom.grade || 'Χωρίς Τάξη';
                if (!groups[grade]) groups[grade] = [];
                groups[grade].push(classroom);
            });
        }
        Object.keys(groups).forEach(grade => {
            groups[grade].sort((a, b) => a.classroomName.localeCompare(b.classroomName));
        });
        return groups;
    }, [classrooms]);

    const availableGrades = useMemo(() => Object.keys(groupedClassrooms).sort(), [groupedClassrooms]);
    const availableClassroomsInGrade = useMemo(() => groupedClassrooms[selectedGrade] || [], [selectedGrade, groupedClassrooms]);

    const selectedClassroom = useMemo(() => classrooms.find(c => c.id === selectedClassroomId) || null, [selectedClassroomId, classrooms]);

    const otherClassroomsOfSameSubject = useMemo(() => {
        if (!selectedClassroom) return [];
        return classrooms.filter(c => 
            c.id !== selectedClassroom.id && 
            c.subject === selectedClassroom.subject &&
            c.grade === selectedClassroom.grade
        );
    }, [selectedClassroom, classrooms]);


    useEffect(() => {
        const classroomIdFromState = location.state?.selectedClassroomId;
        if (classroomIdFromState && classrooms.length > 0) {
            const classroomToSelect = classrooms.find(c => c.id === classroomIdFromState);
            if (classroomToSelect) {
                setSelectedGrade(classroomToSelect.grade);
                setSelectedClassroomId(classroomToSelect.id);
            }
        }
    }, [location.state, classrooms]);


    const handleTabChange = (event, newValue) => setActiveTab(newValue);

    useEffect(() => { setActiveTab(0); }, [selectedClassroomId]);
    
    const handleGradeChange = (event) => {
        const newGrade = event.target.value;
        setSelectedGrade(newGrade);
        setSelectedClassroomId('');
    };

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
            <Paper elevation={3} sx={{ p: 2, mb: 3, borderRadius: '12px' }}>
                <Typography variant="h5" sx={{ mb: 2 }}>Επιλογή Τμήματος</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                            <InputLabel>Τάξη</InputLabel>
                            <Select value={selectedGrade} label="Τάξη" onChange={handleGradeChange}>
                                {availableGrades.map(grade => (<MenuItem key={grade} value={grade}>{grade}</MenuItem>))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth disabled={!selectedGrade}>
                            <InputLabel>Τμήμα</InputLabel>
                            <Select value={selectedClassroomId} label="Τμήμα" onChange={(e) => setSelectedClassroomId(e.target.value)}>
                                {availableClassroomsInGrade.map(classroom => (<MenuItem key={classroom.id} value={classroom.id}>{classroom.classroomName} - {classroom.subject}</MenuItem>))}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </Paper>

            {selectedClassroom && (
                <Paper elevation={3} sx={{ padding: '20px', borderRadius: '12px', minHeight: '400px' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h5" component="h3" color='#3f51b5'>{`Λεπτομέρειες: ${selectedClassroom.classroomName}`}</Typography>
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
                            userId={userId} // <-- Η ΔΙΟΡΘΩΣΗ ΕΙΝΑΙ ΕΔΩ
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
                            userId={userId} // <-- Η ΔΙΟΡΘΩΣΗ ΕΙΝΑΙ ΕΔΩ
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
