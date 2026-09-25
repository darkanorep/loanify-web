import React, { useState, useEffect } from "react";
import { X, ArrowUpRight, Wallet, AlertCircle, ChevronDown, Check, Building2, Plus, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getToken } from "@/lib/authToken.js";
import AddPaymentMethodModal from "@/pages/payments/AddPaymentMethodModal.jsx"; // Adjust path if needed

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
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(amount || 0);
}

// Helper function to resolve logo assets or fallback Lucide icons
function getAccountLogo(institutionName = "", type = "") {
    const name = (institutionName || "").toUpperCase();

    // Banks
    if (name.includes("BDO")) return { type: "img", src: bdoIcon, alt: "BDO" };
    if (name.includes("BPI") || name.includes("PHILIPPINE ISLANDS")) return { type: "img", src: bpiIcon, alt: "BPI" };
    if (name.includes("UNIONBANK") || name.includes("UBP")) return { type: "img", src: ubIcon, alt: "UnionBank" };
    if (name.includes("METROBANK")) return { type: "img", src: metrobankIcon, alt: "Metrobank" };
    if (name.includes("LANDBANK") || name.includes("LBP")) return { type: "img", src: landbankIcon, alt: "Landbank" };
    if (name.includes("RCBC")) return { type: "img", src: rcbcIcon, alt: "RCBC" };
    if (name.includes("SECURITY")) return { type: "img", src: securityBankIcon, alt: "Security Bank" };
    if (name.includes("PNB") || name.includes("PHILIPPINE NATIONAL")) return { type: "img", src: pnbIcon, alt: "PNB" };

    // E-Wallets
    if (name.includes("GCASH")) return { type: "img", src: gcashIcon, alt: "GCash" };
    if (name.includes("MAYA")) return { type: "img", src: mayaIcon, alt: "Maya" };
    if (name.includes("GRAB")) return { type: "img", src: grabPayIcon, alt: "GrabPay" };
    if (name.includes("SHOPEE")) return { type: "img", src: shopeePayIcon, alt: "ShopeePay" };

    // Fallbacks
    if (type === "CARD" || type === "CREDIT_CARD") {
        return { type: "icon", Icon: CreditCard };
    }

    return { type: "icon", Icon: Building2 };
}

