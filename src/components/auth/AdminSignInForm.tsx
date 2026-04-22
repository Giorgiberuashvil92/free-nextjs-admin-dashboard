"use client";

import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { ADMIN_USER_DISPLAY, ADMIN_USER_IDS } from "@/lib/adminUsers";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useState } from "react";

export default function AdminSignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<(typeof ADMIN_USER_IDS)[number]>("giga");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const misconfigured = searchParams.get("misconfigured") === "1";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "შესვლა ვერ მოხერხდა.");
        return;
      }
      const from = searchParams.get("from");
      if (from && from.startsWith("/") && !from.startsWith("//")) {
        router.replace(from);
      } else {
        router.replace("/");
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 px-4 py-10 dark:bg-gray-950">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900 sm:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90 sm:text-2xl">
            ადმინ პანელი
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            შედით მხოლოდ ნებადართული ანგარიშით
          </p>
        </div>

        {misconfigured && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100">
            სერვერზე დააყენეთ <span className="font-mono">ADMIN_AUTH_SECRET</span> (მინიმუმ 24
            სიმბოლო) და სამივე პაროლი <span className="font-mono">ADMIN_PASSWORD_*</span>{" "}
            გარემოს ცვლადებში.
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <Label>
              მომხმარებელი <span className="text-error-500">*</span>
            </Label>
            <select
              value={userId}
              onChange={(ev) =>
                setUserId(ev.target.value as (typeof ADMIN_USER_IDS)[number])
              }
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              {ADMIN_USER_IDS.map((id) => (
                <option key={id} value={id}>
                  {ADMIN_USER_DISPLAY[id]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>
              პაროლი <span className="text-error-500">*</span>
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="პაროლი"
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 z-30 -translate-y-1/2 text-gray-500 dark:text-gray-400"
                aria-label={showPassword ? "დამალვა" : "ჩვენება"}
              >
                {showPassword ? (
                  <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                ) : (
                  <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
              {error}
            </p>
          )}

          <Button className="w-full" size="sm" disabled={loading}>
            {loading ? "იტვირთება…" : "შესვლა"}
          </Button>
        </form>
      </div>
    </div>
  );
}
