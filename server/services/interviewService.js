const axios = require("axios");

const AI_SERVICE_URL =  "http://127.0.0.1:8000";

const generateInterviewQuestions = async (payload) => {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/generate-interview-questions`,
      payload,
      {
        timeout: 120000,
      },
    );

    if (response.data?.error) {
      throw new Error(response.data.error);
    }

    if (!response.data?.questions) {
      throw new Error("Invalid response from AI service");
    }

    return response.data;
  } catch (error) {
    console.error(
      "Generate interview questions AI service error:",
      error.response?.data || error.message,
    );

    throw new Error("Failed to generate interview questions");
  }
};

module.exports = {
  generateInterviewQuestions,
};
