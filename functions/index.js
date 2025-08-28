// functions/index.js

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore"); // <-- ΝΕΑ ΕΙΣΑΓΩΓΗ (v2)
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const dayjs = require("dayjs");

admin.initializeApp();
const db = admin.firestore();

const allBadges = [
    { id: 'high_flyer', title: 'Αετομάτης', xp: 50 },
    { id: 'perfect_attendance_month', title: 'Πάντα Παρών!', xp: 100 },
    { id: 'subject_master', title: 'Ειδήμων του Μαθήματος', xp: 150 },
    { id: 'consistent_performer', title: 'Σταθερή Αξία', xp: 75 },
    { id: 'comeback_king', title: 'Η Μεγάλη Επιστροφή', xp: 40 },
    { id: 'marathon_runner', title: 'Μαραθωνοδρόμος', xp: 60 },
    { id: 'team_player', title: 'Ομαδικός Παίκτης', xp: 30 },
    { id: 'active_citizen', title: 'Ενεργός Πολίτης', xp: 20 },
    { id: 'on_time_submitter', title: 'Πάντα στην Ώρα μου!', xp: 10 },
    { id: 'explorer', title: 'Εξερευνητής', xp: 15 },
    { id: 'flawless_victory', title: 'Άριστος!', xp: 100 },
    { id: 'knowledge_hat_trick', title: 'Χατ-τρικ Γνώσης', xp: 80 },
    { id: 'early_bird', title: 'Πρωινό Πουλί', xp: 25 },
    { id: 'iron_will', title: 'Ατσαλένια Θέληση', xp: 200 },
    { id: 'homework_hero', title: 'Ήρωας των Εργασιών', xp: 50 },
    { id: 'librarian', title: 'Βιβλιοφάγος', xp: 30 },
    { id: 'planner', title: 'Σχεδιαστής', xp: 15 },
    { id: 'fully_informed', title: 'Πλήρης Ενημέρωση', xp: 20 },
];

