import { useState, useEffect } from "react";
import { X, ShieldCheck, Wallet, CreditCard, Check, Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { makePayment, getWalletOverview, ApiError } from "@/lib/api";

import gcashIcon from "@/components/icons/gcash-icon.png";
import mayaIcon from "@/components/icons/maya-icon.png";
import bdoIcon from "@/components/icons/bdo-icon.png";
import bpiIcon from "@/components/icons/bpi-icon.png";
import ubIcon from "@/components/icons/unionbank-icon.png";
import metrobankIcon from "@/components/icons/metrobank-icon.png";
import landbankIcon from "@/components/icons/landbank-icon.png";
import rcbcIcon from "@/components/icons/rcbc-icon.png";
import securityBankIcon from "@/components/icons/security-bank-icon.png";
import pnbIcon from "@/components/icons/pnb-icon.png";
import grabPayIcon from "@/components/icons/grabpay-icon.png";
import shopeePayIcon from "@/components/icons/shopee-icon.png";

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "PHP",
    }).format(amount || 0);
}

function formatDate(dateString) {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function getAccountLogo(institutionName = "", type = "") {
    const name = (institutionName || "").toUpperCase();

    if (name.includes("BDO")) return { type: "img", src: bdoIcon, alt: "BDO" };
    if (name.includes("BPI") || name.includes("PHILIPPINE ISLANDS")) return { type: "img", src: bpiIcon, alt: "BPI" };
    if (name.includes("UNIONBANK") || name.includes("UBP")) return { type: "img", src: ubIcon, alt: "UnionBank" };
    if (name.includes("METROBANK")) return { type: "img", src: metrobankIcon, alt: "Metrobank" };
    if (name.includes("LANDBANK") || name.includes("LBP")) return { type: "img", src: landbankIcon, alt: "Landbank" };
    if (name.includes("RCBC")) return { type: "img", src: rcbcIcon, alt: "RCBC" };
    if (name.includes("SECURITY")) return { type: "img", src: securityBankIcon, alt: "Security Bank" };
    if (name.includes("PNB") || name.includes("PHILIPPINE NATIONAL")) return { type: "img", src: pnbIcon, alt: "PNB" };

    if (name.includes("GCASH")) return { type: "img", src: gcashIcon, alt: "GCash" };
    if (name.includes("MAYA")) return { type: "img", src: mayaIcon, alt: "Maya" };
    if (name.includes("GRAB")) return { type: "img", src: grabPayIcon, alt: "GrabPay" };
    if (name.includes("SHOPEE")) return { type: "img", src: shopeePayIcon, alt: "ShopeePay" };

    if (type === "CARD" || type === "CREDIT_CARD") {
        return { type: "icon", Icon: CreditCard };
    }

    return { type: "icon", Icon: Building2 };
}

export default function MakePaymentModal({
                                             loans = [],
                                             paymentMethods = [],
                                             preselectedLoanId,
                                             onClose,
                                             onSuccess,
                                         }) {
    const [loanId, setLoanId] = useState(preselectedLoanId ?? loans[0]?.id ?? null);
    const selectedLoan = loans.find((l) => l.id === loanId) || loans[0];

    const [amount, setAmount] = useState(selectedLoan?.monthly_installment ?? selectedLoan?.outstanding_balance ?? 0);
    const [methodId, setMethodId] = useState("WALLET");

    const [walletBalance, setWalletBalance] = useState(0);
    const [loadingWallet, setLoadingWallet] = useState(true);

    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        async function fetchWallet() {
            try {
                const data = await getWalletOverview();
                setWalletBalance(Number(data?.available_balance || 0));
            } catch (err) {
                console.error("Failed to load wallet balance:", err);
            } finally {
                setLoadingWallet(false);
            }
        }
        fetchWallet();
    }, []);

    useEffect(() => {
        if (preselectedLoanId) {
            setLoanId(preselectedLoanId);
            const loan = loans.find((l) => l.id === preselectedLoanId);
            if (loan) setAmount(loan.monthly_installment || loan.outstanding_balance);
        }
    }, [preselectedLoanId, loans]);

    function handleSelectLoan(id) {
        setLoanId(id);
        const loan = loans.find((l) => l.id === id);
        if (loan) setAmount(loan.monthly_installment || loan.outstanding_balance);
    }

    const numericAmount = Number(amount || 0);
    const isWalletSelected = methodId === "WALLET";
    const isWalletInsufficient = isWalletSelected && numericAmount > walletBalance;

    async function handleSubmit() {
        setError("");
        if (!loanId) return setError("Select a loan account.");
        if (!methodId) return setError("Select a payment method.");
        if (!numericAmount || numericAmount <= 0) return setError("Enter a payment amount greater than zero.");

        if (selectedLoan && numericAmount > selectedLoan.outstanding_balance) {
            return setError(`Payment cannot exceed outstanding balance of ${formatCurrency(selectedLoan.outstanding_balance)}.`);
        }

        if (isWalletInsufficient) {
            return setError("Insufficient wallet balance. Please top up your wallet or select a linked account.");
        }

        setSubmitting(true);
        try {
            const res = await makePayment({
                loan_id: loanId,
                amount: numericAmount,
                payment_method_id: isWalletSelected ? "WALLET" : methodId,
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-6 shadow-2xl border border-border sm:p-8 space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 pb-3 border-b border-border">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">Make a Loan Payment</h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Zero processing fees on direct wallet & ACH bank payments.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="shrink-0 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Loan Account Selection */}
                <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
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
                                    className={`w-full rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                                        loanId === loan.id
                                            ? "border-accent bg-accent/10 ring-1 ring-accent"
                                            : "border-border bg-background hover:bg-secondary"
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-foreground">
                                                {loan.purpose || loan.description || `P2P Marketplace Loan #${loan.id}`}
                                            </p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                Balance: {formatCurrency(loan.outstanding_balance)}
                                                {loan.next_due_date && ` • Due: ${formatDate(loan.next_due_date)}`}
                                            </p>
                                        </div>
                                        <span className="whitespace-nowrap font-bold text-accent">
                                            {formatCurrency(loan.monthly_installment)}/mo
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Payment Amount Input */}
                {selectedLoan && (
                    <div className="rounded-xl bg-secondary/60 p-5 border border-border">
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            Payment Amount (₱)
                        </p>
                        <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-3 focus-within:border-accent">
                            <span className="text-lg font-bold text-accent">₱</span>
                            <input
                                type="number"
                                min={0}
                                step="any"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-transparent text-2xl font-bold text-accent outline-none"
                            />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setAmount(selectedLoan.monthly_installment)}
                                className="rounded-full bg-background px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary border border-border cursor-pointer"
                            >
                                Monthly ({formatCurrency(selectedLoan.monthly_installment)})
                            </button>
                            <button
                                type="button"
                                onClick={() => setAmount(selectedLoan.outstanding_balance)}
                                className="rounded-full bg-background px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary border border-border cursor-pointer"
                            >
                                Full Balance ({formatCurrency(selectedLoan.outstanding_balance)})
                            </button>
                        </div>
                    </div>
                )}

                {/* Payment Method Selector */}
                <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        Payment Method
                    </p>

                    <div className="space-y-2">
                        {/* Internal Wallet */}
                        <button
                            type="button"
                            onClick={() => setMethodId("WALLET")}
                            className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                                isWalletSelected
                                    ? "border-accent bg-accent/10 ring-1 ring-accent"
                                    : "border-border bg-background hover:bg-secondary"
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                                    <Wallet className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-foreground">Account Balance (Internal Wallet)</p>
                                    <p className="text-xs text-muted-foreground">
                                        {loadingWallet ? "Loading balance..." : `Available: ${formatCurrency(walletBalance)}`}
                                    </p>
                                </div>
                            </div>
                            {isWalletSelected && <Check className="h-4 w-4 text-accent" />}
                        </button>

                        {/* Linked Accounts */}
                        {paymentMethods.map((pm) => {
                            const isSelected = methodId === pm.id;
                            const logo = getAccountLogo(pm.institution_name, pm.type);
                            return (
                                <button
                                    key={pm.id}
                                    type="button"
                                    onClick={() => setMethodId(pm.id)}
                                    className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                                        isSelected
                                            ? "border-accent bg-accent/10 ring-1 ring-accent"
                                            : "border-border bg-background hover:bg-secondary"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 rounded-lg bg-secondary h-9 w-9 flex items-center justify-center">
                                            {logo.type === "img" ? (
                                                <img src={logo.src} alt={logo.alt} className="h-full w-full object-contain rounded-sm" />
                                            ) : (
                                                <logo.Icon className="h-4 w-4 text-foreground" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">{pm.institution_name}</p>
                                            <p className="text-xs text-muted-foreground font-mono">
                                                •••• •••• •••• {pm.last_four}
                                            </p>
                                        </div>
                                    </div>
                                    {isSelected && <Check className="h-4 w-4 text-accent" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Security Badge */}
                <div className="flex items-center gap-2 rounded-lg bg-secondary/60 px-4 py-3 text-xs text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-accent" />
                    256-bit encrypted transfer. Payment posts instantly.
                </div>

                {error && (
                    <div
                        role="alert"
                        className="rounded-md border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive font-medium"
                    >
                        {error}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                    <Button type="button" variant="outline" className="flex-1 cursor-pointer" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 cursor-pointer font-bold disabled:opacity-50"
                        disabled={submitting || loans.length === 0 || (isWalletSelected && isWalletInsufficient)}
                        onClick={handleSubmit}
                    >
                        {submitting ? "Processing…" : "Submit Payment"}
                    </Button>
                </div>
            </div>
        </div>
    );
}