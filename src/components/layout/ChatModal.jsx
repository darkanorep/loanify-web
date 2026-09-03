import { useState, useEffect, useRef } from "react";
import { X, Send, AlertCircle, MessageSquare, ChevronLeft, SlidersHorizontal, ArrowRight, Share2 } from "lucide-react";
import { getToken } from "@/lib/authToken.js";

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(amount);
}

export default function ChatModal({ recipientId: initialRecipientId, recipientName: initialRecipientName, loanId, loanDetails, onClose }) {
    const [recipientId, setRecipientId] = useState(initialRecipientId);
    const [recipientName, setRecipientName] = useState(initialRecipientName);
    const [activeLoanContext, setActiveLoanContext] = useState(loanDetails);

    const [conversations, setConversations] = useState([]);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [error, setError] = useState("");
    const [loadingConversations, setLoadingConversations] = useState(false);

    const [showCounterPanel, setShowCounterPanel] = useState(false);
    const [counterAmount, setCounterAmount] = useState(loanDetails?.amount || "");
    const [counterInterest, setCounterInterest] = useState(loanDetails?.interest || "");
    const [counterTerm, setCounterTerm] = useState(loanDetails?.term || "");

    const messagesEndRef = useRef(null);
    const token = getToken();
    const currentUserId = token ? Number(JSON.parse(atob(token.split('.')[1])).id) : null;

    async function loadConversations() {
        if (recipientId) return;
        setLoadingConversations(true);
        try {
            const res = await fetch("/api/chat/conversations", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to load conversations");
            setConversations(data);
        } catch (err) {
            setError("Failed to load chat conversations.");
            console.error(err);
        } finally {
            setLoadingConversations(false);
        }
    }

    async function loadChatHistory(targetId) {
        if (!targetId || isNaN(targetId)) return;
        setError("");
        try {
            const res = await fetch(`/api/chat/${targetId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to load chat history");
            setMessages(data);
        } catch (err) {
            setError("Failed to load chat history.");
            console.error(err);
        }
    }

    useEffect(() => {
        if (recipientId) {
            loadChatHistory(recipientId);
        } else {
            loadConversations();
        }

        if (!token) return;
        const ws = new WebSocket(`ws://localhost:3000?token=${token}`);

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "new_message") {
                    if (recipientId && (data.sender_id === Number(recipientId) || data.receiver_id === Number(recipientId))) {
                        setMessages((prev) => {
                            if (prev.some(m => m.id === data.id)) return prev;
                            return [...prev, data];
                        });
                    } else if (!recipientId) {
                        loadConversations();
                    }
                }
            } catch (err) {
                console.error("WebSocket message parse error", err);
            }
        };

        return () => ws.close();
    }, [recipientId, token]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    async function handleSend(textToSend) {
        const content = textToSend || newMessage;
        if (!content.trim() || !recipientId) return;
        setError("");

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    receiver_id: Number(recipientId),
                    content: content,
                    loan_id: loanId ? Number(loanId) : null
                }),
            });

            const sentMsg = await res.json();
            if (!res.ok) throw new Error(sentMsg.error || "Failed to send message");

            setMessages((prev) => {
                if (prev.some(m => m.id === sentMsg.id)) return prev;
                return [...prev, sentMsg];
            });
            setNewMessage("");
            setShowCounterPanel(false);
        } catch (err) {
            setError(err.message);
        }
    }

    function sendLoanCardToChat() {
        if (!activeLoanContext) return;
        const cardText = `📋 **[LOAN INQUIRY CARD]**\n• Amount: ${formatCurrency(activeLoanContext.amount)}\n• Interest Rate: ${activeLoanContext.interest}% APR\n• Term: ${activeLoanContext.term} Months`;
        handleSend(cardText);
    }

    function sendCounterOffer(e) {
        e.preventDefault();
        const counterText = `🔄 **[COUNTER-OFFER PROPOSAL]**\n• Amount: ${formatCurrency(counterAmount)}\n• Interest Rate: ${counterInterest}% APR\n• Term: ${counterTerm} Months`;
        handleSend(counterText);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="flex flex-col h-[600px] w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-5 py-3.5 bg-secondary/30">
                    <div className="flex items-center gap-2 w-full">
                        {recipientId && initialRecipientId !== recipientId && (
                            <button onClick={() => { setRecipientId(null); setRecipientName(""); loadConversations(); }} className="text-muted-foreground hover:text-foreground mr-1">
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                        )}
                        <div>
                            <h3 className="text-sm font-bold text-foreground">
                                {recipientId ? `Chat with ${recipientName}` : "Secure Messages"}
                            </h3>
                            <span className="text-[10px] text-muted-foreground">P2P Secure Messaging & Negotiation</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Shopee-style Pinned Loan Inquiry Card */}
                {recipientId && activeLoanContext && (
                    <div className="mx-4 mt-3 p-3 rounded-xl border border-border bg-background shadow-sm flex items-center justify-between relative">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary text-xs shrink-0">
                                P2P
                            </div>
                            <div>
                                <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">You're inquiring about this loan</span>
                                <p className="text-sm font-bold text-foreground">{formatCurrency(activeLoanContext.amount)}</p>
                                <p className="text-xs text-muted-foreground">{activeLoanContext.interest}% APR • {activeLoanContext.term} Months</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={sendLoanCardToChat}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                                title="Send loan card details to chat"
                            >
                                <Share2 className="h-3 w-3" /> Send
                            </button>
                            <button
                                onClick={() => setShowCounterPanel(!showCounterPanel)}
                                className="px-2.5 py-1.5 rounded-lg border border-border bg-secondary/50 text-foreground text-xs font-medium hover:bg-secondary transition-colors"
                            >
                                {showCounterPanel ? "Close" : "Negotiate"}
                            </button>
                            <button
                                onClick={() => setActiveLoanContext(null)}
                                className="text-muted-foreground hover:text-foreground p-1"
                                title="Dismiss card"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Counter Offer Slide Panel */}
                {showCounterPanel && (
                    <form onSubmit={sendCounterOffer} className="mx-4 mt-2 p-3 bg-secondary/40 rounded-xl border border-border space-y-2.5 animate-in slide-in-from-top-2">
                        <p className="text-[11px] font-semibold text-foreground">Propose New Loan Terms:</p>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="text-[9px] uppercase text-muted-foreground font-semibold">Amount (₱)</label>
                                <input type="number" value={counterAmount} onChange={(e) => setCounterAmount(e.target.value)} className="h-8 w-full rounded border border-input bg-card px-2 text-xs text-foreground outline-none" required />
                            </div>
                            <div>
                                <label className="text-[9px] uppercase text-muted-foreground font-semibold">Interest (%)</label>
                                <input type="number" step="0.1" value={counterInterest} onChange={(e) => setCounterInterest(e.target.value)} className="h-8 w-full rounded border border-input bg-card px-2 text-xs text-foreground outline-none" required />
                            </div>
                            <div>
                                <label className="text-[9px] uppercase text-muted-foreground font-semibold">Term (Mo)</label>
                                <input type="number" value={counterTerm} onChange={(e) => setCounterTerm(e.target.value)} className="h-8 w-full rounded border border-input bg-card px-2 text-xs text-foreground outline-none" required />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button type="submit" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
                                Send Counter-Offer <ArrowRight className="h-3 w-3" />
                            </button>
                        </div>
                    </form>
                )}

                {/* Body: Conversation List OR Active Chat Messages */}
                {!recipientId ? (
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-background/50 mt-2">
                        {loadingConversations ? (
                            <p className="text-xs text-muted-foreground text-center py-8">Loading conversations...</p>
                        ) : conversations.length === 0 ? (
                            <div className="flex flex-col h-full items-center justify-center text-center p-6">
                                <MessageSquare className="h-8 w-8 text-muted-foreground/50 mb-2" />
                                <p className="text-xs text-muted-foreground">No active conversations found. Start a chat from an offer or application!</p>
                            </div>
                        ) : (
                            conversations.map((conv) => (
                                <div
                                    key={conv.user.id}
                                    onClick={() => {
                                        setRecipientId(conv.user.id);
                                        setRecipientName(`${conv.user.first_name} ${conv.user.last_name}`);
                                    }}
                                    className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-secondary/40 cursor-pointer transition-colors"
                                >
                                    <div>
                                        <p className="text-xs font-semibold text-foreground">{conv.user.first_name} {conv.user.last_name}</p>
                                        <p className="text-[11px] text-muted-foreground truncate max-w-[280px] mt-0.5">{conv.lastMessage.content}</p>
                                    </div>
                                    {conv.unread && <span className="h-2 w-2 rounded-full bg-primary" />}
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background/50 mt-2">
                        {messages.length === 0 ? (
                            <div className="flex h-full items-center justify-center">
                                <p className="text-xs text-muted-foreground">No messages yet. Send the loan card or say hello to start negotiating!</p>
                            </div>
                        ) : (
                            messages.map((msg, idx) => {
                                const isMe = msg.sender_id === currentUserId;
                                const isCardOrCounter = msg.content.includes("[LOAN INQUIRY CARD]") || msg.content.includes("[COUNTER-OFFER PROPOSAL]");
                                return (
                                    <div key={msg.id || idx} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                        <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs ${isCardOrCounter ? "bg-amber-500/10 border border-amber-500/30 text-foreground shadow-sm" : isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary text-foreground rounded-bl-sm"}`}>
                                            <p className="break-words whitespace-pre-wrap">{msg.content}</p>
                                            <span className={`text-[9px] block mt-1 ${isMe && !isCardOrCounter ? "text-right text-primary-foreground/70" : "text-left text-muted-foreground"}`}>
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}

                {error && (
                    <div className="bg-destructive/10 px-4 py-2 text-xs text-destructive flex items-center gap-2">
                        <AlertCircle className="h-3 w-3" /> {error}
                    </div>
                )}

                {/* Input Area */}
                {recipientId && (
                    <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2 border-t border-border p-3 bg-card">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message or negotiation note..."
                            className="flex-1 rounded-xl border border-input bg-secondary/50 px-4 py-2.5 text-xs text-foreground outline-none focus:border-primary transition-colors"
                        />
                        <button type="submit" disabled={!newMessage.trim()} className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                            <Send className="h-4 w-4" />
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}