import { getToken } from "./authToken";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Thrown for any non-2xx API response.
 * - fieldErrors: { field_name: "message" }, snake_case keys matching your
 *   Joi schema field names — parsed out of whichever shape the backend
 *   actually returned (see parseErrorBody below).
 */
export class ApiError extends Error {
    constructor(message, { status, fieldErrors } = {}) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.fieldErrors = fieldErrors;
    }
}

// Your backend has been observed returning at least three different error
// shapes depending on the failure type:
//   1. { message: "..." }              — e.g. some general errors
//   2. { error: "..." }                — e.g. { error: "Invalid OTP" }
//   3. { errors: ["\"field\" reason"] } — Joi validation (422), array of
//      strings in Joi's default `"key" message` format
// This normalizes all three into a single { message, fieldErrors } shape
// so the rest of the app doesn't need to know which one fired.
function parseErrorBody(data, status) {
    if (!data) {
        return { message: `Request failed with status ${status}.`, fieldErrors: undefined };
    }

    if (typeof data.message === "string") {
        return { message: data.message, fieldErrors: undefined };
    }

    if (typeof data.error === "string") {
        return { message: data.error, fieldErrors: undefined };
    }

    if (Array.isArray(data.errors)) {
        const fieldErrors = {};
        for (const raw of data.errors) {
            // Joi's default format is: "field_name" some message text
            const match = /^"([^"]+)"\s*(.*)$/.exec(raw);
            if (match) {
                const [, field, rest] = match;
                fieldErrors[field] = rest.trim() || raw;
            }
        }
        return {
            message: data.errors[0] || `Request failed with status ${status}.`,
            fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : undefined,
        };
    }

    // Fallback for a field-keyed object shape, in case a different endpoint
    // ever returns { errors: { field_name: "message" } } instead.
    if (typeof data.errors === "object") {
        return { message: "Please fix the errors below.", fieldErrors: data.errors };
    }

    return { message: `Request failed with status ${status}.`, fieldErrors: undefined };
}

async function request(path, options = {}) {
    const token = getToken();
    const res = await fetch(`${API_BASE_URL}${path}`, {
        // Sends/receives the httpOnly session cookie for regular username/password
        // login. Requires your CORS config to set an explicit origin + credentials: true.
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            // Google-login users authenticate via JWT instead of the session
            // cookie — attach it whenever one exists in storage, alongside (not
            // instead of) the cookie above, since either login method might be
            // in play for a given user.
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
        const { message, fieldErrors } = parseErrorBody(data, res.status);
        throw new ApiError(message, { status: res.status, fieldErrors });
    }

    return data;
}

export function registerUser(payload) {
    return request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

// NOTE: paths below assumed from the /api/auth/register pattern you
// confirmed earlier — verify these against your actual auth.routes.js
// and correct if they differ.

// Checks whether the current stored token is still valid (checks both JWT
// signature/expiry AND the Redis allowlist on the backend). Returns the
// user object if valid, throws ApiError if not.
export function verifySession() {
    return request("/api/auth/me", {
        method: "GET",
    });
}

export function getDashboardSummary() {
    return request("/api/dashboard/summary", {
        method: "GET",
    });
}

export function loginUser(payload) {
    return request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function verifyOtp(payload) {
    return request("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function resendOtp(payload) {
    return request("/api/auth/resend-otp", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function forgotPassword(payload) {
    return request("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function resetPassword(payload) {
    return request("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}