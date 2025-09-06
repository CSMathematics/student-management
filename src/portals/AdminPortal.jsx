// src/portals/AdminPortal.jsx
import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import { collection, query, onSnapshot, doc } from 'firebase/firestore';
import { Box, Dialog, DialogContent, DialogTitle, IconButton, CircularProgress, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useAcademicYear } from '../context/AcademicYearContext.jsx';

// Dynamic imports for all pages
const DashboardContent = React.lazy(() => import('../pages/DashboardContent.jsx'));
const StudentsList = React.lazy(() => import('../pages/StudentsList.jsx'));
const StudentReport = React.lazy(() => import('../pages/StudentReport.jsx'));
const Classrooms = React.lazy(() => import('../pages/Classrooms.jsx'));
const NewClassroomForm = React.lazy(() => import('../pages/NewClassroomForm.jsx'));
const WeeklyScheduleCalendar = React.lazy(() => import('../pages/WeeklyScheduleCalendar.jsx'));
const StudentForm = React.lazy(() => import('../pages/StudentForm.jsx'));
const Courses = React.lazy(() => import('../pages/Courses.jsx'));
const CourseForm = React.lazy(() => import('../pages/CourseForm.jsx'));
const TeachersList = React.lazy(() => import('../pages/TeachersList.jsx'));
const TeacherForm = React.lazy(() => import('../pages/TeacherForm.jsx'));
const Announcements = React.lazy(() => import('../pages/Announcements.jsx'));
const Phonebook = React.lazy(() => import('../pages/Phonebook.jsx'));
const Expenses = React.lazy(() => import('../pages/Expenses.jsx'));
const Communication = React.lazy(() => import('../pages/Communication.jsx'));
const GradeSummary = React.lazy(() => import('../pages/GradeSummary.jsx'));
const MyAssignmentsManager = React.lazy(() => import('../portals/teacher/MyAssignmentsManager.jsx'));
const AcademicYearManager = React.lazy(() => import('../pages/AcademicYearsManager.jsx'));
const UsersManager = React.lazy(() => import('../pages/UsersManager.jsx'));
const Library = React.lazy(() => import('../pages/Library.jsx'));
const MyProfile = React.lazy(() => import('../pages/MyProfile.jsx'));
const FacultiesPage = React.lazy(() => import('../pages/FacultiesPage.jsx'));
const PointsCalculatorPage = React.lazy(() => import('../pages/PointsCalculatorPage.jsx'));
const TasksCalendar = React.lazy(() => import('../pages/TasksCalendar.jsx'));


const StudyGuideDocs = () => <Box p={3}><Typography variant="h5">Χρήσιμα Έγγραφα και Πληροφορίες</Typography></Box>;
const StudyGuideSimulation = () => <Box p={3}><Typography variant="h5">Προσομοίωση Μηχανογραφικού</Typography></Box>;

// Wrappers
const StudentFormWrapper = (props) => {
    const { studentId } = useParams();
    const studentToEdit = props.allStudents.find(s => s.id === studentId);
    return <StudentForm {...props} initialData={studentToEdit} key={studentId} />;
};
const ClassroomFormWrapper = (props) => {
    const { classroomId } = useParams();
    const classroomToEdit = props.classrooms.find(c => c.id === classroomId);
    return <NewClassroomForm {...props} classroomToEdit={classroomToEdit} key={classroomId} />;
};
const CourseFormWrapper = (props) => {
    const { courseId } = useParams();
    return <CourseForm {...props} key={courseId} />;
};
const TeacherFormWrapper = (props) => {
    const { teacherId } = useParams();
    return <TeacherForm {...props} key={teacherId} />;
};


