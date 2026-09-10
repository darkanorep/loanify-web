import React, { useState, useEffect } from "react";
import { getToken } from "@/lib/authToken.js";
import { getWebSocket } from "@/lib/socket.js";

export default function AdminBorrowerLedger({ onInspect }) {
    const [borrowers, setBorrowers] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 10 });
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [kycFilter, setKycFilter] = useState("ALL");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchBorrowers(currentPage, searchQuery, kycFilter);

        const socket = getWebSocket();
        if (socket) {
            const handleLedgerUpdate = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (
                        data.type === "admin_data_updated" ||
                        data.action === "DATABASE_SEEDED" ||
                        data.action === "BATCH_CREDIT_QUEUED" ||
                        data.type === "REFRESH_ALL" ||
                        data.type === "borrower_status_changed"
                    ) {
                        fetchBorrowers(currentPage, searchQuery, kycFilter);
                    }
                } catch (err) {
                    console.error("Failed to parse WebSocket event", err);
                }
            };

            socket.addEventListener("message", handleLedgerUpdate);

            return () => {
                socket.removeEventListener("message", handleLedgerUpdate);
            };
        }
    }, [currentPage, searchQuery, kycFilter]);

    async function fetchBorrowers(page = 1, search = "", kyc = "ALL") {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: "10",
                ...(search && { search }),
                ...(kyc && kyc !== "ALL" && { kyc_status: kyc }),
            });

            const res = await fetch(`/api/admin/borrowers?${queryParams.toString()}`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            const data = await res.json();
            if (res.ok) {
                setBorrowers(data.borrowers || []);
                if (data.pagination) setPagination(data.pagination);
            }
        } catch (err) {
            console.error("Failed to fetch borrowers", err);
        } finally {
            setLoading(false);
        }
    }

    const formatPHP = (value) => {
        const numericValue = parseFloat(value) || 0;
        return new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(numericValue);
    };

    const getCreditTierBadge = (score) => {
        const s = parseInt(score) || 500;
        if (s >= 800) return { label: "Exceptional", bg: "bg-emerald-50 text-emerald-700" };
        if (s >= 750) return { label: "Excellent", bg: "bg-indigo-50 text-indigo-700" };
        if (s >= 700) return { label: "Good", bg: "bg-blue-50 text-blue-700" };
        if (s >= 600) return { label: "Fair", bg: "bg-slate-100 text-slate-700" };
        return { label: "Poor / Warning", bg: "bg-rose-50 text-rose-700" };
    };

    const renderKycBadge = (status) => {
        switch (status) {
            case "VERIFIED":
                return <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">Verified</span>;
            case "PENDING":
                return <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">Pending Review</span>;
            default:
                return <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{status || "Not Started"}</span>;
        }
    };

    const { page, pages, total, limit } = pagination;
    const startRecord = total === 0 ? 0 : (page - 1) * limit + 1;
    const endRecord = Math.min(page * limit, total);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-300">
            <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Borrower & Member Ledger</h2>
                        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-600 tabular-nums">
                            {total.toLocaleString()} Records
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">Comprehensive audit trail of dynamic credit scoring, loan ceiling escalations, and ID authentication.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <input
                        type="text"
                        placeholder="Search name, email..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <select
                        value={kycFilter}
                        onChange={(e) => { setKycFilter(e.target.value); setCurrentPage(1); }}
                        className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="ALL">KYC: All Statuses</option>
                        <option value="VERIFIED">Verified</option>
                        <option value="PENDING">Pending</option>
                    </select>
                    <button
                        onClick={() => { setSearchQuery(""); setKycFilter("ALL"); setCurrentPage(1); }}
                        className="flex items-center gap-1.5 rounded-xl bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        Reset
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-xs flex items-center justify-center z-10">
                        <span className="text-xs font-bold text-indigo-600 animate-pulse">Syncing live records...</span>
                    </div>
                )}
                <table className="w-full text-left border-collapse">
                    <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="py-3.5 px-6">User Details</th>
                        <th className="py-3.5 px-4">Role</th>
                        <th className="py-3.5 px-4">KYC Status</th>
                        <th className="py-3.5 px-4">Credit Score & Tier</th>
                        <th className="py-3.5 px-4">Micro-Credit Limit</th>
                        <th className="py-3.5 px-4">Repayment Track</th>
                        <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                    {borrowers.length === 0 ? (
                        <tr>
                            <td colSpan="7" className="py-12 text-center text-slate-400 text-xs">No borrower records found matching criteria.</td>
                        </tr>
                    ) : (
                        borrowers.map((user) => {
                            const initials = user.full_name ? user.full_name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() : "US";
                            const tier = getCreditTierBadge(user.credit_score);
                            const scoreVal = parseInt(user.credit_score) || 500;
                            const scoreDiff = scoreVal - 500;
                            const ptsText = scoreDiff > 0 ? `+${scoreDiff} pts gained` : scoreDiff < 0 ? `${scoreDiff} pts this cycle` : `Initial Score Baseline`;
                            const ptsColor = scoreDiff > 0 ? "text-emerald-600 font-medium" : scoreDiff < 0 ? "text-rose-600 font-medium" : "text-slate-400 font-medium";

                            return (
                                <tr key={user.id} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 shrink-0 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">{initials}</div>
                                            <div>
                                                <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{user.full_name || "Anonymous User"}</div>
                                                <div className="text-xs text-slate-500 font-medium">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                                                {user.is_admin ? "Admin" : "Borrower"}
                                            </span>
                                    </td>
                                    <td className="py-4 px-4">{renderKycBadge(user.kyc_status)}</td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-slate-900 tabular-nums">{scoreVal}</span>
                                            <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${tier.bg}`}>{tier.label}</span>
                                        </div>
                                        <div className={`text-[11px] mt-0.5 ${ptsColor}`}>{ptsText}</div>
                                    </td>
                                    <td className="py-4 px-4 font-black text-slate-900 tabular-nums">{formatPHP(user.credit_limit)}</td>
                                    <td className="py-4 px-4">
                                        <div className="text-xs font-bold text-emerald-600">100% On-Time</div>
                                        <div className="mt-1.5 h-1.5 w-28 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="bg-emerald-500 h-full w-full rounded-full" />
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <button
                                            onClick={() => onInspect(user)}
                                            className="rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition-colors"
                                        >
                                            Inspect
                                        </button>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                    </tbody>
                </table>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <span>Showing {startRecord}-{endRecord} of {total.toLocaleString()} active platform profiles</span>
                <div className="flex items-center gap-1 font-medium">
                    <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors">Previous</button>
                    <div className="flex items-center gap-1 px-2">
                        <span className="font-bold text-slate-900">{page}</span>
                        <span className="text-slate-400">/</span>
                        <span>{pages || 1}</span>
                    </div>
                    <button onClick={() => setCurrentPage((p) => Math.min(p + 1, pages))} disabled={page >= pages} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors">Next</button>
                </div>
            </div>
        </div>
    );
}