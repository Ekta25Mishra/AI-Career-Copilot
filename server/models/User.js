
const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    technologies: [{ type: String, trim: true }],
    link: { type: String, trim: true, default: "" },
  },
  { _id: true }
);

const internshipSchema = new mongoose.Schema(
  {
    company: { type: String, trim: true, default: "" },
    role: { type: String, trim: true, default: "" },
    duration: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },

    phone: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    headline: { type: String, trim: true, default: "" },
    bio: { type: String, trim: true, default: "" },

    education: {
      college: { type: String, trim: true, default: "" },
      degree: { type: String, trim: true, default: "" },
      branch: { type: String, trim: true, default: "" },
      graduationYear: { type: String, trim: true, default: "" },
    },

    skills: [{ type: String, trim: true }],
    projects: [projectSchema],
    internships: [internshipSchema],
    certifications: [{ type: String, trim: true }],
    preferredRoles: [{ type: String, trim: true }],

    links: {
      linkedin: { type: String, trim: true, default: "" },
      github: { type: String, trim: true, default: "" },
      portfolio: { type: String, trim: true, default: "" },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
