// src/components/Classrooms.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Container, Grid, Paper, Typography, TextField,
    FormControl, InputLabel, Select, MenuItem, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TablePagination,
    IconButton, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    List, ListItem, ListItemText, Divider // Ensure List, ListItem, ListItemText, Divider are imported
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material'; // Import Material-UI icons

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, query, onSnapshot, doc, deleteDoc } from 'firebase/firestore'; // Import doc and deleteDoc

// Import the new visual component (assuming it exists in your project)
import ClassroomTableVisual from './ClassroomTableVisual.jsx';

function Classrooms({ navigateTo, setClassroomToEdit }) { // Added navigateTo and setClassroomToEdit props
    const [classrooms, setClassrooms] = useState([]);
    const [selectedClassroom, setSelectedClassroom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [db, setDb] = useState(null); // State for Firestore instance
    const [userId, setUserId] = useState(null); // State for user ID

    // State for delete confirmation dialog
    const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
    const [classroomToDeleteId, setClassroomToDeleteId] = useState(null);
    const [classroomToDeleteName, setClassroomToDeleteName] = useState('');

    // Initialize Firebase and authenticate, then set up real-time listener
    useEffect(() => {
        let unsubscribe = () => {}; // Initialize unsubscribe function

        try {
            const firebaseConfigString = typeof __firebase_config !== 'undefined'
                ? __firebase_config
                : import.meta.env.VITE_FIREBASE_CONFIG;

            const appId = typeof __app_id !== 'undefined'
                ? __app_id
                : import.meta.env.VITE_APP_ID || 'default-local-app-id';

            const initialAuthToken = typeof __initial_auth_token !== 'undefined'
                ? __initial_auth_token
                : import.meta.env.VITE_INITIAL_AUTH_TOKEN;

            const parsedFirebaseConfig = firebaseConfigString ? JSON.parse(firebaseConfigString) : {};

            if (Object.keys(parsedFirebaseConfig).length === 0 || !parsedFirebaseConfig.apiKey) {
                console.error("Firebase config is missing or incomplete.");
                setError("Firebase configuration is missing. Cannot load classrooms.");
                setLoading(false);
                return;
            }

            const app = initializeApp(parsedFirebaseConfig);
            const firestoreDb = getFirestore(app);
            const firebaseAuth = getAuth(app);

            setDb(firestoreDb); // Set db state

            const authenticateAndListen = async () => {
                try {
                    if (initialAuthToken) {
                        await signInWithCustomToken(firebaseAuth, initialAuthToken);
                    } else {
                        await signInAnonymously(firebaseAuth);
                    }
                    const currentUserId = firebaseAuth.currentUser?.uid || crypto.randomUUID();
                    setUserId(currentUserId);

                    // Set up real-time listener for classrooms
                    const classroomsCollectionRef = collection(firestoreDb, `artifacts/${appId}/public/data/classrooms`);
                    const q = query(classroomsCollectionRef); // No orderBy as per previous instruction

                    unsubscribe = onSnapshot(q, (snapshot) => {
                        const fetchedClassrooms = snapshot.docs.map(doc => ({
                            id: doc.id, // Document ID from Firestore
                            ...doc.data()
                        }));
                        setClassrooms(fetchedClassrooms);
                        setLoading(false);
                        // If a classroom was selected, try to re-select it with updated data
                        if (selectedClassroom) {
                            const updatedSelected = fetchedClassrooms.find(c => c.id === selectedClassroom.id);
                            setSelectedClassroom(updatedSelected || null);
                        }
                    }, (err) => {
                        console.error("Error fetching classrooms:", err);
                        setError("Failed to load classrooms. Please try again.");
                        setLoading(false);
                    });

                } catch (authError) {
                    console.error("Error during Firebase authentication:", authError);
                    setError("Authentication failed. Cannot load classrooms.");
                    setLoading(false);
                }
            };

            authenticateAndListen();

        } catch (initError) {
            console.error("Error during Firebase initialization (outside auth block):", initError);
            setError("Error initializing Firebase. Check console for details.");
            setLoading(false);
        }

        // Cleanup function for onSnapshot listener
        return () => unsubscribe();
    }, [selectedClassroom]); // Added selectedClassroom to dependencies to re-select if data updates

    const [searchTerm, setSearchTerm] = useState('');
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [page, setPage] = useState(0);
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'

    // Filter and sort classrooms
    const filteredAndSortedClassrooms = useMemo(() => {
        let filtered = classrooms.filter(classroom =>
            classroom.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            classroom.grade.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (classroom.specialization && classroom.specialization.toLowerCase().includes(searchTerm.toLowerCase()))
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
    }, [classrooms, searchTerm, sortColumn, sortDirection]);

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

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    // Handle Edit Classroom
    const handleEditClick = (classroom) => {
        if (setClassroomToEdit && navigateTo) {
            setClassroomToEdit(classroom); // Set the classroom to be edited
            navigateTo('newClassroom'); // Navigate to the new classroom form
        }
    };

    // Handle Delete Confirmation Dialog
    const handleDeleteClick = (id, classroomData) => { // Changed name to classroomData for clarity
        setClassroomToDeleteId(id);
        // Safely construct the display name
        const namePart = classroomData.grade && classroomData.subject
            ? `${classroomData.grade} - ${classroomData.subject}`
            : classroomData.grade || classroomData.subject || 'Άγνωστο Τμήμα';
        setClassroomToDeleteName(namePart);
        setOpenDeleteConfirm(true);
    };

    const handleCloseDeleteConfirm = () => {
        setOpenDeleteConfirm(false);
        setClassroomToDeleteId(null);
        setClassroomToDeleteName('');
    };

    const handleConfirmDelete = async () => {
        if (!db || !classroomToDeleteId) {
            alert("Database not initialized or no classroom selected for deletion.");
            return;
        }

        try {
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-local-app-id';
            const classroomDocRef = doc(db, `artifacts/${appId}/public/data/classrooms`, classroomToDeleteId);
            await deleteDoc(classroomDocRef);
            alert("Classroom deleted successfully!");
            setSelectedClassroom(null); // Deselect the classroom if it was the one deleted
        } catch (error) {
            console.error("Error deleting classroom:", error);
            alert("Failed to delete classroom. Please try again.");
        } finally {
            handleCloseDeleteConfirm();
        }
    };

    // Calculate classrooms for the current page
    const paginatedClassrooms = filteredAndSortedClassrooms.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4 }}>
                <Typography variant="h6" align="center">Φόρτωση τμημάτων...</Typography>
            </Container>
        );
    }

    if (error) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4 }}>
                <Typography variant="h6" color="error" align="center">{error}</Typography>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg">
            <Box sx={{ mt: 3, mb: 3, display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
                <TextField
                    fullWidth
                    label="Αναζήτηση με μάθημα, τάξη ή κατεύθυνση..."
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
            </Box>

            <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 2 }}>
                Συνολικός Αριθμός Τμημάτων: {filteredAndSortedClassrooms.length}
            </Typography>

            <Grid container spacing={3}>
                {/* Left Column: Classroom List */}
                <Grid item xs={12} md={4}>
                    <Paper elevation={3} sx={{ padding: '20px', borderRadius: '12px', minHeight: '400px' }}>
                        <Typography variant="h5" component="h3" sx={{ mb: 2, color: '#3f51b5' }}>
                            <i className="fas fa-chalkboard" style={{ marginRight: '8px' }}></i> Λίστα Τμημάτων
                        </Typography>
                        <List>
                            {classrooms.length > 0 ? (
                                classrooms.map(classroom => (
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
                                                primary={`${classroom.grade} - ${classroom.subject} (${classroom.specialization || 'Γενικό'})`}
                                                secondary={`Μέγ. Μαθητές: ${classroom.maxStudents}`}
                                            />
                                        </ListItem>
                                        <Divider component="li" />
                                    </React.Fragment>
                                ))
                            ) : (
                                <Typography variant="body2" sx={{ color: '#757575', mt: 2, textAlign: 'center' }}>
                                    Δεν υπάρχουν διαθέσιμα τμήματα.
                                </Typography>
                            )}
                        </List>
                    </Paper>
                </Grid>

                {/* Right Column: Classroom Details */}
                <Grid item xs={12} md={8}>
                    <Paper elevation={3} sx={{ padding: '20px', borderRadius: '12px', minHeight: '400px' , minWidth: '600px' }}>
                        <Typography variant="h5" component="h3" sx={{ mb: 2, color: '#3f51b5' }}>
                            <i className="fas fa-info-circle" style={{ marginRight: '8px' }}></i> Λεπτομέρειες Τμήματος
                        </Typography>

                        <ClassroomTableVisual classroom={selectedClassroom} />

                        {selectedClassroom ? (
                            <Box sx={{ '& p': { mb: 1.5 }, mt: 4 }}>
                                <Typography variant="body1"><strong>Τάξη:</strong> {selectedClassroom.grade}</Typography>
                                <Typography variant="body1"><strong>Κατεύθυνση:</strong> {selectedClassroom.specialization || 'Γενικό'}</Typography>
                                <Typography variant="body1"><strong>Μάθημα:</strong> {selectedClassroom.subject}</Typography>
                                <Typography variant="body1"><strong>Μέγιστος Αριθμός Μαθητών:</strong> {selectedClassroom.maxStudents}</Typography>
                                <Typography variant="body1"><strong>Συνολική Διάρκεια:</strong> {selectedClassroom.totalDuration}</Typography>

                                <Divider sx={{ my: 3 }} />

                                <Typography variant="h6" sx={{ mb: 1 }}>Πρόγραμμα:</Typography>
                                {selectedClassroom.schedule && selectedClassroom.schedule.length > 0 ? (
                                    <TableContainer component={Paper} variant="outlined">
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Ημέρα</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Ώρα Έναρξης</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Ώρα Λήξης</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Διάρκεια</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {selectedClassroom.schedule.map((slot, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>{slot.day}</TableCell>
                                                        <TableCell>{slot.startTime}</TableCell>
                                                        <TableCell>{slot.endTime}</TableCell>
                                                        <TableCell>{slot.duration}</TableCell>
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

            {/* Table for all classrooms with Edit/Delete actions */}
            <Paper elevation={3} sx={{ padding: '20px', borderRadius: '12px', mt: 4, overflowX: 'auto' }}>
                <Typography variant="h5" component="h3" sx={{ mb: 2, color: '#3f51b5' }}>
                    <i className="fas fa-list-alt" style={{ marginRight: '8px' }}></i> Όλα τα Τμήματα
                </Typography>
                <TableContainer>
                    <Table sx={{ minWidth: 650 }} aria-label="all classrooms table">
                        <TableHead sx={{ backgroundColor: '#1e86cc' }}>
                            <TableRow>
                                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>#</TableCell>
                                <TableCell sx={{ color: '#fff', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => handleSort('grade')}>Τάξη {sortColumn === 'grade' ? (sortDirection === 'asc' ? '↑' : '↓') : '⬍'}</TableCell>
                                <TableCell sx={{ color: '#fff', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => handleSort('specialization')}>Κατεύθυνση {sortColumn === 'specialization' ? (sortDirection === 'asc' ? '↑' : '↓') : '⬍'}</TableCell>
                                <TableCell sx={{ color: '#fff', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => handleSort('subject')}>Μάθημα {sortColumn === 'subject' ? (sortDirection === 'asc' ? '↑' : '↓') : '⬍'}</TableCell>
                                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Μέγ. Μαθητές</TableCell>
                                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Συν. Διάρκεια</TableCell>
                                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Ενέργειες</TableCell> {/* Actions column */}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedClassrooms.length > 0 ? (
                                paginatedClassrooms.map((classroom, index) => (
                                    <TableRow
                                        key={classroom.id}
                                        sx={{
                                            '&:nth-of-type(odd)': { backgroundColor: '#f9f9f9' },
                                            '&:nth-of-type(even)': { backgroundColor: '#ffffff' },
                                            '&:hover': { backgroundColor: '#eef6fb', cursor: 'pointer' },
                                        }}
                                    >
                                        <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                                        <TableCell>{classroom.grade}</TableCell>
                                        <TableCell>{classroom.specialization || '-'}</TableCell>
                                        <TableCell>{classroom.subject}</TableCell>
                                        <TableCell>{classroom.maxStudents}</TableCell>
                                        <TableCell>{classroom.totalDuration}</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: '5px' }}>
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    title="Επεξεργασία"
                                                    onClick={() => handleEditClick(classroom)}
                                                >
                                                    <Edit />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    title="Διαγραφή"
                                                    onClick={() => handleDeleteClick(classroom.id, classroom)}
                                                >
                                                    <Delete />
                                                </IconButton>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} align="center">
                                        Δεν βρέθηκαν τμήματα.
                                    </TableCell>
                                </TableRow>
                            )}
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
                    labelRowsPerPage="Εγγραφές ανά σελίδα:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} από ${count}`}
                    sx={{ mt: 2, borderRadius: '8px', backgroundColor: '#fff', boxShadow: '0 0 5px rgba(0,0,0,0.05)' }}
                />
            </Paper>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={openDeleteConfirm}
                onClose={handleCloseDeleteConfirm}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">{"Επιβεβαίωση Διαγραφής"}</DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        Είστε σίγουροι ότι θέλετε να διαγράψετε το τμήμα "{classroomToDeleteName}";
                        Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteConfirm} color="primary">
                        Ακύρωση
                    </Button>
                    <Button onClick={handleConfirmDelete} color="error" autoFocus>
                        Διαγραφή
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default Classrooms;
