// src/pages/WeeklyScheduleCalendar.jsx
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
    Box, Container, Paper, Typography, Button, IconButton,
    FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle,
    DialogContent, DialogActions, TextField, DialogContentText, Tooltip, Checkbox, ListItemText
} from '@mui/material';
import { ClearAll, Save, Edit, Delete, Print as PrintIcon, Add as AddIcon, Brush as BrushIcon, InfoOutlined as InfoOutlinedIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { doc, deleteDoc, collection, query, getDocs, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

dayjs.extend(duration);
dayjs.extend(isSameOrBefore);

// Constants
const ALL_DAYS_OF_WEEK = ['Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];
const TIME_COLUMN_WIDTH_PX = 80;
const HEADER_ROW_HEIGHT_PX = 80;

const colorPalette = [
    '#BBDEFB', '#C8E6C9', '#FFECB3', '#FFCDD2', '#E1BEE7',
    '#D1C4E9', '#B2DFDB', '#F0F4C3', '#FFE0B2', '#FFCCBC',
    '#CFD8DC', '#D7CCC8', '#F5F5F5'
];


const generateTimeSlots = (startHour, endHour) => {
    const slots = [];
    for (let h = startHour; h < endHour; h++) {
        slots.push(`${String(h).padStart(2, '0')}:00`);
        slots.push(`${String(h).padStart(2, '0')}:30`);
    }
    slots.push(`${String(endHour).padStart(2, '0')}:00`);
    return slots;
};

const FloatingEventBlock = ({ id, startTime, endTime, subject, grade, teacherName, enrolledStudentsCount, maxStudents, left, top, width, height, backgroundColor, onEdit, onDelete, onDragStart, onResizeStart, fullClassroomData, onOpenColorPicker, onAddMoreHours }) => {
    // Show info icon for lessons of 1 hour (2 cells * 40px/cell) or less
    const isSmall = height <= 80;

    const tooltipContent = (
        <React.Fragment>
            <Typography color="inherit" sx={{ fontWeight: 'bold' }}>{subject} ({grade})</Typography>
            <Typography color="inherit">{teacherName}</Typography>
            <Typography color="inherit">{startTime} - {endTime}</Typography>
            <Typography color="inherit">Μαθητές: {enrolledStudentsCount || 0}/{maxStudents}</Typography>
        </React.Fragment>
    );

    return (
        <Box
            id={`event-block-${id}`}
            sx={{
                position: 'absolute', left, top, width, height, backgroundColor: backgroundColor || '#2196f3',
                color: '#fff', borderRadius: '4px', padding: '5px',
                overflow: 'hidden', zIndex: 5, boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                cursor: 'grab', touchAction: 'none', display: 'flex', flexDirection: 'column',
                justifyContent: 'space-between', fontSize: '0.75rem', boxSizing: 'border-box',
                transition: 'background-color 0.3s ease',
            }}
            onMouseDown={(e) => onDragStart(e, id)}
        >
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '8px', cursor: 'ns-resize', zIndex: 6 }} onMouseDown={(e) => onResizeStart(e, id, 'top')} />
            
            {isSmall && (
                <Tooltip title={tooltipContent} placement="top" arrow>
                    <IconButton
                        size="small"
                        sx={{ position: 'absolute', top: 2, right: 2, color: '#fff', padding: '2px', zIndex: 8 }}
                        onMouseDown={(e) => e.stopPropagation()} // Prevent drag from starting when clicking icon
                    >
                        <InfoOutlinedIcon sx={{ fontSize: '1rem' }} />
                    </IconButton>
                </Tooltip>
            )}

            <Box sx={{ flexGrow: 1, overflow: 'hidden', pr: isSmall ? '24px' : '5px' }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', fontSize: isSmall ? '0.8rem' : '1rem', lineHeight: 1.2 }}>{subject}</Typography>
                <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold', fontSize: isSmall ? '0.7rem' : 'inherit' }}>{grade}</Typography>
                {!isSmall && teacherName && <Typography variant="caption" sx={{ display: 'block', fontStyle: 'italic' }}>{teacherName}</Typography>}
                {!isSmall && <Typography variant="caption" sx={{ display: 'block' }}>Μαθητές: {enrolledStudentsCount || 0}/{maxStudents}</Typography>}
                <Typography variant="caption" sx={{ display: 'block', fontSize: isSmall ? '0.7rem' : 'inherit' }}>{startTime} - {endTime}</Typography>
            </Box>
            <Box className="no-print" sx={{ position: 'absolute', bottom: '2px', right: '2px', display: 'flex', gap: '2px', zIndex: 7 }}>
                <Tooltip title="Προσθήκη Ώρας"><IconButton size="small" sx={{ color: '#fff', padding: '2px' }} onClick={(e) => { e.stopPropagation(); onAddMoreHours(fullClassroomData); }}><AddIcon sx={{ fontSize: '0.8rem' }} /></IconButton></Tooltip>
                <Tooltip title="Επεξεργασία"><IconButton size="small" sx={{ color: '#fff', padding: '2px' }} onClick={(e) => { e.stopPropagation(); onEdit(fullClassroomData); }}><Edit sx={{ fontSize: '0.8rem' }} /></IconButton></Tooltip>
                <Tooltip title="Αλλαγή Χρώματος"><IconButton size="small" sx={{ color: '#fff', padding: '2px' }} onClick={(e) => { e.stopPropagation(); onOpenColorPicker(fullClassroomData); }}><BrushIcon sx={{ fontSize: '0.8rem' }} /></IconButton></Tooltip>
                <Tooltip title="Διαγραφή"><IconButton size="small" sx={{ color: '#fff', padding: '2px' }} onClick={(e) => { e.stopPropagation(); onDelete(id); }}><Delete sx={{ fontSize: '0.8rem' }} /></IconButton></Tooltip>
            </Box>
            <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '8px', cursor: 'ns-resize', zIndex: 6 }} onMouseDown={(e) => onResizeStart(e, id, 'bottom')} />
        </Box>
    );
};

