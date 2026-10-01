const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
    createLearningPlan
} = require("../controllers/learningPlanController");

router.post(
    "/",
    protect,
    createLearningPlan
);

module.exports = router;