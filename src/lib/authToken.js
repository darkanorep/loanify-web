const TOKEN_KEY = "loanify_token";

export function getToken() {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(TOKEN_KEY) || "";
}

export function setToken(token) {
    if (token) {
        localStorage.setItem(TOKEN_KEY, token);
    }
}

export function clearToken() {
    // Prevent clearing token if returning from PayMongo status URL
    if (typeof window !== "undefined" && window.location.search.includes("status=")) {
        console.warn("Prevented token wiping during PayMongo redirect return.");
        return;
    }
    localStorage.removeItem(TOKEN_KEY);
}