// src/pages/UsersManager.jsx
import React, { useState, useEffect } from 'react';
import {
    Container, Paper, Typography, Box, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, CircularProgress, Chip,
    FormControl, Select, MenuItem, Button, Alert, Tooltip, IconButton, OutlinedInput
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

const allRoles = ['admin', 'teacher', 'student', 'parent', 'pending_approval'];

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

    const handleRoleChange = async (userId, newRoles) => {
        // Ensure newRoles is always an array
        const rolesToUpdate = typeof newRoles === 'string' ? newRoles.split(',') : newRoles;

        try {
            const userRef = doc(db, 'users', userId);
            // Update the 'roles' field. We also set 'role' to the first role for legacy compatibility.
            await updateDoc(userRef, { 
                roles: rolesToUpdate,
                role: rolesToUpdate[0] || 'unknown' 
            });
            setFeedback({ type: 'success', message: 'Οι ρόλοι του χρήστη ενημερώθηκαν.' });
        } catch (error) {
            console.error("Error updating user roles:", error);
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
                                    // Use 'roles' array primarily, fallback to 'role' field
                                    const userRoles = user.roles || (user.role ? [user.role] : []);
                                    const primaryRole = user.requestedRole || userRoles[0];
                                    const canBeLinked = (primaryRole === 'student' && !user.profileId) ||
                                                        (primaryRole === 'parent' && (!user.childIds || user.childIds.length === 0));

                                    return (
                                        <TableRow key={user.id} hover>
                                            <TableCell>{user.firstName} {user.lastName}</TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>
                                                <FormControl size="small" sx={{minWidth: 200}}>
                                                    <Select
                                                        multiple
                                                        value={userRoles}
                                                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                        input={<OutlinedInput label="Ρόλοι" />}
                                                        renderValue={(selected) => (
                                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                                {selected.map((value) => (
                                                                    <Chip 
                                                                        key={value}
                                                                        label={roleLabels[value] || value} 
                                                                        color={roleColors[value] || 'default'} 
                                                                        size="small" 
                                                                    />
                                                                ))}
                                                            </Box>
                                                        )}
                                                    >
                                                        {allRoles.map((role) => (
                                                            <MenuItem key={role} value={role}>
                                                                {roleLabels[role] || role}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            </TableCell>
                                            <TableCell>{user.createdAt?.toDate ? dayjs(user.createdAt.toDate()).format('DD/MM/YYYY') : '-'}</TableCell>
                                            <TableCell align="center">
                                                {canBeLinked && (
                                                    <Tooltip title="Σύνδεση με προφίλ μαθητή/γονέα">
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
