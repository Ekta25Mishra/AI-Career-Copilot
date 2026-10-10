
const mongoose = require("mongoose");

const learningPlanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Optional: custom skill plans do not require a job description.
    jobDescription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobDescription",
      default: null,
    },

    // Main skill shown in the Learning Roadmap UI.
    skill: {
      type: String,
      trim: true,
      default: "",
    },

    missingSkills: {
      type: [String],
      default: [],
    },

    hoursPerDay: {
      type: Number,
      required: true,
      min: 0.5,
    },

    daysPerWeek: {
      type: Number,
      required: true,
      min: 1,
      max: 7,
    },

    availableDays: {
      type: [String],
      default: [],
    },

    startDate: {
      type: Date,
      required: true,
    },

    targetDate: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["draft", "generated", "in_progress", "completed"],
      default: "draft",
    },

    plan: {
      type: Object,
      default: null,
    },

    schedule: {
      type: Array,
      default: [],
    },

    progress: {
      completedSessions: {
        type: Number,
        default: 0,
      },
      totalSessions: {
        type: Number,
        default: 0,
      },
      completedHours: {
        type: Number,
        default: 0,
      },
      totalHours: {
        type: Number,
        default: 0,
      },
      percentage: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("LearningPlan", learningPlanSchema);
