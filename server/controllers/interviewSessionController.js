const Interview = require("../models/Interview");
const { evaluateInterviewAnswer } = require("../services/interviewEvaluationService");

const MIN_PREPARATION_DAYS = 2;

function getAuthenticatedUserId(req) {
  return req.user?.userId || req.user?.id || req.user?._id;
}

function getQuestionId(question) {
  return String(question?.questionId || question?._id || "");
}

function getPreparationFeedback(score) {
  if (score >= 8) {
    return "Excellent performance! Keep practicing to maintain consistency and refine your answers.";
  }

  if (score >= 6) {
    return "Good progress. Practice explaining your reasoning clearly and strengthen the areas where you lost marks.";
  }

  if (score >= 4) {
    return "You have a foundation to build on. Revise the key concepts and practice answering questions with structured examples.";
  }

  return "More preparation is recommended. Review the fundamentals, study ideal answers, and practice regularly before your next interview.";
}

function getUniqueSkills(questions, predicate) {
  return [
    ...new Set(
      questions
        .filter(predicate)
        .map((question) => question.skill)
        .filter(Boolean)
    ),
  ];
}


// Schedule an interview
async function scheduleInterview(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);
    const { interviewId, scheduledAt, mode = "text" } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    if (!interviewId || !scheduledAt) {
      return res.status(400).json({
        error: "interviewId and scheduledAt are required",
      });
    }

    if (!["text", "voice"].includes(mode)) {
      return res.status(400).json({
        error: "Mode must be either text or voice",
      });
    }

    const scheduleDate = new Date(scheduledAt);

    if (Number.isNaN(scheduleDate.getTime())) {
      return res.status(400).json({
        error: "Invalid scheduledAt date",
      });
    }

    // Allow a small buffer for immediate scheduling.
    const now = new Date();
    const minimumAllowedTime = new Date(now.getTime() - 5000);

    if (scheduleDate < minimumAllowedTime) {
      return res.status(400).json({
        error: "Interview cannot be scheduled in the past",
      });
    }

    const interview = await Interview.findOne({
      _id: interviewId,
      user: userId,
    });

    if (!interview) {
      return res.status(404).json({
        error: "Interview not found",
      });
    }

    if (interview.status === "completed") {
      return res.status(400).json({
        error: "This interview has already been completed",
      });
    }

    if (interview.status === "in_progress") {
      return res.status(400).json({
        error: "This interview is already in progress",
      });
    }

    const latestCompletedInterview = await Interview.findOne({
      user: userId,
      status: "completed",
      completedAt: { $ne: null },
    }).sort({ completedAt: -1 });

    if (
      latestCompletedInterview?.completedAt &&
      latestCompletedInterview._id.toString() !==
        interview._id.toString()
    ) {
      const earliestAllowedDate = new Date(
        latestCompletedInterview.completedAt
      );

      earliestAllowedDate.setDate(
        earliestAllowedDate.getDate() + MIN_PREPARATION_DAYS
      );

      if (scheduleDate < earliestAllowedDate) {
        return res.status(400).json({
          error: `Please allow at least ${MIN_PREPARATION_DAYS} days of preparation after your last completed interview.`,
          earliestAllowedDate,
        });
      }
    }

    // If the requested time is now or just a few seconds ago,
    // normalize it to the current time.
    const finalScheduledAt =
      scheduleDate < now ? now : scheduleDate;

    interview.scheduledAt = finalScheduledAt;
    interview.mode = mode;
    interview.status = "scheduled";

    await interview.save();

    return res.status(200).json({
      message: "Interview scheduled successfully",
      interview: {
        interviewId: interview._id,
        scheduledAt: interview.scheduledAt,
        mode: interview.mode,
        status: interview.status,
      },
    });
  } catch (error) {
    console.error("Schedule interview error:", error);

    return res.status(500).json({
      error: "Failed to schedule interview",
    });
  }
}


// Start a scheduled interview
async function startInterview(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);
    const { interviewId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const interview = await Interview.findOne({
      _id: interviewId,
      user: userId,
    });

    if (!interview) {
      return res.status(404).json({ error: "Interview not found" });
    }

    if (interview.status === "completed") {
      return res.status(400).json({
        error: "This interview has already been completed",
      });
    }

    if (interview.status === "in_progress") {
      return res.status(200).json({
        message: "Interview is already in progress",
        interviewId: interview._id,
        status: interview.status,
      });
    }

    if (interview.status !== "scheduled") {
      return res.status(400).json({
        error: "Only scheduled interviews can be started",
      });
    }

    if (
      interview.scheduledAt &&
      new Date() < new Date(interview.scheduledAt)
    ) {
      return res.status(400).json({
        error: "The scheduled interview time has not arrived yet",
        scheduledAt: interview.scheduledAt,
      });
    }

    interview.status = "in_progress";
    interview.startedAt = new Date();

    await interview.save();

    return res.status(200).json({
      message: "Interview started successfully",
      interviewId: interview._id,
      status: interview.status,
    });
  } catch (error) {
    console.error("Start interview error:", error);
    return res.status(500).json({
      error: "Failed to start interview",
    });
  }
}

