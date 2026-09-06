import { Card, Metric, Text, Flex, ProgressBar, BadgeDelta } from "@tremor/react";

export default function AdminOverview({ stats, onRefresh, loading }) {
    return (
        <div className="space-y-6">
            {/* Metric Cards Row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card decoration="top" decorationColor="indigo">
                    <Text>Total Active Loans</Text>
                    <Metric>₱{stats?.activeLoansAmount?.toLocaleString() || "34,260,800"}</Metric>
                    <Text className="mt-2 text-xs text-muted-foreground">12,840 active micro-borrower notes</Text>
                </Card>

                <Card decoration="top" decorationColor="emerald">
                    <Text>Platform Liquidity</Text>
                    <Metric>₱{stats?.totalPool?.toLocaleString() || "48,500,000"}</Metric>
                    <Flex className="mt-4">
                        <Text>70.6% Utilized</Text>
                        <Text>₱14.2M Reserve</Text>
                    </Flex>
                    <ProgressBar value={70.6} color="emerald" className="mt-2" />
                </Card>

                <Card decoration="top" decorationColor="amber">
                    <Text>Pending KYC Reviews</Text>
                    <Metric>{stats?.pendingKyc || "142"}</Metric>
                    <Text className="mt-2 text-xs text-amber-600 font-medium">48 High Priority queue</Text>
                </Card>

                <Card decoration="top" decorationColor="rose">
                    <Text>Portfolio Default Rate</Text>
                    <Metric>1.82%</Metric>
                    <BadgeDelta deltaType="moderateDecrease" isIncreasePositive={false} className="mt-2">
                        -0.34% vs Q3
                    </BadgeDelta>
                </Card>
            </div>

            {/* Algorithmic Batch Action Control Banner */}
            <div className="rounded-2xl bg-indigo-950 p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
          <span className="inline-block rounded-md bg-indigo-800 px-2.5 py-1 text-xs font-semibold text-indigo-200">
            Algorithmic Dynamic Credit Limit & Risk Exposure Engine v2.4
          </span>
                    <h2 className="mt-2 text-xl font-bold">Automated Performance-Based Credit Assessment</h2>
                    <p className="text-sm text-indigo-300 mt-1 max-w-2xl">
                        Batch recalibrate dynamic micro-lending capacity for all active borrowers based on repayment velocity, re-tiering limits from base ₱500 to ceiling ₱50,000 via asynchronous Redis background worker queue.
                    </p>
                </div>
                <button
                    onClick={onRefresh}
                    disabled={loading}
                    className="shrink-0 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-accent-foreground shadow-lg hover:bg-accent/90 transition-all disabled:opacity-50"
                >
                    {loading ? "Queuing Recalibration..." : "⚡ Run Performance Credit Update"}
                </button>
            </div>
        </div>
    );
}