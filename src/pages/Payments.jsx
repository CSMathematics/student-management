// src/pages/Payments.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
    Box, Grid, Paper, Typography, List, ListItemButton, ListItemText,
    TextField, Button, Table, TableContainer, TableHead, TableRow, TableCell, TableBody,
    CircularProgress, Alert, Avatar, ListItemAvatar, Divider, Chip, IconButton
} from '@mui/material';
import { Receipt as ReceiptIcon } from '@mui/icons-material';
import { collection, doc, addDoc } from 'firebase/firestore';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Helper function to generate PDF receipt
const generateReceipt = (student, payment) => {
    const doc = new jsPDF();
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Απόδειξη Πληρωμής', 105, 20, null, null, 'center');

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Ημερομηνία: ${dayjs(payment.date.toDate()).format('DD/MM/YYYY')}`, 14, 40);
    doc.text(`Αρ. Απόδειξης: ${payment.id.substring(0, 8)}`, 14, 47);

    doc.setFont('helvetica', 'bold');
    doc.text('Στοιχεία Μαθητή:', 14, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(`Ονοματεπώνυμο: ${student.firstName} ${student.lastName}`, 14, 67);
    doc.text(`Τάξη: ${student.grade}`, 14, 74);

    doc.autoTable({
        startY: 90,
        head: [['Περιγραφή', 'Ποσό']],
        body: [
            [payment.notes || 'Καταβολή διδάκτρων', `${payment.amount.toFixed(2)} €`],
        ],
        theme: 'striped'
    });

    const finalY = doc.lastAutoTable.finalY || 100;
    doc.setFont('helvetica', 'bold');
    doc.text(`Σύνολο: ${payment.amount.toFixed(2)} €`, 170, finalY + 10, null, null, 'right');

    doc.save(`receipt_${student.lastName}_${payment.id.substring(0, 5)}.pdf`);
};

const schoolYearMonths = [
    { name: 'Σεπτέμβριος', number: 9 }, { name: 'Οκτώβριος', number: 10 },
    { name: 'Νοέμβριος', number: 11 }, { name: 'Δεκέμβριος', number: 12 },
    { name: 'Ιανουάριος', number: 1 }, { name: 'Φεβρουάριος', number: 2 },
    { name: 'Μάρτιος', number: 3 }, { name: 'Απρίλιος', number: 4 },
    { name: 'Μάιος', number: 5 }, { name: 'Ιούνιος', number: 6 }
];

function Payments({ allStudents, allPayments, db, appId, loading }) {
    const [selectedStudentId, setSelectedStudentId] = useState(null); // <-- ΑΛΛΑΓΗ: Αποθηκεύουμε μόνο το ID
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });
    const [monthlyDues, setMonthlyDues] = useState({});

    const studentsWithBalance = useMemo(() => {
        if (!allStudents || !allPayments) return [];
        return allStudents.map(student => {
            const monthlyFeeRaw = parseFloat(student.payment) || 0;
            const discount = parseFloat(student.debt) || 0;
            const monthlyFee = monthlyFeeRaw - (monthlyFeeRaw * (discount / 100));
            const finalFees = monthlyFee * schoolYearMonths.length;
            const paymentsForStudent = allPayments.filter(p => p.studentId === student.id);
            const totalPaid = paymentsForStudent.reduce((sum, p) => sum + p.amount, 0);
            const balance = finalFees - totalPaid;
            return { ...student, finalFees, totalPaid, balance, monthlyFee };
        }).sort((a, b) => a.lastName.localeCompare(b.lastName));
    }, [allStudents, allPayments]);

    // --- ΑΛΛΑΓΗ: Βρίσκουμε το αντικείμενο του μαθητή με βάση το ID ---
    const selectedStudent = useMemo(() => {
        return studentsWithBalance.find(s => s.id === selectedStudentId) || null;
    }, [selectedStudentId, studentsWithBalance]);


    useEffect(() => {
        if (selectedStudent) {
            const initialDues = {};
            schoolYearMonths.forEach(month => {
                initialDues[month.name] = selectedStudent.monthlyFee;
            });
            setMonthlyDues(initialDues);
        }
    }, [selectedStudent]);

    const monthlyBreakdown = useMemo(() => {
        if (!selectedStudent || !allPayments) return [];
        const paymentsForStudent = allPayments.filter(p => p.studentId === selectedStudent.id);
        
        return schoolYearMonths.map(month => {
            const paidThisMonth = paymentsForStudent
                .filter(p => dayjs(p.date.toDate()).month() + 1 === month.number)
                .reduce((sum, p) => sum + p.amount, 0);
            
            const dueAmount = monthlyDues[month.name] !== undefined ? monthlyDues[month.name] : selectedStudent.monthlyFee;
            const balance = dueAmount - paidThisMonth;
            
            return {
                month: month.name,
                due: dueAmount,
                paid: paidThisMonth,
                balance: balance,
                status: balance <= 0.01 ? 'Εξοφλημένο' : 'Εκκρεμεί'
            };
        });
    }, [selectedStudent, allPayments, monthlyDues]);

    const filteredStudents = useMemo(() => {
        return studentsWithBalance.filter(s =>
            `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [studentsWithBalance, searchTerm]);

    const selectedStudentPayments = useMemo(() => {
        if (!selectedStudent || !allPayments) return [];
        return allPayments
            .filter(p => p.studentId === selectedStudent.id)
            .sort((a, b) => b.date.toDate() - a.date.toDate());
    }, [selectedStudent, allPayments]);

    const handlePayMonth = async (monthData) => {
        if (!selectedStudent || monthData.status !== 'Εκκρεμεί' || monthData.balance <= 0 || isSaving) return;

        setIsSaving(true);
        setFeedback({ type: '', message: '' });

        const paymentData = {
            studentId: selectedStudent.id,
            studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
            amount: monthData.balance,
            notes: `Δόση ${monthData.month}`,
            date: new Date(),
            createdAt: new Date(),
        };

        try {
            const paymentsCollectionRef = collection(db, `artifacts/${appId}/public/data/payments`);
            await addDoc(paymentsCollectionRef, paymentData);
            setFeedback({ type: 'success', message: `Η πληρωμή για ${monthData.month} καταχωρήθηκε!` });
        } catch (error) {
            console.error("Error adding payment:", error);
            setFeedback({ type: 'error', message: 'Σφάλμα κατά την αποθήκευση.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDueChange = (monthName, value) => {
        const newAmount = parseFloat(value.replace(',', '.')) || 0;
        setMonthlyDues(prev => ({
            ...prev,
            [monthName]: newAmount
        }));
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
    }

    return (
        <Grid container spacing={3}>
            <Grid item xs={12} md={5}>
                <Paper elevation={3} sx={{ p: 2, height: '80vh', display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="h5" sx={{ mb: 2 }}>Οικονομικά Μαθητών</Typography>
                    <TextField fullWidth label="Αναζήτηση Μαθητή..." variant="outlined" size="small" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ mb: 2 }} />
                    <List sx={{ overflowY: 'auto', flexGrow: 1 }}>
                        {filteredStudents.map(student => (
                            <ListItemButton key={student.id} selected={selectedStudentId === student.id} onClick={() => setSelectedStudentId(student.id)}>
                                <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: student.balance > 0 ? 'error.main' : 'success.main' }}>
                                        {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText primary={`${student.firstName} ${student.lastName}`} secondary={`Υπόλοιπο: ${student.balance.toFixed(2)} €`} />
                            </ListItemButton>
                        ))}
                    </List>
                </Paper>
            </Grid>

            <Grid item xs={12} md={7}>
                <Paper elevation={3} sx={{ p: 2 }}>
                    {!selectedStudent ? (
                        <Typography>Επιλέξτε έναν μαθητή για να δείτε τις πληρωμές του.</Typography>
                    ) : (
                        <>
                            <Typography variant="h5" gutterBottom>Καρτέλα Πληρωμών</Typography>
                            <Typography variant="h6" color="primary.main">{selectedStudent.firstName} ${selectedStudent.lastName}</Typography>
                            
                            <Grid container spacing={2} sx={{ my: 2 }}>
                                <Grid item xs={4}><Typography>Δίδακτρα: {selectedStudent.finalFees.toFixed(2)} €</Typography></Grid>
                                <Grid item xs={4}><Typography color="success.main">Πληρωμένα: {selectedStudent.totalPaid.toFixed(2)} €</Typography></Grid>
                                <Grid item xs={4}><Typography color="error.main">Υπόλοιπο: {selectedStudent.balance.toFixed(2)} €</Typography></Grid>
                            </Grid>
                            <Divider sx={{ my: 2 }} />

                            <Typography variant="h6" sx={{ mb: 2 }}>Μηνιαία Ανάλυση</Typography>
                            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                                <Table size="small">
                                    <TableHead><TableRow><TableCell>Μήνας</TableCell><TableCell>Οφειλή</TableCell><TableCell>Πληρωμένα</TableCell><TableCell>Υπόλοιπο</TableCell><TableCell>Κατάσταση</TableCell></TableRow></TableHead>
                                    <TableBody>
                                        {monthlyBreakdown.map(row => (
                                            <TableRow key={row.month}>
                                                <TableCell>{row.month}</TableCell>
                                                <TableCell>
                                                    <TextField
                                                        variant="standard"
                                                        size="small"
                                                        value={monthlyDues[row.month] !== undefined ? monthlyDues[row.month] : ''}
                                                        onChange={(e) => handleDueChange(row.month, e.target.value)}
                                                        sx={{ width: '80px' }}
                                                        InputProps={{ endAdornment: '€' }}
                                                    />
                                                </TableCell>
                                                <TableCell>{row.paid.toFixed(2)} €</TableCell>
                                                <TableCell>{row.balance.toFixed(2)} €</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={row.status}
                                                        color={row.status === 'Εξοφλημένο' ? 'success' : 'warning'}
                                                        size="small"
                                                        onClick={() => handlePayMonth(row)}
                                                        disabled={isSaving}
                                                        sx={{ cursor: row.status === 'Εκκρεμεί' ? 'pointer' : 'default' }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {feedback.message && <Alert severity={feedback.type} sx={{ mb: 2 }}>{feedback.message}</Alert>}

                            <Typography variant="h6" sx={{ mb: 2 }}>Ιστορικό Πληρωμών</Typography>
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead><TableRow><TableCell>Ημερομηνία</TableCell><TableCell>Ποσό</TableCell><TableCell>Σημειώσεις</TableCell><TableCell>Απόδειξη</TableCell></TableRow></TableHead>
                                    <TableBody>
                                        {selectedStudentPayments.map(p => (
                                            <TableRow key={p.id}>
                                                <TableCell>{dayjs(p.date.toDate()).format('DD/MM/YYYY')}</TableCell>
                                                <TableCell>{p.amount.toFixed(2)} €</TableCell>
                                                <TableCell>{p.notes}</TableCell>
                                                <TableCell>
                                                    <IconButton color="primary" onClick={() => generateReceipt(selectedStudent, p)}>
                                                        <ReceiptIcon />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </>
                    )}
                </Paper>
            </Grid>
        </Grid>
    );
}

export default Payments;
