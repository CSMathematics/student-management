// src/pages/MaterialSelector.jsx
import React, { useState, useMemo } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItem,
    ListItemIcon, ListItemText, Checkbox, ListSubheader, Typography
} from '@mui/material';
import { InsertDriveFile as FileIcon } from '@mui/icons-material';

function MaterialSelector({ open, onClose, onAttach, classroomMaterials, courseMaterials, alreadyAttached = [] }) {
    const [selected, setSelected] = useState([]);

    const handleToggle = (value) => () => {
        const currentIndex = selected.findIndex(item => item.path === value.path);
        const newSelected = [...selected];

        if (currentIndex === -1) {
            newSelected.push(value);
        } else {
            newSelected.splice(currentIndex, 1);
        }

        setSelected(newSelected);
    };

    const handleAttach = () => {
        onAttach(selected);
        onClose();
        setSelected([]);
    };

    const isAttached = (material) => alreadyAttached.some(attached => attached.path === material.path);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Επιλογή Υλικού από τη Βιβλιοθήκη</DialogTitle>
            <DialogContent dividers>
                <List dense>
                    <ListSubheader>Υλικό Τμήματος</ListSubheader>
                    {classroomMaterials && classroomMaterials.length > 0 ? (
                        classroomMaterials.map(material => (
                            <ListItem key={material.path} button onClick={handleToggle(material)} disabled={isAttached(material)}>
                                <ListItemIcon>
                                    <Checkbox
                                        edge="start"
                                        checked={selected.some(item => item.path === material.path) || isAttached(material)}
                                        tabIndex={-1}
                                        disableRipple
                                    />
                                </ListItemIcon>
                                <ListItemText primary={material.name} />
                            </ListItem>
                        ))
                    ) : (
                        <ListItem><ListItemText primary="Δεν υπάρχει υλικό για αυτό το τμήμα." /></ListItem>
                    )}

                    <ListSubheader sx={{ mt: 2 }}>Γενικό Υλικό Μαθήματος</ListSubheader>
                    {courseMaterials && courseMaterials.length > 0 ? (
                        courseMaterials.map(material => (
                            <ListItem key={material.path} button onClick={handleToggle(material)} disabled={isAttached(material)}>
                                <ListItemIcon>
                                    <Checkbox
                                        edge="start"
                                        checked={selected.some(item => item.path === material.path) || isAttached(material)}
                                        tabIndex={-1}
                                        disableRipple
                                    />
                                </ListItemIcon>
                                <ListItemText primary={material.name} />
                            </ListItem>
                        ))
                    ) : (
                        <ListItem><ListItemText primary="Δεν υπάρχει γενικό υλικό για αυτό το μάθημα." /></ListItem>
                    )}
                </List>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Ακύρωση</Button>
                <Button onClick={handleAttach} variant="contained" disabled={selected.length === 0}>Επισύναψη</Button>
            </DialogActions>
        </Dialog>
    );
}

export default MaterialSelector;
