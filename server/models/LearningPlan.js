const mongoose = require("mongoose");

const learningPlanSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        jobDescription: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "JobDescription",
            required: true
        },

        missingSkills: {
            type: [String],
            default: []
        },

        hoursPerDay: {
            type: Number,
            required: true,
            min: 0.5
        },

        daysPerWeek: {
            type: Number,
            required: true,
            min: 1,
            max: 7
        },

        availableDays: {
            type: [String],
            default: []
        },

        startDate: {
            type: Date,
            required: true
        },

        targetDate: {
            type: Date,
            default: null
        },

        status: {
            type: String,
            enum: [
                "draft",
                "generated",
                "in_progress",
                "completed"
            ],
            default: "draft"
        },

        plan: {
            type: Object,
            default: null
        },

        schedule: {
            type: Array,
            default: []
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "LearningPlan",
    learningPlanSchema
);