const checkAndAwardBadges = async (db, appId, selectedYear, studentId) => {
    const yearPath = `artifacts/${appId}/public/data/academicYears/${selectedYear}`;
    const studentRef = db.doc(`${yearPath}/students/${studentId}`);
    const badgesCollectionRef = studentRef.collection('badges');

    try {
        const gradesQuery = db.collection(`${yearPath}/grades`).where("studentId", "==", studentId);
        const absencesQuery = db.collection(`${yearPath}/absences`).where("studentId", "==", studentId);
        const submissionsQuery = db.collection(`${yearPath}/submissions`).where("studentId", "==", studentId);
        const assignmentsQuery = db.collection(`${yearPath}/assignments`);
        const classroomsQuery = db.collection(`${yearPath}/classrooms`);
        const userEventsQuery = db.collection(`${yearPath}/userEvents`).where("studentId", "==", studentId);
        const announcementsQuery = db.collection(`${yearPath}/announcements`);
        const earnedBadgesQuery = badgesCollectionRef;

        const [
            gradesSnapshot,
            absencesSnapshot,
            submissionsSnapshot,
            assignmentsSnapshot,
            classroomsSnapshot,
            userEventsSnapshot,
            announcementsSnapshot,
            earnedBadgesSnapshot
        ] = await Promise.all([
            gradesQuery.get(),
            absencesQuery.get(),
            submissionsQuery.get(),
            assignmentsQuery.get(),
            classroomsQuery.get(),
            userEventsQuery.get(),
            announcementsQuery.get(),
            earnedBadgesQuery.get()
        ]);

        const allGrades = gradesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const allAbsences = absencesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const allSubmissions = submissionsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const allAssignments = assignmentsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const allClassrooms = classroomsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const allUserEvents = userEventsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const allAnnouncements = announcementsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const earnedBadges = earnedBadgesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        const badgesToAward = [];
        const assignmentsMap = new Map(allAssignments.map(a => [a.id, a]));
        const classroomsMap = new Map(allClassrooms.map(c => [c.id, c]));

        const awardRepeatableBadge = (badgeId, events, earnedForType, createDetails) => {
            const awardedEventIds = new Set(earnedForType.map(b => b.sourceDocumentId));
            for (const event of events) {
                if (!awardedEventIds.has(event.id)) {
                    badgesToAward.push({
                        badgeId,
                        earnedAt: admin.firestore.FieldValue.serverTimestamp(),
                        seenByUser: false,
                        sourceDocumentId: event.id,
                        details: createDetails(event),
                    });
                }
            }
        };
        
        awardRepeatableBadge('high_flyer', allGrades.filter(g => parseFloat(String(g.grade).replace(',', '.')) >= 19), earnedBadges.filter(b => b.badgeId === 'high_flyer'), g => `Για τον βαθμό ${g.grade} στο μάθημα ${g.subject}`);
        awardRepeatableBadge('flawless_victory', allGrades.filter(g => parseFloat(String(g.grade).replace(',', '.')) === 20), earnedBadges.filter(b => b.badgeId === 'flawless_victory'), g => `Για τον τέλειο βαθμό 20/20 στο μάθημα ${g.subject}`);
        awardRepeatableBadge('active_citizen', allGrades.filter(g => g.type === 'participation' && parseFloat(String(g.grade).replace(',', '.')) > 18), earnedBadges.filter(b => b.badgeId === 'active_citizen'), g => `Για την εξαιρετική συμμετοχή στο μάθημα ${g.subject}`);
        awardRepeatableBadge('team_player', allGrades.filter(g => g.type === 'project' && parseFloat(String(g.grade).replace(',', '.')) > 17), earnedBadges.filter(b => b.badgeId === 'team_player'), g => `Για την ομαδική εργασία στο μάθημα ${g.subject}`);

        const earlySubmissions = allSubmissions.map(s => {
            const assignment = assignmentsMap.get(s.assignmentId);
            if (!assignment || !s.submittedAt) return null;
            const diffHours = dayjs(assignment.dueDate.toDate()).diff(dayjs(s.submittedAt.toDate()), 'hour');
            return { ...s, diffHours };
        }).filter(Boolean);

        awardRepeatableBadge('on_time_submitter', earlySubmissions.filter(s => s.diffHours >= 48), earnedBadges.filter(b => b.badgeId === 'on_time_submitter'), s => `Για την έγκαιρη υποβολή της εργασίας`);
        if (!earnedBadges.some(b => b.badgeId === 'early_bird') && earlySubmissions.filter(s => s.diffHours >= 24).length >= 5) {
            badgesToAward.push({ badgeId: 'early_bird', details: 'Υπέβαλες 5 εργασίες τουλάχιστον 24 ώρες νωρίτερα!', earnedAt: admin.firestore.FieldValue.serverTimestamp(), seenByUser: false });
        }

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
                    if (avg > 18) badgesToAward.push({ badgeId: 'subject_master', details: `Με μέσο όρο ${avg.toFixed(2)} στο μάθημα ${subject}`, earnedAt: admin.firestore.FieldValue.serverTimestamp(), seenByUser: false });
                }
            }

            for (let i = 1; i < subjectGrades.length; i++) {
                const prevGrade = parseFloat(String(subjectGrades[i-1].grade).replace(',', '.'));
                const currentGrade = parseFloat(String(subjectGrades[i].grade).replace(',', '.'));
                if (isNaN(prevGrade) || isNaN(currentGrade)) continue;

                if (!earnedBadges.some(b => b.sourceDocumentId === subjectGrades[i].id && b.badgeId === 'comeback_king') && currentGrade >= prevGrade + 5) {
                    badgesToAward.push({ badgeId: 'comeback_king', sourceDocumentId: subjectGrades[i].id, details: `Από ${prevGrade} σε ${currentGrade} στο μάθημα ${subject}`, earnedAt: admin.firestore.FieldValue.serverTimestamp(), seenByUser: false });
                }
                
                if (i >= 2) {
                    const grade1 = parseFloat(String(subjectGrades[i-2].grade).replace(',', '.'));
                    if (!isNaN(grade1) && grade1 > 15 && prevGrade > 15 && currentGrade > 15 && !earnedBadges.some(b => b.sourceDocumentId === subjectGrades[i].id && b.badgeId === 'marathon_runner')) {
                         badgesToAward.push({ badgeId: 'marathon_runner', sourceDocumentId: subjectGrades[i].id, details: `Για το σερί 3 καλών βαθμών στο μάθημα ${subject}`, earnedAt: admin.firestore.FieldValue.serverTimestamp(), seenByUser: false });
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
                         badgesToAward.push({ badgeId: 'knowledge_hat_trick', details: `Σε ${Array.from(subjectsInTrick).join(', ')}`, earnedAt: admin.firestore.FieldValue.serverTimestamp(), seenByUser: false });
                         break;
                    }
                }
                if (badgesToAward.some(b => b.badgeId === 'knowledge_hat_trick')) break;
            }
        }

        const lastPerfectAttendanceBadge = earnedBadges.filter(b => b.badgeId === 'perfect_attendance_month').sort((a, b) => b.earnedAt.toDate() - a.earnedAt.toDate())[0];
        const unexcusedAbsences = allAbsences.filter(a => a.status !== 'justified').sort((a, b) => b.date.toDate() - a.date.toDate());
        const today = dayjs();

        if (unexcusedAbsences.length === 0) {
            if (!lastPerfectAttendanceBadge && allGrades.length > 0) {
                const firstGradeDate = allGrades.sort((a,b) => a.date.toDate() - b.date.toDate())[0].date.toDate();
                if (today.diff(dayjs(firstGradeDate), 'day') > 30) {
                    badgesToAward.push({ badgeId: 'perfect_attendance_month', details: 'Για την άψογη παρουσία σου από την αρχή της χρονιάς!', earnedAt: admin.firestore.FieldValue.serverTimestamp(), seenByUser: false });
                }
            }
        } else {
            const lastUnexcusedDate = unexcusedAbsences[0].date.toDate();
            const has30DayStreak = today.diff(dayjs(lastUnexcusedDate), 'day') > 30;
            const notAwardedForThisStreak = !lastPerfectAttendanceBadge || dayjs(lastPerfectAttendanceBadge.earnedAt.toDate()).isBefore(dayjs(lastUnexcusedDate));
            if (has30DayStreak && notAwardedForThisStreak) {
                badgesToAward.push({ badgeId: 'perfect_attendance_month', details: `Για περισσότερες από 30 ημέρες χωρίς αδικαιολόγητη απουσία!`, earnedAt: admin.firestore.FieldValue.serverTimestamp(), seenByUser: false });
            }
        }
        
        if (!earnedBadges.some(b => b.badgeId === 'iron_will')) {
            const unexcusedAbsences = allAbsences.filter(a => a.status !== 'justified');
            if (unexcusedAbsences.length === 0 && allAbsences.length > 0) {
                 const firstAbsenceDate = allAbsences.sort((a,b) => a.date.toDate() - b.date.toDate())[0].date.toDate();
                 if (dayjs().diff(dayjs(firstAbsenceDate), 'day') > 90) {
                    badgesToAward.push({ badgeId: 'iron_will', details: 'Για ένα ολόκληρο τρίμηνο.', earnedAt: admin.firestore.FieldValue.serverTimestamp(), seenByUser: false });
                 }
            }
        }

        if (!earnedBadges.some(b => b.badgeId === 'consistent_performer') && allGrades.length >= 5) {
            const validGrades = allGrades.map(g => parseFloat(String(g.grade).replace(',', '.'))).filter(g => !isNaN(g));
            if (validGrades.length > 0) {
                const avg = validGrades.reduce((a, b) => a + b, 0) / validGrades.length;
                if (avg > 15) badgesToAward.push({ badgeId: 'consistent_performer', details: `Με γενικό μέσο όρο ${avg.toFixed(2)}`, earnedAt: admin.firestore.FieldValue.serverTimestamp(), seenByUser: false });
            }
        }

        const homeworkAssignmentsByMonth = allAssignments.reduce((acc, assignment) => {
            if (assignment.type === 'homework') {
                const classroom = classroomsMap.get(assignment.classroomId);
                if (classroom && classroom.subject) {
                    const monthKey = dayjs(assignment.dueDate.toDate()).format('YYYY-MM');
                    const groupKey = `${classroom.subject}-${monthKey}`;
                    if (!acc[groupKey]) acc[groupKey] = [];
                    acc[groupKey].push(assignment.id);
                }
            }
            return acc;
        }, {});
        
        const studentSubmissionsSet = new Set(allSubmissions.map(s => s.assignmentId));
        const earnedHomeworkHeroBadges = earnedBadges.filter(b => b.badgeId === 'homework_hero');

        for (const groupKey in homeworkAssignmentsByMonth) {
            if (earnedHomeworkHeroBadges.some(b => b.sourceDocumentId === groupKey)) continue;
            const requiredAssignments = homeworkAssignmentsByMonth[groupKey];
            const hasSubmittedAll = requiredAssignments.every(id => studentSubmissionsSet.has(id));
            if (hasSubmittedAll) {
                const [subject, month] = groupKey.split('-');
                badgesToAward.push({
                    badgeId: 'homework_hero',
                    sourceDocumentId: groupKey,
                    details: `Για την ολοκλήρωση όλων των εργασιών στο μάθημα ${subject} τον μήνα ${month}`,
                    earnedAt: admin.firestore.FieldValue.serverTimestamp(),
                    seenByUser: false,
                });
            }
        }
        
        if (!earnedBadges.some(b => b.badgeId === 'planner')) {
            const calendarVisits = allUserEvents.filter(e => e.eventName === 'visited_calendar' && e.timestamp).map(e => dayjs(e.timestamp.toDate()).format('YYYY-MM-DD'));
            const uniqueVisitDays = [...new Set(calendarVisits)].sort();
            if (uniqueVisitDays.length >= 5) {
                let consecutiveDays = 1;
                for (let i = 1; i < uniqueVisitDays.length; i++) {
                    const prevDay = dayjs(uniqueVisitDays[i-1]);
                    const currentDay = dayjs(uniqueVisitDays[i]);
                    if (currentDay.diff(prevDay, 'day') === 1) {
                        consecutiveDays++;
                    } else {
                        consecutiveDays = 1;
                    }
                    if (consecutiveDays >= 5) {
                        badgesToAward.push({ badgeId: 'planner', details: 'Για τον έλεγχο του ημερολογίου για 5 συνεχόμενες ημέρες.', earnedAt: admin.firestore.FieldValue.serverTimestamp(), seenByUser: false });
                        break;
                    }
                }
            }
        }

        const downloadEventsCount = allUserEvents.filter(e => e.eventName === 'downloaded_material').length;

        if (!earnedBadges.some(b => b.badgeId === 'explorer') && downloadEventsCount >= 10) {
            badgesToAward.push({
                badgeId: 'explorer',
                details: `Για τη λήψη ${downloadEventsCount} αρχείων από το υλικό μαθημάτων.`,
                earnedAt: admin.firestore.FieldValue.serverTimestamp(),
                seenByUser: false,
            });
        }
        if (!earnedBadges.some(b => b.badgeId === 'librarian') && downloadEventsCount >= 20) {
            badgesToAward.push({
                badgeId: 'librarian',
                details: `Για τη λήψη ${downloadEventsCount} αρχείων από το υλικό μαθημάτων.`,
                earnedAt: admin.firestore.FieldValue.serverTimestamp(),
                seenByUser: false,
            });
        }
        
        if (!earnedBadges.some(b => b.badgeId === 'fully_informed')) {
            const oneMonthAgo = dayjs().subtract(30, 'days');
            const recentAnnouncements = allAnnouncements.filter(ann => dayjs(ann.createdAt.toDate()).isAfter(oneMonthAgo));

            if (recentAnnouncements.length > 0) {
                const readEvents = allUserEvents.filter(e => e.eventName === 'read_announcement' && e.details && e.details.announcementId);
                const readEventsMap = new Map(readEvents.map(e => [e.details.announcementId, e.timestamp.toDate()]));

                const hasReadAllTimely = recentAnnouncements.every(ann => {
                    const readTimestamp = readEventsMap.get(ann.id);
                    if (!readTimestamp) return false;
                    const deadline = dayjs(ann.createdAt.toDate()).add(24, 'hours');
                    return dayjs(readTimestamp).isBefore(deadline);
                });

                if (hasReadAllTimely) {
                    badgesToAward.push({
                        badgeId: 'fully_informed',
                        details: 'Για την έγκαιρη ανάγνωση όλων των ανακοινώσεων του τελευταίου μήνα.',
                        earnedAt: admin.firestore.FieldValue.serverTimestamp(),
                        seenByUser: false,
                    });
                }
            }
        }

        if (badgesToAward.length > 0) {
            const batch = db.batch();
            badgesToAward.forEach(badgeData => {
                const newBadgeRef = badgesCollectionRef.doc();
                batch.set(newBadgeRef, badgeData);
            });
            
            const badgeXpMap = new Map(allBadges.map(b => [b.id, b.xp]));
            const newTotalXp = [...earnedBadges, ...badgesToAward].reduce((sum, b) => sum + (badgeXpMap.get(b.badgeId) || 0), 0);
            batch.update(studentRef, { totalXp: newTotalXp });

            await batch.commit();
            logger.info(`[BadgeService] Awarded ${badgesToAward.length} new badges for student ${studentId}.`);
        }
    } catch (error) {
        logger.error(`Error checking badges for student ${studentId}:`, error);
    }
};

