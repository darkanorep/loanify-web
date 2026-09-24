import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PlusCircle, Shield, X, Send, CheckCircle2, BellRing, MessageSquare, Edit3, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getToken } from "@/lib/authToken.js";
import ChatModal from "./ChatModal.jsx";
import RequestLoanModal from "../loans/RequestLoanModal.jsx";

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(amount || 0);
}

function formatNumberInput(value) {
  if (!value && value !== 0) return "";
  const raw = value.toString().replace(/,/g, "").replace(/\D/g, "");
  if (!raw) return "";
  return new Intl.NumberFormat("en-US").format(Number(raw));
}

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
  const [walletBalance, setWalletBalance] = useState(0);
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

  const [editAmount, setEditAmount] = useState("");
  const [editInterest, setEditInterest] = useState("");
  const [editTerm, setEditTerm] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notification, setNotification] = useState(null);
  const [confirmDirectPrompt, setConfirmDirectPrompt] = useState(null);
  const [confirmEditPrompt, setConfirmEditPrompt] = useState(null);

  const currentUserId = getCurrentUserId();

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    // Dynamically resolve protocol and host
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsHost = window.location.hostname;
    const ws = new WebSocket(`${wsProtocol}//${wsHost}:3000?token=${token}`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (["new_application", "loan_approved", "loan_rejected"].includes(data.type)) {
          setNotification(data);
          loadData();
          setTimeout(() => setNotification(null), 6000);
        }
        if (["marketplace_update", "p2p_application_approved", "p2p_offer_created"].includes(data.type)) {
          loadData();
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message", err);
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, "Component unmounted");
      } else if (ws.readyState === WebSocket.CONNECTING) {
        ws.onopen = () => ws.close(1000, "Component unmounted during connection");
      }
    };
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${getToken()}` };

      // Fetch User Wallet Overview to get live available_balance
      try {
        const walletRes = await fetch("/api/wallet/overview", { headers });
        if (walletRes.ok) {
          const walletData = await walletRes.json();
          setWalletBalance(Number(walletData.available_balance || 0));
        }
      } catch (wErr) {
        console.warn("Could not load wallet overview:", wErr);
      }

      if (activeTab === "marketplace" || activeTab === "my-offers") {
        const res = await fetch("/api/p2p/marketplace", { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load marketplace.");

        setOffers(data);
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

  async function handleCreateOffer(e, forceConfirm = false) {
    if (e) e.preventDefault();
    setActionError("");
    setSubmitting(true);
    try {
      const offerAmt = parseFloat(parseNumberInput(amountAvailable));
      const reqBody = {
        amount_available: offerAmt,
        interest_rate: parseFloat(interestRate),
        term_months: parseInt(termMonths),
        confirm_direct_funding: forceConfirm
      };

      // If client-side check detects shortfall and hasn't confirmed yet, show confirmation dialog
      if (!forceConfirm && offerAmt > walletBalance) {
        const difference = offerAmt - walletBalance;
        setConfirmDirectPrompt({
          required_difference: difference
        });
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/p2p/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(reqBody),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to publish offer.");

      // If backend requires confirmation
      if (data.requires_confirmation) {
        setConfirmDirectPrompt(data);
        setSubmitting(false);
        return;
      }

      setShowCreateModal(false);
      setConfirmDirectPrompt(null);
      setAmountAvailable("");
      loadData();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditOffer(e, forceConfirm = false) {
    if (e) e.preventDefault();
    setActionError("");
    setSubmitting(true);
    try {
      const newAmountVal = parseFloat(parseNumberInput(editAmount));
      const currentOfferVal = Number(selectedOffer.amount_available || 0);
      const amountDelta = newAmountVal - currentOfferVal;

      // Check client-side shortfall if increasing offer amount
      if (!forceConfirm && amountDelta > 0 && amountDelta > walletBalance) {
        const difference = amountDelta - walletBalance;
        setConfirmEditPrompt({
          required_difference: difference
        });
        setSubmitting(false);
        return;
      }

      const reqBody = {
        amount_available: newAmountVal,
        interest_rate: parseFloat(editInterest),
        term_months: parseInt(editTerm),
        confirm_direct_funding: forceConfirm
      };

      const res = await fetch(`/api/p2p/offer/${selectedOffer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(reqBody),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update offer.");

      if (data.requires_confirmation) {
        setConfirmEditPrompt(data);
        setSubmitting(false);
        return;
      }

      setShowEditModal(false);
      setConfirmEditPrompt(null);
      setSelectedOffer(null);

      // Re-fetch wallet overview & marketplace offers immediately
      await loadData();
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

  // Offer Filter Calculations
  const publicMarketplaceOffers = offers.filter(
      (offer) => Number(offer.amount_available) > 0 && offer.status !== "CLOSED"
  );

  const myLenderOffers = offers.filter(
      (offer) => Number(offer.user_id || offer.lender_id || offer.lender?.id) === Number(currentUserId)
  );

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
              <button className={`text-sm font-medium pb-2 cursor-pointer ${activeTab === "marketplace" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setActiveTab("marketplace")}>Marketplace ({publicMarketplaceOffers.length})</button>
              <button className={`text-sm font-medium pb-2 cursor-pointer ${activeTab === "my-offers" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setActiveTab("my-offers")}>My Offers ({myLenderOffers.length})</button>
              <button className={`text-sm font-medium pb-2 cursor-pointer ${activeTab === "my-applications" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setActiveTab("my-applications")}>My Applications</button>
              <button className={`text-sm font-medium pb-2 cursor-pointer ${activeTab === "incoming" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setActiveTab("incoming")}>Incoming Applications</button>
            </div>
          </div>
          <Button
              onClick={() => {
                loadData();
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" /> Create Lending Offer
          </Button>
        </div>

        {error && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

        {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
        ) : activeTab === "marketplace" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {publicMarketplaceOffers.length === 0 && <p className="text-sm text-muted-foreground col-span-full">No active offers available right now.</p>}
              {publicMarketplaceOffers.map((offer) => {
                const lenderId = Number(offer.user_id || offer.lender_id || offer.lender?.id);
                const isMyOffer = lenderId === Number(currentUserId);

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
                            <Button className="w-full flex items-center gap-2 cursor-pointer" size="sm" onClick={() => { setSelectedOffer(offer); setShowApplyModal(true); }}>
                              <Send className="h-4 w-4" /> Apply for Loan
                            </Button>
                        )}

                        {!isMyOffer && (
                            <Button variant="outline" className="w-full flex items-center gap-2 cursor-pointer" size="sm" onClick={() => setActiveChat({
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
        ) : activeTab === "my-offers" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myLenderOffers.length === 0 && <p className="text-sm text-muted-foreground col-span-full">You have not created any lending offers yet.</p>}
              {myLenderOffers.map((offer) => {
                const isClosed = offer.status === "CLOSED" || Number(offer.amount_available) <= 0;
                const hasActiveApps = offer.applications && offer.applications.some(app => app.status === 'PENDING');

                return (
                    <div key={offer.id} className="rounded-2xl border border-border bg-card p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lender: You</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isClosed ? "bg-secondary text-muted-foreground" : "bg-emerald-100 text-emerald-700"
                          }`}>
                            {isClosed ? "Closed / Fulfilled" : "Active"}
                          </span>
                        </div>
                        <p className="mt-3 text-2xl font-bold text-foreground">{formatCurrency(offer.amount_available)} <span className="text-xs font-normal text-muted-foreground">Available</span></p>
                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-md bg-secondary/50 p-2"><span className="text-muted-foreground block">Interest Rate</span><span className="font-semibold text-foreground">{offer.interest_rate}% APR</span></div>
                          <div className="rounded-md bg-secondary/50 p-2"><span className="text-muted-foreground block">Term</span><span className="font-semibold text-foreground">{offer.term_months} Months</span></div>
                        </div>
                      </div>

                      <div className="mt-6 flex flex-col gap-2">
                        <Button
                            variant="outline"
                            className={`w-full flex items-center justify-center gap-2 cursor-pointer ${hasActiveApps || isClosed ? "opacity-50 cursor-not-allowed bg-secondary/30" : ""}`}
                            size="sm"
                            disabled={hasActiveApps || isClosed}
                            onClick={() => {
                              setSelectedOffer(offer);
                              setEditAmount(offer.amount_available);
                              setEditInterest(offer.interest_rate);
                              setEditTerm(offer.term_months);
                              setShowEditModal(true);
                            }}
                        >
                          <Edit3 className={`h-4 w-4 ${hasActiveApps || isClosed ? "text-muted-foreground" : "text-accent"}`} /> Edit Offer
                        </Button>
                        <Button
                            variant="outline"
                            className={`w-full flex items-center justify-center gap-2 cursor-pointer ${hasActiveApps ? "opacity-50 cursor-not-allowed text-muted-foreground bg-secondary/30" : "text-destructive hover:bg-destructive/10"}`}
                            size="sm"
                            disabled={hasActiveApps}
                            onClick={() => handleDeleteOffer(offer.id)}
                        >
                          Delete Offer
                        </Button>
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
        {showEditModal && selectedOffer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
                <div className="flex items-start justify-between">
                  <h2 className="text-xl font-bold text-foreground">
                    {confirmEditPrompt ? "Confirm Direct Funding" : "Edit Lending Offer"}
                  </h2>
                  <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setConfirmEditPrompt(null);
                      }}
                      className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {confirmEditPrompt ? (
                    /* Direct Funding Confirmation Step */
                    <div className="mt-4 space-y-4">
                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                        <p className="font-bold text-sm">Additional Direct Funding Required</p>
                        <p>
                          Your wallet balance is <strong>{formatCurrency(walletBalance)}</strong>. Increasing this offer requires an automatic card top-up of <strong>{formatCurrency(confirmEditPrompt.required_difference)}</strong>.
                        </p>
                        <p className="opacity-80">Would you like to proceed with the payment top-up and update your offer?</p>
                      </div>

                      {actionError && <p className="text-xs text-destructive">{actionError}</p>}

                      <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setConfirmEditPrompt(null)}
                        >
                          Back
                        </Button>
                        <Button
                            type="button"
                            className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 cursor-pointer"
                            disabled={submitting}
                            onClick={() => handleEditOffer(null, true)}
                        >
                          {submitting ? "Processing..." : "Confirm & Save"}
                        </Button>
                      </div>
                    </div>
                ) : (
                    /* Standard Edit Form */
                    <form onSubmit={(e) => handleEditOffer(e, false)} className="mt-4 space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold uppercase text-muted-foreground">
                            Amount Available (₱)
                          </label>
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground">Available:</span>
                            <span className="font-bold text-foreground">{formatCurrency(walletBalance)}</span>
                          </div>
                        </div>

                        <input
                            type="text"
                            value={formatNumberInput(editAmount)}
                            onChange={(e) => setEditAmount(parseNumberInput(e.target.value))}
                            className="mt-1 h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm text-foreground outline-none focus:border-primary"
                            required
                        />

                        {parseFloat(parseNumberInput(editAmount) || 0) > Number(selectedOffer.amount_available) + walletBalance && (
                            <p className="mt-1.5 text-xs text-amber-600 font-medium">
                              Note: Increasing offer amount beyond available balance will trigger Direct Funding top-up.
                            </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-semibold uppercase text-muted-foreground">Interest Rate (%)</label>
                          <input type="number" step="0.1" value={editInterest} onChange={(e) => setEditInterest(e.target.value)} className="mt-1 h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm text-foreground outline-none focus:border-primary" required />
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase text-muted-foreground">Term (Months)</label>
                          <input type="number" value={editTerm} onChange={(e) => setEditTerm(e.target.value)} className="mt-1 h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm text-foreground outline-none focus:border-primary" required />
                        </div>
                      </div>

                      {actionError && <p className="text-xs text-destructive">{actionError}</p>}

                      <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" className="flex-1" onClick={() => setShowEditModal(false)}>Cancel</Button>
                        <Button type="submit" className="flex-1 cursor-pointer" disabled={submitting}>{submitting ? "Saving..." : "Save Changes"}</Button>
                      </div>
                    </form>
                )}
              </div>
            </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
                <div className="flex items-start justify-between">
                  <h2 className="text-xl font-bold text-foreground">
                    {confirmDirectPrompt ? "Confirm Direct Funding" : "Publish Lending Offer"}
                  </h2>
                  <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        setConfirmDirectPrompt(null);
                      }}
                      className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {confirmDirectPrompt ? (
                    /* Direct Funding Confirmation Prompt */
                    <div className="mt-4 space-y-4">
                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                        <p className="font-bold text-sm">Additional Direct Funding Required</p>
                        <p>
                          Your wallet balance is <strong>{formatCurrency(walletBalance)}</strong>. Publishing this <strong>{formatCurrency(parseFloat(parseNumberInput(amountAvailable)))}</strong> offer requires charging an additional <strong>{formatCurrency(confirmDirectPrompt.required_difference)}</strong> from your primary linked card.
                        </p>
                        <p className="opacity-80">Would you like to proceed with the automatic top-up and publish this offer?</p>
                      </div>

                      {actionError && <p className="text-xs text-destructive">{actionError}</p>}

                      <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setConfirmDirectPrompt(null)}
                        >
                          Back
                        </Button>
                        <Button
                            type="button"
                            className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                            disabled={submitting}
                            onClick={() => handleCreateOffer(null, true)}
                        >
                          {submitting ? "Processing..." : "Confirm & Publish"}
                        </Button>
                      </div>
                    </div>
                ) : (
                    /* Standard Offer Form */
                    <form onSubmit={(e) => handleCreateOffer(e, false)} className="mt-4 space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold uppercase text-muted-foreground">
                            Amount Available (₱)
                          </label>
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground">Available:</span>
                            <span className="font-bold text-foreground">{formatCurrency(walletBalance)}</span>
                            <button
                                type="button"
                                onClick={() => setAmountAvailable(walletBalance.toString())}
                                className="ml-1 text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 px-1.5 py-0.5 rounded hover:bg-accent/20 cursor-pointer"
                            >
                              Use Max
                            </button>
                          </div>
                        </div>

                        <input
                            type="text"
                            value={formatNumberInput(amountAvailable)}
                            onChange={(e) => setAmountAvailable(parseNumberInput(e.target.value))}
                            placeholder={walletBalance > 0 ? formatNumberInput(walletBalance) : "1,000"}
                            className="mt-1 h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm text-foreground outline-none focus:border-primary"
                            required
                        />

                        {parseFloat(parseNumberInput(amountAvailable) || 0) > walletBalance && (
                            <p className="mt-1.5 text-xs text-amber-600 font-medium">
                              Note: Exceeds current available balance. Direct Funding card top-up will be required upon publishing.
                            </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-semibold uppercase text-muted-foreground">Interest Rate (%)</label>
                          <input type="number" step="0.1" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} className="mt-1 h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm text-foreground outline-none focus:border-primary" required />
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase text-muted-foreground">Term (Months)</label>
                          <input type="number" value={termMonths} onChange={(e) => setTermMonths(e.target.value)} className="mt-1 h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm text-foreground outline-none focus:border-primary" required />
                        </div>
                      </div>

                      {actionError && <p className="text-xs text-destructive">{actionError}</p>}

                      <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                        <Button type="submit" className="flex-1" disabled={submitting}>{submitting ? "Processing..." : "Publish Offer"}</Button>
                      </div>
                    </form>
                )}
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