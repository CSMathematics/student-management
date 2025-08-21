// src/components/Layout.jsx
import React, { useState, useEffect } from 'react';
import { Box, Toolbar, AppBar, IconButton, Tooltip, FormControl, Select, MenuItem, CircularProgress, Typography, Badge } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
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
    
    const { academicYears, selectedYear, setSelectedYear, loadingYears } = useAcademicYear();

    useEffect(() => {
        setNotifications(prev => prev.filter(n => n.source !== 'year'));
    }, [selectedYear]);

    // useEffect for fetching new badges (notification style)
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


    // useEffect for fetching general notifications
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
    
    const handleMarkAllAsRead = async () => {
        const unread = notifications.filter(n => !n.read);
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
                                        color: 'white',
                                        // *** THE FIX IS HERE: Correctly styling the Select border ***
                                        '& .MuiOutlinedInput-notchedOutline': {
                                            borderColor: 'text.secondary',
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
                            <Notifications 
                                notifications={notifications} 
                                onMarkAsRead={handleMarkAsRead}
                                onMarkAllAsRead={handleMarkAllAsRead}
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
                            <Tooltip title="Αποσύνδεση">
                                <IconButton onClick={handleLogout} color="inherit">
                                    <LogoutIcon />
                                </IconButton>
                            </Tooltip>
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
