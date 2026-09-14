import { useState, useEffect } from "react";
import { X, ShieldCheck, Banknote, RefreshCw } from "lucide-react";
import { getToken } from "@/lib/authToken.js";

export default function AdminInspectionDrawer({ userId, onClose, onActionComplete }) {
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (!userId) return;
        setLoading(true);
        fetch(`/api/admin/borrowers/${userId}`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        })
            .then((res) => res.json())
            .then((data) => setDetails(data))
            .finally(() => setLoading(false));
    }, [userId]);

    const handleDisburse = async (loanId) => {
        if (!confirm(`Are you sure you want to disburse funds for Loan Note #${loanId}?`)) return;
        setActionLoading(true);
        setToast(null);
        try {
            const res = await fetch("/api/admin/escrow/disburse", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getToken()}`,
                },
                body: JSON.stringify({ loanId }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setToast({ type: "success", text: data.message });
            if (onActionComplete) onActionComplete();
        } catch (err) {
            setToast({ type: "error", text: err.message });
        } finally {
            setActionLoading(false);
        }
    };

    const handleRefund = async (loanId, holdAmount) => {
        if (!confirm(`Refund ₱${holdAmount.toLocaleString()} back to lender's available balance?`)) return;
        setActionLoading(true);
        setToast(null);
        try {
            const res = await fetch("/api/admin/escrow/refund", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getToken()}`,
                },
                body: JSON.stringify({ lenderId: userId, loanId, holdAmount }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setToast({ type: "success", text: data.message });
            if (onActionComplete) onActionComplete();
        } catch (err) {
            setToast({ type: "error", text: err.message });
        } finally {
            setActionLoading(false);
        }
    };

    if (!userId) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-card p-6 shadow-2xl h-full overflow-y-auto border-l border-border flex flex-col justify-between">
                <div>
                    <div className="flex items-center justify-between border-b border-border pb-4">
                        <div>
                            <h3 className="text-lg font-bold text-foreground">Borrower Audit Ledger</h3>
                            <p className="text-xs text-muted-foreground">ID: {userId}</p>
                        </div>
                        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {toast && (
                        <div className={`mt-4 p-3 rounded-xl text-xs font-semibold ${
                            toast.type === "error" ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}>
                            {toast.text}
                        </div>
                    )}

                    {loading ? (
                        <p className="mt-6 text-sm text-muted-foreground animate-pulse">Loading audit records...</p>
                    ) : (
                        <div className="mt-6 space-y-6">
                            <div className="rounded-xl bg-secondary/60 p-4">
                                <h4 className="font-semibold text-foreground text-base">{details?.full_name}</h4>
                                <p className="text-xs text-muted-foreground">{details?.email} • {details?.phone_number || "No phone"}</p>
                                <div className="mt-3 flex gap-2">
                                    <span className="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-1 text-xs font-medium text-accent">
                                        <ShieldCheck className="h-3 w-3" /> {details?.kyc_status}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <h5 className="font-semibold text-sm text-foreground mb-3">Active & Historical Loans</h5>
                                <div className="space-y-3">
                                    {details?.loans?.length > 0 ? (
                                        details.loans.map((loan) => (
                                            <div key={loan.id} className="rounded-xl border border-border p-4 text-xs bg-background space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <span className="font-bold text-foreground text-sm">₱{Number(loan.principal_amount).toLocaleString()}</span>
                                                        <span className="ml-2 text-muted-foreground uppercase font-semibold">({loan.status})</span>
                                                    </div>
                                                    <span className="font-mono text-accent">Balance: ₱{Number(loan.outstanding_balance).toLocaleString()}</span>
                                                </div>

                                                {/* Escrow Financial Controls */}
                                                <div className="flex gap-2 pt-2 border-t border-border/50">
                                                    {loan.status === "APPROVED" && (
                                                        <button
                                                            onClick={() => handleDisburse(loan.id)}
                                                            disabled={actionLoading}
                                                            className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                                                        >
                                                            <Banknote className="h-3.5 w-3.5" />
                                                            Disburse Funds
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleRefund(loan.id, Number(loan.principal_amount))}
                                                        disabled={actionLoading}
                                                        className="flex-1 py-2 px-3 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 disabled:opacity-50 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                                                    >
                                                        <RefreshCw className="h-3.5 w-3.5" />
                                                        Refund Escrow
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-muted-foreground">No loan records attached to this user.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}