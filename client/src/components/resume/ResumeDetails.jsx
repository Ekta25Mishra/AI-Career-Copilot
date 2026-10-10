function formatValue(value) {
  if (value == null || value === "") return "";

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(formatValue).filter(Boolean).join(", ");
  }

  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([, item]) => item != null && item !== "")
      .map(([key, item]) => {
        const label = key
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (character) => character.toUpperCase());

        return `${label}: ${formatValue(item)}`;
      })
      .join(" · ");
  }

  return String(value);
}

function DetailSection({ title, eyebrow, items }) {
  return (
    <section className="resume-panel">
      <div className="resume-section-heading">
        <div>
          <span className="resume-eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        <span className="resume-count">{items.length}</span>
      </div>

      {items.length > 0 ? (
        <div className="resume-timeline">
          {items.map((item, index) => {
            const entries =
              item && typeof item === "object" && !Array.isArray(item)
                ? Object.entries(item).filter(
                    ([, value]) => value != null && value !== "",
                  )
                : [["Details", item]];

            const headingKeys = [
              "degree",
              "title",
              "role",
              "position",
              "company",
              "institution",
              "school",
              "name",
              "projectName",
            ];

            const headingEntry = entries.find(([key]) =>
              headingKeys.includes(key.toLowerCase()),
            );

            const heading = headingEntry
              ? formatValue(headingEntry[1])
              : `${title.slice(0, -1)} ${index + 1}`;

            return (
              <article className="resume-timeline-item" key={index}>
                <span className="resume-timeline-dot" />
                <div className="resume-timeline-content">
                  <h3>{heading}</h3>

                  {entries
                    .filter(([key]) => key !== headingEntry?.[0])
                    .map(([key, value]) => (
                      <p key={key}>
                        <strong>
                          {key
                            .replace(/([A-Z])/g, " $1")
                            .replace(/^./, (character) =>
                              character.toUpperCase(),
                            )}
                          :{" "}
                        </strong>
                        {formatValue(value)}
                      </p>
                    ))}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="resume-empty-text">
          No {title.toLowerCase()} details were identified.
        </p>
      )}
    </section>
  );
}

export default function ResumeDetails({ analysis }) {
  return (
    <div className="resume-details-grid">
      <DetailSection
        title="Education"
        eyebrow="ACADEMIC BACKGROUND"
        items={Array.isArray(analysis?.education) ? analysis.education : []}
      />

      <DetailSection
        title="Experience"
        eyebrow="WORK HISTORY"
        items={Array.isArray(analysis?.experience) ? analysis.experience : []}
      />

      <DetailSection
        title="Projects"
        eyebrow="WORK & BUILDS"
        items={Array.isArray(analysis?.projects) ? analysis.projects : []}
      />
    </div>
  );
}