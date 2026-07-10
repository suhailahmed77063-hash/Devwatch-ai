'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AppWorkspace } from '@/lib/app-types';
import { AppSidebar } from './app-sidebar';

type AppSheellProps = {
  children: React.ReactNode;
  workspaces: AppWorkspace[];
  activeWorkspaceSlug?: string;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};

export function AppShell({
  children,
  workspaces,
  activeWorkspaceSlug,
  user,
}: AppSheellProps) {
  const [commandOpen, setComamndOpen] = useState(false);

  const openCommand = useCallback(() => {
    setComamndOpen(true);
  }, []);

  return (
    <div className="app-theme flex min-h-screen bg-app-bg text-app-text">
      {/* AppSidebar */}
      <AppSidebar
        workspaces={workspaces}
        activeWorkspaceSlug={activeWorkspaceSlug}
        user={user}
        onOpenSearch={openCommand}
      />

      {/* Main */}
      <div className="app-theme-main flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>

      {/* CommandPalette */}
    </div>
  );
}
