import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { clerkPublishableKey, getAppUser } from "@/app/auth";
import { isAdminAccount } from "@/lib/admin-access";
import AdminSignInForm from "@/components/admin-signin-form";
import { SignOutButton } from "@/components/auth-form";
import "./signin.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Admin sign in · FindIn",
  robots: { index: false, follow: false },
};

export default async function AdminSignInPage() {
  const user = await getAppUser();
  if (isAdminAccount(user)) redirect("/admin");

  return (
    <main className="admin-signin-page" id="main-content">
      <Link className="admin-signin-home" href="/">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to FindIn
      </Link>
      <section className="admin-signin-card" aria-labelledby="admin-signin-title">
        <div className="admin-signin-brand">
          <img
            src="/illustrations/findin-mark-64.webp"
            srcSet="/illustrations/findin-mark-64.webp 1x, /illustrations/findin-mark-128.webp 2x"
            width={34}
            height={34}
            alt=""
          />
          <span>FindIn</span>
          <span className="admin-signin-label">Administration</span>
        </div>
        <div className="admin-signin-icon"><ShieldCheck aria-hidden="true" /></div>
        <h1 id="admin-signin-title">Admin sign in</h1>
        <p className="admin-signin-intro">Manage ideas, review reports and keep the community safe.</p>
        {user ? (
          <div className="admin-signin-restricted">
            <h2>This account doesn’t have admin access.</h2>
            <p>Switch accounts to sign in with the owner account.</p>
            <SignOutButton redirectUrl="/admin/signin" label="Switch account" />
            <Link href="/app">Return to your workspace</Link>
          </div>
        ) : clerkPublishableKey() ? (
          <AdminSignInForm />
        ) : (
          <div className="admin-signin-restricted" role="alert">
            <h2>Sign-in is unavailable.</h2>
            <p>Please try again later.</p>
            <Link href="/admin/signin">Try again</Link>
          </div>
        )}
        <p className="admin-signin-note">Access is limited to the configured owner. Member accounts cannot create an admin account here.</p>
      </section>
      <Link className="admin-signin-privacy" href="/privacy">Privacy</Link>
    </main>
  );
}
