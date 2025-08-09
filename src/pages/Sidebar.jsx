// src/pages/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Typography, Collapse, Drawer, Toolbar } from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';

const drawerWidth = 280;

function Sidebar({ mobileOpen, handleDrawerToggle }) {
    const location = useLocation();
    const [openSubmenus, setOpenSubmenus] = useState({});

    useEffect(() => {
        const parentOfPath = (path) => {
            if (path.startsWith('/student')) return 'Μαθητές';
            if (path.startsWith('/classroom')) return 'Τάξεις - Τμήματα';
            if (path.startsWith('/teacher')) return 'Καθηγητές';
            return null;
        };
        const parent = parentOfPath(location.pathname);
        if (parent) {
            setOpenSubmenus(prev => ({ ...prev, [parent]: true }));
        }
    }, [location.pathname]);

    const handleSubmenuClick = (name) => {
        setOpenSubmenus(prev => ({ ...prev, [name]: !prev[name] }));
    };

    const navItems = [
        { text: "Αρχική", icon: "fas fa-chart-line", path: "/" },
        { text: "Πρόγραμμα", icon: "fas fa-calendar-alt", path: "/calendar" },
    ];

    const managementItems = [
        {
            text: "Μαθητές", icon: "fas fa-user", isParent: true,
            subItems: [
                { text: "Νέος μαθητής", icon: "fas fa-user-plus", path: "/student/new" },
                { text: "Καρτέλες μαθητών", icon: "fas fa-users", path: "/students" },
            ]
        },
        {
            text: "Τάξεις - Τμήματα", icon: "fas fa-chalkboard", isParent: true,
            subItems: [
                { text: "Νέο Τμήμα", icon: "fas fa-plus", path: "/classroom/new" },
                { text: "Τμήματα", icon: "fas fa-door-open", path: "/classrooms" },
            ]
        },
        { text: "Μαθήματα", icon: "fas fa-book", isParent: true,
            subItems: [
                { text: "Νέο μάθημα", icon: "fas fa-plus", path: "/course/new" },
                { text: "Λίστα μαθημάτων", icon: "fas fa-list", path: "/courses/list" },           
            ]
        },
        {
            text: "Καθηγητές", icon: "fas fa-user-graduate", isParent: true,
            subItems: [
                { text: "Νέος καθηγητής", icon: "fas fa-plus", path: "/teacher/new" },
                { text: "Λίστα καθηγητών", icon: "fas fa-chalkboard-user", path: "/teachers" },
            ]
        },
        { text: "Επικοινωνία", icon: "fas fa-comments", path: "/communication" },
        { text: "Διαγωνίσματα - Εργασίες", icon: "fas fa-file-alt", path: "#" },
        { text: "Τηλεφωνικός κατάλογος", icon: "fas fa-phone", path: "/phonebook" },
        { text: "Πληρωμές", icon: "fas fa-money-bill", path: "/payments" },
        { text: "Έξοδα", icon: "fas fa-file-invoice-dollar", path: "/expenses" },
        { text: "Ανακοινώσεις", icon: "fas fa-bullhorn", path: "/announcements" },
        { text: "Βαθμολογίες", icon: "fas fa-chart-bar", path: "#" },
        { text: "Απουσίες", icon: "fas fa-times", path: "#" },
        { text: "Εργασίες υποχρεώσεις", icon: "fas fa-tasks", path: "#" },
        { text: "Βιβλιοθήκη", icon: "fas fa-file", path: "#" },
        { text: "Apprenticeships & Thesis", icon: "fas fa-briefcase", path: "#" },
        { text: "Transportation", icon: "fas fa-bus", path: "#" },
    ];

    const settingsItems = [
        { text: "Βασικές Ρυθμίσεις", icon: "fas fa-cog", path: "#" },
        { text: "Ρυθμίσεις μαθητών", icon: "fas fa-cogs", path: "#" },
        { text: "Εμφάνιση", icon: "fas fa-sliders-h", path: "#" },
        { text: "Πληρωμές", icon: "fas fa-wallet", path: "#" },
        { text: "Library Settings", icon: "fas fa-university", path: "#" },
        { text: "Apprenticeships / Thesis", icon: "fas fa-briefcase", path: "#" },
    ];

    const renderListItemButton = (item, isSubItem = false) => {
        const isSelected = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
        
        const commonProps = {
            component: (item.path && item.path !== "#") ? Link : 'div',
            to: item.path,
            onClick: (e) => {
                if (item.isParent) {
                    e.preventDefault();
                    handleSubmenuClick(item.text);
                } else if (mobileOpen) {
                    handleDrawerToggle();
                }
            },
            selected: isSelected,
            className: isSubItem ? 'sub-item' : '',
        };

        return (
            <ListItemButton {...commonProps}>
                <ListItemIcon><i className={item.icon}></i></ListItemIcon>
                <ListItemText primary={item.text} />
                {item.isParent && (openSubmenus[item.text] ? <ExpandLess /> : <ExpandMore />)}
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
                    <ListItem key={index} disablePadding>{renderListItemButton(item)}</ListItem>
                ))}
            </List>
            <Divider />
            <Typography sx={{pl: 2, pt: 2, pb: 1, fontWeight: 'bold', color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.8rem'}}>Διαχείρηση</Typography>
            <List>
                {managementItems.map((item, index) => (
                    <React.Fragment key={index}>
                        <ListItem disablePadding>{renderListItemButton(item)}</ListItem>
                        {item.isParent && (
                             <Collapse in={openSubmenus[item.text]} timeout="auto" unmountOnExit>
                                <List component="div" disablePadding>
                                    {item.subItems.map((subItem, subIndex) => (
                                        <ListItem key={subIndex} disablePadding>{renderListItemButton(subItem, true)}</ListItem>
                                    ))}
                                </List>
                            </Collapse>
                        )}
                    </React.Fragment>
                ))}
            </List>
            <Divider />
            <Typography sx={{pl: 2, pt: 2, pb: 1, fontWeight: 'bold', color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.8rem'}}>Ρυθμίσεις</Typography>
            <List>
                {settingsItems.map((item, index) => (
                    <ListItem key={index} disablePadding>{renderListItemButton(item)}</ListItem>
                ))}
            </List>
        </div>
    );

    return (
        <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
            <Drawer variant="temporary" open={mobileOpen} onClose={handleDrawerToggle} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }}}>
                {drawerContent}
            </Drawer>
            <Drawer variant="permanent" sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }}} open>
                {drawerContent}
            </Drawer>
        </Box>
    );
}

export default Sidebar;
