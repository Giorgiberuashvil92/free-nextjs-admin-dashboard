import AdminSignInForm from "@/components/auth/AdminSignInForm";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "ადმინის შესვლა",
  description: "CarAppX ადმინ პანელის ავტორიზაცია",
};

function AdminSignInFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950">
      <p className="text-sm text-gray-500 dark:text-gray-400">იტვირთება…</p>
    </div>
  );
}

export default function AdminSignInPage() {
  return (
    <Suspense fallback={<AdminSignInFallback />}>
      <AdminSignInForm />
    </Suspense>
  );
}
