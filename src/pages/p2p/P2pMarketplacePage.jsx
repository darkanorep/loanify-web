import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PlusCircle, Shield, X, Send, CheckCircle2, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getToken } from "@/lib/authToken.js";

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(amount);
}

export default function P2pMarketplacePage() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "marketplace";
  const [activeTab, setActiveTab] = useState(initialTab);

  const [offers, setOffers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);

  const [amountAvailable, setAmountAvailable] = useState("");
  const [interestRate, setInterestRate] = useState("5");
  const [termMonths, setTermMonths] = useState("6");
  const [borrowAmount, setBorrowAmount] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");


  // Real-time notification state
  const [notification, setNotification] = useState(null);
  const [notifications, setNotifications] = useState([]);

  // Initialize Native WebSocket Connection
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const ws = new WebSocket(`ws://localhost:3000?token=${token}`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Handle notifications for lenders or borrowers
        if (data.type === "new_application" || data.type === "loan_approved" || data.type === "loan_rejected") {
          setNotification(data);
          loadData();
          setTimeout(() => setNotification(null), 6000);
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message", err);
      }
    };

    return () => ws.close();
  }, [activeTab]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const endpoint = activeTab === "marketplace" ? "/api/p2p/marketplace" : "/api/p2p/applications";
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to load data.");

      if (activeTab === "marketplace") {
        setOffers(data);
      } else {
        setApplications(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Fetch existing notifications on mount
  async function loadNotifications() {
    try {
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (res.ok) {
        setNotifications(data);
      }
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  }

  // Call it on component mount
  useEffect(() => {
    loadNotifications();
  }, []);

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
        body: JSON.stringify({ amount_available: parseFloat(amountAvailable), interest_rate: parseFloat(interestRate), term_months: parseInt(termMonths) }),
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

  async function handleApply(e) {
    e.preventDefault();
    setActionError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/p2p/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ offer_id: selectedOffer.id, amount: parseFloat(borrowAmount) }),
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

  return (
      <div className="relative space-y-8">

        {/* Real-time Notification Toast */}
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
              <button className={`text-sm font-medium pb-2 ${activeTab === "applications" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setActiveTab("applications")}>Incoming Applications</button>
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
              {offers.map((offer) => (
                  <div key={offer.id} className="rounded-2xl border border-border bg-card p-5 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lender: {offer.lender.first_name} {offer.lender.last_name?.[0]}.</span>
                      <p className="mt-3 text-2xl font-bold text-foreground">{formatCurrency(offer.amount_available)} <span className="text-xs font-normal text-muted-foreground">Available</span></p>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-md bg-secondary/50 p-2"><span className="text-muted-foreground block">Interest Rate</span><span className="font-semibold text-foreground">{offer.interest_rate}% APR</span></div>
                        <div className="rounded-md bg-secondary/50 p-2"><span className="text-muted-foreground block">Term</span><span className="font-semibold text-foreground">{offer.term_months} Months</span></div>
                      </div>
                    </div>
                    <Button className="mt-6 w-full flex items-center gap-2" size="sm" onClick={() => { setSelectedOffer(offer); setShowApplyModal(true); }}><Send className="h-4 w-4" /> Apply for Loan</Button>
                  </div>
              ))}
            </div>
        ) : (
            <div className="space-y-4">
              {applications.length === 0 && <p className="text-sm text-muted-foreground">You have no pending applications for your offers.</p>}
              {applications.map((app) => (
                  <div key={app.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Borrower: {app.borrower.first_name} {app.borrower.last_name}</p>
                      <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Score: {app.borrower.credit_score}</span>
                        <span>Requested: <strong className="text-foreground">{formatCurrency(app.amount)}</strong></span>
                        <span>From Offer Terms: {app.offer.interest_rate}% / {app.offer.term_months} Months</span>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleApprove(app.id)} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Approve</Button>
                  </div>
              ))}
            </div>
        )}

        {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
                <div className="flex items-start justify-between">
                  <h2 className="text-xl font-bold text-foreground">Publish Lending Offer</h2>
                  <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
                </div>
                <form onSubmit={handleCreateOffer} className="mt-4 space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Amount Available ($)</label>
                    <input type="number" value={amountAvailable} onChange={(e) => setAmountAvailable(e.target.value)} placeholder="1000" className="mt-1 h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm text-foreground outline-none" required />
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

        {showApplyModal && selectedOffer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
                <div className="flex items-start justify-between">
                  <h2 className="text-xl font-bold text-foreground">Apply to Lender Offer</h2>
                  <button onClick={() => setShowApplyModal(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
                </div>
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <p>Lender: <span className="font-semibold text-foreground">{selectedOffer.lender.first_name} {selectedOffer.lender.last_name}</span></p>
                  <p>Terms: <span className="font-semibold text-foreground">{selectedOffer.interest_rate}% APR for {selectedOffer.term_months} months</span></p>
                  <p>Max Available: <span className="font-semibold text-foreground">{formatCurrency(selectedOffer.amount_available)}</span></p>
                </div>
                <form onSubmit={handleApply} className="mt-4 space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Amount to Borrow ($)</label>
                    <input type="number" value={borrowAmount} onChange={(e) => setBorrowAmount(e.target.value)} placeholder="200" className="mt-1 h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm text-foreground outline-none" required />
                  </div>
                  {actionError && <p className="text-xs text-destructive">{actionError}</p>}
                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setShowApplyModal(false)}>Cancel</Button>
                    <Button type="submit" className="flex-1" disabled={submitting}>{submitting ? "Applying..." : "Submit Application"}</Button>
                  </div>
                </form>
              </div>
            </div>
        )}
      </div>
  );
}