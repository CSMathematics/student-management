import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Box, Paper, Typography, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress, MenuItem, Tooltip, FormControlLabel, Switch, Divider, Checkbox, FormGroup, Grid, Select, FormControl, InputLabel, RadioGroup, Radio } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { Add as AddIcon, Delete as DeleteIcon, Close as CloseIcon, IosShare as ExportIcon, FileUpload as ImportIcon, Warning, LabelImportant, Label } from '@mui/icons-material';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import dayjs from 'dayjs';
import 'dayjs/locale/el';
import updateLocale from 'dayjs/plugin/updateLocale';
import weekday from 'dayjs/plugin/weekday';
import utc from 'dayjs/plugin/utc';

dayjs.locale('el');
dayjs.extend(updateLocale);
dayjs.extend(weekday);
dayjs.extend(utc);
dayjs.updateLocale('el', {
  weekStart: 1 // Monday is the first day of the week
});

const taskColors = [
    { value: '#3788d8', label: 'Ακαδημαϊκά' },
    { value: '#e91e63', label: 'Διοικητικά' },
    { value: '#4caf50', label: 'Οικονομικά' },
    { value: '#ff9800', label: 'Εκδηλώσεις' },
    { value: '#795548', label: 'Συντήρηση' },
    { value: '#607d8b', label: 'Προσωπικό' },
];

const priorityOptions = [
    { value: 'high', label: 'Υψηλή', icon: <Warning fontSize="inherit" sx={{ color: '#d40e0bff' }} /> },
    { value: 'medium', label: 'Μέτρια', icon: <LabelImportant fontSize="inherit" sx={{ color: '#ff9800' }} /> },
    { value: 'low', label: 'Χαμηλή', icon: <Label fontSize="inherit" sx={{ color: '#4caf50' }} /> },
];

const getPriorityIcon = (priority) => {
    const option = priorityOptions.find(p => p.value === priority);
    return option ? option.icon : null;
};

