const getSessionStatus = ({
    session,
    date
}) => {
    if (session.completed === true) {
        return "completed";
    }

    const today =
        new Date()
            .toISOString()
            .split("T")[0];

    if (date < today) {
        return "missed";
    }

    return "pending";
};

module.exports = {
    getSessionStatus
};