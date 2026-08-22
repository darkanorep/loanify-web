import { useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { addPaymentMethod, ApiError } from "@/lib/api";

export default function AddPaymentMethodModal({ onClose, onSuccess }) {
    const [type, setType] = useState("BANK_ACCOUNT");
    const [institutionName, setInstitutionName] = useState("");
    const [lastFour, setLastFour] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        if (!institutionName.trim()) {
            setError("Enter the bank or card name.");
            return;
        }
        if (!/^\d{4}$/.test(lastFour)) {
            setError("Enter exactly the last 4 digits — nothing else is stored.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await addPaymentMethod({
                type,
                institution_name: institutionName.trim(),
                last_four: lastFour,
            });
            onSuccess(res.payment_method);
        } catch (err) {
            setError(
                err instanceof ApiError ? err.message : "Couldn't link this account. Please try again."
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
                <div className="flex items-start justify-between gap-4">
                    <h2 className="text-xl font-bold text-foreground">Link New Bank Account</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
                    <div>
                        <p className="mb-2 text-sm font-semibold text-foreground">Account Type</p>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { value: "BANK_ACCOUNT", label: "Bank Account" },
                                { value: "CARD", label: "Card" },
                            ].map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setType(opt.value)}
                                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                                        type === opt.value
                                            ? "border-primary bg-primary text-primary-foreground"
                                            : "border-border bg-background text-foreground hover:bg-secondary"
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="institution-name" className="mb-1.5 block text-sm font-semibold text-foreground">
                            {type === "CARD" ? "Card Name" : "Bank / Account Name"}
                        </label>
                        <input
                            id="institution-name"
                            type="text"
                            value={institutionName}
                            onChange={(e) => setInstitutionName(e.target.value)}
                            placeholder={type === "CARD" ? "e.g. Visa Business Debit" : "e.g. Chase Business Premier Checking"}
                            className="h-11 w-full rounded-md border border-input bg-secondary px-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                    </div>

                    <div>
                        <label htmlFor="last-four" className="mb-1.5 block text-sm font-semibold text-foreground">
                            Last 4 Digits
                        </label>
                        <input
                            id="last-four"
                            type="text"
                            inputMode="numeric"
                            maxLength={4}
                            value={lastFour}
                            onChange={(e) => setLastFour(e.target.value.replace(/\D/g, "").slice(0, 4))}
                            placeholder="4019"
                            className="h-11 w-full rounded-md border border-input bg-secondary px-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                        <p className="mt-1.5 text-xs text-muted-foreground">
                            Only the last 4 digits are stored — never the full account or card number.
                        </p>
                    </div>

                    {error && (
                        <div
                            role="alert"
                            className="rounded-md border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
                        >
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-1">
                        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" className="flex-1" disabled={submitting}>
                            {submitting ? "Linking…" : "Link Account"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}