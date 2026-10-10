const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/$/, "");

async function request(path, options = {}) {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    throw new Error("Please log in again to continue.");
  }

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(
    `${API_BASE_URL}/api/job-description${path}`,
    {
      ...options,
      headers,
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

export const jobDescriptionApi = {
  getAll() {
    return request("/");
  },

  getById(id) {
    return request(`/${id}`);
  },

  create({ title, company, description }) {
    return request("/", {
      method: "POST",
      body: JSON.stringify({
        title,
        company,
        description,
      }),
    });
  },

  analyze(id) {
    return request(`/${id}/analyze`, {
      method: "POST",
    });
  },

  analyzeSkillGap(id) {
    return request(`/${id}/skill-gap`, {
      method: "POST",
    });
  },

  delete(id) {
    return request(`/${id}`, {
      method: "DELETE",
    });
  },
};