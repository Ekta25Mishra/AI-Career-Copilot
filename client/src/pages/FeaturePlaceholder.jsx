
const featureDetails = {
  "resume-analysis": {
    title: "Resume Analysis",
    description: "Upload your resume and understand your skills, experience, and areas for improvement.",
  },
  "learning-roadmap": {
    title: "Learning Roadmap",
    description: "Create a structured learning plan based on your career goals and skill gaps.",
  },
  "mock-interview": {
    title: "Mock Interview",
    description: "Prepare for interviews with role-specific questions and personalized feedback.",
  },
  "job-matching": {
    title: "Job Matching",
    description: "Explore how your skills align with relevant job opportunities.",
  },
  "career-guidance": {
    title: "Career Guidance",
    description: "Explore career paths and identify your next steps.",
  },
};

function formatTitle(pageId) {
  if (!pageId) return "Coming Soon";

  return pageId
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function FeaturePlaceholder({ activePage }) {
  const feature = featureDetails[activePage] || {
    title: formatTitle(activePage),
    description:
      "This feature is part of your AI Career Copilot workspace and will be available here as development progresses.",
  };

  return (
    <section className="feature-placeholder">
      <div className="feature-placeholder-icon" aria-hidden="true">
        ✦
      </div>

      <p className="feature-placeholder-label">AI CAREER COPILOT</p>

      <h1>{feature.title}</h1>

      <p className="feature-placeholder-description">
        {feature.description}
      </p>

      <span className="feature-placeholder-status">
        Under development
      </span>
    </section>
  );
}

export default FeaturePlaceholder;