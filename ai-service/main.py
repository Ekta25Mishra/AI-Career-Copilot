from dotenv import load_dotenv
import os
import json

from fastapi import FastAPI
from google import genai
from google.genai import errors


load_dotenv()

app = FastAPI()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


@app.get("/")
def home():
    return {
        "message": "AI Career Copilot Service is running!"
    }


def parse_json_response(text: str):
    text = text.strip()

    if text.startswith("```json"):
        text = text[7:]

    if text.startswith("```"):
        text = text[3:]

    if text.endswith("```"):
        text = text[:-3]

    text = text.strip()

    return json.loads(text)


@app.post("/analyze-resume")
def analyze_resume(data: dict):

    resume_text = data.get("resumeText", "")

    # 1. Validate resume text
    if not resume_text.strip():
        return {
            "error": "Resume text is empty"
        }

    prompt = f"""
        You are a resume information extraction system.

        Your task is to extract structured information from the resume below.

        Return ONLY valid JSON.
        Do not use markdown.
        Do not add explanations.
        Do not add ```json.
        Do not invent information that is not present in the resume.

        Use exactly this JSON structure:

        {{
            "name": "",
            "email": "",
            "phone": "",
            "skills": [],
            "education": [
                {{
                    "degree": "",
                    "institution": "",
                    "location": "",
                    "start_year": "",
                    "end_year": ""
                }}
            ],
            "experience": [
                {{
                    "company": "",
                    "role": "",
                    "location": "",
                    "start_date": "",
                    "end_date": "",
                    "description": []
                }}
            ],
            "projects": [
                {{
                    "name": "",
                    "description": "",
                    "technologies": []
                }}
            ]
        }}

        Rules:

        1. Extract only information explicitly present in the resume.
        2. Do not guess missing information.
        3. If a single-value field is missing, return an empty string.
        4. If no items exist for an array, return an empty array.
        5. Keep skills as simple strings.
        6. Keep project technologies as simple strings.
        7. Keep experience descriptions as an array of bullet-point strings.
        8. Preserve the meaning of the original resume.
        9. Do not create fictional companies, projects, skills, dates, or qualifications.
        10. Return valid JSON only.

        Resume:

        {resume_text}
        """

    # 2. Call Gemini
    try:
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt
        )

    except errors.ServerError as error:
        print("Gemini server error:", error)

        return {
            "error": "Gemini service is temporarily unavailable. Please try again later."
        }

    except Exception as error:
        print("Gemini API error:", error)

        return {
            "error": "Failed to communicate with Gemini"
        }

    # 3. Parse Gemini JSON response
    try:
        analysis = parse_json_response(response.text)

    except json.JSONDecodeError:
        print("Invalid JSON returned by Gemini:")
        print(response.text)

        return {
            "error": "Gemini returned an invalid JSON response"
        }

    # 4. Return structured analysis
    return {
        "analysis": analysis
    }


@app.post("/analyze-job-description")
def analyze_job_description(data: dict):

    job_description = data.get("jobDescription", "")

    if not job_description.strip():
        return {
            "error": "Job description is empty"
        }

    prompt = f"""
                You are a job description information extraction system.

                Extract structured information from the job description below.

                Return ONLY valid JSON.
                Do not use markdown.
                Do not add explanations.
                Do not add ```json.

                Use exactly this structure:

                {{
                    "job_title": "",
                    "required_skills": [],
                    "preferred_skills": [],
                    "experience": "",
                    "responsibilities": [],
                    "qualifications": []
                }}

                Rules:

                1. Extract only information explicitly present in the job description.
                2. Do not invent information.
                3. If information is missing, use an empty string or empty array.
                4. Keep skills as simple strings.
                5. Keep responsibilities as an array of strings.
                6. Keep qualifications as an array of strings.
                7. Return valid JSON only.

                Job Description:

                {job_description}
                """

    try:
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt
        )

    except errors.ServerError as error:
        print("Gemini server error:", error)

        return {
            "error": "Gemini service is temporarily unavailable. Please try again later."
        }

    except Exception as error:
        print("Gemini API error:", error)

        return {
            "error": "Failed to communicate with Gemini"
        }

    try:
        analysis = parse_json_response(response.text)

    except json.JSONDecodeError:
        print("Invalid JSON returned by Gemini:")
        print(response.text)

        return {
            "error": "Gemini returned an invalid JSON response"
        }

    return {
        "analysis": analysis
    }

