const mongoose = require("mongoose");

const interviewQuestionSchema = new mongoose.Schema(
    {
        questionId: {
            type: String,
            required: true
        },

        question: {
            type: String,
            required: true
        },

        type: {
            type: String,
            enum: ["technical", "skill_based", "behavioral"],
            required: true
        },

        skill: {
            type: String,
            default: ""
        },

        difficulty: {
            type: String,
            enum: ["easy", "medium", "hard"],
            default: "medium"
        },

        source: {
            type: String,
            enum: ["ai_generated", "user_added", "previous_weak"],
            required: true
        },

        idealAnswer: {
            type: String,
            default: ""
        },

        userAnswer: {
            type: String,
            default: ""
        },

        score: {
            type: Number,
            default: null,
            min: 0,
            max: 10
        },

        feedback: {
            type: String,
            default: ""
        },

        strengths: {
            type: [String],
            default: []
        },

        improvementAreas: {
            type: [String],
            default: []
        },

        status: {
            type: String,
            enum: ["pending", "answered"],
            default: "pending"
        },

        answeredAt: {
            type: Date,
            default: null
        }
    },
    { _id: false }
);

const interviewSchema = new mongoose.Schema(
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

        questions: {
            type: [interviewQuestionSchema],
            default: []
        },

        totalQuestions: {
            type: Number,
            default: 0
        },

        answeredQuestions: {
            type: Number,
            default: 0
        },

        difficulty: {
            type: String,
            enum: ["easy", "medium", "hard"],
            default: "medium"
        },

        mode: {
            type: String,
            enum: ["text", "voice"],
            default: "text"
        },

        status: {
            type: String,
            enum: [
                "generated",
                "scheduled",
                "in_progress",
                "completed"
            ],
            default: "generated"
        },

        scheduledAt: {
            type: Date,
            default: null
        },

        startedAt: {
            type: Date,
            default: null
        },

        completedAt: {
            type: Date,
            default: null
        },

        overallScore: {
            type: Number,
            default: null,
            min: 0,
            max: 10
        },

        preparationFeedback: {
            type: String,
            default: ""
        },

        strongAreas: {
            type: [String],
            default: []
        },

        weakAreas: {
            type: [String],
            default: []
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Interview", interviewSchema);