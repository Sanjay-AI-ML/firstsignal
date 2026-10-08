import SignInPage from "../signin/page";
export const dynamic = "force-dynamic";
export default function SignUpPage(props: Parameters<typeof SignInPage>[0]) { return SignInPage({ ...props, signup: true }); }
