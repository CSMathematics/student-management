// src/portals/student/MyBadges.jsx
import React, { useMemo, useEffect } from 'react';
import { Container, Paper, Typography, Grid, Box, Tooltip, CircularProgress, Avatar, List, ListItem, ListItemText } from '@mui/material';
import { keyframes } from '@mui/system';
import dayjs from 'dayjs';
import { writeBatch, doc } from 'firebase/firestore';

// Animation for new badges
const tadaAnimation = keyframes`
  from { transform: scale3d(1, 1, 1); }
  10%, 20% { transform: scale3d(0.9, 0.9, 0.9) rotate3d(0, 0, 1, -3deg); }
  30%, 50%, 70%, 90% { transform: scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg); }
  40%, 60%, 80% { transform: scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, -3deg); }
  to { transform: scale3d(1, 1, 1); }
`;

// Definition of all available badges in the platform
export const allBadges = [
    {
        id: 'high_flyer',
        title: 'Αετομάτης',
        description: 'Πέτυχες βαθμολογία 19 ή μεγαλύτερη σε μια αξιολόγηση!',
        icon: 'fas fa-rocket',
        color: '#e53935',
        xp: 50,
        category: 'Ακαδημαϊκή Επίδοση'
    },
    {
        id: 'perfect_attendance_month',
        title: 'Πάντα Παρών!',
        description: 'Συμπλήρωσες 30 συνεχόμενες ημέρες χωρίς καμία αδικαιολόγητη απουσία.',
        icon: 'fas fa-calendar-check',
        color: '#1e88e5',
        xp: 100,
        category: 'Συνέπεια & Επιμέλεια'
    },
    {
        id: 'subject_master',
        title: 'Ειδήμων του Μαθήματος',
        description: 'Ο μέσος όρος σου σε ένα μάθημα ξεπέρασε το 18!',
        icon: 'fas fa-crown',
        color: '#fdd835',
        xp: 150,
        category: 'Ακαδημαϊκή Επίδοση'
    },
    {
        id: 'consistent_performer',
        title: 'Σταθερή Αξία',
        description: 'Ο γενικός μέσος όρος σου είναι πάνω από 15 (με τουλάχιστον 5 βαθμούς).',
        icon: 'fas fa-chart-line',
        color: '#43a047',
        xp: 75,
        category: 'Γενικά'
    },
    {
        id: 'comeback_king',
        title: 'Η Μεγάλη Επιστροφή',
        description: 'Πέτυχες βαθμολογία τουλάχιστον 5 μονάδες υψηλότερη από την προηγούμενη στο ίδιο μάθημα!',
        icon: 'fas fa-chart-line',
        color: '#ff7043',
        xp: 40,
        category: 'Ακαδημαϊκή Επίδοση'
    },
    {
        id: 'marathon_runner',
        title: 'Μαραθωνοδρόμος',
        description: 'Σημείωσες βαθμό πάνω από 15 σε τρεις συνεχόμενες αξιολογήσεις στο ίδιο μάθημα.',
        icon: 'fas fa-running',
        color: '#26a69a',
        xp: 60,
        category: 'Ακαδημαϊκή Επίδοση'
    },
    {
        id: 'team_player',
        title: 'Ομαδικός Παίκτης',
        description: 'Συμμετείχες σε ομαδικό Project με βαθμολογία πάνω από 17.',
        icon: 'fas fa-users',
        color: '#ab47bc',
        xp: 30,
        category: 'Γενικά'
    },
    {
        id: 'active_citizen',
        title: 'Ενεργός Πολίτης',
        description: 'Η συμμετοχή σου στην τάξη βαθμολογήθηκε με πάνω από 18!',
        icon: 'fas fa-comment-dots',
        color: '#5c6bc0',
        xp: 20,
        category: 'Γενικά'
    },
    {
        id: 'on_time_submitter',
        title: 'Πάντα στην Ώρα μου!',
        description: 'Υπέβαλες μια εργασία τουλάχιστον 2 ημέρες πριν τη λήξη της προθεσμίας.',
        icon: 'fas fa-clock',
        color: '#5ba85f',
        xp: 10,
        category: 'Συνέπεια & Επιμέλεια'
    },
    {
        id: 'explorer',
        title: 'Εξερευνητής',
        description: 'Κατέβασες πάνω από 10 διαφορετικά αρχεία από το "Υλικό Μαθημάτων".',
        icon: 'fas fa-compass',
        color: '#78909c',
        xp: 15,
        category: 'Εξερεύνηση & Περιέργεια'
    },
    {
        id: 'flawless_victory',
        title: 'Άριστος!',
        description: 'Πέτυχες τέλεια βαθμολογία 20/20 σε μια αξιολόγηση.',
        icon: 'fas fa-medal',
        color: '#FFD700',
        xp: 100,
        category: 'Ακαδημαϊκή Επίδοση'
    },
    {
        id: 'knowledge_hat_trick',
        title: 'Χατ-τρικ Γνώσης',
        description: 'Πέτυχες βαθμολογία 18+ σε 3 διαφορετικά μαθήματα μέσα σε έναν μήνα.',
        icon: 'fas fa-hat-wizard',
        color: '#8e44ad',
        xp: 80,
        category: 'Ακαδημαϊκή Επίδοση'
    },
    {
        id: 'early_bird',
        title: 'Πρωινό Πουλί',
        description: 'Υπέβαλες 5 εργασίες τουλάχιστον 24 ώρες πριν τη λήξη της προθεσμίας.',
        icon: 'fas fa-kiwi-bird',
        color: '#1abc9c',
        xp: 25,
        category: 'Συνέπεια & Επιμέλεια'
    },
    {
        id: 'iron_will',
        title: 'Ατσαλένια Θέληση',
        description: 'Μηδέν αδικαιολόγητες απουσίες για ένα ολόκληρο τρίμηνο.',
        icon: 'fas fa-shield-alt',
        color: '#3498db',
        xp: 200,
        category: 'Συνέπεια & Επιμέλεια'
    },
    {
        id: 'homework_hero',
        title: 'Ήρωας των Εργασιών',
        description: 'Ολοκλήρωσες όλες τις εργασίες για το σπίτι σε ένα μάθημα για έναν ολόκληρο μήνα.',
        icon: 'fas fa-book-reader',
        color: '#2ecc71',
        xp: 50,
        category: 'Συνέπεια & Επιμέλεια'
    },
    {
        id: 'librarian',
        title: 'Βιβλιοφάγος',
        description: 'Κατέβασες πάνω από 20 αρχεία από τη Βιβλιοθήκη Υλικού.',
        icon: 'fas fa-book-journal-whills',
        color: '#795548',
        xp: 30,
        category: 'Εξερεύνηση & Περιέργεια'
    },
    {
        id: 'planner',
        title: 'Σχεδιαστής',
        description: 'Έλεγξες το ημερολόγιό σου για 5 συνεχόμενες ημέρες.',
        icon: 'fas fa-calendar-day',
        color: '#f39c12',
        xp: 15,
        category: 'Εξερεύνηση & Περιέργεια'
    },
    {
        id: 'fully_informed',
        title: 'Πλήρης Ενημέρωση',
        description: 'Διάβασες όλες τις ανακοινώσεις του σχολείου μέσα σε 24 ώρες από τη δημοσίευσή τους για έναν μήνα.',
        icon: 'fas fa-broadcast-tower',
        color: '#e74c3c',
        xp: 20,
        category: 'Εξερεύνηση & Περιέργεια'
    }
];

