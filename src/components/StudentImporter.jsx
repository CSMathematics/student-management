// src/components/StudentImporter.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, FormControl,
    InputLabel, Select, MenuItem, List, ListItem, ListItemIcon, Checkbox,
    ListItemText, CircularProgress, Typography
} from '@mui/material';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { SUBJECTS_BY_GRADE_AND_CLASS } from '../data/subjects.js';

function StudentImporter({ open, onClose, db, appId, currentYear, allAcademicYears, currentStudents }) {
    const [sourceYear, setSourceYear] = useState('');
    const [sourceStudents, setSourceStudents] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState({}); // Format: { studentId: newGrade }
    const [isLoading, setIsLoading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    const availableSourceYears = useMemo(() => {
        return allAcademicYears.filter(year => year.id !== currentYear);
    }, [allAcademicYears, currentYear]);

    const allGrades = Object.keys(SUBJECTS_BY_GRADE_AND_CLASS);

    useEffect(() => {
        const fetchSourceStudents = async () => {
            if (!sourceYear) {
                setSourceStudents([]);
                return;
            }
            setIsLoading(true);
            try {
                const path = `artifacts/${appId}/public/data/academicYears/${sourceYear}/students`;
                const studentsRef = collection(db, path);
                const snapshot = await getDocs(studentsRef);
                const studentsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                setSourceStudents(studentsData);
                setSelectedStudents({}); // Clear selection when source year changes
            } catch (error) {
                console.error("Error fetching source students:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSourceStudents();
    }, [sourceYear, db, appId]);

    const handleToggleStudent = (student) => {
        setSelectedStudents(prev => {
            const newSelection = { ...prev };
            if (newSelection[student.id]) {
                delete newSelection[student.id];
            } else {
                // Automatically suggest the next grade
                const currentGradeIndex = allGrades.indexOf(student.grade);
                const nextGrade = allGrades[currentGradeIndex + 1] || student.grade;
                newSelection[student.id] = nextGrade;
            }
            return newSelection;
        });
    };

    const handleGradeChange = (studentId, newGrade) => {
        setSelectedStudents(prev => ({
            ...prev,
            [studentId]: newGrade
        }));
    };

    const handleImport = async () => {
        const studentsToImport = Object.keys(selectedStudents);
        if (studentsToImport.length === 0) return;
        setIsImporting(true);
        try {
            const batch = writeBatch(db);
            const targetPath = `artifacts/${appId}/public/data/academicYears/${currentYear}/students`;
            
            studentsToImport.forEach(studentId => {
                const studentData = sourceStudents.find(s => s.id === studentId);
                const newGrade = selectedStudents[studentId];
                if (studentData && newGrade) {
                    const newStudentRef = doc(db, targetPath, studentId); // Keep the same ID
                    
                    const newStudentData = {
                        // Personal info that persists
                        firstName: studentData.firstName,
                        lastName: studentData.lastName,
                        dob: studentData.dob,
                        studentPhone: studentData.studentPhone,
                        address: studentData.address,
                        email: studentData.email,
                        gender: studentData.gender,
                        parents: studentData.parents,
                        
                        // New academic year info
                        grade: newGrade,
                        specialization: '', // Reset
                        enrolledClassrooms: [], // Reset
                        payment: studentData.payment,
                        debt: studentData.debt,
                        
                        // Reset year-specific logs
                        notes: '',
                        communicationLog: [],
                        documents: [],
                        
                        createdAt: new Date(),
                    };
                    batch.set(newStudentRef, newStudentData);
                }
            });

            await batch.commit();
            onClose(true); // Close and signal success
        } catch (error) {
            console.error("Error importing students:", error);
        } finally {
            setIsImporting(false);
        }
    };

    const importableStudents = useMemo(() => {
        const currentStudentIds = new Set(currentStudents.map(s => s.id));
        return sourceStudents.filter(s => !currentStudentIds.has(s.id));
    }, [sourceStudents, currentStudents]);

    return (
        <Dialog open={open} onClose={() => onClose(false)} fullWidth maxWidth="md">
            <DialogTitle>Εισαγωγή Μαθητών από Προηγούμενο Έτος</DialogTitle>
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
                    <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                        {importableStudents.length > 0 ? importableStudents.map(student => {
                            const isSelected = selectedStudents.hasOwnProperty(student.id);
                            return (
                                <ListItem
                                    key={student.id}
                                    secondaryAction={
                                        <FormControl sx={{ width: 180 }} size="small" disabled={!isSelected}>
                                            <InputLabel>Νέα Τάξη</InputLabel>
                                            <Select
                                                value={isSelected ? selectedStudents[student.id] : ''}
                                                label="Νέα Τάξη"
                                                onChange={(e) => handleGradeChange(student.id, e.target.value)}
                                            >
                                                {allGrades.map(grade => (
                                                    <MenuItem key={grade} value={grade}>{grade}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    }
                                >
                                    <ListItemIcon>
                                        <Checkbox
                                            edge="start"
                                            checked={isSelected}
                                            onClick={() => handleToggleStudent(student)}
                                        />
                                    </ListItemIcon>
                                    <ListItemText primary={`${student.lastName} ${student.firstName}`} secondary={`Προηγ. Τάξη: ${student.grade}`} />
                                </ListItem>
                            )
                        }) : (
                            <Typography sx={{p: 2, textAlign: 'center', color: 'text.secondary'}}>
                                {sourceYear ? 'Όλοι οι μαθητές από αυτό το έτος έχουν ήδη μεταφερθεί.' : 'Παρακαλώ επιλέξτε ένα έτος.'}
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
                    disabled={Object.keys(selectedStudents).length === 0 || isImporting}
                >
                    {isImporting ? <CircularProgress size={24} /> : `Εισαγωγή (${Object.keys(selectedStudents).length})`}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default StudentImporter;
