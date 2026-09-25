import { useState } from "react";
import { X, ChevronDown, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { addPaymentMethod, ApiError } from "@/lib/api";

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

const PHILIPPINE_BANKS = [
    { id: "BDO", name: "BDO Unibank", icon: bdoIcon },
    { id: "BPI", name: "Bank of the Philippine Islands (BPI)", icon: bpiIcon },
    { id: "UBP", name: "UnionBank of the Philippines", icon: ubIcon },
    { id: "METROBANK", name: "Metrobank", icon: metrobankIcon },
    { id: "LANDBANK", name: "Landbank of the Philippines", icon: landbankIcon },
    { id: "RCBC", name: "Rizal Commercial Banking Corp (RCBC)", icon: rcbcIcon },
    { id: "SECURITY", name: "Security Bank", icon: securityBankIcon },
    { id: "PNB", name: "Philippine National Bank (PNB)", icon: pnbIcon },
];

const EWALLETS = [
    { id: "GCASH", name: "GCash", icon: gcashIcon },
    { id: "MAYA", name: "Maya", icon: mayaIcon },
    { id: "GRABPAY", name: "GrabPay", icon: grabPayIcon },
    { id: "SHOPEEPAY", name: "ShopeePay", icon: shopeePayIcon },
];

export default function AddPaymentMethodModal({ onClose, onSuccess }) {
    const [type, setType] = useState("BANK_ACCOUNT"); // "BANK_ACCOUNT" | "EWALLET" | "CARD"
    const [selectedBank, setSelectedBank] = useState(PHILIPPINE_BANKS[0]);
    const [selectedEWallet, setSelectedEWallet] = useState(EWALLETS[0]);
    const [cardName, setCardName] = useState("");
    const [accountName, setAccountName] = useState("");
    const [lastFour, setLastFour] = useState("");

    const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
    const [isEWalletDropdownOpen, setIsEWalletDropdownOpen] = useState(false);

    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        if (!accountName.trim()) {
            setError("Enter the account holder name.");
            return;
        }

        let providerName = "";
        if (type === "BANK_ACCOUNT") {
            providerName = selectedBank.name;
        } else if (type === "EWALLET") {
            providerName = selectedEWallet.name;
        } else {
            if (!cardName.trim()) {
                setError("Enter the card network or name.");
                return;
            }
            providerName = cardName.trim();
        }

        if (!/^\d{4}$/.test(lastFour)) {
            setError("Enter exactly the last 4 digits — nothing else is stored.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await addPaymentMethod({
                type,
                institution_name: `${providerName} (${accountName.trim()})`,
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
                    <h2 className="text-xl font-bold text-foreground">Link Payment Account</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
                    {/* Account Type Selector */}
                    <div>
                        <p className="mb-2 text-sm font-semibold text-foreground">Account Type</p>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { value: "BANK_ACCOUNT", label: "Bank Account" },
                                { value: "EWALLET", label: "E-Wallet" },
                                { value: "CARD", label: "Card" },
                            ].map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setType(opt.value)}
                                    className={`rounded-lg border px-2.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
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

                    {/* Bank Account Selection Dropdown with Logo Support */}
                    {type === "BANK_ACCOUNT" && (
                        <div className="relative">
                            <label className="mb-1.5 block text-sm font-semibold text-foreground">
                                Select Bank
                            </label>
                            <button
                                type="button"
                                onClick={() => setIsBankDropdownOpen(!isBankDropdownOpen)}
                                className="h-11 w-full rounded-md border border-input bg-secondary px-3.5 text-sm font-medium text-foreground flex items-center justify-between outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                            >
                                <div className="flex items-center gap-2.5">
                                    {selectedBank.icon && (
                                        <img src={selectedBank.icon} alt={selectedBank.name} className="h-4 w-4 object-contain rounded-md" />
                                    )}
                                    <span>{selectedBank.name}</span>
                                </div>
                                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isBankDropdownOpen ? "rotate-180" : ""}`} />
                            </button>

                            {isBankDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-md border border-border bg-card shadow-lg max-h-48 overflow-y-auto">
                                    {PHILIPPINE_BANKS.map((bank) => (
                                        <button
                                            key={bank.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedBank(bank);
                                                setIsBankDropdownOpen(false);
                                            }}
                                            className={`w-full px-3.5 py-2.5 text-xs text-left font-medium flex items-center justify-between transition-colors cursor-pointer ${
                                                selectedBank.id === bank.id ? "bg-secondary text-foreground font-bold" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                {bank.icon && (
                                                    <img src={bank.icon} alt={bank.name} className="h-4 w-4 object-contain rounded-md" />
                                                )}
                                                <span>{bank.name}</span>
                                            </div>
                                            {selectedBank.id === bank.id && <Check className="h-4 w-4 text-foreground" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* E-Wallet Provider Selection Dropdown with Logo Support */}
                    {type === "EWALLET" && (
                        <div className="relative">
                            <label className="mb-1.5 block text-sm font-semibold text-foreground">
                                Select E-Wallet Provider
                            </label>
                            <button
                                type="button"
                                onClick={() => setIsEWalletDropdownOpen(!isEWalletDropdownOpen)}
                                className="h-11 w-full rounded-md border border-input bg-secondary px-3.5 text-sm font-medium text-foreground flex items-center justify-between outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                            >
                                <div className="flex items-center gap-2.5">
                                    {selectedEWallet.icon && (
                                        <img src={selectedEWallet.icon} alt={selectedEWallet.name} className="h-4 w-4 object-contain rounded-md" />
                                    )}
                                    <span>{selectedEWallet.name}</span>
                                </div>
                                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isEWalletDropdownOpen ? "rotate-180" : ""}`} />
                            </button>

                            {isEWalletDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-md border border-border bg-card shadow-lg max-h-48 overflow-y-auto">
                                    {EWALLETS.map((ewallet) => (
                                        <button
                                            key={ewallet.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedEWallet(ewallet);
                                                setIsEWalletDropdownOpen(false);
                                            }}
                                            className={`w-full px-3.5 py-2.5 text-xs text-left font-medium flex items-center justify-between transition-colors cursor-pointer ${
                                                selectedEWallet.id === ewallet.id ? "bg-secondary text-foreground font-bold" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                {ewallet.icon && (
                                                    <img src={ewallet.icon} alt={ewallet.name} className="h-4 w-4 object-contain rounded-md" />
                                                )}
                                                <span>{ewallet.name}</span>
                                            </div>
                                            {selectedEWallet.id === ewallet.id && <Check className="h-4 w-4 text-foreground" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Card Provider Input */}
                    {type === "CARD" && (
                        <div>
                            <label htmlFor="card-name" className="mb-1.5 block text-sm font-semibold text-foreground">
                                Card Network / Brand
                            </label>
                            <input
                                id="card-name"
                                type="text"
                                value={cardName}
                                onChange={(e) => setCardName(e.target.value)}
                                placeholder="e.g. Visa, Mastercard, JCB"
                                className="h-11 w-full rounded-md border border-input bg-secondary px-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </div>
                    )}

                    {/* Account / Holder Name Input Field */}
                    <div>
                        <label htmlFor="account-name" className="mb-1.5 block text-sm font-semibold text-foreground">
                            Account Holder Name
                        </label>
                        <input
                            id="account-name"
                            type="text"
                            value={accountName}
                            onChange={(e) => setAccountName(e.target.value)}
                            placeholder="e.g. Juan Dela Cruz"
                            className="h-11 w-full rounded-md border border-input bg-secondary px-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                    </div>

                    {/* Last 4 Digits / Mobile Account Number */}
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
                        <Button type="button" variant="outline" className="flex-1 cursor-pointer" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" className="flex-1 cursor-pointer" disabled={submitting}>
                            {submitting ? "Linking…" : "Link Account"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}