// src/pages/PaymentSummaryTable.jsx
import React, { useMemo } from 'react';
import {
    Box, Paper, Typography, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, CircularProgress, TableFooter
} from '@mui/material';
import dayjs from 'dayjs';
import 'dayjs/locale/el';
import { green, red } from '@mui/material/colors';

dayjs.locale('el');

const getDateFromFirestoreTimestamp = (timestamp) => {
    if (timestamp && typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (timestamp instanceof Date) return timestamp;
    return dayjs(timestamp).toDate();
};

const schoolYearMonths = [
    { name: 'Σεπτέμβριος', number: 9 }, { name: 'Οκτώβριος', number: 10 },
    { name: 'Νοέμβριος', number: 11 }, { name: 'Δεκέμβριος', number: 12 },
    { name: 'Ιανουάριος', number: 1 }, { name: 'Φεβρουάριος', number: 2 },
    { name: 'Μάρτιος', number: 3 }, { name: 'Απρίλιος', number: 4 },
    { name: 'Μάιος', number: 5 }, { name: 'Ιούνιος', number: 6 }
];

// Helper function to determine the current school year
const getCurrentSchoolYearStartYear = () => {
    const today = dayjs();
    return today.month() + 1 >= 9 ? today.year() : today.year() - 1;
};

function PaymentSummaryTable({ allStudents, allPayments, loading }) {

    const { summaryData, studentTotals, monthlyTotals, grandTotal } = useMemo(() => {
        if (!allStudents || !allPayments) {
            return { summaryData: new Map(), studentTotals: new Map(), monthlyTotals: {}, grandTotal: 0 };
        }

        const dataMap = new Map();
        const studentTotalsMap = new Map();
        const monthlyTotalsObj = {};
        schoolYearMonths.forEach(m => monthlyTotalsObj[m.name] = 0);
        let totalPaidOverall = 0;

        const currentSchoolYearStartYear = getCurrentSchoolYearStartYear();

        allStudents.forEach(student => {
            const studentMonthlyFeeRaw = parseFloat(student.payment) || 0;
            const studentDiscount = parseFloat(student.debt) || 0;
            const studentMonthlyFee = studentMonthlyFeeRaw - (studentMonthlyFeeRaw * (studentDiscount / 100));

            const studentPayments = allPayments.filter(p => p.studentId === student.id);
            const monthlyPaymentsMap = new Map();
            let totalPaidByStudent = 0;

            schoolYearMonths.forEach(month => {
                const paidThisMonth = studentPayments
                    .filter(p => {
                        const isForThisMonthNote = p.notes === `Δόση ${month.name}`;
                        if (!isForThisMonthNote) return false;
                        const paymentDate = dayjs(getDateFromFirestoreTimestamp(p.date));
                        const paymentSchoolYearStartYear = paymentDate.month() + 1 >= 9 ? paymentDate.year() : paymentDate.year() - 1;
                        return paymentSchoolYearStartYear === currentSchoolYearStartYear;
                    })
                    .reduce((sum, p) => sum + p.amount, 0);
                
                const balance = studentMonthlyFee - paidThisMonth;
                monthlyPaymentsMap.set(month.name, { paid: paidThisMonth, balance: balance });

                totalPaidByStudent += paidThisMonth;
                monthlyTotalsObj[month.name] += paidThisMonth;
            });
            
            dataMap.set(student.id, monthlyPaymentsMap);
            studentTotalsMap.set(student.id, totalPaidByStudent);
            totalPaidOverall += totalPaidByStudent;
        });

        return { 
            summaryData: dataMap, 
            studentTotals: studentTotalsMap, 
            monthlyTotals: monthlyTotalsObj, 
            grandTotal: totalPaidOverall 
        };
    }, [allStudents, allPayments]);

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
    }

    if (!allStudents || allStudents.length === 0) {
        return <Typography variant="h6" sx={{ mt: 3, textAlign: 'center' }}>Δεν υπάρχουν μαθητές για εμφάνιση.</Typography>;
    }

    return (
        <Box sx={{ mt: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                Συνοπτικός Πίνακας Πληρωμών
            </Typography>
            <TableContainer component={Paper} elevation={3} sx={{ overflowX: 'auto' }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', minWidth: 150, backgroundColor: '#3f51b5', color: '#fff' }}>Μαθητής</TableCell>
                            {schoolYearMonths.map(month => (
                                <TableCell key={month.name} sx={{ fontWeight: 'bold', textAlign: 'center', minWidth: 100, backgroundColor: '#3f51b5', color: '#fff' }}>
                                    {month.name}
                                </TableCell>
                            ))}
                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', minWidth: 120, backgroundColor: '#2c387e', color: '#fff' }}>Σύνολο Έτους</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {allStudents.sort((a,b) => a.lastName.localeCompare(b.lastName)).map(student => (
                            <TableRow key={student.id} hover>
                                <TableCell sx={{ fontWeight: 'bold' }}>{student.lastName} {student.firstName}</TableCell>
                                {schoolYearMonths.map(month => {
                                    const monthData = summaryData.get(student.id)?.get(month.name);
                                    const isFullyPaid = monthData && Math.abs(monthData.balance) < 0.01;
                                    const displayValue = monthData ? (isFullyPaid ? `${monthData.paid.toFixed(2)} €` : `${monthData.balance.toFixed(2)} €`) : 'N/A';
                                    const textColor = isFullyPaid ? green[800] : red[800];
                                    const backgroundColor = isFullyPaid ? green[50] : red[50];

                                    return (
                                        <TableCell key={`${student.id}-${month.name}`} sx={{ textAlign: 'center', color: textColor, backgroundColor: backgroundColor, fontWeight: 'bold' }}>
                                            {displayValue}
                                        </TableCell>
                                    );
                                })}
                                <TableCell sx={{ textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f4f6f8' }}>
                                    {(studentTotals.get(student.id) || 0).toFixed(2)} €
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    <TableFooter>
                        <TableRow sx={{ backgroundColor: '#e8eaf6' }}>
                            <TableCell sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Σύνολα</TableCell>
                            {schoolYearMonths.map(month => (
                                <TableCell key={`total-${month.name}`} sx={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1rem' }}>
                                    {(monthlyTotals[month.name] || 0).toFixed(2)} €
                                </TableCell>
                            ))}
                            <TableCell sx={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem', backgroundColor: '#c5cae9' }}>
                                {grandTotal.toFixed(2)} €
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </TableContainer>
        </Box>
    );
}

export default PaymentSummaryTable;
