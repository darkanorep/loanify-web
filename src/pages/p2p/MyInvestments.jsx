import { useEffect, useState } from "react";
import {
    TrendingUp,
    Lock,
    PiggyBank,
    ShieldCheck,
    ArrowUpRight,
    BellRing,
    X,
    RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getToken } from "@/lib/authToken.js";

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "PHP" }).format(amount || 0);
}

// Sub-component for individual loan card with animated progress bar
function LoanCard({ loan }) {
    const [animatedPct, setAnimatedPct] = useState(0);

    const borrowerName = loan.user?.full_name ||
        `${loan.user?.first_name || ''} ${loan.user?.last_name || ''}`.trim() ||
        `Borrower #${loan.user_id}`;

    const totalPaid = Number(loan.total_paid || 0);
    const totalRepayable = Number(loan.total_repayable || loan.principal_amount || 1);
    const targetPct = Math.min(100, Math.round((totalPaid / totalRepayable) * 100));
    const isCompleted = loan.status === "COMPLETED";

    // Trigger smooth progress bar fill animation on mount or update
    useEffect(() => {
        setAnimatedPct(0);
        const timer = setTimeout(() => {
            setAnimatedPct(targetPct);
        }, 150);
        return () => clearTimeout(timer);
    }, [targetPct]);

    return (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 space-y-4 shadow-xs hover:shadow-md transition-all">
            {/* Card Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
          <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">
            NOTE LN-{String(loan.id).padStart(6, "0")}
          </span>
                    <p className="text-base font-bold text-slate-900 mt-0.5">{borrowerName}</p>
                </div>
                <span
                    className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        isCompleted ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                    }`}
                >
          {isCompleted ? "Completed" : "Active"}
        </span>
            </div>

            {/* Financial Metrics Row */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Principal</span>
                    <span className="font-extrabold text-slate-800 mt-0.5 block">{formatCurrency(loan.principal_amount)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Repaid</span>
                    <span className="font-extrabold text-emerald-600 mt-0.5 block">{formatCurrency(loan.total_paid)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Remaining</span>
                    <span className="font-extrabold text-red-500 mt-0.5 block">{formatCurrency(loan.outstanding_balance)}</span>
                </div>
            </div>

            {/* Animated Repayment Progress Bar */}
            <div>
                <div className="flex justify-between text-xs mb-1.5 font-medium">
                    <span className="text-slate-500 font-semibold">Repayment Progress</span>
                    <span className="font-extrabold text-slate-900">{targetPct}%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden p-0.5">
                    <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out shadow-xs"
                        style={{ width: `${animatedPct}%` }}
                    />
                </div>
            </div>

            {/* Card Meta Footer */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-medium border-t border-slate-50">
        <span className="flex items-center gap-1.5 text-slate-700 font-bold">
          <ShieldCheck className="h-4 w-4 text-emerald-500" /> Score: {loan.user?.credit_score || "700"}
        </span>
                <span>Rate: {loan.interest_rate}% APR</span>
                <span>Term: {loan.term_months} Months</span>
            </div>
        </div>
    );
}

export default function MyInvestments() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [notification, setNotification] = useState(null);

    async function fetchInvestments(isInitial = false) {
        if (isInitial) setLoading(true);
        else setRefreshing(true);
        setError("");

        try {
            const res = await fetch("/api/p2p/investments", {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || "Failed to load portfolio.");
            setData(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    // Initial Data Fetch
    useEffect(() => {
        fetchInvestments(true);
    }, []);

    // Real-time WebSocket listener
    useEffect(() => {
        const token = getToken();
        if (!token) return;

        const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsHost = window.location.hostname;
        const ws = new WebSocket(`${wsProtocol}//${wsHost}:3000?token=${token}`);

        ws.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);

                if (
                    [
                        "repayment_received",
                        "p2p_application_approved",
                        "marketplace_update",
                        "autopay_success"
                    ].includes(payload.type)
                ) {
                    fetchInvestments(false);

                    if (payload.title || payload.message) {
                        setNotification({
                            title: payload.title || "Portfolio Update",
                            message: payload.message || "Your investment portfolio has been updated."
                        });
                        setTimeout(() => setNotification(null), 5000);
                    }
                }
            } catch (err) {
                console.error("Failed to parse WebSocket message in MyInvestments:", err);
            }
        };

        return () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close(1000, "Component unmounted");
            } else if (ws.readyState === WebSocket.CONNECTING) {
                ws.onopen = () => ws.close(1000, "Component unmounted during connection");
            }
        };
    }, []);

    if (loading) {
        return (
            <div className="space-y-8 animate-pulse">
                <div>
                    <div className="h-8 w-64 bg-slate-200/70 rounded-lg"></div>
                    <div className="h-4 w-96 bg-slate-200/50 rounded-lg mt-2"></div>
                </div>

                {/* Skeleton Top Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
                            <div className="h-4 w-28 bg-slate-200 rounded"></div>
                            <div className="h-8 w-36 bg-slate-300 rounded-lg"></div>
                            <div className="h-3 w-40 bg-slate-200 rounded"></div>
                        </div>
                    ))}
                </div>

                {/* Skeleton Note Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                            <div className="flex justify-between">
                                <div className="h-5 w-32 bg-slate-200 rounded"></div>
                                <div className="h-5 w-20 bg-slate-200 rounded-full"></div>
                            </div>
                            <div className="h-12 bg-slate-100 rounded-xl"></div>
                            <div className="h-3 w-full bg-slate-200 rounded-full"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                {error}
            </div>
        );
    }

    const { metrics, fundedLoans } = data || {};

    return (
        <div className="relative space-y-8 animate-in fade-in duration-300">
            {/* Live Push Notification Toast */}
            {notification && (
                <div className="fixed top-4 right-4 z-50 flex items-start gap-3 rounded-xl bg-slate-900 px-4 py-3 text-white shadow-xl animate-in slide-in-from-top-5">
                    <BellRing className="mt-0.5 h-5 w-5 text-indigo-400" />
                    <div>
                        <p className="font-bold text-xs">{notification.title}</p>
                        <p className="text-xs text-slate-300">{notification.message}</p>
                    </div>
                    <button onClick={() => setNotification(null)} className="ml-4 opacity-70 hover:opacity-100 cursor-pointer">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Header */}
            <div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Lender Investments & Yield</h1>
                <p className="text-xs text-slate-500 mt-1">
                    Monitor active funded notes, total interest earned, and live vault liquidity.
                </p>
            </div>

            {/* Top Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Yield Earned</span>
                        <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                            <TrendingUp className="h-4 w-4" />
                        </div>
                    </div>
                    <p className="mt-3 text-2xl font-extrabold text-emerald-600">{formatCurrency(metrics?.totalEarnedYield)}</p>
                    <p className="text-[11px] text-slate-400 mt-1">Net interest paid to your vault</p>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Principal</span>
                        <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                            <PiggyBank className="h-4 w-4" />
                        </div>
                    </div>
                    <p className="mt-3 text-2xl font-extrabold text-slate-900">{formatCurrency(metrics?.totalPrincipalLent)}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{metrics?.activeNotesCount} active funded note(s)</p>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Expected Inflows</span>
                        <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                            <ArrowUpRight className="h-4 w-4" />
                        </div>
                    </div>
                    <p className="mt-3 text-2xl font-extrabold text-slate-900">{formatCurrency(metrics?.totalOutstandingInflows)}</p>
                    <p className="text-[11px] text-slate-400 mt-1">Remaining repayments due</p>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Escrow Hold</span>
                        <div className="p-2 rounded-xl bg-amber-100/70 text-amber-700">
                            <Lock className="h-4 w-4" />
                        </div>
                    </div>
                    <p className="mt-3 text-2xl font-extrabold text-amber-600">{formatCurrency(metrics?.escrowBalance)}</p>
                    <p className="text-[11px] text-slate-400 mt-1">Committed to active market offers</p>
                </div>
            </div>

            {/* Funded Notes Section */}
            <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900">Funded P2P Notes</h2>

                    {/* Animated Refresh Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchInvestments(false)}
                        disabled={refreshing}
                        className="rounded-full border-slate-200 bg-slate-100/80 text-slate-700 hover:bg-slate-200/80 text-xs font-semibold px-4 py-2 flex items-center gap-2 cursor-pointer transition-all"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-indigo-600" : ""}`} />
                        {refreshing ? "Refreshing..." : "Refresh Portfolio"}
                    </Button>
                </div>

                {!fundedLoans || fundedLoans.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 py-16 px-6 text-center">
                        <h3 className="text-xl font-bold text-slate-900">No funded P2P notes</h3>
                        <p className="text-sm text-slate-500 max-w-sm mt-1">
                            You have not funded any borrower loan applications yet.
                        </p>
                    </div>
                ) : (
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity duration-300 ${refreshing ? "opacity-60" : "opacity-100"}`}>
                        {fundedLoans.map((loan) => (
                            <LoanCard key={loan.id} loan={loan} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}