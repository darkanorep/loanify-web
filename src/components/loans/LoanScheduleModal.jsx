import { X, Calendar, CheckCircle2, Clock, ShieldCheck, DollarSign } from "lucide-react";

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "PHP" }).format(amount || 0);
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

    const lenderName = loan.lender?.full_name ||
        `${loan.lender?.first_name || ''} ${loan.lender?.last_name || ''}`.trim() ||
        `Lender #${loan.lender_id || loan.lender?.id || 'P2P'}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-2xl rounded-2xl bg-card p-6 shadow-2xl border border-border max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-border pb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-foreground">
                                Loan LN-{String(loan.id).padStart(6, "0")}
                            </h2>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                loan.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
                            }`}>
                {loan.status === "COMPLETED" ? "Fully Paid" : loan.status}
              </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Purpose: {loan.purpose || "General Micro-Financing Loan"}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Loan Financial Overview */}
                <div className="grid grid-cols-3 gap-3 my-5">
                    <div className="p-3 rounded-xl bg-secondary/50 border border-border/60 text-center">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase block">Principal</span>
                        <span className="text-sm font-bold text-foreground">{formatCurrency(loan.principal_amount)}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary/50 border border-border/60 text-center">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase block">Total Paid</span>
                        <span className="text-sm font-bold text-emerald-600">{formatCurrency(loan.total_paid)}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary/50 border border-border/60 text-center">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase block">Outstanding</span>
                        <span className="text-sm font-bold text-rose-600">{formatCurrency(loan.outstanding_balance)}</span>
                    </div>
                </div>

                {/* Agreement Summary */}
                <div className="rounded-xl border border-border bg-secondary/30 p-4 mb-6 text-xs space-y-2">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Lender Note:</span>
                        <span className="font-semibold text-foreground">{lenderName}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Interest Rate (APR):</span>
                        <span className="font-semibold text-foreground">{loan.interest_rate}% APR</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Monthly Installment:</span>
                        <span className="font-semibold text-foreground">{formatCurrency(loan.monthly_installment)} / month</span>
                    </div>
                </div>

                {/* Installment Schedule */}
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" /> Amortization Timeline
                    </h3>

                    <div className="space-y-2 border border-border rounded-xl p-3 bg-card">
                        {!loan.installments || loan.installments.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-3 text-center">No repayment schedule available.</p>
                        ) : (
                            loan.installments.map((inst) => {
                                const isPaid = inst.status === "PAID";
                                const isOverdue = inst.status === "OVERDUE";

                                return (
                                    <div
                                        key={inst.id}
                                        className={`flex items-center justify-between p-3 rounded-lg border text-xs ${
                                            isPaid ? "bg-emerald-50/50 border-emerald-200/60 text-emerald-900" :
                                                isOverdue ? "bg-rose-50 border-rose-200 text-rose-900" : "bg-secondary/40 border-border text-foreground"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-1.5 rounded-full ${isPaid ? "bg-emerald-500 text-white" : isOverdue ? "bg-rose-500 text-white" : "bg-secondary text-muted-foreground"}`}>
                                                {isPaid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                                            </div>
                                            <div>
                                                <span className="font-semibold block">Installment #{inst.installment_number}</span>
                                                <span className="text-[11px] opacity-75">Due: {formatDate(inst.due_date)}</span>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <span className="font-bold block">{formatCurrency(inst.amount_due)}</span>
                                            <span className="text-[10px] uppercase font-bold tracking-wider">
                        {isPaid ? "Paid" : isOverdue ? "Overdue" : inst.status === "PARTIALLY_PAID" ? `Paid: ${formatCurrency(inst.amount_paid)}` : "Pending"}
                      </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}