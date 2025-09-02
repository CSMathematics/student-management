// src/components/Layout.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Box, Toolbar, AppBar, IconButton, Tooltip, FormControl, Select, MenuItem, CircularProgress, Typography, Badge, Avatar, Menu, ListItemIcon, Divider } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import MailIcon from '@mui/icons-material/Mail';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Sidebar from '../pages/Sidebar.jsx';
import Notifications from './Notifications.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useAcademicYear } from '../context/AcademicYearContext.jsx';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch, orderBy, limit, arrayUnion } from 'firebase/firestore';
import { Brightness7, Brightness2, EmojiEvents as EmojiEventsIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const drawerWidth = 280;

function Layout({ userProfile, handleLogout, children, db, appId, user }) {
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const { mode, toggleTheme } = useTheme();
    
    // --- START: REFACTORED NOTIFICATION STATE ---
    const [userNotifications, setUserNotifications] = useState([]);
    const [yearNotifications, setYearNotifications] = useState([]);
    const [adminNotifications, setAdminNotifications] = useState([]);
    const [combinedNotifications, setCombinedNotifications] = useState([]);
    // --- END: REFACTORED NOTIFICATION STATE ---

    const [newBadgeCount, setNewBadgeCount] = useState(0);
    const [anchorElUser, setAnchorElUser] = useState(null);
    const [anchorElNotifications, setAnchorElNotifications] = useState(null);
    const [anchorElMessages, setAnchorElMessages] = useState(null);
    const [fullUserProfile, setFullUserProfile] = useState(userProfile);
    
    const { academicYears, selectedYear, setSelectedYear, loadingYears } = useAcademicYear();
    
    const userRoles = useMemo(() => userProfile?.roles || [userProfile?.role].filter(Boolean), [userProfile]);
    
    // Combine notifications from all sources whenever one of them changes
    useEffect(() => {
        setCombinedNotifications([
            ...userNotifications,
            ...yearNotifications,
            ...adminNotifications
        ]);
    }, [userNotifications, yearNotifications, adminNotifications]);


    useEffect(() => {
        if (!db || !userProfile?.profileId || userRoles.length === 0 || !selectedYear) {
            setFullUserProfile(userProfile);
            return;
        }

        const collectionName = userRoles.includes('student') ? 'students' : userRoles.includes('teacher') ? 'teachers' : null;
        if (!collectionName) {
            setFullUserProfile(userProfile);
            return;
        }

        const docRef = doc(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/${collectionName}`, userProfile.profileId);

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setFullUserProfile({ ...userProfile, ...docSnap.data() });
            } else {
                setFullUserProfile(userProfile);
            }
        }, (error) => {
            console.error(`Error fetching detailed user profile:`, error);
            setFullUserProfile(userProfile);
        });

        return () => unsubscribe();

    }, [db, appId, userProfile, selectedYear, userRoles]);

    const messageNotifications = useMemo(() => 
        combinedNotifications.filter(n => n.type === 'message'), 
    [combinedNotifications]);

    const otherNotifications = useMemo(() => 
        combinedNotifications.filter(n => n.type !== 'message'), 
    [combinedNotifications]);

    const handleOpenUserMenu = (event) => setAnchorElUser(event.currentTarget);
    const handleCloseUserMenu = () => setAnchorElUser(null);
    
    const handleOpenNotificationsMenu = (event) => setAnchorElNotifications(event.currentTarget);
    const handleCloseNotificationsMenu = () => setAnchorElNotifications(null);

    const handleOpenMessagesMenu = (event) => setAnchorElMessages(event.currentTarget);
    const handleCloseMessagesMenu = () => setAnchorElMessages(null);
    
    const handleProfileClick = () => {
        let profilePath = '/';
        if (userRoles.includes('student')) {
            profilePath = '/my-profile';
        } else if (userRoles.includes('teacher')) {
            profilePath = '/my-profile';
        } else if (userRoles.includes('admin')) {
            profilePath = '/users-management';
        }
        navigate(profilePath);
        handleCloseUserMenu();
    };

    useEffect(() => {
        setYearNotifications([]); // Clear year-specific notifications on year change
    }, [selectedYear]);

    useEffect(() => {
        if (!userRoles.includes('student') || !userProfile.profileId || !selectedYear || !db) {
            setNewBadgeCount(0);
            return;
        }

        let isMounted = true;
        const badgesQuery = query(
            collection(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/students/${userProfile.profileId}/badges`),
            where("seenByUser", "==", false)
        );

        const unsubscribe = onSnapshot(badgesQuery, (snapshot) => {
            if (isMounted) {
                setNewBadgeCount(snapshot.size); 
            }
        }, (error) => {
            console.error("Error fetching new badges:", error);
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [db, appId, userProfile, selectedYear, userRoles]);

    useEffect(() => {
        if (!db || !user?.uid) return;

        const unsubscribes = [];

        // Listener for user-specific notifications (like reminders)
        const userNotificationsQuery = query(
            collection(db, `users/${user.uid}/notifications`),
            orderBy('timestamp', 'desc'),
            limit(20)
        );
        const userUnsubscribe = onSnapshot(userNotificationsQuery, (snapshot) => {
            setUserNotifications(snapshot.docs.map(d => ({
                id: d.id, ...d.data(),
                read: d.data().read || false, source: 'user'
            })));
        }, (error) => console.error("Error fetching user-specific notifications:", error));
        unsubscribes.push(userUnsubscribe);

        // Listener for academic year notifications
        if (selectedYear) {
            const recipientIds = ['global', user.uid];
            if (userRoles.includes('parent') && userProfile.childIds) {
                recipientIds.push(...userProfile.childIds);
            }
            const yearNotificationsQuery = query(
                collection(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/notifications`),
                where('recipientId', 'in', recipientIds),
                orderBy('timestamp', 'desc'), limit(50)
            );
            const yearUnsubscribe = onSnapshot(yearNotificationsQuery, (snapshot) => {
                setYearNotifications(snapshot.docs.map(d => ({
                    id: d.id, ...d.data(),
                    read: d.data().readBy?.includes(user.uid) || false, source: 'year', yearId: selectedYear 
                })));
            }, (error) => console.error("Error fetching yearly notifications:", error));
            unsubscribes.push(yearUnsubscribe);
        }

        // Listener for admin-wide notifications
        if (userRoles.includes('admin')) {
            const adminNotificationsQuery = query(
                collection(db, `artifacts/${appId}/public/data/adminNotifications`),
                where('recipientId', '==', 'admin'),
                orderBy('timestamp', 'desc'), limit(20)
            );
            const adminUnsubscribe = onSnapshot(adminNotificationsQuery, (snapshot) => {
                setAdminNotifications(snapshot.docs.map(d => ({
                    id: d.id, ...d.data(),
                    read: d.data().readBy?.includes(user.uid) || false, source: 'admin'
                })));
            }, (error) => console.error("Error fetching admin notifications:", error));
            unsubscribes.push(adminUnsubscribe);
        }

        return () => unsubscribes.forEach(unsub => unsub());
    }, [db, appId, user, userProfile, selectedYear, userRoles]);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };
    
    const handleMarkAsRead = async (notification) => {
        let collectionPath;
        if (notification.source === 'admin') {
            collectionPath = `artifacts/${appId}/public/data/adminNotifications`;
        } else if (notification.source === 'year' && notification.yearId) {
            collectionPath = `artifacts/${appId}/public/data/academicYears/${notification.yearId}/notifications`;
        } else if (notification.source === 'user') {
            collectionPath = `users/${user.uid}/notifications`;
        } else {
            console.error("Cannot mark notification as read: unknown source or missing yearId", notification);
            return;
        }

        try {
            const notifRef = doc(db, collectionPath, notification.id);
            if (notification.source === 'user') {
                 await updateDoc(notifRef, { read: true });
            } else {
                 await updateDoc(notifRef, { readBy: arrayUnion(user.uid) });
            }
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };
    
    const handleMarkAllAsRead = async (notificationsToMark) => {
        const unread = notificationsToMark.filter(n => !n.read);
        if (unread.length === 0) return;
        
        try {
            const batch = writeBatch(db);
            unread.forEach(n => {
                let collectionPath;
                if (n.source === 'admin') {
                    collectionPath = `artifacts/${appId}/public/data/adminNotifications`;
                } else if (n.source === 'year' && n.yearId) {
                    collectionPath = `artifacts/${appId}/public/data/academicYears/${n.yearId}/notifications`;
                } else if (n.source === 'user') {
                    collectionPath = `users/${user.uid}/notifications`;
                }
                else {
                    return; 
                }
                const notifRef = doc(db, collectionPath, n.id);
                 if (n.source === 'user') {
                    batch.update(notifRef, { read: true });
                } else {
                    batch.update(notifRef, { readBy: arrayUnion(user.uid) });
                }
            });
            await batch.commit();
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    };

    return (
        <Box sx={{ display: 'flex' }}>
            <Sidebar 
                handleDrawerToggle={handleDrawerToggle} 
                mobileOpen={mobileOpen}
                userRoles={userRoles}
            />
            <Box 
                component="main" 
                sx={{ 
                    flexGrow: 1, 
                    p: 3, 
                    width: { md: `calc(100% - ${drawerWidth}px)` } 
                }}
            >
                <AppBar 
                    position="fixed" 
                    sx={{ 
                        width: { md: `calc(100% - ${drawerWidth}px)` }, 
                        ml: { md: `${drawerWidth}px` }, 
                        backgroundColor: 'background.paper', 
                        boxShadow: 'none', 
                        borderBottom: '1px solid', 
                        borderColor: 'divider' 
                    }}
                >
                    <Toolbar>
                        <IconButton 
                            color="inherit" 
                            aria-label="open drawer" 
                            edge="start" 
                            onClick={handleDrawerToggle} 
                            sx={{ mr: 2, display: { md: 'none' } }}
                        >
                            <MenuIcon />
                        </IconButton>
                        
                        <Typography sx={{pr: 2}}>Ακαδημαϊκό Έτος</Typography>
                        {loadingYears ? <CircularProgress size={20} /> : (
                            <FormControl size="small" variant="outlined" sx={{ minWidth: 150, mr: 2 }}>
                                <Select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                    displayEmpty
                                    sx={{
                                        color: 'white',
                                        '& .MuiOutlinedInput-notchedOutline': {
                                            borderColor: 'divider',
                                        },
                                        '&:hover .MuiOutlinedInput-notchedOutline': {
                                            borderColor: 'white',
                                        },
                                        '& .MuiSvgIcon-root': {
                                            color: 'white'
                                        },
                                    }}
                                >
                                    {academicYears.map(year => (
                                        <MenuItem key={year.id} value={year.id}>{year.id}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}

                        <Box sx={{ flexGrow: 1 }} />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            
                             <Tooltip title="Μηνύματα">
                                <IconButton color="inherit" onClick={handleOpenMessagesMenu}>
                                    <Badge badgeContent={messageNotifications.filter(n => !n.read).length} color="error">
                                        <MailIcon />
                                    </Badge>
                                </IconButton>
                            </Tooltip>
                            <Notifications 
                                anchorEl={anchorElMessages}
                                open={Boolean(anchorElMessages)}
                                onClose={handleCloseMessagesMenu}
                                title="Μηνύματα"
                                notifications={messageNotifications} 
                                onMarkAsRead={handleMarkAsRead}
                                onMarkAllAsRead={() => handleMarkAllAsRead(messageNotifications)}
                            />
                            
                            <Tooltip title="Ειδοποιήσεις">
                                <IconButton color="inherit" onClick={handleOpenNotificationsMenu}>
                                    <Badge badgeContent={otherNotifications.filter(n => !n.read).length} color="error">
                                        <NotificationsIcon />
                                    </Badge>
                                </IconButton>
                            </Tooltip>

                            <Notifications 
                                anchorEl={anchorElNotifications}
                                open={Boolean(anchorElNotifications)}
                                onClose={handleCloseNotificationsMenu}
                                title="Ειδοποιήσεις"
                                notifications={otherNotifications} 
                                onMarkAsRead={handleMarkAsRead}
                                onMarkAllAsRead={() => handleMarkAllAsRead(otherNotifications)}
                            />

                            {userRoles.includes('student') && (
                                <Tooltip title="Νέα Παράσημα">
                                    <IconButton color="inherit" onClick={() => navigate('/my-badges')}>
                                        <Badge badgeContent={newBadgeCount} color="secondary">
                                            <EmojiEventsIcon />
                                        </Badge>
                                    </IconButton>
                                </Tooltip>
                            )}

                            <Tooltip title="Εναλλαγή Θέματος">
                                <IconButton onClick={toggleTheme} color="inherit">
                                    {mode === 'dark' ? <Brightness7 /> : <Brightness2 />}
                                </IconButton>
                            </Tooltip>

                            <Box sx={{ flexGrow: 0 }}>
                                <Tooltip title="Επιλογές Χρήστη">
                                    <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                                        <Avatar alt={fullUserProfile?.displayName || fullUserProfile?.firstName} src={fullUserProfile?.avatarUrl || fullUserProfile?.profileImageUrl} />
                                    </IconButton>
                                </Tooltip>
                                <Menu
                                    sx={{ mt: '45px' }}
                                    id="menu-appbar"
                                    anchorEl={anchorElUser}
                                    anchorOrigin={{
                                        vertical: 'top',
                                        horizontal: 'right',
                                    }}
                                    keepMounted
                                    transformOrigin={{
                                        vertical: 'top',
                                        horizontal: 'right',
                                    }}
                                    open={Boolean(anchorElUser)}
                                    onClose={handleCloseUserMenu}
                                >
                                    <MenuItem onClick={handleProfileClick}>
                                        <ListItemIcon>
                                            <PersonIcon fontSize="small" />
                                        </ListItemIcon>
                                        <Typography textAlign="center">Το Προφίλ μου</Typography>
                                    </MenuItem>
                                    <MenuItem onClick={handleCloseUserMenu}>
                                        <ListItemIcon>
                                            <SettingsIcon fontSize="small" />
                                        </ListItemIcon>
                                        <Typography textAlign="center">Ρυθμίσεις</Typography>
                                    </MenuItem>
                                    <Divider />
                                    <MenuItem onClick={() => { handleLogout(); handleCloseUserMenu(); }}>
                                        <ListItemIcon>
                                            <LogoutIcon fontSize="small" />
                                        </ListItemIcon>
                                        <Typography textAlign="center">Αποσύνδεση</Typography>
                                    </MenuItem>
                                </Menu>
                            </Box>
                        </Box>
                    </Toolbar>
                </AppBar>
                <Toolbar />
                {children}
            </Box>
        </Box>
    );
}

export default Layout;