// Get the next unanswered question
async function getCurrentQuestion(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);
    const { interviewId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const interview = await Interview.findOne({
      _id: interviewId,
      user: userId,
    });

    if (!interview) {
      return res.status(404).json({ error: "Interview not found" });
    }

    if (interview.status === "completed") {
      return res.status(200).json({
        completed: true,
        interviewStatus: "completed",
        message: "Interview completed",
      });
    }

    if (interview.status !== "in_progress") {
      return res.status(400).json({
        error: "Interview is not in progress",
        interviewStatus: interview.status,
      });
    }

    const questionIndex = interview.questions.findIndex(
      (question) => question.status === "pending"
    );

    if (questionIndex === -1) {
      return res.status(200).json({
        completed: true,
        interviewStatus: interview.status,
        message: "No unanswered questions remain",
      });
    }

    const question = interview.questions[questionIndex];

    return res.status(200).json({
      completed: false,
      interviewStatus: interview.status,
      question: {
        questionId: getQuestionId(question),
        question: question.question,
        type: question.type,
        skill: question.skill,
        difficulty: question.difficulty,
        questionNumber: questionIndex + 1,
        totalQuestions: interview.questions.length,
      },
      questionNumber: questionIndex + 1,
      totalQuestions: interview.questions.length,
    });
  } catch (error) {
    console.error("Get current question error:", error);
    return res.status(500).json({
      error: "Failed to fetch current question",
    });
  }
}

// Submit an answer and save its evaluation without exposing feedback immediately
async function submitAnswer(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);
    const { interviewId } = req.params;
    const { questionId, answer } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!questionId || typeof answer !== "string" || !answer.trim()) {
      return res.status(400).json({
        error: "questionId and a non-empty answer are required",
      });
    }

    const interview = await Interview.findOne({
      _id: interviewId,
      user: userId,
    });

    if (!interview) {
      return res.status(404).json({ error: "Interview not found" });
    }

    if (interview.status !== "in_progress") {
      return res.status(400).json({
        error: "Interview is not in progress",
      });
    }

    const question = interview.questions.find(
      (item) => getQuestionId(item) === String(questionId)
    );

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    if (question.status === "answered") {
      return res.status(400).json({
        error: "This question has already been answered",
      });
    }

    const evaluation = await evaluateInterviewAnswer({
      question: question.question,
      type: question.type,
      skill: question.skill,
      difficulty: question.difficulty,
      ideal_answer: question.idealAnswer || "",
      user_answer: answer.trim(),
    });

    const numericScore = Number(evaluation.score);

    if (!Number.isFinite(numericScore)) {
      return res.status(502).json({
        error: "The evaluation service returned an invalid score",
      });
    }

    // Save the answer and evaluation to MongoDB.
    question.userAnswer = answer.trim();
    question.score = Math.max(0, Math.min(10, numericScore));
    question.feedback = evaluation.feedback || "";
    question.strengths = Array.isArray(evaluation.strengths)
      ? evaluation.strengths
      : [];
    question.improvementAreas = Array.isArray(evaluation.improvementAreas)
      ? evaluation.improvementAreas
      : [];

    if (
      typeof evaluation.idealAnswer === "string" &&
      evaluation.idealAnswer.trim()
    ) {
      question.idealAnswer = evaluation.idealAnswer.trim();
    }

    question.status = "answered";
    question.answeredAt = new Date();

    const answeredQuestions = interview.questions.filter(
      (item) => item.status === "answered"
    );

    const pendingQuestions = interview.questions.filter(
      (item) => item.status === "pending"
    );

    interview.answeredQuestions = answeredQuestions.length;

    if (pendingQuestions.length === 0) {
      const scoredQuestions = interview.questions.filter(
        (item) => Number.isFinite(Number(item.score))
      );

      const totalScore = scoredQuestions.reduce(
        (sum, item) => sum + Number(item.score),
        0
      );

      interview.overallScore = scoredQuestions.length
        ? Number((totalScore / scoredQuestions.length).toFixed(2))
        : 0;

      interview.status = "completed";
      interview.completedAt = new Date();

      interview.strongAreas = getUniqueSkills(
        interview.questions,
        (item) => Number(item.score) >= 7
      );

      interview.weakAreas = getUniqueSkills(
        interview.questions,
        (item) => Number(item.score) < 7
      );

      interview.preparationFeedback = getPreparationFeedback(
        interview.overallScore
      );
    }

    await interview.save();

    // Intentionally do not return the score or feedback here.
    // The frontend should display the report only after the final answer.
    return res.status(200).json({
      message:
        interview.status === "completed"
          ? "All answers submitted. Your interview report is ready."
          : "Answer submitted successfully",
      interviewId: interview._id,
      interviewStatus: interview.status,
      completed: interview.status === "completed",
      answeredQuestions: interview.answeredQuestions,
      totalQuestions: interview.questions.length,
      nextQuestionAvailable: interview.status !== "completed",
    });
  } catch (error) {
    console.error("Submit interview answer error:", error);
    return res.status(500).json({
      error: error.message === "Failed to evaluate interview answer"
        ? error.message
        : "Failed to submit answer",
    });
  }
}

