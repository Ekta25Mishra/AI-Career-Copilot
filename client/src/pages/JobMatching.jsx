
import { useEffect, useState } from "react";
import { jobDescriptionApi } from "../services/jobDescriptionApi";
import "./JobMatching.css";

function getId(job) {
  return job._id || job.id;
}

function JobMatching({ onNavigate }) {
  const [jobs, setJobs] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState({
    title: "",
    company: "",
    description: "",
  });

  const [analysis, setAnalysis] = useState(null);
  const [skillGap, setSkillGap] = useState(null);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [matching, setMatching] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedJob = jobs.find(
    (job) => String(getId(job)) === String(selectedId)
  );

  function handleCreateLearningPlan(skill) {
    localStorage.setItem("learningSkill", skill);
    onNavigate("learning");
  }

  async function loadJobs() {
    setLoadingJobs(true);
    setError("");

    try {
      const data = await jobDescriptionApi.getAll();
      const list = data.jobDescriptions || [];

      setJobs(list);

      setSelectedId((current) => {
        if (list.some((job) => String(getId(job)) === String(current))) {
          return current;
        }

        return list.length ? String(getId(list[0])) : "";
      });
    } catch (err) {
      setError(err.message || "Could not load saved jobs.");
    } finally {
      setLoadingJobs(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    setAnalysis(null);
    setSkillGap(null);
    setNotice("");

    if (!selectedId) return;

    const job = jobs.find(
      (item) => String(getId(item)) === String(selectedId)
    );

    if (job?.structuredAnalysis) {
      setAnalysis(job.structuredAnalysis);
    }

    if (job?.skillGapAnalysis) {
      setSkillGap(job.skillGapAnalysis);
    }
  }, [selectedId, jobs]);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleCreate(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);

    try {
      const data = await jobDescriptionApi.create({
        title: form.title.trim(),
        company: form.company.trim(),
        description: form.description.trim(),
      });

      const created = data.jobDescription;
      const newId = getId(created);

      setForm({
        title: "",
        company: "",
        description: "",
      });

      setAnalysis(null);
      setSkillGap(null);
      setNotice("Job description saved successfully.");

      await loadJobs();

      if (newId) {
        setSelectedId(String(newId));
      }
    } catch (err) {
      setError(err.message || "Could not save this job description.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAnalyze() {
    if (!selectedId) return;

    setError("");
    setNotice("");
    setAnalyzing(true);

    try {
      const data = await jobDescriptionApi.analyze(selectedId);

      setAnalysis(data.analysis);
      setSkillGap(null);
      setNotice("Job description analysis completed.");

      await loadJobs();
    } catch (err) {
      setError(err.message || "Job analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSkillGap() {
    if (!selectedId) return;

    setError("");
    setNotice("");
    setMatching(true);

    try {
      const data = await jobDescriptionApi.analyzeSkillGap(selectedId);

      setSkillGap(data.analysis);
      setNotice("Skill gap analysis completed.");
    } catch (err) {
      setError(err.message || "Skill gap analysis failed.");
    } finally {
      setMatching(false);
    }
  }

  async function handleDelete() {
    if (!selectedId) return;

    const confirmed = window.confirm(
      "Delete this saved job description?"
    );

    if (!confirmed) return;

    setError("");
    setNotice("");
    setDeleting(true);

    try {
      await jobDescriptionApi.delete(selectedId);

      setAnalysis(null);
      setSkillGap(null);
      setNotice("Job description deleted.");

      await loadJobs();
    } catch (err) {
      setError(err.message || "Could not delete this job.");
    } finally {
      setDeleting(false);
    }
  }

  function renderList(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return <p className="jm-muted">No items returned.</p>;
    }

    return (
      <ul className="jm-list">
        {items.map((item, index) => (
          <li key={`${String(item)}-${index}`}>
            {String(item)}
          </li>
        ))}
      </ul>
    );
  }

  function renderMissingRequiredSkills(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return (
        <p className="jm-muted">
          No missing required skills found.
        </p>
      );
    }

    return (
      <ul className="jm-list">
        {items.map((item, index) => {
          const skill =
            typeof item === "string"
              ? item
              : item?.name || item?.skill || "";

          if (!skill) return null;

          return (
            <li key={`${skill}-${index}`}>
              <span>{skill}</span>{" "}
              <button
                className="jm-secondary"
                type="button"
                onClick={() => handleCreateLearningPlan(skill)}
              >
                Create Learning Plan
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <section className="jm-page">
      <header className="jm-header">
        <div>
          <p className="jm-eyebrow">CAREER TOOLS</p>
          <h1>Job Matching</h1>
          <p className="jm-subtitle">
            Understand job requirements and compare them with your resume.
          </p>
        </div>

        <span className="jm-count">{jobs.length} saved jobs</span>
      </header>

      {error && (
        <div className="jm-message jm-error">{error}</div>
      )}

      {notice && (
        <div className="jm-message jm-success">{notice}</div>
      )}

      <div className="jm-grid">
        <section className="jm-card">
          <div className="jm-card-heading">
            <div>
              <h2>Add a job description</h2>
              <p>Paste the job posting you want to evaluate.</p>
            </div>
          </div>

          <form className="jm-form" onSubmit={handleCreate}>
            <label>
              Job title *
              <input
                name="title"
                value={form.title}
                onChange={updateField}
                placeholder="e.g. AI Engineer Intern"
                required
                maxLength={150}
              />
            </label>

            <label>
              Company
              <input
                name="company"
                value={form.company}
                onChange={updateField}
                placeholder="Company name"
                maxLength={150}
              />
            </label>

            <label>
              Job description *
              <textarea
                name="description"
                value={form.description}
                onChange={updateField}
                placeholder="Paste responsibilities, required skills, qualifications..."
                rows={7}
                required
              />
            </label>

            <button
              className="jm-primary"
              type="submit"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save job description"}
            </button>
          </form>
        </section>

        <section className="jm-card">
          <div className="jm-card-heading">
            <div>
              <h2>Saved jobs</h2>
              <p>Select a job to view or analyze it.</p>
            </div>

            <button
              className="jm-text-button"
              type="button"
              onClick={loadJobs}
              disabled={loadingJobs}
            >
              Refresh
            </button>
          </div>

          {loadingJobs ? (
            <p className="jm-muted">Loading saved jobs...</p>
          ) : jobs.length === 0 ? (
            <div className="jm-empty">
              <span className="jm-empty-icon">✦</span>
              <h3>No saved jobs yet</h3>
              <p>Add a job description to get started.</p>
            </div>
          ) : (
            <div className="jm-job-list">
              {jobs.map((job) => (
                <button
                  type="button"
                  key={getId(job)}
                  className={`jm-job-item ${
                    String(getId(job)) === String(selectedId)
                      ? "jm-job-item-active"
                      : ""
                  }`}
                  onClick={() => setSelectedId(String(getId(job)))}
                >
                  <span className="jm-job-icon">JD</span>

                  <span className="jm-job-copy">
                    <strong>{job.title}</strong>

                    <small>
                      {job.company || "Company not specified"}
                    </small>

                    <small>
                      {job.analysisStatus === "completed"
                        ? "AI analysis completed"
                        : job.analysisStatus === "failed"
                        ? "Analysis failed — retry available"
                        : "Not analyzed yet"}
                    </small>
                  </span>

                  <span className="jm-chevron">›</span>
                </button>
              ))}
            </div>
          )}

          {selectedJob && (
            <div className="jm-selected-job">
              <div>
                <p className="jm-eyebrow">SELECTED JOB</p>
                <h3>{selectedJob.title}</h3>
                <p>
                  {selectedJob.company || "Company not specified"}
                </p>
              </div>

              <div className="jm-actions">
                <button
                  className="jm-primary"
                  type="button"
                  onClick={handleAnalyze}
                  disabled={analyzing || matching || deleting}
                >
                  {analyzing ? "Analyzing..." : "Analyze with AI"}
                </button>

                <button
                  className="jm-secondary"
                  type="button"
                  onClick={handleSkillGap}
                  disabled={
                    matching ||
                    analyzing ||
                    deleting ||
                    selectedJob.analysisStatus !== "completed"
                  }
                  title={
                    selectedJob.analysisStatus !== "completed"
                      ? "Analyze the job description first"
                      : "Compare resume skills with job requirements"
                  }
                >
                  {matching ? "Comparing..." : "Compare with resume"}
                </button>

                <button
                  className="jm-danger"
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting || analyzing || matching}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>

              {selectedJob.analysisStatus !== "completed" && (
                <p className="jm-hint">
                  Run AI analysis first. Skill comparison also requires an
                  analyzed resume.
                </p>
              )}
            </div>
          )}
        </section>
      </div>

      {selectedJob && (
        <section className="jm-card jm-analysis-section">
          <div className="jm-card-heading">
            <div>
              <p className="jm-eyebrow">AI INSIGHTS</p>
              <h2>Job description analysis</h2>
              <p>
                Structured requirements extracted from the job posting.
              </p>
            </div>

            {analysis && (
              <span className="jm-status">Analysis ready</span>
            )}
          </div>

          {!analysis ? (
            <div className="jm-empty jm-analysis-empty">
              <h3>Ready when you are</h3>
              <p>
                Select “Analyze with AI” to extract skills, experience,
                responsibilities and qualifications.
              </p>
            </div>
          ) : (
            <>
              <div className="jm-analysis-title">
                <span>Detected role</span>
                <h3>{analysis.job_title || selectedJob.title}</h3>
                <p>
                  {analysis.experience || "Experience not specified"}
                </p>
              </div>

              <div className="jm-insight-grid">
                <div className="jm-insight">
                  <h3>Required skills</h3>
                  {renderList(analysis.required_skills)}
                </div>

                <div className="jm-insight">
                  <h3>Preferred skills</h3>
                  {renderList(analysis.preferred_skills)}
                </div>

                <div className="jm-insight">
                  <h3>Responsibilities</h3>
                  {renderList(analysis.responsibilities)}
                </div>

                <div className="jm-insight">
                  <h3>Qualifications</h3>
                  {renderList(analysis.qualifications)}
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {selectedJob && (
        <section className="jm-card jm-analysis-section">
          <div className="jm-card-heading">
            <div>
              <p className="jm-eyebrow">RESUME COMPARISON</p>
              <h2>Your skill gap</h2>
              <p>
                See how your analyzed resume aligns with this job.
              </p>
            </div>

            {skillGap && (
              <span className="jm-status">Comparison ready</span>
            )}
          </div>

          {!skillGap ? (
            <div className="jm-empty jm-analysis-empty">
              <h3>Compare your skills</h3>
              <p>
                Analyze the job description and your resume, then choose
                “Compare with resume”.
              </p>
            </div>
          ) : (
            <>
              <div className="jm-match-banner">
                <div>
                  <span>Required skill match</span>
                  <strong>
                    {Number(skillGap.required_skill_match_percentage) || 0}%
                  </strong>
                </div>

                <div className="jm-progress-track">
                  <div
                    className="jm-progress-fill"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          0,
                          Number(skillGap.required_skill_match_percentage) || 0
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="jm-insight-grid">
                <div className="jm-insight">
                  <h3>Matched required skills</h3>
                  {renderList(skillGap.matched_required_skills)}
                </div>

                <div className="jm-insight">
                  <h3>Missing required skills</h3>

                  {renderMissingRequiredSkills(
                    skillGap.missing_required_skills
                  )}
                </div>

                <div className="jm-insight">
                  <h3>Matched preferred skills</h3>
                  {renderList(skillGap.matched_preferred_skills)}
                </div>

                <div className="jm-insight">
                  <h3>Missing preferred skills</h3>
                  {renderList(skillGap.missing_preferred_skills)}
                </div>

                <div className="jm-insight">
                  <h3>Additional resume skills</h3>
                  {renderList(skillGap.extra_skills)}
                </div>

                <div className="jm-insight">
                  <h3>Experience gap</h3>
                  <p className="jm-paragraph">
                    {skillGap.experience_gap || "No details returned."}
                  </p>
                </div>
              </div>

              {skillGap.summary && (
                <div className="jm-summary">
                  <h3>AI summary</h3>
                  <p>{skillGap.summary}</p>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </section>
  );
}

export default JobMatching;
