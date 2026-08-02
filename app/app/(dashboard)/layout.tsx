import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app/shell/app-shell';
import { getCachedSession, getCachedUserWorkspaces } from '@/lib/auth/cached';

export default async function AppDashbaordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCachedSession();
  if (!session?.user?.id) {
    redirect('/?auth=login&callbackUrl=/app');
  }

  let workspaces: Awaited<ReturnType<typeof getCachedUserWorkspaces>> = [];

  if (process.env.DATABASE_URL) {
    workspaces = await getCachedUserWorkspaces(session.user.id);
  }

  return (
    <AppShell
      workspaces={workspaces}
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}>
      {children}
    </AppShell>
  );
}
