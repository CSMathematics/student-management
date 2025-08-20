// src/pages/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Typography, Collapse, Drawer, Toolbar } from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';


const drawerWidth = 280;

// --- ΝΕΑ ΔΟΜΗ: Μενού ανά ρόλο ---
const navItemsByRole = {
    admin: [
        { text: "Αρχική", icon: "fas fa-chart-line", path: "/" },
        { text: "Πρόγραμμα", icon: "fas fa-calendar-alt", path: "/calendar" },
        { type: 'divider' },
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
        {
            text: "Μαθήματα", icon: "fas fa-book", isParent: true,
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
        { text: "Διαγωνίσματα - Εργασίες", icon: "fas fa-file-alt", path: "assignments" },
        { text: "Βαθμολογίες", icon: "fas fa-chart-bar", path: "/grades-summary" },
        { text: "Βιβλιοθήκη", icon: "fas fa-book-open", path: "/library" },
        { text: "Τηλεφωνικός κατάλογος", icon: "fas fa-phone", path: "/phonebook" },
        { text: "Ανακοινώσεις", icon: "fas fa-bullhorn", path: "/announcements" },
        { text: "Επικοινωνία", icon: "fas fa-comments", path: "/communication" },
        { type: 'divider' },
        { text: "Πληρωμές", icon: "fas fa-money-bill", path: "/payments" },
        { text: "Έξοδα", icon: "fas fa-file-invoice-dollar", path: "/expenses" },
        { text: "Εργασίες - Υποχρεώσεις", icon: "fas fa-tasks", path: "#" },
        { type: 'divider' },
        {
            text: "Ρυθμίσεις", icon: "fas fa-cog", isParent: true,
            subItems: [
                { text: "Βασικές Ρυθμίσεις", icon: "fas fa-cog", path: "#" },
                { text: "Ακαδημαϊκή χρονιά", icon: "fas fa-calendar-alt", path: "/academicYear" },
                { text: "Διαχείριση Χρηστών", icon: "fas fa-users-cog", path: "/users-management" },
                { text: "Εμφάνιση", icon: "fas fa-sliders-h", path: "#" }
            ]
        },


    ],
    teacher: [
        { text: "Αρχική", icon: "fas fa-chart-line", path: "/" },
        { text: "Το Προφίλ μου", icon: "fas fa-user-cog", path: "/my-profile" }, // <-- Η ΑΛΛΑΓΗ ΕΙΝΑΙ ΕΔΩ
        { text: "Η Βιβλιοθήκη μου", icon: "fas fa-book-open", path: "/my-library" }, // <-- Η ΑΛΛΑΓΗ ΕΙΝΑΙ ΕΔΩ
        { text: "Τα Μαθήματά μου", icon: "fas fa-book", path: "/my-courses" },
        { text: "Το Πρόγραμμά μου", icon: "fas fa-calendar-alt", path: "/my-schedule" },
        { text: "Τα Τμήματά μου", icon: "fas fa-chalkboard", path: "/my-classrooms" },
        { text: "Οι Μαθητές μου", icon: "fas fa-users", path: "/my-students" }, // <-- Η ΝΕΑ ΠΡΟΣΘΗΚΗ
        { text: "Οι Αξιολογήσεις μου", icon: "fas fa-tasks", path: "/my-assignments" },
        { text: "Το Βαθμολόγιό μου", icon: "fas fa-book-reader", path: "/my-gradebook" },
        { text: "Στατιστικά", icon: "fas fa-chart-pie", path: "/teacher-stats" },
        { text: "Επικοινωνία", icon: "fas fa-comments", path: "/communication" },
    ],
    student: [
        { text: "Αρχική", icon: "fas fa-chart-line", path: "/" },
        { text: "Το Προφίλ μου", icon: "fas fa-user-cog", path: "/my-profile" },
        { text: "Το Ημερολόγιό μου", icon: "fas fa-calendar-alt", path: "/my-schedule" }, // <-- Η ΑΛΛΑΓΗ ΕΙΝΑΙ ΕΔΩ
        { text: "Τα Μαθήματά μου", icon: "fas fa-book-reader", path: "/my-courses" }, 
        { text: "Εργασίες & Διαγωνίσματα", icon: "fas fa-file-alt", path: "/my-assignments" },
        { text: "Το Υλικό μου", icon: "fas fa-book-open", path: "/my-materials" },
        { text: "Οι Βαθμοί μου", icon: "fas fa-chart-bar", path: "/my-grades" },
        { text: "Οι Απουσίες μου", icon: "fas fa-times", path: "/my-absences" },
        { text: "Τα Παράσημά μου", icon: "fas fa-trophy", path: "/my-badges" },
        { text: "Επικοινωνία", icon: "fas fa-comments", path: "/communication" },
    ],
    parent: [
        { text: "Αρχική", icon: "fas fa-chart-line", path: "/" },
        { text: "Το Προφίλ μου", icon: "fas fa-user-cog", path: "/my-profile" }, // <-- Η ΑΛΛΑΓΗ ΕΙΝΑΙ ΕΔΩ
        { text: "Ανακοινώσεις", icon: "fas fa-bullhorn", path: "/announcements" },
        { text: "Ημερολόγιο Παιδιού", icon: "fas fa-calendar-alt", path: "/child-schedule" },
        { text: "Εργασίες Παιδιού", icon: "fas fa-file-alt", path: "/child-assignments" },
        { text: "Υλικό Μαθημάτων", icon: "fas fa-book-open", path: "/child-materials" },
        { text: "Βαθμολογία & Απουσίες", icon: "fas fa-chart-bar", path: "/child-grades-absences" },
        { text: "Καθηγητές & Αναφορές", icon: "fas fa-chalkboard-user", path: "/child-teachers-report" }, // <-- Η ΝΕΑ ΠΡΟΣΘΗΚΗ
        { text: "Οικονομικά", icon: "fas fa-money-bill", path: "/payments" },
        { text: "Επικοινωνία", icon: "fas fa-comments", path: "/communication" },
    ],
    unknown: [
        { text: "Αρχική", icon: "fas fa-chart-line", path: "/" },
    ]
};


function Sidebar({ mobileOpen, handleDrawerToggle, userRole }) {
    const location = useLocation();
    const [openSubmenus, setOpenSubmenus] = useState({});

    const navItems = navItemsByRole[userRole] || navItemsByRole.unknown;

    useEffect(() => {
        const parentOfPath = (path) => {
            const item = navItems.find(item => item.isParent && path.startsWith(item.path));
            return item ? item.text : null;
        };
        const parent = parentOfPath(location.pathname);
        if (parent) {
            setOpenSubmenus(prev => ({ ...prev, [parent]: true }));
        }
    }, [location.pathname, navItems]);

    const handleSubmenuClick = (name) => {
        setOpenSubmenus(prev => ({ ...prev, [name]: !prev[name] }));
    };

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
            // --- ΑΛΛΑΓΗ: Προσαρμογή της εσοχής ---
            className: isSubItem ? 'sub-item' : ''
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
        </div>
    );

    return (
        <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
            <Drawer variant="temporary" open={mobileOpen} onClose={handleDrawerToggle} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}>
                {drawerContent}
            </Drawer>
            <Drawer variant="permanent" sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }} open>
                {drawerContent}
            </Drawer>
        </Box>
    );
}

export default Sidebar;
