import React, { useState, useEffect } from "react";
import { getToken } from "@/lib/authToken.js";
import { getWebSocket } from "@/lib/socket.js";

export default function AdminLiveStreamAndPortfolios() {
    const [events, setEvents] = useState([]);
    const [portfolioItems, setPortfolioItems] = useState([]);

    const fetchLiveData = async () => {
        try {
            const [streamRes, portfolioRes] = await Promise.all([
                fetch("/api/admin/live-stream", { headers: { Authorization: `Bearer ${getToken()}` } }),
                fetch("/api/admin/portfolio-repayments", { headers: { Authorization: `Bearer ${getToken()}` } })
            ]);

            const streamData = await streamRes.json();
            const portfolioData = await portfolioRes.json();

            if (streamRes.ok) setEvents(streamData.events || []);
            if (portfolioRes.ok) setPortfolioItems(portfolioData.portfolioItems || []);
        } catch (err) {
            console.error("Failed to fetch live network stream data", err);
        }
    };

    useEffect(() => {
        fetchLiveData();

        const socket = getWebSocket();
        if (socket) {
            const handleMessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (
                        data.type === "admin_data_updated" ||
                        data.action === "DATABASE_SEEDED" ||
                        data.action === "BATCH_CREDIT_QUEUED" ||
                        data.type === "REFRESH_ALL"
                    ) {
                        fetchLiveData();
                    }
                } catch (err) {
                    console.error("Failed to parse WebSocket stream event", err);
                }
            };

            socket.addEventListener("message", handleMessage);
            return () => socket.removeEventListener("message", handleMessage);
        }
    }, []);

    const formatPHP = (val) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 }).format(val);

    const getStatusBadge = (status) => {
        switch (status) {
            case "Completed":
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">Completed</span>;
            case "Overdue (6d)":
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 animate-pulse">Overdue (6d)</span>;
            default:
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">On Schedule</span>;
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left Box: Live Network Stream - Fixed height to match right box and maximize inner scroll area */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between h-[640px]">
                <div>
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                            </svg>
                            <h2 className="text-base font-bold text-slate-900 tracking-tight">Live Network Stream</h2>
                        </div>
                        <span className="h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
                    </div>

                    <div className="mt-5 space-y-5 h-[480px] overflow-y-auto pr-2 relative">
                        {events.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-6">No live events recorded yet.</p>
                        ) : (
                            events.map((ev, index) => {
                                let typeStyle = "text-emerald-600 bg-emerald-50";
                                let svgIcon = (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                );

                                if (ev.title?.includes("KYC")) {
                                    svgIcon = (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                    );
                                } else if (ev.title?.includes("Risk") || ev.title?.includes("Lockdown")) {
                                    typeStyle = "text-rose-600 bg-rose-50";
                                    svgIcon = (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    );
                                } else if (ev.title?.includes("Ceiling") || ev.title?.includes("Step-Up")) {
                                    svgIcon = (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                        </svg>
                                    );
                                } else if (ev.title?.includes("Installment") || ev.title?.includes("Cleared")) {
                                    typeStyle = "text-indigo-600 bg-indigo-50";
                                    svgIcon = (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                        </svg>
                                    );
                                }

                                return (
                                    <div key={ev.id || index} className="flex items-start gap-3.5 relative">
                                        {index !== events.length - 1 && (
                                            <div className="absolute left-4 top-9 bottom-[-20px] w-0.5 bg-slate-100" />
                                        )}

                                        <div className={`h-8 w-8 shrink-0 rounded-xl flex items-center justify-center z-10 ${typeStyle}`}>
                                            {svgIcon}
                                        </div>

                                        <div className="text-xs">
                                            <div className="font-bold text-slate-900">{ev.title}</div>
                                            <div className="text-slate-500 mt-0.5 leading-relaxed">{ev.desc}</div>
                                            <div className="text-[11px] text-slate-400 mt-1 font-medium flex items-center gap-2">
                                                <span>{ev.time}</span>
                                                <span>•</span>
                                                <span className="text-indigo-600 font-semibold">{ev.source}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-4">
                    <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 transition-colors">
                        View complete platform event audit trail
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Right Box: Active Portfolio Repayments - Matching height */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between h-[640px]">
                <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                        <div>
                            <h2 className="text-base font-bold text-slate-900 tracking-tight">Active Portfolio Repayments</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Real-time settlement tracking across Maya, GCash, and InstaPay gateways</p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            98.2% Auto-Reconciled
                        </span>
                    </div>

                    <div className="overflow-y-auto h-[440px] mt-2 pr-1">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-white z-10">
                            <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                <th className="py-3 px-4">Loan Note</th>
                                <th className="py-3 px-4">Principal & APR</th>
                                <th className="py-3 px-4">Installment Status</th>
                                <th className="py-3 px-4">Gateway</th>
                                <th className="py-3 px-4 text-right">Status</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                            {portfolioItems.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="py-16 text-center text-slate-400 text-xs">No active portfolio repayments found.</td>
                                </tr>
                            ) : (
                                portfolioItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-3.5 px-4">
                                            <div className="font-bold text-slate-900">{item.id}</div>
                                            <div className="text-[11px] text-slate-500">{item.borrower}</div>
                                        </td>
                                        <td className="py-3.5 px-4 font-black text-slate-900">
                                            {formatPHP(item.principal)}
                                            <div className="text-[11px] text-slate-500 font-medium">{item.rate} • {item.term}</div>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="flex justify-between font-bold text-slate-700 mb-1">
                                                <span>Term {item.currentTerm} of {item.term}</span>
                                                <span>{item.progress}%</span>
                                            </div>
                                            <div className="h-1.5 w-32 bg-slate-100 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${item.progress === 100 ? "bg-indigo-600" : item.progress < 30 ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: `${item.progress}%` }} />
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                                            {item.gateway}
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            {getStatusBadge(item.status)}
                                        </td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
                    <span>All transfers settled under BSP-supervised National Retail Payment System (NRPS)</span>
                    <button className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-2 font-bold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export Ledger (.CSV)
                    </button>
                </div>
            </div>
        </div>
    );
}