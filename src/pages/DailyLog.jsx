// src/pages/DailyLog.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { Box, Paper, Typography, Button, TextField, Switch, FormControlLabel, CircularProgress, FormControl, InputLabel, Select, MenuItem, ListSubheader, Chip, Divider, Accordion, AccordionSummary, AccordionDetails, Grid, Alert } from '@mui/material';
import { Save as SaveIcon, Add as AddIcon, UploadFile as UploadFileIcon, Link as LinkIcon, Delete as DeleteIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import { doc, getDoc, writeBatch, setDoc, collection } from 'firebase/firestore';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import 'dayjs/locale/el';
import AssignmentForm from './AssignmentForm.jsx';
import MaterialSelector from './MaterialSelector.jsx';

dayjs.locale('el');

const assignmentTypeLabels = {
    homework: 'Εργασία για το Σπίτι',
    test: 'Διαγώνισμα',
    project: 'Project',
    oral: 'Προφορική Εξέταση'
};

const StudentGradingRow = ({ student, data, onDataChange, isAssignment = false, assignmentId = null }) => (
    <Paper key={student.id} variant="outlined" sx={{ p: 2, mb: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography sx={{ flexBasis: '25%', flexShrink: 0 }}>{student.lastName} {student.firstName}</Typography>
        <FormControlLabel
            sx={{ flexBasis: '20%', flexShrink: 0 }}
            control={
                <Switch
                    checked={data?.attendance === 'present'}
                    onChange={(e) => onDataChange(student.id, 'attendance', e.target.checked ? 'present' : 'absent', assignmentId)}
                />
            }
            label={data?.attendance === 'present' ? 'Παρών' : 'Απών'}
        />
        {isAssignment ? (
            <>
                <TextField size="small" label="Βαθμός" sx={{ flexGrow: 1 }} disabled={data?.attendance === 'absent'} value={data?.assignments?.[assignmentId]?.grade || ''} onChange={(e) => onDataChange(student.id, 'grade', e.target.value, assignmentId)} />
                <TextField size="small" label="Σχόλια" sx={{ flexGrow: 1 }} disabled={data?.attendance === 'absent'} value={data?.assignments?.[assignmentId]?.feedback || ''} onChange={(e) => onDataChange(student.id, 'feedback', e.target.value, assignmentId)} />
            </>
        ) : (
            <>
                <TextField size="small" label="Συμμετοχή" sx={{ flexGrow: 1 }} disabled={data?.attendance === 'absent'} value={data?.lesson?.participation || ''} onChange={(e) => onDataChange(student.id, 'participation', e.target.value)} />
                <TextField size="small" label="Homework" sx={{ flexGrow: 1 }} disabled={data?.attendance === 'absent'} value={data?.lesson?.homework || ''} onChange={(e) => onDataChange(student.id, 'homework', e.target.value)} />
            </>
        )}
    </Paper>
);

function DailyLog({ classroom, allStudents, allGrades, allAbsences, allAssignments, allCourses = [], db, appId, teacherData, selectedYear }) {
    const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [dailyData, setDailyData] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [assignmentFormOpen, setAssignmentFormOpen] = useState(false);
    
    const [taughtSection, setTaughtSection] = useState('');
    const [notes, setNotes] = useState('');
    const [attachedFiles, setAttachedFiles] = useState([]);
    const [materialSelectorOpen, setMaterialSelectorOpen] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    const studentsInClassroom = useMemo(() => {
        return allStudents.filter(s => s.enrolledClassrooms?.includes(classroom.id))
            .sort((a, b) => a.lastName.localeCompare(b.lastName));
    }, [classroom, allStudents]);
    
    const courseForClassroom = useMemo(() => {
        // --- ΔΙΟΡΘΩΣΗ 1: Προσθήκη ελέγχου για να διασφαλιστεί ότι το allCourses είναι πίνακας ---
        if (!classroom || !Array.isArray(allCourses)) return null;
        
        // --- ΔΙΟΡΘΩΣΗ 2: Η σύγκριση γίνεται case-insensitive ---
        const foundCourse = allCourses.find(c => 
            c.grade === classroom.grade && 
            c.name?.toLowerCase() === classroom.subject?.toLowerCase()
        );
        
        return foundCourse;
    }, [classroom, allCourses]);

    const syllabusOptions = useMemo(() => {
        if (!courseForClassroom?.syllabus) return [];
        const options = [];
        courseForClassroom.syllabus.forEach((chapter, chapterIndex) => {
            options.push({ isHeader: true, title: `Κεφ. ${chapterIndex + 1}: ${chapter.title}` });
            chapter.sections.forEach((section, sectionIndex) => {
                const sectionId = `${chapterIndex}-${sectionIndex}`;
                options.push({ isHeader: false, id: sectionId, text: section.text });
            });
        });
        return options;
    }, [courseForClassroom]);

    const calendarEvents = useMemo(() => {
        const events = [];
        const dayMapping = { 'Δευτέρα': 1, 'Τρίτη': 2, 'Τετάρτη': 3, 'Πέμπτη': 4, 'Παρασκευή': 5, 'Σάββατο': 6 };

        if (classroom.schedule) {
            classroom.schedule.forEach(slot => {
                events.push({
                    title: classroom.subject,
                    daysOfWeek: [dayMapping[slot.day]],
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    color: classroom.color || '#1e88e5',
                    extendedProps: { type: 'lesson' }
                });
            });
        }

        if (allAssignments) {
            allAssignments.filter(a => a.classroomId === classroom.id).forEach(a => {
                const isAllDayEvent = a.isAllDay !== false;
                const event = {
                    id: a.id,
                    title: `📝 ${a.title}`,
                    allDay: isAllDayEvent,
                    color: '#f57c00',
                    extendedProps: { type: 'assignment', ...a }
                };
                if (isAllDayEvent) {
                    event.date = dayjs(a.dueDate.toDate()).format('YYYY-MM-DD');
                } else {
                    event.start = dayjs(a.dueDate.toDate()).format('YYYY-MM-DD') + 'T' + (a.startTime || '09:00');
                    event.end = dayjs(a.dueDate.toDate()).format('YYYY-MM-DD') + 'T' + (a.endTime || '10:00');
                }
                events.push(event);
            });
        }
        return events;
    }, [classroom, allAssignments]);

    const assignmentsForSelectedDate = useMemo(() => {
        if (!selectedDate || !allAssignments) return [];
        return allAssignments.filter(a => a.classroomId === classroom.id && dayjs(a.dueDate.toDate()).isSame(selectedDate, 'day'));
    }, [selectedDate, allAssignments, classroom.id]);

    const isLessonOnSelectedDate = useMemo(() => {
        if (!selectedDate || !classroom.schedule) return false;
        const dayOfWeek = dayjs(selectedDate).format('dddd');
        return classroom.schedule.some(slot => slot.day === dayOfWeek);
    }, [selectedDate, classroom.schedule]);


    useEffect(() => {
        const loadDailyData = async () => {
            if (!selectedDate || !selectedYear) return;
            const logId = `${classroom.id}_${selectedDate}`;
            const logRef = doc(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/dailyLogs`, logId);
            const logSnap = await getDoc(logRef);
            const logData = logSnap.exists() ? logSnap.data() : {};
            setTaughtSection(logData.taughtSection || '');
            setNotes(logData.notes || '');
            setAttachedFiles(logData.attachedFiles || []);
            const data = {};
            const dayStart = dayjs(selectedDate).startOf('day');
            for (const student of studentsInClassroom) {
                const absence = allAbsences.find(a => a.studentId === student.id && dayjs(a.date.toDate()).isSame(dayStart, 'day'));
                const participationGrade = allGrades.find(g => g.logId === logId && g.studentId === student.id && g.type === 'participation');
                const homeworkGrade = allGrades.find(g => g.logId === logId && g.studentId === student.id && g.type === 'homework');
                const studentAssignmentsData = {};
                for (const assignment of assignmentsForSelectedDate) {
                    const assignmentGrade = allGrades.find(g => g.assignmentId === assignment.id && g.studentId === student.id);
                    studentAssignmentsData[assignment.id] = {
                        grade: assignmentGrade?.grade || '',
                        feedback: assignmentGrade?.feedback || ''
                    };
                }
                data[student.id] = {
                    attendance: absence ? 'absent' : 'present',
                    lesson: {
                        participation: participationGrade?.grade || '',
                        homework: homeworkGrade?.grade || ''
                    },
                    assignments: studentAssignmentsData
                };
            }
            setDailyData(data);
        };
        loadDailyData();
    }, [selectedDate, studentsInClassroom, allGrades, allAbsences, assignmentsForSelectedDate, db, appId, classroom.id, selectedYear]);

    const handleDataChange = (studentId, field, value, assignmentId = null) => {
        setDailyData(prev => {
            const studentDataCopy = JSON.parse(JSON.stringify(prev[studentId] || { attendance: 'present', lesson: {}, assignments: {} }));
            if (field === 'attendance') {
                studentDataCopy.attendance = value;
            } else if (assignmentId) {
                if (!studentDataCopy.assignments[assignmentId]) studentDataCopy.assignments[assignmentId] = {};
                studentDataCopy.assignments[assignmentId][field] = value;
            } else {
                studentDataCopy.lesson[field] = value;
            }
            return { ...prev, [studentId]: studentDataCopy };
        });
    };

    const handleDateClick = (arg) => setSelectedDate(arg.dateStr);
    const handleEventClick = (clickInfo) => setSelectedDate(dayjs(clickInfo.event.start).format('YYYY-MM-DD'));

    const handleSaveDay = async () => {
        if (!selectedDate || !selectedYear) return;
        setIsSaving(true);
        setFeedback({ type: '', message: '' });
        const logId = `${classroom.id}_${selectedDate}`;
        const batch = writeBatch(db);
        const yearPath = `artifacts/${appId}/public/data/academicYears/${selectedYear}`;
        const logRef = doc(db, `${yearPath}/dailyLogs`, logId);
        batch.set(logRef, { 
            classroomId: classroom.id, date: new Date(selectedDate), type: 'lesson',
            taughtSection, notes, attachedFiles
        }, { merge: true });
        for (const studentId in dailyData) {
            const studentData = dailyData[studentId];
            if (studentData.lesson) {
                if (studentData.lesson.participation) {
                    const gradeRef = doc(db, `${yearPath}/grades`, `${logId}_${studentId}_participation`);
                    batch.set(gradeRef, { studentId, classroomId: classroom.id, subject: classroom.subject, logId, date: new Date(selectedDate), type: 'participation', grade: parseFloat(String(studentData.lesson.participation).replace(',', '.')) || 0 }, { merge: true });
                }
                if (studentData.lesson.homework) {
                    const gradeRef = doc(db, `${yearPath}/grades`, `${logId}_${studentId}_homework`);
                    batch.set(gradeRef, { studentId, classroomId: classroom.id, subject: classroom.subject, logId, date: new Date(selectedDate), type: 'homework', grade: parseFloat(String(studentData.lesson.homework).replace(',', '.')) || 0 }, { merge: true });
                }
            }
            if (studentData.assignments) {
                for (const assignmentId in studentData.assignments) {
                    const assignmentData = studentData.assignments[assignmentId];
                    const assignmentDetails = assignmentsForSelectedDate.find(a => a.id === assignmentId);
                    if (assignmentData.grade && assignmentDetails) {
                        const gradeRef = doc(db, `${yearPath}/grades`, `${assignmentId}_${studentId}`);
                        batch.set(gradeRef, { studentId, classroomId: classroom.id, subject: classroom.subject, assignmentId, date: new Date(selectedDate), type: assignmentDetails.type, grade: parseFloat(String(assignmentData.grade).replace(',', '.')) || 0, feedback: assignmentData.feedback || '' }, { merge: true });
                    }
                }
            }
        }
        try {
            await batch.commit();
            setFeedback({ type: 'success', message: 'Η αποθήκευση ολοκληρώθηκε με επιτυχία!' });
        } catch (error) {
            console.error("Error saving daily log:", error);
            setFeedback({ type: 'error', message: 'Προέκυψε σφάλμα κατά την αποθήκευση.' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleSaveAssignment = async (assignmentData) => {
        if (!selectedYear) return;
        const collectionRef = collection(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/assignments`);
        const newDocRef = doc(collectionRef);
        try {
            await setDoc(newDocRef, { ...assignmentData, id: newDocRef.id });
            setAssignmentFormOpen(false);
        } catch (error) {
            console.error("Error saving assignment: ", error);
        }
    };
    
    const handleAttachFiles = (files) => setAttachedFiles(prev => [...prev, ...files]);
    const handleRemoveFile = (fileToRemove) => setAttachedFiles(prev => prev.filter(file => file.path !== fileToRemove.path));

    return (
        <Box>
            <style>
                {`
                    .fc-daygrid-event { padding: 4px 6px; font-size: 0.9rem; font-weight: 500; }
                    .fc-timegrid-event .fc-event-main { padding: 4px; }
                    .fc-event { cursor: pointer; }
                `}
            </style>
            <Button fullWidth variant="contained" startIcon={<AddIcon />} onClick={() => setAssignmentFormOpen(true)} sx={{ mb: 2 }}>
                Προσθήκη Νέας Αξιολόγησης
            </Button>
            <Paper variant="outlined" sx={{ p: 2, height: 'auto' }}>
                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' }}
                    events={calendarEvents}
                    locale="el"
                    height="50vh"
                    dateClick={handleDateClick}
                    eventClick={handleEventClick}
                    buttonText={{ today: 'Σήμερα', month: 'Μήνας', week: 'Εβδομάδα' }}
                />
            </Paper>

            {selectedDate && (
                <Paper sx={{ p: 2, mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">
                            Καταχώρηση για: {dayjs(selectedDate).format('dddd, DD/MM/YYYY')}
                        </Typography>
                        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveDay} disabled={isSaving}>
                            {isSaving ? <CircularProgress size={24} /> : 'Αποθήκευση Ημέρας'}
                        </Button>
                    </Box>
                    
                    {feedback.message && (
                        <Alert 
                            severity={feedback.type} 
                            sx={{ mb: 2 }}
                            onClose={() => setFeedback({ type: '', message: '' })}
                        >
                            {feedback.message}
                        </Alert>
                    )}

                    {isLessonOnSelectedDate && (
                        <Accordion defaultExpanded>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography>Μάθημα Ημέρας</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Box sx={{ maxHeight: '40vh', overflowY: 'auto', mb: 2 }}>
                                    {studentsInClassroom.map(student => (
                                        <StudentGradingRow 
                                            key={`lesson-${student.id}`}
                                            student={student}
                                            data={dailyData[student.id]}
                                            onDataChange={handleDataChange}
                                        />
                                    ))}
                                </Box>
                                <Divider sx={{ my: 2 }} />
                                <Box>
                                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                                        <InputLabel>Ενότητα Ύλης που Διδάχθηκε</InputLabel>
                                        <Select value={taughtSection} label="Ενότητα Ύλης που Διδάχθηκε" onChange={(e) => setTaughtSection(e.target.value)}>
                                            <MenuItem value=""><em>Καμία</em></MenuItem>
                                            {syllabusOptions.map((opt, i) => 
                                                opt.isHeader 
                                                    ? <ListSubheader key={i}>{opt.title}</ListSubheader>
                                                    : <MenuItem key={opt.id} value={opt.id}>{opt.text}</MenuItem>
                                            )}
                                        </Select>
                                    </FormControl>
                                    <TextField label="Σημειώσεις / Οδηγίες" multiline rows={4} fullWidth variant="outlined" value={notes} onChange={(e) => setNotes(e.target.value)} />
                                    <Box sx={{ mt: 2 }}>
                                        <Typography variant="subtitle2" gutterBottom>Επισυναπτόμενα Αρχεία</Typography>
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                                            {attachedFiles.map(file => (
                                                <Chip key={file.path} label={file.name} onDelete={() => handleRemoveFile(file)} />
                                            ))}
                                        </Box>
                                        <Button size="small" startIcon={<UploadFileIcon />} component="label">Μεταφόρτωση Νέου<input type="file" hidden /></Button>
                                        <Button size="small" startIcon={<LinkIcon />} onClick={() => setMaterialSelectorOpen(true)}>Επισύναψη από Βιβλιοθήκη</Button>
                                    </Box>
                                </Box>
                            </AccordionDetails>
                        </Accordion>
                    )}

                    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {assignmentsForSelectedDate.map(assignment => (
                            <Accordion key={assignment.id} defaultExpanded>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography>Αξιολόγηση: {assignment.title}</Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Box sx={{ maxHeight: '40vh', overflowY: 'auto' }}>
                                        {studentsInClassroom.map(student => (
                                            <StudentGradingRow 
                                                key={`assign-${assignment.id}-${student.id}`}
                                                student={student}
                                                data={dailyData[student.id]}
                                                onDataChange={handleDataChange}
                                                isAssignment={true}
                                                assignmentId={assignment.id}
                                            />
                                        ))}
                                    </Box>
                                </AccordionDetails>
                            </Accordion>
                        ))}
                    </Box>
                </Paper>
            )}

            <AssignmentForm 
                open={assignmentFormOpen} 
                onClose={() => setAssignmentFormOpen(false)} 
                onSave={handleSaveAssignment} 
                classroomId={classroom.id} 
                classrooms={[classroom]} 
            />
            
            <MaterialSelector 
                open={materialSelectorOpen} 
                onClose={() => setMaterialSelectorOpen(false)}
                onAttach={handleAttachFiles}
                classroomMaterials={classroom.materials}
                courseMaterials={courseForClassroom?.syllabus.flatMap(c => c.sections.flatMap(s => s.materials || []))}
                teacherLibraryMaterials={teacherData?.library}
                alreadyAttached={attachedFiles}
            />
        </Box>
    );
}

export default DailyLog;
