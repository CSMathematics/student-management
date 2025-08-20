// src/portals/StudentPortal.jsx
import { React, useState, useEffect, useMemo } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { Box, CircularProgress, Typography, Grid, Paper, List, ListItem, ListItemIcon, ListItemText, Button, Divider, LinearProgress } from '@mui/material';
import { Event as EventIcon, Grade as GradeIcon, Campaign as CampaignIcon, Assignment as AssignmentIcon, EmojiEvents as BadgeIcon, MilitaryTech as LevelIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import { useAcademicYear } from '../context/AcademicYearContext.jsx';

// Εισαγωγή των σελίδων του μαθητή
import Communication from '../pages/Communication.jsx';
import MyGradesAndAbsences from './student/MyGradesAndAbsences.jsx';
import MyAssignments from './student/MyAssignments.jsx';
import MyMaterials from './student/MyMaterials.jsx';
import MyProfile from './student/MyProfile.jsx';
import StudentCalendar from './student/StudentCalendar.jsx';
import MyBadges, { allBadges } from './student/MyBadges.jsx';
import MyCourses from './student/MyCourses.jsx';

const levels = [
    { level: 1, title: "Νέος Μαθητής", xpRequired: 0 },
    { level: 2, title: "Ελπιδοφόρος Ακαδημαϊκός", xpRequired: 100 },
    { level: 3, title: "Συνεπής Μελετητής", xpRequired: 250 },
    { level: 4, title: "Ανερχόμενο Αστέρι", xpRequired: 500 },
    { level: 5, title: "Σοφός της Τάξης", xpRequired: 1000 },
];

const StudentDashboard = ({ studentData, enrolledClassrooms, grades, announcements, assignments, earnedBadges, levelInfo }) => {
    const navigate = useNavigate();
    const uniqueEarnedCount = useMemo(() => new Set(earnedBadges.map(b => b.badgeId)).size, [earnedBadges]);

    const todaysClasses = useMemo(() => {
        if (!enrolledClassrooms) return [];
        const today = dayjs().format('dddd');
        return enrolledClassrooms
            .flatMap(c => (c.schedule || []).map(s => ({ ...s, classroomName: c.classroomName, subject: c.subject })))
            .filter(s => s.day.toLowerCase() === today.toLowerCase())
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
    }, [enrolledClassrooms]);

    const recentGrades = useMemo(() => {
        if (!grades) return [];
        return [...grades]
            .sort((a, b) => b.date.toDate() - a.date.toDate())
            .slice(0, 5);
    }, [grades]);
        
    const upcomingAssignments = useMemo(() => {
        if (!assignments) return [];
        const today = dayjs().startOf('day');
        return [...assignments]
            .filter(a => dayjs(a.dueDate.toDate()).isSameOrAfter(today))
            .sort((a, b) => a.dueDate.toDate() - b.dueDate.toDate())
            .slice(0, 3);
    }, [assignments]);

    return (
        <Box>
            <Typography variant="h4" sx={{ mb: 3 }}>Καλώς ήρθες, {studentData?.firstName}!</Typography>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', background: 'linear-gradient(45deg, #1e88e5 30%, #64b5f6 90%)', color: 'white' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <LevelIcon />
                                <Typography variant="h6">Η Πρόοδός σου</Typography>
                            </Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{levelInfo.currentLevel.title}</Typography>
                        </Box>
                        <Box sx={{ my: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="body2">Level {levelInfo.currentLevel.level}</Typography>
                                <Typography variant="body2">{levelInfo.totalXp} / {levelInfo.nextLevel.xpRequired} XP</Typography>
                            </Box>
                            <LinearProgress
                                variant="determinate"
                                value={levelInfo.progressPercentage}
                                sx={{ height: 10, borderRadius: 5, '& .MuiLinearProgress-bar': { backgroundColor: '#fdd835' }, backgroundColor: 'rgba(255,255,255,0.3)' }}
                            />
                        </Box>
                        <Button size="small" onClick={() => navigate('/my-badges')} sx={{ alignSelf: 'flex-end', color: 'white' }}>
                            Δες τα παράσημά σου
                        </Button>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>Η Συλλογή σου</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexGrow: 1 }}>
                            <BadgeIcon sx={{ fontSize: 60, color: 'warning.main' }} />
                            <Box>
                                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{uniqueEarnedCount} / {allBadges.length}</Typography>
                                <Typography color="text.secondary">Τύποι Παρασήμων</Typography>
                            </Box>
                            <Divider orientation="vertical" flexItem />
                             <Box>
                                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{earnedBadges.length}</Typography>
                                <Typography color="text.secondary">Σύνολο Κερδισμένων</Typography>
                            </Box>
                        </Box>
                        <Button size="small" onClick={() => navigate('/my-badges')} sx={{ mt: 1, alignSelf: 'flex-end' }}>
                            Δες τη συλλογή
                        </Button>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>Οι πιο πρόσφατοι βαθμοί σου</Typography>
                        <List dense sx={{ flexGrow: 1 }}>
                            {recentGrades.length > 0 ? recentGrades.map(grade => (
                                <ListItem key={grade.id}>
                                    <ListItemIcon><GradeIcon color="secondary" /></ListItemIcon>
                                    <ListItemText
                                        primary={`${grade.subject}: ${grade.grade}`}
                                        secondary={`${grade.type} - ${dayjs(grade.date.toDate()).format('DD/MM/YYYY')}`}
                                    />
                                </ListItem>
                            )) : <Typography sx={{ p: 2 }}>Δεν υπάρχουν καταχωρημένοι βαθμοί.</Typography>}
                        </List>
                        <Button size="small" onClick={() => navigate('/my-grades')} sx={{ mt: 1, alignSelf: 'flex-end' }}>Όλοι οι Βαθμοί</Button>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>Επερχόμενες Εργασίες</Typography>
                        <List dense sx={{ flexGrow: 1 }}>
                            {upcomingAssignments.length > 0 ? upcomingAssignments.map(item => (
                                <ListItem key={item.id}>
                                    <ListItemIcon><AssignmentIcon color="info" /></ListItemIcon>
                                    <ListItemText
                                        primary={item.title}
                                        secondary={`Προθεσμία: ${dayjs(item.dueDate.toDate()).format('dddd, DD/MM')}`}
                                    />
                                </ListItem>
                            )) : <Typography sx={{ p: 2 }}>Δεν έχεις επερχόμενες εργασίες.</Typography>}
                        </List>
                        <Button size="small" onClick={() => navigate('/my-assignments')} sx={{ mt: 1, alignSelf: 'flex-end' }}>Όλες οι εργασίες</Button>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>Το σημερινό σου πρόγραμμα</Typography>
                        <List dense sx={{ flexGrow: 1 }}>
                            {todaysClasses.length > 0 ? todaysClasses.map((item, index) => (
                                <ListItem key={index}>
                                    <ListItemIcon><EventIcon color="primary" /></ListItemIcon>
                                    <ListItemText
                                        primary={`${item.startTime} - ${item.endTime}: ${item.subject}`}
                                        secondary={item.classroomName}
                                    />
                                </ListItem>
                            )) : <Typography sx={{ p: 2 }}>Δεν έχεις μαθήματα σήμερα.</Typography>}
                        </List>
                        <Button size="small" onClick={() => navigate('/my-schedule')} sx={{ mt: 1, alignSelf: 'flex-end' }}>Πλήρες Πρόγραμμα</Button>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};


function StudentPortal({ db, appId, user, userProfile }) {
    const { selectedYear, loadingYears } = useAcademicYear();
    const [studentData, setStudentData] = useState(null);
    const [enrolledClassrooms, setEnrolledClassrooms] = useState([]);
    const [grades, setGrades] = useState([]);
    const [absences, setAbsences] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [allAssignments, setAllAssignments] = useState([]);
    const [allDailyLogs, setAllDailyLogs] = useState([]);
    const [allCourses, setAllCourses] = useState([]);
    const [earnedBadges, setEarnedBadges] = useState([]);
    const [classmates, setClassmates] = useState([]);
    const [allTeachers, setAllTeachers] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);

    const studentId = userProfile?.profileId;

    const levelInfo = useMemo(() => {
        const badgeXpMap = new Map(allBadges.map(b => [b.id, b.xp]));
        const totalXp = earnedBadges.reduce((sum, b) => sum + (badgeXpMap.get(b.badgeId) || 0), 0);
        let currentLevel = levels[0];
        for (let i = levels.length - 1; i >= 0; i--) {
            if (totalXp >= levels[i].xpRequired) {
                currentLevel = levels[i];
                break;
            }
        }
        const nextLevel = levels.find(l => l.level === currentLevel.level + 1) || { ...currentLevel, xpRequired: currentLevel.xpRequired };
        const xpForCurrentLevel = currentLevel.xpRequired;
        const xpForNextLevel = nextLevel.xpRequired;
        const progressPercentage = xpForNextLevel === xpForCurrentLevel ? 100 : ((totalXp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;
        return { totalXp, currentLevel, nextLevel, progressPercentage };
    }, [earnedBadges]);

    useEffect(() => {
        if (!db || !studentId || !selectedYear || grades.length === 0) return;
        const checkAndAwardBadges = async () => {
            const batch = writeBatch(db);
            let newBadgesAwarded = false;
            const badgeCollectionRef = collection(db, `artifacts/${appId}/public/data/academicYears/${selectedYear}/students/${studentId}/badges`);
            const earnedBadgeIds = new Set(earnedBadges.map(b => b.badgeId));
            const awardedSourceIds = new Set(earnedBadges.map(b => b.sourceId).filter(Boolean));
            const gradesBySubjectSorted = grades.reduce((acc, grade) => {
                if (!acc[grade.subject]) acc[grade.subject] = [];
                acc[grade.subject].push(grade);
                return acc;
            }, {});
            for (const subject in gradesBySubjectSorted) {
                gradesBySubjectSorted[subject].sort((a, b) => a.date.toDate() - b.date.toDate());
            }
            const repeatableBadgesConfig = [
                { id: 'high_flyer', condition: g => parseFloat(g.grade) >= 19, details: g => `Βαθμός ${g.grade} στα ${g.subject}` },
                { id: 'team_player', condition: g => g.type === 'project' && parseFloat(g.grade) > 17, details: g => `Βαθμός ${g.grade} σε project στα ${g.subject}` },
                { id: 'active_citizen', condition: g => g.type === 'participation' && parseFloat(g.grade) > 18, details: g => `Βαθμός ${g.grade} για συμμετοχή στα ${g.subject}` },
            ];
            repeatableBadgesConfig.forEach(config => {
                const newAchievements = grades.filter(g => !awardedSourceIds.has(g.id) && config.condition(g));
                newAchievements.forEach(grade => {
                    batch.set(doc(badgeCollectionRef), { badgeId: config.id, earnedAt: serverTimestamp(), details: config.details(grade), sourceId: grade.id });
                    newBadgesAwarded = true;
                });
            });
            for (const subject in gradesBySubjectSorted) {
                const subjectGrades = gradesBySubjectSorted[subject];
                if (subjectGrades.length >= 2) {
                    for (let i = 1; i < subjectGrades.length; i++) {
                        const currentGrade = subjectGrades[i];
                        const prevGrade = subjectGrades[i - 1];
                        if (!awardedSourceIds.has(currentGrade.id) && parseFloat(currentGrade.grade) >= parseFloat(prevGrade.grade) + 5) {
                            batch.set(doc(badgeCollectionRef), { badgeId: 'comeback_king', earnedAt: serverTimestamp(), details: `Από ${prevGrade.grade} σε ${currentGrade.grade} στα ${subject}`, sourceId: currentGrade.id });
                            newBadgesAwarded = true;
                        }
                    }
                }
            }
            if (!earnedBadgeIds.has('perfect_attendance_month')) {
                const thirtyDaysAgo = dayjs().subtract(30, 'days');
                const hasRecentAbsence = absences.some(a => a.status !== 'justified' && dayjs(a.date.toDate()).isAfter(thirtyDaysAgo));
                if (!hasRecentAbsence) {
                     batch.set(doc(badgeCollectionRef), { badgeId: 'perfect_attendance_month', earnedAt: serverTimestamp(), details: `30 ημέρες χωρίς αδικαιολόγητη απουσία` });
                     newBadgesAwarded = true;
                }
            }
            if (!earnedBadgeIds.has('subject_master')) {
                for (const subject in gradesBySubjectSorted) {
                    const subjectGrades = gradesBySubjectSorted[subject];
                    if (subjectGrades.length >= 3) {
                        const avg = subjectGrades.reduce((a, b) => a + parseFloat(b.grade), 0) / subjectGrades.length;
                        if (avg > 18) {
                            batch.set(doc(badgeCollectionRef), { badgeId: 'subject_master', earnedAt: serverTimestamp(), details: `Μ.Ο. ${avg.toFixed(2)} στο μάθημα ${subject}` });
                            newBadgesAwarded = true;
                            break;
                        }
                    }
                }
            }
            if (!earnedBadgeIds.has('consistent_performer') && grades.length >= 5) {
                const total = grades.reduce((sum, g) => sum + parseFloat(g.grade), 0);
                const overallAvg = total / grades.length;
                if (overallAvg > 15) {
                    batch.set(doc(badgeCollectionRef), { badgeId: 'consistent_performer', earnedAt: serverTimestamp(), details: `Συνολικός Μ.Ο. ${overallAvg.toFixed(2)}` });
                    newBadgesAwarded = true;
                }
            }
            if (!earnedBadgeIds.has('marathon_runner')) {
                let awarded = false;
                for (const subject in gradesBySubjectSorted) {
                    const subjectGrades = gradesBySubjectSorted[subject];
                    if (subjectGrades.length >= 3) {
                        for (let i = 0; i <= subjectGrades.length - 3; i++) {
                            const slice = subjectGrades.slice(i, i + 3);
                            if (slice.every(g => parseFloat(g.grade) > 15)) {
                                batch.set(doc(badgeCollectionRef), { badgeId: 'marathon_runner', earnedAt: serverTimestamp(), details: `3 σερί βαθμοί >15 στα ${subject}` });
                                newBadgesAwarded = true;
                                awarded = true;
                                break;
                            }
                        }
                    }
                    if (awarded) break;
                }
            }
            if (newBadgesAwarded) {
                try {
                    await batch.commit();
                } catch (error) {
                    console.error("Error awarding badges:", error);
                }
            }
        };
        checkAndAwardBadges();
    }, [db, studentId, selectedYear, grades, absences, earnedBadges]);


    useEffect(() => {
        if (!db || !appId || !studentId || !selectedYear) {
            if (!loadingYears) setLoading(false);
            return;
        }

        setLoading(true);
        // *** THE FIX IS HERE: Reset all states on year change ***
        setStudentData(null);
        setEnrolledClassrooms([]);
        setAllAssignments([]);
        setClassmates([]);
        setGrades([]);
        setAbsences([]);
        setAnnouncements([]);
        setAllDailyLogs([]);
        setAllCourses([]);
        setEarnedBadges([]);
        setAllTeachers([]);
        setSubmissions([]);
        
        const yearPath = `artifacts/${appId}/public/data/academicYears/${selectedYear}`;
        const studentRef = doc(db, `${yearPath}/students`, studentId);

        const unsubscribe = onSnapshot(studentRef, (doc) => {
            if (doc.exists()) {
                setStudentData({ id: doc.id, ...doc.data() });
            } else {
                setStudentData(null);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching student data:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [db, appId, studentId, selectedYear, loadingYears]);

    useEffect(() => {
        if (!studentData) return;

        const yearPath = `artifacts/${appId}/public/data/academicYears/${selectedYear}`;
        const unsubscribes = [];
        let isMounted = true;

        const enrolledClassroomIds = studentData.enrolledClassrooms || [];

        if (enrolledClassroomIds.length > 0) {
            const classroomsQuery = query(collection(db, `${yearPath}/classrooms`), where('__name__', 'in', enrolledClassroomIds));
            unsubscribes.push(onSnapshot(classroomsQuery, (snapshot) => {
                if (isMounted) {
                    setEnrolledClassrooms(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
                }
            }));
        } else {
            setEnrolledClassrooms([]);
        }

        const queries = {
            grades: query(collection(db, `${yearPath}/grades`), where("studentId", "==", studentId)),
            absences: query(collection(db, `${yearPath}/absences`), where("studentId", "==", studentId)),
            submissions: query(collection(db, `${yearPath}/submissions`), where("studentId", "==", studentId)),
            badges: query(collection(db, `${yearPath}/students/${studentId}/badges`)),
            announcements: query(collection(db, yearPath, 'announcements')),
            courses: query(collection(db, yearPath, 'courses')),
            teachers: query(collection(db, yearPath, 'teachers')),
            dailyLogs: query(collection(db, yearPath, 'dailyLogs')),
        };

        const setters = {
            grades: setGrades, absences: setAbsences, submissions: setSubmissions,
            badges: setEarnedBadges, announcements: setAnnouncements,
            courses: setAllCourses, teachers: setAllTeachers, dailyLogs: setAllDailyLogs
        };

        for (const [key, q] of Object.entries(queries)) {
            unsubscribes.push(onSnapshot(q, (snapshot) => {
                if (isMounted) setters[key](snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            }));
        }

        return () => { isMounted = false; unsubscribes.forEach(unsub => unsub()); };
    }, [studentData, selectedYear, db, appId]);

    useEffect(() => {
        if (enrolledClassrooms.length === 0) {
            setClassmates([]);
            setAllAssignments([]);
            return;
        }

        const yearPath = `artifacts/${appId}/public/data/academicYears/${selectedYear}`;
        const unsubscribes = [];
        let isMounted = true;

        const allClassmateIds = [...new Set(enrolledClassrooms.flatMap(c => c.enrolledStudents || []))];
        if (allClassmateIds.length > 0) {
            const studentsQuery = query(collection(db, `${yearPath}/students`), where('__name__', 'in', allClassmateIds));
            unsubscribes.push(onSnapshot(studentsQuery, (studentSnapshot) => {
                if (isMounted) setClassmates(studentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            }));
        } else {
            setClassmates([]);
        }

        const enrolledClassroomIds = enrolledClassrooms.map(c => c.id);
        const assignmentsQuery = query(collection(db, `${yearPath}/assignments`), where('classroomId', 'in', enrolledClassroomIds));
        unsubscribes.push(onSnapshot(assignmentsQuery, (snapshot) => {
            if (isMounted) setAllAssignments(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        }));
        
        return () => { isMounted = false; unsubscribes.forEach(unsub => unsub()); };
    }, [enrolledClassrooms, selectedYear, db, appId]);
    
    if (loading || loadingYears) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
    }
    
    if (!studentId) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="h5" color="error">Ο λογαριασμός σας δεν έχει συνδεθεί με προφίλ μαθητή.</Typography>
                <Typography>Παρακαλώ επικοινωνήστε με τη διαχείριση.</Typography>
            </Box>
        );
    }
    
    if (!studentData && !loading) {
        return (
            <Box sx={{ p: 3, textAlign: 'center', mt: 4 }}>
                <Paper sx={{p: 4, display: 'inline-block'}}>
                    <Typography variant="h6">Δεν βρέθηκαν δεδομένα</Typography>
                    <Typography color="text.secondary">
                        Δεν υπάρχει εγγραφή για εσάς στο ακαδημαϊκό έτος {selectedYear}.
                    </Typography>
                </Paper>
            </Box>
        );
    }
    
    const commonProps = { 
        db, appId, user, selectedYear,
        studentData, enrolledClassrooms, grades, absences, announcements,
        assignments: allAssignments,
        allDailyLogs,
        allCourses,
        earnedBadges, 
        levelInfo,
        classmates,
        allTeachers,
        submissions,
        loading
    };

    return (
        <Routes>
            <Route path="/" element={<StudentDashboard {...commonProps} />} />
            <Route path="/my-schedule" element={<StudentCalendar {...commonProps} />} />
            <Route path="/my-grades" element={<MyGradesAndAbsences {...commonProps} type="grades" />} />
            <Route path="/my-absences" element={<MyGradesAndAbsences {...commonProps} type="absences" />} />
            <Route path="/my-assignments" element={<MyAssignments {...commonProps} />} />
            <Route path="/my-materials" element={<MyMaterials {...commonProps} />} />
            <Route path="/my-profile" element={<MyProfile {...commonProps} />} />
            <Route path="/my-badges" element={<MyBadges {...commonProps} />} />
            <Route path="/my-courses" element={<MyCourses {...commonProps} />} />
            <Route path="/communication" element={
                <Communication 
                    db={db} 
                    appId={appId} 
                    userId={user.uid}
                    allStudents={[studentData, ...classmates]} 
                    classrooms={enrolledClassrooms}
                    allTeachers={allTeachers}
                />
            } />
        </Routes>
    );
}

export default StudentPortal;
