// src/components/Sidebar.jsx
import React, { useState } from 'react';
import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Typography, Collapse } from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';

function Sidebar({ navigateTo, currentPage }) {
    const [openClassesSubmenu, setOpenClassesSubmenu] = useState(false);
    const [openStudentsSubmenu, setOpenStudentsSubmenu] = useState(false);

    const handleClickClassesSubmenu = () => {
        setOpenClassesSubmenu(!openClassesSubmenu);
    };

    const handleClickStudentsSubmenu = () => {
        setOpenStudentsSubmenu(!openStudentsSubmenu);
    };

    const navItems = [
        { text: "Αρχική", icon: "fas fa-chart-line", page: "dashboard" },
        { text: "Πρόγραμμα", icon: "fas fa-calendar-alt", href: "weeklySchedule" },
    ];

    const managementItems = [
        {
            text: "Μαθητές",
            icon: "fas fa-user",
            isParent: true,
            subItems: [
                { text: "Νέος μαθητής", icon: "fas fa-user-plus", page: "newStudent" },
                { text: "Καρτέλες μαθητών", icon: "fas fa-users", page: "studentsList" },
            ]
        },
        {
            text: "Τάξεις - Τμήματα",
            icon: "fas fa-chalkboard",
            isParent: true,
            subItems: [
                { text: "Τάξεις", icon: "fas fa-layer-group", href: "#" },
                { text: "Τμήματα", icon: "fas fa-door-open", page: "classroomsList" },
                { text: "Νέο Τμήμα", icon: "fas fa-plus", page: "newClassroom" }, // New sub-item for NewClassroomForm
            ]
        },
        { text: "Μαθήματα", icon: "fas fa-book", href: "#" },
        { text: "Καθηγητές", icon: "fas fa-user-graduate", href: "#" },
        { text: "Διαγωνίσματα", icon: "fas fa-file-alt", href: "#" },
        { text: "Τηλεφωνικός κατάλογος", icon: "fas fa-phone", href: "#" },
        { text: "Πληρωμές", icon: "fas fa-money-bill", href: "#" },
        { text: "Βαθμολογίες", icon: "fas fa-chart-bar", href: "#" },
        { text: "Απουσίες", icon: "fas fa-times", href: "#" },
        { text: "Εργασίες υποχρεώσεις", icon: "fas fa-tasks", href: "#" },
        { text: "Έγγραφα", icon: "fas fa-file", href: "#" },
        { text: "Apprenticeships & Thesis", icon: "fas fa-briefcase", href: "#" },
        { text: "Transportation", icon: "fas fa-bus", href: "#" },
    ];

    const settingsItems = [
        { text: "Βασικές Ρυθμίσεις", icon: "fas fa-cog", href: "#" },
        { text: "Ρυθμίσεις μαθητών", icon: "fas fa-cogs", href: "#" },
        { text: "Εμφάνιση", icon: "fas fa-sliders-h", href: "#" },
        { text: "Πληρωμές", icon: "fas fa-wallet", href: "#" },
        { text: "Library Settings", icon: "fas fa-university", href: "#" },
        { text: "Apprenticeships / Thesis", icon: "fas fa-briefcase", href: "#" },
    ];

    const isItemSelected = (itemPage) => {
        return itemPage === currentPage;
    };

    const renderListItemButton = (item, isSubItem = false) => {
        const commonProps = {
            onClick: item.isParent
                ? (item.text === "Μαθητές" ? handleClickStudentsSubmenu : handleClickClassesSubmenu)
                : () => navigateTo(item.page || item.href),
            selected: isItemSelected(item.page),
            sx: {
                padding: `10px ${isSubItem ? '32px' : '16px'} !important`,
                transition: 'all 0.3s ease',
                justifyContent: 'flex-start',
                gap: '8px',
                borderLeft: '5px solid transparent',
                '&:hover': {
                    color: '#1e86cc',
                    backgroundColor: 'transparent',
                    borderLeft: '5px solid #1e86cc',
                    paddingLeft: `${isSubItem ? '38px' : '24px'} !important`,
                },
                '&.Mui-selected': {
                    backgroundColor: '#eef6fb !important',
                    color: '#1e86cc !important',
                    fontWeight: 'bold',
                    borderLeft: '5px solid #1e86cc !important',
                    paddingLeft: `${isSubItem ? '38px' : '24px'} !important`,
                },
                '&.Mui-selected .MuiListItemIcon-root': {
                    color: '#1e86cc !important',
                },
            }
        };

        if (item.page || item.isParent) {
            return (
                <ListItemButton component="a" href={item.isParent ? "#" : item.href || "#"} {...commonProps}>
                    <ListItemIcon>
                        <i className={item.icon}></i>
                    </ListItemIcon>
                    <ListItemText primary={item.text} />
                    {item.isParent && (
                        item.text === "Μαθητές" ? (openStudentsSubmenu ? <ExpandLess /> : <ExpandMore />) :
                        (openClassesSubmenu ? <ExpandLess /> : <ExpandMore />)
                    )}
                </ListItemButton>
            );
        } else {
            return (
                <ListItemButton {...commonProps}>
                    <ListItemIcon>
                        <i className={item.icon}></i>
                    </ListItemIcon>
                    <ListItemText primary={item.text} />
                </ListItemButton>
            );
        }
    };

    return (
        <Box className="fixed-sidebar">
            <Box className="sidebar-header" sx={{ backgroundColor: '#1e86cc' }}>
                <h2><i className="fas fa-graduation-cap"></i> Φροντιστήριο Φιλομάθεια</h2>
            </Box>
            <List>
                {navItems.map((item, index) => (
                    <ListItem key={index} disablePadding>
                        {renderListItemButton(item)}
                    </ListItem>
                ))}
            </List>
            <Divider />
            <Typography className="sidebar-section-title">Διαχείρηση</Typography>
            <List>
                {managementItems.map((item, index) => (
                    <React.Fragment key={index}>
                        {item.isParent ? (
                            <>
                                <ListItem disablePadding>
                                    {renderListItemButton(item)}
                                </ListItem>
                                <Collapse in={item.text === "Μαθητές" ? openStudentsSubmenu : openClassesSubmenu} timeout="auto" unmountOnExit>
                                    <List component="div" disablePadding>
                                        {item.subItems.map((subItem, subIndex) => (
                                            <ListItem key={subIndex} disablePadding>
                                                {renderListItemButton(subItem, true)}
                                            </ListItem>
                                        ))}
                                    </List>
                                </Collapse>
                            </>
                        ) : (
                            <ListItem disablePadding>
                                {renderListItemButton(item)}
                            </ListItem>
                        )}
                    </React.Fragment>
                ))}
            </List>
            <Divider />
            <Typography className="sidebar-section-title">Ρυθμίσεις</Typography>
            <List>
                {settingsItems.map((item, index) => (
                    <ListItem key={index} disablePadding>
                        {renderListItemButton(item)}
                    </ListItem>
                ))}
            </List>
        </Box>
    );
}

export default Sidebar;
