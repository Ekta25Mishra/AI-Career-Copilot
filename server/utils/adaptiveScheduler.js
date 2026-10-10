const getDayName = (date) => {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
  });
};

const rescheduleMissedSessions = ({ schedule, hoursPerDay, availableDays }) => {
  if (!Array.isArray(schedule) || schedule.length === 0) {
    return {
      schedule,
      rescheduledSessions: 0,
    };
  }

  const dailyMinutes = Math.round(hoursPerDay * 60);

  const missedSessions = [];

  // Find missed sessions
  for (const day of schedule) {
    if (!day || !Array.isArray(day.sessions)) {
      continue;
    }

    const today = new Date().toISOString().split("T")[0];

    if (day.date >= today) {
      continue;
    }

    for (const session of day.sessions) {
      if (session.completed !== true) {
        missedSessions.push({
          ...session,
          originalDate: day.date,
        });
      }
    }
  }

  if (missedSessions.length === 0) {
    return {
      schedule,
      rescheduledSessions: 0,
    };
  }

  // Remove missed sessions from old dates
  for (const day of schedule) {
    if (!day || !Array.isArray(day.sessions)) {
      continue;
    }

    const today = new Date().toISOString().split("T")[0];

    if (day.date < today) {
      day.sessions = day.sessions.filter(
        (session) => session.completed === true,
      );
    }
  }

  let sessionIndex = 0;

  // Add missed sessions to future available days
  for (
    let i = 0;
    i < schedule.length && sessionIndex < missedSessions.length;
    i++
  ) {
    const day = schedule[i];

    if (!day || !Array.isArray(day.sessions)) {
      continue;
    }

    if (day.date < new Date().toISOString().split("T")[0]) {
      continue;
    }

    if (!availableDays.includes(day.day)) {
      continue;
    }

    let usedMinutes = day.sessions.reduce(
      (total, session) => total + (Number(session.duration_minutes) || 0),
      0,
    );

    let remainingMinutes = dailyMinutes - usedMinutes;

    while (remainingMinutes > 0 && sessionIndex < missedSessions.length) {
      const missed = missedSessions[sessionIndex];

      const duration = Number(missed.duration_minutes) || 0;

      if (duration <= remainingMinutes) {
        day.sessions.push({
          ...missed,
          originalDate: missed.originalDate,
          rescheduled: true,
          status: "pending",
        });

        remainingMinutes -= duration;
        sessionIndex++;
      } else {
        break;
      }
    }
  }

  return {
    schedule,
    rescheduledSessions: sessionIndex,
  };
};

module.exports = {
  rescheduleMissedSessions,
};
