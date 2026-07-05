"use client";

import { useCallback, useEffect, useState } from "react";
import { AccountSettingsModal } from "@/components/AccountSettingsModal";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LoginForm } from "@/components/LoginForm";
import { VerifyEmailForm } from "@/components/VerifyEmailForm";
import { getAuthStatus, logout } from "@/lib/api";

type Screen = "login" | "forgot" | "verify" | "board";

export const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>("login");
  const [username, setUsername] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [showAccountSettings, setShowAccountSettings] = useState(false);

  const refreshAuth = useCallback(async () => {
    const status = await getAuthStatus();
    setUsername(status.username);
    setEmail(status.email);
    if (status.authenticated && !status.email_verified) {
      setScreen("verify");
    } else if (status.authenticated) {
      setScreen("board");
    } else {
      setScreen("login");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    async function loadAuth() {
      try {
        await refreshAuth();
      } catch {
        setScreen("login");
        setIsLoading(false);
      }
    }

    void loadAuth();
  }, [refreshAuth]);

  const handleLogout = async () => {
    await logout();
    setUsername(null);
    setEmail(null);
    setScreen("login");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--gray-text)]">
        Loading...
      </div>
    );
  }

  if (screen === "login") {
    return (
      <LoginForm
        onSuccess={refreshAuth}
        onPendingVerification={(nextEmail) => {
          setPendingEmail(nextEmail);
          setScreen("verify");
        }}
        onForgotPassword={() => setScreen("forgot")}
      />
    );
  }

  if (screen === "forgot") {
    return <ForgotPasswordForm onBack={() => setScreen("login")} />;
  }

  if (screen === "verify") {
    return (
      <>
        <VerifyEmailForm
          email={pendingEmail ?? email ?? ""}
          onVerified={refreshAuth}
          onBack={async () => {
            await handleLogout();
          }}
        />
      </>
    );
  }

  return (
    <>
      <KanbanBoard
        displayName={email ?? username ?? "user"}
        onLogout={handleLogout}
        onOpenSettings={() => setShowAccountSettings(true)}
      />
      {showAccountSettings ? (
        <AccountSettingsModal
          onClose={() => setShowAccountSettings(false)}
          onNeedsVerification={() => {
            setShowAccountSettings(false);
            setScreen("verify");
          }}
        />
      ) : null}
    </>
  );
};
