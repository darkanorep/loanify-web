import { useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requestLoan, ApiError } from "@/lib/api";

// Must match the backend's FLAT_INTEREST_RATE in loan.controller.js — this
// is duplicated here only so the estimate can update live as the user
// drags the slider, without a round-trip to the server on every change.
// If you ever change the backend rate, update this to match or the
// estimate shown here will be wrong.
const FLAT_INTEREST_RATE = 5.0;

const MIN_AMOUNT = 500;
const MAX_AMOUNT = 50000;
const TERMS = [3, 6, 12, 24];
const CATEGORIES = ["Inventory", "Equipment", "Working Capital", "Expansion", "Emergency"];

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(amount);
}

export default function RequestLoanModal({ onClose, onSuccess }) {
    const [amount, setAmount] = useState(3000);
    const [term, setTerm] = useState(12);
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [description, setDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const totalInterest = amount * (FLAT_INTEREST_RATE / 100);
    const totalRepayable = amount + totalInterest;
    const monthlyPayment = totalRepayable / term;

    async function handleSubmit() {
        setSubmitting(true);
        setError("");
        try {
            const purpose = description.trim() ? `${category}: ${description.trim()}` : category;
            const res = await requestLoan({
                principal_amount: amount,
                term_months: term,
                purpose,
            });
            onSuccess(res.loan);
        } catch (err) {
            setError(
                err instanceof ApiError
                    ? err.message
                    : "Couldn't submit your application. Please try again."
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
                        <h2 className="text-2xl font-bold text-foreground">Request New Micro-Loan</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Flexible funding for small businesses and independent artisans with fixed
                            transparent rates.
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

                {/* Loan Amount */}
                <div className="mt-6 rounded-xl bg-secondary/60 p-5">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Loan Amount</span>
                        <span className="text-2xl font-bold text-accent">{formatCurrency(amount)}</span>
                    </div>
                    <input
                        type="range"
                        min={MIN_AMOUNT}
                        max={MAX_AMOUNT}
                        step={100}
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        className="mt-4 w-full accent-accent"
                    />
                    <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                        <span>{formatCurrency(MIN_AMOUNT)}</span>
                        <span>Max Available: {formatCurrency(MAX_AMOUNT)}</span>
                    </div>
                </div>

                {/* Repayment Term */}
                <div className="mt-5">
                    <p className="mb-2 text-sm font-semibold text-foreground">Repayment Term</p>
                    <div className="grid grid-cols-4 gap-2">
                        {TERMS.map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setTerm(t)}
                                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                                    term === t
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "border-border bg-background text-foreground hover:bg-secondary"
                                }`}
                            >
                                {t} Months
                            </button>
                        ))}
                    </div>
                </div>

                {/* Primary Purpose */}
                <div className="mt-5">
                    <p className="mb-2 text-sm font-semibold text-foreground">Primary Purpose</p>
                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setCategory(c)}
                                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                                    category === c
                                        ? "border-accent bg-accent text-accent-foreground"
                                        : "border-border bg-background text-foreground hover:bg-secondary"
                                }`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Description */}
                <div className="mt-5">
                    <label htmlFor="loan-description" className="mb-2 block text-sm font-semibold text-foreground">
                        Description / Memo (Optional)
                    </label>
                    <input
                        id="loan-description"
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g. Purchase industrial mixer and holiday stock"
                        className="h-11 w-full rounded-md border border-input bg-secondary px-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                </div>

                {/* Estimate */}
                <div className="mt-5 space-y-2 rounded-xl bg-secondary/60 p-5 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Estimated Monthly Payment:</span>
                        <span className="font-semibold text-foreground">
              {formatCurrency(monthlyPayment)} / mo
            </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Fixed Interest Rate (APR):</span>
                        <span className="font-semibold text-foreground">{FLAT_INTEREST_RATE}%</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Finance Charge:</span>
                        <span className="font-semibold text-foreground">{formatCurrency(totalInterest)}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2">
                        <span className="font-semibold text-foreground">Total Repayment Amount:</span>
                        <span className="font-bold text-accent">{formatCurrency(totalRepayable)}</span>
                    </div>
                </div>

                {error && (
                    <div
                        role="alert"
                        className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
                    >
                        {error}
                    </div>
                )}

                {/* Actions */}
                <div className="mt-6 flex gap-3">
                    <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                        disabled={submitting}
                        onClick={handleSubmit}
                    >
                        {submitting ? "Submitting…" : "Submit Application"}
                    </Button>
                </div>
            </div>
        </div>
    );
}