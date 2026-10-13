
const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/$/, "");

async function request(path, options = {}) {
  const token = localStorage.getItem("accessToken");

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  let data = {};

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = text ? { message: text } : {};
  }

  if (!response.ok || data.error) {
    throw new Error(data.error || data.message || "Request failed");
  }

  return data;
}

export const interviewApi = {
  // Generate a new interview
  generate(payload) {
    return request("/api/interview/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // Schedule an interview
  schedule(payload) {
    return request("/api/interview-session/schedule", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // Start an interview
  start(interviewId) {
    return request(
      `/api/interview-session/${encodeURIComponent(interviewId)}/start`,
      {
        method: "POST",
        body: JSON.stringify({}),
      }
    );
  },

  // Get the current unanswered question
  getCurrentQuestion(interviewId) {
    return request(
      `/api/interview-session/${encodeURIComponent(interviewId)}/current-question`
    );
  },

  // Submit an answer; evaluation is saved but not returned
  submitAnswer(interviewId, payload) {
    return request(
      `/api/interview-session/${encodeURIComponent(interviewId)}/answer`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  // Get the completed interview report
  getReport(interviewId) {
    return request(
      `/api/interview-session/${encodeURIComponent(interviewId)}/report`
    );
  },

  // Get interview history across all statuses
  getHistory() {
    return request("/api/interview-session/history");
  },
};
