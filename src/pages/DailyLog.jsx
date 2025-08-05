// src/pages/DailyLog.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { Box, Grid, Paper, Typography, List, ListItemButton, ListItemText, Divider, Button, TextField, IconButton, Tooltip, Switch, FormControlLabel, ListItemIcon, ToggleButtonGroup, ToggleButton, FormControl, InputLabel, Select, MenuItem, ListSubheader, Chip, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { Assignment as AssignmentIcon, Event as EventIcon, Add as AddIcon, Save as SaveIcon, UploadFile as UploadFileIcon, Link as LinkIcon, Delete as DeleteIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import { doc, updateDoc, arrayUnion, getDoc, setDoc, collection } from 'firebase/firestore';
import AssignmentForm from './AssignmentForm.jsx';
import MaterialSelector from './MaterialSelector.jsx';

const assignmentTypeLabels = {
    homework: 'Εργασία για το Σπίτι',
    test: 'Διαγώνισμα',
    project: 'Project',
    oral: 'Προφορική Εξέταση'
};

function DailyLog({ classroom, allStudents, allGrades, allAbsences, allAssignments, allCourses, db, appId }) {
    const [selectedItem, setSelectedItem] = useState(null);
    const [assignmentFormOpen, setAssignmentFormOpen] = useState(false);
    const [materialSelectorOpen, setMaterialSelectorOpen] = useState(false);
    const [dailyData, setDailyData] = useState({});
    const [filter, setFilter] = useState('all');
    const [taughtSection, setTaughtSection] = useState('');
    const [notes, setNotes] = useState('');
    const [attachedFiles, setAttachedFiles] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [expandedAccordion, setExpandedAccordion] = useState('past');

    const studentsInClassroom = useMemo(() => {
        return allStudents.filter(s => s.enrolledClassrooms?.includes(classroom.id))
            .sort((a, b) => a.lastName.localeCompare(b.lastName));
    }, [classroom, allStudents]);

    const courseForClassroom = useMemo(() => {
        if (!classroom || !allCourses) return null;
        return allCourses.find(c => c.grade === classroom.grade && c.name === classroom.subject);
    }, [classroom, allCourses]);

    const syllabusOptions = useMemo(() => {
        if (!courseForClassroom?.syllabus) return [];
        const options = [];
        courseForClassroom.syllabus.forEach((chapter, chapterIndex) => {
            options.push({ isHeader: true, title: `Κεφ. ${chapterIndex + 1}: ${chapter.title}` });
            chapter.sections.forEach((section, sectionIndex) => {
                const sectionId = `${chapterIndex}-${sectionIndex}`;
                options.push({ isHeader: false, id: sectionId, text: section.text });
            });
        });
        return options;
    }, [courseForClassroom]);

    const lessonDatesAndAssignments = useMemo(() => {
        const items = [];
        const today = dayjs();
        if (classroom.schedule) {
            for (let i = -60; i < 60; i++) {
                const date = today.add(i, 'day');
                const dayOfWeek = date.format('dddd');
                if (classroom.schedule.some(s => s.day === dayOfWeek)) {
                    items.push({ type: 'lesson', date: date.format('YYYY-MM-DD') });
                }
            }
        }
        if (allAssignments) {
            allAssignments.filter(a => a.classroomId === classroom.id).forEach(a => {
                items.push({ 
                    type: 'assignment', 
                    date: dayjs(a.dueDate.toDate()).format('YYYY-MM-DD'), 
                    title: a.title, 
                    assignmentType: a.type,
                    id: a.id 
                });
            });
        }
        return [...new Map(items.map(item => [item.date + (item.id || item.type), item])).values()]
            .sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
    }, [classroom, allAssignments]);

    const filteredAndGroupedItems = useMemo(() => {
        const today = dayjs().startOf('day');
        const filtered = filter === 'all' ? lessonDatesAndAssignments : lessonDatesAndAssignments.filter(item => item.type === filter);
        
        const past = filtered.filter(item => dayjs(item.date).isSameOrBefore(today));
        const future = filtered.filter(item => dayjs(item.date).isAfter(today)).sort((a,b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());

        return { past, future };
    }, [filter, lessonDatesAndAssignments]);


    useEffect(() => {
        const { past, future } = filteredAndGroupedItems;
        const allFilteredItems = [...past, ...future];
        if (!selectedItem || !allFilteredItems.some(item => item.date === selectedItem.date && item.id === selectedItem.id)) {
            const todayStr = dayjs().format('YYYY-MM-DD');
            const todayItem = past.find(item => item.date === todayStr) || past[0] || future[0] || null;
            setSelectedItem(todayItem);
        }
    }, [filteredAndGroupedItems, selectedItem]);

    useEffect(() => {
        const loadDailyData = async () => {
            if (!selectedItem) {
                setDailyData({});
                setTaughtSection('');
                setNotes('');
                setAttachedFiles([]);
                return;
            };

            const logId = selectedItem.type === 'assignment' ? selectedItem.id : `${classroom.id}_${selectedItem.date}`;
            const logRef = doc(db, `artifacts/${appId}/public/data/dailyLogs`, logId);
            const logSnap = await getDoc(logRef);
            const logData = logSnap.exists() ? logSnap.data() : {};

            setTaughtSection(logData.taughtSection || '');
            setNotes(logData.notes || '');
            setAttachedFiles(logData.attachedFiles || []);
            
            const data = {};
            const dayStart = dayjs(selectedItem.date).startOf('day');

            studentsInClassroom.forEach(student => {
                const absence = allAbsences.find(a => a.studentId === student.id && dayjs(a.date.toDate()).isSame(dayStart, 'day'));
                const gradeDoc = allGrades.find(g => g.logId === logId && g.studentId === student.id);
                
                data[student.id] = {
                    attendance: absence ? 'absent' : 'present',
                    participation: gradeDoc?.grades?.participation || '',
                    homework: gradeDoc?.grades?.homework || '',
                    grade: gradeDoc?.grades?.grade || ''
                };
            });
            setDailyData(data);
        };
        loadDailyData();
    }, [selectedItem, studentsInClassroom, allGrades, allAbsences, classroom.id, db, appId]);

    const handleDataChange = (studentId, field, value) => {
        setDailyData(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], [field]: value }
        }));
    };

    const handleSaveDay = async () => {
        if (!selectedItem) return;
        setIsSaving(true);

        const logId = selectedItem.type === 'assignment' ? selectedItem.id : `${classroom.id}_${selectedItem.date}`;
        const logRef = doc(db, `artifacts/${appId}/public/data/dailyLogs`, logId);

        const logData = {
            notes,
            attachedFiles,
            classroomId: classroom.id,
            date: new Date(selectedItem.date),
            type: selectedItem.type,
            ...(selectedItem.type === 'lesson' && { taughtSection }),
            ...(selectedItem.type === 'assignment' && { assignmentId: selectedItem.id }),
        };

        try {
            await setDoc(logRef, logData, { merge: true });
            console.log("Saved log data for:", logId);
            alert("Η αποθήκευση θα υλοποιηθεί σε πλήρη εφαρμογή.");
        } catch (error) {
            console.error("Error saving daily log:", error);
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleSaveAssignment = async (assignmentData) => {
        const newAssignmentId = `${Date.now()}`;
        const assignmentRef = doc(db, `artifacts/${appId}/public/data/assignments`, newAssignmentId);
        try {
            await setDoc(assignmentRef, { ...assignmentData, id: newAssignmentId });
        } catch (error) {
            console.error("Error saving assignment: ", error);
        }
    };
    
    const handleFileUpload = async (event) => {
        // ...
    };
    
    const handleAttachFiles = (files) => {
        setAttachedFiles(prev => [...prev, ...files]);
    };
    
    const handleRemoveFile = (fileToRemove) => {
        setAttachedFiles(prev => prev.filter(file => file.path !== fileToRemove.path));
    };

    const renderGradingFields = (student) => {
        const isAbsent = dailyData[student.id]?.attendance === 'absent';
        
        if (selectedItem?.type === 'assignment') {
            return (
                <TextField 
                    size="small" 
                    label={`Βαθμός: ${selectedItem.title}`} 
                    sx={{flexGrow: 1}} 
                    disabled={isAbsent} 
                    value={dailyData[student.id]?.grade || ''} 
                    onChange={(e) => handleDataChange(student.id, 'grade', e.target.value)} 
                />
            );
        }

        return (
            <>
                <TextField size="small" label="Συμμετοχή" sx={{flexGrow: 1}} disabled={isAbsent} value={dailyData[student.id]?.participation || ''} onChange={(e) => handleDataChange(student.id, 'participation', e.target.value)} />
                <TextField size="small" label="Homework" sx={{flexGrow: 1}} disabled={isAbsent} value={dailyData[student.id]?.homework || ''} onChange={(e) => handleDataChange(student.id, 'homework', e.target.value)} />
            </>
        );
    };

    const renderDateList = (items) => (
        <List dense sx={{ p: 0 }}>
            {items.map((item) => (
                <ListItemButton
                    key={item.date + (item.id || item.type)}
                    selected={selectedItem?.date === item.date && selectedItem?.id === item.id}
                    onClick={() => setSelectedItem(item)}
                >
                    <ListItemIcon>
                        {item.type === 'lesson' ? <EventIcon /> : <AssignmentIcon color="primary" />}
                    </ListItemIcon>
                    <ListItemText
                        primary={dayjs(item.date).format('dddd, DD/MM/YYYY')}
                        secondary={item.title}
                    />
                </ListItemButton>
            ))}
        </List>
    );

    return (
        <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
                <Paper sx={{ p: 1, height: '70vh', display: 'flex', flexDirection: 'column' }}>
                    <Button fullWidth variant="contained" startIcon={<AddIcon />} onClick={() => setAssignmentFormOpen(true)} sx={{mb: 1}}>Νέα Εργασία</Button>
                    <ToggleButtonGroup
                        value={filter}
                        exclusive
                        onChange={(e, newFilter) => newFilter && setFilter(newFilter)}
                        size="small"
                        sx={{ mb: 1, width: '100%' }}
                        >
                        <ToggleButton value="all" sx={{ flexGrow: 1 }}>Όλα</ToggleButton>
                        <ToggleButton value="lesson" sx={{ flexGrow: 1 }}>Μαθήματα</ToggleButton>
                        <ToggleButton value="assignment" sx={{ flexGrow: 1 }}>Εργασίες</ToggleButton>
                    </ToggleButtonGroup>
                    <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
                        <Accordion expanded={expandedAccordion === 'past'} onChange={() => setExpandedAccordion(expandedAccordion === 'past' ? '' : 'past')}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography>Παρελθοντικές & Σημερινή</Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ p: 0 }}>
                                {renderDateList(filteredAndGroupedItems.past)}
                            </AccordionDetails>
                        </Accordion>
                        <Accordion expanded={expandedAccordion === 'future'} onChange={() => setExpandedAccordion(expandedAccordion === 'future' ? '' : 'future')}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography>Μελλοντικές</Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ p: 0 }}>
                                {renderDateList(filteredAndGroupedItems.future)}
                            </AccordionDetails>
                        </Accordion>
                    </Box>
                </Paper>
            </Grid>
            <Grid item xs={12} md={8}>
                <Paper sx={{ p: 2, height: '70vh', display: 'flex', flexDirection: 'column' }}>
                    {selectedItem ? (
                        <>
                            <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2}}>
                                <Typography variant="h6">
                                    Ημερολόγιο για: {dayjs(selectedItem.date).format('DD/MM/YYYY')}
                                    {selectedItem.type === 'assignment' && (
                                        <Typography variant="subtitle1" component="span" color="primary.main" sx={{ ml: 1 }}>
                                            - {assignmentTypeLabels[selectedItem.assignmentType] || selectedItem.assignmentType}
                                        </Typography>
                                    )}
                                </Typography>
                                <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveDay} disabled={isSaving}>
                                    {isSaving ? <CircularProgress size={24} /> : 'Αποθήκευση Ημέρας'}
                                </Button>
                            </Box>
                            
                            <Box sx={{ overflowY: 'auto', flexGrow: 1, mb: 2 }}>
                                {studentsInClassroom.map(student => {
                                    const isAbsent = dailyData[student.id]?.attendance === 'absent';
                                    return (
                                        <Paper key={student.id} variant="outlined" sx={{ p: 2, mb: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Typography sx={{ flexBasis: '25%', flexShrink: 0 }}>{student.lastName} {student.firstName}</Typography>
                                            <FormControlLabel
                                                sx={{ flexBasis: '30%', flexShrink: 0 }}
                                                control={
                                                    <Switch
                                                        checked={dailyData[student.id]?.attendance === 'present'}
                                                        onChange={(e) => handleDataChange(student.id, 'attendance', e.target.checked ? 'present' : 'absent')}
                                                    />
                                                }
                                                label={dailyData[student.id]?.attendance === 'present' ? 'Παρών' : 'Απών'}
                                            />
                                            {renderGradingFields(student)}
                                        </Paper>
                                    );
                                })}
                            </Box>
                            
                            <Divider sx={{ my: 1 }} />

                            <Box>
                                {selectedItem.type === 'lesson' && (
                                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                                        <InputLabel>Ενότητα Ύλης που Διδάχθηκε</InputLabel>
                                        <Select value={taughtSection} label="Ενότητα Ύλης που Διδάχθηκε" onChange={(e) => setTaughtSection(e.target.value)}>
                                            <MenuItem value=""><em>Καμία</em></MenuItem>
                                            {syllabusOptions.map((opt, i) => 
                                                opt.isHeader 
                                                    ? <ListSubheader key={i}>{opt.title}</ListSubheader>
                                                    : <MenuItem key={opt.id} value={opt.id}>{opt.text}</MenuItem>
                                            )}
                                        </Select>
                                    </FormControl>
                                )}
                                <TextField
                                    label="Σημειώσεις / Οδηγίες"
                                    multiline
                                    rows={4}
                                    fullWidth
                                    variant="outlined"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="subtitle2" gutterBottom>Επισυναπτόμενα Αρχεία</Typography>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                                        {attachedFiles.map(file => (
                                            <Chip
                                                key={file.path}
                                                label={file.name}
                                                onDelete={() => handleRemoveFile(file)}
                                            />
                                        ))}
                                    </Box>
                                    <Button size="small" component="label" startIcon={<UploadFileIcon />}>Μεταφόρτωση Νέου</Button>
                                    <Button size="small" startIcon={<LinkIcon />} onClick={() => setMaterialSelectorOpen(true)}>Επισύναψη από Βιβλιοθήκη</Button>
                                </Box>
                            </Box>
                        </>
                    ) : (
                        <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%'}}>
                            <Typography color="text.secondary">Επιλέξτε μια ημερομηνία από τη λίστα.</Typography>
                        </Box>
                    )}
                </Paper>
            </Grid>
            <AssignmentForm open={assignmentFormOpen} onClose={() => setAssignmentFormOpen(false)} onSave={handleSaveAssignment} classroomId={classroom.id} />
            <MaterialSelector 
                open={materialSelectorOpen} 
                onClose={() => setMaterialSelectorOpen(false)}
                onAttach={handleAttachFiles}
                classroomMaterials={classroom.materials}
                courseMaterials={courseForClassroom?.materials}
                alreadyAttached={attachedFiles}
            />
        </Grid>
    );
}

export default DailyLog;
