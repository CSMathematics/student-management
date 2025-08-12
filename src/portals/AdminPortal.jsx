// src/portals/AdminPortal.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import { collection, query, onSnapshot, getFirestore } from 'firebase/firestore';
import { Box, Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// Εισαγωγή όλων των σελίδων που χρειάζεται ο Admin
import DashboardContent from '../pages/DashboardContent.jsx';
import StudentsList from '../pages/StudentsList.jsx';
import StudentReport from '../pages/StudentReport.jsx';
import Classrooms from '../pages/Classrooms.jsx';
import NewClassroomForm from '../pages/NewClassroomForm.jsx';
import WeeklyScheduleCalendar from '../pages/WeeklyScheduleCalendar.jsx';
import StudentForm from '../pages/StudentForm.jsx';
import Payments from '../pages/Payments.jsx';
import Courses from '../pages/Courses.jsx';
import CourseForm from '../pages/CourseForm.jsx';
import TeachersList from '../pages/TeachersList.jsx';
import TeacherForm from '../pages/TeacherForm.jsx';
import Announcements from '../pages/Announcements.jsx';
import Phonebook from '../pages/Phonebook.jsx';
import Expenses from '../pages/Expenses.jsx';
import Communication from '../pages/Communication.jsx';

// Wrappers (όπως ήταν στο παλιό App.jsx)
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


function AdminPortal({ db, appId, user }) {
    // Η λογική φόρτωσης δεδομένων μεταφέρεται εδώ από το App.jsx
    const [classrooms, setClassrooms] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [allGrades, setAllGrades] = useState([]);
    const [allAbsences, setAllAbsences] = useState([]);
    const [allPayments, setAllPayments] = useState([]);
    const [allCourses, setAllCourses] = useState([]);
    const [allTeachers, setAllTeachers] = useState([]);
    const [allAnnouncements, setAllAnnouncements] = useState([]);
    const [allAssignments, setAllAssignments] = useState([]);
    const [allExpenses, setAllExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState(null);

    useEffect(() => {
        let isMounted = true;
        const unsubscribes = [];
        
        const collections = {
            classrooms: setClassrooms, students: setAllStudents, grades: setAllGrades,
            absences: setAllAbsences, payments: setAllPayments, courses: setAllCourses,
            teachers: setAllTeachers, announcements: setAllAnnouncements, assignments: setAllAssignments,
            expenses: setAllExpenses,
        };

        for (const [name, setter] of Object.entries(collections)) {
            const ref = collection(db, `artifacts/${appId}/public/data/${name}`);
            const unsubscribe = onSnapshot(query(ref), snapshot => { 
                if (isMounted) { 
                    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                    setter(data);
                } 
            }, (error) => {
                console.error(`Error fetching ${name}:`, error.message);
            });
            unsubscribes.push(unsubscribe);
        }
        setLoading(false);

        return () => { isMounted = false; unsubscribes.forEach(unsub => unsub()); };
    }, [db, appId]);

    const openModalWithData = (data) => { setModalData(data); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setModalData(null); };

    const commonProps = { db, appId, classrooms, allStudents, allGrades, allAbsences, allPayments, allCourses, allTeachers, allAnnouncements, allAssignments, allExpenses, loading, userId: user.uid };

    return (
        <>
            <Routes>
                <Route path="/" element={<DashboardContent {...commonProps} />} />
                <Route path="/students" element={<StudentsList {...commonProps} />} />
                <Route path="/student/new" element={<StudentForm {...commonProps} openModalWithData={openModalWithData} />} />
                <Route path="/student/edit/:studentId" element={<StudentFormWrapper {...commonProps} openModalWithData={openModalWithData} />} />
                <Route path="/student/report/:studentId" element={<StudentReport {...commonProps} />} />
                <Route path="/classrooms" element={<Classrooms {...commonProps} />} />
                <Route path="/classroom/new" element={<NewClassroomForm {...commonProps} />} />
                <Route path="/classroom/edit/:classroomId" element={<ClassroomFormWrapper {...commonProps} />} />
                <Route path="/calendar" element={<WeeklyScheduleCalendar {...commonProps} />} />
                <Route path="/payments" element={<Payments {...commonProps} />} />
                <Route path="/courses/list" element={<Courses {...commonProps} />} />
                <Route path="/course/new" element={<CourseForm {...commonProps} />} />
                <Route path="/course/edit/:courseId" element={<CourseFormWrapper {...commonProps} />} />
                <Route path="/teachers" element={<TeachersList {...commonProps} />} />
                <Route path="/teacher/new" element={<TeacherForm {...commonProps} />} />
                <Route path="/teacher/edit/:teacherId" element={<TeacherFormWrapper {...commonProps} />} />
                <Route path="/announcements" element={<Announcements {...commonProps} />} />
                <Route path="/phonebook" element={<Phonebook {...commonProps} />} />
                <Route path="/expenses" element={<Expenses {...commonProps} />} />
                <Route path="/communication" element={<Communication {...commonProps} />} />
            </Routes>

            <Dialog open={isModalOpen} onClose={closeModal} maxWidth="md" fullWidth>
                <DialogTitle>Δημιουργία Νέου Τμήματος<IconButton onClick={closeModal} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton></DialogTitle>
                <DialogContent dividers><NewClassroomForm classroomToEdit={modalData} onSaveSuccess={closeModal} onCancel={closeModal} {...commonProps} /></DialogContent>
            </Dialog>
        </>
    );
}

export default AdminPortal;
