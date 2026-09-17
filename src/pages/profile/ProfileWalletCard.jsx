import React, { useState, useEffect } from "react";
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Lock, Plus, RefreshCw, ExternalLink, ChevronLeft, ChevronRight, CreditCard } from "lucide-react";
import { getWalletOverview, topupWallet, initiatePaymongoTopup, ApiError, verifyPaymongoTopup } from "@/lib/api";
import { getWebSocket } from "@/lib/socket.js";
import gcashIcon from "@/components/icons/gcash-icon.png";
import mayaIcon from "@/components/icons/maya-icon.png";
import { getToken, setToken } from "@/lib/authToken.js";

export default function ProfileWalletCard({ userId }) {
    const [wallet, setWallet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [topupAmount, setTopupAmount] = useState("");
    const [gateway, setGateway] = useState("GCASH");
    const [usePayMongo, setUsePayMongo] = useState(false);
    const [isTopupOpen, setIsTopupOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState(null);

    // --- Pagination & Per Page State ---
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);

    const fetchOverview = async () => {
        try {
            const data = await getWalletOverview();
            setWallet(data);
        } catch (err) {
            console.error("Failed to load wallet data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOverview();

        // Detect PayMongo Return URL Query Params
        const urlParams = new URLSearchParams(window.location.search);
        const status = urlParams.get("status");

        if (status === "success") {
            setToast({ type: "success", text: "PayMongo deposit session completed! Wallet balance updated." });
            window.history.replaceState({}, document.title, window.location.pathname);
            fetchOverview();
        } else if (status === "failed") {
            setToast({ type: "error", text: "PayMongo transaction was cancelled or failed." });
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        // Real-Time WebSocket Listener
        const socket = getWebSocket();
        if (socket) {
            const handleMessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.action === "WALLET_TOPUP" || data.type === "admin_data_updated") {
                        fetchOverview();
                    }
                } catch (err) {
                    console.error("WebSocket parse error:", err);
                }
            };
            socket.addEventListener("message", handleMessage);
            return () => socket.removeEventListener("message", handleMessage);
        }
    }, []);

    const handleTopupSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setToast(null);
        const amountNum = parseFloat(topupAmount);

        try {
            if (usePayMongo) {
                const data = await initiatePaymongoTopup({ amount: amountNum, gateway });
                if (data.checkoutUrl) {
                    setIsTopupOpen(false);
                    setToast({ type: "success", text: "PayMongo portal opened. Complete the charge..." });

                    const popup = window.open(
                        data.checkoutUrl,
                        "PayMongoCheckout",
                        "width=500,height=700"
                    );

                    const executeVerification = async () => {
                        try {
                            setToast({ type: "success", text: "Verifying PayMongo charge..." });
                            await verifyPaymongoTopup(data.sourceId);
                            await fetchOverview();
                            setToast({
                                type: "success",
                                text: `Successfully deposited ₱${amountNum.toLocaleString()} via PayMongo!`
                            });
                        } catch (err) {
                            console.error("Verification error details:", err);
                            setToast({
                                type: "error",
                                text: err?.message || err?.error || "Payment verification failed."
                            });
                        }
                    };

                    // Listen for message from payment-success.html
                    const handleMessage = async (event) => {
                        if (event.data === "PAYMENT_SUCCESS") {
                            window.removeEventListener("message", handleMessage);
                            await executeVerification();
                        }
                    };
                    window.addEventListener("message", handleMessage);

                    // Polling fallback when popup is manually closed
                    const timer = setInterval(async () => {
                        if (!popup || popup.closed) {
                            clearInterval(timer);
                            window.removeEventListener("message", handleMessage);
                            await executeVerification();
                        }
                    }, 1000);

                    return;
                }
            } else {
                await topupWallet({ amount: amountNum, gateway });
                setToast({
                    type: "success",
                    text: `Successfully topped up ₱${amountNum.toLocaleString()} via ${gateway} Sandbox`,
                });
                setTopupAmount("");
                setIsTopupOpen(false);
                fetchOverview();
            }
        } catch (err) {
            setToast({
                type: "error",
                text: err instanceof ApiError ? err.message : "Top-up failed",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const formatPHP = (val) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(val || 0);

    // Calculate Paginated Transactions
    const transactions = wallet?.transactions || [];
    const totalPages = Math.ceil(transactions.length / itemsPerPage) || 1;
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentTransactions = transactions.slice(indexOfFirstItem, indexOfLastItem);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const handleItemsPerPageChange = (e) => {
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    const getSubmitButtonColor = () => {
        if (gateway === "GCASH") return "bg-blue-600 hover:bg-blue-700";
        if (gateway === "MAYA") return "bg-emerald-600 hover:bg-emerald-700";
        return "bg-indigo-600 hover:bg-indigo-700";
    };

    return (
        <div className="space-y-6">
            {toast && (
                <div className={`p-3.5 rounded-xl text-xs font-semibold ${
                    toast.type === "error" ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}>
                    {toast.text}
                </div>
            )}

            {/* Wallet Overview Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Available Balance */}
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Available Balance</span>
                            <WalletIcon className="h-5 w-5 text-indigo-400" />
                        </div>
                        <div className="text-2xl font-black mt-3 tracking-tight">
                            {loading ? "..." : formatPHP(wallet?.available_balance)}
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-indigo-800/50 flex justify-between items-center">
                        <span className="text-[11px] text-indigo-300">Ready for notes & withdrawal</span>
                        <button
                            onClick={() => setIsTopupOpen(true)}
                            className="py-1.5 px-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                        >
                            <Plus className="h-3.5 w-3.5" /> Top Up
                        </button>
                    </div>
                </div>

                {/* Escrow Balance */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Locked Escrow Hold</span>
                            <Lock className="h-5 w-5 text-amber-500" />
                        </div>
                        <div className="text-2xl font-black text-slate-900 mt-3 tracking-tight">
                            {loading ? "..." : formatPHP(wallet?.escrow_balance)}
                        </div>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-100">
                        Committed to active P2P note allocations
                    </p>
                </div>

                {/* Combined Vault Liquidity */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Combined Vault Liquidity</span>
                            <RefreshCw className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div className="text-2xl font-black text-slate-900 mt-3 tracking-tight">
                            {loading ? "..." : formatPHP(Number(wallet?.available_balance || 0) + Number(wallet?.escrow_balance || 0))}
                        </div>
                    </div>
                    <p className="text-[11px] text-emerald-600 font-bold mt-4 pt-3 border-t border-slate-100 flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live Vault Synced
                    </p>
                </div>
            </div>

            {/* Top-Up Modal */}
            {isTopupOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Sandbox Payment Portal</h3>
                                <p className="text-[11px] text-slate-400">Simulating E-Wallets & Card Open API Cash-In</p>
                            </div>
                            <button onClick={() => setIsTopupOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer">✕</button>
                        </div>

                        <form onSubmit={handleTopupSubmit} className="mt-4 space-y-4">
                            {/* Mode Toggle Switch */}
                            <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200/80 text-xs">
                                <span className="font-semibold text-slate-600">PayMongo Redirect</span>
                                <button
                                    type="button"
                                    onClick={() => setUsePayMongo(!usePayMongo)}
                                    className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all cursor-pointer ${
                                        usePayMongo ? "bg-indigo-600 text-white shadow-xs" : "bg-slate-200 text-slate-600"
                                    }`}
                                >
                                    {usePayMongo ? "ON (Redirect)" : "OFF (Local Simulation)"}
                                </button>
                            </div>

                            {/* Payment Method Selector Grid */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Select Payment Gateway</label>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {/* GCash Option */}
                                    <button
                                        type="button"
                                        onClick={() => setGateway("GCASH")}
                                        className={`py-2 px-1.5 rounded-xl border font-bold text-[11px] transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                                            gateway === "GCASH"
                                                ? "bg-blue-50 border-blue-600 text-blue-700 ring-1 ring-blue-600 shadow-xs"
                                                : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                        }`}
                                    >
                                        <img src={gcashIcon} alt="GCash" className="h-4 w-4 object-contain rounded-md" />
                                        <span>GCASH</span>
                                    </button>

                                    {/* Maya Option */}
                                    <button
                                        type="button"
                                        onClick={() => setGateway("MAYA")}
                                        className={`py-2 px-1.5 rounded-xl border font-bold text-[11px] transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                                            gateway === "MAYA"
                                                ? "bg-emerald-50 border-emerald-600 text-emerald-700 ring-1 ring-emerald-600 shadow-xs"
                                                : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                        }`}
                                    >
                                        <img src={mayaIcon} alt="Maya" className="h-4 w-4 object-contain rounded-md" />
                                        <span>MAYA</span>
                                    </button>

                                    {/* Credit / Debit Card Option */}
                                    <button
                                        type="button"
                                        onClick={() => setGateway("CARD")}
                                        className={`py-2 px-1.5 rounded-xl border font-bold text-[11px] transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                                            gateway === "CARD"
                                                ? "bg-indigo-50 border-indigo-600 text-indigo-700 ring-1 ring-indigo-600 shadow-xs"
                                                : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                        }`}
                                    >
                                        <CreditCard className="h-4 w-4 text-indigo-600" />
                                        <span>CARD</span>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Top-Up Amount (PHP)</label>
                                <input
                                    type="number"
                                    min="100"
                                    step="100"
                                    placeholder="Enter amount..."
                                    value={topupAmount}
                                    onChange={(e) => setTopupAmount(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>

                            {/* Quick Selection Chips */}
                            <div className="flex gap-1.5">
                                {[500, 1000, 5000, 10000].map((amt) => (
                                    <button
                                        key={amt}
                                        type="button"
                                        onClick={() => setTopupAmount(amt.toString())}
                                        className="flex-1 py-1 px-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-[11px] font-bold text-slate-600 transition-colors cursor-pointer"
                                    >
                                        +₱{amt >= 1000 ? `${amt / 1000}k` : amt}
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsTopupOpen(false)}
                                    className="w-1/2 py-2.5 bg-slate-100 font-bold text-xs text-slate-600 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className={`w-1/2 py-2.5 font-bold text-xs text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${getSubmitButtonColor()} disabled:opacity-50`}
                                >
                                    {submitting
                                        ? "Processing..."
                                        : usePayMongo
                                            ? <>Redirect to {gateway} <ExternalLink className="h-3 w-3 inline" /></>
                                            : `Deposit via ${gateway}`
                                    }
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Wallet Transaction History Table with Per Page Select */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <h4 className="text-sm font-bold text-slate-900">Recent Wallet Activity</h4>

                    {transactions.length > 0 && (
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                                <span>Per page:</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={handleItemsPerPageChange}
                                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                >
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={15}>15</option>
                                </select>
                            </div>

                            <span className="text-[11px] font-semibold text-slate-400">
                                Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, transactions.length)} of {transactions.length}
                            </span>
                        </div>
                    )}
                </div>

                {/* Transaction List */}
                <div className="space-y-3">
                    {currentTransactions.length > 0 ? (
                        currentTransactions.map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg font-bold ${
                                        tx.type === "TOP_UP" || tx.type === "DISBURSEMENT" || tx.type === "ESCROW_RELEASE"
                                            ? "bg-emerald-100 text-emerald-700"
                                            : "bg-rose-100 text-rose-700"
                                    }`}>
                                        {tx.type === "TOP_UP" || tx.type === "DISBURSEMENT" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900">{tx.description || tx.type}</div>
                                        <div className="text-[10px] text-slate-400 font-mono">{tx.reference_no} • {new Date(tx.created_at).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <div className={`font-black text-sm tabular-nums ${
                                    tx.type === "TOP_UP" || tx.type === "DISBURSEMENT" || tx.type === "ESCROW_RELEASE"
                                        ? "text-emerald-600"
                                        : "text-slate-900"
                                }`}>
                                    {tx.type === "TOP_UP" || tx.type === "DISBURSEMENT" || tx.type === "ESCROW_RELEASE" ? "+" : "-"}{formatPHP(tx.amount)}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-slate-400 py-4 text-center">No transactions recorded for this wallet yet.</p>
                    )}
                </div>

                {/* Pagination Controls */}
                {transactions.length > itemsPerPage && (
                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="py-1.5 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="h-3.5 w-3.5" /> Previous
                        </button>

                        <div className="text-xs font-bold text-slate-600">
                            Page {currentPage} of {totalPages}
                        </div>

                        <button
                            type="button"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="py-1.5 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Next <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}