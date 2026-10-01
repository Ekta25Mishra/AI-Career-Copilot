const axios = require("axios");

const AI_SERVICE_URL = "http://localhost:8000";

const analyzeResume = async (resumeText) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/analyze-resume`, {
      resumeText: resumeText,
    });

    if (response.data.error) {
      throw new Error(response.data.error);
    }

    if (!response.data.analysis) {
      throw new Error("AI service returned no analysis");
    }

    return response.data;
  } catch (error) {
    console.error("========== AI SERVICE ERROR ==========");

    if (error.response) {
      console.error("Status:", error.response.status);

      console.error("Response:", error.response.data);
    } else if (error.request) {
      console.error("No response received from AI service");
    } else {
      console.error("Error:", error.message);
    }

    console.error("======================================");

    throw error;
  }
};

const analyzeJobDescription = async (jobDescriptionText) => {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/analyze-job-description`,
      {
        jobDescription: jobDescriptionText,
      },
    );

    console.log("Job description AI response:", response.data);

    if (response.data.error) {
      throw new Error(response.data.error);
    }

    if (!response.data.analysis) {
      throw new Error("AI service returned no job description analysis");
    }

    return response.data;
  } catch (error) {
    console.error("========== JOB DESCRIPTION AI ERROR ==========");

    if (error.response) {
      console.error("Status:", error.response.status);

      console.error("Response:", error.response.data);
    } else if (error.request) {
      console.error("No response received from AI service");
    } else {
      console.error("Error:", error.message);
    }

    console.error("==============================================");

    throw error;
  }
};

const analyzeSkillGap = async (resumeSkills, jobDescriptionAnalysis) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/analyze-skill-gap`, {
      resumeSkills,
      jobDescriptionAnalysis,
    });

    console.log("Skill gap AI response:", response.data);

    if (response.data.error) {
      throw new Error(response.data.error);
    }

    if (!response.data.analysis) {
      throw new Error("AI service returned no skill gap analysis");
    }

    return response.data;
  } catch (error) {
    console.error("========== SKILL GAP AI ERROR ==========");

    if (error.response) {
      console.error("Status:", error.response.status);

      console.error("Response:", error.response.data);
    } else if (error.request) {
      console.error("No response received from AI service");
    } else {
      console.error("Error:", error.message);
    }

    console.error("=========================================");

    throw error;
  }
};

const generateLearningRoadmap = async (data) => {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/generate-learning-roadmap`,
      data,
    );

    console.log("Learning roadmap AI response:", response.data);

    if (response.data.error) {
      throw new Error(response.data.error);
    }

    if (!response.data.plan) {
      throw new Error("AI service returned no learning roadmap");
    }

    return response.data;
  } catch (error) {
    console.error("========== LEARNING ROADMAP AI ERROR ==========");

    if (error.response) {
      console.error("Status:", error.response.status);

      console.error("Response:", error.response.data);
    } else if (error.request) {
      console.error("No response received from AI service");
    } else {
      console.error("Error:", error.message);
    }

    console.error("================================================");

    throw error;
  }
};

module.exports = { analyzeResume, analyzeJobDescription, analyzeSkillGap,generateLearningRoadmap };