// Tooltip content component
const BadgeTooltipContent = ({ badge }) => {
    if (!badge.isEarned) {
        return <Typography variant="caption">{badge.description} (+{badge.xp} XP)</Typography>;
    }
    return (
        <Box>
            <Typography sx={{ fontWeight: 'bold', mb: 1 }}>{badge.title} ({badge.count} φορές)</Typography>
            <List dense sx={{ pl: 0 }}>
                {badge.allInstances.slice(0, 5).map(instance => (
                    <ListItem key={instance.id} sx={{ p: 0,marginLeft:-2 }}>
                        <ListItemText 
                            primary={`- ${instance.earnedAt && instance.earnedAt.toDate ? dayjs(instance.earnedAt.toDate()).format('DD/MM/YYYY') : '...'}`} 
                            secondary={instance.details}
                            sx={{color:'white',
                                '& .MuiListItemText-secondary': { color: 'white'}
                            }}
                        />
                    </ListItem>
                ))}
                {badge.allInstances.length > 5 && <ListItemText secondary="..." />}
            </List>
        </Box>
    );
};

// Corrected Badge component
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
                animation: badge.isEarned && badge.allInstances.some(b => !b.seenByUser) ? `${tadaAnimation} 1s ease` : 'none',
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
                    fontSize: '0.9rem',
                    fontWeight: 'bold'
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

// Main component for the MyBadges page
function MyBadges({ earnedBadges, loading, db, appId, selectedYear, studentData }) {
    
    // Effect to mark unseen badges as "seen"
    useEffect(() => {
        if (!earnedBadges || earnedBadges.length === 0 || !studentData?.id || !selectedYear) return;

        const unreadBadges = earnedBadges.filter(b => b.seenByUser === false);

        if (unreadBadges.length > 0) {
            const batch = writeBatch(db);
            const badgeCollectionPath = `artifacts/${appId}/public/data/academicYears/${selectedYear}/students/${studentData.id}/badges`;
            
            unreadBadges.forEach(badge => {
                const badgeRef = doc(db, badgeCollectionPath, badge.id);
                batch.update(badgeRef, { seenByUser: true });
            });

            batch.commit().catch(error => {
                console.error("Error marking badges as seen:", error);
            });
        }
    }, [earnedBadges, db, appId, selectedYear, studentData]);

    // Memoized calculation to process and group badges for display
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

    // Memoized calculation to group badges by category
    const groupedBadgesForDisplay = useMemo(() => {
        const grouped = {};
        
        badgesToDisplay.forEach(badge => {
            const category = badge.category || 'Γενικά';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(badge);
        });
        return grouped;
    }, [badgesToDisplay]);

    // Loading state
    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
    }

    // Render the page
    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    Τα Παράσημά μου
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                    Ξεκλείδωσε επιτεύγματα καθώς προοδεύεις! Πέρνα τον κέρσορα πάνω από ένα κλειδωμένο παράσημο για να δεις πώς μπορείς να το κερδίσεις.
                </Typography>
                
                {Object.entries(groupedBadgesForDisplay).map(([category, badges]) => (
                    <Box key={category} sx={{mb: 4}}>
                        <Typography variant="h5" sx={{mb: 2}}>{category}</Typography>
                        <Grid container spacing={3}>
                            {badges.map(badge => (
                                <Grid item xs={12} sm={6} md={3} key={badge.id}>
                                    <Badge badge={badge} />
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                ))}
            </Paper>
        </Container>
    );
}

export default MyBadges;
