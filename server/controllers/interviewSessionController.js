const Interview = require("../models/Interview");
const {
  evaluateInterviewAnswer,
} = require("../services/interviewEvaluationService");

const MIN_PREPARATION_DAYS = 2;

const scheduleInterview = async (req, res) => {
  try {
    const { interviewId, scheduledAt, mode = "text" } = req.body;

    if (!interviewId || !scheduledAt) {
      return res.status(400).json({
        message: "interviewId and scheduledAt are required",
      });
    }

    if (!["text", "voice"].includes(mode)) {
      return res.status(400).json({
        message: "Mode must be text or voice",
      });
    }

    const interview = await Interview.findById(interviewId);

    if (!interview) {
      return res.status(404).json({
        message: "Interview does not exist",
        interviewId,
      });
    }

    // Check ownership separately
    if (interview.user.toString() !== req.user.userId.toString()) {
      return res.status(403).json({
        message: "You do not have permission to schedule this interview",
        interviewOwner: interview.user,
        loggedInUser: req.user.userId,
      });
    }

    if (interview.status === "completed") {
      return res.status(400).json({
        message: "This interview is already completed",
      });
    }

    const requestedDate = new Date(scheduledAt);

    if (Number.isNaN(requestedDate.getTime())) {
      return res.status(400).json({
        message: "Invalid scheduledAt date",
      });
    }

    const latestCompletedInterview = await Interview.findOne({
      user: req.user.userId,
      status: "completed",
      completedAt: { $ne: null },
    }).sort({ completedAt: -1 });

    if (latestCompletedInterview) {
      const minimumDate = new Date(latestCompletedInterview.completedAt);

      minimumDate.setDate(minimumDate.getDate() + 2);

      if (requestedDate < minimumDate) {
        return res.status(400).json({
          message:
            "You need at least 2 days of preparation before the next interview.",
          minimumAllowedDate: minimumDate,
        });
      }
    }

    interview.scheduledAt = requestedDate;
    interview.mode = mode;
    interview.status = "scheduled";

    await interview.save();

    return res.status(200).json({
      message: "Interview scheduled successfully",
      interviewId: interview._id,
      scheduledAt: interview.scheduledAt,
      mode: interview.mode,
      status: interview.status,
    });
  } catch (error) {
    console.error("Schedule interview error:", error);

    return res.status(500).json({
      message: "Failed to schedule interview",
      error: error.message,
    });
  }
};

const startInterview = async (req, res) => {
  try {
    const { interviewId } = req.params;

    const interview = await Interview.findOne({
      _id: interviewId,
      user: req.user.userId,
    });

    if (!interview) {
      return res.status(404).json({
        message: "Interview not found",
      });
    }

    if (interview.status === "completed") {
      return res.status(400).json({
        message: "Interview is already completed",
      });
    }

    if (interview.status !== "scheduled") {
      return res.status(400).json({
        message: "Interview must be scheduled before it can be started",
      });
    }

    if (interview.scheduledAt && new Date() < new Date(interview.scheduledAt)) {
      return res.status(400).json({
        message: "Interview start time has not arrived yet",
        scheduledAt: interview.scheduledAt,
      });
    }

    interview.status = "in_progress";
    interview.startedAt = new Date();

    await interview.save();

    return res.status(200).json({
      message: "Interview started successfully",
      interviewId: interview._id,
      totalQuestions: interview.totalQuestions,
      mode: interview.mode,
    });
  } catch (error) {
    console.error("Start interview error:", error);

    return res.status(500).json({
      message: "Failed to start interview",
    });
  }
};

const getCurrentQuestion = async (req, res) => {
  try {
    const { interviewId } = req.params;

    const interview = await Interview.findOne({
      _id: interviewId,
      user: req.user.userId,
    });

    if (!interview) {
      return res.status(404).json({
        message: "Interview not found",
      });
    }

    if (interview.status !== "in_progress") {
      return res.status(400).json({
        message: "Interview is not currently in progress",
      });
    }

    const questionIndex = interview.questions.findIndex(
      (question) => question.status === "pending",
    );

    if (questionIndex === -1) {
      return res.status(200).json({
        completed: true,
        message: "All interview questions have been answered",
      });
    }

    const question = interview.questions[questionIndex];

    return res.status(200).json({
      completed: false,
      questionNumber: questionIndex + 1,
      totalQuestions: interview.totalQuestions,
      question: {
        questionId: question.questionId,
        question: question.question,
        type: question.type,
        skill: question.skill,
        difficulty: question.difficulty,
      },
    });
  } catch (error) {
    console.error("Get current question error:", error);

    return res.status(500).json({
      message: "Failed to get current question",
    });
  }
};

