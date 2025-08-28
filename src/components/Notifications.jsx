// src/components/Notifications.jsx
import React, { useMemo } from 'react';
import { Badge, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Typography, Divider, Box, Tooltip } from '@mui/material';
import { Notifications as NotificationsIcon, Grade as GradeIcon, Campaign as CampaignIcon, Assignment as AssignmentIcon, PersonAdd as PersonAddIcon, Email as MessageIcon } from '@mui/icons-material';
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
    message: <MessageIcon fontSize="small" color="info" />,
    default: <NotificationsIcon fontSize="small" />
};

// --- START: Component updated to be more reusable ---
function Notifications({ 
    notifications, 
    onMarkAsRead, 
    onMarkAllAsRead, 
    anchorEl, 
    open, 
    onClose, 
    title = "Ειδοποιήσεις" 
}) {
    const navigate = useNavigate();

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleNotificationClick = (notification) => {
        onClose();
        if (!notification.read) {
            onMarkAsRead(notification);
        }
        if (notification.link) {
            // Special case for messages, navigate to communication page
            if (notification.type === 'message') {
                 navigate('/communication');
            } else {
                navigate(notification.link);
            }
        }
    };

    const handleMarkAllClick = (e) => {
        e.stopPropagation();
        onMarkAllAsRead();
    };
    
    const sortedNotifications = useMemo(() => {
        return [...notifications].sort((a, b) => (b.timestamp?.toDate() || 0) - (a.timestamp?.toDate() || 0));
    }, [notifications]);

    // The IconButton is now in the Layout component. This component is only the Menu.
    return (
        <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: { width: 360, maxHeight: 400, overflow: 'auto' },
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
                <Typography variant="h6">{title}</Typography>
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
    );
}
// --- END: Component updated ---

export default Notifications;
