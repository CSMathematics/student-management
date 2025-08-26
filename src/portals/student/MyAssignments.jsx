// src/portals/student/MyAssignments.jsx
import React, { useState, useMemo } from 'react';
import {
    Container, Paper, Typography, Box, Accordion, AccordionSummary,
    AccordionDetails, List, ListItem, ListItemIcon, ListItemText, Link, Divider, Button, CircularProgress, Tooltip, IconButton, Alert, Collapse
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, Event as EventIcon, Description as FileIcon, UploadFile as UploadFileIcon, CheckCircle as SubmittedIcon, Delete as DeleteIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { collection, addDoc, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import { useStudentData } from '../../context/StudentDataContext';
import { checkAndAwardBadges } from '../../services/BadgeService.js';

dayjs.extend(isSameOrAfter);

const assignmentTypeLabels = {
    homework: 'Εργασία για το Σπίτι',
    test: 'Διαγώνισμα',
    project: 'Project',
    oral: 'Προφορική Εξέταση'
};

const SubmissionStatus = ({ assignment, submission, studentId, db, appId, selectedYear }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file || !studentId || !selectedYear) return;

        setFeedback({ type: '', message: '' });

        if (submission) {
            await handleDeleteSubmission(false); 
        }

        setIsUploading(true);
        const storage = getStorage();
        const storagePath = `artifacts/${appId}/academicYears/${selectedYear}/submissions/${assignment.id}/${studentId}/${file.name}`;
        const storageRef = ref(storage, storagePath);

        try {
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            const submissionData = {
                studentId,
                assignmentId: assignment.id,
                classroomId: assignment.classroomId,
                fileName: file.name,
                fileURL: downloadURL,
                storagePath: storagePath,
                submittedAt: serverTimestamp(),
            };
            await addDoc(collection(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/submissions`), submissionData);
            
            setFeedback({ type: 'success', message: 'Η εργασία υποβλήθηκε με επιτυχία!' });
            await checkAndAwardBadges(db, appId, selectedYear, studentId);

        } catch (error) {
            console.error("Error uploading submission or awarding badges:", error);
            setFeedback({ type: 'error', message: 'Η υποβολή απέτυχε. Δοκιμάστε ξανά.' });
        } finally {
            setIsUploading(false);
            setTimeout(() => setFeedback({ type: '', message: '' }), 5000);
        }
    };

    const handleDeleteSubmission = async (showFeedback = true) => {
        if (!submission) return;
        const storage = getStorage();
        const fileRef = ref(storage, submission.storagePath);
        
        try {
            await deleteObject(fileRef);
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/submissions`, submission.id));
            if (showFeedback) {
                 setFeedback({ type: 'info', message: 'Η προηγούμενη υποβολή διαγράφηκε.' });
                 setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
            }
        } catch (error) {
            console.error("Error deleting submission:", error);
            if (showFeedback) {
                setFeedback({ type: 'error', message: 'Η διαγραφή απέτυχε.' });
                setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
            }
        }
    };

    return (
        <Box sx={{ width: '100%' }}>
            {submission ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <SubmittedIcon color="success" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">
                        Υποβλήθηκε: <Link href={submission.fileURL} target="_blank">{submission.fileName}</Link>
                    </Typography>
                    <Tooltip title="Διαγραφή & Αντικατάσταση">
                        <IconButton size="small" onClick={() => handleDeleteSubmission()} disabled={isUploading}>
                            <DeleteIcon fontSize="inherit" />
                        </IconButton>
                    </Tooltip>
                </Box>
            ) : (
                <Button
                    variant="contained"
                    size="small"
                    component="label"
                    startIcon={isUploading ? <CircularProgress size={16} /> : <UploadFileIcon />}
                    disabled={isUploading}
                    sx={{ mt: 1 }}
                >
                    Υποβολή Εργασίας
                    <input type="file" hidden onChange={handleFileUpload} />
                </Button>
            )}
            <Collapse in={!!feedback.message}>
                <Alert severity={feedback.type} sx={{ mt: 1, p: '0px 12px' }}>
                    {feedback.message}
                </Alert>
            </Collapse>
        </Box>
    );
};

