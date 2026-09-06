import { useState } from "react";
import { Card, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Badge, TextInput, Select, SelectItem } from "@tremor/react";
import { Search, SlidersHorizontal, Eye } from "lucide-react";

const KYC_BADGES = {
    VERIFIED: { color: "emerald", label: "Verified" },
    PENDING: { color: "amber", label: "Pending Review" },
    NOT_STARTED: { color: "gray", label: "Not Started" },
    REJECTED: { color: "rose", label: "Rejected" },
};

export default function AdminBorrowerLedger({ borrowers = [], onInspect }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [kycFilter, setKycFilter] = useState("ALL");

    const filteredBorrowers = borrowers.filter((b) => {
        const matchesSearch = b.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesKyc = kycFilter === "ALL" || b.kyc_status === kycFilter;
        return matchesSearch && matchesKyc;
    });

    return (
        <Card className="mt-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-border">
                <div>
                    <h3 className="text-lg font-bold text-foreground">Borrower & Member Ledger</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Comprehensive audit trail of dynamic credit scoring, loan ceiling escalations, and ID authentication.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <div className="w-full sm:w-64">
                        <TextInput
                            icon={Search}
                            placeholder="Search by name, email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={kycFilter} onValueChange={setKycFilter} placeholder="KYC Status">
                        <SelectItem value="ALL">All KYC Statuses</SelectItem>
                        <SelectItem value="VERIFIED">Verified</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                    </Select>
                </div>
            </div>

            <Table className="mt-4">
                <TableHead>
                    <TableRow>
                        <TableHeaderCell>User Details</TableHeaderCell>
                        <TableHeaderCell>Role</TableHeaderCell>
                        <TableHeaderCell>KYC Status</TableHeaderCell>
                        <TableHeaderCell>Credit Score & Tier</TableHeaderCell>
                        <TableHeaderCell>Micro-Credit Limit</TableHeaderCell>
                        <TableHeaderCell>Repayment Track</TableHeaderCell>
                        <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {filteredBorrowers.length > 0 ? (
                        filteredBorrowers.map((user) => {
                            const kyc = KYC_BADGES[user.kyc_status] || KYC_BADGES.NOT_STARTED;
                            return (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="font-medium text-foreground">{user.full_name || `${user.first_name} ${user.last_name}`}</div>
                                        <div className="text-xs text-muted-foreground">{user.email}</div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="inline-block rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                                            {user.role || "Borrower"}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge color={kyc.color} size="xs">{kyc.label}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-bold text-foreground">{user.credit_score || 600} <span className="text-xs font-normal text-muted-foreground">({user.credit_rating || "Fair"})</span></div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-bold text-accent">₱{Number(user.credit_limit || 500).toLocaleString()}</div>
                                        <div className="text-[10px] text-muted-foreground">Ceiling: ₱50,000</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs font-medium text-foreground">100% On-Time</div>
                                        <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-secondary">
                                            <div className="h-full bg-emerald-500 w-full" />
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <button
                                            onClick={() => onInspect(user)}
                                            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                                        >
                                            <Eye className="h-3.5 w-3.5" /> Inspect
                                        </button>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    ) : (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center py-6 text-sm text-muted-foreground">
                                No borrower records found matching your filters.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </Card>
    );
}