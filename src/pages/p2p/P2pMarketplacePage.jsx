import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PlusCircle, Shield, X, Send, CheckCircle2, BellRing, MessageSquare, Edit3, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getToken } from "@/lib/authToken.js";
import ChatModal from "./ChatModal.jsx";
import RequestLoanModal from "../loans/RequestLoanModal.jsx";

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(amount);
}

// Helper to format numbers with commas while typing (e.g., 10,000)
function formatNumberInput(value) {
  if (!value && value !== 0) return "";
  const raw = value.toString().replace(/,/g, "").replace(/\D/g, "");
  if (!raw) return "";
  return new Intl.NumberFormat("en-US").format(Number(raw));
}

// Helper to strip commas before saving/submitting
function parseNumberInput(formattedValue) {
  if (!formattedValue) return "";
  return formattedValue.toString().replace(/,/g, "");
}

function getCurrentUserId() {
  const token = getToken();
  if (!token) return null;
  try {
    const base64Payload = token.split('.')[1];
    const payload = JSON.parse(atob(base64Payload));
    return payload.id || payload.userId;
  } catch (err) {
    return null;
  }
}

export default function P2pMarketplacePage() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "marketplace";
  const [activeTab, setActiveTab] = useState(initialTab);

  const [offers, setOffers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [borrowerApplications, setBorrowerApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);

  const [activeChat, setActiveChat] = useState(null);

  const [amountAvailable, setAmountAvailable] = useState("");
  const [interestRate, setInterestRate] = useState("5");
  const [termMonths, setTermMonths] = useState("6");
  const [borrowAmount, setBorrowAmount] = useState("");

  const [editAmount, setEditAmount] = useState("");
  const [editInterest, setEditInterest] = useState("");
  const [editTerm, setEditTerm] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notification, setNotification] = useState(null);

  const currentUserId = getCurrentUserId();

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const ws = new WebSocket(`ws://localhost:3000?token=${token}`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (["new_application", "loan_approved", "loan_rejected"].includes(data.type)) {
          setNotification(data);
          loadData();
          setTimeout(() => setNotification(null), 6000);
        }
        if (data.type === "marketplace_update") {
          loadData();
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message", err);
      }
    };

    return () => ws.close();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${getToken()}` };

      if (activeTab === "marketplace") {
        const res = await fetch("/api/p2p/marketplace", { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load marketplace.");

        const currentUserIdNum = currentUserId ? Number(currentUserId) : null;
        const sortedOffers = data.sort((a, b) => {
          const aId = Number(a.user_id || a.lender_id || a.lender?.id);
          const bId = Number(b.user_id || b.lender_id || b.lender?.id);
          const aIsMine = aId === currentUserIdNum;
          const bIsMine = bId === currentUserIdNum;
          if (aIsMine && !bIsMine) return -1;
          if (!aIsMine && bIsMine) return 1;
          return 0;
        });
        setOffers(sortedOffers);
      } else if (activeTab === "incoming") {
        const res = await fetch("/api/p2p/applications", { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load applications.");
        setApplications(data);
      } else if (activeTab === "my-applications") {
        const res = await fetch("/api/p2p/borrower-applications", { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load your applications.");
        setBorrowerApplications(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function handleCreateOffer(e) {
    e.preventDefault();
    setActionError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/p2p/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ amount_available: parseFloat(parseNumberInput(amountAvailable)), interest_rate: parseFloat(interestRate), term_months: parseInt(termMonths) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to publish offer.");

      setShowCreateModal(false);
      setAmountAvailable("");
      loadData();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditOffer(e) {
    e.preventDefault();
    setActionError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/p2p/offer/${selectedOffer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ amount_available: parseFloat(parseNumberInput(editAmount)), interest_rate: parseFloat(editInterest), term_months: parseInt(editTerm) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update offer.");

      setShowEditModal(false);
      setSelectedOffer(null);
      loadData();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteOffer(offerId) {
    if (!window.confirm("Are you sure you want to delete this offer?")) return;
    setError("");
    try {
      const res = await fetch(`/api/p2p/offer/${offerId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete offer.");
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCancelApplication(appId) {
    if (!window.confirm("Are you sure you want to cancel this loan application?")) return;
    setError("");
    try {
      const res = await fetch(`/api/p2p/applications/${appId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel application.");
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleApply(e) {
    e.preventDefault();
    setActionError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/p2p/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ offer_id: selectedOffer.id, amount: parseFloat(parseNumberInput(borrowAmount)) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to apply to offer.");

      setShowApplyModal(false);
      setBorrowAmount("");
      setSelectedOffer(null);
      loadData();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove(applicationId) {
    if (!window.confirm("Are you sure you want to approve this application?")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/p2p/applications/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ application_id: applicationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve application.");
      loadData();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  async function handleReject(applicationId) {
    if (!window.confirm("Are you sure you want to reject this application?")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/p2p/applications/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ application_id: applicationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject application.");
      loadData();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
      <div className="relative space-y-8">
        {notification && (
            <div className="fixed top-4 right-4 z-50 flex items-start gap-3 rounded-xl bg-primary px-4 py-3 text-primary-foreground shadow-xl animate-in slide-in-from-top-5">
              <BellRing className="mt-0.5 h-5 w-5" />
              <div>
                <p className="font-bold">{notification.title}</p>
                <p className="text-sm">{notification.message}</p>
              </div>
              <button onClick={() => setNotification(null)} className="ml-4 opacity-70 hover:opacity-100">
                <X className="h-4 w-4" />
              </button>
            </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">P2P Lending</h1>
            <div className="mt-4 flex gap-4 border-b border-border pb-1">
              <button className={`text-sm font-medium pb-2 ${activeTab === "marketplace" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setActiveTab("marketplace")}>Marketplace</button>
              <button className={`text-sm font-medium pb-2 ${activeTab === "my-applications" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setActiveTab("my-applications")}>My Applications</button>
              <button className={`text-sm font-medium pb-2 ${activeTab === "incoming" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setActiveTab("incoming")}>Incoming Applications</button>
            </div>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" /> Create Lending Offer
          </Button>
        </div>

        {error && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

        {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
        ) : activeTab === "marketplace" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {offers.length === 0 && <p className="text-sm text-muted-foreground col-span-full">No active offers available right now.</p>}
              {offers.map((offer) => {
                const lenderId = Number(offer.user_id || offer.lender_id || offer.lender?.id);
                const isMyOffer = lenderId === Number(currentUserId);
                const hasActiveApps = offer.applications && offer.applications.some(app => ['PENDING', 'APPROVED', 'ACTIVE'].includes(app.status));

                return (
                    <div key={offer.id} className="rounded-2xl border border-border bg-card p-5 flex flex-col justify-between">
                      <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Lender: {isMyOffer ? "You" : `${offer.lender?.first_name} ${offer.lender?.last_name?.[0]}.`}
                  </span>
                        <p className="mt-3 text-2xl font-bold text-foreground">{formatCurrency(offer.amount_available)} <span className="text-xs font-normal text-muted-foreground">Available</span></p>
                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-md bg-secondary/50 p-2"><span className="text-muted-foreground block">Interest Rate</span><span className="font-semibold text-foreground">{offer.interest_rate}% APR</span></div>
                          <div className="rounded-md bg-secondary/50 p-2"><span className="text-muted-foreground block">Term</span><span className="font-semibold text-foreground">{offer.term_months} Months</span></div>
                        </div>
                      </div>

                      <div className="mt-6 space-y-2">
                        {!isMyOffer && (
                            <Button className="w-full flex items-center gap-2" size="sm" onClick={() => { setSelectedOffer(offer); setShowApplyModal(true); }}>
                              <Send className="h-4 w-4" /> Apply for Loan
                            </Button>
                        )}

                        {isMyOffer ? (
                            <div className="flex flex-col gap-2">
                              <Button
                                  variant="outline"
                                  className={`w-full flex items-center justify-center gap-2 ${hasActiveApps ? "opacity-50 cursor-not-allowed bg-secondary/30" : ""}`}
                                  size="sm"
                                  disabled={hasActiveApps}
                                  onClick={() => {
                                    setSelectedOffer(offer);
                                    setEditAmount(offer.amount_available);
                                    setEditInterest(offer.interest_rate);
                                    setEditTerm(offer.term_months);
                                    setShowEditModal(true);
                                  }}
                              >
                                <Edit3 className={`h-4 w-4 ${hasActiveApps ? "text-muted-foreground" : "text-accent"}`} /> Edit Offer
                              </Button>
                              <Button
                                  variant="outline"
                                  className={`w-full flex items-center justify-center gap-2 ${hasActiveApps ? "opacity-50 cursor-not-allowed text-muted-foreground bg-secondary/30" : "text-destructive hover:bg-destructive/10"}`}
                                  size="sm"
                                  disabled={hasActiveApps}
                                  onClick={() => handleDeleteOffer(offer.id)}
                              >
                                Delete Offer
                              </Button>
                            </div>
                        ) : (
                            <Button variant="outline" className="w-full flex items-center gap-2" size="sm" onClick={() => setActiveChat({
                              id: lenderId,
                              name: offer.lender ? `${offer.lender.first_name} ${offer.lender.last_name}` : "Lender",
                              loanDetails: { amount: offer.amount_available, interest: offer.interest_rate, term: offer.term_months }
                            })}>
                              <MessageSquare className="h-4 w-4 text-accent" /> Chat with Lender
                            </Button>
                        )}
                      </div>
                    </div>
                );
              })}
            </div>
        ) : activeTab === "my-applications" ? (
            <div className="space-y-4">
              {borrowerApplications.length === 0 && <p className="text-sm text-muted-foreground">You have no pending or active loan applications.</p>}
              {borrowerApplications.map((app) => {
                const lenderId = Number(app.offer?.lender?.id || app.offer?.user_id || app.offer?.lender_id);
                return (
                    <div key={app.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Lender: {app.offer.lender.first_name} {app.offer.lender.last_name}</p>
                        <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Applied Amount: <strong className="text-foreground">{formatCurrency(app.amount)}</strong></span>
                          <span>Terms: {app.offer.interest_rate}% / {app.offer.term_months} Months</span>
                          <span>Status: <strong className={`uppercase ${app.status === 'PENDING' ? 'text-amber-500' : app.status === 'APPROVED' ? 'text-emerald-500' : 'text-destructive'}`}>{app.status}</strong></span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setActiveChat({
                          id: lenderId,
                          name: `${app.offer.lender.first_name} ${app.offer.lender.last_name}`,
                          loanDetails: { amount: app.amount, interest: app.offer.interest_rate, term: app.offer.term_months }
                        })}>
                          <MessageSquare className="h-4 w-4 text-accent" /> Chat
                        </Button>
                        {app.status === 'PENDING' && (
                            <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 flex items-center gap-1.5" onClick={() => handleCancelApplication(app.id)}>
                              <Trash2 className="h-4 w-4" /> Cancel Application
                            </Button>
                        )}
                      </div>
                    </div>
                );
              })}
            </div>
        ) : (
            <div className="space-y-4">
              {applications.length === 0 && <p className="text-sm text-muted-foreground">You have no incoming applications for your offers.</p>}
              {applications.map((app) => {
                const borrowerId = Number(app.borrower_id || app.borrower?.id);
                return (
                    <div key={app.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Borrower: {app.borrower.first_name} {app.borrower.last_name}</p>
                        <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Score: {app.borrower.credit_score}</span>
                          <span>Requested: <strong className="text-foreground">{formatCurrency(app.amount)}</strong></span>
                          <span>From Offer Terms: {app.offer.interest_rate}% / {app.offer.term_months} Months</span>
                          <span>Status: <strong className="uppercase text-amber-500">{app.status}</strong></span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setActiveChat({
                          id: borrowerId,
                          name: app.borrower ? `${app.borrower.first_name} ${app.borrower.last_name}` : "Borrower",
                          loanDetails: { amount: app.amount, interest: app.offer.interest_rate, term: app.offer.term_months }
                        })}>
                          <MessageSquare className="h-4 w-4 text-accent" /> Chat
                        </Button>
                        {app.status === 'PENDING' && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleReject(app.id)} className="text-destructive hover:bg-destructive/10 flex items-center gap-1">
                                <XCircle className="h-4 w-4" /> Reject
                              </Button>
                              <Button size="sm" onClick={() => handleApprove(app.id)} className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4" /> Approve
                              </Button>
                            </>
                        )}
                      </div>
                    </div>
                );
              })}
            </div>
        )}

        {activeChat && (
            <ChatModal
                recipientId={activeChat.id}
                recipientName={activeChat.name}
                loanDetails={activeChat.loanDetails}
                onClose={() => setActiveChat(null)}
            />
        )}

        {/* Edit Offer Modal */}
        {showEditModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
                <div className="flex items-start justify-between">
                  <h2 className="text-xl font-bold text-foreground">Edit Lending Offer</h2>
                  <button onClick={() => setShowEditModal(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
                </div>
                <form onSubmit={handleEditOffer} className="mt-4 space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Amount Available (₱)</label>
                    <input
                        type="text"
                        value={formatNumberInput(editAmount)}
                        onChange={(e) => setEditAmount(parseNumberInput(e.target.value))}
                        className="mt-1 h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm text-foreground outline-none"
                        required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold uppercase text-muted-foreground">Interest Rate (%)</label>
                      <input type="number" step="0.1" value={editInterest} onChange={(e) => setEditInterest(e.target.value)} className="mt-1 h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm text-foreground outline-none" required />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-muted-foreground">Term (Months)</label>
                      <input type="number" value={editTerm} onChange={(e) => setEditTerm(e.target.value)} className="mt-1 h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm text-foreground outline-none" required />
                    </div>
                  </div>
                  {actionError && <p className="text-xs text-destructive">{actionError}</p>}
                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setShowEditModal(false)}>Cancel</Button>
                    <Button type="submit" className="flex-1" disabled={submitting}>{submitting ? "Saving..." : "Save Changes"}</Button>
                  </div>
                </form>
              </div>
            </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
                <div className="flex items-start justify-between">
                  <h2 className="text-xl font-bold text-foreground">Publish Lending Offer</h2>
                  <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
                </div>
                <form onSubmit={handleCreateOffer} className="mt-4 space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Amount Available (₱)</label>
                    <input
                        type="text"
                        value={formatNumberInput(amountAvailable)}
                        onChange={(e) => setAmountAvailable(parseNumberInput(e.target.value))}
                        placeholder="1,000"
                        className="mt-1 h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm text-foreground outline-none"
                        required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold uppercase text-muted-foreground">Interest Rate (%)</label>
                      <input type="number" step="0.1" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} className="mt-1 h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm text-foreground outline-none" required />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-muted-foreground">Term (Months)</label>
                      <input type="number" value={termMonths} onChange={(e) => setTermMonths(e.target.value)} className="mt-1 h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm text-foreground outline-none" required />
                    </div>
                  </div>
                  {actionError && <p className="text-xs text-destructive">{actionError}</p>}
                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                    <Button type="submit" className="flex-1" disabled={submitting}>{submitting ? "Publishing..." : "Publish Offer"}</Button>
                  </div>
                </form>
              </div>
            </div>
        )}

        {/* Apply Modal */}
        {showApplyModal && selectedOffer && (
            <RequestLoanModal
                offer={selectedOffer}
                onClose={() => {
                  setShowApplyModal(false);
                  setSelectedOffer(null);
                }}
                onSuccess={() => {
                  setShowApplyModal(false);
                  setSelectedOffer(null);
                  loadData();
                }}
            />
        )}
      </div>
  );
}