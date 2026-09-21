import { useState, useEffect } from "react";
import { ShieldAlert, ShieldCheck, Clock, ChevronRight } from "lucide-react";
import KycVerificationModal from "../kyc/KycVerificationModal.jsx";
import { getKycStatus } from "@/lib/api";

const KYC_CONFIG = {
    NOT_STARTED: { label: "Not Started", className: "text-muted-foreground", icon: ShieldAlert },
    PENDING: { label: "Pending Review", className: "text-amber-500", icon: Clock },
    VERIFIED: { label: "Verified", className: "text-emerald-500", icon: ShieldCheck },
    REJECTED: { label: "Rejected", className: "text-destructive", icon: ShieldAlert },
};

export default function ProfileKycCard({ initialStatus }) {
    const [kycStatus, setKycStatus] = useState(initialStatus || "NOT_STARTED");
    const [rejectionNote, setRejectionNote] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);

    const syncKycStatus = async () => {
        try {
            const data = await getKycStatus();
            if (data?.kyc_status) {
                setKycStatus(data.kyc_status);
                setRejectionNote(data.rejection_note || "");
            }
        } catch (err) {
            console.error("Failed to sync KYC status:", err);
        }
    };

    useEffect(() => {
        syncKycStatus();
    }, []);

    const currentStatus = (kycStatus || "NOT_STARTED").toUpperCase();
    const kyc = KYC_CONFIG[currentStatus] || KYC_CONFIG.NOT_STARTED;
    const KycIcon = kyc.icon;
    const canVerify = currentStatus === "NOT_STARTED" || currentStatus === "REJECTED";

    const handleOpenModal = (e) => {
        e.stopPropagation();
        console.log("Opening Verification Modal...");
        setIsModalOpen(true);
    };

    return (
        <>
            <div
                role="button"
                tabIndex={0}
                onClick={handleOpenModal}
                className="rounded-2xl border border-border bg-card p-5 transition-all duration-200 flex flex-col justify-between select-none cursor-pointer hover:border-accent/50 hover:shadow-md"
            >
                <div>
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Identity Verification (KYC)
                        </p>
                        <KycIcon className={`h-4 w-4 ${kyc.className}`} />
                    </div>
                    <p className={`mt-2 text-xl font-bold ${kyc.className}`}>
                        {kyc.label}
                    </p>
                    {currentStatus === "REJECTED" && rejectionNote && (
                        <p className="mt-1 text-xs text-destructive">{rejectionNote}</p>
                    )}
                </div>

                {canVerify && (
                    <div className="mt-3 flex items-center text-xs font-semibold text-accent gap-0.5">
                        Verify Now <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                )}
            </div>

            {isModalOpen && (
                <KycVerificationModal
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => {
                        setIsModalOpen(false);
                        syncKycStatus();
                    }}
                />
            )}
        </>
    );
}