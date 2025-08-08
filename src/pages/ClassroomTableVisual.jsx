// src/components/ClassroomTableVisual.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Tooltip, CircularProgress, Dialog, DialogTitle, DialogContent, List, ListItem, ListItemText, Avatar, Menu, MenuItem, ListItemIcon } from '@mui/material';
import { Add as AddIcon, RemoveCircleOutline as RemoveIcon, SwapHoriz as SwapIcon, MoveUp as MoveIcon } from '@mui/icons-material';

const Chair = ({ student, isOccupied, onChairClick, onChairContextMenu }) => (
    <Tooltip title={isOccupied ? `${student.firstName} ${student.lastName}` : 'Κενή Θέση - Προσθήκη Μαθητή'} placement="top">
        <Box
            onClick={onChairClick}
            onContextMenu={onChairContextMenu}
            sx={{
                width: '60px', height: '60px',
                backgroundColor: isOccupied ? '#1976d2' : '#a7d9f7',
                borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                textAlign: 'center', fontSize: '1rem', fontWeight: 'bold', color: '#fff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)', flexShrink: 0, p: 0.5,
                cursor: 'pointer', transition: 'transform 0.2s ease-in-out, background-color 0.2s',
                '&:hover': { transform: 'scale(1.1)', backgroundColor: isOccupied ? '#1565c0' : '#81c7f5' },
            }}
        >
            {isOccupied ? `${student.firstName.charAt(0)}${student.lastName.charAt(0)}` : <AddIcon />}
        </Box>
    </Tooltip>
);

