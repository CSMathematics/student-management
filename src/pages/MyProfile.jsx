// src/pages/MyProfile.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Box, Paper, Typography, TextField, Button, CircularProgress, Alert, Avatar, Tooltip, IconButton, Dialog, DialogActions, DialogContent, DialogTitle, DialogContentText } from '@mui/material';
import { PhotoCamera as PhotoCameraIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useAcademicYear } from '../context/AcademicYearContext';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

function MyProfile({ db, appId, userProfile }) {
    const { selectedYear } = useAcademicYear();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // State for avatar upload
    const fileInputRef = useRef(null);
    const imgRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);
    const [imageSrc, setImageSrc] = useState('');
    const [crop, setCrop] = useState();
    const [completedCrop, setCompletedCrop] = useState(null);
    const [openCropModal, setOpenCropModal] = useState(false);
    const [originalFile, setOriginalFile] = useState(null);
    const [openConfirmDelete, setOpenConfirmDelete] = useState(false);

    const profileId = userProfile?.profileId;
    const collectionName = 'teachers'; // Admin with teacher role has a profile in 'teachers'

    const fetchProfile = useCallback(async () => {
        if (!profileId || !selectedYear) {
            setLoading(false);
            setProfileData({
                firstName: userProfile?.firstName || '',
                lastName: userProfile?.lastName || '',
                specialty: '',
                email: userProfile?.email || '',
                profileImageUrl: userProfile?.profileImageUrl || ''
            });
            return;
        }

        setLoading(true);
        try {
            const docRef = doc(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/${collectionName}`, profileId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setProfileData(docSnap.data());
            } else {
                setProfileData({
                    firstName: userProfile?.firstName || '',
                    lastName: userProfile?.lastName || '',
                    specialty: '',
                    email: userProfile?.email || '',
                    profileImageUrl: userProfile?.profileImageUrl || ''
                });
            }
        } catch (err) {
            setError('Σφάλμα κατά τη φόρτωση του προφίλ.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [db, appId, selectedYear, profileId, userProfile]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!profileId) {
            setError('Δεν υπάρχει αναγνωριστικό προφίλ για αποθήκευση.');
            return;
        }
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const docRef = doc(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/${collectionName}`, profileId);
            await setDoc(docRef, profileData, { merge: true });
            setSuccess('Το προφίλ αποθηκεύτηκε με επιτυχία!');
        } catch (err) {
            setError('Σφάλμα κατά την αποθήκευση του προφίλ.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // --- Avatar Functions ---
    const handleCameraClick = () => fileInputRef.current.click();
    
    const handleFileSelect = (event) => {
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];
            setOriginalFile(file);
            setCrop(undefined);
            const reader = new FileReader();
            reader.addEventListener('load', () => setImageSrc(reader.result.toString() || ''));
            reader.readAsDataURL(file);
            setOpenCropModal(true);
            event.target.value = null;
        }
    };

    function onImageLoad(e) {
        imgRef.current = e.currentTarget;
        const { width, height } = e.currentTarget;
        const crop = centerCrop(makeAspectCrop({ unit: '%', width: 90 }, 1, width, height), width, height);
        setCrop(crop);
    }

    const handleSaveCrop = async () => {
        if (!completedCrop || !imgRef.current || !originalFile) return;

        const canvas = document.createElement('canvas');
        const image = imgRef.current;
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;
        canvas.width = completedCrop.width;
        canvas.height = completedCrop.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, completedCrop.x * scaleX, completedCrop.y * scaleY, completedCrop.width * scaleX, completedCrop.height * scaleY, 0, 0, completedCrop.width, completedCrop.height);

        canvas.toBlob(async (blob) => {
            if (!blob) return;
            setOpenCropModal(false);
            setIsUploading(true);
            
            const storage = getStorage(db.app);
            const imagePath = `profileImages/${collectionName}/${profileId}/${Date.now()}_${originalFile.name}`;
            const storageRef = ref(storage, imagePath);

            try {
                const snapshot = await uploadBytes(storageRef, blob);
                const downloadURL = await getDownloadURL(snapshot.ref);
                const docRef = doc(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/${collectionName}`, profileId);
                await updateDoc(docRef, { profileImageUrl: downloadURL });
                setProfileData(prev => ({ ...prev, profileImageUrl: downloadURL }));
                setSuccess('Η φωτογραφία άλλαξε με επιτυχία!');
            } catch (error) {
                console.error("Upload failed:", error);
                setError('Η μεταφόρτωση απέτυχε.');
            } finally {
                setIsUploading(false);
            }
        }, originalFile.type);
    };

    const handleDeleteImage = async () => {
        setOpenConfirmDelete(false);
        const imageUrlToDelete = profileData.profileImageUrl;
        try {
            const storage = getStorage(db.app);
            const imageRef = ref(storage, imageUrlToDelete);
            await deleteObject(imageRef);

            const docRef = doc(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/${collectionName}`, profileId);
            await updateDoc(docRef, { profileImageUrl: deleteField() });
            setProfileData(prev => ({ ...prev, profileImageUrl: null }));
        } catch (error) {
            console.error("Error deleting image:", error);
            setError('Σφάλμα κατά τη διαγραφή της εικόνας.');
        }
    };


    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Paper sx={{ p: 3, maxWidth: 700, mx: 'auto' }}>
            <Typography variant="h4" gutterBottom>Το Προφίλ μου</Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileSelect} />
                <Box sx={{ position: 'relative', width: 120, height: 120, margin: '16px auto' }}>
                    <Avatar src={profileData?.profileImageUrl} sx={{ width: 120, height: 120, bgcolor: 'primary.light' }}>
                        {profileData?.firstName?.charAt(0)}
                    </Avatar>
                    <Box sx={{ position: 'absolute', bottom: 0, right: 0, display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Αλλαγή φωτογραφίας">
                            <IconButton size="small" onClick={handleCameraClick} disabled={isUploading} sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'grey.200' }}}>
                                {isUploading ? <CircularProgress size={20} /> : <PhotoCameraIcon fontSize="small" />}
                            </IconButton>
                        </Tooltip>
                        {profileData?.profileImageUrl && (
                            <Tooltip title="Διαγραφή φωτογραφίας">
                                <IconButton size="small" onClick={() => setOpenConfirmDelete(true)} sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'grey.200' }}}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                </Box>
            </Box>

            <Box component="form" noValidate autoComplete="off">
                <TextField fullWidth label="Όνομα" name="firstName" value={profileData?.firstName || ''} onChange={handleInputChange} margin="normal" />
                <TextField fullWidth label="Επώνυμο" name="lastName" value={profileData?.lastName || ''} onChange={handleInputChange} margin="normal" />
                <TextField fullWidth label="Ειδικότητα" name="specialty" value={profileData?.specialty || ''} onChange={handleInputChange} margin="normal" placeholder="π.χ. Μαθηματικός" />
                <TextField fullWidth label="Email" name="email" type="email" value={profileData?.email || ''} onChange={handleInputChange} margin="normal" disabled />
                
                {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}

                <Button variant="contained" color="primary" onClick={handleSave} disabled={loading} sx={{ mt: 3 }}>
                    {loading ? <CircularProgress size={24} /> : 'Αποθήκευση Αλλαγών'}
                </Button>
            </Box>

            {/* Dialogs for Image Crop and Delete Confirmation */}
            <Dialog open={openConfirmDelete} onClose={() => setOpenConfirmDelete(false)}>
                <DialogTitle>Επιβεβαίωση Διαγραφής</DialogTitle>
                <DialogContent><DialogContentText>Είστε σίγουροι ότι θέλετε να διαγράψετε τη φωτογραφία προφίλ;</DialogContentText></DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenConfirmDelete(false)}>Ακύρωση</Button>
                    <Button onClick={handleDeleteImage} color="error">Διαγραφή</Button>
                </DialogActions>
            </Dialog>
            
            <Dialog open={openCropModal} onClose={() => setOpenCropModal(false)} maxWidth="sm">
                <DialogTitle>Περικοπή Εικόνας</DialogTitle>
                <DialogContent>
                    {imageSrc && (
                        <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)} aspect={1} circularCrop>
                            <img ref={imgRef} alt="Crop me" src={imageSrc} onLoad={onImageLoad} style={{ maxHeight: '70vh' }} />
                        </ReactCrop>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenCropModal(false)}>Ακύρωση</Button>
                    <Button onClick={handleSaveCrop} variant="contained">Αποθήκευση</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}

export default MyProfile;
