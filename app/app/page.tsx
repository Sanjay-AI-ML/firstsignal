import Workspace from "../platform";
import { getAppUser } from "../auth";
export const dynamic = "force-dynamic";
export default async function AppPage() {
  const user = await getAppUser();
  return <Workspace user={user ? {id:user.userId,name:user.displayName,email:user.email}:null}/>;
}
