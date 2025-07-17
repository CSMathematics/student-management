// js/components/StudentsList.jsx
import React, { useState, useMemo } from 'react';
import {
    Box, Container, Grid, Paper, Typography, TextField,
    FormControl, InputLabel, Select, MenuItem, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TablePagination,
    IconButton, Button
} from '@mui/material';
import { MOCK_STUDENTS } from '../data.js'; // Import mock data

function StudentsList() {
    const [students, setStudents] = useState(MOCK_STUDENTS);
    const [searchTerm, setSearchTerm] = useState('');
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [page, setPage] = useState(0);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'

    // Filter and sort students
    const filteredAndSortedStudents = useMemo(() => {
        let filtered = students.filter(student =>
            student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.grade.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (sortColumn) {
            filtered.sort((a, b) => {
                const aValue = a[sortColumn];
                const bValue = b[sortColumn];

                if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return filtered;
    }, [students, searchTerm, sortColumn, sortDirection]);

    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
        setPage(0); // Reset page when searching
    };

    const handleRowsPerPageChange = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0); // Reset page when rows per page changes
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

    // Function to handle PDF export
    const handleExportPdf = () => {
        // Ensure jsPDF is available
        if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
            console.error("jsPDF library not loaded. Please check CDN link.");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Define columns for the PDF table
        const columns = [
            { header: '#', dataKey: 'id' },
            { header: 'Όνομα', dataKey: 'firstName' },
            { header: 'Επώνυμο', dataKey: 'lastName' },
            { header: 'Ημ. Γέννησης', dataKey: 'dob' },
            { header: 'Τάξη', dataKey: 'grade' },
            { header: 'Τηλέφωνο', dataKey: 'studentPhone' },
            { header: 'Email', dataKey: 'email' },
        ];

        // Prepare data for the PDF table
        const data = filteredAndSortedStudents.map(student => ({
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            dob: student.dob,
            grade: student.grade,
            studentPhone: student.studentPhone,
            email: student.email,
        }));

        doc.text("Λίστα Μαθητών", 14, 15); // Title for the PDF
        doc.autoTable({
            startY: 20, // Start table below the title
            head: [columns.map(col => col.header)],
            body: data.map(row => columns.map(col => row[col.dataKey])),
            theme: 'striped', // Optional: 'striped', 'grid', 'plain'
            styles: {
                font: 'helvetica',
                fontSize: 10,
                cellPadding: 3,
                valign: 'middle',
            },
            headStyles: {
                fillColor: [30, 134, 204], // Corresponds to #1e86cc
                textColor: [255, 255, 255],
                fontStyle: 'bold',
            },
            alternateRowStyles: {
                fillColor: [249, 249, 249], // Corresponds to #f9f9f9
            },
            bodyStyles: {
                textColor: [51, 51, 51], // Corresponds to #333
            },
        });

        doc.save('students_list.pdf'); // Save the PDF
    };

    // Calculate students for the current page
    const paginatedStudents = filteredAndSortedStudents.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    return (
        <Container maxWidth="lg">
            {/* Search, Rows per page, and PDF Export Button */}
            <Box sx={{ mt: 3, mb: 3, display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
                <TextField
                    fullWidth
                    label="Αναζήτηση με όνομα ή τάξη..."
                    variant="outlined"
                    size="small"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    sx={{ flexGrow: 1, minWidth: '250px' }}
                />
                <FormControl variant="outlined" size="small" sx={{ minWidth: '150px' }}>
                    <InputLabel>Εγγραφές ανά σελίδα</InputLabel>
                    <Select
                        value={rowsPerPage}
                        onChange={handleRowsPerPageChange}
                        label="Εγγραφές ανά σελίδα"
                    >
                        <MenuItem value={5}>5</MenuItem>
                        <MenuItem value={10}>10</MenuItem>
                        <MenuItem value={20}>20</MenuItem>
                        <MenuItem value={50}>50</MenuItem>
                    </Select>
                </FormControl>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleExportPdf}
                    sx={{ borderRadius: '8px', padding: '10px 20px', minWidth: '150px' }}
                >
                    <i className="fas fa-file-pdf" style={{ marginRight: '8px' }}></i> Εξαγωγή PDF
                </Button>
            </Box>

            {/* Total Count */}
            <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 2 }}>
                Συνολικός Αριθμός Μαθητών: {filteredAndSortedStudents.length}
            </Typography>

            <Grid container spacing={3}>
                {/* Student Table */}
                <Grid item xs={12} md={8}>
                    <TableContainer component={Paper} elevation={3} sx={{ borderRadius: '12px', overflowX: 'auto' }}>
                        <Table sx={{ minWidth: 650 }} aria-label="student table">
                            <TableHead sx={{ backgroundColor: '#1e86cc' }}>
                                <TableRow>
                                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>#</TableCell>
                                    <TableCell sx={{ color: '#fff', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => handleSort('firstName')}>Όνομα {sortColumn === 'firstName' ? (sortDirection === 'asc' ? '↑' : '↓') : '⬍'}</TableCell>
                                    <TableCell sx={{ color: '#fff', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => handleSort('lastName')}>Επώνυμο {sortColumn === 'lastName' ? (sortDirection === 'asc' ? '↑' : '↓') : '⬍'}</TableCell>
                                    <TableCell sx={{ color: '#fff', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => handleSort('dob')}>Ημ. Γέννησης {sortColumn === 'dob' ? (sortDirection === 'asc' ? '↑' : '↓') : '⬍'}</TableCell>
                                    <TableCell sx={{ color: '#fff', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => handleSort('grade')}>Τάξη {sortColumn === 'grade' ? (sortDirection === 'asc' ? '↑' : '↓') : '⬍'}</TableCell>
                                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Τηλέφωνο</TableCell>
                                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Email</TableCell>
                                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Ενέργειες</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedStudents.length > 0 ? (
                                    paginatedStudents.map((student) => (
                                        <TableRow
                                            key={student.id}
                                            onClick={() => handleRowClick(student)}
                                            sx={{
                                                '&:nth-of-type(odd)': { backgroundColor: '#f9f9f9' },
                                                '&:nth-of-type(even)': { backgroundColor: '#ffffff' },
                                                '&:hover': { backgroundColor: '#eef6fb', cursor: 'pointer' },
                                            }}
                                        >
                                            <TableCell>{student.id}</TableCell>
                                            <TableCell>{student.firstName}</TableCell>
                                            <TableCell>{student.lastName}</TableCell>
                                            <TableCell>{student.dob}</TableCell>
                                            <TableCell>{student.grade}</TableCell>
                                            <TableCell>{student.studentPhone}</TableCell>
                                            <TableCell>{student.email}</TableCell>
                                            <TableCell>
                                                <Box className="action-buttons">
                                                    <IconButton size="small" color="primary" title="Επεξεργασία">
                                                        <i className="fas fa-edit"></i>
                                                    </IconButton>
                                                    <IconButton size="small" color="error" title="Διαγραφή">
                                                        <i className="fas fa-trash-alt"></i>
                                                    </IconButton>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center">
                                            Δεν βρέθηκαν μαθητές.
                                        </TableCell>
                                    </TableRow>
                                )}
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
                        labelRowsPerPage="Εγγραφές ανά σελίδα:"
                        labelDisplayedRows={({ from, to, count }) => `${from}-${to} από ${count}`}
                        sx={{ mt: 2, borderRadius: '8px', backgroundColor: '#fff', boxShadow: '0 0 5px rgba(0,0,0,0.05)' }}
                    />
                </Grid>

                {/* Student Details Box */}
                <Grid item xs={12} md={4}>
                    <Paper elevation={3} sx={{ padding: '20px', borderRadius: '12px', minHeight: '300px' }}>
                        <Typography variant="h5" component="h4" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: '8px', color: '#3f51b5' }}>
                            <i className="fas fa-user"></i> Λεπτομέρειες Μαθητή
                        </Typography>
                        <Box sx={{ color: '#333', fontSize: '14px' }}>
                            {selectedStudent ? (
                                <Box>
                                    <Typography variant="body1"><strong>Όνομα:</strong> {selectedStudent.firstName} {selectedStudent.lastName}</Typography>
                                    <Typography variant="body1"><strong>Ημ. Γέννησης:</strong> {selectedStudent.dob}</Typography>
                                    <Typography variant="body1"><strong>Τάξη:</strong> {selectedStudent.grade}</Typography>
                                    <Typography variant="body1"><strong>Τηλέφωνο:</strong> {selectedStudent.studentPhone}</Typography>
                                    <Typography variant="body1"><strong>Email:</strong> {selectedStudent.email}</Typography>
                                    <Typography variant="body1"><strong>Διεύθυνση:</strong> {selectedStudent.address}</Typography>
                                    <Typography variant="body1"><strong>Όνομα Γονέα:</strong> {selectedStudent.parentName}</Typography>
                                    <Typography variant="body1"><strong>Τηλέφωνα Γονέα:</strong> {selectedStudent.parentPhones.join(', ')}</Typography>
                                    {/* Add more details as needed */}
                                </Box>
                            ) : (
                                <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#757575' }}>
                                    Κάντε κλικ σε μία γραμμή για να δείτε λεπτομέρειες...
                                </Typography>
                            )}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
}

export default StudentsList;
