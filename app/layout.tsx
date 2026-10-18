import type { Metadata } from "next";
import "./globals.css";
import "./design-system.css";
import SessionGuard from "../components/session-guard";
import AuthProvider from "../components/clerk-provider";
import { clerkPublishableKey, getAppUser } from "./auth";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "FindIn — Meet the next generation of founders",
  description: "Discover early-stage founders through their progress, evidence, and ambition. An India-first founder–investor pilot.",
  icons: {
    icon: "/illustrations/findin-mark-64.webp",
    shortcut: "/illustrations/findin-mark-64.webp",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getAppUser();
  return (
    <html lang="en">
      <body className="antialiased"><AuthProvider publishableKey={clerkPublishableKey()} serverUserId={user?.userId.replace(/^clerk:/, "") ?? null}><SessionGuard/><a href="#main-content" className="skip-link">Skip to content</a>{children}</AuthProvider></body>
    </html>
  );
}
