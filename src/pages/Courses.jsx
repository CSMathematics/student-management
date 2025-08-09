// src/pages/Courses.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container, Paper, Typography, List, ListItem, ListItemText, Chip, Box,
    CircularProgress, FormControl, InputLabel, Select, MenuItem, Button, Tooltip,
    ListItemButton, Collapse, ListSubheader, IconButton, Dialog, DialogActions,
    DialogContent, DialogContentText, DialogTitle, Link, ListItemIcon
} from '@mui/material';
import { 
    Edit as EditIcon, 
    Delete as DeleteIcon, 
    Add as AddIcon, 
    Schedule as ScheduleIcon, 
    Attachment as AttachmentIcon,
    KeyboardArrowDown as KeyboardArrowDownIcon,
    KeyboardArrowUp as KeyboardArrowUpIcon,
    Person as PersonIcon
} from '@mui/icons-material';
import { doc, deleteDoc } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faChalkboardUser } from '@fortawesome/free-solid-svg-icons';

function Courses({ allCourses, classrooms, allStudents, allTeachers, loading, db, appId }) {
    const navigate = useNavigate();
    const [selectedGrade, setSelectedGrade] = useState('');
    const [expandedCourseId, setExpandedCourseId] = useState(null);
    const [courseToDelete, setCourseToDelete] = useState(null);

    const coursesDataByGrade = useMemo(() => {
        if (!allCourses || !classrooms || !allStudents || !allTeachers) return {};

        const studentCountMap = new Map();
        allStudents.forEach(student => {
            if (student.enrolledClassrooms && Array.isArray(student.enrolledClassrooms)) {
                student.enrolledClassrooms.forEach(classroomId => {
                    studentCountMap.set(classroomId, (studentCountMap.get(classroomId) || 0) + 1);
                });
            }
        });
        
        const teacherMap = new Map(allTeachers.map(t => [t.id, `${t.firstName} ${t.lastName}`]));

        const groupedByGrade = allCourses.reduce((acc, course) => {
            const grade = course.grade || 'Χωρίς Τάξη';
            if (!acc[grade]) acc[grade] = [];
            acc[grade].push(course);
            return acc;
        }, {});

        for (const grade in groupedByGrade) {
            groupedByGrade[grade] = groupedByGrade[grade].map(course => {
                const matchingClassrooms = classrooms.filter(c => c.grade === course.grade && c.subject === course.name);
                const totalStudents = matchingClassrooms.reduce((sum, c) => sum + (studentCountMap.get(c.id) || 0), 0);
                const teacherNames = (course.assignedTeacherIds || []).map(id => teacherMap.get(id)).filter(Boolean);

                return { 
                    ...course, 
                    classroomCount: matchingClassrooms.length, 
                    studentCount: totalStudents,
                    teacherNames: teacherNames,
                };
            }).sort((a, b) => a.name.localeCompare(b.name));
        }
        return groupedByGrade;
    }, [allCourses, classrooms, allStudents, allTeachers]);

    const allPossibleGrades = useMemo(() => {
        const gradesFromCourses = allCourses ? [...new Set(allCourses.map(c => c.grade))] : [];
        const allGrades = ["Α' Γυμνασίου", "Β' Γυμνασίου", "Γ' Γυμνασίου", "Α' Λυκείου", "Β' Λυκείου", "Γ' Λυκείου"];
        return [...new Set([...allGrades, ...gradesFromCourses])].filter(Boolean).sort();
    }, [allCourses]);

    useEffect(() => {
        if (allPossibleGrades.length > 0 && !selectedGrade) {
            setSelectedGrade(allPossibleGrades[0]);
        }
    }, [allPossibleGrades, selectedGrade]);

    const handleAddCourse = () => navigate('/course/new', { state: { initialGrade: selectedGrade } });
    const handleEditCourse = (e, courseId) => {
        e.stopPropagation();
        navigate(`/course/edit/${courseId}`);
    };
    const handleDeleteCourse = (e, course) => {
        e.stopPropagation();
        setCourseToDelete(course);
    };
    const handleConfirmDelete = async () => {
        if (!courseToDelete) return;
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/courses`, courseToDelete.id));
            setCourseToDelete(null);
        } catch (error) {
            console.error("Error deleting course:", error);
        }
    };

    const handleCourseClick = (courseId) => setExpandedCourseId(prevId => (prevId === courseId ? null : courseId));

    if (loading) {
        return <Container sx={{ mt: 4, textAlign: 'center' }}><CircularProgress /></Container>;
    }
    
    const coursesForSelectedGrade = coursesDataByGrade[selectedGrade] || [];

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    Κατάλογος Μαθημάτων
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    Επιλέξτε μια τάξη για να δείτε τα διαθέσιμα μαθήματα και πατήστε πάνω σε ένα μάθημα για να δείτε την ύλη του.
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
                    <FormControl sx={{ minWidth: 240 }}>
                        <InputLabel id="grade-select-label">Επιλογή Τάξης</InputLabel>
                        <Select
                            labelId="grade-select-label"
                            id="grade-select"
                            value={selectedGrade}
                            label="Επιλογή Τάξης"
                            onChange={(e) => setSelectedGrade(e.target.value)}
                        >
                            {allPossibleGrades.map(grade => (
                                <MenuItem key={grade} value={grade}>{grade}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Button 
                        variant="contained" 
                        startIcon={<AddIcon />}
                        onClick={handleAddCourse}
                        disabled={!selectedGrade}
                    >
                        Προσθήκη Νέου Μαθήματος
                    </Button>
                </Box>
                
                {selectedGrade && (
                    <Box>
                        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                            Βρέθηκαν {coursesForSelectedGrade.length} μαθήματα για την τάξη "{selectedGrade}"
                        </Typography>
                        {coursesForSelectedGrade.length > 0 ? (
                            <List>
                                {coursesForSelectedGrade.map(course => (
                                    <React.Fragment key={course.id}>
                                        <ListItemButton onClick={() => handleCourseClick(course.id)} divider>
                                            <ListItemText 
                                                primary={course.name} 
                                                secondary={
                                                    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                                        <PersonIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                                                        <Typography variant="body2" color="text.secondary">
                                                            {course.teacherNames.length > 0 ? course.teacherNames.join(', ') : 'Χωρίς ανάθεση'}
                                                        </Typography>
                                                        <ScheduleIcon fontSize='small'/>
                                                        <Typography fontSize='small'>{course.totalHours|| 0} ώρες</Typography>
                                                    </Box>
                                                }
                                                primaryTypographyProps={{ fontWeight: '500' }}
                                                sx={{pl: 4}}
                                            />
                                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                                <Tooltip title="Αριθμός Τμημάτων"><Chip icon={<FontAwesomeIcon icon={faChalkboardUser} />} label={course.classroomCount} variant="outlined" size="small" /></Tooltip>
                                                <Tooltip title="Σύνολο Μαθητών"><Chip icon={<FontAwesomeIcon icon={faUsers} />} label={course.studentCount} variant="outlined" size="small" /></Tooltip>
                                                <Tooltip title="Επεξεργασία Μαθήματος">
                                                    <IconButton size="small" onClick={(e) => handleEditCourse(e, course.id)}><EditIcon /></IconButton>
                                                </Tooltip>
                                                <Tooltip title="Διαγραφή Μαθήματος">
                                                    <IconButton size="small" onClick={(e) => handleDeleteCourse(e, course)}><DeleteIcon /></IconButton>
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
                                                                <ListSubheader sx={{ bgcolor: 'transparent', fontWeight: 'bold', color: 'primary.main', fontSize: '1rem', lineHeight: '2.5' }}>
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
                                                                                        {/* --- Η ΑΛΛΑΓΗ ΕΙΝΑΙ ΕΔΩ --- */}
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
                            <Typography sx={{ mt: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                                Δεν έχουν καταχωρηθεί μαθήματα για την τάξη "{selectedGrade}".
                            </Typography>
                        )}
                    </Box>
                )}
            </Paper>

            <Dialog open={!!courseToDelete} onClose={() => setCourseToDelete(null)}>
                <DialogTitle>Επιβεβαίωση Διαγραφής</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Είστε σίγουροι ότι θέλετε να διαγράψετε το μάθημα "{courseToDelete?.name}"; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCourseToDelete(null)}>Ακύρωση</Button>
                    <Button onClick={handleConfirmDelete} color="error">Διαγραφή</Button>
                </DialogActions>
            </Dialog>

        </Container>
    );
}

export default Courses;
