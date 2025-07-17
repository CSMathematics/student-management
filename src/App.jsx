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

// Main App component
function App() {
    const [currentPage, setCurrentPage] = useState('dashboard'); // State to manage current page
    const [classroomToEdit, setClassroomToEdit] = useState(null); // State to hold classroom data for editing

    const navigateTo = (page) => {
        setCurrentPage(page);
        // If navigating away from newClassroom, clear classroomToEdit
        if (page !== 'newClassroom') {
            setClassroomToEdit(null);
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
            case 'newClassroom':
                return classroomToEdit ? 'Επεξεργασία Τμήματος' : 'Δημιουργία Νέου Τμήματος'; // Dynamic title
            case 'classroomsList':
                return 'Λίστα Τμημάτων';
            default:
                return 'Student Management';
        }
    };

    return (
        <Box sx={{ display: 'flex', width: '100%' }}>
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
                    <NewClassroomForm
                        navigateTo={navigateTo}
                        classroomToEdit={classroomToEdit} // Pass the classroom to edit
                        setClassroomToEdit={setClassroomToEdit} // Pass setter to clear after save
                    />
                )}
                {currentPage === 'classroomsList' && (
                    <Classrooms
                        navigateTo={navigateTo} // Pass navigateTo for edit action
                        setClassroomToEdit={setClassroomToEdit} // Pass setter for edit action
                    />
                )}
            </Box>
        </Box>
    );
}

export default App;
