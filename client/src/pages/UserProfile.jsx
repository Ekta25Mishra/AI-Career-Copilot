import { useEffect, useState } from "react";
import { userProfileApi } from "../services/userProfileApi";
import "./UserProfile.css";

const emptyProfile = {
  name: "",
  email: "",
  phone: "",
  location: "",
  headline: "",
  bio: "",
  education: {
    degree: "",
    college: "",
    branch: "",
    graduationYear: "",
  },
  skills: [],
  projects: [],
  internships: [],
  certifications: [],
  preferredRoles: [],
  links: {
    github: "",
    linkedin: "",
    portfolio: "",
  },
};

function normalizeProfile(user = {}) {
  return {
    ...emptyProfile,
    ...user,
    education: {
      ...emptyProfile.education,
      ...(user.education || {}),
    },
    links: {
      ...emptyProfile.links,
      ...(user.links || {}),
    },
    skills: Array.isArray(user.skills) ? user.skills : [],
    projects: Array.isArray(user.projects) ? user.projects : [],
    internships: Array.isArray(user.internships) ? user.internships : [],
    certifications: Array.isArray(user.certifications)
      ? user.certifications
      : [],
    preferredRoles: Array.isArray(user.preferredRoles)
      ? user.preferredRoles
      : [],
  };
}

