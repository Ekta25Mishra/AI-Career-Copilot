require("dotenv").config();
const express = require("express")
const cors = require("cors")
const connectDB= require("./config/db")
const userRoutes = require("./routes/userRoutes")
const authRoutes = require("./routes/authRoutes")
const resumeRoutes = require("./routes/resumeRoutes")

const app = express()
const PORT = 3000

app.use(cors())
app.use(express.json())

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes)
app.use("/api/resume", resumeRoutes)
connectDB()

app.get("/", (req,res)=>{
  res.json({
    message:"AI Career Copilot backend is running"
  })
})

app.listen(PORT, ()=>{
  console.log(`Server is running on ${PORT}`);

})