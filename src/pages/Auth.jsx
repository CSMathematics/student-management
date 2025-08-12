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
        <Container component="main" maxWidth="xs" sx={{ display: 'flex', alignItems: 'center', height: '100vh' }}>
            <Paper elevation={6} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', borderRadius: '12px' }}>
                <LockOutlined sx={{ fontSize: 40, mb: 1, color: 'primary.main' }} />
                <Typography component="h1" variant="h5">
                    {isLogin ? 'Σύνδεση' : 'Εγγραφή'}
                </Typography>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', width: '100%', mb: 2 }}>
                    <Tabs value={isLogin ? 0 : 1} onChange={() => setIsLogin(!isLogin)} centered>
                        <Tab label="Σύνδεση" />
                        <Tab label="Εγγραφή" />
                    </Tabs>
                </Box>
                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
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
                            />
                            <FormControl fullWidth margin="normal">
                                <InputLabel>Ρόλος</InputLabel>
                                <Select
                                    value={role}
                                    label="Ρόλος"
                                    onChange={(e) => setRole(e.target.value)}
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
                        sx={{ mt: 3, mb: 2 }}
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} /> : (isLogin ? 'Σύνδεση' : 'Δημιουργία Λογαριασμού')}
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}

export default AuthPage;
