
import { useCallback, useEffect, useState } from "react";
import { jobDescriptionApi } from "../services/jobDescriptionApi";
import { interviewApi } from "../services/interviewApi";
import "./InterviewPrep.css";

function getJobId(job) {
  return job?._id || job?.id;
}

function getInterviewId(interview) {
  return interview?._id || interview?.id || interview?.interviewId;
}

function getQuestionId(question) {
  return question?._id || question?.id || question?.questionId;
}

function getQuestionText(question) {
  if (typeof question === "string") return question;

  return (
    question?.question ||
    question?.questionText ||
    question?.text ||
    question?.prompt ||
    "Question text is not available."
  );
}

function getCurrentQuestion(data) {
  if (data?.completed) return null;

  const question =
    data?.currentQuestion ||
    data?.question ||
    data?.interviewQuestion ||
    data?.data?.currentQuestion ||
    data?.data?.question;

  if (question) {
    return typeof question === "string" ? { question } : question;
  }

  if (Array.isArray(data?.questions)) {
    return (
      data.questions.find(
        (item) => item.status === "pending" || item.answered === false
      ) || null
    );
  }

  return null;
}

function getStatusLabel(status) {
  const labels = {
    generated: "Generated",
    scheduled: "Scheduled",
    in_progress: "In progress",
    completed: "Completed",
  };

  return labels[status] || status || "Unknown";
}

