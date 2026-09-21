import React, { useState, useEffect } from "react";
import SumsubWebSdk from "@sumsub/websdk-react";
import { getToken } from "@/lib/authToken";
import { X, RefreshCw } from "lucide-react";

export default function KycVerificationModal({ onClose, onSuccess }) {
    const [accessToken, setAccessToken] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchAccessToken = async () => {
        try {
            setLoading(true);
            setError("");
            const res = await fetch("/api/kyc/sumsub-token", {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to launch identity verification.");

            setAccessToken(data.token);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccessToken();
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-card text-card-foreground rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-border relative flex flex-col max-h-[90vh]">
                <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                    <X className="h-5 w-5" />
                </button>

                <h2 className="text-lg font-bold mb-4">Identity Verification</h2>

                <div className="flex-1 overflow-y-auto min-h-[420px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-sm text-muted-foreground space-y-2">
                            <RefreshCw className="h-6 w-6 animate-spin text-accent" />
                            <p>Initializing verification module...</p>
                        </div>
                    ) : error ? (
                        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-xs text-destructive text-center">
                            {error}
                        </div>
                    ) : (
                        <SumsubWebSdk
                            accessToken={accessToken}
                            expirationHandler={fetchAccessToken}
                            config={{ lang: "en" }}
                            options={{ adaptIframeHeight: true }}
                            onMessage={(type) => {
                                if (type === "idCheck.onApproved") {
                                    onSuccess?.();
                                    onClose();
                                }
                            }}
                            onError={(err) => console.error("SDK Error:", err)}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}