// Get the completed interview report
async function getInterviewReport(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);
    const { interviewId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const interview = await Interview.findOne({
      _id: interviewId,
      user: userId,
    })
      .populate("jobDescription", "title company")
      .lean();

    if (!interview) {
      return res.status(404).json({ error: "Interview not found" });
    }

    if (interview.status !== "completed") {
      return res.status(400).json({
        error: "The report is available after the interview is completed",
        interviewStatus: interview.status,
      });
    }

    const questions = (interview.questions || []).map((question, index) => ({
      questionNumber: index + 1,
      questionId: question.questionId || question._id,
      question: question.question,
      type: question.type,
      skill: question.skill || "",
      difficulty: question.difficulty,
      source: question.source,
      userAnswer: question.userAnswer || "",
      idealAnswer: question.idealAnswer || "",
      score: question.score,
      feedback: question.feedback || "",
      strengths: question.strengths || [],
      improvementAreas: question.improvementAreas || [],
      answeredAt: question.answeredAt || null,
    }));

    const report = {
      interviewId: interview._id,
      jobTitle: interview.jobDescription?.title || "",
      company: interview.jobDescription?.company || "",
      status: interview.status,
      mode: interview.mode,
      difficulty: interview.difficulty,
      overallScore: interview.overallScore ?? 0,
      averageScore: interview.overallScore ?? 0,
      totalQuestions: interview.totalQuestions || questions.length,
      answeredQuestions: interview.answeredQuestions || questions.length,
      strongAreas: interview.strongAreas || [],
      weakAreas: interview.weakAreas || [],
      preparationFeedback: interview.preparationFeedback || "",
      scheduledAt: interview.scheduledAt || null,
      startedAt: interview.startedAt || null,
      completedAt: interview.completedAt || null,
      questions,
    };

    return res.status(200).json({
      message: "Interview report retrieved successfully",
      report,
    });
  } catch (error) {
    console.error("Get interview report error:", error);
    return res.status(500).json({
      error: "Failed to fetch interview report",
    });
  }
}

// Get interview history across all statuses
async function getInterviewHistory(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const interviews = await Interview.find({ user: userId })
      .select(
        "jobDescription totalQuestions answeredQuestions difficulty mode status scheduledAt startedAt completedAt overallScore preparationFeedback strongAreas weakAreas createdAt updatedAt"
      )
      .populate("jobDescription", "title company")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      message: "Interview history retrieved successfully",
      interviews: interviews.map((interview) => ({
        interviewId: interview._id,
        jobTitle: interview.jobDescription?.title || "",
        company: interview.jobDescription?.company || "",
        status: interview.status,
        mode: interview.mode,
        difficulty: interview.difficulty,
        totalQuestions: interview.totalQuestions || 0,
        answeredQuestions: interview.answeredQuestions || 0,
        overallScore: interview.overallScore ?? null,
        scheduledAt: interview.scheduledAt || null,
        startedAt: interview.startedAt || null,
        completedAt: interview.completedAt || null,
        preparationFeedback: interview.preparationFeedback || "",
        strongAreas: interview.strongAreas || [],
        weakAreas: interview.weakAreas || [],
        createdAt: interview.createdAt,
        updatedAt: interview.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Get interview history error:", error);
    return res.status(500).json({
      error: "Failed to fetch interview history",
    });
  }
}

module.exports = {
  scheduleInterview,
  startInterview,
  getCurrentQuestion,
  submitAnswer,
  getInterviewReport,
  getInterviewHistory,
};
