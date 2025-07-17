// src/components/DashboardContent.jsx
import React from 'react';
import { Container } from '@mui/material';

// Import sub-components
import DashboardStats from './DashboardStats.jsx';
import QuickActions from './QuickActions.jsx';
import LicenseUsage from './LicenseUsage.jsx';
import CalendarPlaceholder from './CalendarPlaceholder.jsx';
import YearFilter from './YearFilter.jsx';
import ChartPlaceholder from './ChartPlaceholder.jsx';

function DashboardContent({ onNewStudentClick, onStudentsListClick, onNewClassroomClick, onClassroomsListClick }) {
    return (
        <Container maxWidth="lg">
            <DashboardStats />
            <QuickActions
                onNewStudentClick={onNewStudentClick}
                onStudentsListClick={onStudentsListClick}
                onNewClassroomClick={onNewClassroomClick} // Pass new prop
                onClassroomsListClick={onClassroomsListClick} // Pass new prop
            />
            <LicenseUsage />
            <CalendarPlaceholder />
            <YearFilter />
            <ChartPlaceholder title="Attendance by Subject" icon="fas fa-chart-bar" chartId="attendanceChart" />
            <ChartPlaceholder title="Students by Gender" icon="fas fa-chart-pie" chartId="genderChart" />
        </Container>
    );
}

export default DashboardContent;
