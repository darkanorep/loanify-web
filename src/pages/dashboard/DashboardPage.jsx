import { useEffect, useState } from "react";
import { TrendingUp, HandCoins, Calendar } from "lucide-react";

import {
  getDashboardSummary,
  getProfile,
  getPaymentsSummary,
  ApiError,
} from "@/lib/api";
import RequestLoanModal from "../loans/RequestLoanModal.jsx";
import MakePaymentModal from "../payments/MakePaymentModal.jsx";

const MONTH_LABELS = {
  "01": "Jan",
  "02": "Feb",
  "03": "Mar",
  "04": "Apr",
  "05": "May",
  "06": "Jun",
  "07": "Jul",
  "08": "Aug",
  "09": "Sep",
  10: "Oct",
  11: "Nov",
  12: "Dec",
};

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
}

function formatMonthLabel(monthKey) {
  const [, month] = monthKey.split("-");
  return MONTH_LABELS[month] || monthKey;
}

function formatShortDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function OverviewCard({ label, icon: Icon, children }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-accent" />
      </div>
      {children}
    </div>
  );
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "repayments", label: "Repayments" },
  { key: "disbursements", label: "Disbursements" },
];

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [paymentData, setPaymentData] = useState({
    active_loans: [],
    payment_methods: [],
  });
  const [userName, setUserName] = useState("User");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  // Pagination state for transactions table
  const [txPage, setTxPage] = useState(1);
  const [txPageSize, setTxPageSize] = useState(5);

  // Modal states
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);

  function loadDashboardData() {
    Promise.all([getDashboardSummary(), getProfile(), getPaymentsSummary()])
      .then(([summaryRes, profileRes, paymentsRes]) => {
        setData(summaryRes);
        setPaymentData(paymentsRes);
        if (profileRes?.full_name) {
          const firstName = profileRes.full_name.trim().split(" ")[0];
          setUserName(firstName);
        }
      })
      .catch((err) => {
        setError(
          err instanceof ApiError
            ? err.message
            : "Couldn't load your dashboard. Please check your connection.",
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Loading your dashboard…</p>
    );
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

  const maxRepayment = Math.max(
    ...(data?.repayment_progress?.map((m) => m.total_paid) || [1]),
    1,
  );

  const filteredTransactions = (data?.recent_transactions || []).filter(
    (tx) => {
      if (filter === "repayments") return tx.type === "REPAYMENT";
      if (filter === "disbursements") return tx.type === "DISBURSEMENT";
      return true;
    },
  );

  const totalTxPages = Math.ceil(filteredTransactions.length / txPageSize) || 1;
  const paginatedTransactions = filteredTransactions.slice(
    (txPage - 1) * txPageSize,
    txPage * txPageSize,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          Micro-Lending User Dashboard
        </h1>
        <p className="text-sm font-medium text-foreground">
          Welcome back, <span className="font-bold">{userName}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              Financial Overview
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <OverviewCard label="Current Balance" icon={TrendingUp}>
                <p className="mt-2 text-2xl font-bold text-accent">
                  {formatCurrency(data.current_balance)}
                </p>
              </OverviewCard>

              <OverviewCard label="Active Loans" icon={HandCoins}>
                <p className="mt-2 text-2xl font-bold text-accent">
                  {data.active_loans}
                </p>
              </OverviewCard>

              <OverviewCard label="Next Payment" icon={Calendar}>
                {data.next_payment ? (
                  <p className="mt-2 text-xl font-bold text-accent">
                    {formatCurrency(data.next_payment.amount)}{" "}
                    <span className="text-xs font-normal text-muted-foreground block">
                      on {formatShortDate(data.next_payment.due_date)}
                    </span>
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    No upcoming payments
                  </p>
                )}
              </OverviewCard>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Repayment Progress
              </h2>
              <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground bg-card">
                FY 2022 - 2023
              </span>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              {!data.repayment_progress ||
              data.repayment_progress.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No repayments recorded yet.
                </p>
              ) : (
                <div className="relative pt-10">
                  {/* Background grid lines ($0, $2,500, $5,000, $7,500, $10,000) */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 pt-10">
                    {[10000, 7500, 5000, 2500, 0].map((val, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 w-full border-b border-border/60 last:border-0"
                      >
                        <span className="text-[11px] text-muted-foreground w-10 text-right">
                          {formatCurrency(val).replace(".00", "")}
                        </span>
                        <span className="flex-1" />
                      </div>
                    ))}
                  </div>

                  {/* Bars Container */}
                  <div className="relative flex h-48 items-end gap-3 pl-12 pr-2">
                    {data.repayment_progress.map((m, idx) => {
                      const heightPercent = Math.max(
                        (m.total_paid / maxRepayment) * 100,
                        6,
                      );
                      return (
                        <div
                          key={idx}
                          className="group relative flex h-full flex-1 items-end justify-center"
                        >
                          {/* Hover Tooltip Popover */}
                          <div className="absolute -top-12 z-20 hidden flex-col items-center group-hover:flex">
                            <div className="rounded-xl bg-primary px-3 py-2 text-center text-primary-foreground shadow-xl">
                              <p className="text-[10px] uppercase tracking-wider text-primary-foreground/70">
                                Total paid
                              </p>
                              <p className="text-sm font-bold text-white">
                                {formatCurrency(m.total_paid)}
                              </p>
                              <p className="text-[10px] text-primary-foreground/60">
                                {formatMonthLabel(m.month)} repaid
                              </p>
                            </div>
                            <div className="h-2 w-2 rotate-45 bg-primary -mt-1" />
                          </div>

                          {/* Bar Element */}
                          <div
                            className="w-full max-w-[40px] rounded-t-md bg-accent/90 hover:bg-accent transition-all cursor-pointer shadow-sm"
                            style={{ height: `${heightPercent}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* X-Axis Labels */}
                  <div className="mt-3 flex gap-3 pl-12 pr-2 border-t border-border pt-2">
                    {data.repayment_progress.map((m, idx) => (
                      <span
                        key={idx}
                        className="flex-1 text-center text-xs text-muted-foreground font-medium truncate"
                      >
                        {formatMonthLabel(m.month)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-foreground">
                Recent Transactions
              </h2>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>Show:</span>
                  <select
                    value={txPageSize}
                    onChange={(e) => {
                      setTxPageSize(Number(e.target.value));
                      setTxPage(1);
                    }}
                    className="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground outline-none"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  {FILTERS.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => {
                        setFilter(tab.key);
                        setTxPage(1);
                      }}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        filter === tab.key
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              {filteredTransactions.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  No transactions yet.
                </p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs text-muted-foreground">
                          <th className="whitespace-nowrap px-5 py-3 font-medium">
                            Date
                          </th>
                          <th className="px-5 py-3 font-medium">Description</th>
                          <th className="whitespace-nowrap px-5 py-3 text-right font-medium">
                            Amount
                          </th>
                          <th className="whitespace-nowrap px-5 py-3 text-right font-medium">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedTransactions.map((tx) => (
                          <tr
                            key={tx.id}
                            className="border-b border-border last:border-0"
                          >
                            <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                              {formatShortDate(tx.date)}
                            </td>
                            <td className="px-5 py-3">
                              <span className="font-medium text-foreground">
                                {tx.description}
                              </span>
                              {tx.purpose && (
                                <span className="text-muted-foreground">
                                  {" "}
                                  · {tx.purpose}
                                </span>
                              )}
                            </td>
                            <td
                              className={`whitespace-nowrap px-5 py-3 text-right font-medium ${
                                tx.amount < 0
                                  ? "text-foreground"
                                  : "text-accent"
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

                  <div className="flex items-center justify-between border-t border-border px-5 py-3 text-sm">
                    <span className="text-xs text-muted-foreground">
                      Showing {(txPage - 1) * txPageSize + 1}–
                      {Math.min(
                        txPage * txPageSize,
                        filteredTransactions.length,
                      )}{" "}
                      of {filteredTransactions.length}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={txPage === 1}
                        onClick={() => setTxPage((p) => p - 1)}
                        className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={txPage >= totalTxPages}
                        onClick={() => setTxPage((p) => p + 1)}
                        className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              Quick Actions
            </h2>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowRequestModal(true)}
                className="w-full rounded-full border border-accent/40 bg-card py-3.5 text-center text-sm font-semibold text-accent shadow-sm hover:bg-secondary/50 transition-colors"
              >
                Request New Loan
              </button>
              <button
                type="button"
                onClick={() => setShowPayModal(true)}
                className="w-full rounded-full border border-accent/40 bg-card py-3.5 text-center text-sm font-semibold text-accent shadow-sm hover:bg-secondary/50 transition-colors"
              >
                Make a Payment
              </button>
            </div>
          </section>

          <div className="rounded-2xl border border-border bg-card p-5 relative overflow-hidden shadow-sm">
            <div className="absolute top-4 right-4 h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Borrower Assistance
            </p>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Need a customized repayment plan or seasonal payment freeze? Chat
              with our micro-lending specialists anytime.
            </p>
            <div className="mt-4 space-y-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={() =>
                  alert("Loan Payoff Calculator tool modal coming soon.")
                }
                className="flex w-full items-center justify-between text-xs font-semibold text-foreground hover:text-accent transition-colors"
              >
                <span className="flex items-center gap-2">
                  📄 Loan Payoff Calculator
                </span>
                <span>→</span>
              </button>
              <button
                type="button"
                onClick={() => alert("Tax statement download started.")}
                className="flex w-full items-center justify-between text-xs font-semibold text-foreground hover:text-accent transition-colors pt-1"
              >
                <span className="flex items-center gap-2">
                  📄 Download Tax Statement
                </span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showRequestModal && (
        <RequestLoanModal
          onClose={() => setShowRequestModal(false)}
          onSuccess={() => {
            setShowRequestModal(false);
            loadDashboardData();
          }}
        />
      )}

      {showPayModal && (
        <MakePaymentModal
          loans={paymentData.active_loans}
          paymentMethods={paymentData.payment_methods}
          preselectedLoanId={data.next_payment?.loan_id}
          onClose={() => setShowPayModal(false)}
          onSuccess={() => {
            setShowPayModal(false);
            loadDashboardData();
          }}
        />
      )}
    </div>
  );
}
