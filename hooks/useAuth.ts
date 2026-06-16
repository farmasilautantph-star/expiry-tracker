"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export interface AuthUser {
  userId: number;
  username: string;
  role: "manager" | "staff";
  picName: string;
}

interface UseAuthReturn {
  user: AuthUser | null;
  isLoading: boolean;
  isManager: boolean;
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success) setUser(data.data);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return {
    user,
    isLoading,
    isManager: user?.role === "manager",
    logout,
  };
}
