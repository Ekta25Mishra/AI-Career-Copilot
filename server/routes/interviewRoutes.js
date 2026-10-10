const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
    createInterview
} = require("../controllers/interviewController");

router.post(
    "/generate",
    protect,
    createInterview
);

module.exports = router;