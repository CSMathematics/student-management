// src/pages/CourseForm.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Container, Paper, Typography, TextField, Button, Box, IconButton, Divider,
    CircularProgress, Alert, FormControl, InputLabel, Select, MenuItem, Grid, Chip, Tooltip, OutlinedInput
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Schedule as ScheduleIcon, UploadFile as UploadFileIcon } from '@mui/icons-material';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { SUBJECTS_BY_GRADE_AND_CLASS } from '../data/subjects.js';

// Helper function to generate a random ID
const generateFirestoreId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let autoId = '';
  for (let i = 0; i < 20; i++) {
    autoId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return autoId;
};

function CourseForm({ db, appId, allCourses, allTeachers }) {
    const navigate = useNavigate();
    const { courseId } = useParams();
    const isEditMode = Boolean(courseId);

    const [tempId] = useState(() => isEditMode ? null : generateFirestoreId());

    const [courseName, setCourseName] = useState('');
    const [grade, setGrade] = useState('');
    const [assignedTeacherIds, setAssignedTeacherIds] = useState([]);
    const [syllabus, setSyllabus] = useState([{ id: Date.now(), title: '', sections: [{ id: Date.now() + 1, text: '', hours: '', materials: [] }] }]);
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });
    const [uploading, setUploading] = useState({ active: false, sectionId: null });

    useEffect(() => {
        if (isEditMode) {
            const courseToEdit = allCourses.find(c => c.id === courseId);
            if (courseToEdit) {
                setCourseName(courseToEdit.name || '');
                setGrade(courseToEdit.grade || '');
                setAssignedTeacherIds(courseToEdit.assignedTeacherIds || []);
                const syllabusWithIds = (courseToEdit.syllabus || []).map(ch => ({
                    ...ch,
                    id: Date.now() + Math.random(),
                    sections: (ch.sections || []).map(s => ({ ...s, id: Date.now() + Math.random(), materials: s.materials || [] }))
                }));
                setSyllabus(syllabusWithIds.length > 0 ? syllabusWithIds : [{ id: Date.now(), title: '', sections: [{ id: Date.now() + 1, text: '', hours: '', materials: [] }] }]);
            }
        }
    }, [courseId, allCourses, isEditMode]);

    const handleAddChapter = () => setSyllabus([...syllabus, { id: Date.now(), title: '', sections: [{ id: Date.now() + 1, text: '', hours: '', materials: [] }] }]);
    const handleChapterChange = (chapterId, newTitle) => setSyllabus(syllabus.map(ch => ch.id === chapterId ? { ...ch, title: newTitle } : ch));
    const handleRemoveChapter = (chapterId) => setSyllabus(syllabus.filter(ch => ch.id !== chapterId));

    const handleAddSection = (chapterId) => {
        setSyllabus(syllabus.map(ch => ch.id === chapterId ? { ...ch, sections: [...ch.sections, { id: Date.now(), text: '', hours: '', materials: [] }] } : ch));
    };

    const handleSectionChange = (chapterId, sectionId, field, value) => {
        if (field === 'hours' && value !== '' && !/^\d*$/.test(value)) return;
        setSyllabus(syllabus.map(ch => ch.id === chapterId ? { ...ch, sections: ch.sections.map(s => s.id === sectionId ? { ...s, [field]: value } : s) } : ch));
    };

    const handleRemoveSection = (chapterId, sectionId) => {
        setSyllabus(syllabus.map(ch => ch.id === chapterId ? { ...ch, sections: ch.sections.filter(s => s.id !== sectionId) } : ch));
    };

    const handleFileUpload = async (chapterId, sectionId, file) => {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            setFeedback({ type: 'error', message: 'Το αρχείο είναι πολύ μεγάλο. Το όριο είναι 5MB.' });
            return;
        }
        setUploading({ active: true, sectionId: sectionId });
        setFeedback({ type: '', message: '' });

        const storage = getStorage(db.app);
        const storagePath = `course_materials/${courseId || tempId}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);

        try {
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            const newMaterial = { name: file.name, url: downloadURL, path: storagePath };
            
            setSyllabus(prevSyllabus => prevSyllabus.map(ch => 
                ch.id === chapterId ? { 
                    ...ch, 
                    sections: ch.sections.map(s => 
                        s.id === sectionId ? { ...s, materials: [...s.materials, newMaterial] } : s
                    ) 
                } : ch
            ));
            setFeedback({ type: 'success', message: `Το αρχείο ${file.name} προστέθηκε.` });
        } catch (error) {
            console.error("File Upload Error:", error);
            setFeedback({ type: 'error', message: 'Σφάλμα κατά τη μεταφόρτωση του αρχείου.' });
        } finally {
            setUploading({ active: false, sectionId: null });
        }
    };

    const handleDeleteMaterial = async (chapterId, sectionId, materialToDelete) => {
        // Remove from UI first for responsiveness
        setSyllabus(prevSyllabus => prevSyllabus.map(ch => 
            ch.id === chapterId ? { 
                ...ch, 
                sections: ch.sections.map(s => 
                    s.id === sectionId ? { ...s, materials: s.materials.filter(m => (m.path || m.url) !== (materialToDelete.path || materialToDelete.url)) } : s
                ) 
            } : ch
        ));

        // --- Η ΔΙΟΡΘΩΣΗ ΕΙΝΑΙ ΕΔΩ ---
        // Delete from Firebase Storage ONLY if it has a path (i.e., it's not a Base64 file)
        if (materialToDelete.path) {
            try {
                const storage = getStorage(db.app);
                const fileRef = ref(storage, materialToDelete.path);
                await deleteObject(fileRef);
                setFeedback({ type: 'info', message: `Το αρχείο ${materialToDelete.name} διαγράφηκε.` });
            } catch (error) {
                console.error("Error deleting file from storage:", error);
                setFeedback({ type: 'error', message: 'Σφάλμα κατά τη διαγραφή του αρχείου από τον server.' });
            }
        }
    };
    
    const totalCourseHours = useMemo(() => syllabus.reduce((total, chapter) => total + chapter.sections.reduce((sum, section) => sum + Number(section.hours || 0), 0), 0), [syllabus]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!courseName || !grade) {
            setFeedback({ type: 'error', message: 'Παρακαλώ συμπληρώστε το όνομα και την τάξη.' });
            return;
        }
        setLoading(true);
        setFeedback({ type: '', message: '' });

        try {
            const courseData = {
                name: courseName,
                grade: grade,
                assignedTeacherIds: assignedTeacherIds,
                totalHours: totalCourseHours,
                syllabus: syllabus.map(chapter => ({
                    title: chapter.title,
                    sections: chapter.sections.filter(s => s.text.trim() !== '').map(s => ({ 
                        text: s.text, 
                        hours: Number(s.hours || 0), 
                        materials: s.materials.map(m => ({ name: m.name, url: m.url, path: m.path }))
                    }))
                })).filter(c => c.title.trim() !== ''),
            };
            
            if (isEditMode) {
                const courseDocRef = doc(db, `artifacts/${appId}/public/data/courses`, courseId);
                await updateDoc(courseDocRef, courseData);
                setFeedback({ type: 'success', message: 'Το μάθημα ενημερώθηκε!' });
            } else {
                const newCourseRef = doc(db, `artifacts/${appId}/public/data/courses`, tempId);
                courseData.createdAt = new Date();
                await setDoc(newCourseRef, courseData);
                setFeedback({ type: 'success', message: 'Το μάθημα αποθηκεύτηκε!' });
            }
            
            setTimeout(() => navigate('/courses/list'), 1500);
        } catch (error) {
            console.error("Error saving course:", error);
            setFeedback({ type: 'error', message: 'Σφάλμα κατά την αποθήκευση.' });
            setLoading(false);
        }
    };

    const handleTeacherChange = (event) => {
        const { target: { value } } = event;
        setAssignedTeacherIds(typeof value === 'string' ? value.split(',') : value);
    };

    return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
            <Paper component="form" onSubmit={handleSubmit} elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    {isEditMode ? 'Επεξεργασία Μαθήματος' : 'Δημιουργία Νέου Μαθήματος'}
                </Typography>

                <Grid container spacing={2} sx={{ my: 2 }}>
                    <Grid item xs={12} sm={6}><TextField fullWidth label="Όνομα Μαθήματος" value={courseName} onChange={(e) => setCourseName(e.target.value)} variant="outlined" required /></Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                            <InputLabel>Τάξη</InputLabel>
                            <Select value={grade} label="Τάξη" onChange={(e) => setGrade(e.target.value)} required>
                                {Object.keys(SUBJECTS_BY_GRADE_AND_CLASS).map(g => (<MenuItem key={g} value={g}>{g}</MenuItem>))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                        <FormControl fullWidth>
                            <InputLabel>Καθηγητές</InputLabel>
                            <Select
                                multiple
                                value={assignedTeacherIds}
                                onChange={handleTeacherChange}
                                input={<OutlinedInput label="Καθηγητές" />}
                                renderValue={(selected) => (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {selected.map((id) => {
                                            const teacher = allTeachers.find(t => t.id === id);
                                            return <Chip key={id} label={teacher ? `${teacher.firstName} ${teacher.lastName}` : id} />;
                                        })}
                                    </Box>
                                )}
                            >
                                {allTeachers.map((teacher) => (
                                    <MenuItem key={teacher.id} value={teacher.id}>
                                        {teacher.firstName} {teacher.lastName}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h5" sx={{ mb: 2 }}>Διδακτέα Ύλη</Typography>
                {syllabus.map((chapter, chapterIndex) => (
                    <Paper key={chapter.id} variant="outlined" sx={{ p: 2, mb: 2, position: 'relative' }}>
                        <IconButton aria-label="delete chapter" onClick={() => handleRemoveChapter(chapter.id)} size="small" sx={{ position: 'absolute', top: 8, right: 8 }}><DeleteIcon /></IconButton>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <TextField fullWidth label={`Κεφάλαιο ${chapterIndex + 1}`} value={chapter.title} onChange={(e) => handleChapterChange(chapter.id, e.target.value)} variant="standard" />
                            <Tooltip title="Σύνολο ωρών κεφαλαίου"><Chip icon={<ScheduleIcon />} label={`${chapter.sections.reduce((sum, s) => sum + Number(s.hours || 0), 0)} ώρες`} /></Tooltip>
                        </Box>
                        {chapter.sections.map((section, sectionIndex) => (
                            <Box key={section.id} sx={{ ml: 2, mb: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <Typography sx={{ color: 'text.secondary' }}>•</Typography>
                                    <TextField fullWidth label={`Ενότητα ${sectionIndex + 1}`} value={section.text} onChange={(e) => handleSectionChange(chapter.id, section.id, 'text', e.target.value)} variant="standard" size="small" />
                                    <TextField label="Ώρες" type="text" value={section.hours} onChange={(e) => handleSectionChange(chapter.id, section.id, 'hours', e.target.value)} variant="standard" size="small" sx={{ width: '100px' }} />
                                    <IconButton aria-label="delete section" onClick={() => handleRemoveSection(chapter.id, section.id)} size="small"><DeleteIcon fontSize="small" /></IconButton>
                                </Box>
                                <Box sx={{ pl: 2, pt: 1 }}>
                                    {section.materials.map(material => (
                                        <Chip key={material.path || material.url} label={material.name} onDelete={() => handleDeleteMaterial(chapter.id, section.id, material)} size="small" sx={{ mr: 1, mb: 1 }} />
                                    ))}
                                    <Button component="label" size="small" startIcon={uploading.active && uploading.sectionId === section.id ? <CircularProgress size={16} /> : <UploadFileIcon />} disabled={uploading.active}>
                                        Προσθήκη Υλικού
                                        <input type="file" hidden onChange={(e) => handleFileUpload(chapter.id, section.id, e.target.files[0])} />
                                    </Button>
                                </Box>
                            </Box>
                        ))}
                        <Button size="small" onClick={() => handleAddSection(chapter.id)} startIcon={<AddIcon />} sx={{ mt: 1, ml: 2 }}>Προσθήκη Ενότητας</Button>
                    </Paper>
                ))}
                <Button onClick={handleAddChapter} startIcon={<AddIcon />} variant="outlined" sx={{ mt: 2 }}>Προσθήκη Κεφαλαίου</Button>
                <Divider sx={{ my: 3 }} />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}><Chip icon={<ScheduleIcon />} label={`Συνολικές Διδακτικές Ώρες: ${totalCourseHours}`} color="primary" sx={{ fontSize: '1rem', padding: '10px' }} /></Box>
                {feedback.message && <Alert severity={feedback.type} sx={{ mb: 2 }}>{feedback.message}</Alert>}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                    <Button variant="outlined" color="secondary" onClick={() => navigate('/courses/list')}>Ακύρωση</Button>
                    <Button type="submit" variant="contained" disabled={loading}>{loading ? <CircularProgress size={24} /> : (isEditMode ? 'Ενημέρωση Μαθήματος' : 'Αποθήκευση Μαθήματος')}</Button>
                </Box>
            </Paper>
        </Container>
    );
}

export default CourseForm;
