// src/services/BadgeService.js
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import dayjs from 'dayjs';

/**
 * Ελέγχει και απονέμει παράσημα σε έναν μαθητή με βάση τα τελευταία του δεδομένα.
 * @param {object} db - Το instance του Firestore database.
 * @param {string} appId - Το ID της εφαρμογής.
 * @param {string} selectedYear - Το επιλεγμένο ακαδημαϊκό έτος.
 * @param {string} studentId - Το ID του μαθητή.
 */
export const checkAndAwardBadges = async (db, appId, selectedYear, studentId) => {
    if (!db || !appId || !selectedYear || !studentId) return;

    const yearPath = `artifacts/${appId}/public/data/academicYears/${selectedYear}`;
    const studentPath = `${yearPath}/students/${studentId}`;

    // 1. Συλλογή όλων των απαραίτητων δεδομένων για τον μαθητή
    const gradesQuery = query(collection(db, `${yearPath}/grades`), where("studentId", "==", studentId));
    const absencesQuery = query(collection(db, `${yearPath}/absences`), where("studentId", "==", studentId));
    const submissionsQuery = query(collection(db, `${yearPath}/submissions`), where("studentId", "==", studentId));
    const earnedBadgesQuery = query(collection(db, `${studentPath}/badges`));

    const [gradesSnapshot, absencesSnapshot, submissionsSnapshot, earnedBadgesSnapshot] = await Promise.all([
        getDocs(gradesQuery),
        getDocs(absencesQuery),
        getDocs(submissionsQuery),
        getDocs(earnedBadgesQuery)
    ]);

    const allGrades = gradesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    const allAbsences = absencesSnapshot.docs.map(d => d.data());
    const allSubmissions = submissionsSnapshot.docs.map(d => d.data());
    const earnedBadgeIds = new Set(earnedBadgesSnapshot.docs.map(d => d.data().badgeId));

    const badgesToAward = [];

    // Συνάρτηση για την προσθήκη ενός παρασήμου αν δεν έχει ήδη κερδηθεί
    const awardBadge = (badgeId, details = "") => {
        if (!earnedBadgeIds.has(badgeId)) {
            badgesToAward.push({
                badgeId,
                details,
                earnedAt: serverTimestamp(),
                seenByUser: false,
            });
            earnedBadgeIds.add(badgeId); // Αποφυγή διπλής απονομής στην ίδια εκτέλεση
        }
    };

    // --- Έλεγχοι για κάθε παράσημο ---

    // high_flyer: Βαθμός >= 19
    const highGrade = allGrades.find(g => parseFloat(g.grade) >= 19);
    if (highGrade) {
        awardBadge('high_flyer', `Για τον βαθμό ${highGrade.grade} στο μάθημα ${highGrade.subject}`);
    }

    // flawless_victory: Βαθμός == 20
    const perfectGrade = allGrades.find(g => parseFloat(g.grade) === 20);
    if (perfectGrade) {
        awardBadge('flawless_victory', `Για τον τέλειο βαθμό 20/20 στο μάθημα ${perfectGrade.subject}`);
    }
    
    // consistent_performer: Γενικός Μ.Ο. > 15 με τουλάχιστον 5 βαθμούς
    if (allGrades.length >= 5) {
        const sum = allGrades.reduce((acc, g) => acc + parseFloat(g.grade), 0);
        const avg = sum / allGrades.length;
        if (avg > 15) {
            awardBadge('consistent_performer', `Με γενικό μέσο όρο ${avg.toFixed(2)}`);
        }
    }

    // active_citizen: Βαθμός συμμετοχής > 18
    const participationGrade = allGrades.find(g => g.type === 'participation' && parseFloat(g.grade) > 18);
    if (participationGrade) {
        awardBadge('active_citizen', `Για την εξαιρετική συμμετοχή στο μάθημα ${participationGrade.subject}`);
    }
    
    // on_time_submitter: Υποβολή 2+ μέρες νωρίτερα
    // (Αυτός ο έλεγχος πρέπει να γίνει κατά την υποβολή της εργασίας στο MyAssignments.jsx)


    // 2. Αποθήκευση των νέων παρασήμων στη βάση δεδομένων
    if (badgesToAward.length > 0) {
        const badgesCollectionRef = collection(db, studentPath, 'badges');
        for (const badgeData of badgesToAward) {
            await addDoc(badgesCollectionRef, badgeData);
        }
        console.log(`[BadgeService] Απονέμθηκαν ${badgesToAward.length} νέα παράσημα στον μαθητή ${studentId}.`);
    }
};
