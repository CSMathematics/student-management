// src/components/ClassroomDetailsForm.jsx
import React from 'react';
import {
    Box, Grid, Paper, Typography, TextField,
    FormControl, InputLabel, Select, MenuItem // <--- ADDED THESE IMPORTS
} from '@mui/material';

import { SUBJECTS_BY_GRADE_AND_CLASS } from '../data/subjects.js';

function ClassroomDetailsForm({
    formData,
    setFormData,
    availableSpecializations,
    currentSubjects,
    selectedColor,
    setSelectedColor,
    classroomToEdit // Passed for title display
}) {

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleGradeChange = (e) => {
        const selectedGrade = e.target.value;
        setFormData(prev => ({
            ...prev,
            grade: selectedGrade,
            specialization: '' // Reset specialization when grade changes
        }));
    };

    const handleSubjectChange = (e) => {
        const { value } = e.target;
        setFormData(prev => ({
            ...prev,
            subject: value
        }));
    };

    return (
        <Paper elevation={3} sx={{ padding: '20px', borderRadius: '12px', mb: 4 }}>
            <Typography variant="h5" component="h3" sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: 3, color: '#3f51b5' }}>
                <i className="fas fa-plus-circle"></i> {classroomToEdit ? 'Επεξεργασία Τμήματος' : 'Δημιουργία Νέου Τμήματος'}
            </Typography>
            <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                    <FormControl fullWidth variant="outlined" size="small" required>
                        <InputLabel id="grade-select-label">Τάξη</InputLabel>
                        <Select
                            labelId="grade-select-label"
                            name="grade"
                            value={formData.grade}
                            onChange={handleGradeChange}
                            label="Τάξη"
                        >
                            <MenuItem value="">-- Επιλέξτε Τάξη --</MenuItem>
                            {Object.keys(SUBJECTS_BY_GRADE_AND_CLASS).map(gradeOption => (
                                <MenuItem key={gradeOption} value={gradeOption}>{gradeOption}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                    {availableSpecializations.length > 0 && (
                        <FormControl fullWidth variant="outlined" size="small">
                            <InputLabel id="specialization-select-label">Κατεύθυνση</InputLabel>
                            <Select
                                labelId="specialization-select-label"
                                name="specialization"
                                value={formData.specialization}
                                onChange={handleInputChange}
                                label="Κατεύθυνση"
                            >
                                <MenuItem value="">-- Επιλέξτε Κατεύθυνση --</MenuItem>
                                {availableSpecializations.map(spec => (
                                    <MenuItem key={spec} value={spec}>{spec}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                </Grid>
                <Grid item xs={12} sm={6}>
                    <FormControl fullWidth variant="outlined" size="small" required>
                        <InputLabel id="subject-select-label">Μάθημα</InputLabel>
                        <Select
                            labelId="subject-select-label"
                            name="subject"
                            value={formData.subject}
                            onChange={handleSubjectChange}
                            label="Μάθημα"
                        >
                            <MenuItem value="">-- Επιλέξτε Μάθημα --</MenuItem>
                            {currentSubjects.map(subjectOption => (
                                <MenuItem key={subjectOption} value={subjectOption}>{subjectOption}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth
                        label="Μέγιστος Αριθμός Μαθητών"
                        name="maxStudents"
                        type="number"
                        value={formData.maxStudents}
                        onChange={handleInputChange}
                        variant="outlined"
                        size="small"
                        inputProps={{ min: 1 }}
                        required
                    />
                </Grid>
                {/* Color Picker for the classroom schedule */}
                <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                            Επιλογή Χρώματος Προγράμματος:
                        </Typography>
                        <input
                            type="color"
                            value={selectedColor}
                            onChange={(e) => setSelectedColor(e.target.value)}
                            style={{ width: '50px', height: '30px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                        />
                    </Box>
                </Grid>
            </Grid>
        </Paper>
    );
}

export default ClassroomDetailsForm;
