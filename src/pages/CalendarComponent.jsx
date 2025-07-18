// src/components/CalendarComponent.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, dayjsLocalizer } from 'react-big-calendar';
import dayjs from 'dayjs';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Box, Typography, Paper } from '@mui/material';

// Import dayjs plugins
import duration from 'dayjs/plugin/duration';
import weekday from 'dayjs/plugin/weekday';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import isBetween from 'dayjs/plugin/isBetween';

// Extend dayjs with plugins
dayjs.extend(duration);
dayjs.extend(weekday);
dayjs.extend(localizedFormat);
dayjs.extend(isBetween);

// Setup the localizer for react-big-calendar
const localizer = dayjsLocalizer(dayjs);

function CalendarComponent({ onCreateClassroomFromCalendar, classrooms }) {
    const [events, setEvents] = useState([]);

    // Transform Firestore classrooms into calendar events
    useEffect(() => {
        if (classrooms && classrooms.length > 0) {
            const calendarEvents = classrooms.flatMap(classroom => {
                // Ensure classroom.schedule is an array
                if (!Array.isArray(classroom.schedule)) {
                    console.warn("Classroom schedule is not an array:", classroom);
                    return [];
                }

                return classroom.schedule.map(slot => {
                    // Check if startTime and endTime are valid and not empty strings
                    if (slot.startTime && slot.endTime && slot.day) {
                        const today = dayjs();
                        // Find the next occurrence of the specific day of the week
                        // react-big-calendar expects actual Date objects, not just times.
                        // We'll map the day string to a dayjs weekday index (0 for Sunday, 1 for Monday, etc.)
                        const daysOfWeekMap = {
                            'Κυριακή': 0, 'Δευτέρα': 1, 'Τρίτη': 2, 'Τετάρτη': 3,
                            'Πέμπτη': 4, 'Παρασκευή': 5, 'Σάββατο': 6
                        };
                        const targetDayIndex = daysOfWeekMap[slot.day];

                        if (targetDayIndex === undefined) {
                            console.warn(`Invalid day of week: ${slot.day} for classroom:`, classroom);
                            return null;
                        }

                        // Create a base date for the event. For display purposes, we can pick any date
                        // and just set the time. For recurring events, react-big-calendar needs a start/end date.
                        // For simplicity, let's just use the current week's target day.
                        let eventStart = dayjs(today).weekday(targetDayIndex);
                        let eventEnd = dayjs(today).weekday(targetDayIndex);

                        // Parse time strings and apply to the event date
                        const [startHour, startMinute] = slot.startTime.split(':').map(Number);
                        const [endHour, endMinute] = slot.endTime.split(':').map(Number);

                        eventStart = eventStart.hour(startHour).minute(startMinute).second(0);
                        eventEnd = eventEnd.hour(endHour).minute(endMinute).second(0);

                        // If end time is before start time (e.g., 23:00-01:00), it spans to next day
                        if (eventEnd.isBefore(eventStart)) {
                            eventEnd = eventEnd.add(1, 'day');
                        }

                        return {
                            id: `${classroom.id}-${slot.day}-${slot.startTime}`, // Unique ID for event
                            title: `${classroom.subject} (${classroom.grade} - ${classroom.specialization || 'Γενικό'})`,
                            start: eventStart.toDate(), // Convert dayjs object to native Date
                            end: eventEnd.toDate(),     // Convert dayjs object to native Date
                            resource: {
                                classroomId: classroom.id,
                                grade: classroom.grade,
                                subject: classroom.subject,
                                specialization: classroom.specialization,
                                maxStudents: classroom.maxStudents,
                                color: classroom.color, // Pass the classroom color
                                scheduleSlot: slot // Pass the original slot data
                            },
                            allDay: false,
                        };
                    }
                    return null;
                }).filter(Boolean); // Filter out nulls
            });
            setEvents(calendarEvents);
        }
    }, [classrooms]);


    // Custom event style getter to apply classroom color
    const eventPropGetter = useMemo(() => (event, start, end, isSelected) => {
        const style = {
            backgroundColor: event.resource.color || '#3174ad', // Use classroom color or default
            borderRadius: '5px',
            opacity: 0.8,
            color: 'white',
            border: '0px',
            display: 'block',
            padding: '5px',
        };
        return { style };
    }, []);

    // Handle slot selection (drag to create new classroom)
    const handleSelectSlot = ({ start, end }) => {
        // Prompt for confirmation or directly open form
        const confirmed = window.confirm(
            `Θέλετε να δημιουργήσετε ένα νέο τμήμα για το διάστημα:\n` +
            `Έναρξη: ${dayjs(start).format('DD/MM/YYYY HH:mm')}\n` +
            `Λήξη: ${dayjs(end).format('DD/MM/YYYY HH:mm')} ;`
        );
        if (confirmed) {
            // Extract day from start date
            const dayOfWeek = dayjs(start).format('dddd'); // e.g., "Monday"
            const greekDaysOfWeekMap = {
                'Sunday': 'Κυριακή', 'Monday': 'Δευτέρα', 'Tuesday': 'Τρίτη', 'Wednesday': 'Τετάρτη',
                'Thursday': 'Πέμπτη', 'Friday': 'Παρασκευή', 'Saturday': 'Σάββατο'
            };
            const greekDay = greekDaysOfWeekMap[dayOfWeek];

            // Prepare the initial schedule slot for NewClassroomForm
            const initialSlot = [{
                id: Date.now(),
                day: greekDay,
                startTime: dayjs(start).format('HH:mm'),
                endTime: dayjs(end).format('HH:mm'),
                editingStage: 'done' // Mark as done since it's pre-selected
            }];
            onCreateClassroomFromCalendar(initialSlot);
        }
    };

    // Handle event selection (click on an existing event)
    const handleSelectEvent = (event) => {
        alert(`Εκδήλωση: ${event.title}\nΈναρξη: ${dayjs(event.start).format('HH:mm')}\nΛήξη: ${dayjs(event.end).format('HH:mm')}`);
        // Optionally, you could navigate to an edit form for this classroom
        // setClassroomToEdit(event.resource.classroomData);
        // navigateTo('newClassroom');
    };


    return (
        <Paper elevation={3} sx={{ padding: '20px', borderRadius: '12px', mb: 4, height: '800px' }}>
            <Typography variant="h5" component="h3" sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: 3, color: '#3f51b5' }}>
                <i className="fas fa-calendar-alt"></i> Πρόγραμμα Τμημάτων
            </Typography>
            <Box sx={{ height: 'calc(100% - 60px)' }}> {/* Adjust height to fit within Paper */}
                <Calendar
                    localizer={localizer}
                    events={events}
                    defaultView="week" // Start with week view
                    views={['week', 'day', 'agenda']} // Available views
                    selectable // Enable selection of slots
                    onSelectSlot={handleSelectSlot} // Handle new slot selection
                    onSelectEvent={handleSelectEvent} // Handle existing event click
                    eventPropGetter={eventPropGetter} // Apply custom styles
                    culture='el' // Set Greek culture for day names
                    messages={{ // Translate messages to Greek
                        next: 'Επόμενο',
                        previous: 'Προηγούμενο',
                        today: 'Σήμερα',
                        week: 'Εβδομάδα',
                        day: 'Ημέρα',
                        agenda: 'Ατζέντα',
                        noEventsInRange: 'Δεν υπάρχουν εκδηλώσεις σε αυτό το διάστημα.',
                        showMore: total => `+ ${total} ακόμη`,
                    }}
                    formats={{
                        timeGutterFormat: 'HH:mm', // 24-hour format for time gutter
                        eventTimeRangeFormat: ({ start, end }, culture, localizer) =>
                            localizer.format(start, 'HH:mm', culture) + ' - ' + localizer.format(end, 'HH:mm', culture),
                        selectRangeFormat: ({ start, end }, culture, localizer) =>
                            localizer.format(start, 'HH:mm', culture) + ' - ' + localizer.format(end, 'HH:mm', culture),
                        dayFormat: 'ddd DD/MM', // e.g., Δευ 15/07
                        dateFormat: 'DD', // for header
                        monthHeaderFormat: 'MMMM YYYY',
                        dayHeaderFormat: 'dddd DD/MM',
                        weekHeaderFormat: (date, culture, localizer) =>
                            `${localizer.format(localizer.startOf(date, 'week'), 'DD/MM', culture)} - ${localizer.format(localizer.endOf(date, 'week'), 'DD/MM', culture)}`,
                    }}
                />
            </Box>
        </Paper>
    );
}

export default CalendarComponent;
