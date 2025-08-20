// src/portals/student/MyMaterials.jsx
import React, { useMemo } from 'react';
import {
    Container, Paper, Typography, Box, Accordion, AccordionSummary,
    AccordionDetails, List, ListItem, ListItemIcon, Link, ListItemText, Divider
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, Book as CourseIcon, Folder as ClassroomIcon, InsertDriveFile as FileIcon, Today as DailyIcon } from '@mui/icons-material';
import dayjs from 'dayjs';

// --- ΝΕΑ ΠΡΟΣΘΗΚΗ: allDailyLogs στα props ---
function MyMaterials({ enrolledClassrooms, allCourses, allDailyLogs }) {

    const materialsBySubject = useMemo(() => {
        if (!enrolledClassrooms || !allCourses || !allDailyLogs) return [];

        const grouped = {};

        enrolledClassrooms.forEach(classroom => {
            const subject = classroom.subject;
            if (!grouped[subject]) {
                grouped[subject] = {
                    classroomMaterials: [],
                    courseMaterials: [],
                    dailyLogMaterials: [] // --- ΝΕΑ ΠΡΟΣΘΗΚΗ ---
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

        // --- ΝΕΑ ΛΟΓΙΚΗ: Συλλογή αρχείων από το DailyLog ---
        allDailyLogs.forEach(log => {
            const classroom = enrolledClassrooms.find(c => c.id === log.classroomId);
            if (classroom && log.attachedFiles && log.attachedFiles.length > 0) {
                const subject = classroom.subject;
                if (grouped[subject]) {
                    const datedFiles = log.attachedFiles.map(file => ({
                        ...file,
                        logDate: log.date // Προσθήκη ημερομηνίας
                    }));
                    grouped[subject].dailyLogMaterials.push(...datedFiles);
                }
            }
        });
        
        // Ταξινόμηση των ημερήσιων αρχείων ανά ημερομηνία
        for (const subject in grouped) {
            grouped[subject].dailyLogMaterials.sort((a, b) => b.logDate.toDate() - a.logDate.toDate());
        }

        return Object.entries(grouped);

    }, [enrolledClassrooms, allCourses, allDailyLogs]);

    const renderFileList = (files, isDaily = false) => (
        <List dense>
            {files.map((file, index) => (
                <ListItem key={file.path || index}>
                    <ListItemIcon>
                        <FileIcon />
                    </ListItemIcon>
                    <ListItemText
                        primary={
                            <Link href={file.url} target="_blank" rel="noopener noreferrer" underline="hover">
                                {file.name}
                            </Link>
                        }
                        secondary={
                            isDaily 
                                ? `Μάθημα: ${dayjs(file.logDate.toDate()).format('DD/MM/YYYY')}`
                                : (file.uploadedAt ? `Προστέθηκε: ${dayjs(file.uploadedAt.toDate()).format('DD/MM/YYYY')}` : '')
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
                            
                            {/* --- ΝΕΑ ΕΝΟΤΗΤΑ: Υλικό Ημέρας --- */}
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
