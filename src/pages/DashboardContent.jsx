// src/components/DashboardContent.jsx
import React from 'react';
import { Container } from '@mui/material';

// Import sub-components
import DashboardStats from './DashboardStats.jsx';
import QuickActions from './QuickActions.jsx';
import LicenseUsage from './LicenseUsage.jsx';
import WeeklyScheduleCalendar from './WeeklyScheduleCalendar.jsx'; // Import the actual calendar
import YearFilter from './YearFilter.jsx';
import ChartPlaceholder from './ChartPlaceholder.jsx';

function DashboardContent({
    onNewStudentClick,
    onStudentsListClick,
    onNewClassroomClick, // Added
    onClassroomsListClick, // Added
    navigateTo, // Added
    classrooms, // Added
    loadingClassrooms, // Changed from 'loading' to 'loadingClassrooms' to match App.jsx
    onCreateClassroomFromCalendar, // Added
    onEditClassroom, // Added
    db, userId, appId // Added Firebase props
}) {
    return (
        <Container maxWidth="lg">
            <DashboardStats />
            <QuickActions
                onNewStudentClick={onNewStudentClick}
                onStudentsListClick={onStudentsListClick}
                onNewClassroomClick={onNewClassroomClick} // Pass down
                onClassroomsListClick={onClassroomsListClick} // Pass down
            />
            <LicenseUsage />
            {/* Render the actual WeeklyScheduleCalendar here */}
            <WeeklyScheduleCalendar
                classrooms={classrooms}
                loading={loadingClassrooms} // Pass loadingClassrooms to calendar
                onCreateClassroomFromCalendar={onCreateClassroomFromCalendar}
                onEditClassroom={onEditClassroom}
                navigateTo={navigateTo}
                db={db}
                userId={userId}
                appId={appId}
            />
            <YearFilter />
            <ChartPlaceholder title="Attendance by Subject" icon="fas fa-chart-bar" chartId="attendanceChart" />
            <ChartPlaceholder title="Students by Gender" icon="fas fa-chart-pie" chartId="genderChart" />
        </Container>
    );
}

export default DashboardContent;
