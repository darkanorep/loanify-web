import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Lock } from "lucide-react";

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
import OtpBoxes, { OTP_LENGTH } from "./OtpBoxes";
import { resetPassword, ApiError } from "@/lib/api";

function useResetPasswordForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const emailFromForgotPassword = location.state?.email || "";

    const [email, setEmail] = useState(emailFromForgotPassword);
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    function validate() {
        const next = {};
        if (!email.trim()) next.email = "Email is required.";
        if (otp.length !== OTP_LENGTH) next.otp = `Enter the full ${OTP_LENGTH}-digit code.`;
        if (!newPassword) {
            next.newPassword = "New password is required.";
        } else if (newPassword.length < 8) {
            next.newPassword = "At least 8 characters.";
        }
        if (confirmPassword !== newPassword) {
            next.confirmPassword = "Passwords don't match.";
        }
        return next;
    }

    const apiFieldToFormField = {
        email: "email",
        otp: "otp",
        new_password: "newPassword",
    };

    async function handleSubmit(e) {
        e.preventDefault();
        const validationErrors = validate();
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;

        setSubmitting(true);
        try {
            const res = await resetPassword({
                email: email.trim(),
                otp,
                new_password: newPassword,
            });
            navigate("/login", {
                state: { successMessage: res?.message || "Password reset successfully. You can now log in." },
            });
        } catch (err) {
            if (err instanceof ApiError && err.fieldErrors) {
                const mapped = {};
                for (const [key, message] of Object.entries(err.fieldErrors)) {
                    const formKey = apiFieldToFormField[key] || key;
                    mapped[formKey] = message;
                }
                setErrors((prev) => ({ ...prev, ...mapped }));
            } else {
                setErrors((prev) => ({
                    ...prev,
                    apiError:
                        err instanceof ApiError
                            ? err.message
                            : "Couldn't reach the server. Please check your connection and try again.",
                }));
            }
        } finally {
            setSubmitting(false);
        }
    }

    return {
        email,
        setEmail,
        emailIsLocked: Boolean(emailFromForgotPassword),
        otp,
        setOtp,
        newPassword,
        setNewPassword,
        confirmPassword,
        setConfirmPassword,
        showPassword,
        setShowPassword,
        errors,
        submitting,
        handleSubmit,
    };
}

function ResetPasswordFields({ state }) {
    const {
        email,
        setEmail,
        emailIsLocked,
        otp,
        setOtp,
        newPassword,
        setNewPassword,
        confirmPassword,
        setConfirmPassword,
        showPassword,
        setShowPassword,
        errors,
        submitting,
        handleSubmit,
    } = state;

    return (
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            {errors.apiError && (
                <div
                    role="alert"
                    className="rounded-md border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
                >
                    {errors.apiError}
                </div>
            )}

            {!emailIsLocked ? (
                <div className="space-y-1.5">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                        id="reset-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        aria-invalid={Boolean(errors.email)}
                        className="text-base md:text-sm"
                    />
                    {errors.email && (
                        <p className="text-xs text-destructive">{errors.email}</p>
                    )}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">
                    Enter the {OTP_LENGTH}-digit code sent to{" "}
                    <span className="font-medium text-foreground">{email}</span>.
                </p>
            )}

            <div className="space-y-1.5">
                <Label>Verification Code</Label>
                <OtpBoxes value={otp} onChange={setOtp} hasError={Boolean(errors.otp)} />
                {errors.otp && <p className="text-xs text-destructive">{errors.otp}</p>}
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        id="newPassword"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        aria-invalid={Boolean(errors.newPassword)}
                        className="pl-10 pr-11 text-base md:text-sm"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground"
                    >
                        {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </button>
                </div>
                {errors.newPassword && (
                    <p className="text-xs text-destructive">{errors.newPassword}</p>
                )}
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    aria-invalid={Boolean(errors.confirmPassword)}
                    className="text-base md:text-sm"
                />
                {errors.confirmPassword && (
                    <p className="text-xs text-destructive">{errors.confirmPassword}</p>
                )}
            </div>

            <Button
                type="submit"
                disabled={submitting}
                size="lg"
                className="w-full uppercase tracking-wide"
            >
                {submitting ? "Resetting…" : "Reset Password"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
                <Link to="/login" className="hover:underline">
                    Back to Login
                </Link>
            </p>
        </form>
    );
}

export default function ResetPasswordPage() {
    const state = useResetPasswordForm();

    return (
        <div className="min-h-dvh w-full bg-background">
            {/* MOBILE / TABLET */}
            <div className="flex min-h-dvh items-center justify-center px-4 py-6 pb-[env(safe-area-inset-bottom)] sm:py-10 md:hidden">
                <div className="flex w-full max-w-md flex-col items-center">
                    <Logo className="mb-6 mt-2 scale-90 sm:mb-10 sm:mt-6 sm:scale-100" />
                    <Card className="w-full">
                        <CardHeader className="p-5 pb-0 sm:p-8 sm:pb-0">
                            <CardTitle className="text-2xl sm:text-3xl">
                                Reset Password
                            </CardTitle>
                            <CardDescription>
                                Enter the code we sent you and choose a new password.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-5 pt-6 sm:p-8 sm:pt-6">
                            <ResetPasswordFields state={state} />
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
                            Set a new <span className="text-accent">password.</span>
                        </>
                    }
                    subtitle="Enter the code we sent you and choose something new and secure."
                    features={[]}
                    showStatCard={false}
                />

                <div className="flex w-full items-center justify-center overflow-y-auto px-10 py-10 md:w-1/2 lg:w-2/5">
                    <div className="w-full max-w-sm">
                        <h1 className="text-3xl font-bold text-foreground">Reset Password</h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Enter the code we sent you and choose a new password.
                        </p>
                        <div className="mt-8">
                            <ResetPasswordFields state={state} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}