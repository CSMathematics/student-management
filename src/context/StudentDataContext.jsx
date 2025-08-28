// src/context/StudentDataContext.jsx
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { useAcademicYear } from './AcademicYearContext.jsx';
import { allBadges } from '../portals/student/MyBadges.jsx';

const StudentDataContext = createContext();

export const useStudentData = () => useContext(StudentDataContext);

const levels = [
    { level: 1, title: "Νέος Μαθητής", xpRequired: 0 },
    { level: 2, title: "Ελπιδοφόρος Ακαδημαϊκός", xpRequired: 500 },
    { level: 3, title: "Συνεπής Μελετητής", xpRequired: 2000 },
    { level: 4, title: "Ανερχόμενο Αστέρι", xpRequired: 5000 },
    { level: 5, title: "Σοφός της Τάξης", xpRequired: 10000 },
    { level: 6, title: "Θρύλος του Σχολείου", xpRequired: 18000 },
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
            return;
        }

        setLoading(true);
        // Reset all states to prevent showing stale data from a previous year
        const resetAllStates = () => {
            setStudentData(null);
            setEnrolledClassrooms([]);
            setAssignments([]);
            setClassmates([]);
            setGrades([]);
            setAbsences([]);
            setAnnouncements([]);
            setDailyLogs([]);
            setAllCourses([]);
            setEarnedBadges([]);
            setAllTeachers([]);
            setSubmissions([]);
        };
        resetAllStates();

        const yearPath = `artifacts/${appId}/public/data/academicYears/${selectedYear}`;
        const unsubscribes = [];

        // Listen to data that is always needed, regardless of classrooms
        const generalQueries = {
            announcements: collection(db, yearPath, 'announcements'),
            courses: collection(db, yearPath, 'courses'),
            teachers: collection(db, yearPath, 'teachers'),
            grades: query(collection(db, yearPath, 'grades'), where("studentId", "==", studentId)),
            absences: query(collection(db, yearPath, 'absences'), where("studentId", "==", studentId)),
            submissions: query(collection(db, yearPath, 'submissions'), where("studentId", "==", studentId)),
            badges: collection(db, `${yearPath}/students/${studentId}/badges`),
        };
        const setters = {
            announcements: setAnnouncements,
            courses: setAllCourses,
            teachers: setAllTeachers,
            grades: setGrades,
            absences: setAbsences,
            submissions: setSubmissions,
            badges: setEarnedBadges,
        };

        for (const [key, q] of Object.entries(generalQueries)) {
            unsubscribes.push(onSnapshot(q, (snapshot) => {
                setters[key](snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            }));
        }

        // Main listener for the student document
        const studentRef = doc(db, `${yearPath}/students`, studentId);
        const unsubStudent = onSnapshot(studentRef, (studentDoc) => {
            if (studentDoc.exists()) {
                const studentData = { id: studentDoc.id, ...studentDoc.data() };
                setStudentData(studentData);
                const classroomIds = studentData.enrolledClassrooms || [];

                if (classroomIds.length > 0) {
                    // If student has classes, fetch dependent data
                    const classroomsQuery = query(collection(db, `${yearPath}/classrooms`), where('__name__', 'in', classroomIds));
                    unsubscribes.push(onSnapshot(classroomsQuery, (classroomsSnap) => {
                        const classroomsData = classroomsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                        setEnrolledClassrooms(classroomsData);

                        const assignmentsQuery = query(collection(db, `${yearPath}/assignments`), where('classroomId', 'in', classroomIds));
                        unsubscribes.push(onSnapshot(assignmentsQuery, (snap) => setAssignments(snap.docs.map(d => ({ id: d.id, ...d.data() })))));
                        
                        const dailyLogsQuery = query(collection(db, `${yearPath}/dailyLogs`), where('classroomId', 'in', classroomIds));
                        unsubscribes.push(onSnapshot(dailyLogsQuery, (snap) => setDailyLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })))));

                        const allClassmateIds = [...new Set(classroomsData.flatMap(c => c.enrolledStudents || []))];
                        if (allClassmateIds.length > 0) {
                            const classmatesQuery = query(collection(db, `${yearPath}/students`), where('__name__', 'in', allClassmateIds));
                            unsubscribes.push(onSnapshot(classmatesQuery, (classmatesSnap) => {
                                setClassmates(classmatesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                                setLoading(false); // FINAL loading point
                            }));
                        } else {
                            setClassmates([]);
                            setLoading(false); // FINAL loading point
                        }
                    }));
                } else {
                    // Student exists but has no classes
                    setLoading(false); // FINAL loading point
                }
            } else {
                // Student does not exist for this year
                setStudentData(null);
                setLoading(false); // FINAL loading point
            }
        });
        unsubscribes.push(unsubStudent);

        return () => unsubscribes.forEach(unsub => unsub());
    }, [db, appId, studentId, selectedYear, loadingYears]);

    const filteredClassmates = useMemo(() => {
        return classmates.filter(c => c.id !== studentId);
    }, [classmates, studentId]);

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
        announcements, assignments, dailyLogs, allCourses, earnedBadges,
        classmates: filteredClassmates,
        allTeachers, submissions, levelInfo, db, appId, user, userProfile, selectedYear
    };

    return (
        <StudentDataContext.Provider value={value}>
            {children}
        </StudentDataContext.Provider>
    );
};
