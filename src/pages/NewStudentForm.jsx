// src/components/NewStudentForm.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
    Box, Button, Container, Grid, Paper, Typography, TextField,
    FormControl, InputLabel, Select, MenuItem, FormGroup, FormControlLabel,
    Switch, Checkbox, IconButton
} from '@mui/material';
import { Delete } from '@mui/icons-material'; // Import Delete icon

import { SUBJECTS_BY_GRADE_AND_CLASS, getSubjects, getSpecializations } from '../data/subjects.js'; // Import from new subjects.js

function NewStudentForm() {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        dob: '',
        studentPhone: '',
        address: '',
        email: '',
        parentName: '',
        parentPhones: [{ id: Date.now(), value: '' }],
        school: '',
        grade: '',
        specialization: '',
        department: '',
        mathematicsEnabled: false,
    });

    const [availableSpecializations, setAvailableSpecializations] = useState([]);
    const [currentSubjects, setCurrentSubjects] = useState([]);
    const [selectedSubjects, setSelectedSubjects] = useState([]);

    const mathematicsSwitchId = useMemo(() => `mathematics-switch-${Math.random().toString(36).substring(2, 9)}`, []);

    useEffect(() => {
        const specs = getSpecializations(formData.grade);
        setAvailableSpecializations(specs);

        if (specs.length > 0 && !specs.includes(formData.specialization)) {
            setFormData(prev => ({ ...prev, specialization: '' }));
            setCurrentSubjects([]);
            setSelectedSubjects([]);
        } else {
            const subjectsForSelection = getSubjects(formData.grade, formData.specialization);
            setCurrentSubjects(subjectsForSelection);
            setSelectedSubjects([]);
        }
    }, [formData.grade, formData.specialization]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleParentPhoneChange = (id, e) => {
        const newPhones = formData.parentPhones.map(phone =>
            phone.id === id ? { ...phone, value: e.target.value } : phone
        );
        setFormData(prev => ({ ...prev, parentPhones: newPhones }));
    };

    const addParentPhone = () => {
        setFormData(prev => ({ ...prev, parentPhones: [...prev.parentPhones, { id: Date.now(), value: '' }] }));
    };

    const removeParentPhone = (idToRemove) => {
        setFormData(prev => ({
            ...prev,
            parentPhones: prev.parentPhones.filter(phone => phone.id !== idToRemove)
        }));
    };

    const handleGradeChange = (e) => {
        const selectedGrade = e.target.value;
        setFormData(prev => ({
            ...prev,
            grade: selectedGrade,
            specialization: ''
        }));
    };

    const handleSubjectChange = (event) => {
        const { value, checked } = event.target;
        setSelectedSubjects(prevSelectedSubjects => {
            if (checked) {
                return [...prevSelectedSubjects, value];
            } else {
                return prevSelectedSubjects.filter(subject => subject !== value);
            }
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Form Data Submitted:', { ...formData, selectedSubjects });
        // In a real app, you would send this data to a backend or state management
        alert('Student data submitted! Check console for details.'); // Using alert for demo purposes
    };

    return (
        <Container maxWidth="md">
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
                {/* 👤 Student Info Section */}
                <Paper elevation={3} sx={{ padding: '20px', borderRadius: '12px', mb: 4 }}>
                    <Typography variant="h5" component="h3" sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: 3, color: '#3f51b5' }}>
                        <i className="fas fa-user"></i> Στοιχεία Μαθητή
                    </Typography>
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Όνομα"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleInputChange}
                                required
                                variant="outlined"
                                size="small"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Επώνυμο"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleInputChange}
                                required
                                variant="outlined"
                                size="small"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Ημερομηνία Εγγραφής"
                                name="dob"
                                type="date"
                                value={formData.dob}
                                onChange={handleInputChange}
                                required
                                variant="outlined"
                                size="small"
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Τηλέφωνο"
                                name="studentPhone"
                                value={formData.studentPhone}
                                onChange={handleInputChange}
                                variant="outlined"
                                size="small"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Διεύθυνση"
                                name="address"
                                value={formData.address}
                                onChange={handleInputChange}
                                variant="outlined"
                                size="small"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                variant="outlined"
                                size="small"
                            />
                        </Grid>
                    </Grid>
                </Paper>

                {/* 👨‍👩‍👧 Parent Info Section */}
                <Paper elevation={3} sx={{ padding: '20px', borderRadius: '12px', mb: 4 }}>
                    <Typography variant="h5" component="h3" sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: 3, color: '#3f51b5' }}>
                        <i className="fas fa-user-tie"></i> Στοιχεία Γονέα
                    </Typography>
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Ονοματεπώνυμο Γονέα"
                                name="parentName"
                                value={formData.parentName}
                                onChange={handleInputChange}
                                variant="outlined"
                                size="small"
                                sx={{ mb: 2 }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Typography variant="subtitle1" sx={{ mb: 1 }}>Τηλέφωνα Γονέα:</Typography>
                            {formData.parentPhones.map((phoneEntry) => (
                                <Box key={phoneEntry.id} sx={{ display: 'flex', gap: '10px', mb: 1, alignItems: 'center' }}>
                                    <TextField
                                        fullWidth
                                        label={`Τηλέφωνο ${formData.parentPhones.indexOf(phoneEntry) + 1}`}
                                        value={phoneEntry.value}
                                        onChange={(e) => handleParentPhoneChange(phoneEntry.id, e)}
                                        variant="outlined"
                                        size="small"
                                    />
                                    {formData.parentPhones.length > 1 && (
                                        <IconButton
                                            color="error"
                                            onClick={() => removeParentPhone(phoneEntry.id)}
                                            size="small"
                                            aria-label="delete phone"
                                        >
                                            <Delete /> {/* Using Material UI Icon */}
                                        </IconButton>
                                    )}
                                </Box>
                            ))}
                            <Button
                                variant="outlined"
                                color="primary"
                                onClick={addParentPhone}
                                sx={{ borderRadius: '8px', mt: 1 }}
                            >
                                <i className="fas fa-plus" style={{ marginRight: '8px' }}></i> Προσθήκη Τηλεφώνου
                            </Button>
                        </Grid>
                    </Grid>
                </Paper>

                {/* 📚 Academic Info Section */}
                <Paper elevation={3} sx={{ padding: '20px', borderRadius: '12px', mb: 4 }}>
                    <Typography variant="h5" component="h3" sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: 3, color: '#3f51b5' }}>
                        <i className="fas fa-school"></i> Ακαδημαϊκά
                    </Typography>
                    <Grid container spacing={3}>
                        {/* Left Column for Grade, Specialization, Department */}
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth variant="outlined" size="small" sx={{ mb: 3 }}>
                                <InputLabel id="grade-select-label">Τάξη</InputLabel>
                                <Select
                                    labelId="grade-select-label"
                                    id="gradeSelect"
                                    name="grade"
                                    value={formData.grade}
                                    onChange={handleGradeChange}
                                    label="Τάξη"
                                    required
                                >
                                    <MenuItem value="">-- Επιλέξτε Τάξη --</MenuItem>
                                    {Object.keys(SUBJECTS_BY_GRADE_AND_CLASS).map(gradeOption => (
                                        <MenuItem key={gradeOption} value={gradeOption}>{gradeOption}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            {availableSpecializations.length > 0 && (
                                <FormControl fullWidth variant="outlined" size="small" sx={{ mb: 3 }}>
                                    <InputLabel id="specialization-select-label">Κατεύθυνση</InputLabel>
                                    <Select
                                        labelId="specialization-select-label"
                                        id="specializationSelect"
                                        name="specialization"
                                        value={formData.specialization}
                                        onChange={handleInputChange}
                                        label="Κατεύθυνση"
                                        required={availableSpecializations.length > 0}
                                    >
                                        <MenuItem value="">-- Επιλέξτε Κατεύθυνση --</MenuItem>
                                        {availableSpecializations.map(spec => (
                                            <MenuItem key={spec} value={spec}>{spec}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            )}

                            <TextField
                                fullWidth
                                label="Τμήμα"
                                name="department"
                                value={formData.department}
                                onChange={handleInputChange}
                                variant="outlined"
                                size="small"
                                sx={{ mb: 3 }}
                            />
                        </Grid>

                        {/* Right Column for Subjects */}
                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle1" sx={{ mb: 1 }}>📘 Μαθήματα:</Typography>
                            <Paper variant="outlined" sx={{ padding: '15px', borderRadius: '8px', backgroundColor: '#f9f9f9', minHeight: '200px' }}>
                                {currentSubjects.length > 0 ? (
                                    <FormGroup>
                                        {currentSubjects.map((subject, idx) => (
                                            <FormControlLabel
                                                key={idx}
                                                control={
                                                    <Checkbox
                                                        checked={selectedSubjects.includes(subject)}
                                                        onChange={handleSubjectChange}
                                                        value={subject}
                                                    />
                                                }
                                                label={subject}
                                            />
                                        ))}
                                    </FormGroup>
                                ) : (
                                    <Typography variant="body2" sx={{ color: '#757575' }}>
                                        Τα μαθήματα θα εμφανιστούν αυτόματα με βάση την τάξη και την κατεύθυνση.
                                    </Typography>
                                )}
                            </Paper>
                        </Grid>

                        <Grid item xs={12} key={mathematicsSwitchId}>
                            <FormGroup>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={formData.mathematicsEnabled}
                                            onChange={handleInputChange}
                                            name="mathematicsEnabled"
                                            id={mathematicsSwitchId}
                                        />
                                    }
                                    label="Mathematics"
                                />
                            </FormGroup>
                        </Grid>
                    </Grid>
                </Paper>

                {/* 💶 Financial Info Section */}
                <Paper elevation={3} sx={{ padding: '20px', borderRadius: '12px', mb: 4 }}>
                    <Typography variant="h5" component="h3" sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: 3, color: '#3f51b5' }}>
                        <i className="fas fa-euro-sign"></i> Οικονομικά
                    </Typography>
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Δίδακτρα (€)"
                                name="payment"
                                type="number"
                                value={formData.payment}
                                onChange={handleInputChange}
                                variant="outlined"
                                size="small"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Έκπτωση (%)"
                                name="debt"
                                type="number"
                                value={formData.debt}
                                onChange={handleInputChange}
                                variant="outlined"
                                size="small"
                            />
                        </Grid>
                    </Grid>
                </Paper>

                {/* Submit Button */}
                <Box sx={{ mt: 3, textAlign: 'right' }}>
                    <Button type="submit" variant="contained" color="primary" sx={{ borderRadius: '8px', padding: '10px 20px' }}>
                        <i className="fas fa-save" style={{ marginRight: '8px' }}></i> Αποθήκευση Μαθητή
                    </Button>
                </Box>
            </Box>
        </Container>
    );
}

export default NewStudentForm;
