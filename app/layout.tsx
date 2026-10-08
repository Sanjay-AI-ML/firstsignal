import type { Metadata } from "next";
import "./globals.css";
import SessionGuard from "../components/session-guard";
import AuthProvider from "../components/clerk-provider";
import { clerkPublishableKey, getAppUser } from "./auth";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "FirstSignal — Meet the next generation of founders",
  description: "Discover early-stage founders through their progress, evidence, and ambition. An India-first founder–investor pilot.",
  icons: {
    icon: "/firstsignal-logo.png",
    shortcut: "/firstsignal-logo.png",
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
