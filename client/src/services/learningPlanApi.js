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
`${API_BASE_URL}/api/learning-plan${path}`,
{ ...options, headers }
);

const data = await response.json().catch(() => ({}));

if (!response.ok) {
throw new Error(data.message || "Request failed.");
}

return data;
}

export const learningPlanApi = {
getAll() {
return request("/");
},

getById(id) {
return request(`/${id}`);
},

create(payload) {
return request("/", {
method: "POST",
body: JSON.stringify(payload),
});
},

getDashboard(id) {
return request(`/${id}/dashboard`);
},

getProgress(id) {
return request(`/${id}/progress`);
},

getToday(id, date) {
const query = date ? `?date=${encodeURIComponent(date)}` : "";
return request(`/${id}/today${query}`);
},

getUpcoming(id) {
return request(`/${id}/upcoming`);
},

completeSession(id, sessionId) {
return request(`/${id}/session/${encodeURIComponent(sessionId)}/complete`, {
method: "PATCH",
});
},

rescheduleMissed(id) {
return request(`/${id}/reschedule-missed`, {
method: "PATCH",
});
},

delete(id) {
return request(`/${id}`, {
method: "DELETE",
});
},
};
