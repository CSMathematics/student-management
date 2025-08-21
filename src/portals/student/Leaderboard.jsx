// src/portals/student/Leaderboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { Box, Container, Paper, Typography, List, ListItem, ListItemAvatar, Avatar, ListItemText, Divider, CircularProgress, Tabs, Tab, Tooltip } from '@mui/material';
import { allBadges } from './MyBadges.jsx';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import dayjs from 'dayjs';

const levels = [
    { level: 1, title: "Νέος Μαθητής", xpRequired: 0 },
    { level: 2, title: "Ελπιδοφόρος Ακαδημαϊκός", xpRequired: 100 },
    { level: 3, title: "Συνεπής Μελετητής", xpRequired: 250 },
    { level: 4, title: "Ανερχόμενο Αστέρι", xpRequired: 500 },
    { level: 5, title: "Σοφός της Τάξης", xpRequired: 1000 },
];

// Define styles for avatar borders
const borderStyles = {
    'border_bronze': '3px solid #cd7f32',
    'border_silver': '3px solid #c0c0c0',
    'border_gold': '3px solid #ffd700',
};

function Leaderboard({ db, appId, selectedYear, studentData }) {
    const [rankings, setRankings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState('all_time');

    const badgeXpMap = useMemo(() => new Map(allBadges.map(b => [b.id, b.xp])), []);

    useEffect(() => {
        if (!db || !appId || !selectedYear) {
            setLoading(false);
            return;
        }

        const fetchLeaderboardData = async () => {
            setLoading(true);
            try {
                const yearPath = `artifacts/${appId}/public/data/academicYears/${selectedYear}`;
                const studentsQuery = query(collection(db, `${yearPath}/students`));
                const studentsSnapshot = await getDocs(studentsQuery);
                const allStudents = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const studentPromises = allStudents.map(async (student) => {
                    const badgesQuery = query(collection(db, `${yearPath}/students/${student.id}/badges`));
                    const badgesSnapshot = await getDocs(badgesQuery);
                    const earnedBadges = badgesSnapshot.docs.map(doc => doc.data());
                    
                    const totalXp = earnedBadges.reduce((sum, b) => sum + (badgeXpMap.get(b.badgeId) || 0), 0);

                    let currentLevel = levels[0];
                    for (let i = levels.length - 1; i >= 0; i--) {
                        if (totalXp >= levels[i].xpRequired) {
                            currentLevel = levels[i];
                            break;
                        }
                    }
                    
                    return {
                        ...student,
                        totalXp,
                        level: currentLevel.level,
                        levelTitle: currentLevel.title,
                        badges: earnedBadges,
                    };
                });

                const studentsWithXp = await Promise.all(studentPromises);
                setRankings(studentsWithXp);
            } catch (error) {
                console.error("Error fetching leaderboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboardData();
    }, [db, appId, selectedYear, badgeXpMap]);

    const filteredAndSortedRankings = useMemo(() => {
        let filtered = [...rankings];
        const now = dayjs();

        if (timeFilter === 'this_week') {
            filtered = filtered.map(student => {
                const recentXp = student.badges
                    .filter(b => dayjs(b.earnedAt.toDate()).isAfter(now.subtract(7, 'day')))
                    .reduce((sum, b) => sum + (badgeXpMap.get(b.badgeId) || 0), 0);
                return { ...student, displayXp: recentXp };
            });
        } else if (timeFilter === 'this_month') {
            filtered = filtered.map(student => {
                const recentXp = student.badges
                    .filter(b => dayjs(b.earnedAt.toDate()).isAfter(now.subtract(30, 'day')))
                    .reduce((sum, b) => sum + (badgeXpMap.get(b.badgeId) || 0), 0);
                return { ...student, displayXp: recentXp };
            });
        } else {
            filtered = filtered.map(student => ({ ...student, displayXp: student.totalXp }));
        }

        return filtered.sort((a, b) => b.displayXp - a.displayXp);
    }, [rankings, timeFilter, badgeXpMap]);

    const getRankColor = (rank) => {
        if (rank === 1) return '#FFD700';
        if (rank === 2) return '#C0C0C0';
        if (rank === 3) return '#CD7F32';
        return 'inherit';
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
    }

    return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    Πίνακας Κατάταξης
                </Typography>
                <Tabs value={timeFilter} onChange={(e, newValue) => setTimeFilter(newValue)} sx={{ mb: 2 }}>
                    <Tab label="Συνολικά" value="all_time" />
                    <Tab label="Αυτόν τον Μήνα" value="this_month" />
                    <Tab label="Αυτή την Εβδομάδα" value="this_week" />
                </Tabs>
                <List>
                    {filteredAndSortedRankings.map((student, index) => {
                        const rank = index + 1;
                        const isCurrentUser = student.id === studentData.id;
                        const activeBorder = student.activeItems?.avatarBorder;
                        const activeTitle = student.activeItems?.title;

                        return (
                            <React.Fragment key={student.id}>
                                <ListItem sx={{ bgcolor: isCurrentUser ? 'action.hover' : 'transparent', borderRadius: '8px' }}>
                                    <ListItemText primaryTypographyProps={{ width: '40px', fontWeight: 'bold', fontSize: '1.2rem', color: getRankColor(rank) }}>
                                        {rank}
                                    </ListItemText>
                                    <ListItemAvatar>
                                        <Box sx={{ border: borderStyles[activeBorder], borderRadius: '50%', p: '2px', display: 'inline-block' }}>
                                            <Avatar src={student.profileImageUrl}>{student.firstName?.charAt(0)}{student.lastName?.charAt(0)}</Avatar>
                                        </Box>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={
                                            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography>{`${student.firstName} ${student.lastName}`}</Typography>
                                                {activeTitle && <Chip label={activeTitle} size="small" color="secondary" />}
                                            </Box>
                                        }
                                        secondary={`Level ${student.level}: ${student.levelTitle}`}
                                    />
                                    <Box sx={{ textAlign: 'right' }}>
                                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{student.displayXp} XP</Typography>
                                    </Box>
                                </ListItem>
                                <Divider component="li" />
                            </React.Fragment>
                        );
                    })}
                </List>
            </Paper>
        </Container>
    );
}

export default Leaderboard;
