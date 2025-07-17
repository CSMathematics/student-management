// src/components/Classrooms.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Container, Grid, Paper, Typography, List, ListItem,
    ListItemText, Divider, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow
} from '@mui/material';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, query, onSnapshot } from 'firebase/firestore';

// Import the existing mock classroom data structure (though it won't be used directly for data)
// import { MOCK_CLASSROOMS } from '../data/classrooms.js'; // No longer needed for data, but keeping import if ClassroomTableVisual expects it

// Import the new visual component (assuming it exists in your project)
import ClassroomTableVisual from './ClassroomTableVisual.jsx';

function Classrooms() {
    const [classrooms, setClassrooms] = useState([]);
    const [selectedClassroom, setSelectedClassroom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [db, setDb] = useState(null); // State for Firestore instance
    const [userId, setUserId] = useState(null); // State for user ID

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

                        {/* Classroom Table Visual - Added here */}
                        {/* Assuming ClassroomTableVisual expects a 'classroom' prop with the selected classroom's data */}
                        <ClassroomTableVisual classroom={selectedClassroom} />

                        {selectedClassroom ? (
                            <Box sx={{ '& p': { mb: 1.5 }, mt: 4 }}> {/* Added mt:4 to separate from visual */}
                                <Typography variant="body1"><strong>Τάξη:</strong> {selectedClassroom.grade}</Typography>
                                <Typography variant="body1"><strong>Κατεύθυνση:</strong> {selectedClassroom.specialization || 'Γενικό'}</Typography>
                                <Typography variant="body1"><strong>Μάθημα:</strong> {selectedClassroom.subject}</Typography>
                                <Typography variant="body1"><strong>Μέγιστος Αριθμός Μαθητών:</strong> {selectedClassroom.maxStudents}</Typography>
                                <Typography variant="body1"><strong>Συνολική Διάρκεια:</strong> {selectedClassroom.totalDuration}</Typography>
                                {/* enrolledStudents, homework, exams are not part of the data saved by NewClassroomForm,
                                    so they will be empty or undefined unless you explicitly add them during creation or editing.
                                    For now, I'll comment them out or adjust to show relevant fields.
                                    If you want to add these, you'll need to update NewClassroomForm to include them.
                                */}
                                {/* <Typography variant="body1"><strong>Εγγεγραμμένοι Μαθητές:</strong> {selectedClassroom.enrolledStudents ? selectedClassroom.enrolledStudents.length : 0} / {selectedClassroom.maxStudents}</Typography> */}

                                <Divider sx={{ my: 3 }} />

                                {/* <Typography variant="h6" sx={{ mb: 1 }}>Εγγεγραμμένοι Μαθητές:</Typography>
                                {selectedClassroom.enrolledStudents && selectedClassroom.enrolledStudents.length > 0 ? (
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
                                {selectedClassroom.homework && selectedClassroom.homework.length > 0 ? (
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
                                {selectedClassroom.exams && selectedClassroom.exams.length > 0 ? (
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

                                <Divider sx={{ my: 3 }} /> */}

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
        </Container>
    );
}

export default Classrooms;
