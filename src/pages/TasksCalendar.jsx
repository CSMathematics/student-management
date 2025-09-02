import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Box, Paper, Typography, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress, MenuItem, Tooltip, FormControlLabel, Switch, Divider, Checkbox } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Close as CloseIcon } from '@mui/icons-material';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import dayjs from 'dayjs';
import 'dayjs/locale/el';
import updateLocale from 'dayjs/plugin/updateLocale';

dayjs.locale('el');
dayjs.extend(updateLocale);
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

// Custom styles for the calendar
const calendarStyles = `
    .fc .fc-highlight {
        background: rgba(76, 175, 80, 0.4) !important;
        border: 1px solid rgba(76, 175, 80, 0.8);
    }
    .sidebar-scrollable {
        overflow-y: auto;
        overflow-x: hidden; /* Hide horizontal scrollbar */
        max-height: calc(100vh - 250px); /* Adjust based on your layout */
    }
    /* Hide calendar grid lines for a minimal look */
    .fc th, 
    .fc td,
    .fc-scrollgrid,
    .fc-timegrid-axis,
    .fc-daygrid-day-frame {
        border: none !important;
    }
`;

function TasksCalendar({ db, appId, selectedYear }) {
    const calendarRef = useRef(null);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewInfo, setViewInfo] = useState({ title: '', range: { start: null, end: null }});
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);

    const tasksCollectionPath = useMemo(() => 
        `artifacts/${appId}/public/data/academicYears/${selectedYear}/tasks`, 
        [appId, selectedYear]
    );

    useEffect(() => {
        if (!db || !tasksCollectionPath) return;

        setLoading(true);
        const tasksRef = collection(db, tasksCollectionPath);
        const unsubscribe = onSnapshot(tasksRef, (snapshot) => {
            const fetchedEvents = snapshot.docs.map(doc => {
                const data = doc.data();
                // CORRECTED: isCompleted is a top-level property
                return {
                    id: doc.id,
                    title: data.title,
                    start: data.start,
                    end: data.end,
                    allDay: data.allDay || false,
                    isCompleted: data.isCompleted || false, 
                    extendedProps: {
                        description: data.description || '',
                    },
                    backgroundColor: data.color || '#3788d8',
                    borderColor: data.color || '#3788d8',
                };
            });
            setEvents(fetchedEvents);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching tasks:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [db, tasksCollectionPath]);

    const handleDatesSet = useCallback((dateInfo) => {
        const calendarApi = dateInfo.view.calendar;
        const newTitle = calendarApi.getCurrentData().viewTitle;
        const newRange = { start: dateInfo.start, end: dateInfo.end };
        setViewInfo({ title: newTitle, range: newRange });
    }, []);
    
    const handleDateSelect = useCallback((selectInfo) => {
        setModalOpen(true);
        setSelectedEvent({
            title: '',
            start: selectInfo.startStr,
            end: selectInfo.endStr,
            allDay: selectInfo.allDay,
            color: '#3788d8',
            description: '',
            isCompleted: false,
        });
        selectInfo.view.calendar.unselect();
    }, []);

    const handleEventClick = useCallback((clickInfo) => {
        setSelectedEvent({
            id: clickInfo.event.id,
            title: clickInfo.event.title,
            start: clickInfo.event.startStr,
            end: clickInfo.event.endStr,
            allDay: clickInfo.event.allDay,
            color: clickInfo.event.backgroundColor,
            description: clickInfo.event.extendedProps.description || '',
            isCompleted: clickInfo.event.isCompleted || false // CORRECTED: Read from top-level
        });
        setModalOpen(true);
    }, []);

    const handleEventDrop = useCallback(async (dropInfo) => {
        const { event } = dropInfo;
        try {
            const eventRef = doc(db, tasksCollectionPath, event.id);
            await updateDoc(eventRef, {
                start: event.startStr,
                end: event.endStr,
                allDay: event.allDay,
            });
        } catch (error) {
            console.error("Error updating event position:", error);
            dropInfo.revert();
        }
    }, [db, tasksCollectionPath]);
    
    const handleEventResize = useCallback(async (resizeInfo) => {
        const { event } = resizeInfo;
        try {
            const eventRef = doc(db, tasksCollectionPath, event.id);
            await updateDoc(eventRef, {
                start: event.startStr,
                end: event.endStr,
            });
        } catch (error) {
            console.error("Error updating event duration:", error);
            resizeInfo.revert();
        }
    }, [db, tasksCollectionPath]);

    const handleOpenModalForNew = () => {
        setSelectedEvent({
            title: '',
            start: dayjs().format('YYYY-MM-DD'),
            end: dayjs().format('YYYY-MM-DD'),
            allDay: true,
            color: '#3788d8',
            description: '',
            isCompleted: false,
        });
        setModalOpen(true);
    };
    
    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedEvent(null);
    };

    const handleSaveEvent = async (eventData) => {
        const taskPayload = {
            title: eventData.title,
            description: eventData.description,
            start: eventData.start,
            end: eventData.end,
            allDay: eventData.allDay,
            color: eventData.color,
            isCompleted: eventData.isCompleted || false, // CORRECTED: Write to top-level
            lastUpdated: serverTimestamp(),
        };
        
        try {
            if (eventData.id) {
                const eventRef = doc(db, tasksCollectionPath, eventData.id);
                await updateDoc(eventRef, taskPayload);
            } else {
                await addDoc(collection(db, tasksCollectionPath), {
                    ...taskPayload,
                    createdAt: serverTimestamp(),
                });
            }
        } catch (error) {
            console.error("Error saving event:", error);
        } finally {
            handleCloseModal();
        }
    };
    
    const handleDeleteEvent = async (eventId) => {
        if (!window.confirm("Είστε σίγουροι ότι θέλετε να διαγράψετε αυτήν την εργασία;")) return;
        try {
            await deleteDoc(doc(db, tasksCollectionPath, eventId));
        } catch (error) {
            console.error("Error deleting event:", error);
        } finally {
            handleCloseModal();
        }
    };
    
    // CORRECTED: Function now correctly named and uses useCallback
    const handleToggleTaskCompletion = useCallback(async (eventId, currentStatus) => {
        try {
            const eventRef = doc(db, tasksCollectionPath, eventId);
            await updateDoc(eventRef, { isCompleted: !currentStatus });
        } catch (error) {
            console.error("Error toggling task completion:", error);
        }
    }, [db, tasksCollectionPath]);

    // CORRECTED: Re-introduced useMemo for immediate sidebar updates
    const sidebarEvents = useMemo(() => {
        if (!viewInfo.range.start) return {};

        const start = dayjs(viewInfo.range.start);
        const end = dayjs(viewInfo.range.end);

        const visibleEvents = events.filter(event => {
            const eventStart = dayjs(event.start);
            return eventStart.isAfter(start.subtract(1, 'day')) && eventStart.isBefore(end);
        });

        const grouped = visibleEvents.reduce((acc, event) => {
            const dateKey = dayjs(event.start).format('YYYY-MM-DD');
            if (!acc[dateKey]) {
                acc[dateKey] = [];
            }
            acc[dateKey].push(event);
            return acc;
        }, {});

        return Object.keys(grouped).sort().reduce(
            (obj, key) => { 
                obj[key] = grouped[key].sort((a,b) => new Date(a.start) - new Date(b.start)); 
                return obj; 
            }, {}
        );
    }, [events, viewInfo]);

    const renderMirrorContent = (arg) => {
        if (arg.view.type.includes('Month')) return null;
        return (
            <div style={{ padding: '2px', backgroundColor: '#4caf50', color: 'white', fontSize: '0.8em', textAlign: 'center' }}>
                {dayjs(arg.start).format('HH:mm')} - {dayjs(arg.end).format('HH:mm')}
            </div>
        );
    };

    return (
        <>
            <style>{calendarStyles}</style>
            <Paper 
                elevation={3} 
                sx={{ m: 2, display: 'flex', p: 0, overflow: 'hidden', flexDirection: { xs: 'column', md: 'row' }}}
            >
                {/* --- Sidebar --- */}
                <Box sx={{
                    flexBasis: { md: 320 }, flexShrink: 0, backgroundColor: '#4caf50', color: 'white',
                    p: 3, display: 'flex', flexDirection: 'column'
                }}>
                    <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>{viewInfo.title}</Typography>
                    <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.3)' }} />
                    <Typography variant="h6" gutterBottom>Εργασίες</Typography>
                    <Box flexGrow={1} className="sidebar-scrollable">
                        {Object.keys(sidebarEvents).length > 0 ? (
                            Object.entries(sidebarEvents).map(([date, eventList]) => (
                                <Box key={date} mb={2}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                                        {dayjs(date).format('dddd, D MMMM')}
                                    </Typography>
                                    {eventList.map(event => (
                                         <FormControlLabel
                                            key={event.id}
                                            sx={{ 
                                                width: '100%', ml: -1, my: -0.5,
                                                '& .MuiFormControlLabel-label': {
                                                    color: event.isCompleted ? 'rgba(255, 255, 255, 0.6)' : 'white',
                                                    textDecoration: event.isCompleted ? 'line-through' : 'none',
                                                    fontSize: '0.875rem'
                                                }
                                            }}
                                            control={
                                                <Checkbox
                                                    checked={event.isCompleted} // CORRECTED: Reads from top-level
                                                    onChange={() => handleToggleTaskCompletion(event.id, event.isCompleted)}
                                                    size="small"
                                                    sx={{ color: 'rgba(255,255,255,0.7)', '&.Mui-checked': { color: 'white' } }}
                                                />
                                            }
                                            label={event.title}
                                        />
                                    ))}
                                </Box>
                            ))
                        ) : (
                            <Typography variant="body2">Δεν υπάρχουν εργασίες για αυτή την περίοδο.</Typography>
                        )}
                    </Box>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenModalForNew} fullWidth
                        sx={{ mt: 2, backgroundColor: 'rgba(255,255,255,0.2)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)'} }}
                    >
                        Νέα Εργασία
                    </Button>
                </Box>
                {/* --- Calendar --- */}
                <Box sx={{ flexGrow: 1, p: {xs: 1, md: 2} }}>
                    {loading ? (
                         <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <FullCalendar
                            ref={calendarRef}
                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                            initialView="dayGridMonth"
                            headerToolbar={{
                                left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay'
                            }}
                            events={events}
                            locale="el"
                            firstDay={1}
                            datesSet={handleDatesSet}
                            eventClick={handleEventClick}
                            select={handleDateSelect}
                            selectMirror={true}
                            selectMirrorContent={renderMirrorContent}
                            eventDrop={handleEventDrop}
                            eventResize={handleEventResize}
                            selectable={true}
                            editable={true}
                            height="auto"
                            contentHeight="auto"
                        />
                    )}
                </Box>
            </Paper>
            {selectedEvent && (
                <EventFormModal
                    open={modalOpen}
                    event={selectedEvent}
                    onClose={handleCloseModal}
                    onSave={handleSaveEvent}
                    onDelete={handleDeleteEvent}
                />
            )}
        </>
    );
}

