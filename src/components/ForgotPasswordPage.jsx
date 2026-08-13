import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card";

import Logo from "./Logo";
import HeroPanel from "./HeroPanel";
import PageTransition from "./PageTransition";
import { forgotPassword, ApiError } from "@/lib/api";

function useForgotPasswordForm() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [sent, setSent] = useState(false);
    const [serverMessage, setServerMessage] = useState("");

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        if (!email.trim()) {
            setError("Email is required.");
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError("Enter a valid email address.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await forgotPassword({ email: email.trim() });
            setServerMessage(res?.message || "");
            setSent(true);
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

    return { email, setEmail, error, submitting, sent, serverMessage, handleSubmit };
}

function ForgotPasswordFields({ state }) {
    const { email, setEmail, error, submitting, sent, serverMessage, handleSubmit } = state;

    if (sent) {
        return (
            <div className="space-y-5">
                <div
                    role="status"
                    className="rounded-md border border-accent/30 bg-accent/10 px-3.5 py-3 text-sm text-foreground"
                >
                    {serverMessage || "If an account exists, a reset code has been sent."}
                </div>
                <p className="text-center text-sm text-muted-foreground">
                    <Link
                        to="/reset-password"
                        state={{ email }}
                        className="font-semibold text-accent hover:underline"
                    >
                        Enter Reset Code
                    </Link>
                </p>
                <p className="text-center text-sm text-muted-foreground">
                    <Link to="/login" className="hover:underline">
                        Back to Login
                    </Link>
                </p>
            </div>
        );
    }

    return (
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <div className="space-y-1.5">
                <Label htmlFor="forgot-email">Email</Label>
                <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        id="forgot-email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? "forgot-email-error" : undefined}
                        className="pl-10 text-base md:text-sm"
                    />
                </div>
                {error && (
                    <p id="forgot-email-error" className="text-xs text-destructive">
                        {error}
                    </p>
                )}
            </div>

            <Button
                type="submit"
                disabled={submitting}
                size="lg"
                className="w-full uppercase tracking-wide"
            >
                {submitting ? "Sending…" : "Send Reset Code"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
                <Link to="/login" className="hover:underline">
                    Back to Login
                </Link>
            </p>
        </form>
    );
}

export default function ForgotPasswordPage() {
    const state = useForgotPasswordForm();

    return (
        <div className="min-h-dvh w-full bg-background">
            {/* MOBILE / TABLET */}
            <div className="flex min-h-dvh items-center justify-center px-4 py-6 pb-[env(safe-area-inset-bottom)] sm:py-10 md:hidden">
                <div className="flex w-full max-w-md flex-col items-center">
                    <Logo className="mb-6 mt-2 scale-90 sm:mb-10 sm:mt-6 sm:scale-100" />
                    <PageTransition className="w-full">
                        <Card className="w-full">
                            <CardHeader className="p-5 pb-0 sm:p-8 sm:pb-0">
                                <CardTitle className="text-2xl sm:text-3xl">
                                    Forgot Password?
                                </CardTitle>
                                <CardDescription>
                                    Enter your email and we'll send you a code to reset it.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-5 pt-6 sm:p-8 sm:pt-6">
                                <ForgotPasswordFields state={state} />
                            </CardContent>
                        </Card>
                    </PageTransition>
                </div>
            </div>

            {/* DESKTOP — split-screen */}
            <div className="hidden md:flex md:min-h-dvh">
                <HeroPanel
                    className="md:w-1/2 lg:w-3/5"
                    title={
                        <>
                            Forgot your password? <span className="text-accent">No worries.</span>
                        </>
                    }
                    subtitle="We'll send a reset code to your email so you can get back in."
                    features={[]}
                    showStatCard={false}
                />

                <div className="flex w-full items-center justify-center overflow-y-auto px-10 py-10 md:w-1/2 lg:w-2/5">
                    <PageTransition className="w-full max-w-sm">
                        <h1 className="text-3xl font-bold text-foreground">
                            Forgot Password?
                        </h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Enter your email and we'll send you a code to reset it.
                        </p>
                        <div className="mt-8">
                            <ForgotPasswordFields state={state} />
                        </div>
                    </PageTransition>
                </div>
            </div>
        </div>
    );
}