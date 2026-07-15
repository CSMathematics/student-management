// src/pages/StudentProgressChart.jsx
import React, { useMemo, useState } from 'react';
import { Box, Typography, ToggleButtonGroup, ToggleButton, Tooltip, useTheme as useMuiTheme } from '@mui/material';
import { ShowChart as ShowChartIcon, BarChart as BarChartIcon } from '@mui/icons-material';
import {
    ResponsiveContainer, LineChart, BarChart, Line, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend
} from 'recharts';
import dayjs from 'dayjs';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7f7f', '#a4de6c', '#d0ed57', '#83a6ed'];

function StudentProgressChart({ studentGrades, startDate, endDate }) {
    const [chartType, setChartType] = useState('line');
    const muiTheme = useMuiTheme();
    const isDark = muiTheme.palette.mode === 'dark';
    const gridColor = isDark ? '#444' : '#e0e0e0';
    const textColor = isDark ? '#ccc' : '#555';

    const handleChartTypeChange = (event, newType) => {
        if (newType !== null) setChartType(newType);
    };

    // Build flat data: one row per date, one key per grade type
    const { chartData, gradeTypes } = useMemo(() => {
        if (!studentGrades || studentGrades.length === 0) return { chartData: [], gradeTypes: [] };

        const allTypes = [...new Set(studentGrades.map(g => g.type || 'Άλλο'))];

        // Group by date
        const byDate = {};
        studentGrades.forEach(grade => {
            const date = dayjs(grade.date.toDate());
            // filter by range if set
            if (startDate && date.isBefore(dayjs(startDate), 'day')) return;
            if (endDate && date.isAfter(dayjs(endDate), 'day')) return;
            const key = date.format('DD/MM/YY');
            if (!byDate[key]) byDate[key] = { date: key };
            byDate[key][grade.type || 'Άλλο'] = grade.grade;
        });

        const sorted = Object.values(byDate).sort((a, b) =>
            dayjs(a.date, 'DD/MM/YY').valueOf() - dayjs(b.date, 'DD/MM/YY').valueOf()
        );

        return { chartData: sorted, gradeTypes: allTypes };
    }, [studentGrades, startDate, endDate]);

    if (chartData.length === 0) {
        return <Typography>Δεν υπάρχουν αρκετά δεδομένα για τη δημιουργία γραφήματος.</Typography>;
    }

    const ChartComponent = chartType === 'line' ? LineChart : BarChart;
    const DataComponent = chartType === 'line' ? Line : Bar;

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <ToggleButtonGroup value={chartType} exclusive onChange={handleChartTypeChange} size="small">
                    <ToggleButton value="line">
                        <Tooltip title="Γράφημα Γραμμής"><ShowChartIcon /></Tooltip>
                    </ToggleButton>
                    <ToggleButton value="bar">
                        <Tooltip title="Ραβδόγραμμα"><BarChartIcon /></Tooltip>
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>
            <Box sx={{ height: 380, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ChartComponent data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis dataKey="date" tick={{ fill: textColor, fontSize: 12 }} />
                        <YAxis domain={[0, 20]} tick={{ fill: textColor, fontSize: 12 }} />
                        <ReTooltip
                            contentStyle={{ backgroundColor: isDark ? '#333' : '#fff', border: `1px solid ${gridColor}`, color: textColor }}
                        />
                        <Legend wrapperStyle={{ color: textColor }} />
                        {gradeTypes.map((type, i) => (
                            <DataComponent
                                key={type}
                                type="monotone"
                                dataKey={type}
                                stroke={COLORS[i % COLORS.length]}
                                fill={COLORS[i % COLORS.length]}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        ))}
                    </ChartComponent>
                </ResponsiveContainer>
            </Box>
        </Box>
    );
}

export default StudentProgressChart;
