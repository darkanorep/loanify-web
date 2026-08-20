import { useEffect, useState } from "react";
import { Plus, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getMyLoans, approveLoan as approveLoanRequest, ApiError } from "@/lib/api";
import RequestLoanModal from "./RequestLoanModal.jsx";

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

// Cosmetic loan code (e.g. "LN-000042") derived from the numeric id — this
// app doesn't store a real loan-code/category field, so this is a
// simplification, not the "-EQ"/"-INV" category suffixes from the mockup.
function loanCode(id) {
    return `LN-${String(id).padStart(6, "0")}`;
}

const STATUS_BADGE = {
    PENDING: { label: "Pending", className: "bg-secondary text-foreground" },
    ACTIVE: { label: "Active", className: "bg-accent/15 text-accent" },
    COMPLETED: { label: "Fully Paid", className: "bg-secondary text-muted-foreground" },
    REJECTED: { label: "Rejected", className: "bg-destructive/15 text-destructive" },
    DEFAULTED: { label: "Defaulted", className: "bg-destructive/15 text-destructive" },
    CANCELLED: { label: "Cancelled", className: "bg-secondary text-muted-foreground" },
};

function StatusBadge({ status }) {
    const style = STATUS_BADGE[status] || STATUS_BADGE.PENDING;
    return (
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${style.className}`}>
      {style.label}
    </span>
    );
}

const TABS = [
    { key: "all", label: "All Loans", match: () => true },
    { key: "active", label: "Active", match: (loan) => loan.status === "ACTIVE" },
    { key: "completed", label: "Completed", match: (loan) => loan.status === "COMPLETED" },
];

function LoanCard({ loan, onApprove, approving }) {
    const totalRepayable = Number(loan.total_repayable);
    const totalPaid = Number(loan.total_paid);
    const outstanding = Number(loan.outstanding_balance);
    const percentPaid = totalRepayable > 0 ? Math.round((totalPaid / totalRepayable) * 100) : 0;
    const nextInstallment = loan.installments?.[0];

    return (
        <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{loanCode(loan.id)}</span>
                    <StatusBadge status={loan.status} />
                </div>
                <div className="text-right">
                    <p className="text-xs text-muted-foreground">Principal</p>
                    <p className="text-lg font-bold text-foreground">
                        {formatCurrency(Number(loan.principal_amount))}
                    </p>
                </div>
            </div>

            <h3 className="mt-3 text-lg font-bold text-foreground">
                {loan.purpose || "General Purpose Loan"}
            </h3>

            {/* Progress */}
            <div className="mt-5">
                <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">Repayment Progress</span>
                    <span className="font-semibold text-accent">{percentPaid}% Paid</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                        className="h-full rounded-full bg-accent transition-all"
                        style={{ width: `${Math.min(percentPaid, 100)}%` }}
                    />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatCurrency(totalPaid)} paid</span>
                    <span>{formatCurrency(outstanding)} remaining</span>
                </div>
            </div>

            {/* Info row */}
            <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-secondary/60 p-4">
                <div>
                    <p className="text-xs text-muted-foreground">Monthly Due</p>
                    <p className="mt-0.5 text-sm font-semibold text-foreground">
                        {formatCurrency(Number(loan.monthly_installment))}/mo
                    </p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">Fixed APR</p>
                    <p className="mt-0.5 text-sm font-semibold text-foreground">
                        {Number(loan.interest_rate)}%
                    </p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">Next Due</p>
                    <p className="mt-0.5 text-sm font-semibold text-accent">
                        {nextInstallment ? formatDate(nextInstallment.due_date) : "Completed"}
                    </p>
                </div>
            </div>

            {/* Actions */}
            {loan.status === "PENDING" ? (
                <div className="mt-4 space-y-2">
                    <Button
                        type="button"
                        className="w-full"
                        disabled={approving}
                        onClick={() => onApprove(loan.id)}
                    >
                        {approving ? "Approving…" : "Approve (testing only)"}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                        No permission check yet — see loan.routes.js caveat.
                    </p>
                </div>
            ) : (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Button
                        type="button"
                        className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                        onClick={() => alert("Make Payment isn't wired up yet — placeholder for now.")}
                    >
                        Make Payment
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={() => alert("Schedule & Agreement view isn't built yet — placeholder for now.")}
                    >
                        <FileText className="h-4 w-4" />
                        Schedule & Agreement
                    </Button>
                </div>
            )}
        </div>
    );
}

export default function MyLoansPage() {
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [approvingId, setApprovingId] = useState(null);
    const [showRequestModal, setShowRequestModal] = useState(false);

    useEffect(() => {
        getMyLoans()
            .then((res) => setLoans(res.loans))
            .catch((err) => {
                setError(err instanceof ApiError ? err.message : "Couldn't load your loans.");
            })
            .finally(() => setLoading(false));
    }, []);

    async function handleApprove(loanId) {
        setApprovingId(loanId);
        try {
            const res = await approveLoanRequest(loanId);
            setLoans((prev) => prev.map((l) => (l.id === loanId ? res.loan : l)));
        } catch (err) {
            alert(err instanceof ApiError ? err.message : "Approval failed.");
        } finally {
            setApprovingId(null);
        }
    }

    if (loading) {
        return <p className="text-sm text-muted-foreground">Loading your loans…</p>;
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

    const filteredLoans = loans.filter((loan) => TABS.find((t) => t.key === activeTab).match(loan));

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">My Loan Portfolio</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Track all active micro-financing facilities, amortization timelines, and repayment
                        milestones.
                    </p>
                </div>
                <Button
                    type="button"
                    className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={() => setShowRequestModal(true)}
                >
                    <Plus className="h-4 w-4" />
                    Request New Loan
                </Button>
            </div>

            {showRequestModal && (
                <RequestLoanModal
                    onClose={() => setShowRequestModal(false)}
                    onSuccess={(newLoan) => {
                        setLoans((prev) => [newLoan, ...prev]);
                        setShowRequestModal(false);
                        setActiveTab("all"); // so the new PENDING loan is visible immediately
                    }}
                />
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b border-border pb-3">
                {TABS.map((tab) => {
                    const count = loans.filter(tab.match).length;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key)}
                            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                                activeTab === tab.key
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            {tab.label} ({count})
                        </button>
                    );
                })}
            </div>

            {filteredLoans.length === 0 ? (
                <p className="text-sm text-muted-foreground">No loans in this category yet.</p>
            ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {filteredLoans.map((loan) => (
                        <LoanCard
                            key={loan.id}
                            loan={loan}
                            onApprove={handleApprove}
                            approving={approvingId === loan.id}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}