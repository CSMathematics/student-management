// src/pages/StudyGuide/FacultiesPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Paper, Typography, TextField, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TableSortLabel, TablePagination,
    FormControl, InputLabel, Select, MenuItem, Grid, Chip, Tooltip, Button, IconButton, Link
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import BookIcon from '@mui/icons-material/Book'; // 1o Πεδίο
import ScienceIcon from '@mui/icons-material/Science'; // 2o Πεδίο
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety'; // 3o Πεδίο
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter'; // 4o Πεδίο
import ConstructionIcon from '@mui/icons-material/Construction'; // ΕΠΑΛ
import PrintIcon from '@mui/icons-material/Print'; // Εικονίδιο Εκτύπωσης
import ClearAllIcon from '@mui/icons-material/ClearAll'; // Εικονίδιο Καθαρισμού
import { visuallyHidden } from '@mui/utils';

// Εισαγωγή των δεδομένων από το JSON αρχείο.
import facultiesData1 from '../data/universities/1oPedio_Full.json';
import facultiesData2 from '../data/universities/2oPedio_Full.json';
import facultiesData3 from '../data/universities/3oPedio_Full.json';
import facultiesData4 from '../data/universities/4oPedio_Full.json';

// Function for stable sorting
function stableSort(array, comparator) {
    const stabilizedThis = array.map((el, index) => [el, index]);
    stabilizedThis.sort((a, b) => {
        const order = comparator(a[0], b[0]);
        if (order !== 0) return order;
        return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
}

// Function to get the comparator for sorting
function getComparator(order, orderBy) {
    return order === 'desc'
        ? (a, b) => descendingComparator(a, b, orderBy)
        : (a, b) => -descendingComparator(a, b, orderBy);
}

// Function to compare two items
function descendingComparator(a, b, orderBy) {
    const valA = a[orderBy] ?? (typeof a[orderBy] === 'number' ? 0 : '');
    const valB = b[orderBy] ?? (typeof b[orderBy] === 'number' ? 0 : '');
    if (valB < valA) return -1;
    if (valB > valA) return 1;
    return 0;
}


// Κεφαλίδες του πίνακα
const headCells = [
    { id: 'code', numeric: true, label: 'Κωδικός' },
    { id: 'name', numeric: false, label: 'Όνομα Σχολής' },
    { id: 'university', numeric: false, label: 'Ίδρυμα' },
    { id: 'city', numeric: false, label: 'Πόλη' },
    { id: 'fields', numeric: false, label: 'Πεδία' },
    { id: 'base_2025', numeric: true, label: 'Βάση 2025 (Εκτ.)' },
    { id: 'eve_coefficient', numeric: true, label: 'Συντ. ΕΒΕ' },
    { id: 'eve_score', numeric: true, label: 'Βαθμός ΕΒΕ' },
    { id: 'coefficients', numeric: false, label: 'Συντελεστές', sortable: false },
];

function EnhancedTableHead(props) {
    const { order, orderBy, onRequestSort } = props;
    const createSortHandler = (property) => (event) => {
        onRequestSort(event, property);
    };

    return (
        <TableHead>
            <TableRow sx={{
                '& .MuiTableCell-head': {
                    fontWeight: 'bold',
                    backgroundColor: 'primary.main',
                    color: 'common.white'
                },
                '& .MuiTableSortLabel-root': { color: 'common.white' },
                '& .MuiTableSortLabel-icon': { color: 'common.white !important' }
            }}>
                {headCells.map((headCell) => (
                    <TableCell
                        key={headCell.id}
                        align={headCell.numeric ? 'right' : 'left'}
                        sortDirection={orderBy === headCell.id ? order : false}
                    >
                        {headCell.sortable === false ? (
                            headCell.label
                        ) : (
                            <TableSortLabel
                                active={orderBy === headCell.id}
                                direction={orderBy === headCell.id ? order : 'asc'}
                                onClick={createSortHandler(headCell.id)}
                            >
                                {headCell.label}
                                {orderBy === headCell.id ? (
                                    <Box component="span" sx={visuallyHidden}>
                                        {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                    </Box>
                                ) : null}
                            </TableSortLabel>
                        )}
                    </TableCell>
                ))}
            </TableRow>
        </TableHead>
    );
}

export default function FacultiesPage() {
    const [faculties, setFaculties] = useState([]);
    const [order, setOrder] = useState('asc');
    const [orderBy, setOrderBy] = useState('name');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [selectedField, setSelectedField] = useState(1);

    // Filters state
    const [searchText, setSearchText] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [selectedUniversity, setSelectedUniversity] = useState('');

    useEffect(() => {
        switch (selectedField) {
            case 1:
                setFaculties(facultiesData1);
                break;
            case 2:
                setFaculties(facultiesData2);
                break;
            case 3:
                setFaculties(facultiesData3);
                break;
            case 4:
                setFaculties(facultiesData4);
                break;
            case 5: // for EPAL
                setFaculties([]);
                break;
            default:
                setFaculties(facultiesData1);
        }
        handleClearFilters(); // Καθαρισμός φίλτρων με την αλλαγή πεδίου
    }, [selectedField]);


    const handleRequestSort = (event, property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // --- ΝΕΕΣ ΛΕΙΤΟΥΡΓΙΕΣ ---
    const handleClearFilters = () => {
        setSearchText('');
        setSelectedCity('');
        setSelectedUniversity('');
        setPage(0);
    };

    const handlePrint = () => {
        window.print();
    };
    // --- ΤΕΛΟΣ ΝΕΩΝ ΛΕΙΤΟΥΡΓΙΩΝ ---

    const uniqueCities = useMemo(() => [...new Set(faculties.map(f => f.city))].sort(), [faculties]);
const allFaculties = useMemo(() => [
    ...facultiesData1, 
    ...facultiesData2, 
    ...facultiesData3, 
    ...facultiesData4
], []);

const uniqueUniversities = useMemo(() => 
    [...new Set(allFaculties.map(f => f.university).filter(Boolean))].sort(), 
[allFaculties]);


    const filteredFaculties = useMemo(() => {
        return faculties.filter(faculty => {
            const nameMatch = faculty.name.toLowerCase().includes(searchText.toLowerCase());
            const cityMatch = selectedCity ? faculty.city === selectedCity : true;
            const universityMatch = selectedUniversity ? faculty.university === selectedUniversity : true;
            return nameMatch && cityMatch && universityMatch;
        });
    }, [faculties, searchText, selectedCity, selectedUniversity]);

    const visibleRows = useMemo(
        () =>
            stableSort(filteredFaculties, getComparator(order, orderBy)).slice(
                page * rowsPerPage,
                page * rowsPerPage + rowsPerPage,
            ),
        [filteredFaculties, order, orderBy, page, rowsPerPage],
    );

    const emptyRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - filteredFaculties.length) : 0;

    const fieldButtons = [
        { id: 1, label: '1ο: Ανθρωπιστικών Σπουδών', icon: <BookIcon />, color: 'primary' },
        { id: 2, label: '2ο: Θετικών Σπουδών', icon: <ScienceIcon />, color: 'success' },
        { id: 3, label: '3ο: Σπουδών Υγείας', icon: <HealthAndSafetyIcon />, color: 'error' },
        { id: 4, label: '4ο: Οικονομίας & Πληροφορικής', icon: <BusinessCenterIcon />, color: 'warning' },
        { id: 5, label: 'Σχολές ΕΠΑ.Λ.', icon: <ConstructionIcon />, color: 'info' }
    ];

    return (
        <Box sx={{ width: '100%', p: 3 }}>
             {/* --- CSS ΓΙΑ ΤΗΝ ΕΚΤΥΠΩΣΗ --- */}
            <style>
                {`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        #print-area, #print-area * {
                            visibility: visible;
                        }
                        #print-area {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                        }
                        .no-print {
                            display: none !important;
                        }
                    }
                `}
            </style>
            <Paper id="print-area" sx={{ width: '100%', mb: 2, p: 3, overflow: 'hidden' }}>
                <Box className="no-print" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h5" component="div">
                        Αναζήτηση Σχολών
                    </Typography>
                    <Box>
                        <Tooltip title="Καθαρισμός Φίλτρων">
                            <IconButton onClick={handleClearFilters}>
                                <ClearAllIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Εκτύπωση σε PDF">
                            <IconButton onClick={handlePrint}>
                                <PrintIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>


                {/* --- ΚΟΥΜΠΙΑ ΕΠΙΣΤΗΜΟΝΙΚΩΝ ΠΕΔΙΩΝ --- */}
                <Box className="no-print" sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', pb: 2 }}>
                    <Grid container spacing={1}>
                        {fieldButtons.map(field => (
                            <Grid item xs={12} sm={6} md key={field.id}>
                                <Button
                                    fullWidth
                                    variant={selectedField === field.id ? "contained" : "outlined"}
                                    color={field.color}
                                    startIcon={field.icon}
                                    onClick={() => setSelectedField(field.id)}
                                    // disabled={field.id !== 1}
                                    sx={{ justifyContent: 'flex-start', textAlign: 'left', height: '100%', textTransform: 'none' }}
                                >
                                    {field.label}
                                </Button>
                            </Grid>
                        ))}
                    </Grid>
                </Box>

                <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                    Φιλτράρετε και βρείτε τις σχολές για το επιλεγμένο πεδίο.
                </Typography>

                <Grid container spacing={2} sx={{ my: 2 }} className="no-print">
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Αναζήτηση με όνομα σχολής..."
                            variant="outlined"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth>
                            <InputLabel>Πόλη</InputLabel>
                            <Select
                                value={selectedCity}
                                label="Πόλη"
                                onChange={(e) => setSelectedCity(e.target.value)}
                            >
                                <MenuItem value=""><em>Όλες οι πόλεις</em></MenuItem>
                                {uniqueCities.map(city => <MenuItem key={city} value={city}>{city}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth>
                            <InputLabel>Ίδρυμα</InputLabel>
                            <Select
                                value={selectedUniversity}
                                label="Ίδρυμα"
                                onChange={(e) => setSelectedUniversity(e.target.value)}
                            >
                                <MenuItem value=""><em>Όλα τα ιδρύματα</em></MenuItem>
                                {uniqueUniversities.map(uni => <MenuItem key={uni} value={uni}>{uni}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>

                <TableContainer>
                    <Table sx={{ minWidth: 950 }} aria-labelledby="tableTitle">
                        <EnhancedTableHead
                            order={order}
                            orderBy={orderBy}
                            onRequestSort={handleRequestSort}
                        />
                        <TableBody>
                            {visibleRows.map((row) => {
                                return (
                                    <TableRow hover tabIndex={-1} key={row.code}>
                                        <TableCell align="right">{row.code}</TableCell>
                                        <TableCell sx={{ minWidth: 250 }}> 
                                            <Link href={row.link}>{row.name}</Link>
                                        </TableCell>
                                        <TableCell>{row.university}</TableCell>
                                        <TableCell>{row.city}</TableCell>
                                        <TableCell align="center">{row.fields}</TableCell>
                                        <TableCell align="right">
                                            <Chip label={row.base_2025 || 'N/A'} color="primary" variant="outlined" />
                                        </TableCell>
                                        <TableCell align="right">{row.eve_coefficient}</TableCell>
                                        <TableCell align="right">{row.eve_score}</TableCell>
                                        <TableCell align="center">
                                            <Tooltip
                                                title={
                                                    <Box sx={{ p: 1 }}>
                                                        {row.coefficients.map(c => (
                                                            <Typography key={c.subject} variant="body2" sx={{ mb: 0.5 }}>
                                                                {c.subject}: <strong>{c.weight}%</strong>
                                                            </Typography>
                                                        ))}
                                                    </Box>
                                                }
                                            >
                                                <InfoOutlinedIcon color="action" sx={{ cursor: 'pointer' }} />
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {emptyRows > 0 && (
                                <TableRow style={{ height: 53 * emptyRows }}>
                                    <TableCell colSpan={9} />
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    className="no-print"
                    rowsPerPageOptions={[5, 10, 25, 50, 100, { label: 'Όλες', value: -1 }]}
                    component="div"
                    count={filteredFaculties.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Σχολές ανά σελίδα:"
                />
            </Paper>
        </Box>
    );
}
