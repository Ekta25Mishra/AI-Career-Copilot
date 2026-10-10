const { randomUUID } = require("crypto");

const Resume = require("../models/Resume");
const JobDescription = require("../models/JobDescription");
const Interview = require("../models/Interview");

const { generateInterviewQuestions } = require("../services/interviewService");

const normalizeQuestion = (question) => {
  return String(question || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[?.!,]/g, "");
};

const isSimilarQuestion = (question1, question2) => {
  const a = normalizeQuestion(question1);
  const b = normalizeQuestion(question2);

  if (!a || !b) return false;

  if (a === b) return true;

  const wordsA = new Set(a.split(" "));
  const wordsB = new Set(b.split(" "));

  const intersection = [...wordsA].filter((word) => wordsB.has(word)).length;

  const union = new Set([...wordsA, ...wordsB]).size;

  const similarity = union > 0 ? intersection / union : 0;

  return similarity >= 0.8;
};

const getPreviousQuestionHistory = async (userId) => {
  const previousInterviews = await Interview.find({
    user: userId,
    status: "completed",
  })
    .select("questions")
    .lean();

  const knownQuestions = [];
  const weakQuestions = [];

  for (const interview of previousInterviews) {
    for (const question of interview.questions || []) {
      if (!question.question) continue;

      if (typeof question.score === "number" && question.score >= 7) {
        knownQuestions.push(question);
      } else if (typeof question.score === "number" && question.score < 7) {
        weakQuestions.push(question);
      }
    }
  }

  return {
    knownQuestions,
    weakQuestions,
  };
};

const filterWeakQuestions = (weakQuestions, knownQuestions) => {
  return weakQuestions.filter((weakQuestion) => {
    return !knownQuestions.some((knownQuestion) =>
      isSimilarQuestion(weakQuestion.question, knownQuestion.question),
    );
  });
};

const removeDuplicates = (questions) => {
  const uniqueQuestions = [];

  for (const question of questions) {
    if (!question?.question) continue;

    const alreadyExists = uniqueQuestions.some((existing) =>
      isSimilarQuestion(existing.question, question.question),
    );

    if (!alreadyExists) {
      uniqueQuestions.push(question);
    }
  }

  return uniqueQuestions;
};

const createLearningQuestionObject = (question) => {
  return {
    questionId: randomUUID(),
    question: String(question.question).trim(),
    type: question.type || "technical",
    skill: question.skill || "",
    difficulty: question.difficulty || "medium",
    source: question.source || "ai_generated",
    idealAnswer: question.idealAnswer || "",
    userAnswer: "",
    score: null,
    feedback: "",
    status: "pending",
  };
};

