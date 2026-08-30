import { useEffect, useState } from "react";
import { ShieldCheck, Award, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getProfile, updateProfile, ApiError } from "@/lib/api";

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
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
  const [nameInput, setNameInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  function load() {
    setLoading(true);
    getProfile()
      .then((res) => {
        setData(res);
        setNameInput(res.full_name);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Couldn't load your profile.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave() {
    setSaveError("");
    if (!nameInput.trim()) {
      setSaveError("Full name is required.");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ full_name: nameInput.trim() });
      setData((prev) => ({ ...prev, full_name: nameInput.trim() }));
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading your profile…</p>;
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Borrower Profile & Credentials</h1>
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
          <p className={`mt-2 text-xl font-bold ${kyc.className}`}>{kyc.label}</p>
          {data.kyc_status === "NOT_STARTED" && (
            <p className="mt-1 text-xs text-muted-foreground">
              Identity verification isn't set up yet.
            </p>
          )}
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
            <span className="text-sm font-medium text-foreground">({data.credit_rating})</span>
          </p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${((data.credit_score - 300) / (850 - 300)) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Based on this platform's payment history — not an official credit bureau score.
          </p>
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
          <p className="mt-1 text-xs text-muted-foreground">Based on current credit standing</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Contact Information</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Only your name can be edited here — email and phone are tied to your account
              login and verification.
            </p>
          </div>
          {!editing && (
            <Button type="button" variant="outline" onClick={() => setEditing(true)}>
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
              <>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-md border border-input bg-secondary px-3.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {saveError && <p className="mt-1.5 text-xs text-destructive">{saveError}</p>}
                <div className="mt-2 flex gap-2">
                  <Button type="button" size="sm" disabled={saving} onClick={handleSave}>
                    {saving ? "Saving…" : "Save"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={() => {
                      setEditing(false);
                      setNameInput(data.full_name);
                      setSaveError("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </>
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
            <p className="mt-1.5 rounded-md bg-secondary/60 px-3.5 py-2.5 text-sm text-muted-foreground">
              {data.email}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Phone Number
            </p>
            <p className="mt-1.5 rounded-md bg-secondary/60 px-3.5 py-2.5 text-sm text-muted-foreground">
              {data.phone_number}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}