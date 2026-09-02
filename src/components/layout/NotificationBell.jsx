import { useState, useEffect, useRef } from "react";
import { Bell, Check, BellRing, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getToken } from "@/lib/authToken.js";

export default function NotificationBell() {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [liveToast, setLiveToast] = useState(null);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    async function fetchNotifications() {
        try {
            const res = await fetch("/api/notifications", {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            const data = await res.json();
            if (res.ok) setNotifications(data);
        } catch (err) {
            console.error("Failed to load notifications", err);
        }
    }

    useEffect(() => {
        fetchNotifications();

        const token = getToken();
        if (!token) return;
        const ws = new WebSocket(`ws://localhost:3000?token=${token}`);

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (["new_application", "loan_approved", "loan_rejected"].includes(data.type)) {
                    // 1. Instantly prepend to dropdown list
                    setNotifications((prev) => [data, ...prev]);

                    // 2. Trigger live floating toast banner
                    setLiveToast(data);
                    setTimeout(() => setLiveToast(null), 5000);
                }
            } catch (err) {
                console.error("Failed to parse WebSocket message", err);
            }
        };

        function handleClickOutside(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            ws.close();
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    async function markAsRead(id, e) {
        if (e) e.stopPropagation();
        try {
            const res = await fetch(`/api/notifications/${id}/read`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            if (res.ok) {
                setNotifications((prev) =>
                    prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
                );
            }
        } catch (err) {
            console.error("Failed to mark notification as read", err);
        }
    }

    async function handleNotificationClick(notif) {
        if (!notif.is_read) {
            await markAsRead(notif.id);
        }
        setIsOpen(false);

        if (notif.type === "new_application") {
            navigate("/dashboard/p2p-marketplace?tab=applications");
        } else if (notif.type === "loan_approved" || notif.type === "loan_rejected") {
            navigate("/dashboard/loans");
        } else {
            navigate("/dashboard");
        }
    }

    return (
        <>
            {/* Live Floating Toast Alert */}
            {liveToast && (
                <div className="fixed top-4 right-4 z-50 flex items-start gap-3 rounded-xl bg-primary px-4 py-3 text-primary-foreground shadow-2xl animate-in slide-in-from-top-5">
                    <BellRing className="mt-0.5 h-5 w-5 animate-bounce" />
                    <div>
                        <p className="font-bold">{liveToast.title}</p>
                        <p className="text-sm">{liveToast.message}</p>
                    </div>
                    <button onClick={() => setLiveToast(null)} className="ml-4 opacity-70 hover:opacity-100">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="relative rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
                    )}
                </button>

                {isOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-card shadow-xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95">
                        <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-secondary/30">
                            <h3 className="text-sm font-bold text-foreground">Notifications</h3>
                            <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
                        </div>

                        <div className="max-h-80 overflow-y-auto divide-y divide-border">
                            {notifications.length === 0 ? (
                                <p className="p-4 text-center text-xs text-muted-foreground">No notifications yet.</p>
                            ) : (
                                notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        onClick={() => handleNotificationClick(notif)}
                                        className={`cursor-pointer p-4 transition-colors flex items-start justify-between gap-3 hover:bg-secondary/60 ${
                                            notif.is_read ? "bg-card opacity-70" : "bg-primary/5 font-medium"
                                        }`}
                                    >
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-foreground">{notif.title}</p>
                                            <p className="text-xs text-muted-foreground">{notif.message}</p>
                                            <span className="text-[10px] text-muted-foreground/60 block">
                        {new Date(notif.created_at || Date.now()).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                      </span>
                                        </div>
                                        {!notif.is_read && (
                                            <button
                                                onClick={(e) => markAsRead(notif.id, e)}
                                                className="text-primary hover:text-primary/80 p-1"
                                                title="Mark as read"
                                            >
                                                <Check className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}