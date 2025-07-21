// src/components/WeeklyScheduleCalendar.jsx
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
    Box, Container, Paper, Typography, Button, IconButton,
    FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle,
    DialogContent, DialogActions, TextField
} from '@mui/material';
import { ClearAll, Save, Add, Edit, Delete, CheckCircleOutline } from '@mui/icons-material';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'; // Import the plugin
dayjs.extend(duration);
dayjs.extend(isSameOrBefore); // Extend the plugin

// Firebase Imports
import { doc, deleteDoc, collection, query, getDocs, updateDoc } from 'firebase/firestore';

// Import NewClassroomForm to be used in the dialog
import NewClassroomForm from './NewClassroomForm.jsx';

// Define the days of the week (excluding Sunday)
const DAYS_OF_WEEK = ['Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];

// Define constants for grid offsets
const TIME_COLUMN_WIDTH_PX = 80; // Width of the time column as defined in gridTemplateColumns
const HEADER_ROW_HEIGHT_PX = 40; // Height of the header row as defined in gridAutoRows

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

function WeeklyScheduleCalendar({ classrooms, loading, onCreateClassroomFromCalendar, onEditClassroom, navigateTo, db, userId, appId }) {
    // Calendar display hours
    const [calendarStartHour, setCalendarStartHour] = useState(8);
    const [calendarEndHour, setCalendarEndHour] = useState(20);

    // Generated time slots based on selected hours
    const TIME_SLOTS = useMemo(() => generateTimeSlots(calendarStartHour, calendarEndHour), [calendarStartHour, calendarEndHour]);

    // Refs for grid dimensions
    const gridContainerRef = useRef(null);
    const [gridDimensions, setGridDimensions] = useState({ width: 0, height: 0, cellWidth: 0, cellHeight: 40 }); // Default cell height

    // Calculate grid dimensions on mount and resize
    useEffect(() => {
        const updateGridDimensions = () => {
            if (gridContainerRef.current) {
                const rect = gridContainerRef.current.getBoundingClientRect();
                const numDays = DAYS_OF_WEEK.length;

                // Calculate the width available for the data columns (total width - time column width)
                const availableWidthForDataColumns = rect.width - TIME_COLUMN_WIDTH_PX;
                const cellWidth = availableWidthForDataColumns / numDays; // This is the width of each '1fr' column

                const cellHeight = 40; // Example fixed height per 30-min slot

                setGridDimensions({
                    width: rect.width,
                    height: rect.height,
                    cellWidth: cellWidth,
                    cellHeight: cellHeight,
                });
            }
        };

        updateGridDimensions(); // Initial calculation
        window.addEventListener('resize', updateGridDimensions);
        return () => window.removeEventListener('resize', updateGridDimensions);
    }, [TIME_SLOTS]); // Recalculate if TIME_SLOTS change (due to hour selection)

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
    const [originalDraggedBlockProps, setOriginalDraggedBlockProps] = useState(null); // Store original props for revert

    // Resizing states for existing event blocks
    const [isResizingEvent, setIsResizingEvent] = useState(false);
    const [resizedEventId, setResizedEventId] = useState(null);
    const [resizeHandle, setResizeHandle] = useState(null);
    const [resizeStartMouseY, setResizeStartMouseY] = useState(0);
    const [resizeStartBlockTop, setResizeStartBlockTop] = useState(0);
    const [resizeStartBlockHeight, setResizeStartBlockHeight] = useState(0);
    const [originalResizedBlockProps, setOriginalResizedBlockProps] = useState(null); // Store original props for revert

    // State for the finalized event blocks displayed on the calendar
    const [displayedEventBlocks, setDisplayedEventBlocks] = useState([]);

    // Dialog states for editing individual schedule entry (label/color)
    const [openDialog, setOpenDialog] = useState(false);
    const [dialogEntry, setDialogEntry] = useState(null);
    const [dialogLabel, setDialogLabel] = '';
    const [dialogColor, setDialogColor] = '#2196f3';

    // State for the new classroom creation dialog (now holds NewClassroomForm)
    const [openNewClassroomFormDialog, setOpenNewClassroomFormDialog] = useState(false);
    const [newClassroomInitialSchedule, setNewClassroomInitialSchedule] = useState(null);

    // States for custom confirmation dialogs
    const [openDeleteConfirmDialog, setOpenDeleteConfirmDialog] = useState(false);
    const [classroomIdToDelete, setClassroomIdToDelete] = useState(null);
    const [openClearConfirmDialog, setOpenClearConfirmDialog] = useState(false);

    // State for conflict error dialog
    const [openConflictDialog, setOpenConflictDialog] = useState(false);
    const [conflictMessage, setConflictMessage] = useState('');


    // Helper to get grid coordinates from pixel coordinates relative to the grid container
    const getGridCoordinatesFromPixels = useCallback((pixelX, pixelY) => {
        const { cellWidth, cellHeight } = gridDimensions;
        if (cellWidth === 0 || cellHeight === 0) return null;

        // Adjust pixelX and pixelY to be relative to the top-left of the *data grid area*
        const adjustedPixelX = pixelX - TIME_COLUMN_WIDTH_PX;
        const adjustedPixelY = pixelY - HEADER_ROW_HEIGHT_PX;

        const dayIndex = Math.floor(adjustedPixelX / cellWidth);
        const hourIndex = Math.floor(adjustedPixelY / cellHeight);

        // Ensure indices are within valid bounds
        if (dayIndex >= 0 && dayIndex < DAYS_OF_WEEK.length &&
            hourIndex >= 0 && hourIndex < TIME_SLOTS.length) {
            return { dayIndex, hourIndex };
        }
        return null;
    }, [gridDimensions, TIME_SLOTS]);

    // Helper to update the temporary floating selection rectangle's state
    const updateTempFloatingSelectionRect = useCallback((startCoords, endCoords) => {
        const { cellWidth, cellHeight } = gridDimensions; // Destructure here
        if (!startCoords || !endCoords || cellWidth === 0 || cellHeight === 0) {
            setTempFloatingSelectionRect(null);
            return;
        }

        const minDay = Math.min(startCoords.dayIndex, endCoords.dayIndex);
        const maxDay = Math.max(startCoords.dayIndex, endCoords.dayIndex);
        const minHour = Math.min(startCoords.hourIndex, endCoords.hourIndex);
        const maxHour = Math.max(startCoords.hourIndex, endCoords.hourIndex);

        // Calculate positions and dimensions directly using gridDimensions and offsets
        const left = TIME_COLUMN_WIDTH_PX + (minDay * cellWidth);
        const top = HEADER_ROW_HEIGHT_PX + (minHour * cellHeight);
        const width = (maxDay - minDay + 1) * cellWidth - 2; // Adjusted for 1px left/right borders of grid cells
        const height = (maxHour - minHour + 1) * cellHeight;

        setTempFloatingSelectionRect({ left, top, width, height });
    }, [gridDimensions]); // Dependency on gridDimensions


    // Function to transform classrooms data into displayedEventBlocks
    const transformClassroomsToEvents = useCallback((classroomsData) => {
        const events = [];
        const { cellWidth, cellHeight } = gridDimensions;

        if (cellWidth === 0 || cellHeight === 0) {
            return [];
        }

        classroomsData.forEach(classroom => {
            if (classroom.schedule && Array.isArray(classroom.schedule)) {
                classroom.schedule.forEach((slot, index) => {
                    const dayIdx = DAYS_OF_WEEK.indexOf(slot.day);
                    if (dayIdx === -1) {
                        console.warn(`Skipping event for classroom ${classroom.id} due to invalid day: ${slot.day}`);
                        return;
                    }

                    const startHourIdx = TIME_SLOTS.indexOf(slot.startTime);
                    const endHourIdx = TIME_SLOTS.indexOf(slot.endTime);

                    if (startHourIdx === -1 || endHourIdx === -1 || startHourIdx >= endHourIdx) {
                        console.warn(`Invalid time slot for classroom event:`, slot);
                        return;
                    }

                    // Calculate position and dimensions based on grid dimensions and offsets
                    const left = TIME_COLUMN_WIDTH_PX + (dayIdx * cellWidth);
                    const top = HEADER_ROW_HEIGHT_PX + (startHourIdx * cellHeight);
                    const width = cellWidth - 2; // Adjusted for 1px left/right borders of grid cells
                    const durationMinutes = dayjs(`2000-01-01T${slot.endTime}`).diff(dayjs(`2000-01-01T${slot.startTime}`), 'minute');
                    const height = (durationMinutes / 30) * cellHeight;

                    events.push({
                        id: classroom.id + '-' + index, // Unique ID for each schedule slot
                        day: slot.day,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        subject: classroom.subject,
                        grade: classroom.grade,
                        enrolledStudents: classroom.enrolledStudents,
                        maxStudents: classroom.maxStudents,
                        backgroundColor: classroom.color || '#2196f3',
                        left: left,
                        top: top,
                        width: width,
                        height: height,
                        fullClassroomData: classroom,
                    });
                });
            }
        });
        return events;
    }, [gridDimensions, TIME_SLOTS]);

    // Update displayedEventBlocks when classrooms or gridDimensions change
    useEffect(() => {
        if (classrooms) {
            setDisplayedEventBlocks(transformClassroomsToEvents(classrooms));
        }
    }, [classrooms, transformClassroomsToEvents, gridDimensions]);


    // Helper function to check for overlaps
    const checkOverlap = useCallback((targetClassroomId, targetDay, targetStartTimeStr, targetEndTimeStr, allClassroomsData) => {
        const targetStart = dayjs(`2000-01-01T${targetStartTimeStr}`);
        const targetEnd = dayjs(`2000-01-01T${targetEndTimeStr}`);

        if (!targetStart.isValid() || !targetEnd.isValid() || targetEnd.isSameOrBefore(targetStart)) {
            return true; // Invalid time range, treat as overlap to prevent saving
        }

        for (const classroom of allClassroomsData) {
            // Skip the classroom being updated/deleted
            if (classroom.id === targetClassroomId) {
                continue;
            }

            if (classroom.schedule && Array.isArray(classroom.schedule)) {
                for (const slot of classroom.schedule) {
                    if (slot.day === targetDay) {
                        const existingStart = dayjs(`2000-01-01T${slot.startTime}`);
                        const existingEnd = dayjs(`2000-01-01T${slot.endTime}`);

                        // Check for overlap: (StartA < EndB) && (EndA > StartB)
                        if (targetStart.isBefore(existingEnd) && targetEnd.isAfter(existingStart)) {
                            return true; // Overlap detected
                        }
                    }
                }
            }
        }
        return false; // No overlap
    }, []);


    // Handle mouse down to start a new selection on the grid
    const handleGridMouseDown = (e, dayIdx, hourIdx) => {
        if (e.button !== 0) return;
        e.preventDefault();

        const gridRect = gridContainerRef.current.getBoundingClientRect();
        const mouseXRelativeToGrid = e.clientX - gridRect.left;
        const mouseYRelativeToGrid = e.clientY - gridRect.top;

        const startCoords = getGridCoordinatesFromPixels(mouseXRelativeToGrid, mouseYRelativeToGrid);

        if (startCoords) {
            setIsDraggingNewSelection(true);
            setStartSelection(startCoords);
            setEndSelection(startCoords);
            updateTempFloatingSelectionRect(startCoords, startCoords);
        }
    };

    // Handle mouse down on an existing event block to start dragging
    const handleEventDragStart = useCallback((e, id) => {
        if (!db || !appId) {
            console.warn("Firebase DB or App ID not initialized. Cannot start drag operation.");
            setOpenConflictDialog(true);
            setConflictMessage("Σφάλμα: Η βάση δεδομένων ή το αναγνωριστικό εφαρμογής δεν είναι διαθέσιμα. Παρακαλώ περιμένετε να φορτώσει η εφαρμογή.");
            return;
        }

        e.stopPropagation();
        if (e.button !== 0) return;
        e.preventDefault();

        setIsDraggingEvent(true);
        setDraggedEventId(id);
        setDragStartMousePos({ x: e.clientX, y: e.clientY });

        const blockElement = document.getElementById(`event-block-${id}`);
        if (blockElement) {
            const blockRect = blockElement.getBoundingClientRect();
            const gridRect = gridContainerRef.current.getBoundingClientRect();
            const currentLeft = blockRect.left - gridRect.left;
            const currentTop = blockRect.top - gridRect.top;

            setOriginalDraggedBlockProps({ left: currentLeft, top: currentTop });
            setDragStartBlockPos({ left: currentLeft, top: currentTop });
        }
    }, [db, appId]);

    // Handle mouse down on a resize handle to start resizing
    const handleEventResizeStart = useCallback((e, id, handle) => {
        if (!db || !appId) {
            console.warn("Firebase DB or App ID not initialized. Cannot start resize operation.");
            setOpenConflictDialog(true);
            setConflictMessage("Σφάλμα: Η βάση δεδομένων ή το αναγνωριστικό εφαρμογής δεν είναι διαθέσιμα. Παρακαλώ περιμένετε να φορτώσει η εφαρμογή.");
            return;
        }

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
            const gridRect = gridContainerRef.current.getBoundingClientRect();
            const currentTop = blockRect.top - gridRect.top;
            const currentHeight = blockRect.height;

            setOriginalResizedBlockProps({ top: currentTop, height: currentHeight });
            setResizeStartBlockTop(currentTop);
            setResizeStartBlockHeight(currentHeight);
        }
    }, [db, appId]);


    // Global mouse move handler for dragging and resizing
    const handleGlobalMouseMove = useCallback((e) => {
        e.preventDefault();
        const { cellWidth, cellHeight } = gridDimensions;
        const gridRect = gridContainerRef.current.getBoundingClientRect();

        if (isDraggingNewSelection) {
            const mouseXRelativeToGrid = e.clientX - gridRect.left;
            const mouseYRelativeToGrid = e.clientY - gridRect.top;
            const coords = getGridCoordinatesFromPixels(mouseXRelativeToGrid, mouseYRelativeToGrid);
            if (coords) {
                setEndSelection(coords);
                updateTempFloatingSelectionRect(startSelection, coords);
            } else {
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

                    // Snap to the nearest cellHeight multiple
                    // This part is for visual snapping during drag/resize, not final persistence
                    if (resizeHandle === 'top') {
                        newTop = Math.round((newTop - HEADER_ROW_HEIGHT_PX) / cellHeight) * cellHeight + HEADER_ROW_HEIGHT_PX;
                        newHeight = resizeStartBlockHeight + (resizeStartBlockTop - newTop);
                    } else if (resizeHandle === 'bottom') {
                        newHeight = Math.round(newHeight / cellHeight) * cellHeight;
                    }

                    newHeight = Math.max(newHeight, cellHeight); // Minimum height is one cell

                    return {
                        ...block,
                        top: newTop,
                        height: newHeight,
                    };
                }
                return block;
            }));
        }
    }, [isDraggingNewSelection, startSelection, updateTempFloatingSelectionRect, isDraggingEvent, draggedEventId, dragStartMousePos, dragStartBlockPos, isResizingEvent, resizedEventId, resizeHandle, resizeStartMouseY, resizeStartBlockTop, resizeStartBlockHeight, getGridCoordinatesFromPixels, displayedEventBlocks, gridDimensions]);


    // Global mouse up handler to finalize operations
    const handleGlobalMouseUp = useCallback(async () => {
        // Reset all dragging/resizing states immediately
        setIsDraggingNewSelection(false);
        setIsDraggingEvent(false);
        setIsResizingEvent(false);
        setTempFloatingSelectionRect(null);
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
        setOriginalDraggedBlockProps(null);
        setOriginalResizedBlockProps(null);

        if (!db || !appId) {
            console.error("CRITICAL: Firestore DB or appId is null/undefined during mouseUp. Preventing update.");
            setOpenConflictDialog(true);
            setConflictMessage("Σφάλμα: Η βάση δεδομένων ή το αναγνωριστικό εφαρμογής δεν είναι διαθέσιμα. Παρακαλώ δοκιμάστε ξανά.");
            return;
        }

        const { cellWidth, cellHeight } = gridDimensions;

        if (isDraggingNewSelection && startSelection && endSelection) {
            if (startSelection.dayIndex !== endSelection.dayIndex || startSelection.hourIndex !== endSelection.hourIndex) {
                const normalizedStartDay = Math.min(startSelection.dayIndex, endSelection.dayIndex);
                const normalizedEndDay = Math.max(startSelection.dayIndex, endSelection.dayIndex);
                const normalizedStartHour = Math.min(startSelection.hourIndex, endSelection.hourIndex);
                const normalizedEndHour = Math.max(startSelection.hourIndex, endSelection.hourIndex);

                if (normalizedStartDay < 0 || normalizedStartHour < 0) {
                    setOpenConflictDialog(true);
                    setConflictMessage("Παρακαλώ επιλέξτε μια έγκυρη περιοχή στο πρόγραμμα.");
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
                    onCreateClassroomFromCalendar([newEntry]);
                } else {
                    setOpenConflictDialog(true);
                    setConflictMessage("Η επιλεγμένη χρονική διάρκεια δεν είναι έγκυρη.");
                }
            }
        } else if (isDraggingEvent && draggedEventId) {
            const blockElement = document.getElementById(`event-block-${draggedEventId}`);
            if (blockElement) {
                const blockRect = blockElement.getBoundingClientRect();
                const gridRect = gridContainerRef.current.getBoundingClientRect();

                // Get the current top and left positions of the block relative to the grid container
                const currentBlockTopRelativeToGrid = blockRect.top - gridRect.top;
                const currentBlockLeftRelativeToGrid = blockRect.left - gridRect.left;

                // Adjust for the header row height to get position relative to the data grid's top
                const adjustedTopForSnapping = currentBlockTopRelativeToGrid - HEADER_ROW_HEIGHT_PX;
                // Adjust for the time column width to get position relative to the data grid's left
                const adjustedLeftForSnapping = currentBlockLeftRelativeToGrid - TIME_COLUMN_WIDTH_PX;

                // Calculate the snapped hour index using Math.round for nearest cell
                const snappedHourIndex = Math.max(0, Math.round(adjustedTopForSnapping / cellHeight));
                // Calculate the snapped day index using Math.round for nearest cell
                const snappedDayIndex = Math.max(0, Math.round(adjustedLeftForSnapping / cellWidth));

                // Find the original event block to get its duration
                const originalEventBlock = displayedEventBlocks.find(block => block.id === draggedEventId);

                if (originalEventBlock) {
                    const originalStartTimeMoment = dayjs(`2000-01-01T${originalEventBlock.startTime}`);
                    const originalEndTimeMoment = dayjs(`2000-01-01T${originalEventBlock.endTime}`);
                    const originalDurationMinutes = originalEndTimeMoment.diff(originalStartTimeMoment, 'minute');

                    const newDay = DAYS_OF_WEEK[snappedDayIndex];
                    const newStartTime = TIME_SLOTS[snappedHourIndex];

                    if (newDay === undefined || newStartTime === undefined) {
                        // Revert to original position if outside valid grid area
                        setOpenConflictDialog(true);
                        setConflictMessage("Η μεταφορά ολοκληρώθηκε εκτός έγκυρης περιοχής προγράμματος. Το τμήμα δεν ενημερώθηκε.");
                        if (originalDraggedBlockProps) {
                            setDisplayedEventBlocks(prevBlocks => prevBlocks.map(block =>
                                block.id === draggedEventId ? { ...block, left: originalDraggedBlockProps.left, top: originalDraggedBlockProps.top } : block
                            ));
                        }
                        return;
                    }

                    const newStartMoment = dayjs(`2000-01-01T${newStartTime}`);
                    const newEndMoment = newStartMoment.add(originalDurationMinutes, 'minute');
                    const newEndTime = newEndMoment.format('HH:mm');

                    const classroomToUpdate = classrooms.find(cls =>
                        cls.schedule.some((slot, idx) => `${cls.id}-${idx}` === draggedEventId)
                    );

                    if (classroomToUpdate) {
                        const isOverlapping = checkOverlap(classroomToUpdate.id, newDay, newStartTime, newEndTime, classrooms.filter(cls => cls.id !== classroomToUpdate.id));

                        if (isOverlapping) {
                            setOpenConflictDialog(true);
                            setConflictMessage("Αυτό το τμήμα επικαλύπτεται με ένα υπάρχον μάθημα. Παρακαλώ επιλέξτε διαφορετική ώρα ή ημέρα.");
                            if (originalDraggedBlockProps) {
                                setDisplayedEventBlocks(prevBlocks => prevBlocks.map(block =>
                                    block.id === draggedEventId ? { ...block, left: originalDraggedBlockProps.left, top: originalDraggedBlockProps.top } : block
                                ));
                            }
                            return;
                        }

                        const updatedSchedule = classroomToUpdate.schedule.map((slot, idx) => {
                            if (`${classroomToUpdate.id}-${idx}` === draggedEventId) {
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
                        } catch (error) {
                            console.error("Error updating classroom schedule after drag:", error);
                            setOpenConflictDialog(true);
                            setConflictMessage("Αποτυχία ενημέρωσης προγράμματος μετά τη μεταφορά.");
                            if (originalDraggedBlockProps) {
                                setDisplayedEventBlocks(prevBlocks => prevBlocks.map(block =>
                                    block.id === draggedEventId ? { ...block, left: originalDraggedBlockProps.left, top: originalDraggedBlockProps.top } : block
                                ));
                            }
                        }
                    }
                }
            }
        } else if (isResizingEvent && resizedEventId) {
            const blockElement = document.getElementById(`event-block-${resizedEventId}`);
            if (blockElement) {
                const blockRect = blockElement.getBoundingClientRect();
                const gridRect = gridContainerRef.current.getBoundingClientRect();

                const currentBlockTopRelativeToGrid = blockRect.top - gridRect.top;
                const currentBlockBottomRelativeToGrid = blockRect.bottom - gridRect.top;

                let snappedTopHourIndex;
                let snappedBottomHourIndex;

                // Calculate snapped indices relative to the data grid area
                if (resizeHandle === 'top') {
                    snappedTopHourIndex = Math.max(0, Math.round((currentBlockTopRelativeToGrid - HEADER_ROW_HEIGHT_PX) / cellHeight));
                    // For top resize, the bottom remains fixed relative to its original snapped position
                    const originalEventBlock = displayedEventBlocks.find(block => block.id === resizedEventId);
                    if (originalEventBlock) {
                        // Find the original end hour index from TIME_SLOTS
                        snappedBottomHourIndex = TIME_SLOTS.indexOf(originalEventBlock.endTime);
                        if (snappedBottomHourIndex === -1) {
                            // Fallback if original end time is not found in TIME_SLOTS, e.g., 20:00
                            snappedBottomHourIndex = TIME_SLOTS.length -1; // Assume last slot
                        }
                    }
                } else if (resizeHandle === 'bottom') {
                    snappedBottomHourIndex = Math.max(0, Math.round((currentBlockBottomRelativeToGrid - HEADER_ROW_HEIGHT_PX) / cellHeight));
                    // For bottom resize, the top remains fixed relative to its original snapped position
                    const originalEventBlock = displayedEventBlocks.find(block => block.id === resizedEventId);
                    if (originalEventBlock) {
                        // Find the original start hour index from TIME_SLOTS
                        snappedTopHourIndex = TIME_SLOTS.indexOf(originalEventBlock.startTime);
                        if (snappedTopHourIndex === -1) {
                            snappedTopHourIndex = 0; // Fallback to first slot
                        }
                    }
                }


                let newStartTime = null;
                let newEndTime = null;
                const originalEventBlock = displayedEventBlocks.find(block => block.id === resizedEventId);

                if (!originalEventBlock) {
                    console.error("Original event block not found for resizing. ID:", resizedEventId);
                    return;
                }

                // Determine new start/end times based on the snapped indices
                if (resizeHandle === 'top') {
                    newStartTime = TIME_SLOTS[snappedTopHourIndex];
                    newEndTime = originalEventBlock.endTime; // End time remains the same
                } else if (resizeHandle === 'bottom') {
                    newStartTime = originalEventBlock.startTime; // Start time remains the same
                    newEndTime = TIME_SLOTS[snappedBottomHourIndex];
                }

                if (newStartTime === undefined || newEndTime === undefined) {
                    setOpenConflictDialog(true);
                    setConflictMessage("Η αλλαγή μεγέθους ολοκληρώθηκε εκτός έγκυρης περιοχής προγράμματος. Το τμήμα δεν ενημερώθηκε.");
                    if (originalResizedBlockProps) {
                        setDisplayedEventBlocks(prevBlocks => prevBlocks.map(block =>
                            block.id === resizedEventId ? { ...block, top: originalResizedBlockProps.top, height: originalResizedBlockProps.height } : block
                        ));
                    }
                    return;
                }

                const startMoment = dayjs(`2000-01-01T${newStartTime}`);
                const endMoment = dayjs(`2000-01-01T${newEndTime}`);

                if (startMoment.isBefore(endMoment)) {
                    const classroomToUpdate = classrooms.find(cls =>
                        cls.schedule.some((slot, idx) => `${cls.id}-${idx}` === resizedEventId)
                    );

                    if (classroomToUpdate) {
                        const isOverlapping = checkOverlap(classroomToUpdate.id, originalEventBlock.day, newStartTime, newEndTime, classrooms.filter(cls => cls.id !== classroomToUpdate.id));

                        if (isOverlapping) {
                            setOpenConflictDialog(true);
                            setConflictMessage("Αυτό το τμήμα επικαλύπτεται με ένα υπάρχον μάθημα. Παρακαλώ επιλέξτε διαφορετική ώρα.");
                            if (originalResizedBlockProps) {
                                setDisplayedEventBlocks(prevBlocks => prevBlocks.map(block =>
                                    block.id === resizedEventId ? { ...block, top: originalResizedBlockProps.top, height: originalResizedBlockProps.height } : block
                                ));
                            }
                            return;
                        }

                        const updatedSchedule = classroomToUpdate.schedule.map((slot, idx) => {
                            if (`${classroomToUpdate.id}-${idx}` === resizedEventId) {
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
                        } catch (error) {
                            console.error("Error updating classroom schedule after resize:", error);
                            setOpenConflictDialog(true);
                            setConflictMessage("Αποτυχία ενημέρωσης προγράμματος μετά την αλλαγή μεγέζους.");
                            if (originalResizedBlockProps) {
                                setDisplayedEventBlocks(prevBlocks => prevBlocks.map(block =>
                                    block.id === resizedEventId ? { ...block, top: originalResizedBlockProps.top, height: originalResizedBlockProps.height } : block
                                ));
                            }
                        }
                    }
                } else {
                    setOpenConflictDialog(true);
                    setConflictMessage("Η ώρα λήξης δεν μπορεί να είναι πριν ή ίδια με την ώρα έναρξης.");
                    if (originalResizedBlockProps) {
                        setDisplayedEventBlocks(prevBlocks => prevBlocks.map(block =>
                            block.id === resizedEventId ? { ...block, top: originalResizedBlockProps.top, height: originalResizedBlockProps.height } : block
                        ));
                    }
                }
            }
        }
    }, [isDraggingNewSelection, startSelection, endSelection, TIME_SLOTS, calendarEndHour, onCreateClassroomFromCalendar, isDraggingEvent, draggedEventId, originalDraggedBlockProps, isResizingEvent, resizedEventId, resizeHandle, originalResizedBlockProps, getGridCoordinatesFromPixels, displayedEventBlocks, classrooms, db, appId, checkOverlap, gridDimensions]);


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
            if (!db || !appId) {
                console.error("Firestore DB or appId not initialized. Cannot update schedule entry.");
                setOpenConflictDialog(true);
                setConflictMessage("Σφάλμα: Η βάση δεδομένων ή το αναγνωριστικό εφαρμογής δεν είναι διαθέσιμα. Παρακαλώ δοκιμάστε ξανά.");
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

                const isOverlapping = checkOverlap(classroomToUpdate.id, dialogEntry.day, dialogEntry.startTime, dialogEntry.endTime, classrooms.filter(cls => cls.id !== classroomToUpdate.id));

                if (isOverlapping) {
                    setOpenConflictDialog(true);
                    setConflictMessage("Αυτό το τμήμα επικαλύπτεται με ένα υπάρχον μάθημα. Παρακαλώ επιλέξτε διαφορετική ώρα ή ημέρα.");
                    return;
                }

                try {
                    const classroomDocRef = doc(db, `artifacts/${appId}/public/data/classrooms`, classroomToUpdate.id);
                    await updateDoc(classroomDocRef, { schedule: updatedSchedule, color: finalEntry.backgroundColor });
                } catch (error) {
                    console.error("Error updating classroom schedule entry:", error);
                    setOpenConflictDialog(true);
                    setConflictMessage("Αποτυχία ενημέρωσης καταχώρησης προγράμματος.");
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
        setOpenDeleteConfirmDialog(false);

        if (!db || !classroomIdToDelete || !appId) {
            console.error("Firestore DB, classroomId, or appId not initialized. Cannot delete classroom.");
            setOpenConflictDialog(true);
            setConflictMessage("Σφάλμα: Η βάση δεδομένων, το αναγνωριστικό τμήματος ή το αναγνωριστικό εφαρμογής δεν είναι διαθέσιμα. Παρακαλώ δοκιμάστε ξανά.");
            return;
        }

        try {
            const classroomDocRef = doc(db, `artifacts/${appId}/public/data/classrooms`, classroomIdToDelete);
            await deleteDoc(classroomDocRef);
            setClassroomIdToDelete(null);
        } catch (error) {
            console.error("Error deleting classroom:", error);
            setOpenConflictDialog(true);
            setConflictMessage("Αποτυχία διαγραφής τμήματος. Παρακαλώ δοκιμάστε ξανά.");
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
        setOpenClearConfirmDialog(false);

        if (!db || !appId) {
            console.error("Firestore DB or appId not initialized. Cannot clear all classrooms.");
            setOpenConflictDialog(true);
            setConflictMessage("Σφάλμα: Η βάση δεδομένων ή το αναγνωριστικό εφαρμογής δεν είναι διαθέσιμα. Παρακαλώ δοκιμήστε ξανά.");
            return;
        }

        try {
            const classroomsCollectionRef = collection(db, `artifacts/${appId}/public/data/classrooms`);
            const q = query(classroomsCollectionRef);
            const snapshot = await getDocs(q);

            const deletePromises = snapshot.docs.map(docToDelete => deleteDoc(doc(db, `artifacts/${appId}/public/data/classrooms`, docToDelete.id)));
            await Promise.all(deletePromises);
        } catch (error) {
            console.error("Error clearing all classrooms:", error);
            setOpenConflictDialog(true);
            setConflictMessage("Αποτυχία εκκαθάρισης όλων των τμημάτων. Παρακαλώ δοκιμάστε ξανά.");
        }
    };

    const handleCancelClearSchedule = () => {
        setOpenClearConfirmDialog(false);
    };

    // Callback for NewClassroomForm when it successfully saves from within the dialog
    const handleNewClassroomFormSaveSuccess = () => {
        setOpenNewClassroomFormDialog(false);
        setNewClassroomInitialSchedule(null);
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
                        onClick={() => {
                            setOpenConflictDialog(true);
                            setConflictMessage("Η λειτουργία αποθήκευσης προγράμματος δεν είναι πλήρως υλοποιημένη. Τα τμήματα αποθηκεύονται αυτόματα καθώς τα δημιουργείτε ή τα τροποποιείτε.");
                        }}
                        sx={{ borderRadius: '8px' }}
                    >
                        Αποθήκευση Προγράμματος
                    </Button>
                </Box>

                <Box
                    ref={gridContainerRef}
                    sx={{
                        position: 'relative',
                        display: 'grid',
                        gridTemplateColumns: `${TIME_COLUMN_WIDTH_PX}px repeat(${DAYS_OF_WEEK.length}, 1fr)`, // Time column + Days columns
                        gridAutoRows: `${gridDimensions.cellHeight}px`, // Fixed row height
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        overflow: 'auto',
                        userSelect: isDraggingNewSelection ? 'none' : 'auto',
                        WebkitUserSelect: isDraggingNewSelection ? 'none' : 'auto',
                        cursor: isDraggingNewSelection ? 'grabbing' : 'auto',
                        minHeight: `${(TIME_SLOTS.length + 1) * gridDimensions.cellHeight}px`, // Minimum height based on slots + header
                    }}
                >
                    {/* Grid Header (Days of Week) */}
                    <Box sx={{ gridColumn: 'span 1', backgroundColor: '#1e86cc', color: '#fff', fontWeight: 'bold', padding: '10px', textAlign: 'center', borderRight: '1px solid #fff' }}>
                        Ώρα
                    </Box>
                    {DAYS_OF_WEEK.map(day => (
                        <Box key={day} sx={{ backgroundColor: '#1e86cc', color: '#fff', fontWeight: 'bold', padding: '10px', textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.2)' }}>
                            {day}
                        </Box>
                    ))}

                    {/* Grid Body (Time Slots and Cells) */}
                    {TIME_SLOTS.map((time, hourIndex) => (
                        <React.Fragment key={time}>
                            {/* Time Column */}
                            <Box sx={{
                                gridColumn: 'span 1',
                                border: '1px solid #e0e0e0',
                                borderTop: 'none',
                                backgroundColor: '#f5f5f5',
                                fontWeight: 'bold',
                                padding: '4px 8px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'flex-start',
                                fontSize: '0.75rem',
                            }}>
                                {time}
                            </Box>
                            {/* Data Cells */}
                            {DAYS_OF_WEEK.map((day, dayIndex) => (
                                <Box
                                    key={`${day}-${time}`}
                                    onMouseDown={(e) => handleGridMouseDown(e, dayIndex, hourIndex)}
                                    onMouseEnter={() => {
                                        if (isDraggingNewSelection) {
                                            const gridRect = gridContainerRef.current.getBoundingClientRect();
                                            const mouseXRelativeToGrid = e.clientX - gridRect.left;
                                            const mouseYRelativeToGrid = e.clientY - gridRect.top;
                                            const coords = getGridCoordinatesFromPixels(mouseXRelativeToGrid, mouseYRelativeToGrid);
                                            if (coords) {
                                                setEndSelection(coords);
                                                updateTempFloatingSelectionRect(startSelection, coords);
                                            } else {
                                                setTempFloatingSelectionRect(null);
                                            }
                                        }
                                    }}
                                    sx={{
                                        border: '1px solid #e0e0e0',
                                        borderTop: 'none',
                                        borderLeft: 'none',
                                        backgroundColor: 'inherit',
                                        cursor: isDraggingNewSelection ? 'grabbing' : 'pointer',
                                        position: 'relative', // For event blocks
                                        '&:hover': {
                                            backgroundColor: '#f0f0f0',
                                        },
                                    }}
                                />
                            ))}
                        </React.Fragment>
                    ))}

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
                </Box>
            </Paper>

            {/* Dialog for creating a new classroom with NewClassroomForm */}
            <Dialog open={openNewClassroomFormDialog} onClose={() => setOpenNewClassroomFormDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>Δημιουργία Νέου Τμήματος</DialogTitle>
                <DialogContent dividers>
                    {newClassroomInitialSchedule && (
                        <NewClassroomForm
                            navigateTo={() => {}}
                            classroomToEdit={null}
                            setClassroomToEdit={() => {}}
                            initialSchedule={newClassroomInitialSchedule}
                            onSaveSuccess={handleNewClassroomFormSaveSuccess}
                            db={db}
                            userId={userId}
                            appId={appId}
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
                    <Typography>Είστε σίγουροι ότι θέτετε να διαγράψετε αυτό το τμήμα; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.</Typography>
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
                    <Typography>Είστε σίγουροι ότι θέτετε να διαγράψετε ΟΛΑ τα τμήματα; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.</Typography>
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

            {/* Conflict Error Dialog */}
            <Dialog open={openConflictDialog} onClose={() => setOpenConflictDialog(false)}>
                <DialogTitle>Σφάλμα Προγράμματος</DialogTitle>
                <DialogContent>
                    <Typography>{conflictMessage}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenConflictDialog(false)} color="primary" variant="contained">
                        Εντάξει
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
