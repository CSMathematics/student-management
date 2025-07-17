// src/components/ClassroomTableVisual.jsx
import React from 'react';
import { Box, Typography } from '@mui/material';

function ClassroomTableVisual({ classroom }) {
    if (!classroom) {
        return (
            <Box sx={{ textAlign: 'center', mt: 4, color: '#757575' }}>
                <Typography variant="h6">Επιλέξτε ένα τμήμα για να δείτε τη διάταξη.</Typography>
            </Box>
        );
    }

    // Ensure enrolledStudents is an array before trying to slice it
    const studentsToDisplay = Array.isArray(classroom.enrolledStudents)
        ? classroom.enrolledStudents.slice(0, 5)
        : [];
    const remainingStudentsCount = Array.isArray(classroom.enrolledStudents)
        ? Math.max(0, classroom.enrolledStudents.length - studentsToDisplay.length)
        : 0;

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            mt: 4,
            mb: 4,
            p: 2,
            border: '1px solid #e0e0e0',
            borderRadius: '12px',
            backgroundColor: '#fdfdfd',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            minHeight: '350px', // Ensure enough space for the visual
            position: 'relative', // For absolute positioning of chairs
            overflow: 'hidden' // Hide overflow if content is too big
        }}>
            <Typography variant="h6" sx={{ mb: 2, color: '#3f51b5' }}>
                Διάταξη Τμήματος: {classroom.grade} - {classroom.subject}
            </Typography>

            {/* Top Chairs */}
            <Box sx={{ display: 'flex', gap: '20px', mb: 2 }}>
                {[0, 1, 2].map(index => (
                    <Box
                        key={`top-chair-${index}`}
                        sx={{
                            width: '60px',
                            height: '60px',
                            backgroundColor: '#a7d9f7', // Light blue for chairs
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            color: '#333',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            flexShrink: 0, // Prevent shrinking
                            p: 0.5, // Padding inside chair
                            overflow: 'hidden', // Hide overflow text
                            textOverflow: 'ellipsis', // Add ellipsis for long names
                            whiteSpace: 'nowrap', // Prevent wrapping
                        }}
                        title={studentsToDisplay[index] ? studentsToDisplay[index].name : 'Κενή Θέση'}
                    >
                        {studentsToDisplay[index] ? studentsToDisplay[index].name.split(' ')[0] : 'Κενό'}
                    </Box>
                ))}
            </Box>

            {/* Table */}
            <Box sx={{
                width: '80%',
                maxWidth: '500px',
                height: '120px',
                backgroundColor: '#87ceeb', // Medium blue for table
                borderRadius: '60px', // Oval shape
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 2,
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                textAlign: 'center',
                color: '#fff',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                position: 'relative',
            }}>
                <Typography variant="body2" sx={{ mb: 0.5, color: '#fff' }}>
                    Μάθημα: {classroom.subject}
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5, color: '#fff' }}>
                    Τάξη: {classroom.grade} ({classroom.specialization || 'Γενικό'})
                </Typography>
                <Typography variant="body2" sx={{ color: '#fff' }}>
                    Μέγ. Μαθητές: {classroom.maxStudents}
                </Typography>
            </Box>

            {/* Side Chairs */}
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                width: 'calc(80% + 120px)', // Table width + 2*chair width
                maxWidth: 'calc(500px + 120px)',
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
            }}>
                {/* Left Chair */}
                <Box
                    sx={{
                        width: '60px',
                        height: '60px',
                        backgroundColor: '#a7d9f7',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        color: '#333',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        flexShrink: 0,
                        p: 0.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                    title={studentsToDisplay[3] ? studentsToDisplay[3].name : 'Κενή Θέση'}
                >
                    {studentsToDisplay[3] ? studentsToDisplay[3].name.split(' ')[0] : 'Κενό'}
                </Box>
                {/* Right Chair */}
                <Box
                    sx={{
                        width: '60px',
                        height: '60px',
                        backgroundColor: '#a7d9f7',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        color: '#333',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        flexShrink: 0,
                        p: 0.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                    title={studentsToDisplay[4] ? studentsToDisplay[4].name : 'Κενή Θέση'}
                >
                    {studentsToDisplay[4] ? studentsToDisplay[4].name.split(' ')[0] : 'Κενό'}
                </Box>
            </Box>

            {remainingStudentsCount > 0 && (
                <Typography variant="body2" sx={{ mt: 2, color: '#757575', textAlign: 'center' }}>
                    και {remainingStudentsCount} επιπλέον μαθητές.
                </Typography>
            )}
        </Box>
    );
}

export default ClassroomTableVisual;
