const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/$/, "");

const TOKEN_KEYS = ["token", "accessToken", "authToken"];

function getToken() {
  for (const key of TOKEN_KEYS) {
    const token = localStorage.getItem(key);

    if (token) return token;
  }

  return null;
}

async function request(path, options = {}) {
  const token = getToken();

  if (!token) {
    throw new Error(
      "Authentication is not connected yet. Sign in first, then connect your login token to the resume API."
    );
  }

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}/api/resume${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong.");
  }

  return data;
}

export const resumeApi = {
  getResume() {
    return request("");
  },

  uploadResume(file) {
    const formData = new FormData();
    formData.append("resume", file);

    return request("/upload", {
      method: "POST",
      body: formData,
    });
  },

  analyzeResume() {
    return request("/analyze", {
      method: "POST",
    });
  },

  deleteResume() {
    return request("/delete", {
      method: "DELETE",
    });
  },
};