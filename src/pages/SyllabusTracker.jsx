// src/pages/SyllabusTracker.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Typography,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Checkbox,
    CircularProgress,
    Paper,
    ListSubheader,
    LinearProgress,
    Tooltip
} from '@mui/material';
import { doc, updateDoc } from 'firebase/firestore';
import { CheckCircleOutline, RadioButtonUnchecked } from '@mui/icons-material';

function SyllabusTracker({ classroom, allCourses, db, appId }) {
    const [coveredSections, setCoveredSections] = useState(new Set());
    const [isSaving, setIsSaving] = useState(false);

    // Find the corresponding course for the selected classroom
    const course = useMemo(() => {
        if (!classroom || !allCourses) return null;
        return allCourses.find(c => c.grade === classroom.grade && c.name === classroom.subject);
    }, [classroom, allCourses]);

    // Initialize the state of covered sections from the classroom data
    useEffect(() => {
        if (classroom?.coveredSyllabusSections) {
            setCoveredSections(new Set(classroom.coveredSyllabusSections));
        } else {
            setCoveredSections(new Set());
        }
    }, [classroom]);

    const handleToggleSection = async (sectionId) => {
        const newCoveredSections = new Set(coveredSections);
        if (newCoveredSections.has(sectionId)) {
            newCoveredSections.delete(sectionId);
        } else {
            newCoveredSections.add(sectionId);
        }
        
        setCoveredSections(newCoveredSections); // Optimistic UI update
        setIsSaving(true);

        try {
            const classroomRef = doc(db, `artifacts/${appId}/public/data/classrooms`, classroom.id);
            await updateDoc(classroomRef, {
                coveredSyllabusSections: Array.from(newCoveredSections)
            });
        } catch (error) {
            console.error("Error updating syllabus progress:", error);
            // Revert on error if needed
            setCoveredSections(new Set(classroom.coveredSyllabusSections || []));
        } finally {
            setIsSaving(false);
        }
    };
    
    const { totalSections, progressPercentage } = useMemo(() => {
        if (!course?.syllabus) return { totalSections: 0, progressPercentage: 0 };
        const total = course.syllabus.reduce((acc, chapter) => acc + (chapter.sections?.length || 0), 0);
        if (total === 0) return { totalSections: 0, progressPercentage: 0 };
        const percentage = Math.round((coveredSections.size / total) * 100);
        return { totalSections: total, progressPercentage: percentage };
    }, [course, coveredSections]);


    if (!classroom) {
        return <Typography>Επιλέξτε ένα τμήμα.</Typography>;
    }
    if (!course) {
        return <Typography>Δεν βρέθηκε αντίστοιχο μάθημα για αυτό το τμήμα.</Typography>;
    }
    if (!course.syllabus || course.syllabus.length === 0) {
        return <Typography>Δεν έχει οριστεί ύλη για αυτό το μάθημα.</Typography>;
    }

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ mb: 2 }}>
                <Typography variant="h6">Πρόοδος Ύλης</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                    <LinearProgress variant="determinate" value={progressPercentage} sx={{ flexGrow: 1, height: 10, borderRadius: 5 }} />
                    <Typography variant="body2" color="text.secondary">{`${progressPercentage}%`}</Typography>
                </Box>
            </Box>
            <List sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
                {course.syllabus.map((chapter, chapterIndex) => (
                    <li key={`chapter-${chapterIndex}`}>
                        <ul>
                            <ListSubheader sx={{ bgcolor: 'grey.100', fontWeight: 'bold' }}>
                                {`Κεφάλαιο ${chapterIndex + 1}: ${chapter.title}`}
                            </ListSubheader>
                            {chapter.sections.map((section, sectionIndex) => {
                                const sectionId = `${chapterIndex}-${sectionIndex}`;
                                const isCovered = coveredSections.has(sectionId);
                                return (
                                    <ListItem
                                        key={sectionId}
                                        button
                                        onClick={() => handleToggleSection(sectionId)}
                                        disabled={isSaving}
                                    >
                                        <ListItemIcon>
                                            <Tooltip title={isCovered ? "Σήμανση ως μη ολοκληρωμένο" : "Σήμανση ως ολοκληρωμένο"}>
                                                <Checkbox
                                                    edge="start"
                                                    checked={isCovered}
                                                    tabIndex={-1}
                                                    disableRipple
                                                    icon={<RadioButtonUnchecked />}
                                                    checkedIcon={<CheckCircleOutline color="success" />}
                                                />
                                            </Tooltip>
                                        </ListItemIcon>
                                        <ListItemText 
                                            primary={section.text} 
                                            secondary={`${section.hours} ώρες`}
                                            sx={{ textDecoration: isCovered ? 'line-through' : 'none', color: isCovered ? 'text.disabled' : 'text.primary' }}
                                        />
                                    </ListItem>
                                );
                            })}
                        </ul>
                    </li>
                ))}
            </List>
        </Paper>
    );
}

export default SyllabusTracker;
