// src/components/Classrooms.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
    Box, Container, Grid, Paper, Typography, TextField,
    FormControl, InputLabel, Select, MenuItem, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TablePagination,
    IconButton, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    List, ListItem, ListItemText, Divider, CircularProgress, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import { Edit, Delete, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';

// Firebase Imports
import { doc, deleteDoc } from 'firebase/firestore';

// Import the new visual component
import ClassroomTableVisual from './ClassroomTableVisual.jsx';

// Props are now passed down from App.jsx
function Classrooms({ navigateTo, setClassroomToEdit, classrooms, loading, db, appId }) { 
    const [selectedClassroom, setSelectedClassroom] = useState(null);
    
    // State for delete confirmation dialog
    const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
    const [classroomToDelete, setClassroomToDelete] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [page, setPage] = useState(0);
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    // <-- ΑΛΛΑΓΗ: Νέο state για τον έλεγχο των Accordions -->
    const [expandedAccordion, setExpandedAccordion] = useState(false);

    const handleAccordionChange = (panel) => (event, isExpanded) => {
        setExpandedAccordion(isExpanded ? panel : false);
    };

    const groupedClassrooms = useMemo(() => {
        const groups = {};
        classrooms.forEach(classroom => {
            const grade = classroom.grade || 'Χωρίς Τάξη';
            if (!groups[grade]) {
                groups[grade] = [];
            }
            groups[grade].push(classroom);
        });
        const sortedGrades = Object.keys(groups).sort();
        const sortedGroups = {};
        sortedGrades.forEach(grade => {
            sortedGroups[grade] = groups[grade];
        });
        return sortedGroups;
    }, [classrooms]);

    // Set the first accordion as expanded by default
    useEffect(() => {
        const grades = Object.keys(groupedClassrooms);
        if (grades.length > 0) {
            setExpandedAccordion(grades[0]);
        }
    }, [classrooms]); // Run only when classrooms data changes


    const filteredAndSortedClassrooms = useMemo(() => {
        let filtered = classrooms.filter(classroom =>
            (classroom.subject?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (classroom.grade?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (classroom.specialization?.toLowerCase() || '').includes(searchTerm.toLowerCase())
        );

        if (sortColumn) {
            filtered.sort((a, b) => {
                const aValue = a[sortColumn] || '';
                const bValue = b[sortColumn] || '';
                if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return filtered;
    }, [classrooms, searchTerm, sortColumn, sortDirection]);

    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
        setPage(0);
    };

    const handleRowsPerPageChange = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handlePageChange = (event, newPage) => {
        setPage(newPage);
    };

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const handleEditClick = (classroom) => {
        if (setClassroomToEdit && navigateTo) {
            setClassroomToEdit(classroom);
            navigateTo('newClassroom', { classroomToEdit: classroom });
        }
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

    const paginatedClassrooms = filteredAndSortedClassrooms.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
            </Container>
        );
    }
    
    return (
        <Container maxWidth="lg">
            <Box sx={{ mt: 3, mb: 3, display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
                <TextField
                    fullWidth
                    label="Αναζήτηση..."
                    variant="outlined"
                    size="small"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    sx={{ flexGrow: 1, minWidth: '250px' }}
                />
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Paper elevation={3} sx={{ padding: '20px', borderRadius: '12px', minHeight: '400px' }}>
                        <Typography variant="h5" component="h3" sx={{ mb: 2, color: '#3f51b5' }}>
                            Λίστα Τμημάτων
                        </Typography>
                        
                        {Object.keys(groupedClassrooms).length > 0 ? (
                            Object.keys(groupedClassrooms).map(grade => (
                                // <-- ΑΛΛΑΓΗ: Προσθήκη expanded και onChange props -->
                                <Accordion key={grade} expanded={expandedAccordion === grade} onChange={handleAccordionChange(grade)}>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                        <Typography sx={{ fontWeight: 'bold' }}>{grade}</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ p: 0 }}>
                                        <List dense sx={{ width: '100%' }}>
                                            {groupedClassrooms[grade].map(classroom => (
                                                <ListItem
                                                    key={classroom.id}
                                                    button
                                                    onClick={() => setSelectedClassroom(classroom)}
                                                    selected={selectedClassroom && selectedClassroom.id === classroom.id}
                                                >
                                                    <ListItemText
                                                        primary={classroom.subject}
                                                        secondary={classroom.specialization || 'Γενικό'}
                                                    />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </AccordionDetails>
                                </Accordion>
                            ))
                        ) : (
                            <Typography>Δεν υπάρχουν τμήματα.</Typography>
                        )}
                    </Paper>
                </Grid>

                <Grid item xs={12} md={8}>
                    <Paper elevation={3} sx={{ padding: '20px', borderRadius: '12px', minHeight: '400px' }}>
                        <Typography variant="h5" component="h3" sx={{ mb: 2, color: '#3f51b5' }}>
                           Λεπτομέρειες & Διάταξη
                        </Typography>

                        <ClassroomTableVisual classroom={selectedClassroom} db={db} appId={appId} />

                        {selectedClassroom && (
                            <Box sx={{ mt: 4 }}>
                                <Typography variant="h6" sx={{ mb: 1 }}>Πρόγραμμα:</Typography>
                                {selectedClassroom.schedule?.length > 0 ? (
                                    <TableContainer component={Paper} variant="outlined">
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Ημέρα</TableCell>
                                                    <TableCell>Έναρξη</TableCell>
                                                    <TableCell>Λήξη</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {selectedClassroom.schedule.map((slot, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>{slot.day}</TableCell>
                                                        <TableCell>{slot.startTime}</TableCell>
                                                        <TableCell>{slot.endTime}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                ) : (
                                    <Typography>Δεν υπάρχει πρόγραμμα.</Typography>
                                )}
                            </Box>
                        )}
                    </Paper>
                </Grid>
            </Grid>

            <Paper elevation={3} sx={{ padding: '20px', borderRadius: '12px', mt: 4, overflowX: 'auto' }}>
                 <Typography variant="h5" component="h3" sx={{ mb: 2, color: '#3f51b5' }}>
                    Όλα τα Τμήματα
                </Typography>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell onClick={() => handleSort('grade')}>Τάξη</TableCell>
                                <TableCell onClick={() => handleSort('subject')}>Μάθημα</TableCell>
                                <TableCell>Μέγ. Μαθητές</TableCell>
                                <TableCell>Ενέργειες</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedClassrooms.map((classroom) => (
                                <TableRow key={classroom.id} hover>
                                    <TableCell>{classroom.grade}</TableCell>
                                    <TableCell>{classroom.subject}</TableCell>
                                    <TableCell>{classroom.maxStudents}</TableCell>
                                    <TableCell>
                                        <IconButton onClick={() => handleEditClick(classroom)}><Edit /></IconButton>
                                        <IconButton onClick={() => handleDeleteClick(classroom)}><Delete /></IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 20, 50]}
                    component="div"
                    count={filteredAndSortedClassrooms.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handlePageChange}
                    onRowsPerPageChange={handleRowsPerPageChange}
                />
            </Paper>

            <Dialog open={openDeleteConfirm} onClose={handleCloseDeleteConfirm}>
                <DialogTitle>Επιβεβαίωση Διαγραφής</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Είστε σίγουροι ότι θέλετε να διαγράψετε το τμήμα "{classroomToDelete?.subject} - {classroomToDelete?.grade}";
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