function TasksCalendar({ db, appId, selectedYear }) {
    const theme = useTheme();
    const calendarRef = useRef(null);
    const importFileRef = useRef(null);
    const [firestoreEvents, setFirestoreEvents] = useState([]);
    const [calendarEvents, setCalendarEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewInfo, setViewInfo] = useState({ title: '', range: { start: null, end: null }});
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');

    const calendarStyles = useMemo(() => `
        .fc .fc-toolbar-title,
        .fc .fc-daygrid-day-number,
        .fc .fc-col-header-cell-cushion,
        .fc .fc-timegrid-axis-cushion,
        .fc-timegrid-slot-label {
            color: ${theme.palette.text.primary};
        }
        .fc .fc-day-today {
            background-color: ${alpha(theme.palette.secondary.main, 0.1)} !important;
        }
        .fc .fc-button-primary {
            background-color: ${theme.palette.primary.main};
            border-color: ${theme.palette.primary.main};
            color: ${theme.palette.primary.contrastText};
        }
        .fc .fc-button-primary:hover {
            background-color: ${theme.palette.primary.dark};
            border-color: ${theme.palette.primary.dark};
        }
        .fc .fc-button-primary:active, .fc .fc-button-primary:focus {
            background-color: ${theme.palette.primary.dark} !important;
            border-color: ${theme.palette.primary.dark} !important;
            box-shadow: none !important;
        }
        .fc .fc-highlight {
            background: ${alpha(theme.palette.primary.main, 0.4)} !important;
            border: 1px solid ${alpha(theme.palette.primary.main, 0.8)};
        }
        .sidebar-scrollable {
            overflow-y: auto;
            overflow-x: hidden;
            max-height: calc(100vh - 420px);
        }
        .fc th, .fc td, .fc-scrollgrid, .fc-timegrid-axis, .fc-daygrid-day-frame, .fc-timegrid-slot, .fc-timegrid-lane {
            border: none !important;
        }
        .fc .fc-col-header, .fc .fc-toolbar.fc-header-toolbar {
            background-color: ${theme.palette.background.paper} !important;
        }
        .event-completed {
            text-decoration: line-through;
            opacity: 0.7;
        }
        .fc-event-main-frame {
            display: flex;
            align-items: center;
        }
        .fc-event-title-container {
            flex-grow: 1;
        }
    `, [theme]);

    const tasksCollectionPath = useMemo(() => 
        `artifacts/${appId}/public/data/academicYears/${selectedYear}/tasks`, 
        [appId, selectedYear]
    );

    useEffect(() => {
        if (!db || !tasksCollectionPath) return;
        setLoading(true);
        const tasksRef = collection(db, tasksCollectionPath);
        const unsubscribe = onSnapshot(tasksRef, (snapshot) => {
            const fetchedEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setFirestoreEvents(fetchedEvents);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching tasks:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [db, tasksCollectionPath]);

    useEffect(() => {
        const createOccurrence = (baseEvent, date) => {
            const instanceId = `${baseEvent.id}_${date.format('YYYY-MM-DD')}`;
            const newStart = date.format('YYYY-MM-DD') + (baseEvent.allDay ? '' : `T${dayjs(baseEvent.start?.toDate ? baseEvent.start.toDate() : baseEvent.start).format('HH:mm:ss')}`);
            const duration = dayjs(baseEvent.end?.toDate ? baseEvent.end.toDate() : baseEvent.end).diff(dayjs(baseEvent.start?.toDate ? baseEvent.start.toDate() : baseEvent.start));
            const newEnd = dayjs(newStart).add(duration, 'ms').format('YYYY-MM-DDTHH:mm:ss');
            const isCompletedForThisInstance = baseEvent.completedDates?.includes(date.format('YYYY-MM-DD')) || false;
            const completedColor = theme.palette.mode === 'dark' ? '#555555' : '#d3d3d3';

            return { 
                title: baseEvent.title,
                allDay: baseEvent.allDay,
                extendedProps: { ...baseEvent.extendedProps, priority: baseEvent.priority || 'medium' },
                color: baseEvent.color,
                priority: baseEvent.priority || 'medium',
                id: instanceId,
                start: newStart, end: newEnd, groupId: baseEvent.id,
                isCompleted: isCompletedForThisInstance,
                backgroundColor: isCompletedForThisInstance ? completedColor : baseEvent.color,
                borderColor: isCompletedForThisInstance ? completedColor : baseEvent.color,
                classNames: isCompletedForThisInstance ? ['event-completed'] : [],
            };
        };

        const generateRecurrences = (event) => {
            const occurrences = [];
            const { recurrence } = event;
            const completedColor = theme.palette.mode === 'dark' ? '#555555' : '#d3d3d3';

            if (!recurrence || recurrence.freq === 'none') {
                 occurrences.push({ 
                    ...event, groupId: event.id, isCompleted: event.isCompleted || false,
                    backgroundColor: event.isCompleted ? completedColor : event.color,
                    borderColor: event.isCompleted ? completedColor : event.color,
                    classNames: event.isCompleted ? ['event-completed'] : []
                });
                return occurrences;
            }

            let current = dayjs(event.start?.toDate ? event.start.toDate() : event.start);
            const interval = recurrence.interval || 1;
            const maxYear = dayjs().add(2, 'year');
            let occurrenceCount = 0;
            let loopCount = 0;
            const maxLoops = 1000;

            const endCondition = () => {
                if (loopCount++ > maxLoops) return false;
                if (recurrence.endType === 'until' && recurrence.until) return current.isBefore(dayjs(recurrence.until).add(1, 'day'));
                if (recurrence.endType === 'count' && recurrence.count) return occurrenceCount < recurrence.count;
                return current.isBefore(maxYear);
            };

            while (endCondition()) {
                let isValid = false;
                let eventStartDayjs = dayjs(event.start?.toDate ? event.start.toDate() : event.start);
                switch (recurrence.freq) {
                    case 'daily': if (dayjs(current).diff(eventStartDayjs, 'day') % interval === 0) isValid = true; break;
                    case 'weekly': const startOfWeek = eventStartDayjs.startOf('week'); if (recurrence.byday?.includes(current.day()) && Math.floor(dayjs(current).diff(startOfWeek, 'week')) % interval === 0) isValid = true; break;
                    case 'monthly': if (current.date() === eventStartDayjs.date() && (current.year() * 12 + current.month()) % interval === (eventStartDayjs.year() * 12 + eventStartDayjs.month()) % interval) isValid = true; break;
                    case 'yearly': if (current.month() === eventStartDayjs.month() && current.date() === eventStartDayjs.date() && (current.year() - eventStartDayjs.year()) % interval === 0) isValid = true; break;
                    default: break;
                }
                if (isValid) {
                    occurrences.push(createOccurrence(event, current));
                    occurrenceCount++;
                }
                current = current.add(1, 'day');
            }
            return occurrences;
        };
        const allGeneratedEvents = firestoreEvents.flatMap(generateRecurrences);
        setCalendarEvents(allGeneratedEvents);
    }, [firestoreEvents, theme.palette.mode]);
    
    const filteredEvents = useMemo(() => {
        return calendarEvents.filter(event => {
            const categoryMatch = categoryFilter === 'all' || event.color === categoryFilter;
            const statusMatch = statusFilter === 'all' || (statusFilter === 'completed' && event.isCompleted) || (statusFilter === 'pending' && !event.isCompleted);
            const priorityMatch = priorityFilter === 'all' || event.priority === priorityFilter;
            return categoryMatch && statusMatch && priorityMatch;
        });
    }, [calendarEvents, categoryFilter, statusFilter, priorityFilter]);

    const handleDatesSet = useCallback((dateInfo) => {
        const calendarApi = dateInfo.view.calendar;
        const newTitle = calendarApi.getCurrentData().viewTitle;
        const newRange = { start: dateInfo.start, end: dateInfo.end };
        setViewInfo({ title: newTitle, range: newRange });
    }, []);
    
    const handleDateSelect = useCallback((selectInfo) => {
        setModalOpen(true);
        setSelectedEvent({
            title: '', start: selectInfo.startStr, end: selectInfo.endStr, allDay: selectInfo.allDay,
            color: '#3788d8', description: '', isCompleted: false, priority: 'medium',
            recurrence: { freq: 'none', interval: 1, endType: 'never', until: null, count: 10, byday: [] },
        });
        selectInfo.view.calendar.unselect();
    }, []);

    const handleEventClick = useCallback((clickInfo) => {
        const masterEventId = clickInfo.event.groupId || clickInfo.event.id;
        const masterEvent = firestoreEvents.find(e => e.id === masterEventId);
        if (masterEvent) {
             setSelectedEvent({ ...masterEvent });
            setModalOpen(true);
        }
    }, [firestoreEvents]);

    const handleEventDrop = async (dropInfo) => { console.warn("Cannot move a single instance of a recurring event yet."); dropInfo.revert(); };
    const handleEventResize = async (resizeInfo) => { console.warn("Cannot resize a single instance of a recurring event yet."); resizeInfo.revert(); };
    
    const handleOpenModalForNew = () => {
        setSelectedEvent({
            title: '', start: dayjs().format('YYYY-MM-DD'), end: dayjs().format('YYYY-MM-DD'), allDay: true,
            color: '#3788d8', description: '', isCompleted: false, priority: 'medium',
            recurrence: { freq: 'none', interval: 1, endType: 'never', until: null, count: 10, byday: [] },
        });
        setModalOpen(true);
    };
    
    const handleCloseModal = () => { setModalOpen(false); setSelectedEvent(null); };

    const handleSaveEvent = async (eventData) => {
        const { recurrence, ...rest } = eventData;
        const taskPayload = { ...rest, lastUpdated: serverTimestamp() };

        if(!taskPayload.priority) taskPayload.priority = 'medium';

        if (recurrence && recurrence.freq !== 'none') {
            taskPayload.recurrence = {
                freq: recurrence.freq,
                interval: recurrence.interval || 1,
                byday: recurrence.freq === 'weekly' ? recurrence.byday : null,
                endType: recurrence.endType,
                until: recurrence.endType === 'until' ? recurrence.until : null,
                count: recurrence.endType === 'count' ? recurrence.count : null,
            };
        } else {
            taskPayload.recurrence = null;
        }
        
        try {
            if (eventData.id) {
                await updateDoc(doc(db, tasksCollectionPath, eventData.id), taskPayload);
            } else {
                await addDoc(collection(db, tasksCollectionPath), { ...taskPayload, createdAt: serverTimestamp() });
            }
        } catch (error) {
            console.error("Error saving event:", error);
        } finally {
            handleCloseModal();
        }
    };
    
    const handleDeleteEvent = async (eventId) => {
        if (!window.confirm("Είστε σίγουροι ότι θέλετε να διαγράψετε αυτήν την εργασία και όλες τις επαναλήψεις της;")) return;
        try {
            await deleteDoc(doc(db, tasksCollectionPath, eventId));
        } catch (error) { console.error("Error deleting event:", error); } 
        finally { handleCloseModal(); }
    };
    
    const handleToggleTaskCompletion = useCallback(async (eventInstance) => {
        const masterEvent = firestoreEvents.find(e => e.id === eventInstance.groupId);
        
        if (!masterEvent) {
             console.error("Master event not found for instance:", eventInstance);
             return;
        }
        
        if (!masterEvent.recurrence || masterEvent.recurrence.freq === 'none') {
            const eventRef = doc(db, tasksCollectionPath, eventInstance.id);
            try {
                await updateDoc(eventRef, { isCompleted: !eventInstance.isCompleted });
            } catch (error) {
                console.error("Error toggling single event completion:", error);
            }
            return;
        }

        const masterEventRef = doc(db, tasksCollectionPath, masterEvent.id);
        const instanceDate = dayjs(eventInstance.start).format('YYYY-MM-DD');

        try {
            const completedDates = masterEvent.completedDates || [];
            let newCompletedDates;
            
            if (eventInstance.isCompleted) {
                newCompletedDates = completedDates.filter(d => d !== instanceDate);
            } else {
                newCompletedDates = [...completedDates, instanceDate];
            }
            await updateDoc(masterEventRef, { completedDates: newCompletedDates });
            
        } catch (error) {
            console.error("Error toggling recurring event completion:", error);
        }
    }, [db, tasksCollectionPath, firestoreEvents]);

    const handleExport = () => {
        const dayMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
        const formatICalDate = (dateStr, allDay) => {
            const date = dayjs(dateStr);
            if (allDay) return date.format('YYYYMMDD');
            return date.utc().format('YYYYMMDDTHHmmss') + 'Z';
        };

        const formatRRule = (recurrence) => {
            let rrule = `FREQ=${recurrence.freq.toUpperCase()}`;
            if (recurrence.interval > 1) rrule += `;INTERVAL=${recurrence.interval}`;
            if (recurrence.freq === 'weekly' && recurrence.byday?.length > 0) rrule += `;BYDAY=${recurrence.byday.map(d => dayMap[d]).join(',')}`;
            if (recurrence.endType === 'until' && recurrence.until) rrule += `;UNTIL=${dayjs(recurrence.until).utc().format('YYYYMMDDTHHmmss')}Z`;
            if (recurrence.endType === 'count' && recurrence.count) rrule += `;COUNT=${recurrence.count}`;
            return rrule;
        };

        let icsString = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Filomatheia//Tasks Calendar//EN\n';
        firestoreEvents
            .filter(event => {
                const hasVisibleInstance = filteredEvents.some(instance => instance.groupId === event.id || instance.id === event.id);
                return hasVisibleInstance;
            })
            .forEach(event => {
                icsString += 'BEGIN:VEVENT\n';
                icsString += `UID:${event.id}\n`;
                icsString += `DTSTAMP:${dayjs().utc().format('YYYYMMDDTHHmmss')}Z\n`;
                icsString += `SUMMARY:${event.title}\n`;
                if (event.description) icsString += `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}\n`;
                icsString += `DTSTART:${formatICalDate(event.start?.toDate ? event.start.toDate() : event.start, event.allDay)}\n`;
                icsString += `DTEND:${formatICalDate(event.end?.toDate ? event.end.toDate() : event.end, event.allDay)}\n`;
                if (event.recurrence && event.recurrence.freq !== 'none') icsString += `RRULE:${formatRRule(event.recurrence)}\n`;
                icsString += 'END:VEVENT\n';
        });
        icsString += 'END:VCALENDAR\n';

        const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `filomatheia-tasks-${dayjs().format('YYYY-MM-DD')}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target.result;
            const events = [];
            const lines = text.split(/\r\n|\n|\r/);
            let currentEvent = null;
            lines.forEach(line => {
                if (line.startsWith('BEGIN:VEVENT')) { currentEvent = { allDay: false }; }
                if (line.startsWith('END:VEVENT')) { if(currentEvent) events.push(currentEvent); currentEvent = null; }
                if (currentEvent) {
                    const [key, ...valueParts] = line.split(':');
                    const value = valueParts.join(':');
                    if (key.startsWith('DTSTART')) { currentEvent.start = dayjs.utc(value).local().toDate(); if(key.indexOf('VALUE=DATE') > -1) currentEvent.allDay = true; }
                    if (key.startsWith('DTEND')) { currentEvent.end = dayjs.utc(value).local().toDate(); }
                    if (key === 'SUMMARY') { currentEvent.title = value; }
                    if (key === 'DESCRIPTION') { currentEvent.description = value.replace(/\\n/g, '\n'); }
                }
            });
            
            if (events.length > 0 && window.confirm(`Βρέθηκαν ${events.length} εργασίες. Θέλετε να τις εισαγάγετε;`)) {
                const batch = writeBatch(db);
                events.forEach(event => {
                    const newEventRef = doc(collection(db, tasksCollectionPath));
                    batch.set(newEventRef, {
                        title: event.title || 'Χωρίς Τίτλο',
                        description: event.description || '',
                        start: event.start || new Date(),
                        end: event.end || dayjs(event.start || new Date()).add(1, 'hour').toDate(),
                        allDay: event.allDay || false,
                        color: '#607d8b',
                        priority: 'medium',
                        isCompleted: false,
                        recurrence: { freq: 'none' },
                        createdAt: serverTimestamp(),
                        lastUpdated: serverTimestamp()
                    });
                });
                await batch.commit();
                alert('Η εισαγωγή ολοκληρώθηκε!');
            }
        };
        reader.readAsText(file);
        e.target.value = null;
    };

    const sidebarEvents = useMemo(() => {
        if (!viewInfo.range.start) return {};
        const start = dayjs(viewInfo.range.start);
        const end = dayjs(viewInfo.range.end);
        const visibleEvents = filteredEvents.filter(event => {
            const eventStart = dayjs(event.start);
            return eventStart.isAfter(start.subtract(1, 'day')) && eventStart.isBefore(end);
        });
        const grouped = visibleEvents.reduce((acc, event) => {
            const dateKey = dayjs(event.start).format('YYYY-MM-DD');
            if (!acc[dateKey]) { acc[dateKey] = []; }
            acc[dateKey].push(event);
            return acc;
        }, {});
        return Object.keys(grouped).sort().reduce((obj, key) => { 
            obj[key] = grouped[key].sort((a,b) => new Date(a.start) - new Date(b.start)); 
            return obj; 
        }, {});
    }, [filteredEvents, viewInfo]);

    const renderMirrorContent = (arg) => {
        if (arg.view.type.includes('Month')) return null;
        return (
            <Box sx={{ p: '2px', backgroundColor: 'primary.main', color: 'primary.contrastText', fontSize: '0.8em', textAlign: 'center' }}>
                {dayjs(arg.start).format('HH:mm')} - {dayjs(arg.end).format('HH:mm')}
            </Box>
        );
    };
    
    const eventContent = (eventInfo) => {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', overflow: 'hidden', fontSize: '0.95em' }}>
                <Box component="span" sx={{ mr: 0.5 }}>{getPriorityIcon(eventInfo.event.extendedProps.priority)}</Box>
                <Box component="span" sx={{ flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{eventInfo.event.title}</Box>
            </Box>
        );
    };

    return (
        <Paper elevation={3} sx={{ m: 2, display: 'flex', p: 0, overflow: 'hidden', flexDirection: { xs: 'column', md: 'row' }}}>
            <style>{calendarStyles}</style>
            <input type="file" accept=".ics" ref={importFileRef} onChange={handleImport} style={{ display: 'none' }} />
            <Box sx={{ flexBasis: { md: 320 }, flexShrink: 0, backgroundColor: 'primary.main', color: 'primary.contrastText', p: 2, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>{viewInfo.title}</Typography>
                <Divider sx={{ my: 2, borderColor: alpha(theme.palette.primary.contrastText, 0.3) }} />
                <Box mb={2}>
                    <Typography variant="h6" gutterBottom>Φίλτρα</Typography>
                    <FormControl fullWidth size="small" variant="filled" sx={{ mb: 1, '& .MuiFilledInput-root, & .MuiInputLabel-root': { color: 'primary.contrastText' } }}>
                        <InputLabel>Κατηγορία</InputLabel>
                        <Select value={categoryFilter} label="Κατηγορία" onChange={(e) => setCategoryFilter(e.target.value)}>
                            <MenuItem value="all">Όλες οι κατηγορίες</MenuItem>
                            {taskColors.map((color) => (<MenuItem key={color.value} value={color.value}>{color.label}</MenuItem>))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth size="small" variant="filled" sx={{ mb: 1, '& .MuiFilledInput-root, & .MuiInputLabel-root': { color: 'primary.contrastText' } }}>
                        <InputLabel>Κατάσταση</InputLabel>
                        <Select value={statusFilter} label="Κατάσταση" onChange={(e) => setStatusFilter(e.target.value)}>
                            <MenuItem value="all">Όλες</MenuItem>
                            <MenuItem value="completed">Ολοκληρωμένες</MenuItem>
                            <MenuItem value="pending">Σε εκκρεμότητα</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl fullWidth size="small" variant="filled" sx={{ '& .MuiFilledInput-root, & .MuiInputLabel-root': { color: 'primary.contrastText' } }}>
                        <InputLabel>Προτεραιότητα</InputLabel>
                        <Select value={priorityFilter} label="Προτεραιότητα" onChange={(e) => setPriorityFilter(e.target.value)}>
                            <MenuItem value="all">Όλες</MenuItem>
                            {priorityOptions.map((p) => (<MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>))}
                        </Select>
                    </FormControl>
                </Box>
                <Divider sx={{ my: 2, borderColor: alpha(theme.palette.primary.contrastText, 0.3) }} />
                <Typography variant="h6" gutterBottom>Εργασίες</Typography>
                <Box flexGrow={1} className="sidebar-scrollable">
                    {Object.keys(sidebarEvents).length > 0 ? (
                        Object.entries(sidebarEvents).map(([date, eventList]) => (
                            <Box key={date} mb={2}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                                    {dayjs(date).format('dddd, D MMMM')}
                                </Typography>
                                {eventList.map((event) => (
                                     <FormControlLabel
                                        key={event.id}
                                        sx={{
                                            width: '100%', ml: -1, my: -0.5,
                                            '& .MuiFormControlLabel-label': {
                                                color: event.isCompleted ? alpha(theme.palette.primary.contrastText, 0.6) : 'primary.contrastText',
                                                textDecoration: event.isCompleted ? 'line-through' : 'none',
                                                fontSize: '0.875rem'
                                            }
                                        }}
                                        control={<Checkbox checked={event.isCompleted} onChange={() => handleToggleTaskCompletion(event)} size="small" sx={{ color: alpha(theme.palette.primary.contrastText, 0.7), '&.Mui-checked': { color: 'primary.contrastText' } }} />}
                                        label={
                                            <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
                                                {getPriorityIcon(event.priority)}
                                                <Typography variant="body2" component="span" sx={{ ml: 1 }}>{event.title}</Typography>
                                            </Box>
                                        }
                                    />
                                ))}
                            </Box>
                        ))
                    ) : ( <Typography variant="body2" sx={{ mt: 1 }}>Δεν υπάρχουν εργασίες για αυτή την περίοδο.</Typography> )}
                </Box>
                <Box display="flex" gap={1} mt={2}>
                    <Button variant="contained" startIcon={<ImportIcon />} onClick={() => importFileRef.current.click()} fullWidth sx={{ backgroundColor: alpha(theme.palette.primary.contrastText, 0.2), '&:hover': { backgroundColor: alpha(theme.palette.primary.contrastText, 0.3) } }}>Εισαγωγή</Button>
                    <Button variant="contained" startIcon={<ExportIcon />} onClick={handleExport} fullWidth sx={{ backgroundColor: alpha(theme.palette.primary.contrastText, 0.2), '&:hover': { backgroundColor: alpha(theme.palette.primary.contrastText, 0.3) } }}>Εξαγωγή</Button>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenModalForNew} fullWidth sx={{ mt: 1, backgroundColor: alpha(theme.palette.primary.contrastText, 0.2), '&:hover': { backgroundColor: alpha(theme.palette.primary.contrastText, 0.3) } }}>Νέα Εργασία</Button>
            </Box>
            <Box sx={{ flexGrow: 1, p: {xs: 1, md: 2} }}>
                {loading ? ( <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>
                ) : (
                    <FullCalendar ref={calendarRef} plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]} initialView="dayGridMonth"
                        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
                        events={filteredEvents}
                        locale="el" firstDay={1} datesSet={handleDatesSet}
                        eventClick={handleEventClick} select={handleDateSelect} eventDrop={handleEventDrop}
                        eventResize={handleEventResize} selectable={true} editable={true} height="auto" contentHeight="auto"
                        selectMirror={true}
                        selectMirrorContent={renderMirrorContent}
                        aspectRatio={1.5}
                        dayMaxEvents={3}
                        eventContent={eventContent}
                    />
                )}
            </Box>
            {selectedEvent && ( <EventFormModal open={modalOpen} event={selectedEvent} onClose={handleCloseModal} onSave={handleSaveEvent} onDelete={handleDeleteEvent}/> )}
        </Paper>
    );
}

function EventFormModal({ open, event, onClose, onSave, onDelete }) {
    const [formData, setFormData] = useState(null);

    useEffect(() => { 
        if(event) {
            const rec = event.recurrence || {};
            setFormData({
                ...event,
                priority: event.priority || 'medium',
                recurrence: {
                    freq: rec.freq || 'none',
                    interval: rec.interval || 1,
                    endType: rec.endType || 'never',
                    until: rec.until || dayjs().add(1, 'month').format('YYYY-MM-DD'),
                    count: rec.count || 10,
                    byday: rec.byday || []
                }
            });
        }
    }, [event]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleRecurrenceChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, recurrence: { ...prev.recurrence, [name]: value }}));
    };
    
    const handleByDayChange = (e) => {
        const dayIndex = parseInt(e.target.value);
        const isChecked = e.target.checked;
        let currentDays = formData.recurrence.byday || [];
        if (isChecked) { currentDays = [...currentDays, dayIndex]; } 
        else { currentDays = currentDays.filter(day => day !== dayIndex); }
        setFormData(prev => ({...prev, recurrence: {...prev.recurrence, byday: currentDays.sort()}}));
    };
    
    const handleAllDayChange = (e) => { setFormData(prev => ({ ...prev, allDay: e.target.checked })); };

    const formatDateTimeForInput = (dateStr, isAllDay) => {
        if (!dateStr) return '';
        const date = dayjs(dateStr?.toDate ? dateStr.toDate() : dateStr);
        return date.format(isAllDay ? 'YYYY-MM-DD' : 'YYYY-MM-DDTHH:mm');
    };

    if (!formData) return null;

    const isRecurrence = formData.recurrence?.freq !== 'none';
    const isNew = !formData.id;
    const weekDays = [{label: 'ΔΕ', value: 1}, {label: 'ΤΡ', value: 2}, {label: 'ΤΕ', value: 3}, {label: 'ΠΕ', value: 4}, {label: 'ΠΑ', value: 5}, {label: 'ΣΑ', value: 6}, {label: 'ΚΥ', value: 0}];

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{isNew ? 'Δημιουργία Εργασίας' : 'Επεξεργασία Εργασίας'}<IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton></DialogTitle>
            <DialogContent dividers>
                <TextField autoFocus margin="dense" name="title" label="Τίτλος" type="text" fullWidth value={formData.title} onChange={handleChange} />
                <TextField margin="dense" name="description" label="Περιγραφή" type="text" fullWidth multiline rows={4} value={formData.description} onChange={handleChange} />
                <FormControlLabel control={<Switch checked={formData.allDay} onChange={handleAllDayChange} />} label="Ολοήμερη" sx={{ mt: 1 }} />
                <Grid container spacing={2} alignItems="center">
                     <Grid item xs={12} sm={6}>
                        <TextField margin="dense" name="start" label="Έναρξη" type={formData.allDay ? 'date' : 'datetime-local'} fullWidth value={formatDateTimeForInput(formData.start, formData.allDay)} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField margin="dense" name="end" label="Λήξη" type={formData.allDay ? 'date' : 'datetime-local'} fullWidth value={formatDateTimeForInput(formData.end, formData.allDay)} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField select margin="dense" name="color" label="Κατηγορία" value={formData.color} onChange={handleChange} fullWidth >{taskColors.map((option) => (<MenuItem key={option.value} value={option.value}><Box sx={{ display: 'flex', alignItems: 'center' }}><Box sx={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: option.value, mr: 1, border: '1px solid #ccc' }} />{option.label}</Box></MenuItem>))}</TextField>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField select margin="dense" name="priority" label="Προτεραιότητα" value={formData.priority} onChange={handleChange} fullWidth >
                            {priorityOptions.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        {option.icon}
                                        <Typography variant="body2" sx={{ ml: 1.5 }}>{option.label}</Typography>
                                    </Box>
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                </Grid>

                <Divider sx={{ my: 2 }}>Επανάληψη</Divider>
                <FormControl fullWidth margin="dense">
                    <InputLabel>Συχνότητα</InputLabel>
                    <Select name="freq" value={formData.recurrence.freq || 'none'} label="Συχνότητα" onChange={handleRecurrenceChange}>
                        <MenuItem value="none">Δεν επαναλαμβάνεται</MenuItem><MenuItem value="daily">Ημερήσια</MenuItem><MenuItem value="weekly">Εβδομαδιαία</MenuItem><MenuItem value="monthly">Μηνιαία</MenuItem><MenuItem value="yearly">Ετήσια</MenuItem>
                    </Select>
                </FormControl>
                {isRecurrence && (<>
                    <TextField margin="dense" name="interval" label="Επανάληψη κάθε" type="number" fullWidth value={formData.recurrence.interval} onChange={handleRecurrenceChange} InputProps={{ inputProps: { min: 1 } }} />
                    {formData.recurrence.freq === 'weekly' && (
                        <FormGroup row sx={{ justifyContent: 'center', mt: 1 }}>
                            {weekDays.map(day => (<FormControlLabel key={day.value} control={<Checkbox value={day.value} checked={formData.recurrence.byday?.includes(day.value) || false} onChange={handleByDayChange} />} label={day.label}/>))}
                        </FormGroup>
                    )}
                    <Divider sx={{ my: 2 }}>Λήγει</Divider>
                    <RadioGroup row name="endType" value={formData.recurrence.endType} onChange={handleRecurrenceChange} sx={{ justifyContent: 'space-around' }}>
                        <FormControlLabel value="never" control={<Radio />} label="Ποτέ" />
                        <FormControlLabel value="until" control={<Radio />} label="Στις" />
                        <FormControlLabel value="count" control={<Radio />} label="Μετά από" />
                    </RadioGroup>
                    {formData.recurrence.endType === 'until' && ( <TextField margin="dense" name="until" type="date" fullWidth value={formData.recurrence.until} onChange={handleRecurrenceChange} InputLabelProps={{ shrink: true }} /> )}
                    {formData.recurrence.endType === 'count' && ( <TextField margin="dense" name="count" label="εμφανίσεις" type="number" fullWidth value={formData.recurrence.count} onChange={handleRecurrenceChange} InputProps={{ inputProps: { min: 1 } }} /> )}
                </>)}
            </DialogContent>
            <DialogActions sx={{ p: '16px 24px' }}>
                {!isNew && <Tooltip title="Διαγραφή Σειράς"><IconButton onClick={() => onDelete(formData.id)} sx={{ mr: 'auto' }}><DeleteIcon color="error" /></IconButton></Tooltip>}
                <Button onClick={onClose}>Ακύρωση</Button>
                <Button onClick={() => onSave(formData)} variant="contained" disabled={!formData.title}>Αποθήκευση</Button>
            </DialogActions>
        </Dialog>
    );
}

export default TasksCalendar;

