// src/data/classrooms.js
import { MOCK_STUDENTS } from '../data.js'; // Import the existing mock students

// Helper to get a subset of students
const getStudentsForClass = (startIndex, count) => {
    return MOCK_STUDENTS.slice(startIndex, startIndex + count).map(student => ({
        id: student.id,
        name: `${student.firstName} ${student.lastName}`
    }));
};

export const MOCK_CLASSROOMS = [
    {
        id: 101,
        name: "Α' Γυμνασίου - Τμήμα Α",
        lesson: "Νέα ελληνική γλώσσα",
        curriculum: "Εισαγωγή στην Αρχαία Ελληνική Γλώσσα και Γραμματεία",
        hoursPerWeek: 4,
        enrolledStudents: getStudentsForClass(0, 6), // 6 students
        maxStudents: 5, // Max students set to 5
        homework: [
            { id: 1, title: "Ασκήσεις Γραμματικής", dueDate: "2025-07-20", status: "Ανατεθειμένη" },
            { id: 2, title: "Ανάγνωση Κειμένου", dueDate: "2025-07-25", status: "Ανατεθειμένη" },
        ],
        exams: [
            { id: 1, title: "Διαγώνισμα Γραμματικής", date: "2025-08-01", result: "Αναμένεται" },
        ],
        schedule: [
            { day: "Δευτέρα", time: "10:00 - 11:00" },
            { day: "Τρίτη", time: "11:00 - 12:00" },
            { day: "Πέμπτη", time: "10:00 - 11:00" },
            { day: "Παρασκευή", time: "11:00 - 12:00" },
        ]
    },
    {
        id: 102,
        name: "Α' Γυμνασίου - Τμήμα Β",
        lesson: "Μαθηματικά",
        curriculum: "Βασικές Αριθμητικές Πράξεις, Εισαγωγή στην Άλγεβρα",
        hoursPerWeek: 4,
        enrolledStudents: getStudentsForClass(6, 5), // 5 students
        maxStudents: 5,
        homework: [
            { id: 1, title: "Προβλήματα Πολλαπλασιασμού", dueDate: "2025-07-21", status: "Ανατεθειμένη" },
        ],
        exams: [
            { id: 1, title: "Διαγώνισμα Αριθμητικής", date: "2025-08-02", result: "Αναμένεται" },
        ],
        schedule: [
            { day: "Δευτέρα", time: "11:00 - 12:00" },
            { day: "Τετάρτη", time: "10:00 - 12:00" },
            { day: "Παρασκευή", time: "10:00 - 11:00" },
        ]
    },
    {
        id: 103,
        name: "Β' Γυμνασίου - Τμήμα Α",
        lesson: "Αρχαία",
        curriculum: "Αρχαία Ελληνικά Κείμενα, Συντακτικό",
        hoursPerWeek: 3,
        enrolledStudents: getStudentsForClass(11, 6), // 6 students
        maxStudents: 5,
        homework: [
            { id: 1, title: "Μετάφραση Ξενοφώντα", dueDate: "2025-07-22", status: "Ανατεθειμένη" },
        ],
        exams: [
            { id: 1, title: "Εξέταση Συντακτικού", date: "2025-08-03", result: "Αναμένεται" },
        ],
        schedule: [
            { day: "Τρίτη", time: "09:00 - 11:00" },
            { day: "Πέμπτη", time: "09:00 - 10:00" },
        ]
    },
    {
        id: 104,
        name: "Β' Γυμνασίου - Τμήμα Β",
        lesson: "Μαθηματικά",
        curriculum: "Εξισώσεις, Γεωμετρικές Εφαρμογές",
        hoursPerWeek: 4,
        enrolledStudents: getStudentsForClass(17, 5), // 5 students
        maxStudents: 5,
        homework: [
            { id: 1, title: "Λύση Εξισώσεων", dueDate: "2025-07-23", status: "Ανατεθειμένη" },
        ],
        exams: [
            { id: 1, title: "Διαγώνισμα Γεωμετρίας", date: "2025-08-04", result: "Αναμένεται" },
        ],
        schedule: [
            { day: "Δευτέρα", time: "13:00 - 14:00" },
            { day: "Τετάρτη", time: "13:00 - 14:00" },
            { day: "Παρασκευή", time: "13:00 - 15:00" },
        ]
    },
    {
        id: 105,
        name: "Γ' Γυμνασίου - Τμήμα Α",
        lesson: "Νέα ελληνική γλώσσα",
        curriculum: "Λογοτεχνία, Παραγωγή Λόγου",
        hoursPerWeek: 3,
        enrolledStudents: getStudentsForClass(22, 6), // 6 students
        maxStudents: 5,
        homework: [
            { id: 1, title: "Ανάλυση Ποιήματος", dueDate: "2025-07-24", status: "Ανατεθειμένη" },
        ],
        exams: [
            { id: 1, title: "Εξέταση Έκθεσης", date: "2025-08-05", result: "Αναμένεται" },
        ],
        schedule: [
            { day: "Τρίτη", time: "10:00 - 12:00" },
            { day: "Πέμπτη", time: "10:00 - 11:00" },
        ]
    },
    {
        id: 106,
        name: "Γ' Γυμνασίου - Τμήμα Β",
        lesson: "Μαθηματικά",
        curriculum: "Συναρτήσεις, Πιθανότητες",
        hoursPerWeek: 4,
        enrolledStudents: getStudentsForClass(28, 5), // 5 students
        maxStudents: 5,
        homework: [
            { id: 1, title: "Ασκήσεις Συναρτήσεων", dueDate: "2025-07-25", status: "Ανατεθειμένη" },
        ],
        exams: [
            { id: 1, title: "Διαγώνισμα Πιθανοτήτων", date: "2025-08-06", result: "Αναμένεται" },
        ],
        schedule: [
            { day: "Δευτέρα", time: "09:00 - 10:00" },
            { day: "Τετάρτη", time: "09:00 - 11:00" },
            { day: "Παρασκευή", time: "09:00 - 10:00" },
        ]
    },
    {
        id: 107,
        name: "Α' Λυκείου - Τμήμα Α",
        lesson: "Άλγεβρα",
        curriculum: "Πολυώνυμα, Εξισώσεις Δευτέρου Βαθμού",
        hoursPerWeek: 3,
        enrolledStudents: getStudentsForClass(33, 6), // 6 students
        maxStudents: 5,
        homework: [
            { id: 1, title: "Λύση Πολυωνυμικών Εξισώσεων", dueDate: "2025-07-26", status: "Ανατεθειμένη" },
        ],
        exams: [
            { id: 1, title: "Διαγώνισμα Άλγεβρας", date: "2025-08-07", result: "Αναμένεται" },
        ],
        schedule: [
            { day: "Τρίτη", time: "13:00 - 15:00" },
            { day: "Πέμπτη", time: "13:00 - 14:00" },
        ]
    },
    {
        id: 108,
        name: "Β' Λυκείου - Θετική Κατεύθυνση",
        lesson: "Μαθηματικά κατεύθυνσης",
        curriculum: "Διανύσματα, Όρια",
        hoursPerWeek: 5,
        enrolledStudents: getStudentsForClass(39, 5), // 5 students
        maxStudents: 5,
        homework: [
            { id: 1, title: "Ασκήσεις Διανυσμάτων", dueDate: "2025-07-27", status: "Ανατεθειμένη" },
            { id: 2, title: "Προβλήματα Ορίων", dueDate: "2025-07-30", status: "Ανατεθειμένη" },
        ],
        exams: [
            { id: 1, title: "Προσομοίωση Εξετάσεων", date: "2025-08-08", result: "Αναμένεται" },
        ],
        schedule: [
            { day: "Δευτέρα", time: "16:00 - 18:00" },
            { day: "Τετάρτη", time: "16:00 - 18:00" },
            { day: "Παρασκευή", time: "16:00 - 17:00" },
        ]
    },
    {
        id: 109,
        name: "Γ' Λυκείου - Ανθρωπιστικών",
        lesson: "Νέα ελληνική γλώσσα",
        curriculum: "Εκφραστική Γραφή, Ερμηνεία Κειμένων",
        hoursPerWeek: 4,
        enrolledStudents: getStudentsForClass(44, 6), // 6 students
        maxStudents: 5,
        homework: [
            { id: 1, title: "Δοκίμιο", dueDate: "2025-07-28", status: "Ανατεθειμένη" },
        ],
        exams: [
            { id: 1, title: "Τελική Εξέταση", date: "2025-08-09", result: "Αναμένεται" },
        ],
        schedule: [
            { day: "Τρίτη", time: "14:00 - 16:00" },
            { day: "Πέμπτη", time: "14:00 - 16:00" },
        ]
    },
    {
        id: 110,
        name: "Γ' Λυκείου - Οικονομίας & Πληροφορικής",
        lesson: "Πληροφορική",
        curriculum: "Αλγόριθμοι, Προγραμματισμός",
        hoursPerWeek: 5,
        enrolledStudents: getStudentsForClass(50, 5), // 5 students
        maxStudents: 5,
        homework: [
            { id: 1, title: "Άσκηση Προγραμματισμού", dueDate: "2025-07-29", status: "Ανατεθειμένη" },
            { id: 2, title: "Μελέτη Περίπτωσης", dueDate: "2025-08-01", status: "Ανατεθειμένη" },
        ],
        exams: [
            { id: 1, title: "Εξέταση Αλγορίθμων", date: "2025-08-10", result: "Αναμένεται" },
        ],
        schedule: [
            { day: "Δευτέρα", time: "17:00 - 19:00" },
            { day: "Τετάρτη", time: "17:00 - 19:00" },
            { day: "Παρασκευή", time: "17:00 - 18:00" },
        ]
    }
];
