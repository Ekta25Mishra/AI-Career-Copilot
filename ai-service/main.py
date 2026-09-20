from dotenv import load_dotenv
import os
from fastapi import FastAPI
from google import genai
import json 

load_dotenv()

app = FastAPI()

client=genai.Client(
  api_key=os.getenv("GEMINI_API_KEY")
)

@app.get("/")
def home():
  return {"message":"AI Career Copilot Service is running!"}



@app.post("/analyze-resume")
def analyze_resume(data:dict):
  resume_text = data.get("resumeText", "")

  prompt = f"""
    Analyze the following resume and extract the information.

    Return ONLY valid JSON.

    Use exactly this structure:

    {{
        "name": "",
        "email": "",
        "phone": "",
        "skills": [],
        "education": [],
        "experience": [],
        "projects": []
    }}

    Rules:
    - If information is not available, use an empty string or empty array.
    - Do not invent information.
    - Keep skills as simple strings.
    - Keep education, experience, and projects as arrays of objects.
    - Return JSON only. No markdown. No explanation.

    Resume:

    {resume_text}
    """
  
  response = client.models.generate_content(
    model="gemini-3.6-flash",
    contents=prompt
  )

  analysis = json.loads(response.text)

  return {
      "analysis": analysis
  }