function WeeklyScheduleCalendar({ classrooms, allTeachers, loading, db, userId, appId }) {
    const navigate = useNavigate();
    const [calendarStartHour, setCalendarStartHour] = useState(8);
    const [calendarEndHour, setCalendarEndHour] = useState(22);
    const [selectedTeacherIds, setSelectedTeacherIds] = useState([]);
    const [visibleDays, setVisibleDays] = useState(ALL_DAYS_OF_WEEK);
    const TIME_SLOTS = useMemo(() => generateTimeSlots(calendarStartHour, calendarEndHour), [calendarStartHour, calendarEndHour]);
    
    const gridBodyRef = useRef(null);
    const [gridDimensions, setGridDimensions] = useState({ width: 0, dayWidth: 0, teacherColumnWidth: 0, cellHeight: 40 });
    
    const [allStudents, setAllStudents] = useState([]);
    const [isDraggingNewSelection, setIsDraggingNewSelection] = useState(false);
    const [startSelection, setStartSelection] = useState(null);
    const [endSelection, setEndSelection] = useState(null);
    const [tempFloatingSelectionRect, setTempFloatingSelectionRect] = useState(null);
    
    const [draggedEvent, setDraggedEvent] = useState(null);
    const [resizedEvent, setResizedEvent] = useState(null);

    const [displayedEventBlocks, setDisplayedEventBlocks] = useState([]);

    const [addHoursMode, setAddHoursMode] = useState(null);
    const [accumulatedSelections, setAccumulatedSelections] = useState([]);
    
    const [deleteInfo, setDeleteInfo] = useState(null);
    const [openClearConfirmDialog, setOpenClearConfirmDialog] = useState(false);
    const [openConflictDialog, setOpenConflictDialog] = useState(false);
    const [conflictMessage, setConflictMessage] = useState('');
    const [openColorPickerDialog, setOpenColorPickerDialog] = useState(false);
    const [selectedClassroomForColor, setSelectedClassroomForColor] = useState(null);
    const [tempColor, setTempColor] = useState('#2196f3');

    useEffect(() => {
        if (allTeachers && allTeachers.length > 0) {
            setSelectedTeacherIds(allTeachers.map(t => t.id));
        }
    }, [allTeachers]);

    const teacherColumns = useMemo(() => {
        if (!allTeachers) return [];
        return allTeachers
            .filter(teacher => selectedTeacherIds.includes(teacher.id))
            .sort((a, b) => a.lastName.localeCompare(b.lastName));
    }, [allTeachers, selectedTeacherIds]);

    useEffect(() => {
        const updateGridDimensions = () => {
            if (gridBodyRef.current) {
                const parentWidth = gridBodyRef.current.parentElement.clientWidth;
                const availableWidthForDataColumns = parentWidth - TIME_COLUMN_WIDTH_PX;
                const dayWidth = visibleDays.length > 0 ? availableWidthForDataColumns / visibleDays.length : 0;
                const teacherColumnWidth = teacherColumns.length > 0 ? dayWidth / teacherColumns.length : 0;
                setGridDimensions({ width: parentWidth, dayWidth, teacherColumnWidth, cellHeight: 40 });
            }
        };
        updateGridDimensions();
        window.addEventListener('resize', updateGridDimensions);
        return () => window.removeEventListener('resize', updateGridDimensions);
    }, [teacherColumns.length, visibleDays]);

    useEffect(() => {
        if (!db || !appId) return;
        const studentsCollectionRef = collection(db, `artifacts/${appId}/public/data/students`);
        getDocs(studentsCollectionRef).then(snapshot => {
            setAllStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }).catch(error => console.error("Error fetching students:", error));
    }, [db, appId]);

    const enrichedClassrooms = useMemo(() => {
        if (!classrooms || !allStudents) return [];
        const studentCountMap = new Map();
        allStudents.forEach(student => {
            student.enrolledClassrooms?.forEach(classroomId => {
                studentCountMap.set(classroomId, (studentCountMap.get(classroomId) || 0) + 1);
            });
        });
        return classrooms.map(c => ({ ...c, enrolledStudentsCount: studentCountMap.get(c.id) || (c.enrolledStudents || []).length }));
    }, [classrooms, allStudents]);

    const transformClassroomsToEvents = useCallback((classroomsData) => {
        const events = [];
        const { teacherColumnWidth, cellHeight } = gridDimensions;
        if (teacherColumnWidth === 0 || cellHeight === 0) return [];

        classroomsData.forEach(classroom => {
            const teacherIdx = teacherColumns.findIndex(t => t.id === classroom.teacherId);
            if (teacherIdx === -1) return;

            classroom.schedule?.forEach((slot, index) => {
                const dayIdx = visibleDays.indexOf(slot.day);
                if (dayIdx === -1) return;

                const startHourIdx = TIME_SLOTS.indexOf(slot.startTime);
                const endHourIdx = TIME_SLOTS.indexOf(slot.endTime);
                if (startHourIdx === -1 || endHourIdx === -1 || startHourIdx >= endHourIdx) return;

                const left = (dayIdx * teacherColumns.length * teacherColumnWidth) + (teacherIdx * teacherColumnWidth);
                const top = startHourIdx * cellHeight;
                const width = teacherColumnWidth - 2;
                const durationMinutes = dayjs(`2000-01-01T${slot.endTime}`).diff(dayjs(`2000-01-01T${slot.startTime}`), 'minute');
                const height = (durationMinutes / 30) * cellHeight;
                
                events.push({
                    id: `${classroom.id}-${index}`, day: slot.day, startTime: slot.startTime, endTime: slot.endTime,
                    subject: classroom.subject, grade: classroom.grade, teacherName: classroom.teacherName,
                    enrolledStudentsCount: classroom.enrolledStudentsCount, maxStudents: classroom.maxStudents,
                    backgroundColor: classroom.color || '#2196f3', left, top, width, height,
                    fullClassroomData: classroom,
                });
            });
        });
        return events;
    }, [gridDimensions, TIME_SLOTS, teacherColumns, visibleDays]);

    useEffect(() => {
        setDisplayedEventBlocks(transformClassroomsToEvents(enrichedClassrooms));
    }, [enrichedClassrooms, transformClassroomsToEvents]);

    const getGridCoordinatesFromPixels = useCallback((pixelX, pixelY) => {
        const { teacherColumnWidth, cellHeight } = gridDimensions;
        if (teacherColumnWidth === 0 || cellHeight === 0) return null;

        const combinedDayTeacherIndex = Math.floor(pixelX / teacherColumnWidth);
        const dayIndex = Math.floor(combinedDayTeacherIndex / teacherColumns.length);
        const teacherIndex = combinedDayTeacherIndex % teacherColumns.length;
        const hourIndex = Math.floor(pixelY / cellHeight);

        if (dayIndex >= 0 && dayIndex < visibleDays.length && hourIndex >= 0 && hourIndex < TIME_SLOTS.length && teacherIndex >= 0 && teacherIndex < teacherColumns.length) {
            return { dayIndex, hourIndex, teacherIndex };
        }
        return null;
    }, [gridDimensions, TIME_SLOTS, teacherColumns, visibleDays]);
    
    const updateTempFloatingSelectionRect = useCallback((startCoords, endCoords) => {
        if (!startCoords || !endCoords) {
            setTempFloatingSelectionRect(null);
            return;
        }
        const { teacherColumnWidth, cellHeight } = gridDimensions;
        if (teacherColumnWidth === 0 || cellHeight === 0) return;

        const day = startCoords.dayIndex;
        const teacher = startCoords.teacherIndex;

        const minHour = Math.min(startCoords.hourIndex, endCoords.hourIndex);
        const maxHour = Math.max(startCoords.hourIndex, endCoords.hourIndex);
        
        const left = (day * teacherColumns.length * teacherColumnWidth) + (teacher * teacherColumnWidth);
        const top = minHour * cellHeight;
        const width = teacherColumnWidth - 2;
        const height = (maxHour - minHour + 1) * cellHeight;
        setTempFloatingSelectionRect({ left, top, width, height });
    }, [gridDimensions, teacherColumns.length]);

    const checkOverlap = useCallback((targetDay, targetStartTimeStr, targetEndTimeStr, targetTeacherId, ignoreClassroomId) => {
        const targetStart = dayjs(`2000-01-01T${targetStartTimeStr}`);
        const targetEnd = dayjs(`2000-01-01T${targetEndTimeStr}`);
        if (!targetStart.isValid() || !targetEnd.isValid() || targetEnd.isSameOrBefore(targetStart)) return true;
        if (!targetTeacherId) return false;

        for (const classroom of classrooms) {
            if (classroom.teacherId === targetTeacherId) {
                if (classroom.id === ignoreClassroomId) continue;
                for (const slot of classroom.schedule || []) {
                    if (slot.day === targetDay) {
                        const existingStart = dayjs(`2000-01-01T${slot.startTime}`);
                        const existingEnd = dayjs(`2000-01-01T${slot.endTime}`);
                        if (targetStart.isBefore(existingEnd) && targetEnd.isAfter(existingStart)) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }, [classrooms]);

    const handleGridMouseDown = (e) => {
        if (e.button !== 0 || (addHoursMode && (e.ctrlKey || e.metaKey))) return;
        e.preventDefault();
        const gridRect = gridBodyRef.current.getBoundingClientRect();
        const coords = getGridCoordinatesFromPixels(e.clientX - gridRect.left, e.clientY - gridRect.top);
        if (coords) {
            setIsDraggingNewSelection(true);
            setStartSelection(coords);
            setEndSelection(coords);
            updateTempFloatingSelectionRect(coords, coords);
        }
    };

    const handleEventDragStart = useCallback((e, id) => {
        e.stopPropagation();
        if (e.button !== 0) return;
        e.preventDefault();
        const block = displayedEventBlocks.find(b => b.id === id);
        if (block) {
            setDraggedEvent({
                id,
                originalBlock: block,
                startMousePos: { x: e.clientX, y: e.clientY },
                startBlockPos: { left: block.left, top: block.top }
            });
        }
    }, [displayedEventBlocks]);

    const handleEventResizeStart = useCallback((e, id, handle) => {
        e.stopPropagation();
        if (e.button !== 0) return;
        e.preventDefault();
        const block = displayedEventBlocks.find(b => b.id === id);
        if (block) {
            setResizedEvent({
                id,
                handle,
                originalBlock: block,
                startMouseY: e.clientY,
            });
        }
    }, [displayedEventBlocks]);

    const handleGlobalMouseMove = useCallback((e) => {
        e.preventDefault();
        const { cellHeight } = gridDimensions;
        
        if (isDraggingNewSelection) {
            const gridRect = gridBodyRef.current.getBoundingClientRect();
            const coords = getGridCoordinatesFromPixels(e.clientX - gridRect.left, e.clientY - gridRect.top);
            if (coords) {
                setEndSelection(coords);
                if (startSelection && coords.dayIndex === startSelection.dayIndex && coords.teacherIndex === startSelection.teacherIndex) {
                    updateTempFloatingSelectionRect(startSelection, coords);
                } else {
                    setTempFloatingSelectionRect(null);
                }
            }
        } else if (draggedEvent) {
            const dx = e.clientX - draggedEvent.startMousePos.x;
            const dy = e.clientY - draggedEvent.startMousePos.y;
            setDisplayedEventBlocks(prev => prev.map(block =>
                block.id === draggedEvent.id ? { ...block, left: draggedEvent.startBlockPos.left + dx, top: draggedEvent.startBlockPos.top + dy } : block
            ));
        } else if (resizedEvent) {
            const dy = e.clientY - resizedEvent.startMouseY;
            setDisplayedEventBlocks(prev => prev.map(block => {
                if (block.id === resizedEvent.id) {
                    let newTop = resizedEvent.originalBlock.top;
                    let newHeight = resizedEvent.originalBlock.height;
                    if (resizedEvent.handle === 'top') {
                        newTop = resizedEvent.originalBlock.top + dy;
                        newHeight = resizedEvent.originalBlock.height - dy;
                    } else {
                        newHeight = resizedEvent.originalBlock.height + dy;
                    }
                    newHeight = Math.max(newHeight, cellHeight / 2);
                    return { ...block, top: newTop, height: newHeight };
                }
                return block;
            }));
        }
    }, [isDraggingNewSelection, getGridCoordinatesFromPixels, draggedEvent, resizedEvent, gridDimensions, startSelection, updateTempFloatingSelectionRect]);

    const handleGlobalMouseUp = useCallback(async (e) => {
        if (isDraggingNewSelection && startSelection && endSelection) {
            const day = visibleDays[startSelection.dayIndex];
            const teacher = teacherColumns[startSelection.teacherIndex];
            if (startSelection.dayIndex !== endSelection.dayIndex || startSelection.teacherIndex !== endSelection.teacherIndex) {
                 setConflictMessage("Η επιλογή πρέπει να γίνει στην ίδια στήλη ημέρας και καθηγητή.");
                 setOpenConflictDialog(true);
            } else {
                const startHourIdx = Math.min(startSelection.hourIndex, endSelection.hourIndex);
                const endHourIdx = Math.max(startSelection.hourIndex, endSelection.hourIndex);
                const startTime = TIME_SLOTS[startHourIdx];
                const endTime = TIME_SLOTS[endHourIdx + 1] || `${String(calendarEndHour).padStart(2, '0')}:00`;
                const newEntry = { id: dayjs().valueOf(), day, startTime, endTime };
                
                if (checkOverlap(day, startTime, endTime, teacher.id, addHoursMode ? addHoursMode.id : null)) {
                    setConflictMessage(`Ο καθηγητής ${teacher.firstName} ${teacher.lastName} έχει ήδη μάθημα αυτή την ώρα.`);
                    setOpenConflictDialog(true);
                } else {
                    if (addHoursMode) {
                        setAccumulatedSelections(prev => [...prev, newEntry]);
                    } else if (e.ctrlKey || e.metaKey) {
                        setAccumulatedSelections(prev => [...prev, newEntry]);
                    } else {
                        setAccumulatedSelections([]);
                        navigate('/classroom/new', { state: { initialSchedule: [newEntry], teacherId: teacher.id, teacherName: `${teacher.firstName} ${teacher.lastName}` } });
                    }
                }
            }
        }

        if (draggedEvent) {
            const { originalBlock } = draggedEvent;
            const finalBlockElement = document.getElementById(`event-block-${originalBlock.id}`);
            const gridRect = gridBodyRef.current.getBoundingClientRect();
            const finalRect = finalBlockElement.getBoundingClientRect();
            const finalCoords = getGridCoordinatesFromPixels(finalRect.left - gridRect.left, finalRect.top - gridRect.top);

            if (finalCoords) {
                const newDay = visibleDays[finalCoords.dayIndex];
                const newTeacher = teacherColumns[finalCoords.teacherIndex];
                const durationMinutes = dayjs(`2000-01-01T${originalBlock.endTime}`).diff(dayjs(`2000-01-01T${originalBlock.startTime}`), 'minute');
                const newStartTime = TIME_SLOTS[finalCoords.hourIndex];
                const newEndTime = dayjs(`2000-01-01T${newStartTime}`).add(durationMinutes, 'minute').format('HH:mm');

                if (checkOverlap(newDay, newStartTime, newEndTime, newTeacher.id, originalBlock.fullClassroomData.id)) {
                    setConflictMessage(`Η μετακίνηση δημιουργεί επικάλυψη.`);
                    setOpenConflictDialog(true);
                    setDisplayedEventBlocks(prev => prev.map(b => b.id === originalBlock.id ? originalBlock : b));
                } else {
                    const scheduleIndex = parseInt(originalBlock.id.split('-')[1], 10);
                    const updatedSchedule = [...originalBlock.fullClassroomData.schedule];
                    updatedSchedule[scheduleIndex] = { ...updatedSchedule[scheduleIndex], day: newDay, startTime: newStartTime, endTime: newEndTime };
                    const classroomDocRef = doc(db, `artifacts/${appId}/public/data/classrooms`, originalBlock.fullClassroomData.id);
                    await updateDoc(classroomDocRef, { schedule: updatedSchedule, teacherId: newTeacher.id, teacherName: `${newTeacher.firstName} ${newTeacher.lastName}` });
                }
            }
        }
        
        if (resizedEvent) {
            const { originalBlock } = resizedEvent;
            const finalBlockElement = document.getElementById(`event-block-${originalBlock.id}`);
            const gridRect = gridBodyRef.current.getBoundingClientRect();
            const finalRect = finalBlockElement.getBoundingClientRect();
            const topCoord = getGridCoordinatesFromPixels(finalRect.left - gridRect.left, finalRect.top - gridRect.top);
            const bottomCoord = getGridCoordinatesFromPixels(finalRect.left - gridRect.left, finalRect.bottom - gridRect.top -1);

            if(topCoord && bottomCoord){
                const newStartTime = TIME_SLOTS[topCoord.hourIndex];
                const newEndTime = TIME_SLOTS[bottomCoord.hourIndex + 1] || `${String(calendarEndHour).padStart(2, '0')}:00`;

                if (checkOverlap(originalBlock.day, newStartTime, newEndTime, originalBlock.fullClassroomData.teacherId, originalBlock.fullClassroomData.id)) {
                    setConflictMessage(`Η αλλαγή διάρκειας δημιουργεί επικάλυψη.`);
                    setOpenConflictDialog(true);
                    setDisplayedEventBlocks(prev => prev.map(b => b.id === originalBlock.id ? originalBlock : b));
                } else {
                    const scheduleIndex = parseInt(originalBlock.id.split('-')[1], 10);
                    const updatedSchedule = [...originalBlock.fullClassroomData.schedule];
                    updatedSchedule[scheduleIndex] = { ...updatedSchedule[scheduleIndex], startTime: newStartTime, endTime: newEndTime };
                    const classroomDocRef = doc(db, `artifacts/${appId}/public/data/classrooms`, originalBlock.fullClassroomData.id);
                    await updateDoc(classroomDocRef, { schedule: updatedSchedule });
                }
            }
        }

        setIsDraggingNewSelection(false);
        setStartSelection(null);
        setEndSelection(null);
        setTempFloatingSelectionRect(null);
        setDraggedEvent(null);
        setResizedEvent(null);
    }, [isDraggingNewSelection, startSelection, endSelection, draggedEvent, resizedEvent, getGridCoordinatesFromPixels, checkOverlap, navigate, db, appId, teacherColumns, TIME_SLOTS, calendarEndHour, addHoursMode, visibleDays]);

    useEffect(() => {
        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [handleGlobalMouseMove, handleGlobalMouseUp]);
    
    const handleEnterAddHoursMode = (classroomData) => {
        setAddHoursMode(classroomData);
        setAccumulatedSelections([]);
    };
    const handleCancelAddHours = () => {
        setAddHoursMode(null);
        setAccumulatedSelections([]);
    };
    const handleSaveAddedHours = async () => {
        if (!addHoursMode || accumulatedSelections.length === 0) return;
        const classroomToUpdate = addHoursMode;
        const existingSchedule = classroomToUpdate.schedule || [];
        const combinedSchedule = [...existingSchedule, ...accumulatedSelections];
        try {
            const classroomDocRef = doc(db, `artifacts/${appId}/public/data/classrooms`, classroomToUpdate.id);
            await updateDoc(classroomDocRef, { schedule: combinedSchedule });
            handleCancelAddHours();
        } catch (error) {
            console.error("Error saving added hours:", error);
            setConflictMessage("Σφάλμα κατά την αποθήκευση των νέων ωρών.");
            setOpenConflictDialog(true);
        }
    };

    const handleEditEntry = (fullClassroomData) => navigate(`/classroom/edit/${fullClassroomData.id}`);
    const handleDeleteEntry = (eventId) => {
        const [classroomId, slotIndexStr] = eventId.split('-');
        setDeleteInfo({ classroomId, slotIndex: parseInt(slotIndexStr, 10) });
    };
    const handleConfirmSlotDelete = async () => {
        if (!deleteInfo) return;
        const classroom = classrooms.find(c => c.id === deleteInfo.classroomId);
        if (classroom) {
            const updatedSchedule = classroom.schedule.filter((_, index) => index !== deleteInfo.slotIndex);
            await updateDoc(doc(db, `artifacts/${appId}/public/data/classrooms`, deleteInfo.classroomId), { schedule: updatedSchedule });
        }
        setDeleteInfo(null);
    };
    const handleOpenColorPicker = (classroomData) => {
        setSelectedClassroomForColor(classroomData);
        setTempColor(classroomData.color || '#2196f3');
        setOpenColorPickerDialog(true);
    };
    const handleSaveColor = async () => {
        if (!selectedClassroomForColor) return;
        await updateDoc(doc(db, `artifacts/${appId}/public/data/classrooms`, selectedClassroomForColor.id), { color: tempColor });
        setOpenColorPickerDialog(false);
    };
    const handleClearSchedule = () => setOpenClearConfirmDialog(true);
    const handleConfirmClearSchedule = async () => {
        setOpenClearConfirmDialog(false);
        const q = query(collection(db, `artifacts/${appId}/public/data/classrooms`));
        const snapshot = await getDocs(q);
        const deletePromises = snapshot.docs.map(docToDelete => deleteDoc(docToDelete.ref));
        await Promise.all(deletePromises);
    };

    const handleVisibleDaysChange = (event) => {
        const {
          target: { value },
        } = event;
        const selectedDays = typeof value === 'string' ? value.split(',') : value;
    
        const sortedSelectedDays = selectedDays.sort((a, b) => {
            return ALL_DAYS_OF_WEEK.indexOf(a) - ALL_DAYS_OF_WEEK.indexOf(b);
        });
    
        setVisibleDays(sortedSelectedDays);
    };

    const handleVisibleTeachersChange = (event) => {
        const {
          target: { value },
        } = event;
        setSelectedTeacherIds(typeof value === 'string' ? value.split(',') : value);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <Container maxWidth={false} sx={{ mt: 4, mb: 4 }}>
            <style>
                {`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        #printable-schedule, #printable-schedule * {
                            visibility: visible;
                        }
                        #printable-schedule {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            height: 100%;
                            overflow: visible;
                        }
                        .no-print {
                            display: none !important;
                        }
                    }
                `}
            </style>
            <Paper id="printable-schedule" elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                <Box className="no-print" sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                    <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Ώρα Έναρξης</InputLabel>
                        <Select value={calendarStartHour} onChange={(e) => setCalendarStartHour(parseInt(e.target.value))} label="Ώρα Έναρξης">
                            {Array.from({ length: 24 }, (_, i) => i).map(hour => <MenuItem key={hour} value={hour} disabled={hour >= calendarEndHour}>{String(hour).padStart(2, '0')}:00</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Ώρα Λήξης</InputLabel>
                        <Select value={calendarEndHour} onChange={(e) => setCalendarEndHour(parseInt(e.target.value))} label="Ώρα Λήξης">
                            {Array.from({ length: 25 }, (_, i) => i).map(hour => <MenuItem key={hour} value={hour} disabled={hour <= calendarStartHour}>{String(hour).padStart(2, '0')}:00</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl variant="outlined" size="small" sx={{ minWidth: 220 }}>
                        <InputLabel>Εμφάνιση Ημερών</InputLabel>
                        <Select
                            multiple
                            value={visibleDays}
                            onChange={handleVisibleDaysChange}
                            label="Εμφάνιση Ημερών"
                            renderValue={(selected) => selected.join(', ')}
                        >
                           {ALL_DAYS_OF_WEEK.map(day => (
                               <MenuItem key={day} value={day}>
                                   <Checkbox checked={visibleDays.indexOf(day) > -1} />
                                   <ListItemText primary={day} />
                               </MenuItem>
                           ))}
                        </Select>
                    </FormControl>
                    <FormControl variant="outlined" size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Εμφάνιση Καθηγητών</InputLabel>
                        <Select
                            multiple
                            value={selectedTeacherIds}
                            onChange={handleVisibleTeachersChange}
                            label="Εμφάνιση Καθηγητών"
                            renderValue={(selected) => {
                                if (selected.length === allTeachers.length) return 'Όλοι οι Καθηγητές';
                                return `${selected.length} επιλεγμένοι`;
                            }}
                        >
                           {allTeachers && allTeachers.map(teacher => (
                               <MenuItem key={teacher.id} value={teacher.id}>
                                   <Checkbox checked={selectedTeacherIds.indexOf(teacher.id) > -1} />
                                   <ListItemText primary={`${teacher.firstName} ${teacher.lastName}`} />
                               </MenuItem>
                           ))}
                        </Select>
                    </FormControl>
                    <Box sx={{ flexGrow: 1 }} />
                    <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint}>Εκτύπωση</Button>
                    <Button variant="outlined" color="error" startIcon={<ClearAll />} onClick={handleClearSchedule}>Εκκαθάριση</Button>
                </Box>
                <Typography variant="h5" sx={{ mb: 3 }} className="no-print">Εβδομαδιαίο Πρόγραμμα</Typography>
                
                <Box sx={{ maxHeight: '75vh', overflow: 'auto' }}>
                    <Box sx={{ position: 'relative', minWidth: `${TIME_COLUMN_WIDTH_PX + (teacherColumns.length * visibleDays.length * 150)}px` }}>
                        <Box sx={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'white' }}>
                            <Box sx={{ display: 'flex', height: `${HEADER_ROW_HEIGHT_PX}px` }}>
                                <Box sx={{ width: `${TIME_COLUMN_WIDTH_PX}px`, flexShrink: 0, borderBottom: '1px solid #e0e0e0' }} />
                                {visibleDays.map(day => (
                                    <Box key={day} sx={{ width: `${gridDimensions.dayWidth}px`, flexShrink: 0, textAlign: 'center', border: '1px solid #e0e0e0', borderTop: 'none', borderLeft: 'none', backgroundColor: '#1e86cc', color: '#fff' }}>
                                        <Typography variant="h6" sx={{p:1, height: '50%', boxSizing: 'border-box'}}>{day}</Typography>
                                        <Box sx={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.2)', height: '50%'}}>
                                            {teacherColumns.map((teacher, index) => (
                                                <Typography
                                                    key={teacher.id}
                                                    variant="caption"
                                                    sx={{
                                                        width: `${gridDimensions.teacherColumnWidth}px`,
                                                        borderLeft: '1px solid rgba(0,0,0,0.1)',
                                                        p: 0.5,
                                                        boxSizing: 'border-box',
                                                        backgroundColor: colorPalette[index % colorPalette.length],
                                                        color: '#000',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontWeight: 500
                                                    }}
                                                >
                                                    {teacher.firstName} {teacher.lastName}
                                                </Typography>
                                            ))}
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                        
                        <Box sx={{ display: 'flex' }}>
                            <Box sx={{ width: `${TIME_COLUMN_WIDTH_PX}px`, flexShrink: 0, position: 'sticky', left: 0, backgroundColor: 'white', zIndex: 9, borderTop: '1px solid #e0e0e0' }}>
                                {TIME_SLOTS.map((time, index) => (
                                    <Box key={time} sx={{ height: `${gridDimensions.cellHeight-1}px`, position: 'relative', borderBottom: index < TIME_SLOTS.length -1 ? '1px solid #e0e0e0' : 'none', boxSizing: 'content-box' }}>
                                        <Typography variant="caption" sx={{ position: 'absolute', top: 0, right: '5px', transform: 'translateY(-50%)', backgroundColor: 'white', px: 0.5, zIndex: 1 }}>
                                            {time}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                            <Box ref={gridBodyRef} sx={{ position: 'relative', width: `calc(100% - ${TIME_COLUMN_WIDTH_PX}px)` }} onMouseDown={handleGridMouseDown}>
                                {/* Layer 1: Background Grid Lines */}
                                <Box sx={{ display: 'flex', position: 'absolute', inset: 0 }}>
                                    {visibleDays.map((day, dayIndex) => (
                                        <Box key={day} sx={{ display: 'flex', width: `${gridDimensions.dayWidth}px` }}>
                                            {teacherColumns.map((teacher, teacherIndex) => {
                                                let borderLeftStyle = '1px solid #ddd';
                                                
                                                if (teacherIndex === 0) {
                                                    if (dayIndex > 0) {
                                                        borderLeftStyle = '3px double #999'; 
                                                    } else {
                                                        borderLeftStyle = 'none'; 
                                                    }
                                                }
                                                
                                                return (
                                                    <Box
                                                        key={teacher.id}
                                                        sx={{
                                                            width: `${gridDimensions.teacherColumnWidth}px`,
                                                            borderLeft: borderLeftStyle,
                                                        }}
                                                    />
                                                );
                                            })}
                                        </Box>
                                    ))}
                                </Box>
                                 <Box sx={{ position: 'absolute', inset: 0 }}>
                                    {TIME_SLOTS.slice(0, -1).map((time, index) => (
                                        <Box key={time} sx={{ height: `${gridDimensions.cellHeight}px`, borderTop: '1px solid #e0e0e0' }} />
                                    ))}
                                 </Box>

                                {/* Layer 2: Floating Elements (Events, selections) */}
                                {tempFloatingSelectionRect && <Box sx={{ position: 'absolute', ...tempFloatingSelectionRect, zIndex: 4, backgroundColor: 'rgba(179, 229, 252, 0.5)', border: '1px solid #2196f3', borderRadius: '4px' }} />}
                                {accumulatedSelections.map((selection, index) => {
                                    const dayIdx = visibleDays.indexOf(selection.day);
                                    const startHourIdx = TIME_SLOTS.indexOf(selection.startTime);
                                    const endHourIdx = TIME_SLOTS.indexOf(selection.endTime);
                                    const teacherIdx = addHoursMode ? teacherColumns.findIndex(t => t.id === addHoursMode.teacherId) : startSelection.teacherIndex;
                                    if (dayIdx === -1 || startHourIdx === -1 || endHourIdx === -1 || gridDimensions.teacherColumnWidth === 0) return null;
                                    const left = (dayIdx * teacherColumns.length * gridDimensions.teacherColumnWidth) + (teacherIdx * gridDimensions.teacherColumnWidth);
                                    const top = startHourIdx * gridDimensions.cellHeight;
                                    const height = (endHourIdx - startHourIdx) * gridDimensions.cellHeight;
                                    const width = gridDimensions.teacherColumnWidth - 2;
                                    return <Box key={index} sx={{ position: 'absolute', left, top, width, height, backgroundColor: 'rgba(76, 175, 80, 0.7)', border: '1px dashed #4caf50', borderRadius: '4px', zIndex: 9 }} />;
                                })}
                                {displayedEventBlocks.map(block => {
                                    const isBeingEdited = addHoursMode && block.fullClassroomData.id === addHoursMode.id;
                                    return (
                                        <FloatingEventBlock key={block.id} {...block} onEdit={handleEditEntry} onDelete={handleDeleteEntry} onDragStart={handleEventDragStart} onResizeStart={handleEventResizeStart} onOpenColorPicker={handleOpenColorPicker} onAddMoreHours={handleEnterAddHoursMode} backgroundColor={isBeingEdited ? '#4caf50' : block.backgroundColor} />
                                    );
                                })}
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </Paper>

            {/* Floating Action Panels */}
            <Box className="no-print">
                {!addHoursMode && accumulatedSelections.length > 0 && (
                    <Paper elevation={6} sx={{ position: 'fixed', bottom: 20, right: 20, p: 2, zIndex: 1300 }}>
                        <Typography>Επιλεγμένες Ώρες: {accumulatedSelections.length}</Typography>
                        <Button onClick={() => navigate('/classroom/new', { state: { initialSchedule: accumulatedSelections } })}>Δημιουργία Τμήματος</Button>
                        <Button onClick={() => setAccumulatedSelections([])}>Εκκαθάριση</Button>
                    </Paper>
                )}
                {addHoursMode && (
                    <Paper elevation={6} sx={{ position: 'fixed', bottom: 20, right: 20, p: 2, zIndex: 1300 }}>
                        <Typography>Προσθήκη στο τμήμα: {addHoursMode.subject}</Typography>
                        <Button onClick={handleSaveAddedHours} disabled={accumulatedSelections.length === 0}>Αποθήκευση</Button>
                        <Button onClick={handleCancelAddHours}>Ακύρωση</Button>
                    </Paper>
                )}
            </Box>

            {/* Dialogs */}
            <Dialog open={!!deleteInfo} onClose={() => setDeleteInfo(null)}>
                <DialogTitle>Επιβεβαίωση Διαγραφής</DialogTitle>
                <DialogContent><DialogContentText>Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την ώρα;</DialogContentText></DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteInfo(null)}>Ακύρωση</Button>
                    <Button onClick={handleConfirmSlotDelete} color="error">Διαγραφή</Button>
                </DialogActions>
            </Dialog>
            <Dialog open={openClearConfirmDialog} onClose={() => setOpenClearConfirmDialog(false)}>
                <DialogTitle>Επιβεβαίωση Εκκαθάρισης</DialogTitle>
                <DialogContent><DialogContentText>Αυτή η ενέργεια θα διαγράψει ΟΛΑ τα τμήματα. Είστε σίγουροι;</DialogContentText></DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenClearConfirmDialog(false)}>Ακύρωση</Button>
                    <Button onClick={handleConfirmClearSchedule} color="error">Εκκαθάριση</Button>
                </DialogActions>
            </Dialog>
            <Dialog open={openConflictDialog} onClose={() => setOpenConflictDialog(false)}>
                <DialogTitle>Ειδοποίηση</DialogTitle>
                <DialogContent><DialogContentText>{conflictMessage}</DialogContentText></DialogContent>
                <DialogActions><Button onClick={() => setOpenConflictDialog(false)}>Εντάξει</Button></DialogActions>
            </Dialog>
             <Dialog open={openColorPickerDialog} onClose={() => setOpenColorPickerDialog(false)}>
                <DialogTitle>Αλλαγή Χρώματος</DialogTitle>
                <DialogContent>
                    <input type="color" value={tempColor} onChange={(e) => setTempColor(e.target.value)} style={{ width: '100px', height: '100px' }}/>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenColorPickerDialog(false)}>Ακύρωση</Button>
                    <Button onClick={handleSaveColor}>Αποθήκευση</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default WeeklyScheduleCalendar;
