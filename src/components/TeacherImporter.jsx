// src/components/TeacherImporter.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, FormControl,
    InputLabel, Select, MenuItem, List, ListItem, ListItemIcon, Checkbox,
    ListItemText, CircularProgress, Typography, Avatar, ListItemAvatar
} from '@mui/material';
import { GetApp as ImportIcon } from '@mui/icons-material';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';

function TeacherImporter({ open, onClose, db, appId, currentYear, allAcademicYears, currentTeachers }) {
    const [sourceYear, setSourceYear] = useState('');
    const [sourceTeachers, setSourceTeachers] = useState([]);
    const [selectedTeacherIds, setSelectedTeacherIds] = useState(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    const availableSourceYears = useMemo(() => {
        return (allAcademicYears || []).filter(year => year.id !== currentYear);
    }, [allAcademicYears, currentYear]);

    useEffect(() => {
        if (!open) {
            setSourceYear('');
            setSourceTeachers([]);
            setSelectedTeacherIds(new Set());
        }
    }, [open]);

    useEffect(() => {
        const fetchSourceTeachers = async () => {
            if (!sourceYear) { setSourceTeachers([]); return; }
            setIsLoading(true);
            try {
                const path = `artifacts/${appId}/public/data/academicYears/${sourceYear}/teachers`;
                const snapshot = await getDocs(collection(db, path));
                setSourceTeachers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
                setSelectedTeacherIds(new Set());
            } catch (error) {
                console.error('Error fetching source teachers:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSourceTeachers();
    }, [sourceYear, db, appId]);

    const importableTeachers = useMemo(() => {
        const currentIds = new Set((currentTeachers || []).map(t => t.id));
        return sourceTeachers.filter(t => !currentIds.has(t.id));
    }, [sourceTeachers, currentTeachers]);

    const handleToggle = (teacherId) => {
        setSelectedTeacherIds(prev => {
            const next = new Set(prev);
            if (next.has(teacherId)) next.delete(teacherId);
            else next.add(teacherId);
            return next;
        });
    };

    const handleSelectAll = () => {
        if (selectedTeacherIds.size === importableTeachers.length) {
            setSelectedTeacherIds(new Set());
        } else {
            setSelectedTeacherIds(new Set(importableTeachers.map(t => t.id)));
        }
    };

    const handleImport = async () => {
        if (selectedTeacherIds.size === 0) return;
        setIsImporting(true);
        try {
            const batch = writeBatch(db);
            const targetPath = `artifacts/${appId}/public/data/academicYears/${currentYear}/teachers`;
            selectedTeacherIds.forEach(teacherId => {
                const teacherData = sourceTeachers.find(t => t.id === teacherId);
                if (teacherData) {
                    const ref = doc(db, targetPath, teacherId);
                    batch.set(ref, {
                        firstName: teacherData.firstName || '',
                        lastName: teacherData.lastName || '',
                        email: teacherData.email || '',
                        phone: teacherData.phone || '',
                        specialty: teacherData.specialty || '',
                        createdAt: teacherData.createdAt || new Date(),
                        importedFrom: sourceYear,
                        importedAt: new Date(),
                    });
                }
            });
            await batch.commit();
            onClose(true);
        } catch (error) {
            console.error('Error importing teachers:', error);
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <Dialog open={open} onClose={() => onClose(false)} fullWidth maxWidth="sm">
            <DialogTitle>Εισαγωγή Καθηγητών από Προηγούμενο Έτος</DialogTitle>
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
                ) : importableTeachers.length > 0 ? (
                    <>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                                {importableTeachers.length} καθηγητές διαθέσιμοι για εισαγωγή
                            </Typography>
                            <Button size="small" onClick={handleSelectAll}>
                                {selectedTeacherIds.size === importableTeachers.length ? 'Αποεπιλογή Όλων' : 'Επιλογή Όλων'}
                            </Button>
                        </Box>
                        <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                            {importableTeachers.map(teacher => (
                                <ListItem
                                    key={teacher.id}
                                    button
                                    onClick={() => handleToggle(teacher.id)}
                                    divider
                                >
                                    <ListItemIcon>
                                        <Checkbox edge="start" checked={selectedTeacherIds.has(teacher.id)} />
                                    </ListItemIcon>
                                    <ListItemAvatar>
                                        <Avatar>{teacher.firstName?.charAt(0)}{teacher.lastName?.charAt(0)}</Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={`${teacher.firstName} ${teacher.lastName}`}
                                        secondary={teacher.specialty || 'Χωρίς ειδικότητα'}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </>
                ) : (
                    <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                        {sourceYear
                            ? 'Όλοι οι καθηγητές από αυτό το έτος έχουν ήδη μεταφερθεί.'
                            : 'Παρακαλώ επιλέξτε ένα έτος-πηγή.'}
                    </Typography>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => onClose(false)}>Ακύρωση</Button>
                <Button
                    onClick={handleImport}
                    variant="contained"
                    startIcon={isImporting ? <CircularProgress size={18} /> : <ImportIcon />}
                    disabled={selectedTeacherIds.size === 0 || isImporting}
                >
                    {isImporting ? 'Εισαγωγή...' : `Εισαγωγή (${selectedTeacherIds.size})`}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default TeacherImporter;
