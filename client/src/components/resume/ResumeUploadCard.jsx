import { useRef, useState } from "react";

export default function ResumeUploadCard({
  onUpload,
  loading,
  hasResume,
}) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  function selectFile(selectedFile) {
    setError("");

    if (!selectedFile) return;

    if (selectedFile.type !== "application/pdf") {
      setError("Please select a PDF file.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("The file must be smaller than 10 MB.");
      return;
    }

    setFile(selectedFile);
  }

  async function handleUpload() {
    if (!file) {
      setError("Choose a PDF resume first.");
      return;
    }

    try {
      setError("");
      await onUpload(file);
      setFile(null);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (err) {
      setError(err.message || "Upload failed.");
    }
  }

  return (
    <section className="resume-panel">
      <div className="resume-section-heading">
        <div>
          <span className="resume-eyebrow">GET STARTED</span>
          <h2>{hasResume ? "Your uploaded resume" : "Upload your resume"}</h2>
          <p>
            Upload a PDF to extract your profile and prepare it for AI analysis.
          </p>
        </div>
      </div>

      {hasResume ? (
        <div className="resume-existing-note">
          <span className="resume-file-icon">PDF</span>
          <div>
            <strong>A resume is already saved</strong>
            <p>Delete your current resume before uploading another one.</p>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            className={`resume-dropzone ${dragging ? "is-dragging" : ""}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              selectFile(event.dataTransfer.files?.[0]);
            }}
            disabled={loading}
          >
            <span className="resume-upload-icon">↑</span>
            <strong>Drop your resume here</strong>
            <span>or click to browse your files</span>
            <small>PDF only · Maximum 10 MB</small>
          </button>

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            hidden
            onChange={(event) => selectFile(event.target.files?.[0])}
          />

          {file && (
            <div className="resume-selected-file">
              <span className="resume-file-icon">PDF</span>
              <div className="resume-file-info">
                <strong>{file.name}</strong>
                <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <button
                type="button"
                className="resume-text-button"
                onClick={() => {
                  setFile(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                disabled={loading}
              >
                Remove
              </button>
            </div>
          )}

          {error && <p className="resume-inline-error">{error}</p>}

          <button
            type="button"
            className="resume-primary-button"
            onClick={handleUpload}
            disabled={!file || loading}
          >
            {loading ? "Uploading..." : "Upload resume"}
          </button>
        </>
      )}
    </section>
  );
}