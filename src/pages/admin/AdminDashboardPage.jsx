import { useState, useEffect } from "react";
import AdminOverview from "../../components/admin/AdminOverview.jsx";
import AdminBorrowerLedger from "../../components/admin/AdminBorrowerLedger.jsx";
import AdminInspectionDrawer from "../../components/admin/AdminInspectionDrawer.jsx";
import { getToken } from "@/lib/authToken.js";

export default function AdminDashboardPage() {
    const [stats, setStats] = useState(null);
    const [borrowers, setBorrowers] = useState([]);
    const [loadingRefresh, setLoadingRefresh] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);

    useEffect(() => {
        fetchBorrowers();
    }, []);

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
            alert(data.message);
        } catch (err) {
            alert(err.message);
        } finally {
            setLoadingRefresh(false);
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
            />

            <AdminBorrowerLedger
                borrowers={borrowers}
                onInspect={(user) => setSelectedUserId(user.id)}
            />

            <AdminInspectionDrawer
                userId={selectedUserId}
                onClose={() => setSelectedUserId(null)}
            />
        </div>
    );
}