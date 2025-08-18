// src/components/Notifications.jsx
import React, { useState, useMemo } from 'react';
import { Badge, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Typography, Divider, Box, Tooltip } from '@mui/material';
import { Notifications as NotificationsIcon, Grade as GradeIcon, Campaign as CampaignIcon, Assignment as AssignmentIcon, PersonAdd as PersonAddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/el';

dayjs.extend(relativeTime);
dayjs.locale('el');

const notificationIcons = {
    grade: <GradeIcon fontSize="small" color="secondary" />,
    announcement: <CampaignIcon fontSize="small" color="primary" />,
    assignment: <AssignmentIcon fontSize="small" color="info" />,
    newUser: <PersonAddIcon fontSize="small" color="success" />,
    default: <NotificationsIcon fontSize="small" />
};

function Notifications({ notifications, onMarkAsRead, onMarkAllAsRead }) {
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleNotificationClick = (notification) => {
        handleClose();
        if (!notification.read) {
            // --- ΔΙΟΡΘΩΣΗ: Περνάμε ολόκληρο το αντικείμενο της ειδοποίησης ---
            onMarkAsRead(notification);
        }
        if (notification.link) {
            navigate(notification.link);
        }
    };

    const handleMarkAllClick = (e) => {
        e.stopPropagation();
        onMarkAllAsRead();
    };
    
    const sortedNotifications = useMemo(() => {
        return [...notifications].sort((a, b) => (b.timestamp?.toDate() || 0) - (a.timestamp?.toDate() || 0));
    }, [notifications]);

    return (
        <>
            <Tooltip title="Ειδοποιήσεις">
                <IconButton color="inherit" onClick={handleClick}>
                    <Badge badgeContent={unreadCount} color="error">
                        <NotificationsIcon />
                    </Badge>
                </IconButton>
            </Tooltip>
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                PaperProps={{
                    sx: { width: 360, maxHeight: 400, overflow: 'auto' },
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
                    <Typography variant="h6">Ειδοποιήσεις</Typography>
                    {unreadCount > 0 && 
                        <Typography variant="body2" color="primary" sx={{cursor: 'pointer', '&:hover': {textDecoration: 'underline'}}} onClick={handleMarkAllClick}>
                            Σήμανση όλων ως διαβασμένα
                        </Typography>
                    }
                </Box>
                <Divider />
                {sortedNotifications.length > 0 ? sortedNotifications.map(n => (
                    <MenuItem 
                        key={n.id} 
                        onClick={() => handleNotificationClick(n)} 
                        sx={{ 
                            backgroundColor: n.read ? 'transparent' : 'action.hover', 
                            whiteSpace: 'normal',
                            py: 1.5
                        }}
                    >
                        <ListItemIcon sx={{ minWidth: '40px' }}>
                            {notificationIcons[n.type] || notificationIcons.default}
                        </ListItemIcon>
                        <ListItemText
                            primary={n.message}
                            secondary={dayjs(n.timestamp?.toDate()).fromNow()}
                        />
                    </MenuItem>
                )) : (
                    <MenuItem disabled>
                        <ListItemText primary="Δεν υπάρχουν νέες ειδοποιήσεις." />
                    </MenuItem>
                )}
            </Menu>
        </>
    );
}

export default Notifications;
