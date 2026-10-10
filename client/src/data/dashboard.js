export const metrics = [
  { label: 'Resume score', value: '—', note: 'Analyze your resume first', icon: '↗' },
  { label: 'Skills to develop', value: '—', note: 'Based on your career goals', icon: '⌘' },
  { label: 'Learning progress', value: '0%', note: 'Your progress starts here', icon: '◷' },
];

export const actions = [
  {
    id: 'resume',
    number: '01',
    title: 'Analyze your resume',
    description: 'Understand your skills, experience, and areas to improve.',
    icon: '▤',
    link: 'Start analysis',
  },
  {
    id: 'jobs',
    number: '02',
    title: 'Match a job description',
    description: 'See how your current profile aligns with a target role.',
    icon: '⌕',
    link: 'Explore job matching',
  },
  {
    id: 'learning',
    number: '03',
    title: 'Build your learning plan',
    description: 'Create a focused roadmap for your missing skills.',
    icon: '↗',
    link: 'View learning plan',
  },
  {
    id: 'interviews',
    number: '04',
    title: 'Practice interviews',
    description: 'Prepare for interviews with structured question practice.',
    icon: '◎',
    link: 'Start preparing',
  },
];
