import { getToken } from "@/lib/authToken.js";

let socket = null;

export function getWebSocket() {
    if (!socket || socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
        const token = getToken();
        if (!token) return null;

        const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        socket = new WebSocket(`${wsProtocol}//localhost:3000?token=${token}`);

        socket.onopen = () => {
            console.log("WebSocket connection established successfully.");
        };

        socket.onerror = (error) => {
            console.error("WebSocket encountered an error:", error);
        };
    }

    return socket;
}

export function closeWebSocket() {
    if (socket) {
        socket.close();
        socket = null;
    }
}