const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
    scheduleInterview,
    startInterview,
    getCurrentQuestion,
    submitAnswer,
    getInterviewReport
} = require("../controllers/interviewSessionController");

router.post("/schedule", protect, scheduleInterview);

router.post(
    "/:interviewId/start",
    protect,
    startInterview
);

router.get(
    "/:interviewId/current-question",
    protect,
    getCurrentQuestion
);

router.post(
    "/:interviewId/answer",
    protect,
    submitAnswer
);

router.get(
    "/:interviewId/report",
    protect,
    getInterviewReport
);

module.exports = router;