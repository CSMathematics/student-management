// src/portals/teacher/MyStudents.jsx
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container, Paper, Typography, Box, TextField, InputAdornment,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Tooltip, Avatar
} from '@mui/material';
import { Search as SearchIcon, Assessment as ReportIcon, Message as MessageIcon } from '@mui/icons-material';

function MyStudents({ assignedClassrooms, studentsInClassrooms }) {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    const uniqueStudents = useMemo(() => {
        // We already receive only the students in the teacher's classrooms,
        // so we just need to sort them.
        if (!studentsInClassrooms) return [];
        return [...studentsInClassrooms].sort((a, b) => a.lastName.localeCompare(b.lastName));
    }, [studentsInClassrooms]);

    const filteredStudents = useMemo(() => {
        if (!searchTerm) return uniqueStudents;
        const lowercasedFilter = searchTerm.toLowerCase();
        return uniqueStudents.filter(student =>
            `${student.firstName} ${student.lastName}`.toLowerCase().includes(lowercasedFilter)
        );
    }, [uniqueStudents, searchTerm]);

    const handleNavigate = (path, state = {}) => {
        navigate(path, { state });
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                        Οι Μαθητές μου
                    </Typography>
                    <TextField
                        variant="outlined"
                        size="small"
                        placeholder="Αναζήτηση μαθητή..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                        }}
                    />
                </Box>

                <TableContainer component={Paper} variant="outlined">
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Ονοματεπώνυμο</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Τάξη</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Ενέργειες</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredStudents.map(student => (
                                <TableRow key={student.id} hover>
                                    <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Avatar src={student.profileImageUrl}>{student.firstName?.charAt(0)}{student.lastName?.charAt(0)}</Avatar>
                                        {student.lastName} {student.firstName}
                                    </TableCell>
                                    <TableCell>{student.grade}</TableCell>
                                    <TableCell>{student.email}</TableCell>
                                    <TableCell sx={{ textAlign: 'center' }}>
                                        <Tooltip title="Αναφορά Προόδου">
                                            <IconButton color="secondary" onClick={() => handleNavigate(`/student/report/${student.id}`)}>
                                                <ReportIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Επικοινωνία">
                                            <IconButton color="primary" onClick={() => handleNavigate('/communication', { selectedChannelId: student.id })}>
                                                <MessageIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Container>
    );
}

export default MyStudents;
