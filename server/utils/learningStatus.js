const getLearningPlanStatus = (progress) => {
    if (!progress) {
        return "generated";
    }

    const percentage =
        Number(progress.percentage) || 0;

    if (percentage >= 100) {
        return "completed";
    }

    if (percentage > 0) {
        return "in_progress";
    }

    return "generated";
};

module.exports = {
    getLearningPlanStatus
};