// src/portals/parent/ParentFinancials.jsx
import React, { useMemo } from 'react';
import { Container, Paper, Typography, Grid, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Divider } from '@mui/material';
import dayjs from 'dayjs';

const schoolYearMonths = [
    { name: 'Σεπτέμβριος', number: 9 }, { name: 'Οκτώβριος', number: 10 },
    { name: 'Νοέμβριος', number: 11 }, { name: 'Δεκέμβριος', number: 12 },
    { name: 'Ιανουάριος', number: 1 }, { name: 'Φεβρουάριος', number: 2 },
    { name: 'Μάρτιος', number: 3 }, { name: 'Απρίλιος', number: 4 },
    { name: 'Μάιος', number: 5 }, { name: 'Ιούνιος', number: 6 }
];

const DetailItem = ({ label, value }) => (
    <Box>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{value}</Typography>
    </Box>
);

// --- ΔΙΟΡΘΩΣΗ: Αλλαγή του prop από studentData σε childData ---
function ParentFinancials({ childData, payments }) {

    const studentFinancials = useMemo(() => {
        if (!childData || !payments) return null;
        const monthlyFeeRaw = parseFloat(childData.payment) || 0;
        const discount = parseFloat(childData.debt) || 0;
        const monthlyFee = monthlyFeeRaw - (monthlyFeeRaw * (discount / 100));
        const finalFees = monthlyFee * schoolYearMonths.length;
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        const balance = finalFees - totalPaid;
        return { monthlyFee, finalFees, totalPaid, balance };
    }, [childData, payments]);

    const monthlyBreakdown = useMemo(() => {
        if (!childData || !payments || !studentFinancials) return [];
        const today = dayjs();
        const currentSchoolYearStartYear = today.month() + 1 >= 9 ? today.year() : today.year() - 1;

        return schoolYearMonths.map(month => {
            const paidThisMonth = payments
                .filter(p => {
                    const isForThisMonthNote = p.notes === `Δόση ${month.name}`;
                    if (!isForThisMonthNote) return false;
                    const paymentDate = dayjs(p.date.toDate());
                    const paymentSchoolYearStartYear = paymentDate.month() + 1 >= 9 ? paymentDate.year() : paymentDate.year() - 1;
                    return paymentSchoolYearStartYear === currentSchoolYearStartYear;
                })
                .reduce((sum, p) => sum + p.amount, 0);
            
            const dueAmount = studentFinancials.monthlyFee;
            const balance = dueAmount - paidThisMonth;
            
            return {
                month: month.name,
                due: dueAmount,
                paid: paidThisMonth,
                balance: balance,
                status: balance <= 0.01 ? 'Εξοφλημένο' : 'Εκκρεμεί'
            };
        });
    }, [childData, payments, studentFinancials]);

    if (!studentFinancials) {
        return <Typography>Φόρτωση οικονομικών στοιχείων...</Typography>;
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    Οικονομική Καρτέλα - {childData.firstName} {childData.lastName}
                </Typography>
                <Grid container spacing={3} sx={{ my: 2 }}>
                    <Grid item xs={12} sm={4}><DetailItem label="Σύνολο Διδάκτρων" value={`${studentFinancials.finalFees.toFixed(2)} €`} /></Grid>
                    <Grid item xs={12} sm={4}><DetailItem label="Πληρωμένα" value={`${studentFinancials.totalPaid.toFixed(2)} €`} /></Grid>
                    <Grid item xs={12} sm={4}><DetailItem label="Υπόλοιπο" value={`${studentFinancials.balance.toFixed(2)} €`} /></Grid>
                </Grid>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" sx={{ mb: 2 }}>Μηνιαία Ανάλυση</Typography>
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Μήνας</TableCell>
                                <TableCell>Δίδακτρα</TableCell>
                                <TableCell>Πληρωμένα</TableCell>
                                <TableCell>Υπόλοιπο</TableCell>
                                <TableCell>Κατάσταση</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {monthlyBreakdown.map(row => (
                                <TableRow key={row.month}>
                                    <TableCell>{row.month}</TableCell>
                                    <TableCell>{row.due.toFixed(2)} €</TableCell>
                                    <TableCell>{row.paid.toFixed(2)} €</TableCell>
                                    <TableCell>{row.balance.toFixed(2)} €</TableCell>
                                    <TableCell>
                                        <Chip label={row.status} color={row.status === 'Εξοφλημένο' ? 'success' : 'warning'} size="small" />
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

export default ParentFinancials;
