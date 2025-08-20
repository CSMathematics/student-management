// src/pages/StudentProgressChart.jsx
import React, { useMemo, useState } from 'react';
import { Box, Typography, ToggleButtonGroup, ToggleButton, Tooltip } from '@mui/material';
import { ShowChart as ShowChartIcon, BarChart as BarChartIcon } from '@mui/icons-material';
import Plot from 'react-plotly.js';
import dayjs from 'dayjs';
import { useTheme, lightPalette, darkPalette } from '../context/ThemeContext.jsx'; // --- ΝΕΑ ΠΡΟΣΘΗΚΗ ---

function StudentProgressChart({ studentGrades, startDate, endDate }) {
    const [chartType, setChartType] = useState('line');
    const { mode } = useTheme(); // --- ΝΕΑ ΠΡΟΣΘΗΚΗ: Ανάκτηση του τρέχοντος θέματος ---

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

    // --- ΕΝΗΜΕΡΩΣΗ: Το layout του γραφήματος προσαρμόζεται πλέον στο θέμα ---
    const chartLayout = useMemo(() => {
        const currentPalette = mode === 'light' ? lightPalette : darkPalette;

        const baseLayout = {
            autosize: true,
            margin: { l: 40, r: 20, b: 40, t: 40 },
            yaxis: {
                title: 'Βαθμός',
                range: [0, 21],
                dtick: 2,
                gridcolor: currentPalette.chartGridColor,
                color: currentPalette.chartFontColor
            },
            legend: {
                orientation: 'h',
                yanchor: 'bottom',
                y: 1.02,
                xanchor: 'right',
                x: 1,
                font: { color: currentPalette.chartFontColor }
            },
            paper_bgcolor: currentPalette.chartPaperBg,
            plot_bgcolor: currentPalette.chartPlotBg,
            font: { color: currentPalette.chartFontColor }
        };

        const xaxisLayout = {
            title: 'Ημερομηνία',
            type: 'date',
            tickformat: '%d/%m/%Y',
            dtick: 86400000, 
            tickfont: {
                weight: 'bold'
            },
            gridcolor: currentPalette.chartGridColor,
            color: currentPalette.chartFontColor
        };

        if (startDate && endDate) {
            xaxisLayout.range = [startDate, endDate];
        }
        
        if (chartType === 'bar') {
            baseLayout.barmode = 'group';
        }

        return { ...baseLayout, xaxis: xaxisLayout };

    }, [startDate, endDate, chartType, mode]);


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
