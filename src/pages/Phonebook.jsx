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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // CORRECTED: Changed import

import filomatheiaLogo from '../../public/Logo_full.png'; 
import filomatheiaInfo from '../../public/info.png'; 

// Helper component to display a phone number with action icons
const PhoneDisplay = ({ phone }) => {
    if (!phone || phone === '-') return '-';
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
            <Typography variant="body2">{phone}</Typography>
            <Tooltip title="Κλήση">
                <IconButton size="small" component="a" href={`tel:${phone}`} sx={{ p: 0.5 }}>
                    <PhoneIcon fontSize="inherit" />
                </IconButton>
            </Tooltip>
            <Tooltip title="Αποστολή SMS">
                <IconButton size="small" component="a" href={`sms:${phone}`} sx={{ p: 0.5 }}>
                    <SmsIcon fontSize="inherit" />
                </IconButton>
            </Tooltip>
        </Box>
    );
};

// Variable to cache the fetched font
let robotoFontBytes = null;

function Phonebook({ allStudents, loading }) {
    const [searchTerm, setSearchTerm] = useState('');

    const phonebookData = useMemo(() => {
        if (!allStudents) return [];

        return allStudents.map(student => {
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
                parentsInfo: parentsInfo,
            };
        }).sort((a, b) => a.studentName.localeCompare(b.studentName));

    }, [allStudents]);

    const filteredList = useMemo(() => {
        if (!searchTerm) return phonebookData;
        const lowercasedFilter = searchTerm.toLowerCase();
        return phonebookData.filter(item =>
            item.studentName.toLowerCase().includes(lowercasedFilter) ||
            item.studentPhone.toLowerCase().includes(lowercasedFilter) ||
            item.parentsInfo.some(parent =>
                parent.name.toLowerCase().includes(lowercasedFilter) ||
                parent.phones.some(phone => phone.toLowerCase().includes(lowercasedFilter))
            )
        );
    }, [phonebookData, searchTerm]);

    const handlePrint = async () => {
        const doc = new jsPDF();

        // Helper function to convert ArrayBuffer to Base64
        const arrayBufferToBase64 = (buffer) => {
            let binary = '';
            const bytes = new Uint8Array(buffer);
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return window.btoa(binary);
        };

        doc.addImage(filomatheiaLogo, 'PNG', 14, 10, 63, 15);
        doc.addImage(filomatheiaInfo, 'PNG', doc.internal.pageSize.getWidth() - 65, 12, 51, 18);

        // Load Roboto font for Greek characters support
        try {
            if (!robotoFontBytes) {
                const fontUrl = 'https://raw.githubusercontent.com/googlefonts/roboto/main/src/hinted/Roboto-Regular.ttf';
                robotoFontBytes = await fetch(fontUrl).then(res => res.arrayBuffer());
            }
            const robotoBase64 = arrayBufferToBase64(robotoFontBytes);
            doc.addFileToVFS('Roboto-Regular.ttf', robotoBase64);
            doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
            doc.setFont('Roboto');
        } catch (e) {
            console.error("Font loading failed, falling back to default font.", e);
        }

        const tableColumn = ["Ονοματεπώνυμο Μαθητή", "Τηλέφωνο Μαθητή", "Στοιχεία Γονέων"];
        const tableRows = [];

        filteredList.forEach(item => {
            const parentsData = item.parentsInfo.map(parent =>
                `${parent.name}\n${parent.phones.map(p => `  - ${p}`).join('\n')}`
            ).join('\n\n');

            const phonebookRow = [
                item.studentName,
                item.studentPhone,
                parentsData || '-'
            ];
            tableRows.push(phonebookRow);
        });

        // CORRECTED: Changed the way autoTable is called
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 35,
            styles: {
                font: 'Roboto', // Use the loaded font
                fontStyle: 'normal',
            },
            headStyles: {
                fillColor: [30, 136, 229], // A blue color for the header
                textColor: [255, 255, 255]
            },
            // didDrawPage: function (data) {
            //     // Add header title
            //     doc.setFontSize(18);
            //     doc.text("Τηλεφωνικός Κατάλογος", 67, 15);
            // }
        });

        doc.save(`τηλεφωνικός_κατάλογος_${new Date().toLocaleDateString('el-GR')}.pdf`);
    };

    if (loading) {
        return <Container sx={{ mt: 4, textAlign: 'center' }}><CircularProgress /></Container>;
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
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
    );
}

export default Phonebook;

