import React, { useState } from "react";
import AdminSidebar from "../../components/admin/AdminSidebar.jsx";
import AdminOverview from "../../components/admin/AdminOverview.jsx";
import AdminBorrowerLedger from "../../components/admin/AdminBorrowerLedger.jsx";
import AdminLiveStreamAndPortfolios from "../../components/admin/AdminLiveStreamAndPortfolios.jsx";
import AdminInspectionDrawer from "../../components/admin/AdminInspectionDrawer.jsx";

export default function AdminDashboardPage() {
    const [currentTab, setCurrentTab] = useState("overview");
    const [selectedUserId, setSelectedUserId] = useState(null);

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Sidebar Navigation */}
            <AdminSidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

            {/* Main Content Area */}
            <main className="flex-1 p-6 lg:p-10 space-y-8 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-5">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                            Admin Command Center
                        </h1>
                        <p className="text-xs text-slate-500 mt-1">
                            BSP-Supervised Micro-Lending Vault & Risk Controls
                        </p>
                    </div>
                </div>

                {/* Conditional View Rendering based on active tab */}
                {currentTab === "overview" && (
                    <>
                        <AdminOverview />
                        <AdminLiveStreamAndPortfolios />
                        <AdminBorrowerLedger onInspect={(user) => setSelectedUserId(user.id)} />
                    </>
                )}

                {currentTab === "borrowers" && (
                    <AdminBorrowerLedger onInspect={(user) => setSelectedUserId(user.id)} />
                )}

                {currentTab === "audit" && (
                    <AdminLiveStreamAndPortfolios />
                )}

                {/* Administrative Drawer Controls */}
                <AdminInspectionDrawer
                    userId={selectedUserId}
                    onClose={() => setSelectedUserId(null)}
                />
            </main>
        </div>
    );
}