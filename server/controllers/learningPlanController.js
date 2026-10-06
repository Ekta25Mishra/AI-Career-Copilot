const LearningPlan = require("../models/LearningPlan");
const JobDescription = require("../models/JobDescription");
const { generateLearningSchedule } = require("../utils/learningScheduler");
const { generateLearningRoadmap } = require("../services/aiService");
const { calculateLearningProgress } = require("../utils/learningProgress");
const { getLearningPlanStatus } = require("../utils/learningStatus");

const createLearningPlan = async (req, res) => {
  try {
    const {
      jobDescriptionId,
      hoursPerDay,
      daysPerWeek,
      availableDays,
      startDate,
      targetDate,
    } = req.body;

    // 1. Validate required fields
    if (!jobDescriptionId || !hoursPerDay || !daysPerWeek || !startDate) {
      return res.status(400).json({
        message: "Required learning plan details are missing",
      });
    }

    // 2. Find user's job description
    const jobDescription = await JobDescription.findOne({
      _id: jobDescriptionId,
      user: req.user.userId,
    });

    if (!jobDescription) {
      return res.status(404).json({
        message: "Job description not found",
      });
    }

    // 3. Skill-gap analysis must exist
    if (!jobDescription.skillGapAnalysis) {
      return res.status(400).json({
        message: "Please complete skill gap analysis first",
      });
    }

    // 4. Get missing required skills
    const missingSkills =
      jobDescription.skillGapAnalysis.missing_required_skills || [];

    if (!Array.isArray(missingSkills)) {
      return res.status(400).json({
        message: "Missing skills data is invalid",
      });
    }

    if (missingSkills.length === 0) {
      return res.status(400).json({
        message: "No missing required skills found",
      });
    }

    // 5. Validate hours per day
    if (hoursPerDay < 0.5) {
      return res.status(400).json({
        message: "Hours per day must be at least 0.5",
      });
    }

    // 6. Validate days per week
    if (daysPerWeek < 1 || daysPerWeek > 7) {
      return res.status(400).json({
        message: "Days per week must be between 1 and 7",
      });
    }

    // 7. Validate available days
    if (availableDays && !Array.isArray(availableDays)) {
      return res.status(400).json({
        message: "Available days must be an array",
      });
    }

    // 8. Calculate weekly learning capacity
    const weeklyHours = hoursPerDay * daysPerWeek;

    // 9. Calculate total learning capacity
    let totalLearningHours = null;

    if (targetDate) {
      const start = new Date(startDate);

      const target = new Date(targetDate);

      if (Number.isNaN(start.getTime()) || Number.isNaN(target.getTime())) {
        return res.status(400).json({
          message: "Invalid start date or target date",
        });
      }

      if (target <= start) {
        return res.status(400).json({
          message: "Target date must be after start date",
        });
      }

      const differenceInMilliseconds = target - start;

      const totalDays = Math.ceil(
        differenceInMilliseconds / (1000 * 60 * 60 * 24),
      );

      const totalWeeks = Math.ceil(totalDays / 7);

      totalLearningHours = weeklyHours * totalWeeks;
    }

    // 10. Generate learning roadmap using AI
    const result = await generateLearningRoadmap({
      missingSkills,
      hoursPerDay,
      daysPerWeek,
      availableDays: availableDays || [],
      startDate,
      targetDate: targetDate || "",
      weeklyHours,
    });

    const plan = result.plan;

    // Generate day-by-day learning schedule
    const scheduleResult = generateLearningSchedule({
      plan,
      hoursPerDay,
      availableDays: availableDays || [],
      startDate,
      targetDate,
    });

    const schedule = scheduleResult.schedule;

    const scheduleStatistics = scheduleResult.statistics;

    const totalSessions = schedule.reduce((total, day) => {
      if (!Array.isArray(day.sessions)) {
        return total;
      }

      return total + day.sessions.length;
    }, 0);

    const totalHours = schedule.reduce((total, day) => {
      if (!Array.isArray(day.sessions)) {
        return total;
      }

      return (
        total +
        day.sessions.reduce((sessionTotal, session) => {
          const duration = Number(session.duration_minutes) || 0;

          return sessionTotal + duration / 60;
        }, 0)
      );
    }, 0);

    if (!scheduleResult || !Array.isArray(schedule)) {
      return res.status(500).json({
        message: "Failed to generate learning schedule",
      });
    }

    // 11. Validate AI response
    if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
      return res.status(502).json({
        message: "AI returned an invalid learning roadmap",
      });
    }

    if (!Array.isArray(plan.skills)) {
      return res.status(502).json({
        message: "AI learning roadmap contains invalid skills data",
      });
    }

    // 12. Create learning plan
    const learningPlan = await LearningPlan.create({
      user: req.user.userId,
      jobDescription: jobDescription._id,
      missingSkills,
      hoursPerDay,
      daysPerWeek,
      availableDays: availableDays || [],
      startDate,
      targetDate: targetDate || null,
      plan,
      schedule,
      progress: {
        completedSessions: 0,
        totalSessions,
        completedHours: 0,
        totalHours,
        percentage: 0,
      },
      status: "generated",
    });

    // 13. Return result
    res.status(201).json({
      message: "Learning roadmap generated successfully",

      learningPlan: {
        id: learningPlan._id,
        missingSkills: learningPlan.missingSkills,
        hoursPerDay: learningPlan.hoursPerDay,
        daysPerWeek: learningPlan.daysPerWeek,
        weeklyHours,
        totalLearningHours,
        availableDays: learningPlan.availableDays,
        startDate: learningPlan.startDate,
        targetDate: learningPlan.targetDate,
        status: learningPlan.status,
        plan: learningPlan.plan,
        schedule: learningPlan.schedule,
        scheduleStatistics,
      },
    });
  } catch (error) {
    console.error("Create learning plan error:", error.message);

    res.status(500).json({
      message: "Failed to generate learning roadmap",
    });
  }
};

