"use client";
import { useEffect, useState } from "react";

import { useAuth } from "@/lib/auth-context";
import { useDictionary, useLocale } from "@/i18n/provider";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { getLocalizedApiErrorMessage } from "@/i18n/errors";
import { getMe, updateProfile } from "@/lib/auth-api";
import { getDashboardPath } from "@/lib/dashboard";
import type { AuthUser } from "@/types/auth";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export default function ProfileClient() {
  const dict = useDictionary();
  const locale = useLocale();
  const { refreshSession, user } = useAuth();
  const a = dict.auth;
  const dashboardPath = getDashboardPath(user);

  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getMe();
      setProfile(data);
      setFirstName(data.firstName ?? "");
      setLastName(data.lastName ?? "");
    } catch (err) {
      setLoadError(getLocalizedApiErrorMessage(err, dict.apiErrors, a.loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    if (
      !normalizedFirstName ||
      !normalizedLastName ||
      normalizedFirstName.length > 80 ||
      normalizedLastName.length > 80
    ) {
      setSaveError(a.profileNameValidation);
      return;
    }
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const updated = await updateProfile({
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
      });
      setProfile(updated);
      setFirstName(updated.firstName ?? "");
      setLastName(updated.lastName ?? "");
      setEditing(false);
      setSaveSuccess(a.updated);
      await refreshSession();
    } catch (err) {
      setSaveError(getLocalizedApiErrorMessage(err, dict.apiErrors, a.error));
    } finally {
      setSaving(false);
    }
  }

  function onCancel() {
    if (profile) {
      setFirstName(profile.firstName ?? "");
      setLastName(profile.lastName ?? "");
    }
    setEditing(false);
    setSaveError(null);
  }

  const initials = `${profile?.firstName?.[0] ?? ""}${profile?.lastName?.[0] ?? ""}`.trim() || "U";

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-muted/30">
        <Container className="py-10 md:py-14">
          <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">{a.profileTitle}</h1>
              <p className="mt-2 text-muted-foreground">{a.profileDescription}</p>
            </div>
            {dashboardPath ? (
              <Button
                href={`/${locale}${dashboardPath}`}
                variant="secondary"
                className="self-start sm:self-auto"
              >
                {dict.dashboard.backToDashboard}
              </Button>
            ) : null}
          </header>

          {loading ? (
            <div
              className="space-y-4"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <span className="sr-only">{dict.common.loading}</span>
              <div className="h-32 animate-pulse rounded-3xl border border-border bg-background" />
              <div className="h-64 animate-pulse rounded-3xl border border-border bg-background" />
            </div>
          ) : loadError ? (
            <div className="rounded-3xl border border-border bg-background p-8 text-center shadow-sm">
              <p className="text-danger" role="alert">{loadError}</p>
              <div className="mt-4"><Button onClick={() => void load()}>{a.retry}</Button></div>
            </div>
          ) : profile ? (
            <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
              <aside className="rounded-3xl border border-border/60 bg-background p-6 shadow-sm">
                <div className="flex items-center gap-4 lg:flex-col lg:text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/15 text-xl font-semibold text-accent">
                    {initials.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-foreground">{profile.firstName} {profile.lastName}</p>
                    <p className="text-sm text-muted-foreground">{profile.email ?? "—"}</p>
                  </div>
                </div>
              </aside>

              <section className="rounded-3xl border border-border/60 bg-background p-6 shadow-sm md:p-8">
                {!editing ? (
                  <div className="space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{a.firstNameLabel}</p>
                        <p className="mt-1 text-base font-medium text-foreground">{profile.firstName ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{a.lastNameLabel}</p>
                        <p className="mt-1 text-base font-medium text-foreground">{profile.lastName ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{a.emailLabel}</p>
                        <p className="mt-1 text-base font-medium text-foreground">{profile.email ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{a.phoneLabel}</p>
                        <p className="mt-1 text-base font-medium text-foreground">{profile.phone ?? "—"}</p>
                      </div>
                    </div>
                    {saveSuccess ? <p className="text-sm text-success" role="status">{saveSuccess}</p> : null}
                    <Button
                      onClick={() => {
                        setFirstName(profile.firstName ?? "");
                        setLastName(profile.lastName ?? "");
                        setSaveError(null);
                        setSaveSuccess(null);
                        setEditing(true);
                      }}
                    >
                      {a.edit}
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={onSave} className="space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="firstName">
                          {a.firstNameLabel}
                        </label>
                        <input
                          id="firstName"
                          autoComplete="given-name"
                          className="h-11 w-full rounded-xl border border-control-border bg-surface px-3 text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          value={firstName}
                          onChange={(e) => {
                            setFirstName(e.target.value);
                            setSaveError(null);
                            setSaveSuccess(null);
                          }}
                          maxLength={80}
                          aria-invalid={saveError === a.profileNameValidation}
                          aria-describedby={saveError ? "profile-save-error" : undefined}
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="lastName">
                          {a.lastNameLabel}
                        </label>
                        <input
                          id="lastName"
                          autoComplete="family-name"
                          className="h-11 w-full rounded-xl border border-control-border bg-surface px-3 text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          value={lastName}
                          onChange={(e) => {
                            setLastName(e.target.value);
                            setSaveError(null);
                            setSaveSuccess(null);
                          }}
                          maxLength={80}
                          aria-invalid={saveError === a.profileNameValidation}
                          aria-describedby={saveError ? "profile-save-error" : undefined}
                          required
                        />
                      </div>
                    </div>
                    {saveError ? <p id="profile-save-error" className="text-sm text-danger" role="alert">{saveError}</p> : null}
                    {saveSuccess ? <p className="text-sm text-success" role="status">{saveSuccess}</p> : null}
                    <div className="flex gap-2">
                      <Button type="submit" disabled={saving}>
                        {saving ? a.saving : a.save}
                      </Button>
                      <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
                        {a.cancel}
                      </Button>
                    </div>
                  </form>
                )}
              </section>
            </div>
          ) : null}
        </Container>
      </main>
    </ProtectedRoute>
  );
}