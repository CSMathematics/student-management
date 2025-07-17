// src/App.jsx
import React, { useState } from 'react';
import { Box } from '@mui/material';

// Import your components
import Sidebar from './pages/Sidebar.jsx';
import DashboardHeader from './pages/DashboardHeader.jsx';
import DashboardContent from './pages/DashboardContent.jsx';
import NewStudentForm from './pages/NewStudentForm.jsx';
import StudentsList from './pages/StudentsList.jsx';
import NewClassroomForm from './pages/NewClassroomForm.jsx'; // Import NewClassroomForm
import Classrooms from './pages/Classrooms.jsx'; // Import Classrooms

// Main App component
function App() {
    const [currentPage, setCurrentPage] = useState('dashboard'); // State to manage current page

    const navigateTo = (page) => {
        setCurrentPage(page);
    };

    const getPageTitle = () => {
        switch (currentPage) {
            case 'dashboard':
                return 'Σχολικό έτος';
            case 'newStudent':
                return 'Προσθήκη Νέου Μαθητή';
            case 'studentsList':
                return 'Λίστα Μαθητών';
            case 'newClassroom': // New case for new classroom form
                return 'Δημιουργία Νέου Τμήματος';
            case 'classroomsList': // New case for classrooms list
                return 'Λίστα Τμημάτων';
            default:
                return 'Student Management';
        }
    };

    return (
        <Box sx={{ display: 'flex', width: '100%' }}>
            {/* Pass currentPage to Sidebar */}
            <Sidebar navigateTo={navigateTo} currentPage={currentPage} />
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
                        onNewClassroomClick={() => navigateTo('newClassroom')}
                        onClassroomsListClick={() => navigateTo('classroomsList')}
                    />
                )}
                {currentPage === 'newStudent' && (
                    <NewStudentForm />
                )}
                {currentPage === 'studentsList' && (
                    <StudentsList />
                )}
                {currentPage === 'newClassroom' && (
                    <NewClassroomForm navigateTo={navigateTo} />
                )}
                {currentPage === 'classroomsList' && (
                    <Classrooms />
                )}
            </Box>
        </Box>
    );
}

export default App;
