// src/portals/student/MyProfile.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
    Container, Paper, Typography, Grid, Box, TextField, Button,
    CircularProgress, Alert, Avatar, IconButton, Dialog, DialogTitle,
    DialogContent, DialogActions, DialogContentText, Tooltip
} from '@mui/material';
import { 
    Save as SaveIcon, 
    LockReset as LockResetIcon, 
    PhotoCamera as PhotoCameraIcon,
    Delete as DeleteIcon,
    Person as PersonIcon
} from '@mui/icons-material';
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';


function MyProfile({ studentData, db, appId, user, selectedYear }) {
    // State for personal info form
    const [formData, setFormData] = useState({
        studentPhone: '',
        email: '',
        address: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    // State for password change form
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordFeedback, setPasswordFeedback] = useState({ type: '', message: '' });

    // State and refs for avatar upload/crop
    const fileInputRef = useRef(null);
    const imgRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [crop, setCrop] = useState();
    const [completedCrop, setCompletedCrop] = useState(null);
    const [imageSrc, setImageSrc] = useState('');
    const [openCropModal, setOpenCropModal] = useState(false);
    const [originalFile, setOriginalFile] = useState(null);
    const [openConfirmDelete, setOpenConfirmDelete] = useState(false);


    useEffect(() => {
        if (studentData) {
            setFormData({
                studentPhone: studentData.studentPhone || '',
                email: studentData.email || '',
                address: studentData.address || ''
            });
        }
    }, [studentData]);

    const handleInfoChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePasswordChange = (e) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    };

    const handleSaveChanges = async () => {
        if (!selectedYear) {
            setFeedback({ type: 'error', message: 'Δεν έχει επιλεγεί ακαδημαϊκό έτος.' });
            return;
        }
        setIsSaving(true);
        setFeedback({ type: '', message: '' });
        try {
            const studentRef = doc(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/students`, studentData.id);
            await updateDoc(studentRef, {
                studentPhone: formData.studentPhone,
                email: formData.email,
                address: formData.address
            });
            setFeedback({ type: 'success', message: 'Οι πληροφορίες αποθηκεύτηκαν με επιτυχία!' });
        } catch (error) {
            console.error("Error updating student info:", error);
            setFeedback({ type: 'error', message: 'Προέκυψε σφάλμα κατά την αποθήκευση.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordFeedback({ type: 'error', message: 'Οι νέοι κωδικοί δεν ταιριάζουν.' });
            return;
        }
        if (passwordData.newPassword.length < 6) {
            setPasswordFeedback({ type: 'error', message: 'Ο νέος κωδικός πρέπει να είναι τουλάχιστον 6 χαρακτήρες.' });
            return;
        }

        setIsChangingPassword(true);
        setPasswordFeedback({ type: '', message: '' });

        try {
            const auth = getAuth();
            const credential = EmailAuthProvider.credential(user.email, passwordData.currentPassword);
            
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, passwordData.newPassword);

            setPasswordFeedback({ type: 'success', message: 'Ο κωδικός πρόσβασης άλλαξε με επιτυχία!' });
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            console.error("Error changing password:", error);
            if (error.code === 'auth/wrong-password') {
                setPasswordFeedback({ type: 'error', message: 'Ο τρέχων κωδικός είναι λανθασμένος.' });
            } else {
                setPasswordFeedback({ type: 'error', message: 'Προέκυψε ένα σφάλμα. Δοκιμάστε ξανά.' });
            }
        } finally {
            setIsChangingPassword(false);
        }
    };

    // --- AVATAR FUNCTIONS ---

    const handleCameraClick = () => {
        if (!isUploading) {
            fileInputRef.current.click();
        }
    };

    function onImageLoad(e) {
        imgRef.current = e.currentTarget;
        const { width, height } = e.currentTarget;
        const crop = centerCrop(
            makeAspectCrop({ unit: '%', width: 90 }, 1, width, height),
            width,
            height
        );
        setCrop(crop);
    }

    const handleFileSelect = (event) => {
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];
            setOriginalFile(file);
            setCrop(undefined);
            const reader = new FileReader();
            reader.addEventListener('load', () => setImageSrc(reader.result.toString() || ''));
            reader.readAsDataURL(file);
            setOpenCropModal(true);
            event.target.value = null; // Reset input for same-file selection
        }
    };

    const handleSaveCrop = async () => {
        if (!completedCrop || !imgRef.current || !originalFile || !selectedYear) {
            setUploadError('Δεν έχει επιλεγεί ακαδημαϊκό έτος ή εικόνα.');
            return;
        }

        const canvas = document.createElement('canvas');
        const image = imgRef.current;
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;
        canvas.width = completedCrop.width;
        canvas.height = completedCrop.height;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(
            image,
            completedCrop.x * scaleX,
            completedCrop.y * scaleY,
            completedCrop.width * scaleX,
            completedCrop.height * scaleY,
            0, 0,
            completedCrop.width,
            completedCrop.height
        );

        canvas.toBlob(async (blob) => {
            if (!blob) {
                console.error('Canvas is empty');
                return;
            }
            
            setOpenCropModal(false);
            setIsUploading(true);
            setUploadError('');

            const storage = getStorage(db.app);
            const imagePath = `profileImages/students/${studentData.id}/${Date.now()}_${originalFile.name}`;
            const storageRef = ref(storage, imagePath);

            try {
                // Delete old image if it exists
                if (studentData.profileImageUrl) {
                    try {
                        const oldImageRef = ref(storage, studentData.profileImageUrl);
                        await deleteObject(oldImageRef);
                    } catch (deleteError) {
                        // Ignore if old file doesn't exist, log other errors
                        if (deleteError.code !== 'storage/object-not-found') {
                            console.warn("Could not delete old profile image:", deleteError);
                        }
                    }
                }

                // Upload new image
                const snapshot = await uploadBytes(storageRef, blob);
                const downloadURL = await getDownloadURL(snapshot.ref);
                const docRef = doc(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/students`, studentData.id);
                await updateDoc(docRef, { profileImageUrl: downloadURL });
                setFeedback({ type: 'success', message: 'Η φωτογραφία προφίλ ενημερώθηκε!' });

            } catch (error) {
                console.error("Upload failed:", error);
                setUploadError('Η μεταφόρτωση απέτυχε. Ελέγξτε τα δικαιώματα.');
            } finally {
                setIsUploading(false);
                setImageSrc('');
                setOriginalFile(null);
            }
        }, originalFile.type);
    };

    const handleDeleteImage = async () => {
        if (!selectedYear || !studentData.profileImageUrl) return;
        
        setOpenConfirmDelete(false);
        setIsUploading(true); // Use same loading state
        
        try {
            const storage = getStorage(db.app);
            const imageRef = ref(storage, studentData.profileImageUrl);
            await deleteObject(imageRef);
            
            const docRef = doc(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/students`, studentData.id);
            await updateDoc(docRef, { profileImageUrl: deleteField() });
            setFeedback({ type: 'info', message: 'Η φωτογραφία προφίλ διαγράφηκε.' });

        } catch (error) {
            console.error("Error deleting image:", error);
            setUploadError('Η διαγραφή απέτυχε.');
        } finally {
            setIsUploading(false);
        }
    };


    if (!studentData) {
        return <CircularProgress />;
    }

    return (
        <>
            <Container maxWidth="lg" sx={{ mt: 4 }}>
                <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                    <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                        Το Προφίλ μου
                    </Typography>
                    <Grid container spacing={4}>
                        {/* Avatar and Personal Info Section */}
                        <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileSelect} />
                                <Box sx={{ position: 'relative', width: 150, height: 150, mb: 2 }}>
                                    <Avatar 
                                        src={studentData.profileImageUrl} 
                                        sx={{ width: 150, height: 150, bgcolor: 'primary.light', fontSize: '4rem' }}
                                    >
                                        {!studentData.profileImageUrl && <PersonIcon fontSize="inherit" />}
                                    </Avatar>
                                    <Box sx={{ position: 'absolute', bottom: 5, right: 5, display: 'flex', gap: 0.5 }}>
                                        <Tooltip title="Αλλαγή φωτογραφίας">
                                            <IconButton size="medium" onClick={handleCameraClick} disabled={isUploading} sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'grey.200' }}}>
                                                {isUploading ? <CircularProgress size={24} /> : <PhotoCameraIcon />}
                                            </IconButton>
                                        </Tooltip>
                                        {studentData.profileImageUrl && (
                                            <Tooltip title="Διαγραφή φωτογραφίας">
                                                <IconButton size="medium" onClick={() => setOpenConfirmDelete(true)} sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'grey.200' }}}>
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Box>
                                </Box>
                                {uploadError && <Alert severity="error" sx={{ width: '100%', mt: 1 }}>{uploadError}</Alert>}
                            </Box>
                            
                            <Typography variant="h6" sx={{ mb: 2 }}>Προσωπικά Στοιχεία</Typography>
                            <TextField label="Όνομα" value={studentData.firstName || ''} fullWidth sx={{ mb: 2 }} disabled />
                            <TextField label="Επώνυμο" value={studentData.lastName || ''} fullWidth sx={{ mb: 2 }} disabled />
                            <TextField label="Τάξη" value={studentData.grade || ''} fullWidth sx={{ mb: 2 }} disabled />
                            <TextField name="studentPhone" label="Τηλέφωνο" value={formData.studentPhone} onChange={handleInfoChange} fullWidth sx={{ mb: 2 }} />
                            <TextField name="email" label="Email" type="email" value={formData.email} onChange={handleInfoChange} fullWidth sx={{ mb: 2 }} />
                            <TextField name="address" label="Διεύθυνση" value={formData.address} onChange={handleInfoChange} fullWidth sx={{ mb: 2 }} />
                            <Button
                                variant="contained"
                                startIcon={<SaveIcon />}
                                onClick={handleSaveChanges}
                                disabled={isSaving}
                            >
                                {isSaving ? <CircularProgress size={24} /> : 'Αποθήκευση Αλλαγών'}
                            </Button>
                            {feedback.message && <Alert severity={feedback.type} sx={{ mt: 2 }}>{feedback.message}</Alert>}
                        </Grid>

                        {/* Change Password Section */}
                        <Grid item xs={12} md={6}>
                            <Typography variant="h6" sx={{ mb: 2 }}>Αλλαγή Κωδικού Πρόσβασης</Typography>
                            <TextField name="currentPassword" label="Τρέχων Κωδικός" type="password" value={passwordData.currentPassword} onChange={handlePasswordChange} fullWidth sx={{ mb: 2 }} />
                            <TextField name="newPassword" label="Νέος Κωδικός" type="password" value={passwordData.newPassword} onChange={handlePasswordChange} fullWidth sx={{ mb: 2 }} />
                            <TextField name="confirmPassword" label="Επιβεβαίωση Νέου Κωδικού" type="password" value={passwordData.confirmPassword} onChange={handlePasswordChange} fullWidth sx={{ mb: 2 }} />
                            <Button
                                variant="contained"
                                color="secondary"
                                startIcon={<LockResetIcon />}
                                onClick={handleChangePassword}
                                disabled={isChangingPassword}
                            >
                                {isChangingPassword ? <CircularProgress size={24} /> : 'Αλλαγή Κωδικού'}
                            </Button>
                            {passwordFeedback.message && <Alert severity={passwordFeedback.type} sx={{ mt: 2 }}>{passwordFeedback.message}</Alert>}
                        </Grid>
                    </Grid>
                </Paper>
            </Container>

            {/* Dialog for Deleting Image */}
            <Dialog open={openConfirmDelete} onClose={() => setOpenConfirmDelete(false)}>
                <DialogTitle>Επιβεβαίωση Διαγραφής</DialogTitle>
                <DialogContent><DialogContentText>Είστε σίγουροι ότι θέλετε να διαγράψετε τη φωτογραφία προφίλ;</DialogContentText></DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenConfirmDelete(false)}>Ακύρωση</Button>
                    <Button onClick={handleDeleteImage} color="error">Διαγραφή</Button>
                </DialogActions>
            </Dialog>
            
            {/* Dialog for Cropping Image */}
            <Dialog open={openCropModal} onClose={() => setOpenCropModal(false)} maxWidth="sm">
                <DialogTitle>Περικοπή Εικόνας</DialogTitle>
                <DialogContent>
                    {imageSrc && (
                        <ReactCrop
                            crop={crop}
                            onChange={c => setCrop(c)}
                            onComplete={c => setCompletedCrop(c)}
                            aspect={1}
                            circularCrop
                        >
                            <img
                                ref={imgRef}
                                alt="Crop me"
                                src={imageSrc}
                                onLoad={onImageLoad}
                                style={{ maxHeight: '70vh' }}
                            />
                        </ReactCrop>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenCropModal(false)}>Ακύρωση</Button>
                    <Button onClick={handleSaveCrop} variant="contained">Αποθήκευση</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

export default MyProfile;
