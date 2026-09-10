import { useState, useEffect } from "react";
import AdminOverview from "../../components/admin/AdminOverview.jsx";
import AdminBorrowerLedger from "../../components/admin/AdminBorrowerLedger.jsx";
import AdminLiveStreamAndPortfolios from "../../components/admin/AdminLiveStreamAndPortfolios.jsx";
import AdminInspectionDrawer from "../../components/admin/AdminInspectionDrawer.jsx";
import { getToken } from "@/lib/authToken.js";
import { getWebSocket } from "@/lib/socket.js";

export default function AdminDashboardPage() {
    const [stats, setStats] = useState(null);
    const [borrowers, setBorrowers] = useState([]);
    const [loadingRefresh, setLoadingRefresh] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        fetchBorrowers();
        fetchStats();

        const socket = getWebSocket();
        if (socket) {
            const handleMessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (
                        data.type === "admin_data_updated" ||
                        data.action === "DATABASE_SEEDED" ||
                        data.action === "BATCH_CREDIT_QUEUED" ||
                        data.type === "REFRESH_ALL"
                    ) {
                        fetchBorrowers();
                        fetchStats();
                    }
                } catch (err) {
                    console.error("Failed to parse WebSocket event", err);
                }
            };

            socket.addEventListener("message", handleMessage);

            return () => {
                socket.removeEventListener("message", handleMessage);
            };
        }
    }, []);

    async function fetchStats() {
        try {
            const res = await fetch("/api/admin/stats", {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            const data = await res.json();
            if (res.ok) {
                setStats(data);
            }
        } catch (err) {
            console.error("Failed to fetch stats", err);
        }
    }

    async function fetchBorrowers() {
        try {
            const res = await fetch("/api/admin/borrowers", {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            const data = await res.json();
            if (res.ok) {
                setBorrowers(data.borrowers || []);
            }
        } catch (err) {
            console.error("Failed to fetch borrowers", err);
        }
    }

    async function handleBatchCreditUpdate() {
        setLoadingRefresh(true);
        setToast(null);
        try {
            const res = await fetch("/api/admin/credit-limits/refresh", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${getToken()}`,
                    "Content-Type": "application/json",
                },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setToast({ type: "success", text: data.message || "Batch credit limit recalculation job queued successfully." });
        } catch (err) {
            setToast({ type: "error", text: err.message });
        } finally {
            setTimeout(() => {
                setLoadingRefresh(false);
            }, 2500);
        }
    }

    return (
        <div className="min-h-screen bg-background p-6 lg:p-10 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Admin Command Center</h1>
                    <p className="text-sm text-muted-foreground">Manage micro-lending liquidity, risk tiers, and borrower audits.</p>
                </div>
            </div>

            <AdminOverview
                stats={stats}
                onRefresh={handleBatchCreditUpdate}
                loading={loadingRefresh}
                toast={toast}
            />

            <AdminBorrowerLedger
                borrowers={borrowers}
                onInspect={(user) => setSelectedUserId(user.id)}
            />

            <AdminInspectionDrawer
                userId={selectedUserId}
                onClose={() => setSelectedUserId(null)}
            />

            <AdminLiveStreamAndPortfolios />
        </div>
    );
}