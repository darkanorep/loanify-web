import { useState, useEffect } from "react";
import { X, ShieldCheck, FileText } from "lucide-react";
import { Card } from "@tremor/react";
import { getToken } from "@/lib/authToken.js";

export default function AdminInspectionDrawer({ userId, onClose }) {
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);

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

    if (!userId) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-card p-6 shadow-2xl h-full overflow-y-auto border-l border-border">
                <div className="flex items-center justify-between border-b border-border pb-4">
                    <div>
                        <h3 className="text-lg font-bold text-foreground">Borrower Audit Ledger</h3>
                        <p className="text-xs text-muted-foreground">ID: {userId}</p>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {loading ? (
                    <p className="mt-6 text-sm text-muted-foreground">Loading audit records...</p>
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
                            <div className="space-y-2">
                                {details?.loans?.length > 0 ? (
                                    details.loans.map((loan) => (
                                        <div key={loan.id} className="rounded-xl border border-border p-3.5 text-xs flex items-center justify-between bg-background">
                                            <div>
                                                <span className="font-bold text-foreground">₱{Number(loan.principal_amount).toLocaleString()}</span>
                                                <span className="ml-2 text-muted-foreground uppercase">({loan.status})</span>
                                            </div>
                                            <span className="font-mono text-accent">Balance: ₱{Number(loan.outstanding_balance).toLocaleString()}</span>
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
    );
}