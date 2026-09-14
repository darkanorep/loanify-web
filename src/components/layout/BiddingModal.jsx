import React, { useState } from "react";
import { getToken } from "@/lib/authToken.js";

export default function BiddingModal({ loan, isOpen, onClose, onSuccess }) {
    const [bidAmount, setBidAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen || !loan) return null;

    const handleBidSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/escrow/bid", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getToken()}`,
                },
                body: JSON.stringify({
                    loanId: loan.id,
                    bidAmount: parseFloat(bidAmount),
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to place bid");

            onSuccess(data);
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                    <h3 className="text-base font-bold text-slate-900">Back P2P Note #{loan.id}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-sm">✕</button>
                </div>

                <form onSubmit={handleBidSubmit} className="mt-4 space-y-4">
                    {error && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
                            {error}
                        </div>
                    )}

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
                        <div className="flex justify-between text-slate-500">
                            <span>Borrower:</span>
                            <span className="font-bold text-slate-800">{loan.borrower}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                            <span>Principal Target:</span>
                            <span className="font-bold text-slate-800">₱{loan.principal?.toLocaleString()}</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Escrow Commitment (PHP)</label>
                        <input
                            type="number"
                            min="500"
                            placeholder="Enter amount to lock..."
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required
                        />
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-1/2 py-2.5 bg-slate-100 font-bold text-xs text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 font-bold text-xs text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                        >
                            {loading ? "Locking Funds..." : "Confirm & Lock Hold"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}