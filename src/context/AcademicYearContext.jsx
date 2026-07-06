import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';

const AcademicYearContext = createContext();

export const useAcademicYear = () => useContext(AcademicYearContext);

export const AcademicYearProvider = ({ children, db, appId }) => {
    const [academicYears, setAcademicYears] = useState([]);
    const [selectedYear, setSelectedYear] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!db || !appId) {
            setLoading(false);
            return;
        };

        const yearsQuery = query(
            collection(db, `artifacts/${appId}/public/data/academicYears`)
        );

        const unsubscribe = onSnapshot(yearsQuery, (snapshot) => {
            const yearsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            yearsData.sort((a, b) => {
                const yearA = String(a.year || '');
                const yearB = String(b.year || '');
                return yearB.localeCompare(yearA);
            });

            setAcademicYears(yearsData);
            
            setSelectedYear(currentSelectedYear => {
                if (yearsData.length > 0) {
                    const yearIds = yearsData.map(y => y.id);
                    if (currentSelectedYear && yearIds.includes(currentSelectedYear)) {
                        return currentSelectedYear;
                    }
                    
                    const now = new Date();
                    
                    // 1. Find the year that is currently active (now is between start and end)
                    const activeYear = yearsData.find(y => {
                        if (!y.startDate) return false;
                        const start = y.startDate.toDate ? y.startDate.toDate() : new Date(y.startDate);
                        
                        if (y.endDate) {
                            const end = y.endDate.toDate ? y.endDate.toDate() : new Date(y.endDate);
                            return now >= start && now <= end;
                        }
                        return now >= start;
                    });

                    if (activeYear) {
                        return activeYear.id;
                    }
                    
                    // 2. Fallback: Find the most recent year that has already started
                    const pastYear = yearsData.find(y => {
                        if (!y.startDate) return false;
                        const start = y.startDate.toDate ? y.startDate.toDate() : new Date(y.startDate);
                        return now >= start;
                    });

                    if (pastYear) {
                        return pastYear.id;
                    }

                    // 3. Fallback: return the first item (chronologically newest)
                    return yearsData[0].id;
                }
                return '';
            });
            
            setLoading(false);
        }, (error) => {
            console.error("Error fetching academic years:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [db, appId]); 

    // --- ΝΕΑ ΠΡΟΣΘΗΚΗ: Δημιουργία αντικειμένου με τα πλήρη δεδομένα του επιλεγμένου έτους ---
    const selectedYearData = useMemo(() => {
        return academicYears.find(year => year.id === selectedYear) || null;
    }, [selectedYear, academicYears]);

    const value = {
        academicYears,
        selectedYear,
        setSelectedYear,
        selectedYearData, // <-- Το νέο αντικείμενο με τις ημερομηνίες
        loadingYears: loading,
    };

    return (
        <AcademicYearContext.Provider value={value}>
            {children}
        </AcademicYearContext.Provider>
    );
};
