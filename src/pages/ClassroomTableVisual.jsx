// src/components/ClassroomTableVisual.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Tooltip, CircularProgress } from '@mui/material';
import { collection, query, where, getDocs } from 'firebase/firestore';

// Component for a single chair, styled to match your original design
const Chair = ({ student, isOccupied }) => (
    <Tooltip title={isOccupied ? `${student.firstName} ${student.lastName}` : 'Κενή Θέση'} placement="top">
        <Box
            sx={{
                width: '60px',
                height: '60px',
                backgroundColor: isOccupied ? '#1976d2' : '#a7d9f7', // Darker blue for occupied
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
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                    transform: 'scale(1.1)',
                },
            }}
        >
            {isOccupied ? `${student.firstName.charAt(0)}${student.lastName.charAt(0)}` : ''}
        </Box>
    </Tooltip>
);

function ClassroomTableVisual({ classroom, db, appId }) {
    const [enrolledStudents, setEnrolledStudents] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchEnrolledStudents = async () => {
            if (!classroom || !db || !appId) {
                setEnrolledStudents([]);
                return;
            }

            setLoading(true);
            try {
                const studentsRef = collection(db, `artifacts/${appId}/public/data/students`);
                const q = query(studentsRef, where('enrolledClassrooms', 'array-contains', classroom.id));
                
                const querySnapshot = await getDocs(q);
                const studentsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setEnrolledStudents(studentsList);
            } catch (error) {
                console.error("Error fetching enrolled students:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchEnrolledStudents();
    }, [classroom, db, appId]);

    // This useMemo hook creates the chair layout dynamically
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

        // Dynamic distribution logic
        let topCount = Math.min(Math.ceil(maxStudents / 2), 5);
        let bottomCount = Math.min(Math.floor(maxStudents / 2), 5);
        
        let remaining = maxStudents - topCount - bottomCount;
        let sideCount = 0;
        if (remaining > 0) {
            // If there's an odd number of total students, one side will have an extra chair
            sideCount = Math.ceil(remaining / 2);
        }

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
                    
                    {/* Top Chairs */}
                    <Box sx={{ display: 'flex', gap: '20px', mb: 2 }}>
                        {chairLayout.topChairs.map((chair, index) => (
                            <Chair key={`top-${index}`} {...chair} />
                        ))}
                    </Box>

                    {/* Middle section with Table and Side Chairs */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', gap: '20px' }}>
                        {/* Left Side Chair(s) */}
                        {chairLayout.sideChairs.length > 0 && <Chair {...chairLayout.sideChairs[0]} />}

                        {/* Table */}
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

                        {/* Right Side Chair(s) */}
                        {chairLayout.sideChairs.length > 1 && <Chair {...chairLayout.sideChairs[1]} />}
                    </Box>

                    {/* Bottom Chairs */}
                    <Box sx={{ display: 'flex', gap: '20px', mt: 2 }}>
                        {chairLayout.bottomChairs.map((chair, index) => (
                            <Chair key={`bottom-${index}`} {...chair} />
                        ))}
                    </Box>
                </Box>
            )}
        </Box>
    );
}

export default ClassroomTableVisual;
