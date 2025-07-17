// src/components/Classrooms.jsx
import React, { useState } from 'react';
import {
    Box, Container, Grid, Paper, Typography, List, ListItem,
    ListItemText, Divider, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow
} from '@mui/material';
import { MOCK_CLASSROOMS } from '../data/classrooms.js'; // Import mock classroom data
import ClassroomTableVisual from './ClassroomTableVisual.jsx'; // Import the new visual component

function Classrooms() {
    const [selectedClassroom, setSelectedClassroom] = useState(null);

    return (
        <Container maxWidth="lg">
            <Grid container spacing={3}>
                {/* Left Column: Classroom List */}
                <Grid item xs={12} md={4}>
                    <Paper elevation={3} sx={{ padding: '20px', borderRadius: '12px', minHeight: '400px' }}>
                        <Typography variant="h5" component="h3" sx={{ mb: 2, color: '#3f51b5' }}>
                            <i className="fas fa-chalkboard" style={{ marginRight: '8px' }}></i> Λίστα Τμημάτων
                        </Typography>
                        <List>
                            {MOCK_CLASSROOMS.map(classroom => (
                                <React.Fragment key={classroom.id}>
                                    <ListItem
                                        button
                                        onClick={() => setSelectedClassroom(classroom)}
                                        selected={selectedClassroom && selectedClassroom.id === classroom.id}
                                        sx={{
                                            borderRadius: '8px',
                                            mb: 1,
                                            '&.Mui-selected': {
                                                backgroundColor: '#eef6fb',
                                                color: '#1e86cc',
                                                fontWeight: 'bold',
                                            },
                                            '&.Mui-selected:hover': {
                                                backgroundColor: '#eef6fb',
                                            },
                                        }}
                                    >
                                        <ListItemText
                                            primary={classroom.name}
                                            secondary={`Μάθημα: ${classroom.lesson}`}
                                        />
                                    </ListItem>
                                    <Divider component="li" />
                                </React.Fragment>
                            ))}
                        </List>
                        {MOCK_CLASSROOMS.length === 0 && (
                            <Typography variant="body2" sx={{ color: '#757575', mt: 2, textAlign: 'center' }}>
                                Δεν υπάρχουν διαθέσιμα τμήματα.
                            </Typography>
                        )}
                    </Paper>
                </Grid>

                {/* Right Column: Classroom Details */}
                <Grid item xs={12} md={8}>
                    <Paper elevation={3} sx={{ padding: '20px', borderRadius: '12px', minHeight: '400px' , minWidth: '600px' }}>
                        <Typography variant="h5" component="h3" sx={{ mb: 2, color: '#3f51b5' }}>
                            <i className="fas fa-info-circle" style={{ marginRight: '8px' }}></i> Λεπτομέρειες Τμήματος
                        </Typography>

                        {/* Classroom Table Visual - Added here */}
                        <ClassroomTableVisual classroom={selectedClassroom} />

                        {selectedClassroom ? (
                            <Box sx={{ '& p': { mb: 1.5 }, mt: 4 }}> {/* Added mt:4 to separate from visual */}
                                <Typography variant="body1"><strong>Όνομα Τμήματος:</strong> {selectedClassroom.name}</Typography>
                                <Typography variant="body1"><strong>Μάθημα:</strong> {selectedClassroom.lesson}</Typography>
                                <Typography variant="body1"><strong>Πρόγραμμα Σπουδών:</strong> {selectedClassroom.curriculum}</Typography>
                                <Typography variant="body1"><strong>Ώρες / Εβδομάδα:</strong> {selectedClassroom.hoursPerWeek}</Typography>
                                <Typography variant="body1"><strong>Μέγιστος Αριθμός Μαθητών:</strong> {selectedClassroom.maxStudents}</Typography>
                                <Typography variant="body1"><strong>Εγγεγραμμένοι Μαθητές:</strong> {selectedClassroom.enrolledStudents.length} / {selectedClassroom.maxStudents}</Typography>

                                <Divider sx={{ my: 3 }} />

                                <Typography variant="h6" sx={{ mb: 1 }}>Εγγεγραμμένοι Μαθητές:</Typography>
                                {selectedClassroom.enrolledStudents.length > 0 ? (
                                    <List dense>
                                        {selectedClassroom.enrolledStudents.map(student => (
                                            <ListItem key={student.id} disablePadding>
                                                <ListItemText primary={student.name} />
                                            </ListItem>
                                        ))}
                                    </List>
                                ) : (
                                    <Typography variant="body2" sx={{ color: '#757575' }}>Δεν υπάρχουν εγγεγραμμένοι μαθητές.</Typography>
                                )}

                                <Divider sx={{ my: 3 }} />

                                <Typography variant="h6" sx={{ mb: 1 }}>Εργασίες:</Typography>
                                {selectedClassroom.homework.length > 0 ? (
                                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Τίτλος</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Προθεσμία</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Κατάσταση</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {selectedClassroom.homework.map(hw => (
                                                    <TableRow key={hw.id}>
                                                        <TableCell>{hw.title}</TableCell>
                                                        <TableCell>{hw.dueDate}</TableCell>
                                                        <TableCell>{hw.status}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                ) : (
                                    <Typography variant="body2" sx={{ color: '#757575' }}>Δεν υπάρχουν καταχωρημένες εργασίες.</Typography>
                                )}

                                <Divider sx={{ my: 3 }} />

                                <Typography variant="h6" sx={{ mb: 1 }}>Εξετάσεις & Αποτελέσματα:</Typography>
                                {selectedClassroom.exams.length > 0 ? (
                                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Τίτλος</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Ημερομηνία</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Αποτέλεσμα</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {selectedClassroom.exams.map(exam => (
                                                    <TableRow key={exam.id}>
                                                        <TableCell>{exam.title}</TableCell>
                                                        <TableCell>{exam.date}</TableCell>
                                                        <TableCell>{exam.result}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                ) : (
                                    <Typography variant="body2" sx={{ color: '#757575' }}>Δεν υπάρχουν καταχωρημένες εξετάσεις.</Typography>
                                )}

                                <Divider sx={{ my: 3 }} />

                                <Typography variant="h6" sx={{ mb: 1 }}>Πρόγραμμα:</Typography>
                                {selectedClassroom.schedule.length > 0 ? (
                                    <TableContainer component={Paper} variant="outlined">
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Ημέρα</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Ώρα</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {selectedClassroom.schedule.map((slot, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>{slot.day}</TableCell>
                                                        <TableCell>{slot.time}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                ) : (
                                    <Typography variant="body2" sx={{ color: '#757575' }}>Δεν υπάρχει καταχωρημένο πρόγραμμα.</Typography>
                                )}

                            </Box>
                        ) : (
                            <Typography variant="body1" sx={{ color: '#757575', textAlign: 'center', mt: 4 }}>
                                Επιλέξτε ένα τμήμα από την λίστα για να δείτε λεπτομέρειες.
                            </Typography>
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
}

export default Classrooms;
