// src/pages/Expenses.jsx
import React, { useState, useMemo } from 'react';
import {
    Container, Paper, Typography, Button, Box, IconButton,
    Dialog, DialogActions, DialogContent, DialogTitle, TextField, CircularProgress, Alert,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Select, MenuItem, FormControl, InputLabel, Grid, Chip,
    Accordion, AccordionSummary, AccordionDetails, ListItemIcon, ListItemText, Divider
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, ReceiptLong as ReceiptIcon, ExpandMore as ExpandMoreIcon, Clear as ClearIcon } from '@mui/icons-material';
import { doc, setDoc, deleteDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import dayjs from 'dayjs';
import 'dayjs/locale/el';
import Plot from 'react-plotly.js';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.locale('el');
dayjs.extend(isBetween);

const expenseCategories = [
    { name: 'Ενοίκιο', icon: 'fas fa-house' },
    { name: 'Ρεύμα', icon: 'fas fa-bolt' },
    { name: 'Τηλέφωνο & Internet', icon: 'fas fa-phone' },
    { name: 'Ασφάλιση', icon: 'fas fa-shield-halved' },
    { name: 'Αναλώσιμα', icon: 'fas fa-cart-shopping' },
    { name: 'Νερό', icon: 'fas fa-tint' },
    { name: 'Λογιστής', icon: 'fas fa-calculator' },
    { name: 'Κοινόχρηστα', icon: 'fas fa-building-columns' },
    { name: 'Μισθοδοσία', icon: 'fas fa-money-check-dollar' },
    { name: 'Συντήρηση', icon: 'fas fa-wrench' },
    { name: 'Marketing', icon: 'fas fa-bullhorn' },
    { name: 'Άλλο', icon: 'fas fa-ellipsis' }
];

const safeGetDate = (dateField) => {
    if (dateField && typeof dateField.toDate === 'function') { return dayjs(dateField.toDate()); }
    if (dateField) { const d = dayjs(dateField); if (d.isValid()) { return d; } }
    return null;
};

const getInitialFormState = () => ({
    id: null,
    date: dayjs().format('YYYY-MM-DD'),
    category: '',
    amount: '',
    description: ''
});


function Expenses({ allExpenses, loading, db, appId }) {
    // --- ΑΛΛΑΓΗ: Η φόρμα είναι πλέον μέρος του κυρίως component ---
    const [formData, setFormData] = useState(getInitialFormState());
    const [expenseToDelete, setExpenseToDelete] = useState(null);
    const [feedback, setFeedback] = useState({ type: '', message: '' });
    const [timeFilter, setTimeFilter] = useState('all');
    const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });

    const isEditMode = Boolean(formData.id);

    React.useEffect(() => {
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
        if (!Array.isArray(allExpenses)) return [];
        const now = dayjs();

        if (timeFilter === 'all') return allExpenses;
        if (timeFilter === '3-months') {
            const threeMonthsAgo = now.subtract(3, 'month');
            return allExpenses.filter(exp => safeGetDate(exp.date)?.isAfter(threeMonthsAgo));
        }
        if (timeFilter === '6-months') {
            const sixMonthsAgo = now.subtract(6, 'month');
            return allExpenses.filter(exp => safeGetDate(exp.date)?.isAfter(sixMonthsAgo));
        }
        if (timeFilter === 'custom' && customDateRange.start && customDateRange.end) {
            const start = dayjs(customDateRange.start);
            const end = dayjs(customDateRange.end);
            return allExpenses.filter(exp => {
                const expenseDate = safeGetDate(exp.date);
                return expenseDate && expenseDate.isBetween(start, end, 'day', '[]');
            });
        }
        return allExpenses.filter(exp => safeGetDate(exp.date)?.format('YYYY-MM') === timeFilter);
    }, [allExpenses, timeFilter, customDateRange]);

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleEditClick = (expense) => {
        const expenseDate = safeGetDate(expense.date);
        setFormData({
            id: expense.id,
            date: expenseDate ? expenseDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
            category: expense.category || '',
            amount: expense.amount || '',
            description: expense.description || ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleClearForm = () => {
        setFormData(getInitialFormState());
    };

    const handleSave = async () => {
        if (!formData.category || !formData.amount || formData.amount <= 0) {
            setFeedback({ type: 'error', message: 'Παρακαλώ συμπληρώστε την κατηγορία και το ποσό.' });
            return;
        }
        try {
            const dataToSave = {
                date: dayjs(formData.date).toDate(),
                category: formData.category,
                amount: parseFloat(formData.amount),
                description: formData.description,
                updatedAt: serverTimestamp()
            };

            if (isEditMode) {
                const docRef = doc(db, `artifacts/${appId}/public/data/expenses`, formData.id);
                await setDoc(docRef, dataToSave, { merge: true });
            } else {
                dataToSave.createdAt = serverTimestamp();
                const collectionRef = collection(db, `artifacts/${appId}/public/data/expenses`);
                await addDoc(collectionRef, dataToSave);
            }
            setFeedback({ type: 'success', message: `Το έξοδο ${isEditMode ? 'ενημερώθηκε' : 'αποθηκεύτηκε'}.` });
            handleClearForm(); // Καθαρίζουμε τη φόρμα μετά την αποθήκευση
        } catch (error) {
            console.error("Error saving expense: ", error);
            setFeedback({ type: 'error', message: 'Σφάλμα κατά την αποθήκευση.' });
        }
    };

    const confirmDelete = async () => {
        if (!expenseToDelete) return;
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/expenses`, expenseToDelete.id));
            setFeedback({ type: 'success', message: 'Το έξοδο διαγράφηκε.' });
        } catch (error) {
            console.error("Error deleting expense: ", error);
            setFeedback({ type: 'error', message: 'Σφάλμα κατά τη διαγραφή.' });
        } finally {
            setExpenseToDelete(null);
        }
    };

    const expensesGroupedByMonth = useMemo(() => {
        const groups = filteredExpenses.reduce((acc, expense) => {
            const expenseDate = safeGetDate(expense.date);
            if (expenseDate) {
                const month = expenseDate.format('YYYY-MM');
                if (!acc[month]) { acc[month] = { expenses: [], total: 0 }; }
                acc[month].expenses.push(expense);
                acc[month].total += expense.amount;
            }
            return acc;
        }, {});
        return Object.entries(groups).map(([month, data]) => ({ month, ...data })).sort((a, b) => b.month.localeCompare(a.month));
    }, [filteredExpenses]);

    const expensesByMonthChart = useMemo(() => {
        const data = {};
        filteredExpenses.forEach(exp => {
            const expenseDate = safeGetDate(exp.date);
            if (expenseDate) {
                const month = expenseDate.format('YYYY-MM');
                if (!data[month]) data[month] = 0;
                data[month] += exp.amount;
            }
        });
        const sortedMonths = Object.keys(data).sort();
        return { x: sortedMonths.map(m => dayjs(m).format('MMM YYYY')), y: sortedMonths.map(m => data[m]), type: 'bar' };
    }, [filteredExpenses]);

    const expensesByCategoryChart = useMemo(() => {
        const data = filteredExpenses.reduce((acc, exp) => {
            const category = exp.category || 'Άλλο';
            if (!acc[category]) acc[category] = 0;
            acc[category] += exp.amount;
            return acc;
        }, {});
        return {
            labels: Object.keys(data),
            values: Object.values(data),
            type: 'pie',
            hole: .5,
            textposition: 'outside',
            texttemplate: "%{label}<br>%{value:,.2f}€ (%{percent})",
            automargin: true
        };
    }, [filteredExpenses]);

    const totalFilteredExpenses = useMemo(() => filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0), [filteredExpenses]);

    if (loading) {
        return <Container sx={{ mt: 4, textAlign: 'center' }}><CircularProgress /></Container>;
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: '12px', mb: 3 }}>
                <Typography variant="h4" component="h1" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    {isEditMode ? 'Επεξεργασία Εξόδου' : 'Καταχώρηση Νέου Εξόδου'}
                </Typography>
                <Grid container spacing={2} sx={{ pt: 2 }}>
                    <Grid item xs={12} sm={6} md={2}><TextField name="date" label="Ημερομηνία" type="date" value={formData.date} onChange={handleFormChange} fullWidth InputLabelProps={{ shrink: true }} size="small" /></Grid>
                    <Grid item xs={12} sm={6} md={2}><TextField name="amount" label="Ποσό (€)" type="number" value={formData.amount} onChange={handleFormChange} fullWidth size="small" /></Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Κατηγορία</InputLabel>
                            <Select name="category" value={formData.category} label="Κατηγορία" onChange={handleFormChange}>
                                {expenseCategories.map(cat => (
                                    <MenuItem key={cat.name} value={cat.name}>
                                        <ListItemIcon><i className={cat.icon} style={{ fontSize: '1.2em', width: '24px', textAlign: 'center' }}></i></ListItemIcon>
                                        <ListItemText primary={cat.name} />
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}><TextField name="description" label="Περιγραφή" value={formData.description} onChange={handleFormChange} fullWidth size="small" /></Grid>
                    <Grid item xs={12} md={2}>
                        <Box sx={{ display: 'flex', gap: 1, height: '100%' }}>
                            <Button onClick={handleSave} variant="contained" fullWidth>{isEditMode ? 'Ενημέρωση' : 'Αποθήκευση'}</Button>
                            {isEditMode && <IconButton onClick={handleClearForm}><ClearIcon /></IconButton>}
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            {feedback.message && <Alert severity={feedback.type} sx={{ mb: 2 }} onClose={() => setFeedback({ type: '', message: '' })}>{feedback.message}</Alert>}

            <Paper elevation={3} sx={{ p: 2, borderRadius: '12px', mb: 3 }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Χρονική Περίοδος</InputLabel>
                        <Select value={timeFilter} label="Χρονική Περίοδος" onChange={(e) => setTimeFilter(e.target.value)}>
                            <MenuItem value="all">Όλη η περίοδος</MenuItem>
                            <MenuItem value="3-months">Τελευταίο 3-μηνο</MenuItem>
                            <MenuItem value="6-months">Τελευταίο 6-μηνο</MenuItem>
                            <MenuItem value="custom">Προσαρμοσμένο Διάστημα</MenuItem>
                            <Divider />
                            {availableMonths.map(month => (
                                <MenuItem key={month} value={month}>{dayjs(month).format('MMMM YYYY')}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    {timeFilter === 'custom' && (
                        <>
                            <TextField size="small" label="Από" type="date" value={customDateRange.start} onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))} InputLabelProps={{ shrink: true }} />
                            <TextField size="small" label="Έως" type="date" value={customDateRange.end} onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))} InputLabelProps={{ shrink: true }} />
                        </>
                    )}
                </Box>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={7}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Έξοδα ανά Μήνα</Typography>
                        <Plot data={[expensesByMonthChart]} layout={{ autosize: true, margin: { l: 40, r: 20, b: 40, t: 20 } }} style={{ width: '100%', height: '300px' }} useResizeHandler />
                    </Grid>
                    <Grid item xs={12} md={5}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Ανάλυση Κατηγοριών</Typography>
                        {expensesByCategoryChart && expensesByCategoryChart.labels.length > 0 ? (
                            <Plot
                                data={[expensesByCategoryChart]}
                                layout={{
                                    autosize: true, showlegend: false, margin: { l: 40, r: 40, b: 40, t: 40 },
                                    annotations: [{ font: { size: 20 }, showarrow: false, text: `<b>${totalFilteredExpenses.toFixed(2)}€</b>`, x: 0.5, y: 0.5 }]
                                }}
                                style={{ width: '100%', height: '300px' }}
                                useResizeHandler
                            />
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
                            <Typography sx={{ color: 'text.secondary', alignSelf: 'center' }}>Σύνολο: {total.toFixed(2)} €</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead><TableRow><TableCell>Ημερομηνία</TableCell><TableCell>Κατηγορία</TableCell><TableCell>Περιγραφή</TableCell><TableCell align="right">Ποσό</TableCell><TableCell align="center">Ενέργειες</TableCell></TableRow></TableHead>
                                    <TableBody>
                                        {expenses.sort((a, b) => safeGetDate(b.date) - safeGetDate(a.date)).map(exp => (
                                            <TableRow key={exp.id} hover>
                                                <TableCell>{safeGetDate(exp.date).format('DD/MM/YYYY')}</TableCell>
                                                <TableCell>{exp.category}</TableCell>
                                                <TableCell>{exp.description}</TableCell>
                                                <TableCell align="right">{exp.amount.toFixed(2)} €</TableCell>
                                                <TableCell align="center">
                                                    <IconButton size="small" onClick={() => handleEditClick(exp)}><EditIcon /></IconButton>
                                                    <IconButton size="small" onClick={() => setExpenseToDelete(exp)}><DeleteIcon /></IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
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
