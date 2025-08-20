// src/pages/PaymentSummaryTable.jsx
import React, { useMemo } from 'react';
import {
    Box, Paper, Typography, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, CircularProgress, TableFooter
} from '@mui/material';
import dayjs from 'dayjs';
import 'dayjs/locale/el';
import { green, red, grey } from '@mui/material/colors';
import { useTheme } from '../context/ThemeContext';
import { useAcademicYear } from '../context/AcademicYearContext.jsx';

dayjs.locale('el');

const getDateFromFirestoreTimestamp = (timestamp) => {
    if (timestamp && typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (timestamp instanceof Date) return timestamp;
    return dayjs(timestamp).toDate();
};

function PaymentSummaryTable({ allStudents, allPayments, loading }) {
    const { mode } = useTheme();
    // --- ΝΕΑ ΠΡΟΣΘΗΚΗ: Ανάκτηση δεδομένων του ακαδημαϊκού έτους ---
    const { selectedYearData } = useAcademicYear();

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

    const { summaryData, studentTotals, monthlyTotals, grandTotal } = useMemo(() => {
        if (!allStudents || !allPayments || billableMonths.length === 0) {
            return { summaryData: new Map(), studentTotals: new Map(), monthlyTotals: {}, grandTotal: 0 };
        }

        const dataMap = new Map();
        const studentTotalsMap = new Map();
        const monthlyTotalsObj = {};
        billableMonths.forEach(m => monthlyTotalsObj[m.key] = 0);
        let totalPaidOverall = 0;

        allStudents.forEach(student => {
            const studentMonthlyFeeRaw = parseFloat(student.payment) || 0;
            const studentDiscount = parseFloat(student.debt) || 0;
            const studentMonthlyFee = studentMonthlyFeeRaw - (studentMonthlyFeeRaw * (studentDiscount / 100));
            
            const registrationDate = student.createdAt ? dayjs(getDateFromFirestoreTimestamp(student.createdAt)) : null;
            const studentMonthlyStatus = student.monthlyStatus || {};

            const studentPayments = allPayments.filter(p => p.studentId === student.id);
            const monthlyPaymentsMap = new Map();
            let totalPaidByStudent = 0;

            billableMonths.forEach(month => {
                const monthDate = dayjs(month.key);
                const isManuallySet = studentMonthlyStatus[month.key] !== undefined;
                let isActive = true;

                if (isManuallySet) {
                    isActive = studentMonthlyStatus[month.key] !== false;
                } else if (registrationDate) {
                    isActive = monthDate.isSame(registrationDate, 'month') || monthDate.isAfter(registrationDate, 'month');
                }
                
                const targetNote = `Δόση ${month.name} ${month.year}`;
                const paidThisMonth = studentPayments
                    .filter(p => p.notes === targetNote)
                    .reduce((sum, p) => sum + p.amount, 0);
                
                const dueThisMonth = isActive ? studentMonthlyFee : 0;
                const balance = dueThisMonth - paidThisMonth;
                monthlyPaymentsMap.set(month.key, { paid: paidThisMonth, balance: balance, isActive: isActive });

                totalPaidByStudent += paidThisMonth;
                monthlyTotalsObj[month.key] += paidThisMonth;
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
    }, [allStudents, allPayments, billableMonths]);

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
                            <TableCell sx={{ fontWeight: 'bold', minWidth: 150 }}>Μαθητής</TableCell>
                            {billableMonths.map(month => (
                                <TableCell key={month.key} sx={{ fontWeight: 'bold', textAlign: 'center', minWidth: 100 }}>
                                    {month.name} '{dayjs(month.key).format('YY')}
                                </TableCell>
                            ))}
                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', minWidth: 120 }}>Σύνολο Έτους</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {allStudents.sort((a,b) => a.lastName.localeCompare(b.lastName)).map(student => (
                            <TableRow key={student.id} hover>
                                <TableCell sx={{ fontWeight: 'bold' }}>{student.lastName} {student.firstName}</TableCell>
                                {billableMonths.map(month => {
                                    const monthData = summaryData.get(student.id)?.get(month.key);
                                    
                                    let displayValue = 'N/A';
                                    let textColor = 'inherit';
                                    let backgroundColor = 'transparent';

                                    if (monthData) {
                                        if (monthData.isActive) {
                                            const isFullyPaid = Math.abs(monthData.balance) < 0.01;
                                            displayValue = isFullyPaid ? `${monthData.paid.toFixed(2)} €` : `${monthData.balance.toFixed(2)} €`;
                                            
                                            if (mode === 'light') {
                                                textColor = isFullyPaid ? green[800] : red[800];
                                                backgroundColor = isFullyPaid ? green[50] : red[50];
                                            } else {
                                                textColor = '#fff';
                                                backgroundColor = isFullyPaid ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)';
                                            }
                                        } else {
                                            displayValue = 'Ανενεργός';
                                            backgroundColor = mode === 'light' ? grey[100] : grey[800];
                                            textColor = mode === 'light' ? grey[600] : grey[400];
                                        }
                                    }

                                    return (
                                        <TableCell key={`${student.id}-${month.key}`} sx={{ textAlign: 'center', color: textColor, backgroundColor: backgroundColor, fontWeight: 'bold' }}>
                                            {displayValue}
                                        </TableCell>
                                    );
                                })}
                                <TableCell sx={{ textAlign: 'center', fontWeight: 'bold' }}>
                                    {(studentTotals.get(student.id) || 0).toFixed(2)} €
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Σύνολα</TableCell>
                            {billableMonths.map(month => (
                                <TableCell key={`total-${month.key}`} sx={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1rem' }}>
                                    {(monthlyTotals[month.key] || 0).toFixed(2)} €
                                </TableCell>
                            ))}
                            <TableCell sx={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem' }}>
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
