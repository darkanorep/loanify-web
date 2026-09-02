import { NavLink } from "react-router-dom";
import {
    LayoutDashboard,
    HandCoins,
    CreditCard,
    User,
    Headphones,
    LogOut,
    Store,
} from "lucide-react";
import { apiFetch } from "@/lib/apiClient.js";

const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/dashboard/loans", label: "My Loans", icon: HandCoins },
    { to: "/dashboard/p2p-marketplace", label: "P2P Marketplace", icon: Store },
    { to: "/dashboard/payments", label: "Payments", icon: CreditCard },
    { to: "/dashboard/profile", label: "Profile", icon: User },
    { to: "/dashboard/support", label: "Support", icon: Headphones },
];

export default function Sidebar() {
    async function handleLogout() {
        try {
            await apiFetch("/api/auth/logout", { method: "POST" });
        } catch (err) {
        } finally {
            localStorage.removeItem("token");
            window.location.href = "/login";
        }
    }

    return (
        <aside className="flex h-dvh w-64 shrink-0 flex-col bg-primary px-4 py-6">
            <div className="px-2 pb-8">
                <p className="text-2xl font-bold tracking-tight text-primary-foreground">
                    loan<span className="text-accent">ify</span>
                </p>
            </div>

            <nav className="flex flex-1 flex-col gap-1">
                {navItems.map(({ to, label, icon: Icon, end }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={end}
                        className={({ isActive }) =>
                            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                                isActive
                                    ? "bg-primary-foreground/10 text-primary-foreground"
                                    : "text-primary-foreground/70 hover:bg-primary-foreground/5 hover:text-primary-foreground"
                            }`
                        }
                    >
                        <Icon className="h-4.5 w-4.5" />
                        {label}
                    </NavLink>
                ))}
            </nav>

            <div className="flex flex-col gap-1 border-t border-primary-foreground/10 pt-4">
                <NavLink
                    to="/dashboard/support"
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-primary-foreground/70 transition-colors hover:bg-primary-foreground/5 hover:text-primary-foreground"
                >
                    <Headphones className="h-4.5 w-4.5" />
                    Support
                </NavLink>
                <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-primary-foreground/70 transition-colors hover:bg-primary-foreground/5 hover:text-primary-foreground"
                >
                    <LogOut className="h-4.5 w-4.5" />
                    Log Out
                </button>
            </div>
        </aside>
    );
}