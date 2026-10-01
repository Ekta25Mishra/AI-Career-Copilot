const JobDescription = require("../models/JobDescription");
const {
  analyzeJobDescription,
  analyzeSkillGap,
} = require("../services/aiService");
const Resume = require("../models/Resume");
const { areSkillsSimilar } = require("../utils/skillNormalizer");

const createJobDescription = async (req, res) => {
  try {
    const { title, company, description } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({
        message: "Job title is required!",
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        message: "Job description is required!",
      });
    }

    const jobDescription = await JobDescription.create({
      user: req.user.userId,
      title: title.trim(),
      company: company ? company.trim() : "",
      description: description.trim(),
    });

    res.status(201).json({
      message: "Job description created successfully",
      jobDescription: {
        id: jobDescription._id,
        title: jobDescription.title,
        company: jobDescription.company,
        description: jobDescription.description,
        analysisStatus: jobDescription.analysisStatus,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create job description",
    });
  }
};

const getAllJobDescriptions = async (req, res) => {
  try {
    const jobDescriptions = await JobDescription.find({
      user: req.user.userId,
    }).sort({
      createdAt: -1,
    });

    res.json({
      jobDescriptions,
    });
  } catch (error) {
    console.error("Get job descriptions error:", error.message);

    res.status(500).json({
      message: "Failed to fetch job descriptions",
    });
  }
};

const getJobDescription = async (req, res) => {
  try {
    const jobDescription = await JobDescription.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!jobDescription) {
      return res.status(404).json({
        message: "Job description not found",
      });
    }

    res.json({
      jobDescription,
    });
  } catch (error) {
    console.error("Get job description error:", error.message);

    res.status(500).json({
      message: "Failed to fetch job description",
    });
  }
};

const deleteJobDescription = async (req, res) => {
  try {
    const jobDescription = await JobDescription.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!jobDescription) {
      return res.status(404).json({
        message: "Job description not found",
      });
    }

    await JobDescription.deleteOne({
      _id: jobDescription._id,
    });

    res.json({
      message: "Job description deleted successfully",
    });
  } catch (error) {
    console.error("Delete job description error:", error.message);

    res.status(500).json({
      message: "Failed to delete job description",
    });
  }
};

const analyzeJobDescriptionWithAI = async (req, res) => {
  try {
    // 1. Find the JD and verify ownership
    const jobDescription = await JobDescription.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!jobDescription) {
      return res.status(404).json({
        message: "Job description not found",
      });
    }

    // 2. Validate description
    if (!jobDescription.description || !jobDescription.description.trim()) {
      return res.status(400).json({
        message: "Job description is empty",
      });
    }

    // 3. Return cached analysis
    if (
      jobDescription.analysisStatus === "completed" &&
      jobDescription.structuredAnalysis
    ) {
      return res.json({
        message: "Job description already analyzed",
        analysis: jobDescription.structuredAnalysis,
      });
    }

    // 4. Mark as analyzing
    jobDescription.analysisStatus = "analyzing";

    await jobDescription.save();

    // 5. Send JD to AI service
    const result = await analyzeJobDescription(jobDescription.description);

    const analysis = result.analysis;

    // 6. Validate AI response
    if (!analysis || typeof analysis !== "object" || Array.isArray(analysis)) {
      jobDescription.analysisStatus = "failed";
      await jobDescription.save();

      return res.status(502).json({
        message: "AI returned an invalid job description analysis",
      });
    }

    // 7. Required fields
    const requiredFields = [
      "job_title",
      "required_skills",
      "preferred_skills",
      "experience",
      "responsibilities",
      "qualifications",
    ];

    // 8. Check missing fields
    const missingFields = requiredFields.filter(
      (field) => !(field in analysis),
    );

    if (missingFields.length > 0) {
      jobDescription.analysisStatus = "failed";
      await jobDescription.save();

      return res.status(502).json({
        message: "AI analysis is missing required fields",
        missingFields,
      });
    }

    // 9. Validate array fields
    if (
      !Array.isArray(analysis.required_skills) ||
      !Array.isArray(analysis.preferred_skills) ||
      !Array.isArray(analysis.responsibilities) ||
      !Array.isArray(analysis.qualifications)
    ) {
      jobDescription.analysisStatus = "failed";
      await jobDescription.save();

      return res.status(502).json({
        message: "AI analysis contains invalid data types",
      });
    }

    // 10. Save analysis
    jobDescription.structuredAnalysis = analysis;

    jobDescription.analysisStatus = "completed";

    await jobDescription.save();

    // 11. Send response
    res.json({
      message: "Job description analyzed successfully",
      analysis: jobDescription.structuredAnalysis,
    });
  } catch (error) {
    console.error("Job description AI error:", error.message);

    // Mark analysis as failed
    try {
      const jobDescription = await JobDescription.findOne({
        _id: req.params.id,
        user: req.user.userId,
      });

      if (jobDescription) {
        jobDescription.analysisStatus = "failed";
        await jobDescription.save();
      }
    } catch (dbError) {
      console.error("Failed to update JD analysis status:", dbError.message);
    }

    res.status(500).json({
      message: "Failed to analyze job description",
    });
  }
};

