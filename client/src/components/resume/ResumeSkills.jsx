export default function ResumeSkills({ skills = [] }) {
  return (
    <section className="resume-panel">
      <div className="resume-section-heading">
        <div>
          <span className="resume-eyebrow">TECHNICAL PROFILE</span>
          <h2>Skills identified</h2>
          <p>Technologies and capabilities extracted from your resume.</p>
        </div>

        <span className="resume-count">{skills.length} skills</span>
      </div>

      {skills.length > 0 ? (
        <div className="resume-skill-list">
          {skills.map((skill, index) => {
            const label =
              typeof skill === "string"
                ? skill
                : skill?.name || skill?.skill || JSON.stringify(skill);

            return (
              <span className="resume-skill-tag" key={`${label}-${index}`}>
                {label}
              </span>
            );
          })}
        </div>
      ) : (
        <p className="resume-empty-text">No skills were identified.</p>
      )}
    </section>
  );
}