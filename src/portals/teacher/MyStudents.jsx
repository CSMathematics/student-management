// src/portals/teacher/MyStudents.jsx
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container, Paper, Typography, Box, TextField, InputAdornment,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Tooltip, Avatar, Collapse, Tabs, Tab, Grid, Divider, Chip, List, ListItem, ListItemText, Button
} from '@mui/material';
import { 
    Search as SearchIcon, 
    Assessment as ReportIcon, 
    Message as MessageIcon,
    KeyboardArrowDown as KeyboardArrowDownIcon,
    KeyboardArrowUp as KeyboardArrowUpIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';
import StudentProgressChart from '../../pages/StudentProgressChart.jsx';

// Helper components (copied from StudentsList.jsx for consistency)
const DetailItem = ({ label, value }) => (
    <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary" display="block" sx={{ fontWeight: 500 }}>
            {label}
        </Typography>
        <Typography>{value || '-'}</Typography>
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

const formatSchedule = (schedule) => {
    if (!schedule || schedule.length === 0) return 'Χωρίς πρόγραμμα';
    const dayMapping = { 'Δευτέρα': 'Δε', 'Τρίτη': 'Τρ', 'Τετάρτη': 'Τε', 'Πέμπτη': 'Πε', 'Παρασκευή': 'Πα', 'Σάββατο': 'Σα' };
    return schedule.map(slot => `${dayMapping[slot.day] || slot.day.substring(0, 2)} ${slot.startTime}-${slot.endTime}`).join(' | ');
};

function MyStudents({ studentsInClassrooms, allUsers, classrooms, allGrades, allAbsences, allPayments }) {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedStudentId, setExpandedStudentId] = useState(null);
    const [activeTab, setActiveTab] = useState(0);

    const studentsWithParents = useMemo(() => {
        if (!studentsInClassrooms || !allUsers) return [];
        return studentsInClassrooms.map(student => {
            const parents = allUsers.filter(user => user.role === 'parent' && user.childId === student.id);
            return { ...student, parents };
        }).sort((a, b) => a.lastName.localeCompare(b.lastName));
    }, [studentsInClassrooms, allUsers]);

    const filteredStudents = useMemo(() => {
        if (!searchTerm) return studentsWithParents;
        const lowercasedFilter = searchTerm.toLowerCase();
        return studentsWithParents.filter(student =>
            `${student.firstName} ${student.lastName}`.toLowerCase().includes(lowercasedFilter) ||
            student.parents.some(parent => parent.email?.toLowerCase().includes(lowercasedFilter))
        );
    }, [studentsWithParents, searchTerm]);

    const handleRowClick = (studentId) => {
        const newId = expandedStudentId === studentId ? null : studentId;
        setExpandedStudentId(newId);
        if (newId) {
            setActiveTab(0); // Reset to first tab on expand
        }
    };

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    const handleNavigate = (path, state = {}) => {
        navigate(path, { state });
    };

    const selectedStudent = useMemo(() => {
        return studentsInClassrooms.find(s => s.id === expandedStudentId) || null;
    }, [expandedStudentId, studentsInClassrooms]);

    const averageGrade = useMemo(() => {
        if (!selectedStudent || !allGrades) return null;
        const gradesForStudent = allGrades.filter(grade => grade.studentId === selectedStudent.id);
        if (gradesForStudent.length === 0) return null;
        const sum = gradesForStudent.reduce((acc, curr) => acc + parseFloat(curr.grade), 0);
        return (sum / gradesForStudent.length).toFixed(2);
    }, [selectedStudent, allGrades]);

    const studentAbsences = useMemo(() => {
        if (!selectedStudent || !allAbsences) return { list: [], total: 0 };
        const list = allAbsences.filter(absence => absence.studentId === selectedStudent.id).sort((a, b) => b.date.toDate() - a.date.toDate());
        return { list, total: list.length };
    }, [selectedStudent, allAbsences]);

    const enrolledClassrooms = useMemo(() => {
        if (!selectedStudent || !classrooms) return [];
        return classrooms.filter(c => selectedStudent.enrolledClassrooms?.includes(c.id));
    }, [selectedStudent, classrooms]);

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                        Οι Μαθητές μου
                    </Typography>
                    <TextField
                        variant="outlined" size="small" placeholder="Αναζήτηση μαθητή ή γονέα..."
                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
                    />
                </Box>
                <TableContainer component={Paper} variant="outlined">
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ width: '5%' }} />
                                <TableCell sx={{ fontWeight: 'bold' }}>Ονοματεπώνυμο</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Τάξη</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Ενέργειες</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredStudents.map(student => {
                                const isExpanded = expandedStudentId === student.id;
                                return (
                                    <React.Fragment key={student.id}>
                                        <TableRow hover onClick={() => handleRowClick(student.id)} sx={{ cursor: 'pointer', '& > *': { borderBottom: isExpanded ? 'unset' : undefined } }}>
                                            <TableCell><IconButton size="small">{isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}</IconButton></TableCell>
                                            <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Avatar src={student.profileImageUrl}>{student.firstName?.charAt(0)}{student.lastName?.charAt(0)}</Avatar>
                                                {student.lastName} {student.firstName}
                                            </TableCell>
                                            <TableCell>{student.grade}</TableCell>
                                            <TableCell>{student.email}</TableCell>
                                            <TableCell sx={{ textAlign: 'center' }}>
                                                <Tooltip title="Αναφορά Προόδου"><IconButton color="secondary" onClick={(e) => { e.stopPropagation(); handleNavigate(`/student/report/${student.id}`); }}><ReportIcon /></IconButton></Tooltip>
                                                <Tooltip title="Επικοινωνία με Μαθητή"><IconButton color="primary" onClick={(e) => { e.stopPropagation(); handleNavigate('/communication', { selectedChannelId: student.id }); }}><MessageIcon /></IconButton></Tooltip>
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell style={{ padding: 0, border: 'none' }} colSpan={5}>
                                                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                                    {selectedStudent && (
                                                        <Box sx={{ margin: 1 }}>
                                                            <Paper elevation={0}>
                                                                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                                                                    {/* --- ΑΛΛΑΓΗ: Αφαίρεση καρτέλας οικονομικών --- */}
                                                                    <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
                                                                        <Tab label="Λεπτομέρειες & Γονείς" />
                                                                        <Tab label="Πρόγραμμα" />
                                                                        <Tab label="Βαθμολογία" />
                                                                        <Tab label="Απουσίες" />
                                                                    </Tabs>
                                                                </Box>
                                                                {/* --- ΑΛΛΑΓΗ: Προσθήκη όλων των στοιχείων του μαθητή --- */}
                                                                <TabPanel value={activeTab} index={0}>
                                                                    <Grid container spacing={2}>
                                                                        <Grid item xs={12} sm={6} md={4}><DetailItem label="Όνομα" value={selectedStudent.firstName} /></Grid>
                                                                        <Grid item xs={12} sm={6} md={4}><DetailItem label="Επώνυμο" value={selectedStudent.lastName} /></Grid>
                                                                        <Grid item xs={12} sm={6} md={4}><DetailItem label="Τάξη" value={selectedStudent.grade} /></Grid>
                                                                        <Grid item xs={12} sm={6} md={4}><DetailItem label="Κατεύθυνση" value={selectedStudent.specialization} /></Grid>
                                                                        <Grid item xs={12} sm={6} md={4}><DetailItem label="Μέσος Όρος" value={averageGrade} /></Grid>
                                                                        <Grid item xs={12} sm={6} md={4}><DetailItem label="Σύνολο Απουσιών" value={studentAbsences.total} /></Grid>
                                                                        <Grid item xs={12} sm={6} md={4}><DetailItem label="Τηλέφωνο" value={selectedStudent.studentPhone} /></Grid>
                                                                        <Grid item xs={12} sm={6} md={4}><DetailItem label="Email" value={selectedStudent.email} /></Grid>
                                                                    </Grid>
                                                                    <Divider sx={{ my: 2 }} />
                                                                    <Typography variant="h6" sx={{ mb: 1.5, fontSize: '1.1rem' }}>Συνδεδεμένοι Γονείς</Typography>
                                                                    {student.parents.length > 0 ? (
                                                                        <List dense>
                                                                            {student.parents.map(parent => (
                                                                                <ListItem key={parent.id} secondaryAction={
                                                                                    <Button variant="outlined" size="small" startIcon={<MessageIcon />} onClick={(e) => { e.stopPropagation(); handleNavigate('/communication', { selectedChannelId: parent.id })}}>Συνομιλία</Button>
                                                                                }>
                                                                                    <ListItemText primary={parent.email} />
                                                                                </ListItem>
                                                                            ))}
                                                                        </List>
                                                                    ) : (<Typography variant="body2" color="text.secondary">Δεν έχουν συνδεθεί λογαριασμοί γονέων.</Typography>)}
                                                                </TabPanel>
                                                                <TabPanel value={activeTab} index={1}>
                                                                    {enrolledClassrooms.length > 0 ? (<List dense>{enrolledClassrooms.map(c => (<ListItem key={c.id} divider><ListItemText primary={`${c.classroomName} - ${c.subject}`} secondary={formatSchedule(c.schedule)}/></ListItem>))}</List>) : ( <Typography>Ο μαθητής δεν είναι εγγεγραμμένος σε κάποιο τμήμα.</Typography> )}
                                                                </TabPanel>
                                                                <TabPanel value={activeTab} index={2}>
                                                                    <StudentProgressChart studentGrades={allGrades.filter(g => g.studentId === selectedStudent.id)} />
                                                                </TabPanel>
                                                                {/* --- ΑΛΛΑΓΗ: Αφαίρεση TabPanel οικονομικών --- */}
                                                                <TabPanel value={activeTab} index={3}>
                                                                    <TableContainer><Table size="small"><TableHead><TableRow><TableCell>Ημ/νία</TableCell><TableCell>Μάθημα</TableCell><TableCell>Κατάσταση</TableCell></TableRow></TableHead><TableBody>{studentAbsences.list.map((a) => (<TableRow key={a.id}><TableCell>{dayjs(a.date.toDate()).format('DD/MM/YYYY')}</TableCell><TableCell>{a.subject}</TableCell><TableCell>{a.status === 'justified' ? 'Δικαιολογημένη' : 'Αδικαιολόγητη'}</TableCell></TableRow>))}</TableBody></Table></TableContainer>
                                                                </TabPanel>
                                                            </Paper>
                                                        </Box>
                                                    )}
                                                </Collapse>
                                            </TableCell>
                                        </TableRow>
                                    </React.Fragment>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Container>
    );
}

export default MyStudents;
