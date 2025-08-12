// src/portals/student/MyAssignments.jsx
import React, { useState, useMemo } from 'react';
import {
    Container, Paper, Typography, Box, Accordion, AccordionSummary,
    AccordionDetails, List, ListItem, ListItemIcon, ListItemText, Chip, Link, Divider
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, Assignment as AssignmentIcon, Event as EventIcon, Description as FileIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

dayjs.extend(isSameOrAfter);

// Helper object to translate assignment types
const assignmentTypeLabels = {
    homework: 'Εργασία για το Σπίτι',
    test: 'Διαγώνισμα',
    project: 'Project',
    oral: 'Προφορική Εξέταση'
};

function MyAssignments({ enrolledClassrooms, allAssignments, allDailyLogs }) {

    const assignmentsByClassroom = useMemo(() => {
        if (!enrolledClassrooms || !allAssignments) return [];

        return enrolledClassrooms.map(classroom => {
            const classroomAssignments = allAssignments
                .filter(a => a.classroomId === classroom.id)
                .map(assignment => {
                    // Find the corresponding dailyLog for instructions and files
                    const dailyLog = allDailyLogs.find(log => log.id === assignment.id);
                    return {
                        ...assignment,
                        notes: dailyLog?.notes || '',
                        attachedFiles: dailyLog?.attachedFiles || []
                    };
                })
                .sort((a, b) => b.dueDate.toDate() - a.dueDate.toDate());

            const today = dayjs().startOf('day');
            const active = classroomAssignments.filter(a => dayjs(a.dueDate.toDate()).isSameOrAfter(today));
            const past = classroomAssignments.filter(a => dayjs(a.dueDate.toDate()).isBefore(today));

            return {
                ...classroom,
                activeAssignments: active,
                pastAssignments: past
            };
        });
    }, [enrolledClassrooms, allAssignments, allDailyLogs]);

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    Εργασίες & Διαγωνίσματα
                </Typography>

                {assignmentsByClassroom.map(classroom => (
                    <Accordion key={classroom.id} defaultExpanded>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6">{classroom.subject} ({classroom.classroomName})</Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {/* Active Assignments */}
                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>Ενεργές Εργασίες</Typography>
                                {classroom.activeAssignments.length > 0 ? (
                                    <List dense>
                                        {classroom.activeAssignments.map(item => (
                                            <ListItem key={item.id} divider>
                                                <ListItemIcon><AssignmentIcon color="primary" /></ListItemIcon>
                                                <ListItemText
                                                    primary={`${item.title} - ${assignmentTypeLabels[item.type] || item.type}`}
                                                    secondary={
                                                        <Box component="span">
                                                            <Typography component="span" variant="body2" display="block">
                                                                Προθεσμία: {dayjs(item.dueDate.toDate()).format('DD/MM/YYYY')}
                                                            </Typography>
                                                            {item.notes && <Typography component="span" variant="caption" sx={{ fontStyle: 'italic' }}>"{item.notes}"</Typography>}
                                                            {item.attachedFiles.map(file => (
                                                                <Link href={file.url} target="_blank" rel="noopener noreferrer" key={file.path} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                                                    <FileIcon fontSize="inherit" /> {file.name}
                                                                </Link>
                                                            ))}
                                                        </Box>
                                                    }
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                ) : <Typography color="text.secondary" sx={{ p: 1 }}>Δεν υπάρχουν ενεργές εργασίες.</Typography>}
                            </Box>

                            <Divider />

                            {/* Past Assignments */}
                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 500, color: 'text.secondary' }}>Παλαιότερες Εργασίες</Typography>
                                {classroom.pastAssignments.length > 0 ? (
                                     <List dense>
                                        {classroom.pastAssignments.map(item => (
                                            <ListItem key={item.id} divider>
                                                <ListItemIcon><EventIcon /></ListItemIcon>
                                                <ListItemText
                                                     primary={`${item.title} - ${assignmentTypeLabels[item.type] || item.type}`}
                                                     secondary={`Ημερομηνία: ${dayjs(item.dueDate.toDate()).format('DD/MM/YYYY')}`}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                ) : <Typography color="text.secondary" sx={{ p: 1 }}>Δεν υπάρχουν παλαιότερες εργασίες.</Typography>}
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                ))}
            </Paper>
        </Container>
    );
}

export default MyAssignments;