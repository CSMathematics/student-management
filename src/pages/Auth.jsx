// src/pages/Auth.jsx
import { React, useState } from 'react';
import { 
    Container, Paper, Box, Typography, TextField, Button, 
    CircularProgress, Alert, Tabs, Tab, FormControl, InputLabel, Select, MenuItem, Grid
} from '@mui/material';
import { LockOutlined } from '@mui/icons-material';

function AuthPage({ handleSignUp, handleLogin, loading, error }) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('student');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isLogin) {
            handleLogin(email, password);
        } else {
            if (password !== confirmPassword) {
                alert("Οι κωδικοί δεν ταιριάζουν!");
                return;
            }
            handleSignUp(email, password, role, firstName, lastName);
        }
    };
    
    const textFieldStyles = {
        '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: 'rgba(0, 0, 0, 0.23)' },
        },
    };

    return (
        <Grid container component="main" sx={{ height: '100vh' }}>
            {/* --- ΕΝΗΜΕΡΩΜΕΝΟ ΠΑΝΕΛ ΕΙΚΟΝΑΣ & ΛΟΓΟΤΥΠΟΥ --- */}
            <Grid 
                item 
                xs={false} 
                sm={4} 
                md={7} 
                sx={{
                    position: 'relative',
                    overflow: 'hidden',
                    display: { xs: 'none', sm: 'flex' },
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(45deg, #1e97ddff 30%, #93c4e0ff 90%)',
                    color: '#fff',
                }}
            >
                {/* --- ΝΕΑ ΠΡΟΣΘΗΚΗ: Αφηρημένα σχήματα στο φόντο --- */}
                <Box sx={{ position: 'absolute', top: -50, left: -80, width: 200, height: 200, bgcolor: 'rgba(255, 255, 255, 0.08)', borderRadius: '50%', zIndex: 1 }} />
                <Box sx={{ position: 'absolute', bottom: 40, left: 20, width: 80, height: 80, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: '50%', zIndex: 1 }} />
                <Box sx={{ position: 'absolute', top: '20%', right: 50, width: 60, height: 60, border: '2px solid rgba(255, 255, 255, 0.1)', borderRadius: '50%', zIndex: 1 }} />
                <Box sx={{ position: 'absolute', bottom: -150, right: -150, width: 400, height: 400, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: '50%', zIndex: 1 }} />
                
                {/* --- ΝΕΑ ΠΡΟΣΘΗΚΗ: Διάφανο πλαίσιο με blur --- */}
                <Box sx={{
                    zIndex: 2,
                    p: 5,
                    borderRadius: '20px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)', // Αυτό δημιουργεί το εφέ θολού γυαλιού
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    textAlign: 'center',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)'
                }}>
                    <img 
                        src="../public/Logo_full.svg" 
                        alt="Φιλομάθεια Λογότυπο" 
                        style={{ maxWidth: '450px', marginBottom: '2rem' }} 
                    />
                    <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
                        Καλώς ορίσατε!
                    </Typography>
                    <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.8)'}}>
                        Η πλατφόρμα διαχείρισης για τη σύγχρονη εκπαίδευση.
                    </Typography>
                </Box>
            </Grid>
            
            <Grid 
                item 
                xs={12} 
                sm={8} 
                md={5} 
                component={Paper} 
                elevation={6} 
                square 
                sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                }}
            >
                <Box
                    sx={{
                        my: 8,
                        mx: 4,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        width: '100%',
                        maxWidth: '400px',
                    }}
                >
                    <LockOutlined sx={{ fontSize: 40, mb: 1, color: 'primary.main' }} />
                    <Typography component="h1" variant="h5">
                        {isLogin ? 'Σύνδεση' : 'Εγγραφή'}
                    </Typography>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', width: '100%', mb: 2 }}>
                        <Tabs 
                            value={isLogin ? 0 : 1} 
                            onChange={() => setIsLogin(!isLogin)} 
                            centered
                        >
                            <Tab label="Σύνδεση" />
                            <Tab label="Εγγραφή" />
                        </Tabs>
                    </Box>
                    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
                        {!isLogin && (
                             <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <TextField margin="normal" required fullWidth id="firstName" label="Όνομα" name="firstName" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} sx={textFieldStyles} />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                     <TextField margin="normal" required fullWidth id="lastName" label="Επώνυμο" name="lastName" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} sx={textFieldStyles} />
                                </Grid>
                            </Grid>
                        )}
                        <TextField margin="normal" required fullWidth id="email" label="Διεύθυνση Email" name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} sx={textFieldStyles} />
                        <TextField margin="normal" required fullWidth name="password" label="Κωδικός Πρόσβασης" type="password" id="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} sx={textFieldStyles} />
                        {!isLogin && (
                            <>
                                <TextField margin="normal" required fullWidth name="confirmPassword" label="Επιβεβαίωση Κωδικού" type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} sx={textFieldStyles} />
                                <FormControl fullWidth margin="normal" sx={textFieldStyles}>
                                    <InputLabel>Ρόλος</InputLabel>
                                    <Select value={role} label="Ρόλος" onChange={(e) => setRole(e.target.value)}>
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
                            {loading ? <CircularProgress size={24} color="inherit" /> : (isLogin ? 'Σύνδεση' : 'Δημιουργία Λογαριασμού')}
                        </Button>
                    </Box>
                </Box>
            </Grid>
        </Grid>
    );
}

export default AuthPage;
