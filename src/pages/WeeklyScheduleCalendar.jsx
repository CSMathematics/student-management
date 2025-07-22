// src/components/WeeklyScheduleCalendar.jsx
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
    Box, Container, Paper, Typography, Button, IconButton,
    FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle,
    DialogContent, DialogActions, TextField
} from '@mui/material';
import { ClearAll, Save, Edit, Delete, CheckCircleOutline, Cancel } from '@mui/icons-material';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
dayjs.extend(duration);
dayjs.extend(isSameOrBefore);

import { doc, deleteDoc, collection, query, getDocs, updateDoc } from 'firebase/firestore';

const DAYS_OF_WEEK = ['Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];
const TIME_COLUMN_WIDTH_PX = 80;
const HEADER_ROW_HEIGHT_PX = 40;

const generateTimeSlots = (startHour, endHour) => {
    const slots = [];
    for (let h = startHour; h < endHour; h++) {
        slots.push(`${String(h).padStart(2, '0')}:00`);
        slots.push(`${String(h).padStart(2, '0')}:30`);
    }
    slots.push(`${String(endHour).padStart(2, '0')}:00`);
    return slots;
};

const calculateDuration = (startTimeStr, endTimeStr) => {
    if (!startTimeStr || !endTimeStr) return '';
    const start = dayjs(`2000-01-01T${startTimeStr}`);
    const end = dayjs(`2000-01-01T${endTimeStr}`);
    if (end.isBefore(start) || end.isSame(start)) return "Invalid Time";
    const diffMinutes = end.diff(start, 'minute');
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    let durationString = '';
    if (hours > 0) durationString += `${hours} ${hours > 1 ? 'ώρες' : 'ώρα'}`;
    if (minutes > 0) {
        if (hours > 0) durationString += ' και ';
        durationString += `${minutes} λεπτά`;
    }
    return durationString || '0 λεπτά';
};

const FloatingEventBlock = ({ id, startTime, endTime, subject, grade, enrolledStudents, maxStudents, left, top, width, height, backgroundColor, onEdit, onDelete, onDragStart, onResizeStart, fullClassroomData, onOpenColorPicker, onAddMoreHours }) => {
    const currentStudents = enrolledStudents ? enrolledStudents.length : 0;
    return (
        <Box
            id={`event-block-${id}`}
            sx={{
                position: 'absolute', left, top, width, height, backgroundColor: backgroundColor || '#2196f3',
                color: '#fff', borderRadius: '4px', padding: '5px', textAlign: 'left',
                overflow: 'hidden', zIndex: 5, boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                cursor: 'grab', touchAction: 'none', display: 'flex', flexDirection: 'column',
                justifyContent: 'space-between', fontSize: '0.75rem', boxSizing: 'border-box',
                transition: 'background-color 0.3s ease',
            }}
            onMouseDown={(e) => onDragStart(e, id)}
        >
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '8px', cursor: 'ns-resize', zIndex: 6 }} onMouseDown={(e) => onResizeStart(e, id, 'top')} />
            <Box sx={{ flexGrow: 1, overflow: 'hidden', pr: '40px' }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', textWrap: 'wrap', fontSize: '1rem', lineHeight: '1.25rem' }}>{subject}</Typography>
                <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold' }}>{grade}</Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>Μαθητές: {currentStudents}/{maxStudents}</Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>{startTime} - {endTime}</Typography>
            </Box>
            <Box sx={{ position: 'absolute', bottom: '2px', right: '2px', display: 'flex', gap: '2px', zIndex: 7 }}>
                <IconButton size="small" sx={{ color: '#fff', padding: '2px' }} onClick={(e) => { e.stopPropagation(); onAddMoreHours(fullClassroomData); }} title="Προσθήκη Ώρας">
                    <i className='fas fa-add fa-xs'></i>
                </IconButton>
                <IconButton size="small" sx={{ color: '#fff', padding: '2px' }} onClick={(e) => { e.stopPropagation(); onEdit(fullClassroomData); }} title="Επεξεργασία">
                    <i className="fa-solid fa-edit fa-2xs"></i>
                </IconButton>
                <IconButton size="small" sx={{ color: '#fff', padding: '2px' }} onClick={(e) => { e.stopPropagation(); onOpenColorPicker(fullClassroomData); }} title="Αλλαγή Χρώματος">
                    <i className="fa-solid fa-paintbrush fa-2xs"></i>
                </IconButton>
                <IconButton size="small" sx={{ color: '#fff', padding: '2px' }} onClick={(e) => { e.stopPropagation(); onDelete(fullClassroomData.id); }} title="Διαγραφή">
                    <Delete sx={{ fontSize: '0.8rem' }} />
                </IconButton>
            </Box>
            <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '8px', cursor: 'ns-resize', zIndex: 6 }} onMouseDown={(e) => onResizeStart(e, id, 'bottom')} />
        </Box>
    );
};

