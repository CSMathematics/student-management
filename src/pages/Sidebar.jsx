// src/pages/Sidebar.jsx
import React, { useState } from 'react';
import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Typography, Collapse, Drawer, Toolbar } from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';

const drawerWidth = 280; // Define the width of the sidebar

function Sidebar({ navigateTo, currentPage, mobileOpen, handleDrawerToggle }) {
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
        { text: "Πρόγραμμα", icon: "fas fa-calendar-alt", page: "calendar" },
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
                { text: "Τάξεις", icon: "fas fa-layer-group", page: "#" },
                { text: "Τμήματα", icon: "fas fa-door-open", page: "classroomsList" },
                { text: "Νέο Τμήμα", icon: "fas fa-plus", page: "newClassroom" },
            ]
        },
        { text: "Μαθήματα", icon: "fas fa-book", page: "#" },
        { text: "Καθηγητές", icon: "fas fa-user-graduate", page: "#" },
        { text: "Διαγωνίσματα", icon: "fas fa-file-alt", page: "#" },
        { text: "Τηλεφωνικός κατάλογος", icon: "fas fa-phone", page: "#" },
        { text: "Πληρωμές", icon: "fas fa-money-bill", page: "#" },
        { text: "Βαθμολογίες", icon: "fas fa-chart-bar", page: "#" },
        { text: "Απουσίες", icon: "fas fa-times", page: "#" },
        { text: "Εργασίες υποχρεώσεις", icon: "fas fa-tasks", page: "#" },
        { text: "Έγγραφα", icon: "fas fa-file", page: "#" },
        { text: "Apprenticeships & Thesis", icon: "fas fa-briefcase", page: "#" },
        { text: "Transportation", icon: "fas fa-bus", page: "#" },
    ];

    const settingsItems = [
        { text: "Βασικές Ρυθμίσεις", icon: "fas fa-cog", page: "#" },
        { text: "Ρυθμίσεις μαθητών", icon: "fas fa-cogs", page: "#" },
        { text: "Εμφάνιση", icon: "fas fa-sliders-h", page: "#" },
        { text: "Πληρωμές", icon: "fas fa-wallet", page: "#" },
        { text: "Library Settings", icon: "fas fa-university", page: "#" },
        { text: "Apprenticeships / Thesis", icon: "fas fa-briefcase", page: "#" },
    ];

    const isItemSelected = (itemPage) => {
        return itemPage === currentPage;
    };

    const renderListItemButton = (item, isSubItem = false) => {
        const commonProps = {
            onClick: item.isParent
                ? (item.text === "Μαθητές" ? handleClickStudentsSubmenu : handleClickClassesSubmenu)
                : () => navigateTo(item.page || '#'),
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

        return (
            <ListItemButton {...commonProps}>
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
    };

    const drawerContent = (
        <div>
            <Toolbar sx={{ backgroundColor: '#1e86cc', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="h6" noWrap component="div">
                    <i className="fas fa-graduation-cap" style={{ marginRight: '12px' }}></i>
                    Φιλομάθεια
                </Typography>
            </Toolbar>
            <Divider />
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
                        <ListItem disablePadding>
                            {renderListItemButton(item)}
                        </ListItem>
                        {item.isParent && (
                             <Collapse in={item.text === "Μαθητές" ? openStudentsSubmenu : openClassesSubmenu} timeout="auto" unmountOnExit>
                                <List component="div" disablePadding>
                                    {item.subItems.map((subItem, subIndex) => (
                                        <ListItem key={subIndex} disablePadding>
                                            {renderListItemButton(subItem, true)}
                                        </ListItem>
                                    ))}
                                </List>
                            </Collapse>
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
        </div>
    );

    return (
        <Box
            component="nav"
            sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        >
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                }}
            >
                {drawerContent}
            </Drawer>
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', md: 'block' },
                    '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                }}
                open
            >
                {drawerContent}
            </Drawer>
        </Box>
    );
}

export default Sidebar;
