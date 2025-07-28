// src/pages/StudentsList.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Container, Grid, Paper, Typography, TextField, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TablePagination,
    IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, CircularProgress,
    Tabs, Tab, Divider, FormControl, InputLabel, Select, MenuItem, Chip, List, ListItem, ListItemText, Alert, ListItemIcon
} from '@mui/material';
import { Edit, Delete, Payment as PaymentIcon, Save as SaveIcon, Add as AddIcon, UploadFile, Download, DeleteForever } from '@mui/icons-material';
import { doc, deleteDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import dayjs from 'dayjs';
import StudentProgressChart from './StudentProgressChart.jsx';

// Helper component for displaying details in a structured way
const DetailItem = ({ label, value }) => (
    <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary" display="block" sx={{ fontWeight: 500 }}>
            {label}
        </Typography>
        <Typography>
            {value || '-'}
        </Typography>
    </Box>
);

function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

// Helper functions and constants
const getDateFromFirestoreTimestamp = (timestamp) => {
    if (timestamp && typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (timestamp instanceof Date) return timestamp;
    return dayjs(timestamp).toDate();
};

const schoolYearMonths = [
    { name: 'Σεπτέμβριος', number: 9 }, { name: 'Οκτώβριος', number: 10 },
    { name: 'Νοέμβριος', number: 11 }, { name: 'Δεκέμβριος', number: 12 },
    { name: 'Ιανουάριος', number: 1 }, { name: 'Φεβρουάριος', number: 2 },
    { name: 'Μάρτιος', number: 3 }, { name: 'Απρίλιος', number: 4 },
    { name: 'Μάιος', number: 5 }, { name: 'Ιούνιος', number: 6 }
];

const formatSchedule = (schedule) => {
    if (!schedule || schedule.length === 0) return 'Χωρίς πρόγραμμα';
    const dayMapping = { 'Δευτέρα': 'Δε', 'Τρίτη': 'Τρ', 'Τετάρτη': 'Τε', 'Πέμπτη': 'Πε', 'Παρασκευή': 'Πα', 'Σάββατο': 'Σα' };
    return schedule.map(slot => `${dayMapping[slot.day] || slot.day.substring(0, 2)} ${slot.startTime}-${slot.endTime}`).join(' | ');
};


function StudentsList({ allStudents, allGrades, allAbsences, allPayments, classrooms, loading, db, appId }) {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [page, setPage] = useState(0);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [sortColumn, setSortColumn] = useState('lastName');
    const [sortDirection, setSortDirection] = useState('asc');
    const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState(null);
    const [activeTab, setActiveTab] = useState(0);

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedGradeType, setSelectedGradeType] = useState('');
    
    const [studentNotes, setStudentNotes] = useState('');
    const [isSavingNotes, setIsSavingNotes] = useState(false);
    const [notesFeedback, setNotesFeedback] = useState({ type: '', message: '' });

    const [openCommunicationDialog, setOpenCommunicationDialog] = useState(false);
    const [newCommunicationEntry, setNewCommunicationEntry] = useState({ date: dayjs().format('YYYY-MM-DD'), type: 'Τηλεφώνημα', summary: '' });
    const [isSavingCommunication, setIsSavingCommunication] = useState(false);

    const [isUploading, setIsUploading] = useState(false);
    const [documentToDelete, setDocumentToDelete] = useState(null);
    const [openDocDeleteConfirm, setOpenDocDeleteConfirm] = useState(false);


    useEffect(() => {
        setActiveTab(0);
    }, [selectedStudent]);

    const handleTabChange = (event, newValue) => setActiveTab(newValue);

    const availableSubjects = useMemo(() => {
        if (!selectedStudent || !allGrades) return [];
        const studentAllGrades = allGrades.filter(grade => grade.studentId === selectedStudent.id);
        const subjects = new Set(studentAllGrades.map(grade => grade.subject));
        return Array.from(subjects).sort();
    }, [selectedStudent, allGrades]);

    const availableGradeTypes = useMemo(() => {
        if (!selectedStudent || !allGrades) return [];
        const studentAllGrades = allGrades.filter(grade => grade.studentId === selectedStudent.id);
        const types = new Set(studentAllGrades.map(grade => grade.type).filter(Boolean));
        return Array.from(types).sort();
    }, [selectedStudent, allGrades]);

    const studentGrades = useMemo(() => {
        if (!selectedStudent || !allGrades) return [];
        
        let grades = allGrades.filter(grade => grade.studentId === selectedStudent.id);

        if (startDate) grades = grades.filter(grade => dayjs(grade.date.toDate()).isAfter(dayjs(startDate).startOf('day')));
        if (endDate) grades = grades.filter(grade => dayjs(grade.date.toDate()).isBefore(dayjs(endDate).endOf('day')));
        if (selectedSubject) grades = grades.filter(grade => grade.subject === selectedSubject);
        if (selectedGradeType) grades = grades.filter(grade => grade.type === selectedGradeType);

        return grades.sort((a, b) => b.date.toDate() - a.date.toDate());
    }, [selectedStudent, allGrades, startDate, endDate, selectedSubject, selectedGradeType]);

    // --- ΝΕΟ: Υπολογισμός μέσου όρου ανά μάθημα (με βάση τα φίλτρα) ---
    const subjectAverage = useMemo(() => {
        if (!selectedSubject || studentGrades.length === 0) return null;
        const sum = studentGrades.reduce((acc, curr) => acc + parseFloat(curr.grade), 0);
        return (sum / studentGrades.length).toFixed(2);
    }, [studentGrades, selectedSubject]);

    // --- ΝΕΟ: Υπολογισμός μέσου όρου τάξης για κάθε αξιολόγηση ---
    const classAveragesMap = useMemo(() => {
        if (!allGrades) return new Map();
        const groups = {};
        allGrades.forEach(grade => {
            const key = `${dayjs(grade.date.toDate()).format('YYYY-MM-DD')}-${grade.subject}-${grade.type}`;
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(parseFloat(grade.grade));
        });

        const averages = new Map();
        for (const key in groups) {
            const sum = groups[key].reduce((acc, curr) => acc + curr, 0);
            averages.set(key, (sum / groups[key].length).toFixed(2));
        }
        return averages;
    }, [allGrades]);


    const studentAbsences = useMemo(() => {
        if (!selectedStudent || !allAbsences) return { list: [], total: 0, justified: 0, unjustified: 0 };
        const list = allAbsences.filter(absence => absence.studentId === selectedStudent.id).sort((a, b) => b.date.toDate() - a.date.toDate());
        const justified = list.filter(a => a.status === 'justified').length;
        const unjustified = list.filter(a => a.status === 'absent').length;
        return { list, total: list.length, justified, unjustified };
    }, [selectedStudent, allAbsences]);

    const averageGrade = useMemo(() => {
        if (!selectedStudent || !allGrades) return null;
        const gradesForStudent = allGrades.filter(grade => grade.studentId === selectedStudent.id);
        if (gradesForStudent.length === 0) return null;
        const sum = gradesForStudent.reduce((acc, curr) => acc + parseFloat(curr.grade), 0);
        return (sum / gradesForStudent.length).toFixed(2);
    }, [selectedStudent, allGrades]);

    const studentFinancials = useMemo(() => {
        if (!selectedStudent || !allPayments) return null;
        const monthlyFeeRaw = parseFloat(selectedStudent.payment) || 0;
        const discount = parseFloat(selectedStudent.debt) || 0;
        const monthlyFee = monthlyFeeRaw - (monthlyFeeRaw * (discount / 100));
        const finalFees = monthlyFee * schoolYearMonths.length;
        const paymentsForStudent = allPayments.filter(p => p.studentId === selectedStudent.id);
        const totalPaid = paymentsForStudent.reduce((sum, p) => sum + p.amount, 0);
        const balance = finalFees - totalPaid;
        return { monthlyFee, finalFees, totalPaid, balance };
    }, [selectedStudent, allPayments]);

    const monthlyBreakdown = useMemo(() => {
        if (!selectedStudent || !allPayments || !studentFinancials) return [];
        const paymentsForStudent = allPayments.filter(p => p.studentId === selectedStudent.id);
        const today = dayjs();
        const currentSchoolYearStartYear = today.month() + 1 >= 9 ? today.year() : today.year() - 1;
        return schoolYearMonths.map(month => {
            const paidThisMonth = paymentsForStudent.filter(p => {
                const isForThisMonthNote = p.notes === `Δόση ${month.name}`;
                if (!isForThisMonthNote) return false;
                const paymentDate = dayjs(getDateFromFirestoreTimestamp(p.date));
                const paymentSchoolYearStartYear = paymentDate.month() + 1 >= 9 ? paymentDate.year() : paymentDate.year() - 1;
                return paymentSchoolYearStartYear === currentSchoolYearStartYear;
            }).reduce((sum, p) => sum + p.amount, 0);
            const dueAmount = studentFinancials.monthlyFee;
            const balance = dueAmount - paidThisMonth;
            return { month: month.name, due: dueAmount, paid: paidThisMonth, balance: balance, status: balance <= 0.01 ? 'Εξοφλημένο' : 'Εκκρεμεί' };
        });
    }, [selectedStudent, allPayments, studentFinancials]);

    const selectedStudentPayments = useMemo(() => {
        if (!selectedStudent || !allPayments) return [];
        return allPayments.filter(p => p.studentId === selectedStudent.id).sort((a, b) => getDateFromFirestoreTimestamp(b.date) - getDateFromFirestoreTimestamp(a.date));
    }, [selectedStudent, allPayments]);

    const enrolledClassrooms = useMemo(() => {
        if (!selectedStudent || !classrooms) return [];
        return classrooms.filter(c => selectedStudent.enrolledClassrooms?.includes(c.id));
    }, [selectedStudent, classrooms]);

    const filteredAndSortedStudents = useMemo(() => {
        let filtered = (allStudents || []).filter(student =>
            (student.firstName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (student.lastName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (student.grade?.toLowerCase() || '').includes(searchTerm.toLowerCase())
        );
        if (sortColumn) {
            filtered.sort((a, b) => {
                const aValue = a[sortColumn] || '';
                const bValue = b[sortColumn] || '';
                if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return filtered;
    }, [allStudents, searchTerm, sortColumn, sortDirection]);

    const handleSearchChange = (event) => { setSearchTerm(event.target.value); setPage(0); };
    const handleRowsPerPageChange = (event) => { setRowsPerPage(parseInt(event.target.value, 10)); setPage(0); };
    const handlePageChange = (event, newPage) => setPage(newPage);
    
    const handleRowClick = (student) => {
        setSelectedStudent(student);
        setStartDate(''); setEndDate(''); setSelectedSubject(''); setSelectedGradeType('');
        setStudentNotes(student.notes || '');
        setNotesFeedback({ type: '', message: '' });
    };

    const handleSort = (column) => {
        if (sortColumn === column) { setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); } 
        else { setSortColumn(column); setSortDirection('asc'); }
    };

    const handleEditClick = (student) => navigate(`/student/edit/${student.id}`);
    const handleDeleteClick = (student) => { setStudentToDelete(student); setOpenDeleteConfirm(true); };
    const handleCloseDeleteConfirm = () => { setOpenDeleteConfirm(false); setStudentToDelete(null); };
    const handleConfirmDelete = async () => {
        if (!db || !appId || !studentToDelete) return;
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/students`, studentToDelete.id));
            setSelectedStudent(null);
        } catch (error) { console.error("Error deleting student:", error); } 
        finally { handleCloseDeleteConfirm(); }
    };

    const handleSaveNotes = async () => {
        if (!selectedStudent || !db) return;
        setIsSavingNotes(true);
        setNotesFeedback({ type: '', message: '' });
        try {
            await updateDoc(doc(db, `artifacts/${appId}/public/data/students`, selectedStudent.id), { notes: studentNotes });
            setNotesFeedback({ type: 'success', message: 'Οι σημειώσεις αποθηκεύτηκαν!' });
        } catch (error) {
            console.error("Error saving notes:", error);
            setNotesFeedback({ type: 'error', message: 'Αποτυχία αποθήκευσης.' });
        } finally {
            setIsSavingNotes(false);
        }
    };

    const handleSaveCommunication = async () => {
        if (!selectedStudent || !db || !newCommunicationEntry.summary) return;
        setIsSavingCommunication(true);
        const entryToSave = { ...newCommunicationEntry, id: Date.now(), date: dayjs(newCommunicationEntry.date).toDate() };
        try {
            await updateDoc(doc(db, `artifacts/${appId}/public/data/students`, selectedStudent.id), { communicationLog: arrayUnion(entryToSave) });
            setSelectedStudent(prev => ({ ...prev, communicationLog: [...(prev.communicationLog || []), entryToSave] }));
            setOpenCommunicationDialog(false);
            setNewCommunicationEntry({ date: dayjs().format('YYYY-MM-DD'), type: 'Τηλεφώνημα', summary: '' });
        } catch (error) { console.error("Error saving communication log:", error); } 
        finally { setIsSavingCommunication(false); }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file || !selectedStudent) return;
        setIsUploading(true);
        const storage = getStorage(db.app);
        const storageRef = ref(storage, `artifacts/${appId}/student_documents/${selectedStudent.id}/${Date.now()}_${file.name}`);
        try {
            const snapshot = await uploadBytes(storageRef, file);
            const fileData = { name: file.name, path: snapshot.ref.fullPath, uploadedAt: new Date() };
            await updateDoc(doc(db, `artifacts/${appId}/public/data/students`, selectedStudent.id), { documents: arrayUnion(fileData) });
            setSelectedStudent(prev => ({ ...prev, documents: [...(prev.documents || []), fileData] }));
        } catch (error) { console.error("Error uploading file:", error); } 
        finally { setIsUploading(false); }
    };

    const handleFileDownload = async (filePath) => {
        try {
            const storage = getStorage(db.app);
            const url = await getDownloadURL(ref(storage, filePath));
            window.open(url, '_blank');
        } catch (error) { console.error("Error getting download URL:", error); }
    };

    const handleConfirmDocDelete = async () => {
        if (!documentToDelete || !selectedStudent) return;
        const storage = getStorage(db.app);
        const fileRef = ref(storage, documentToDelete.path);
        try {
            await deleteObject(fileRef);
            await updateDoc(doc(db, `artifacts/${appId}/public/data/students`, selectedStudent.id), { documents: arrayRemove(documentToDelete) });
            setSelectedStudent(prev => ({ ...prev, documents: prev.documents.filter(d => d.path !== documentToDelete.path) }));
        } catch (error) { console.error("Error deleting document:", error); } 
        finally { setOpenDocDeleteConfirm(false); setDocumentToDelete(null); }
    };


    const paginatedStudents = filteredAndSortedStudents.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    if (loading) {
        return <Container sx={{ mt: 4, textAlign: 'center' }}><CircularProgress /></Container>;
    }

    return (
        <Container maxWidth={false}>
            <Box sx={{ mt: 3, mb: 3 }}>
                <TextField fullWidth label="Αναζήτηση με όνομα ή τάξη..." variant="outlined" size="small" value={searchTerm} onChange={handleSearchChange} />
            </Box>
            <Grid container spacing={3}>
                <Grid item xs={12} md={3}>
                    <TableContainer component={Paper} elevation={3} sx={{ borderRadius: '5px', overflowX: 'auto' }}>
                        <Table>
                           <TableHead sx={{ backgroundColor: '#1e86cc' }}>
                                <TableRow>
                                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>#</TableCell>
                                    <TableCell sx={{ color: '#fff', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => handleSort('lastName')}>Επώνυμο</TableCell>
                                    <TableCell sx={{ color: '#fff', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => handleSort('firstName')}>Όνομα</TableCell>
                                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Ενέργειες</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedStudents.map((student, index) => (
                                    <TableRow key={student.id} onClick={() => handleRowClick(student)} hover sx={{ cursor: 'pointer', backgroundColor: selectedStudent?.id === student.id ? '#eef6fb' : 'inherit' }}>
                                        <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                                        <TableCell>{student.lastName}</TableCell>
                                        <TableCell>{student.firstName}</TableCell>
                                        <TableCell>
                                            <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); handleEditClick(student); }}><Edit /></IconButton>
                                            <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); handleDeleteClick(student); }}><Delete /></IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination rowsPerPageOptions={[5, 10, 20, 50]} component="div" count={filteredAndSortedStudents.length} rowsPerPage={rowsPerPage} page={page} onPageChange={handlePageChange} onRowsPerPageChange={handleRowsPerPageChange} />
                </Grid>
                <Grid item xs={12} md={9}>
                    <Paper elevation={3} sx={{ borderRadius: '5px', minHeight: '300px' }}>
                        {!selectedStudent ? (
                            <Box sx={{ p: 3 }}><Typography>Επιλέξτε έναν μαθητή για να δείτε λεπτομέρειες.</Typography></Box>
                        ) : (
                            <>
                                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                                    <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
                                        <Tab label="Λεπτομέρειες" />
                                        <Tab label="Εγγεγραμμένα Τμήματα" />
                                        <Tab label="Βαθμολογία & Πρόοδος" />
                                        <Tab label="Δίδακτρα" />
                                        <Tab label="Απουσίες" />
                                        <Tab label="Επικοινωνία" />
                                        <Tab label="Έγγραφα" />
                                        <Tab label="Σημειώσεις" />
                                    </Tabs>
                                </Box>
                                <TabPanel value={activeTab} index={0}>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}><DetailItem label="Όνομα" value={selectedStudent.firstName} /></Grid>
                                        <Grid item xs={12} sm={6}><DetailItem label="Επώνυμο" value={selectedStudent.lastName} /></Grid>
                                        <Grid item xs={12} sm={6}><DetailItem label="Τάξη" value={selectedStudent.grade} /></Grid>
                                        <Grid item xs={12} sm={6}><DetailItem label="Κατεύθυνση" value={selectedStudent.specialization} /></Grid>
                                        <Grid item xs={12} sm={6}><DetailItem label="Μέσος Όρος" value={averageGrade} /></Grid>
                                        <Grid item xs={12} sm={6}><DetailItem label="Σύνολο Απουσιών" value={studentAbsences.total} /></Grid>
                                        <Grid item xs={12} sm={6}><DetailItem label="Ημερομηνία Εγγραφής" value={selectedStudent.createdAt ? dayjs(selectedStudent.createdAt.toDate()).format('DD/MM/YYYY') : '-'} /></Grid>
                                        <Grid item xs={12} sm={6}><DetailItem label="Διεύθυνση" value={selectedStudent.address} /></Grid>
                                        <Grid item xs={12} sm={6}><DetailItem label="Τηλέφωνο" value={selectedStudent.studentPhone} /></Grid>
                                        <Grid item xs={12} sm={6}><DetailItem label="Email" value={selectedStudent.email} /></Grid>
                                    </Grid>
                                    <Divider sx={{ my: 2 }} />
                                    <Typography variant="h6" sx={{ mb: 1.5, fontSize: '1.1rem' }}>Στοιχεία Γονέων</Typography>
                                    {selectedStudent.parents && selectedStudent.parents.length > 0 ? (
                                        selectedStudent.parents.map((parent, index) => (
                                            <React.Fragment key={index}>
                                                {selectedStudent.parents.length > 1 && (<Typography variant="subtitle2" color="text.secondary" sx={{ mt: index > 0 ? 2 : 0, mb: 1 }}>Γονέας {index + 1}</Typography>)}
                                                <Grid container spacing={2}>
                                                    <Grid item xs={12} sm={6}><DetailItem label="Ονοματεπώνυμο Γονέα" value={parent.name} /></Grid>
                                                    <Grid item xs={12} sm={6}><DetailItem label="Τηλέφωνα" value={parent.phones?.join(', ')} /></Grid>
                                                </Grid>
                                            </React.Fragment>
                                        ))
                                    ) : (<Typography>Δεν υπάρχουν καταχωρημένα στοιχεία γονέων.</Typography>)}
                                </TabPanel>
                                <TabPanel value={activeTab} index={1}>
                                    <Typography variant="h6" sx={{ mb: 2 }}>Πρόγραμμα Μαθητή</Typography>
                                    {enrolledClassrooms.length > 0 ? (<List dense>{enrolledClassrooms.map(classroom => (<ListItem key={classroom.id} divider><ListItemText primary={`${classroom.classroomName} - ${classroom.subject}`} secondary={formatSchedule(classroom.schedule)}/></ListItem>))}</List>) : ( <Typography>Ο μαθητής δεν είναι εγγεγραμμένος σε κάποιο τμήμα.</Typography> )}
                                </TabPanel>
                                <TabPanel value={activeTab} index={2}>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2, alignItems: 'center' }}>
                                        <TextField label="Από Ημερομηνία" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small"/>
                                        <TextField label="Έως Ημερομηνία" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small"/>
                                        <FormControl size="small" sx={{ minWidth: 150 }}><InputLabel>Μάθημα</InputLabel><Select value={selectedSubject} label="Μάθημα" onChange={(e) => setSelectedSubject(e.target.value)}><MenuItem value=""><em>Όλα τα Μαθήματα</em></MenuItem>{availableSubjects.map(subject => (<MenuItem key={subject} value={subject}>{subject}</MenuItem>))}</Select></FormControl>
                                        <FormControl size="small" sx={{ minWidth: 150 }}><InputLabel>Τύπος Αξιολόγησης</InputLabel><Select value={selectedGradeType} label="Τύπος Αξιολόγησης" onChange={(e) => setSelectedGradeType(e.target.value)}><MenuItem value=""><em>Όλοι οι Τύποι</em></MenuItem>{availableGradeTypes.map(type => (<MenuItem key={type} value={type}>{type}</MenuItem>))}</Select></FormControl>
                                        <Button size="small" onClick={() => { setStartDate(''); setEndDate(''); setSelectedSubject(''); setSelectedGradeType(''); }}>Καθαρισμός</Button>
                                    </Box>
                                    {/* --- ΝΕΟ: Εμφάνιση Μ.Ο. μαθήματος --- */}
                                    {subjectAverage && <Typography variant="subtitle1" sx={{mb: 2}}>Μέσος όρος στο μάθημα <strong>{selectedSubject}</strong>: <strong>{subjectAverage}</strong></Typography>}

                                    {studentGrades.length > 0 ? (
                                        <>
                                            <TableContainer><Table size="small"><TableHead><TableRow><TableCell>Ημ/νία</TableCell><TableCell>Μάθημα</TableCell><TableCell>Τύπος</TableCell><TableCell align="right">Βαθμός</TableCell><TableCell align="right">Μ.Ο. Τάξης</TableCell></TableRow></TableHead><TableBody>{studentGrades.map((grade) => {
                                                const key = `${dayjs(grade.date.toDate()).format('YYYY-MM-DD')}-${grade.subject}-${grade.type}`;
                                                const classAvg = classAveragesMap.get(key);
                                                return (<TableRow key={grade.id}><TableCell>{dayjs(grade.date.toDate()).format('DD/MM/YYYY')}</TableCell><TableCell>{grade.subject}</TableCell><TableCell>{grade.type}</TableCell><TableCell align="right">{grade.grade}</TableCell><TableCell align="right">{classAvg || '-'}</TableCell></TableRow>);
                                            })}</TableBody></Table></TableContainer>
                                            <Divider sx={{ my: 3 }} />
                                            <Typography variant="h6" sx={{ mb: 2 }}>Γράφημα Προόδου</Typography>
                                            <StudentProgressChart studentGrades={studentGrades} startDate={startDate} endDate={endDate}/>
                                        </>
                                    ) : (<Typography>Δεν υπάρχουν καταχωρημένοι βαθμοί για τα επιλεγμένα φίλτρα.</Typography>)}
                                </TabPanel>
                                <TabPanel value={activeTab} index={3}>
                                    {studentFinancials ? (
                                        <>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}><Typography variant="h6">Οικονομική Εικόνα</Typography><Button variant="contained" size="small" startIcon={<PaymentIcon />} onClick={() => navigate('/payments', { state: { selectedStudentId: selectedStudent.id } })}>Διαχείριση Πληρωμών</Button></Box>
                                            <Grid container spacing={2} sx={{ mb: 3 }}><Grid item xs={12} sm={4}><DetailItem label="Σύνολο Διδάκτρων" value={`${studentFinancials.finalFees.toFixed(2)} €`} /></Grid><Grid item xs={12} sm={4}><DetailItem label="Πληρωμένα" value={`${studentFinancials.totalPaid.toFixed(2)} €`} /></Grid><Grid item xs={12} sm={4}><DetailItem label="Υπόλοιπο" value={`${studentFinancials.balance.toFixed(2)} €`} /></Grid></Grid>
                                            <Typography variant="h6" sx={{ mb: 2 }}>Μηνιαία Ανάλυση</Typography>
                                            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}><Table size="small"><TableHead><TableRow><TableCell>Μήνας</TableCell><TableCell>Δίδακτρα</TableCell><TableCell>Πληρωμένα</TableCell><TableCell>Υπόλοιπο</TableCell><TableCell>Κατάσταση</TableCell></TableRow></TableHead><TableBody>{monthlyBreakdown.map(row => (<TableRow key={row.month}><TableCell>{row.month}</TableCell><TableCell>{row.due.toFixed(2)} €</TableCell><TableCell>{row.paid.toFixed(2)} €</TableCell><TableCell>{row.balance.toFixed(2)} €</TableCell><TableCell><Chip label={row.status} color={row.status === 'Εξοφλημένο' ? 'success' : 'warning'} size="small" /></TableCell></TableRow>))}</TableBody></Table></TableContainer>
                                            <Typography variant="h6" sx={{ mb: 2 }}>Ιστορικό Πληρωμών</Typography>
                                            <TableContainer component={Paper} variant="outlined"><Table size="small"><TableHead><TableRow><TableCell>Ημερομηνία</TableCell><TableCell>Ποσό</TableCell><TableCell>Σημειώσεις</TableCell></TableRow></TableHead><TableBody>{selectedStudentPayments.map((p) => (<TableRow key={p.id}><TableCell>{dayjs(getDateFromFirestoreTimestamp(p.date)).format('DD/MM/YYYY')}</TableCell><TableCell>{p.amount.toFixed(2)} €</TableCell><TableCell>{p.notes}</TableCell></TableRow>))}</TableBody></Table></TableContainer>
                                        </>
                                    ) : (<Typography>Δεν υπάρχουν οικονομικά στοιχεία για αυτόν τον μαθητή.</Typography>)}
                                </TabPanel>
                                <TabPanel value={activeTab} index={4}>
                                    <Box><Typography variant="h6">Σύνολο Απουσιών: {studentAbsences.total}</Typography><Typography color="text.secondary">Δικαιολογημένες: {studentAbsences.justified}</Typography><Typography color="text.secondary">Αδικαιολόγητες: {studentAbsences.unjustified}</Typography></Box>
                                    {studentAbsences.list.length > 0 ? (<TableContainer sx={{mt: 2}}><Table size="small"><TableHead><TableRow><TableCell>Ημ/νία</TableCell><TableCell>Μάθημα</TableCell><TableCell>Κατάσταση</TableCell></TableRow></TableHead><TableBody>{studentAbsences.list.map((absence) => (<TableRow key={absence.id}><TableCell>{dayjs(absence.date.toDate()).format('DD/MM/YYYY')}</TableCell><TableCell>{absence.subject}</TableCell><TableCell>{absence.status === 'justified' ? 'Δικαιολογημένη' : 'Αδικαιολόγητη'}</TableCell></TableRow>))}</TableBody></Table></TableContainer>) : (<Typography sx={{mt: 2}}>Δεν υπάρχουν καταχωρημένες απουσίες.</Typography>)}
                                </TabPanel>
                                <TabPanel value={activeTab} index={5}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}><Typography variant="h6">Ιστορικό Επικοινωνίας</Typography><Button variant="contained" startIcon={<AddIcon />} size="small" onClick={() => setOpenCommunicationDialog(true)}>Νέα Καταχώρηση</Button></Box>
                                    {selectedStudent?.communicationLog && selectedStudent.communicationLog.length > 0 ? (<List>{[...selectedStudent.communicationLog].sort((a, b) => getDateFromFirestoreTimestamp(b.date) - getDateFromFirestoreTimestamp(a.date)).map(log => (<ListItem key={log.id} divider><ListItemText primary={`${log.type} - ${dayjs(getDateFromFirestoreTimestamp(log.date)).format('DD/MM/YYYY')}`} secondary={log.summary}/></ListItem>))}</List>) : (<Typography>Δεν υπάρχουν καταχωρήσεις επικοινωνίας.</Typography>)}
                                </TabPanel>
                                <TabPanel value={activeTab} index={6}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}><Typography variant="h6">Έγγραφα Μαθητή</Typography><Button variant="contained" component="label" startIcon={<UploadFile />} size="small" disabled={isUploading}>{isUploading ? 'Μεταφόρτωση...' : 'Μεταφόρτωση Εγγράφου'}<input type="file" hidden onChange={handleFileUpload} /></Button></Box>
                                    {selectedStudent?.documents && selectedStudent.documents.length > 0 ? (<List>{[...selectedStudent.documents].sort((a, b) => getDateFromFirestoreTimestamp(b.uploadedAt) - getDateFromFirestoreTimestamp(a.uploadedAt)).map(doc => (<ListItem key={doc.path} secondaryAction={<><IconButton edge="end" aria-label="download" onClick={() => handleFileDownload(doc.path)}><Download /></IconButton><IconButton edge="end" aria-label="delete" onClick={() => { setDocumentToDelete(doc); setOpenDocDeleteConfirm(true); }}><DeleteForever /></IconButton></>}><ListItemText primary={doc.name} secondary={`Μεταφορτώθηκε: ${dayjs(getDateFromFirestoreTimestamp(doc.uploadedAt)).format('DD/MM/YYYY HH:mm')}`}/></ListItem>))}</List>) : (<Typography>Δεν υπάρχουν έγγραφα για αυτόν τον μαθητή.</Typography>)}
                                </TabPanel>
                                <TabPanel value={activeTab} index={7}>
                                    <Typography variant="h6" sx={{ mb: 2 }}>Σημειώσεις & Σχόλια</Typography>
                                    <TextField fullWidth multiline rows={8} variant="outlined" label="Προσθέστε τις σημειώσεις σας εδώ..." value={studentNotes} onChange={(e) => setStudentNotes(e.target.value)}/>
                                    <Box sx={{ mt: 2, textAlign: 'right' }}><Button variant="contained" startIcon={<SaveIcon />} disabled={isSavingNotes} onClick={handleSaveNotes}>{isSavingNotes ? <CircularProgress size={24} /> : 'Αποθήκευση Σημειώσεων'}</Button></Box>
                                    {notesFeedback.message && (<Alert severity={notesFeedback.type} sx={{ mt: 2 }}>{notesFeedback.message}</Alert>)}
                                </TabPanel>
                            </>
                        )}
                    </Paper>
                </Grid>
            </Grid>
            <Dialog open={openDeleteConfirm} onClose={handleCloseDeleteConfirm}><DialogTitle>Επιβεβαίωση Διαγραφής</DialogTitle><DialogContent><DialogContentText>Είστε σίγουροι ότι θέλετε να διαγράψετε τον μαθητή {studentToDelete?.firstName} {studentToDelete?.lastName};</DialogContentText></DialogContent><DialogActions><Button onClick={handleCloseDeleteConfirm}>Ακύρωση</Button><Button onClick={handleConfirmDelete} color="error">Διαγραφή</Button></DialogActions></Dialog>
            <Dialog open={openCommunicationDialog} onClose={() => setOpenCommunicationDialog(false)} fullWidth maxWidth="sm"><DialogTitle>Νέα Καταχώρηση Επικοινωνίας</DialogTitle><DialogContent><Grid container spacing={2} sx={{pt: 1}}><Grid item xs={12} sm={6}><TextField label="Ημερομηνία" type="date" value={newCommunicationEntry.date} onChange={(e) => setNewCommunicationEntry(prev => ({ ...prev, date: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }}/></Grid><Grid item xs={12} sm={6}><FormControl fullWidth><InputLabel>Τύπος</InputLabel><Select value={newCommunicationEntry.type} label="Τύπος" onChange={(e) => setNewCommunicationEntry(prev => ({ ...prev, type: e.target.value }))}><MenuItem value="Τηλεφώνημα">Τηλεφώνημα</MenuItem><MenuItem value="Email">Email</MenuItem><MenuItem value="Συνάντηση">Συνάντηση</MenuItem></Select></FormControl></Grid><Grid item xs={12}><TextField label="Περίληψη" multiline rows={4} fullWidth value={newCommunicationEntry.summary} onChange={(e) => setNewCommunicationEntry(prev => ({ ...prev, summary: e.target.value }))}/></Grid></Grid></DialogContent><DialogActions><Button onClick={() => setOpenCommunicationDialog(false)}>Ακύρωση</Button><Button onClick={handleSaveCommunication} variant="contained" disabled={isSavingCommunication}>{isSavingCommunication ? <CircularProgress size={24} /> : 'Αποθήκευση'}</Button></DialogActions></Dialog>
            <Dialog open={openDocDeleteConfirm} onClose={() => setOpenDocDeleteConfirm(false)}><DialogTitle>Επιβεβαίωση Διαγραφής Εγγράφου</DialogTitle><DialogContent><DialogContentText>Είστε σίγουροι ότι θέλετε να διαγράψετε το έγγραφο "{documentToDelete?.name}"; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.</DialogContentText></DialogContent><DialogActions><Button onClick={() => setOpenDocDeleteConfirm(false)}>Ακύρωση</Button><Button onClick={handleConfirmDocDelete} color="error">Διαγραφή</Button></DialogActions></Dialog>
        </Container>
    );
}

export default StudentsList;
