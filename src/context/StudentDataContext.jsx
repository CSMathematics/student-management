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
    // Υπολογίζουμε τα IDs των τμημάτων από τα δεδομένα του μαθητή
    const enrolledClassroomIds = useMemo(() => studentData?.enrolledClassrooms || [], [studentData]);

    // Hook #1: Για δεδομένα που δεν εξαρτώνται από άλλα (π.χ. βαθμοί, ανακοινώσεις) και για τα βασικά δεδομένα του μαθητή.
    // Ενεργοποιείται όταν αλλάζει ο μαθητής ή το ακαδημαϊκό έτος.
    useEffect(() => {
        if (!db || !appId || !studentId || !selectedYear) {
            if (!loadingYears) setLoading(false);
            return;
        }
        setLoading(true);
        // Μηδενίζουμε όλες τις καταστάσεις (states) για να μην εμφανίζονται παλιά δεδομένα
        setStudentData(null); setEnrolledClassrooms([]); setAssignments([]);
        setClassmates([]); setGrades([]); setAbsences([]); setAnnouncements([]);
        setDailyLogs([]); setAllCourses([]); setEarnedBadges([]);
        setAllTeachers([]); setSubmissions([]);

        const yearPath = `artifacts/${appId}/public/data/academicYears/${selectedYear}`;
        const unsubscribes = [];
        const createListener = (q, setter) => {
            const unsub = onSnapshot(q, (snapshot) => {
                setter(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            }, (error) => console.error("Firestore listener error:", error));
            unsubscribes.push(unsub);
        };

        createListener(query(collection(db, yearPath, 'announcements')), setAnnouncements);
        createListener(query(collection(db, yearPath, 'courses')), setAllCourses);
        createListener(query(collection(db, yearPath, 'teachers')), setAllTeachers);
        createListener(query(collection(db, `${yearPath}/students/${studentId}/badges`)), setEarnedBadges);
        createListener(query(collection(db, `${yearPath}/grades`), where("studentId", "==", studentId)), setGrades);
        createListener(query(collection(db, `${yearPath}/absences`), where("studentId", "==", studentId)), setAbsences);
        createListener(query(collection(db, `${yearPath}/submissions`), where("studentId", "==", studentId)), setSubmissions);
        
        const studentRef = doc(db, `${yearPath}/students`, studentId);
        const unsubStudent = onSnapshot(studentRef, (studentDoc) => {
            setStudentData(studentDoc.exists() ? { id: studentDoc.id, ...studentDoc.data() } : null);
        });
        unsubscribes.push(unsubStudent);

        return () => unsubscribes.forEach(unsub => unsub());
    }, [db, appId, studentId, selectedYear, loadingYears]);


    // Hook #2: Για δεδομένα που εξαρτώνται από τα IDs των τμημάτων (enrolledClassroomIds).
    // Ενεργοποιείται μόνο όταν βρεθούν τα IDs από το Hook #1.
    useEffect(() => {
        if (!db || !appId || !selectedYear || enrolledClassroomIds.length === 0) {
            setEnrolledClassrooms([]);
            setAssignments([]);
            setDailyLogs([]);
            return;
        }

        const yearPath = `artifacts/${appId}/public/data/academicYears/${selectedYear}`;
        const unsubscribes = [];
        
        const classroomsQuery = query(collection(db, `${yearPath}/classrooms`), where('__name__', 'in', enrolledClassroomIds));
        const unsubClassrooms = onSnapshot(classroomsQuery, (snapshot) => {
            setEnrolledClassrooms(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        unsubscribes.push(unsubClassrooms);

        const assignmentsQuery = query(collection(db, `${yearPath}/assignments`), where('classroomId', 'in', enrolledClassroomIds));
        const unsubAssignments = onSnapshot(assignmentsQuery, (snapshot) => {
            setAssignments(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        unsubscribes.push(unsubAssignments);

        const dailyLogsQuery = query(collection(db, `${yearPath}/dailyLogs`), where('classroomId', 'in', enrolledClassroomIds));
        const unsubDailyLogs = onSnapshot(dailyLogsQuery, (snapshot) => {
            setDailyLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        unsubscribes.push(unsubDailyLogs);

        return () => unsubscribes.forEach(unsub => unsub());
    }, [db, appId, selectedYear, enrolledClassroomIds]);


    // Hook #3: Για τους συμμαθητές, που εξαρτώνται από τα πλήρη δεδομένα των τμημάτων (enrolledClassrooms).
    // Ενεργοποιείται μόνο όταν φορτωθούν τα τμήματα από το Hook #2.
    useEffect(() => {
        if (!db || !appId || !selectedYear || enrolledClassrooms.length === 0) {
            setClassmates([]);
            setLoading(false); // Τελείωσε η φόρτωση εδώ
            return;
        }

        const allClassmateIds = [...new Set(enrolledClassrooms.flatMap(c => c.enrolledStudents || []))];
        if (allClassmateIds.length === 0) {
            setClassmates([]);
            setLoading(false);
            return;
        }

        const yearPath = `artifacts/${appId}/public/data/academicYears/${selectedYear}`;
        const studentsQuery = query(collection(db, `${yearPath}/students`), where('__name__', 'in', allClassmateIds));
        
        const unsubClassmates = onSnapshot(studentsQuery, (snapshot) => {
            setClassmates(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false); // Τελείωσε η φόρτωση αφού ήρθαν και τα τελευταία δεδομένα
        });

        return () => unsubClassmates();
    }, [db, appId, selectedYear, enrolledClassrooms]);
    
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