function AdminPortal({ db, appId, user, userProfile }) {
    const { selectedYear, loadingYears } = useAcademicYear();
    const [allData, setAllData] = useState({
        classrooms: [], students: [], grades: [], absences: [],
        payments: [], courses: [], teachers: [], announcements: [],
        assignments: [], expenses: [], files: []
    });
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState(null);

    useEffect(() => {
        if (!db || !appId || !selectedYear) {
            if (!loadingYears) setLoading(false);
            return;
        }

        let isMounted = true;
        setLoading(true);
        const unsubscribes = [];
        
        unsubscribes.push(onSnapshot(collection(db, 'users'), (snapshot) => {
            if (isMounted) setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }));

        const collectionsToFetch = [
            'classrooms', 'students', 'grades', 'absences', 'payments', 
            'courses', 'teachers', 'announcements', 'assignments', 'expenses', 'files'
        ];

        collectionsToFetch.forEach(name => {
            const path = `artifacts/${appId}/public/data/academicYears/${selectedYear}/${name}`;
            const unsubscribe = onSnapshot(query(collection(db, path)), snapshot => { 
                if (isMounted) { 
                    setAllData(prevData => ({ ...prevData, [name]: snapshot.docs.map(d => ({ id: d.id, ...d.data() })) }));
                } 
            }, (error) => {
                console.error(`Error fetching ${name} from ${path}:`, error.message);
                if (isMounted) setAllData(prevData => ({ ...prevData, [name]: [] }));
            });
            unsubscribes.push(unsubscribe);
        });
        setLoading(false);

        return () => { isMounted = false; unsubscribes.forEach(unsub => unsub()); };
    }, [db, appId, selectedYear, loadingYears]);


    const openModalWithData = (data) => { setModalData(data); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setModalData(null); };

    if (loading || loadingYears) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
    }

    // --- ΔΙΟΡΘΩΣΗ: Επαναφορά του σωστού mapping των props ---
    const commonProps = { 
        db, appId, userId: user.uid,
        classrooms: allData.classrooms, 
        allStudents: allData.students, 
        allGrades: allData.grades, 
        allAbsences: allData.absences, 
        allPayments: allData.payments, 
        allCourses: allData.courses, 
        allTeachers: allData.teachers, 
        allAnnouncements: allData.announcements, 
        allAssignments: allData.assignments, 
        allExpenses: allData.expenses, 
        allFiles: allData.files,
        allUsers: allUsers,
        loading 
    };

    return (
        <>
            <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
                <Routes>
                    <Route path="/" element={<DashboardContent {...commonProps} />} />
                    <Route path="/my-profile" element={<MyProfile {...commonProps} userProfile={userProfile} />} />
                    <Route path="/students" element={<StudentsList {...commonProps} selectedYear={selectedYear} />} />
                    <Route path="/student/new" element={<StudentForm {...commonProps} selectedYear={selectedYear} openModalWithData={openModalWithData} />} />
                    <Route path="/student/edit/:studentId" element={<StudentFormWrapper {...commonProps} selectedYear={selectedYear} openModalWithData={openModalWithData} />} />
                    <Route path="/student/report/:studentId" element={<StudentReport {...commonProps} />} />
                    <Route path="/classrooms" element={<Classrooms {...commonProps} selectedYear={selectedYear} />} />
                    <Route path="/classroom/new" element={<NewClassroomForm {...commonProps} selectedYear={selectedYear} />} />
                    <Route path="/classroom/edit/:classroomId" element={<ClassroomFormWrapper {...commonProps} selectedYear={selectedYear} />} />
                    <Route path="/calendar" element={<WeeklyScheduleCalendar {...commonProps} selectedYear={selectedYear} />} />
                    <Route path="/courses/list" element={<Courses {...commonProps} selectedYear={selectedYear} />} />
                    <Route path="/course/new" element={<CourseForm {...commonProps} selectedYear={selectedYear} />} />
                    <Route path="/course/edit/:courseId" element={<CourseFormWrapper {...commonProps} selectedYear={selectedYear} />} />
                    <Route path="/teachers" element={<TeachersList {...commonProps} selectedYear={selectedYear} />} />
                    <Route path="/teacher/new" element={<TeacherForm {...commonProps} selectedYear={selectedYear} />} />
                    <Route path="/teacher/edit/:teacherId" element={<TeacherFormWrapper {...commonProps} selectedYear={selectedYear} />} />
                    <Route path="/announcements" element={<Announcements {...commonProps} />} />
                    <Route path="/phonebook" element={<Phonebook {...commonProps} />} />
                    <Route path="/expenses" element={<Expenses {...commonProps} selectedYear={selectedYear} />} />
                    <Route path="/communication" element={<Communication {...commonProps} currentYearId={selectedYear} />} />
                    <Route path="/grades-summary" element={<GradeSummary {...commonProps} />} />
                    <Route path="/library" element={<Library {...commonProps} selectedYear={selectedYear} />} />
                    <Route path="/assignments" element={<MyAssignmentsManager {...commonProps} selectedYear={selectedYear} />} />
                    <Route path="/academicYear" element={<AcademicYearManager {...commonProps} />} />
                    <Route path="/users-management" element={<UsersManager {...commonProps} />} />
                    <Route path="/tasks-calendar" element={<TasksCalendar {...commonProps} selectedYear={selectedYear} />} />
                    <Route path="/study-guide/faculties" element={<FacultiesPage {...commonProps} />} />
                    <Route path="/study-guide/points-calculator" element={<PointsCalculatorPage {...commonProps} />} />
                    <Route path="/study-guide/documents" element={<StudyGuideDocs {...commonProps} />} />
                    <Route path="/study-guide/simulation" element={<StudyGuideSimulation {...commonProps} />} />
                </Routes>
            </Suspense>

            <Dialog open={isModalOpen} onClose={closeModal} maxWidth="md" fullWidth>
                <DialogTitle>
                    Δημιουργία Νέου Τμήματος
                    <IconButton onClick={closeModal} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <NewClassroomForm classroomToEdit={modalData} onSaveSuccess={closeModal} onCancel={closeModal} {...commonProps} selectedYear={selectedYear}/>
                </DialogContent>
            </Dialog>
        </>
    );
}

export default AdminPortal;