// --- ΑΛΛΑΓΗ: Προσθήκη του `classrooms` prop ---
function ClassroomTableVisual({ classroom, db, appId, allStudents, classrooms, onAssignStudent, onRemoveStudent, onMoveStudent, onSwapStudent, otherClassrooms }) {
    const [enrolledStudents, setEnrolledStudents] = useState([]);
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);
    
    const [contextMenu, setContextMenu] = useState(null);
    const [selectedStudentForAction, setSelectedStudentForAction] = useState(null);

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

    // --- ΑΛΛΑΓΗ: Η λογική ενημερώθηκε για να ελέγχει όλα τα τμήματα του ίδιου μαθήματος ---
    const availableStudents = useMemo(() => {
        if (!classroom || !allStudents || !classrooms) return [];

        // Βρίσκουμε όλα τα IDs των τμημάτων που διδάσκουν το ίδιο μάθημα
        const sameSubjectClassroomIds = classrooms
            .filter(c => c.subject === classroom.subject && c.grade === classroom.grade)
            .map(c => c.id);

        return allStudents.filter(student => {
            // Συνθήκη 1: Ο μαθητής πρέπει να είναι στην ίδια τάξη
            const isInSameGrade = student.grade === classroom.grade;
            if (!isInSameGrade) return false;

            // Συνθήκη 2: Ο μαθητής δεν πρέπει να είναι ήδη εγγεγραμμένος σε ΚΑΝΕΝΑ τμήμα αυτού του μαθήματος
            const isEnrolledInSubject = student.enrolledClassrooms?.some(enrolledId => 
                sameSubjectClassroomIds.includes(enrolledId)
            );
            
            return !isEnrolledInSubject;
        });
    }, [classroom, allStudents, classrooms]);

    const handleChairClick = (isOccupied, student) => {
        if (!isOccupied) {
            setIsSelectorOpen(true);
        }
    };

    const handleContextMenu = (event, student) => {
        event.preventDefault();
        if (student) {
            setSelectedStudentForAction(student);
            setContextMenu(
                contextMenu === null ? { mouseX: event.clientX + 2, mouseY: event.clientY - 6 } : null,
            );
        }
    };

    const handleCloseContextMenu = () => {
        setContextMenu(null);
        setSelectedStudentForAction(null);
    };

    const handleRemoveClick = () => {
        onRemoveStudent(selectedStudentForAction, classroom);
        handleCloseContextMenu();
    };

    const handleMoveClick = () => {
        onMoveStudent(selectedStudentForAction, classroom);
        handleCloseContextMenu();
    };

    const handleSwapClick = () => {
        onSwapStudent(selectedStudentForAction, classroom);
        handleCloseContextMenu();
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
            return { isOccupied: !!student, student: student };
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
                mt: 4, mb: 4, p: 2, border: '1px solid #e0e0e0', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                minHeight: '350px', position: 'relative',
            }}>
                <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
                    Δεξί κλικ σε μαθητή για ενέργειες (αφαίρεση, μετακίνηση, ανταλλαγή).
                </Typography>

                <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                    <Box sx={{ display: 'flex', gap: '20px', mb: 2 }}>
                        {chairLayout.topChairs.map((chair, index) => (
                            <Chair key={`top-${index}`} {...chair} onChairClick={() => handleChairClick(chair.isOccupied, chair.student)} onChairContextMenu={(e) => handleContextMenu(e, chair.student)} />
                        ))}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', gap: '20px' }}>
                        {chairLayout.sideChairs.length > 0 && <Chair {...chairLayout.sideChairs[0]} onChairClick={() => handleChairClick(chairLayout.sideChairs[0].isOccupied, chairLayout.sideChairs[0].student)} onChairContextMenu={(e) => handleContextMenu(e, chairLayout.sideChairs[0].student)} />}
                        <Box sx={{ width: '70%', maxWidth: '400px', height: '150px', backgroundColor: '#87ceeb', borderRadius: '75px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 2, boxShadow: '0 4px 8px rgba(0,0,0,0.2)', textAlign: 'center', color: '#fff', fontSize: '0.9rem', fontWeight: 'bold', flexShrink: 0 }}>
                            <Typography variant="body2" sx={{ color: '#fff' }}>Μάθημα: {classroom.subject}</Typography>
                            <Typography variant="body2" sx={{ color: '#fff' }}>Τάξη: {classroom.grade} ({classroom.specialization || 'Γενικό'})</Typography>
                            <Typography variant="body2" sx={{ color: '#fff' }}>Μαθητές: {enrolledStudents.length} / {classroom.maxStudents}</Typography>
                        </Box>
                        {chairLayout.sideChairs.length > 1 && <Chair {...chairLayout.sideChairs[1]} onChairClick={() => handleChairClick(chairLayout.sideChairs[1].isOccupied, chairLayout.sideChairs[1].student)} onChairContextMenu={(e) => handleContextMenu(e, chairLayout.sideChairs[1].student)} />}
                    </Box>
                    <Box sx={{ display: 'flex', gap: '20px', mt: 2 }}>
                        {chairLayout.bottomChairs.map((chair, index) => (
                            <Chair key={`bottom-${index}`} {...chair} onChairClick={() => handleChairClick(chair.isOccupied, chair.student)} onChairContextMenu={(e) => handleContextMenu(e, chair.student)} />
                        ))}
                    </Box>
                </Box>
            </Box>

            <Dialog open={isSelectorOpen} onClose={() => setIsSelectorOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Επιλογή Μαθητή για το τμήμα ({classroom.grade})</DialogTitle>
                <DialogContent dividers>
                    <List>
                        {availableStudents.length > 0 ? availableStudents.map(student => (
                            <ListItem button key={student.id} onClick={() => handleStudentSelect(student.id)}>
                                <Avatar sx={{ mr: 2, bgcolor: 'secondary.main' }}>{student.firstName.charAt(0)}{student.lastName.charAt(0)}</Avatar>
                                <ListItemText primary={`${student.firstName} ${student.lastName}`} secondary={student.grade} />
                            </ListItem>
                        )) : (
                            <ListItem>
                                <ListItemText primary="Δεν υπάρχουν διαθέσιμοι μαθητές που να πληρούν τα κριτήρια." />
                            </ListItem>
                        )}
                    </List>
                </DialogContent>
            </Dialog>

            <Menu
                open={contextMenu !== null}
                onClose={handleCloseContextMenu}
                anchorReference="anchorPosition"
                anchorPosition={contextMenu !== null ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
            >
                <MenuItem onClick={handleRemoveClick}><ListItemIcon><RemoveIcon fontSize="small" color="error" /></ListItemIcon>Αφαίρεση από Τμήμα</MenuItem>
                {otherClassrooms.length > 0 && <MenuItem onClick={handleMoveClick}><ListItemIcon><MoveIcon fontSize="small" /></ListItemIcon>Μετακίνηση σε...</MenuItem>}
                {otherClassrooms.length > 0 && <MenuItem onClick={handleSwapClick}><ListItemIcon><SwapIcon fontSize="small" /></ListItemIcon>Ανταλλαγή με...</MenuItem>}
            </Menu>
        </>
    );
}

export default ClassroomTableVisual;
