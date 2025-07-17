// src/components/WeeklyScheduleCalendar.jsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    Box, Container, Paper, Typography, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Button, IconButton,
    FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle,
    DialogContent, DialogActions, TextField
} from '@mui/material';
import { ClearAll, Save, Add, Edit, Delete, CheckCircleOutline } from '@mui/icons-material';
import dayjs from 'dayjs';
import NewClassroomForm from './NewClassroomForm.jsx'; // Import NewClassroomForm

// Define the days of the week (excluding Sunday)
const DAYS_OF_WEEK = ['Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];

// Helper to generate time slots based on start and end hours
const generateTimeSlots = (startHour, endHour) => {
    const slots = [];
    for (let h = startHour; h < endHour; h++) {
        slots.push(`${String(h).padStart(2, '0')}:00`);
    }
    return slots;
};

// Helper to calculate duration string
const calculateDuration = (startTimeStr, endTimeStr) => {
    if (!startTimeStr || !endTimeStr) return '';
    const start = dayjs(`2000-01-01T${startTimeStr}`); // Use a dummy date for dayjs comparison
    const end = dayjs(`2000-01-01T${endTimeStr}`);

    if (end.isBefore(start) || end.isSame(start)) {
        return "Invalid Time";
    }

    const diffMinutes = end.diff(start, 'minute');
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    let durationString = '';
    if (hours > 0) {
        durationString += `${hours} ${hours > 1 ? 'ώρες' : 'ώρα'}`;
    }
    if (minutes > 0) {
        if (hours > 0) durationString += ' και ';
        durationString += `${minutes} λεπτά`;
    }
    if (hours === 0 && minutes === 0) {
        durationString = '0 λεπτά';
    }
    return durationString;
};

function WeeklyScheduleCalendar() {
    // Calendar display hours
    const [calendarStartHour, setCalendarStartHour] = useState(8); // Default 8 AM
    const [calendarEndHour, setCalendarEndHour] = useState(20); // Default 8 PM

    // Generated time slots based on selected hours
    const TIME_SLOTS = useMemo(() => generateTimeSlots(calendarStartHour, calendarEndHour), [calendarStartHour, calendarEndHour]);

    // Dragging states
    const [isDragging, setIsDragging] = useState(false);
    const [startSelection, setStartSelection] = useState(null); // { dayIndex, hourIndex }
    const [endSelection, setEndSelection] = useState(null);   // { dayIndex, hourIndex }
    const [resizingEntryId, setResizingEntryId] = useState(null); // ID of entry being resized
    const [resizingStartHourIndex, setResizingStartHourIndex] = useState(null); // Original start hour index for resizing
    const [resizingEndHourIndex, setResizingEndHourIndex] = useState(null); // Original end hour index for resizing

    // Finalized schedule entries
    const [scheduleEntries, setScheduleEntries] = useState([]); // { id, day, startTime, endTime, label }

    // Dialog states for confirming/editing schedule entry
    const [openDialog, setOpenDialog] = useState(false);
    const [dialogEntry, setDialogEntry] = useState(null); // The entry being confirmed/edited
    const [dialogLabel, setDialogLabel] = useState('');

    // State for NewClassroomForm dialog
    const [openNewClassroomDialog, setOpenNewClassroomDialog] = useState(false);
    const [newClassroomInitialSchedule, setNewClassroomInitialSchedule] = useState(null);


    // Ref for the table container to calculate cell positions
    const tableRef = useRef(null);

    // Helper to get cell coordinates from mouse event
    const getCellCoordinates = (e) => {
        const table = tableRef.current;
        if (!table) return null;

        const rect = table.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Calculate column (day) index
        const headerCells = table.querySelectorAll('thead th');
        let dayIndex = -1;
        for (let i = 1; i < headerCells.length; i++) { // Start from 1 to skip time labels
            const cellRect = headerCells[i].getBoundingClientRect();
            if (x >= (cellRect.left - rect.left) && x < (cellRect.right - rect.left)) {
                dayIndex = i - 1; // Adjust for 0-indexed DAYS_OF_WEEK
                break;
            }
        }

        // Calculate row (hour) index
        const bodyRows = table.querySelectorAll('tbody tr');
        let hourIndex = -1;
        for (let i = 0; i < bodyRows.length; i++) {
            const rowRect = bodyRows[i].getBoundingClientRect();
            if (y >= (rowRect.top - rect.top) && y < (rowRect.bottom - rect.top)) {
                hourIndex = i;
                break;
            }
        }

        if (dayIndex !== -1 && hourIndex !== -1) {
            return { dayIndex, hourIndex };
        }
        return null;
    };

    // Handle mouse down to start selection or resize
    const handleMouseDown = (e, dayIdx, hourIdx) => {
        if (e.button !== 0) return; // Only left mouse button

        const clickedEntry = scheduleEntries.find(entry =>
            entry.day === DAYS_OF_WEEK[dayIdx] &&
            TIME_SLOTS.indexOf(entry.startTime) <= hourIdx &&
            TIME_SLOTS.indexOf(entry.endTime) > hourIdx
        );

        if (clickedEntry) {
            // If clicking on an existing entry, initiate resize
            setIsDragging(true);
            setResizingEntryId(clickedEntry.id);
            setResizingStartHourIndex(TIME_SLOTS.indexOf(clickedEntry.startTime));
            setResizingEndHourIndex(TIME_SLOTS.indexOf(clickedEntry.endTime) - 1); // End of the last covered slot
            setStartSelection({ dayIndex: dayIdx, hourIndex: hourIdx }); // Start of drag for visual feedback
            setEndSelection({ dayIndex: dayIdx, hourIndex: hourIdx });
        } else {
            // If clicking on an empty cell, start new selection
            setIsDragging(true);
            setStartSelection({ dayIndex: dayIdx, hourIndex: hourIdx });
            setEndSelection({ dayIndex: dayIdx, hourIndex: hourIdx });
            setResizingEntryId(null); // Ensure no resizing is active
        }
    };

    // Handle mouse enter for individual cells during drag
    const handleMouseEnter = (dayIdx, hourIdx) => {
        if (isDragging) {
            setEndSelection({ dayIndex: dayIdx, hourIndex: hourIdx });

            if (resizingEntryId) {
                // If resizing an existing entry
                setScheduleEntries(prevEntries => prevEntries.map(entry => {
                    if (entry.id === resizingEntryId) {
                        const originalStartHourIndex = resizingStartHourIndex;
                        const originalEndHourIndex = resizingEndHourIndex;

                        // Determine if dragging to extend/shrink from top or bottom
                        const isDraggingFromTop = hourIdx < originalStartHourIndex;
                        const isDraggingFromBottom = hourIdx > originalEndHourIndex;

                        let newStartTime = entry.startTime;
                        let newEndTime = entry.endTime;

                        if (isDraggingFromTop) {
                            // Dragging upwards from original start point
                            const newStartHour = Math.min(originalEndHourIndex, hourIdx);
                            newStartTime = TIME_SLOTS[newStartHour];
                        } else if (isDraggingFromBottom) {
                            // Dragging downwards from original end point
                            const newEndHour = Math.max(originalStartHourIndex, hourIdx + 1); // +1 because end is exclusive
                            newEndTime = TIME_SLOTS[newEndHour] || `${String(calendarEndHour).padStart(2, '0')}:00`;
                        } else {
                            // Dragging within the block, adjust based on which end is closer to mouse
                            const currentEntryStartHourIndex = TIME_SLOTS.indexOf(entry.startTime);
                            const currentEntryEndHourIndex = TIME_SLOTS.indexOf(entry.endTime) - 1;

                            const distToTop = Math.abs(hourIdx - currentEntryStartHourIndex);
                            const distToBottom = Math.abs(hourIdx - currentEntryEndHourIndex);

                            if (distToTop <= distToBottom) {
                                // Closer to top, adjust start time
                                newStartTime = TIME_SLOTS[hourIdx];
                            } else {
                                // Closer to bottom, adjust end time
                                newEndTime = TIME_SLOTS[hourIndex + 1] || `${String(calendarEndHour).padStart(2, '0')}:00`;
                            }
                        }

                        // Ensure newStartTime is before newEndTime
                        const finalStartTimeIndex = TIME_SLOTS.indexOf(newStartTime);
                        const finalEndTimeIndex = TIME_SLOTS.indexOf(newEndTime);

                        if (finalStartTimeIndex >= finalEndTimeIndex) {
                            // Prevent invalid time ranges during drag
                            if (isDraggingFromTop) {
                                newStartTime = TIME_SLOTS[originalEndHourIndex];
                            } else if (isDraggingFromBottom) {
                                newEndTime = TIME_SLOTS[originalStartHourIndex + 1] || `${String(calendarEndHour).padStart(2, '0')}:00`;
                            } else {
                                // If dragging inside and it collapses, reset to original or smallest valid
                                newStartTime = TIME_SLOTS[originalStartHourIndex];
                                newEndTime = TIME_SLOTS[originalEndHourIndex + 1] || `${String(calendarEndHour).padStart(2, '0')}:00`;
                            }
                        }

                        return {
                            ...entry,
                            startTime: newStartTime,
                            endTime: newEndTime,
                            duration: calculateDuration(newStartTime, newEndTime)
                        };
                    }
                    return entry;
                }));
            }
        }
    };


    // Handle mouse up to finalize selection or resize
    const handleMouseUp = () => {
        if (isDragging) {
            if (resizingEntryId) {
                // Resize operation finished, no need for dialog, state is already updated
                setResizingEntryId(null);
                setResizingStartHourIndex(null);
                setResizingEndHourIndex(null);
            } else if (startSelection && endSelection) {
                // New selection finished, open dialog to confirm/label
                const normalizedStartDay = Math.min(startSelection.dayIndex, endSelection.dayIndex);
                const normalizedEndDay = Math.max(startSelection.dayIndex, endSelection.dayIndex);
                const normalizedStartHour = Math.min(startSelection.hourIndex, endSelection.hourIndex);
                const normalizedEndHour = Math.max(startSelection.hourIndex, endSelection.hourIndex);

                const newEntry = {
                    id: Date.now(),
                    day: DAYS_OF_WEEK[normalizedStartDay],
                    startTime: TIME_SLOTS[normalizedStartHour],
                    endTime: TIME_SLOTS[normalizedEndHour + 1] || `${String(calendarEndHour).padStart(2, '0')}:00`,
                    label: `Νέο Μάθημα` // Default label
                };

                // Check for valid time range before opening dialog
                if (dayjs(`2000-01-01T${newEntry.endTime}`).isAfter(dayjs(`2000-01-01T${newEntry.startTime}`))) {
                    setDialogEntry(newEntry);
                    setDialogLabel(newEntry.label);
                    setOpenDialog(true);
                } else {
                    alert("Η επιλεγμένη χρονική διάρκεια δεν είναι έγκυρη.");
                }
            }
        }
        setIsDragging(false);
        setStartSelection(null);
        setEndSelection(null);
    };

    // Attach global mouse up listener to handle cases where mouse leaves table
    useEffect(() => {
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, startSelection, endSelection, resizingEntryId, scheduleEntries]); // Added scheduleEntries to dependencies

    // Determine if a cell is currently part of the selection range
    const isCellSelected = (dayIdx, hourIdx) => {
        if (!startSelection || !endSelection) return false;

        const minDay = Math.min(startSelection.dayIndex, endSelection.dayIndex);
        const maxDay = Math.max(startSelection.dayIndex, endSelection.dayIndex);
        const minHour = Math.min(startSelection.hourIndex, endSelection.hourIndex);
        const maxHour = Math.max(startSelection.hourIndex, endSelection.hourIndex);

        return (
            dayIdx >= minDay && dayIdx <= maxDay &&
            hourIdx >= minHour && hourIdx <= maxHour
        );
    };

    // Determine if a cell is covered by a finalized schedule entry
    const getCoveringEntry = (dayIdx, hourIdx) => {
        const currentDay = DAYS_OF_WEEK[dayIdx];
        const currentHour = TIME_SLOTS[hourIdx];

        return scheduleEntries.find(entry => {
            const entryStartHourIndex = TIME_SLOTS.indexOf(entry.startTime);
            const entryEndHourIndex = TIME_SLOTS.indexOf(entry.endTime);

            return (
                entry.day === currentDay &&
                hourIndex >= entryStartHourIndex &&
                hourIndex < entryEndHourIndex
            );
        });
    };

    // Handle dialog close
    const handleCloseDialog = () => {
        setOpenDialog(false);
        setDialogEntry(null);
        setDialogLabel('');
    };

    // Handle confirming a new schedule entry from dialog
    const handleConfirmScheduleEntry = () => {
        if (dialogEntry) {
            const finalEntry = { ...dialogEntry, label: dialogLabel };
            setScheduleEntries(prevEntries => {
                // If it's a new entry, add it. If it's an existing one being edited, update it.
                if (!prevEntries.some(e => e.id === finalEntry.id)) {
                    return [...prevEntries, finalEntry];
                }
                return prevEntries.map(e => e.id === finalEntry.id ? finalEntry : e);
            });
            handleCloseDialog();
        }
    };

    // Handle editing an existing schedule entry (opens dialog)
    const handleEditEntry = (entry) => {
        setDialogEntry(entry);
        setDialogLabel(entry.label);
        setOpenDialog(true);
    };

    // Handle deleting an existing schedule entry
    const handleDeleteEntry = (id) => {
        setScheduleEntries(prevEntries => prevEntries.filter(entry => entry.id !== id));
    };

    const handleClearSchedule = () => {
        setScheduleEntries([]);
    };

    // Function to open the NewClassroomForm dialog with the selected schedule
    const handleOpenNewClassroomDialog = () => {
        if (dialogEntry) {
            const formattedSchedule = [{
                id: dialogEntry.id,
                day: dialogEntry.day,
                startTime: dialogEntry.startTime,
                endTime: dialogEntry.endTime,
                duration: calculateDuration(dialogEntry.startTime, dialogEntry.endTime)
            }];
            setNewClassroomInitialSchedule(formattedSchedule);
            setOpenNewClassroomDialog(true);
            handleCloseDialog(); // Close the current schedule entry dialog
        } else {
            alert("Παρακαλώ επιλέξτε ένα διάστημα στο πρόγραμμα πρώτα.");
        }
    };

    // Callback for when NewClassroomForm successfully saves
    const handleNewClassroomSaveSuccess = () => {
        setOpenNewClassroomDialog(false); // Close the NewClassroomForm dialog
        setNewClassroomInitialSchedule(null); // Clear the initial schedule
        // Optionally, you might want to clear the scheduleEntries or the specific entry that was used
        // For now, we'll leave the entry on the calendar.
    };


    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Paper elevation={3} sx={{ padding: '20px', borderRadius: '12px', minHeight: '600px' }}>
                <Typography variant="h5" component="h3" sx={{ mb: 3, color: '#3f51b5', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fas fa-calendar-alt"></i> Εβδομαδιαίο Πρόγραμμα
                </Typography>

                {/* Hour Selectors */}
                <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                    <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Ώρα Έναρξης</InputLabel>
                        <Select
                            value={calendarStartHour}
                            onChange={(e) => setCalendarStartHour(parseInt(e.target.value))}
                            label="Ώρα Έναρξης"
                        >
                            {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                                <MenuItem key={hour} value={hour} disabled={hour >= calendarEndHour}>
                                    {String(hour).padStart(2, '0')}:00
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Ώρα Λήξης</InputLabel>
                        <Select
                            value={calendarEndHour}
                            onChange={(e) => setCalendarEndHour(parseInt(e.target.value))}
                            label="Ώρα Λήξης"
                        >
                            {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                                <MenuItem key={hour} value={hour} disabled={hour <= calendarStartHour}>
                                    {String(hour).padStart(2, '0')}:00
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Box sx={{ flexGrow: 1 }} /> {/* Spacer */}
                    <Button
                        variant="outlined"
                        color="error"
                        startIcon={<ClearAll />}
                        onClick={handleClearSchedule}
                        sx={{ borderRadius: '8px' }}
                    >
                        Εκκαθάριση Προγράμματος
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<Save />}
                        onClick={() => alert("Schedule saved! (Firebase integration can be added here)")}
                        sx={{ borderRadius: '8px' }}
                    >
                        Αποθήκευση Προγράμματος
                    </Button>
                </Box>

                <TableContainer component={Paper} variant="outlined" sx={{ overflow: 'auto' }}>
                    <Table ref={tableRef} sx={{ minWidth: 800 }}>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: '#1e86cc' }}>
                                <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '80px' }}>Ώρα</TableCell>
                                {DAYS_OF_WEEK.map(day => (
                                    <TableCell key={day} sx={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>{day}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {TIME_SLOTS.map((time, hourIndex) => (
                                <TableRow key={time} sx={{ height: '40px' }}>
                                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>{time}</TableCell>
                                    {DAYS_OF_WEEK.map((day, dayIndex) => {
                                        const isCurrentlySelected = isCellSelected(dayIndex, hourIndex);
                                        const coveringEntry = getCoveringEntry(dayIndex, hourIndex);
                                        const isStartOfEntry = coveringEntry && TIME_SLOTS.indexOf(coveringEntry.startTime) === hourIndex;

                                        return (
                                            <TableCell
                                                key={`${day}-${time}`}
                                                onMouseDown={(e) => handleMouseDown(e, dayIndex, hourIndex)}
                                                onMouseEnter={() => handleMouseEnter(dayIndex, hourIndex)}
                                                onMouseUp={handleMouseUp} // Global listener is also active, but local one helps for clarity
                                                sx={{
                                                    border: '1px solid #e0e0e0',
                                                    backgroundColor: isCurrentlySelected ? '#b3e5fc' : (coveringEntry ? '#e0f2f7' : 'inherit'),
                                                    cursor: isDragging ? 'grabbing' : (coveringEntry ? 'grab' : 'pointer'),
                                                    position: 'relative',
                                                    verticalAlign: 'top',
                                                    fontSize: '0.75rem',
                                                    padding: '4px',
                                                    '&:hover': {
                                                        backgroundColor: isCurrentlySelected ? '#b3e5fc' : (coveringEntry ? '#d0e9f0' : '#f0f0f0'),
                                                    },
                                                }}
                                            >
                                                {isStartOfEntry && (
                                                    <Box sx={{
                                                        backgroundColor: '#2196f3',
                                                        color: '#fff',
                                                        borderRadius: '4px',
                                                        padding: '2px 4px',
                                                        textAlign: 'center',
                                                        overflow: 'hidden',
                                                        whiteSpace: 'nowrap',
                                                        textOverflow: 'ellipsis',
                                                        position: 'absolute',
                                                        top: '2px',
                                                        left: '2px',
                                                        right: '2px',
                                                        zIndex: 1,
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                    }}>
                                                        <Typography variant="caption" sx={{ flexGrow: 1, textAlign: 'left' }}>
                                                            {coveringEntry.label}
                                                        </Typography>
                                                        <IconButton
                                                            size="small"
                                                            sx={{ color: '#fff', padding: '2px' }}
                                                            onClick={(e) => { e.stopPropagation(); handleEditEntry(coveringEntry); }}
                                                        >
                                                            <Edit sx={{ fontSize: '0.8rem' }} />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            sx={{ color: '#fff', padding: '2px' }}
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteEntry(coveringEntry.id); }}
                                                        >
                                                            <Delete sx={{ fontSize: '0.8rem' }} />
                                                        </IconButton>
                                                    </Box>
                                                )}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Schedule Entry Dialog (for confirming/editing label) */}
            <Dialog open={openDialog} onClose={handleCloseDialog}>
                <DialogTitle>{dialogEntry ? 'Επεξεργασία Προγράμματος' : 'Προσθήκη Νέου Προγράμματος'}</DialogTitle>
                <DialogContent>
                    {dialogEntry && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="body1"><strong>Ημέρα:</strong> {dialogEntry.day}</Typography>
                            <Typography variant="body1"><strong>Ώρα Έναρξης:</strong> {dialogEntry.startTime}</Typography>
                            <Typography variant="body1"><strong>Ώρα Λήξης:</strong> {dialogEntry.endTime}</Typography>
                            <Typography variant="body1"><strong>Διάρκεια:</strong> {calculateDuration(dialogEntry.startTime, dialogEntry.endTime)}</Typography>
                            <TextField
                                autoFocus
                                margin="dense"
                                label="Περιγραφή/Τίτλος"
                                type="text"
                                fullWidth
                                variant="outlined"
                                value={dialogLabel}
                                onChange={(e) => setDialogLabel(e.target.value)}
                                sx={{ mt: 2 }}
                            />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog} color="primary">
                        Ακύρωση
                    </Button>
                    <Button onClick={handleConfirmScheduleEntry} color="primary" variant="contained">
                        {dialogEntry && scheduleEntries.some(e => e.id === dialogEntry.id) ? 'Ενημέρωση' : 'Προσθήκη'}
                    </Button>
                    {dialogEntry && (
                        <Button onClick={handleOpenNewClassroomDialog} color="secondary" variant="outlined">
                            Δημιουργία Τμήματος με αυτό το Πρόγραμμα
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* NewClassroomForm Dialog */}
            <Dialog open={openNewClassroomDialog} onClose={() => setOpenNewClassroomDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>Δημιουργία Νέου Τμήματος</DialogTitle>
                <DialogContent dividers>
                    <NewClassroomForm
                        navigateTo={() => {}} // No navigation needed from here
                        classroomToEdit={null} // Not editing an existing classroom
                        setClassroomToEdit={() => {}} // No need to set classroom to edit
                        initialSchedule={newClassroomInitialSchedule}
                        onSaveSuccess={handleNewClassroomSaveSuccess} // Callback for successful save
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenNewClassroomDialog(false)} color="primary">
                        Κλείσιμο
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default WeeklyScheduleCalendar;
