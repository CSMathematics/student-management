// src/portals/parent/TeachersAndReport.jsx
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container, Paper, Typography, Box, List, ListItem, ListItemText,
    Divider, Button, Avatar, ListItemAvatar
} from '@mui/material';
import { Assessment as ReportIcon, Message as MessageIcon } from '@mui/icons-material';

function TeachersAndReport({ childData, enrolledClassrooms, allTeachers }) {
    const navigate = useNavigate();

    const teachersByClassroom = useMemo(() => {
        if (!enrolledClassrooms || !allTeachers) return [];
        
        return enrolledClassrooms.map(classroom => {
            const teacher = allTeachers.find(t => t.id === classroom.teacherId);
            return {
                classroomName: classroom.classroomName,
                subject: classroom.subject,
                teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Δεν έχει οριστεί',
                teacherInitials: teacher ? `${teacher.firstName?.charAt(0)}${teacher.lastName?.charAt(0)}` : '?',
                teacherId: teacher?.id
            };
        }).sort((a, b) => a.subject.localeCompare(b.subject));

    }, [enrolledClassrooms, allTeachers]);

    const handleGenerateReport = () => {
        navigate(`/student/report/${childData.id}`);
    };

    // --- Η ΑΛΛΑΓΗ ΕΙΝΑΙ ΕΔΩ ---
    const handleStartChat = (teacherId) => {
        if (!teacherId) return;
        // Πλοήγηση στη σελίδα επικοινωνίας, περνώντας το ID του καθηγητή
        navigate('/communication', { state: { selectedChannelId: teacherId, userType: 'teacher' } });
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                    <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                        Καθηγητές & Αναφορές
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<ReportIcon />}
                        onClick={handleGenerateReport}
                    >
                        Εξαγωγή Αναφοράς Προόδου
                    </Button>
                </Box>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    Δείτε τους υπεύθυνους καθηγητές για κάθε μάθημα του/της {childData.firstName} και επικοινωνήστε μαζί τους.
                </Typography>

                <List>
                    {teachersByClassroom.map((item, index) => (
                        <React.Fragment key={index}>
                            <ListItem
                                secondaryAction={
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<MessageIcon />}
                                        onClick={() => handleStartChat(item.teacherId)}
                                        disabled={!item.teacherId}
                                    >
                                        Επικοινωνία
                                    </Button>
                                }
                            >
                                <ListItemAvatar>
                                    <Avatar>{item.teacherInitials}</Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={item.subject}
                                    secondary={`${item.teacherName} - (Τμήμα: ${item.classroomName})`}
                                />
                            </ListItem>
                            <Divider variant="inset" component="li" />
                        </React.Fragment>
                    ))}
                </List>
            </Paper>
        </Container>
    );
}

export default TeachersAndReport;
