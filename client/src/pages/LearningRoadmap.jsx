
import { useCallback, useEffect, useMemo, useState } from "react";
import { learningPlanApi } from "../services/learningPlanApi";
import "./LearningRoadmap.css";

function formatDate(date) {
  if (!date) return "-";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "-";

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getPlanId(plan) {
  return plan?._id || plan?.id || null;
}

function getSessionId(session) {
  return session?.sessionId || session?._id || session?.id || null;
}

function normalizePlans(data) {
  if (Array.isArray(data)) return data;

  return data?.learningPlans || data?.plans || [];
}

function normalizePlan(data) {
  return data?.learningPlan || data?.plan || data;
}

function normalizeSessions(data) {
  if (Array.isArray(data)) return data;

  return data?.sessions || data?.learningSessions || [];
}

function getSessionTitle(session, index) {
  return (
    session?.subtopic ||
    session?.title ||
    session?.topic ||
    session?.skill ||
    `Session ${index + 1}`
  );
}

function getSessionDuration(session) {
  if (session?.duration_minutes != null) {
    return Math.max(0, Number(session.duration_minutes) || 0) / 60;
  }

  return Math.max(
    0,
    Number(
      session?.duration ??
        session?.hours ??
        session?.durationHours ??
        0
    ) || 0
  );
}

function getSessionTasks(session) {
  const tasks = [
    ...(Array.isArray(session?.learning_tasks)
      ? session.learning_tasks
      : []),
    ...(Array.isArray(session?.practice_tasks)
      ? session.practice_tasks
      : []),
    ...(Array.isArray(session?.tasks) ? session.tasks : []),
  ];

  return tasks
    .map((task) => {
      if (typeof task === "string") return task;

      return task?.title || task?.description || "";
    })
    .filter(Boolean);
}

function LearningRoadmap() {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const [dashboard, setDashboard] = useState(null);
  const [progress, setProgress] = useState(null);
  const [todaySessions, setTodaySessions] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState(() => {
    const skill = localStorage.getItem("learningSkill") || "";
    localStorage.removeItem("learningSkill");

    return {
      skill,
      hoursPerDay: 2,
      daysPerWeek: 5,
      startDate: "",
      targetDate: "",
    };
  });

  const clearPlanData = useCallback(() => {
    setDashboard(null);
    setProgress(null);
    setTodaySessions([]);
    setUpcomingSessions([]);
  }, []);

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await learningPlanApi.getAll();
      const loadedPlans = normalizePlans(data);

      setPlans(loadedPlans);

      setSelectedPlan((current) => {
        if (!loadedPlans.length) return null;

        const currentId = getPlanId(current);

        return (
          loadedPlans.find(
            (plan) => getPlanId(plan) === currentId
          ) || loadedPlans[0]
        );
      });
    } catch (err) {
      setError(err?.message || "Unable to load learning roadmaps.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPlanData = useCallback(async (plan) => {
    const id = getPlanId(plan);

    if (!id) {
      clearPlanData();
      return;
    }

    try {
      setError("");

      const results = await Promise.all([
        learningPlanApi.getById(id),
        learningPlanApi.getDashboard(id),
        learningPlanApi.getProgress(id),
        learningPlanApi.getToday(id),
        learningPlanApi.getUpcoming(id),
      ]);

      const updatedPlan = normalizePlan(results[0]);

      setSelectedPlan(updatedPlan);
      setDashboard(results[1]?.dashboard || results[1]);
      setProgress(results[2]?.progress || results[2]);
      setTodaySessions(normalizeSessions(results[3]));
      setUpcomingSessions(normalizeSessions(results[4]));
    } catch (err) {
      setError(err?.message || "Unable to load roadmap sessions.");
    }
  }, [clearPlanData]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const selectedPlanId = getPlanId(selectedPlan);

  useEffect(() => {
    if (selectedPlan) {
      loadPlanData(selectedPlan);
    } else {
      clearPlanData();
    }
  }, [selectedPlanId, loadPlanData, clearPlanData]);

  function handleFormChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleCreate(event) {
    event.preventDefault();

    if (!form.skill.trim()) {
      setError("Please enter a skill to learn.");
      return;
    }

    if (
      !Number.isFinite(Number(form.hoursPerDay)) ||
      Number(form.hoursPerDay) < 1 ||
      Number(form.hoursPerDay) > 12
    ) {
      setError("Hours per day must be between 1 and 12.");
      return;
    }

    if (
      !Number.isFinite(Number(form.daysPerWeek)) ||
      Number(form.daysPerWeek) < 1 ||
      Number(form.daysPerWeek) > 7
    ) {
      setError("Days per week must be between 1 and 7.");
      return;
    }

    if (
      form.startDate &&
      form.targetDate &&
      form.targetDate < form.startDate
    ) {
      setError("Target date cannot be earlier than the start date.");
      return;
    }

    try {
      setCreating(true);
      setError("");
      setMessage("");

      const payload = {
        skill: form.skill.trim(),
        hoursPerDay: Number(form.hoursPerDay),
        daysPerWeek: Number(form.daysPerWeek),
        ...(form.startDate ? { startDate: form.startDate } : {}),
        ...(form.targetDate ? { targetDate: form.targetDate } : {}),
      };

      const data = await learningPlanApi.create(payload);
      const newPlan = normalizePlan(data);

      if (!getPlanId(newPlan)) {
        throw new Error(
          "Roadmap was created, but the response did not include a plan ID."
        );
      }

      setMessage("Learning roadmap created successfully.");
      clearPlanData();
      setSelectedPlan(newPlan);

      await loadPlans();
    } catch (err) {
      setError(err?.message || "Unable to create the learning roadmap.");
    } finally {
      setCreating(false);
    }
  }

  async function handleComplete(session) {
    const planId = getPlanId(selectedPlan);
    const sessionId = getSessionId(session);

    if (!planId || !sessionId) {
      setError("Unable to identify this session.");
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      await learningPlanApi.completeSession(planId, sessionId);

      setMessage("Learning session completed.");
      await loadPlanData(selectedPlan);
    } catch (err) {
      setError(err?.message || "Unable to complete this session.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReschedule() {
    const planId = getPlanId(selectedPlan);

    if (!planId) return;

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      await learningPlanApi.rescheduleMissed(planId);

      setMessage("Missed sessions have been rescheduled.");
      await loadPlanData(selectedPlan);
    } catch (err) {
      setError(err?.message || "Unable to reschedule missed sessions.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    const planId = getPlanId(selectedPlan);

    if (!planId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this learning roadmap?"
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      await learningPlanApi.delete(planId);

      setSelectedPlan(null);
      clearPlanData();

      setMessage("Learning roadmap deleted.");
      await loadPlans();
    } catch (err) {
      setError(err?.message || "Unable to delete the learning roadmap.");
    } finally {
      setActionLoading(false);
    }
  }

  const progressPercentage = useMemo(() => {
    const value =
      progress?.percentage ??
      progress?.progressPercentage ??
      dashboard?.progressPercentage ??
      dashboard?.completionPercentage ??
      0;

    return Math.min(100, Math.max(0, Number(value) || 0));
  }, [progress, dashboard]);

  const completedSessions =
    progress?.completedSessions ??
    dashboard?.completedSessions ??
    0;

  const totalSessions =
    progress?.totalSessions ??
    dashboard?.totalSessions ??
    selectedPlan?.sessions?.length ??
    upcomingSessions.length + todaySessions.length;

  const totalHours =
    progress?.totalHours ??
    dashboard?.totalHours ??
    selectedPlan?.totalHours ??
    0;

  return (
    <div className="learning-page">
      <div className="learning-header">
        <div>
          <p className="learning-eyebrow">CAREER DEVELOPMENT</p>
          <h1>Learning Roadmap</h1>
          <p>
            Build a structured learning plan and track your progress
            toward your career goals.
          </p>
        </div>

        <button
          type="button"
          className="learning-refresh-button"
          onClick={loadPlans}
          disabled={loading}
        >
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div className="learning-alert learning-alert-error" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div
          className="learning-alert learning-alert-success"
          role="status"
        >
          {message}
        </div>
      )}

      <section className="learning-create-card">
        <div className="learning-card-heading">
          <div>
            <span className="learning-section-label">CREATE PLAN</span>
            <h2>Start a new learning roadmap</h2>
          </div>
        </div>

        <form className="learning-form" onSubmit={handleCreate}>
          <div className="learning-field learning-field-wide">
            <label htmlFor="skill">Skill to learn</label>
            <input
              id="skill"
              name="skill"
              value={form.skill}
              onChange={handleFormChange}
              placeholder="e.g. Machine Learning"
              required
            />
          </div>

          <div className="learning-field">
            <label htmlFor="hoursPerDay">Hours / day</label>
            <input
              id="hoursPerDay"
              name="hoursPerDay"
              type="number"
              min="1"
              max="12"
              value={form.hoursPerDay}
              onChange={handleFormChange}
              required
            />
          </div>

          <div className="learning-field">
            <label htmlFor="daysPerWeek">Days / week</label>
            <input
              id="daysPerWeek"
              name="daysPerWeek"
              type="number"
              min="1"
              max="7"
              value={form.daysPerWeek}
              onChange={handleFormChange}
              required
            />
          </div>

          <div className="learning-field">
            <label htmlFor="startDate">Start date</label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              value={form.startDate}
              onChange={handleFormChange}
            />
          </div>

          <div className="learning-field">
            <label htmlFor="targetDate">Target date</label>
            <input
              id="targetDate"
              name="targetDate"
              type="date"
              min={form.startDate || undefined}
              value={form.targetDate}
              onChange={handleFormChange}
            />
          </div>

          <button
            className="learning-primary-button"
            type="submit"
            disabled={creating}
          >
            {creating ? "Creating..." : "Generate Roadmap"}
          </button>
        </form>
      </section>

      <div className="learning-layout">
        <aside className="learning-sidebar">
          <div className="learning-list-heading">
            <div>
              <span className="learning-section-label">YOUR PLANS</span>
              <h2>Roadmaps</h2>
            </div>

            <span className="learning-count">{plans.length}</span>
          </div>

          {loading ? (
            <div className="learning-empty">Loading plans...</div>
          ) : plans.length === 0 ? (
            <div className="learning-empty">
              No learning roadmap yet.
            </div>
          ) : (
            <div className="learning-plan-list">
              {plans.map((plan) => {
                const planId = getPlanId(plan);
                const active = selectedPlanId === planId;

                return (
                  <button
                    type="button"
                    key={planId}
                    className={`learning-plan-item ${
                      active ? "active" : ""
                    }`}
                    onClick={() => setSelectedPlan(plan)}
                  >
                    <strong>
                      {plan.skill ||
                        plan.title ||
                        plan.targetSkill ||
                        "Learning Plan"}
                    </strong>

                    <span>
                      {plan.hoursPerDay || plan.dailyHours || 0}h/day
                      {" · "}
                      {plan.daysPerWeek || 0} days/week
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <main className="learning-main">
          {!selectedPlan ? (
            <div className="learning-empty-state">
              <div className="learning-empty-icon">✓</div>
              <h2>Your learning roadmap will appear here</h2>
              <p>
                Create a plan above to start building your personalized
                learning schedule.
              </p>
            </div>
          ) : (
            <>
              <section className="learning-overview-card">
                <div>
                  <span className="learning-section-label">
                    ACTIVE ROADMAP
                  </span>

                  <h2>
                    {selectedPlan.skill ||
                      selectedPlan.title ||
                      selectedPlan.targetSkill ||
                      "Learning Plan"}
                  </h2>

                  <p>
                    {formatDate(selectedPlan.startDate)} →{" "}
                    {formatDate(
                      selectedPlan.targetDate || selectedPlan.endDate
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  className="learning-danger-button"
                  onClick={handleDelete}
                  disabled={actionLoading}
                >
                  Delete
                </button>
              </section>

              <section className="learning-metrics">
                <div className="learning-metric-card">
                  <span>Progress</span>
                  <strong>{progressPercentage.toFixed(0)}%</strong>
                </div>

                <div className="learning-metric-card">
                  <span>Completed</span>
                  <strong>
                    {completedSessions}/{totalSessions}
                  </strong>
                </div>

                <div className="learning-metric-card">
                  <span>Total Hours</span>
                  <strong>{Number(totalHours) || 0}h</strong>
                </div>

                <div className="learning-metric-card">
                  <span>Daily Goal</span>
                  <strong>
                    {selectedPlan.hoursPerDay ||
                      selectedPlan.dailyHours ||
                      0}
                    h
                  </strong>
                </div>
              </section>

              <section className="learning-progress-card">
                <div className="learning-progress-heading">
                  <div>
                    <span className="learning-section-label">
                      OVERALL PROGRESS
                    </span>
                    <h3>Keep moving forward</h3>
                  </div>

                  <strong>{progressPercentage.toFixed(0)}%</strong>
                </div>

                <div className="learning-progress-track">
                  <div
                    className="learning-progress-fill"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </section>

              <section className="learning-session-section">
                <div className="learning-section-heading">
                  <div>
                    <span className="learning-section-label">TODAY</span>
                    <h2>Today's learning sessions</h2>
                  </div>
                </div>

                {todaySessions.length === 0 ? (
                  <div className="learning-no-session">
                    No sessions scheduled for today.
                  </div>
                ) : (
                  <div className="learning-session-list">
                    {todaySessions.map((session, index) => {
                      const sessionId = getSessionId(session);
                      const completed =
                        session.completed === true ||
                        session.status === "completed";

                      const tasks = getSessionTasks(session);

                      return (
                        <div
                          className={`learning-session-card ${
                            completed ? "completed" : ""
                          }`}
                          key={sessionId || index}
                        >
                          <div className="learning-session-number">
                            {completed ? "✓" : index + 1}
                          </div>

                          <div className="learning-session-content">
                            <div className="learning-session-top">
                              <div>
                                <h3>{getSessionTitle(session, index)}</h3>

                                {session.topic && session.subtopic && (
                                  <p>{session.topic}</p>
                                )}
                              </div>

                              <span>
                                {getSessionDuration(session).toFixed(1)}h
                              </span>
                            </div>

                            {session.description && (
                              <p>{session.description}</p>
                            )}

                            {tasks.length > 0 && (
                              <ul>
                                {tasks.slice(0, 4).map((task, taskIndex) => (
                                  <li key={taskIndex}>{task}</li>
                                ))}
                              </ul>
                            )}

                            {!completed && (
                              <button
                                type="button"
                                className="learning-complete-button"
                                onClick={() => handleComplete(session)}
                                disabled={actionLoading || !sessionId}
                              >
                                {actionLoading
                                  ? "Updating..."
                                  : "Mark as completed"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="learning-session-section">
                <div className="learning-section-heading">
                  <div>
                    <span className="learning-section-label">UPCOMING</span>
                    <h2>Upcoming sessions</h2>
                  </div>

                  <button
                    type="button"
                    className="learning-secondary-button"
                    onClick={handleReschedule}
                    disabled={actionLoading}
                  >
                    Reschedule missed
                  </button>
                </div>

                {upcomingSessions.length === 0 ? (
                  <div className="learning-no-session">
                    No upcoming sessions.
                  </div>
                ) : (
                  <div className="learning-upcoming-list">
                    {upcomingSessions.map((session, index) => (
                      <div
                        className="learning-upcoming-item"
                        key={getSessionId(session) || index}
                      >
                        <div>
                          <strong>{getSessionTitle(session, index)}</strong>

                          <span>
                            {session.day ? `${session.day}, ` : ""}
                            {formatDate(
                              session.date ||
                                session.scheduledDate ||
                                session.sessionDate
                            )}
                          </span>
                        </div>

                        <span>
                          {getSessionDuration(session).toFixed(1)}h
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default LearningRoadmap;
