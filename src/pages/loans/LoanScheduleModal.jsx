import React from "react";
import { CheckCircle2, Clock, FileText, X, AlertTriangle, Calendar } from "lucide-react";

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "PHP",
    }).format(amount || 0);
}

function formatDate(dateString) {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

export default function LoanScheduleModal({ loan, onClose }) {
    if (!loan) return null;

    const totalRepayable = Number(loan.total_repayable || 0);
    const totalPaid = Number(loan.total_paid || 0);
    const outstanding = Number(loan.outstanding_balance || 0);
    const installments = loan.installments || [];
    const today = new Date();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-card text-card-foreground rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-border space-y-6 max-h-[90vh] flex flex-col">

                {/* Modal Header */}
                <div className="flex justify-between items-start pb-4 border-b border-border">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-muted-foreground">
                                LN-{String(loan.id).padStart(6, "0")}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                loan.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-600"
                            }`}>
                                {loan.status === "COMPLETED" ? "Fully Paid" : "Active"}
                            </span>
                        </div>
                        <h2 className="text-xl font-black text-foreground mt-1">
                            {loan.purpose || "P2P Marketplace Loan"}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="overflow-y-auto space-y-6 pr-1 custom-scrollbar">
                    {/* Financial Summary */}
                    <div className="grid grid-cols-3 gap-3 bg-secondary/50 rounded-2xl p-4 text-xs">
                        <div>
                            <p className="text-muted-foreground font-medium">Principal</p>
                            <p className="font-extrabold text-foreground text-sm mt-0.5">{formatCurrency(Number(loan.principal_amount))}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground font-medium">Total Paid</p>
                            <p className="font-extrabold text-emerald-600 text-sm mt-0.5">{formatCurrency(totalPaid)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground font-medium">Outstanding</p>
                            <p className="font-extrabold text-orange-600 text-sm mt-0.5">{formatCurrency(outstanding)}</p>
                        </div>
                    </div>

                    {/* Timeline Schedule */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-orange-600" /> Repayment Timeline
                        </h3>

                        <div className="relative pl-6 space-y-6 before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
                            {installments.length > 0 ? (
                                installments.map((inst, index) => {
                                    const dueDate = new Date(inst.due_date);
                                    const isPaid = inst.status === "PAID";
                                    const isOverdue = !isPaid && dueDate < today;
                                    const isPartial = inst.status === "PARTIALLY_PAID";

                                    return (
                                        <div key={inst.id} className="relative flex items-start group">
                                            {/* Status Node Icon */}
                                            <div className={`absolute -left-6 top-1 flex items-center justify-center w-7 h-7 rounded-full border-2 bg-card transition-all ${
                                                isPaid
                                                    ? "border-emerald-500 text-emerald-600 bg-emerald-50"
                                                    : isOverdue
                                                        ? "border-rose-500 text-rose-600 bg-rose-50 animate-pulse"
                                                        : "border-slate-300 text-slate-400 bg-slate-50"
                                            }`}>
                                                {isPaid ? (
                                                    <CheckCircle2 className="h-4 w-4" />
                                                ) : isOverdue ? (
                                                    <AlertTriangle className="h-4 w-4" />
                                                ) : (
                                                    <Clock className="h-3.5 w-3.5" />
                                                )}
                                            </div>

                                            {/* Card Content */}
                                            <div className={`ml-4 flex-1 rounded-2xl p-4 border transition-all ${
                                                isPaid
                                                    ? "bg-emerald-50/30 border-emerald-200/60"
                                                    : isOverdue
                                                        ? "bg-rose-50/30 border-rose-200/60"
                                                        : "bg-secondary/40 border-border/80"
                                            }`}>
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
                                                            Installment #{inst.installment_number}
                                                        </span>
                                                        <div className="text-sm font-bold text-foreground mt-0.5">
                                                            {formatDate(inst.due_date)}
                                                        </div>
                                                    </div>

                                                    <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] ${
                                                        isPaid
                                                            ? "bg-emerald-100 text-emerald-700"
                                                            : isOverdue
                                                                ? "bg-rose-100 text-rose-600"
                                                                : isPartial
                                                                    ? "bg-amber-100 text-amber-700"
                                                                    : "bg-orange-100 text-orange-600"
                                                    }`}>
                                                        {isPaid ? "PAID" : isOverdue ? "OVERDUE" : isPartial ? "PARTIAL" : "PENDING"}
                                                    </span>
                                                </div>

                                                <div className="mt-3 pt-2 border-t border-border/50 flex justify-between items-center text-xs">
                                                    <div>
                                                        <span className="text-muted-foreground">Amount Due: </span>
                                                        <span className="font-extrabold text-foreground">{formatCurrency(Number(inst.amount_due))}</span>
                                                    </div>
                                                    {Number(inst.amount_paid) > 0 && (
                                                        <div>
                                                            <span className="text-muted-foreground">Paid: </span>
                                                            <span className="font-extrabold text-emerald-600">{formatCurrency(Number(inst.amount_paid))}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-6 text-xs text-muted-foreground">
                                    No repayment schedule items found.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Agreement Footer */}
                    <div className="bg-secondary/30 rounded-2xl p-4 border border-border/60 text-xs space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-foreground">
                            <FileText className="h-4 w-4 text-orange-600" /> Facility Terms
                        </div>
                        <p className="text-muted-foreground leading-relaxed">
                            Issued at <span className="font-bold text-foreground">{Number(loan.interest_rate)}% APR</span> over <span className="font-bold text-foreground">{loan.term_months} months</span>. Payments are automatically processed and audited via smart escrow ledger.
                        </p>
                    </div>
                </div>

                <div className="pt-3 border-t border-border flex justify-end">
                    <button
                        onClick={onClose}
                        className="py-2.5 px-6 bg-secondary hover:bg-secondary/80 font-bold text-xs text-foreground rounded-xl transition-colors cursor-pointer"
                    >
                        Close Details
                    </button>
                </div>
            </div>
        </div>
    );
}