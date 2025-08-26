// src/portals/student/StudentCalendar.jsx
import React, { useMemo, useState, useEffect } from 'react';
import {
    Container, Paper, Typography, Box, Dialog, DialogTitle,
    DialogContent, DialogContentText, List, ListItem, ListItemIcon, ListItemText
} from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Event as EventIcon, Assignment as AssignmentIcon, Campaign as CampaignIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import 'dayjs/locale/el';
import { getFunctions, httpsCallable } from 'firebase/functions';

dayjs.locale('el');

function StudentCalendar({ enrolledClassrooms, assignments, announcements, db, user, appId, selectedYear }) {
    const [selectedEvent, setSelectedEvent] = useState(null);

    useEffect(() => {
        const logVisit = async () => {
            if (!db || !user?.uid || !appId || !selectedYear) return;
            try {
                const functions = getFunctions(db.app);
                const logUserEvent = httpsCallable(functions, 'logUserEvent');
                await logUserEvent({
                    eventName: 'visited_calendar',
                    studentId: user.uid,
                    appId: appId,
                    academicYear: selectedYear
                });
                console.log("Calendar visit event logged.");
            } catch (error) {
                console.error("Error logging calendar visit event:", error);
            }
        };
        logVisit();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const calendarEvents = useMemo(() => {
        const events = [];
        const dayMapping = { 'Δευτέρα': 1, 'Τρίτη': 2, 'Τετάρτη': 3, 'Πέμπτη': 4, 'Παρασκευή': 5, 'Σάββατο': 6 };

        if (enrolledClassrooms && Array.isArray(enrolledClassrooms)) {
            enrolledClassrooms.forEach(classroom => {
                classroom.schedule?.forEach(slot => {
                    events.push({
                        title: classroom.subject,
                        daysOfWeek: [dayMapping[slot.day]],
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        color: classroom.color || '#1e88e5',
                        extendedProps: { type: 'lesson', classroomName: classroom.classroomName, teacherName: classroom.teacherName || 'N/A' }
                    });
                });
            });
        }

        if (assignments && Array.isArray(assignments)) {
            assignments.forEach(assignment => {
                events.push({
                    title: `Προθεσμία: ${assignment.title}`,
                    date: dayjs(assignment.dueDate.toDate()).format('YYYY-MM-DD'),
                    allDay: true,
                    color: '#f57c00',
                    extendedProps: { type: 'assignment', assignmentType: assignment.type, notes: assignment.notes }
                });
            });
        }
        
        if (announcements && Array.isArray(announcements)) {
            announcements.forEach(ann => {
                 events.push({
                    title: `📢 ${ann.title}`,
                    date: dayjs(ann.createdAt.toDate()).format('YYYY-MM-DD'),
                    allDay: true,
                    color: '#64b5f6',
                    extendedProps: {
                        type: 'announcement',
                        content: ann.content,
                        announcementId: ann.id // <-- ΣΗΜΑΝΤΙΚΗ ΠΡΟΣΘΗΚΗ: Αποθηκεύουμε το ID
                    }
                });
            });
        }

        return events;
    }, [enrolledClassrooms, assignments, announcements]);

    const handleEventClick = (clickInfo) => {
        setSelectedEvent(clickInfo.event);

        // --- ΝΕΑ ΛΟΓΙΚΗ: Καταγράφουμε το "διάβασμα" της ανακοίνωσης ---
        if (clickInfo.event.extendedProps.type === 'announcement') {
            const { announcementId } = clickInfo.event.extendedProps;
            if (db && user?.uid && appId && selectedYear && announcementId) {
                try {
                    const functions = getFunctions(db.app);
                    const logUserEvent = httpsCallable(functions, 'logUserEvent');
                    
                    logUserEvent({
                        eventName: 'read_announcement',
                        studentId: user.uid,
                        appId: appId,
                        academicYear: selectedYear,
                        // Στέλνουμε το ID της ανακοίνωσης στο backend
                        details: { announcementId: announcementId } 
                    });
                } catch (error) {
                    console.error("Error logging read announcement event:", error);
                }
            }
        }
    };

    const handleCloseDialog = () => {
        setSelectedEvent(null);
    };

    return (
        <Container maxWidth={false} sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    Το Ημερολόγιό μου
                </Typography>
                <Box sx={{ mt: 3 }}>
                    <FullCalendar
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        initialView="timeGridWeek"
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'dayGridMonth,timeGridWeek,timeGridDay'
                        }}
                        events={calendarEvents}
                        locale="el"
                        height="75vh"
                        slotMinTime="08:00:00"
                        slotMaxTime="22:00:00"
                        eventClick={handleEventClick}
                        allDayText="Γεγονότα"
                        buttonText={{
                            today: 'Σήμερα',
                            month: 'Μήνας',
                            week: 'Εβδομάδα',
                            day: 'Ημέρα'
                        }}
                    />
                </Box>
            </Paper>

            <Dialog open={Boolean(selectedEvent)} onClose={handleCloseDialog}>
                <DialogTitle>{selectedEvent?.title}</DialogTitle>
                <DialogContent>
                    {selectedEvent?.extendedProps.type === 'lesson' && (
                        <List>
                            <ListItem><ListItemIcon><EventIcon /></ListItemIcon><ListItemText primary="Μάθημα" secondary={`${selectedEvent.extendedProps.classroomName} - ${selectedEvent.extendedProps.teacherName}`} /></ListItem>
                        </List>
                    )}
                    {selectedEvent?.extendedProps.type === 'assignment' && (
                         <List>
                            <ListItem><ListItemIcon><AssignmentIcon /></ListItemIcon><ListItemText primary="Εργασία" secondary={selectedEvent.extendedProps.assignmentType} /></ListItem>
                            {selectedEvent.extendedProps.notes && <DialogContentText sx={{mt: 1, fontStyle: 'italic'}}>{selectedEvent.extendedProps.notes}</DialogContentText>}
                        </List>
                    )}
                     {selectedEvent?.extendedProps.type === 'announcement' && (
                         <List>
                            <ListItem><ListItemIcon><CampaignIcon /></ListItemIcon><ListItemText primary="Ανακοίνωση" /></ListItem>
                            <DialogContentText sx={{mt: 1, whiteSpace: 'pre-wrap'}}>{selectedEvent.extendedProps.content}</DialogContentText>
                        </List>
                    )}
                </DialogContent>
            </Dialog>
        </Container>
    );
}

export default StudentCalendar;
