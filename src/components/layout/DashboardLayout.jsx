import { Outlet } from "react-router-dom";
import Sidebar from "../ui/Sidebar.jsx";
import NotificationBell from "./NotificationBell.jsx";
import FloatingChatWidget from "./FloatingChatWidget.jsx";

export default function DashboardLayout() {
    return (
        <div className="flex h-dvh w-full bg-background relative">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
                <header className="flex h-16 items-center justify-end border-b border-border px-8 bg-card">
                    <NotificationBell />
                </header>
                <main className="flex-1 overflow-y-auto p-8">
                    <Outlet />
                </main>
            </div>
            {/* Global Floating Chat Widget */}
            <FloatingChatWidget />
        </div>
    );
}