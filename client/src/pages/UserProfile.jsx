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

function UserProfile() {
  const [profile, setProfile] = useState(emptyProfile);
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
        setProfile({
          ...emptyProfile,
          ...response.user,
          education: {
            ...emptyProfile.education,
            ...(response.user.education || {}),
          },
          links: {
            ...emptyProfile.links,
            ...(response.user.links || {}),
          },
        });
      }
    } catch (err) {
      setError(err.message || "Unable to load profile.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleEducationChange(event) {
    const { name, value } = event.target;

    setProfile((prev) => ({
      ...prev,
      education: {
        ...prev.education,
        [name]: value,
      },
    }));
  }

  function handleLinksChange(event) {
    const { name, value } = event.target;

    setProfile((prev) => ({
      ...prev,
      links: {
        ...prev.links,
        [name]: value,
      },
    }));
  }

  function handleArrayChange(field, value) {
    setProfile((prev) => ({
      ...prev,
      [field]: value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setMessage("");
      setError("");

      const response = await userProfileApi.updateProfile(profile);

      if (response?.user) {
        setProfile((prev) => ({
          ...prev,
          ...response.user,
          education: {
            ...prev.education,
            ...(response.user.education || {}),
          },
          links: {
            ...prev.links,
            ...(response.user.links || {}),
          },
        }));
      }

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
        <div className="profile-loading">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div>
          <span className="profile-eyebrow">ACCOUNT</span>
          <h1>My Profile</h1>
          <p>
            Keep your career information updated for better AI-powered
            recommendations.
          </p>
        </div>
      </div>

      {message && <div className="profile-success">{message}</div>}
      {error && <div className="profile-error">{error}</div>}

      <form className="profile-form" onSubmit={handleSubmit}>
        <section className="profile-card">
          <div className="section-heading">
            <h2>Basic Information</h2>
            <p>Your basic account and professional information.</p>
          </div>

          <div className="profile-grid">
            <div className="profile-field">
              <label>Name</label>
              <input
                type="text"
                name="name"
                value={profile.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="profile-field">
              <label>Email</label>
              <input
                type="email"
                value={profile.email}
                disabled
              />
              <small>Email cannot be changed here.</small>
            </div>

            <div className="profile-field">
              <label>Phone</label>
              <input
                type="text"
                name="phone"
                value={profile.phone}
                onChange={handleChange}
                placeholder="+91..."
              />
            </div>

            <div className="profile-field">
              <label>Location</label>
              <input
                type="text"
                name="location"
                value={profile.location}
                onChange={handleChange}
                placeholder="Gorakhpur, Uttar Pradesh"
              />
            </div>

            <div className="profile-field profile-field-full">
              <label>Professional Headline</label>
              <input
                type="text"
                name="headline"
                value={profile.headline}
                onChange={handleChange}
                placeholder="Full Stack Developer | AI Enthusiast"
              />
            </div>

            <div className="profile-field profile-field-full">
              <label>Bio</label>
              <textarea
                name="bio"
                value={profile.bio}
                onChange={handleChange}
                rows="4"
                placeholder="Tell us briefly about yourself..."
              />
            </div>
          </div>
        </section>

        <section className="profile-card">
          <div className="section-heading">
            <h2>Education</h2>
            <p>Add your latest academic qualification.</p>
          </div>

          <div className="profile-grid">
            <div className="profile-field">
              <label>Degree</label>
              <input
                type="text"
                name="degree"
                value={profile.education.degree}
                onChange={handleEducationChange}
                placeholder="B.Tech CSE"
              />
            </div>

            <div className="profile-field">
              <label>College / University</label>
              <input
                type="text"
                name="college"
                value={profile.education.college}
                onChange={handleEducationChange}
                placeholder="College name"
              />
            </div>

            <div className="profile-field">
              <label>Graduation Year</label>
              <input
                type="text"
                name="graduationYear"
                value={profile.education.graduationYear}
                onChange={handleEducationChange}
                placeholder="2027"
              />
            </div>
          </div>
        </section>

        <section className="profile-card">
          <div className="section-heading">
            <h2>Skills & Career Preferences</h2>
            <p>These details can help personalize your career roadmap.</p>
          </div>

          <div className="profile-grid">
            <div className="profile-field profile-field-full">
              <label>Skills</label>
              <input
                type="text"
                value={profile.skills.join(", ")}
                onChange={(event) =>
                  handleArrayChange("skills", event.target.value)
                }
                placeholder="JavaScript, React, Node.js, Python"
              />
              <small>Separate skills with commas.</small>
            </div>

            <div className="profile-field profile-field-full">
              <label>Preferred Roles</label>
              <input
                type="text"
                value={profile.preferredRoles.join(", ")}
                onChange={(event) =>
                  handleArrayChange(
                    "preferredRoles",
                    event.target.value
                  )
                }
                placeholder="Software Developer, AI Engineer"
              />
              <small>Separate roles with commas.</small>
            </div>

            <div className="profile-field profile-field-full">
              <label>Certifications</label>
              <input
                type="text"
                value={profile.certifications.join(", ")}
                onChange={(event) =>
                  handleArrayChange(
                    "certifications",
                    event.target.value
                  )
                }
                placeholder="Generative AI, MERN Stack"
              />
              <small>Separate certifications with commas.</small>
            </div>
          </div>
        </section>

        <section className="profile-card">
          <div className="section-heading">
            <h2>Links</h2>
            <p>Add your professional online profiles.</p>
          </div>

          <div className="profile-grid">
            <div className="profile-field">
              <label>GitHub</label>
              <input
                type="url"
                name="github"
                value={profile.links.github}
                onChange={handleLinksChange}
                placeholder="https://github.com/..."
              />
            </div>

            <div className="profile-field">
              <label>LinkedIn</label>
              <input
                type="url"
                name="linkedin"
                value={profile.links.linkedin}
                onChange={handleLinksChange}
                placeholder="https://linkedin.com/in/..."
              />
            </div>

            <div className="profile-field profile-field-full">
              <label>Portfolio</label>
              <input
                type="url"
                name="portfolio"
                value={profile.links.portfolio}
                onChange={handleLinksChange}
                placeholder="https://..."
              />
            </div>
          </div>
        </section>

        <div className="profile-actions">
          <button
            type="submit"
            className="profile-save-button"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default UserProfile;