exports.dailyBadgeCheck = onSchedule("every 24 hours", async (event) => {
    logger.info("Starting daily badge check for all students...");
    const appId = "YOUR_APP_ID";
    try {
        const yearSnapshot = await db.collection(`artifacts/${appId}/public/data/academicYears`).where("isCurrent", "==", true).limit(1).get();
        if (yearSnapshot.empty) {
            logger.warn("No current academic year found. Exiting.");
            return;
        }
        const currentYear = yearSnapshot.docs[0].id;
        logger.info(`Processing for academic year: ${currentYear}`);
        const studentsSnapshot = await db.collection(`artifacts/${appId}/public/data/academicYears/${currentYear}/students`).get();
        if (studentsSnapshot.empty) {
            logger.info("No students found for this year. Exiting.");
            return;
        }
        const studentIds = studentsSnapshot.docs.map((doc) => doc.id);
        logger.info(`Found ${studentIds.length} students to check.`);
        const promises = studentIds.map(studentId => checkAndAwardBadges(db, appId, currentYear, studentId));
        await Promise.all(promises);
        logger.info("Daily badge check completed successfully for all students.");
    } catch (error) {
        logger.error("Error running daily badge check:", error);
    }
});

exports.logUserEvent = onCall(async (request) => {
    const { eventName, studentId, appId, academicYear, details } = request.data;
    const auth = request.auth;
    if (!auth || !auth.uid) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    if (auth.uid !== studentId) {
        throw new functions.https.HttpsError('permission-denied', 'You can only log events for yourself.');
    }
    if (!eventName || !studentId || !appId || !academicYear) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required event data.');
    }
    try {
        await db.collection(`artifacts/${appId}/public/data/academicYears/${academicYear}/userEvents`).add({
            studentId: studentId,
            eventName: eventName,
            details: details || null,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        logger.info(`Event '${eventName}' logged for student ${studentId}`);
        return { success: true, message: "Event logged successfully." };
    } catch (error) {
        logger.error(`Error logging event for student ${studentId}:`, error);
        throw new functions.https.HttpsError('internal', 'Failed to log event.');
    }
});

// --- START: ΕΝΗΜΕΡΩΜΕΝΗ ΣΥΝΑΡΤΗΣΗ (v2) ---
/**
 * Cloud Function που ενεργοποιείται κάθε φορά που αλλάζει ένα έγγραφο
 * στη συλλογή 'users'. Παίρνει τον ρόλο από το έγγραφο και τον
 * προσθέτει ως custom claim στο token του χρήστη.
 */
exports.addUserRole = onDocumentWritten("users/{userId}", async (event) => {
    const userId = event.params.userId;
    const afterData = event.data.after.exists ? event.data.after.data() : null;

    // Αν ο χρήστης διαγράφηκε, δεν κάνουμε τίποτα.
    if (!afterData) {
      logger.info(`User ${userId} deleted.`);
      return null;
    }

    const role = afterData.role;

    // Βεβαιωνόμαστε ότι ο ρόλος είναι ένας από τους επιτρεπτούς.
    const validRoles = ["admin", "teacher", "student", "parent", "pending_approval"];
    if (!validRoles.includes(role)) {
      logger.warn(`User ${userId} has an invalid role: ${role}. Skipping.`);
      return null;
    }

    try {
      // Παίρνουμε τα τρέχοντα claims του χρήστη για να μην τα χάσουμε.
      const userRecord = await admin.auth().getUser(userId);
      const currentClaims = userRecord.customClaims || {};

      // Αν ο ρόλος είναι ήδη σωστά ορισμένος, δεν χρειάζεται να κάνουμε κάτι.
      if (currentClaims[role] === true && Object.keys(currentClaims).length === 1) {
         logger.info(`User ${userId} already has the correct claim for role: ${role}. No update needed.`);
         return null;
      }

      // Δημιουργούμε το νέο αντικείμενο claims.
      // Θέτουμε μόνο τον τρέχοντα ρόλο σε true.
      const newClaims = {
          [role]: true
      };
      
      logger.info(`Setting custom claims for user ${userId}:`, newClaims);
      await admin.auth().setCustomUserClaims(userId, newClaims);
      
      return {
        result: `Custom claims for ${userId} have been updated.`,
      };
    } catch (error) {
      logger.error(`Error setting custom claims for ${userId}:`, error);
      return { error: error.message };
    }
  });
// --- END: ΕΝΗΜΕΡΩΜΕΝΗ ΣΥΝΑΡΤΗΣΗ ---
