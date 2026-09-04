import { requireUser } from "@/lib/server/session";
import { Shell } from "@/components/app-shell/shell";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <Shell userName={user.name}>{children}</Shell>;
}