function MyAssignments(props) {
    const contextData = useStudentData();
    // A more robust check to see if we are in the Parent Portal context.
    const isParentView = props.hasOwnProperty('childData');

    // If in parent view, use props. Otherwise, use context.
    const sourceData = isParentView ? props : contextData;
    
    // Handle case where data might not be ready yet.
    if (!sourceData) {
        return (
            <Container sx={{ mt: 4, textAlign: 'center' }}>
                <CircularProgress />
            </Container>
        );
    }
    
    const { 
        enrolledClassrooms, 
        assignments, 
        db, 
        appId, 
        selectedYear 
    } = sourceData;

    // Submissions and childData are special cases
    const submissions = sourceData.submissions || [];
    const childData = sourceData.childData || null;
    const studentId = isParentView ? childData?.id : sourceData.studentId;

    // If parent is viewing but hasn't selected a child, show a message.
    if (isParentView && !childData) {
        return (
            <Container sx={{ mt: 4 }}>
                <Typography>Παρακαλώ επιλέξτε ένα παιδί για να δείτε τις εργασίες του.</Typography>
            </Container>
        );
    }

    const assignmentsByClassroomMap = useMemo(() => {
        if (!assignments || assignments.length === 0) return new Map();
        const map = new Map();
        for (const assignment of assignments) {
            const { classroomId } = assignment;
            if (!map.has(classroomId)) {
                map.set(classroomId, []);
            }
            map.get(classroomId).push(assignment);
        }
        map.forEach((classroomAssignments, classroomId) => {
            const processedAssignments = classroomAssignments
                .map(assignment => {
                    const submission = submissions.find(s => s.assignmentId === assignment.id);
                    return { ...assignment, submission, attachedFiles: assignment.attachedFiles || [] };
                })
                .sort((a, b) => b.dueDate.toDate() - a.dueDate.toDate());
            map.set(classroomId, processedAssignments);
        });
        return map;
    }, [assignments, submissions]);

    const classroomsWithAssignments = useMemo(() => {
        if (!enrolledClassrooms || assignmentsByClassroomMap.size === 0) return [];
        return enrolledClassrooms
            .map(classroom => {
                const allClassroomAssignments = assignmentsByClassroomMap.get(classroom.id) || [];
                if (allClassroomAssignments.length === 0) return { ...classroom, hasAssignments: false };
                const today = dayjs().startOf('day');
                const active = allClassroomAssignments.filter(a => dayjs(a.dueDate.toDate()).isSameOrAfter(today));
                const past = allClassroomAssignments.filter(a => dayjs(a.dueDate.toDate()).isBefore(today));
                return { ...classroom, hasAssignments: true, activeAssignments: active, pastAssignments: past };
            })
            .filter(c => c.hasAssignments);
    }, [enrolledClassrooms, assignmentsByClassroomMap]);

    const hasAnyAssignments = classroomsWithAssignments.length > 0;

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    {isParentView ? `Εργασίες - ${childData.firstName}` : 'Εργασίες & Διαγωνίσματα'}
                </Typography>

                {!hasAnyAssignments && (
                    <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                        Δεν βρέθηκαν εργασίες για τα μαθήματα στα οποία είναι εγγεγραμμένος/η.
                    </Typography>
                )}

                {classroomsWithAssignments.map(classroom => (
                    <Accordion key={classroom.id} defaultExpanded>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6">{classroom.subject} ({classroom.classroomName})</Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>Ενεργές Εργασίες</Typography>
                                {classroom.activeAssignments.length > 0 ? (
                                    <List dense>
                                        {classroom.activeAssignments.map(item => (
                                            <ListItem key={item.id} divider sx={{ alignItems: 'flex-start', flexDirection: 'column' }}>
                                                <ListItemText
                                                    primary={`${item.title} - ${assignmentTypeLabels[item.type] || item.type}`}
                                                    secondary={`Προθεσμία: ${dayjs(item.dueDate.toDate()).format('DD/MM/YYYY')}`}
                                                />
                                                {item.attachedFiles.map(file => (
                                                    <Link href={file.url} target="_blank" rel="noopener noreferrer" key={file.path} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, mb: 1 }}>
                                                        <FileIcon fontSize="inherit" /> Εκφώνηση: {file.name}
                                                    </Link>
                                                ))}
                                                {!isParentView && (
                                                    <SubmissionStatus 
                                                        assignment={item} 
                                                        submission={item.submission}
                                                        studentId={studentId}
                                                        db={db}
                                                        appId={appId}
                                                        selectedYear={selectedYear}
                                                    />
                                                )}
                                            </ListItem>
                                        ))}
                                    </List>
                                ) : <Typography color="text.secondary" sx={{ p: 1 }}>Δεν υπάρχουν ενεργές εργασίες.</Typography>}
                            </Box>
                            <Divider />
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
