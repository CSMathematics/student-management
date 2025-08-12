// src/components/Layout.jsx
import React, { useState, useEffect } from 'react';
import { Box, Toolbar, AppBar, IconButton, Button, Tooltip } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import Sidebar from '../pages/Sidebar.jsx';
import Notifications from './Notifications.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch, orderBy, limit, arrayUnion } from 'firebase/firestore';
import { Brightness7, Brightness2 } from '@mui/icons-material';

const drawerWidth = 280;

function Layout({ userProfile, handleLogout, children, db, appId, user }) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const { mode, toggleTheme } = useTheme();
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        if (!db || !user?.uid) return;

        const recipientIds = ['global', user.uid];
        if (userProfile?.role === 'parent' && userProfile.childId) {
            recipientIds.push(userProfile.childId);
        }

        const notificationsQuery = query(
            collection(db, `artifacts/${appId}/public/data/notifications`),
            where('recipientId', 'in', recipientIds),
            orderBy('timestamp', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
            const notificationsData = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data(),
                read: d.data().readBy?.includes(user.uid) || false
            }));
            setNotifications(notificationsData);
        }, (error) => {
            console.error("Error fetching notifications:", error);
        });

        return () => unsubscribe();
    }, [db, appId, user, userProfile]);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };
    
    const handleMarkAsRead = async (notificationId) => {
        try {
            const notifRef = doc(db, `artifacts/${appId}/public/data/notifications`, notificationId);
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
                const notifRef = doc(db, `artifacts/${appId}/public/data/notifications`, n.id);
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
                        <Box sx={{ flexGrow: 1 }} />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Notifications 
                                notifications={notifications} 
                                onMarkAsRead={handleMarkAsRead}
                                onMarkAllAsRead={handleMarkAllAsRead}
                            />
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
