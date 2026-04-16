import React, { useEffect } from "react";
import { initDb } from "@/services/db";
import { syncAll } from "@/services/sync/syncController";
import { useAuth } from "@/hooks/useAuth";

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { sessionId } = useAuth();

  useEffect(() => {
    let mounted = true;
    initDb().then(() => {
      if (mounted && sessionId) {
        syncAll("startup", sessionId).catch(() => {});
      }
    });
    return () => {
      mounted = false;
    };
  }, [sessionId]);

  return <>{children}</>;
}
