// src/portals/student/MyBadges.jsx
import React, { useMemo } from 'react';
import { Container, Paper, Typography, Grid, Box, Tooltip, CircularProgress, Avatar, Divider, List, ListItem, ListItemText } from '@mui/material';
import { keyframes } from '@mui/system';
import dayjs from 'dayjs';

// Animation for newly earned badges
const tadaAnimation = keyframes`
  from { transform: scale3d(1, 1, 1); }
  10%, 20% { transform: scale3d(0.9, 0.9, 0.9) rotate3d(0, 0, 1, -3deg); }
  30%, 50%, 70%, 90% { transform: scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg); }
  40%, 60%, 80% { transform: scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, -3deg); }
  to { transform: scale3d(1, 1, 1); }
`;

// List of all available badges in the system
export const allBadges = [
    {
        id: 'high_flyer',
        title: 'Αετομάτης',
        description: 'Πέτυχες βαθμολογία 19 ή μεγαλύτερη σε μια αξιολόγηση!',
        icon: 'fas fa-rocket',
        color: '#e53935',
        xp: 50, // <-- XP Value
    },
    {
        id: 'perfect_attendance_month',
        title: 'Πάντα Παρών!',
        description: 'Συμπλήρωσες 30 συνεχόμενες ημέρες χωρίς καμία αδικαιολόγητη απουσία.',
        icon: 'fas fa-calendar-check',
        color: '#1e88e5',
        xp: 100,
    },
    {
        id: 'subject_master',
        title: 'Ειδήμων του Μαθήματος',
        description: 'Ο μέσος όρος σου σε ένα μάθημα ξεπέρασε το 18!',
        icon: 'fas fa-crown',
        color: '#fdd835',
        xp: 150,
    },
    {
        id: 'consistent_performer',
        title: 'Σταθερή Αξία',
        description: 'Ο γενικός μέσος όρος σου είναι πάνω από 15 (με τουλάχιστον 5 βαθμούς).',
        icon: 'fas fa-chart-line',
        color: '#43a047',
        xp: 75,
    },
    {
        id: 'comeback_king',
        title: 'Η Μεγάλη Επιστροφή',
        description: 'Πέτυχες βαθμολογία τουλάχιστον 5 μονάδες υψηλότερη από την προηγούμενη στο ίδιο μάθημα!',
        icon: 'fas fa-chart-line',
        color: '#ff7043',
        xp: 40,
    },
    {
        id: 'marathon_runner',
        title: 'Μαραθωνοδρόμος',
        description: 'Σημείωσες βαθμό πάνω από 15 σε τρεις συνεχόμενες αξιολογήσεις στο ίδιο μάθημα.',
        icon: 'fas fa-running',
        color: '#26a69a',
        xp: 60,
    },
    {
        id: 'team_player',
        title: 'Ομαδικός Παίκτης',
        description: 'Συμμετείχες σε ομαδικό Project με βαθμολογία πάνω από 17.',
        icon: 'fas fa-users',
        color: '#ab47bc',
        xp: 30,
    },
    {
        id: 'active_citizen',
        title: 'Ενεργός Πολίτης',
        description: 'Η συμμετοχή σου στην τάξη βαθμολογήθηκε με πάνω από 18!',
        icon: 'fas fa-comment-dots',
        color: '#5c6bc0',
        xp: 20,
    },
    {
        id: 'on_time_submitter',
        title: 'Πάντα στην Ώρα μου!',
        description: 'Υπέβαλες μια εργασία τουλάχιστον 2 ημέρες πριν τη λήξη της προθεσμίας.',
        icon: 'fas fa-clock',
        color: '#66bb6a',
        xp: 10,
    },
    {
        id: 'explorer',
        title: 'Εξερευνητής',
        description: 'Κατέβασες πάνω από 10 διαφορετικά αρχεία από το "Υλικό Μαθημάτων".',
        icon: 'fas fa-compass',
        color: '#78909c',
        xp: 15,
    }
];

