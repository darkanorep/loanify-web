import React from "react";
import {
    LayoutDashboard,
    Users,
    Wallet,
    History,
    Settings,
    LogOut,
    ShieldCheck,
    Activity
} from "lucide-react";

export default function AdminSidebar({ currentTab, setCurrentTab, activeAdminName = "Jerome Perona" }) {
    const navItems = [
        { id: "overview", label: "Overview", icon: LayoutDashboard },
        { id: "borrowers", label: "Borrower Ledger", icon: Users },
        { id: "wallet", label: "P2P Escrow & Vault", icon: Wallet },
        { id: "audit", label: "Live Network Stream", icon: Activity },
    ];

    const systemItems = [
        { id: "settings", label: "Platform Settings", icon: Settings },
    ];

    return (
        <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none">
            {/* Top Brand Header */}
            <div>
                <div className="p-6 flex items-center justify-between border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-indigo-500/20">
                            L
                        </div>
                        <div>
                            <h1 className="font-extrabold text-white text-base tracking-tight leading-none">Loanify</h1>
                            <span className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase">Admin Vault</span>
                        </div>
                    </div>
                </div>

                {/* Primary Navigation */}
                <nav className="p-4 space-y-1.5">
                    <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Core Modules
                    </div>
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setCurrentTab(item.id)}
                                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                    isActive
                                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                                        : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                                }`}
                            >
                                <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                                {item.label}
                            </button>
                        );
                    })}

                    <div className="pt-6 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        System & Controls
                    </div>
                    {systemItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setCurrentTab(item.id)}
                                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                    isActive
                                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                                        : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                                }`}
                            >
                                <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Bottom Admin Profile Footer */}
            <div className="p-4 border-t border-slate-800">
                <div className="bg-slate-800/60 rounded-xl p-3 flex items-center justify-between border border-slate-700/50">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="h-8 w-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-500/30">
                            <ShieldCheck className="h-4 w-4" />
                        </div>
                        <div className="truncate">
                            <div className="text-xs font-bold text-white truncate">{activeAdminName}</div>
                            <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Super Admin
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            localStorage.removeItem("token");
                            window.location.href = "/login";
                        }}
                        className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg transition-colors"
                        title="Sign Out"
                    >
                        <LogOut className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </aside>
    );
}