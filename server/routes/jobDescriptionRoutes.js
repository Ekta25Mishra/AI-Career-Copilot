const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");

const {createJobDescription, getAllJobDescriptions, getJobDescription, deleteJobDescription, analyzeJobDescriptionWithAI, analyzeSkillGapWithAI} = require("../controllers/jobDescriptionController");

router.post("/", protect, createJobDescription)
router.get("/", protect, getAllJobDescriptions);
router.get("/:id", protect,getJobDescription);
router.delete("/:id", protect, deleteJobDescription)
router.post("/:id/analyze",protect,analyzeJobDescriptionWithAI)
router.post("/:id/skill-gap", protect, analyzeSkillGapWithAI)

module.exports = router;