const BadgeTooltipContent = ({ badge }) => {
    if (!badge.isEarned) {
        return <Typography variant="caption">{badge.description} (+{badge.xp} XP)</Typography>;
    }
    return (
        <Box>
            <Typography sx={{ fontWeight: 'bold', mb: 1 }}>{badge.title} ({badge.count} φορές)</Typography>
            <List dense sx={{ p: 0 }}>
                {badge.allInstances.slice(0, 5).map(instance => (
                    <ListItem key={instance.id} sx={{ p: 0 }}>
                        <ListItemText 
                            primary={`- ${instance.earnedAt && instance.earnedAt.toDate ? dayjs(instance.earnedAt.toDate()).format('DD/MM/YYYY') : '...'}`} 
                            secondary={instance.details}
                        />
                    </ListItem>
                ))}
                {badge.allInstances.length > 5 && <ListItemText secondary="..." />}
            </List>
        </Box>
    );
};

const Badge = ({ badge }) => (
    <Tooltip title={<BadgeTooltipContent badge={badge} />} placement="top" arrow>
        <Paper
            elevation={badge.isEarned ? 8 : 1}
            sx={{
                p: 3,
                textAlign: 'center',
                opacity: badge.isEarned ? 1 : 0.4,
                filter: badge.isEarned ? 'none' : 'grayscale(80%)',
                transition: 'all 0.3s ease',
                transform: badge.isEarned ? 'scale(1.0)' : 'scale(0.95)',
                animation: badge.isEarned && badge.isNew ? `${tadaAnimation} 1s ease` : 'none',
                position: 'relative',
                '&:hover': {
                    transform: 'scale(1.05)',
                    boxShadow: 12,
                },
            }}
        >
            {badge.isEarned && badge.count > 0 && (
                <Avatar sx={{
                    position: 'absolute', top: 8, right: 8,
                    width: 28, height: 28,
                    bgcolor: 'secondary.main', color: 'white',
                    border: '2px solid white',
                    fontSize: '0.8rem', fontWeight: 'bold'
                }}>
                    {badge.count}
                </Avatar>
            )}
            <Box
                sx={{
                    width: 80, height: 80, borderRadius: '50%',
                    bgcolor: badge.isEarned ? badge.color : 'grey.300',
                    color: '#fff', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', mx: 'auto', mb: 2, fontSize: '2.5rem',
                }}
            >
                <i className={badge.icon}></i>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{badge.title}</Typography>
            <Typography variant="body2" color="text.secondary">
                +{badge.xp} XP
            </Typography>
        </Paper>
    </Tooltip>
);

function MyBadges({ earnedBadges, loading }) {
    
    const badgesToDisplay = useMemo(() => {
        const earnedGrouped = earnedBadges.reduce((acc, b) => {
            if (!acc[b.badgeId]) {
                acc[b.badgeId] = [];
            }
            acc[b.badgeId].push(b);
            return acc;
        }, {});

        return allBadges.map(badgeDef => {
            const earnedInstances = (earnedGrouped[badgeDef.id] || []).sort((a, b) => {
                const dateA = a.earnedAt?.toDate ? a.earnedAt.toDate().getTime() : 0;
                const dateB = b.earnedAt?.toDate ? b.earnedAt.toDate().getTime() : 0;
                return dateB - dateA;
            });
            const isEarned = earnedInstances.length > 0;
            
            return {
                ...badgeDef,
                isEarned,
                count: earnedInstances.length,
                allInstances: earnedInstances
            };
        });
    }, [earnedBadges]);

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    Τα Παράσημά μου
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                    Ξεκλείδωσε επιτεύγματα καθώς προοδεύεις! Πέρνα τον κέρσορα πάνω από ένα κλειδωμένο παράσημο για να δεις πώς μπορείς να το κερδίσεις.
                </Typography>
                <Grid container spacing={3}>
                    {badgesToDisplay.map(badge => (
                        <Grid item xs={12} sm={6} md={3} key={badge.id}>
                            <Badge badge={badge} />
                        </Grid>
                    ))}
                </Grid>
            </Paper>
        </Container>
    );
}

export default MyBadges;
