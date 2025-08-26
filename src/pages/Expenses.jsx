// src/pages/Expenses.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
    Container, Paper, Typography, Button, Box, IconButton,
    Dialog, DialogActions, DialogContent, DialogTitle, TextField, CircularProgress, Alert,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Select, MenuItem, FormControl, InputLabel, Grid, Chip,
    Accordion, AccordionSummary, AccordionDetails, ListItemIcon, ListItemText, Divider, Tooltip, TableFooter, List, ListItem
} from '@mui/material';
import {
    Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, ReceiptLong as ReceiptIcon,
    ExpandMore as ExpandMoreIcon, Clear as ClearIcon, Download as DownloadIcon, TrendingUp as TrendingUpIcon, TrendingDown as TrendingDownIcon, Euro as EuroIcon
} from '@mui/icons-material';
import { doc, setDoc, deleteDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import dayjs from 'dayjs';
import 'dayjs/locale/el';
import Plot from 'react-plotly.js';
import isBetween from 'dayjs/plugin/isBetween';
import { useTheme, lightPalette, darkPalette } from '../context/ThemeContext';

dayjs.locale('el');
dayjs.extend(isBetween);

const expenseCategories = [
    { name: 'Ενοίκιο', icon: 'fas fa-house', color: '#3f51b5' },
    { name: 'Ρεύμα', icon: 'fas fa-bolt', color: '#fbc02d' },
    { name: 'Τηλέφωνο & Internet', icon: 'fas fa-phone', color: '#0288d1' },
    { name: 'Κινητή τηλεφωνία', icon: 'fas fa-mobile-alt', color: '#be1fb1ff' },
    { name: 'Ασφάλιση', icon: 'fas fa-shield-halved', color: '#d32f2f' },
    { name: 'Νερό', icon: 'fas fa-tint', color: '#1976d2' },
    { name: 'Αναλώσιμα', icon: 'fas fa-print', color: '#7b1fa2' },
    { name: 'Λογιστής', icon: 'fas fa-calculator', color: '#388e3c' },
    { name: 'Κοινόχρηστα', icon: 'fas fa-building-columns', color: '#5d4037' },
    { name: 'Σχολείο', icon: 'fas fa-school', color: '#00796b' },
    { name: 'Βιβλία', icon: 'fas fa-book', color: '#97af0fff' },
    { name: 'Σουπερμάρκετ', icon: 'fas fa-cart-shopping', color: '#7b1fa2' },
    { name: 'Βενζίνη', icon: 'fas fa-gas-pump', color: '#616161' },
    { name: 'Γιατρός', icon: 'fas fa-user-doctor', color: '#b40e6fff' },
    { name: 'Ταξίδι', icon: 'fas fa-plane', color: '#1abbbbff' },
    { name: 'Marketing', icon: 'fas fa-bullhorn', color: '#e64a19' },
    { name: 'Άλλο', icon: 'fas fa-ellipsis', color: '#9e9e9e' }
];
const categoryColorMap = expenseCategories.reduce((acc, cat) => { acc[cat.name] = cat.color; return acc; }, {});
const categoryIconMap = expenseCategories.reduce((acc, cat) => { acc[cat.name] = cat.icon; return acc; }, {});

const safeGetDate = (dateField) => {
    if (dateField && typeof dateField.toDate === 'function') { return dayjs(dateField.toDate()); }
    if (dateField) { const d = dayjs(dateField); if (d.isValid()) { return d; } }
    return null;
};

const getInitialFormState = () => ({
    id: null, date: dayjs().format('YYYY-MM-DD'), category: '', amount: '', description: ''
});

const SummaryCard = ({ title, value, icon, color }) => (
    <Paper elevation={3} sx={{ p: 2, display: 'flex', alignItems: 'center', borderRadius: '12px', height: '100%' }}>
        <Box sx={{ bgcolor: color, borderRadius: '50%', p: 1.5, mr: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {icon}
        </Box>
        <Box>
            <Typography color="text.secondary">{title}</Typography>
            <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>{value.toFixed(2)} €</Typography>
        </Box>
    </Paper>
);

function Expenses({ allExpenses, allPayments, allStudents, loading, db, appId, selectedYear }) {
    const { mode } = useTheme();
    const [formData, setFormData] = useState(getInitialFormState());
    const [expenseToDelete, setExpenseToDelete] = useState(null);
    const [feedback, setFeedback] = useState({ type: '', message: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [timeFilter, setTimeFilter] = useState('all');
    const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [studentFilter, setStudentFilter] = useState('all');
    const isEditMode = Boolean(formData.id);
    
    useEffect(() => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css';
        document.head.appendChild(link);
        return () => { document.head.removeChild(link); };
    }, []);

    const availableMonths = useMemo(() => {
        if (!Array.isArray(allExpenses)) return [];
        const months = new Set(allExpenses.map(exp => {
            const expenseDate = safeGetDate(exp.date);
            return expenseDate ? expenseDate.format('YYYY-MM') : null;
        }).filter(Boolean));
        return Array.from(months).sort().reverse();
    }, [allExpenses]);

    const filteredExpenses = useMemo(() => {
        let expenses = Array.isArray(allExpenses) ? [...allExpenses] : [];
        const now = dayjs();
        if (timeFilter === '3-months') expenses = expenses.filter(exp => safeGetDate(exp.date)?.isAfter(now.subtract(3, 'month')));
        else if (timeFilter === '6-months') expenses = expenses.filter(exp => safeGetDate(exp.date)?.isAfter(now.subtract(6, 'month')));
        else if (timeFilter === 'custom' && customDateRange.start && customDateRange.end) {
            const start = dayjs(customDateRange.start);
            const end = dayjs(customDateRange.end);
            expenses = expenses.filter(exp => safeGetDate(exp.date)?.isBetween(start, end, 'day', '[]'));
        }
        else if (timeFilter !== 'all') expenses = expenses.filter(exp => safeGetDate(exp.date)?.format('YYYY-MM') === timeFilter);
        if (categoryFilter !== 'all') {
            expenses = expenses.filter(exp => exp.category === categoryFilter);
        }
        return expenses;
    }, [allExpenses, timeFilter, customDateRange, categoryFilter]);

    const filteredIncome = useMemo(() => {
        let income = Array.isArray(allPayments) ? [...allPayments] : [];
        const now = dayjs();
        if (timeFilter === '3-months') income = income.filter(p => safeGetDate(p.date)?.isAfter(now.subtract(3, 'month')));
        else if (timeFilter === '6-months') income = income.filter(p => safeGetDate(p.date)?.isAfter(now.subtract(6, 'month')));
        else if (timeFilter === 'custom' && customDateRange.start && customDateRange.end) {
            const start = dayjs(customDateRange.start);
            const end = dayjs(customDateRange.end);
            income = income.filter(p => safeGetDate(p.date)?.isBetween(start, end, 'day', '[]'));
        }
        else if (timeFilter !== 'all') income = income.filter(p => safeGetDate(p.date)?.format('YYYY-MM') === timeFilter);
        if (studentFilter !== 'all') {
            income = income.filter(p => p.studentId === studentFilter);
        }
        return income;
    }, [allPayments, timeFilter, customDateRange, studentFilter]);

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleEditClick = (expense) => {
        const expenseDate = safeGetDate(expense.date);
        setFormData({
            id: expense.id,
            date: expenseDate ? expenseDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
            category: expense.category || '', amount: expense.amount || '', description: expense.description || ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleClearForm = () => setFormData(getInitialFormState());

    const handleSave = async () => {
        const amount = parseFloat(formData.amount);
        if (!formData.category || isNaN(amount) || amount <= 0) {
            setFeedback({ type: 'error', message: 'Παρακαλώ συμπληρώστε την κατηγορία και ένα έγκυρο, θετικό ποσό.' });
            return;
        }
        if (!selectedYear) {
            setFeedback({ type: 'error', message: 'Δεν έχει επιλεγεί ακαδημαϊκό έτος.' });
            return;
        }
        setIsSaving(true);
        try {
            const dataToSave = {
                date: dayjs(formData.date).toDate(), category: formData.category, amount: amount,
                description: formData.description, updatedAt: serverTimestamp()
            };
            const collectionPath = `artifacts/${appId}/public/data/academicYears/${selectedYear}/expenses`;
            if (isEditMode) {
                const docRef = doc(db, collectionPath, formData.id);
                await setDoc(docRef, dataToSave, { merge: true });
            } else {
                dataToSave.createdAt = serverTimestamp();
                await addDoc(collection(db, collectionPath), dataToSave);
            }
            setFeedback({ type: 'success', message: `Το έξοδο ${isEditMode ? 'ενημερώθηκε' : 'αποθηκεύτηκε'}.` });
            handleClearForm();
        } catch (error) {
            console.error("Error saving expense: ", error);
            setFeedback({ type: 'error', message: 'Σφάλμα κατά την αποθήκευση.' });
        } finally {
            setIsSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!expenseToDelete || !selectedYear) return;
        try {
            const docRef = doc(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/expenses`, expenseToDelete.id);
            await deleteDoc(docRef);
            setFeedback({ type: 'success', message: 'Το έξοδο διαγράφηκε.' });
        } catch (error) {
            console.error("Error deleting expense: ", error);
            setFeedback({ type: 'error', message: 'Σφάλμα κατά τη διαγραφή.' });
        } finally {
            setExpenseToDelete(null);
        }
    };

    const handleExportCSV = () => {
        const headers = ["Ημερομηνία", "Κατηγορία", "Περιγραφή", "Ποσό (€)"];
        const rows = filteredExpenses.map(exp => {
            const date = safeGetDate(exp.date);
            return [
                date ? date.format('DD/MM/YYYY') : 'Άγνωστη Ημερομηνία',
                `"${(exp.category || '').replace(/"/g, '""')}"`,
                `"${(exp.description || '').replace(/"/g, '""')}"`,
                (exp.amount || 0).toFixed(2)
            ];
        });
        let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `expenses_${dayjs().format('YYYY-MM-DD')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const expensesGroupedByMonth = useMemo(() => {
        const groups = filteredExpenses.reduce((acc, expense) => {
            const expenseDate = safeGetDate(expense.date);
            if (expenseDate) {
                const month = expenseDate.format('YYYY-MM');
                if (!acc[month]) { acc[month] = { expenses: [], total: 0 }; }
                acc[month].expenses.push(expense);
                acc[month].total += expense.amount || 0;
            }
            return acc;
        }, {});
        return Object.entries(groups).map(([month, data]) => ({ month, ...data })).sort((a, b) => b.month.localeCompare(a.month));
    }, [filteredExpenses]);

    const incomeExpenseChartData = useMemo(() => {
        const expensesData = {};
        filteredExpenses.forEach(exp => {
            const expenseDate = safeGetDate(exp.date);
            if (expenseDate) {
                const month = expenseDate.format('YYYY-MM');
                if (!expensesData[month]) expensesData[month] = 0;
                expensesData[month] += exp.amount || 0;
            }
        });
        const incomeData = {};
        filteredIncome.forEach(p => {
            const paymentDate = safeGetDate(p.date);
            if (paymentDate) {
                const month = paymentDate.format('YYYY-MM');
                if (!incomeData[month]) incomeData[month] = 0;
                incomeData[month] += p.amount || 0;
            }
        });
        const allMonths = new Set([...Object.keys(expensesData), ...Object.keys(incomeData)]);
        const sortedMonths = Array.from(allMonths).sort();
        return [
            { name: 'Έσοδα', x: sortedMonths.map(m => dayjs(m).format('MMM YYYY')), y: sortedMonths.map(m => incomeData[m] || 0), type: 'bar', marker: { color: '#4caf50' } },
            { name: 'Έξοδα', x: sortedMonths.map(m => dayjs(m).format('MMM YYYY')), y: sortedMonths.map(m => expensesData[m] || 0), type: 'bar', marker: { color: '#f44336' } }
        ];
    }, [filteredExpenses, filteredIncome]);

    const barChartLayout = useMemo(() => {
        const currentPalette = mode === 'light' ? lightPalette : darkPalette;
        return {
            autosize: true, margin: { l: 50, r: 20, b: 40, t: 40 },
            yaxis: { title: 'Ποσό (€)', ticksuffix: '€', gridcolor: currentPalette.chartGridColor, color: currentPalette.chartFontColor },
            xaxis: { gridcolor: currentPalette.chartGridColor, color: currentPalette.chartFontColor },
            barmode: 'group', paper_bgcolor: currentPalette.chartPaperBg, plot_bgcolor: currentPalette.chartPlotBg,
            font: { color: currentPalette.chartFontColor }, legend: { font: { color: currentPalette.chartFontColor } }
        };
    }, [mode]);

    // --- ΑΛΛΑΓΗ: Προετοιμασία δεδομένων για το διάγραμμα και τη λίστα ---
    const expensesByCategoryChart = useMemo(() => {
        const data = filteredExpenses.reduce((acc, exp) => {
            const category = exp.category || 'Άλλο';
            if (!acc[category]) acc[category] = 0;
            acc[category] += exp.amount || 0;
            return acc;
        }, {});

        const labels = Object.keys(data);
        const values = Object.values(data);
        const colors = labels.map(label => categoryColorMap[label] || '#9e9e9e');
        const total = values.reduce((sum, val) => sum + val, 0);

        const legendData = labels.map((label, index) => ({
            label: label,
            value: values[index],
            percentage: total > 0 ? ((values[index] / total) * 100).toFixed(2) : 0,
            color: colors[index]
        })).sort((a, b) => b.value - a.value);

        return {
            chartData: {
                labels: labels, values: values, marker: { colors: colors },
                type: 'pie', hole: .5, textinfo: 'none',
                hoverinfo: 'label+percent+value', automargin: true
            },
            legendData: legendData,
            total: total
        };
    }, [filteredExpenses]);

    const totalFilteredExpenses = useMemo(() => expensesByCategoryChart.total, [expensesByCategoryChart]);
    const totalFilteredIncome = useMemo(() => filteredIncome.reduce((sum, p) => sum + (p.amount || 0), 0), [filteredIncome]);
    const profitLoss = totalFilteredIncome - totalFilteredExpenses;

    const donutChartLayout = useMemo(() => {
        const currentPalette = mode === 'light' ? lightPalette : darkPalette;
        return {
            autosize: true, showlegend: false, margin: { l: 10, r: 10, b: 10, t: 10 },
            paper_bgcolor: currentPalette.chartPaperBg, plot_bgcolor: currentPalette.chartPlotBg,
            font: { color: currentPalette.chartFontColor },
            annotations: [{
                font: { size: 20, color: currentPalette.chartFontColor }, showarrow: false,
                text: `<b>${totalFilteredExpenses.toFixed(2)}€</b>`, x: 0.5, y: 0.5
            }]
        };
    }, [totalFilteredExpenses, mode]);

    const handleClearFilters = () => {
        setTimeFilter('all');
        setCustomDateRange({ start: '', end: '' });
        setCategoryFilter('all');
        setStudentFilter('all');
    };

    if (loading) {
        return <Container sx={{ mt: 4, textAlign: 'center' }}><CircularProgress /></Container>;
    }

    return (
        <Container maxWidth={false} sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: '12px', mb: 3 }}>
                <Typography variant="h4" component="h1" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    {isEditMode ? 'Επεξεργασία Εξόδου' : 'Καταχώρηση Νέου Εξόδου'}
                </Typography>
                <Grid container spacing={2} sx={{ pt: 2 }} alignItems="center">
                    <Grid item xs={12} sm={6} md={3}><TextField name="date" label="Ημερομηνία" type="date" value={formData.date} onChange={handleFormChange} fullWidth InputLabelProps={{ shrink: true }} size="small" /></Grid>
                    <Grid item xs={12} sm={6} md={2}><TextField name="amount" label="Ποσό (€)" type="number" value={formData.amount} onChange={handleFormChange} fullWidth size="small" /></Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Κατηγορία</InputLabel>
                            <Select
                                name="category" value={formData.category} label="Κατηγορία" onChange={handleFormChange}
                                renderValue={(selected) => {
                                    if (!selected) { return <em>Επιλέξτε...</em>; }
                                    const category = expenseCategories.find(cat => cat.name === selected);
                                    if (!category) return selected;
                                    return (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <i className={category.icon} style={{ fontSize: '1.2em', width: '24px', textAlign: 'center' }}></i>
                                            {selected}
                                        </Box>
                                    );
                                }}
                            >
                                {expenseCategories.map(cat => (
                                    <MenuItem key={cat.name} value={cat.name}>
                                        <ListItemIcon><i className={cat.icon} style={{ fontSize: '1.2em', width: '24px', textAlign: 'center' }}></i></ListItemIcon>
                                        <ListItemText primary={cat.name} />
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}><TextField name="description" label="Περιγραφή" value={formData.description} onChange={handleFormChange} fullWidth size="small" /></Grid>
                    <Grid item xs={12}>
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            {isEditMode && <Button onClick={handleClearForm} variant="outlined" color="secondary" startIcon={<ClearIcon />}>Καθαρισμός</Button>}
                            <Button onClick={handleSave} variant="contained" disabled={isSaving}>{isSaving ? <CircularProgress size={24} /> : (isEditMode ? 'Ενημέρωση' : 'Αποθήκευση')}</Button>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            {feedback.message && <Alert severity={feedback.type} sx={{ mb: 2 }} onClose={() => setFeedback({ type: '', message: '' })}>{feedback.message}</Alert>}

            <Paper elevation={3} sx={{ p: 2, borderRadius: '12px', mb: 3 }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Χρονική Περίοδος</InputLabel>
                        <Select value={timeFilter} label="Χρονική Περίοδος" onChange={(e) => setTimeFilter(e.target.value)}>
                            <MenuItem value="all">Όλη η περίοδος</MenuItem>
                            <MenuItem value="3-months">Τελευταίο 3-μηνο</MenuItem>
                            <MenuItem value="6-months">Τελευταίο 6-μηνο</MenuItem>
                            <MenuItem value="custom">Προσαρμοσμένο Διάστημα</MenuItem>
                            <Divider />
                            {availableMonths.map(month => (<MenuItem key={month} value={month}>{dayjs(month).format('MMMM YYYY')}</MenuItem>))}
                        </Select>
                    </FormControl>
                    {timeFilter === 'custom' && (
                        <>
                            <TextField size="small" label="Από" type="date" value={customDateRange.start} onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))} InputLabelProps={{ shrink: true }} />
                            <TextField size="small" label="Έως" type="date" value={customDateRange.end} onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))} InputLabelProps={{ shrink: true }} />
                        </>
                    )}
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Κατηγορία Εξόδου</InputLabel>
                        <Select value={categoryFilter} label="Κατηγορία Εξόδου" onChange={(e) => setCategoryFilter(e.target.value)}>
                            <MenuItem value="all">Όλες οι Κατηγορίες</MenuItem>
                            {expenseCategories.map(cat => <MenuItem key={cat.name} value={cat.name}>{cat.name}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Έσοδα από Μαθητή</InputLabel>
                        <Select value={studentFilter} label="Έσοδα από Μαθητή" onChange={(e) => setStudentFilter(e.target.value)}>
                            <MenuItem value="all">Όλοι οι Μαθητές</MenuItem>
                            {allStudents.map(s => <MenuItem key={s.id} value={s.id}>{s.lastName} {s.firstName}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <Button onClick={handleClearFilters} startIcon={<ClearIcon />} sx={{ ml: 1 }}>Καθαρισμός</Button>
                    <Box sx={{ flexGrow: 1 }} />
                    <Button onClick={handleExportCSV} startIcon={<DownloadIcon />} variant="text">Εξαγωγή σε CSV</Button>
                </Box>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={4}><SummaryCard title="Σύνολο Εσόδων" value={totalFilteredIncome} icon={<TrendingUpIcon sx={{ color: '#fff' }} />} color="#4caf50" /></Grid>
                    <Grid item xs={12} md={4}><SummaryCard title="Σύνολο Εξόδων" value={totalFilteredExpenses} icon={<TrendingDownIcon sx={{ color: '#fff' }} />} color="#f44336" /></Grid>
                    <Grid item xs={12} md={4}><SummaryCard title="Αποτέλεσμα" value={profitLoss} icon={<EuroIcon sx={{ color: '#fff' }} />} color={profitLoss >= 0 ? "#2196f3" : "#ff9800"} /></Grid>
                </Grid>
                <Divider sx={{ my: 3 }} />
                <Grid container spacing={3}>
                    <Grid item xs={12} md={7}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Έσοδα vs Έξοδα ανά Μήνα</Typography>
                        <Plot data={incomeExpenseChartData} layout={barChartLayout} style={{ width: '100%', height: '300px' }} useResizeHandler />
                    </Grid>
                    {/* --- ΑΛΛΑΓΗ: Νέα διάταξη για το διάγραμμα και τη λίστα --- */}
                    <Grid item xs={12} md={5}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Ανάλυση Κατηγοριών Εξόδων</Typography>
                        {expensesByCategoryChart && expensesByCategoryChart.legendData.length > 0 ? (
                            <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} sm={7}>
                                    <Plot data={[expensesByCategoryChart.chartData]} layout={donutChartLayout} style={{ width: '100%', height: '300px' }} useResizeHandler />
                                </Grid>
                                <Grid item xs={12} sm={5}>
                                    <List dense>
                                        {expensesByCategoryChart.legendData.map((item) => (
                                            <ListItem key={item.label} disableGutters>
                                                <ListItemIcon sx={{ minWidth: '20px' }}>
                                                    <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: item.color }} />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={item.label}
                                                    secondary={`${item.value.toFixed(2)}€ (${item.percentage}%)`}
                                                    sx={{m:'0px'}}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                </Grid>
                            </Grid>
                        ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
                                <Typography color="text.secondary">Δεν υπάρχουν δεδομένα για αυτή την περίοδο.</Typography>
                            </Box>
                        )}
                    </Grid>
                </Grid>
            </Paper>

            <Box>
                {expensesGroupedByMonth.map(({ month, expenses, total }) => (
                    <Accordion key={month} defaultExpanded>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6" sx={{ flexGrow: 1 }}>{dayjs(month).format('MMMM YYYY')}</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead><TableRow><TableCell>Ημερομηνία</TableCell><TableCell>Κατηγορία</TableCell><TableCell>Περιγραφή</TableCell><TableCell align="right">Ποσό</TableCell><TableCell align="center">Ενέργειες</TableCell></TableRow></TableHead>
                                    <TableBody>
                                        {expenses.sort((a, b) => safeGetDate(b.date) - safeGetDate(a.date)).map(exp => (
                                            <TableRow key={exp.id} hover>
                                                <TableCell>{safeGetDate(exp.date)?.format('DD/MM/YYYY')}</TableCell>
                                                <TableCell><Chip icon={<i className={categoryIconMap[exp.category]} style={{ fontSize: '1em', color: '#fff', width: '16px', textAlign: 'center' }}></i>} label={exp.category} size="small" sx={{ backgroundColor: categoryColorMap[exp.category] || '#9e9e9e', color: '#fff' }} /></TableCell>
                                                <TableCell>{exp.description}</TableCell>
                                                <TableCell align="right">{(exp.amount || 0).toFixed(2)} €</TableCell>
                                                <TableCell align="center">
                                                    <IconButton size="small" onClick={() => handleEditClick(exp)}><EditIcon /></IconButton>
                                                    <IconButton size="small" onClick={() => setExpenseToDelete(exp)}><DeleteIcon /></IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                    <TableFooter>
                                        <TableRow>
                                            <TableCell colSpan={3} align="right" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Σύνολο Μήνα:</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{total.toFixed(2)} €</TableCell>
                                            <TableCell />
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            </TableContainer>
                        </AccordionDetails>
                    </Accordion>
                ))}
            </Box>

            <Dialog open={!!expenseToDelete} onClose={() => setExpenseToDelete(null)}>
                <DialogTitle>Επιβεβαίωση Διαγραφής</DialogTitle>
                <DialogContent><Typography>Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το έξοδο;</Typography></DialogContent>
                <DialogActions>
                    <Button onClick={() => setExpenseToDelete(null)}>Ακύρωση</Button>
                    <Button onClick={confirmDelete} color="error">Διαγραφή</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default Expenses;