const getLearningPlan = async (req, res) => {
  try {
    const learningPlan = await LearningPlan.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!learningPlan) {
      return res.status(404).json({
        message: "Learning plan not found",
      });
    }

    res.json({
      message: "Learning plan retrieved successfully",

      learningPlan,
    });
  } catch (error) {
    console.error("Get learning plan error:", error.message);

    res.status(500).json({
      message: "Failed to retrieve learning plan",
    });
  }
};

const getAllLearningPlans = async (req, res) => {
  try {
    const learningPlans = await LearningPlan.find({
      user: req.user.userId,
    }).sort({
      createdAt: -1,
    });

    res.json({
      message: "Learning plans retrieved successfully",

      count: learningPlans.length,

      learningPlans,
    });
  } catch (error) {
    console.error("Get all learning plans error:", error.message);

    res.status(500).json({
      message: "Failed to retrieve learning plans",
    });
  }
};

const deleteLearningPlan = async (req, res) => {
  try {
    const learningPlan = await LearningPlan.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!learningPlan) {
      return res.status(404).json({
        message: "Learning plan not found",
      });
    }

    res.json({
      message: "Learning plan deleted successfully",
    });
  } catch (error) {
    console.error("Delete learning plan error:", error.message);

    res.status(500).json({
      message: "Failed to delete learning plan",
    });
  }
};

const completeLearningSession = async (req, res) => {
  try {
    const { id, sessionId } = req.params;

    const learningPlan = await LearningPlan.findOne({
      _id: id,
      user: req.user.userId,
    });

    if (!learningPlan) {
      return res.status(404).json({
        message: "Learning plan not found",
      });
    }

    let session = null;

    for (const day of learningPlan.schedule || []) {
      if (!day || !Array.isArray(day.sessions)) {
        continue;
      }

      const foundSession = day.sessions.find(
        (item) => String(item.sessionId) === String(sessionId),
      );

      if (foundSession) {
        session = foundSession;
        break;
      }
    }

    if (!session) {
      return res.status(404).json({
        message: "Learning session not found",
      });
    }

    if (session.completed === true) {
      return res.status(400).json({
        message: "Learning session is already completed",
      });
    }

    session.completed = true;
    session.completedAt = new Date();

    learningPlan.markModified("schedule");

    const progress = calculateLearningProgress(learningPlan.schedule);

    learningPlan.progress = progress;

    learningPlan.status = getLearningPlanStatus(progress);

    await learningPlan.save();

    return res.json({
      message: "Learning session completed successfully",

      session,

      progress,

      status: learningPlan.status,
    });
  } catch (error) {
    console.error("Complete learning session error:", error);

    return res.status(500).json({
      message: "Failed to complete learning session",
    });
  }
};