function getInitials(name = "") {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (!words.length) return "CC";

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function displayValue(value, fallback = "Not added yet") {
  return value?.trim() ? value : fallback;
}

function TagList({ items, emptyText = "Not added yet" }) {
  if (!items?.length) {
    return <span className="profile-empty-value">{emptyText}</span>;
  }

  return (
    <div className="profile-tags">
      {items.map((item, index) => (
        <span className="profile-tag" key={`${item}-${index}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

function SectionHeader({ eyebrow, title, description, onEdit }) {
  return (
    <div className="profile-section-header">
      <div>
        {eyebrow && <span className="section-eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>

      <button
        type="button"
        className="profile-edit-button"
        onClick={onEdit}
      >
        <span>✎</span>
        Edit
      </button>
    </div>
  );
}

function Field({ label, children, full = false }) {
  return (
    <div className={`profile-edit-field ${full ? "profile-edit-field-full" : ""}`}>
      <label>{label}</label>
      {children}
    </div>
  );
}

function UserProfile() {
  const [profile, setProfile] = useState(emptyProfile);
  const [editingSection, setEditingSection] = useState(null);
  const [draft, setDraft] = useState(emptyProfile);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      setError("");

      const response = await userProfileApi.getProfile();

      if (response?.user) {
        const normalized = normalizeProfile(response.user);

        setProfile(normalized);
        setDraft(normalized);
      }
    } catch (err) {
      setError(err.message || "Unable to load profile.");
    } finally {
      setLoading(false);
    }
  }

  function startEditing(section) {
    setMessage("");
    setError("");

    setDraft(normalizeProfile(profile));
    setEditingSection(section);
  }

  function cancelEditing() {
    setDraft(normalizeProfile(profile));
    setEditingSection(null);
    setMessage("");
    setError("");
  }

  function updateDraft(name, value) {
    setDraft((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function updateEducation(name, value) {
    setDraft((prev) => ({
      ...prev,
      education: {
        ...prev.education,
        [name]: value,
      },
    }));
  }

  function updateLinks(name, value) {
    setDraft((prev) => ({
      ...prev,
      links: {
        ...prev.links,
        [name]: value,
      },
    }));
  }

  function updateArray(field, value) {
    setDraft((prev) => ({
      ...prev,
      [field]: value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    }));
  }

  function updateProject(index, field, value) {
    setDraft((prev) => {
      const projects = [...prev.projects];

      projects[index] = {
        ...projects[index],
        [field]: value,
      };

      return {
        ...prev,
        projects,
      };
    });
  }

  function addProject() {
    setDraft((prev) => ({
      ...prev,
      projects: [
        ...prev.projects,
        {
          name: "",
          description: "",
          technologies: [],
          link: "",
        },
      ],
    }));
  }

  function removeProject(index) {
    setDraft((prev) => ({
      ...prev,
      projects: prev.projects.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function updateInternship(index, field, value) {
    setDraft((prev) => {
      const internships = [...prev.internships];

      internships[index] = {
        ...internships[index],
        [field]: value,
      };

      return {
        ...prev,
        internships,
      };
    });
  }

  function addInternship() {
    setDraft((prev) => ({
      ...prev,
      internships: [
        ...prev.internships,
        {
          company: "",
          role: "",
          duration: "",
          description: "",
        },
      ],
    }));
  }

  function removeInternship(index) {
    setDraft((prev) => ({
      ...prev,
      internships: prev.internships.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));
  }

  async function saveSection(section) {
    try {
      setSaving(true);
      setMessage("");
      setError("");

      const response = await userProfileApi.updateProfile(draft);

      if (response?.user) {
        const normalized = normalizeProfile(response.user);

        setProfile(normalized);
        setDraft(normalized);
      }

      setEditingSection(null);
      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(err.message || "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading-card">
          <div className="profile-loading-spinner" />
          <span>Loading your profile...</span>
        </div>
      </div>
    );
  }

  const isEditing = (section) => editingSection === section;

  return (
    <div className="profile-page">
      {/* PAGE HEADER */}
      <div className="profile-page-header">
        <div>
          <span className="profile-eyebrow">ACCOUNT</span>
          <h1>My Profile</h1>
          <p>
            Manage your professional identity and keep your career information
            up to date.
          </p>
        </div>
      </div>

      {message && (
        <div className="profile-alert profile-alert-success">
          <span>✓</span>
          {message}
        </div>
      )}

      {error && (
        <div className="profile-alert profile-alert-error">
          <span>!</span>
          {error}
        </div>
      )}

      {/* PROFILE HERO */}
      <section className="profile-hero-card">
        <div className="profile-hero-main">
          <div className="profile-avatar-large">
            {getInitials(profile.name)}
          </div>

          <div className="profile-hero-info">
            <h2>{displayValue(profile.name, "Your Name")}</h2>

            <p className="profile-hero-headline">
              {displayValue(
                profile.headline,
                "Add your professional headline"
              )}
            </p>

            <div className="profile-hero-meta">
              <span>
                <span className="meta-icon">✉</span>
                {displayValue(profile.email, "No email")}
              </span>

              {profile.location && (
                <span>
                  <span className="meta-icon">⌖</span>
                  {profile.location}
                </span>
              )}

              {profile.phone && (
                <span>
                  <span className="meta-icon">☎</span>
                  {profile.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="profile-completion">
          <span>PROFILE</span>
          <strong>
            {
              [
                profile.name,
                profile.headline,
                profile.bio,
                profile.phone,
                profile.location,
                profile.education.degree,
                profile.skills.length,
                profile.projects.length,
                profile.internships.length,
                profile.links.github,
                profile.links.linkedin,
              ].filter(Boolean).length > 7
                ? "Complete"
                : "Keep building"
            }
          </strong>
        </div>
      </section>

      {/* ABOUT */}
      <section className="profile-card">
        {!isEditing("basic") ? (
          <>
            <SectionHeader
              eyebrow="PROFILE"
              title="About"
              description="Your personal and professional introduction."
              onEdit={() => startEditing("basic")}
            />

            <div className="profile-about">
              <p>
                {displayValue(
                  profile.bio,
                  "Add a short introduction about yourself so Career Copilot can understand your background."
                )}
              </p>
            </div>

            <div className="profile-info-grid">
              <div className="profile-info-item">
                <span>Full Name</span>
                <strong>{displayValue(profile.name)}</strong>
              </div>

              <div className="profile-info-item">
                <span>Email</span>
                <strong>{displayValue(profile.email)}</strong>
              </div>

              <div className="profile-info-item">
                <span>Phone</span>
                <strong>{displayValue(profile.phone)}</strong>
              </div>

              <div className="profile-info-item">
                <span>Location</span>
                <strong>{displayValue(profile.location)}</strong>
              </div>

              <div className="profile-info-item profile-info-item-wide">
                <span>Professional Headline</span>
                <strong>{displayValue(profile.headline)}</strong>
              </div>
            </div>
          </>
        ) : (
          <>
            <SectionHeader
              eyebrow="EDIT PROFILE"
              title="About"
              description="Update your personal and professional information."
              onEdit={() => {}}
            />

            <div className="profile-edit-grid">
              <Field label="Full Name">
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => updateDraft("name", e.target.value)}
                  required
                />
              </Field>

              <Field label="Email">
                <input type="email" value={draft.email} disabled />
                <small>Email cannot be changed here.</small>
              </Field>

              <Field label="Phone">
                <input
                  type="text"
                  value={draft.phone}
                  onChange={(e) => updateDraft("phone", e.target.value)}
                  placeholder="+91..."
                />
              </Field>

              <Field label="Location">
                <input
                  type="text"
                  value={draft.location}
                  onChange={(e) => updateDraft("location", e.target.value)}
                  placeholder="Gorakhpur, Uttar Pradesh"
                />
              </Field>

              <Field label="Professional Headline" full>
                <input
                  type="text"
                  value={draft.headline}
                  onChange={(e) => updateDraft("headline", e.target.value)}
                  placeholder="Full Stack Developer | AI Enthusiast"
                />
              </Field>

              <Field label="Bio" full>
                <textarea
                  value={draft.bio}
                  onChange={(e) => updateDraft("bio", e.target.value)}
                  rows="5"
                  placeholder="Tell us briefly about yourself..."
                />
              </Field>
            </div>

            <EditActions
              saving={saving}
              onCancel={cancelEditing}
              onSave={() => saveSection("basic")}
            />
          </>
        )}
      </section>

      {/* EDUCATION */}
      <section className="profile-card">
        {!isEditing("education") ? (
          <>
            <SectionHeader
              eyebrow="ACADEMIC"
              title="Education"
              description="Your academic background."
              onEdit={() => startEditing("education")}
            />

            {profile.education.degree ||
            profile.education.college ||
            profile.education.branch ||
            profile.education.graduationYear ? (
              <div className="education-card">
                <div className="education-icon">🎓</div>

                <div className="education-content">
                  <h3>
                    {displayValue(
                      profile.education.degree,
                      "Degree not added"
                    )}
                  </h3>

                  <p>
                    {displayValue(
                      profile.education.college,
                      "College / University not added"
                    )}
                  </p>

                  <div className="education-meta">
                    {profile.education.branch && (
                      <span>{profile.education.branch}</span>
                    )}

                    {profile.education.graduationYear && (
                      <span>
                        Graduation · {profile.education.graduationYear}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                icon="🎓"
                title="No education details yet"
                text="Add your degree, college and graduation details."
                buttonText="Add Education"
                onClick={() => startEditing("education")}
              />
            )}
          </>
        ) : (
          <>
            <SectionHeader
              eyebrow="EDIT EDUCATION"
              title="Education"
              description="Update your latest academic qualification."
              onEdit={() => {}}
            />

            <div className="profile-edit-grid">
              <Field label="Degree">
                <input
                  type="text"
                  value={draft.education.degree}
                  onChange={(e) =>
                    updateEducation("degree", e.target.value)
                  }
                  placeholder="B.Tech CSE"
                />
              </Field>

              <Field label="College / University">
                <input
                  type="text"
                  value={draft.education.college}
                  onChange={(e) =>
                    updateEducation("college", e.target.value)
                  }
                  placeholder="College name"
                />
              </Field>

              <Field label="Branch / Specialization">
                <input
                  type="text"
                  value={draft.education.branch}
                  onChange={(e) =>
                    updateEducation("branch", e.target.value)
                  }
                  placeholder="Computer Science & Engineering"
                />
              </Field>

              <Field label="Graduation Year">
                <input
                  type="text"
                  value={draft.education.graduationYear}
                  onChange={(e) =>
                    updateEducation("graduationYear", e.target.value)
                  }
                  placeholder="2027"
                />
              </Field>
            </div>

            <EditActions
              saving={saving}
              onCancel={cancelEditing}
              onSave={() => saveSection("education")}
            />
          </>
        )}
      </section>

      {/* SKILLS */}
      <section className="profile-card">
        {!isEditing("skills") ? (
          <>
            <SectionHeader
              eyebrow="CAPABILITIES"
              title="Skills & Career Preferences"
              description="The skills and roles that shape your career journey."
              onEdit={() => startEditing("skills")}
            />

            <div className="profile-subsection">
              <div className="profile-subsection-title">
                <span>Skills</span>
              </div>
              <TagList items={profile.skills} emptyText="No skills added yet" />
            </div>

            <div className="profile-subsection">
              <div className="profile-subsection-title">
                <span>Preferred Roles</span>
              </div>
              <TagList
                items={profile.preferredRoles}
                emptyText="No preferred roles added yet"
              />
            </div>

            <div className="profile-subsection">
              <div className="profile-subsection-title">
                <span>Certifications</span>
              </div>
              <TagList
                items={profile.certifications}
                emptyText="No certifications added yet"
              />
            </div>
          </>
        ) : (
          <>
            <SectionHeader
              eyebrow="EDIT CAPABILITIES"
              title="Skills & Career Preferences"
              description="Separate multiple items with commas."
              onEdit={() => {}}
            />

            <div className="profile-edit-grid">
              <Field label="Skills" full>
                <input
                  type="text"
                  value={draft.skills.join(", ")}
                  onChange={(e) =>
                    updateArray("skills", e.target.value)
                  }
                  placeholder="JavaScript, React, Node.js, Python"
                />
              </Field>

              <Field label="Preferred Roles" full>
                <input
                  type="text"
                  value={draft.preferredRoles.join(", ")}
                  onChange={(e) =>
                    updateArray("preferredRoles", e.target.value)
                  }
                  placeholder="Software Developer, AI Engineer"
                />
              </Field>

              <Field label="Certifications" full>
                <input
                  type="text"
                  value={draft.certifications.join(", ")}
                  onChange={(e) =>
                    updateArray("certifications", e.target.value)
                  }
                  placeholder="Generative AI, MERN Stack"
                />
              </Field>
            </div>

            <EditActions
              saving={saving}
              onCancel={cancelEditing}
              onSave={() => saveSection("skills")}
            />
          </>
        )}
      </section>

      {/* PROJECTS */}
      <section className="profile-card">
        {!isEditing("projects") ? (
          <>
            <SectionHeader
              eyebrow="WORK"
              title="Projects"
              description="Showcase the projects you've built."
              onEdit={() => startEditing("projects")}
            />

            {profile.projects.length ? (
              <div className="project-list">
                {profile.projects.map((project, index) => (
                  <div className="project-item" key={project._id || index}>
                    <div className="project-number">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <div className="project-content">
                      <div className="project-title-row">
                        <h3>{displayValue(project.name, "Untitled project")}</h3>

                        {project.link && (
                          <a
                            href={project.link}
                            target="_blank"
                            rel="noreferrer"
                            className="project-link"
                          >
                            View project ↗
                          </a>
                        )}
                      </div>

                      <p>
                        {displayValue(
                          project.description,
                          "No project description added."
                        )}
                      </p>

                      <TagList
                        items={project.technologies || []}
                        emptyText=""
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon="⌘"
                title="No projects added yet"
                text="Add projects to highlight your practical experience."
                buttonText="Add Project"
                onClick={() => startEditing("projects")}
              />
            )}
          </>
        ) : (
          <>
            <SectionHeader
              eyebrow="EDIT PROJECTS"
              title="Projects"
              description="Add your projects and the technologies you used."
              onEdit={() => {}}
            />

            <div className="repeatable-list">
              {draft.projects.map((project, index) => (
                <div className="repeatable-card" key={project._id || index}>
                  <div className="repeatable-card-header">
                    <strong>Project {index + 1}</strong>

                    <button
                      type="button"
                      className="remove-button"
                      onClick={() => removeProject(index)}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="profile-edit-grid">
                    <Field label="Project Name">
                      <input
                        type="text"
                        value={project.name || ""}
                        onChange={(e) =>
                          updateProject(index, "name", e.target.value)
                        }
                        placeholder="Career Copilot"
                      />
                    </Field>

                    <Field label="Project Link">
                      <input
                        type="url"
                        value={project.link || ""}
                        onChange={(e) =>
                          updateProject(index, "link", e.target.value)
                        }
                        placeholder="https://github.com/..."
                      />
                    </Field>

                    <Field label="Description" full>
                      <textarea
                        rows="4"
                        value={project.description || ""}
                        onChange={(e) =>
                          updateProject(
                            index,
                            "description",
                            e.target.value
                          )
                        }
                        placeholder="Describe what you built..."
                      />
                    </Field>

                    <Field label="Technologies" full>
                      <input
                        type="text"
                        value={(project.technologies || []).join(", ")}
                        onChange={(e) =>
                          updateProject(
                            index,
                            "technologies",
                            e.target.value
                              .split(",")
                              .map((item) => item.trim())
                              .filter(Boolean)
                          )
                        }
                        placeholder="React, Node.js, MongoDB"
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="add-item-button"
              onClick={addProject}
            >
              + Add another project
            </button>

            <EditActions
              saving={saving}
              onCancel={cancelEditing}
              onSave={() => saveSection("projects")}
            />
          </>
        )}
      </section>

      {/* INTERNSHIPS */}
      <section className="profile-card">
        {!isEditing("internships") ? (
          <>
            <SectionHeader
              eyebrow="EXPERIENCE"
              title="Internships"
              description="Your practical industry experience."
              onEdit={() => startEditing("internships")}
            />

            {profile.internships.length ? (
              <div className="experience-list">
                {profile.internships.map((internship, index) => (
                  <div
                    className="experience-item"
                    key={internship._id || index}
                  >
                    <div className="experience-dot" />

                    <div className="experience-content">
                      <h3>
                        {displayValue(
                          internship.role,
                          "Internship role"
                        )}
                      </h3>

                      <div className="experience-company">
                        {displayValue(
                          internship.company,
                          "Company not added"
                        )}
                      </div>

                      {internship.duration && (
                        <span className="experience-duration">
                          {internship.duration}
                        </span>
                      )}

                      <p>
                        {displayValue(
                          internship.description,
                          "No description added."
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon="↗"
                title="No internships added yet"
                text="Add your internship experience to strengthen your profile."
                buttonText="Add Internship"
                onClick={() => startEditing("internships")}
              />
            )}
          </>
        ) : (
          <>
            <SectionHeader
              eyebrow="EDIT EXPERIENCE"
              title="Internships"
              description="Add your internship and practical experience."
              onEdit={() => {}}
            />

            <div className="repeatable-list">
              {draft.internships.map((internship, index) => (
                <div
                  className="repeatable-card"
                  key={internship._id || index}
                >
                  <div className="repeatable-card-header">
                    <strong>Internship {index + 1}</strong>

                    <button
                      type="button"
                      className="remove-button"
                      onClick={() => removeInternship(index)}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="profile-edit-grid">
                    <Field label="Company">
                      <input
                        type="text"
                        value={internship.company || ""}
                        onChange={(e) =>
                          updateInternship(
                            index,
                            "company",
                            e.target.value
                          )
                        }
                        placeholder="Company name"
                      />
                    </Field>

                    <Field label="Role">
                      <input
                        type="text"
                        value={internship.role || ""}
                        onChange={(e) =>
                          updateInternship(
                            index,
                            "role",
                            e.target.value
                          )
                        }
                        placeholder="Software Developer Intern"
                      />
                    </Field>

                    <Field label="Duration">
                      <input
                        type="text"
                        value={internship.duration || ""}
                        onChange={(e) =>
                          updateInternship(
                            index,
                            "duration",
                            e.target.value
                          )
                        }
                        placeholder="Jun 2026 - Aug 2026"
                      />
                    </Field>

                    <Field label="Description">
                      <input
                        type="text"
                        value={internship.description || ""}
                        onChange={(e) =>
                          updateInternship(
                            index,
                            "description",
                            e.target.value
                          )
                        }
                        placeholder="Worked on..."
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="add-item-button"
              onClick={addInternship}
            >
              + Add another internship
            </button>

            <EditActions
              saving={saving}
              onCancel={cancelEditing}
              onSave={() => saveSection("internships")}
            />
          </>
        )}
      </section>

      {/* LINKS */}
      <section className="profile-card">
        {!isEditing("links") ? (
          <>
            <SectionHeader
              eyebrow="ONLINE PRESENCE"
              title="Professional Links"
              description="Connect your professional profiles."
              onEdit={() => startEditing("links")}
            />

            <div className="profile-links-grid">
              <ProfileLink
                icon="GH"
                label="GitHub"
                value={profile.links.github}
              />

              <ProfileLink
                icon="in"
                label="LinkedIn"
                value={profile.links.linkedin}
              />

              <ProfileLink
                icon="↗"
                label="Portfolio"
                value={profile.links.portfolio}
              />
            </div>
          </>
        ) : (
          <>
            <SectionHeader
              eyebrow="EDIT LINKS"
              title="Professional Links"
              description="Add links to your professional online presence."
              onEdit={() => {}}
            />

            <div className="profile-edit-grid">
              <Field label="GitHub">
                <input
                  type="url"
                  value={draft.links.github}
                  onChange={(e) =>
                    updateLinks("github", e.target.value)
                  }
                  placeholder="https://github.com/..."
                />
              </Field>

              <Field label="LinkedIn">
                <input
                  type="url"
                  value={draft.links.linkedin}
                  onChange={(e) =>
                    updateLinks("linkedin", e.target.value)
                  }
                  placeholder="https://linkedin.com/in/..."
                />
              </Field>

              <Field label="Portfolio" full>
                <input
                  type="url"
                  value={draft.links.portfolio}
                  onChange={(e) =>
                    updateLinks("portfolio", e.target.value)
                  }
                  placeholder="https://yourportfolio.com"
                />
              </Field>
            </div>

            <EditActions
              saving={saving}
              onCancel={cancelEditing}
              onSave={() => saveSection("links")}
            />
          </>
        )}
      </section>
    </div>
  );
}

function EditActions({ saving, onCancel, onSave }) {
  return (
    <div className="profile-edit-actions">
      <button
        type="button"
        className="profile-cancel-button"
        onClick={onCancel}
        disabled={saving}
      >
        Cancel
      </button>

      <button
        type="button"
        className="profile-save-button"
        onClick={onSave}
        disabled={saving}
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}

function EmptyState({ icon, title, text, buttonText, onClick }) {
  return (
    <div className="profile-empty-state">
      <div className="profile-empty-icon">{icon}</div>

      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>

      <button type="button" onClick={onClick}>
        {buttonText}
      </button>
    </div>
  );
}

function ProfileLink({ icon, label, value }) {
  if (!value) {
    return (
      <div className="profile-link-card profile-link-empty">
        <div className="profile-link-icon">{icon}</div>

        <div>
          <span>{label}</span>
          <strong>Not added yet</strong>
        </div>
      </div>
    );
  }

  return (
    <a
      className="profile-link-card"
      href={value}
      target="_blank"
      rel="noreferrer"
    >
      <div className="profile-link-icon">{icon}</div>

      <div>
        <span>{label}</span>
        <strong>{value.replace(/^https?:\/\//, "")}</strong>
      </div>

      <span className="profile-link-arrow">↗</span>
    </a>
  );
}

export default UserProfile;