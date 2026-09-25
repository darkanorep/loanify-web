import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestLoan, ApiError } from "@/lib/api";
import { getToken } from "@/lib/authToken.js";

const DEFAULT_FLAT_INTEREST_RATE = 5.0;
const MIN_AMOUNT = 500;
const TERMS = [3, 6, 12, 24];
const CATEGORIES = ["Inventory", "Equipment", "Working Capital", "Expansion", "Emergency"];

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "PHP",
        maximumFractionDigits: 0,
    }).format(amount || 0);
}

export default function RequestLoanModal({ onClose, onSuccess, offer }) {
    const [userLimit, setUserLimit] = useState(500);

    useEffect(() => {
        async function fetchUserProfile() {
            try {
                const res = await fetch("/api/profile", {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
                const data = await res.json();
                if (res.ok && data.credit_limit) {
                    setUserLimit(Number(data.credit_limit));
                }
            } catch (err) {
                console.error("Failed to fetch user credit limit", err);
            }
        }
        fetchUserProfile();
    }, []);

    const isP2p = Boolean(offer);

    // Check if the lender offer has fixed rates/terms or if they are flexible (borrower proposed)
    const isFixedInterest = isP2p && offer.interest_rate !== null && offer.interest_rate !== undefined;
    const isFixedTerm = isP2p && offer.term_months !== null && offer.term_months !== undefined;

    // Max loan amount limit calculation
    const maxAmount = isP2p ? Math.min(Number(offer.amount_available), userLimit) : userLimit;

    // State initialization
    const [amount, setAmount] = useState(Math.min(500, maxAmount));
    const [term, setTerm] = useState(isFixedTerm ? Number(offer.term_months) : 6);
    const [proposedInterestRate, setProposedInterestRate] = useState(
        isFixedInterest ? Number(offer.interest_rate) : DEFAULT_FLAT_INTEREST_RATE
    );

    const [category, setCategory] = useState(CATEGORIES[0]);
    const [description, setDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    // Active interest rate used for calculations
    const activeInterestRate = isFixedInterest ? Number(offer.interest_rate) : Number(proposedInterestRate || 0);

    // Live automatic repayment calculations
    const totalInterest = amount * (activeInterestRate / 100) * (term / 12);
    const totalRepayable = amount + totalInterest;
    const monthlyPayment = term > 0 ? totalRepayable / term : 0;

    async function handleSubmit() {
        setSubmitting(true);
        setError("");
        try {
            if (isP2p) {
                const res = await fetch("/api/p2p/apply", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${getToken()}`
                    },
                    body: JSON.stringify({
                        offer_id: offer.id,
                        amount: parseFloat(amount),
                        term_months: parseInt(term, 10),
                        proposed_interest_rate: activeInterestRate, // Sent to backend
                        purpose: category,
                        description: description.trim(),
                    }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to apply to offer.");
                onSuccess(data);
            } else {
                const combinedPurpose = description.trim() ? `${category}: ${description.trim()}` : category;
                const res = await requestLoan({
                    principal_amount: amount,
                    term_months: term,
                    purpose: combinedPurpose,
                });
                onSuccess(res.loan);
            }
        } catch (err) {
            setError(
                err instanceof ApiError
                    ? err.message
                    : err.message || "Couldn't submit your application. Please try again."
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-6 shadow-xl sm:p-8">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">
                            {isP2p ? "Apply to Lender Offer" : "Request New Micro-Loan"}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {isP2p
                                ? `Lender: ${offer.lender?.first_name || ''} ${offer.lender?.last_name || ''} (${
                                    isFixedInterest ? `${offer.interest_rate}% APR` : "Flexible APR"
                                })`
                                : "Flexible funding for small businesses and independent artisans with fixed transparent rates."
                            }
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Loan Amount Slider */}
                <div className="mt-6 rounded-xl bg-secondary/60 p-5 border border-border">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Loan Amount</span>
                        <span className="text-2xl font-bold text-accent">{formatCurrency(amount)}</span>
                    </div>

                    {maxAmount > MIN_AMOUNT ? (
                        <>
                            <input
                                type="range"
                                min={MIN_AMOUNT}
                                max={maxAmount}
                                step={100}
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                className="mt-4 w-full accent-accent cursor-pointer"
                            />
                            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                                <span>{formatCurrency(MIN_AMOUNT)}</span>
                                <span>Max Limit: {formatCurrency(maxAmount)}</span>
                            </div>
                        </>
                    ) : (
                        <p className="mt-2 text-xs text-muted-foreground">
                            Your current credit limit is set to the minimum amount ({formatCurrency(maxAmount)}).
                        </p>
                    )}
                </div>

                {/* Repayment Term (Clickable when Flexible) */}
                <div className="mt-5">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-semibold text-foreground">Repayment Term</p>
                        {!isFixedTerm && isP2p && (
                            <span className="text-[10px] uppercase font-extrabold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                                Borrower Proposed
                            </span>
                        )}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {TERMS.map((t) => (
                            <button
                                key={t}
                                type="button"
                                disabled={isFixedTerm}
                                onClick={() => setTerm(t)}
                                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                                    term === t
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "border-border bg-background text-foreground hover:bg-secondary"
                                } ${isFixedTerm ? "opacity-75 cursor-not-allowed" : "cursor-pointer"}`}
                            >
                                {t} Months
                            </button>
                        ))}
                    </div>
                </div>

                {/* Proposed APR Input Field (Enabled if Flexible) */}
                {!isFixedInterest && isP2p && (
                    <div className="mt-5 rounded-xl bg-accent/5 p-4 border border-accent/20 space-y-2">
                        <div className="flex justify-between items-center">
                            <label htmlFor="proposed-apr" className="text-sm font-semibold text-foreground">
                                Proposed Fixed Interest Rate (APR %)
                            </label>
                            <span className="text-[10px] uppercase font-extrabold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                                Flexible Rate
                            </span>
                        </div>
                        <div className="relative flex items-center">
                            <input
                                id="proposed-apr"
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={proposedInterestRate}
                                onChange={(e) => setProposedInterestRate(e.target.value)}
                                placeholder="5.0"
                                className="h-11 w-full rounded-md border border-input bg-background px-3.5 text-sm font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                            <span className="absolute right-3.5 text-sm font-bold text-muted-foreground">%</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            Propose an APR % to the lender for this loan request.
                        </p>
                    </div>
                )}

                {/* Primary Purpose */}
                <div className="mt-5">
                    <p className="mb-2 text-sm font-semibold text-foreground">Primary Purpose</p>
                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setCategory(c)}
                                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
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

                {/* Description / Memo */}
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

                {/* Automatic Live Estimate Display */}
                <div className="mt-5 space-y-2 rounded-xl bg-secondary/60 p-5 text-sm border border-border">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Estimated Monthly Payment:</span>
                        <span className="font-semibold text-foreground">
                            {formatCurrency(monthlyPayment)} / mo
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Fixed Interest Rate (APR):</span>
                        <span className="font-semibold text-foreground">{activeInterestRate}%</span>
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

                {/* Action Buttons */}
                <div className="mt-6 flex gap-3">
                    <Button type="button" variant="outline" className="flex-1 cursor-pointer" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 cursor-pointer font-bold"
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