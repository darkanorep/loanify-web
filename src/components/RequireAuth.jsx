import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { getToken, clearToken } from "@/lib/authToken";
import { verifySession } from "@/lib/api";

export default function RequireAuth({ children }) {
    const location = useLocation();
    const token = getToken();

    // No token at all — fast path, no need to even ask the backend.
    const [status, setStatus] = useState(token ? "checking" : "unauthenticated");

    useEffect(() => {
        if (!token) return;

        let cancelled = false;
        verifySession()
            .then(() => {
                if (!cancelled) setStatus("authenticated");
            })
            .catch(() => {
                // Token exists locally but the backend says it's invalid/revoked —
                // this is exactly the copied-token-after-logout case. Clear the
                // stale token so we don't keep re-checking a dead one.
                clearToken();
                if (!cancelled) setStatus("unauthenticated");
            });

        return () => {
            cancelled = true;
        };
    }, [token]);

    if (status === "checking") {
        return (
            <div className="flex min-h-dvh w-full items-center justify-center bg-background">
                <p className="text-sm text-muted-foreground">Checking your session…</p>
            </div>
        );
    }

    if (status === "unauthenticated") {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    return children;
}