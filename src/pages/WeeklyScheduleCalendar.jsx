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

// FloatingEventBlock Component
// This component renders an individual event block on the calendar.
const FloatingEventBlock = ({ id, day, startTime, endTime, label, left, top, width, height, onEdit, onDelete, onDragStart, onResizeStart }) => {
    return (
        <Box
            id={`event-block-${id}`} // Add an ID for easy lookup
            sx={{
                position: 'absolute',
                left: left,
                top: top,
                width: width,
                height: height,
                backgroundColor: '#2196f3', // Solid blue for finalized events
                color: '#fff',
                borderRadius: '4px',
                padding: '2px 4px',
                textAlign: 'left',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                zIndex: 5, // Below the active drag rect, but above table cells
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                cursor: 'grab', // Indicate draggable
                touchAction: 'none', // Prevent default touch actions like scrolling
            }}
            onMouseDown={(e) => onDragStart(e, id)} // Handle drag start for the block itself
        >
            {/* Top Resize Handle */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '8px', // Make it small
                    cursor: 'ns-resize', // North-south resize cursor
                    zIndex: 6, // Above the event content
                    // backgroundColor: 'rgba(255,255,255,0.3)', // For debugging, remove in production
                }}
                onMouseDown={(e) => onResizeStart(e, id, 'top')}
            />

            <Typography variant="caption" sx={{ fontWeight: 'bold', flexShrink: 0 }}>
                {label}
            </Typography>
            <Typography variant="caption" sx={{ flexShrink: 0 }}>
                {startTime} - {endTime}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: '2px', flexShrink: 0 }}>
                <IconButton
                    size="small"
                    sx={{ color: '#fff', padding: '2px' }}
                    onClick={(e) => { e.stopPropagation(); onEdit({ id, day, startTime, endTime, label }); }}
                >
                    <Edit sx={{ fontSize: '0.8rem' }} />
                </IconButton>
                <IconButton
                    size="small"
                    sx={{ color: '#fff', padding: '2px' }}
                    onClick={(e) => { e.stopPropagation(); onDelete(id); }}
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
                    height: '8px', // Make it small
                    cursor: 'ns-resize', // North-south resize cursor
                    zIndex: 6, // Above the event content
                    // backgroundColor: 'rgba(255,255,255,0.3)', // For debugging, remove in production
                }}
                onMouseDown={(e) => onResizeStart(e, id, 'bottom')}
            />
        </Box>
    );
};

