// src/pages/Library.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
    Container, Paper, Typography, Box, Grid, TextField, FormControl,
    InputLabel, Select, MenuItem, Table, TableContainer, TableHead,
    TableRow, TableCell, TableBody, Link, Chip, Tooltip, IconButton,
    CircularProgress, InputAdornment
} from '@mui/material';
import {
    Search as SearchIcon,
    Download as DownloadIcon,
    Book as BookIcon,
    Notes as NotesIcon,
    Assignment as AssignmentIcon,
    HomeWork as HomeWorkIcon,
    School as SchoolIcon,
    Person as PersonIcon,
    Public as PublicIcon,
    Class as ClassIcon,
    HelpOutline as HelpIcon, // Νέο εικονίδιο
    CheckCircleOutline as SolutionsIcon, // Νέο εικονίδιο
    InsertDriveFile as InsertDriveFileIcon
} from '@mui/icons-material';
import { collection, onSnapshot, query } from 'firebase/firestore';
import dayjs from 'dayjs';

// --- ΔΙΟΡΘΩΣΗ: Ενοποιημένη και πλήρης λίστα τύπων εγγράφων ---
const documentTypes = [
    { key: 'notes', label: 'Σημειώσεις', icon: <NotesIcon fontSize="small" /> },
    { key: 'book', label: 'Βιβλίο', icon: <BookIcon fontSize="small" /> },
    { key: 'exercises', label: 'Ασκήσεις', icon: <HomeWorkIcon fontSize="small" /> },
    { key: 'test', label: 'Διαγώνισμα', icon: <AssignmentIcon fontSize="small" /> },
    { key: 'homework', label: 'Εργασία', icon: <AssignmentIcon fontSize="small" /> },
    { key: 'εκφώνηση', label: 'Εκφώνηση', icon: <AssignmentIcon fontSize="small" /> },
    { key: 'βοηθητικό_υλικό', label: 'Βοηθητικό Υλικό', icon: <HelpIcon fontSize="small" /> },
    { key: 'λύσεις', label: 'Λύσεις', icon: <SolutionsIcon fontSize="small" /> },
    { key: 'certificate', label: 'Πιστοποιητικό', icon: <InsertDriveFileIcon fontSize="small" /> },
    { key: 'report', label: 'Αναφορά', icon: <InsertDriveFileIcon fontSize="small" /> },
    { key: 'other', label: 'Άλλο', icon: <InsertDriveFileIcon fontSize="small" /> },
];


const visibilityTypes = {
    public: { label: 'Δημόσιο', icon: <PublicIcon fontSize="small" />, color: 'success' },
    course: { label: 'Μάθημα', icon: <SchoolIcon fontSize="small" />, color: 'info' },
    classroom: { label: 'Τμήμα', icon: <ClassIcon fontSize="small" />, color: 'secondary' },
    student: { label: 'Μαθητής', icon: <PersonIcon fontSize="small" />, color: 'warning' },
    teacherPrivate: { label: 'Προσωπικό', icon: <PersonIcon fontSize="small" />, color: 'default' }
};

