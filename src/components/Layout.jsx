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
    const [notifications, setNotifications] = useState([]);
    const [newBadgeCount, setNewBadgeCount] = useState(0);
    const [anchorElUser, setAnchorElUser] = useState(null);
    const [anchorElNotifications, setAnchorElNotifications] = useState(null);
    const [anchorElMessages, setAnchorElMessages] = useState(null);
    
    // --- START: New state for the complete user profile with image ---
    const [fullUserProfile, setFullUserProfile] = useState(userProfile);
    // --- END: New state ---
    
    const { academicYears, selectedYear, setSelectedYear, loadingYears } = useAcademicYear();

    // --- START: Effect to fetch detailed profile (with image URL) ---
    useEffect(() => {
        if (!db || !userProfile?.profileId || !userProfile?.role || !selectedYear) {
            setFullUserProfile(userProfile); // Fallback to the basic profile
            return;
        }

        const collectionName = userProfile.role === 'student' ? 'students' : userProfile.role === 'teacher' ? 'teachers' : null;
        if (!collectionName) {
            setFullUserProfile(userProfile);
            return;
        }

        const docRef = doc(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/${collectionName}`, userProfile.profileId);

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                // Merge the base user profile with the detailed profile data
                setFullUserProfile({ ...userProfile, ...docSnap.data() });
            } else {
                setFullUserProfile(userProfile); // Fallback if detailed profile not found
            }
        }, (error) => {
            console.error(`Error fetching detailed user profile:`, error);
            setFullUserProfile(userProfile); // Fallback on error
        });

        return () => unsubscribe();

    }, [db, appId, userProfile, selectedYear]);
    // --- END: Effect to fetch detailed profile ---

    const messageNotifications = useMemo(() => 
        notifications.filter(n => n.type === 'message'), 
    [notifications]);

    const otherNotifications = useMemo(() => 
        notifications.filter(n => n.type !== 'message'), 
    [notifications]);

    const handleOpenUserMenu = (event) => setAnchorElUser(event.currentTarget);
    const handleCloseUserMenu = () => setAnchorElUser(null);
    
    const handleOpenNotificationsMenu = (event) => setAnchorElNotifications(event.currentTarget);
    const handleCloseNotificationsMenu = () => setAnchorElNotifications(null);

    const handleOpenMessagesMenu = (event) => setAnchorElMessages(event.currentTarget);
    const handleCloseMessagesMenu = () => setAnchorElMessages(null);
    
    const handleProfileClick = () => {
        const profilePathMap = {
            student: '/my-profile',
            teacher: '/teacher/edit/' + userProfile?.profileId,
            admin: '/users-management'
        };
        const profilePath = profilePathMap[userProfile?.role] || '/';
        navigate(profilePath);
        handleCloseUserMenu();
    };

    useEffect(() => {
        setNotifications(prev => prev.filter(n => n.source !== 'year'));
    }, [selectedYear]);

    useEffect(() => {
        if (userProfile?.role !== 'student' || !userProfile.profileId || !selectedYear || !db) {
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
    }, [db, appId, userProfile, selectedYear]);

    useEffect(() => {
        if (!db || !user?.uid) return;

        const unsubscribes = [];

        if (selectedYear) {
            const recipientIds = ['global', user.uid];
            if (userProfile?.role === 'parent' && userProfile.childIds) {
                recipientIds.push(...userProfile.childIds);
            }

            const yearNotificationsQuery = query(
                collection(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/notifications`),
                where('recipientId', 'in', recipientIds),
                orderBy('timestamp', 'desc'),
                limit(50)
            );

            const yearUnsubscribe = onSnapshot(yearNotificationsQuery, (snapshot) => {
                const yearNotifications = snapshot.docs.map(d => ({
                    id: d.id,
                    ...d.data(),
                    read: d.data().readBy?.includes(user.uid) || false,
                    source: 'year',
                    yearId: selectedYear 
                }));
                
                setNotifications(prev => [
                    ...prev.filter(n => n.source !== 'year'), 
                    ...yearNotifications
                ]);

            }, (error) => {
                console.error("Error fetching yearly notifications:", error);
            });
            unsubscribes.push(yearUnsubscribe);
        }

        if (userProfile?.role === 'admin') {
            const adminNotificationsQuery = query(
                collection(db, `artifacts/${appId}/public/data/adminNotifications`),
                where('recipientId', '==', 'admin'),
                orderBy('timestamp', 'desc'),
                limit(20)
            );

            const adminUnsubscribe = onSnapshot(adminNotificationsQuery, (snapshot) => {
                const adminNotifications = snapshot.docs.map(d => ({
                    id: d.id,
                    ...d.data(),
                    read: d.data().readBy?.includes(user.uid) || false,
                    source: 'admin'
                }));

                setNotifications(prev => [
                    ...prev.filter(n => n.source !== 'admin'), 
                    ...adminNotifications
                ]);

            }, (error) => {
                console.error("Error fetching admin notifications:", error);
            });
            unsubscribes.push(adminUnsubscribe);
        }

        return () => unsubscribes.forEach(unsub => unsub());
    }, [db, appId, user, userProfile, selectedYear]);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };
    
    const handleMarkAsRead = async (notification) => {
        let collectionPath;
        if (notification.source === 'admin') {
            collectionPath = `artifacts/${appId}/public/data/adminNotifications`;
        } else if (notification.source === 'year' && notification.yearId) {
            collectionPath = `artifacts/${appId}/public/data/academicYears/${notification.yearId}/notifications`;
        } else {
            console.error("Cannot mark notification as read: unknown source or missing yearId", notification);
            return;
        }

        try {
            const notifRef = doc(db, collectionPath, notification.id);
            await updateDoc(notifRef, { readBy: arrayUnion(user.uid) });
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
                } else {
                    return; 
                }
                const notifRef = doc(db, collectionPath, n.id);
                batch.update(notifRef, { readBy: arrayUnion(user.uid) });
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
                userRole={userProfile?.role || 'unknown'}
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
                                        color: 'text.primary',
                                        '& .MuiOutlinedInput-notchedOutline': {
                                            borderColor: 'divider',
                                        },
                                        '&:hover .MuiOutlinedInput-notchedOutline': {
                                            borderColor: 'text.primary',
                                        },
                                        '& .MuiSvgIcon-root': {
                                            color: 'text.secondary'
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

                            {userProfile?.role === 'student' && (
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
                                        {/* --- START: Use the new fullUserProfile state for the avatar --- */}
                                        <Avatar alt={fullUserProfile?.displayName || fullUserProfile?.firstName} src={fullUserProfile?.avatarUrl || fullUserProfile?.profileImageUrl} />
                                        {/* --- END: Use the new fullUserProfile state for the avatar --- */}
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
