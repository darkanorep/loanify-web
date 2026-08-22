import { useState } from "react";
import { X, Landmark, CreditCard, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { makePayment, ApiError } from "@/lib/api";

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

function AccountIcon({ type, className = "h-5 w-5" }) {
    return type === "CARD" ? (
        <CreditCard className={className} />
    ) : (
        <Landmark className={className} />
    );
}

export default function MakePaymentModal({
                                             loans,
                                             paymentMethods,
                                             preselectedLoanId,
                                             onClose,
                                             onSuccess,
                                         }) {
    const [loanId, setLoanId] = useState(preselectedLoanId ?? loans[0]?.id ?? null);
    const [amount, setAmount] = useState(loans[0]?.monthly_installment ?? 0);
    const [methodId, setMethodId] = useState(
        paymentMethods.find((m) => m.is_default)?.id ?? paymentMethods[0]?.id ?? null
    );
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const selectedLoan = loans.find((l) => l.id === loanId);

    function handleSelectLoan(id) {
        setLoanId(id);
        const loan = loans.find((l) => l.id === id);
        if (loan) setAmount(loan.monthly_installment);
    }

    async function handleSubmit() {
        setError("");
        if (!loanId) return setError("Select a loan account.");
        if (!methodId) return setError("Select a payment method.");
        if (!amount || amount <= 0) return setError("Enter a payment amount greater than zero.");

        setSubmitting(true);
        try {
            const res = await makePayment({
                loan_id: loanId,
                amount: Number(amount),
                payment_method_id: methodId,
            });
            onSuccess(res);
        } catch (err) {
            setError(
                err instanceof ApiError ? err.message : "Couldn't process this payment. Please try again."
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-6 shadow-xl sm:p-8">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">Make a Loan Payment</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Zero processing fees on direct ACH bank payments.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="mt-6">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Select Loan Account
                    </p>
                    {loans.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No active loans to pay.</p>
                    ) : (
                        <div className="space-y-2">
                            {loans.map((loan) => (
                                <button
                                    key={loan.id}
                                    type="button"
                                    onClick={() => handleSelectLoan(loan.id)}
                                    className={`w-full rounded-xl border p-4 text-left transition-colors ${
                                        loanId === loan.id
                                            ? "border-accent bg-accent/10"
                                            : "border-border bg-background hover:bg-secondary"
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-foreground">
                                                {loan.purpose || "General Purpose Loan"}
                                            </p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                Balance: {formatCurrency(loan.outstanding_balance)}
                                                {loan.next_due_date && ` • Due: ${formatDate(loan.next_due_date)}`}
                                            </p>
                                        </div>
                                        <span className="whitespace-nowrap font-semibold text-accent">
                      {formatCurrency(loan.monthly_installment)}/mo
                    </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {selectedLoan && (
                    <div className="mt-5 rounded-xl bg-secondary/60 p-5">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Payment Amount ($ USD)
                        </p>
                        <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-3">
                            <span className="text-lg font-bold text-accent">$</span>
                            <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-transparent text-2xl font-bold text-accent outline-none"
                            />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setAmount(selectedLoan.monthly_installment)}
                                className="rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
                            >
                                Monthly ({formatCurrency(selectedLoan.monthly_installment)})
                            </button>
                            <button
                                type="button"
                                onClick={() => setAmount(selectedLoan.outstanding_balance)}
                                className="rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
                            >
                                Full Balance ({formatCurrency(selectedLoan.outstanding_balance)})
                            </button>
                        </div>
                    </div>
                )}

                <div className="mt-5">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Payment Method
                    </p>
                    {paymentMethods.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No payment accounts linked yet — link one first.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {paymentMethods.map((pm) => (
                                <button
                                    key={pm.id}
                                    type="button"
                                    onClick={() => setMethodId(pm.id)}
                                    className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                                        methodId === pm.id
                                            ? "border-foreground bg-background"
                                            : "border-border bg-background hover:bg-secondary"
                                    }`}
                                >
                                    <AccountIcon type={pm.type} className="h-5 w-5 text-foreground" />
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-foreground">{pm.institution_name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            •••• {pm.last_four}
                                            {pm.is_default && " • Default"}
                                        </p>
                                    </div>
                                    <span
                                        className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                                            methodId === pm.id ? "border-foreground bg-foreground" : "border-border"
                                        }`}
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-5 flex items-center gap-2 rounded-lg bg-secondary/60 px-4 py-3 text-xs text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-accent" />
                    256-bit encrypted ACH transfer. Payment posts instantly.
                </div>

                {error && (
                    <div
                        role="alert"
                        className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
                    >
                        {error}
                    </div>
                )}

                <div className="mt-6 flex gap-3">
                    <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                        disabled={submitting || loans.length === 0 || paymentMethods.length === 0}
                        onClick={handleSubmit}
                    >
                        {submitting ? "Processing…" : "Submit Payment"}
                    </Button>
                </div>
            </div>
        </div>
    );
}