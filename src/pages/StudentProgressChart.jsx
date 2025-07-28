// src/pages/StudentProgressChart.jsx
import React, { useMemo, useState } from 'react';
import { Box, Typography, ToggleButtonGroup, ToggleButton, Tooltip } from '@mui/material';
import { ShowChart as ShowChartIcon, BarChart as BarChartIcon } from '@mui/icons-material';
import Plot from 'react-plotly.js';
import dayjs from 'dayjs';

function StudentProgressChart({ studentGrades, startDate, endDate }) {
    const [chartType, setChartType] = useState('line');

    const handleChartTypeChange = (event, newType) => {
        if (newType !== null) {
            setChartType(newType);
        }
    };

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
            const gradeDate = dayjs(grade.date.toDate());
            gradesByType[type].push({
                date: gradeDate.toDate(),
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
                type: chartType === 'line' ? 'scatter' : 'bar',
                mode: chartType === 'line' ? 'lines+markers' : undefined,
            };
        });
        
        return traces;

    }, [studentGrades, chartType]);

    const chartLayout = useMemo(() => {
        const baseLayout = {
            autosize: true,
            margin: { l: 40, r: 20, b: 40, t: 40 },
            yaxis: {
                title: 'Βαθμός',
                range: [0, 21],
                dtick: 2
            },
            legend: {
                orientation: 'h',
                yanchor: 'bottom',
                y: 1.02,
                xanchor: 'right',
                x: 1
            }
        };

        const xaxisLayout = {
            title: 'Ημερομηνία',
            type: 'date',
            tickformat: '%d/%m/%Y',
            // --- ΔΙΟΡΘΩΣΗ: Ορίζουμε την απόσταση των ετικετών σε μία ημέρα ---
            dtick: 86400000, // 86,400,000 milliseconds = 1 day
            tickfont: {
                weight: 'bold'
            }
        };

        if (startDate && endDate) {
            xaxisLayout.range = [startDate, endDate];
        }
        
        if (chartType === 'bar') {
            baseLayout.barmode = 'group';
        }

        return { ...baseLayout, xaxis: xaxisLayout };

    }, [startDate, endDate, chartType]);


    if (plotData.length === 0) {
        return <Typography>Δεν υπάρχουν αρκετά δεδομένα για τη δημιουργία γραφήματος.</Typography>;
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <ToggleButtonGroup
                    value={chartType}
                    exclusive
                    onChange={handleChartTypeChange}
                    aria-label="chart type"
                    size="small"
                >
                    <ToggleButton value="line" aria-label="line chart">
                        <Tooltip title="Γράφημα Γραμμής">
                            <ShowChartIcon />
                        </Tooltip>
                    </ToggleButton>
                    <ToggleButton value="bar" aria-label="bar chart">
                        <Tooltip title="Ραβδόγραμμα">
                            <BarChartIcon />
                        </Tooltip>
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>
            <Box sx={{ height: 400, width: '100%' }}>
                <Plot
                    data={plotData}
                    layout={chartLayout}
                    useResizeHandler={true}
                    style={{ width: '100%', height: '100%' }}
                    config={{ responsive: true }}
                />
            </Box>
        </Box>
    );
}

export default StudentProgressChart;
