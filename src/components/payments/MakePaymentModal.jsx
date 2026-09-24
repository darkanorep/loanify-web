import { useState } from "react";
import { X, CreditCard, Wallet, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getToken } from "@/lib/authToken.js";

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "PHP" }).format(amount || 0);
}

function formatNumberInput(value) {
    if (!value && value !== 0) return "";
    const raw = value.toString().replace(/,/g, "").replace(/\D/g, "");
    if (!raw) return "";
    return new Intl.NumberFormat("en-US").format(Number(raw));
}

function parseNumberInput(formattedValue) {
    if (!formattedValue) return "";
    return formattedValue.toString().replace(/,/g, "");
}

export default function MakePaymentModal({ loans, paymentMethods, preselectedLoanId, onClose, onSuccess }) {
    const selectedLoan = loans.find((l) => l.id === preselectedLoanId) || loans[0];

    const pendingInstallment = selectedLoan?.installments?.find(
        (i) => i.status === "PENDING" || i.status === "PARTIALLY_PAID" || i.status === "OVERDUE"
    );

    const nextDueAmount = pendingInstallment
        ? Number(pendingInstallment.amount_due) - Number(pendingInstallment.amount_paid)
        : Number(selectedLoan?.outstanding_balance || 0);

    const fullPayoffAmount = Number(selectedLoan?.outstanding_balance || 0);

    const [preset, setPreset] = useState("NEXT"); // NEXT | FULL | CUSTOM
    const [customAmount, setCustomAmount] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [actionError, setActionError] = useState("");
    const [confirmDirectPrompt, setConfirmDirectPrompt] = useState(null);

    // Derive target payment amount based on preset
    const targetAmount =
        preset === "NEXT"
            ? nextDueAmount
            : preset === "FULL"
                ? fullPayoffAmount
                : parseFloat(parseNumberInput(customAmount) || 0);

    const primaryMethod = paymentMethods.find((pm) => pm.is_default) || paymentMethods[0];

    async function handlePaymentSubmit(e, forceConfirm = false) {
        if (e) e.preventDefault();
        setActionError("");

        if (!selectedLoan) {
            setActionError("No active loan selected.");
            return;
        }

        if (targetAmount <= 0) {
            setActionError("Please enter a valid repayment amount greater than ₱0.");
            return;
        }

        setSubmitting(true);

        try {
            const res = await fetch("/api/payments/pay", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getToken()}`,
                },
                body: JSON.stringify({
                    loan_id: selectedLoan.id,
                    amount: targetAmount,
                    confirm_direct_funding: forceConfirm,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Payment processing failed.");

            if (data.requires_confirmation) {
                setConfirmDirectPrompt(data);
                setSubmitting(false);
                return;
            }

            setConfirmDirectPrompt(null);
            if (onSuccess) onSuccess(data);
            onClose();
        } catch (err) {
            setActionError(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl border border-border">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-border pb-4">
                    <div>
                        <h2 className="text-xl font-bold text-foreground">
                            {confirmDirectPrompt ? "Confirm Direct Funding" : "Make Loan Payment"}
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            LN-{String(selectedLoan?.id || 0).padStart(6, "0")} • Outstanding:{" "}
                            <strong className="text-foreground">{formatCurrency(selectedLoan?.outstanding_balance)}</strong>
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {confirmDirectPrompt ? (
                    /* Direct Funding Confirmation Prompt */
                    <div className="mt-5 space-y-4">
                        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                            <p className="font-bold text-sm flex items-center gap-1.5">
                                <AlertTriangle className="h-4 w-4 text-amber-600" /> Payment Exceeds Available Wallet Balance
                            </p>
                            <p>
                                Repaying <strong>{formatCurrency(targetAmount)}</strong> requires charging an additional{" "}
                                <strong>{formatCurrency(confirmDirectPrompt.required_difference)}</strong> from your primary linked card (
                                {primaryMethod ? `${primaryMethod.institution_name} *${primaryMethod.last_four}` : "Linked Card"}).
                            </p>
                            <p className="opacity-80">Would you like to authorize this direct funding top-up and complete the payment?</p>
                        </div>

                        {actionError && <p className="text-xs text-destructive font-medium">{actionError}</p>}

                        <div className="flex gap-3 pt-2">
                            <Button type="button" variant="outline" className="flex-1" onClick={() => setConfirmDirectPrompt(null)}>
                                Back
                            </Button>
                            <Button
                                type="button"
                                className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 cursor-pointer"
                                disabled={submitting}
                                onClick={() => handlePaymentSubmit(null, true)}
                            >
                                {submitting ? "Authorizing..." : "Confirm & Pay"}
                            </Button>
                        </div>
                    </div>
                ) : (
                    /* Payment Form */
                    <form onSubmit={(e) => handlePaymentSubmit(e, false)} className="mt-5 space-y-5">
                        {/* Presets Selection */}
                        <div>
                            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                                Select Repayment Option
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPreset("NEXT")}
                                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                        preset === "NEXT"
                                            ? "border-primary bg-primary/10 text-primary font-bold"
                                            : "border-border bg-secondary/30 text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    <span className="text-[10px] uppercase font-bold block opacity-70">Next Due</span>
                                    <span className="text-sm font-extrabold">{formatCurrency(nextDueAmount)}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setPreset("FULL")}
                                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                        preset === "FULL"
                                            ? "border-primary bg-primary/10 text-primary font-bold"
                                            : "border-border bg-secondary/30 text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    <span className="text-[10px] uppercase font-bold block opacity-70">Full Payoff</span>
                                    <span className="text-sm font-extrabold">{formatCurrency(fullPayoffAmount)}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setPreset("CUSTOM")}
                                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                        preset === "CUSTOM"
                                            ? "border-primary bg-primary/10 text-primary font-bold"
                                            : "border-border bg-secondary/30 text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    <span className="text-[10px] uppercase font-bold block opacity-70">Custom Amount</span>
                                    <span className="text-sm font-extrabold">Other</span>
                                </button>
                            </div>
                        </div>

                        {/* Custom Amount Input */}
                        {preset === "CUSTOM" && (
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                                    Enter Custom Payment (₱)
                                </label>
                                <input
                                    type="text"
                                    value={formatNumberInput(customAmount)}
                                    onChange={(e) => setCustomAmount(parseNumberInput(e.target.value))}
                                    placeholder="0"
                                    className="h-11 w-full rounded-xl border border-input bg-secondary px-3 text-sm text-foreground outline-none focus:border-primary"
                                    required
                                />
                            </div>
                        )}

                        {/* Selected Summary Card */}
                        <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Payment Amount:</span>
                                <span className="font-bold text-foreground">{formatCurrency(targetAmount)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Funding Method:</span>
                                <span className="font-medium text-foreground flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5 text-accent" />
                                    {primaryMethod ? `${primaryMethod.institution_name} (*${primaryMethod.last_four})` : "Linked Payment Card"}
                </span>
                            </div>
                        </div>

                        {actionError && <p className="text-xs text-destructive font-medium">{actionError}</p>}

                        <div className="flex gap-3 pt-2">
                            <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 cursor-pointer"
                                disabled={submitting || targetAmount <= 0}
                            >
                                {submitting ? "Processing..." : `Pay ${formatCurrency(targetAmount)}`}
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}