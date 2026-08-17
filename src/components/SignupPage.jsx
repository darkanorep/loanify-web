import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from "@/components/ui/card";

import Logo from "./Logo";
import HeroPanel from "./HeroPanel";
import PageTransition from "./PageTransition";
import PhoneInput from "./PhoneInput";
import GoogleIcon from "./icons/GoogleIcon";
import AppleIcon from "./icons/Appleicon";
import { registerUser, ApiError } from "@/lib/api";
import { countries } from "@/lib/countryCodes";

const initialForm = {
    firstName: "",
    middleName: "",
    lastName: "",
    suffix: "",
    country: "PH",
    phoneNumber: "",
    email: "",
    username: "",
    password: "",
};

function useSignupForm() {
    const navigate = useNavigate();
    const [form, setForm] = useState(initialForm);
    const [showPassword, setShowPassword] = useState(false);
    const [agreeTerms, setAgreeTerms] = useState(false);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    function handleChange(e) {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
        if (errors.apiError) setErrors((prev) => ({ ...prev, apiError: undefined }));
    }

    function validate() {
        const next = {};
        if (!form.firstName.trim()) next.firstName = "Required.";
        if (!form.lastName.trim()) next.lastName = "Required.";

        if (!form.phoneNumber.trim()) {
            next.phoneNumber = "Required.";
        } else if (!/^[0-9+\-\s]{7,}$/.test(form.phoneNumber.trim())) {
            next.phoneNumber = "Enter a valid phone number.";
        }

        if (!form.email.trim()) {
            next.email = "Email is required.";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            next.email = "Enter a valid email address.";
        }

        if (!form.username.trim()) {
            next.username = "Required.";
        } else if (form.username.trim().length < 3) {
            next.username = "At least 3 characters.";
        }

        if (!form.password) {
            next.password = "Required.";
        } else if (form.password.length < 6) {
            next.password = "At least 6 characters.";
        }

        if (!agreeTerms) {
            next.agreeTerms = "You must agree to continue.";
        }

        return next;
    }

    // Maps our camelCase API field-error keys back from the backend's
    // snake_case field names, in case it returns per-field validation errors.
    // NOTE: shape assumed as { field_name: "message" | ["message"] } — confirm
    // against a real error response and adjust if it differs.
    const apiFieldToFormField = {
        first_name: "firstName",
        middle_name: "middleName",
        last_name: "lastName",
        phone_number: "phoneNumber",
        email: "email",
        username: "username",
        password: "password",
    };

    async function handleSubmit(e) {
        e.preventDefault();
        const validationErrors = validate();
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;

        setSubmitting(true);
        try {
            const callingCode =
                countries.find((c) => c.iso2 === form.country)?.callingCode || "";
            const localNumber = form.phoneNumber.trim().replace(/^0+/, "");

            await registerUser({
                first_name: form.firstName.trim(),
                middle_name: form.middleName.trim(),
                last_name: form.lastName.trim(),
                email: form.email.trim(),
                phone_number: `${callingCode}${localNumber}`,
                username: form.username.trim(),
                password: form.password,
            });
            navigate("/verify-otp", { state: { email: form.email.trim() } });
        } catch (err) {
            if (err instanceof ApiError && err.fieldErrors) {
                const mapped = {};
                for (const [key, message] of Object.entries(err.fieldErrors)) {
                    const formKey = apiFieldToFormField[key] || key;
                    mapped[formKey] = Array.isArray(message) ? message[0] : message;
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
        form,
        errors,
        showPassword,
        setShowPassword,
        agreeTerms,
        setAgreeTerms,
        submitting,
        handleChange,
        handleSubmit,
    };
}

function FieldError({ id, message }) {
    if (!message) return null;
    return (
        <p id={id} className="text-xs text-destructive">
            {message}
        </p>
    );
}

function SignupFormFields({ state }) {
    const {
        form,
        errors,
        showPassword,
        setShowPassword,
        agreeTerms,
        setAgreeTerms,
        submitting,
        handleChange,
        handleSubmit,
    } = state;

    return (
        <>
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                {errors.apiError && (
                    <div
                        role="alert"
                        className="rounded-md border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
                    >
                        {errors.apiError}
                    </div>
                )}

                {/* First / Middle Name */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                            id="firstName"
                            name="firstName"
                            autoComplete="given-name"
                            value={form.firstName}
                            onChange={handleChange}
                            aria-invalid={Boolean(errors.firstName)}
                            aria-describedby={errors.firstName ? "firstName-error" : undefined}
                            className="text-base md:text-sm"
                        />
                        <FieldError id="firstName-error" message={errors.firstName} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="middleName">Middle Name</Label>
                        <Input
                            id="middleName"
                            name="middleName"
                            autoComplete="additional-name"
                            value={form.middleName}
                            onChange={handleChange}
                            className="text-base md:text-sm"
                        />
                    </div>
                </div>

                {/* Last Name / Suffix */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                            id="lastName"
                            name="lastName"
                            autoComplete="family-name"
                            value={form.lastName}
                            onChange={handleChange}
                            aria-invalid={Boolean(errors.lastName)}
                            aria-describedby={errors.lastName ? "lastName-error" : undefined}
                            className="text-base md:text-sm"
                        />
                        <FieldError id="lastName-error" message={errors.lastName} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="suffix">Suffix</Label>
                        <Input
                            id="suffix"
                            name="suffix"
                            placeholder="Jr., Sr., III"
                            value={form.suffix}
                            onChange={handleChange}
                            className="text-base md:text-sm"
                        />
                    </div>
                </div>

                {/* Phone Number — full width, needs the room for the flag/search picker */}
                <div className="space-y-1.5">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <PhoneInput
                        id="phoneNumber"
                        name="phoneNumber"
                        countryIso2={form.country}
                        onCountryChange={(iso2) =>
                            handleChange({ target: { name: "country", value: iso2 } })
                        }
                        value={form.phoneNumber}
                        onChange={handleChange}
                        ariaInvalid={Boolean(errors.phoneNumber)}
                        ariaDescribedBy={errors.phoneNumber ? "phoneNumber-error" : undefined}
                    />
                    <FieldError id="phoneNumber-error" message={errors.phoneNumber} />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                        <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={handleChange}
                            aria-invalid={Boolean(errors.email)}
                            aria-describedby={errors.email ? "email-error" : undefined}
                            className="pl-10 text-base md:text-sm"
                        />
                    </div>
                    <FieldError id="email-error" message={errors.email} />
                </div>

                {/* Username / Password */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label htmlFor="username">Username</Label>
                        <Input
                            id="username"
                            name="username"
                            autoComplete="username"
                            value={form.username}
                            onChange={handleChange}
                            aria-invalid={Boolean(errors.username)}
                            aria-describedby={errors.username ? "username-error" : undefined}
                            className="text-base md:text-sm"
                        />
                        <FieldError id="username-error" message={errors.username} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                autoComplete="new-password"
                                value={form.password}
                                onChange={handleChange}
                                aria-invalid={Boolean(errors.password)}
                                aria-describedby={errors.password ? "password-error" : undefined}
                                className="pr-10 text-base md:text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((s) => !s)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                className="absolute right-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground"
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                        <FieldError id="password-error" message={errors.password} />
                    </div>
                </div>

                {/* Terms & Privacy — required */}
                <div className="pt-1">
                    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-muted-foreground">
                        <Checkbox
                            className="mt-0.5"
                            checked={agreeTerms}
                            onCheckedChange={(checked) => setAgreeTerms(checked === true)}
                            aria-invalid={Boolean(errors.agreeTerms)}
                            aria-describedby={errors.agreeTerms ? "terms-error" : undefined}
                        />
                        <span>
              I agree to the{" "}
                            <a href="#terms" className="font-medium text-accent hover:underline">
                Terms of Service
              </a>{" "}
                            and{" "}
                            <a href="#privacy" className="font-medium text-accent hover:underline">
                Privacy Policy
              </a>
              .
            </span>
                    </label>
                    <FieldError id="terms-error" message={errors.agreeTerms} />
                </div>

                {/* Submit */}
                <Button
                    type="submit"
                    disabled={submitting}
                    size="lg"
                    className="w-full uppercase tracking-wide"
                >
                    {submitting ? "Creating account…" : "Signup"}
                </Button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">or continue with</span>
                <span className="h-px flex-1 bg-border" />
            </div>

            {/* Social signup */}
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

            {/* Login link */}
            <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="font-semibold text-accent hover:underline">
                    Login
                </Link>
            </p>
        </>
    );
}

export default function SignupPage() {
    const state = useSignupForm();

    return (
        <div className="min-h-dvh w-full bg-background">
            {/* MOBILE / TABLET — centered floating card */}
            <div className="flex min-h-dvh items-center justify-center px-4 py-6 pb-[env(safe-area-inset-bottom)] sm:py-10 md:hidden">
                <div className="flex w-full max-w-md flex-col items-center">
                    <Logo className="mb-6 mt-2 scale-90 sm:mb-10 sm:mt-6 sm:scale-100" />
                    <PageTransition className="w-full">
                        <Card className="w-full">
                            <CardHeader className="p-5 pb-0 sm:p-8 sm:pb-0">
                                <CardTitle className="text-2xl sm:text-3xl">
                                    Create an account?
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-5 pt-6 sm:p-8 sm:pt-6">
                                <SignupFormFields state={state} />
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
                            Join loanify, <span className="text-accent">start smart.</span>
                        </>
                    }
                    subtitle="Create your free account and manage every loan, repayment, and application in one dashboard."
                />

                <div className="flex w-full items-center justify-center overflow-y-auto px-10 py-10 md:w-1/2 lg:w-2/5">
                    <PageTransition className="w-full max-w-sm">
                        <h1 className="text-3xl font-bold text-foreground">
                            Create an account?
                        </h1>
                        <div className="mt-8">
                            <SignupFormFields state={state} />
                        </div>
                    </PageTransition>
                </div>
            </div>
        </div>
    );
}