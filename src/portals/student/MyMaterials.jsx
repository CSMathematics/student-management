// src/portals/student/MyMaterials.jsx
import React, { useMemo } from 'react';
import {
    Container, Paper, Typography, Box, Accordion, AccordionSummary,
    AccordionDetails, List, ListItem, ListItemIcon, Link, ListItemText, Divider
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, Book as CourseIcon, Folder as ClassroomIcon, InsertDriveFile as FileIcon } from '@mui/icons-material';
import dayjs from 'dayjs';

function MyMaterials({ enrolledClassrooms, allCourses }) {

    const materialsBySubject = useMemo(() => {
        if (!enrolledClassrooms || !allCourses) return [];

        const grouped = {};

        // Group materials by subject
        enrolledClassrooms.forEach(classroom => {
            const subject = classroom.subject;
            if (!grouped[subject]) {
                grouped[subject] = {
                    classroomMaterials: [],
                    courseMaterials: []
                };
            }
            // Add materials specific to this classroom
            if (classroom.materials && classroom.materials.length > 0) {
                grouped[subject].classroomMaterials.push(...classroom.materials);
            }
        });

        // Find general course materials
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

        return Object.entries(grouped);

    }, [enrolledClassrooms, allCourses]);

    const renderFileList = (files) => (
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
                        secondary={file.uploadedAt ? `Προστέθηκε: ${dayjs(file.uploadedAt.toDate()).format('DD/MM/YYYY')}` : ''}
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
                            {/* General Course Material */}
                            {materials.courseMaterials.length > 0 && (
                                <Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <CourseIcon color="action" />
                                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>Γενικό Υλικό Μαθήματος</Typography>
                                    </Box>
                                    {renderFileList(materials.courseMaterials)}
                                </Box>
                            )}

                             {/* Classroom Specific Material */}
                            {materials.classroomMaterials.length > 0 && (
                                <Box>
                                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <ClassroomIcon color="action" />
                                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>Υλικό Τμήματος</Typography>
                                    </Box>
                                    {renderFileList(materials.classroomMaterials)}
                                </Box>
                            )}
                            
                            {materials.courseMaterials.length === 0 && materials.classroomMaterials.length === 0 && (
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
