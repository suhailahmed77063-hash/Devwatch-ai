import { AppShell } from '@/components/app/shell/app-shell';

export default function AppDashbaordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
