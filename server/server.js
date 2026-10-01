require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const JobDescriptionRoutes = require("./routes/jobDescriptionRoutes");
const learningPlanRoutes = require("./routes/learningPlanRoutes");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/job-description", JobDescriptionRoutes);
app.use("/api/learning-plan", learningPlanRoutes);
connectDB();

app.get("/", (req, res) => {
  res.json({
    message: "AI Career Copilot backend is running",
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});
