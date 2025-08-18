// src/components/ProfileLinker.jsx
import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Autocomplete,
    TextField, CircularProgress, Box, DialogContentText
} from '@mui/material';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

function ProfileLinker({ open, onClose, userToLink, allStudents, db }) {
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!userToLink || !selectedStudent) return;
        setIsSaving(true);
        try {
            const userRef = doc(db, 'users', userToLink.id);
            let updateData = {};
            const finalRole = userToLink.requestedRole || userToLink.role;

            if (finalRole === 'student') {
                updateData = { profileId: selectedStudent.id };
            } else if (finalRole === 'parent') {
                updateData = { childIds: arrayUnion(selectedStudent.id) };
            }
            
            if(userToLink.role === 'pending_approval') {
                updateData.role = finalRole;
            }

            await updateDoc(userRef, updateData);
            handleClose(true);
        } catch (error) {
            console.error("Error linking profile:", error);
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleClose = (didLink = false) => {
        setSelectedStudent(null);
        onClose(didLink);
    }

    return (
        <Dialog open={open} onClose={() => handleClose(false)} fullWidth maxWidth="xs">
            <DialogTitle>Σύνδεση Προφίλ</DialogTitle>
            <DialogContent>
                {userToLink && (
                    <DialogContentText sx={{ mb: 2 }}>
                        Επιλέξτε τον μαθητή που θέλετε να συνδέσετε με τον χρήστη <strong>{userToLink.firstName} {userToLink.lastName}</strong> ({userToLink.email}).
                    </DialogContentText>
                )}
                <Autocomplete
                    options={allStudents}
                    getOptionLabel={(option) => `${option.lastName} ${option.firstName} (${option.grade})`}
                    value={selectedStudent}
                    onChange={(event, newValue) => {
                        setSelectedStudent(newValue);
                    }}
                    renderInput={(params) => <TextField {...params} label="Αναζήτηση Μαθητή" />}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={() => handleClose(false)}>Ακύρωση</Button>
                <Button onClick={handleSave} variant="contained" disabled={!selectedStudent || isSaving}>
                    {isSaving ? <CircularProgress size={24} /> : 'Σύνδεση'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default ProfileLinker;
