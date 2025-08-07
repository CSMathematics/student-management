// src/pages/Phonebook.jsx
import React, { useState, useMemo } from 'react';
import {
    Container, Paper, Typography, TextField, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, InputAdornment, Box,
    CircularProgress, Button, IconButton, Tooltip
} from '@mui/material';
import { 
    Search as SearchIcon, 
    PhoneInTalk as PhoneIcon, 
    Print as PrintIcon,
    Sms as SmsIcon 
} from '@mui/icons-material';

// Helper component to display a phone number with action icons
const PhoneDisplay = ({ phone }) => {
    if (!phone || phone === '-') return '-';
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
            <Typography variant="body2">{phone}</Typography>
            <Tooltip title="Κλήση">
                <IconButton size="small" component="a" href={`tel:${phone}`} sx={{ p: 0.5 }} className="no-print">
                    <PhoneIcon fontSize="inherit" />
                </IconButton>
            </Tooltip>
            <Tooltip title="Αποστολή SMS">
                <IconButton size="small" component="a" href={`sms:${phone}`} sx={{ p: 0.5 }} className="no-print">
                    <SmsIcon fontSize="inherit" />
                </IconButton>
            </Tooltip>
        </Box>
    );
};


function Phonebook({ allStudents, loading }) {
    const [searchTerm, setSearchTerm] = useState('');

    const phonebookData = useMemo(() => {
        if (!allStudents) return [];
        
        return allStudents.map(student => {
            // --- ΑΛΛΑΓΗ: Δημιουργούμε μια δομή που συνδέει όνομα γονέα με τα τηλέφωνά του ---
            const parentsInfo = student.parents
                ?.filter(p => p.name && p.phones?.length > 0)
                .map(p => ({
                    name: p.name,
                    phones: p.phones 
                })) || [];

            return {
                id: student.id,
                studentName: `${student.firstName} ${student.lastName}`,
                studentPhone: student.studentPhone || '-',
                parentsInfo: parentsInfo, // Νέα δομή δεδομένων
            };
        }).sort((a, b) => a.studentName.localeCompare(b.studentName));

    }, [allStudents]);

    const filteredList = useMemo(() => {
        if (!searchTerm) return phonebookData;
        const lowercasedFilter = searchTerm.toLowerCase();
        return phonebookData.filter(item =>
            item.studentName.toLowerCase().includes(lowercasedFilter) ||
            item.studentPhone.toLowerCase().includes(lowercasedFilter) ||
            // --- ΑΛΛΑΓΗ: Ενημερωμένη λογική αναζήτησης ---
            item.parentsInfo.some(parent =>
                parent.name.toLowerCase().includes(lowercasedFilter) ||
                parent.phones.some(phone => phone.toLowerCase().includes(lowercasedFilter))
            )
        );
    }, [phonebookData, searchTerm]);
    
    const handlePrint = () => {
        window.print();
    };


    if (loading) {
        return <Container sx={{ mt: 4, textAlign: 'center' }}><CircularProgress /></Container>;
    }

    return (
        <>
            <style>
                {`
                    @media print {
                        body * { visibility: hidden; }
                        #printable-phonebook, #printable-phonebook * { visibility: visible; }
                        #printable-phonebook { position: absolute; left: 0; top: 0; width: 100%; }
                        .no-print { display: none !important; }
                        .MuiTableCell-root { font-size: 10pt !important; padding: 8px !important; }
                    }
                `}
            </style>
            <Container maxWidth="lg" sx={{ mt: 4 }}>
                <Paper id="printable-phonebook" elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                    <Box className="no-print" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h4" component="h1" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                            Τηλεφωνικός Κατάλογος
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                variant="outlined"
                                size="small"
                                placeholder="Αναζήτηση..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint}>
                                Εκτύπωση
                            </Button>
                        </Box>
                    </Box>

                    <TableContainer>
                        <Table stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold', width: '30%' }}>Ονοματεπώνυμο Μαθητή</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Τηλέφωνο Μαθητή</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', width: '45%' }}>Στοιχεία Γονέων</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredList.map(item => (
                                    <TableRow key={item.id} hover>
                                        <TableCell>{item.studentName}</TableCell>
                                        <TableCell>
                                            <PhoneDisplay phone={item.studentPhone} />
                                        </TableCell>
                                        <TableCell sx={{ verticalAlign: 'top' }}>
                                            {/* --- ΑΛΛΑΓΗ: Νέα λογική εμφάνισης --- */}
                                            {item.parentsInfo.length > 0 ? (
                                                item.parentsInfo.map((parent, index) => (
                                                    <Box key={index} sx={{ mb: index < item.parentsInfo.length - 1 ? 1.5 : 0 }}>
                                                        <Typography variant="body2" sx={{ fontWeight: '500' }}>{parent.name}</Typography>
                                                        {parent.phones.map(phone => (
                                                            <PhoneDisplay key={phone} phone={phone} />
                                                        ))}
                                                    </Box>
                                                ))
                                            ) : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Container>
        </>
    );
}

export default Phonebook;
