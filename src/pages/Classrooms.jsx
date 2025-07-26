// src/pages/Classrooms.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
    Box, Container, Grid, Paper, Typography, TextField,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Button, CircularProgress, Accordion, AccordionSummary, AccordionDetails,
    List, ListItem, ListItemText, Tabs, Tab, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle
} from '@mui/material';
import { Edit, Delete, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { doc, deleteDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import ClassroomTableVisual from './ClassroomTableVisual.jsx';
import Gradebook from './Gradebook.jsx';
import AttendanceSheet from './AttendanceSheet.jsx';
import { useNavigate, useLocation } from 'react-router-dom'; // <-- ΝΕΟ IMPORT useLocation

function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </div>
    );
}

function Classrooms({ classrooms, allStudents, allAbsences, loading, db, appId }) { 
    const navigate = useNavigate();
    const location = useLocation(); // <-- ΝΕΟ HOOK
    const [selectedClassroom, setSelectedClassroom] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedAccordion, setExpandedAccordion] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
    const [classroomToDelete, setClassroomToDelete] = useState(null);

    // --- ΝΕΟ useEffect: Ελέγχει αν ήρθαμε από το Dashboard ---
    useEffect(() => {
        const classroomIdFromState = location.state?.selectedClassroomId;
        if (classroomIdFromState && classrooms) {
            const classroomToSelect = classrooms.find(c => c.id === classroomIdFromState);
            if (classroomToSelect) {
                setSelectedClassroom(classroomToSelect);
                // Ανοίγει αυτόματα το σωστό accordion
                setExpandedAccordion(classroomToSelect.grade || 'Χωρίς Τάξη');
            }
        }
    }, [location.state, classrooms]);


    const handleTabChange = (event, newValue) => setActiveTab(newValue);

    useEffect(() => {
        setActiveTab(0);
    }, [selectedClassroom]);

    const handleAccordionChange = (panel) => (event, isExpanded) => {
        setExpandedAccordion(isExpanded ? panel : false);
    };

    const groupedClassrooms = useMemo(() => {
        const groups = {};
        if (classrooms) {
            classrooms.forEach(classroom => {
                const grade = classroom.grade || 'Χωρίς Τάξη';
                if (!groups[grade]) groups[grade] = [];
                groups[grade].push(classroom);
            });
        }
        const sortedGrades = Object.keys(groups).sort();
        const sortedGroups = {};
        sortedGrades.forEach(grade => {
            sortedGroups[grade] = groups[grade];
        });
        return sortedGroups;
    }, [classrooms]);

    useEffect(() => {
        const grades = Object.keys(groupedClassrooms);
        // Μην ανοίγεις αυτόματα accordion αν έχουμε ήδη επιλέξει ένα από το dashboard
        if (grades.length > 0 && !expandedAccordion && !location.state?.selectedClassroomId) {
            setExpandedAccordion(grades[0]);
        }
    }, [groupedClassrooms, expandedAccordion, location.state]);

    const handleSearchChange = (event) => setSearchTerm(event.target.value);

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
            setSelectedClassroom(null);
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
        <Container maxWidth={false}>
            <Box sx={{ mt: 3, mb: 3 }}>
                <TextField fullWidth label="Αναζήτηση..." variant="outlined" size="small" value={searchTerm} onChange={handleSearchChange} />
            </Box>
            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Paper elevation={3} sx={{ padding: '20px', borderRadius: '12px', minHeight: '400px' }}>
                        <Typography variant="h5" sx={{ mb: 2 }}>Λίστα Τμημάτων</Typography>
                        {Object.keys(groupedClassrooms).map(grade => (
                            <Accordion key={grade} expanded={expandedAccordion === grade} onChange={handleAccordionChange(grade)}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography sx={{ fontWeight: 'bold' }}>{grade}</Typography></AccordionSummary>
                                <AccordionDetails sx={{ p: 0 }}>
                                    <List dense sx={{ width: '100%' }}>
                                        {groupedClassrooms[grade].map(classroom => (
                                            <ListItem key={classroom.id} button onClick={() => setSelectedClassroom(classroom)} selected={selectedClassroom?.id === classroom.id}>
                                                <ListItemText primary={`${classroom.classroomName} - ${classroom.subject}`} secondary={classroom.specialization || 'Γενικό'} />
                                            </ListItem>
                                        ))}
                                    </List>
                                </AccordionDetails>
                            </Accordion>
                        ))}
                    </Paper>
                </Grid>
                <Grid item xs={12} md={8}>
                    <Paper elevation={3} sx={{ padding: '20px', borderRadius: '12px', minHeight: '400px' }}>
                        {!selectedClassroom ? (
                             <Typography variant="h5" color='#3f51b5'>Επιλέξτε Τμήμα</Typography>
                        ) : (
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
                                    <Tabs value={activeTab} onChange={handleTabChange}>
                                        <Tab label="Λεπτομέρειες & Διάταξη" />
                                        <Tab label="Βαθμολόγιο" />
                                        <Tab label="Παρουσιολόγιο" />
                                    </Tabs>
                                </Box>
                                <TabPanel value={activeTab} index={0}>
                                    <ClassroomTableVisual classroom={selectedClassroom} db={db} appId={appId} allStudents={allStudents} onAssignStudent={handleAssignStudent} />
                                    <Box sx={{ mt: 4 }}>
                                        <Typography variant="h6" sx={{ mb: 1 }}>Πρόγραμμα:</Typography>
                                        {selectedClassroom.schedule?.length > 0 ? (
                                            <TableContainer component={Paper} variant="outlined">
                                                <Table size="small">
                                                    <TableHead><TableRow><TableCell>Ημέρα</TableCell><TableCell>Έναρξη</TableCell><TableCell>Λήξη</TableCell></TableRow></TableHead>
                                                    <TableBody>
                                                        {selectedClassroom.schedule.map((slot, index) => (
                                                            <TableRow key={index}><TableCell>{slot.day}</TableCell><TableCell>{slot.startTime}</TableCell><TableCell>{slot.endTime}</TableCell></TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        ) : <Typography>Δεν υπάρχει πρόγραμμα.</Typography>}
                                    </Box>
                                </TabPanel>
                                <TabPanel value={activeTab} index={1}>
                                    <Gradebook db={db} appId={appId} allStudents={allStudents} classroom={selectedClassroom} />
                                </TabPanel>
                                <TabPanel value={activeTab} index={2}>
                                    <AttendanceSheet db={db} appId={appId} allStudents={allStudents} allAbsences={allAbsences} classroom={selectedClassroom} />
                                </TabPanel>
                            </>
                        )}
                    </Paper>
                </Grid>
            </Grid>
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
