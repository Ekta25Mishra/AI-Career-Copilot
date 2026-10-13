
const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  scheduleInterview,
  startInterview,
  getCurrentQuestion,
  submitAnswer,
  getInterviewReport,
  getInterviewHistory,
} = require("../controllers/interviewSessionController");

// Interview history: all statuses
router.get("/history", protect, getInterviewHistory);

// Schedule an interview
router.post("/schedule", protect, scheduleInterview);

// Start an interview
router.post("/:interviewId/start", protect, startInterview);

// Get the current unanswered question
router.get("/:interviewId/current-question", protect, getCurrentQuestion);

// Submit an answer
router.post("/:interviewId/answer", protect, submitAnswer);

// Get the final report (completed interviews only)
router.get("/:interviewId/report", protect, getInterviewReport);

module.exports = router;
