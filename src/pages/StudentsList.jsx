// src/pages/StudentsList.jsx
import React, { useState, useMemo } from 'react';
import {
    Box, Container, Grid, Paper, Typography, TextField,
    FormControl, InputLabel, Select, MenuItem, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TablePagination,
    IconButton, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, CircularProgress
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import { doc, deleteDoc } from 'firebase/firestore';

// The component now receives props from App.jsx
function StudentsList({ allStudents, loading, db, appId, navigateTo }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [page, setPage] = useState(0);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [sortColumn, setSortColumn] = useState('lastName');
    const [sortDirection, setSortDirection] = useState('asc');
    
    // State for delete confirmation
    const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState(null);

    const filteredAndSortedStudents = useMemo(() => {
        let filtered = (allStudents || []).filter(student =>
            (student.firstName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (student.lastName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (student.grade?.toLowerCase() || '').includes(searchTerm.toLowerCase())
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
    }, [allStudents, searchTerm, sortColumn, sortDirection]);

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

    const handleRowClick = (student) => {
        setSelectedStudent(student);
    };

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    // <-- ΑΛΛΑΓΗ: Η handleEditClick περνάει τα δεδομένα απευθείας στη navigateTo -->
    const handleEditClick = (student) => {
        navigateTo('editStudent', { studentToEdit: student });
    };

    const handleDeleteClick = (student) => {
        setStudentToDelete(student);
        setOpenDeleteConfirm(true);
    };

    const handleCloseDeleteConfirm = () => {
        setOpenDeleteConfirm(false);
        setStudentToDelete(null);
    };

    const handleConfirmDelete = async () => {
        if (!db || !appId || !studentToDelete) return;
        try {
            const studentDocRef = doc(db, `artifacts/${appId}/public/data/students`, studentToDelete.id);
            await deleteDoc(studentDocRef);
            setSelectedStudent(null);
        } catch (error) {
            console.error("Error deleting student:", error);
        } finally {
            handleCloseDeleteConfirm();
        }
    };

    const paginatedStudents = filteredAndSortedStudents.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    if (loading) {
        return <Container sx={{ mt: 4, textAlign: 'center' }}><CircularProgress /></Container>;
    }

    return (
        <Container maxWidth="lg">
            <Box sx={{ mt: 3, mb: 3 }}>
                <TextField fullWidth label="Αναζήτηση με όνομα ή τάξη..." variant="outlined" size="small" value={searchTerm} onChange={handleSearchChange} />
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                    <TableContainer component={Paper} elevation={3} sx={{ borderRadius: '12px', overflowX: 'auto' }}>
                        <Table>
                            <TableHead sx={{ backgroundColor: '#1e86cc' }}>
                                <TableRow>
                                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>#</TableCell>
                                    <TableCell sx={{ color: '#fff', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => handleSort('lastName')}>Επώνυμο</TableCell>
                                    <TableCell sx={{ color: '#fff', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => handleSort('firstName')}>Όνομα</TableCell>
                                    <TableCell sx={{ color: '#fff', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => handleSort('grade')}>Τάξη</TableCell>
                                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Τηλέφωνο</TableCell>
                                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Ενέργειες</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedStudents.map((student, index) => (
                                    <TableRow key={student.id} onClick={() => handleRowClick(student)} hover sx={{ cursor: 'pointer' }}>
                                        <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                                        <TableCell>{student.lastName}</TableCell>
                                        <TableCell>{student.firstName}</TableCell>
                                        <TableCell>{student.grade}</TableCell>
                                        <TableCell>{student.studentPhone}</TableCell>
                                        <TableCell>
                                            <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); handleEditClick(student); }}><Edit /></IconButton>
                                            <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); handleDeleteClick(student); }}><Delete /></IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 20, 50]}
                        component="div"
                        count={filteredAndSortedStudents.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handlePageChange}
                        onRowsPerPageChange={handleRowsPerPageChange}
                    />
                </Grid>

                <Grid item xs={12} md={4}>
                    <Paper elevation={3} sx={{ padding: '20px', borderRadius: '12px', minHeight: '300px' }}>
                        <Typography variant="h5" component="h4" sx={{ mb: 2 }}>Λεπτομέρειες Μαθητή</Typography>
                        {selectedStudent ? (
                            <Box>
                                <Typography><strong>Όνομα:</strong> {selectedStudent.firstName} {selectedStudent.lastName}</Typography>
                                <Typography><strong>Ημ. Γέννησης:</strong> {selectedStudent.dob}</Typography>
                                <Typography><strong>Τάξη:</strong> {selectedStudent.grade}</Typography>
                                <Typography><strong>Τηλέφωνο:</strong> {selectedStudent.studentPhone}</Typography>
                                <Typography><strong>Email:</strong> {selectedStudent.email}</Typography>
                                <Typography><strong>Διεύθυνση:</strong> {selectedStudent.address}</Typography>
                                {selectedStudent.parents?.map((parent, i) => (
                                    <Box key={i} mt={1}>
                                        <Typography><strong>Γονέας {i+1}:</strong> {parent.name}</Typography>
                                        <Typography><strong>Τηλ. Γονέα:</strong> {parent.phones?.join(', ')}</Typography>
                                    </Box>
                                ))}
                            </Box>
                        ) : (
                            <Typography>Επιλέξτε έναν μαθητή για να δείτε λεπτομέρειες.</Typography>
                        )}
                    </Paper>
                </Grid>
            </Grid>
            
            <Dialog open={openDeleteConfirm} onClose={handleCloseDeleteConfirm}>
                <DialogTitle>Επιβεβαίωση Διαγραφής</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Είστε σίγουροι ότι θέλετε να διαγράψετε τον μαθητή {studentToDelete?.firstName} {studentToDelete?.lastName};
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

export default StudentsList;
