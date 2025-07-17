// src/App.jsx
import React, { useState } from 'react';
import { Box } from '@mui/material';

// Import your components
import Sidebar from './pages/Sidebar.jsx';
import DashboardHeader from './pages/DashboardHeader.jsx';
import DashboardContent from './pages/DashboardContent.jsx';
import NewStudentForm from './pages/NewStudentForm.jsx';
import StudentsList from './pages/StudentsList.jsx';
import NewClassroomForm from './pages/NewClassroomForm.jsx';
import Classrooms from './pages/Classrooms.jsx';
import WeeklyScheduleCalendar from './pages/WeeklyScheduleCalendar.jsx'; // Import the new calendar component

// Main App component
function App() {
    const [currentPage, setCurrentPage] = useState('dashboard'); // State to manage current page
    const [classroomToEdit, setClassroomToEdit] = useState(null); // State to pass classroom data for editing
    const [scheduleForNewClassroom, setScheduleForNewClassroom] = useState(null); // State to pass schedule data

    const navigateTo = (page, data = null) => {
        setCurrentPage(page);
        setClassroomToEdit(null); // Clear previous edit state
        setScheduleForNewClassroom(null); // Clear previous schedule state

        if (page === 'newClassroom') {
            if (data && data.classroom) {
                setClassroomToEdit(data.classroom);
            }
            if (data && data.initialSchedule) {
                setScheduleForNewClassroom(data.initialSchedule);
            }
        }
    };

    const getPageTitle = () => {
        switch (currentPage) {
            case 'dashboard':
                return 'Σχολικό έτος';
            case 'newStudent':
                return 'Προσθήκη Νέου Μαθητή';
            case 'studentsList':
                return 'Λίστα Μαθητών';
            case 'classroomsList':
                return 'Διαχείριση Τμημάτων'; // Title for classrooms list
            case 'newClassroom':
                return classroomToEdit ? 'Επεξεργασία Τμήματος' : 'Δημιουργία Νέου Τμήματος'; // Title for new/edit classroom form
            case 'weeklySchedule':
                return 'Εβδομαδιαίο Πρόγραμμα'; // Title for the new calendar
            default:
                return 'Student Management';
        }
    };

    return (
        <Box sx={{ display: 'flex', width: '100%' }}>
            <Sidebar navigateTo={navigateTo} currentPage={currentPage}/>
            <Box className="main-content-area">
                <DashboardHeader
                    pageTitle={getPageTitle()}
                    onBackClick={() => navigateTo('dashboard')}
                    showBackButton={currentPage !== 'dashboard'}
                />
                {currentPage === 'dashboard' && (
                    <DashboardContent
                        onNewStudentClick={() => navigateTo('newStudent')}
                        onStudentsListClick={() => navigateTo('studentsList')}
                        onNewClassroomClick={() => navigateTo('newClassroom')} // Pass navigate for New Classroom button
                        onClassroomsListClick={() => navigateTo('classroomsList')} // Pass navigate for Classrooms List button
                    />
                )}
                {currentPage === 'newStudent' && (
                    <NewStudentForm />
                )}
                {currentPage === 'studentsList' && (
                    <StudentsList />
                )}
                {currentPage === 'classroomsList' && (
                    <Classrooms navigateTo={navigateTo} setClassroomToEdit={setClassroomToEdit} />
                )}
                {currentPage === 'newClassroom' && (
                    <NewClassroomForm
                        navigateTo={navigateTo}
                        classroomToEdit={classroomToEdit}
                        setClassroomToEdit={setClassroomToEdit}
                        initialSchedule={scheduleForNewClassroom} // Pass initial schedule
                    />
                )}
                {currentPage === 'weeklySchedule' && (
                    <WeeklyScheduleCalendar navigateTo={navigateTo} />
                )}
            </Box>
        </Box>
    );
}

export default App;
