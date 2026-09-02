import { useState, useEffect } from "react";
import { MessageSquare, X } from "lucide-react";
import { apiFetch } from "@/lib/apiClient.js";
import { getToken } from "@/lib/authToken.js";
import ChatModal from "./ChatModal.jsx";

export default function FloatingChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [conversations, setConversations] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [hasUnread, setHasUnread] = useState(false);

    async function loadConversations() {
        try {
            const data = await apiFetch("/api/chat/conversations/list");
            setConversations(data);
            // Check if any conversation is unread to show the main floating badge
            const anyUnread = data.some((conv) => conv.unread);
            setHasUnread(anyUnread);
        } catch (err) {
            console.error("Failed to load conversations", err);
        }
    }

    // Load initial conversation states on mount to check unread history
    useEffect(() => {
        loadConversations();
    }, []);

    // Real-time WebSocket listener for incoming messages globally
    useEffect(() => {
        const token = getToken();
        if (!token) return;

        const ws = new WebSocket(`ws://localhost:3000?token=${token}`);

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "new_message") {
                    setHasUnread(true);
                    loadConversations(); // Refresh list to reflect the new unread state
                }
            } catch (err) {
                console.error("WebSocket message parse error", err);
            }
        };

        return () => ws.close();
    }, []);

    const handleToggle = () => {
        const nextState = !isOpen;
        setIsOpen(nextState);
        if (nextState) {
            loadConversations();
            setHasUnread(false); // Clear indicator badge when opened
        }
    };

    return (
        <>
            {/* Floating Action Button */}
            <div className="fixed bottom-6 right-6 z-50">
                <button
                    onClick={handleToggle}
                    className="relative flex items-center justify-center rounded-full bg-primary p-4 text-primary-foreground shadow-2xl hover:bg-primary/90 transition-transform hover:scale-105"
                    title="Open Messages"
                >
                    <MessageSquare className="h-6 w-6" />
                    {hasUnread && (
                        <span className="absolute top-0 right-0 h-3.5 w-3.5 rounded-full bg-accent ring-2 ring-background animate-pulse" />
                    )}
                </button>

                {/* Conversations Drawer popup */}
                {isOpen && (
                    <div className="absolute bottom-16 right-0 w-80 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95">
                        <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-secondary/30">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Messages</h3>
                            <button onClick={() => setIsOpen(false)} className="rounded-full p-1 text-muted-foreground hover:bg-secondary">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                            {conversations.length === 0 ? (
                                <p className="text-center text-xs text-muted-foreground py-6">No active conversations.</p>
                            ) : (
                                conversations.map(({ user, lastMessage, unread }) => (
                                    <button
                                        key={user.id}
                                        onClick={() => {
                                            setActiveChat({ id: user.id, name: `${user.first_name} ${user.last_name}` });
                                            setIsOpen(false);
                                        }}
                                        className={`w-full text-left rounded-xl p-3 hover:bg-secondary/60 transition-colors flex flex-col gap-1 ${
                                            unread ? "bg-secondary/40 font-semibold" : ""
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className={`text-xs ${unread ? "font-bold text-foreground" : "font-semibold text-foreground/80"}`}>
                                                {user.first_name} {user.last_name}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {new Date(lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className={`text-xs truncate ${unread ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                                            {lastMessage.content}
                                        </p>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Active Chat Modal popup */}
            {activeChat && (
                <ChatModal
                    recipientId={activeChat.id}
                    recipientName={activeChat.name}
                    onClose={() => setActiveChat(null)}
                />
            )}
        </>
    );
}