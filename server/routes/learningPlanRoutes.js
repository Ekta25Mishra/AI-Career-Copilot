const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  createLearningPlan,
  getLearningPlan,
  getAllLearningPlans,
  deleteLearningPlan,
  completeLearningSession,
  getNextLearningSession,
  getTodayLearningSessions,
  getLearningDashboard,
  getLearningProgress,
  getUpcomingLearningSessions,
  rescheduleMissedLearningSessions,
} = require("../controllers/learningPlanController");

router.post("/", protect, createLearningPlan);
router.get("/", protect, getAllLearningPlans);
router.get("/:id", protect, getLearningPlan);
router.delete("/:id", protect, deleteLearningPlan);
router.patch(
  "/:id/session/:sessionId/complete",
  protect,
  completeLearningSession,
);
router.get("/:id/next-session", protect, getNextLearningSession);
router.get("/:id/today", protect, getTodayLearningSessions);
router.get("/:id/dashboard", protect, getLearningDashboard);
router.get("/:id/progress", protect, getLearningProgress);
router.get("/:id/upcoming", protect, getUpcomingLearningSessions);
router.patch("/:id/reschedule-missed", protect, rescheduleMissedLearningSessions,
);

module.exports = router;
