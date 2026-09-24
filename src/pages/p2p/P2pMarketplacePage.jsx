import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PlusCircle, Shield, X, Send, CheckCircle2, MessageSquare, Edit3, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getToken } from "@/lib/authToken.js";
import ChatModal from "./ChatModal.jsx";
import RequestLoanModal from "../loans/RequestLoanModal.jsx";
import MyInvestments from "./MyInvestments.jsx";

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
  const [confirmDirectPrompt, setConfirmDirectPrompt] = useState(null);
  const [confirmEditPrompt, setConfirmEditPrompt] = useState(null);

  const currentUserId = getCurrentUserId();

  // Comprehensive Data Fetching for All Marketplace Entities
  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${getToken()}` };

      // Concurrently fetch all P2P marketplace datasets
      const [walletRes, offersRes, incomingRes, borrowerAppsRes] = await Promise.allSettled([
        fetch("/api/wallet/overview", { headers }),
        fetch("/api/p2p/marketplace", { headers }),
        fetch("/api/p2p/applications", { headers }),
        fetch("/api/p2p/borrower-applications", { headers })
      ]);

      if (walletRes.status === "fulfilled" && walletRes.value.ok) {
        const walletData = await walletRes.value.json();
        setWalletBalance(Number(walletData.available_balance || 0));
      }

      if (offersRes.status === "fulfilled" && offersRes.value.ok) {
        const offersData = await offersRes.value.json();
        setOffers(offersData);
      }

      if (incomingRes.status === "fulfilled" && incomingRes.value.ok) {
        const incomingData = await incomingRes.value.json();
        setApplications(incomingData);
      }

      if (borrowerAppsRes.status === "fulfilled" && borrowerAppsRes.value.ok) {
        const borrowerAppsData = await borrowerAppsRes.value.json();
        setBorrowerApplications(borrowerAppsData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // WebSocket Listener for Real-Time Background Sync
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsHost = window.location.hostname;
    const ws = new WebSocket(`${wsProtocol}//${wsHost}:3000?token=${token}`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (
            [
              "new_application",
              "loan_approved",
              "loan_rejected",
              "marketplace_update",
              "p2p_application_approved",
              "p2p_offer_created",
              "repayment_received",
              "autopay_success"
            ].includes(data.type)
        ) {
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

      if (!forceConfirm && offerAmt > walletBalance) {
        const difference = offerAmt - walletBalance;
        setConfirmDirectPrompt({ required_difference: difference });
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

      if (!forceConfirm && amountDelta > 0 && amountDelta > walletBalance) {
        const difference = amountDelta - walletBalance;
        setConfirmEditPrompt({ required_difference: difference });
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

  const publicMarketplaceOffers = offers.filter(
      (offer) => Number(offer.amount_available) > 0 && offer.status !== "CLOSED"
  );

  const myLenderOffers = offers.filter(
      (offer) => Number(offer.user_id || offer.lender_id || offer.lender?.id) === Number(currentUserId)
  );

  const pendingIncomingCount = applications.filter(a => a.status === 'PENDING').length;

  return (
      <div className="relative space-y-6">
        {/* Header Section */}
        <div className="space-y-3 pb-2">
          <div>
            <h1 className="text-3xl font-black text-[#0F2942] tracking-tight">P2P Lending</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Browse available lending offers, manage active investments, and approve incoming borrower applications.
            </p>
          </div>

          <div className="pt-1">
            <Button
                onClick={() => {
                  loadData();
                  setShowCreateModal(true);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[#0F2942] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#163a5d] transition-all cursor-pointer"
            >
              <PlusCircle className="h-4 w-4 text-white" /> Create lending offer
            </Button>
          </div>

          {/* Tab Bar Navigation */}
          <div className="flex gap-8 border-b border-slate-200/80 pt-3 text-sm font-semibold overflow-x-auto">
            <button
                className={`pb-3 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === "marketplace"
                        ? "border-[#0F2942] font-extrabold text-[#0F2942]"
                        : "border-transparent text-slate-500 hover:text-[#0F2942]"
                }`}
                onClick={() => setActiveTab("marketplace")}
            >
              Marketplace ({publicMarketplaceOffers.length})
            </button>

            <button
                className={`pb-3 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === "my-offers"
                        ? "border-[#0F2942] font-extrabold text-[#0F2942]"
                        : "border-transparent text-slate-500 hover:text-[#0F2942]"
                }`}
                onClick={() => setActiveTab("my-offers")}
            >
              My offers ({myLenderOffers.length})
            </button>

            <button
                className={`pb-3 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === "my-investments"
                        ? "border-[#0F2942] font-extrabold text-[#0F2942]"
                        : "border-transparent text-slate-500 hover:text-[#0F2942]"
                }`}
                onClick={() => setActiveTab("my-investments")}
            >
              My investments
            </button>

            <button
                className={`pb-3 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === "my-applications"
                        ? "border-[#0F2942] font-extrabold text-[#0F2942]"
                        : "border-transparent text-slate-500 hover:text-[#0F2942]"
                }`}
                onClick={() => setActiveTab("my-applications")}
            >
              My applications ({borrowerApplications.length})
            </button>

            <button
                className={`pb-3 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === "incoming"
                        ? "border-[#0F2942] font-extrabold text-[#0F2942]"
                        : "border-transparent text-slate-500 hover:text-[#0F2942]"
                }`}
                onClick={() => setActiveTab("incoming")}
            >
              Incoming applications ({pendingIncomingCount})
            </button>
          </div>
        </div>

        {error && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 font-medium">
              {error}
            </div>
        )}

        {/* Dynamic Content Views */}
        {activeTab === "my-investments" ? (
            <MyInvestments />
        ) : loading ? (
            <div className="py-12 text-center text-sm font-semibold text-slate-400">Loading marketplace data...</div>
        ) : activeTab === "marketplace" ? (
            publicMarketplaceOffers.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-[#faf8f5] py-16 px-6 text-center">
                  <h3 className="text-xl font-bold text-[#0F2942]">No offers in the marketplace</h3>
                  <p className="mt-2 text-sm text-slate-500 max-w-sm">
                    When lenders publish loan offers, they will appear here for you to apply.
                  </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {publicMarketplaceOffers.map((offer) => {
                    const lenderId = Number(offer.user_id || offer.lender_id || offer.lender?.id);
                    const isMyOffer = lenderId === Number(currentUserId);

                    return (
                        <div key={offer.id} className="rounded-2xl border border-slate-200/80 bg-white p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all">
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                              Lender: {isMyOffer ? "You" : `${offer.lender?.first_name} ${offer.lender?.last_name?.[0]}.`}
                            </span>
                            <p className="mt-2 text-2xl font-extrabold text-[#0F2942]">
                              {formatCurrency(offer.amount_available)} <span className="text-xs font-normal text-slate-500">Available</span>
                            </p>
                            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                              <div className="rounded-lg bg-[#faf8f5] p-2.5">
                                <span className="text-slate-400 block text-[10px] uppercase font-bold">Interest Rate</span>
                                <span className="font-bold text-[#0F2942]">{offer.interest_rate}% APR</span>
                              </div>
                              <div className="rounded-lg bg-[#faf8f5] p-2.5">
                                <span className="text-slate-400 block text-[10px] uppercase font-bold">Term</span>
                                <span className="font-bold text-[#0F2942]">{offer.term_months} Months</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-6 space-y-2">
                            {!isMyOffer && (
                                <Button className="w-full flex items-center gap-2 rounded-xl bg-[#0F2942] text-white hover:bg-[#163a5d] cursor-pointer" size="sm" onClick={() => { setSelectedOffer(offer); setShowApplyModal(true); }}>
                                  <Send className="h-4 w-4" /> Apply for Loan
                                </Button>
                            )}

                            {!isMyOffer && (
                                <Button variant="outline" className="w-full flex items-center gap-2 rounded-xl border-slate-200 text-[#0F2942] hover:bg-slate-50 cursor-pointer" size="sm" onClick={() => setActiveChat({
                                  id: lenderId,
                                  name: offer.lender ? `${offer.lender.first_name} ${offer.lender.last_name}` : "Lender",
                                  loanDetails: { amount: offer.amount_available, interest: offer.interest_rate, term: offer.term_months }
                                })}>
                                  <MessageSquare className="h-4 w-4 text-emerald-600" /> Chat with Lender
                                </Button>
                            )}
                          </div>
                        </div>
                    );
                  })}
                </div>
            )
        ) : activeTab === "my-offers" ? (
            myLenderOffers.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-[#faf8f5] py-16 px-6 text-center">
                  <h3 className="text-xl font-bold text-[#0F2942]">You have no active offers</h3>
                  <p className="mt-2 text-sm text-slate-500 max-w-sm">
                    Click the <strong>"Create lending offer"</strong> button above to start lending and earning yield.
                  </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {myLenderOffers.map((offer) => {
                    const isClosed = offer.status === "CLOSED" || Number(offer.amount_available) <= 0;
                    const hasActiveApps = offer.applications && offer.applications.some(app => app.status === 'PENDING');

                    return (
                        <div key={offer.id} className="rounded-2xl border border-slate-200/80 bg-white p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all">
                          <div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Lender: You</span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  isClosed ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-700"
                              }`}>
                                {isClosed ? "Closed / Fulfilled" : "Active"}
                              </span>
                            </div>
                            <p className="mt-2 text-2xl font-extrabold text-[#0F2942]">
                              {formatCurrency(offer.amount_available)} <span className="text-xs font-normal text-slate-500">Available</span>
                            </p>
                            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                              <div className="rounded-lg bg-[#faf8f5] p-2.5">
                                <span className="text-slate-400 block text-[10px] uppercase font-bold">Interest Rate</span>
                                <span className="font-bold text-[#0F2942]">{offer.interest_rate}% APR</span>
                              </div>
                              <div className="rounded-lg bg-[#faf8f5] p-2.5">
                                <span className="text-slate-400 block text-[10px] uppercase font-bold">Term</span>
                                <span className="font-bold text-[#0F2942]">{offer.term_months} Months</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-6 flex flex-col gap-2">
                            <Button
                                variant="outline"
                                className={`w-full flex items-center justify-center gap-2 rounded-xl cursor-pointer ${hasActiveApps || isClosed ? "opacity-50 cursor-not-allowed bg-slate-50" : "border-slate-200 hover:bg-slate-50 text-[#0F2942]"}`}
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
                              <Edit3 className={`h-4 w-4 ${hasActiveApps || isClosed ? "text-slate-400" : "text-emerald-600"}`} /> Edit Offer
                            </Button>
                            <Button
                                variant="outline"
                                className={`w-full flex items-center justify-center gap-2 rounded-xl cursor-pointer ${hasActiveApps ? "opacity-50 cursor-not-allowed text-slate-400 bg-slate-50" : "border-red-200 text-red-600 hover:bg-red-50"}`}
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
            )
        ) : activeTab === "my-applications" ? (
            <div className="space-y-4">
              {borrowerApplications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-[#faf8f5] py-16 px-6 text-center">
                    <h3 className="text-xl font-bold text-[#0F2942]">No loan applications</h3>
                    <p className="mt-2 text-sm text-slate-500 max-w-sm">
                      When you apply for offers in the marketplace, your application history will appear here.
                    </p>
                  </div>
              ) : (
                  borrowerApplications.map((app) => {
                    const lenderId = Number(app.offer?.lender?.id || app.offer?.user_id || app.offer?.lender_id);
                    return (
                        <div key={app.id} className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                          <div>
                            <p className="text-sm font-bold text-[#0F2942]">Lender: {app.offer?.lender?.first_name} {app.offer?.lender?.last_name}</p>
                            <div className="mt-1 flex items-center gap-4 text-xs text-slate-500">
                              <span>Applied Amount: <strong className="text-[#0F2942]">{formatCurrency(app.amount)}</strong></span>
                              <span>Terms: {app.offer?.interest_rate}% / {app.offer?.term_months} Months</span>
                              <span>Status: <strong className={`uppercase ${app.status === 'PENDING' ? 'text-amber-600' : app.status === 'APPROVED' ? 'text-emerald-600' : 'text-red-600'}`}>{app.status}</strong></span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="rounded-xl border-slate-200 text-[#0F2942]" onClick={() => setActiveChat({
                              id: lenderId,
                              name: `${app.offer?.lender?.first_name} ${app.offer?.lender?.last_name}`,
                              loanDetails: { amount: app.amount, interest: app.offer?.interest_rate, term: app.offer?.term_months }
                            })}>
                              <MessageSquare className="h-4 w-4 text-emerald-600" /> Chat
                            </Button>
                            {app.status === 'PENDING' && (
                                <Button variant="outline" size="sm" className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1.5" onClick={() => handleCancelApplication(app.id)}>
                                  <Trash2 className="h-4 w-4" /> Cancel Application
                                </Button>
                            )}
                          </div>
                        </div>
                    );
                  })
              )}
            </div>
        ) : (
            <div className="space-y-4">
              {applications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-[#faf8f5] py-16 px-6 text-center">
                    <h3 className="text-xl font-bold text-[#0F2942]">No incoming applications</h3>
                    <p className="mt-2 text-sm text-slate-500 max-w-sm">
                      Borrower loan requests submitted for your active offers will be listed here for approval.
                    </p>
                  </div>
              ) : (
                  applications.map((app) => {
                    const borrowerId = Number(app.borrower_id || app.borrower?.id);
                    return (
                        <div key={app.id} className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                          <div>
                            <p className="text-sm font-bold text-[#0F2942]">Borrower: {app.borrower?.first_name} {app.borrower?.last_name}</p>
                            <div className="mt-1 flex items-center gap-4 text-xs text-slate-500">
                              <span className="flex items-center gap-1 font-semibold text-slate-700"><Shield className="h-3.5 w-3.5 text-emerald-600" /> Score: {app.borrower?.credit_score || "N/A"}</span>
                              <span>Requested: <strong className="text-[#0F2942]">{formatCurrency(app.amount)}</strong></span>
                              <span>Terms: {app.offer?.interest_rate}% / {app.offer?.term_months} Months</span>
                              <span>Status: <strong className="uppercase text-amber-600">{app.status}</strong></span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="rounded-xl border-slate-200 text-[#0F2942]" onClick={() => setActiveChat({
                              id: borrowerId,
                              name: app.borrower ? `${app.borrower.first_name} ${app.borrower.last_name}` : "Borrower",
                              loanDetails: { amount: app.amount, interest: app.offer?.interest_rate, term: app.offer?.term_months }
                            })}>
                              <MessageSquare className="h-4 w-4 text-emerald-600" /> Chat
                            </Button>
                            {app.status === 'PENDING' && (
                                <>
                                  <Button variant="outline" size="sm" onClick={() => handleReject(app.id)} className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1">
                                    <XCircle className="h-4 w-4" /> Reject
                                  </Button>
                                  <Button size="sm" onClick={() => handleApprove(app.id)} className="rounded-xl bg-[#0F2942] text-white hover:bg-[#163a5d] flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4" /> Approve
                                  </Button>
                                </>
                            )}
                          </div>
                        </div>
                    );
                  })
              )}
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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
                <div className="flex items-start justify-between">
                  <h2 className="text-xl font-bold text-[#0F2942]">
                    {confirmEditPrompt ? "Confirm Direct Funding" : "Edit Lending Offer"}
                  </h2>
                  <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setConfirmEditPrompt(null);
                      }}
                      className="text-slate-400 hover:text-slate-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {confirmEditPrompt ? (
                    <div className="mt-4 space-y-4">
                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                        <p className="font-bold text-sm">Additional Direct Funding Required</p>
                        <p>
                          Your wallet balance is <strong>{formatCurrency(walletBalance)}</strong>. Increasing this offer requires an automatic card top-up of <strong>{formatCurrency(confirmEditPrompt.required_difference)}</strong>.
                        </p>
                        <p className="opacity-80">Would you like to proceed with the payment top-up and update your offer?</p>
                      </div>

                      {actionError && <p className="text-xs text-red-600 font-medium">{actionError}</p>}

                      <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setConfirmEditPrompt(null)}>
                          Back
                        </Button>
                        <Button
                            type="button"
                            className="flex-1 rounded-xl bg-[#0F2942] text-white hover:bg-[#163a5d] cursor-pointer"
                            disabled={submitting}
                            onClick={() => handleEditOffer(null, true)}
                        >
                          {submitting ? "Processing..." : "Confirm & Save"}
                        </Button>
                      </div>
                    </div>
                ) : (
                    <form onSubmit={(e) => handleEditOffer(e, false)} className="mt-4 space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold uppercase text-slate-500">Amount Available (₱)</label>
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-slate-400">Available:</span>
                            <span className="font-bold text-[#0F2942]">{formatCurrency(walletBalance)}</span>
                          </div>
                        </div>

                        <input
                            type="text"
                            value={formatNumberInput(editAmount)}
                            onChange={(e) => setEditAmount(parseNumberInput(e.target.value))}
                            className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-[#0F2942] outline-none focus:border-[#0F2942]"
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
                          <label className="text-xs font-bold uppercase text-slate-500">Interest Rate (%)</label>
                          <input type="number" step="0.1" value={editInterest} onChange={(e) => setEditInterest(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-[#0F2942] outline-none focus:border-[#0F2942]" required />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase text-slate-500">Term (Months)</label>
                          <input type="number" value={editTerm} onChange={(e) => setEditTerm(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-[#0F2942] outline-none focus:border-[#0F2942]" required />
                        </div>
                      </div>

                      {actionError && <p className="text-xs text-red-600 font-medium">{actionError}</p>}

                      <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setShowEditModal(false)}>Cancel</Button>
                        <Button type="submit" className="flex-1 rounded-xl bg-[#0F2942] text-white hover:bg-[#163a5d] cursor-pointer" disabled={submitting}>{submitting ? "Saving..." : "Save Changes"}</Button>
                      </div>
                    </form>
                )}
              </div>
            </div>
        )}

        {/* Create Offer Modal */}
        {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
                <div className="flex items-start justify-between">
                  <h2 className="text-xl font-bold text-[#0F2942]">
                    {confirmDirectPrompt ? "Confirm Direct Funding" : "Publish Lending Offer"}
                  </h2>
                  <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        setConfirmDirectPrompt(null);
                      }}
                      className="text-slate-400 hover:text-slate-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {confirmDirectPrompt ? (
                    <div className="mt-4 space-y-4">
                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                        <p className="font-bold text-sm">Additional Direct Funding Required</p>
                        <p>
                          Your wallet balance is <strong>{formatCurrency(walletBalance)}</strong>. Publishing this <strong>{formatCurrency(parseFloat(parseNumberInput(amountAvailable)))}</strong> offer requires charging an additional <strong>{formatCurrency(confirmDirectPrompt.required_difference)}</strong> from your primary linked card.
                        </p>
                        <p className="opacity-80">Would you like to proceed with the automatic top-up and publish this offer?</p>
                      </div>

                      {actionError && <p className="text-xs text-red-600 font-medium">{actionError}</p>}

                      <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setConfirmDirectPrompt(null)}>
                          Back
                        </Button>
                        <Button
                            type="button"
                            className="flex-1 rounded-xl bg-[#0F2942] text-white hover:bg-[#163a5d] cursor-pointer"
                            disabled={submitting}
                            onClick={() => handleCreateOffer(null, true)}
                        >
                          {submitting ? "Processing..." : "Confirm & Publish"}
                        </Button>
                      </div>
                    </div>
                ) : (
                    <form onSubmit={(e) => handleCreateOffer(e, false)} className="mt-4 space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold uppercase text-slate-500">Amount Available (₱)</label>
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-slate-400">Available:</span>
                            <span className="font-bold text-[#0F2942]">{formatCurrency(walletBalance)}</span>
                            <button
                                type="button"
                                onClick={() => setAmountAvailable(walletBalance.toString())}
                                className="ml-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded hover:bg-emerald-100 cursor-pointer"
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
                            className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-[#0F2942] outline-none focus:border-[#0F2942]"
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
                          <label className="text-xs font-bold uppercase text-slate-500">Interest Rate (%)</label>
                          <input type="number" step="0.1" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-[#0F2942] outline-none focus:border-[#0F2942]" required />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase text-slate-500">Term (Months)</label>
                          <input type="number" value={termMonths} onChange={(e) => setTermMonths(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-[#0F2942] outline-none focus:border-[#0F2942]" required />
                        </div>
                      </div>

                      {actionError && <p className="text-xs text-red-600 font-medium">{actionError}</p>}

                      <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                        <Button type="submit" className="flex-1 rounded-xl bg-[#0F2942] text-white hover:bg-[#163a5d] cursor-pointer" disabled={submitting}>{submitting ? "Processing..." : "Publish Offer"}</Button>
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