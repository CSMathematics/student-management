// src/pages/UsersManager.jsx
import React, { useState, useEffect } from 'react';
import {
    Container, Paper, Typography, Box, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, CircularProgress, Chip,
    FormControl, Select, MenuItem, Button, Alert, Tooltip, IconButton
} from '@mui/material';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import dayjs from 'dayjs';
import { Link as LinkIcon } from '@mui/icons-material';
import ProfileLinker from '../components/ProfileLinker.jsx';

const roleColors = {
    admin: 'error',
    teacher: 'info',
    student: 'success',
    parent: 'secondary',
    pending_approval: 'warning'
};

const roleLabels = {
    admin: 'Διαχειριστής',
    teacher: 'Καθηγητής',
    student: 'Μαθητής',
    parent: 'Γονέας',
    pending_approval: 'Εν Αναμονή'
};

function UsersManager({ db, allStudents }) {
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState({ type: '', message: '' });
    const [userToLink, setUserToLink] = useState(null);

    useEffect(() => {
        const usersRef = collection(db, 'users');
        const unsubscribe = onSnapshot(usersRef, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllUsers(usersData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching users:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [db]);

    const handleRoleChange = async (userId, newRole) => {
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, { role: newRole });
            setFeedback({ type: 'success', message: 'Ο ρόλος του χρήστη ενημερώθηκε.' });
        } catch (error) {
            console.error("Error updating user role:", error);
            setFeedback({ type: 'error', message: 'Σφάλμα κατά την ενημέρωση.' });
        }
    };
    
    const handleOpenLinker = (user) => {
        setUserToLink(user);
    };

    const handleCloseLinker = (didLink) => {
        setUserToLink(null);
        if(didLink) {
            setFeedback({ type: 'success', message: 'Η σύνδεση του προφίλ ολοκληρώθηκε.' });
        }
    };

    if (loading) {
        return <Container sx={{ mt: 4, textAlign: 'center' }}><CircularProgress /></Container>;
    }

    return (
        <>
            <Container maxWidth="lg" sx={{ mt: 4 }}>
                <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                    <Typography variant="h4" component="h1" sx={{ color: 'primary.main', fontWeight: 'bold', mb: 3 }}>
                        Διαχείριση Χρηστών
                    </Typography>
                    {feedback.message && <Alert severity={feedback.type} sx={{ mb: 2 }} onClose={() => setFeedback({type: '', message: ''})}>{feedback.message}</Alert>}
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Ονοματεπώνυμο</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Ρόλος</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Ημ/νία Εγγραφής</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Σύνδεση Προφίλ</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {allUsers.map(user => {
                                    const finalRole = user.requestedRole || user.role;
                                    const canBeLinked = (finalRole === 'student' && !user.profileId) ||
                                                        (finalRole === 'parent' && (!user.childIds || user.childIds.length === 0));

                                    return (
                                        <TableRow key={user.id} hover>
                                            <TableCell>{user.firstName} {user.lastName}</TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>
                                                <FormControl size="small" sx={{minWidth: 150}}>
                                                    <Select
                                                        value={user.role}
                                                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                        renderValue={(selected) => (
                                                            <Chip 
                                                                label={roleLabels[selected] || selected} 
                                                                color={roleColors[selected] || 'default'} 
                                                                size="small" 
                                                            />
                                                        )}
                                                    >
                                                        <MenuItem value="pending_approval">Εν Αναμονή</MenuItem>
                                                        <MenuItem value="student">Μαθητής</MenuItem>
                                                        <MenuItem value="teacher">Καθηγητής</MenuItem>
                                                        <MenuItem value="parent">Γονέας</MenuItem>
                                                        <MenuItem value="admin">Διαχειριστής</MenuItem>
                                                    </Select>
                                                </FormControl>
                                            </TableCell>
                                            <TableCell>{user.createdAt?.toDate ? dayjs(user.createdAt.toDate()).format('DD/MM/YYYY') : '-'}</TableCell>
                                            <TableCell align="center">
                                                {canBeLinked && (
                                                    <Tooltip title="Σύνδεση με προφίλ μαθητή">
                                                        <IconButton color="primary" onClick={() => handleOpenLinker(user)}>
                                                            <LinkIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Container>
            <ProfileLinker
                open={!!userToLink}
                onClose={handleCloseLinker}
                userToLink={userToLink}
                allStudents={allStudents}
                db={db}
            />
        </>
    );
}

export default UsersManager;
