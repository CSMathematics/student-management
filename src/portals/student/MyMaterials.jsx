// src/portals/student/MyMaterials.jsx
import React, { useMemo } from 'react';
import {
    Container, Paper, Typography, Box, Accordion, AccordionSummary,
    AccordionDetails, List, ListItem, ListItemIcon, Link, ListItemText
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, Book as CourseIcon, Folder as ClassroomIcon, InsertDriveFile as FileIcon, Today as DailyIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import { getFunctions, httpsCallable } from 'firebase/functions'; // <-- ΝΕΑ ΕΙΣΑΓΩΓΗ

// --- Το component δέχεται πλέον όλα τα props που χρειαζόμαστε ---
function MyMaterials({ enrolledClassrooms, allCourses, dailyLogs, db, user, appId, selectedYear }) {

    const materialsBySubject = useMemo(() => {
        if (!Array.isArray(enrolledClassrooms) || !Array.isArray(allCourses) || !Array.isArray(dailyLogs)) return [];

        const grouped = {};

        enrolledClassrooms.forEach(classroom => {
            const subject = classroom.subject;
            if (!grouped[subject]) {
                grouped[subject] = {
                    classroomMaterials: [],
                    courseMaterials: [],
                    dailyLogMaterials: []
                };
            }
            if (classroom.materials && classroom.materials.length > 0) {
                grouped[subject].classroomMaterials.push(...classroom.materials);
            }
        });

        allCourses.forEach(course => {
            if (grouped[course.name] && course.syllabus) {
                const materials = course.syllabus.flatMap(chapter =>
                    chapter.sections.flatMap(section => section.materials || [])
                );
                if (materials.length > 0) {
                    grouped[course.name].courseMaterials.push(...materials);
                }
            }
        });

        dailyLogs.forEach(log => {
            const classroom = enrolledClassrooms.find(c => c.id === log.classroomId);
            if (classroom && log.attachedFiles && log.attachedFiles.length > 0) {
                const subject = classroom.subject;
                if (grouped[subject]) {
                    const datedFiles = log.attachedFiles.map(file => ({
                        ...file,
                        logDate: log.date
                    }));
                    grouped[subject].dailyLogMaterials.push(...datedFiles);
                }
            }
        });
        
        for (const subject in grouped) {
            grouped[subject].dailyLogMaterials.sort((a, b) => b.logDate.toDate() - a.logDate.toDate());
        }

        return Object.entries(grouped);
    }, [enrolledClassrooms, allCourses, dailyLogs]);

    // --- ΝΕΑ ΣΥΝΑΡΤΗΣΗ: Καταγράφει το download και ανοίγει το αρχείο ---
    const handleFileDownload = (fileUrl) => {
        if (db && user?.uid && appId && selectedYear) {
            try {
                const functions = getFunctions(db.app);
                const logUserEvent = httpsCallable(functions, 'logUserEvent');
                logUserEvent({
                    eventName: 'downloaded_material',
                    studentId: user.uid,
                    appId: appId,
                    academicYear: selectedYear
                });
            } catch (error) {
                console.error("Error logging download event:", error);
            }
        }
        // Ανοίγουμε το αρχείο σε νέα καρτέλα
        window.open(fileUrl, '_blank');
    };

    const renderFileList = (files, isDaily = false) => (
        <List dense>
            {files.map((file, index) => (
                <ListItem key={file.path || index}>
                    <ListItemIcon>
                        <FileIcon />
                    </ListItemIcon>
                    <ListItemText
                        primary={
                            // --- ΤΡΟΠΟΠΟΙΗΣΗ: Το Link καλεί πλέον τη συνάρτηση handleFileDownload ---
                            <Link href="#" onClick={(e) => { e.preventDefault(); handleFileDownload(file.url); }} underline="hover">
                                {file.name}
                            </Link>
                        }
                        secondary={
                            isDaily && file.logDate?.toDate
                                ? `Μάθημα: ${dayjs(file.logDate.toDate()).format('DD/MM/YYYY')}`
                                : (file.uploadedAt?.toDate ? `Προστέθηκε: ${dayjs(file.uploadedAt.toDate()).format('DD/MM/YYYY')}` : '')
                        }
                    />
                </ListItem>
            ))}
        </List>
    );

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    Το Υλικό μου
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    Εδώ μπορείτε να βρείτε όλα τα αρχεία και τις σημειώσεις που έχουν ανεβάσει οι καθηγητές σας για κάθε μάθημα.
                </Typography>

                {materialsBySubject.length > 0 ? materialsBySubject.map(([subject, materials]) => (
                    <Accordion key={subject} defaultExpanded>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6">{subject}</Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            
                            {materials.dailyLogMaterials.length > 0 && (
                                <Box>
                                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <DailyIcon color="action" />
                                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>Υλικό Ημέρας</Typography>
                                    </Box>
                                    {renderFileList(materials.dailyLogMaterials, true)}
                                </Box>
                            )}

                            {materials.courseMaterials.length > 0 && (
                                <Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <CourseIcon color="action" />
                                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>Γενικό Υλικό Μαθήματος</Typography>
                                    </Box>
                                    {renderFileList(materials.courseMaterials)}
                                </Box>
                            )}

                            {materials.classroomMaterials.length > 0 && (
                                <Box>
                                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <ClassroomIcon color="action" />
                                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>Υλικό Τμήματος</Typography>
                                    </Box>
                                    {renderFileList(materials.classroomMaterials)}
                                </Box>
                            )}
                            
                            {materials.dailyLogMaterials.length === 0 && materials.courseMaterials.length === 0 && materials.classroomMaterials.length === 0 && (
                                <Typography color="text.secondary">Δεν υπάρχει διαθέσιμο υλικό για αυτό το μάθημα.</Typography>
                            )}

                        </AccordionDetails>
                    </Accordion>
                )) : (
                    <Typography>Δεν βρέθηκε υλικό για τα μαθήματα στα οποία είστε εγγεγραμμένος.</Typography>
                )}
            </Paper>
        </Container>
    );
}

export default MyMaterials;
