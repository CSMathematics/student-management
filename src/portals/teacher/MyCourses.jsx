// src/portals/teacher/MyCourses.jsx
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container, Paper, Typography, List, ListItem, ListItemText, Chip, Box,
    CircularProgress, Button, Tooltip,
    ListItemButton, Collapse, ListSubheader, IconButton, Link, ListItemIcon
} from '@mui/material';
import { 
    Edit as EditIcon, 
    Schedule as ScheduleIcon, 
    Attachment as AttachmentIcon,
    KeyboardArrowDown as KeyboardArrowDownIcon,
    KeyboardArrowUp as KeyboardArrowUpIcon
} from '@mui/icons-material';

function MyCourses({ allCourses, teacherData, loading }) {
    const navigate = useNavigate();
    const [expandedCourseId, setExpandedCourseId] = useState(null);

    const assignedCourses = useMemo(() => {
        if (!allCourses || !teacherData?.id) return [];
        return allCourses
            .filter(course => course.assignedTeacherIds?.includes(teacherData.id))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [allCourses, teacherData]);

    const handleEditCourse = (e, courseId) => {
        e.stopPropagation();
        navigate(`/course/edit/${courseId}`);
    };

    const handleCourseClick = (courseId) => {
        setExpandedCourseId(prevId => (prevId === courseId ? null : courseId));
    };

    if (loading) {
        return <Container sx={{ mt: 4, textAlign: 'center' }}><CircularProgress /></Container>;
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    Τα Μαθήματά μου
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    Δείτε την ύλη για τα μαθήματα που σας έχουν ανατεθεί. Πατήστε "Επεξεργασία" για να προσθέσετε ή να αφαιρέσετε εκπαιδευτικό υλικό.
                </Typography>

                {assignedCourses.length > 0 ? (
                    <List>
                        {assignedCourses.map(course => (
                            <React.Fragment key={course.id}>
                                <ListItemButton onClick={() => handleCourseClick(course.id)} divider>
                                    <ListItemText 
                                        primary={course.name} 
                                        secondary={`Τάξη: ${course.grade}`}
                                        primaryTypographyProps={{ fontWeight: '500' }}
                                    />
                                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                        <Tooltip title="Επεξεργασία Υλικού">
                                            <IconButton size="small" onClick={(e) => handleEditCourse(e, course.id)}><EditIcon /></IconButton>
                                        </Tooltip>
                                        <IconButton size="small" aria-label="expand">
                                            {expandedCourseId === course.id ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                                        </IconButton>
                                    </Box>
                                </ListItemButton>
                                <Collapse in={expandedCourseId === course.id} timeout="auto" unmountOnExit>
                                    <Box sx={{ pl: 4, pr: 2, py: 2}}>
                                        {course.syllabus && course.syllabus.length > 0 ? (
                                            <List disablePadding>
                                                {course.syllabus.map((chapter, index) => (
                                                    <React.Fragment key={index}>
                                                        <ListSubheader sx={{ bgcolor: 'transparent', fontWeight: 'bold', color: 'primary.main' }}>
                                                            Κεφ. {index + 1}: {chapter.title}
                                                        </ListSubheader>
                                                        {chapter.sections.map((section, sIndex) => (
                                                            <Box key={sIndex}>
                                                                <ListItem sx={{pt: 0, pb: 1, ml: 2}}>
                                                                    <ListItemText primary={`• ${section.text}`} />
                                                                    <Chip icon={<ScheduleIcon fontSize="small"/>} label={`${section.hours} ώρες`} size="small" />
                                                                </ListItem>
                                                                {section.materials && section.materials.length > 0 && (
                                                                    <List dense sx={{ pl: 8, pt:0 }}>
                                                                        {section.materials.map((material, mIndex) => (
                                                                            <ListItem key={mIndex}>
                                                                                <ListItemIcon sx={{minWidth: '30px'}}><AttachmentIcon fontSize="small" /></ListItemIcon>
                                                                                <Link href={material.url} target="_blank" rel="noopener noreferrer" sx={{wordBreak: 'break-all'}}>
                                                                                    {material.name}
                                                                                </Link>
                                                                            </ListItem>
                                                                        ))}
                                                                    </List>
                                                                )}
                                                            </Box>
                                                        ))}
                                                    </React.Fragment>
                                                ))}
                                            </List>
                                        ) : (
                                            <Typography sx={{ p: 2 }}>Δεν έχει οριστεί ύλη για αυτό το μάθημα.</Typography>
                                        )}
                                    </Box>
                                </Collapse>
                            </React.Fragment>
                        ))}
                    </List>
                ) : (
                    <Typography sx={{ mt: 3, p: 2, textAlign: 'center' }}>
                        Δεν σας έχουν ανατεθεί μαθήματα.
                    </Typography>
                )}
            </Paper>
        </Container>
    );
}

export default MyCourses;
