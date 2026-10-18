import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LockKeyhole, ArrowUpRight } from "lucide-react";
import AdminPortal from "@/components/admin-portal";
import { getAppUser } from "@/app/auth";
import { isAdminAccount } from "@/lib/admin-access";
import "./admin.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Admin · FindIn",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const user = await getAppUser();
  if (!user) redirect("/signin?return_to=%2Fadmin");
  if (!isAdminAccount(user))
    return (
      <main className="admin-access-page" id="main-content">
        <section className="admin-access-card">
          <span className="admin-access-icon">
            <LockKeyhole aria-hidden="true" />
          </span>
          <h1>Access restricted</h1>
          <p>
            The admin portal is available only to FindIn’s configured owner
            account. Your signed-in account does not have access.
          </p>
          <a className="admin-btn admin-btn-primary" href="/app">
            Return to workspace
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </section>
      </main>
    );
  return <AdminPortal owner={{ name: user.displayName, id: user.userId }} />;
}
