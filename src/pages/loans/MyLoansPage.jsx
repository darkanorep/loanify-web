import { useEffect, useState } from "react";
import { DollarSign, Calendar, CreditCard, CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getToken } from "@/lib/authToken.js";
import LoanScheduleModal from "./LoanScheduleModal.jsx";
import MakePaymentModal from "../../components/payments/MakePaymentModal.jsx";

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "PHP" }).format(amount || 0);
}

export default function MyLoansPage() {
    const [loans, setLoans] = useState([]);
    const [walletBalance, setWalletBalance] = useState(0);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Modal State Management
    const [selectedScheduleLoan, setSelectedScheduleLoan] = useState(null);
    const [selectedPaymentLoan, setSelectedPaymentLoan] = useState(null);

    async function loadLoanData() {
        setLoading(true);
        setError("");
        try {
            const headers = { Authorization: `Bearer ${getToken()}` };
            const res = await fetch("/api/loans", { headers });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to load loans.");

            setLoans(data.loans || []);
            setWalletBalance(data.walletBalance || 0);
            setPaymentMethods(data.paymentMethods || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadLoanData();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">My Borrowed Loans</h1>
                    <p className="text-xs text-muted-foreground">
                        Track repayment progress, manage amortization schedules, and make payments.
                    </p>
                </div>
            </div>

            {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                </div>
            )}

            {loading ? (
                <p className="text-sm text-muted-foreground">Loading loan portfolio...</p>
            ) : loans.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card p-8 text-center">
                    <p className="text-muted-foreground text-sm">You have no active or historical loans.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {loans.map((loan) => {
                        const isCompleted = loan.status === "COMPLETED";
                        const pendingInst = loan.installments?.find(
                            (i) => i.status === "PENDING" || i.status === "PARTIALLY_PAID" || i.status === "OVERDUE"
                        );

                        return (
                            <div key={loan.id} className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                            LN-{String(loan.id).padStart(6, "0")}
                                        </span>
                                        <span
                                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                isCompleted
                                                    ? "bg-emerald-100 text-emerald-700"
                                                    : "bg-amber-100 text-amber-800"
                                            }`}
                                        >
                                            {isCompleted ? "Paid Off" : loan.status}
                                        </span>
                                    </div>

                                    <p className="mt-3 text-2xl font-bold text-foreground">
                                        {formatCurrency(loan.outstanding_balance)}
                                        <span className="text-xs font-normal text-muted-foreground ml-1.5">Outstanding Balance</span>
                                    </p>

                                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                                        <div className="rounded-md bg-secondary/50 p-2">
                                            <span className="text-muted-foreground block">Principal</span>
                                            <span className="font-semibold text-foreground">{formatCurrency(loan.principal_amount)}</span>
                                        </div>
                                        <div className="rounded-md bg-secondary/50 p-2">
                                            <span className="text-muted-foreground block">Next Installment</span>
                                            <span className="font-semibold text-foreground">
                                                {pendingInst ? formatCurrency(Number(pendingInst.amount_due) - Number(pendingInst.amount_paid)) : "₱0"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 cursor-pointer"
                                        onClick={() => setSelectedScheduleLoan(loan)}
                                    >
                                        <Calendar className="h-4 w-4 mr-1.5" /> Schedule
                                    </Button>

                                    {!isCompleted && (
                                        <Button
                                            size="sm"
                                            className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 cursor-pointer font-bold"
                                            onClick={() => setSelectedPaymentLoan(loan)}
                                        >
                                            <DollarSign className="h-4 w-4 mr-1.5" /> Make Payment
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 1. Schedule & Amortization Modal */}
            {selectedScheduleLoan && (
                <LoanScheduleModal
                    loan={selectedScheduleLoan}
                    onClose={() => setSelectedScheduleLoan(null)}
                />
            )}

            {/* 2. Styled Repayment Processing Modal */}
            {selectedPaymentLoan && (
                <MakePaymentModal
                    loans={loans.filter((l) => l.status !== "COMPLETED")}
                    paymentMethods={paymentMethods}
                    preselectedLoanId={selectedPaymentLoan.id}
                    onClose={() => setSelectedPaymentLoan(null)}
                    onSuccess={() => {
                        setSelectedPaymentLoan(null);
                        loadLoanData(); // Refresh loan schedule & wallet balances
                    }}
                />
            )}
        </div>
    );
}