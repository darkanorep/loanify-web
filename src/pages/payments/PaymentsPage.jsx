import { useEffect, useState } from "react";
import { Calendar, Clock, Landmark, CreditCard, Plus, Download, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    getPaymentsSummary,
    setDefaultPaymentMethod,
    deletePaymentMethod,
    toggleAutopay,
    ApiError,
} from "@/lib/api";
import AddPaymentMethodModal from "./AddPaymentMethodModal";

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function formatDateShort(dateString) {
    return new Date(dateString).toISOString().slice(0, 10);
}

function AccountIcon({ type, className = "h-5 w-5" }) {
    return type === "CARD" ? (
        <CreditCard className={className} />
    ) : (
        <Landmark className={className} />
    );
}

export default function PaymentsPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [autopayUpdating, setAutopayUpdating] = useState(false);

    function load() {
        setLoading(true);
        getPaymentsSummary()
            .then((res) => setData(res))
            .catch((err) => {
                setError(err instanceof ApiError ? err.message : "Couldn't load your payments.");
            })
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        load();
    }, []);

    async function handleToggleAutopay() {
        if (!data) return;
        const next = !data.autopay_enabled;
        setAutopayUpdating(true);
        setData((prev) => ({ ...prev, autopay_enabled: next }));
        try {
            await toggleAutopay(next);
        } catch (err) {
            setData((prev) => ({ ...prev, autopay_enabled: !next }));
            alert(err instanceof ApiError ? err.message : "Couldn't update AutoPay.");
        } finally {
            setAutopayUpdating(false);
        }
    }

    async function handleSetDefault(id) {
        try {
            await setDefaultPaymentMethod(id);
            load();
        } catch (err) {
            alert(err instanceof ApiError ? err.message : "Couldn't set default account.");
        }
    }

    async function handleDelete(id) {
        if (!confirm("Remove this payment account?")) return;
        try {
            await deletePaymentMethod(id);
            load();
        } catch (err) {
            alert(err instanceof ApiError ? err.message : "Couldn't remove this account.");
        }
    }

    function handleExportCsv() {
        if (!data?.transactions?.length) return;
        const header = "Date,Description,Method,Amount,Status";
        const rows = data.transactions.map((tx) =>
            [formatDateShort(tx.date), tx.description, tx.method || "", tx.amount, tx.status]
                .map((field) => `"${String(field).replace(/"/g, '""')}"`)
                .join(",")
        );
        const csv = [header, ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "payment-history.csv";
        a.click();
        URL.revokeObjectURL(url);
    }

    if (loading) {
        return <p className="text-sm text-muted-foreground">Loading your payments…</p>;
    }

    if (error) {
        return (
            <div
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
                {error}
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Payments & Transfers</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Manage upcoming installments, linked payment accounts, and transaction records.
                    </p>
                </div>
                <Button
                    type="button"
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={() => alert("Payment processing isn't wired up yet — placeholder for now.")}
                >
                    Make a Payment
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Calendar className="h-4 w-4 text-accent" />
                            Next Due Installment
                        </div>
                        {data.next_due && (
                            <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
                Due {formatDate(data.next_due.due_date)}
              </span>
                        )}
                    </div>

                    {data.next_due ? (
                        <>
                            <p className="mt-3 text-3xl font-bold text-accent">
                                {formatCurrency(data.next_due.amount)}
                                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  for {data.next_due.active_loan_count} active micro-loan
                                    {data.next_due.active_loan_count === 1 ? "" : "s"}
                </span>
                            </p>
                            <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
                <span className="text-muted-foreground">
                  Auto-Debit Account:{" "}
                    <span className="font-semibold text-foreground">
                    {data.default_payment_method || "None linked"}
                  </span>
                </span>
                            </div>
                        </>
                    ) : (
                        <p className="mt-3 text-sm text-muted-foreground">No upcoming payments due.</p>
                    )}
                </div>

                <div className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Clock className="h-4 w-4 text-foreground" />
                            Automated Recurring AutoPay
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={data.autopay_enabled}
                            onClick={handleToggleAutopay}
                            disabled={autopayUpdating}
                            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                                data.autopay_enabled ? "bg-accent" : "bg-secondary"
                            }`}
                        >
              <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      data.autopay_enabled ? "translate-x-5" : "translate-x-0.5"
                  }`}
              />
                        </button>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                        {data.autopay_enabled
                            ? "AutoPay is active. Installments will be debited from your default account automatically."
                            : "AutoPay is off. You'll need to make payments manually."}
                    </p>
                </div>
            </div>

            <section>
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-foreground">Linked Payment Accounts</h2>
                    <button
                        type="button"
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-1 text-sm font-semibold text-accent hover:underline"
                    >
                        <Plus className="h-4 w-4" />
                        Link New Bank Account
                    </button>
                </div>

                {data.payment_methods.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No payment accounts linked yet.</p>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {data.payment_methods.map((pm) => (
                            <div key={pm.id} className="rounded-2xl border border-border bg-card p-5">
                                <div className="flex items-start justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-foreground">
                    <AccountIcon type={pm.type} />
                  </span>
                                    <div className="flex items-center gap-2">
                                        {pm.is_default && (
                                            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground">
                        Primary Default
                      </span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(pm.id)}
                                            aria-label="Remove account"
                                            className="text-muted-foreground hover:text-destructive"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <p className="mt-4 font-semibold text-foreground">{pm.institution_name}</p>
                                <p className="mt-1 text-sm text-muted-foreground">•••• •••• •••• {pm.last_four}</p>
                                {!pm.is_default && (
                                    <button
                                        type="button"
                                        onClick={() => handleSetDefault(pm.id)}
                                        className="mt-3 text-xs font-semibold text-accent hover:underline"
                                    >
                                        Set as default
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section>
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-foreground">Complete Payment History</h2>
                    <button
                        type="button"
                        onClick={handleExportCsv}
                        className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
                    >
                        <Download className="h-3.5 w-3.5" />
                        Export CSV
                    </button>
                </div>

                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                    {data.transactions.length === 0 ? (
                        <p className="p-6 text-center text-sm text-muted-foreground">No transactions yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                <tr className="border-b border-border bg-secondary/60 text-left text-xs text-muted-foreground">
                                    <th className="whitespace-nowrap px-5 py-3 font-medium">Date</th>
                                    <th className="px-5 py-3 font-medium">Description</th>
                                    <th className="whitespace-nowrap px-5 py-3 font-medium">Method</th>
                                    <th className="whitespace-nowrap px-5 py-3 text-right font-medium">Amount</th>
                                    <th className="whitespace-nowrap px-5 py-3 text-right font-medium">Status</th>
                                </tr>
                                </thead>
                                <tbody>
                                {data.transactions.map((tx) => (
                                    <tr key={tx.id} className="border-b border-border last:border-0">
                                        <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                                            {formatDateShort(tx.date)}
                                        </td>
                                        <td className="px-5 py-3 font-medium text-foreground">{tx.description}</td>
                                        <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                                            {tx.method || "—"}
                                        </td>
                                        <td
                                            className={`whitespace-nowrap px-5 py-3 text-right font-medium ${
                                                tx.amount < 0 ? "text-foreground" : "text-accent"
                                            }`}
                                        >
                                            {tx.amount < 0 ? "-" : "+"}
                                            {formatCurrency(Math.abs(tx.amount))}
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-3 text-right">
                        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground">
                          {tx.status}
                        </span>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>

            {showAddModal && (
                <AddPaymentMethodModal
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        load();
                    }}
                />
            )}
        </div>
    );
}