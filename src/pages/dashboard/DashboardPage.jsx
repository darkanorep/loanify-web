import { useEffect, useState } from "react";
import { TrendingUp, HandCoins, Calendar } from "lucide-react";

import { getDashboardSummary, ApiError } from "@/lib/api";

const MONTH_LABELS = {
    "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
    "05": "May", "06": "Jun", "07": "Jul", "08": "Aug",
    "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
};

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(amount);
}

function formatMonthLabel(monthKey) {
    const [, month] = monthKey.split("-");
    return MONTH_LABELS[month] || monthKey;
}

function formatShortDate(dateString) {
    return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
}

function OverviewCard({ label, icon: Icon, children }) {
    return (
        <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{label}</p>
                <Icon className="h-4 w-4 text-accent" />
            </div>
            {children}
        </div>
    );
}

const FILTERS = [
    { key: "all", label: "All" },
    { key: "repayments", label: "Repayments" },
    { key: "disbursements", label: "Disbursements" },
];

export default function DashboardPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        let cancelled = false;
        getDashboardSummary()
            .then((res) => {
                if (!cancelled) setData(res);
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(
                        err instanceof ApiError
                            ? err.message
                            : "Couldn't load your dashboard. Please check your connection."
                    );
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    if (loading) {
        return <p className="text-sm text-muted-foreground">Loading your dashboard…</p>;
    }

    if (error) {
        return (
            <div
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
                {error}
            </div>
        );
    }

    const maxRepayment = Math.max(...data.repayment_progress.map((m) => m.total_paid), 1);

    const filteredTransactions = data.recent_transactions.filter((tx) => {
        if (filter === "repayments") return tx.type === "REPAYMENT";
        if (filter === "disbursements") return tx.type === "DISBURSEMENT";
        return true;
    });

    return (
        <div className="space-y-10">
            <h1 className="text-2xl font-bold text-foreground">Micro-Lending User Dashboard</h1>

            {/* Financial Overview */}
            <section>
                <h2 className="mb-3 text-lg font-semibold text-foreground">Financial Overview</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <OverviewCard label="Current Balance" icon={TrendingUp}>
                        <p className="mt-2 text-2xl font-bold text-accent">
                            {formatCurrency(data.current_balance)}
                        </p>
                    </OverviewCard>

                    <OverviewCard label="Active Loans" icon={HandCoins}>
                        <p className="mt-2 text-2xl font-bold text-accent">{data.active_loans}</p>
                    </OverviewCard>

                    <OverviewCard label="Next Payment" icon={Calendar}>
                        {data.next_payment ? (
                            <p className="mt-2 text-2xl font-bold text-accent">
                                {formatCurrency(data.next_payment.amount)}{" "}
                                <span className="text-sm font-normal text-muted-foreground">
                  on {formatShortDate(data.next_payment.due_date)}
                </span>
                            </p>
                        ) : (
                            <p className="mt-3 text-sm text-muted-foreground">No upcoming payments</p>
                        )}
                    </OverviewCard>
                </div>
            </section>

            {/* Repayment Progress */}
            <section>
                <h2 className="mb-3 text-lg font-semibold text-foreground">Repayment Progress</h2>
                <div className="rounded-2xl border border-border bg-card p-6">
                    {data.repayment_progress.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No repayments recorded yet.</p>
                    ) : (
                        <div className="flex h-48 items-end gap-3">
                            {data.repayment_progress.map((m) => (
                                <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                                    <div
                                        className="w-full rounded-t-md bg-accent/80 transition-all"
                                        style={{ height: `${(m.total_paid / maxRepayment) * 100}%` }}
                                        title={`${formatCurrency(m.total_paid)} paid in ${formatMonthLabel(m.month)}`}
                                    />
                                    <span className="text-xs text-muted-foreground">
                    {formatMonthLabel(m.month)}
                  </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Recent Transactions */}
            <section>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-foreground">Recent Transactions</h2>
                    <div className="flex gap-2">
                        {FILTERS.map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setFilter(tab.key)}
                                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                                    filter === tab.key
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-secondary text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                    {filteredTransactions.length === 0 ? (
                        <p className="p-6 text-center text-sm text-muted-foreground">No transactions yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                                    <th className="whitespace-nowrap px-5 py-3 font-medium">Date</th>
                                    <th className="px-5 py-3 font-medium">Description</th>
                                    <th className="whitespace-nowrap px-5 py-3 text-right font-medium">Amount</th>
                                    <th className="whitespace-nowrap px-5 py-3 text-right font-medium">Status</th>
                                </tr>
                                </thead>
                                <tbody>
                                {filteredTransactions.map((tx) => (
                                    <tr key={tx.id} className="border-b border-border last:border-0">
                                        <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                                            {formatShortDate(tx.date)}
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="font-medium text-foreground">{tx.description}</span>
                                            {tx.purpose && (
                                                <span className="text-muted-foreground"> · {tx.purpose}</span>
                                            )}
                                        </td>
                                        <td
                                            className={`whitespace-nowrap px-5 py-3 text-right font-medium ${
                                                tx.amount < 0 ? "text-foreground" : "text-accent"
                                            }`}
                                        >
                                            {tx.amount < 0 ? "-" : "+"}
                                            {formatCurrency(Math.abs(tx.amount))}
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-3 text-right">
                        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground">
                          {tx.status}
                        </span>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}