const createInterview = async (req, res) => {
  try {
    const userId = req.user.userId;

    const {
      jobDescriptionId,
      numberOfQuestions = 25,
      difficulty = "medium",
      userQuestions = [],
    } = req.body;

    if (!jobDescriptionId) {
      return res.status(400).json({
        message: "jobDescriptionId is required",
      });
    }

    const requestedQuestions = Math.max(25, Number(numberOfQuestions) || 25);

    if (!["easy", "medium", "hard"].includes(difficulty)) {
      return res.status(400).json({
        message: "difficulty must be easy, medium, or hard",
      });
    }

    if (!Array.isArray(userQuestions)) {
      return res.status(400).json({
        message: "userQuestions must be an array",
      });
    }

    const resume = await Resume.findOne({
      user: userId,
    }).lean();

    if (!resume) {
      return res.status(404).json({
        message: "Resume not found",
      });
    }

    if (!resume.structuredAnalysis) {
      return res.status(400).json({
        message: "Resume must be analyzed before generating interview",
      });
    }

    const jobDescription = await JobDescription.findOne({
      _id: jobDescriptionId,
      user: userId,
    }).lean();

    if (!jobDescription) {
      return res.status(404).json({
        message: "Job description not found",
      });
    }

    if (!jobDescription.structuredAnalysis) {
      return res.status(400).json({
        message: "Job description must be analyzed before generating interview",
      });
    }

    if (!jobDescription.skillGapAnalysis) {
      return res.status(400).json({
        message:
          "Skill gap analysis must be completed before generating interview",
      });
    }

    const { knownQuestions, weakQuestions } =
      await getPreviousQuestionHistory(userId);

    const reusableWeakQuestions = filterWeakQuestions(
      weakQuestions,
      knownQuestions,
    );

    const knownQuestionTexts = knownQuestions.map(
      (question) => question.question,
    );

    const weakQuestionTexts = reusableWeakQuestions.map((question) => ({
      question: question.question,
      type: question.type,
      skill: question.skill,
      difficulty: question.difficulty,
      idealAnswer: question.idealAnswer,
    }));

    const cleanedUserQuestions = removeDuplicates(
      userQuestions
        .filter((question) => typeof question === "string" && question.trim())
        .map((question) => ({
          question,
          type: "technical",
          source: "user_added",
        })),
    );

    const aiResult = await generateInterviewQuestions({
      resume_analysis: resume.structuredAnalysis,
      job_description_analysis: jobDescription.structuredAnalysis,
      skill_gap_analysis: jobDescription.skillGapAnalysis,

      previous_weak_questions: weakQuestionTexts,

      user_questions: cleanedUserQuestions,

      excluded_known_questions: knownQuestionTexts,

      number_of_questions: requestedQuestions,

      difficulty,
    });

    let generatedQuestions = Array.isArray(aiResult.questions)
      ? aiResult.questions
      : [];

    generatedQuestions = removeDuplicates(generatedQuestions);

    const finalQuestions = [];

    // First preserve user questions.
    for (const question of cleanedUserQuestions) {
      const exists = finalQuestions.some((existing) =>
        isSimilarQuestion(existing.question, question.question),
      );

      if (!exists) {
        finalQuestions.push({
          ...question,
          type: question.type || "technical",
          skill: question.skill || "",
          difficulty,
          source: "user_added",
          idealAnswer: question.idealAnswer || "",
        });
      }
    }

    // Add weak questions that need revision.
    for (const question of reusableWeakQuestions) {
      if (finalQuestions.length >= requestedQuestions) {
        break;
      }

      const exists = finalQuestions.some((existing) =>
        isSimilarQuestion(existing.question, question.question),
      );

      if (!exists) {
        finalQuestions.push({
          question: question.question,
          type: question.type,
          skill: question.skill,
          difficulty: question.difficulty || difficulty,
          source: "previous_weak",
          idealAnswer: question.idealAnswer || "",
        });
      }
    }

    // Add new AI questions.
    for (const question of generatedQuestions) {
      if (finalQuestions.length >= requestedQuestions) {
        break;
      }

      const exists = finalQuestions.some((existing) =>
        isSimilarQuestion(existing.question, question.question),
      );

      if (!exists) {
        finalQuestions.push(question);
      }
    }

    // Remove questions that the candidate already knows.
    const finalFilteredQuestions = finalQuestions.filter((question) => {
      return !knownQuestions.some((knownQuestion) =>
        isSimilarQuestion(knownQuestion.question, question.question),
      );
    });

    let questionsToSave = finalFilteredQuestions;

    if (questionsToSave.length < requestedQuestions) {
      // If filtering removed too many questions,
      // ask AI for additional fresh questions.
      const extraResult = await generateInterviewQuestions({
        resume_analysis: resume.structuredAnalysis,

        job_description_analysis: jobDescription.structuredAnalysis,

        skill_gap_analysis: jobDescription.skillGapAnalysis,

        previous_weak_questions: weakQuestionTexts,

        user_questions: cleanedUserQuestions,

        excluded_known_questions: knownQuestionTexts.concat(
          questionsToSave.map((question) => question.question),
        ),

        number_of_questions: requestedQuestions - questionsToSave.length + 10,

        difficulty,
      });

      const extraQuestions = removeDuplicates(
        Array.isArray(extraResult.questions) ? extraResult.questions : [],
      );

      for (const question of extraQuestions) {
        if (questionsToSave.length >= requestedQuestions) {
          break;
        }

        const exists = questionsToSave.some((existing) =>
          isSimilarQuestion(existing.question, question.question),
        );

        const known = knownQuestions.some((existing) =>
          isSimilarQuestion(existing.question, question.question),
        );

        if (!exists && !known) {
          questionsToSave.push(question);
        }
      }
    }

    if (questionsToSave.length < 25) {
      return res.status(500).json({
        message: "Could not generate the minimum 25 unique interview questions",
      });
    }

    const savedQuestions = questionsToSave.map(createLearningQuestionObject);

    const interview = await Interview.create({
      user: userId,
      jobDescription: jobDescriptionId,
      questions: savedQuestions,
      totalQuestions: savedQuestions.length,
      difficulty,
      status: "generated",
    });

    return res.status(201).json({
      message: "Adaptive interview generated successfully",

      interviewId: interview._id,

      totalQuestions: interview.totalQuestions,

      reusedWeakQuestions: savedQuestions.filter(
        (question) => question.source === "previous_weak",
      ).length,

      userAddedQuestions: savedQuestions.filter(
        (question) => question.source === "user_added",
      ).length,

      newQuestions: savedQuestions.filter(
        (question) => question.source === "ai_generated",
      ).length,

      interview,
    });
  } catch (error) {
    console.error("Create interview error:", error);

    return res.status(500).json({
      message: "Failed to generate interview",
    });
  }
};

module.exports = {
  createInterview,
};
