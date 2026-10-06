const calculateLearningProgress = (schedule) => {
  if (!Array.isArray(schedule) || schedule.length === 0) {
    return {
      completedSessions: 0,
      totalSessions: 0,
      completedHours: 0,
      totalHours: 0,
      percentage: 0,
    };
  }

  let totalSessions = 0;
  let completedSessions = 0;
  let totalMinutes = 0;
  let completedMinutes = 0;

  for (const day of schedule) {
    if (!day || !Array.isArray(day.sessions)) {
      continue;
    }

    for (const session of day.sessions) {
      if (!session) {
        continue;
      }

      totalSessions++;

      const duration = Number(session.duration_minutes) || 0;

      totalMinutes += duration;

      if (session.completed === true) {
        completedSessions++;
        completedMinutes += duration;
      }
    }
  }

  const totalHours = totalMinutes / 60;

  const completedHours = completedMinutes / 60;

  const percentage =
    totalHours > 0
      ? Number(((completedHours / totalHours) * 100).toFixed(2))
      : 0;

  return {
    completedSessions,
    totalSessions,

    completedHours: Number(completedHours.toFixed(2)),

    totalHours: Number(totalHours.toFixed(2)),

    percentage,
  };
};

module.exports = {
  calculateLearningProgress,
};
