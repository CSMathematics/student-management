// src/pages/Auth.jsx
import { React, useState } from 'react';
// --- 1. ΕΙΣΑΓΩΓΗ του useForm ---
import { useForm, Controller } from 'react-hook-form';
import { 
    Container, Paper, Box, Typography, TextField, Button, 
    CircularProgress, Alert, Tabs, Tab, FormControl, InputLabel, Select, MenuItem, Grid
} from '@mui/material';
import { LockOutlined } from '@mui/icons-material';

function AuthPage({ handleSignUp, handleLogin, loading, error }) {
    const [isLogin, setIsLogin] = useState(true);

    // --- 2. ΑΡΧΙΚΟΠΟΙΗΣΗ του React Hook Form ---
    // Αφαιρούμε όλα τα παλιά useState για τα πεδία της φόρμας.
    const { register, handleSubmit, watch, control, formState: { errors } } = useForm({
        mode: "onTouched" // Η επικύρωση θα τρέχει όταν ο χρήστης φεύγει από ένα πεδίο
    });

    // Παρακολουθούμε την τιμή του πεδίου 'password' για να την ελέγξουμε στην επιβεβαίωση
    const password = watch('password');

    // --- 3. Η ΝΕΑ ΣΥΝΑΡΤΗΣΗ ΥΠΟΒΟΛΗΣ ---
    // Λαμβάνει τα δεδομένα της φόρμας ως ένα αντικείμενο 'data'.
    const onSubmit = (data) => {
        if (isLogin) {
            handleLogin(data.email, data.password);
        } else {
            handleSignUp(data.email, data.password, data.role, data.firstName, data.lastName);
        }
    };
    
    const textFieldStyles = {
        '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: 'rgba(0, 0, 0, 0.23)' },
        },
    };

    return (
        <Grid container component="main" sx={{ height: '100vh' }}>
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
                <Box sx={{ position: 'absolute', top: -70, left: -70, width: 400, height: 400, bgcolor: 'rgba(255, 255, 255, 0.08)', borderRadius: '50%', zIndex: 1 }} />
                <Box sx={{ position: 'absolute', bottom: 40, left: 20, width: 80, height: 80, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: '50%', zIndex: 1 }} />
                <Box sx={{ position: 'absolute', top: '20%', right: -50, width: 100, height: 100, bgcolor: 'rgba(255, 255, 255, 0.1)', borderRadius: '50%', zIndex: 1 }} />
                <Box sx={{ position: 'absolute', bottom: -150, right: -150, width: 400, height: 400, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: '50%', zIndex: 1 }} />
                
                <Box sx={{
                    zIndex: 2,
                    p: 5,
                    borderRadius: '20px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
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
                    <img src="../public/Logo_fullΒ.svg" alt="Φιλομάθεια Λογότυπο" style={{marginBottom : '30px',maxWidth:'350px'}}/>
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
                    {/* --- 4. ΧΡΗΣΗ του handleSubmit --- */}
                    <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 1, width: '100%' }}>
                        {!isLogin && (
                             <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    {/* --- 5. ΕΓΓΡΑΦΗ ΠΕΔΙΩΝ & ΕΜΦΑΝΙΣΗ ΣΦΑΛΜΑΤΩΝ --- */}
                                    <TextField 
                                        margin="normal" 
                                        required 
                                        fullWidth 
                                        label="Όνομα" 
                                        autoComplete="given-name" 
                                        sx={textFieldStyles}
                                        {...register("firstName", { required: "Το όνομα είναι υποχρεωτικό" })}
                                        error={!!errors.firstName}
                                        helperText={errors.firstName?.message}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                     <TextField 
                                        margin="normal" 
                                        required 
                                        fullWidth 
                                        label="Επώνυμο" 
                                        autoComplete="family-name" 
                                        sx={textFieldStyles}
                                        {...register("lastName", { required: "Το επώνυμο είναι υποχρεωτικό" })}
                                        error={!!errors.lastName}
                                        helperText={errors.lastName?.message}
                                     />
                                </Grid>
                            </Grid>
                        )}
                        <TextField 
                            margin="normal" 
                            required 
                            fullWidth 
                            label="Διεύθυνση Email" 
                            autoComplete="email" 
                            sx={textFieldStyles}
                            {...register("email", { 
                                required: "Το email είναι υποχρεωτικό",
                                pattern: {
                                    value: /^\S+@\S+$/i,
                                    message: "Μη έγκυρη διεύθυνση email"
                                }
                            })}
                            error={!!errors.email}
                            helperText={errors.email?.message}
                        />
                        <TextField 
                            margin="normal" 
                            required 
                            fullWidth 
                            label="Κωδικός Πρόσβασης" 
                            type="password" 
                            autoComplete="current-password" 
                            sx={textFieldStyles}
                            {...register("password", { 
                                required: "Ο κωδικός είναι υποχρεωτικός",
                                minLength: {
                                    value: 6,
                                    message: "Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες"
                                }
                            })}
                            error={!!errors.password}
                            helperText={errors.password?.message}
                        />
                        {!isLogin && (
                            <>
                                <TextField 
                                    margin="normal" 
                                    required 
                                    fullWidth 
                                    label="Επιβεβαίωση Κωδικού" 
                                    type="password" 
                                    sx={textFieldStyles}
                                    {...register("confirmPassword", { 
                                        required: "Η επιβεβαίωση κωδικού είναι υποχρεωτική",
                                        validate: value => value === password || "Οι κωδικοί δεν ταιριάζουν"
                                    })}
                                    error={!!errors.confirmPassword}
                                    helperText={errors.confirmPassword?.message}
                                />
                                {/* --- 6. ΧΡΗΣΗ του Controller για το Select του Material-UI --- */}
                                <Controller
                                    name="role"
                                    control={control}
                                    defaultValue="student"
                                    render={({ field }) => (
                                        <FormControl fullWidth margin="normal" sx={textFieldStyles}>
                                            <InputLabel>Ρόλος</InputLabel>
                                            <Select {...field} label="Ρόλος">
                                                <MenuItem value="student">Μαθητής</MenuItem>
                                                <MenuItem value="teacher">Καθηγητής</MenuItem>
                                                <MenuItem value="parent">Γονέας</MenuItem>
                                            </Select>
                                        </FormControl>
                                    )}
                                />
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
