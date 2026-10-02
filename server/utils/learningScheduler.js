const getDayName = (date) => {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
  });
};

const generateLearningSchedule = ({
  plan,
  hoursPerDay,
  availableDays,
  startDate,
  targetDate,
}) => {
  const schedule = [];

  const start = new Date(startDate);

  const target = targetDate ? new Date(targetDate) : new Date(startDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(target.getTime())) {
    throw new Error("Invalid start date or target date");
  }

  // ==========================================
  // 1. Daily learning capacity
  // ==========================================

  const dailyMinutes = Math.round(hoursPerDay * 60);

  // ==========================================
  // 2. Convert AI roadmap into subtopic units
  // ==========================================

  const learningUnits = [];

  if (plan && Array.isArray(plan.skills)) {
    for (const skill of plan.skills) {
      if (!skill || !Array.isArray(skill.topics)) {
        continue;
      }

      for (const topic of skill.topics) {
        if (!topic) {
          continue;
        }

        const subtopics = Array.isArray(topic.subtopics) ? topic.subtopics : [];

        const topicEstimatedHours = Number(topic.estimated_hours) || 0;

        /*
         * If the topic has subtopics,
         * divide its estimated time across
         * the subtopics.
         */

        if (subtopics.length > 0) {
          const totalTopicMinutes = Math.round(topicEstimatedHours * 60);

          const baseMinutes = Math.floor(totalTopicMinutes / subtopics.length);

          let remainingMinutes = totalTopicMinutes;

          subtopics.forEach((subtopic, index) => {
            let subtopicMinutes = baseMinutes;

            /*
             * Give any remaining
             * minutes to the last
             * subtopic.
             */

            if (index === subtopics.length - 1) {
              subtopicMinutes = remainingMinutes;
            }

            remainingMinutes -= subtopicMinutes;

            learningUnits.push({
              skill: skill.skill || "",

              topic: topic.topic || "",

              subtopic: subtopic || "",

              estimatedMinutes: Math.max(subtopicMinutes, 0),

              learningTasks: Array.isArray(topic.learning_tasks)
                ? topic.learning_tasks
                : [],

              practiceTasks: Array.isArray(topic.practice_tasks)
                ? topic.practice_tasks
                : [],
            });
          });
        } else {
          /*
           * If Gemini did not provide
           * subtopics, keep the topic
           * as one learning unit.
           */

          learningUnits.push({
            skill: skill.skill || "",

            topic: topic.topic || "",

            subtopic: "",

            estimatedMinutes: Math.round(topicEstimatedHours * 60),

            learningTasks: Array.isArray(topic.learning_tasks)
              ? topic.learning_tasks
              : [],

            practiceTasks: Array.isArray(topic.practice_tasks)
              ? topic.practice_tasks
              : [],
          });
        }
      }
    }
  }

  // ==========================================
  // 3. Calculate total curriculum time
  // ==========================================

  const estimatedMinutes = learningUnits.reduce(
    (total, unit) => total + unit.estimatedMinutes,
    0,
  );

  // ==========================================
  // 4. Generate timetable
  // ==========================================

  let unitIndex = 0;

  let remainingUnitMinutes =
    learningUnits.length > 0 ? learningUnits[0].estimatedMinutes : 0;

  for (
    let currentDate = new Date(start);
    currentDate <= target;
    currentDate.setDate(currentDate.getDate() + 1)
  ) {
    const dayName = getDayName(currentDate);

    // Skip days user is not available
    if (!availableDays.includes(dayName)) {
      continue;
    }

    let remainingDailyMinutes = dailyMinutes;

    const sessions = [];

    while (remainingDailyMinutes > 0 && unitIndex < learningUnits.length) {
      const currentUnit = learningUnits[unitIndex];

      // Move to next unit if finished
      if (remainingUnitMinutes <= 0) {
        unitIndex++;

        if (unitIndex >= learningUnits.length) {
          break;
        }

        remainingUnitMinutes = learningUnits[unitIndex].estimatedMinutes;

        continue;
      }

      const sessionMinutes = Math.min(
        remainingDailyMinutes,
        remainingUnitMinutes,
      );

      sessions.push({
        skill: currentUnit.skill,

        topic: currentUnit.topic,

        subtopic: currentUnit.subtopic,

        duration_minutes: sessionMinutes,

        learning_tasks: currentUnit.learningTasks,

        practice_tasks: currentUnit.practiceTasks,

        type: "learning",
      });

      remainingDailyMinutes -= sessionMinutes;

      remainingUnitMinutes -= sessionMinutes;

      if (remainingUnitMinutes <= 0) {
        //unitIndex++;
      }
    }

    if (sessions.length > 0) {
      schedule.push({
        date: currentDate.toISOString().split("T")[0],

        day: dayName,

        sessions,
      });
    }

    if (unitIndex >= learningUnits.length) {
      break;
    }
  }

  // ==========================================
  // 5. Calculate statistics
  // ==========================================

  const scheduledMinutes = schedule.reduce((total, day) => {
    const dayMinutes = day.sessions.reduce(
      (sessionTotal, session) => sessionTotal + session.duration_minutes,
      0,
    );

    return total + dayMinutes;
  }, 0);

  const unscheduledMinutes = Math.max(estimatedMinutes - scheduledMinutes, 0);

  const estimatedHours = Number((estimatedMinutes / 60).toFixed(2));

  const scheduledHours = Number((scheduledMinutes / 60).toFixed(2));

  const unscheduledHours = Number((unscheduledMinutes / 60).toFixed(2));

  const isComplete = unscheduledMinutes === 0;

  // ==========================================
  // 6. Return result
  // ==========================================

  return {
    schedule,

    statistics: {
      estimatedHours,

      scheduledHours,

      unscheduledHours,

      isComplete,
    },
  };
};

module.exports = {
  generateLearningSchedule,
};
