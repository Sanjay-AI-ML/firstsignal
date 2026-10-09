import Workspace from "../platform";
import { getAppUser } from "../auth";
import { readSetupIntent } from "@/lib/onboarding-intent";
export const dynamic = "force-dynamic";
export default async function AppPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const key of ["setup", "template"]) {
    const values = params[key];
    for (const value of Array.isArray(values) ? values : values ? [values] : []) query.append(key, value);
  }
  const user = await getAppUser();
  return <Workspace user={user ? {id:user.userId,name:user.displayName,email:user.email}:null} setupIntent={readSetupIntent(query.toString())}/>;
}
