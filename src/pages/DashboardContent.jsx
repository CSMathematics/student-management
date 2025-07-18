// src/components/DashboardContent.jsx
import React from 'react';
import { Container } from '@mui/material';

// Import sub-components
import DashboardStats from './DashboardStats.jsx';
import QuickActions from './QuickActions.jsx';
import LicenseUsage from './LicenseUsage.jsx';
import WeeklyScheduleCalendar from './WeeklyScheduleCalendar.jsx'; // Import your existing WeeklyScheduleCalendar
import YearFilter from './YearFilter.jsx';
import ChartPlaceholder from './ChartPlaceholder.jsx';

function DashboardContent({ onNewStudentClick, onStudentsListClick, onNewClassroomClick, onClassroomsListClick, navigateTo, classrooms, loadingClassrooms, db, userId }) {
    return (
        <Container maxWidth="lg">
            <DashboardStats />
            <QuickActions
                onNewStudentClick={onNewStudentClick}
                onStudentsListClick={onStudentsListClick}
                onNewClassroomClick={onNewClassroomClick}
                onClassroomsListClick={onClassroomsListClick}
            />
            <LicenseUsage />
            {/* Render WeeklyScheduleCalendar instead of CalendarPlaceholder */}
            <WeeklyScheduleCalendar
                classrooms={classrooms}
                loading={loadingClassrooms}
                onCreateClassroomFromCalendar={(initialSchedule) => {
                    // This callback will be triggered by WeeklyScheduleCalendar
                    // We need to pass it up to App.jsx to navigate to NewClassroomForm
                    navigateTo('newClassroom', { initialSchedule }); // Pass initialSchedule as part of navigation
                }}
                onEditClassroom={(classroom) => {
                    // This callback will be triggered by WeeklyScheduleCalendar when an event is clicked
                    navigateTo('newClassroom', { classroomToEdit: classroom });
                }}
                navigateTo={navigateTo} // Pass navigateTo for internal calendar navigation if needed
                db={db} // Pass db instance
                userId={userId} // Pass userId
            />
            <YearFilter />
            <ChartPlaceholder title="Attendance by Subject" icon="fas fa-chart-bar" chartId="attendanceChart" />
            <ChartPlaceholder title="Students by Gender" icon="fas fa-chart-pie" chartId="genderChart" />
        </Container>
    );
}

export default DashboardContent;
