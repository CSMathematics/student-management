// src/components/ClassroomTableVisual.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Tooltip, CircularProgress, Dialog, DialogTitle, DialogContent, List, ListItem, ListItemText, Avatar } from '@mui/material';
import { collection, query, where, getDocs } from 'firebase/firestore';

// Component for a single chair
const Chair = ({ student, isOccupied, onClick }) => (
    <Tooltip title={isOccupied ? `${student.firstName} ${student.lastName}` : 'Κενή Θέση - Προσθήκη Μαθητή'} placement="top">
        <Box
            onClick={onClick}
            sx={{
                width: '60px',
                height: '60px',
                backgroundColor: isOccupied ? '#1976d2' : '#a7d9f7',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                fontSize: '1rem',
                fontWeight: 'bold',
                color: '#fff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                flexShrink: 0,
                p: 0.5,
                cursor: 'pointer',
                transition: 'transform 0.2s ease-in-out, background-color 0.2s',
                '&:hover': {
                    transform: 'scale(1.1)',
                    backgroundColor: isOccupied ? '#1565c0' : '#81c7f5',
                },
            }}
        >
            {isOccupied ? `${student.firstName.charAt(0)}${student.lastName.charAt(0)}` : '+'}
        </Box>
    </Tooltip>
);

function ClassroomTableVisual({ classroom, db, appId, allStudents, onAssignStudent }) {
    const [enrolledStudents, setEnrolledStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);

    useEffect(() => {
        if (!classroom || !allStudents) {
            setEnrolledStudents([]);
            return;
        }
        const currentEnrolled = allStudents.filter(student => 
            student.enrolledClassrooms?.includes(classroom.id)
        );
        setEnrolledStudents(currentEnrolled);
    }, [classroom, allStudents]);

    // <-- ΑΛΛΑΓΗ: Το φιλτράρισμα περιλαμβάνει πλέον και την τάξη -->
    const availableStudents = useMemo(() => {
        if (!classroom) return [];
        // Filter to find students NOT enrolled in the current classroom AND are in the same grade
        return allStudents.filter(student => 
            student.grade === classroom.grade && // <-- Η νέα συνθήκη
            !student.enrolledClassrooms?.includes(classroom.id)
        );
    }, [classroom, allStudents]);

    const handleChairClick = (isOccupied) => {
        if (!isOccupied) {
            setIsSelectorOpen(true);
        }
    };

    const handleStudentSelect = (studentId) => {
        onAssignStudent(studentId, classroom.id);
        setIsSelectorOpen(false);
    };
    
    const chairLayout = useMemo(() => {
        if (!classroom) return null;

        const maxStudents = classroom.maxStudents || 0;
        const chairsData = Array.from({ length: maxStudents }, (_, i) => {
            const student = enrolledStudents[i];
            return {
                isOccupied: !!student,
                student: student,
            };
        });

        let topCount = Math.min(Math.ceil(maxStudents / 2), 5);
        let bottomCount = Math.min(Math.floor(maxStudents / 2), 5);
        
        const topChairs = chairsData.slice(0, topCount);
        const bottomChairs = chairsData.slice(topCount, topCount + bottomCount);
        const sideChairs = chairsData.slice(topCount + bottomCount);

        return { topChairs, bottomChairs, sideChairs };

    }, [classroom, enrolledStudents]);


    if (!classroom) {
        return (
            <Box sx={{ textAlign: 'center', mt: 4, color: '#757575', minHeight: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="h6">Επιλέξτε ένα τμήμα για να δείτε τη διάταξη.</Typography>
            </Box>
        );
    }

    return (
        <>
            <Box sx={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                mt: 4, mb: 4, p: 2, border: '1px solid #e0e0e0', borderRadius: '12px',
                backgroundColor: '#fdfdfd', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                minHeight: '350px', position: 'relative',
            }}>
                <Typography variant="h6" sx={{ mb: 2, color: '#3f51b5' }}>
                    Διάταξη Τμήματος: {classroom.grade} - {classroom.subject}
                </Typography>

                {loading ? <CircularProgress /> : (
                    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                        
                        <Box sx={{ display: 'flex', gap: '20px', mb: 2 }}>
                            {chairLayout.topChairs.map((chair, index) => (
                                <Chair key={`top-${index}`} {...chair} onClick={() => handleChairClick(chair.isOccupied)} />
                            ))}
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', gap: '20px' }}>
                            {chairLayout.sideChairs.length > 0 && <Chair {...chairLayout.sideChairs[0]} onClick={() => handleChairClick(chairLayout.sideChairs[0].isOccupied)} />}

                            <Box sx={{
                                width: '70%', maxWidth: '450px', height: '120px', backgroundColor: '#87ceeb',
                                borderRadius: '60px', display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center', p: 2,
                                boxShadow: '0 4px 8px rgba(0,0,0,0.2)', textAlign: 'center', color: '#fff',
                                fontSize: '0.9rem', fontWeight: 'bold', flexShrink: 0
                            }}>
                                <Typography variant="body2" sx={{ color: '#fff' }}>Μάθημα: {classroom.subject}</Typography>
                                <Typography variant="body2" sx={{ color: '#fff' }}>Τάξη: {classroom.grade} ({classroom.specialization || 'Γενικό'})</Typography>
                                <Typography variant="body2" sx={{ color: '#fff' }}>Μαθητές: {enrolledStudents.length} / {classroom.maxStudents}</Typography>
                            </Box>

                            {chairLayout.sideChairs.length > 1 && <Chair {...chairLayout.sideChairs[1]} onClick={() => handleChairClick(chairLayout.sideChairs[1].isOccupied)} />}
                        </Box>

                        <Box sx={{ display: 'flex', gap: '20px', mt: 2 }}>
                            {chairLayout.bottomChairs.map((chair, index) => (
                                <Chair key={`bottom-${index}`} {...chair} onClick={() => handleChairClick(chair.isOccupied)} />
                            ))}
                        </Box>
                    </Box>
                )}
            </Box>

            <Dialog open={isSelectorOpen} onClose={() => setIsSelectorOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Επιλογή Μαθητή για το τμήμα ({classroom.grade})</DialogTitle>
                <DialogContent dividers>
                    <List>
                        {availableStudents.length > 0 ? availableStudents.map(student => (
                            <ListItem button key={student.id} onClick={() => handleStudentSelect(student.id)}>
                                <Avatar sx={{ mr: 2, bgcolor: 'secondary.main' }}>
                                    {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                                </Avatar>
                                <ListItemText primary={`${student.firstName} ${student.lastName}`} secondary={student.grade} />
                            </ListItem>
                        )) : (
                            <ListItem>
                                <ListItemText primary="Δεν υπάρχουν διαθέσιμοι μαθητές αυτής της τάξης." />
                            </ListItem>
                        )}
                    </List>
                </DialogContent>
            </Dialog>
        </>
    );
}

export default ClassroomTableVisual;
