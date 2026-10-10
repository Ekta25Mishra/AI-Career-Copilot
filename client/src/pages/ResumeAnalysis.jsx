import { useCallback, useEffect, useState } from "react";
import ResumeUploadCard from "../components/resume/ResumeUploadCard";
import ResumeProfile from "../components/resume/ResumeProfile";
import ResumeSkills from "../components/resume/ResumeSkills";
import ResumeDetails from "../components/resume/ResumeDetails";
import { resumeApi } from "../services/resumeApi";

export default function ResumeAnalysis() {
  const [resume, setResume] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [initialized, setInitialized] = useState(false);

  const loadResume = useCallback(async () => {
    setLoading("loading");
    setError("");

    try {
      const data = await resumeApi.getResume();
      setResume(data.resume || null);
    } catch (err) {
      if (err.message === "Resume not found") {
        setResume(null);
      } else if (err.message === "Resume not found!") {
        setResume(null);
      } else {
        setError(err.message || "Could not load your resume.");
      }
    } finally {
      setLoading("");
      setInitialized(true);
    }
  }, []);

  useEffect(() => {
    loadResume();
  }, [loadResume]);

  async function handleUpload(file) {
    setLoading("uploading");
    setError("");
    setNotice("");

    try {
      const data = await resumeApi.uploadResume(file);
      setResume(data.resume || null);
      setAnalysis(null);
      setNotice(data.message || "Resume uploaded successfully.");
    } catch (err) {
      setError(err.message || "Resume upload failed.");
      throw err;
    } finally {
      setLoading("");
    }
  }

  async function handleAnalyze() {
    setLoading("analyzing");
    setError("");
    setNotice("");

    try {
      const data = await resumeApi.analyzeResume();
      setAnalysis(data.analysis || null);
      setNotice(data.message || "Resume analysis completed.");
    } catch (err) {
      setError(err.message || "Resume analysis failed.");
    } finally {
      setLoading("");
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Delete your saved resume? You will need to upload it again to analyze it."
    );

    if (!confirmed) return;

    setLoading("deleting");
    setError("");
    setNotice("");

    try {
      const data = await resumeApi.deleteResume();
      setResume(null);
      setAnalysis(null);
      setNotice(data.message || "Resume deleted successfully.");
    } catch (err) {
      setError(err.message || "Could not delete your resume.");
    } finally {
      setLoading("");
    }
  }

  const isBusy = Boolean(loading);

  return (
    <main className="resume-page">
      <header className="resume-page-header">
        <div>
          <span className="resume-eyebrow">YOUR CAREER WORKSPACE</span>
          <h1>Resume Analysis</h1>
          <p>
            Turn your resume into a structured professional profile with AI.
          </p>
        </div>

        <div className="resume-header-mark" aria-hidden="true">
          <span>CV</span>
          <span className="resume-header-spark">✦</span>
        </div>
      </header>

      {error && (
        <div className="resume-alert resume-alert-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      )}

      {notice && (
        <div className="resume-alert resume-alert-success" role="status">
          {notice}
        </div>
      )}

      {!initialized && loading === "loading" && (
        <div className="resume-panel resume-loading">
          <span className="resume-spinner" />
          Loading your saved resume...
        </div>
      )}

      {(initialized || loading !== "loading") && (
        <>
          <ResumeUploadCard
            onUpload={handleUpload}
            loading={isBusy}
            hasResume={Boolean(resume)}
          />

          {resume && (
            <section className="resume-panel resume-document-card">
              <div className="resume-document-leading">
                <span className="resume-file-icon">PDF</span>
                <div>
                  <h2>{resume.originalname || resume.originalName || "My resume"}</h2>
                  <p>
                    {resume.pages != null
                      ? `${resume.pages} page${resume.pages === 1 ? "" : "s"}`
                      : "PDF document"}
                    {resume.createdAt
                      ? ` · Uploaded ${new Date(
                          resume.createdAt,
                        ).toLocaleDateString()}`
                      : ""}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="resume-danger-button"
                onClick={handleDelete}
                disabled={isBusy}
              >
                {loading === "deleting" ? "Deleting..." : "Delete resume"}
              </button>
            </section>
          )}

          {resume && (
            <section className="resume-panel resume-analysis-action">
              <div>
                <span className="resume-eyebrow">AI-POWERED INSIGHTS</span>
                <h2>
                  {analysis ? "Your analysis is ready" : "Ready to analyze"}
                </h2>
                <p>
                  Extract your professional profile, technical skills,
                  education, experience and projects.
                </p>
              </div>

              <button
                type="button"
                className="resume-primary-button"
                onClick={handleAnalyze}
                disabled={isBusy}
              >
                {loading === "analyzing"
                  ? "Analyzing..."
                  : analysis
                    ? "Analyze again"
                    : "Analyze my resume"}
              </button>
            </section>
          )}

          {loading === "analyzing" && (
            <div className="resume-loading resume-panel">
              <span className="resume-spinner" />
              <div>
                <strong>Analyzing your resume</strong>
                <p>
                  AI is processing your professional information. This may
                  take a little while.
                </p>
              </div>
            </div>
          )}

          {analysis && (
            <div className="resume-results">
              <div className="resume-results-heading">
                <div>
                  <span className="resume-eyebrow">ANALYSIS RESULTS</span>
                  <h2>Your professional snapshot</h2>
                </div>
                <span className="resume-status-pill">Complete</span>
              </div>

              <ResumeProfile analysis={analysis} />
              <ResumeSkills skills={analysis.skills || []} />
              <ResumeDetails analysis={analysis} />
            </div>
          )}
        </>
      )}
    </main>
  );
}