export default function WithdrawModal({ isOpen, onClose, availableBalance = 0, onSuccess }) {
    const [amount, setAmount] = useState("");
    const [linkedAccounts, setLinkedAccounts] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [loadingAccounts, setLoadingAccounts] = useState(true);
    const [showAddMethodModal, setShowAddMethodModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const fetchLinkedAccounts = async (autoSelectId = null) => {
        setLoadingAccounts(true);
        setError("");
        try {
            const res = await fetch("/api/payment-methods", {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            const data = await res.json();

            // Fix: Normalize response whether backend returns array directly or an object like { payment_methods: [] }
            let list = [];
            if (Array.isArray(data)) {
                list = data;
            } else if (Array.isArray(data.payment_methods)) {
                list = data.payment_methods;
            } else if (Array.isArray(data.data)) {
                list = data.data;
            }

            setLinkedAccounts(list);

            if (list.length > 0) {
                if (autoSelectId) {
                    const newlyAdded = list.find((acc) => acc.id === autoSelectId);
                    if (newlyAdded) setSelectedAccount(newlyAdded);
                } else {
                    const primary = list.find((acc) => acc.is_primary || acc.is_default) || list[0];
                    setSelectedAccount(primary);
                }
            } else {
                setSelectedAccount(null);
            }
        } catch (err) {
            console.error("Failed to load payment accounts:", err);
            setLinkedAccounts([]);
            setSelectedAccount(null);
        } finally {
            setLoadingAccounts(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchLinkedAccounts();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const numericAmount = parseFloat(amount || 0);
    const fee = 15; // Standard ₱15 transfer fee
    const netAmount = Math.max(0, numericAmount - fee);

    const handleWithdrawSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!selectedAccount) {
            setError("Please select or link a payment account for withdrawal.");
            return;
        }

        if (numericAmount < 100) {
            setError("Minimum cash-out amount is ₱100.");
            return;
        }

        if (numericAmount > availableBalance) {
            setError("Withdrawal amount exceeds your available balance.");
            return;
        }

        setSubmitting(true);

        try {
            const res = await fetch("/api/wallet/withdraw", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getToken()}`,
                },
                body: JSON.stringify({
                    amount: numericAmount,
                    payment_method_id: selectedAccount.id,
                    bank_code: selectedAccount.bank_code || selectedAccount.brand || "BANK",
                    account_number: selectedAccount.account_number || selectedAccount.last_four || selectedAccount.last4,
                    account_name: selectedAccount.institution_name || selectedAccount.account_name,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Withdrawal failed. Please try again.");

            if (onSuccess) onSuccess(data);
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const selectedLogo = selectedAccount
        ? getAccountLogo(selectedAccount.institution_name || selectedAccount.bank_name, selectedAccount.type)
        : null;

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in-0 duration-200">
                <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-indigo-50 text-[#0F2942]">
                                <ArrowUpRight className="h-5 w-5 text-[#0F2942]" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-[#0F2942]">Cash Out / Withdraw</h2>
                                <p className="text-[11px] font-medium text-slate-400">Transfer funds to your enrolled payment account</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                        {/* Balance Preview Box */}
                        <div className="flex items-center justify-between rounded-xl bg-[#faf8f5] p-3 border border-slate-200/80">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                                <Wallet className="h-4 w-4 text-indigo-500" />
                                <span>Available for Withdrawal</span>
                            </div>
                            <span className="text-sm font-extrabold text-[#0F2942]">{formatCurrency(availableBalance)}</span>
                        </div>

                        {/* Dynamic Enrolled Payment Account Selector */}
                        <div className="relative">
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-bold uppercase text-slate-500">
                                    Select Enrolled Destination
                                </label>
                                {linkedAccounts.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setShowAddMethodModal(true)}
                                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 cursor-pointer"
                                    >
                                        <Plus className="h-3 w-3" /> Add Account
                                    </button>
                                )}
                            </div>

                            {loadingAccounts ? (
                                <div className="h-12 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-400 flex items-center">
                                    Loading linked accounts...
                                </div>
                            ) : linkedAccounts.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-slate-300 bg-[#faf8f5] p-4 text-center space-y-2">
                                    <p className="text-xs text-slate-500 font-medium">No linked payment accounts found.</p>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddMethodModal(true)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-bold transition-all cursor-pointer"
                                    >
                                        <Plus className="h-3.5 w-3.5" /> Link New Bank Account
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                        className="w-full h-12 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#0F2942] flex items-center justify-between transition-all hover:bg-slate-100/80 focus:outline-none focus:border-[#0F2942] cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            {selectedLogo?.type === "img" ? (
                                                <img src={selectedLogo.src} alt={selectedLogo.alt} className="h-5 w-5 object-contain rounded-md" />
                                            ) : (
                                                <Building2 className="h-4 w-4 text-slate-500" />
                                            )}
                                            <span>
                        {selectedAccount?.institution_name || selectedAccount?.bank_name || "Linked Account"} (•••• {selectedAccount?.last_four || selectedAccount?.last4})
                      </span>
                                            {(selectedAccount?.is_primary || selectedAccount?.is_default) && (
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-indigo-100 text-indigo-700 uppercase">
                          Default
                        </span>
                                            )}
                                        </div>
                                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                                    </button>

                                    {/* Dropdown Menu listing enrolled accounts */}
                                    {isDropdownOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100 max-h-56 overflow-y-auto">
                                            {linkedAccounts.map((acc) => {
                                                const isSelected = selectedAccount?.id === acc.id;
                                                const logo = getAccountLogo(acc.institution_name || acc.bank_name, acc.type);
                                                return (
                                                    <button
                                                        key={acc.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedAccount(acc);
                                                            setIsDropdownOpen(false);
                                                        }}
                                                        className={`w-full px-3.5 py-2.5 text-xs font-bold text-left flex items-center justify-between transition-colors cursor-pointer ${
                                                            isSelected ? "bg-slate-100 text-[#0F2942]" : "text-slate-700 hover:bg-[#faf8f5]"
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            {logo.type === "img" ? (
                                                                <img src={logo.src} alt={logo.alt} className="h-4 w-4 object-contain rounded-md" />
                                                            ) : (
                                                                <Building2 className="h-4 w-4 text-slate-500" />
                                                            )}
                                                            <div>
                                                                <div>{acc.institution_name || acc.bank_name || "Bank Account"}</div>
                                                                <div className="text-[10px] text-slate-400 font-mono font-normal">
                                                                    •••• •••• {acc.last_four || acc.last4}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {isSelected && <Check className="h-4 w-4 text-[#0F2942]" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Amount Input */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-bold uppercase text-slate-500">Amount (₱)</label>
                                <button
                                    type="button"
                                    onClick={() => setAmount(availableBalance.toString())}
                                    className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded hover:bg-indigo-100 cursor-pointer"
                                >
                                    Max
                                </button>
                            </div>
                            <input
                                type="number"
                                min="100"
                                step="any"
                                placeholder="Enter amount (min ₱100)..."
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-[#0F2942] focus:outline-none focus:border-[#0F2942]"
                                required
                            />
                        </div>

                        {/* Fee & Breakdown Box */}
                        {numericAmount > 0 && (
                            <div className="rounded-xl border border-slate-100 bg-[#faf8f5] p-3 text-xs space-y-1.5">
                                <div className="flex justify-between text-slate-500 font-medium">
                                    <span>Requested Amount</span>
                                    <span>{formatCurrency(numericAmount)}</span>
                                </div>
                                <div className="flex justify-between text-slate-500 font-medium">
                                    <span>Transfer Fee (InstaPay)</span>
                                    <span>{formatCurrency(fee)}</span>
                                </div>
                                <div className="flex justify-between text-[#0F2942] font-bold pt-1 border-t border-slate-200">
                                    <span>You Receive</span>
                                    <span className="text-emerald-600 font-extrabold">{formatCurrency(netAmount)}</span>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="flex items-center gap-1.5 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Buttons */}
                        <div className="flex gap-2.5 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                disabled={submitting}
                                className="w-1/2 rounded-xl border-slate-200 text-slate-600 font-semibold cursor-pointer text-xs h-11"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting || numericAmount <= 0 || !selectedAccount}
                                className="w-1/2 rounded-xl bg-[#0F2942] hover:bg-[#163a5d] text-white font-bold cursor-pointer text-xs h-11 transition-all disabled:opacity-50"
                            >
                                {submitting ? "Processing..." : "Confirm Cash Out"}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Link Payment Account Overlay Modal */}
            {showAddMethodModal && (
                <AddPaymentMethodModal
                    onClose={() => setShowAddMethodModal(false)}
                    onSuccess={(newMethod) => {
                        setShowAddMethodModal(false);
                        fetchLinkedAccounts(newMethod?.id);
                    }}
                />
            )}
        </>
    );
}