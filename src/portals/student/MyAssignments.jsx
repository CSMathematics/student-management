// src/portals/student/MyAssignments.jsx
import React, { useState, useMemo } from 'react';
import {
    Container, Paper, Typography, Box, Accordion, AccordionSummary,
    AccordionDetails, List, ListItem, ListItemIcon, ListItemText, Chip, Link, Divider, Button, CircularProgress, Tooltip, IconButton
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, Assignment as AssignmentIcon, Event as EventIcon, Description as FileIcon, UploadFile as UploadFileIcon, CheckCircle as SubmittedIcon, Delete as DeleteIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { collection, addDoc, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';


dayjs.extend(isSameOrAfter);

const assignmentTypeLabels = {
    homework: 'Εργασία για το Σπίτι',
    test: 'Διαγώνισμα',
    project: 'Project',
    oral: 'Προφορική Εξέταση'
};

const SubmissionStatus = ({ assignment, submission, studentId, db, appId, selectedYear }) => {
    const [isUploading, setIsUploading] = useState(false);

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file || !studentId || !selectedYear) return;

        if (submission) {
            await handleDeleteSubmission();
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

        } catch (error) {
            console.error("Error uploading submission:", error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteSubmission = async () => {
        if (!submission) return;
        const storage = getStorage();
        const fileRef = ref(storage, submission.storagePath);
        
        try {
            await deleteObject(fileRef);
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/submissions`, submission.id));
        } catch (error) {
            console.error("Error deleting submission:", error);
        }
    };


    if (submission) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <SubmittedIcon color="success" fontSize="small" />
                <Typography variant="body2" color="text.secondary">
                    Υποβλήθηκε: <Link href={submission.fileURL} target="_blank">{submission.fileName}</Link>
                </Typography>
                <Tooltip title="Διαγραφή & Αντικατάσταση">
                    <IconButton size="small" onClick={handleDeleteSubmission} disabled={isUploading}>
                        <DeleteIcon fontSize="inherit" />
                    </IconButton>
                </Tooltip>
            </Box>
        );
    }

    return (
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
    );
};


function MyAssignments({ studentData, enrolledClassrooms, assignments, submissions, db, appId, selectedYear }) {

    const assignmentsByClassroom = useMemo(() => {
        if (!enrolledClassrooms || !assignments) return [];

        return enrolledClassrooms.map(classroom => {
            const classroomAssignments = assignments
                .filter(a => a.classroomId === classroom.id)
                .map(assignment => {
                    const submission = submissions.find(s => s.assignmentId === assignment.id);
                    // --- ΔΙΟΡΘΩΣΗ: Διασφαλίζουμε ότι το attachedFiles είναι πάντα πίνακας ---
                    return { ...assignment, submission, attachedFiles: assignment.attachedFiles || [] };
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
    }, [enrolledClassrooms, assignments, submissions]);

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
                                                {/* --- ΔΙΟΡΘΩΣΗ: Προσθήκη ελέγχου πριν την εκτέλεση του .map() --- */}
                                                {item.attachedFiles && item.attachedFiles.map(file => (
                                                    <Link href={file.url} target="_blank" rel="noopener noreferrer" key={file.path} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, mb: 1 }}>
                                                        <FileIcon fontSize="inherit" /> Εκφώνηση: {file.name}
                                                    </Link>
                                                ))}
                                                <SubmissionStatus 
                                                    assignment={item} 
                                                    submission={item.submission}
                                                    studentId={studentData.id}
                                                    db={db}
                                                    appId={appId}
                                                    selectedYear={selectedYear}
                                                />
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
