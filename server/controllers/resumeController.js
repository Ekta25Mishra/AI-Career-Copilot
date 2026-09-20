const { extractTextFromPDF } = require("../services/resumeService");
const { analyzeResume } = require("../services/aiService");
const Resume = require("../models/Resume");
const fs = require("fs/promises");

const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Resume file is required",
      });
    }

    const existingResume = await Resume.findOne({
      user: req.user.userId,
    });

    if (existingResume) {
      return res.status(400).json({
        message:
          "You already have a resume. Delete it before uploading a new one.",
      });
    }

    const result = await extractTextFromPDF(req.file.path);

    const resume = await Resume.create({
      user: req.user.userId,
      originalname: req.file.originalname,
      filename: req.file.filename,
      filePath: req.file.path,
      extractedText: result.text,
      pages: result.pages,
    });

    res.status(200).json({
      message: "Resume uploaded and processed successfully",

      resume: {
        id: resume._id,
        originalname: resume.originalname,
        filename: resume.filename,
        pages: resume.pages,
        extractedText: resume.extractedText,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

const deleteResume = async (req, res) => {
  try {
    const resume = await Resume.findOne({
      user: req.user.userId,
    });

    if (!resume) {
      return res.status(404).json({
        message: "Resume not found!",
      });
    }

    try {
      await fs.unlink(resume.filePath);
    } catch (err) {
      res.json({
        message: err.message,
      });
    }

    await Resume.deleteOne({
      _id: resume._id,
    });

    res.status(200).json({
      message: "Resume deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

const getResume = async (req, res) => {
  try {
    const resume = await Resume.findOne({
      user: req.user.userId,
    });

    if (!resume) {
      return res.status(404).json({
        message: "Resume not found",
      });
    }

    res.status(200).json({
      resume: {
        id: resume._id,
        originalName: resume.originalName,
        filename: resume.filename,
        pages: resume.pages,
        extractedText: resume.extractedText,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

const testAIService = async (req, res) => {
  try {
    const resume = await Resume.findOne({
      user: req.user.userId,
    });

    if (!resume) {
      return res.status(404).json({
        message: "Resume not found!",
      });
    }

    const result = await analyzeResume(resume.extractedText);

    resume.structuredAnalysis = result.analysis;
    await resume.save();

    res.json({
      message: "Resume analyzed successfully",
      analysis: resume.structuredAnalysis,
    });
    
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

module.exports = {
  uploadResume,
  deleteResume,
  getResume,
  testAIService,
};
