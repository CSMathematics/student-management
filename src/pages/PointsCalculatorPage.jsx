// src/pages/StudyGuide/PointsCalculatorPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Paper, Typography, Grid, TextField, Button, Select, MenuItem,
    FormControl, InputLabel, Card, CardContent, Divider, Alert, Tooltip, Chip,
    Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, ToggleButtonGroup, ToggleButton, List, ListItem, ListItemText
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

// Firebase Imports
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Εισαγωγή δεδομένων
import facultiesData1 from '../data/universities/1oPedio_Full.json';
import facultiesData2 from '../data/universities/2oPedio_Full.json';
import facultiesData3 from '../data/universities/3oPedio_Full.json';
import facultiesData4 from '../data/universities/4oPedio_Full.json';

const fieldConfig = {
    1: { name: '1ο: Ανθρωπιστικών Σπουδών', subjects: ['Νεοελληνική Γλώσσα & Λογοτεχνία', 'Αρχαία Ελληνικά', 'Ιστορία', 'Λατινικά'], data: facultiesData1 },
    2: { name: '2ο: Θετικών Σπουδών', subjects: ['Νεοελληνική Γλώσσα & Λογοτεχνία', 'Μαθηματικά', 'Φυσική', 'Χημεία'], data: facultiesData2 },
    3: { name: '3ο: Σπουδών Υγείας', subjects: ['Νεοελληνική Γλώσσα & Λογοτεχνία', 'Φυσική', 'Χημεία', 'Βιολογία'], data: facultiesData3 },
    4: { name: '4ο: Οικονομίας & Πληροφορικής', subjects: ['Νεοελληνική Γλώσσα & Λογοτεχνία', 'Μαθηματικά', 'Πληροφορική', 'Οικονομία'], data: facultiesData4 },
};

const subjectNameMap = {
    'νεοελληνική γλώσσα και λογοτεχνία': 'Νεοελληνική Γλώσσα & Λογοτεχνία', 'νεοελληνική γλώσσα & λογοτεχνία': 'Νεοελληνική Γλώσσα & Λογοτεχνία', 'νεοελληνική γλώσσα': 'Νεοελληνική Γλώσσα & Λογοτεχνία', 'ν. γλώσσα': 'Νεοελληνική Γλώσσα & Λογοτεχνία',
    'αρχές οικονομικής θεωρίας': 'Οικονομία', 'αοθ': 'Οικονομία',
    'ανάπτυξη εφαρμογών σε προγραμματιστικό περιβάλλον': 'Πληροφορική', 'αεππ': 'Πληροφορική',
    'αρχαία ελληνικά': 'Αρχαία Ελληνικά', 'ιστορία': 'Ιστορία', 'λατινικά': 'Λατινικά', 'μαθηματικά': 'Μαθηματικά', 'φυσική': 'Φυσική', 'χημεία': 'Χημεία', 'βιολογία': 'Βιολογία',
};

