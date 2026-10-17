import SignInPage from "../signin/page";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Create an account · FindIn" };
export const dynamic = "force-dynamic";
export default function SignUpPage(props: Parameters<typeof SignInPage>[0]) { return SignInPage({ ...props, signup: true }); }