function Library({ db, appId, selectedYear, allTeachers, allStudents, classrooms, allCourses, allUsers }) {
    const [allFiles, setAllFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        searchTerm: '',
        grade: 'all',
        subject: 'all',
        docType: 'all',
        uploader: 'all',
    });

    useEffect(() => {
        if (!db || !appId || !selectedYear) {
            setLoading(false);
            return;
        }
        setLoading(true);
        const filesRef = collection(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/files`);
        const q = query(filesRef);
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const filesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllFiles(filesData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching files:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [db, appId, selectedYear]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const uploaderNameMap = useMemo(() => {
        const map = new Map();
        if (!allUsers || !allTeachers) return map;

        const teacherProfileMap = new Map(allTeachers.map(t => [t.id, `${t.firstName} ${t.lastName}`]));

        allUsers.forEach(user => {
            if (user.role === 'admin') {
                map.set(user.id, `${user.firstName} ${user.lastName} (Admin)`);
            } else if (user.role === 'teacher' && user.profileId) {
                const teacherName = teacherProfileMap.get(user.profileId);
                if (teacherName) {
                    map.set(user.id, teacherName);
                }
            }
        });
        return map;
    }, [allUsers, allTeachers]);

    const uniqueSubjects = useMemo(() => [...new Set(allCourses.map(c => c.name))].sort(), [allCourses]);

    const filteredFiles = useMemo(() => {
        return allFiles.filter(file => {
            const searchTermMatch = filters.searchTerm === '' || file.fileName.toLowerCase().includes(filters.searchTerm.toLowerCase());
            const gradeMatch = filters.grade === 'all' || file.grade === filters.grade;
            const subjectMatch = filters.subject === 'all' || file.subject === filters.subject;
            const docTypeMatch = filters.docType === 'all' || file.documentType === filters.docType;
            const uploaderMatch = filters.uploader === 'all' || file.uploaderId === filters.uploader;
            return searchTermMatch && gradeMatch && subjectMatch && docTypeMatch && uploaderMatch;
        }).sort((a, b) => b.uploadedAt.toDate() - a.uploadedAt.toDate());
    }, [allFiles, filters]);

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
    }

    return (
        <Container maxWidth={false} sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    Βιβλιοθήκη Υλικού
                </Typography>
                <Grid container spacing={2} sx={{ my: 2 }}>
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth size="small" name="searchTerm"
                            placeholder="Αναζήτηση ονόματος αρχείου..."
                            value={filters.searchTerm} onChange={handleFilterChange}
                            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
                        />
                    </Grid>
                    <Grid item xs={6} sm={3} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Τάξη</InputLabel>
                            <Select name="grade" value={filters.grade} label="Τάξη" onChange={handleFilterChange}>
                                <MenuItem value="all"><em>Όλες</em></MenuItem>
                                <MenuItem value="Α' Γυμνασίου">Α' Γυμνασίου</MenuItem>
                                <MenuItem value="Β' Γυμνασίου">Β' Γυμνασίου</MenuItem>
                                <MenuItem value="Γ' Γυμνασίου">Γ' Γυμνασίου</MenuItem>
                                <MenuItem value="Α' Λυκείου">Α' Λυκείου</MenuItem>
                                <MenuItem value="Β' Λυκείου">Β' Λυκείου</MenuItem>
                                <MenuItem value="Γ' Λυκείου">Γ' Λυκείου</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={6} sm={3} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Μάθημα</InputLabel>
                            <Select name="subject" value={filters.subject} label="Μάθημα" onChange={handleFilterChange}>
                                <MenuItem value="all"><em>Όλα</em></MenuItem>
                                {uniqueSubjects.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={6} sm={3} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Τύπος</InputLabel>
                            <Select name="docType" value={filters.docType} label="Τύπος" onChange={handleFilterChange}>
                                <MenuItem value="all"><em>Όλοι</em></MenuItem>
                                {documentTypes.map(t => <MenuItem key={t.key} value={t.key}>{t.label}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={6} sm={3} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Καθηγητής</InputLabel>
                            <Select name="uploader" value={filters.uploader} label="Καθηγητής" onChange={handleFilterChange}>
                                <MenuItem value="all"><em>Όλοι</em></MenuItem>
                                {allTeachers.map(t => <MenuItem key={t.id} value={t.id}>{t.lastName} {t.firstName}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Αρχείο</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Τύπος</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Τάξη/Μάθημα</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Ορατό σε</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Καθηγητής</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Ημ/νία</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredFiles.map(file => {
                                const docType = documentTypes.find(t => t.key === file.documentType);
                                const visibility = visibilityTypes[file.visibility];
                                return (
                                    <TableRow key={file.id} hover>
                                        <TableCell>
                                            <Link href={file.fileURL} target="_blank" rel="noopener noreferrer" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <DownloadIcon fontSize="small" />
                                                {file.fileName}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <Tooltip title={docType?.label || file.documentType}>
                                                <Chip icon={docType?.icon} label={docType?.label || file.documentType} size="small" />
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell>{file.grade} / {file.subject}</TableCell>
                                        <TableCell>
                                            <Tooltip title={visibility?.label || file.visibility}>
                                                <Chip icon={visibility?.icon} label={visibility?.label || file.visibility} size="small" color={visibility?.color || 'default'} />
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell>{uploaderNameMap.get(file.uploaderId) || 'Άγνωστος'}</TableCell>
                                        <TableCell>{dayjs(file.uploadedAt.toDate()).format('DD/MM/YYYY')}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Container>
    );
}

export default Library;
