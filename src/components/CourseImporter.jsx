// src/components/CourseImporter.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, FormControl,
    InputLabel, Select, MenuItem, List, ListItem, ListItemIcon, Checkbox,
    ListItemText, CircularProgress, Typography, Divider
} from '@mui/material';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';

function CourseImporter({ open, onClose, db, appId, currentYear, allAcademicYears, currentCourses }) {
    const [sourceYear, setSourceYear] = useState('');
    const [sourceCourses, setSourceCourses] = useState([]);
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    // Φιλτράρουμε τα ακαδημαϊκά έτη για να μην περιλαμβάνουν το τρέχον
    const availableSourceYears = useMemo(() => {
        return allAcademicYears.filter(year => year.id !== currentYear);
    }, [allAcademicYears, currentYear]);

    // Φέρνουμε τα μαθήματα από το έτος-πηγή όταν αλλάζει η επιλογή
    useEffect(() => {
        const fetchSourceCourses = async () => {
            if (!sourceYear) {
                setSourceCourses([]);
                return;
            }
            setIsLoading(true);
            try {
                const path = `artifacts/${appId}/public/data/academicYears/${sourceYear}/courses`;
                const coursesRef = collection(db, path);
                const snapshot = await getDocs(coursesRef);
                const coursesData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                setSourceCourses(coursesData);
            } catch (error) {
                console.error("Error fetching source courses:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSourceCourses();
    }, [sourceYear, db, appId]);

    const handleToggleCourse = (courseId) => {
        setSelectedCourses(prev =>
            prev.includes(courseId)
                ? prev.filter(id => id !== courseId)
                : [...prev, courseId]
        );
    };

    const handleImport = async () => {
        if (selectedCourses.length === 0) return;
        setIsImporting(true);
        try {
            const batch = writeBatch(db);
            const targetPath = `artifacts/${appId}/public/data/academicYears/${currentYear}/courses`;
            
            selectedCourses.forEach(courseId => {
                const courseToImport = sourceCourses.find(c => c.id === courseId);
                if (courseToImport) {
                    const newCourseRef = doc(collection(db, targetPath), courseToImport.id); // Keep the same ID for consistency
                    
                    // Αντιγράφουμε τα δεδομένα, αλλά καθαρίζουμε τους καθηγητές
                    const newCourseData = {
                        ...courseToImport,
                        assignedTeacherIds: [], // Reset teachers
                        createdAt: new Date()
                    };
                    batch.set(newCourseRef, newCourseData);
                }
            });

            await batch.commit();
            onClose(true); // Κλείνουμε το παράθυρο και στέλνουμε σήμα επιτυχίας
        } catch (error) {
            console.error("Error importing courses:", error);
        } finally {
            setIsImporting(false);
        }
    };

    // Φιλτράρουμε τα μαθήματα για να μην εμφανίζονται αυτά που ήδη υπάρχουν
    const importableCourses = useMemo(() => {
        const currentCourseNames = new Set(currentCourses.map(c => `${c.name}_${c.grade}`));
        return sourceCourses.filter(c => !currentCourseNames.has(`${c.name}_${c.grade}`));
    }, [sourceCourses, currentCourses]);


    return (
        <Dialog open={open} onClose={() => onClose(false)} fullWidth maxWidth="sm">
            <DialogTitle>Εισαγωγή Μαθημάτων από Προηγούμενο Έτος</DialogTitle>
            <DialogContent dividers>
                <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Επιλογή Έτους-Πηγής</InputLabel>
                    <Select
                        value={sourceYear}
                        label="Επιλογή Έτους-Πηγής"
                        onChange={(e) => setSourceYear(e.target.value)}
                    >
                        {availableSourceYears.map(year => (
                            <MenuItem key={year.id} value={year.id}>{year.id}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>
                ) : (
                    <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                        {importableCourses.length > 0 ? importableCourses.map(course => (
                            <ListItem
                                key={course.id}
                                button
                                onClick={() => handleToggleCourse(course.id)}
                            >
                                <ListItemIcon>
                                    <Checkbox
                                        edge="start"
                                        checked={selectedCourses.includes(course.id)}
                                        tabIndex={-1}
                                        disableRipple
                                    />
                                </ListItemIcon>
                                <ListItemText primary={course.name} secondary={`Τάξη: ${course.grade}`} />
                            </ListItem>
                        )) : (
                            <Typography sx={{p: 2, textAlign: 'center', color: 'text.secondary'}}>
                                {sourceYear ? 'Δεν βρέθηκαν νέα μαθήματα για εισαγωγή.' : 'Παρακαλώ επιλέξτε ένα έτος.'}
                            </Typography>
                        )}
                    </List>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => onClose(false)}>Ακύρωση</Button>
                <Button 
                    onClick={handleImport} 
                    variant="contained" 
                    disabled={selectedCourses.length === 0 || isImporting}
                >
                    {isImporting ? <CircularProgress size={24} /> : `Εισαγωγή (${selectedCourses.length})`}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default CourseImporter;
