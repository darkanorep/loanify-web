import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, User, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import GoogleIcon from "./icons/GoogleIcon";
import AppleIcon from "./icons/AppleIcon";
import { loginUser, ApiError } from "@/lib/api";

// Shared form state + validation, used by both the mobile and desktop layouts
// below so we're not maintaining the same logic in two places.
function useLoginForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const [form, setForm] = useState({ username: "", password: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState(
        location.state?.successMessage || ""
    );
    const [successVisible, setSuccessVisible] = useState(
        Boolean(location.state?.successMessage)
    );

    // Clear the success message from history state after reading it once, so
    // it doesn't reappear if the user refreshes or navigates back to /login.
    useEffect(() => {
        if (location.state?.successMessage) {
            navigate(location.pathname, { replace: true, state: {} });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Auto-dismiss: start the fade-out at 1s, then fully unmount once the
    // transition finishes so it stops taking up layout space.
    useEffect(() => {
        if (!successMessage) return;
        const startFade = setTimeout(() => setSuccessVisible(false), 1000);
        const remove = setTimeout(() => setSuccessMessage(""), 1500);
        return () => {
            clearTimeout(startFade);
            clearTimeout(remove);
        };
    }, [successMessage]);

    function handleChange(e) {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
        if (errors.apiError) setErrors((prev) => ({ ...prev, apiError: undefined }));
    }

    function validate() {
        const next = {};
        if (!form.username.trim()) {
            next.username = "Username is required.";
        }
        if (!form.password) {
            next.password = "Password is required.";
        }
        return next;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const validationErrors = validate();
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;

        setSubmitting(true);
        try {
            await loginUser({
                username: form.username.trim(),
                password: form.password,
            });
            navigate("/dashboard");
        } catch (err) {
            setErrors((prev) => ({
                ...prev,
                apiError:
                    err instanceof ApiError
                        ? err.message
                        : "Couldn't reach the server. Please check your connection and try again.",
            }));
        } finally {
            setSubmitting(false);
        }
    }

    return {
        form,
        errors,
        showPassword,
        setShowPassword,
        rememberMe,
        setRememberMe,
        submitting,
        successMessage,
        successVisible,
        handleChange,
        handleSubmit,
    };
}

function LoginFormFields({ state }) {
    const {
        form,
        errors,
        showPassword,
        setShowPassword,
        rememberMe,
        setRememberMe,
        submitting,
        successMessage,
        successVisible,
        handleChange,
        handleSubmit,
    } = state;

    return (
        <>
            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                {successMessage && (
                    <div
                        role="status"
                        className={`overflow-hidden rounded-md border border-accent/30 bg-accent/10 text-sm text-foreground transition-all duration-500 ease-out ${
                            successVisible
                                ? "max-h-24 px-3.5 py-2.5 opacity-100"
                                : "max-h-0 px-3.5 py-0 opacity-0"
                        }`}
                    >
                        {successMessage}
                    </div>
                )}
                {errors.apiError && (
                    <div
                        role="alert"
                        className="rounded-md border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
                    >
                        {errors.apiError}
                    </div>
                )}

                {/* Username */}
                <div className="space-y-1.5">
                    <Label htmlFor="username">Username</Label>
                    <div className="relative">
                        <User className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            id="username"
                            name="username"
                            autoComplete="username"
                            placeholder="yourusername"
                            value={form.username}
                            onChange={handleChange}
                            aria-invalid={Boolean(errors.username)}
                            aria-describedby={errors.username ? "username-error" : undefined}
                            className="pl-10 text-base md:text-sm"
                        />
                    </div>
                    {errors.username && (
                        <p id="username-error" className="text-xs text-destructive">
                            {errors.username}
                        </p>
                    )}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                        <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            placeholder="••••••••"
                            value={form.password}
                            onChange={handleChange}
                            aria-invalid={Boolean(errors.password)}
                            aria-describedby={errors.password ? "password-error" : undefined}
                            className="pl-10 pr-11 text-base md:text-sm"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((s) => !s)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground"
                        >
                            {showPassword ? (
                                <EyeOff className="h-4.5 w-4.5" />
                            ) : (
                                <Eye className="h-4.5 w-4.5" />
                            )}
                        </button>
                    </div>
                    {errors.password && (
                        <p id="password-error" className="text-xs text-destructive">
                            {errors.password}
                        </p>
                    )}
                </div>

                {/* Remember me / Forgot password */}
                <div className="flex flex-wrap items-center justify-between gap-y-2 pt-1">
                    <label className="-m-2 flex cursor-pointer items-center gap-2 p-2 text-sm text-muted-foreground">
                        <Checkbox
                            checked={rememberMe}
                            onCheckedChange={(checked) => setRememberMe(checked === true)}
                        />
                        Remember Me
                    </label>
                    <Link
                        to="/forgot-password"
                        className="-m-2 p-2 text-sm font-medium text-accent hover:underline"
                    >
                        Forgot Password?
                    </Link>
                </div>

                {/* Submit */}
                <Button
                    type="submit"
                    disabled={submitting}
                    size="lg"
                    className="w-full uppercase tracking-wide"
                >
                    {submitting ? "Logging in…" : "Login"}
                </Button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">or continue with</span>
                <span className="h-px flex-1 bg-border" />
            </div>

            {/* Social logins */}
            <div className="grid grid-cols-2 gap-3">
                <Button type="button" variant="default" className="gap-2">
                    <GoogleIcon className="h-5 w-5" />
                    Google
                </Button>
                <Button type="button" variant="default" className="gap-2">
                    <AppleIcon className="h-4 w-4" />
                    Apple
                </Button>
            </div>

            {/* Signup */}
            <p className="mt-6 text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link to="/signup" className="font-semibold text-accent hover:underline">
                    Signup Now
                </Link>
            </p>
        </>
    );
}

export default function LoginPage() {
    const state = useLoginForm();

    return (
        <div className="min-h-dvh w-full bg-background">
            {/* MOBILE / TABLET — centered floating card, hidden at md and up */}
            <div className="flex min-h-dvh items-center justify-center px-4 py-6 pb-[env(safe-area-inset-bottom)] sm:py-10 md:hidden">
                <div className="flex w-full max-w-md flex-col items-center">
                    <Logo className="mb-6 mt-2 scale-90 sm:mb-10 sm:mt-6 sm:scale-100" />
                    <PageTransition className="w-full">
                        <Card className="w-full">
                            <CardHeader className="p-5 pb-0 sm:p-8 sm:pb-0">
                                <CardTitle className="text-2xl sm:text-3xl">Welcome Back</CardTitle>
                                <CardDescription>
                                    Enter your email and password to access your account.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-5 pt-6 sm:p-8 sm:pt-6">
                                <LoginFormFields state={state} />
                            </CardContent>
                        </Card>
                    </PageTransition>
                </div>
            </div>

            {/* DESKTOP — split-screen: dark hero panel + form panel, hidden below md */}
            <div className="hidden md:flex md:min-h-dvh">
                <HeroPanel className="md:w-1/2 lg:w-3/5" />

                <div className="flex w-full items-center justify-center px-10 py-10 md:w-1/2 lg:w-2/5">
                    <PageTransition className="w-full max-w-sm">
                        <h1 className="text-3xl font-bold text-foreground">Welcome Back</h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Enter your email and password to access your account.
                        </p>
                        <div className="mt-8">
                            <LoginFormFields state={state} />
                        </div>
                    </PageTransition>
                </div>
            </div>
        </div>
    );
}