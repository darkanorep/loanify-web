const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

/**
 * Thrown for any non-2xx API response.
 * - fieldErrors: per-field validation messages, if your backend returns them
 *   (shape assumed as { field_name: "message" } or { field_name: ["message"] } —
 *   adjust the mapping in SignupPage once you confirm your actual error shape).
 */
export class ApiError extends Error {
    constructor(message, { status, fieldErrors } = {}) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.fieldErrors = fieldErrors;
    }
}

async function request(path, options = {}) {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        // Sends/receives the httpOnly auth cookie. Requires your Express/NestJS
        // CORS config to set an explicit origin (not "*") + credentials: true.
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
        },
        ...options,
    });

    let data = null;
    const text = await res.text();
    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            // Non-JSON body (e.g. plain-text 500 page) — leave data as null,
            // we'll fall back to a generic message below.
        }
    }

    if (!res.ok) {
        throw new ApiError(
            data?.message || `Request failed with status ${res.status}.`,
            { status: res.status, fieldErrors: data?.errors }
        );
    }

    return data;
}

export function registerUser(payload) {
    return request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

// TODO: add once you share the login endpoint contract, e.g.:
// export function loginUser(payload) {
//   return request("/api/auth/login", { method: "POST", body: JSON.stringify(payload) });
// }