// The props are now passed from App.jsx
function WeeklyScheduleCalendar({ classrooms, loading, navigateTo, db, userId, appId }) {
    const [calendarStartHour, setCalendarStartHour] = useState(8);
    const [calendarEndHour, setCalendarEndHour] = useState(20);
    const TIME_SLOTS = useMemo(() => generateTimeSlots(calendarStartHour, calendarEndHour), [calendarStartHour, calendarEndHour]);
    const gridContainerRef = useRef(null);
    const [gridDimensions, setGridDimensions] = useState({ width: 0, height: 0, cellWidth: 0, cellHeight: 40 });

    useEffect(() => {
        const updateGridDimensions = () => {
            if (gridContainerRef.current) {
                const rect = gridContainerRef.current.getBoundingClientRect();
                const availableWidthForDataColumns = rect.width - TIME_COLUMN_WIDTH_PX;
                const cellWidth = availableWidthForDataColumns / DAYS_OF_WEEK.length;
                setGridDimensions({ width: rect.width, height: rect.height, cellWidth, cellHeight: 40 });
            }
        };
        updateGridDimensions();
        window.addEventListener('resize', updateGridDimensions);
        return () => window.removeEventListener('resize', updateGridDimensions);
    }, [TIME_SLOTS]);

    const [isDraggingNewSelection, setIsDraggingNewSelection] = useState(false);
    const [startSelection, setStartSelection] = useState(null);
    const [endSelection, setEndSelection] = useState(null);
    const [tempFloatingSelectionRect, setTempFloatingSelectionRect] = useState(null);
    const [accumulatedSelections, setAccumulatedSelections] = useState([]);
    const [addHoursMode, setAddHoursMode] = useState(null);
    const [isDraggingEvent, setIsDraggingEvent] = useState(false);
    const [draggedEventId, setDraggedEventId] = useState(null);
    const [dragStartMousePos, setDragStartMousePos] = useState({ x: 0, y: 0 });
    const [dragStartBlockPos, setDragStartBlockPos] = useState({ left: 0, top: 0 });
    const [originalDraggedBlockProps, setOriginalDraggedBlockProps] = useState(null);
    const [isResizingEvent, setIsResizingEvent] = useState(false);
    const [resizedEventId, setResizedEventId] = useState(null);
    const [resizeHandle, setResizeHandle] = useState(null);
    const [resizeStartMouseY, setResizeStartMouseY] = useState(0);
    const [resizeStartBlockTop, setResizeStartBlockTop] = useState(0);
    const [resizeStartBlockHeight, setResizeStartBlockHeight] = useState(0);
    const [originalResizedBlockProps, setOriginalResizedBlockProps] = useState(null);
    const [displayedEventBlocks, setDisplayedEventBlocks] = useState([]);
    const [openDeleteConfirmDialog, setOpenDeleteConfirmDialog] = useState(false);
    const [classroomIdToDelete, setClassroomIdToDelete] = useState(null);
    const [openClearConfirmDialog, setOpenClearConfirmDialog] = useState(false);
    const [openConflictDialog, setOpenConflictDialog] = useState(false);
    const [conflictMessage, setConflictMessage] = useState('');
    const [openColorPickerDialog, setOpenColorPickerDialog] = useState(false);
    const [selectedClassroomForColor, setSelectedClassroomForColor] = useState(null);
    const [tempColor, setTempColor] = useState('#2196f3');

    const getGridCoordinatesFromPixels = useCallback((pixelX, pixelY) => {
        const { cellWidth, cellHeight } = gridDimensions;
        if (cellWidth === 0 || cellHeight === 0) return null;
        const adjustedPixelX = pixelX - TIME_COLUMN_WIDTH_PX;
        const adjustedPixelY = pixelY - HEADER_ROW_HEIGHT_PX;
        const dayIndex = Math.floor(adjustedPixelX / cellWidth);
        const hourIndex = Math.floor(adjustedPixelY / cellHeight);
        if (dayIndex >= 0 && dayIndex < DAYS_OF_WEEK.length && hourIndex >= 0 && hourIndex < TIME_SLOTS.length) {
            return { dayIndex, hourIndex };
        }
        return null;
    }, [gridDimensions, TIME_SLOTS]);

    const updateTempFloatingSelectionRect = useCallback((startCoords, endCoords) => {
        const { cellWidth, cellHeight } = gridDimensions;
        if (!startCoords || !endCoords || cellWidth === 0 || cellHeight === 0) {
            setTempFloatingSelectionRect(null);
            return;
        }
        const minDay = Math.min(startCoords.dayIndex, endCoords.dayIndex);
        const maxDay = Math.max(startCoords.dayIndex, endCoords.dayIndex);
        const minHour = Math.min(startCoords.hourIndex, endCoords.hourIndex);
        const maxHour = Math.max(startCoords.hourIndex, endCoords.hourIndex);
        const left = TIME_COLUMN_WIDTH_PX + (minDay * cellWidth);
        const top = HEADER_ROW_HEIGHT_PX + (minHour * cellHeight);
        const width = (maxDay - minDay + 1) * cellWidth - 2;
        const height = (maxHour - minHour + 1) * cellHeight;
        setTempFloatingSelectionRect({ left, top, width, height });
    }, [gridDimensions]);

    const transformClassroomsToEvents = useCallback((classroomsData) => {
        const events = [];
        const { cellWidth, cellHeight } = gridDimensions;
        if (cellWidth === 0 || cellHeight === 0) return [];
        classroomsData.forEach(classroom => {
            if (classroom.schedule && Array.isArray(classroom.schedule)) {
                classroom.schedule.forEach((slot, index) => {
                    const dayIdx = DAYS_OF_WEEK.indexOf(slot.day);
                    if (dayIdx === -1) return;
                    const startHourIdx = TIME_SLOTS.indexOf(slot.startTime);
                    const endHourIdx = TIME_SLOTS.indexOf(slot.endTime);
                    if (startHourIdx === -1 || endHourIdx === -1 || startHourIdx >= endHourIdx) return;
                    const left = TIME_COLUMN_WIDTH_PX + (dayIdx * cellWidth);
                    const top = HEADER_ROW_HEIGHT_PX + (startHourIdx * cellHeight);
                    const width = cellWidth - 2;
                    const durationMinutes = dayjs(`2000-01-01T${slot.endTime}`).diff(dayjs(`2000-01-01T${slot.startTime}`), 'minute');
                    const height = (durationMinutes / 30) * cellHeight;
                    events.push({
                        id: `${classroom.id}-${index}`,
                        day: slot.day,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        subject: classroom.subject,
                        grade: classroom.grade,
                        enrolledStudents: classroom.enrolledStudents,
                        maxStudents: classroom.maxStudents,
                        backgroundColor: classroom.color || '#2196f3',
                        left, top, width, height,
                        fullClassroomData: classroom,
                    });
                });
            }
        });
        return events;
    }, [gridDimensions, TIME_SLOTS]);

    useEffect(() => {
        if (classrooms) {
            setDisplayedEventBlocks(transformClassroomsToEvents(classrooms));
        }
    }, [classrooms, transformClassroomsToEvents, gridDimensions]);

    const checkOverlap = useCallback((targetClassroomId, targetDay, targetStartTimeStr, targetEndTimeStr, allClassroomsData) => {
        const targetStart = dayjs(`2000-01-01T${targetStartTimeStr}`);
        const targetEnd = dayjs(`2000-01-01T${targetEndTimeStr}`);
        if (!targetStart.isValid() || !targetEnd.isValid() || targetEnd.isSameOrBefore(targetStart)) return true;
        for (const classroom of allClassroomsData) {
            if (!addHoursMode && classroom.id === targetClassroomId) continue;
            if (classroom.schedule && Array.isArray(classroom.schedule)) {
                for (const slot of classroom.schedule) {
                    if (slot.day === targetDay) {
                        const existingStart = dayjs(`2000-01-01T${slot.startTime}`);
                        const existingEnd = dayjs(`2000-01-01T${slot.endTime}`);
                        if (targetStart.isBefore(existingEnd) && targetEnd.isAfter(existingStart)) return true;
                    }
                }
            }
        }
        return false;
    }, [addHoursMode]);

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

    const handleEventDragStart = useCallback((e, id) => {
        if (addHoursMode) return;
        if (!db || !appId) {
            setOpenConflictDialog(true);
            setConflictMessage("Σφάλμα: Η βάση δεδομένων ή το αναγνωριστικό εφαρμογής δεν είναι διαθέσιμα.");
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
    }, [db, appId, addHoursMode]);

    const handleEventResizeStart = useCallback((e, id, handle) => {
        if (addHoursMode) return;
        if (!db || !appId) {
            setOpenConflictDialog(true);
            setConflictMessage("Σφάλμα: Η βάση δεδομένων ή το αναγνωριστικό εφαρμογής δεν είναι διαθέσιμα.");
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
    }, [db, appId, addHoursMode]);

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
            setDisplayedEventBlocks(prevBlocks => prevBlocks.map(block =>
                block.id === draggedEventId ? { ...block, left: dragStartBlockPos.left + dx, top: dragStartBlockPos.top + dy } : block
            ));
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
                    if (resizeHandle === 'top') {
                        newTop = Math.round((newTop - HEADER_ROW_HEIGHT_PX) / cellHeight) * cellHeight + HEADER_ROW_HEIGHT_PX;
                        newHeight = resizeStartBlockHeight + (resizeStartBlockTop - newTop);
                    } else if (resizeHandle === 'bottom') {
                        newHeight = Math.round(newHeight / cellHeight) * cellHeight;
                    }
                    newHeight = Math.max(newHeight, cellHeight);
                    return { ...block, top: newTop, height: newHeight };
                }
                return block;
            }));
        }
    }, [isDraggingNewSelection, startSelection, updateTempFloatingSelectionRect, isDraggingEvent, draggedEventId, dragStartMousePos, dragStartBlockPos, isResizingEvent, resizedEventId, resizeHandle, resizeStartMouseY, resizeStartBlockTop, resizeStartBlockHeight, getGridCoordinatesFromPixels, gridDimensions]);

    const handleGlobalMouseUp = useCallback(async (e) => {
        const wasDraggingNewSelection = isDraggingNewSelection;
        const currentStartSelection = startSelection;
        const currentEndSelection = endSelection;
        
        setIsDraggingNewSelection(false);
        setTempFloatingSelectionRect(null);
        setStartSelection(null);
        setEndSelection(null);

        // --- DRAG LOGIC (ΑΠΟ ΤΟΝ ΑΡΧΙΚΟ ΚΩΔΙΚΑ) ---
        if (isDraggingEvent && draggedEventId) {
            const { cellWidth, cellHeight } = gridDimensions;
            const originalEventBlock = displayedEventBlocks.find(b => b.id === draggedEventId);

            if (originalEventBlock && originalDraggedBlockProps) {
                const gridRect = gridContainerRef.current.getBoundingClientRect();
                
                const finalMouseX = e.clientX - gridRect.left;
                const finalMouseY = e.clientY - gridRect.top;
                
                const startOffsetX = dragStartMousePos.x - (gridRect.left + originalDraggedBlockProps.left);
                const startOffsetY = dragStartMousePos.y - (gridRect.top + originalDraggedBlockProps.top);
                
                const finalBlockLeft = finalMouseX - startOffsetX;
                const finalBlockTop = finalMouseY - startOffsetY;

                const snappedDayIndex = Math.max(0, Math.round((finalBlockLeft - TIME_COLUMN_WIDTH_PX) / cellWidth));
                const snappedHourIndex = Math.max(0, Math.round((finalBlockTop - HEADER_ROW_HEIGHT_PX) / cellHeight));
                
                const durationMinutes = dayjs(`2000-01-01T${originalEventBlock.endTime}`).diff(dayjs(`2000-01-01T${originalEventBlock.startTime}`), 'minute');
                const newDay = DAYS_OF_WEEK[snappedDayIndex];
                const newStartTime = TIME_SLOTS[snappedHourIndex];

                if (newDay && newStartTime) {
                    const newEndTime = dayjs(`2000-01-01T${newStartTime}`).add(durationMinutes, 'minute').format('HH:mm');
                    
                    if (TIME_SLOTS.indexOf(newEndTime) === -1 && newEndTime !== `${String(calendarEndHour).padStart(2, '0')}:00`) {
                         setOpenConflictDialog(true);
                         setConflictMessage("Η μετακίνηση τοποθετεί το τμήμα εκτός των ωρών του προγράμματος.");
                         setDisplayedEventBlocks(prev => prev.map(b => b.id === draggedEventId ? { ...b, ...originalDraggedBlockProps } : b));
                    } else {
                        const classroomToUpdate = originalEventBlock.fullClassroomData;
                        const otherClassrooms = classrooms.filter(c => c.id !== classroomToUpdate.id);
                        const isOverlapping = checkOverlap(null, newDay, newStartTime, newEndTime, otherClassrooms);
                        
                        if (isOverlapping) {
                            setOpenConflictDialog(true);
                            setConflictMessage("Η μετακίνηση προκαλεί επικάλυψη με άλλο τμήμα.");
                            setDisplayedEventBlocks(prev => prev.map(b => b.id === draggedEventId ? { ...b, ...originalDraggedBlockProps } : b));
                        } else {
                            const scheduleIndex = parseInt(draggedEventId.split('-')[1], 10);
                            const updatedSchedule = [...classroomToUpdate.schedule];
                            updatedSchedule[scheduleIndex] = { ...updatedSchedule[scheduleIndex], day: newDay, startTime: newStartTime, endTime: newEndTime };
                            
                            const classroomDocRef = doc(db, `artifacts/${appId}/public/data/classrooms`, classroomToUpdate.id);
                            await updateDoc(classroomDocRef, { schedule: updatedSchedule });
                        }
                    }
                } else {
                     setDisplayedEventBlocks(prev => prev.map(b => b.id === draggedEventId ? { ...b, ...originalDraggedBlockProps } : b));
                }
            }
        }

        // --- RESIZE LOGIC (ΑΠΟ ΤΟΝ ΑΡΧΙΚΟ ΚΩΔΙΚΑ) ---
        if (isResizingEvent && resizedEventId) {
            const { cellHeight } = gridDimensions;
            const originalEventBlock = displayedEventBlocks.find(b => b.id === resizedEventId);

            if (originalEventBlock) {
                const gridRect = gridContainerRef.current.getBoundingClientRect();
                const finalMouseY = e.clientY - gridRect.top;

                let newStartTime, newEndTime;

                if (resizeHandle === 'top') {
                    const snappedTopIndex = Math.max(0, Math.round((finalMouseY - HEADER_ROW_HEIGHT_PX) / cellHeight));
                    newStartTime = TIME_SLOTS[snappedTopIndex];
                    newEndTime = originalEventBlock.endTime;
                } else { // bottom
                    const snappedBottomIndex = Math.max(0, Math.round((finalMouseY - HEADER_ROW_HEIGHT_PX) / cellHeight));
                    newStartTime = originalEventBlock.startTime;
                    newEndTime = TIME_SLOTS[snappedBottomIndex];
                }

                if (newStartTime && newEndTime && dayjs(`2000-01-01T${newEndTime}`).isAfter(dayjs(`2000-01-01T${newStartTime}`))) {
                    const classroomToUpdate = originalEventBlock.fullClassroomData;
                    const otherClassrooms = classrooms.filter(c => c.id !== classroomToUpdate.id);
                    const isOverlapping = checkOverlap(null, originalEventBlock.day, newStartTime, newEndTime, otherClassrooms);

                    if (isOverlapping) {
                        setOpenConflictDialog(true);
                        setConflictMessage("Η αλλαγή μεγέθους προκαλεί επικάλυψη.");
                        setDisplayedEventBlocks(prev => prev.map(b => b.id === resizedEventId ? { ...b, ...originalResizedBlockProps } : b));
                    } else {
                        const scheduleIndex = parseInt(resizedEventId.split('-')[1], 10);
                        const updatedSchedule = [...classroomToUpdate.schedule];
                        updatedSchedule[scheduleIndex] = { ...updatedSchedule[scheduleIndex], startTime: newStartTime, endTime: newEndTime };

                        const classroomDocRef = doc(db, `artifacts/${appId}/public/data/classrooms`, classroomToUpdate.id);
                        await updateDoc(classroomDocRef, { schedule: updatedSchedule });
                    }
                } else {
                    setDisplayedEventBlocks(prev => prev.map(b => b.id === resizedEventId ? { ...b, ...originalResizedBlockProps } : b));
                }
            }
        }
        
        setIsDraggingEvent(false);
        setIsResizingEvent(false);
        setDraggedEventId(null);
        setResizedEventId(null);
        setOriginalDraggedBlockProps(null);
        setOriginalResizedBlockProps(null);

        // --- NEW SELECTION LOGIC ---
        if (wasDraggingNewSelection && currentStartSelection && currentEndSelection) {
            const normalizedStartDay = Math.min(currentStartSelection.dayIndex, currentEndSelection.dayIndex);
            const normalizedEndDay = Math.max(currentStartSelection.dayIndex, currentEndSelection.dayIndex);
            
            if (normalizedStartDay !== normalizedEndDay) {
                 setOpenConflictDialog(true);
                 setConflictMessage("Η πολλαπλή επιλογή ωρών επιτρέπεται μόνο στην ίδια ημέρα.");
                 return;
            }

            const normalizedStartHour = Math.min(currentStartSelection.hourIndex, currentEndSelection.hourIndex);
            const normalizedEndHour = Math.max(currentStartSelection.hourIndex, currentEndSelection.hourIndex);
            
            if (normalizedStartHour === normalizedEndHour) return;

            const newStartTime = TIME_SLOTS[normalizedStartHour];
            const newEndTime = TIME_SLOTS[normalizedEndHour + 1] || `${String(calendarEndHour).padStart(2, '0')}:00`;

            const newEntry = {
                id: dayjs().valueOf(),
                day: DAYS_OF_WEEK[normalizedStartDay],
                startTime: newStartTime,
                endTime: newEndTime,
            };

            const isOverlapping = checkOverlap(null, newEntry.day, newEntry.startTime, newEntry.endTime, classrooms);
            if (isOverlapping) {
                setOpenConflictDialog(true);
                setConflictMessage(`Η επιλεγμένη ώρα (${newEntry.day} ${newEntry.startTime}-${newEntry.endTime}) επικαλύπτεται με υπάρχον τμήμα.`);
                return;
            }
            
            if (addHoursMode) {
                setAccumulatedSelections(prev => [...prev, newEntry]);
            } else if (e.ctrlKey || e.metaKey) {
                setAccumulatedSelections(prev => [...prev, newEntry]);
            } else {
                setAccumulatedSelections([]);
                navigateTo('newClassroom', { initialSchedule: [newEntry] });
            }
        }
    }, [isDraggingNewSelection, startSelection, endSelection, TIME_SLOTS, calendarEndHour, isDraggingEvent, isResizingEvent, classrooms, checkOverlap, addHoursMode, navigateTo, db, appId, gridDimensions, displayedEventBlocks, originalDraggedBlockProps, originalResizedBlockProps, draggedEventId, resizedEventId, dragStartMousePos]);

    useEffect(() => {
        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [handleGlobalMouseMove, handleGlobalMouseUp]);

    const handleEditEntry = (fullClassroomData) => {
        navigateTo('newClassroom', { classroomToEdit: fullClassroomData });
    };

    const handleDeleteEntry = (classroomId) => {
        setClassroomIdToDelete(classroomId);
        setOpenDeleteConfirmDialog(true);
    };

    const handleConfirmDelete = async () => {
        setOpenDeleteConfirmDialog(false);
        if (!db || !classroomIdToDelete || !appId) {
            setOpenConflictDialog(true);
            setConflictMessage("Σφάλμα: Η βάση δεδομένων, το αναγνωριστικό τμήματος ή το αναγνωριστικό εφαρμογής δεν είναι διαθέσιμα.");
            return;
        }
        try {
            const classroomDocRef = doc(db, `artifacts/${appId}/public/data/classrooms`, classroomIdToDelete);
            await deleteDoc(classroomDocRef);
            setClassroomIdToDelete(null);
        } catch (error) {
            console.error("Error deleting classroom:", error);
            setOpenConflictDialog(true);
            setConflictMessage("Αποτυχία διαγραφής τμήματος.");
        }
    };

    const handleCancelDelete = () => {
        setOpenDeleteConfirmDialog(false);
        setClassroomIdToDelete(null);
    };

    const handleClearSchedule = () => setOpenClearConfirmDialog(true);

    const handleConfirmClearSchedule = async () => {
        setOpenClearConfirmDialog(false);
        if (!db || !appId) {
            setOpenConflictDialog(true);
            setConflictMessage("Σφάλμα: Η βάση δεδομένων ή το αναγνωριστικό εφαρμογής δεν είναι διαθέσιμα.");
            return;
        }
        try {
            const classroomsCollectionRef = collection(db, `artifacts/${appId}/public/data/classrooms`);
            const snapshot = await getDocs(query(classroomsCollectionRef));
            const deletePromises = snapshot.docs.map(docToDelete => deleteDoc(doc(db, `artifacts/${appId}/public/data/classrooms`, docToDelete.id)));
            await Promise.all(deletePromises);
        } catch (error) {
            console.error("Error clearing all classrooms:", error);
            setOpenConflictDialog(true);
            setConflictMessage("Αποτυχία εκκαθάρισης όλων των τμημάτων.");
        }
    };

    const handleCancelClearSchedule = () => setOpenClearConfirmDialog(false);

    const handleOpenColorPicker = (classroomData) => {
        setSelectedClassroomForColor(classroomData);
        setTempColor(classroomData.color || '#2196f3');
        setOpenColorPickerDialog(true);
    };

    const handleSaveColor = async () => {
        if (!db || !appId || !selectedClassroomForColor) {
            setOpenConflictDialog(true);
            setConflictMessage("Σφάλμα: Η βάση δεδομένων ή το αναγνωριστικό εφαρμογής δεν είναι διαθέσιμα.");
            return;
        }
        try {
            const classroomDocRef = doc(db, `artifacts/${appId}/public/data/classrooms`, selectedClassroomForColor.id);
            await updateDoc(classroomDocRef, { color: tempColor });
            setOpenColorPickerDialog(false);
            setSelectedClassroomForColor(null);
        } catch (error) {
            console.error("Error updating classroom color:", error);
            setOpenConflictDialog(true);
            setConflictMessage("Αποτυχία ενημέρωσης χρώματος τμήματος.");
        }
    };

    const handleEnterAddHoursMode = (classroomData) => {
        setAddHoursMode(classroomData);
        setAccumulatedSelections([]);
    };

    const handleCancelAddHours = () => {
        setAddHoursMode(null);
        setAccumulatedSelections([]);
    };

    const handleSaveAddedHours = async () => {
        if (!addHoursMode || accumulatedSelections.length === 0) {
            setOpenConflictDialog(true);
            setConflictMessage("Δεν έχετε επιλέξει νέες ώρες για αποθήκευση.");
            return;
        }
        
        const classroomToUpdate = addHoursMode;
        const existingSchedule = classroomToUpdate.schedule || [];
        const combinedSchedule = [...existingSchedule, ...accumulatedSelections];

        try {
            const classroomDocRef = doc(db, `artifacts/${appId}/public/data/classrooms`, classroomToUpdate.id);
            await updateDoc(classroomDocRef, { schedule: combinedSchedule });
            handleCancelAddHours();
        } catch (error) {
            console.error("Error saving added hours:", error);
            setOpenConflictDialog(true);
            setConflictMessage("Σφάλμα κατά την αποθήκευση των νέων ωρών.");
        }
    };


    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Paper elevation={3} sx={{ padding: '20px', borderRadius: '12px', minHeight: '600px' }}>
                <Typography variant="h5" component="h3" sx={{ mb: 3, color: '#3f51b5', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fas fa-calendar-alt"></i> Εβδομαδιαίο Πρόγραμμα
                </Typography>
                <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                    <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Ώρα Έναρξης</InputLabel>
                        <Select value={calendarStartHour} onChange={(e) => setCalendarStartHour(parseInt(e.target.value))} label="Ώρα Έναρξης">
                            {Array.from({ length: 24 }, (_, i) => i).map(hour => <MenuItem key={hour} value={hour} disabled={hour >= calendarEndHour}>{String(hour).padStart(2, '0')}:00</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Ώρα Λήξης</InputLabel>
                        <Select value={calendarEndHour} onChange={(e) => setCalendarEndHour(parseInt(e.target.value))} label="Ώρα Λήξης">
                            {Array.from({ length: 24 }, (_, i) => i).map(hour => <MenuItem key={hour} value={hour} disabled={hour <= calendarStartHour}>{String(hour).padStart(2, '0')}:00</MenuItem>)}
                        </Select>
                    </FormControl>
                    <Box sx={{ flexGrow: 1 }} />
                    <Button variant="outlined" color="error" startIcon={<ClearAll />} onClick={handleClearSchedule} sx={{ borderRadius: '8px' }}>Εκκαθάριση Προγράμματος</Button>
                </Box>
                <Box ref={gridContainerRef} sx={{ position: 'relative', display: 'grid', gridTemplateColumns: `${TIME_COLUMN_WIDTH_PX}px repeat(${DAYS_OF_WEEK.length}, 1fr)`, gridAutoRows: `${gridDimensions.cellHeight}px`, border: '1px solid #e0e0e0', borderLeft: '0', borderTop: '0', overflow: 'auto', userSelect: 'none', WebkitUserSelect: 'none', cursor: isDraggingNewSelection ? 'grabbing' : 'auto', minHeight: `${(TIME_SLOTS.length + 1) * gridDimensions.cellHeight}px` }}>
                    <Box sx={{ gridColumn: 'span 1', backgroundColor: '#fff', color: '#000', fontWeight: 'bold', padding: '10px', textAlign: 'center', borderRight: '1px solid #fff' }}>Ώρα</Box>
                    {DAYS_OF_WEEK.map(day => <Box key={day} sx={{ backgroundColor: '#1e86cc', color: '#fff', fontWeight: 'bold', padding: '10px', textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.2)' }}>{day}</Box>)}
                    {TIME_SLOTS.map((time, hourIndex) => (
                        <React.Fragment key={time}>
                            <Box sx={{ gridColumn: 'span 1', border: '1px solid #e0e0e0', borderTop: 'none', backgroundColor: '#fff', borderLeft: '0', padding: '0 8px', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', position: 'relative' }}>
                                <Typography variant="caption" sx={{ position: 'absolute', top: '0px', left: '0px', transform: 'translateY(-50%)', fontSize: '0.75rem', backgroundColor: '#fff', padding: '2px 15px 2px 2px', zIndex: 2 }}>{time}</Typography>
                            </Box>
                            {DAYS_OF_WEEK.map((day, dayIndex) => (
                                <Box key={`${day}-${time}`} onMouseDown={(e) => handleGridMouseDown(e, dayIndex, hourIndex)} sx={{ border: '1px solid #e0e0e0', borderTop: 'none', borderLeft: 'none', cursor: 'pointer', '&:hover': { backgroundColor: '#f0f0f0' } }} />
                            ))}
                        </React.Fragment>
                    ))}
                    {tempFloatingSelectionRect && <Box sx={{ position: 'absolute', left: tempFloatingSelectionRect.left, top: tempFloatingSelectionRect.top, width: tempFloatingSelectionRect.width, height: tempFloatingSelectionRect.height, backgroundColor: 'rgba(179, 229, 252, 0.5)', border: '1px solid #2196f3', borderRadius: '4px', pointerEvents: 'none', zIndex: 10 }} />}
                    {accumulatedSelections.map((selection, index) => {
                        const dayIdx = DAYS_OF_WEEK.indexOf(selection.day);
                        const startHourIdx = TIME_SLOTS.indexOf(selection.startTime);
                        const endHourIdx = TIME_SLOTS.indexOf(selection.endTime);
                        if (dayIdx === -1 || startHourIdx === -1 || endHourIdx === -1 || gridDimensions.cellWidth === 0) return null;
                        const left = TIME_COLUMN_WIDTH_PX + (dayIdx * gridDimensions.cellWidth);
                        const top = HEADER_ROW_HEIGHT_PX + (startHourIdx * gridDimensions.cellHeight);
                        const height = (endHourIdx - startHourIdx) * gridDimensions.cellHeight;
                        const width = gridDimensions.cellWidth - 2;
                        return <Box key={index} sx={{ position: 'absolute', left, top, width, height, backgroundColor: 'rgba(76, 175, 80, 0.7)', border: '1px dashed #4caf50', borderRadius: '4px', pointerEvents: 'none', zIndex: 9 }} />;
                    })}
                    
                    {displayedEventBlocks.map(block => {
                        const isBeingEdited = addHoursMode && block.fullClassroomData.id === addHoursMode.id;
                        return (
                            <FloatingEventBlock
                                key={block.id}
                                {...block}
                                backgroundColor={isBeingEdited ? 'rgba(76, 175, 80, 0.7)' : block.backgroundColor}
                                onEdit={handleEditEntry}
                                onDelete={handleDeleteEntry}
                                onDragStart={handleEventDragStart}
                                onResizeStart={handleEventResizeStart}
                                onOpenColorPicker={handleOpenColorPicker}
                                onAddMoreHours={handleEnterAddHoursMode}
                            />
                        );
                    })}
                </Box>
            </Paper>
            
            {!addHoursMode && accumulatedSelections.length > 0 && (
                <Paper elevation={6} sx={{ position: 'fixed', bottom: 20, right: 20, p: 2, zIndex: 1300, backgroundColor: 'white' }}>
                    <Typography variant="h6" sx={{ mb: 1 }}>Επιλεγμένες Ώρες: {accumulatedSelections.length}</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<CheckCircleOutline />}
                            onClick={() => {
                                navigateTo('newClassroom', { initialSchedule: accumulatedSelections });
                                setAccumulatedSelections([]);
                            }}
                        >
                            Δημιουργία Τμήματος
                        </Button>
                        <Button
                            variant="outlined"
                            color="secondary"
                            onClick={() => setAccumulatedSelections([])}
                        >
                            Εκκαθάριση
                        </Button>
                    </Box>
                </Paper>
            )}

            {addHoursMode && (
                 <Paper elevation={6} sx={{ position: 'fixed', bottom: 20, right: 20, p: 2, zIndex: 1300, backgroundColor: 'white' }}>
                    <Typography variant="h6" sx={{ mb: 1 }}>Προσθήκη στο τμήμα: {addHoursMode.subject}</Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>Νέες ώρες: {accumulatedSelections.length}</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<Save />}
                            onClick={handleSaveAddedHours}
                            disabled={accumulatedSelections.length === 0}
                        >
                            Αποθήκευση Αλλαγών
                        </Button>
                        <Button
                            variant="outlined"
                            color="secondary"
                            startIcon={<Cancel />}
                            onClick={handleCancelAddHours}
                        >
                            Ακύρωση
                        </Button>
                    </Box>
                </Paper>
            )}

            <Dialog open={openDeleteConfirmDialog} onClose={handleCancelDelete}>
                <DialogTitle>Επιβεβαίωση Διαγραφής</DialogTitle>
                <DialogContent><Typography>Είστε σίγουροι ότι θέτετε να διαγράψετε αυτό το τμήμα; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.</Typography></DialogContent>
                <DialogActions>
                    <Button onClick={handleCancelDelete}>Ακύρωση</Button>
                    <Button onClick={handleConfirmDelete} color="error" variant="contained">Διαγραφή</Button>
                </DialogActions>
            </Dialog>
            <Dialog open={openClearConfirmDialog} onClose={handleCancelClearSchedule}>
                <DialogTitle>Επιβεβαίωση Εκκαθάρισης Προγράμματος</DialogTitle>
                <DialogContent><Typography>Είστε σίγουροι ότι θέτετε να διαγράψετε ΟΛΑ τα τμήματα; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.</Typography></DialogContent>
                <DialogActions>
                    <Button onClick={handleCancelClearSchedule}>Ακύρωση</Button>
                    <Button onClick={handleConfirmClearSchedule} color="error" variant="contained">Εκκαθάριση</Button>
                </DialogActions>
            </Dialog>
            <Dialog open={openConflictDialog} onClose={() => setOpenConflictDialog(false)}>
                <DialogTitle>Ειδοποίηση</DialogTitle>
                <DialogContent><Typography>{conflictMessage}</Typography></DialogContent>
                <DialogActions><Button onClick={() => setOpenConflictDialog(false)} color="primary" variant="contained">Εντάξει</Button></DialogActions>
            </Dialog>
            <Dialog open={openColorPickerDialog} onClose={() => setOpenColorPickerDialog(false)}>
                <DialogTitle>Αλλαγή Χρώματος Μαθήματος</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
                    <Typography variant="body1" sx={{ mb: 2 }}>Τμήμα: {selectedClassroomForColor?.subject} ({selectedClassroomForColor?.grade})</Typography>
                    <input type="color" value={tempColor} onChange={(e) => setTempColor(e.target.value)} style={{ width: '100px', height: '100px', border: 'none', cursor: 'pointer', borderRadius: '8px', marginBottom: '20px' }} />
                    <TextField label="Κωδικός Χρώματος (Hex)" value={tempColor} onChange={(e) => setTempColor(e.target.value)} variant="outlined" size="small" sx={{ width: '100%' }} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenColorPickerDialog(false)}>Ακύρωση</Button>
                    <Button onClick={handleSaveColor} color="primary" variant="contained">Αποθήκευση</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default WeeklyScheduleCalendar;
