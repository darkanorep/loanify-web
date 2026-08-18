import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { setToken } from "@/lib/authToken";
import Logo from "./Logo";

export default function OAuthCallbackPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [error, setError] = useState("");

    useEffect(() => {
        const token = searchParams.get("token");
        const oauthError = searchParams.get("error");

        if (token) {
            setToken(token);
            console.log("About to navigate to /dashboard"); // temporary debug line
            navigate("/dashboard", { replace: true });
            return;
        }

        // Backend's failure path redirects here with ?error=oauth_failed instead
        // of a token — show it briefly, then send them back to try again.
        setError(
            oauthError === "oauth_failed"
                ? "Google sign-in didn't go through. Please try again."
                : "Something went wrong signing you in."
        );
        const timer = setTimeout(() => {
            navigate("/login", { replace: true });
        }, 2000);
        return () => clearTimeout(timer);
    }, [searchParams, navigate]);

    return (
        <div className="flex min-h-dvh w-full flex-col items-center justify-center gap-4 bg-background px-4 text-center">
            <Logo />
            {error ? (
                <>
                    <p className="text-sm text-destructive">{error}</p>
                    <p className="text-xs text-muted-foreground">Redirecting you back to login…</p>
                </>
            ) : (
                <p className="text-sm text-muted-foreground">Signing you in…</p>
            )}
        </div>
    );
}