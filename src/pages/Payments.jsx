// src/pages/Payments.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Box, Grid, Paper, Typography, List, ListItemButton, ListItemText,
    TextField, Button, Table, TableContainer, TableHead, TableRow, TableCell, TableBody,
    CircularProgress, Alert, Divider, Chip, IconButton,
    Dialog, DialogActions, DialogContent, DialogTitle, DialogContentText, Tooltip, Checkbox
} from '@mui/material';
import { Receipt as ReceiptIcon, AddCard as AddCardIcon } from '@mui/icons-material';
import { collection, doc, addDoc, query, where, getDocs, writeBatch, setDoc } from 'firebase/firestore';
import dayjs from 'dayjs';
import 'dayjs/locale/el';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import PaymentSummaryTable from './PaymentSummaryTable.jsx';
import { useAcademicYear } from '../context/AcademicYearContext.jsx';

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
        page.drawText(`Αρ. Απόδειξης: ${payment.id ? payment.id.substring(0, 8) : 'N/A'}`, { x: 50, y, font: robotoFont, size: fontSize });
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
        a.download = `receipt_${student.lastName}_${payment.id ? payment.id.substring(0, 5) : 'payment'}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Failed to generate PDF receipt with pdf-lib:", error);
        alert("Αποτυχία δημιουργίας της απόδειξης. Παρακαλώ ελέγξτε την κονσόλα για σφάλματα.");
    }
};

function Payments({ allStudents, allPayments, db, appId, loading, selectedYear }) {
    const location = useLocation();
    // --- ΝΕΑ ΠΡΟΣΘΗΚΗ: Ανάκτηση δεδομένων του ακαδημαϊκού έτους ---
    const { selectedYearData } = useAcademicYear();

    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });
    
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [paymentDetails, setPaymentDetails] = useState({ monthData: null, amount: 0 });
    
    const [monthlyDues, setMonthlyDues] = useState({});
    const [paymentDates, setPaymentDates] = useState({});
    const [monthlyStatus, setMonthlyStatus] = useState({});

    // --- ΝΕΑ ΛΟΓΙΚΗ: Δημιουργία λίστας μηνών δυναμικά ---
    const billableMonths = useMemo(() => {
        if (!selectedYearData?.startDate || !selectedYearData?.endDate) {
            return [];
        }
        const start = dayjs(selectedYearData.startDate.toDate()).startOf('month');
        const end = dayjs(selectedYearData.endDate.toDate()).endOf('month');
        const months = [];
        let current = start;

        while (current.isBefore(end) || current.isSame(end, 'month')) {
            months.push({
                key: current.format('YYYY-MM'),
                name: current.format('MMMM'),
                year: current.year(),
            });
            current = current.add(1, 'month');
        }
        return months;
    }, [selectedYearData]);

    useEffect(() => {
        const studentIdFromState = location.state?.selectedStudentId;
        if (studentIdFromState) {
            setSelectedStudentId(studentIdFromState);
        }
    }, [location.state]);

    const studentsWithBalance = useMemo(() => {
        if (!allStudents || !allPayments || billableMonths.length === 0) return [];
        return allStudents.map(student => {
            const monthlyFeeRaw = parseFloat(student.payment) || 0;
            const discount = parseFloat(student.debt) || 0;
            const monthlyFee = monthlyFeeRaw - (monthlyFeeRaw * (discount / 100));
            
            const studentMonthlyStatus = student.monthlyStatus || {};
            const activeMonthsCount = billableMonths.filter(m => studentMonthlyStatus[m.key] !== false).length;
            const finalFees = monthlyFee * activeMonthsCount;

            const paymentsForStudent = allPayments.filter(p => p.studentId === student.id);
            const totalPaid = paymentsForStudent.reduce((sum, p) => sum + p.amount, 0);
            const balance = finalFees - totalPaid;
            return { ...student, finalFees, totalPaid, balance, monthlyFee };
        }).sort((a, b) => a.lastName.localeCompare(b.lastName));
    }, [allStudents, allPayments, billableMonths]);

    const selectedStudent = useMemo(() => {
        return studentsWithBalance.find(s => s.id === selectedStudentId) || null;
    }, [selectedStudentId, studentsWithBalance]);
    
    useEffect(() => {
        if (selectedStudent && billableMonths.length > 0) {
            const initialDues = {};
            const initialDates = {};
            const initialStatus = {};
            
            const registrationDate = selectedStudent.createdAt ? dayjs(getDateFromFirestoreTimestamp(selectedStudent.createdAt)) : null;

            billableMonths.forEach(month => {
                initialDues[month.key] = selectedStudent.monthlyFee;
                const monthDate = dayjs(month.key);
                initialDates[month.key] = monthDate.format('YYYY-MM-DD');

                const isManuallySet = selectedStudent.monthlyStatus?.[month.key] !== undefined;
                let isActive = true; 

                if (isManuallySet) {
                    isActive = selectedStudent.monthlyStatus[month.key] !== false;
                } else if (registrationDate) {
                    isActive = monthDate.isSame(registrationDate, 'month') || monthDate.isAfter(registrationDate, 'month');
                }
                
                initialStatus[month.key] = isActive;
            });
            setMonthlyDues(initialDues);
            setPaymentDates(initialDates);
            setMonthlyStatus(initialStatus);
        }
    }, [selectedStudent, billableMonths]);


    const monthlyBreakdown = useMemo(() => {
        if (!selectedStudent || billableMonths.length === 0) return [];
        const paymentsForStudent = allPayments.filter(p => p.studentId === selectedStudent.id);

        return billableMonths.map(month => {
            const targetNote = `Δόση ${month.name} ${month.year}`;

            const paidThisMonth = paymentsForStudent
                .filter(p => p.notes === targetNote)
                .reduce((sum, p) => sum + p.amount, 0);
            
            const dueAmount = monthlyStatus[month.key] ? (monthlyDues[month.key] !== undefined ? monthlyDues[month.key] : selectedStudent.monthlyFee) : 0;
            const balance = dueAmount - paidThisMonth;
            
            return {
                ...month,
                targetNote: targetNote,
                due: dueAmount,
                paid: paidThisMonth,
                balance: balance,
                status: balance <= 0.01 && dueAmount > 0 ? 'Εξοφλημένο' : (dueAmount === 0 ? 'Ανενεργός' : 'Εκκρεμεί')
            };
        });
    }, [selectedStudent, allPayments, monthlyDues, monthlyStatus, billableMonths]);

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
        setPaymentDetails({ monthData: monthData, amount: monthData.balance > 0 ? monthData.balance : 0 });
        setPaymentDialogOpen(true);
    };
    
    const recordPayment = async (monthData, amount, date) => {
        if (isSaving || !monthData || amount <= 0 || !selectedYear) return;
        
        setIsSaving(true);
        setFeedback({ type: '', message: '' });

        try {
            const paymentData = {
                studentId: selectedStudent.id,
                studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
                amount: amount,
                notes: monthData.targetNote,
                date: dayjs(date).toDate(),
                createdAt: new Date(),
            };
            const docRef = await addDoc(collection(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/payments`), paymentData);
            generateReceipt(selectedStudent, { ...paymentData, id: docRef.id });
            setFeedback({ type: 'success', message: `Η πληρωμή των ${amount.toFixed(2)}€ για ${monthData.name} καταχωρήθηκε!` });
        } catch (error) {
            console.error("Error processing payment:", error);
            setFeedback({ type: 'error', message: 'Σφάλμα κατά την επεξεργασία.' });
        } finally {
            setIsSaving(false);
            setPaymentDialogOpen(false);
        }
    };

    const handleRecordPartialPayment = () => {
        const { monthData, amount } = paymentDetails;
        const date = paymentDates[monthData.key];
        recordPayment(monthData, amount, date);
    };

    const handlePayFullBalance = (monthData) => {
        const date = paymentDates[monthData.key];
        recordPayment(monthData, monthData.balance, date);
    };


    const handleUnpayAction = async (monthData) => {
        if (isSaving || !selectedYear) return;
        setIsSaving(true);
        setFeedback({ type: '', message: '' });

        try {
            const q = query(
                collection(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/payments`),
                where('studentId', '==', selectedStudent.id),
                where('notes', '==', monthData.targetNote)
            );
            const snapshot = await getDocs(q);
            const batch = writeBatch(db);
            if (!snapshot.empty) {
                snapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
                setFeedback({ type: 'success', message: `Οι πληρωμές για ${monthData.name} αναιρέθηκαν.` });
            }
        } catch (error) {
            console.error("Error reversing payment:", error);
            setFeedback({ type: 'error', message: 'Σφάλμα κατά την αναίρεση.' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDueChange = (monthKey, value) => {
        const newAmount = parseFloat(value.replace(',', '.')) || 0;
        setMonthlyDues(prev => ({ ...prev, [monthKey]: newAmount }));
    };

    const handleDateChange = (monthKey, value) => {
        setPaymentDates(prev => ({ ...prev, [monthKey]: value }));
    };

    const handleMonthlyStatusChange = async (monthKey, isChecked) => {
        if (!selectedYear) return;
        const newStatus = { ...selectedStudent.monthlyStatus, [monthKey]: isChecked };
        setMonthlyStatus(prev => ({...prev, [monthKey]: isChecked}));
        
        try {
            const studentRef = doc(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/students`, selectedStudent.id);
            await setDoc(studentRef, { monthlyStatus: newStatus }, { merge: true });
        } catch (error) {
            console.error("Error updating monthly status:", error);
            setFeedback({ type: 'error', message: 'Αποτυχία ενημέρωσης κατάστασης.' });
        }
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
                <Grid item xs={12} md={4}>
                    <Paper elevation={3} sx={{ p: 2, height: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h5" sx={{ mb: 2 }}>Οικονομικά Μαθητών</Typography>
                        <TextField fullWidth label="Αναζήτηση Μαθητή..." variant="outlined" size="small" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ mb: 2 }} />
                        <List sx={{ overflowY: 'auto', flexGrow: 1 }}>
                            {filteredStudents.map(student => (
                                <ListItemButton key={student.id} selected={selectedStudentId === student.id} onClick={() => setSelectedStudentId(student.id)}>
                                    <ListItemText primary={`${student.firstName} ${student.lastName}`} secondary={`Υπόλοιπο: ${student.balance.toFixed(2)} €`} />
                                </ListItemButton>
                            ))}
                        </List>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={8}>
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
                                        <TableHead><TableRow><TableCell>Ενεργός</TableCell><TableCell>Μήνας</TableCell><TableCell>Δίδακτρα</TableCell><TableCell>Πληρωμένα</TableCell><TableCell>Υπόλοιπο</TableCell><TableCell>Ημερομηνία</TableCell><TableCell>Κατάσταση</TableCell></TableRow></TableHead>
                                        <TableBody>
                                            {monthlyBreakdown.map(row => {
                                                const isMonthActive = monthlyStatus[row.key] !== false;
                                                return (
                                                <TableRow key={row.key} sx={{ bgcolor: !isMonthActive ? 'grey.100' : 'transparent' }}>
                                                    <TableCell padding="checkbox">
                                                        <Checkbox checked={isMonthActive} onChange={(e) => handleMonthlyStatusChange(row.key, e.target.checked)} />
                                                    </TableCell>
                                                    <TableCell>{row.name}</TableCell>
                                                    <TableCell>
                                                        <TextField disabled={!isMonthActive} variant="standard" size="small" value={monthlyDues[row.key] !== undefined ? monthlyDues[row.key] : ''} onChange={(e) => handleDueChange(row.key, e.target.value)} sx={{ width: '80px' }} InputProps={{ endAdornment: '€' }} />
                                                    </TableCell>
                                                    <TableCell>{row.paid.toFixed(2)} €</TableCell>
                                                    <TableCell>{row.balance.toFixed(2)} €</TableCell>
                                                    <TableCell>
                                                        <TextField disabled={!isMonthActive} type="date" variant="standard" size="small" value={paymentDates[row.key] || ''} onChange={(e) => handleDateChange(row.key, e.target.value)} sx={{ width: '130px' }} InputLabelProps={{ shrink: true }} />
                                                    </TableCell>
                                                    <TableCell>
                                                        {row.status === 'Εξοφλημένο' ? (
                                                            <Chip label={row.status} color='success' size="small" onClick={() => handleUnpayAction(row)} disabled={isSaving || !isMonthActive} sx={{ cursor: 'pointer' }} />
                                                        ) : row.status === 'Ανενεργός' ? (
                                                            <Chip label={row.status} size="small" />
                                                        ) : (
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                <Chip label="Εξόφληση" color='warning' size="small" onClick={() => handlePayFullBalance(row)} disabled={isSaving || !isMonthActive || row.balance <= 0} sx={{ cursor: 'pointer', flexGrow: 1 }} />
                                                                <Tooltip title="Μερική Πληρωμή">
                                                                    <span>
                                                                        <IconButton size="small" onClick={() => handleOpenPaymentDialog(row)} disabled={isSaving || !isMonthActive || row.balance <= 0}><AddCardIcon fontSize="small" /></IconButton>
                                                                    </span>
                                                                </Tooltip>
                                                            </Box>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            )})}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                {feedback.message && <Alert severity={feedback.type} sx={{ mb: 2 }}>{feedback.message}</Alert>}
                                <Typography variant="h6" sx={{ mb: 2 }}>Ιστορικό Πληρωμών</Typography>
                                <TableContainer component={Paper} variant="outlined">
                                    <Table size="small">
                                        <TableHead><TableRow><TableCell>Ημερομηνία</TableCell><TableCell>Ποσό</TableCell><TableCell>Σημειώσεις</TableCell><TableCell>Απόδειξη</TableCell></TableRow></TableHead>
                                        <TableBody>
                                            {selectedStudentPayments.map((p) => (
                                                <TableRow key={p.id}>
                                                    <TableCell>{dayjs(getDateFromFirestoreTimestamp(p.date)).format('DD/MM/YYYY')}</TableCell>
                                                    <TableCell>{p.amount.toFixed(2)} €</TableCell>
                                                    <TableCell>{p.notes}</TableCell>
                                                    <TableCell>
                                                        <IconButton color="primary" onClick={() => generateReceipt(selectedStudent, p)}><ReceiptIcon /></IconButton>
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

            <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)}>
                <DialogTitle>Καταχώρηση Πληρωμής</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{mb: 2}}>Καταχωρήστε το ποσό που πληρώθηκε για τον μήνα <strong>{paymentDetails.monthData?.name}</strong>.</DialogContentText>
                    <TextField autoFocus margin="dense" id="amount" label="Ποσό Πληρωμής (€)" type="number" fullWidth variant="outlined" value={paymentDetails.amount} onChange={(e) => setPaymentDetails(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPaymentDialogOpen(false)}>Ακύρωση</Button>
                    <Button onClick={handleRecordPartialPayment} variant="contained" disabled={isSaving}>{isSaving ? <CircularProgress size={24} /> : 'Καταχώρηση'}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default Payments;
