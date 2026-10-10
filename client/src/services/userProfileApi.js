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

  const response = await fetch(`${API_BASE_URL}/api/user${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

export const userProfileApi = {
  getProfile() {
    return request("/profile");
  },

  updateProfile(payload) {
    return request("/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
};