const express = require("express");

const upload = require("../middleware/uploadMiddleware");
const protect = require("../middleware/authMiddleware");
const { uploadResume, deleteResume, getResume, analyzeResumeWithAI  } = require("../controllers/resumeController");

const router = express.Router();

router.post(
    "/upload",
    protect,
    upload.single("resume"),
    uploadResume
);
router.delete("/delete", protect,deleteResume)
router.get("/",protect,getResume)
router.post("/analyze",protect,analyzeResumeWithAI )

module.exports = router;