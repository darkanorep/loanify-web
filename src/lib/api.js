import { getToken } from "./authToken";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

/**
 * Thrown for any non-2xx API response.
 */
export class ApiError extends Error {
  constructor(message, { status, fieldErrors } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

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

  if (typeof data.errors === "object") {
    return { message: "Please fix the errors below.", fieldErrors: data.errors };
  }

  return { message: `Request failed with status ${status}.`, fieldErrors: undefined };
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
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
      // Non-JSON body — leave data as null
    }
  }

  if (!res.ok) {
    const { message, fieldErrors } = parseErrorBody(data, res.status);
    throw new ApiError(message, { status: res.status, fieldErrors });
  }

  return data;
}

// --- Auth ---

export function registerUser(payload) {
  return request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
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

export async function verifySession() {
  try {
    return await request("/api/auth/me", { method: "GET" });
  } catch (err) {
    // Retry once if returning from PayMongo redirect
    if (typeof window !== "undefined" && window.location.search.includes("status=")) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return await request("/api/auth/me", { method: "GET" });
    }
    throw err;
  }
}

// --- Wallet Endpoints ---

export function getWalletOverview() {
  return request("/api/wallet/overview", {
    method: "GET",
  });
}

export function topupWallet(payload) {
  return request("/api/wallet/topup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function initiatePaymongoTopup(payload) {
  return request("/api/wallet/paymongo-topup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// --- Dashboard ---

export function getDashboardSummary() {
  return request("/api/dashboard/summary", {
    method: "GET",
  });
}

// --- Loans ---

export function getMyLoans({ page = 1, limit = 10, status } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (status) params.set("status", status);
  return request(`/api/loans?${params.toString()}`, {
    method: "GET",
  });
}

export function requestLoan(payload) {
  return request("/api/loans", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function approveLoan(loanId) {
  return request(`/api/loans/${loanId}/approve`, {
    method: "POST",
  });
}

// --- Payments & Payment Methods ---

export function getPaymentsSummary() {
  return request("/api/payments/summary", {
    method: "GET",
  });
}

export function getTransactionHistory({ page = 1, limit = 10 } = {}) {
  const params = new URLSearchParams({ page, limit });
  return request(`/api/payments/transactions?${params.toString()}`, {
    method: "GET",
  });
}

export function makePayment(payload) {
  return request("/api/payments/pay", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function addPaymentMethod(payload) {
  return request("/api/payment-methods", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deletePaymentMethod(id) {
  return request(`/api/payment-methods/${id}`, {
    method: "DELETE",
  });
}

export function setDefaultPaymentMethod(id) {
  return request(`/api/payment-methods/${id}/default`, {
    method: "PATCH",
  });
}

export function toggleAutopay(enabled) {
  return request("/api/payment-methods/autopay", {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
  });
}

export function getProfile() {
  return request("/api/profile", {
    method: "GET",
  });
}

export function updateProfile(payload) {
  return request("/api/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function requestProfileOtp(payload) {
  return request("/api/auth/request-profile-otp", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getP2pMarketplace() {
  return request("/api/p2p/marketplace", { method: "GET" });
}

export function createP2pListing(payload) {
  return request("/api/p2p/list", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function approveP2pLoan(payload) {
  return request("/api/p2p/approve", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function verifyPaymongoTopup(sourceId) {
  return request("/api/wallet/paymongo-verify", {
    method: "POST",
    body: JSON.stringify({ sourceId }),
  });
}