const getNextLearningSession = async (req, res) => {
  try {
    const { id } = req.params;

    const learningPlan = await LearningPlan.findOne({
      _id: id,
      user: req.user.userId,
    });

    if (!learningPlan) {
      return res.status(404).json({
        message: "Learning plan not found",
      });
    }

    let nextSession = null;
    let nextDate = null;
    let nextDay = null;

    for (const day of learningPlan.schedule || []) {
      if (!day || !Array.isArray(day.sessions)) {
        continue;
      }

      for (const session of day.sessions) {
        if (session.completed !== true) {
          nextSession = session;
          nextDate = day.date;
          nextDay = day.day;
          break;
        }
      }

      if (nextSession) {
        break;
      }
    }

    if (!nextSession) {
      return res.json({
        message: "All learning sessions are completed",

        nextSession: null,

        progress: learningPlan.progress,

        status: "completed",
      });
    }
    const progress = calculateLearningProgress(learningPlan.schedule);
    const status = getLearningPlanStatus(progress);

    return res.json({
      message: "Next learning session retrieved successfully",

      nextSession: {
        date: nextDate,
        day: nextDay,

        sessionId: nextSession.sessionId,

        skill: nextSession.skill,

        topic: nextSession.topic,

        subtopic: nextSession.subtopic,

        duration_minutes: nextSession.duration_minutes,

        learning_tasks: nextSession.learning_tasks,

        practice_tasks: nextSession.practice_tasks,

        type: nextSession.type,

        completed: nextSession.completed,

        completedAt: nextSession.completedAt,
      },

      progress,

      status,
    });
  } catch (error) {
    console.error("Get next learning session error:", error);

    return res.status(500).json({
      message: "Failed to retrieve next learning session",
    });
  }
};

const getTodayLearningSessions = async (req, res) => {
  try {
    const { id } = req.params;
    const requestedDate = req.query.date;

    const learningPlan = await LearningPlan.findOne({
      _id: id,
      user: req.user.userId,
    });

    if (!learningPlan) {
      return res.status(404).json({
        message: "Learning plan not found",
      });
    }

    let targetDate;

    if (requestedDate) {
      targetDate = requestedDate;
    } else {
      targetDate = new Date().toISOString().split("T")[0];
    }

    const daySchedule = (learningPlan.schedule || []).find(
      (day) => day.date === targetDate,
    );

    if (!daySchedule) {
      return res.json({
        message: "No learning sessions scheduled for this date",

        date: targetDate,

        day: null,

        sessions: [],

        totalSessions: 0,

        completedSessions: 0,

        totalMinutes: 0,

        completedMinutes: 0,
      });
    }

    const sessions = Array.isArray(daySchedule.sessions)
      ? daySchedule.sessions
      : [];

    const completedSessions = sessions.filter(
      (session) => session.completed === true,
    ).length;

    const totalMinutes = sessions.reduce(
      (total, session) => total + (Number(session.duration_minutes) || 0),
      0,
    );

    const completedMinutes = sessions
      .filter((session) => session.completed === true)
      .reduce(
        (total, session) => total + (Number(session.duration_minutes) || 0),
        0,
      );

    return res.json({
      message: "Learning sessions retrieved successfully",

      date: daySchedule.date,

      day: daySchedule.day,

      sessions,

      totalSessions: sessions.length,

      completedSessions,

      totalMinutes,

      completedMinutes,

      remainingMinutes: totalMinutes - completedMinutes,
    });
  } catch (error) {
    console.error("Get today's learning sessions error:", error);

    return res.status(500).json({
      message: "Failed to retrieve learning sessions",
    });
  }
};

