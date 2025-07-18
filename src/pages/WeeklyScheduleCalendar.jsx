// src/components/WeeklyScheduleCalendar.jsx
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
    Box, Container, Paper, Typography, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Button, IconButton,
    FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle,
    DialogContent, DialogActions, TextField
} from '@mui/material';
import { ClearAll, Save, Add, Edit, Delete, CheckCircleOutline } from '@mui/icons-material';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
dayjs.extend(duration);

// Firebase Imports
import { doc, deleteDoc, collection, query, getDocs, updateDoc } from 'firebase/firestore';

// Import NewClassroomForm to be used in the dialog
import NewClassroomForm from './NewClassroomForm.jsx';

// Define the days of the week (excluding Sunday)
const DAYS_OF_WEEK = ['Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];

// Helper to generate time slots based on start and end hours
const generateTimeSlots = (startHour, endHour) => {
    const slots = [];
    for (let h = startHour; h < endHour; h++) {
        slots.push(`${String(h).padStart(2, '0')}:00`);
        slots.push(`${String(h).padStart(2, '0')}:30`); // Add 30-minute intervals
    }
    slots.push(`${String(endHour).padStart(2, '0')}:00`); // Ensure the end hour is included
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

// FloatingEventBlock Component
const FloatingEventBlock = ({ id, day, startTime, endTime, subject, grade, enrolledStudents, maxStudents, left, top, width, height, backgroundColor, onEdit, onDelete, onDragStart, onResizeStart, fullClassroomData }) => {
    const currentStudents = enrolledStudents ? enrolledStudents.length : 0;
    return (
        <Box
            id={`event-block-${id}`}
            sx={{
                position: 'absolute',
                left: left,
                top: top,
                width: width,
                height: height,
                backgroundColor: backgroundColor || '#2196f3',
                color: '#fff',
                borderRadius: '4px',
                padding: '2px 4px',
                textAlign: 'left',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                zIndex: 5,
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                cursor: 'grab',
                touchAction: 'none',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                boxSizing: 'border-box',
            }}
            onMouseDown={(e) => onDragStart(e, id)}
        >
            {/* Top Resize Handle */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '8px',
                    cursor: 'ns-resize',
                    zIndex: 6,
                }}
                onMouseDown={(e) => onResizeStart(e, id, 'top')}
            />

            {/* Content (Subject, Grade, Students, and Time) */}
            <Box sx={{ flexGrow: 1, overflow: 'hidden', pr: '40px' }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block' }}>
                    {subject}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>
                    {grade}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>
                    Μαθητές: {currentStudents}/{maxStudents}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>
                    {startTime} - {endTime}
                </Typography>
            </Box>

            {/* Buttons positioned absolutely at top right */}
            <Box sx={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                display: 'flex',
                gap: '2px',
                zIndex: 7,
            }}>
                <IconButton
                    size="small"
                    sx={{ color: '#fff', padding: '2px' }}
                    onClick={(e) => { e.stopPropagation(); onEdit(fullClassroomData); }}
                >
                    <Edit sx={{ fontSize: '0.8rem' }} />
                </IconButton>
                <IconButton
                    size="small"
                    sx={{ color: '#fff', padding: '2px' }}
                    onClick={(e) => { e.stopPropagation(); onDelete(fullClassroomData.id); }}
                >
                    <Delete sx={{ fontSize: '0.8rem' }} />
                </IconButton>
            </Box>

            {/* Bottom Resize Handle */}
            <Box
                sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '8px',
                    cursor: 'ns-resize',
                    zIndex: 6,
                }}
                onMouseDown={(e) => onResizeStart(e, id, 'bottom')}
            />
        </Box>
    );
};

