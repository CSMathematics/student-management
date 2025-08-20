// src/portals/student/MyCourses.jsx
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container, Paper, Typography, Box, Accordion, AccordionSummary,
    AccordionDetails, List, ListItem, ListItemIcon, Link, ListItemText, Divider,
    Button, Avatar, ListSubheader, Chip, Tooltip, ListItemAvatar, Grid, IconButton
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    MenuBook as SyllabusIcon,
    FolderZip as MaterialsIcon,
    Assignment as AssignmentIcon,
    Person as PersonIcon,
    Message as MessageIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';

function MyCourses({ studentData, enrolledClassrooms, allCourses, allTeachers, classmates }) {
    const navigate = useNavigate();

    const coursesData = useMemo(() => {
        // Guard clause: Ensure all required data is available.
        if (!studentData || !enrolledClassrooms || !allCourses || !allTeachers || !classmates) return [];

        // Group all enrolled classrooms by their subject name.
        const groupedBySubject = enrolledClassrooms.reduce((acc, classroom) => {
            if (!acc[classroom.subject]) {
                acc[classroom.subject] = {
                    courseInfo: allCourses.find(c => c.name === classroom.subject && c.grade === classroom.grade),
                    classrooms: []
                };
            }
            acc[classroom.subject].classrooms.push(classroom);
            return acc;
        }, {});

        // Process each subject group.
        return Object.entries(groupedBySubject).map(([subject, data]) => {
            const enrichedClassrooms = data.classrooms.map(cr => {
                const teacher = allTeachers.find(t => t.id === cr.teacherId);
                
                // Filter the general 'classmates' list to find only those who are:
                // 1. Enrolled in this specific classroom (cr.id).
                // 2. Not the current student themselves (studentData.id).
                const classroomClassmates = classmates.filter(
                    cm => cm.enrolledClassrooms?.includes(cr.id) && cm.id !== studentData.id
                );

                return {
                    ...cr,
                    teacher,
                    classmates: classroomClassmates // Assign the correctly filtered list.
                };
            });
            return {
                subject,
                courseInfo: data.courseInfo,
                classrooms: enrichedClassrooms
            };
        });

    }, [studentData, enrolledClassrooms, allCourses, allTeachers, classmates]);

    const handleStartChat = (id, type) => {
        navigate('/communication', { state: { selectedChannelId: id, userType: type } });
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    Τα Μαθήματά μου
                </Typography>

                {coursesData.map(({ subject, courseInfo, classrooms }) => (
                    <Accordion key={subject} defaultExpanded>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6">{subject}</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            {/* Loop through each classroom within the subject accordion */}
                            {classrooms.map((cr, index) => (
                                <Box key={cr.id}>
                                    {/* Add a divider if there are multiple classrooms for the same subject */}
                                    {index > 0 && <Divider sx={{ my: 3 }}><Chip label="Επόμενο Τμήμα" /></Divider>}
                                    <Grid container spacing={3}>
                                        {/* Left side: Classroom-specific info */}
                                        <Grid item xs={12} md={8}>
                                            <Chip label={`Τμήμα: ${cr.classroomName}`} sx={{ mb: 2 }} color="primary" variant="outlined" />
                                            {cr.teacher && (
                                                <ListItem disableGutters secondaryAction={
                                                    <IconButton size="small" onClick={() => handleStartChat(cr.teacher.id, 'teacher')}>
                                                        <MessageIcon />
                                                    </IconButton>
                                                }>
                                                    <ListItemAvatar>
                                                        <Avatar><PersonIcon /></Avatar>
                                                    </ListItemAvatar>
                                                    <ListItemText primary="Καθηγητής" secondary={`${cr.teacher.firstName} ${cr.teacher.lastName}`} />
                                                </ListItem>
                                            )}
                                        </Grid>
                                        
                                        {/* Right side: Classmates for this specific classroom */}
                                        <Grid item xs={12} md={4}>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Συμμαθητές</Typography>
                                            <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                                                {cr.classmates.length > 0 ? cr.classmates.map(cm => (
                                                    <ListItem key={cm.id} secondaryAction={
                                                        <IconButton size="small" onClick={() => handleStartChat(cm.id, 'student')}>
                                                            <MessageIcon />
                                                        </IconButton>
                                                    }>
                                                        <ListItemAvatar>
                                                            <Avatar sx={{ width: 32, height: 32 }}>{cm.firstName?.charAt(0)}</Avatar>
                                                        </ListItemAvatar>
                                                        <ListItemText primary={`${cm.firstName} ${cm.lastName}`} />
                                                    </ListItem>
                                                )) : (
                                                    <ListItem>
                                                        <ListItemText primary="Δεν υπάρχουν άλλοι μαθητές σε αυτό το τμήμα." />
                                                    </ListItem>
                                                )}
                                            </List>
                                        </Grid>
                                    </Grid>
                                </Box>
                            ))}

                            {/* Syllabus (common for the subject, shown after all classrooms) */}
                            {courseInfo?.syllabus && courseInfo.syllabus.length > 0 && (
                                <Box sx={{ mt: 3 }}>
                                    <Divider sx={{ mb: 2 }} />
                                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Ύλη Μαθήματος</Typography>
                                    <List dense>
                                        {courseInfo.syllabus.map((chapter, index) => (
                                            <React.Fragment key={index}>
                                                <ListSubheader sx={{ bgcolor: 'action.hover' }}>Κεφ. {index + 1}: {chapter.title}</ListSubheader>
                                                {chapter.sections.map((section, sIndex) => (
                                                    <ListItem key={sIndex}>
                                                        <ListItemIcon sx={{minWidth: '30px'}}><SyllabusIcon fontSize="small" /></ListItemIcon>
                                                        <ListItemText primary={section.text} secondary={`${section.hours} ώρες`} />
                                                    </ListItem>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </List>
                                </Box>
                            )}

                            <Divider sx={{ my: 2 }} />

                            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                                <Button variant="outlined" startIcon={<MaterialsIcon />} onClick={() => navigate('/my-materials')}>Υλικό Μαθήματος</Button>
                                <Button variant="outlined" startIcon={<AssignmentIcon />} onClick={() => navigate('/my-assignments')}>Εργασίες</Button>
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                ))}
            </Paper>
        </Container>
    );
}

export default MyCourses;
