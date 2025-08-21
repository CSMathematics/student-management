// src/context/StudentDataContext.jsx
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { useAcademicYear } from './AcademicYearContext.jsx';
import { allBadges } from '../portals/student/MyBadges.jsx';

const StudentDataContext = createContext();

export const useStudentData = () => useContext(StudentDataContext);

const levels = [
    { level: 1, title: "Νέος Μαθητής", xpRequired: 0 },
    { level: 2, title: "Ελπιδοφόρος Ακαδημαϊκός", xpRequired: 100 },
    { level: 3, title: "Συνεπής Μελετητής", xpRequired: 250 },
    { level: 4, title: "Ανερχόμενο Αστέρι", xpRequired: 500 },
    { level: 5, title: "Σοφός της Τάξης", xpRequired: 1000 },
];

export const StudentDataProvider = ({ children, db, appId, user, userProfile }) => {
    const { selectedYear, loadingYears } = useAcademicYear();
    const [studentData, setStudentData] = useState(null);
    const [enrolledClassrooms, setEnrolledClassrooms] = useState([]);
    const [grades, setGrades] = useState([]);
    const [absences, setAbsences] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [dailyLogs, setDailyLogs] = useState([]);
    const [allCourses, setAllCourses] = useState([]);
    const [earnedBadges, setEarnedBadges] = useState([]);
    const [classmates, setClassmates] = useState([]);
    const [allTeachers, setAllTeachers] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);

    const studentId = userProfile?.profileId;

    useEffect(() => {
        if (!db || !appId || !studentId || !selectedYear) {
            if (!loadingYears) setLoading(false);
            return () => {};
        }

        setLoading(true);
        const resetAllDataStates = () => {
            setStudentData(null); setEnrolledClassrooms([]); setAssignments([]);
            setClassmates([]); setGrades([]); setAbsences([]); setAnnouncements([]);
            setDailyLogs([]); setAllCourses([]); setEarnedBadges([]);
            setAllTeachers([]); setSubmissions([]);
        };
        resetAllDataStates();

        const yearPath = `artifacts/${appId}/public/data/academicYears/${selectedYear}`;
        const unsubscribes = [];

        const createListener = (q, setter) => {
            const unsubscribe = onSnapshot(q, (snapshot) => {
                setter(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            }, (error) => console.error("Firestore listener error:", error));
            unsubscribes.push(unsubscribe);
        };

        // Listeners that don't depend on other data
        createListener(query(collection(db, yearPath, 'announcements')), setAnnouncements);
        createListener(query(collection(db, yearPath, 'courses')), setAllCourses);
        createListener(query(collection(db, yearPath, 'teachers')), setAllTeachers);
        createListener(query(collection(db, `${yearPath}/students/${studentId}/badges`)), setEarnedBadges);
        createListener(query(collection(db, `${yearPath}/grades`), where("studentId", "==", studentId)), setGrades);
        createListener(query(collection(db, `${yearPath}/absences`), where("studentId", "==", studentId)), setAbsences);
        createListener(query(collection(db, `${yearPath}/submissions`), where("studentId", "==", studentId)), setSubmissions);

        // Waterfall starts here: Get student, then classrooms, then dependent data
        const studentRef = doc(db, `${yearPath}/students`, studentId);
        const unsubStudent = onSnapshot(studentRef, (studentDoc) => {
            if (studentDoc.exists()) {
                setStudentData({ id: studentDoc.id, ...studentDoc.data() });
                const enrolledClassroomIds = studentDoc.data().enrolledClassrooms || [];

                if (enrolledClassroomIds.length > 0) {
                    const classroomsQuery = query(collection(db, `${yearPath}/classrooms`), where('__name__', 'in', enrolledClassroomIds));
                    const unsubClassrooms = onSnapshot(classroomsQuery, (classroomsSnapshot) => {
                        const classrooms = classroomsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                        setEnrolledClassrooms(classrooms);

                        // --- FINAL FIX: Fetch dependent data only AFTER classrooms are loaded ---
                        const assignmentsQuery = query(collection(db, `${yearPath}/assignments`), where('classroomId', 'in', enrolledClassroomIds));
                        createListener(assignmentsQuery, setAssignments);

                        const dailyLogsQuery = query(collection(db, `${yearPath}/dailyLogs`), where('classroomId', 'in', enrolledClassroomIds));
                        createListener(dailyLogsQuery, setDailyLogs);

                        const allClassmateIds = [...new Set(classrooms.flatMap(c => c.enrolledStudents || []))];
                        if (allClassmateIds.length > 0) {
                            const studentsQuery = query(collection(db, `${yearPath}/students`), where('__name__', 'in', allClassmateIds));
                            createListener(studentsQuery, setClassmates);
                        } else {
                            setClassmates([]);
                        }
                        setLoading(false); // Stop loading only after everything is set up
                    });
                    unsubscribes.push(unsubClassrooms);
                } else {
                    setEnrolledClassrooms([]); setAssignments([]); setDailyLogs([]); setClassmates([]);
                    setLoading(false);
                }
            } else {
                setStudentData(null);
                setLoading(false);
            }
        });
        unsubscribes.push(unsubStudent);

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [db, appId, studentId, selectedYear, loadingYears]);

    const levelInfo = useMemo(() => {
        const defaultLevelInfo = { totalXp: 0, currentLevel: levels[0], nextLevel: levels[1] || levels[0], progressPercentage: 0 };
        if (!earnedBadges || earnedBadges.length === 0) return defaultLevelInfo;
        const badgeXpMap = new Map(allBadges.map(b => [b.id, b.xp]));
        const totalXp = earnedBadges.reduce((sum, b) => sum + (badgeXpMap.get(b.badgeId) || 0), 0);
        let currentLevel = levels[0];
        for (let i = levels.length - 1; i >= 0; i--) { if (totalXp >= levels[i].xpRequired) { currentLevel = levels[i]; break; } }
        const nextLevel = levels.find(l => l.level === currentLevel.level + 1) || { ...currentLevel, xpRequired: currentLevel.xpRequired };
        const xpForCurrentLevel = currentLevel.xpRequired;
        const xpForNextLevel = nextLevel.xpRequired;
        const progressPercentage = xpForNextLevel === xpForCurrentLevel ? 100 : ((totalXp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;
        return { totalXp, currentLevel, nextLevel, progressPercentage };
    }, [earnedBadges]);

    const value = {
        loading, studentId, studentData, enrolledClassrooms, grades, absences,
        announcements, assignments, dailyLogs, allCourses, earnedBadges, classmates,
        allTeachers, submissions, levelInfo, db, appId, user, userProfile, selectedYear
    };

    return (
        <StudentDataContext.Provider value={value}>
            {children}
        </StudentDataContext.Provider>
    );
};
