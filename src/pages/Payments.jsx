// src/pages/Payments.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom'; // <-- ΝΕΟ IMPORT
import {
    Box, Grid, Paper, Typography, List, ListItemButton, ListItemText,
    TextField, Button, Table, TableContainer, TableHead, TableRow, TableCell, TableBody,
    CircularProgress, Alert, Avatar, ListItemAvatar, Divider, Chip, IconButton,
    Dialog, DialogActions, DialogContent, DialogTitle, DialogContentText, Tooltip
} from '@mui/material';
import { Receipt as ReceiptIcon, AddCard as AddCardIcon } from '@mui/icons-material';
import { collection, doc, addDoc, setDoc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import dayjs from 'dayjs';
import 'dayjs/locale/el';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import PaymentSummaryTable from './PaymentSummaryTable.jsx';

dayjs.locale('el');

let robotoFontBytes = null;

const getDateFromFirestoreTimestamp = (timestamp) => {
    if (timestamp && typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (timestamp instanceof Date) return timestamp;
    return dayjs(timestamp).toDate();
};

const generateReceipt = async (student, payment) => {
    try {
        const pdfDoc = await PDFDocument.create();
        pdfDoc.registerFontkit(fontkit);

        if (!robotoFontBytes) {
            const fontUrl = 'https://raw.githubusercontent.com/googlefonts/roboto/main/src/hinted/Roboto-Regular.ttf';
            robotoFontBytes = await fetch(fontUrl).then(res => res.arrayBuffer());
        }
        const robotoFont = await pdfDoc.embedFont(robotoFontBytes);

        const page = pdfDoc.addPage();
        const { width, height } = page.getSize();
        const fontSize = 11;
        const headerFontSize = 18;
        let y = height - 50;

        page.drawText('Απόδειξη Πληρωμής', { x: 50, y, font: robotoFont, size: headerFontSize, color: rgb(0.1, 0.1, 0.1) });
        y -= 40;
        page.drawText(`Ημερομηνία: ${dayjs(getDateFromFirestoreTimestamp(payment.date)).format('DD/MM/YYYY')}`, { x: 50, y, font: robotoFont, size: fontSize });
        y -= 15;
        page.drawText(`Αρ. Απόδειξης: ${payment.id.substring(0, 8)}`, { x: 50, y, font: robotoFont, size: fontSize });
        y -= 30;
        page.drawText('Στοιχεία Μαθητή:', { x: 50, y, font: robotoFont, size: fontSize, color: rgb(0.5, 0.5, 0.5) });
        y -= 15;
        page.drawText(`Ονοματεπώνυμο: ${student.firstName} ${student.lastName}`, { x: 50, y, font: robotoFont, size: fontSize });
        y -= 15;
        page.drawText(`Τάξη: ${student.grade}`, { x: 50, y, font: robotoFont, size: fontSize });
        y -= 40;
        const tableTop = y;
        page.drawText('Περιγραφή', { x: 55, y: tableTop, font: robotoFont, size: fontSize + 1 });
        page.drawText('Ποσό', { x: 450, y: tableTop, font: robotoFont, size: fontSize + 1 });
        y -= 10;
        page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
        y -= 20;
        page.drawText(payment.notes || 'Καταβολή διδάκτρων', { x: 55, y, font: robotoFont, size: fontSize });
        page.drawText(`${payment.amount.toFixed(2)} €`, { x: 450, y, font: robotoFont, size: fontSize });
        y -= 10;
        page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
        y -= 30;
        page.drawText(`Σύνολο: ${payment.amount.toFixed(2)} €`, { x: width - 150, y, font: robotoFont, size: fontSize + 2 });

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt_${student.lastName}_${payment.id.substring(0, 5)}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Failed to generate PDF receipt with pdf-lib:", error);
        alert("Αποτυχία δημιουργίας της απόδειξης. Παρακαλώ ελέγξτε την κονσόλα για σφάλματα.");
    }
};

const schoolYearMonths = [
    { name: 'Σεπτέμβριος', number: 9 }, { name: 'Οκτώβριος', number: 10 },
    { name: 'Νοέμβριος', number: 11 }, { name: 'Δεκέμβριος', number: 12 },
    { name: 'Ιανουάριος', number: 1 }, { name: 'Φεβρουάριος', number: 2 },
    { name: 'Μάρτιος', number: 3 }, { name: 'Απρίλιος', number: 4 },
    { name: 'Μάιος', number: 5 }, { name: 'Ιούνιος', number: 6 }
];

function Payments({ allStudents, allPayments, db, appId, loading }) {
    const location = useLocation(); // <-- ΝΕΟ HOOK
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });
    
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [paymentDetails, setPaymentDetails] = useState({ monthData: null, amount: 0 });
    
    const [monthlyDues, setMonthlyDues] = useState({});

    // --- ΝΕΟ: useEffect για να θέτει τον επιλεγμένο μαθητή από την πλοήγηση ---
    useEffect(() => {
        const studentIdFromState = location.state?.selectedStudentId;
        if (studentIdFromState) {
            setSelectedStudentId(studentIdFromState);
        }
    }, [location.state]);

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
        if (!selectedStudent) return [];
        const paymentsForStudent = allPayments.filter(p => p.studentId === selectedStudent.id);
        const today = dayjs();
        const currentSchoolYearStartYear = today.month() + 1 >= 9 ? today.year() : today.year() - 1;

        return schoolYearMonths.map(month => {
            const paidThisMonth = paymentsForStudent
                .filter(p => {
                    const isForThisMonthNote = p.notes === `Δόση ${month.name}`;
                    if (!isForThisMonthNote) return false;
                    const paymentDate = dayjs(getDateFromFirestoreTimestamp(p.date));
                    const paymentSchoolYearStartYear = paymentDate.month() + 1 >= 9 ? paymentDate.year() : paymentDate.year() - 1;
                    return paymentSchoolYearStartYear === currentSchoolYearStartYear;
                })
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
        if (!selectedStudent) return [];
        return allPayments
            .filter(p => p.studentId === selectedStudent.id)
            .sort((a, b) => getDateFromFirestoreTimestamp(b.date) - getDateFromFirestoreTimestamp(a.date));
    }, [selectedStudent, allPayments]);

    const handleOpenPaymentDialog = (monthData) => {
        setPaymentDetails({ monthData: monthData, amount: monthData.balance });
        setPaymentDialogOpen(true);
    };
    
    const handleRecordPayment = async () => {
        if (isSaving || !paymentDetails.monthData || paymentDetails.amount <= 0) return;
        
        const { monthData, amount } = paymentDetails;

        setIsSaving(true);
        setFeedback({ type: '', message: '' });

        try {
            const paymentData = {
                studentId: selectedStudent.id,
                studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
                amount: amount,
                notes: `Δόση ${monthData.month}`,
                date: new Date(),
                createdAt: new Date(),
            };
            await addDoc(collection(db, `artifacts/${appId}/public/data/payments`), paymentData);
            setFeedback({ type: 'success', message: `Η πληρωμή των ${amount.toFixed(2)}€ για ${monthData.month} καταχωρήθηκε!` });
        } catch (error) {
            console.error("Error processing payment:", error);
            setFeedback({ type: 'error', message: 'Σφάλμα κατά την επεξεργασία.' });
        } finally {
            setIsSaving(false);
            setPaymentDialogOpen(false);
        }
    };
    
    const handlePayFullBalance = async (monthData) => {
        if (isSaving || monthData.balance <= 0) return;
        
        setIsSaving(true);
        setFeedback({ type: '', message: '' });

        try {
            const paymentData = {
                studentId: selectedStudent.id,
                studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
                amount: monthData.balance,
                notes: `Δόση ${monthData.month}`,
                date: new Date(),
                createdAt: new Date(),
            };
            await addDoc(collection(db, `artifacts/${appId}/public/data/payments`), paymentData);
            setFeedback({ type: 'success', message: `Η εξόφληση για ${monthData.month} καταχωρήθηκε!` });
        } catch (error) {
            console.error("Error processing full payment:", error);
            setFeedback({ type: 'error', message: 'Σφάλμα κατά την εξόφληση.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleUnpayAction = async (monthData) => {
        if (isSaving) return;
        setIsSaving(true);
        setFeedback({ type: '', message: '' });

        try {
            const today = dayjs();
            const currentSchoolYearStartYear = today.month() + 1 >= 9 ? today.year() : today.year() - 1;
            const q = query(
                collection(db, `artifacts/${appId}/public/data/payments`),
                where('studentId', '==', selectedStudent.id),
                where('notes', '==', `Δόση ${monthData.month}`)
            );
            const snapshot = await getDocs(q);
            const batch = writeBatch(db);
            let deletedCount = 0;
            snapshot.forEach(doc => {
                const p = doc.data();
                const paymentDate = dayjs(getDateFromFirestoreTimestamp(p.date));
                const paymentSchoolYearStartYear = paymentDate.month() + 1 >= 9 ? paymentDate.year() : paymentDate.year() - 1;
                if (paymentSchoolYearStartYear === currentSchoolYearStartYear) {
                    batch.delete(doc.ref);
                    deletedCount++;
                }
            });
            if (deletedCount > 0) {
                await batch.commit();
                setFeedback({ type: 'success', message: `Οι πληρωμές για ${monthData.month} αναιρέθηκαν.` });
            }
        } catch (error) {
            console.error("Error reversing payment:", error);
            setFeedback({ type: 'error', message: 'Σφάλμα κατά την αναίρεση.' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDueChange = (monthName, value) => {
        const newAmount = parseFloat(value.replace(',', '.')) || 0;
        setMonthlyDues(prev => ({ ...prev, [monthName]: newAmount }));
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
    }

    return (
        <Box>
            <Box sx={{ mb: 4 }}>
                <PaymentSummaryTable allStudents={allStudents} allPayments={allPayments} loading={loading} />
            </Box>
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
                            <Typography>Επιλέξτε έναν μαθητή για να δείτε λεπτομέρειες πληρωμών.</Typography>
                        ) : (
                            <>
                                <Typography variant="h5" gutterBottom>Καρτέλα Πληρωμών</Typography>
                                <Typography variant="h6" color="primary.main">{selectedStudent.firstName} {selectedStudent.lastName}</Typography>
                                <Grid container spacing={2} sx={{ my: 2 }}>
                                    <Grid item xs={4}><Typography>Δίδακτρα: {selectedStudent.finalFees.toFixed(2)} €</Typography></Grid>
                                    <Grid item xs={4}><Typography color="success.main">Πληρωμένα: {selectedStudent.totalPaid.toFixed(2)} €</Typography></Grid>
                                    <Grid item xs={4}><Typography color="error.main">Υπόλοιπο: {selectedStudent.balance.toFixed(2)} €</Typography></Grid>
                                </Grid>
                                <Divider sx={{ my: 2 }} />
                                <Typography variant="h6" sx={{ mb: 2 }}>Μηνιαία Ανάλυση</Typography>
                                <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                                    <Table size="small">
                                        <TableHead><TableRow><TableCell>Μήνας</TableCell><TableCell>Δίδακτρα</TableCell><TableCell>Πληρωμένα</TableCell><TableCell>Υπόλοιπο</TableCell><TableCell>Κατάσταση</TableCell></TableRow></TableHead>
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
                                                        {row.status === 'Εξοφλημένο' ? (
                                                            <Chip
                                                                label={row.status}
                                                                color='success'
                                                                size="small"
                                                                onClick={() => handleUnpayAction(row)}
                                                                disabled={isSaving}
                                                                sx={{ cursor: 'pointer' }}
                                                            />
                                                        ) : (
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                <Chip
                                                                    label="Εξόφληση"
                                                                    color='warning'
                                                                    size="small"
                                                                    onClick={() => handlePayFullBalance(row)}
                                                                    disabled={isSaving}
                                                                    sx={{ cursor: 'pointer', flexGrow: 1 }}
                                                                />
                                                                <Tooltip title="Μερική Πληρωμή">
                                                                    <IconButton size="small" onClick={() => handleOpenPaymentDialog(row)} disabled={isSaving}>
                                                                        <AddCardIcon fontSize="small" />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            </Box>
                                                        )}
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
                                            {selectedStudentPayments.map((p) => {
                                                const monthName = p.notes?.replace('Δόση ', '');
                                                const monthStatusData = monthlyBreakdown.find(m => m.month === monthName);
                                                const isMonthPaid = monthStatusData?.status === 'Εξοφλημένο';

                                                return (
                                                    <TableRow key={p.id}>
                                                        <TableCell>{dayjs(getDateFromFirestoreTimestamp(p.date)).format('DD/MM/YYYY')}</TableCell>
                                                        <TableCell>{p.amount.toFixed(2)} €</TableCell>
                                                        <TableCell>{p.notes}</TableCell>
                                                        <TableCell>
                                                            {isMonthPaid && (
                                                                <IconButton color="primary" onClick={() => generateReceipt(selectedStudent, p)}>
                                                                    <ReceiptIcon />
                                                                </IconButton>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </>
                        )}
                    </Paper>
                </Grid>
            </Grid>

            <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)}>
                <DialogTitle>Καταχώρηση Πληρωμής</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{mb: 2}}>
                        Καταχωρήστε το ποσό που πληρώθηκε για τον μήνα <strong>{paymentDetails.monthData?.month}</strong>.
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="amount"
                        label="Ποσό Πληρωμής (€)"
                        type="number"
                        fullWidth
                        variant="outlined"
                        value={paymentDetails.amount}
                        onChange={(e) => setPaymentDetails(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPaymentDialogOpen(false)}>Ακύρωση</Button>
                    <Button onClick={handleRecordPayment} variant="contained" disabled={isSaving}>
                        {isSaving ? <CircularProgress size={24} /> : 'Καταχώρηση'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default Payments;
