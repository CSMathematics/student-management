// src/pages/StudentExamPrintView.jsx
import React, { useMemo } from 'react';
import {
    Dialog, DialogContent, DialogActions, Button, Box, Typography,
    Grid, Divider, Paper, IconButton
} from '@mui/material';
import { Print, Close, School, EventNote, AccessTime, CalendarMonth } from '@mui/icons-material';

const DAYS_ORDER = ['Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο', 'Κυριακή'];

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
        const parts = dateStr.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return dateStr;
    }
    return date.toLocaleDateString('el-GR');
};

function StudentExamPrintView({ open, onClose, student, examData, classrooms }) {
    
    // Group regular schedule by day
    const weeklyScheduleByDay = useMemo(() => {
        if (!student || !student.enrolledClassrooms || !classrooms) return {};
        
        const schedule = {};
        
        student.enrolledClassrooms.forEach(classroomId => {
            const cls = classrooms.find(c => c.id === classroomId);
            if (cls && cls.schedule && Array.isArray(cls.schedule)) {
                cls.schedule.forEach(slot => {
                    if (!schedule[slot.day]) schedule[slot.day] = [];
                    schedule[slot.day].push({
                        subject: cls.subject || cls.name || 'Άγνωστο Μάθημα',
                        startTime: slot.startTime,
                        endTime: slot.endTime
                    });
                });
            }
        });

        // Sort days
        const sortedSchedule = {};
        DAYS_ORDER.forEach(day => {
            if (schedule[day] && schedule[day].length > 0) {
                sortedSchedule[day] = schedule[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
            }
        });

        return sortedSchedule;
    }, [student, classrooms]);

    // Extract exams and prep lessons
    const { examsList, prepLessonsList } = useMemo(() => {
        const exams = [];
        const preps = [];
        
        if (examData && examData.exams) {
            examData.exams.forEach(ex => {
                if (ex.examDate) {
                    exams.push({
                        subject: ex.subject,
                        date: ex.examDate
                    });
                }
                if (ex.prepLessons && Array.isArray(ex.prepLessons)) {
                    ex.prepLessons.forEach(prep => {
                        if (prep.date) {
                            preps.push({
                                subject: ex.subject,
                                date: prep.date,
                                startTime: prep.startTime,
                                endTime: prep.endTime
                            });
                        }
                    });
                }
            });
        }

        // Sort chronologically
        exams.sort((a, b) => new Date(a.date) - new Date(b.date));
        preps.sort((a, b) => {
            const dateDiff = new Date(a.date) - new Date(b.date);
            if (dateDiff === 0) return (a.startTime || '').localeCompare(b.startTime || '');
            return dateDiff;
        });

        return { examsList: exams, prepLessonsList: preps };
    }, [examData]);

    if (!student) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            maxWidth="md" 
            fullWidth 
            PaperProps={{ 
                sx: { borderRadius: '16px', '@media print': { borderRadius: 0, boxShadow: 'none' } } 
            }}
        >
            <Box className="print-header" sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', '@media print': { display: 'none' } }}>
                <Typography variant="h6">Προβολή Εκτύπωσης Μαθητή</Typography>
                <IconButton onClick={onClose}><Close /></IconButton>
            </Box>

            <DialogContent id="print-area" sx={{ p: 4, pt: 1, '@media print': { p: 0, overflow: 'visible' } }}>
                
                {/* Print Document Header */}
                <Box sx={{ mb: 4, textAlign: 'center', borderBottom: '2px solid #333', pb: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>Ατομικό Πρόγραμμα</Typography>
                    <Typography variant="h5" color="text.secondary">
                        {student.lastName} {student.firstName}
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary">
                        {student.grade} • Εξεταστική Ιουνίου
                    </Typography>
                </Box>

                <Grid container spacing={4}>
                    {/* Left Column: Regular Schedule */}
                    <Grid item xs={12} md={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, color: '#1565c0' }}>
                            <CalendarMonth />
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>Κανονικό Εβδομαδιαίο Πρόγραμμα</Typography>
                        </Box>
                        
                        {Object.keys(weeklyScheduleByDay).length === 0 ? (
                            <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>Δεν βρέθηκαν εγγεγραμμένα μαθήματα.</Typography>
                        ) : (
                            Object.entries(weeklyScheduleByDay).map(([day, slots]) => (
                                <Paper key={day} variant="outlined" sx={{ mb: 2, p: 2, borderRadius: '8px', borderColor: '#e0e0e0', '@media print': { breakInside: 'avoid', border: '1px solid #ccc' } }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, borderBottom: '1px solid #eee', pb: 0.5 }}>{day}</Typography>
                                    {slots.map((slot, idx) => (
                                        <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{slot.subject}</Typography>
                                            <Typography variant="body2" color="text.secondary">{slot.startTime} - {slot.endTime}</Typography>
                                        </Box>
                                    ))}
                                </Paper>
                            ))
                        )}
                    </Grid>

                    {/* Right Column: Preps and Exams */}
                    <Grid item xs={12} md={6}>
                        
                        {/* Prep Lessons */}
                        <Box sx={{ mb: 4 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, color: '#e65100' }}>
                                <AccessTime />
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>Επιπλέον Μαθήματα Προετοιμασίας</Typography>
                            </Box>
                            
                            {prepLessonsList.length === 0 ? (
                                <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>Δεν έχουν προγραμματιστεί έξτρα μαθήματα.</Typography>
                            ) : (
                                <Paper variant="outlined" sx={{ p: 0, borderRadius: '8px', overflow: 'hidden', '@media print': { border: '1px solid #ccc' } }}>
                                    {prepLessonsList.map((prep, idx) => (
                                        <Box key={idx} sx={{ 
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                            p: 1.5, borderBottom: idx < prepLessonsList.length - 1 ? '1px solid #eee' : 'none',
                                            backgroundColor: idx % 2 === 0 ? '#fafafa' : 'white',
                                            '@media print': { breakInside: 'avoid' }
                                        }}>
                                            <Box>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{prep.subject}</Typography>
                                                <Typography variant="caption" color="text.secondary">{formatDate(prep.date)}</Typography>
                                            </Box>
                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                {prep.startTime} - {prep.endTime}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Paper>
                            )}
                        </Box>

                        {/* Exam Dates */}
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, color: '#2e7d32' }}>
                                <EventNote />
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>Ημερομηνίες Εξετάσεων</Typography>
                            </Box>
                            
                            {examsList.length === 0 ? (
                                <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>Δεν έχουν οριστεί ημερομηνίες εξετάσεων.</Typography>
                            ) : (
                                <Paper variant="outlined" sx={{ p: 0, borderRadius: '8px', overflow: 'hidden', '@media print': { border: '1px solid #ccc' } }}>
                                    {examsList.map((exam, idx) => (
                                        <Box key={idx} sx={{ 
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                            p: 1.5, borderBottom: idx < examsList.length - 1 ? '1px solid #eee' : 'none',
                                            backgroundColor: idx % 2 === 0 ? '#fafafa' : 'white',
                                            '@media print': { breakInside: 'avoid' }
                                        }}>
                                            <Typography variant="body1" sx={{ fontWeight: 600 }}>{exam.subject}</Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 700, color: '#2e7d32' }}>
                                                {formatDate(exam.date)}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Paper>
                            )}
                        </Box>

                    </Grid>
                </Grid>
            </DialogContent>

            <DialogActions sx={{ p: 3, pt: 0, '@media print': { display: 'none' } }}>
                <Button onClick={onClose} color="inherit">Κλεισιμο</Button>
                <Button onClick={handlePrint} variant="contained" startIcon={<Print />} sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                    Εκτυπωση
                </Button>
            </DialogActions>

            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    .MuiDialog-root { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
                    .MuiDialog-container { height: auto !important; align-items: flex-start !important; }
                    .MuiDialog-paper { width: 100% !important; max-width: 100% !important; margin: 0 !important; box-shadow: none !important; }
                    #print-area, #print-area * { visibility: visible; }
                    #print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px !important; }
                }
            `}</style>
        </Dialog>
    );
}

export default StudentExamPrintView;
