// src/portals/AdminPortal.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Box, Dialog, DialogContent, DialogTitle, IconButton, CircularProgress, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useAcademicYear } from '../context/AcademicYearContext.jsx';

// Εισαγωγή όλων των σελίδων που χρειάζεται ο Admin
import DashboardContent from '../pages/DashboardContent.jsx';
import StudentsList from '../pages/StudentsList.jsx';
import StudentReport from '../pages/StudentReport.jsx';
import Classrooms from '../pages/Classrooms.jsx';
import NewClassroomForm from '../pages/NewClassroomForm.jsx';
import WeeklyScheduleCalendar from '../pages/WeeklyScheduleCalendar.jsx';
import StudentForm from '../pages/StudentForm.jsx';
// import Payments from '../pages/Payments.jsx';
import Courses from '../pages/Courses.jsx';
import CourseForm from '../pages/CourseForm.jsx';
import TeachersList from '../pages/TeachersList.jsx';
import TeacherForm from '../pages/TeacherForm.jsx';
import Announcements from '../pages/Announcements.jsx';
import Phonebook from '../pages/Phonebook.jsx';
import Expenses from '../pages/Expenses.jsx';
import Communication from '../pages/Communication.jsx';
import GradeSummary from '../pages/GradeSummary.jsx';
import MyAssignmentsManager from '../portals/teacher/MyAssignmentsManager.jsx';
import AcademicYearManager from '../pages/AcademicYearsManager.jsx';
import UsersManager from '../pages/UsersManager.jsx';
import Library from '../pages/Library.jsx';
import MyProfile from '../pages/MyProfile.jsx';
import TasksCalendar from '../pages/TasksCalendar.jsx'; // <<< ΠΡΟΣΘΗΚΗ

// --- Εισαγωγή των σελίδων του Οδηγού Σπουδών ---
import FacultiesPage from '../pages/FacultiesPage.jsx';
import PointsCalculatorPage from '../pages/PointsCalculatorPage.jsx';

// Placeholder components για τις υπόλοιπες σελίδες
const StudyGuideDocs = () => <Box p={3}><Typography variant="h5">Χρήσιμα Έγγραφα και Πληροφορίες</Typography></Box>;
const StudyGuideSimulation = () => <Box p={3}><Typography variant="h5">Προσομοίωση Μηχανογραφικού</Typography></Box>;


// Wrappers για την επεξεργασία συγκεκριμένων εγγραφών
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
        
        const usersRef = collection(db, 'users');
        unsubscribes.push(onSnapshot(usersRef, (snapshot) => {
            if (isMounted) {
                setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            }
        }));

        const collectionsToFetch = [
            'classrooms', 'students', 'grades', 'absences', 'payments', 
            'courses', 'teachers', 'announcements', 'assignments', 'expenses', 'files'
        ];

        for (const name of collectionsToFetch) {
            const path = `artifacts/${appId}/public/data/academicYears/${selectedYear}/${name}`;
            const ref = collection(db, path);
            
            const unsubscribe = onSnapshot(query(ref), snapshot => { 
                if (isMounted) { 
                    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                    setAllData(prevData => ({ ...prevData, [name]: data }));
                } 
            }, (error) => {
                console.error(`Error fetching ${name} from ${path}:`, error.message);
                if (isMounted) setAllData(prevData => ({ ...prevData, [name]: [] }));
            });
            unsubscribes.push(unsubscribe);
        }
        setLoading(false);

        return () => { isMounted = false; unsubscribes.forEach(unsub => unsub()); };
    }, [db, appId, selectedYear, loadingYears]);


    const openModalWithData = (data) => { setModalData(data); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setModalData(null); };

    if (loading || loadingYears) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
    }

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
                {/* <Route path="/payments" element={<Payments {...commonProps} selectedYear={selectedYear} />} /> */}
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
                <Route path="/tasks" element={<TasksCalendar {...commonProps} selectedYear={selectedYear} />} /> {/* <<< ΠΡΟΣΘΗΚΗ */}
                <Route path="/academicYear" element={<AcademicYearManager {...commonProps} />} />
                <Route path="/users-management" element={<UsersManager {...commonProps} />} />

                <Route path="/study-guide/faculties" element={<FacultiesPage {...commonProps} />} />
                <Route path="/study-guide/points-calculator" element={<PointsCalculatorPage {...commonProps} />} />
                <Route path="/study-guide/documents" element={<StudyGuideDocs {...commonProps} />} />
                <Route path="/study-guide/simulation" element={<StudyGuideSimulation {...commonProps} />} />

            </Routes>

            <Dialog open={isModalOpen} onClose={closeModal} maxWidth="md" fullWidth>
                <DialogTitle>
                    Δημιουργία Νέου Τμήματος
                    <IconButton onClick={closeModal} sx={{ position: 'absolute', right: 8, top: 8 }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <NewClassroomForm 
                        classroomToEdit={modalData} 
                        onSaveSuccess={closeModal} 
                        onCancel={closeModal} 
                        {...commonProps} 
                        selectedYear={selectedYear}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}

export default AdminPortal;
