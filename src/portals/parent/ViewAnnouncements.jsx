// src/portals/parent/ViewAnnouncements.jsx
import React, { useMemo } from 'react';
import {
    Container, Paper, Typography, List, ListItem, ListItemText, CircularProgress
} from '@mui/material';
import dayjs from 'dayjs';

function ViewAnnouncements({ announcements, loading }) {

    const sortedAnnouncements = useMemo(() => {
        if (!announcements) return [];
        return [...announcements].sort((a, b) => {
            const dateA = a.createdAt?.toDate() || 0;
            const dateB = b.createdAt?.toDate() || 0;
            return dateB - dateA;
        });
    }, [announcements]);

    if (loading) {
        return <Container sx={{ mt: 4, textAlign: 'center' }}><CircularProgress /></Container>;
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                <Typography variant="h4" component="h1" sx={{ color: 'primary.main', fontWeight: 'bold', mb: 3 }}>
                    Ανακοινώσεις
                </Typography>

                {sortedAnnouncements.length === 0 ? (
                    <Typography sx={{ textAlign: 'center', my: 4, color: 'text.secondary' }}>
                        Δεν υπάρχουν ανακοινώσεις.
                    </Typography>
                ) : (
                    <List>
                        {sortedAnnouncements.map(ann => (
                            <ListItem
                                key={ann.id}
                                divider
                            >
                                <ListItemText
                                    primary={ann.title}
                                    secondary={`Δημοσιεύτηκε: ${ann.createdAt ? dayjs(ann.createdAt.toDate()).format('DD/MM/YYYY HH:mm') : '...'}`}
                                />
                            </ListItem>
                        ))}
                    </List>
                )}
            </Paper>
        </Container>
    );
}

export default ViewAnnouncements;