function EventFormModal({ open, event, onClose, onSave, onDelete }) {
    const [formData, setFormData] = useState(event);

    useEffect(() => { setFormData(event); }, [event]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };
    
    const handleAllDayChange = (e) => {
        setFormData(prev => ({ ...prev, allDay: e.target.checked }));
    };
    
    const formatDateTimeForInput = (dateStr, isAllDay) => {
        if (!dateStr) return '';
        return dayjs(dateStr).format(isAllDay ? 'YYYY-MM-DD' : 'YYYY-MM-DDTHH:mm');
    };

    const isNew = !formData.id;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>
                {isNew ? 'Δημιουργία Εργασίας' : 'Επεξεργασία Εργασίας'}
                <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <TextField autoFocus margin="dense" name="title" label="Τίτλος" type="text" fullWidth value={formData.title} onChange={handleChange} />
                <TextField margin="dense" name="description" label="Περιγραφή" type="text" fullWidth multiline rows={4} value={formData.description} onChange={handleChange} />
                <FormControlLabel control={<Switch checked={formData.allDay} onChange={handleAllDayChange} />} label="Ολοήμερη" sx={{ mt: 1 }} />
                <TextField margin="dense" name="start" label="Έναρξη" type={formData.allDay ? 'date' : 'datetime-local'} fullWidth value={formatDateTimeForInput(formData.start, formData.allDay)} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                <TextField margin="dense" name="end" label="Λήξη" type={formData.allDay ? 'date' : 'datetime-local'} fullWidth value={formatDateTimeForInput(formData.end, formData.allDay)} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                <TextField select margin="dense" name="color" label="Κατηγορία" value={formData.color} onChange={handleChange} fullWidth>
                    {taskColors.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Box sx={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: option.value, mr: 1, border: '1px solid #ccc' }} />
                                {option.label}
                            </Box>
                        </MenuItem>
                    ))}
                </TextField>
                <FormControlLabel control={<Checkbox checked={formData.isCompleted || false} onChange={handleChange} name="isCompleted" />} label="Ολοκληρωμένη" />
            </DialogContent>
            <DialogActions sx={{ p: '16px 24px' }}>
                {!isNew && (
                    <Tooltip title="Διαγραφή Εργασίας">
                        <IconButton onClick={() => onDelete(formData.id)} sx={{ mr: 'auto' }}><DeleteIcon color="error" /></IconButton>
                    </Tooltip>
                )}
                <Button onClick={onClose}>Ακύρωση</Button>
                <Button onClick={() => onSave(formData)} variant="contained" disabled={!formData.title}>Αποθήκευση</Button>
            </DialogActions>
        </Dialog>
    );
}

export default TasksCalendar;