function formatDate(date) {
  if (!date) return "Not scheduled";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "Date unavailable";

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function InterviewPrep() {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [mode, setMode] = useState("text");
  const [userQuestionsText, setUserQuestionsText] = useState("");

  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [history, setHistory] = useState([]);
  const [activeInterview, setActiveInterview] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answer, setAnswer] = useState("");
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [report, setReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const eligibleJobs = jobs.filter(
    (job) =>
      job?.structuredAnalysis &&
      job?.skillGapAnalysis &&
      job?.analysisStatus === "completed"
  );

  const refreshHistory = useCallback(async () => {
    try {
      const data = await interviewApi.getHistory();
      setHistory(Array.isArray(data.interviews) ? data.interviews : []);
    } catch (err) {
      setError(err.message || "Failed to load interview history.");
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadJobs() {
      try {
        const data = await jobDescriptionApi.getAll();
        const list = data.jobDescriptions || [];

        if (!active) return;

        setJobs(list);

        const eligibleJob = list.find(
          (job) =>
            job?.structuredAnalysis &&
            job?.skillGapAnalysis &&
            job?.analysisStatus === "completed"
        );

        if (eligibleJob) {
          setSelectedJobId(String(getJobId(eligibleJob)));
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load job descriptions.");
        }
      } finally {
        if (active) setLoadingJobs(false);
      }
    }

    loadJobs();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  function resetActiveSession() {
    setActiveInterview(null);
    setCurrentQuestion(null);
    setInterviewStarted(false);
    setReport(null);
    setAnswer("");
  }

  async function handleGenerate() {
    setError("");
    setSuccess("");

    if (!selectedJobId) {
      setError("Please select an analyzed job description first.");
      return;
    }

    const selectedJob = eligibleJobs.find(
      (job) => String(getJobId(job)) === selectedJobId
    );

    if (!selectedJob) {
      setError(
        "This job needs completed job analysis and skill-gap analysis."
      );
      return;
    }

    const userQuestions = userQuestionsText
      .split("\n")
      .map((question) => question.trim())
      .filter(Boolean);

    setGenerating(true);

    try {
      const generated = await interviewApi.generate({
        jobDescriptionId: selectedJobId,
        numberOfQuestions: 25,
        difficulty,
        userQuestions,
      });

      const interview =
        generated.interview ||
        generated.data?.interview ||
        generated.data ||
        generated;

      const interviewId =
        getInterviewId(interview) || generated.interviewId;

      if (!interviewId) {
        throw new Error(
          "Interview was generated, but its ID was not returned."
        );
      }

      const scheduleResult = await interviewApi.schedule({
        interviewId,
        scheduledAt: new Date().toISOString(),
        mode,
      });

      const savedInterview = {
        ...interview,
        ...(scheduleResult.interview || {}),
        _id: interviewId,
        interviewId,
        status: scheduleResult.interview?.status || "scheduled",
        totalQuestions:
          interview.totalQuestions ||
          generated.totalQuestions ||
          interview.questions?.length ||
          25,
        difficulty,
        mode,
      };

      setActiveInterview(savedInterview);
      setSuccess("Your mock interview has been generated successfully.");

      await refreshHistory();
    } catch (err) {
      setError(err.message || "Failed to generate the interview.");
    } finally {
      setGenerating(false);
    }
  }

  async function loadNextQuestion(interviewId) {
    const result = await interviewApi.getCurrentQuestion(interviewId);

    if (result.completed) {
      setCurrentQuestion(null);
      setLoadingReport(true);

      try {
        const finalReport = await interviewApi.getReport(interviewId);
        setReport(finalReport.report || finalReport);
        setInterviewStarted(true);
        await refreshHistory();
      } finally {
        setLoadingReport(false);
      }

      return;
    }

    const question = getCurrentQuestion(result);

    if (!question) {
      throw new Error("The server did not return the current question.");
    }

    setCurrentQuestion(question);
    setAnswer("");
    setInterviewStarted(true);
  }

  async function handleStartInterview() {
    const interviewId = getInterviewId(activeInterview);

    if (!interviewId) {
      setError("Interview ID is missing. Please generate the interview again.");
      return;
    }

    setError("");
    setSuccess("");
    setStarting(true);

    try {
      const status = activeInterview?.status;

      if (status !== "in_progress") {
        await interviewApi.start(interviewId);
      }

      await loadNextQuestion(interviewId);
      await refreshHistory();
    } catch (err) {
      setError(err.message || "Unable to start or resume the interview.");
    } finally {
      setStarting(false);
    }
  }

  async function handleSubmitAnswer() {
    const interviewId = getInterviewId(activeInterview);
    const questionId = getQuestionId(currentQuestion);
    const submittedAnswer = answer.trim();

    if (!submittedAnswer) {
      setError("Please write your answer before submitting.");
      return;
    }

    if (!interviewId || !questionId) {
      setError("The interview or question ID is missing.");
      return;
    }

    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      // The API accepts (interviewId, { questionId, answer }).
      // The backend saves evaluation but does not return its feedback.
      const result = await interviewApi.submitAnswer(interviewId, {
        questionId,
        answer: submittedAnswer,
      });

      if (result.completed || result.interviewStatus === "completed") {
        setAnswer("");
        setCurrentQuestion(null);
        setLoadingReport(true);

        try {
          const finalReport = await interviewApi.getReport(interviewId);
          setReport(finalReport.report || finalReport);
          setSuccess("Interview completed! Your detailed report is ready.");
          await refreshHistory();
        } finally {
          setLoadingReport(false);
        }

        return;
      }

      // No score or evaluation is displayed between questions.
      await loadNextQuestion(interviewId);
    } catch (err) {
      setError(err.message || "Failed to submit your answer.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOpenReport(interview) {
    const interviewId = getInterviewId(interview);

    if (!interviewId) {
      setError("Interview ID is missing.");
      return;
    }

    setError("");
    setSuccess("");
    setLoadingReport(true);

    try {
      const result = await interviewApi.getReport(interviewId);

      resetActiveSession();
      setActiveInterview({
        ...interview,
        _id: interviewId,
        interviewId,
      });
      setReport(result.report || result);
    } catch (err) {
      setError(err.message || "Unable to open this interview report.");
    } finally {
      setLoadingReport(false);
    }
  }

  async function handleResumeInterview(interview) {
    const interviewId = getInterviewId(interview);

    if (!interviewId) {
      setError("Interview ID is missing.");
      return;
    }

    setError("");
    setSuccess("");
    setStarting(true);

    try {
      resetActiveSession();

      setActiveInterview({
        ...interview,
        _id: interviewId,
        interviewId,
      });

      if (interview.status === "generated") {
        await interviewApi.schedule({
          interviewId,
          scheduledAt: new Date().toISOString(),
          mode: interview.mode || "text",
        });
      } else if (interview.status !== "in_progress") {
        await interviewApi.start(interviewId);
      }

      await loadNextQuestion(interviewId);
      await refreshHistory();
    } catch (err) {
      setError(err.message || "Unable to resume this interview.");
    } finally {
      setStarting(false);
    }
  }

  const totalQuestions =
    activeInterview?.totalQuestions ||
    report?.totalQuestions ||
    25;

  const currentNumber =
    currentQuestion?.questionNumber ||
    (report?.answeredQuestions || 0) + 1;

  return (
    <section className="interview-prep-page">
      <div className="interview-prep-heading">
        <div>
          <p className="interview-prep-eyebrow">INTERVIEW PRACTICE</p>
          <h1>Prepare with confidence.</h1>
          <p className="interview-prep-description">
            Practice job-specific questions, save every answer, and
            review your detailed performance report when you finish.
          </p>
        </div>

        <div className="interview-prep-heading-icon" aria-hidden="true">
          ◎
        </div>
      </div>

      {error && (
        <div className="interview-prep-message error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="interview-prep-message success" role="status">
          {success}
        </div>
      )}

      {loadingReport && (
        <div className="interview-prep-message">
          Loading your saved interview report...
        </div>
      )}

      {!activeInterview && (
        <div className="interview-prep-layout">
          <div className="interview-prep-card">
            <div className="interview-prep-card-heading">
              <div className="interview-prep-step">01</div>
              <div>
                <h2>Set up your mock interview</h2>
                <p>Personalize your practice session.</p>
              </div>
            </div>

            <div className="interview-prep-field">
              <label htmlFor="interview-job">Job description</label>
              <select
                id="interview-job"
                value={selectedJobId}
                onChange={(event) => setSelectedJobId(event.target.value)}
                disabled={loadingJobs || generating}
              >
                <option value="">
                  {loadingJobs
                    ? "Loading job descriptions..."
                    : "Select an analyzed job"}
                </option>

                {eligibleJobs.map((job) => (
                  <option
                    key={getJobId(job)}
                    value={String(getJobId(job))}
                  >
                    {job.title || job.jobTitle || "Untitled position"}
                    {job.company ? ` — ${job.company}` : ""}
                  </option>
                ))}
              </select>

              {!loadingJobs && eligibleJobs.length === 0 && (
                <p className="interview-prep-hint">
                  Complete job analysis and skill-gap analysis first.
                </p>
              )}
            </div>

            <div className="interview-prep-field">
              <label>Difficulty level</label>
              <div className="interview-prep-options">
                {["easy", "medium", "hard"].map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={
                      difficulty === level
                        ? "interview-prep-option active"
                        : "interview-prep-option"
                    }
                    onClick={() => setDifficulty(level)}
                    disabled={generating}
                    aria-pressed={difficulty === level}
                  >
                    <span className="interview-prep-option-dot" />
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="interview-prep-field">
              <label>Interview mode</label>
              <div className="interview-prep-options">
                {["text", "voice"].map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={
                      mode === item
                        ? "interview-prep-option active"
                        : "interview-prep-option"
                    }
                    onClick={() => setMode(item)}
                    disabled={generating}
                    aria-pressed={mode === item}
                  >
                    <span className="interview-prep-mode-icon">
                      {item === "text" ? "Aa" : "♫"}
                    </span>
                    {item === "text" ? "Text" : "Voice"}
                  </button>
                ))}
              </div>

              {mode === "voice" && (
                <p className="interview-prep-hint">
                  Voice mode is recorded as a preference; voice recording
                  and speech recognition are not enabled yet.
                </p>
              )}
            </div>

            <div className="interview-prep-field">
              <label htmlFor="interview-custom-questions">
                Your own questions
                <span className="interview-prep-optional">Optional</span>
              </label>
              <textarea
                id="interview-custom-questions"
                rows={4}
                value={userQuestionsText}
                onChange={(event) => setUserQuestionsText(event.target.value)}
                placeholder={
                  "Add one question per line...\nExample: Explain how you handled a challenging project."
                }
                disabled={generating}
              />
              <p className="interview-prep-hint">
                Add questions you want included in the interview.
              </p>
            </div>

            <button
              type="button"
              className="interview-prep-generate"
              onClick={handleGenerate}
              disabled={
                generating ||
                loadingJobs ||
                eligibleJobs.length === 0
              }
            >
              {generating ? "Generating interview..." : "Generate mock interview →"}
            </button>

            <p className="interview-prep-footer-note">
              25 questions · Personalized interview practice
            </p>
          </div>

          <aside className="interview-prep-info">
            <div className="interview-prep-info-icon">✦</div>
            <p className="interview-prep-info-label">YOUR PRACTICE PLAN</p>
            <h2>Practice with purpose.</h2>
            <p>
              Your interview questions are generated from your resume,
              job requirements, and identified skill gaps.
            </p>

            <div className="interview-prep-benefit">
              <span>01</span>
              <div>
                <h3>Relevant questions</h3>
                <p>Focus on the role you want.</p>
              </div>
            </div>

            <div className="interview-prep-benefit">
              <span>02</span>
              <div>
                <h3>Detailed feedback</h3>
                <p>Review your answers after completing the session.</p>
              </div>
            </div>

            <div className="interview-prep-benefit">
              <span>03</span>
              <div>
                <h3>Track your progress</h3>
                <p>Revisit completed reports at any time.</p>
              </div>
            </div>
          </aside>
        </div>
      )}

      {activeInterview && !report && (
        <section className="interview-prep-results">
          <div className="interview-prep-results-heading">
            <div>
              <p className="interview-prep-eyebrow">
                {interviewStarted ? "INTERVIEW IN PROGRESS" : "YOUR GENERATED SESSION"}
              </p>
              <h2>{interviewStarted ? "Your interview" : "Mock interview ready"}</h2>
              <p>
                {activeInterview.jobTitle ||
                  eligibleJobs.find(
                    (job) => String(getJobId(job)) === selectedJobId
                  )?.title ||
                  "Personalized interview"}
              </p>
            </div>

            <div className="interview-prep-count">
              <strong>{totalQuestions}</strong>
              <span>Questions</span>
            </div>
          </div>

          {!interviewStarted && (
            <button
              type="button"
              className="interview-prep-generate"
              onClick={handleStartInterview}
              disabled={starting}
            >
              {starting ? "Starting interview..." : "Start interview →"}
            </button>
          )}

          {interviewStarted && currentQuestion && (
            <div className="interview-prep-live">
              <div className="interview-prep-live-top">
                <span className="interview-prep-live-badge">LIVE INTERVIEW</span>
                <span>
                  Question {currentNumber} of {totalQuestions}
                </span>
              </div>

              <h3>{getQuestionText(currentQuestion)}</h3>

              {currentQuestion.skill && (
                <p className="interview-prep-hint">
                  Focus skill: {currentQuestion.skill}
                </p>
              )}

              <div className="interview-prep-field">
                <label htmlFor="interview-answer">Your answer</label>
                <textarea
                  id="interview-answer"
                  rows={7}
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder="Write your answer here..."
                  disabled={submitting}
                />
              </div>

              <button
                type="button"
                className="interview-prep-generate"
                onClick={handleSubmitAnswer}
                disabled={submitting || !answer.trim()}
              >
                {submitting ? "Saving your answer..." : "Submit answer →"}
              </button>

              <p className="interview-prep-hint">
                Your answer and evaluation are saved privately. Scores and
                feedback will appear in the report after the final question.
              </p>
            </div>
          )}

          <button
            type="button"
            className="interview-prep-secondary"
            onClick={() => {
              resetActiveSession();
              setError("");
              setSuccess("");
            }}
          >
            Back to interview setup
          </button>
        </section>
      )}

      {report && (
        <section className="interview-prep-results interview-prep-report">
          <p className="interview-prep-eyebrow">SESSION COMPLETED</p>
          <h2>Your interview report</h2>

          <p>
            {report.jobTitle || activeInterview?.jobTitle || "Mock interview"}
            {report.company ? ` · ${report.company}` : ""}
          </p>

          <div className="interview-prep-report-score">
            <strong>{Number(report.overallScore ?? report.averageScore ?? 0).toFixed(1)}/10</strong>
            <span>Overall score</span>
          </div>

          <div className="interview-prep-report-stats">
            <div>
              <strong>{report.answeredQuestions ?? report.questions?.length ?? 0}</strong>
              <span>Answered</span>
            </div>
            <div>
              <strong>{report.totalQuestions ?? report.questions?.length ?? 0}</strong>
              <span>Total questions</span>
            </div>
            <div>
              <strong>{report.difficulty || activeInterview?.difficulty || "—"}</strong>
              <span>Difficulty</span>
            </div>
          </div>

          {report.preparationFeedback && (
            <div className="interview-prep-report-summary">
              <h3>Overall feedback</h3>
              <p>{report.preparationFeedback}</p>
            </div>
          )}

          {Array.isArray(report.strongAreas) && report.strongAreas.length > 0 && (
            <div className="interview-prep-report-summary">
              <h3>Strong areas</h3>
              <ul>
                {report.strongAreas.map((item, index) => (
                  <li key={index}>
                    {typeof item === "string"
                      ? item
                      : item.skill || item.name || "Skill"}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(report.weakAreas) && report.weakAreas.length > 0 && (
            <div className="interview-prep-report-summary">
              <h3>Areas to improve</h3>
              <ul>
                {report.weakAreas.map((item, index) => (
                  <li key={index}>
                    {typeof item === "string"
                      ? item
                      : item.skill || item.name || "Skill"}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="interview-prep-detailed-report">
            <h3>Question-by-question evaluation</h3>

            {Array.isArray(report.questions) && report.questions.length > 0 ? (
              report.questions.map((question, index) => (
                <article
                  className="interview-prep-report-question"
                  key={getQuestionId(question) || index}
                >
                  <div className="interview-prep-report-question-heading">
                    <span className="interview-prep-question-number">
                      {String(question.questionNumber || index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h4>{getQuestionText(question)}</h4>
                      {(question.skill || question.type) && (
                        <p className="interview-prep-hint">
                          {[question.skill, question.type]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                    <span className="interview-prep-question-score">
                      {question.score == null
                        ? "N/A"
                        : `${Number(question.score).toFixed(1)}/10`}
                    </span>
                  </div>

                  <div className="interview-prep-report-answer">
                    <h5>Your answer</h5>
                    <p>{question.userAnswer || "No answer recorded."}</p>
                  </div>

                  <div className="interview-prep-report-answer">
                    <h5>Ideal answer</h5>
                    <p>{question.idealAnswer || "Ideal answer is not available for this question."}</p>
                  </div>

                  {question.feedback && (
                    <div className="interview-prep-report-answer">
                      <h5>Feedback</h5>
                      <p>{question.feedback}</p>
                    </div>
                  )}

                  {Array.isArray(question.strengths) && question.strengths.length > 0 && (
                    <div className="interview-prep-report-answer">
                      <h5>Strengths</h5>
                      <ul>
                        {question.strengths.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {Array.isArray(question.improvementAreas) &&
                    question.improvementAreas.length > 0 && (
                      <div className="interview-prep-report-answer">
                        <h5>Suggestions for improvement</h5>
                        <ul>
                          {question.improvementAreas.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                </article>
              ))
            ) : (
              <p>The server did not return the question-wise report.</p>
            )}
          </div>

          <button
            type="button"
            className="interview-prep-generate"
            onClick={() => {
              resetActiveSession();
              setError("");
              setSuccess("");
            }}
          >
            Create another interview
          </button>
        </section>
      )}

      <section className="interview-prep-history">
        <div className="interview-prep-results-heading">
          <div>
            <p className="interview-prep-eyebrow">YOUR SAVED SESSIONS</p>
            <h2>Interview history</h2>
            <p>Open completed reports or resume unfinished interviews.</p>
          </div>

          <button
            type="button"
            className="interview-prep-secondary"
            onClick={refreshHistory}
            disabled={loadingHistory}
          >
            {loadingHistory ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {loadingHistory ? (
          <p>Loading interview history...</p>
        ) : history.length === 0 ? (
          <p>No interviews yet. Generate your first mock interview above.</p>
        ) : (
          <div className="interview-prep-history-list">
            {history.map((item) => {
              const interviewId = getInterviewId(item);
              const status = item.status;
              const isCompleted = status === "completed";
              const canResume = ["generated", "scheduled", "in_progress"].includes(status);

              return (
                <article
                  className="interview-prep-history-item"
                  key={interviewId}
                >
                  <div className="interview-prep-history-details">
                    <h3>{item.jobTitle || "Mock interview"}</h3>
                    <p>
                      {item.company || "Company not specified"}
                      {" · "}
                      {formatDate(item.createdAt)}
                    </p>
                    <p>
                      {item.answeredQuestions || 0}/{item.totalQuestions || 25} answered
                      {" · "}
                      {(item.difficulty || "medium").toUpperCase()}
                      {" · "}
                      {(item.mode || "text").toUpperCase()}
                    </p>
                  </div>

                  <div className="interview-prep-history-actions">
                    <span
                      className={`interview-prep-history-status status-${status}`}
                    >
                      {getStatusLabel(status)}
                    </span>

                    {isCompleted && (
                      <button
                        type="button"
                        className="interview-prep-secondary"
                        onClick={() => handleOpenReport(item)}
                        disabled={loadingReport}
                      >
                        View report
                      </button>
                    )}

                    {canResume && (
                      <button
                        type="button"
                        className="interview-prep-secondary"
                        onClick={() => handleResumeInterview(item)}
                        disabled={starting}
                      >
                        {status === "in_progress" ? "Resume interview" : "Start interview"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}

export default InterviewPrep;
