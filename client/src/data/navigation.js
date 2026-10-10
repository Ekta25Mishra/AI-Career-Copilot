export const navGroups = [
  {
    label: 'WORKSPACE',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: '▦' },
      { id: 'resume', label: 'Resume Analysis', icon: '▤' },
      { id: 'jobs', label: 'Job Matching', icon: '⌕' },
    ],
  },
  {
    label: 'GROWTH',
    items: [
      { id: 'learning', label: 'Learning Plan', icon: '↗' },
      { id: 'interviews', label: 'Interview Prep', icon: '◎' },
    ],
  },
];

export const pageInfo = {
  dashboard: {
    eyebrow: 'YOUR CAREER WORKSPACE',
    title: 'Your next chapter starts here.',
    description: 'Build your skills, strengthen your resume, and take the next step in your career.',
  },
  resume: {
    eyebrow: 'RESUME TOOLS',
    title: 'Make your resume stand out.',
    description: 'Review your resume, discover your strengths, and identify areas to improve.',
  },
  jobs: {
    eyebrow: 'CAREER OPPORTUNITIES',
    title: 'Find your skill match.',
    description: 'Compare your skills with a job description to understand where you stand.',
  },
  learning: {
    eyebrow: 'PERSONALIZED GROWTH',
    title: 'Learn with a clear direction.',
    description: 'Turn skill gaps into a structured learning plan that fits your schedule.',
  },
  interviews: {
    eyebrow: 'INTERVIEW PRACTICE',
    title: 'Prepare with confidence.',
    description: 'Practice technical questions and identify areas where you can improve.',
  },
};
