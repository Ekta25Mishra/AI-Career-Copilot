const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  originalname: {
    type: String,
    required: true,
  },
  filename: {
    type: String,
    required: true,
  },

  filePath: {
    type: String,
    required: true,
  },

  extractedText: {
    type: String,
    required: true,
  },

  pages: {
    type: Number,
    required: true,
  },
  structuredAnalysis: {
    type: Object,
    default: null
},
},
{timestamps:true}
);

const Resume = mongoose.model("Resume", resumeSchema)

module.exports= Resume