// src/portals/parent/ChildSchedule.jsx
import React from 'react';
import MySchedule from '../student/MySchedule'; // Επαναχρησιμοποιούμε το component του μαθητή

function ChildSchedule(props) {
    // Απλώς επιστρέφουμε το MySchedule component με τα props του παιδιού
    return <MySchedule {...props} />;
}

export default ChildSchedule;