const submitAnswer = async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { questionId, answer } = req.body;

    if (!questionId || !answer?.trim()) {
      return res.status(400).json({
        message: "questionId and answer are required",
      });
    }

    const interview = await Interview.findOne({
      _id: interviewId,
      user: req.user.userId,
    });

    if (!interview) {
      return res.status(404).json({
        message: "Interview not found",
      });
    }

    if (interview.status !== "in_progress") {
      return res.status(400).json({
        message: "Interview is not currently in progress",
      });
    }

    const question = interview.questions.find(
      (item) => item.questionId === questionId,
    );

    if (!question) {
      return res.status(404).json({
        message: "Question not found",
      });
    }

    if (question.status === "answered") {
      return res.status(400).json({
        message: "This question has already been answered",
      });
    }

    const evaluation = await evaluateInterviewAnswer({
      question: question.question,
      question_type: question.type,
      skill: question.skill,
      difficulty: question.difficulty,
      ideal_answer: question.idealAnswer,
      user_answer: answer.trim(),
    });

    question.userAnswer = answer.trim();
    question.score = Number(evaluation.score);
    question.feedback = evaluation.feedback || "";
    question.strengths = evaluation.strengths || [];
    question.improvementAreas = evaluation.improvementAreas || [];
    question.status = "answered";
    question.answeredAt = new Date();

    interview.answeredQuestions = interview.questions.filter(
      (item) => item.status === "answered",
    ).length;

    const remainingQuestions = interview.questions.filter(
      (item) => item.status === "pending",
    ).length;

    if (remainingQuestions === 0) {
      const answeredQuestions = interview.questions.filter(
        (item) => item.status === "answered",
      );

      const totalScore = answeredQuestions.reduce(
        (sum, item) => sum + item.score,
        0,
      );

      interview.overallScore =
        answeredQuestions.length > 0
          ? Number((totalScore / answeredQuestions.length).toFixed(2))
          : 0;

      interview.completedAt = new Date();
      interview.status = "completed";

      const strongSkills = {};
      const weakSkills = {};

      answeredQuestions.forEach((item) => {
        if (!item.skill) return;

        if (item.score >= 7) {
          strongSkills[item.skill] = (strongSkills[item.skill] || 0) + 1;
        } else {
          weakSkills[item.skill] = (weakSkills[item.skill] || 0) + 1;
        }
      });

      interview.strongAreas = Object.keys(strongSkills);
      interview.weakAreas = Object.keys(weakSkills);

      interview.preparationFeedback =
        interview.overallScore >= 8
          ? "Strong interview performance. Focus on maintaining consistency and practicing advanced questions."
          : interview.overallScore >= 6
            ? "Good foundation. Review weak areas and practice explaining concepts more clearly."
            : "More preparation is recommended. Focus on weak concepts and practice answering questions regularly.";
    }

    await interview.save();

    return res.status(200).json({
      message:
        interview.status === "completed"
          ? "Answer submitted and interview completed"
          : "Answer evaluated successfully",

      evaluation: {
        score: question.score,
        feedback: question.feedback,
        strengths: question.strengths,
        improvementAreas: question.improvementAreas,
        idealAnswer: evaluation.idealAnswer || question.idealAnswer,
      },

      interviewStatus: interview.status,
      answeredQuestions: interview.answeredQuestions,
      totalQuestions: interview.totalQuestions,
      nextQuestionAvailable: interview.status !== "completed",
    });
  } catch (error) {
    console.error(
      "Submit interview answer error:",
      error.response?.data || error.message || error,
    );

    return res.status(500).json({
      message: "Failed to submit interview answer",
      error: error.message,
    });
  }
};

const getInterviewReport = async (req, res) => {
  try {
    const { interviewId } = req.params;

    const interview = await Interview.findOne({
      _id: interviewId,
      user: req.user.userId,
    }).lean();

    if (!interview) {
      return res.status(404).json({
        message: "Interview not found",
      });
    }

    if (interview.status !== "completed") {
      return res.status(400).json({
        message: "Interview has not been completed yet",
      });
    }

    const questions = interview.questions.map((question, index) => ({
      questionNumber: index + 1,
      questionId: question.questionId,
      question: question.question,
      type: question.type,
      skill: question.skill,
      difficulty: question.difficulty,
      source: question.source,
      userAnswer: question.userAnswer,
      score: question.score,
      feedback: question.feedback,
      strengths: question.strengths,
      improvementAreas: question.improvementAreas,
    }));

    return res.status(200).json({
      message: "Interview report retrieved successfully",
      report: {
        interviewId: interview._id,
        overallScore: interview.overallScore,
        totalQuestions: interview.totalQuestions,
        answeredQuestions: interview.answeredQuestions,
        strongAreas: interview.strongAreas,
        weakAreas: interview.weakAreas,
        preparationFeedback: interview.preparationFeedback,
        completedAt: interview.completedAt,
        questions,
      },
    });
  } catch (error) {
    console.error("Get interview report error:", error);

    return res.status(500).json({
      message: "Failed to retrieve interview report",
    });
  }
};

module.exports = {
  scheduleInterview,
  startInterview,
  getCurrentQuestion,
  submitAnswer,
  getInterviewReport,
};
