
const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/$/, "");

async function request(endpoint, body) {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/${endpoint}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

export const authApi = {
  register({ name, email, password }) {
    return request("register", {
      name,
      email,
      password,
    });
  },

  async login({ email, password }) {
    const data = await request("login", { email, password });

    if (!data.token) {
      throw new Error("No authentication token was returned.");
    }

    localStorage.setItem("accessToken", data.token);
    localStorage.setItem("authUser", JSON.stringify(data.user));

    return data;
  },

  logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("authUser");
  },
};