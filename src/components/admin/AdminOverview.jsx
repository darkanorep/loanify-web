import React, { useState, useEffect } from "react";

export default function AdminOverview({ stats, onRefresh, loading, toast }) {
    const [progress, setProgress] = useState(0);
    const [statusStep, setStatusStep] = useState("");

    useEffect(() => {
        let interval;
        if (loading) {
            setProgress(10);
            setStatusStep("Synthesizing Maya & GCash repayment schedules...");

            interval = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 95) return prev;
                    const next = prev + Math.floor(Math.random() * 12) + 8;
                    if (next > 35 && next < 70) {
                        setStatusStep("Recalibrating peer endorsement multipliers...");
                    } else if (next >= 70) {
                        setStatusStep("Writing dynamic tiers to database...");
                    }
                    return next > 95 ? 95 : next;
                });
            }, 250);
        } else {
            setProgress(100);
            setStatusStep("Recalibration complete!");
            const timeout = setTimeout(() => {
                setProgress(0);
            }, 1200);
            return () => clearTimeout(timeout);
        }
        return () => clearInterval(interval);
    }, [loading]);

    const formatPHP = (value) => {
        const numericValue = parseFloat(value) || 0;
        return new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(numericValue);
    };

    const activeLoansAmount = stats?.totalActiveLoans || 0;
    const activeNotesCount = stats?.activeNotesCount || 0;
    const totalPool = stats?.totalPool || 50000000;
    const pendingKyc = stats?.pendingKyc || 0;
    const allocatedAmount = stats?.allocatedAmount || 0;
    const reserveAmount = stats?.reserveAmount || totalPool;
    const utilizationRate = stats?.utilizationRate || 0;
    const defaultRate = stats?.defaultRate || 0.00;
    const nplAmount = stats?.nplAmount || 0;

    const momText = stats?.activeLoansMoM || "+0.0% MoM";

    return (
        <div className="space-y-6 relative">
            {/* Non-blocking Toast Notification Banner */}
            {toast && (
                <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-lg transition-all animate-fadeIn ${
                    toast.type === "error" ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}>
                    <span>{toast.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

                {/* 1. Total Active Loans */}
                <div className="bg-white rounded-xl p-5 shadow-xs border border-[#e5eeff] flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-300">
                    <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-[#4338ca]/5 group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#565e74]">Total Active Loans</span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full text-[#00442d] bg-[#85f8c4]/30">
                                <span>{momText}</span>
                            </span>
                        </div>
                        <div className="mt-2 text-2xl lg:text-[28px] font-bold text-[#0b1c30] tracking-tight tabular-nums">
                            {formatPHP(activeLoansAmount)}
                        </div>
                        <p className="text-[12px] text-[#565e74] mt-1">{activeNotesCount.toLocaleString()} active micro-borrower notes</p>
                    </div>

                    <div className="mt-4 pt-1 flex items-center justify-between">
                        <svg className="w-full h-8 text-[#2a14b4] overflow-visible" fill="none" viewBox="0 0 160 32">
                            <path d="M0 24 Q 25 26, 45 18 T 90 14 T 130 8 T 160 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                            <path d="M0 24 Q 25 26, 45 18 T 90 14 T 130 8 T 160 2 L 160 32 L 0 32 Z" fill="currentColor" fillOpacity="0.08" />
                            <circle className="fill-[#2a14b4] animate-ping" cx="160" cy="2" r="3" />
                            <circle className="fill-[#2a14b4]" cx="160" cy="2" r="3" />
                        </svg>
                    </div>
                </div>

                {/* 2. Platform Liquidity */}
                <div className="bg-white rounded-xl p-5 shadow-xs border border-[#e5eeff] flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-300">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#565e74]">Platform Liquidity</span>
                            <span className="text-[11px] font-semibold text-[#2a14b4] bg-[#e3dfff] px-2 py-0.5 rounded-full tabular-nums">
                                {utilizationRate}% Utilized
                            </span>
                        </div>
                        <div className="mt-2 text-2xl lg:text-[28px] font-bold text-[#0b1c30] tracking-tight tabular-nums">
                            {formatPHP(totalPool)}
                        </div>
                        <p className="text-[12px] text-[#565e74] mt-1">
                            {formatPHP(allocatedAmount)} allocated · {formatPHP(reserveAmount)} reserve
                        </p>
                    </div>
                    <div className="mt-4">
                        <div className="flex justify-between items-center text-[11px] text-[#464554] mb-1">
                            <span>Vault Pool Deployment</span>
                            <span className="font-semibold text-[#0b1c30]">{formatPHP(reserveAmount)} Unhedged</span>
                        </div>
                        <div className="w-full h-2.5 bg-[#e5eeff] rounded-full overflow-hidden flex">
                            <div className="h-full bg-[#4338ca] transition-all duration-500" style={{ width: `${Math.min(utilizationRate, 100)}%` }} />
                            <div className="h-full bg-[#68dba9] transition-all duration-500" style={{ width: `${Math.max(0, 100 - utilizationRate)}%` }} />
                        </div>
                    </div>
                </div>

                {/* 3. Pending KYC Reviews */}
                <div className="bg-white rounded-xl p-5 shadow-xs border border-[#e5eeff] flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-300 cursor-pointer">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#565e74]">Pending KYC Reviews</span>
                            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${pendingKyc > 0 ? "text-[#ba1a1a] bg-[#ffdad6] animate-pulse" : "text-[#00442d] bg-[#85f8c4]/30"}`}>
                                <span>{pendingKyc > 0 ? "High Priority" : "Clear"}</span>
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-1.5">
                            <span className="text-2xl lg:text-[28px] font-bold text-[#0b1c30] tracking-tight tabular-nums">{pendingKyc.toLocaleString()}</span>
                            <span className="text-[12px] text-[#565e74]">in queue</span>
                        </div>
                        <p className="text-[12px] text-[#565e74] mt-1">Requires manual compliance audit</p>
                    </div>
                </div>

                {/* 4. Portfolio Default Rate */}
                <div className="bg-white rounded-xl p-5 shadow-xs border border-[#e5eeff] flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-300 cursor-pointer">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#565e74]">Portfolio Default Rate</span>
                            <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold ${defaultRate <= 3.5 ? "text-[#00442d] bg-[#85f8c4]/30" : "text-[#ba1a1a] bg-[#ffdad6]"}`}>
                                <span>{defaultRate <= 3.5 ? "Healthy" : "Elevated Risk"}</span>
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl lg:text-[28px] font-bold text-[#0b1c30] tracking-tight tabular-nums">{defaultRate.toFixed(2)}%</span>
                        </div>
                        <p className="text-[12px] text-[#565e74] mt-1">Fintech Index Baseline: 3.50%</p>
                    </div>
                    <div className="mt-4">
                        <div className="flex justify-between items-center text-[11px] text-[#565e74] mb-1">
                            <span>PAR &gt; 30 Days</span>
                            <span className="font-bold text-[#00442d] tabular-nums">{formatPHP(nplAmount)} (NPL)</span>
                        </div>
                        <div className="w-full bg-[#dce9ff] h-2 rounded-full relative overflow-visible">
                            <div className="bg-[#00442d] h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(defaultRate * 10, 100)}%` }} />
                        </div>
                    </div>
                </div>

            </div>

            {/* Control Banner */}
            <div className="rounded-2xl bg-indigo-950 p-6 text-white shadow-xl flex flex-col justify-between gap-4 transition-all duration-300 hover:shadow-2xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <span className="inline-block rounded-md bg-indigo-800 px-2.5 py-1 text-xs font-semibold text-indigo-200">
                            ALGORITHMIC DYNAMIC CREDIT LIMIT & RISK EXPOSURE ENGINE V2.4
                        </span>
                        <h2 className="mt-2 text-xl font-bold tracking-tight">Automated Performance-Based Credit Assessment</h2>
                        <p className="text-sm text-indigo-300 mt-1 max-w-3xl leading-relaxed">
                            Batch recalibrate dynamic micro-lending capacity for all active borrowers based on repayment velocity, GCash/Maya bank transaction cadence, and cross-peer endorsements. Dynamically re-tiers limits from base ₱500 to ceiling ₱50,000.
                        </p>
                        <div className="mt-4 flex flex-wrap items-center gap-6 text-xs text-indigo-300 font-medium">
                            <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                Live Database Synced
                            </span>
                            <span>•</span>
                            <span className="text-emerald-300 font-bold">Dynamic Credit Tiers Active</span>
                            <span>•</span>
                            <span className="text-white font-bold">{activeNotesCount.toLocaleString()} Borrowers Active</span>
                        </div>
                    </div>
                    <button
                        onClick={onRefresh}
                        disabled={loading}
                        className="shrink-0 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-accent-foreground shadow-lg hover:bg-accent/90 hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        {loading ? "Recalibrating Engine..." : "Run Performance Credit Update"}
                    </button>
                </div>

                {(loading || progress > 0) && (
                    <div className="mt-2 pt-4 border-t border-indigo-900/50 space-y-2 animate-fadeIn">
                        <div className="flex justify-between text-xs text-indigo-300 font-medium">
                            <span className="animate-pulse">{statusStep}</span>
                            <span className="font-bold tabular-nums">{progress}%</span>
                        </div>
                        <div className="w-full bg-indigo-950 h-2 rounded-full overflow-hidden p-0.5 border border-indigo-800/40">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-400 to-indigo-400 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}