@app.post("/analyze-skill-gap")
def analyze_skill_gap(data: dict):

    resume_skills = data.get("resumeSkills", [])
    job_description_analysis = data.get(
        "jobDescriptionAnalysis",
        {}
    )

    if not isinstance(resume_skills, list):
        return {
            "error": "Resume skills must be an array"
        }

    if not isinstance(job_description_analysis, dict):
        return {
            "error": "Job description analysis must be an object"
        }

    required_skills = job_description_analysis.get(
        "required_skills",
        []
    )

    preferred_skills = job_description_analysis.get(
        "preferred_skills",
        []
    )

    prompt = f"""
        You are a career skill-gap analysis system.

        Compare the candidate's resume skills with the skills
        required by the job description.

        Candidate Resume Skills:
        {resume_skills}

        Required Job Skills:
        {required_skills}

        Preferred Job Skills:
        {preferred_skills}

        Return ONLY valid JSON.

        Use exactly this structure:

        {{
            "matched_skills": [],
            "missing_skills": [],
            "extra_skills": [],
            "experience_gap": "",
            "summary": ""
        }}

        Rules:

        1. matched_skills:
        Skills that the candidate has and that are relevant
        to the job.

        2. missing_skills:
        Important required or preferred skills that the
        candidate does not have.

        3. extra_skills:
        Candidate skills that are not directly required
        by the job but may still be useful.

        4. experience_gap:
        Briefly describe any experience requirement gap.
        If no experience information is available, use
        an empty string.

        5. summary:
        Give a short factual summary of the candidate's
        skill match.

        6. Do not invent candidate skills.

        7. Do not treat similar technologies as identical unless
        they are genuinely equivalent.

        8. Keep all skill names as simple strings.

        9. Return JSON only.
        10. Do not use markdown.
        11. Do not add explanations outside the JSON.

        """

    try:

        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt
        )

    except errors.ServerError as error:

        print("Gemini server error:", error)

        return {
            "error": "Gemini service is temporarily unavailable. Please try again later."
        }

    except Exception as error:

        print("Gemini API error:", error)

        return {
            "error": "Failed to communicate with Gemini"
        }

    try:

        analysis = parse_json_response(
            response.text
        )

    except json.JSONDecodeError:

        print(
            "Invalid JSON returned by Gemini:"
        )

        print(response.text)

        return {
            "error": "Gemini returned an invalid JSON response"
        }

    return {
        "analysis": analysis
    }


@app.post("/generate-learning-roadmap")
def generate_learning_roadmap(data: dict):

    missing_skills = data.get(
        "missingSkills",
        []
    )

    hours_per_day = data.get(
        "hoursPerDay",
        0
    )

    days_per_week = data.get(
        "daysPerWeek",
        0
    )

    available_days = data.get(
        "availableDays",
        []
    )

    start_date = data.get(
        "startDate",
        ""
    )

    target_date = data.get(
        "targetDate",
        ""
    )

    # Validate input
    if not isinstance(missing_skills, list):
        return {
            "error": "Missing skills must be an array"
        }

    if len(missing_skills) == 0:
        return {
            "error": "No missing skills provided"
        }

    if hours_per_day <= 0:
        return {
            "error": "Hours per day must be greater than 0"
        }

    if days_per_week <= 0:
        return {
            "error": "Days per week must be greater than 0"
        }

    if not available_days:
        return {
            "error": "Available days are required"
        }

    if not start_date:
        return {
            "error": "Start date is required"
        }

    # Calculate weekly capacity
    weekly_hours = (
        hours_per_day * days_per_week
    )

    prompt = f"""
        You are an expert career learning planner.

        Create a personalized learning roadmap for a candidate
        who is missing the following job-required skills:

        Missing Skills:
        {missing_skills}

        Candidate's learning availability:

        Hours per day:
        {hours_per_day}

        Days per week:
        {days_per_week}

        Available days:
        {available_days}

        Start date:
        {start_date}

        Target date:
        {target_date}

        Weekly learning capacity:
        {weekly_hours} hours

        Your task is to create a realistic, step-by-step
        learning roadmap that fits within the candidate's
        available study time.

        The roadmap should progress from fundamentals to
        practical application.

        Return ONLY valid JSON.

        Use exactly this structure:

        {{
            "overview": "",
            "skills": [
                {{
                    "skill": "",
                    "estimated_total_hours": 0,
                    "topics": [
                        {{
                            "topic": "",
                            "subtopics": [],
                            "estimated_hours": 0,
                            "learning_tasks": [],
                            "practice_tasks": []
                        }}
                    ]
                }}
            ]
        }}

        Rules:

        1. Cover every missing skill.

        2. Order topics from beginner fundamentals toward
        practical/advanced topics.

        3. Do not assume the candidate already knows the
        missing skill.

        4. Break each skill into logical topics.

        5. Each topic should contain smaller subtopics.

        6. learning_tasks should explain what the candidate
        should study.

        7. practice_tasks should explain what the candidate
        should actually practice or build.

        8. Keep the total estimated learning time realistic
        for the available study capacity.

        9. Do not create an unnecessarily huge curriculum.

        10. Prioritize topics that are relevant to becoming
            job-ready for the missing skill.

        11. Do not invent information about the candidate.

        12. Return JSON only.

        13. Do not use markdown.

        14. Do not add explanations outside the JSON.
        """

    try:

        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt
        )

    except errors.ServerError as error:

        print(
            "Gemini server error:",
            error
        )

        return {
            "error":
                "Gemini service is temporarily unavailable. Please try again later."
        }

    except Exception as error:

        print(
            "Gemini API error:",
            error
        )

        return {
            "error":
                "Failed to communicate with Gemini"
        }

    try:

        plan = parse_json_response(
            response.text
        )

    except json.JSONDecodeError:

        print(
            "Invalid JSON returned by Gemini:"
        )

        print(response.text)

        return {
            "error":
                "Gemini returned an invalid JSON response"
        }

    return {
        "plan": plan
    }