const analyzeSkillGapWithAI = async (req, res) => {
  try {
    // 1. Find user's job description
    const jobDescription = await JobDescription.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!jobDescription) {
      return res.status(404).json({
        message: "Job description not found",
      });
    }

    // 2. Find user's resume
    const resume = await Resume.findOne({
      user: req.user.userId,
    });

    if (!resume) {
      return res.status(404).json({
        message: "Resume not found",
      });
    }

    // 3. Resume must be analyzed
    if (resume.analysisStatus !== "completed" || !resume.structuredAnalysis) {
      return res.status(400).json({
        message: "Please analyze your resume first",
      });
    }

    // 4. Job description must be analyzed
    if (
      jobDescription.analysisStatus !== "completed" ||
      !jobDescription.structuredAnalysis
    ) {
      return res.status(400).json({
        message: "Please analyze the job description first",
      });
    }

    // 5. Get resume skills
    const resumeSkills = resume.structuredAnalysis.skills;

    if (!Array.isArray(resumeSkills)) {
      return res.status(400).json({
        message: "Resume skills are invalid",
      });
    }

    // 6. Get JD analysis
    const jobAnalysis = jobDescription.structuredAnalysis;

    const requiredSkills = Array.isArray(jobAnalysis.required_skills)
      ? jobAnalysis.required_skills
      : [];

    const preferredSkills = Array.isArray(jobAnalysis.preferred_skills)
      ? jobAnalysis.preferred_skills
      : [];

    // 7. Find matched required skills
    const matchedRequiredSkills = requiredSkills.filter((jobSkill) =>
      resumeSkills.some((resumeSkill) =>
        areSkillsSimilar(resumeSkill, jobSkill),
      ),
    );

    // 8. Find missing required skills
    const missingRequiredSkills = requiredSkills.filter(
      (jobSkill) =>
        !resumeSkills.some((resumeSkill) =>
          areSkillsSimilar(resumeSkill, jobSkill),
        ),
    );

    // 9. Find matched preferred skills
    const matchedPreferredSkills = preferredSkills.filter((jobSkill) =>
      resumeSkills.some((resumeSkill) =>
        areSkillsSimilar(resumeSkill, jobSkill),
      ),
    );

    // 10. Find missing preferred skills
    const missingPreferredSkills = preferredSkills.filter(
      (jobSkill) =>
        !resumeSkills.some((resumeSkill) =>
          areSkillsSimilar(resumeSkill, jobSkill),
        ),
    );

    // 11. Find extra resume skills
    const allJobSkills = [...requiredSkills, ...preferredSkills];

    const extraSkills = resumeSkills.filter(
      (resumeSkill) =>
        !allJobSkills.some((jobSkill) =>
          areSkillsSimilar(resumeSkill, jobSkill),
        ),
    );

    // 12. Calculate required skill match percentage
    const requiredSkillMatchPercentage =
      requiredSkills.length === 0
        ? 0
        : Math.round(
            (matchedRequiredSkills.length / requiredSkills.length) * 100,
          );

    // 12. Ask Gemini for experience gap + summary
    const result = await analyzeSkillGap(resumeSkills, jobAnalysis);

    const aiAnalysis = result.analysis;

    if (
      !aiAnalysis ||
      typeof aiAnalysis !== "object" ||
      Array.isArray(aiAnalysis)
    ) {
      return res.status(502).json({
        message: "AI returned an invalid skill gap analysis",
      });
    }

    // 13. Create final analysis
    const analysis = {
      matched_required_skills: matchedRequiredSkills,

      missing_required_skills: missingRequiredSkills,

      required_skill_match_percentage: requiredSkillMatchPercentage,

      matched_preferred_skills: matchedPreferredSkills,

      missing_preferred_skills: missingPreferredSkills,

      extra_skills: extraSkills,

      experience_gap:
        typeof aiAnalysis.experience_gap === "string"
          ? aiAnalysis.experience_gap
          : "",

      summary: typeof aiAnalysis.summary === "string" ? aiAnalysis.summary : "",
    };

    // 14. Save to MongoDB
    jobDescription.skillGapAnalysis = analysis;

    await jobDescription.save();

    // 15. Return result
    res.json({
      message: "Skill gap analysis completed successfully",

      analysis: jobDescription.skillGapAnalysis,
    });
  } catch (error) {
    console.error("Skill gap analysis error:", error.message);

    res.status(500).json({
      message: "Failed to analyze skill gap",
    });
  }
};

module.exports = {
  createJobDescription,
  getAllJobDescriptions,
  getJobDescription,
  deleteJobDescription,
  analyzeJobDescriptionWithAI,
  analyzeSkillGapWithAI,
};
