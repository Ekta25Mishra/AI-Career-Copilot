const LearningPlan = require("../models/LearningPlan");
const JobDescription = require("../models/JobDescription");
const { generateLearningSchedule } = require("../utils/learningScheduler");
const { generateLearningRoadmap } = require("../services/aiService");
const { calculateLearningProgress } = require("../utils/learningProgress");
const { getLearningPlanStatus } = require("../utils/learningStatus");
const { getSessionStatus } = require("../utils/learningSessionStatus");
const { rescheduleMissedSessions } = require("../utils/adaptiveScheduler");

const createLearningPlan = async (req, res) => {
  try {
    const {
      jobDescriptionId,
      skill: requestedSkill,
      hoursPerDay,
      daysPerWeek,
      availableDays,
      startDate,
      targetDate,
    } = req.body;

    const normalizedAvailableDays =
      Array.isArray(availableDays) && availableDays.length > 0
        ? availableDays
        : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

    const skill = String(requestedSkill || "").trim();
    const dailyHours = Number(hoursPerDay);
    const weeklyDays = Number(daysPerWeek);

    // 1. Validate required learning details.
    if (
      !skill ||
      !Number.isFinite(dailyHours) ||
      !Number.isFinite(weeklyDays) ||
      !startDate
    ) {
      return res.status(400).json({
        message:
          "Skill, hours per day, days per week, and start date are required.",
      });
    }

    if (dailyHours < 0.5 || dailyHours > 12) {
      return res.status(400).json({
        message: "Hours per day must be between 0.5 and 12.",
      });
    }

    if (!Number.isInteger(weeklyDays) || weeklyDays < 1 || weeklyDays > 7) {
      return res.status(400).json({
        message: "Days per week must be between 1 and 7.",
      });
    }

    if (availableDays && !Array.isArray(availableDays)) {
      return res.status(400).json({
        message: "Available days must be an array.",
      });
    }

    // 2. Validate dates.
    const start = new Date(startDate);

    if (Number.isNaN(start.getTime())) {
      return res.status(400).json({
        message: "Invalid start date.",
      });
    }

    let target = null;

    if (targetDate) {
      target = new Date(targetDate);

      if (Number.isNaN(target.getTime()) || target <= start) {
        return res.status(400).json({
          message: "Target date must be a valid date after the start date.",
        });
      }
    }

    // 3. Resolve skills from either a job description or custom input.
    let jobDescription = null;
    let missingSkills = [];

    if (jobDescriptionId) {
      jobDescription = await JobDescription.findOne({
        _id: jobDescriptionId,
        user: req.user.userId,
      });

      if (!jobDescription) {
        return res.status(404).json({
          message: "Job description not found.",
        });
      }

      if (!jobDescription.skillGapAnalysis) {
        return res.status(400).json({
          message: "Please complete skill gap analysis first.",
        });
      }

      const jobMissingSkills =
        jobDescription.skillGapAnalysis.missing_required_skills || [];

      if (!Array.isArray(jobMissingSkills)) {
        return res.status(400).json({
          message: "Missing skills data is invalid.",
        });
      }

      // If a particular skill was selected, build a roadmap for that skill.
      // Otherwise, retain the existing behavior of using all missing skills.
      missingSkills = skill ? [skill] : jobMissingSkills;

      if (missingSkills.length === 0) {
        return res.status(400).json({
          message: "No missing required skills found.",
        });
      }
    } else {
      // Custom skill: no job description or skill-gap analysis required.
      missingSkills = [skill];
    }

    // 4. Calculate learning capacity.
    const weeklyHours = dailyHours * weeklyDays;

    let totalLearningHours = null;

    if (target) {
      const totalDays = Math.ceil(
        (target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      );

      const totalWeeks = Math.ceil(totalDays / 7);

      totalLearningHours = weeklyHours * totalWeeks;
    }

    // 5. Generate the AI roadmap.
    const result = await generateLearningRoadmap({
      missingSkills,
      hoursPerDay: dailyHours,
      daysPerWeek: weeklyDays,
      availableDays: normalizedAvailableDays,
      startDate,
      targetDate: targetDate || "",
      weeklyHours,
    });

    const plan = result?.plan;

    if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
      return res.status(502).json({
        message: "AI returned an invalid learning roadmap.",
      });
    }

    if (!Array.isArray(plan.skills)) {
      return res.status(502).json({
        message: "AI learning roadmap contains invalid skills data.",
      });
    }

    console.log("AI PLAN SKILLS:", JSON.stringify(plan.skills, null, 2));
    console.log("AVAILABLE DAYS:", availableDays);
    console.log("START DATE:", startDate, "TARGET DATE:", targetDate);

    // 6. Generate the day-by-day schedule.
    const scheduleResult = generateLearningSchedule({
      plan,
      hoursPerDay: dailyHours,
      availableDays: normalizedAvailableDays,
      startDate,
      targetDate: targetDate || undefined,
    });

    if (!scheduleResult || !Array.isArray(scheduleResult.schedule)) {
      return res.status(500).json({
        message: "Failed to generate learning schedule.",
      });
    }

    const schedule = scheduleResult.schedule;

    const scheduleStatistics = scheduleResult.statistics;

    const totalSessions = schedule.reduce((total, day) => {
      return total + (Array.isArray(day.sessions) ? day.sessions.length : 0);
    }, 0);

    console.log("NORMALIZED DAYS:", normalizedAvailableDays);
    console.log("SCHEDULE DAYS:", schedule.length);
    console.log("TOTAL SESSIONS:", totalSessions);
    console.log(
      "SCHEDULE PREVIEW:",
      JSON.stringify(schedule.slice(0, 2), null, 2),
    );

    const totalHours = schedule.reduce((total, day) => {
      if (!Array.isArray(day.sessions)) return total;

      return (
        total +
        day.sessions.reduce((sum, session) => {
          return sum + (Number(session.duration_minutes) || 0) / 60;
        }, 0)
      );
    }, 0);

    // 7. Save the learning plan.
    const learningPlan = await LearningPlan.create({
      user: req.user.userId,
      ...(jobDescription ? { jobDescription: jobDescription._id } : {}),
      skill,
      missingSkills,
      hoursPerDay: dailyHours,
      daysPerWeek: weeklyDays,
      availableDays: normalizedAvailableDays,
      startDate: start,
      targetDate: target,
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

    // 8. Return the created roadmap.
    return res.status(201).json({
      message: "Learning roadmap generated successfully",
      learningPlan: {
        id: learningPlan._id,
        skill: learningPlan.skill,
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
        progress: learningPlan.progress,
        scheduleStatistics,
      },
    });
  } catch (error) {
    console.error("Create learning plan error:", error);

    return res.status(500).json({
      message: "Failed to generate learning roadmap.",
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
    session.status = "completed";

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

const getUpcomingLearningSessions = async (req, res) => {
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

    const upcomingSessions = [];

    for (const day of learningPlan.schedule || []) {
      if (!day || !Array.isArray(day.sessions)) {
        continue;
      }

      for (const session of day.sessions) {
        if (session.completed !== true) {
          upcomingSessions.push({
            date: day.date,
            day: day.day,
            sessionId: session.sessionId,
            skill: session.skill,
            topic: session.topic,
            subtopic: session.subtopic,
            duration_minutes: session.duration_minutes,
            learning_tasks: session.learning_tasks,
            practice_tasks: session.practice_tasks,
            status: getSessionStatus({ session, date: day.date }),
          });
        }
      }
    }

    return res.json({
      message: "Upcoming learning sessions retrieved successfully",
      totalSessions: upcomingSessions.length,
      sessions: upcomingSessions,
    });
  } catch (error) {
    console.error("Get upcoming learning sessions error:", error);

    return res.status(500).json({
      message: "Failed to retrieve upcoming learning sessions",
    });
  }
};

const rescheduleMissedLearningSessions = async (req, res) => {
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

    const result = rescheduleMissedSessions({
      schedule: learningPlan.schedule,
      hoursPerDay: learningPlan.hoursPerDay,
      availableDays: learningPlan.availableDays,
    });

    learningPlan.schedule = result.schedule;

    learningPlan.markModified("schedule");

    const progress = calculateLearningProgress(learningPlan.schedule);

    learningPlan.progress = progress;

    learningPlan.status = getLearningPlanStatus(progress);

    await learningPlan.save();

    return res.json({
      message:
        result.rescheduledSessions > 0
          ? "Missed sessions rescheduled successfully"
          : "No missed sessions found",

      rescheduledSessions: result.rescheduledSessions,

      progress,

      status: learningPlan.status,

      schedule: learningPlan.schedule,
    });
  } catch (error) {
    console.error("Reschedule missed sessions error:", error);

    return res.status(500).json({
      message: "Failed to reschedule missed sessions",
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
  getLearningProgress,
  getUpcomingLearningSessions,
  rescheduleMissedLearningSessions,
};
