import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from "@/components/ui/card";

import Logo from "./Logo";
import HeroPanel from "./HeroPanel";
import OtpBoxes, { OTP_LENGTH } from "./OtpBoxes";
import { verifyOtp, resendOtp, ApiError } from "@/lib/api";

const RESEND_COOLDOWN_SECONDS = 60;

function useOtpVerify() {
    const navigate = useNavigate();
    const location = useLocation();
    const emailFromSignup = location.state?.email || "";

    const [email, setEmail] = useState(emailFromSignup);
    const [otp, setOtp] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [resending, setResending] = useState(false);
    const [resendMessage, setResendMessage] = useState("");
    const [cooldown, setCooldown] = useState(
        emailFromSignup ? RESEND_COOLDOWN_SECONDS : 0
    );

    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        if (!email.trim()) {
            setError("Enter the email you signed up with.");
            return;
        }
        if (otp.length !== OTP_LENGTH) {
            setError(`Enter the full ${OTP_LENGTH}-digit code.`);
            return;
        }

        setSubmitting(true);
        try {
            const res = await verifyOtp({ email: email.trim(), otp });
            navigate("/login", {
                state: { successMessage: res?.message || "Email verified. You can now log in." },
            });
        } catch (err) {
            setError(
                err instanceof ApiError
                    ? err.message
                    : "Couldn't reach the server. Please check your connection and try again."
            );
        } finally {
            setSubmitting(false);
        }
    }

    async function handleResend() {
        if (!email.trim() || cooldown > 0) return;
        setResending(true);
        setResendMessage("");
        setError("");
        try {
            await resendOtp({ email: email.trim() });
            setResendMessage("A new code has been sent.");
            setCooldown(RESEND_COOLDOWN_SECONDS);
        } catch (err) {
            setError(
                err instanceof ApiError
                    ? err.message
                    : "Couldn't resend the code. Please try again."
            );
        } finally {
            setResending(false);
        }
    }

    return {
        email,
        setEmail,
        emailIsLocked: Boolean(emailFromSignup),
        otp,
        setOtp,
        error,
        submitting,
        resending,
        resendMessage,
        cooldown,
        handleSubmit,
        handleResend,
    };
}

function OtpFormFields({ state }) {
    const {
        email,
        setEmail,
        emailIsLocked,
        otp,
        setOtp,
        error,
        submitting,
        resending,
        resendMessage,
        cooldown,
        handleSubmit,
        handleResend,
    } = state;

    return (
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            {!emailIsLocked && (
                <div className="space-y-1.5">
                    <label htmlFor="otp-email" className="text-sm font-semibold text-foreground">
                        Email
                    </label>
                    <input
                        id="otp-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="h-11 w-full rounded-md border border-input bg-secondary px-3.5 text-base text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 md:text-sm"
                    />
                </div>
            )}

            {emailIsLocked && (
                <p className="text-sm text-muted-foreground">
                    We sent a {OTP_LENGTH}-digit code to{" "}
                    <span className="font-medium text-foreground">{email}</span>.
                </p>
            )}

            <OtpBoxes value={otp} onChange={setOtp} hasError={Boolean(error)} />

            {error && <p className="text-xs text-destructive">{error}</p>}
            {resendMessage && !error && (
                <p className="text-xs text-accent">{resendMessage}</p>
            )}

            <Button
                type="submit"
                disabled={submitting}
                size="lg"
                className="w-full uppercase tracking-wide"
            >
                {submitting ? "Verifying…" : "Verify"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
                Didn&apos;t get a code?{" "}
                <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending || cooldown > 0}
                    className="font-semibold text-accent hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
                >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? "Sending…" : "Resend"}
                </button>
            </p>

            <p className="text-center text-sm text-muted-foreground">
                <Link to="/login" className="hover:underline">
                    Back to Login
                </Link>
            </p>
        </form>
    );
}

export default function OtpVerifyPage() {
    const state = useOtpVerify();

    return (
        <div className="min-h-dvh w-full bg-background">
            {/* MOBILE / TABLET */}
            <div className="flex min-h-dvh items-center justify-center px-4 py-6 pb-[env(safe-area-inset-bottom)] sm:py-10 md:hidden">
                <div className="flex w-full max-w-md flex-col items-center">
                    <Logo className="mb-6 mt-2 scale-90 sm:mb-10 sm:mt-6 sm:scale-100" />
                    <Card className="w-full">
                        <CardHeader className="p-5 pb-0 sm:p-8 sm:pb-0">
                            <CardTitle className="text-2xl sm:text-3xl">
                                Verify your email
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 pt-6 sm:p-8 sm:pt-6">
                            <OtpFormFields state={state} />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* DESKTOP — split-screen */}
            <div className="hidden md:flex md:min-h-dvh">
                <HeroPanel
                    className="md:w-1/2 lg:w-3/5"
                    title={
                        <>
                            Almost there, <span className="text-accent">one code left.</span>
                        </>
                    }
                    subtitle="Check your inbox for the verification code we just sent."
                    features={[]}
                    showStatCard={false}
                />

                <div className="flex w-full items-center justify-center overflow-y-auto px-10 py-10 md:w-1/2 lg:w-2/5">
                    <div className="w-full max-w-sm">
                        <h1 className="text-3xl font-bold text-foreground">
                            Verify your email
                        </h1>
                        <div className="mt-8">
                            <OtpFormFields state={state} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}