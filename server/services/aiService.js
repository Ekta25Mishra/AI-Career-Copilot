const axios = require("axios")

const AI_SERVICE_URL ="http://localhost:8000";

const analyzeResume = async(resumeText)=>{
  const response = await axios.post(
    `${AI_SERVICE_URL}/analyze-resume`,
    {
      resumeText
    }
  );
  return response.data;
};

module.exports={
  analyzeResume
}