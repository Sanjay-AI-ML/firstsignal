import type { Metadata } from "next";
import { redirect } from "next/navigation";
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
  if (!user || !isAdminAccount(user)) redirect("/admin/signin");
  return <AdminPortal owner={{ name: user.displayName, id: user.userId }} />;
}
