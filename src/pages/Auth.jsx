// src/pages/Auth.jsx
import React, { useState } from 'react';
import { 
    Container, Paper, Box, Typography, TextField, Button, 
    CircularProgress, Alert, Tabs, Tab, FormControl, InputLabel, Select, MenuItem 
} from '@mui/material';
import { LockOutlined } from '@mui/icons-material';

function AuthPage({ handleSignUp, handleLogin, loading, error }) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('student');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isLogin) {
            handleLogin(email, password);
        } else {
            if (password !== confirmPassword) {
                // You might want to set a specific error for this
                alert("Passwords don't match!");
                return;
            }
            handleSignUp(email, password, role);
        }
    };

    return (
        <Container 
            component="main" 
            maxWidth={false} // Allow container to fill the screen
            sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                minHeight: '100vh',
                // --- ΑΛΛΑΓΗ: Προσθήκη gradient background ---
                background: 'linear-gradient(45deg, #1e88e5 30%, #931ca3ff 70%)',
                p: 0 // Remove padding to ensure full bleed
            }}
        >
            <Paper 
                elevation={6} 
                sx={{ 
                    p: 4, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    width: '100%',
                    maxWidth: '400px', // Set a max width for the card
                    borderRadius: '16px',
                    // --- ΑΛΛΑΓΗ: Εφέ διαφάνειας και blur ---
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#fff' // Αλλάζουμε το χρώμα του κειμένου σε λευκό για αντίθεση
                }}
            >
                <LockOutlined sx={{ fontSize: 40, mb: 1, color: '#fff' }} />
                <Typography component="h1" variant="h5">
                    {isLogin ? 'Σύνδεση' : 'Εγγραφή'}
                </Typography>
                <Box sx={{ borderBottom: 1, borderColor: 'rgba(255, 255, 255, 0.3)', width: '100%', mb: 2 }}>
                    <Tabs 
                        value={isLogin ? 0 : 1} 
                        onChange={() => setIsLogin(!isLogin)} 
                        centered
                        textColor="inherit" // Κληρονομεί το λευκό χρώμα
                        TabIndicatorProps={{ style: { backgroundColor: '#fff' } }} // Λευκός δείκτης
                    >
                        <Tab label="Σύνδεση" />
                        <Tab label="Εγγραφή" />
                    </Tabs>
                </Box>
                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
                    {/* --- ΑΛΛΑΓΗ: Styling στα TextFields για να ταιριάζουν με το νέο design --- */}
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="email"
                        label="Διεύθυνση Email"
                        name="email"
                        autoComplete="email"
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        variant="outlined"
                        InputLabelProps={{ style: { color: '#fff' } }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                                '&:hover fieldset': { borderColor: '#fff' },
                                '&.Mui-focused fieldset': { borderColor: '#fff' },
                            },
                            input: { color: '#fff' }
                        }}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Κωδικός Πρόσβασης"
                        type="password"
                        id="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        variant="outlined"
                        InputLabelProps={{ style: { color: '#fff' } }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                                '&:hover fieldset': { borderColor: '#fff' },
                                '&.Mui-focused fieldset': { borderColor: '#fff' },
                            },
                            input: { color: '#fff' }
                        }}
                    />
                    {!isLogin && (
                        <>
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                name="confirmPassword"
                                label="Επιβεβαίωση Κωδικού"
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                variant="outlined"
                                InputLabelProps={{ style: { color: '#fff' } }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                                        '&:hover fieldset': { borderColor: '#fff' },
                                        '&.Mui-focused fieldset': { borderColor: '#fff' },
                                    },
                                    input: { color: '#fff' }
                                }}
                            />
                            <FormControl fullWidth margin="normal" variant="outlined" sx={{
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                                    '&:hover fieldset': { borderColor: '#fff' },
                                    '&.Mui-focused fieldset': { borderColor: '#fff' },
                                },
                                '& .MuiSelect-icon': { color: '#fff' }
                            }}>
                                <InputLabel sx={{ color: '#fff' }}>Ρόλος</InputLabel>
                                <Select
                                    value={role}
                                    label="Ρόλος"
                                    onChange={(e) => setRole(e.target.value)}
                                    sx={{ color: '#fff' }}
                                >
                                    <MenuItem value="student">Μαθητής</MenuItem>
                                    <MenuItem value="teacher">Καθηγητής</MenuItem>
                                    <MenuItem value="parent">Γονέας</MenuItem>
                                </Select>
                            </FormControl>
                        </>
                    )}
                    {error && <Alert severity="error" sx={{ mt: 2, width: '100%' }}>{error}</Alert>}
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ 
                            mt: 3, 
                            mb: 2, 
                            backgroundColor: 'rgba(255, 255, 255, 0.3)',
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.5)'
                            }
                        }}
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : (isLogin ? 'Σύνδεση' : 'Δημιουργία Λογαριασμού')}
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}

export default AuthPage;
