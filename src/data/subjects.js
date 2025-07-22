// src/data/subjects.js

export const SUBJECTS_BY_GRADE_AND_CLASS = {
    "Α' Γυμνασίου": {
        "default": ["Νέα ελληνική γλώσσα", "Αρχαία", "Μαθηματικά"]
    },
    "Β' Γυμνασίου": {
        "default": ["Νέα ελληνική γλώσσα", "Αρχαία", "Μαθηματικά"]
    },
    "Γ' Γυμνασίου": {
        "default": ["Νέα ελληνική γλώσσα", "Αρχαία", "Μαθηματικά"]
    },
    "Α' Λυκείου": {
        "default": ["Νέα ελληνική γλώσσα", "Αρχαία", "Άλγεβρα", "Γεωμετρία"]
    },
    "Β' Λυκείου": {
        "Ανθρωπιστικών": ["Νέα ελληνική γλώσσα", "Άλγεβρα", "Γεωμετρία"],
        "Θετικών": ["Νέα ελληνική γλώσσα", "Άλγεβρα", "Γεωμετρία", "Μαθηματικά κατεύθυνσης"]
    },
    "Γ' Λυκείου": {
        "Ανθρωπιστικών": ["Νέα ελληνική γλώσσα"],
        "Θετικών": ["Νέα ελληνική γλώσσα", "Μαθηματικά κατεύθυνσης"],
        "Οικονομίας & Πληροφορικής": ["Νέα ελληνική γλώσσα", "Μαθηματικά κατεύθυνσης", "Αρχές Οικονομικής Θεωρίας", "Πληροφορική"]
    },
    "Γ' ΕΠΑ.Λ.": {
        "default": ["Νέα Ελληνικά", "Μαθηματικά κατεύθυνσης"]
    }
};

export const getSubjects = (grade, specialization) => {
    const gradeData = SUBJECTS_BY_GRADE_AND_CLASS[grade];
    if (!gradeData) {
        return [];
    }
    if (specialization && gradeData[specialization]) {
        return gradeData[specialization];
    }
    return gradeData.default || [];
};

export const getSpecializations = (grade) => {
    const gradeData = SUBJECTS_BY_GRADE_AND_CLASS[grade];
    if (!gradeData || gradeData.default) {
        return [];
    }
    return Object.keys(gradeData);
};