function WeeklyScheduleCalendar() {
    // Calendar display hours
    const [calendarStartHour, setCalendarStartHour] = useState(8); // Default 8 AM
    const [calendarEndHour, setCalendarEndHour] = useState(20); // Default 8 PM

    // Generated time slots based on selected hours
    const TIME_SLOTS = useMemo(() => generateTimeSlots(calendarStartHour, calendarEndHour), [calendarStartHour, calendarEndHour]);

    // Dragging states for new selection
    const [isDraggingNewSelection, setIsDraggingNewSelection] = useState(false);
    const [startSelection, setStartSelection] = useState(null); // { dayIndex, hourIndex }
    const [endSelection, setEndSelection] = useState(null);   // { dayIndex, hourIndex }
    const [tempFloatingSelectionRect, setTempFloatingSelectionRect] = useState(null); // { left, top, width, height }

    // Dragging states for existing event blocks
    const [isDraggingEvent, setIsDraggingEvent] = useState(false);
    const [draggedEventId, setDraggedEventId] = useState(null);
    const [dragStartMousePos, setDragStartMousePos] = useState({ x: 0, y: 0 }); // Mouse position when drag started
    const [dragStartBlockPos, setDragStartBlockPos] = useState({ left: 0, top: 0 }); // Block position when drag started

    // Resizing states for existing event blocks
    const [isResizingEvent, setIsResizingEvent] = useState(false);
    const [resizedEventId, setResizedEventId] = useState(null);
    const [resizeHandle, setResizeHandle] = useState(null); // 'top' or 'bottom'
    const [resizeStartMouseY, setResizeStartMouseY] = useState(0); // Mouse Y position when resize started
    const [resizeStartBlockTop, setResizeStartBlockTop] = useState(0); // Block's top when resize started
    const [resizeStartBlockHeight, setResizeStartBlockHeight] = useState(0); // Block's height when resize started
    const [resizeStartHourIndex, setResizeStartHourIndex] = useState(null); // Original start hour index for resizing
    const [resizeEndHourIndex, setResizeEndHourIndex] = useState(null); // Original end hour index for resizing

    // State for the finalized event blocks displayed on the calendar
    const [displayedEventBlocks, setDisplayedEventBlocks] = useState([]); // { id, day, startTime, endTime, label, left, top, width, height }

    // Dialog states for confirming/editing schedule entry (still used for editing existing)
    const [openDialog, setOpenDialog] = useState(false);
    const [dialogEntry, setDialogEntry] = useState(null); // The entry being confirmed/edited
    const [dialogLabel, setDialogLabel] = useState('');

    // State for NewClassroomForm dialog
    const [openNewClassroomDialog, setOpenNewClassroomDialog] = useState(false);
    const [newClassroomInitialSchedule, setNewClassroomInitialSchedule] = useState(null);


    // Ref for the table container to calculate cell positions
    const tableRef = useRef(null);

    // Helper to get pixel coordinates and dimensions of a specific table cell
    const getCellPixelRect = useCallback((dayIdx, hourIdx) => {
        const table = tableRef.current;
        if (!table) return null;

        // Select the correct cell. +1 for 1-based indexing of tr, +2 for 1-based indexing of td (skipping time label column)
        const cellElement = table.querySelector(`tbody tr:nth-child(${hourIdx + 1}) td:nth-child(${dayIdx + 2})`);
        if (cellElement) {
            const cellRect = cellElement.getBoundingClientRect();
            // Get the bounding rect of the TableContainer, which is the positioning context for absolute elements
            const tableContainerRect = table.closest('.MuiTableContainer-root').getBoundingClientRect();

            // Return position relative to the TableContainer's top-left corner
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

        // Find dayIndex
        // Start from 1 to skip the first header cell (time label)
        const headerCells = table.querySelectorAll('thead th');
        let dayIndex = -1;
        for (let i = 1; i < headerCells.length; i++) {
            const cellRect = headerCells[i].getBoundingClientRect();
            if (pixelX >= cellRect.left && pixelX < cellRect.right) { // Use absolute pixelX for comparison
                dayIndex = i - 1; // Adjust for 0-based index of DAYS_OF_WEEK
                break;
            }
        }

        // Find hourIndex
        const bodyRows = table.querySelectorAll('tbody tr');
        let hourIndex = -1;
        for (let i = 0; i < bodyRows.length; i++) {
            const rowRect = bodyRows[i].getBoundingClientRect();
            if (pixelY >= rowRect.top && pixelY < rowRect.bottom) { // Use absolute pixelY for comparison
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

        // Ensure selection is within valid data columns (minDay >= 0)
        // This check is crucial to prevent the rectangle from extending into the time label column
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
                width: endCellRect.left + endCellRect.width - startCellRect.left,
                height: endCellRect.top + endCellRect.height - startCellRect.top,
            });
        } else {
            setTempFloatingSelectionRect(null);
        }
    }, [getCellPixelRect]);

    // Function to calculate and add a new displayed event block
    const addDisplayedEventBlock = useCallback((entry) => {
        const dayIdx = DAYS_OF_WEEK.indexOf(entry.day);
        const startHourIdx = TIME_SLOTS.indexOf(entry.startTime);
        const endHourIdx = TIME_SLOTS.indexOf(entry.endTime) -1 ; // -1 because endTime is exclusive in TIME_SLOTS

        if (dayIdx === -1 || startHourIdx === -1 || endHourIdx === -1) {
            console.error("Invalid day or time for event block:", entry);
            return;
        }

        const startCellRect = getCellPixelRect(dayIdx, startHourIdx);
        const endCellRect = getCellPixelRect(dayIdx, endHourIdx);

        if (startCellRect && endCellRect) {
            setDisplayedEventBlocks(prevBlocks => [
                ...prevBlocks,
                {
                    ...entry,
                    left: startCellRect.left,
                    top: startCellRect.top,
                    width: startCellRect.width, // Event block spans one column
                    height: endCellRect.top + endCellRect.height - startCellRect.top,
                }
            ]);
        }
    }, [getCellPixelRect, TIME_SLOTS]);

    // Handle mouse down to start a new selection on the grid
    const handleGridMouseDown = (e, dayIdx, hourIdx) => {
        if (e.button !== 0) return; // Only left mouse button

        // If we're already dragging/resizing an event, do nothing
        if (isDraggingEvent || isResizingEvent) return;

        // Clear any existing temporary floating selection when starting a new drag
        setTempFloatingSelectionRect(null);

        // Start new selection
        setIsDraggingNewSelection(true);
        setStartSelection({ dayIndex: dayIdx, hourIndex: hourIdx });
        setEndSelection({ dayIndex: dayIdx, hourIndex: hourIdx });
        updateTempFloatingSelectionRect({ dayIndex: dayIdx, hourIndex: hourIdx }, { dayIndex: dayIdx, hourIndex: hourIdx });
    };

    // Handle mouse down on an existing event block to start dragging
    const handleEventDragStart = useCallback((e, id) => {
        e.stopPropagation(); // Prevent grid's mousedown from firing
        if (e.button !== 0) return;

        setIsDraggingEvent(true);
        setDraggedEventId(id);
        setDragStartMousePos({ x: e.clientX, y: e.clientY });

        const blockElement = document.getElementById(`event-block-${id}`);
        if (blockElement) {
            const blockRect = blockElement.getBoundingClientRect();
            const tableContainerRect = tableRef.current.closest('.MuiTableContainer-root').getBoundingClientRect(); // Use table container rect
            setDragStartBlockPos({
                left: blockRect.left - tableContainerRect.left,
                top: blockRect.top - tableContainerRect.top
            });
        }
    }, []);

    // Handle mouse down on a resize handle to start resizing
    const handleEventResizeStart = useCallback((e, id, handle) => {
        e.stopPropagation(); // Prevent block's drag and grid's mousedown
        if (e.button !== 0) return;

        setIsResizingEvent(true);
        setResizedEventId(id);
        setResizeHandle(handle);
        setResizeStartMouseY(e.clientY);

        const blockElement = document.getElementById(`event-block-${id}`);
        if (blockElement) {
            const blockRect = blockElement.getBoundingClientRect();
            const tableContainerRect = tableRef.current.closest('.MuiTableContainer-root').getBoundingClientRect(); // Use table container rect
            setResizeStartBlockTop(blockRect.top - tableContainerRect.top);
            setResizeStartBlockHeight(blockRect.height);

            // Store original hour indices for snapping
            const originalEntry = displayedEventBlocks.find(block => block.id === id);
            if (originalEntry) {
                setResizeStartHourIndex(TIME_SLOTS.indexOf(originalEntry.startTime));
                setResizeEndHourIndex(TIME_SLOTS.indexOf(originalEntry.endTime) - 1);
            }
        }
    }, [displayedEventBlocks, TIME_SLOTS]);


    // Global mouse move handler for dragging and resizing
    const handleGlobalMouseMove = useCallback((e) => {
        if (isDraggingNewSelection) {
            const coords = getGridCoordinatesFromPixels(e.clientX, e.clientY);
            // Only update if coords are valid and within the data grid
            if (coords && coords.dayIndex >= 0) {
                setEndSelection(coords);
                updateTempFloatingSelectionRect(startSelection, coords);
            } else if (coords && coords.dayIndex < 0) {
                // If mouse moves into the time label column, clear temp rect
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
                    let newTop = block.top;
                    let newHeight = block.height;

                    if (resizeHandle === 'top') {
                        newTop = resizeStartBlockTop + dy;
                        newHeight = resizeStartBlockHeight - dy;
                    } else if (resizeHandle === 'bottom') {
                        newHeight = resizeStartBlockHeight + dy;
                    }

                    // Prevent negative height
                    newHeight = Math.max(newHeight, 10); // Minimum height of 10px

                    return {
                        ...block,
                        top: newTop,
                        height: newHeight,
                    };
                }
                return block;
            }));
        }
    }, [isDraggingNewSelection, startSelection, updateTempFloatingSelectionRect, isDraggingEvent, draggedEventId, dragStartMousePos, dragStartBlockPos, isResizingEvent, resizedEventId, resizeHandle, resizeStartMouseY, resizeStartBlockTop, resizeStartBlockHeight, getGridCoordinatesFromPixels]);


    // Global mouse up handler to finalize operations
    const handleGlobalMouseUp = useCallback(() => {
        if (isDraggingNewSelection) {
            if (startSelection && endSelection) {
                const normalizedStartDay = Math.min(startSelection.dayIndex, endSelection.dayIndex);
                const normalizedEndDay = Math.max(startSelection.dayIndex, endSelection.dayIndex);
                const normalizedStartHour = Math.min(startSelection.hourIndex, endSelection.hourIndex);
                const normalizedEndHour = Math.max(startSelection.hourIndex, endSelection.hourIndex);

                // Ensure a valid selection was made (not just a click on the time label column)
                if (normalizedStartDay < 0 || normalizedStartHour < 0) {
                    alert("Παρακαλώ επιλέξτε μια έγκυρη περιοχή στο πρόγραμμα.");
                    // Reset all states for new selection
                    setIsDraggingNewSelection(false);
                    setStartSelection(null);
                    setEndSelection(null);
                    setTempFloatingSelectionRect(null);
                    return;
                }

                const newEntry = {
                    id: Date.now(),
                    day: DAYS_OF_WEEK[normalizedStartDay],
                    startTime: TIME_SLOTS[normalizedStartHour],
                    endTime: TIME_SLOTS[normalizedEndHour + 1] || `${String(calendarEndHour).padStart(2, '0')}:00`,
                    label: `Νέο Μάθημα` // Default label
                };

                if (dayjs(`2000-01-01T${newEntry.endTime}`).isAfter(dayjs(`2000-01-01T${newEntry.startTime}`))) {
                    addDisplayedEventBlock(newEntry);
                    setNewClassroomInitialSchedule([{
                        id: newEntry.id,
                        day: newEntry.day,
                        startTime: newEntry.startTime,
                        endTime: newEntry.endTime,
                        duration: calculateDuration(newEntry.startTime, newEntry.endTime)
                    }]);
                    setOpenNewClassroomDialog(true);
                } else {
                    alert("Η επιλεγμένη χρονική διάρκεια δεν είναι έγκυρη.");
                }
            }
        } else if (isDraggingEvent) {
            const blockElement = document.getElementById(`event-block-${draggedEventId}`);
            if (blockElement) {
                const blockRect = blockElement.getBoundingClientRect();
                // We need to find the grid coordinates based on the center of the block for snapping
                const snappedCoords = getGridCoordinatesFromPixels(
                    blockRect.left + blockRect.width / 2,
                    blockRect.top + blockRect.height / 2
                );

                if (snappedCoords) {
                    const originalEntry = displayedEventBlocks.find(block => block.id === draggedEventId);
                    const originalDurationMinutes = dayjs(`2000-01-01T${originalEntry.endTime}`).diff(dayjs(`2000-01-01T${originalEntry.startTime}`), 'minute');
                    const originalDurationHours = originalDurationMinutes / 60;

                    const newStartTimeIndex = snappedCoords.hourIndex;
                    // Calculate new end time index based on duration
                    const newEndTimeIndex = newStartTimeIndex + originalDurationHours;
                    const newEndTime = TIME_SLOTS[newEndTimeIndex] || `${String(calendarEndHour).padStart(2, '0')}:00`;

                    const newDay = DAYS_OF_WEEK[snappedCoords.dayIndex];

                    setDisplayedEventBlocks(prevBlocks => prevBlocks.map(block => {
                        if (block.id === draggedEventId) {
                            const snappedStartCellRect = getCellPixelRect(snappedCoords.dayIndex, snappedCoords.hourIndex);
                            const snappedEndCellRect = getCellPixelRect(snappedCoords.dayIndex, TIME_SLOTS.indexOf(newEndTime) -1);

                            return {
                                ...block,
                                day: newDay,
                                startTime: TIME_SLOTS[newStartTimeIndex],
                                endTime: newEndTime,
                                duration: calculateDuration(TIME_SLOTS[newStartTimeIndex], newEndTime),
                                left: snappedStartCellRect.left,
                                top: snappedStartCellRect.top,
                                width: snappedStartCellRect.width,
                                height: snappedEndCellRect.top + snappedEndCellRect.height - snappedStartCellRect.top,
                            };
                        }
                        return block;
                    }));
                }
            }
        } else if (isResizingEvent) {
            const blockElement = document.getElementById(`event-block-${resizedEventId}`);
            if (blockElement) {
                const blockRect = blockElement.getBoundingClientRect();

                setDisplayedEventBlocks(prevBlocks => prevBlocks.map(block => {
                    if (block.id === resizedEventId) {
                        let newStartTime = block.startTime;
                        let newEndTime = block.endTime;

                        // Calculate snapped top/bottom based on current pixel position
                        const snappedTopHourIndex = getGridCoordinatesFromPixels(blockRect.left + 1, blockRect.top + 1)?.hourIndex;
                        const snappedBottomHourIndex = getGridCoordinatesFromPixels(blockRect.left + 1, blockRect.bottom - 1)?.hourIndex;

                        if (resizeHandle === 'top' && snappedTopHourIndex !== null && snappedTopHourIndex !== undefined) {
                            newStartTime = TIME_SLOTS[snappedTopHourIndex];
                        } else if (resizeHandle === 'bottom' && snappedBottomHourIndex !== null && snappedBottomHourIndex !== undefined) {
                            newEndTime = TIME_SLOTS[snappedBottomHourIndex + 1] || `${String(calendarEndHour).padStart(2, '0')}:00`;
                        }

                        // Ensure newStartTime is before newEndTime
                        const finalStartTimeIndex = TIME_SLOTS.indexOf(newStartTime);
                        const finalEndTimeIndex = TIME_SLOTS.indexOf(newEndTime);

                        if (finalStartTimeIndex >= finalEndTimeIndex) {
                            // Revert to original or smallest valid if invalid
                            newStartTime = TIME_SLOTS[resizeStartHourIndex];
                            newEndTime = TIME_SLOTS[resizeEndHourIndex + 1] || `${String(calendarEndHour).padStart(2, '0')}:00`;
                        }

                        // Recalculate pixel dimensions for the snapped block
                        const dayIdx = DAYS_OF_WEEK.indexOf(block.day);
                        const startHourIdx = TIME_SLOTS.indexOf(newStartTime);
                        const endHourIdx = TIME_SLOTS.indexOf(newEndTime) -1;

                        const snappedStartCellRect = getCellPixelRect(dayIdx, startHourIdx);
                        const snappedEndCellRect = getCellPixelRect(dayIdx, endHourIdx);

                        return {
                            ...block,
                            startTime: newStartTime,
                            endTime: newEndTime,
                            duration: calculateDuration(newStartTime, newEndTime),
                            top: snappedStartCellRect.top,
                            height: snappedEndCellRect.top + snappedEndCellRect.height - snappedStartCellRect.top,
                        };
                    }
                    return block;
                }));
            }
        }

        // Reset all states
        setIsDraggingNewSelection(false);
        setIsDraggingEvent(false);
        setIsResizingEvent(false);
        setStartSelection(null);
        setEndSelection(null);
        setTempFloatingSelectionRect(null);
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
    }, [isDraggingNewSelection, startSelection, endSelection, TIME_SLOTS, calendarEndHour, addDisplayedEventBlock, isDraggingEvent, draggedEventId, dragStartMousePos, dragStartBlockPos, isResizingEvent, resizedEventId, resizeHandle, resizeStartHourIndex, resizeEndHourIndex, getCellPixelRect, getGridCoordinatesFromPixels, displayedEventBlocks]);


    // Attach global mouse move and mouse up listeners
    useEffect(() => {
        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [handleGlobalMouseMove, handleGlobalMouseUp]);


    // Handle dialog close (for editing existing entries)
    const handleCloseDialog = () => {
        setOpenDialog(false);
        setDialogEntry(null);
        setDialogLabel('');
    };

    // Handle confirming an edited schedule entry from dialog
    const handleConfirmScheduleEntry = () => {
        if (dialogEntry) {
            const finalEntry = { ...dialogEntry, label: dialogLabel };
            // Update the existing block in displayedEventBlocks
            setDisplayedEventBlocks(prevBlocks => prevBlocks.map(block => {
                if (block.id === finalEntry.id) {
                    // Recalculate dimensions if time changed
                    const dayIdx = DAYS_OF_WEEK.indexOf(finalEntry.day);
                    const startHourIdx = TIME_SLOTS.indexOf(finalEntry.startTime);
                    const endHourIdx = TIME_SLOTS.indexOf(finalEntry.endTime) -1;

                    if (dayIdx !== -1 && startHourIdx !== -1 && endHourIdx !== -1) {
                        const startCellRect = getCellPixelRect(dayIdx, startHourIdx);
                        const endCellRect = getCellPixelRect(dayIdx, endHourIdx);
                        if (startCellRect && endCellRect) {
                            return {
                                ...finalEntry,
                                left: startCellRect.left,
                                top: startCellRect.top,
                                width: startCellRect.width,
                                height: endCellRect.top + endCellRect.height - startCellRect.top,
                            };
                        }
                    }
                }
                return block;
            }));
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
        setDisplayedEventBlocks(prevBlocks => prevBlocks.filter(block => block.id !== id));
    };

    const handleClearSchedule = () => {
        setDisplayedEventBlocks([]); // Clear all displayed blocks
        setTempFloatingSelectionRect(null); // Ensure temporary rect is also cleared
    };

    // Callback for when NewClassroomForm successfully saves
    const handleNewClassroomSaveSuccess = () => {
        setOpenNewClassroomDialog(false); // Close the NewClassroomForm dialog
        setNewClassroomInitialSchedule(null); // Clear the initial schedule
        // The event block is already displayed, no need to re-add.
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
                        // Disable text selection when dragging for new selection
                        userSelect: isDraggingNewSelection ? 'none' : 'auto',
                        WebkitUserSelect: isDraggingNewSelection ? 'none' : 'auto', // For WebKit browsers
                        cursor: isDraggingNewSelection ? 'grabbing' : 'auto', // Consistent cursor during drag
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
                                    {/* Time Label Cell - No mouse events for selection/interaction */}
                                    <TableCell
                                        sx={{
                                            fontWeight: 'bold',
                                            backgroundColor: '#f5f5f5',
                                            pointerEvents: 'none' // Ensure no mouse events are captured by this cell
                                        }}
                                    >
                                        {time}
                                    </TableCell>
                                    {DAYS_OF_WEEK.map((day, dayIndex) => {
                                        return (
                                            <TableCell
                                                key={`${day}-${time}`}
                                                onMouseDown={(e) => handleGridMouseDown(e, dayIndex, hourIndex)} // Only for data cells
                                                onMouseEnter={() => {
                                                    if (isDraggingNewSelection) {
                                                        const coords = { dayIndex, hourIndex };
                                                        // Ensure mouse is over a valid data cell before updating selection
                                                        if (coords.dayIndex >= 0) {
                                                            setEndSelection(coords);
                                                            updateTempFloatingSelectionRect(startSelection, coords);
                                                        } else {
                                                            setTempFloatingSelectionRect(null); // Clear if dragging outside valid data cells
                                                        }
                                                    }
                                                }}
                                                // MouseUp is handled globally for all drag/resize operations
                                                sx={{
                                                    border: '1px solid #e0e0e0',
                                                    backgroundColor: 'inherit', // Cells remain transparent
                                                    cursor: isDraggingNewSelection ? 'grabbing' : 'pointer',
                                                    position: 'relative',
                                                    verticalAlign: 'top',
                                                    fontSize: '0.75rem',
                                                    padding: '4px',
                                                    '&:hover': {
                                                        backgroundColor: '#f0f0f0', // Only hover effect for empty cells
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
                                backgroundColor: 'rgba(179, 229, 252, 0.5)', // Light blue with transparency
                                border: '1px solid #2196f3',
                                borderRadius: '4px',
                                pointerEvents: 'none', // Allow mouse events to pass through to cells
                                zIndex: 10, // Ensure it's on top of everything during drag
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

            {/* Schedule Entry Dialog (still used for editing existing entries) */}
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
                        Ενημέρωση
                    </Button>
                </DialogActions>
            </Dialog>

            {/* NewClassroomForm Dialog */}
            <Dialog open={openNewClassroomDialog} onClose={() => setOpenNewClassroomDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>Δημιουργία Νέου Τμήματος</DialogTitle>
                <DialogContent dividers>
                    <NewClassroomForm
                        navigateTo={() => {}}
                        classroomToEdit={null}
                        setClassroomToEdit={() => {}}
                        initialSchedule={newClassroomInitialSchedule}
                        onSaveSuccess={handleNewClassroomSaveSuccess}
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
