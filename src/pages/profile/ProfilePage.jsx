import { useEffect, useState } from "react";
import { ShieldCheck, Award, TrendingUp, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  getProfile,
  updateProfile,
  requestProfileOtp,
  ApiError,
} from "@/lib/api";
import { countries } from "@/lib/countryCodes.js";

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(amount);
}

const KYC_LABELS = {
  NOT_STARTED: { label: "Not Started", className: "text-muted-foreground" },
  PENDING: { label: "Pending Review", className: "text-accent" },
  VERIFIED: { label: "Verified", className: "text-accent" },
  REJECTED: { label: "Rejected", className: "text-destructive" },
};

export default function ProfilePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  // Editable contact inputs
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+63");
  const [phoneInput, setPhoneInput] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Country Search & Dropdown State
  const [countrySearch, setCountrySearch] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  // OTP Verification Modal State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [otpError, setOtpError] = useState("");

  function load() {
    setLoading(true);
    getProfile()
        .then((res) => {
          setData(res);
          setNameInput(res.full_name);
          setEmailInput(res.email || "");
          setPhoneCountryCode(res.phone_country_code || "+63");
          setPhoneInput(res.phone_number || "");
        })
        .catch((err) => {
          setError(
              err instanceof ApiError ? err.message : "Couldn't load your profile.",
          );
        })
        .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSaveClick() {
    setSaveError("");
    if (!nameInput.trim()) {
      setSaveError("Full name is required.");
      return;
    }
    if (!emailInput.trim()) {
      setSaveError("Email address is required.");
      return;
    }

    const emailChanged = emailInput.trim() !== data.email;
    const phoneChanged =
        phoneInput.trim() !== (data.phone_number || "") ||
        phoneCountryCode !== (data.phone_country_code || "+63");

    if (emailChanged || phoneChanged) {
      setSaving(true);
      try {
        await requestProfileOtp({
          email: emailInput.trim(),
          phone_number: phoneInput.trim(),
        });
        setShowOtpModal(true);
      } catch (err) {
        setSaveError(
            err instanceof ApiError
                ? err.message
                : "Couldn't send verification code.",
        );
      } finally {
        setSaving(false);
      }
      return;
    }

    executeSave({ full_name: nameInput.trim() });
  }

  async function executeSave(payload) {
    setSaving(true);
    try {
      const res = await updateProfile(payload);
      setData((prev) => ({
        ...prev,
        ...payload,
        ...(res.user?.credit_score !== undefined && { credit_score: res.user.credit_score }),
        ...(res.user?.credit_limit !== undefined && { credit_limit: res.user.credit_limit }),
      }));
      setEditing(false);
      setShowOtpModal(false);
    } catch (err) {
      setSaveError(
          err instanceof ApiError ? err.message : "Couldn't save changes.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setOtpError("");
    if (!/^\d{6}$/.test(otpCode)) {
      setOtpError("Enter a valid 6-digit OTP code.");
      return;
    }

    setOtpSubmitting(true);
    try {
      const payload = {
        full_name: nameInput.trim(),
        email: emailInput.trim(),
        phone_country_code: phoneCountryCode,
        phone_number: phoneInput.trim(),
        otp_code: otpCode,
      };

      const res = await updateProfile(payload);

      setData((prev) => ({
        ...prev,
        ...payload,
        ...(res.user?.credit_score !== undefined && { credit_score: res.user.credit_score }),
        ...(res.user?.credit_limit !== undefined && { credit_limit: res.user.credit_limit }),
      }));
      setShowOtpModal(false);
      setEditing(false);
      setOtpCode("");
    } catch (err) {
      setOtpError(
          err instanceof ApiError ? err.message : "Invalid verification code.",
      );
    } finally {
      setOtpSubmitting(false);
    }
  }

  if (loading) {
    return (
        <p className="text-sm text-muted-foreground">Loading your profile…</p>
    );
  }

  if (error) {
    return (
        <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
    );
  }

  const kyc = KYC_LABELS[data.kyc_status] || KYC_LABELS.NOT_STARTED;

  const filteredCountries = countries.filter(
      (c) =>
          c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
          c.callingCode.includes(countrySearch),
  );

  const selectedCountry =
      countries.find((c) => c.callingCode === phoneCountryCode) ||
      countries.find((c) => c.iso2 === "PH");

  return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Borrower Profile & Credentials
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Identity verification, credit standing, and contact information.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Identity Verification (KYC)
              </p>
              <ShieldCheck className="h-4 w-4 text-accent" />
            </div>
            <p className={`mt-2 text-xl font-bold ${kyc.className}`}>
              {kyc.label}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Credit Standing
              </p>
              <Award className="h-4 w-4 text-accent" />
            </div>
            <p className="mt-2 text-2xl font-bold text-accent">
              {data.credit_score}{" "}
              <span className="text-sm font-medium text-foreground">
              ({data.credit_rating})
            </span>
            </p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                  className="h-full rounded-full bg-accent"
                  style={{
                    width: `${((data.credit_score - 300) / (850 - 300)) * 100}%`,
                  }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Micro-Credit Limit
              </p>
              <TrendingUp className="h-4 w-4 text-accent" />
            </div>
            <p className="mt-2 text-2xl font-bold text-accent">
              {formatCurrency(data.credit_limit)}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Contact Information
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Update your name, email, or phone number. Modifying email or phone
                requires OTP verification.
              </p>
            </div>
            {!editing && (
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditing(true)}
                >
                  Edit Information
                </Button>
            )}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 border-t border-border pt-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Full Name
              </p>
              {editing ? (
                  <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="mt-1.5 h-11 w-full rounded-md border border-input bg-secondary px-3.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
              ) : (
                  <p className="mt-1.5 rounded-md bg-secondary/60 px-3.5 py-2.5 text-sm font-medium text-foreground">
                    {data.full_name}
                  </p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Email Address
              </p>
              {editing ? (
                  <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="mt-1.5 h-11 w-full rounded-md border border-input bg-secondary px-3.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
              ) : (
                  <p className="mt-1.5 rounded-md bg-secondary/60 px-3.5 py-2.5 text-sm font-medium text-muted-foreground">
                    {data.email}
                  </p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Phone Number
              </p>
              {editing ? (
                  <div className="relative mt-1.5 flex items-center gap-2">
                    <div className="relative shrink-0">
                      <button
                          type="button"
                          onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                          className="flex h-11 items-center gap-2 rounded-md border border-input bg-secondary px-3 text-sm text-foreground outline-none"
                      >
                        {selectedCountry && (
                            <img
                                src={`https://flagcdn.com/w20/${selectedCountry.iso2.toLowerCase()}.png`}
                                alt={selectedCountry.name}
                                className="h-3.5 w-5 object-cover rounded-sm"
                            />
                        )}
                        <span className="font-medium">{phoneCountryCode}</span>
                        <span className="text-muted-foreground text-xs">▼</span>
                      </button>

                      {showCountryDropdown && (
                          <div className="absolute left-0 top-12 z-50 w-72 rounded-xl border border-border bg-card p-2 shadow-xl">
                            <div className="mb-2 p-1 border-b border-border">
                              <input
                                  type="text"
                                  placeholder="Search country or code..."
                                  value={countrySearch}
                                  onChange={(e) => setCountrySearch(e.target.value)}
                                  className="h-9 w-full rounded-md border border-input bg-secondary px-3 text-xs text-foreground outline-none"
                                  autoFocus
                              />
                            </div>
                            <div className="max-h-60 overflow-y-auto space-y-1">
                              {filteredCountries.map((c) => (
                                  <button
                                      key={c.iso2}
                                      type="button"
                                      onClick={() => {
                                        setPhoneCountryCode(c.callingCode);
                                        setShowCountryDropdown(false);
                                        setCountrySearch("");
                                      }}
                                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs text-foreground hover:bg-secondary transition-colors"
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <img
                                          src={`https://flagcdn.com/w20/${c.iso2.toLowerCase()}.png`}
                                          alt={c.name}
                                          className="h-3.5 w-5 object-cover rounded-sm"
                                      />
                                      <span className="font-medium truncate max-w-[140px] text-left">
                                {c.name}
                              </span>
                                    </div>
                                    <span className="text-muted-foreground font-mono">
                              {c.callingCode}
                            </span>
                                  </button>
                              ))}
                            </div>
                          </div>
                      )}
                    </div>

                    <input
                        type="tel"
                        value={phoneInput}
                        onChange={(e) =>
                            setPhoneInput(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="9xx xxx xxxx"
                        className="h-11 w-full rounded-md border border-input bg-secondary px-3.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
              ) : (
                  <p className="mt-1.5 rounded-md bg-secondary/60 px-3.5 py-2.5 text-sm font-medium text-muted-foreground flex items-center gap-2">
                    {selectedCountry && (
                        <img
                            src={`https://flagcdn.com/w20/${selectedCountry.iso2.toLowerCase()}.png`}
                            alt={selectedCountry.name}
                            className="h-3.5 w-5 object-cover rounded-sm"
                        />
                    )}
                    {data.phone_number
                        ? `${data.phone_country_code || "+63"} ${data.phone_number}`
                        : "Not provided"}
                  </p>
              )}
            </div>
          </div>

          {saveError && (
              <p className="mt-3 text-xs text-destructive">{saveError}</p>
          )}

          {editing && (
              <div className="mt-5 flex gap-2 pt-2 border-t border-border">
                <Button
                    type="button"
                    size="sm"
                    disabled={saving}
                    onClick={handleSaveClick}
                >
                  {saving ? "Sending Code…" : "Save"}
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={() => {
                      setEditing(false);
                      setNameInput(data.full_name);
                      setEmailInput(data.email || "");
                      setPhoneCountryCode(data.phone_country_code || "+63");
                      setPhoneInput(data.phone_number || "");
                      setSaveError("");
                    }}
                >
                  Cancel
                </Button>
              </div>
          )}
        </div>

        {showOtpModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-xl font-bold text-foreground">
                    Verify OTP Code
                  </h2>
                  <button
                      type="button"
                      onClick={() => setShowOtpModal(false)}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  We sent a 6-digit verification code to confirm your updated
                  contact credentials.
                </p>

                <form onSubmit={handleVerifyOtp} className="mt-5 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-foreground">
                      Verification Code
                    </label>
                    <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) =>
                            setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                        }
                        placeholder="123456"
                        className="h-11 w-full rounded-md border border-input bg-secondary px-3.5 text-center text-lg tracking-widest text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>

                  {otpError && (
                      <div
                          role="alert"
                          className="rounded-md border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
                      >
                        {otpError}
                      </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setShowOtpModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                        type="submit"
                        className="flex-1"
                        disabled={otpSubmitting}
                    >
                      {otpSubmitting ? "Verifying…" : "Confirm & Save"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
        )}
      </div>
  );
}