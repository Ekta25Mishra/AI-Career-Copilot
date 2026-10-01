const mongoose = require("mongoose");

const jobDescriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    structuredAnalysis: {
      type: Object,
      default: null,
    },
    skillGapAnalysis: {
    type: Object,
    default: null
},

    analysisStatus: {
      type: String,
      enum: ["not_analyzed", "analyzing", "completed", "failed"],
      default: "not_analyzed",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model(
    "JobDescription",
    jobDescriptionSchema
);
