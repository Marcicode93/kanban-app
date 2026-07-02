"use client";

import { useCallback, useEffect, useState } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LoginForm } from "@/components/LoginForm";
import { getAuthStatus, logout } from "@/lib/api";

export const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  const refreshAuth = useCallback(async () => {
    const status = await getAuthStatus();
    setIsAuthenticated(status.authenticated);
    setUsername(status.username);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refreshAuth().catch(() => {
      setIsAuthenticated(false);
      setUsername(null);
      setIsLoading(false);
    });
  }, [refreshAuth]);

  const handleLogout = async () => {
    await logout();
    setIsAuthenticated(false);
    setUsername(null);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--gray-text)]">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm onSuccess={refreshAuth} />;
  }

  return <KanbanBoard username={username ?? "user"} onLogout={handleLogout} />;
};