export default function PointsCalculatorPage({ db, appId, userId }) {
    // State για τον υπολογισμό
    const [selectedField, setSelectedField] = useState(1);
    const [grades, setGrades] = useState({});
    const [results, setResults] = useState(null);
    const [error, setError] = useState('');

    // State για το UI των αποτελεσμάτων
    const [activeTab, setActiveTab] = useState(0);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchText, setSearchText] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [selectedUniversity, setSelectedUniversity] = useState('');


    // State για το Μηχανογραφικό
    const [mechanografiko, setMechanografiko] = useState([]);
    
    // Drag-and-drop state
    const [draggedItem, setDraggedItem] = useState(null);

    // Φόρτωση αποθηκευμένου μηχανογραφικού
    useEffect(() => {
        if (userId && db && appId) {
            const docRef = doc(db, `artifacts/${appId}/users/${userId}/mechanografiko`, 'main');
            getDoc(docRef).then(docSnap => {
                if (docSnap.exists()) {
                    setMechanografiko(docSnap.data().schools || []);
                }
            }).catch(err => console.error("Failed to load mechanografiko:", err));
        }
    }, [userId, db, appId]);

    // Αποθήκευση μηχανογραφικού σε κάθε αλλαγή (με debounce)
    useEffect(() => {
        if (userId && db && appId && results) {
            const handler = setTimeout(() => {
                const docRef = doc(db, `artifacts/${appId}/users/${userId}/mechanografiko`, 'main');
                const fullData = mechanografiko.map(schoolCode => 
                    results.allFaculties.find(f => f.code === schoolCode)
                ).filter(Boolean);

                setDoc(docRef, { schools: mechanografiko, fullData: fullData })
                    .catch(err => console.error("Failed to save mechanografiko:", err));
            }, 1000); 

            return () => clearTimeout(handler);
        }
    }, [mechanografiko, userId, db, appId, results]);


    const handleCalculate = () => {
        setError('');
        const currentSubjects = fieldConfig[selectedField].subjects;
        const gradeValues = currentSubjects.map(subject => parseFloat(grades[subject]));

        if (gradeValues.some(g => isNaN(g))) {
            setError("Παρακαλώ συμπληρώστε όλους τους βαθμούς.");
            return;
        }

        const average = gradeValues.reduce((sum, grade) => sum + grade, 0) / gradeValues.length;
        const facultiesData = fieldConfig[selectedField].data;

        const allFaculties = facultiesData.map(f => {
            let totalWeightedGrade = 0;
            f.coefficients?.forEach(coeff => {
                const canonicalSubject = subjectNameMap[coeff.subject.toLowerCase()] || coeff.subject;
                const grade = parseFloat(grades[canonicalSubject]);
                if (!isNaN(grade)) {
                    totalWeightedGrade += grade * (parseFloat(coeff.weight) || 0);
                }
            });
            const calculatedPoints = Math.round(totalWeightedGrade * 10);
            const base = parseFloat(f.base_2025) || 0;
            const eveScore = parseFloat(f.eve_score) || 0;
            const facultyEbeCoefficientString = String(f.eve_coefficient || '0.8');
            const facultyEbeCoefficient = parseFloat(facultyEbeCoefficientString.replace(',', '.')) || 0.8;
            const studentEBEForFaculty = average * facultyEbeCoefficient;
            const passesPoints = calculatedPoints >= base;
            const passesEBE = studentEBEForFaculty >= eveScore;
            
            return {
                ...f,
                calculatedPoints,
                pointsDifference: calculatedPoints - base,
                studentEBEForFaculty,
                ebeDifference: studentEBEForFaculty - eveScore,
                status: (passesPoints && passesEBE) ? 'pass' : 'fail'
            };
        });

        const passingFaculties = allFaculties.filter(f => f.status === 'pass');
        const points = passingFaculties.map(f => f.calculatedPoints);

        setResults({
            average: average.toFixed(2),
            minStudentEBE: (average * 0.8).toFixed(2),
            maxStudentEBE: (average * 1.2).toFixed(2),
            minPoints: passingFaculties.length > 0 ? Math.min(...points) : 0,
            maxPoints: passingFaculties.length > 0 ? Math.max(...points) : 0,
            allFaculties
        });
    };
    
    const availableUniversities = useMemo(() => {
        if (!results) return [];
        let filtered = results.allFaculties;
        if (selectedCity) {
            filtered = filtered.filter(f => f.city === selectedCity);
        }
        return [...new Set(filtered.map(f => f.university))].sort();
    }, [results, selectedCity]);

    const availableCities = useMemo(() => {
        if (!results) return [];
        let filtered = results.allFaculties;
        if (selectedUniversity) {
            filtered = filtered.filter(f => f.university === selectedUniversity);
        }
        return [...new Set(filtered.map(f => f.city))].sort();
    }, [results, selectedUniversity]);
    
    useEffect(() => {
        if (selectedUniversity && !availableUniversities.includes(selectedUniversity)) {
            setSelectedUniversity('');
        }
    }, [selectedCity, availableUniversities, selectedUniversity]);
    
    useEffect(() => {
        if (selectedCity && !availableCities.includes(selectedCity)) {
            setSelectedCity('');
        }
    }, [selectedUniversity, availableCities, selectedCity]);


    const filteredFaculties = useMemo(() => {
        if (!results) return [];
        return results.allFaculties.filter(f => {
            const statusMatch = filterStatus === 'all' || f.status === filterStatus;
            const cityMatch = selectedCity === '' || f.city === selectedCity;
            const universityMatch = selectedUniversity === '' || f.university === selectedUniversity;
            const textMatch = searchText === '' ||
                f.name.toLowerCase().includes(searchText.toLowerCase());
            return statusMatch && textMatch && cityMatch && universityMatch;
        });
    }, [results, filterStatus, searchText, selectedCity, selectedUniversity]);
    
    // **ΝΕΟ**: Υπολογισμός πλήθους για εμφάνιση
    const facultyCounts = useMemo(() => {
        const total = filteredFaculties.length;
        const successes = filteredFaculties.filter(f => f.status === 'pass').length;
        const failures = total - successes;
        return { total, successes, failures };
    }, [filteredFaculties]);

    const mechanografikoDetails = useMemo(() => {
        if (!results) return [];
        return mechanografiko.map(schoolCode => 
            results.allFaculties.find(f => f.code === schoolCode)
        ).filter(Boolean);
    }, [mechanografiko, results]);

    const addToMechanografiko = (schoolCode) => {
        if (!mechanografiko.includes(schoolCode)) {
            setMechanografiko(prev => [...prev, schoolCode]);
        }
    };
    const removeFromMechanografiko = (schoolCode) => {
        setMechanografiko(prev => prev.filter(code => code !== schoolCode));
    };

    const handleDragStart = (e, index) => {
        setDraggedItem(index);
        e.dataTransfer.effectAllowed = 'move';
    };
    const handleDragOver = (e, index) => {
        e.preventDefault();
        if (draggedItem === null || draggedItem === index) return;
        
        let newMechanografiko = [...mechanografiko];
        const [reorderedItem] = newMechanografiko.splice(draggedItem, 1);
        newMechanografiko.splice(index, 0, reorderedItem);
        
        setDraggedItem(index);
        setMechanografiko(newMechanografiko);
    };
    const handleDragEnd = () => {
        setDraggedItem(null);
    };

    const getStatusIndicator = (pointsDifference) => {
        if (pointsDifference > 1000) return { color: 'success.main', label: 'Ασφαλής Επιλογή' };
        if (pointsDifference >= -500) return { color: 'warning.main', label: 'Πιθανή Επιλογή' };
        return { color: 'error.main', label: 'Δύσκολη Επιλογή' };
    };

    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            <Grid container spacing={3}>
                <Grid item xs={12} md={4} lg={3}>
                    <Paper sx={{ p: 2, position: 'sticky', top: 20 }}>
                        <Typography variant="h6" gutterBottom>1. Υπολογισμός</Typography>
                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Επιστημονικό Πεδίο</InputLabel>
                            <Select value={selectedField} label="Επιστημονικό Πεδίο" onChange={e => setSelectedField(e.target.value)}>
                                {Object.entries(fieldConfig).map(([key, value]) => <MenuItem key={key} value={key}>{value.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        {fieldConfig[selectedField].subjects.map(subject => (
                            <TextField key={subject} fullWidth label={subject} type="number" value={grades[subject] || ''} onChange={e => setGrades(prev => ({...prev, [subject]: e.target.value}))} sx={{ mb: 2 }} inputProps={{ min: 0, max: 20, step: "0.1" }} />
                        ))}
                        <Button variant="contained" startIcon={<CalculateIcon />} onClick={handleCalculate} fullWidth>Υπολογισμός Μορίων</Button>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={8} lg={9}>
                    <Paper sx={{ p: 2 }}>
                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                        {!results ? (
                            <Alert severity="info">Συμπληρώστε τους βαθμούς σας και πατήστε "Υπολογισμός" για να δείτε τα αποτελέσματα και να ξεκινήσετε το μηχανογραφικό σας.</Alert>
                        ) : (
                            <>
                                <Typography variant="h6" gutterBottom>2. Αποτελέσματα & Μηχανογραφικό</Typography>
                                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                                    <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
                                        <Tab label={`Αναλυτικά Αποτελέσματα (${results.allFaculties.length})`} />
                                        <Tab label={`Το Μηχανογραφικό μου (${mechanografiko.length})`} />
                                    </Tabs>
                                </Box>

                                <Box hidden={activeTab !== 0} sx={{ pt: 2 }}>
                                    <Grid container spacing={2} sx={{ mb: 2 }}>
                                        <Grid item xs={12} md={4}>
                                            <TextField fullWidth label="Αναζήτηση ονόματος..." value={searchText} onChange={e => setSearchText(e.target.value)} size="small" />
                                        </Grid>
                                        <Grid item xs={12} sm={6} md={2.5}>
                                             <FormControl fullWidth size="small">
                                                <InputLabel>Ίδρυμα</InputLabel>
                                                <Select value={selectedUniversity} label="Ίδρυμα" onChange={e => setSelectedUniversity(e.target.value)}>
                                                    <MenuItem value=""><em>Όλα</em></MenuItem>
                                                    {availableUniversities.map(uni => <MenuItem key={uni} value={uni}>{uni}</MenuItem>)}
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid item xs={12} sm={6} md={2.5}>
                                            <FormControl fullWidth size="small">
                                                <InputLabel>Πόλη</InputLabel>
                                                <Select value={selectedCity} label="Πόλη" onChange={e => setSelectedCity(e.target.value)}>
                                                    <MenuItem value=""><em>Όλες</em></MenuItem>
                                                    {availableCities.map(city => <MenuItem key={city} value={city}>{city}</MenuItem>)}
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid item xs={12} md={3}>
                                            <ToggleButtonGroup value={filterStatus} exclusive onChange={(e, newStatus) => setFilterStatus(newStatus || 'all')} fullWidth size="small">
                                                <ToggleButton value="all">Όλες</ToggleButton>
                                                <ToggleButton value="pass">Επιτυχίες</ToggleButton>
                                            </ToggleButtonGroup>
                                        </Grid>
                                    </Grid>
                                    {/* **ΝΕΟ**: Εμφάνιση πλήθους */}
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2, mb: 1, px:1 }}>
                                        <Typography variant="caption">
                                            Εμφανίζονται: <strong>{facultyCounts.total}</strong>
                                        </Typography>
                                        <Chip label={`Επιτυχίες: ${facultyCounts.successes}`} color="success" size="small" variant="outlined" />
                                        <Chip label={`Αποτυχίες: ${facultyCounts.failures}`} color="error" size="small" variant="outlined" />
                                    </Box>
                                    <TableContainer sx={{ maxHeight: 600 }}>
                                        <Table stickyHeader size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ minWidth: 200 }}>Σχολή</TableCell>
                                                    <TableCell>Ίδρυμα</TableCell>
                                                    <TableCell>Πόλη</TableCell>
                                                    <TableCell align="right">Μόρια/Βάση</TableCell>
                                                    <TableCell align="right">ΕΒΕ</TableCell>
                                                    <TableCell></TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {filteredFaculties.map(f => (
                                                    <TableRow key={f.code} hover sx={{ opacity: f.status === 'fail' ? 0.7 : 1 }}>
                                                        <TableCell>
                                                            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{f.name}</Typography>
                                                            {/* **ΝΕΟ**: Εμφάνιση κωδικού */}
                                                            <Typography variant="caption" color="text.secondary" fontSize= '0.9rem'>Κωδικός: {f.code}</Typography>
                                                        </TableCell>
                                                        <TableCell><Typography variant="body2" color="text.secondary">{f.university}</Typography></TableCell>
                                                        <TableCell><Typography variant="body2" color="text.secondary">{f.city}</Typography></TableCell>
                                                        <TableCell align="right">
                                                            <Chip label={`${f.pointsDifference >= 0 ? '+' : ''}${f.pointsDifference}`} color={f.pointsDifference >= 0 ? 'success' : 'error'} size="small" />
                                                            <Typography variant="caption" display="block">{f.calculatedPoints}/{f.base_2025}</Typography>
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Chip label={`${f.ebeDifference >= 0 ? '+' : ''}${f.ebeDifference.toFixed(2)}`} color={f.ebeDifference >= 0 ? 'success' : 'error'} size="small" />
                                                            <Typography variant="caption" display="block">{f.studentEBEForFaculty.toFixed(2)}/{f.eve_score}</Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Tooltip title={f.status === 'pass' ? "Προσθήκη στο Μηχανογραφικό" : "Δεν μπορείτε να προσθέσετε μια σχολή που δεν περνάτε"}>
                                                                <span>
                                                                    <IconButton 
                                                                        size="small" 
                                                                        onClick={() => addToMechanografiko(f.code)} 
                                                                        disabled={mechanografiko.includes(f.code) || f.status === 'fail'}
                                                                        color='success'
                                                                    >
                                                                        <AddCircleOutlineIcon />
                                                                    </IconButton>
                                                                </span>
                                                            </Tooltip>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>

                                <Box hidden={activeTab !== 1} sx={{ pt: 2 }}>
                                    {mechanografikoDetails.length === 0 ? (
                                        <Alert severity="info">Προσθέστε σχολές από τον πίνακα "Αναλυτικά Αποτελέσματα" για να φτιάξετε το μηχανογραφικό σας.</Alert>
                                    ) : (
                                        <List>
                                            {mechanografikoDetails.map((f, index) => {
                                                const indicator = getStatusIndicator(f.pointsDifference);
                                                return (
                                                    <ListItem 
                                                        key={f.code} 
                                                        divider
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, index)}
                                                        onDragOver={(e) => handleDragOver(e, index)}
                                                        onDragEnd={handleDragEnd}
                                                        sx={{ cursor: 'move', userSelect: 'none', backgroundColor: draggedItem === index ? 'action.hover' : 'transparent' }}
                                                    >
                                                        <DragIndicatorIcon sx={{ mr: 1, color: 'text.disabled' }}/>
                                                        <Tooltip title={indicator.label}>
                                                            <Box sx={{ width: 8, height: 32, backgroundColor: indicator.color, mr: 2, borderRadius: 1 }} />
                                                        </Tooltip>
                                                        <ListItemText
                                                            primary={`${index + 1}. ${f.name}`}
                                                            secondary={`${f.university} - ${f.city} | Βάση: ${f.base_2025} - Τα μόρια σου: ${f.calculatedPoints}`}
                                                        />
                                                        <IconButton size="small" color = 'error' onClick={() => removeFromMechanografiko(f.code)}>
                                                            <RemoveCircleOutlineIcon />
                                                        </IconButton>
                                                    </ListItem>
                                                );
                                            })}
                                        </List>
                                    )}
                                </Box>
                            </>
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