const getLearningDashboard = async (req, res) => {
  try {
    const { id } = req.params;

    const learningPlan = await LearningPlan.findOne({
      _id: id,
      user: req.user.userId,
    });

    if (!learningPlan) {
      return res.status(404).json({
        message: "Learning plan not found",
      });
    }

    // Calculate fresh progress from schedule
    const progress = calculateLearningProgress(learningPlan.schedule);
    const status = getLearningPlanStatus(progress);

    // Current date
    const today = new Date().toISOString().split("T")[0];

    // Today's schedule
    const todaySchedule = (learningPlan.schedule || []).find(
      (day) => day.date === today,
    );

    const todaySessions =
      todaySchedule && Array.isArray(todaySchedule.sessions)
        ? todaySchedule.sessions
        : [];

    const todayCompletedSessions = todaySessions.filter(
      (session) => session.completed === true,
    ).length;

    const todayTotalMinutes = todaySessions.reduce(
      (total, session) => total + (Number(session.duration_minutes) || 0),
      0,
    );

    const todayCompletedMinutes = todaySessions
      .filter((session) => session.completed === true)
      .reduce(
        (total, session) => total + (Number(session.duration_minutes) || 0),
        0,
      );

    // Find next pending session
    let nextSession = null;
    let nextSessionDate = null;
    let nextSessionDay = null;

    for (const day of learningPlan.schedule || []) {
      if (!day || !Array.isArray(day.sessions)) {
        continue;
      }

      for (const session of day.sessions) {
        if (session.completed !== true) {
          nextSession = session;
          nextSessionDate = day.date;
          nextSessionDay = day.day;
          break;
        }
      }

      if (nextSession) {
        break;
      }
    }

    return res.json({
      message: "Learning dashboard retrieved successfully",

      plan: {
        id: learningPlan._id,
        missingSkills: learningPlan.missingSkills,
        hoursPerDay: learningPlan.hoursPerDay,
        daysPerWeek: learningPlan.daysPerWeek,
        availableDays: learningPlan.availableDays,
        startDate: learningPlan.startDate,
        targetDate: learningPlan.targetDate,
        status,
      },

      progress,

      today: {
        date: today,
        day: todaySchedule ? todaySchedule.day : null,

        sessions: todaySessions,

        totalSessions: todaySessions.length,

        completedSessions: todayCompletedSessions,

        totalMinutes: todayTotalMinutes,

        completedMinutes: todayCompletedMinutes,

        remainingMinutes: todayTotalMinutes - todayCompletedMinutes,
      },

      nextSession: nextSession
        ? {
            date: nextSessionDate,

            day: nextSessionDay,

            sessionId: nextSession.sessionId,

            skill: nextSession.skill,

            topic: nextSession.topic,

            subtopic: nextSession.subtopic,

            duration_minutes: nextSession.duration_minutes,

            learning_tasks: nextSession.learning_tasks,

            practice_tasks: nextSession.practice_tasks,

            type: nextSession.type,

            completed: nextSession.completed,

            completedAt: nextSession.completedAt,
          }
        : null,
    });
  } catch (error) {
    console.error("Get learning dashboard error:", error);

    return res.status(500).json({
      message: "Failed to retrieve learning dashboard",
    });
  }
};

const getLearningProgress = async (req, res) => {
  try {
    const { id } = req.params;

    const learningPlan = await LearningPlan.findOne({
      _id: id,
      user: req.user.userId,
    });

    if (!learningPlan) {
      return res.status(404).json({
        message: "Learning plan not found",
      });
    }

    const progress = calculateLearningProgress(learningPlan.schedule);

    const status = getLearningPlanStatus(progress);

    return res.json({
      message: "Learning progress retrieved successfully",
      progress,
      status,
    });
  } catch (error) {
    console.error("Get learning progress error:", error);

    return res.status(500).json({
      message: "Failed to retrieve learning progress",
    });
  }
};

module.exports = {
  createLearningPlan,
  getLearningPlan,
  getAllLearningPlans,
  deleteLearningPlan,
  completeLearningSession,
  getNextLearningSession,
  getTodayLearningSessions,
  getLearningDashboard,
  getLearningProgress
};
