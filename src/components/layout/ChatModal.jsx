import { useState, useEffect, useRef } from "react";
import { X, Send } from "lucide-react";
import { apiFetch } from "@/lib/apiClient.js";
import { getToken } from "@/lib/authToken.js";

export default function ChatModal({ recipientId, recipientName, loanId, onClose }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const messagesEndRef = useRef(null);

    async function loadChatHistory() {
        try {
            const data = await apiFetch(`/api/chat/${recipientId}`);
            setMessages(data);
        } catch (err) {
            console.error("Failed to load chat history", err);
        }
    }

    useEffect(() => {
        loadChatHistory();

        const token = getToken();
        if (!token) return;

        const ws = new WebSocket(`ws://localhost:3000?token=${token}`);

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "new_message" && data.sender_id === recipientId) {
                    setMessages((prev) => [...prev, data]);
                }
            } catch (err) {
                console.error("WebSocket message parse error", err);
            }
        };

        return () => ws.close();
    }, [recipientId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    async function handleSend(e) {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            const sentMsg = await apiFetch("/api/chat", {
                method: "POST",
                body: JSON.stringify({
                    receiver_id: recipientId,
                    content: newMessage,
                    loan_id: loanId
                }),
            });

            setMessages((prev) => [...prev, sentMsg]);
            setNewMessage("");
        } catch (err) {
            console.error("Failed to send message", err);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="flex flex-col h-[520px] w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-secondary/30">
                    <div>
                        <h3 className="text-sm font-bold text-foreground">Chat with {recipientName}</h3>
                        <span className="text-[10px] text-muted-foreground">P2P Secure Messaging</span>
                    </div>
                    <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 ? (
                        <div className="flex h-full items-center justify-center">
                            <p className="text-xs text-muted-foreground">No messages yet. Say hello to start the conversation!</p>
                        </div>
                    ) : (
                        messages.map((msg, idx) => {
                            const isOtherUser = msg.sender_id === recipientId;
                            return (
                                <div key={idx} className={`flex ${isOtherUser ? "justify-start" : "justify-end"}`}>
                                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs ${isOtherUser ? "bg-secondary text-foreground" : "bg-primary text-primary-foreground"}`}>
                                        <p className="break-words">{msg.content}</p>
                                        <span className={`text-[9px] block mt-1 text-right ${isOtherUser ? "text-muted-foreground" : "text-primary-foreground/70"}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border p-3 bg-secondary/20">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-xs text-foreground outline-none focus:border-primary transition-colors"
                    />
                    <button type="submit" className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-primary-foreground hover:bg-primary/90 transition-colors">
                        <Send className="h-4 w-4" />
                    </button>
                </form>
            </div>
        </div>
    );
}