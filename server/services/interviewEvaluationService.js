const axios = require("axios");

const AI_SERVICE_URL = "http://127.0.0.1:8000";

const evaluateInterviewAnswer = async (payload) => {
    try {
        const response = await axios.post(
            `${AI_SERVICE_URL}/evaluate-interview-answer`,
            payload,
            {
                timeout: 120000
            }
        );

        if (response.data?.error) {
            throw new Error(response.data.error);
        }

        if (!response.data?.evaluation) {
            throw new Error(
                "Invalid evaluation response from AI service"
            );
        }

        return response.data.evaluation;
    } catch (error) {
        console.error(
            "Interview answer evaluation error:",
            error.response?.data || error.message
        );

        throw new Error(
            "Failed to evaluate interview answer"
        );
    }
};

module.exports = {
    evaluateInterviewAnswer
};