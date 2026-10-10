export default function ResumeProfile({ analysis }) {
  const fields = [
    { label: "Full name", value: analysis?.name },
    { label: "Email address", value: analysis?.email },
    { label: "Phone number", value: analysis?.phone },
  ];

  return (
    <section className="resume-panel">
      <div className="resume-section-heading">
        <div>
          <span className="resume-eyebrow">PERSONAL INFORMATION</span>
          <h2>Candidate profile</h2>
        </div>
        <span className="resume-status-pill">Analyzed</span>
      </div>

      <div className="resume-profile-grid">
        {fields.map((field) => (
          <div className="resume-profile-field" key={field.label}>
            <span>{field.label}</span>
            <strong>{field.value || "Not found"}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}