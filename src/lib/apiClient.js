import { getToken } from "./authToken.js";

export async function apiFetch(url, options = {}) {
    const token = getToken();

    const headers = {
        ...(options.headers || {}),
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));

    // Automatically catch expired sessions or unauthorized access
    if (res.status === 401 || data.error === "Session expired or logged out.") {
        localStorage.removeItem("token");
        window.location.href = "/login";
        throw new Error("Session expired. Redirecting...");
    }

    if (!res.ok) {
        throw new Error(data.error || "Something went wrong.");
    }

    return data;
}