// src/services/BadgeService.js
import { collection, doc, writeBatch, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { allBadges } from '../portals/student/MyBadges';
import dayjs from 'dayjs';

/**
 * Main function to check and award badges to a student.
 * @param {object} db - Firestore database instance.
 * @param {string} appId - The application ID.
 * @param {string} selectedYear - The selected academic year.
 * @param {string} studentId - The student's ID.
 */
export const checkAndAwardBadges = async (db, appId, selectedYear, studentId) => {
    if (!db || !appId || !selectedYear || !studentId) return;

    const yearPath = `artifacts/${appId}/public/data/academicYears/${selectedYear}`;
    const studentRef = doc(db, `${yearPath}/students`, studentId);
    const badgesCollectionRef = collection(db, studentRef.path, 'badges');

    try {
        // 1. Fetch all necessary data concurrently
        const gradesQuery = query(collection(db, `${yearPath}/grades`), where("studentId", "==", studentId));
        const absencesQuery = query(collection(db, `${yearPath}/absences`), where("studentId", "==", studentId));
        const submissionsQuery = query(collection(db, `${yearPath}/submissions`), where("studentId", "==", studentId));
        const assignmentsQuery = query(collection(db, `${yearPath}/assignments`));
        const earnedBadgesQuery = query(badgesCollectionRef);

        const [
            gradesSnapshot,
            absencesSnapshot,
            submissionsSnapshot,
            assignmentsSnapshot,
            earnedBadgesSnapshot
        ] = await Promise.all([
            getDocs(gradesQuery),
            getDocs(absencesQuery),
            getDocs(submissionsQuery),
            getDocs(assignmentsQuery),
            getDocs(earnedBadgesQuery)
        ]);

        const allGrades = gradesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const allAbsences = absencesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const allSubmissions = submissionsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const allAssignments = assignmentsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const earnedBadges = earnedBadgesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        const badgesToAward = [];
        const assignmentsMap = new Map(allAssignments.map(a => [a.id, a]));

        // Helper function for repeatable badges
        const awardRepeatableBadge = (badgeId, events, earnedForType, createDetails) => {
            const awardedEventIds = new Set(earnedForType.map(b => b.sourceDocumentId));
            for (const event of events) {
                if (!awardedEventIds.has(event.id)) {
                    badgesToAward.push({
                        badgeId,
                        earnedAt: serverTimestamp(),
                        seenByUser: false,
                        sourceDocumentId: event.id,
                        details: createDetails(event),
                    });
                }
            }
        };
        
        // --- Grade-Based Badges (Repeatable) ---
        awardRepeatableBadge('high_flyer', allGrades.filter(g => parseFloat(String(g.grade).replace(',', '.')) >= 19), earnedBadges.filter(b => b.badgeId === 'high_flyer'), g => `Για τον βαθμό ${g.grade} στο μάθημα ${g.subject}`);
        awardRepeatableBadge('flawless_victory', allGrades.filter(g => parseFloat(String(g.grade).replace(',', '.')) === 20), earnedBadges.filter(b => b.badgeId === 'flawless_victory'), g => `Για τον τέλειο βαθμό 20/20 στο μάθημα ${g.subject}`);
        awardRepeatableBadge('active_citizen', allGrades.filter(g => g.type === 'participation' && parseFloat(String(g.grade).replace(',', '.')) > 18), earnedBadges.filter(b => b.badgeId === 'active_citizen'), g => `Για την εξαιρετική συμμετοχή στο μάθημα ${g.subject}`);
        awardRepeatableBadge('team_player', allGrades.filter(g => g.type === 'project' && parseFloat(String(g.grade).replace(',', '.')) > 17), earnedBadges.filter(b => b.badgeId === 'team_player'), g => `Για την ομαδική εργασία στο μάθημα ${g.subject}`);

        // --- Submission-Based Badges (Repeatable & Single) ---
        const earlySubmissions = allSubmissions.map(s => {
            const assignment = assignmentsMap.get(s.assignmentId);
            if (!assignment || !s.submittedAt) return null;
            const diffHours = dayjs(assignment.dueDate.toDate()).diff(dayjs(s.submittedAt.toDate()), 'hour');
            return { ...s, diffHours };
        }).filter(Boolean);

        awardRepeatableBadge('on_time_submitter', earlySubmissions.filter(s => s.diffHours >= 48), earnedBadges.filter(b => b.badgeId === 'on_time_submitter'), s => `Για την έγκαιρη υποβολή της εργασίας`);
        if (!earnedBadges.some(b => b.badgeId === 'early_bird') && earlySubmissions.filter(s => s.diffHours >= 24).length >= 5) {
            badgesToAward.push({ badgeId: 'early_bird', details: 'Υπέβαλες 5 εργασίες τουλάχιστον 24 ώρες νωρίτερα!', earnedAt: serverTimestamp(), seenByUser: false });
        }

        // --- Complex Grade Analysis Badges (Mostly Single) ---
        const gradesBySubject = allGrades.reduce((acc, g) => {
            if (g.subject && typeof g.subject === 'string') {
                const normalizedSubject = g.subject.trim();
                if (!acc[normalizedSubject]) acc[normalizedSubject] = [];
                acc[normalizedSubject].push(g);
            }
            return acc;
        }, {});

        for (const subject in gradesBySubject) {
            const subjectGrades = gradesBySubject[subject].sort((a, b) => a.date.toDate() - b.date.toDate());
            
            if (!earnedBadges.some(b => b.badgeId === 'subject_master' && b.details.includes(subject))) {
                const validGrades = subjectGrades.map(g => parseFloat(String(g.grade).replace(',', '.'))).filter(g => !isNaN(g));
                if (validGrades.length >= 3) {
                    const avg = validGrades.reduce((a, b) => a + b, 0) / validGrades.length;
                    if (avg > 18) badgesToAward.push({ badgeId: 'subject_master', details: `Με μέσο όρο ${avg.toFixed(2)} στο μάθημα ${subject}`, earnedAt: serverTimestamp(), seenByUser: false });
                }
            }

            for (let i = 1; i < subjectGrades.length; i++) {
                const prevGrade = parseFloat(String(subjectGrades[i-1].grade).replace(',', '.'));
                const currentGrade = parseFloat(String(subjectGrades[i].grade).replace(',', '.'));
                if (isNaN(prevGrade) || isNaN(currentGrade)) continue;

                if (!earnedBadges.some(b => b.sourceDocumentId === subjectGrades[i].id && b.badgeId === 'comeback_king') && currentGrade >= prevGrade + 5) {
                    badgesToAward.push({ badgeId: 'comeback_king', sourceDocumentId: subjectGrades[i].id, details: `Από ${prevGrade} σε ${currentGrade} στο μάθημα ${subject}`, earnedAt: serverTimestamp(), seenByUser: false });
                }
                
                if (i >= 2) {
                    const grade1 = parseFloat(String(subjectGrades[i-2].grade).replace(',', '.'));
                    if (!isNaN(grade1) && grade1 > 15 && prevGrade > 15 && currentGrade > 15 && !earnedBadges.some(b => b.sourceDocumentId === subjectGrades[i].id && b.badgeId === 'marathon_runner')) {
                         badgesToAward.push({ badgeId: 'marathon_runner', sourceDocumentId: subjectGrades[i].id, details: `Για το σερί 3 καλών βαθμών στο μάθημα ${subject}`, earnedAt: serverTimestamp(), seenByUser: false });
                    }
                }
            }
        }
        
        if (!earnedBadges.some(b => b.badgeId === 'knowledge_hat_trick')) {
            const highGrades = allGrades.filter(g => parseFloat(String(g.grade).replace(',', '.')) >= 18).sort((a,b) => a.date.toDate() - b.date.toDate());
            for (let i = 0; i < highGrades.length - 2; i++) {
                const grade1 = highGrades[i];
                const subjectsInTrick = new Set([grade1.subject]);
                for (let j = i + 1; j < highGrades.length; j++) {
                    const grade2 = highGrades[j];
                    if (dayjs(grade2.date.toDate()).diff(dayjs(grade1.date.toDate()), 'day') > 30) break;
                    if (grade2.subject && !subjectsInTrick.has(grade2.subject)) subjectsInTrick.add(grade2.subject);
                    if (subjectsInTrick.size >= 3) {
                         badgesToAward.push({ badgeId: 'knowledge_hat_trick', details: `Σε ${Array.from(subjectsInTrick).join(', ')}`, earnedAt: serverTimestamp(), seenByUser: false });
                         break;
                    }
                }
                if (badgesToAward.some(b => b.badgeId === 'knowledge_hat_trick')) break;
            }
        }

        // --- Attendance Badges (Repeatable & Single) ---
        const lastPerfectAttendanceBadge = earnedBadges
            .filter(b => b.badgeId === 'perfect_attendance_month')
            .sort((a, b) => b.earnedAt.toDate() - a.earnedAt.toDate())[0];

        const unexcusedAbsences = allAbsences.filter(a => a.status !== 'justified').sort((a, b) => b.date.toDate() - a.date.toDate());
        const today = dayjs();

        if (unexcusedAbsences.length === 0) {
            // Perfect record case: only award once
            if (!lastPerfectAttendanceBadge && allGrades.length > 0) {
                const firstGradeDate = allGrades.sort((a,b) => a.date.toDate() - b.date.toDate())[0].date.toDate();
                if (today.diff(dayjs(firstGradeDate), 'day') > 30) {
                    badgesToAward.push({ badgeId: 'perfect_attendance_month', details: 'Για την άψογη παρουσία σου από την αρχή της χρονιάς!', earnedAt: serverTimestamp(), seenByUser: false });
                }
            }
        } else {
            // Has absences, logic for repeatable badge
            const lastUnexcusedDate = unexcusedAbsences[0].date.toDate();
            
            const has30DayStreak = today.diff(dayjs(lastUnexcusedDate), 'day') > 30;
            const notAwardedForThisStreak = !lastPerfectAttendanceBadge || dayjs(lastPerfectAttendanceBadge.earnedAt.toDate()).isBefore(dayjs(lastUnexcusedDate));

            if (has30DayStreak && notAwardedForThisStreak) {
                badgesToAward.push({ 
                    badgeId: 'perfect_attendance_month', 
                    details: `Για περισσότερες από 30 ημέρες χωρίς αδικαιολόγητη απουσία!`, 
                    earnedAt: serverTimestamp(), 
                    seenByUser: false 
                });
            }
        }
        
        if (!earnedBadges.some(b => b.badgeId === 'iron_will')) {
            const unexcusedAbsences = allAbsences.filter(a => a.status !== 'justified');
            if (unexcusedAbsences.length === 0 && allAbsences.length > 0) {
                 const firstAbsenceDate = allAbsences.sort((a,b) => a.date.toDate() - b.date.toDate())[0].date.toDate();
                 if (dayjs().diff(dayjs(firstAbsenceDate), 'day') > 90) {
                    badgesToAward.push({ badgeId: 'iron_will', details: 'Για ένα ολόκληρο τρίμηνο.', earnedAt: serverTimestamp(), seenByUser: false });
                 }
            }
        }

        // --- Overall Performance Badges (Single) ---
        if (!earnedBadges.some(b => b.badgeId === 'consistent_performer') && allGrades.length >= 5) {
            const validGrades = allGrades.map(g => parseFloat(String(g.grade).replace(',', '.'))).filter(g => !isNaN(g));
            if (validGrades.length > 0) {
                const avg = validGrades.reduce((a, b) => a + b, 0) / validGrades.length;
                if (avg > 15) badgesToAward.push({ badgeId: 'consistent_performer', details: `Με γενικό μέσο όρο ${avg.toFixed(2)}`, earnedAt: serverTimestamp(), seenByUser: false });
            }
        }
        
        // --- Finalize and Commit to DB ---
        if (badgesToAward.length > 0) {
            const batch = writeBatch(db);
            badgesToAward.forEach(badgeData => {
                const newBadgeRef = doc(collection(db, studentRef.path, 'badges'));
                batch.set(newBadgeRef, badgeData);
            });
            
            const badgeXpMap = new Map(allBadges.map(b => [b.id, b.xp]));
            const newTotalXp = [...earnedBadges, ...badgesToAward].reduce((sum, b) => sum + (badgeXpMap.get(b.badgeId) || 0), 0);
            batch.update(studentRef, { totalXp: newTotalXp });

            await batch.commit();
            console.log(`[BadgeService] Awarded ${badgesToAward.length} new badges. Student ${studentId} XP is now ${newTotalXp}.`);
        }
    } catch (error) {
        console.error("Error in BadgeService:", error);
    }
};