function WeeklyScheduleCalendar({ classrooms, loading, onCreateClassroomFromCalendar, onEditClassroom, navigateTo, db, userId, appId }) { // Receive appId prop
    // Calendar display hours
    const [calendarStartHour, setCalendarStartHour] = useState(8);
    const [calendarEndHour, setCalendarEndHour] = useState(20);

    // Generated time slots based on selected hours
    const TIME_SLOTS = useMemo(() => generateTimeSlots(calendarStartHour, calendarEndHour), [calendarStartHour, calendarEndHour]);

    // Dragging states for new selection
    const [isDraggingNewSelection, setIsDraggingNewSelection] = useState(false);
    const [startSelection, setStartSelection] = useState(null);
    const [endSelection, setEndSelection] = useState(null);
    const [tempFloatingSelectionRect, setTempFloatingSelectionRect] = useState(null);

    // Dragging states for existing event blocks
    const [isDraggingEvent, setIsDraggingEvent] = useState(false);
    const [draggedEventId, setDraggedEventId] = useState(null);
    const [dragStartMousePos, setDragStartMousePos] = useState({ x: 0, y: 0 });
    const [dragStartBlockPos, setDragStartBlockPos] = useState({ left: 0, top: 0 });

    // Resizing states for existing event blocks
    const [isResizingEvent, setIsResizingEvent] = useState(false);
    const [resizedEventId, setResizedEventId] = useState(null);
    const [resizeHandle, setResizeHandle] = useState(null);
    const [resizeStartMouseY, setResizeStartMouseY] = useState(0);
    const [resizeStartBlockTop, setResizeStartBlockTop] = useState(0);
    const [resizeStartBlockHeight, setResizeStartBlockHeight] = useState(0);
    const [resizeStartHourIndex, setResizeStartHourIndex] = useState(null);
    const [resizeEndHourIndex, setResizeEndHourIndex] = useState(null);

    // State for the finalized event blocks displayed on the calendar
    const [displayedEventBlocks, setDisplayedEventBlocks] = useState([]);

    // Dialog states for editing individual schedule entry (label/color)
    const [openDialog, setOpenDialog] = useState(false);
    const [dialogEntry, setDialogEntry] = useState(null);
    const [dialogLabel, setDialogLabel] = useState('');
    const [dialogColor, setDialogColor] = useState('#2196f3');

    // State for the new classroom creation dialog (now holds NewClassroomForm)
    const [openNewClassroomFormDialog, setOpenNewClassroomFormDialog] = useState(false);
    const [newClassroomInitialSchedule, setNewClassroomInitialSchedule] = useState(null);

    // States for custom confirmation dialogs
    const [openDeleteConfirmDialog, setOpenDeleteConfirmDialog] = useState(false);
    const [classroomIdToDelete, setClassroomIdToDelete] = useState(null);
    const [openClearConfirmDialog, setOpenClearConfirmDialog] = useState(false);


    // Ref for the table container to calculate cell positions
    const tableRef = useRef(null);

    // Helper to get pixel coordinates and dimensions of a specific table cell
    const getCellPixelRect = useCallback((dayIdx, hourIdx) => {
        const table = tableRef.current;
        if (!table) return null;

        const cellElement = table.querySelector(`tbody tr:nth-child(${hourIdx + 1}) td:nth-child(${dayIdx + 2})`);
        if (cellElement) {
            const cellRect = cellElement.getBoundingClientRect();
            const tableContainerRect = table.closest('.MuiTableContainer-root').getBoundingClientRect();

            return {
                left: cellRect.left - tableContainerRect.left,
                top: cellRect.top - tableContainerRect.top,
                width: cellRect.width,
                height: cellRect.height,
            };
        }
        return null;
    }, []);

    // Helper to convert pixel coordinates to grid coordinates
    const getGridCoordinatesFromPixels = useCallback((pixelX, pixelY) => {
        const table = tableRef.current;
        if (!table) return null;

        const tableRect = table.getBoundingClientRect();
        const relativeX = pixelX - tableRect.left;
        const relativeY = pixelY - tableRect.top;

        const headerCells = table.querySelectorAll('thead th');
        let dayIndex = -1;
        for (let i = 1; i < headerCells.length; i++) {
            const cellRect = headerCells[i].getBoundingClientRect();
            if (pixelX >= cellRect.left && pixelX < cellRect.right) {
                dayIndex = i - 1;
                break;
            }
        }

        const bodyRows = table.querySelectorAll('tbody tr');
        let hourIndex = -1;
        for (let i = 0; i < bodyRows.length; i++) {
            const rowRect = bodyRows[i].getBoundingClientRect();
            if (pixelY >= rowRect.top && pixelY < rowRect.bottom) {
                hourIndex = i;
                break;
            }
        }

        if (dayIndex !== -1 && hourIndex !== -1) {
            return { dayIndex, hourIndex };
        }
        return null;
    }, []);

    // Helper to update the temporary floating selection rectangle's state
    const updateTempFloatingSelectionRect = useCallback((startCoords, endCoords) => {
        if (!startCoords || !endCoords) {
            setTempFloatingSelectionRect(null);
            return;
        }

        const minDay = Math.min(startCoords.dayIndex, endCoords.dayIndex);
        const maxDay = Math.max(startCoords.dayIndex, endCoords.dayIndex);
        const minHour = Math.min(startCoords.hourIndex, endCoords.hourIndex);
        const maxHour = Math.max(startCoords.hourIndex, endCoords.hourIndex);

        if (minDay < 0) {
            setTempFloatingSelectionRect(null);
            return;
        }

        const startCellRect = getCellPixelRect(minDay, minHour);
        const endCellRect = getCellPixelRect(maxDay, maxHour);

        if (startCellRect && endCellRect) {
            setTempFloatingSelectionRect({
                left: startCellRect.left,
                top: startCellRect.top,
                width: endCellRect.left + endCellRect.width - startCellRect.left - 4,
                height: endCellRect.top + endCellRect.height - startCellRect.top,
            });
        } else {
            setTempFloatingSelectionRect(null);
        }
    }, [getCellPixelRect]);

    // Function to transform classrooms data into displayedEventBlocks
    const transformClassroomsToEvents = useCallback((classroomsData) => {
        const events = [];
        classroomsData.forEach(classroom => {
            if (classroom.schedule && Array.isArray(classroom.schedule)) {
                classroom.schedule.forEach((slot, index) => {
                    const dayIdx = DAYS_OF_WEEK.indexOf(slot.day);
                    if (dayIdx === -1) return;

                    const startHourIdx = TIME_SLOTS.indexOf(slot.startTime);
                    let endHourIdx = TIME_SLOTS.indexOf(slot.endTime);

                    if (endHourIdx === -1) {
                        const targetEndTimeMoment = dayjs(`2000-01-01T${slot.endTime}`);
                        for (let i = TIME_SLOTS.length - 1; i >= 0; i--) {
                            const slotMoment = dayjs(`2000-01-01T${TIME_SLOTS[i]}`);
                            if (slotMoment.isSame(targetEndTimeMoment) || slotMoment.isBefore(targetEndTimeMoment)) {
                                endHourIdx = i;
                                break;
                            }
                        }
                    }

                    if (startHourIdx === -1 || endHourIdx === -1 || startHourIdx >= endHourIdx) {
                        console.warn("Invalid time slot for classroom event:", classroom, slot);
                        return;
                    }

                    endHourIdx = Math.max(startHourIdx, endHourIdx - 1);


                    const startCellRect = getCellPixelRect(dayIdx, startHourIdx);
                    const endCellRect = getCellPixelRect(dayIdx, endHourIdx);

                    if (startCellRect && endCellRect) {
                        events.push({
                            id: classroom.id + '-' + index,
                            day: slot.day,
                            startTime: slot.startTime,
                            endTime: slot.endTime,
                            subject: classroom.subject, // Pass subject directly
                            grade: classroom.grade,     // Pass grade directly
                            enrolledStudents: classroom.enrolledStudents, // Pass enrolled students
                            maxStudents: classroom.maxStudents,       // Pass max students
                            backgroundColor: classroom.color || '#2196f3',
                            left: startCellRect.left,
                            top: startCellRect.top,
                            width: startCellRect.width - 4,
                            height: endCellRect.top + endCellRect.height - startCellRect.top,
                            fullClassroomData: classroom,
                        });
                    }
                });
            }
        });
        return events;
    }, [getCellPixelRect, TIME_SLOTS]);

    // Update displayedEventBlocks when classrooms prop changes
    useEffect(() => {
        if (classrooms) {
            setDisplayedEventBlocks(transformClassroomsToEvents(classrooms));
        }
    }, [classrooms, transformClassroomsToEvents]);


    // Handle mouse down to start a new selection on the grid
    const handleGridMouseDown = (e, dayIdx, hourIdx) => {
        if (e.button !== 0) return;

        e.preventDefault();

        setTempFloatingSelectionRect(null);

        setIsDraggingNewSelection(true);
        setStartSelection({ dayIndex: dayIdx, hourIndex: hourIdx });
        setEndSelection({ dayIndex: dayIdx, hourIndex: hourIdx });
        updateTempFloatingSelectionRect({ dayIndex: dayIdx, hourIndex: hourIdx }, { dayIndex: dayIdx, hourIndex: hourIdx });
    };

    // Handle mouse down on an existing event block to start dragging
    const handleEventDragStart = useCallback((e, id) => {
        e.stopPropagation();
        if (e.button !== 0) return;

        e.preventDefault();

        setIsDraggingEvent(true);
        setDraggedEventId(id);
        setDragStartMousePos({ x: e.clientX, y: e.clientY });

        const blockElement = document.getElementById(`event-block-${id}`);
        if (blockElement) {
            const blockRect = blockElement.getBoundingClientRect();
            const tableContainerRect = tableRef.current.closest('.MuiTableContainer-root').getBoundingClientRect();
            setDragStartBlockPos({
                left: blockRect.left - tableContainerRect.left,
                top: blockRect.top - tableContainerRect.top
            });
        }
    }, []);

    // Handle mouse down on a resize handle to start resizing
    const handleEventResizeStart = useCallback((e, id, handle) => {
        e.stopPropagation();
        if (e.button !== 0) return;

        e.preventDefault();

        setIsResizingEvent(true);
        setResizedEventId(id);
        setResizeHandle(handle);
        setResizeStartMouseY(e.clientY);

        const blockElement = document.getElementById(`event-block-${id}`);
        if (blockElement) {
            const blockRect = blockElement.getBoundingClientRect();
            const tableContainerRect = tableRef.current.closest('.MuiTableContainer-root').getBoundingClientRect();
            setResizeStartBlockTop(blockRect.top - tableContainerRect.top);
            setResizeStartBlockHeight(blockRect.height);

            const originalEventBlock = displayedEventBlocks.find(block => block.id === id);
            if (originalEventBlock) {
                setResizeStartHourIndex(TIME_SLOTS.indexOf(originalEventBlock.startTime));
                const originalEndTimeMoment = dayjs(`2000-01-01T${originalEventBlock.endTime}`);
                let originalEndSlotIndex = TIME_SLOTS.length - 1;
                for (let i = TIME_SLOTS.length - 1; i >= 0; i--) {
                    const slotMoment = dayjs(`2000-01-01T${TIME_SLOTS[i]}`);
                    if (slotMoment.isSame(originalEndTimeMoment) || slotMoment.isBefore(targetEndTimeMoment)) {
                        originalEndSlotIndex = i;
                        break;
                    }
                }
                setResizeEndHourIndex(originalEndSlotIndex);
            }
        }
    }, [displayedEventBlocks, TIME_SLOTS]);


    // Global mouse move handler for dragging and resizing
    const handleGlobalMouseMove = useCallback((e) => {
        e.preventDefault();

        if (isDraggingNewSelection) {
            const coords = getGridCoordinatesFromPixels(e.clientX, e.clientY);
            if (coords && coords.dayIndex >= 0) {
                setEndSelection(coords);
                updateTempFloatingSelectionRect(startSelection, coords);
            } else if (coords && coords.dayIndex < 0) {
                setTempFloatingSelectionRect(null);
            }
        } else if (isDraggingEvent) {
            const dx = e.clientX - dragStartMousePos.x;
            const dy = e.clientY - dragStartMousePos.y;

            setDisplayedEventBlocks(prevBlocks => prevBlocks.map(block => {
                if (block.id === draggedEventId) {
                    return {
                        ...block,
                        left: dragStartBlockPos.left + dx,
                        top: dragStartBlockPos.top + dy,
                    };
                }
                return block;
            }));
        } else if (isResizingEvent) {
            const dy = e.clientY - resizeStartMouseY;

            setDisplayedEventBlocks(prevBlocks => prevBlocks.map(block => {
                if (block.id === resizedEventId) {
                    let newTop = resizeStartBlockTop;
                    let newHeight = resizeStartBlockHeight;

                    if (resizeHandle === 'top') {
                        newTop = resizeStartBlockTop + dy;
                        newHeight = resizeStartBlockHeight - dy;
                    } else if (resizeHandle === 'bottom') {
                        newHeight = resizeStartBlockHeight + dy;
                    }

                    newHeight = Math.max(newHeight, 10);

                    return {
                        ...block,
                        top: newTop,
                        height: newHeight,
                    };
                }
                return block;
            }));
        }
    }, [isDraggingNewSelection, startSelection, updateTempFloatingSelectionRect, isDraggingEvent, draggedEventId, dragStartMousePos, dragStartBlockPos, isResizingEvent, resizedEventId, resizeHandle, resizeStartMouseY, resizeStartBlockTop, resizeStartBlockHeight, getGridCoordinatesFromPixels, displayedEventBlocks]);


    // Global mouse up handler to finalize operations
    const handleGlobalMouseUp = useCallback(async () => {
        // Capture current state values before resetting
        const wasDraggingNewSelection = isDraggingNewSelection;
        const wasDraggingEvent = isDraggingEvent;
        const wasResizingEvent = isResizingEvent;
        const currentStartSelection = startSelection;
        const currentEndSelection = endSelection;
        const currentDraggedEventId = draggedEventId;
        const currentResizedEventId = resizedEventId;

        // Reset all dragging/resizing states immediately
        setIsDraggingNewSelection(false);
        setIsDraggingEvent(false);
        setIsResizingEvent(false);
        setTempFloatingSelectionRect(null); // Always clear temp rect on mouse up
        setStartSelection(null);
        setEndSelection(null);
        setDraggedEventId(null);
        setDragStartMousePos({ x: 0, y: 0 });
        setDragStartBlockPos({ left: 0, top: 0 });
        setResizedEventId(null);
        setResizeHandle(null);
        setResizeStartMouseY(0);
        setResizeStartBlockTop(0);
        setResizeStartBlockHeight(0);
        setResizeStartHourIndex(null);
        setResizeEndHourIndex(null);


        if (wasDraggingNewSelection && currentStartSelection && currentEndSelection && (currentStartSelection.dayIndex !== currentEndSelection.dayIndex || currentStartSelection.hourIndex !== currentEndSelection.hourIndex)) {
            const normalizedStartDay = Math.min(currentStartSelection.dayIndex, currentEndSelection.dayIndex);
            const normalizedEndDay = Math.max(currentStartSelection.dayIndex, currentEndSelection.dayIndex);
            const normalizedStartHour = Math.min(currentStartSelection.hourIndex, currentEndSelection.hourIndex);
            const normalizedEndHour = Math.max(currentStartSelection.hourIndex, currentEndSelection.hourIndex);

            if (normalizedStartDay < 0 || normalizedStartHour < 0) {
                alert("Παρακαλώ επιλέξτε μια έγκυρη περιοχή στο πρόγραμμα.");
                return;
            }

            const newStartTime = TIME_SLOTS[normalizedStartHour];
            const newEndTime = TIME_SLOTS[normalizedEndHour + 1] || `${String(calendarEndHour).padStart(2, '0')}:00`;

            const newEntry = {
                id: Date.now(),
                day: DAYS_OF_WEEK[normalizedStartDay],
                startTime: newStartTime,
                endTime: newEndTime,
                duration: calculateDuration(newStartTime, newEndTime),
                backgroundColor: '#2196f3'
            };

            if (dayjs(`2000-01-01T${newEntry.endTime}`).isAfter(dayjs(`2000-01-01T${newEntry.startTime}`))) {
                setNewClassroomInitialSchedule([newEntry]);
                setOpenNewClassroomFormDialog(true); // Open the dialog with NewClassroomForm
            } else {
                alert("Η επιλεγμένη χρονική διάρκεια δεν είναι έγκυρη.");
            }
        } else if (wasDraggingEvent && currentDraggedEventId) {
            // Ensure db is initialized before attempting Firestore operations
            if (!db || !appId) {
                console.error("Firestore DB or appId not initialized. Cannot update classroom schedule after drag.");
                alert("Σφάλμα: Η βάση δεδομένων ή το αναγνωριστικό εφαρμογής δεν είναι διαθέσιμα. Παρακαλώ δοκιμάστε ξανά.");
                return;
            }

            const blockElement = document.getElementById(`event-block-${currentDraggedEventId}`);
            if (blockElement) {
                const blockRect = blockElement.getBoundingClientRect();
                const tableContainerRect = tableRef.current.closest('.MuiTableContainer-root').getBoundingClientRect();

                const snappedCoords = getGridCoordinatesFromPixels(
                    blockRect.left + tableContainerRect.left + 2,
                    blockRect.top + tableContainerRect.top + 2
                );

                if (snappedCoords && snappedCoords.dayIndex >= 0 && snappedCoords.hourIndex >= 0) {
                    const originalEventBlock = displayedEventBlocks.find(block => block.id === currentDraggedEventId);
                    if (originalEventBlock) {
                        const originalStartTimeMoment = dayjs(`2000-01-01T${originalEventBlock.startTime}`);
                        const originalEndTimeMoment = dayjs(`2000-01-01T${originalEventBlock.endTime}`);
                        const originalDurationMinutes = originalEndTimeMoment.diff(originalStartTimeMoment, 'minute');

                        const newDay = DAYS_OF_WEEK[snappedCoords.dayIndex];
                        const newStartTime = TIME_SLOTS[snappedCoords.hourIndex];

                        const newStartMoment = dayjs(`2000-01-01T${newStartTime}`);
                        const newEndMoment = newStartMoment.add(originalDurationMinutes, 'minute');
                        const newEndTime = newEndMoment.format('HH:mm');

                        const classroomToUpdate = classrooms.find(cls =>
                            cls.schedule.some((slot, idx) => `${cls.id}-${idx}` === currentDraggedEventId)
                        );

                        if (classroomToUpdate) {
                            const updatedSchedule = classroomToUpdate.schedule.map((slot, idx) => {
                                if (`${classroomToUpdate.id}-${idx}` === currentDraggedEventId) {
                                    return {
                                        ...slot,
                                        day: newDay,
                                        startTime: newStartTime,
                                        endTime: newEndTime,
                                        duration: calculateDuration(newStartTime, newEndTime)
                                    };
                                }
                                return slot;
                            });

                            try {
                                const classroomDocRef = doc(db, `artifacts/${appId}/public/data/classrooms`, classroomToUpdate.id);
                                await updateDoc(classroomDocRef, { schedule: updatedSchedule });
                                console.log("Classroom schedule updated in Firestore after drag.");
                            } catch (error) {
                                console.error("Error updating classroom schedule after drag:", error);
                                alert("Αποτυχία ενημέρωσης προγράμματος μετά τη μεταφορά.");
                            }
                        } else {
                            console.warn(`Classroom with ID derived from ${currentDraggedEventId} not found for update. It might have been deleted or not yet saved.`);
                        }
                    }
                }
            }
        } else if (wasResizingEvent && currentResizedEventId) {
            // Ensure db is initialized before attempting Firestore operations
            if (!db || !appId) {
                console.error("Firestore DB or appId not initialized. Cannot update classroom schedule after resize.");
                alert("Σφάλμα: Η βάση δεδομένων ή το αναγνωριστικό εφαρμογής δεν είναι διαθέσιμα. Παρακαλώ δοκιμάστε ξανά.");
                return;
            }

            const blockElement = document.getElementById(`event-block-${currentResizedEventId}`);
            if (blockElement) {
                const blockRect = blockElement.getBoundingClientRect();
                const tableContainerRect = tableRef.current.closest('.MuiTableContainer-root').getBoundingClientRect();

                let newStartTime = null;
                let newEndTime = null;
                const originalEventBlock = displayedEventBlocks.find(block => block.id === currentResizedEventId);

                if (!originalEventBlock) {
                    console.error("Original event block not found for resizing.");
                    return;
                }

                const snappedTopCoords = getGridCoordinatesFromPixels(blockRect.left + tableContainerRect.left + 2, blockRect.top + tableContainerRect.top + 2);
                const snappedBottomCoords = getGridCoordinatesFromPixels(blockRect.left + tableContainerRect.left + 2, blockRect.bottom + tableContainerRect.top - 2);

                if (resizeHandle === 'top' && snappedTopCoords && snappedTopCoords.hourIndex !== null && snappedTopCoords.hourIndex !== undefined) {
                    newStartTime = TIME_SLOTS[snappedTopCoords.hourIndex];
                    newEndTime = originalEventBlock.endTime;
                } else if (resizeHandle === 'bottom' && snappedBottomCoords && snappedBottomCoords.hourIndex !== null && snappedBottomCoords.hourIndex !== undefined) {
                    newStartTime = originalEventBlock.startTime;
                    newEndTime = TIME_SLOTS[snappedBottomCoords.hourIndex + 1] || `${String(calendarEndHour).padStart(2, '0')}:00`;
                } else {
                    newStartTime = originalEventBlock.startTime;
                    newEndTime = originalEventBlock.endTime;
                }

                const startMoment = dayjs(`2000-01-01T${newStartTime}`);
                const endMoment = dayjs(`2000-01-01T${newEndTime}`);

                if (startMoment.isBefore(endMoment)) {
                    const classroomToUpdate = classrooms.find(cls =>
                        cls.schedule.some((slot, idx) => `${cls.id}-${idx}` === currentResizedEventId)
                    );

                    if (classroomToUpdate) {
                        const updatedSchedule = classroomToUpdate.schedule.map((slot, idx) => {
                            if (`${classroomToUpdate.id}-${idx}` === currentResizedEventId) {
                                return {
                                    ...slot,
                                    startTime: newStartTime,
                                    endTime: newEndTime,
                                    duration: calculateDuration(newStartTime, newEndTime)
                                };
                            }
                            return slot;
                        });

                        try {
                            const classroomDocRef = doc(db, `artifacts/${appId}/public/data/classrooms`, classroomToUpdate.id);
                            await updateDoc(classroomDocRef, { schedule: updatedSchedule });
                            console.log("Classroom schedule updated in Firestore after resize.");
                        } catch (error) {
                            console.error("Error updating classroom schedule after resize:", error);
                            alert("Αποτυχία ενημέρωσης προγράμματος μετά την αλλαγή μεγέθους.");
                        }
                    } else {
                        console.warn(`Classroom with ID derived from ${currentResizedEventId} not found for update. It might have been deleted or not yet saved.`);
                    }
                } else {
                    alert("Η ώρα λήξης δεν μπορεί να είναι πριν ή ίδια με την ώρα έναρξης.");
                }
            }
        }
    }, [isDraggingNewSelection, startSelection, endSelection, TIME_SLOTS, calendarEndHour, onCreateClassroomFromCalendar, isDraggingEvent, draggedEventId, dragStartMousePos, dragStartBlockPos, isResizingEvent, resizedEventId, resizeHandle, resizeStartHourIndex, resizeEndHourIndex, getCellPixelRect, getGridCoordinatesFromPixels, displayedEventBlocks, classrooms, db, appId]);


    // Attach global mouse move and mouse up listeners
    useEffect(() => {
        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [handleGlobalMouseMove, handleGlobalMouseUp]);


    // Handle dialog close (for editing individual schedule entries)
    const handleCloseDialog = () => {
        setOpenDialog(false);
        setDialogEntry(null);
        setDialogLabel('');
        setDialogColor('#2196f3');
    };

    // Handle confirming an edited schedule entry from dialog
    const handleConfirmScheduleEntry = async () => {
        if (dialogEntry) {
            // Ensure db is initialized before attempting Firestore operations
            if (!db || !appId) {
                console.error("Firestore DB or appId not initialized. Cannot update schedule entry.");
                alert("Σφάλμα: Η βάση δεδομένων ή το αναγνωριστικό εφαρμογής δεν είναι διαθέσιμα. Παρακαλώ δοκιμάστε ξανά.");
                return;
            }

            const finalEntry = { ...dialogEntry, label: dialogLabel, backgroundColor: dialogColor };

            const classroomToUpdate = classrooms.find(cls =>
                cls.schedule.some((slot, idx) => `${cls.id}-${idx}` === dialogEntry.id)
            );

            if (classroomToUpdate) {
                const updatedSchedule = classroomToUpdate.schedule.map((slot, idx) => {
                    if (`${classroomToUpdate.id}-${idx}` === dialogEntry.id) {
                        return {
                            ...slot,
                        };
                    }
                    return slot;
                });

                try {
                    const classroomDocRef = doc(db, `artifacts/${appId}/public/data/classrooms`, classroomToUpdate.id);
                    await updateDoc(classroomDocRef, { schedule: updatedSchedule, color: finalEntry.backgroundColor });
                    console.log("Classroom schedule entry updated in Firestore:", finalEntry);
                } catch (error) {
                    console.error("Error updating classroom schedule entry:", error);
                    alert("Αποτυχία ενημέρωσης καταχώρησης προγράμματος.");
                }
            }
            handleCloseDialog();
        }
    };

    // Handle editing an existing schedule entry (opens full NewClassroomForm)
    const handleEditEntry = (fullClassroomData) => {
        onEditClassroom(fullClassroomData);
        navigateTo('newClassroom');
    };

    // Handle deleting an existing classroom (opens confirmation dialog)
    const handleDeleteEntry = (classroomId) => {
        setClassroomIdToDelete(classroomId);
        setOpenDeleteConfirmDialog(true);
    };

    // Function to confirm deletion after dialog
    const handleConfirmDelete = async () => {
        setOpenDeleteConfirmDialog(false); // Close dialog immediately

        // Ensure db is initialized before attempting Firestore operations
        if (!db || !classroomIdToDelete || !appId) {
            console.error("Firestore DB, classroomId, or appId not initialized. Cannot delete classroom.");
            alert("Σφάλμα: Η βάση δεδομένων, το αναγνωριστικό τμήματος ή το αναγνωριστικό εφαρμογής δεν είναι διαθέσιμα. Παρακαλώ δοκιμάστε ξανά.");
            return;
        }

        try {
            const classroomDocRef = doc(db, `artifacts/${appId}/public/data/classrooms`, classroomIdToDelete);
            await deleteDoc(classroomDocRef);
            alert("Classroom deleted successfully!");
            setClassroomIdToDelete(null); // Clear the ID
        } catch (error) {
            console.error("Error deleting classroom:", error);
            alert("Αποτυχία διαγραφής τμήματος. Παρακαλώ δοκιμάστε ξανά.");
        }
    };

    const handleCancelDelete = () => {
        setOpenDeleteConfirmDialog(false);
        setClassroomIdToDelete(null);
    };

    // Handle clearing entire schedule (opens confirmation dialog)
    const handleClearSchedule = () => {
        setOpenClearConfirmDialog(true);
    };

    // Function to confirm clearing after dialog
    const handleConfirmClearSchedule = async () => {
        setOpenClearConfirmDialog(false); // Close dialog immediately

        // Ensure db is initialized before attempting Firestore operations
        if (!db || !appId) {
            console.error("Firestore DB or appId not initialized. Cannot clear all classrooms.");
            alert("Σφάλμα: Η βάση δεδομένων ή το αναγνωριστικό εφαρμογής δεν είναι διαθέσιμα. Παρακαλώ δοκιμάστε ξανά.");
            return;
        }

        try {
            const classroomsCollectionRef = collection(db, `artifacts/${appId}/public/data/classrooms`);
            const q = query(classroomsCollectionRef);
            const snapshot = await getDocs(q);

            const deletePromises = snapshot.docs.map(docToDelete => deleteDoc(doc(db, `artifacts/${appId}/public/data/classrooms`, docToDelete.id)));
            await Promise.all(deletePromises);
            alert("Όλα τα τμήματα διαγράφηκαν επιτυχώς!");
            // The onSnapshot listener in App.jsx will automatically refresh the calendar with new data
        } catch (error) {
            console.error("Error clearing all classrooms:", error);
            alert("Αποτυχία εκκαθάρισης όλων των τμημάτων. Παρακαλώ δοκιμάστε ξανά.");
        }
    };

    const handleCancelClearSchedule = () => {
        setOpenClearConfirmDialog(false);
    };

    // Callback for NewClassroomForm when it successfully saves from within the dialog
    const handleNewClassroomFormSaveSuccess = () => {
        setOpenNewClassroomFormDialog(false); // Close the dialog
        setNewClassroomInitialSchedule(null); // Clear initial schedule
        // The App.jsx's onSnapshot will automatically refresh the calendar with new data
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

                <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={{
                        overflow: 'auto',
                        position: 'relative',
                        userSelect: isDraggingNewSelection ? 'none' : 'auto',
                        WebkitUserSelect: isDraggingNewSelection ? 'none' : 'auto',
                        cursor: isDraggingNewSelection ? 'grabbing' : 'auto',
                    }}
                >
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
                                    <TableCell
                                        sx={{
                                            fontWeight: 'bold',
                                            backgroundColor: '#f5f5f5',
                                            pointerEvents: 'none',
                                            verticalAlign: 'top',
                                            paddingTop: '4px',
                                            paddingBottom: '0px',
                                            paddingLeft: '8px',
                                        }}
                                    >
                                        {time}
                                    </TableCell>
                                    {DAYS_OF_WEEK.map((day, dayIndex) => {
                                        return (
                                            <TableCell
                                                key={`${day}-${time}`}
                                                onMouseDown={(e) => handleGridMouseDown(e, dayIndex, hourIndex)}
                                                onMouseEnter={() => {
                                                    if (isDraggingNewSelection) {
                                                        const coords = { dayIndex, hourIndex };
                                                        if (coords.dayIndex >= 0) {
                                                            setEndSelection(coords);
                                                            updateTempFloatingSelectionRect(startSelection, coords);
                                                        } else {
                                                            setTempFloatingSelectionRect(null);
                                                        }
                                                    }
                                                }}
                                                sx={{
                                                    border: '1px solid #e0e0e0',
                                                    backgroundColor: 'inherit',
                                                    cursor: isDraggingNewSelection ? 'grabbing' : 'pointer',
                                                    position: 'relative',
                                                    verticalAlign: 'top',
                                                    fontSize: '0.75rem',
                                                    padding: '4px',
                                                    '&:hover': {
                                                        backgroundColor: '#f0f0f0',
                                                    },
                                                }}
                                            >
                                                {/* No content here, events are drawn as floating blocks */}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {/* Temporary Floating Selection Rectangle (during initial drag) */}
                    {tempFloatingSelectionRect && (
                        <Box
                            sx={{
                                position: 'absolute',
                                left: tempFloatingSelectionRect.left,
                                top: tempFloatingSelectionRect.top,
                                width: tempFloatingSelectionRect.width,
                                height: tempFloatingSelectionRect.height,
                                backgroundColor: 'rgba(179, 229, 252, 0.5)',
                                border: '1px solid #2196f3',
                                borderRadius: '4px',
                                pointerEvents: 'none',
                                zIndex: 10,
                            }}
                        />
                    )}
                    {/* Finalized Event Blocks */}
                    {displayedEventBlocks.map(block => (
                        <FloatingEventBlock
                            key={block.id}
                            {...block}
                            onEdit={handleEditEntry}
                            onDelete={handleDeleteEntry}
                            onDragStart={handleEventDragStart}
                            onResizeStart={handleEventResizeStart}
                        />
                    ))}
                </TableContainer>
            </Paper>

            {/* Dialog for creating a new classroom with NewClassroomForm */}
            <Dialog open={openNewClassroomFormDialog} onClose={() => setOpenNewClassroomFormDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>Δημιουργία Νέου Τμήματος</DialogTitle>
                <DialogContent dividers>
                    {newClassroomInitialSchedule && (
                        <NewClassroomForm
                            navigateTo={() => {}} // No navigation needed within dialog
                            classroomToEdit={null} // Always null for new creation
                            setClassroomToEdit={() => {}} // No setter needed for new creation
                            initialSchedule={newClassroomInitialSchedule}
                            onSaveSuccess={handleNewClassroomFormSaveSuccess} // Callback to close dialog
                            db={db} // Pass db instance
                            userId={userId} // Pass userId
                            appId={appId} // Pass appId
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenNewClassroomFormDialog(false)} color="primary">
                        Κλείσιμο
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Confirmation Dialog for Deleting a single Classroom */}
            <Dialog open={openDeleteConfirmDialog} onClose={handleCancelDelete}>
                <DialogTitle>Επιβεβαίωση Διαγραφής</DialogTitle>
                <DialogContent>
                    <Typography>Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το τμήμα; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancelDelete} color="primary">
                        Ακύρωση
                    </Button>
                    <Button onClick={handleConfirmDelete} color="error" variant="contained">
                        Διαγραφή
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Confirmation Dialog for Clearing All Classrooms */}
            <Dialog open={openClearConfirmDialog} onClose={handleCancelClearSchedule}>
                <DialogTitle>Επιβεβαίωση Εκκαθάρισης Προγράμματος</DialogTitle>
                <DialogContent>
                    <Typography>Είστε σίγουροι ότι θέλετε να διαγράψετε ΟΛΑ τα τμήματα; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancelClearSchedule} color="primary">
                        Ακύρωση
                    </Button>
                    <Button onClick={handleConfirmClearSchedule} color="error" variant="contained">
                        Εκκαθάριση
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Schedule Entry Dialog (still used for editing individual event labels/colors, if desired) */}
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
                                size="small"
                                value={dialogLabel}
                                onChange={(e) => setDialogLabel(e.target.value)}
                                sx={{ mt: 2 }}
                            />
                            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="body1"><strong>Χρώμα:</strong></Typography>
                                <input
                                    type="color"
                                    value={dialogColor}
                                    onChange={(e) => setDialogColor(e.target.value)}
                                    style={{ width: '50px', height: '30px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                                />
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog} color="primary">
                        Ακύρωση
                    </Button>
                    <Button onClick={handleConfirmScheduleEntry} color="primary" variant="contained">
                        Ενημέρωση
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default WeeklyScheduleCalendar;
