// src/pages/Classrooms.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
    Box, Container, Grid, Paper, Typography, TextField,
    IconButton, Button, CircularProgress,
    List, ListItem, ListItemText, Tabs, Tab, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import { doc, deleteDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import ClassroomTableVisual from './ClassroomTableVisual.jsx';
import SyllabusTracker from './SyllabusTracker.jsx';
import ClassroomAnnouncements from './ClassroomAnnouncements.jsx';
import ClassroomMaterials from './ClassroomMaterials.jsx';
import ClassroomStats from './ClassroomStats.jsx';
import DailyLog from './DailyLog.jsx';
import { useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';

function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </div>
    );
}

// Helper component for displaying details
const DetailItem = ({ label, value }) => (
    <Box mb={2}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
            {label}
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 500 }}>
            {value || '-'}
        </Typography>
    </Box>
);

function Classrooms({ classrooms, allStudents, allAbsences, allCourses, allTeachers, allGrades, allAssignments, loading, db, appId }) { 
    const navigate = useNavigate();
    const location = useLocation();
    
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedClassroomId, setSelectedClassroomId] = useState('');
    
    const [activeTab, setActiveTab] = useState(0);
    const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
    const [classroomToDelete, setClassroomToDelete] = useState(null);

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
    const availableClassroomsInGrade = useMemo(() => {
        return groupedClassrooms[selectedGrade] || [];
    }, [selectedGrade, groupedClassrooms]);

    const selectedClassroom = useMemo(() => {
        return classrooms.find(c => c.id === selectedClassroomId) || null;
    }, [selectedClassroomId, classrooms]);

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

    useEffect(() => {
        setActiveTab(0);
    }, [selectedClassroomId]);
    
    const handleGradeChange = (event) => {
        const newGrade = event.target.value;
        setSelectedGrade(newGrade);
        setSelectedClassroomId(''); // Reset classroom selection when grade changes
    };

    const classroomDetails = useMemo(() => {
        if (!selectedClassroom) return null;

        const enrolledStudents = allStudents.filter(s => s.enrolledClassrooms?.includes(selectedClassroom.id));
        const enrolledStudentsCount = enrolledStudents.length;

        const course = allCourses.find(c => c.grade === selectedClassroom.grade && c.name === selectedClassroom.subject);
        let syllabusProgress = 0;
        if (course && course.syllabus) {
            const totalSections = course.syllabus.reduce((acc, chapter) => acc + (chapter.sections?.length || 0), 0);
            const coveredSectionsCount = selectedClassroom.coveredSyllabusSections?.length || 0;
            if (totalSections > 0) {
                syllabusProgress = Math.round((coveredSectionsCount / totalSections) * 100);
            }
        }

        return {
            enrolledStudentsCount,
            enrolledStudents,
            syllabusProgress,
        };
    }, [selectedClassroom, allStudents, allCourses]);

    // --- ΔΙΟΡΘΩΣΗ: Επαναφορά της συνάρτησης ---
    const handleAssignStudent = async (studentId, classroomId) => {
        if (!db || !appId) return;
        try {
            const studentDocRef = doc(db, `artifacts/${appId}/public/data/students`, studentId);
            await updateDoc(studentDocRef, { enrolledClassrooms: arrayUnion(classroomId) });
        } catch (error) {
            console.error("Error assigning student to classroom:", error);
        }
    };

    const handleEditClick = (classroom) => {
        navigate(`/classroom/edit/${classroom.id}`);
    };

    const handleDeleteClick = (classroom) => {
        setClassroomToDelete(classroom);
        setOpenDeleteConfirm(true);
    };

    const handleCloseDeleteConfirm = () => {
        setOpenDeleteConfirm(false);
        setClassroomToDelete(null);
    };

    const handleConfirmDelete = async () => {
        if (!db || !appId || !classroomToDelete) return;
        try {
            const classroomDocRef = doc(db, `artifacts/${appId}/public/data/classrooms`, classroomToDelete.id);
            await deleteDoc(classroomDocRef);
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
                                {availableGrades.map(grade => (
                                    <MenuItem key={grade} value={grade}>{grade}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth disabled={!selectedGrade}>
                            <InputLabel>Τμήμα</InputLabel>
                            <Select value={selectedClassroomId} label="Τμήμα" onChange={(e) => setSelectedClassroomId(e.target.value)}>
                                {availableClassroomsInGrade.map(classroom => (
                                    <MenuItem key={classroom.id} value={classroom.id}>
                                        {classroom.classroomName} - {classroom.subject}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </Paper>

            {selectedClassroom && (
                <Paper elevation={3} sx={{ padding: '20px', borderRadius: '12px', minHeight: '400px' }}>
                        <>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="h5" component="h3" color='#3f51b5'>
                                    {`Λεπτομέρειες: ${selectedClassroom.classroomName}`}
                                </Typography>
                                <Box>
                                    <IconButton color="primary" onClick={() => handleEditClick(selectedClassroom)}><Edit /></IconButton>
                                    <IconButton color="error" onClick={() => handleDeleteClick(selectedClassroom)}><Delete /></IconButton>
                                </Box>
                            </Box>
                            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                                <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
                                    <Tab label="Λεπτομέρειες & Διάταξη" />
                                    <Tab label="Ημερολόγιο Τάξης" />
                                    <Tab label="Ύλη & Πρόοδος" />
                                    <Tab label="Ανακοινώσεις" />
                                    <Tab label="Αρχεία & Υλικό" />
                                    <Tab label="Στατιστικά" />
                                </Tabs>
                            </Box>
                            <TabPanel value={activeTab} index={0}>
                                <Paper variant="outlined" sx={{ p: 2, mb: 3, backgroundColor: 'grey.50' }}>
                                    <Grid container spacing={3}>
                                        <Grid item xs={12} md={4}>
                                            <Typography variant="h6" gutterBottom sx={{fontSize: '1rem'}}>Βασικές Πληροφορίες</Typography>
                                            <DetailItem label="Μάθημα" value={selectedClassroom.subject} />
                                            <DetailItem label="Τάξη / Κατεύθυνση" value={`${selectedClassroom.grade}${selectedClassroom.specialization ? ` (${selectedClassroom.specialization})` : ''}`} />
                                            <DetailItem label="Καθηγητής" value={selectedClassroom.teacherName || 'Δεν έχει οριστεί'} />
                                        </Grid>
                                        <Grid item xs={12} md={4}>
                                            <Typography variant="h6" gutterBottom sx={{fontSize: '1rem'}}>Πρόοδος & Πρόγραμμα</Typography>
                                            <DetailItem label="Κάλυψη Ύλης" value={`${classroomDetails.syllabusProgress}%`} />
                                            <Box>
                                                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>Πρόγραμμα</Typography>
                                                {selectedClassroom.schedule?.length > 0 ? (
                                                    <List dense disablePadding>
                                                        {selectedClassroom.schedule.map((slot, index) => (
                                                            <ListItem key={index} sx={{ p: 0 }}>
                                                                <ListItemText primary={`${slot.day}: ${slot.startTime} - ${slot.endTime}`} />
                                                            </ListItem>
                                                        ))}
                                                    </List>
                                                ) : <Typography variant="body1">-</Typography>}
                                            </Box>
                                        </Grid>
                                        <Grid item xs={12} md={4}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                <Typography variant="h6" sx={{fontSize: '1rem'}}>Εγγεγραμμένοι Μαθητές</Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                                                    {`${classroomDetails.enrolledStudentsCount} / ${selectedClassroom.maxStudents}`}
                                                </Typography>
                                            </Box>
                                            {classroomDetails.enrolledStudents?.length > 0 ? (
                                                <List dense disablePadding sx={{ maxHeight: 150, overflow: 'auto' }}>
                                                    {classroomDetails.enrolledStudents.map(student => (
                                                        <ListItem key={student.id} sx={{ p: 0 }}>
                                                            <ListItemText primary={`${student.lastName} ${student.firstName}`} />
                                                        </ListItem>
                                                    ))}
                                                </List>
                                            ) : <Typography variant="body1">Κανένας μαθητής.</Typography>}
                                        </Grid>
                                    </Grid>
                                </Paper>
                                
                                <ClassroomTableVisual classroom={selectedClassroom} db={db} appId={appId} allStudents={allStudents} onAssignStudent={handleAssignStudent} />
                                
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
                                />
                            </TabPanel>
                            <TabPanel value={activeTab} index={2}>
                                <SyllabusTracker classroom={selectedClassroom} allCourses={allCourses} db={db} appId={appId} />
                            </TabPanel>
                            <TabPanel value={activeTab} index={3}>
                                <ClassroomAnnouncements classroom={selectedClassroom} db={db} appId={appId} />
                            </TabPanel>
                            <TabPanel value={activeTab} index={4}>
                                <ClassroomMaterials classroom={selectedClassroom} db={db} appId={appId} />
                            </TabPanel>
                            <TabPanel value={activeTab} index={5}>
                                <ClassroomStats 
                                    selectedClassroom={selectedClassroom}
                                    allStudents={allStudents}
                                    allGrades={allGrades}
                                    allAbsences={allAbsences}
                                    classrooms={classrooms}
                                />
                            </TabPanel>
                        </>
                </Paper>
            )}
            <Dialog open={openDeleteConfirm} onClose={handleCloseDeleteConfirm}>
                <DialogTitle>Επιβεβαίωση Διαγραφής</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Είστε σίγουροι ότι θέλετε να διαγράψετε το τμήμα "{classroomToDelete?.classroomName}"; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteConfirm}>Ακύρωση</Button>
                    <Button onClick={handleConfirmDelete} color="error">Διαγραφή</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default Classrooms;
