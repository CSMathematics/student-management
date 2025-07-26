// src/pages/StudentProgressChart.jsx
import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import Plot from 'react-plotly.js';
import dayjs from 'dayjs';

function StudentProgressChart({ studentGrades }) {

    const plotData = useMemo(() => {
        if (!studentGrades || studentGrades.length === 0) {
            return [];
        }

        const gradesByType = {};
        studentGrades.forEach(grade => {
            const type = grade.type || 'Άλλο';
            if (!gradesByType[type]) {
                gradesByType[type] = [];
            }
            gradesByType[type].push({
                date: dayjs(grade.date.toDate()).toDate(),
                grade: grade.grade,
                subject: grade.subject
            });
        });

        const traces = Object.keys(gradesByType).map(type => {
            const sortedGrades = gradesByType[type].sort((a, b) => a.date - b.date);
            
            return {
                x: sortedGrades.map(g => g.date),
                y: sortedGrades.map(g => g.grade),
                text: sortedGrades.map(g => `${g.subject}: ${g.grade}`), 
                hovertemplate: '<b>%{text}</b><br>%{x|%d/%m/%Y}<extra></extra>',
                name: type,
                mode: 'lines+markers',
                type: 'scatter'
            };
        });

        return traces;

    }, [studentGrades]);

    if (plotData.length === 0) {
        return <Typography>Δεν υπάρχουν αρκετά δεδομένα για τη δημιουργία γραφήματος.</Typography>;
    }

    return (
        <Box sx={{ height: 400, width: '100%' }}>
            <Plot
                data={plotData}
                layout={{
                    autosize: true,
                    margin: { l: 40, r: 20, b: 40, t: 40 },
                    xaxis: {
                        title: 'Ημερομηνία',
                        type: 'date',
                        // --- ΑΛΛΑΓΗ: Προσθήκη μορφοποίησης για τον άξονα ---
                        tickformat: '%d/%m/%Y' // Εμφάνιση μόνο ως Ημέρα/Μήνας/Έτος
                    },
                    yaxis: {
                        title: 'Βαθμός',
                        range: [0, 20],
                        dtick: 2
                    },
                    legend: {
                        orientation: 'h',
                        yanchor: 'bottom',
                        y: 1.02,
                        xanchor: 'right',
                        x: 1
                    }
                }}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
                config={{ responsive: true }}
            />
        </Box>
    );
}

export default StudentProgressChart;
