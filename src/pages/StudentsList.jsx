// src/pages/StudentsList.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Container, Grid, Paper, Typography, TextField, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TablePagination,
    IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, CircularProgress,
    Tabs, Tab
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import { doc, deleteDoc } from 'firebase/firestore';
import dayjs from 'dayjs';
import StudentProgressChart from './StudentProgressChart.jsx';

function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

function StudentsList({ allStudents, allGrades, allAbsences, loading, db, appId }) {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [page, setPage] = useState(0);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [sortColumn, setSortColumn] = useState('lastName');
    const [sortDirection, setSortDirection] = useState('asc');
    const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState(null);
    const [activeTab, setActiveTab] = useState(0);

    useEffect(() => {
        setActiveTab(0);
    }, [selectedStudent]);

    const handleTabChange = (event, newValue) => setActiveTab(newValue);

    const studentGrades = useMemo(() => {
        if (!selectedStudent || !allGrades) return [];
        return allGrades.filter(grade => grade.studentId === selectedStudent.id).sort((a, b) => b.date.toDate() - a.date.toDate());
    }, [selectedStudent, allGrades]);

    // --- ΝΕΑ ΛΟΓΙΚΗ: Φιλτράρισμα και καταμέτρηση απουσιών ---
    const studentAbsences = useMemo(() => {
        if (!selectedStudent || !allAbsences) return { list: [], total: 0, justified: 0, unjustified: 0 };
        const list = allAbsences.filter(absence => absence.studentId === selectedStudent.id).sort((a, b) => b.date.toDate() - a.date.toDate());
        const justified = list.filter(a => a.status === 'justified').length;
        const unjustified = list.filter(a => a.status === 'absent').length;
        return { list, total: list.length, justified, unjustified };
    }, [selectedStudent, allAbsences]);

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

    const handlePageChange = (event, newPage) => setPage(newPage);
    const handleRowClick = (student) => setSelectedStudent(student);
    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };
    const handleEditClick = (student) => navigate(`/student/edit/${student.id}`);
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

    const paginatedStudents = filteredAndSortedStudents.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    if (loading) {
        return <Container sx={{ mt: 4, textAlign: 'center' }}><CircularProgress /></Container>;
    }

    return (
        <Container maxWidth={false}>
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
                                    <TableRow key={student.id} onClick={() => handleRowClick(student)} hover sx={{ cursor: 'pointer', backgroundColor: selectedStudent?.id === student.id ? '#eef6fb' : 'inherit' }}>
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
                    <TablePagination rowsPerPageOptions={[5, 10, 20, 50]} component="div" count={filteredAndSortedStudents.length} rowsPerPage={rowsPerPage} page={page} onPageChange={handlePageChange} onRowsPerPageChange={handleRowsPerPageChange} />
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper elevation={3} sx={{ borderRadius: '12px', minHeight: '300px' }}>
                        {!selectedStudent ? (
                            <Box sx={{ p: 3 }}><Typography>Επιλέξτε έναν μαθητή για να δείτε λεπτομέρειες.</Typography></Box>
                        ) : (
                            <>
                                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                                    <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
                                        <Tab label="Λεπτομέρειες" />
                                        <Tab label="Βαθμολογία" />
                                        <Tab label="Πρόοδος" />
                                        <Tab label="Απουσίες" />
                                    </Tabs>
                                </Box>
                                <TabPanel value={activeTab} index={0}>
                                    <Typography><strong>Όνομα:</strong> {selectedStudent.firstName} {selectedStudent.lastName}</Typography>
                                    <Typography><strong>Ημ. Γέννησης:</strong> {selectedStudent.dob}</Typography>
                                    <Typography><strong>Τάξη:</strong> {selectedStudent.grade}</Typography>
                                    {selectedStudent.parents?.map((parent, i) => (
                                        <Box key={i} mt={1}>
                                            <Typography><strong>Γονέας {i+1}:</strong> {parent.name}</Typography>
                                            <Typography><strong>Τηλ. Γονέα:</strong> {parent.phones?.join(', ')}</Typography>
                                        </Box>
                                    ))}
                                </TabPanel>
                                <TabPanel value={activeTab} index={1}>
                                    {studentGrades.length > 0 ? (
                                        <TableContainer><Table size="small"><TableHead><TableRow><TableCell>Ημ/νία</TableCell><TableCell>Μάθημα</TableCell><TableCell>Τύπος</TableCell><TableCell align="right">Βαθμός</TableCell></TableRow></TableHead><TableBody>{studentGrades.map((grade) => (<TableRow key={grade.id}><TableCell>{dayjs(grade.date.toDate()).format('DD/MM/YYYY')}</TableCell><TableCell>{grade.subject}</TableCell><TableCell>{grade.type}</TableCell><TableCell align="right">{grade.grade}</TableCell></TableRow>))}</TableBody></Table></TableContainer>
                                    ) : (<Typography>Δεν υπάρχουν καταχωρημένοι βαθμοί.</Typography>)}
                                </TabPanel>
                                <TabPanel value={activeTab} index={2}>
                                    <StudentProgressChart studentGrades={studentGrades} />
                                </TabPanel>
                                <TabPanel value={activeTab} index={3}>
                                    <Box>
                                        <Typography variant="h6">Σύνολο Απουσιών: {studentAbsences.total}</Typography>
                                        <Typography color="text.secondary">Δικαιολογημένες: {studentAbsences.justified}</Typography>
                                        <Typography color="text.secondary">Αδικαιολόγητες: {studentAbsences.unjustified}</Typography>
                                    </Box>
                                    {studentAbsences.list.length > 0 ? (
                                        <TableContainer sx={{mt: 2}}>
                                            <Table size="small">
                                                <TableHead><TableRow><TableCell>Ημ/νία</TableCell><TableCell>Μάθημα</TableCell><TableCell>Κατάσταση</TableCell></TableRow></TableHead>
                                                <TableBody>
                                                    {studentAbsences.list.map((absence) => (
                                                        <TableRow key={absence.id}>
                                                            <TableCell>{dayjs(absence.date.toDate()).format('DD/MM/YYYY')}</TableCell>
                                                            <TableCell>{absence.subject}</TableCell>
                                                            <TableCell>{absence.status === 'justified' ? 'Δικαιολογημένη' : 'Αδικαιολόγητη'}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    ) : (<Typography sx={{mt: 2}}>Δεν υπάρχουν καταχωρημένες απουσίες.</Typography>)}
                                </TabPanel>
                            </>
                        )}
                    </Paper>
                </Grid>
            </Grid>
            <Dialog open={openDeleteConfirm} onClose={handleCloseDeleteConfirm}>
                <DialogTitle>Επιβεβαίωση Διαγραφής</DialogTitle>
                <DialogContent><DialogContentText>Είστε σίγουροι ότι θέλετε να διαγράψετε τον μαθητή {studentToDelete?.firstName} {studentToDelete?.lastName};</DialogContentText></DialogContent>
                <DialogActions><Button onClick={handleCloseDeleteConfirm}>Ακύρωση</Button><Button onClick={handleConfirmDelete} color="error">Διαγραφή</Button></DialogActions>
            </Dialog>
        </Container>
    );
}

export default StudentsList;
